#!/usr/bin/env python3
"""portrait_pd_inventory.py — 四國頭像的公版圖源盤點（產出 reports/portraits-pd-<country>.json）。

為什麼要有這支：計畫檔原本寫「用 Commons API 查 Category:XXX 篩 Public domain」，
實測有兩個問題，本機小模型沒能力自己處理：
1. 我給的分類名根本不存在（`Category:Portraits of Joseon kings` 回 `categorymembers: []`），
   代理照著查就得到「查無圖」，然後把行勾掉或回報不可能——兩種都是錯的。
2. Commons 會限流：同一口徑連續查第二次就回空字串，`json.load` 直接炸。
   本腳本一律自訂 User-Agent、退避重試、每請求之間停一停。

授權只認 Public domain／CC0（`LicenseShortName`），其餘一律不取——
寧可報「無候選」也不能把受版權保護的圖放進網站。

用法：
  python3 scripts/portrait_pd_inventory.py --country=korea              # 查詢並寫檔
  python3 scripts/portrait_pd_inventory.py --country=korea --check      # 唯讀斷言（給驗收用）
  python3 scripts/portrait_pd_inventory.py --list                        # 列出人物表
"""

import argparse
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, __import__("os").path.dirname(__file__))
from qsrc import ssl_context  # noqa: E402  同一套 CA 處理（macOS python.org 版無內置 CA）

ROOT = Path(__file__).resolve().parent.parent
API = 'https://commons.wikimedia.org/w/api.php'
UA = 'historyfirst-portrait-audit/1.0 (https://github.com/philosopherkk/sanguozhi-3d; content-audit)'
MIN_SIDE = 600  # 低於此尺寸的圖不取（站內要顯示 1024 主圖與縮圖）
API_FAILURES = 0  # 有幾次查詢徹底失敗（見 api()：CA／限流／斷線）
PD_OK = re.compile(r'^(pd|pd-old|cc0|public domain)', re.I)

# era = 站內的時代槽位鍵（= pack 的 `*_PACK` 名小寫，要對上 public/portraits/<era>/ 與 manifest.json 的 era 欄）
# id 一律取自 pack 裡已有的人物（頭像是掛在既有人物上；憑空造 id 會被 audit:portraits 判未掛鉤）
# 第五欄 match = 檔案標題必含詞（任一命中才算同一人）。實測只用全文搜尋會配錯人：
#   「William Light captain portrait」第一筆是北軍 Captain William W. Cosby（撞到 Light 一字）
#   「James Brooke Rajah of Sarawak」第一筆是 Pangeran Raja Muda Hashim（同事件的另一人）
#   「Stamford Raffles portrait」第一筆是 Raffles 的印章（無臉）
# 錯 face 掛上人物卡等於造謠，所以標題不含姓名者一律不取，寧可報「尚無公版圖」。
PEOPLE = {
    'korea': [
        ('kojoseon', 'ko-p-taejo', '李成桂', 'King Taejo of Joseon portrait', ['taejo of joseon', 'taejo yi', 'yi seong-gye', '이성계']),
        ('kojoseon', 'ko-p-sejong', '李祹', '"Sejong" king Joseon portrait', ['sejong', '이도']),
        ('kogoryeo', 'ko-p-wanggeon', '王建', '"Taejo of Goryeo" portrait', ['taejo of goryeo', 'wang geon', '왕건']),
        ('komodern', 'ko-p-kimku', '金九', '"Kim Gu" photograph', ['kim gu', 'kim ku', '김구']),
        ('komodern', 'ko-p-synghman', '李承晚', 'Syngman Rhee official photograph', ['syngman rhee', '리승만']),
    ],
    'thailand': [
        ('thchakri', 'th-p-mongkut', '蒙固', 'Mongkut King Rama IV photograph', ['mongkut', 'rama iv', 'rama 4']),
        ('thchakri', 'th-p-chulalongkorn', '朱拉隆功', 'Chulalongkorn King Rama V photograph', ['chulalongkorn', 'rama v', 'rama 5']),
        ('thmodern', 'th-p-rama7', '巴尼差約蘇安', 'Prajadhipok King Rama VII photograph', ['prajadhipok', 'rama vii', 'rama 7']),
        ('thmodern', 'th-p-phibun', '鑾披汶', 'Plaek Phibunsongkhram photograph', ['phibunsongkhram', 'phibun']),
        ('thayutthaya', 'th-p-taksin', '鄭昭', 'Taksin King of Thonburi portrait', ['taksin']),
    ],
    'vietnam': [
        ('vnmodern', 'vnp4-baodai', '保大', 'Bao Dai Emperor of Vietnam photograph', ['bao dai']),
        ('vnmodern', 'vnp4-hochiminh', '胡志明', 'Ho Chi Minh photograph', ['ho chi minh', 'ho-chi-minh', 'hồ chí minh']),
        ('vnmodern', 'vnp4-navarre', '納瓦爾', 'Henri Navarre French general photograph', ['navarre']),
        ('vnmodern', 'vnp4-ngodinhdiem', '吳廷琰', 'Ngo Dinh Diem photograph', ['ngo dinh diem']),
        ('vndynasty', 'vnp2-lythuongkiet', '李常傑', 'Ly Thuong Kiet general portrait', ['ly thuong kiet', 'thuong kiet']),
    ],
    'malaysia': [
        ('mycolonial', 'myp2-raffles', '萊佛士', 'Stamford Raffles portrait', ['raffles']),
        ('mycolonial', 'myp2-light', '萊特', 'William Light Penang founder portrait', ['william light']),
        ('mycolonial', 'myp2-brooke', '砂拉越之拉惹', 'James Brooke Rajah of Sarawak portrait', ['james brooke']),
        ('mymalacca', 'myp1-albuquerque', '阿爾布克爾克', 'Afonso de Albuquerque portrait engraving', ['albuquerque', 'alboquerque']),
        ('mymerdeka', 'myp3-tunku', '東姑阿都拉曼', 'Tunku Abdul Rahman photograph', ['tunku abdul rahman']),
    ],
}


def api(params, tries=4):
    """帶 User-Agent 與自訂 CA、退避重試。失敗要記帳，讓上層判定結果不可信。

    ⚠ 這台 machine 的 python.org Python 無內置 CA：直接 urlopen 會 SSL 驗證失敗，
    若把例外吞掉就只會看到「查無資料」——實測因此讓圖源盤點回報「四國都無公版圖」，
    事實是根本連不上。所以除了退避重試，還要把失敗次數回報給呼叫端，
    """
    global API_FAILURES
    params = dict(params, format='json')
    url = API + '?' + urllib.parse.urlencode(params)
    last = ''
    for attempt in range(tries):
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        try:
            with urllib.request.urlopen(req, timeout=30, context=ssl_context()) as r:
                body = r.read().decode('utf-8', 'replace')
            if body.strip():
                data = json.loads(body)
                if 'error' not in data:
                    return data
                last = data['error'].get('info', 'api error')
        except Exception as exc:  # 429、斷線、CA 錯誤、非 JSON 都在這裡
            last = f'{type(exc).__name__}: {exc}'
        time.sleep(2 + 3 * attempt)  # 退避：2、5、8 秒
    API_FAILURES += 1
    print(f'  ! 查詢失敗（重試 {tries} 次）：{last}｜{params.get("srsearch", params)}', file=sys.stderr)
    return {}


# 明顯不是肖像的檔案（圖搜常混入：印章、地圖、郵票、碑、墳墓）
NON_PORTRAIT = re.compile(
    r'\b(seal|stamp|postage|map|coin|banknote|flag|banner|signature|stele|tomb|grave|monument\b.*plan'
    r'|coat of arms|arms of|plaque|street|signboard|cover|title page|manuscript|pag)\b',
    re.I,
)


def candidates_for(term, match=(), limit=16, extra_try=True):
    """搜尋檔案命名空間 → 標題比對姓名 → 授權與尺寸 → 回（候選, 淘汰原因）。

    match 是姓名詞列表：標題必須含其中之一。全文搜尋會撞到同名異事或同事件的
    另一人（見 PEOPLE 上方註解），寧可報「尚無公版圖」也不能把錯臉掛上人物卡。
    第一輪用人寫的搜尋字（精準），查不到時改用「姓名片語」再查一次（召回率最高；
    實測加多一個 portrait 就會把 File:Kim Gu in 1949.jpg 擠出前十幾筆）。
    """
    drops = []
    out = _collect(term, match, limit, drops)
    if not out and extra_try and match:
        retry = f'"{match[0]}"'
        out = _collect(retry, match, limit, drops, prefix=f'重試 {retry}｜')
    return out, drops


def _collect(term, match, limit, drops, prefix=''):
    time.sleep(1.2)  # 每請求之間停一停，避免被限流
    search = api({'action': 'query', 'list': 'search', 'srsearch': term, 'srnamespace': 6, 'srlimit': limit})
    titles = [h['title'] for h in search.get('query', {}).get('search', [])]
    if not titles:
        drops.append({'query': term, 'why': '搜尋無命中'})
        return []
    time.sleep(1.2)
    meta = api(
        {
            'action': 'query',
            'titles': '|'.join(titles),
            'prop': 'imageinfo',
            'iiprop': 'extmetadata|size|url|mime',
            'iiextmetadatafilter': 'LicenseShortName|Artist|AttributionRequired|UsageTerms|ImageDescription',
        }
    )
    out = []
    for page in meta.get('query', {}).get('pages', {}).values():
        title = page.get('title', '')
        for info in page.get('imageinfo', []):
            em = info.get('extmetadata', {})

            def val(key):
                v = em.get(key, {}).get('value', '')
                return re.sub(r'<[^>]+>', '', str(v)).strip()[:160]

            lic = val('LicenseShortName')
            low = title.lower()
            if match and not any(m in low for m in match):
                drops.append({'file': title, 'why': f'{prefix}標題不含姓名'})
                continue
            if NON_PORTRAIT.search(title):
                drops.append({'file': title, 'why': f'{prefix}非肖像（印章／地圖／碑刻等）'})
                continue
            if not PD_OK.search(lic):
                drops.append({'file': title, 'why': f'{prefix}授權 {lic or "未標"}，非 PD／CC0'})
                continue
            # 掃描 PDF 的 imageinfo 也會回頁面尺寸，僅看 width/height 無法區分
            # （實測「The life of Sir Stamford Raffles」整本傳記 PDF 曾被當候選）。
            mime = info.get('mime') or ''
            if not mime.startswith('image/'):
                drops.append({'file': title, 'why': f'{prefix}不是圖像檔（{mime or "無 mime"}）'})
                continue
            if info.get('width', 0) < MIN_SIDE or info.get('height', 0) < MIN_SIDE:
                drops.append(
                    {'file': title, 'why': f'{prefix}尺寸 {info.get("width")}x{info.get("height")} 不足 {MIN_SIDE}'}
                )
                continue
            out.append(
                {
                    'commons_file': title,
                    'page_url': info.get('descriptionurl', ''),
                    'license': lic,
                    'artist': val('Artist') or '未署',
                    'usage_terms': val('UsageTerms') or lic,
                    'attribution_required': val('AttributionRequired') in ('true', 'True', 'yes'),
                    'width': info.get('width'),
                    'height': info.get('height'),
                    'mime': info.get('mime'),
                }
            )
    out.sort(key=lambda c: -(c['width'] or 0))
    return out


def generate(country):
    rows = []
    for era, pid, name, term, match in PEOPLE[country]:
        print(f'  {country}/{pid}「{name}」查「{term}」…', file=sys.stderr)
        cands, drops = candidates_for(term, match)
        best = cands[0] if cands else None
        rows.append(
            {
                'era': era,
                'id': pid,
                'name': name,
                'search_term': term,
                'candidate_count': len(cands),
                'chosen': best,
                # basis 草稿直接可貼進 manifest／pack 的 portrait_note；查無圖時要寫明查過什麼
                'basis_draft': (
                    f'Wikimedia Commons「{best["commons_file"]}」（{best["license"]}，{best["artist"]}）'
                    if best
                    else f'尚無公版圖源：已以 Commons 檔案搜尋查「{term}」，無 PD／CC0 且標題含姓名、邊長 ≥{MIN_SIDE} 者'
                ),
                'alternates': [c['commons_file'] for c in cands[1:4]],
                # 淘汰原因要留檔：否則下一個看的人無法區分「真的無圖」與「查詢方法不對」
                'rejected': drops[:6],
                # 授權不合政策的（CC BY-SA 等）單列出來供人裁定——是否接受「僅需署名」
                # 屬產品決定，工具無權自行放寬「只取 PD／CC0」這條線。
                'other_license_hits': sorted({r['file'] for r in drops if '授權' in r['why']})[:5],
            }
        )
    if API_FAILURES:
        path = ROOT / 'reports' / f'portraits-pd-{country}.json'
        print(
            f'✗ 有 {API_FAILURES} 次 Commons 查詢徹底失敗，結果不可信；不寫檔（寫了會讓「查無公版圖」看起來像結論）。'
            f'請查 stderr 的失敗原因後重跑。',
            file=sys.stderr,
        )
        return 2
    path = ROOT / 'reports' / f'portraits-pd-{country}.json'
    path.parent.mkdir(exist_ok=True)
    path.write_text(
        json.dumps(
            {
                'country': country,
                'generated': time.strftime('%Y-%m-%d'),
                'min_side_px': MIN_SIDE,
                'license_policy': '只取 LicenseShortName 為 PD／CC0 之檔案',
                'people': rows,
            },
            ensure_ascii=False,
            indent=2,
        )
        + '\n',
        encoding='utf-8',
    )
    found = sum(1 for r in rows if r['candidate_count'])
    print(f'reports/portraits-pd-{country}.json：人物 {len(rows)} 位｜查到候選 {found} 位｜無圖 {len(rows) - found} 位')
    return 0 if found else 1


def check(country):
    """唯讀斷言：檔要存在、每位人物要有欄位、至少一半人物要有 PD 候選。給計畫行的「驗收=」用。"""
    path = ROOT / 'reports' / f'portraits-pd-{country}.json'
    if not path.is_file():
        print(f'✗ 缺 reports/portraits-pd-{country}.json（先跑 python3 scripts/portrait_pd_inventory.py --country={country}）')
        return 1
    data = json.loads(path.read_text(encoding='utf-8'))
    people = data.get('people', [])
    if len(people) != len(PEOPLE[country]):
        print(f'✗ 人物數 {len(people)} 與人物表 {len(PEOPLE[country])} 不符')
        return 1
    need = ('era', 'id', 'name', 'candidate_count', 'basis_draft')
    for p in people:
        for k in need:
            if k not in p:
                print(f'✗ {p.get("id", "?")} 缺欄位 {k}')
                return 1
    found = sum(1 for p in people if p['candidate_count'] and p.get('chosen'))
    for p in people:
        mark = '✓' if p.get('chosen') else '·'
        c = p.get('chosen') or {}
        print(f'  {mark} {p["id"]}「{p["name"]}」候選 {p["candidate_count"]}' + (f'｜{c.get("license")}｜{c.get("commons_file")}' if c else '｜尚無公版圖'))
    if found * 2 < len(people):
        print(f'✗ {len(people)} 位只有 {found} 位查到 PD 候選（不足一半），盤點不算完成')
        return 1
    print(f'✓ 圖源盤點成立：{found}/{len(people)} 位有 PD 候選')
    return 0


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--country', default='korea', choices=sorted(PEOPLE))
    ap.add_argument('--check', action='store_true', help='唯讀斷言（不查網路、不寫檔）')
    ap.add_argument('--list', action='store_true')
    a = ap.parse_args()
    if a.list:
        for c, rows in PEOPLE.items():
            print(f'{c}：' + '、'.join(r[2] for r in rows))
        sys.exit(0)
    sys.exit(check(a.country) if a.check else generate(a.country))
