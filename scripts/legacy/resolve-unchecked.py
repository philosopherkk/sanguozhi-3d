#!/usr/bin/env python3
"""resolve-unchecked.py — 把 audit:quotes 的「未核」引文拿去 zh.wikisource 全文檢索，
找到真正所在之卷並快取起來。

為什麼不是直接照出處抓卷次：出處寫《史記·周本紀》，但 zh.wikisource 的頁名是
「史記/卷004」這種阿拉伯零_fill 卷次；本紀/世家/列傳 與卷次沒有規則可推（周本紀=卷4、
魯周公世家=卷33）。一一看過 130 卷不實際，所以改用全文搜尋定位引文實際落在哪一頁。

誠實邊界（重要）：
  命中只代表「與 zh.wikisource 轉錄本一致」，不代表對引用欄所標的 NDL 印刷本校勘過。
  這與 audit:quotes 自己的措辭一致，不可在此腳本裡把結果寫成「已校勘」。

用法：
  python3 scripts/resolve-unchecked.py --limit 40        # 本輪最多處理 40 筆
  python3 scripts/resolve-unchecked.py --dry-run         # 只搜不抓，先看命中分佈
  python3 scripts/resolve-unchecked.py --witness-audit   # 攤開每筆原文的命中頁歸屬（不改判定）
  python3 scripts/resolve-unchecked.py --gap-fill --limit 20  # parse/allpages 端補缺卷（不靠搜尋端）
  python3 scripts/resolve-unchecked.py --suspect-audit    # 可疑候補＋證據，留人工（不改判定）

跑完要再接： npm run audit:quotes -- --json  才算數（判定仍由 verify-batch 一家做）。
"""
import argparse
import hashlib
import json
import pathlib
import re
import subprocess
import sys
import time
import urllib.parse

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import wikisource as ws  # noqa: E402  清洗／正規化／快取只用這一份

ROOT = pathlib.Path(__file__).resolve().parents[2]
AUDIT = ROOT / 'reports' / 'quotes-audit.json'
OUT = ROOT / 'reports' / 'unchecked-resolved.json'
LOG = ROOT / 'reports' / 'overnight-log.md'
WOUT = ROOT / 'reports' / 'witness-findings.json'
REPORT = ROOT / 'reports' / 'witness-findings.md'
SOUT = ROOT / 'reports' / 'suspect-findings.json'
REPORT2 = ROOT / 'reports' / 'suspect-findings.md'
EOUT = ROOT / 'reports' / 'edition-findings.json'


def search_titles(phrase, limit=4):
    """全文搜尋，回候選頁名。搜不到回 []，不猜。"""
    url = ('https://zh.wikisource.org/w/api.php?action=query&list=search&srsearch=' +
           urllib.parse.quote('"' + phrase + '"') + '&srlimit=' + str(limit) +
           '&format=json&formatversion=2')
    import subprocess
    raw = None
    for attempt in range(4):
        out = subprocess.run(['curl', '-s', '-m', '30', '-A', 'quote-audit/1.0', url],
                             capture_output=True, text=True).stdout
        try:
            raw = json.loads(out)
            break
        except Exception:
            time.sleep(3 + 3 * attempt)     # 被限速時退避，別把 API 打爆
    if not raw or 'query' not in raw:
        return None                          # None = 查詢失敗（不等於查無）
    return [r['title'] for r in raw['query']['search']]


DERIVATIVE = {
    '繹史', '太平御覽', '冊府元龜', '御選古文淵鑒', '通志', '欽定古今圖書集成',
    '春秋臣傳', '古史', '羣書治要', '尚書古文疏證', '竹書綂箋', '艺文類聚',
    '藝文類聚', '北堂書鈔', '初學記', '通典', '文獻通考', '周朝秘史', '吳許越成',
    '王荆公詩註',
}

ALIAS = {
    '左傳': ('春秋左傳註疏', '左傳', '春秋左氏傳'),
    '春秋左傳': ('春秋左傳註疏', '左傳', '春秋左氏傳'),
    # 春秋左氏傳/定公 就是左傳本文（實測該頁有「孔丘相」「犁彌」「知禮而無勇」
    # 「蔡侯以吳子及楚人戰于柏舉」），不是類書輯錄。不對映的話，定公一條明明逐字
    # 命中左傳本文卻會被 witness 過濾當成「非所引之書」而不去核對。
    # 註：不把『春秋』對到『春秋左氏傳』——左傳頁含經文，但拿「左傳」頁去證
    # 「春秋」屬弱證據，寧可留未核。
    '尚書': ('尚書',),
    '毛詩': ('毛詩',),
    # 『徳川実紀』的正文在 ja.wikisource 是「東照宮御実紀」（東照宮御実紀＝德川家康紀，
    # 全書名徳川実紀）。不對映的話，逐字明明命中卷四/卷五卻被判「只在別本書命中」。
    '徳川実紀': ('東照宮御実紀', '徳川実紀'),
    '德川実紀': ('東照宮御実紀', '徳川実紀'),
    '太閤記': ('川角太閤記', '太閤記'),
}


def cited_work(source):
    """從出處取被引的書名：《史記·周本紀》→史記、《左傳》哀公元年→左傳。"""
    m = re.search(r'[《『]([^》』·]+)', source or '')
    if m:
        return m.group(1).strip()
    m = re.match(r'\s*([^\s（(，、。]{2,12})', source or '')
    return m.group(1) if m else ''


def page_root(title):
    """頁名取書名本體：'通志 (四庫全書本)/卷077上' → '通志'、'ja:信長公記/我自刊我書' → '信長公記'。

    ja: 前綴一定要剝掉，否則日本典籍全部會被當成「非所引之書」——實測 8 筆明明逐字
    命中《信長公記》《東照宮御実紀》對應之卷，卻被這個前綴判成弱證據。
    """
    root = (title or '')
    if root.startswith('ja:'):
        root = root[3:]
    root = root.split('/')[0]
    return re.sub(r'\s*[（(].*$', '', root).strip()


def witness_ok(work, title):
    """命中頁必須是被引那本書（或其注疏），否則只是類書／後世輯錄裡出現過同一句。

    這條不是講究，是必要：corpus() 是拿整份快取比對的，一旦把《通志》《繹史》
    《尚書古文疏證》這類書快取進來，一條標《尚書》的引文會因為在 Qing 考證文
    （而且正是論證古文尚書為偽的那本）裡命中而被判成「原文」——那是假證據。
    """
    root = page_root(title)
    if not root:
        return False
    if root in DERIVATIVE:
        return False
    want = work
    for cand in ALIAS.get(want, (want,)):
        if root == cand or root.startswith(cand):
            return True
    return False


def page_index():
    """每頁的正规化正文（只算一次），供 --witness-audit 判定「命中在哪本書」。

    为什么需要：corpus() 是把整份快取接成一個大字串再比對，所以一條標《史記》的
    引文也可能在《資治通鑑》（大量抄錄史記文字）裡命中而被判「與轉錄本一致」。
    那仍是同一句文字，但 Witness 不是被引的那本書——證據強度不同，必須列出來，
    不能讓總數看不出來。這裡只診斷，不改判定（判定仍只有 verify-batch 一家）。
    """
    idx = []
    known = {}
    for p in ws.pages_list():
        lang = 'ja' if p.startswith('ja:') else 'zh'
        name = p[3:] if p.startswith('ja:') else p
        f = ws.CACHE / (hashlib.md5((lang + name).encode()).hexdigest() + '.txt')
        if not f.exists() or f.stat().st_size == 0:
            continue
        if p in known:                       # 清單有重複列（實測 178 行有 2 行重複）
            continue
        known[p] = True
        idx.append((p, ws.norm(ws.clean(f.read_text()))))
    return idx


def witness_audit(a):
    idx = page_index()
    print('快取頁 %d（清單上但未抓到的不算）' % len(idx))
    data = json.loads(AUDIT.read_text(encoding='utf-8'))
    orig = [r for r in data['rows'] if r['kind'] == 'original']
    strong, weak, none_hit, cross_page = [], [], [], []
    for r in orig:
        frags = [f for f in (r['quote'] or '').split('……') if len(ws.norm(f)) >= 6]
        if not frags:
            continue
        nf = [ws.norm(f) for f in frags]
        hits = [p for p, body in idx if all(x in body for x in nf)]
        work = cited_work(r['source'])
        good = [p for p in hits if witness_ok(work, p)]
        if good:
            strong.append({'id': r['id'], 'work': work, 'pages': good[:3]})
        elif hits:
            weak.append({'id': r['id'], 'work': work, 'pages': hits[:3],
                         'title': r.get('title', ''), 'group': r.get('group', ''),
                         'source': r.get('source', ''), 'quote': r['quote'][:120]})
        else:
            # 沒有「單一頁」含全部片段。這不等於判定有洞：verify-batch 是把整份快取
            # 接起來比對，引文本來可能取自同書不同頁（例 208-chibi 一段取周瑜傳、
            # 一段取武帝紀）。分兩類攤開：每段都能在（某頁）找到＝跨頁引文；
            # 有片段在任何頁都找不到＝那才是真的有洞。
            per_frag = []
            for x in nf:
                hp = [p for p, body in idx if x in body]
                per_frag.append({'frag': x[:40], 'pages': hp[:3]})
            missing = [y for y in per_frag if not y['pages']]
            rec = {'id': r['id'], 'work': work, 'title': r.get('title', ''),
                   'group': r.get('group', ''), 'source': r.get('source', ''),
                   'quote': r['quote'][:120], 'per_frag': per_frag}
            if missing:
                none_hit.append(rec)
            else:
                cross_page.append(rec)
    print('原文 %d 筆：命中所引之書 %d · 只命中他書（弱證據）%d · 跨頁引文 %d · 片段找不到頁 %d'
          % (len(orig), len(strong), len(weak), len(cross_page), len(none_hit)))
    WOUT.write_text(json.dumps({'_about': '「與轉錄本一致」之命中頁歸屬。weak=只在非所引之書命中，'
                                         '文字確實存在但 witness 不對，證據較弱。',
                                '_at': time.strftime('%Y-%m-%dT%H:%M:%S'),
                                'totals': {'original': len(orig), 'strong': len(strong),
                                           'weak': len(weak), 'cross_page': len(cross_page),
                                            'no_page': len(none_hit)},
                                'strong': strong, 'weak': weak,
                                 'cross_page': cross_page, 'no_page': none_hit},
                               ensure_ascii=False, indent=2), encoding='utf-8')
    lines = ['# 「與轉錄本一致」的命中頁歸屬（由 resolve-unchecked.py --witness-audit 產生）', '',
             '判定仍只由 `wikisource.py --verify-batch` 做；這份只是把「命中在哪本書」攤開，',
             '讓總數不被跨書命中灌水。weak 的意義：引文文字在快取裡確實存在，但所在之書',
             '不是出處點名的那本（例：標《史記》卻只在《資治通鑑》命中）。**不是引文錯**，',
             '但證據較弱，留人工決定要不要補抓被引之書的對應卷。', '',
             '- 原文合計 %d · 命中所引之書 %d · 只命中他書 %d · 跨頁引文 %d · 片段找不到頁 %d'
             % (len(orig), len(strong), len(weak), len(cross_page), len(none_hit)), '']
    for sect, title in ((weak, '只在非所引之書命中（弱證據）'),
                        (cross_page, '跨頁引文：每段都有頁可證，但無單一頁含全部片段（正常，不是洞）'),
                        (none_hit, '有片段在任何頁都找不到（應為 0，若不是 0 就是判定層有洞）')):
        lines.append('## %s（%d）' % (title, len(sect)))
        for x in sect:
            lines.append('- `%s` %s · 出處 %s' % (x['id'], x.get('group', ''), x.get('source', '')[:60]))
            lines.append('  - 引文：%s' % x['quote'])
            if x.get('per_frag'):
                for y in x['per_frag']:
                    lines.append('  - 片段 %s → %s' % (y['frag'], '、'.join(y['pages']) or '（無）'))
            else:
                lines.append('  - 命中頁：%s' % '、'.join(x.get('pages', []) or ['（無）']))
        lines.append('')
    REPORT.write_text('\n'.join(lines), encoding='utf-8')
    print('已寫出 reports/witness-findings.json / reports/witness-findings.md')


def named_pages(source):
    """出處點名了哪些「已快取」的頁（卷次或section名）。

    與 audit:quotes 的 vendored() 同一個意思，但這裡把《書名》卷五十八 這種
    「書名＋》＋卷次」也認（vendored() 的 [^》』]{0,14} 卡在 》 上，實測 43 條
    標《資治通鑑》卷次的未核因此從不進可疑）。只用於診斷，不改判定。
    """
    out = []
    for p in ws.pages_list():
        name = p[3:] if p.startswith('ja:') else p
        book, _, vol = name.partition('/')
        if book not in source:
            continue
        if not vol:
            continue
        key = vol.replace('卷', '').split('/')[0]
        want = ws.volnum(key)
        if want is not None:
            pat = re.escape(book) + r'》?[^〈（(；;，、《]{0,14}卷\s*第?\s*([0-9一二三四五六七八九十百千廿卅卌百]+)'
            if any(ws.volnum(m.group(1)) == want for m in re.finditer(pat, source)):
                out.append(p)
        elif key and key in source:          # 春秋左氏傳/哀公 ← 《左傳》哀公十七年
            out.append(p)
    return out


def suspect_audit(a):
    """診斷（不改判定）：出處點名的卷已在快取、引文卻不在裡面 → 引文本身有問題。
    這類在 audit 裡目前是「未核」，修好 vendored() 就會變「可疑」，閘門 14 會變紅，
    所以要人工先修引文。這裡只攤證據，不动 audit-quotes.ts 的判定。
    """
    data = json.loads(AUDIT.read_text(encoding='utf-8'))
    un = [r for r in data['rows'] if r['kind'] == 'unchecked']
    cache = {}
    def body(p):
        if p not in cache:
            lang = 'ja' if p.startswith('ja:') else 'zh'
            nm = p[3:] if p.startswith('ja:') else p
            f = ws.CACHE / (hashlib.md5((lang + nm).encode()).hexdigest() + '.txt')
            cache[p] = ws.clean(f.read_text()) if f.exists() and f.stat().st_size else ''
        return cache[p]
    findings = {}
    for r in un:
        src = r.get('source') or ''
        pages = named_pages(src)
        if not pages:
            continue
        for p in pages:
            raw = body(p)
            if not raw:
                continue
            nbody = ws.norm(raw)
            for fr in [f for f in (r['quote'] or '').split('……') if len(ws.norm(f)) >= 6]:
                nf = ws.norm(fr)
                if nf in nbody:
                    continue
                lo, hi = 0, len(nf)
                while lo < hi:
                    mid = (lo + hi + 1) // 2
                    if nf[:mid] in nbody:
                        lo = mid
                    else:
                        hi = mid - 1
                k = lo
                if k < 6:                      # 連頭 6 字都对不上＝不同来源，不算「點名之卷對不上」
                    continue
                pos = nbody.find(nf[:k])
                anchor = ws.norm(fr[:8])
                rp = raw.find(anchor[:4]) if anchor else -1
                window = re.sub(r'\s+', ' ', raw[rp:rp + 160]) if rp >= 0 else ''
                rec = findings.setdefault(r['id'], {'id': r['id'], 'group': r.get('group', ''),
                                                    'title': r.get('title', ''), 'source': src,
                                                    'quote': (r['quote'] or '')[:200],
                                                    'page': p, 'frags': []})
                rec['frags'].append({'frag': fr[:120], 'match': '%d/%d' % (k, len(nf)),
                                     'after': nf[k:k + 40], 'transcript': window})
    rows = list(findings.values())
    rows.sort(key=lambda x: x['id'])
    SOUT.write_text(json.dumps({'_about': '出處點名之卷已在快取、但引文非逐字（診斷，未改判定）。'
                                          '修 vendored() 後這些會變 audit 的「可疑」，閘門會變紅，'
                                          '需人工修 src 引文或明確決定放基準。',
                                 '_at': time.strftime('%Y-%m-%dT%H:%M:%S'),
                                 'count': len(rows), 'items': rows},
                                ensure_ascii=False, indent=2), encoding='utf-8')
    # 附加區保護（本輪修的腳本缺陷）：suspect-findings.md 檔尾那些
    # 「## 本輪（…）附加：…」是**人工**寫的逐條實據（12:00 輪 6 條、14:10 輪 6 條），
    # 舊版這裡 `REPORT2.write_text` 無條件覆寫整檔 —— 跑一次 --suspect-audit 就會把
    # 人工實據全刪。現在先留檔尾附加區，生成完再接回，自動段與人工段各留各的。
    manual = ''
    if REPORT2.exists():
        prev = REPORT2.read_text(encoding='utf-8')
        m = re.search(r'^## (?:本輪|人工)[^\n]*附加[^\n]*$', prev, re.M)
        if m:
            manual = prev[m.start():].rstrip()
    lines = ['# 可疑候選：出處點名的卷已在快取，但引文不是逐字（由 resolve-unchecked.py --suspect-audit 產生）',
             '',
             '**這一份不改判定。** audit:quotes 目前把這些算「未核」，因為它的 `vendored()`',
             '只認「書名＋14 字內接卷次」，遇到《資治通鑑》卷五十八 這種「書名＋》＋卷次」就漏；',
             '修好那個 regex，下面這些會變成「可疑」，閘門（現 14）會變紅。',
             '所以**要人工決定**：修 `src/**` 的引文（改成逐字、或補 …… 標節略、或改標出處），',
             '還是明確決定放寬基準。自動輪次不自己動被驗證的對象。',
             '',
             '共 %d 條。每條給：引文、出處、點名之頁、逐字比對走到第幾字斷掉、斷掉之後我們寫的'
             '是甚麼、轉錄本當地實際文字。' % len(rows), '']
    for x in rows:
        lines.append('## `%s` %s' % (x['id'], x.get('title') or ''))
        lines.append('- 群組：%s ｜ 出處：%s' % (x.get('group', ''), x['source'][:90]))
        lines.append('- 引文：%s' % x['quote'])
        lines.append('- 點名且已快取之頁：%s' % x['page'])
        for f in x['frags'][:3]:
            lines.append('  - 比對到第 %s 字斷；斷點之後我們寫：`%s`' % (f['match'], f['after'] or '（到結尾）'))
            lines.append('  - 轉錄本當地文字：%s' % (f['transcript'] or '（找不到錨點）'))
        lines.append('')
    if manual:
        lines += ['', '---', '',
                  '（以下為先前輪次附加的人工實據區，`--suspect-audit` 不覆寫它）', '']
        lines += [manual]
    REPORT2.write_text('\n'.join(lines), encoding='utf-8')
    print('可疑候補（未改判定）%d 條 → reports/suspect-findings.json / .md（保留人工附加區：%s）'
          % (len(rows), '有' if manual else '無'))


def _align_frag(nf, body):
    """在 body 找 nf 的最佳對齊：以 nf 前 6 字為錨，逐字往後比，
    統計「替代型」差異（兩邊都是單字、且斷後仍接回去）與「脫漏型」（純插入/刪除）。
    回 (best_len, subs, gaps)。只診斷用——判定仍由 verify-batch 一家做。"""
    if len(nf) < 6:
        return 0, [], []
    subs, gaps, best = [], [], 0
    start = 0
    while True:
        pos = body.find(nf[:6], start)
        if pos < 0:
            break
        start = pos + 1
        i, j, run = 0, pos, 0
        local_subs, local_gaps = [], []
        # 單字替代 + 單字插入/刪除；連續走過差異後仍要接回 6 字才算「同一句」
        while i < len(nf) and j < len(body):
            if nf[i] == body[j]:
                run += 1
                i += 1
                j += 1
                continue
            run = 0
            # 替代：兩邊各吃一字，後面 6 字要相同
            if (i + 1 < len(nf) and j + 1 < len(body) and nf[i + 1:i + 7] and
                    nf[i + 1:i + 7] == body[j + 1:j + 7]):
                local_subs.append((nf[i], body[j]))
                i += 1
                j += 1
                continue
            # 我們少寫了（轉錄本多字）：轉錄本吃一字，後面 6 字要接上
            if (nf[i:i + 6] and nf[i:i + 6] == body[j + 1:j + 7]):
                local_gaps.append(('轉錄本多', body[j]))
                j += 1
                continue
            # 我們多寫了（轉錄本無此字）
            if (body[j:j + 6] and body[j:j + 6] == nf[i + 1:i + 7]):
                local_gaps.append(('引文多', nf[i]))
                i += 1
                continue
            break
        best = max(best, i)
        if i >= 6 and (local_subs or local_gaps):
            subs.extend(local_subs)
            gaps.extend(local_gaps)
    return best, subs, gaps


def diff_audit(a):
    """離線診斷：未核引文與「被引之書」快取頁的字形差異對。不改判定、不打網路。

    目的：找 norm() 缺的異體字對。只列有證據的對（同一句、斷後仍接回去），
    並分開列「脫漏型」——那是引文刪了字，屬引文問題，不能靠字形對救。
    """
    idx = page_index()
    data = json.loads(AUDIT.read_text(encoding='utf-8'))
    un = [r for r in data['rows'] if r['kind'] == 'unchecked']
    seen, uniq = set(), []
    for r in un:
        k = (r['id'], r['quote'])
        if k not in seen:
            seen.add(k)
            uniq.append(r)
    pair_count = {}
    items = []
    for r in sorted(uniq, key=lambda r: cited_work(r.get('source') or '')):
        w = cited_work(r.get('source') or '')
        pages = [(p, b) for p, b in idx if witness_ok(w, p)]
        frags = [f for f in (r['quote'] or '').split('……') if len(ws.norm(f)) >= 6]
        rec = {'id': r['id'], 'work': w, 'group': r.get('group', ''),
               'source': (r.get('source') or '')[:120], 'quote': (r['quote'] or '')[:200],
               'pages': len(pages), 'subs': [], 'gaps': [], 'best': 0, 'frags': len(frags)}
        for f in frags:
            nf = ws.norm(f)
            for p, body in pages:
                b, s, g = _align_frag(nf, body)
                if b >= 6:
                    rec['best'] = max(rec['best'], b)
                    rec['subs'] += s
                    rec['gaps'] += g
                    for x in s:
                        pair_count[x] = pair_count.get(x, 0) + 1
                # 本輪補：片段「末尾」的單字異體，_align_frag 抓不到——它要求差異之後
                # 再接回 6 字，差異发生在結尾時沒有後續可接，於是整對漏報。
                # 實據：jin-311「死者甚眾」vs 晉書/卷005「死者甚衆」，20/21 字對齊，
                # 只差最後一字，舊 diff 完全沒列這個對，折字表就少一筆。
                if len(nf) >= 7:
                    lo, hi = 0, len(nf)
                    while lo < hi:
                        mid = (lo + hi + 1) // 2
                        if nf[:mid] in body:
                            lo = mid
                        else:
                            hi = mid - 1
                    if lo >= 6 and 0 < len(nf) - lo <= 2:
                        pos = body.find(nf[:lo])
                        if pos >= 0 and pos + lo < len(body):
                            pair = (nf[lo], body[pos + lo])
                            rec['subs'].append(pair)
                            pair_count[pair] = pair_count.get(pair, 0) + 1
                            rec['best'] = max(rec['best'], lo)
        items.append(rec)
    pairs = sorted(((n, a, b) for (a, b), n in pair_count.items()), reverse=True)
    out = {'_about': '未核引文與被引之書快取頁的逐字對齊差異（診斷，未改判定）。'
                     'subs=單字替代（多为異體字或異文），gaps=脫漏（引文刪/加字，屬引文問題）。',
           '_at': time.strftime('%Y-%m-%dT%H:%M:%S'),
           'items': items, 'pairs': [{'quote': a, 'transcript': b, 'n': n} for n, a, b in pairs]}
    pathlib.Path(ROOT / 'reports' / 'diff-audit.json').write_text(
        json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
    print('替代字對（引文字 / 轉錄本字 / 次數）前 40：')
    for n, x, y in pairs[:40]:
        print('  %3d  引「%s」 vs 轉「%s」' % (n, x, y))
    print('\n每筆最佳對齊長度 / 替代對 / 脫漏對：')
    for x in items:
        if x['best'] >= 6:
            print('  %-22s %-8s best %d/%d subs %s gaps %s'
                  % (x['id'], x['work'], x['best'], len(ws.norm(x['quote'])),
                     x['subs'][:6], x['gaps'][:4]))
    print('已寫出 reports/diff-audit.json')


def api_json(url, tries=5):
    """MediaWiki JSON，讀 HTTP 狀態碼退避（429/503）。回 None＝查詢失敗（下輪重試），
    不可當「上游查無」收掉。"""
    for attempt in range(tries):
        out = subprocess.run(['curl', '-s', '-m', '40', '-A', 'quote-audit/1.0',
                              '-w', '\n@@HTTP:%{http_code}@@', url],
                             capture_output=True, text=True).stdout
        code = ''
        if '@@HTTP:' in out:
            code = out.rsplit('@@HTTP:', 1)[1].strip('@ \n')
            out = out.rsplit('\n@@HTTP:', 1)[0]
        if code in ('429', '503'):
            time.sleep(min(300, 12 * (2 ** attempt)))
            continue
        try:
            raw = json.loads(out)
            return None if 'error' in raw else raw
        except Exception:
            time.sleep(3 + 4 * attempt)
    return None


def allpages_titles(prefix):
    """list=allpages：取該書實際存在的頁名清單（parse 端，比搜尋端不易被限速）。
    頁名由 API 給——鐵律 3：不編卷頁，查無就是查無。"""
    names, cont = [], None
    for _ in range(12):
        url = ('https://zh.wikisource.org/w/api.php?action=query&list=allpages&apprefix=' +
               urllib.parse.quote(prefix) + '&aplimit=500&format=json&formatversion=2')
        if cont:
            url += '&apcontinue=' + urllib.parse.quote(cont)
        raw = api_json(url)
        if raw is None:
            return names or None
        names += [r['title'] for r in raw.get('query', {}).get('allpages', [])]
        cont = (raw.get('continue') or {}).get('apcontinue')
        if not cont:
            break
        time.sleep(0.8)
    return names


def vol_page(book, want, cache={}):
    """出處點名了卷次 → 從 allpages 清單裡找該書實際對應的卷頁名
    （卷次兩邊折成整數再比：卷010 vs 卷十）。找不到回 None，不猜。"""
    if book not in cache:
        cache[book] = allpages_titles(book + '/') or []
    for t in cache[book]:
        tail = t.split('/', 1)[1] if '/' in t else ''
        if ws.volnum(tail.replace('卷', '').split('/')[0]) == want:
            return t
    return None


def toc_pages(book, chapter):
    """出處只給章名（《後漢書·皇甫嵩傳》）：抓該書索引頁，從**索引頁那行文字**取
    「章名 → 卷頁名」。章名推不出卷次（周本紀=卷4、魯周公世家=卷33），索引頁是權威來源。
    實測索引頁的寫法是「*[[史記/卷004|卷四]]　周本紀第四」與「*[[/卷71|卷七十一]]　皇甫嵩
    朱儁列傳　第六十一」——連結標籤只有卷次，章名在連結**之後**，所以一定要逐行比對；
    且連結可能是相對式 [[/卷71]]，要補回書名。頁名一律取自 API 回應（鐵律 3）。"""
    t = ws.fetch(book)
    if t.startswith(('PAGE_NOT_FOUND', 'FETCH_FAILED', 'NOT_CACHED')):
        return []
    key = re.sub(r'(傳|紀|志|書)$', '', chapter or '')
    if len(key) < 2:
        return []
    out = []
    for line in t.split('\n'):
        m = re.search(r'\[\[([^\]|#]+)(?:\|[^\]]*)?\]\]', line)
        if not m:
            continue
        title = m.group(1).strip()
        if title.startswith('/'):          # 相對連結：[[/卷71]] → 後漢書/卷71
            title = book + title
        if not title.startswith(book + '/'):
            continue
        if key in line:                    # 章名在同一行（標籤之後）
            out.append(title)
    return out


def cited_sections(work, src):
    """出處對同一本書可能點名**多個** section，舊版只取第一個，後面那卷永遠不被補。

    實據（本輪）：
      ymq-1294   出處「《元史·外夷傳·日本》至元二十年、二十三年條，《元史·世祖紀》
                 至元三十一年正月條」——比對不到的兩片段（「三十一年春正月壬子朔，
                 帝不豫，免朝賀。」「庚午，帝大漸。癸酉，帝崩于紫檀殿…」）屬第二個
                 section（世祖紀）；快取只有 元史/卷004-012、卷208，缺的正是索引頁
                 上那行「*[[元史/卷016|卷十六]]　本紀第十六: 世祖十三」指向的卷。
      wujing-505 出處「《梁書·武帝紀》天監四年正月條、《梁書·儒林傳·嚴植之》」——缺的
                 片段（「植之館在潮溝，生徒常百數…」）在 儒林傳；索引頁那行是
                 「*[[/卷48|卷四十八]]　列傳第四十二 儒林」→ 梁書/卷48 未快取。
    每個 section 再拆各層（儒林傳·嚴植之 → 嚴植之、儒林傳，由專到泛）：索引頁只列到
    「儒林」這一層、不列傳主姓名，只取末段會查無。頁名仍一律取自索引頁連結（鐵律 3）。
    """
    out = []
    for mm in re.finditer(r'[《『]' + re.escape(work) + r'[·・]([^》』（(、；]{2,30})[》』]',
                          src or ''):
        parts = [p.strip() for p in mm.group(1).split('·') if len(p.strip()) >= 2]
        for p in reversed(parts):                 # 傳主名優先，再傳類名
            if p not in out:
                out.append(p)
    return out


def frags_of(quote):
    return [f for f in (quote or '').split('……') if len(ws.norm(f)) >= 6]


def page_hits(page, quote):
    """抓這一頁，用**完整片段** norm() 逐字比對才算命中（不是抓到頁就算核過）。
    命中只代表與轉錄本一致，未對 NDL 印刷本校勘。"""
    body = ws.clean(ws.fetch(page))
    if body.startswith(('PAGE_NOT_FOUND', 'FETCH_FAILED', 'NOT_CACHED')):
        return None
    fr = frags_of(quote)
    if not fr:
        return 'short'
    nb = ws.norm(body)
    # 回**完整**片段（不截字）：跨卷引文要把多頁的命中做聯集，截字就無法對回原片段。
    return [f for f in fr if ws.norm(f) in nb]


def best_fragment(quote):
    """挑最有辨識度的片段：最長者優先（短的像「王大傷」到處都有，會誤命中）。"""
    frags = [f.strip() for f in (quote or '').split('……') if len(ws.norm(f.strip())) >= 8]
    return max(frags, key=len) if frags else None


def search_keys(frag):
    """搜尋鍵的退避鏈（只影響「去哪找」，不影響判定：抓到頁之後仍要用
    完整片段 norm() 逐字比對才算命中）。

    實測證據（本輪）：《資治通鑑》卷四 田單一條，
      - 原始片段（81 字，含標點）→ 搜尋回傳 0 筆
      - 去標點（67 字）        → 搜尋回傳 0 筆
      - 去標點後前 12 字        → 回傳 資治通鑑/卷004（正解，且已快取）
    MediaWiki 全文搜尋對長 CJK 字串不稳（引文常跨行／跨標點），只用長鍵會把
    「上游其實有」誤報成「查無」——這是未核下不去的原因之一，不是引文錯。
    短鍵可能抓回不相关的頁，所以 witness_ok 過濾與逐字驗證一律照舊。
    """
    nf = ws.norm(frag)
    keys = [frag]
    if nf != frag:
        keys.append(nf)
    for w in (12, 8):
        if len(nf) > w:
            keys.append(nf[:w])
            keys.append(nf[len(nf) // 2: len(nf) // 2 + w])
    seen, out = set(), []
    for k in keys:
        if k and k not in seen:
            seen.add(k)
            out.append(k)
    return out


def gap_fill(a):
    """補「出處點名了哪一卷／哪一章，但那一卷還沒快取」的缺口。
    走 parse/allpages 端（搜尋端上輪整輪 429）。邊界：
      - 要抓哪一卷只從**出處文字**取（不是我們決定哪一卷可能有用）
      - 頁名只從 allpages／索引頁連結取（鐵律 3：不編卷頁）
      - 抓到頁後仍用完整片段 norm() 逐字比對才算命中；判定照舊只由 verify-batch 做
      - 出處點名的卷已在快取 → 跳過不打網路（那種是引文非逐字，只能人工修 src/**）
    """
    data = json.loads(AUDIT.read_text(encoding='utf-8'))
    un = [r for r in data['rows'] if r['kind'] == 'unchecked']
    seen, uniq = set(), []
    for r in un:
        k = (r['id'], ws.norm(r['quote']))
        if k in seen:
            continue
        seen.add(k)
        uniq.append(r)
    cached = {}
    have = set()
    for p in ws.pages_list():
        have.add(p)
        nm = p[3:] if p.startswith('ja:') else p
        book, _, vol = nm.partition('/')
        if vol:
            v = ws.volnum(vol.replace('卷', ''))
            if v is not None:
                cached.setdefault(book, set()).add(v)
    todo, skipped = [], 0
    for r in sorted(uniq, key=lambda r: cited_work(r.get('source') or '')):
        src = r.get('source') or ''
        work = cited_work(src)
        if not work or work in DERIVATIVE:
            continue
        named = None
        for m in re.finditer(re.escape(work) + r'》?[^〈（(；;，、《]{0,14}卷\s*第?\s*'
                             r'([0-9〇零一二三四五六七八九十百千廿卅卌百]+)', src):
            named = ws.volnum(m.group(1))
            if named is not None:
                break
        sections = cited_sections(work, src)
        # 「點名之卷已在快取」才可跳過；同一条出處點名兩個 section 時
        # （《元史·外夷傳·日本》…《元史·世祖紀》…），第一個已補齊不等於第二個也補齊。
        if named is not None and named in cached.get(work, set()) and not sections:
            skipped += 1
            continue
        todo.append((r, work, named, sections))
    print('待補 %d 筆（點名之卷已在快取而跳過 %d 筆＝引文非逐字，只能人工修引文）'
          % (len(todo), skipped))
    done, notfound, failed = [], [], []
    # 該書已快取頁的正文（只算用得到的書）：跨卷引文的片段可能一半已在别的卷，
    # 要把「這一卷補到」與「另一卷早就有」合起來看，否則多卷引文永遠報未命中。
    work_body = {}

    def work_body_of(work):
        if work not in work_body:
            acc = []
            for p in sorted(have):
                nm = p[3:] if p.startswith('ja:') else p
                lang = 'ja' if p.startswith('ja:') else 'zh'
                if nm.split('/')[0] != work or '/' not in nm:
                    continue
                f = ws.CACHE / (hashlib.md5((lang + nm).encode()).hexdigest() + '.txt')
                if f.exists() and f.stat().st_size > 0:
                    acc.append(ws.norm(ws.clean(f.read_text())))
            work_body[work] = ''.join(acc)
        return work_body[work]

    fetched = 0                                 # 全輪抓取預算（限速環境下要有上限）
    for i, (r, work, named, sections) in enumerate(todo[:a.limit]):
        cands, how = [], ''
        if named is not None:
            p = vol_page(work, named)
            if p:
                cands, how = [p], 'allpages 卷次'
            else:
                print('  [%d] %s：%s 卷%s：allpages 無此卷頁（上游沒有，不猜）'
                      % (i, r['id'], work, named))
                failed.append({'id': r['id'], 'work': work, 'why': 'allpages 查無該卷頁'})
                continue
        if not cands and sections:
            for sec in sections:                # 每個點名的 section 都要試，不只第一個
                for t in toc_pages(work, sec):
                    if t not in cands:
                        cands.append(t)
            if cands:
                how = '索引頁章名(' + '、'.join(sections) + ')'
        # 已在快取的候選不必再抓：corpus() 是整份快取接起來比對，那一頁的文字本來
        # 就已经在比對範圍裡——再抓一次不會讓判定改變，只是浪費額度。
        cands = [p for p in cands if p not in have]
        cands.sort(key=lambda t: (ws.volnum((t.split('/', 1)[1] if '/' in t else '')
                                            .replace('卷', '').split('/')[0]) or 10 ** 6, t))
        if len(cands) > 6:
            print('  [%d] %s：%s 候補 %d 個，只試前 6 個：%s'
                  % (i, r['id'], '、'.join(sections) or named, len(cands), cands[:6]))
            cands = cands[:6]
        need = frags_of(r['quote'])
        base = work_body_of(work)
        found = {f for f in need if ws.norm(f) in base}
        if not cands:
            print('  [%d] %s：%s 找不到未快取的卷頁（section %s）'
                  % (i, r['id'], work, '、'.join(sections) or '-'))
            notfound.append({'id': r['id'], 'work': work, 'sections': sections,
                             'frags': len(need), 'covered': len(found)})
            continue
        got = []
        for p in cands:
            if a.dry_run:
                print('  [%d] %s 候補 %s（%s）' % (i, r['id'], p, how))
                continue
            if fetched >= a.max_fetch:
                print('  [%d] %s：本輪抓取額度 %d 已用完，剩下的卷下輪再補'
                      % (i, r['id'], a.max_fetch))
                failed.append({'id': r['id'], 'work': work, 'why': '抓取額度用盡'})
                break
            fetched += 1
            h = page_hits(p, r['quote'])
            if h is None:
                print('  [%d] %s → %s：PAGE_NOT_FOUND（頁名來自 API 但抓不到）' % (i, r['id'], p))
                continue
            got.append(p)
            if h == 'short':
                continue
            for f in h:
                found.add(f)
            print('  [%d] %s → %s：片段 %d/%d（%s）'
                  % (i, r['id'], p, len(found), len(need), how))
        miss = [f for f in need if f not in found]
        rec = {'id': r['id'], 'title': r.get('title', ''), 'group': r.get('group', ''),
               'source': (r.get('source') or '')[:120], 'how': how, 'candidates': cands,
               'hits': got, 'frags': len(need), 'covered': len(found),
               'missing_frags': [f[:40] for f in miss]}
        # 「湊齊」＝該書（已快取＋本輪新抓）的頁能把全部片段逐字覆盖，
        # 這預言 audit 會轉成「與轉錄本一致」；判定仍只由 verify-batch 決定。
        (done if (need and not miss) else notfound).append(rec)
        time.sleep(1.0)
    prev = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {}
    merged = {'_about': '未核引文 → zh.wikisource 頁名定位結果。命中＝與轉錄本一致，'
                        '非對 NDL 印刷本校勘。',
              '_at': time.strftime('%Y-%m-%dT%H:%M:%S'),
              'resolved': prev.get('resolved', {}),
              'notfound': prev.get('notfound', {}),
              'wrong_witness': prev.get('wrong_witness', {}),
              'failed': prev.get('failed', {})}
    for x in done:
        merged['resolved'][x['id']] = x
        merged['notfound'].pop(x['id'], None)     # 清掉同一 id 的舊「查無」紀錄
        merged['failed'].pop(x['id'], None)       #   （早輪 dry-run 有誤報，別留矛盾）
    for x in notfound:
        merged['notfound'][x['id']] = x
    for x in failed:
        merged['failed'][x['id']] = x
    OUT.write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding='utf-8')
    print('\n本輪 gap-fill（parse/allpages 端）：湊齊 %d · 未湊齊 %d · 上游無此卷頁／額度 %d · 抓頁 %d'
          % (len(done), len(notfound), len(failed), fetched))
    if not a.dry_run:
        # dry-run 沒有抓頁、也沒有改變任何判定，寫進度日誌會在「附加式」的輪次紀錄裡
        # 摻進一筆看起來像執行過的條目，誤導下一輪讀者。
        with LOG.open('a', encoding='utf-8') as f:
            f.write('\n## %s gap-fill（parse/allpages 端）\n' % time.strftime('%Y-%m-%d %H:%M'))
            f.write('- 待補 %d 筆：片段湊齊 %d · 未湊齊 %d · 無卷頁／額度用盡 %d（本輪抓 %d 頁）\n'
                    % (min(len(todo), a.limit), len(done), len(notfound), len(failed), fetched))
            f.write('- 跳過 %d 筆：出處點名之卷已在快取且無其他 section → 引文非逐字，只能人工修 src/**\n' % skipped)
            f.write('- 卷次／section 取自出處文字，頁名取自 allpages／索引頁連結；'
                    '片段可在多卷分數合起來才算湊齊；判定仍只由 verify-batch 做\n')


def edition_pages(book, want, cache={}):
    """同一本書的**其他版**（四庫全書本、四部叢刊本…）裡與 want 同卷次的頁名。
    頁名一律由 list=allpages 的回應取（鐵律 3：不編卷頁）。
    只收 page_root 折掉版次括號後仍等於 book 的頁——別的書一律不要，
    這跟 witness_ok 同一標準，所以不會把「他書也有這句」變成證據。"""
    if book not in cache:
        cache[book] = allpages_titles(book) or []
    out = []
    for t in cache[book]:
        root = t.split('/')[0]
        if root == book:                        # 主轉錄（gap_fill 路線已在比對）
            continue
        if page_root(t) != book:                # 不是這本書的異版 → 不收
            continue
        tail = t.split('/', 1)[1] if '/' in t else ''
        if ws.volnum(tail.replace('卷', '').split('/')[0]) == want:
            out.append(t)
    return out


def edition_fill(a):
    """補（c）類：出處點名的卷**已在快取**、引文卻逐字對不上，抓網路唯一還可能救的
    是「同一本書的其他版」——異版用字本就不同（實測：主轉錄 資治通鑑 同一事內
    「戰于丹陽」「戰於藍田」兩用，卡片作「于」；隋書 主轉錄作「多利思北孤」，
    卡片作「多利思比孤」）。邊界與 gap_fill 同樣嚴：
      - 只對「點名之卷已快取」的條目做（卷沒快取的該走 gap_fill，不重複抓）
      - 頁名只從 allpages 回應取；page_root 必須仍是被引那本書（witness_ok 同標準）
      - 抓到頁仍要完整片段 norm() 逐字比對才算命中；判定照舊只由 verify-batch 做
    """
    data = json.loads(AUDIT.read_text(encoding='utf-8'))
    un = [r for r in data['rows'] if r['kind'] == 'unchecked']
    seen, uniq = set(), []
    for r in un:
        k = (r['id'], ws.norm(r['quote']))
        if k in seen:
            continue
        seen.add(k)
        uniq.append(r)
    have = set(ws.pages_list())
    todo = []
    for r in sorted(uniq, key=lambda r: cited_work(r.get('source') or '')):
        named = named_pages(r.get('source') or '')   # 出處點名且已快取的頁
        if not named:
            continue                                  # 卷沒快取 → gap_fill 的活，不這裡做
        want = []
        for p in named:
            nm = p[3:] if p.startswith('ja:') else p
            book, _, vol = nm.partition('/')
            if not vol:
                continue
            v = ws.volnum(vol.replace('卷', ''))
            if v is not None:
                want.append((book, v, p))
        if want:
            todo.append((r, want))
    print('（c）類 %d 筆（點名之卷已快取）；本輪上限 %d 頁、處理前 %d 筆'
          % (len(todo), a.max_fetch, min(len(todo), a.limit)))
    fetched, frag_hit, no_hit, no_edition = 0, [], [], []

    def cached_body(p):
        """已在快取的頁 → 正規化正文（離線；不重複抓、不打額度）。"""
        lang = 'ja' if p.startswith('ja:') else 'zh'
        nm = p[3:] if p.startswith('ja:') else p
        f = ws.CACHE / (hashlib.md5((lang + nm).encode()).hexdigest() + '.txt')
        return ws.norm(ws.clean(f.read_text())) if f.exists() and f.stat().st_size > 0 else ''

    for i, (r, want) in enumerate(todo[:a.limit]):
        need = frags_of(r['quote'])
        if not need:
            continue
        eds_cached, eds_fresh = [], []
        for book, v, src_page in want:
            for t in edition_pages(book, v):
                (eds_cached if t in have else eds_fresh).append(t)
        found, seen = set(), []
        for p in eds_cached:            # 異版已在快取 → 離線逐字比對（不再抓）
            nb = cached_body(p)
            if not nb:
                continue
            seen.append(p)
            hit = [f for f in need if ws.norm(f) in nb]
            found.update(hit)
            if hit:
                print('  [%d] %s → 已快取異版 %s：片段 %d/%d'
                      % (i, r['id'], p, len(found), len(need)))
        for p in eds_fresh[:2]:         # 每卷最多兩個異版，別燒額度
            if fetched >= a.max_fetch:
                print('  [%d] %s：本輪抓取額度 %d 已用完' % (i, r['id'], a.max_fetch))
                break
            if a.dry_run:
                print('  [%d] %s 異版候補 %s（未抓）' % (i, r['id'], p))
                continue
            fetched += 1
            h = page_hits(p, r['quote'])
            if h is None:
                print('  [%d] %s → %s：PAGE_NOT_FOUND（頁名來自 API 但抓不到）'
                      % (i, r['id'], p))
                continue
            if h == 'short':
                continue
            seen.append(p)
            found.update(h)
            print('  [%d] %s → 異版 %s：片段 %d/%d' % (i, r['id'], p, len(found), len(need)))
        rec = {'id': r['id'], 'group': r.get('group', ''),
               'source': (r.get('source') or '')[:120],
               'quote': (r['quote'] or '')[:200],
               'named_cached': [p for _, _, p in want],
               'edition_pages_upstream': sorted(set(eds_cached) | set(seen)),
               'edition_pages_compared': seen,
               'frags': len(need), 'covered_by_edition': len(found),
               'missing_frags': [f[:40] for f in need if f not in found]}
        # 分三种，別再混：有異版且片段逐字命中 / 有異版但對不上 / 上游根本無異版卷頁
        if found:
            frag_hit.append(rec)
        elif seen:
            no_hit.append(rec)
        else:
            no_edition.append(rec)
        time.sleep(0.8)
    out = {'_about': '（c）類（出處點名之卷已快取、引文非逐字）改試「同書異版」之結果。'
                     'covered_by_edition>0 才叫命中（該片段與該書另一版逐字一致）；'
                     '抓到頁不等於命中。判定仍只由 verify-batch 做，這裡不改 audit。',
           '_at': time.strftime('%Y-%m-%dT%H:%M:%S'),
           '_max_fetch': a.max_fetch, '_dry_run': a.dry_run,
           'edition_frag_hits': frag_hit,
           'edition_pages_no_match': no_hit,
           'no_edition_page_upstream': no_edition}
    EOUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
    print('（c）類 %d 筆 → 異版片段逐字命中 %d · 有異版但非逐字 %d · 上游無異版卷頁 %d · 新抓 %d 頁'
          ' → reports/edition-findings.json'
          % (len(todo), len(frag_hit), len(no_hit), len(no_edition), fetched))
    if not a.dry_run:
        with LOG.open('a', encoding='utf-8') as f:
            f.write('\n## %s edition-fill（同書異版，parse/allpages 端）\n'
                    % time.strftime('%Y-%m-%d %H:%M'))
            f.write('- （c）類 %d 筆 → 異版片段**逐字命中** %d 筆 · 有異版卷頁但非逐字 %d 筆 · '\
                    '上游無異版卷頁 %d 筆 · 本輪新抓 %d 頁\n'
                    % (len(todo), len(frag_hit), len(no_hit), len(no_edition), fetched))
            f.write('- 頁名一律取自 list=allpages；只收 page_root 仍是被引那本書的異版頁'
                    '（witness_ok 同標準）；抓到頁不等於命中，逐字比對仍由 verify-batch 一家做\n')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--limit', type=int, default=40)
    ap.add_argument('--offset', type=int, default=0)
    ap.add_argument('--max-fetch', type=int, default=24,
                    help='gap-fill 本輪最多抓幾頁（上游 429 時要有上限，別把額度燒光）')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--prune', action='store_true',
                    help='把不在 reports/wikisource-pages.txt 上的快取檔刪掉（清掉誤抓的類書）')
    ap.add_argument('--keep', default=None,
                    help='搭配 --prune：只保留這個清單裡的頁名（例：用 git 上的舊清單）')
    ap.add_argument('--witness-audit', action='store_true',
                    help='不改判定，只統計每筆「原文」的命中頁是不是被引那本書')
    ap.add_argument('--suspect-audit', action='store_true',
                    help='不改判定，列出「出處點名的卷已快取但引文非逐字」的可疑候補與證據')
    ap.add_argument('--diff-audit', action='store_true',
                    help='不改判定、不打網路：未核引文與被引之書快取頁的逐字對齊差異'
                         '（找 norm() 缺的異體字對，附證據）')
    ap.add_argument('--gap-fill', action='store_true',
                    help='走 parse/allpages 端補「出處點名之卷尚未快取」的缺口'
                         '（卷次取自出處、頁名取自 API 回應）')
    ap.add_argument('--edition-fill', action='store_true',
                    help='對「出處點名之卷已快取、引文卻非逐字」的（c）類改試'
                         '「同書異版」卷頁（頁名取自 allpages；判定仍由 verify-batch 做）')
    a = ap.parse_args()

    if a.edition_fill:
        if not AUDIT.exists():
            print('先跑： npm run audit:quotes:json', file=sys.stderr)
            sys.exit(1)
        edition_fill(a)
        sys.exit(0)

    if a.gap_fill:
        if not AUDIT.exists():
            print('先跑： npm run audit:quotes:json', file=sys.stderr)
            sys.exit(1)
        gap_fill(a)
        sys.exit(0)

    if a.diff_audit:
        if not AUDIT.exists():
            print('先跑： npm run audit:quotes:json', file=sys.stderr)
            sys.exit(1)
        diff_audit(a)
        sys.exit(0)

    if a.suspect_audit:
        if not AUDIT.exists():
            print('先跑： npm run audit:quotes:json', file=sys.stderr)
            sys.exit(1)
        suspect_audit(a)
        sys.exit(0)

    if a.witness_audit:
        if not AUDIT.exists():
            print('先跑： npm run audit:quotes:json', file=sys.stderr)
            sys.exit(1)
        witness_audit(a)
        sys.exit(0)

    if a.prune:
        listfile = pathlib.Path(a.keep) if a.keep else ws.PAGES
        keep = {p.strip() for p in listfile.read_text(encoding='utf-8').split('\n') if p.strip()}
        want = {(hashlib.md5((('ja' if p.startswith('ja:') else 'zh') +
                              (p[3:] if p.startswith('ja:') else p)).encode()).hexdigest() + '.txt')
                for p in keep}
        removed = [f for f in ws.CACHE.glob('*.txt') if f.name not in want]
        for f in removed:
            f.unlink()
        print('清單 %d 頁；刪掉 %d 個不在清單上的快取檔' % (len(keep), len(removed)))
        sys.exit(0)

    if not AUDIT.exists():
        print('先跑： npm run audit:quotes -- --json', file=sys.stderr)
        sys.exit(1)

    data = json.loads(AUDIT.read_text(encoding='utf-8'))
    unchecked = [r for r in data['rows'] if r['kind'] == 'unchecked']
    # 同一條引文會在多個群組出現（帝制 pack 與 pack-* 用的是同一批 events，實測 158 筆
    # 只有 ~80 個唯一 id）。不去重就等于對同一句再搜一次、再抓一次，還容易撞上限速。
    seen, uniq = set(), []
    for r in unchecked:
        key = (r['id'], ws.norm(r['quote']))
        if key in seen:
            continue
        seen.add(key)
        uniq.append(r)
    # 排程：已被快取覆蓋越少（＝根本沒有轉錄本可比）的書排前面。
    # 不排序的话 offset 0 永遠是周/出土那批（類書命中被擋、卜辭無轉錄本），
    # 每輪把同一批查無的項目再搜一遍——未核不下壓的一半原因是這個。
    cached_roots = {}
    for p in ws.pages_list():
        root = page_root(p)
        cached_roots[root] = cached_roots.get(root, 0) + 1
    def coverage(r):
        work = cited_work(r.get('source') or '')
        for cand in ALIAS.get(work, (work,)):
            if cand in cached_roots:
                return cached_roots[cand]
        return 0
    uniq.sort(key=coverage)
    batch = uniq[a.offset:a.offset + a.limit]
    print('未核共 %d 筆（去重後 %d 筆），本輪處理 %d 筆（offset %d，已按「該書已快取頁數」排序）'
          % (len(unchecked), len(uniq), len(batch), a.offset))

    done, notfound, failed, partial, wrongwitness = [], [], [], [], []
    for i, r in enumerate(batch, 1):
        frag = best_fragment(r['quote'])
        if not frag:
            partial.append({'id': r['id'], 'why': '引文太短，無法當搜尋鍵'})
            continue
        titles, api_failed = None, False
        for key in search_keys(frag):
            got = search_titles(key)
            if got is None:
                api_failed = True
                continue
            if got:
                titles = got
                break
        if titles is None:
            if api_failed:
                # 有鍵被限速 → 標 failed（下輪重試），不可當「上游查無」收掉
                failed.append({'id': r['id'], 'why': '搜尋 API 失敗／限速'})
                print('  [%d] API失敗 %s' % (i, r['id']))
            else:
                notfound.append({'id': r['id'], 'frag': frag[:40],
                                 'source': (r.get('source') or '')[:40]})
                print('  [%d] 查無 %s · %s' % (i, r['id'], frag[:24]))
            time.sleep(1.5)
            continue

        nf = ws.norm(frag)
        work = cited_work(r['source'])
        allowed = [t for t in titles[:4] if witness_ok(work, t)]
        rejected = [t for t in titles[:4] if t not in allowed]
        hits = []
        if not a.dry_run:
            for t in allowed[:3]:
                body = ws.clean(ws.fetch(t))
                if nf in ws.norm(body):
                    hits.append(t)
        # title 一定要用 .get()：實測 112 筆未核有 27 筆（整個三國群，如 189-dongzhuo）
        # 在 quotes-audit.json 裡根本沒有 title 欄（事件卡沒標題，JSON.stringify 就不輸出该键）。
        # 上一轮因此在第 27 筆 KeyError 中止，後面 30+ 筆完全沒跑——「未核下不去」有相当
        # 一块只是定位器自己崩了，不是上游查無。
        rec = {'id': r['id'], 'title': r.get('title', ''), 'group': r.get('group', ''),
               'source': r.get('source', ''), 'frag': frag[:80], 'hits': hits,
               'candidates': allowed[:3], 'rejected_witness': rejected[:3]}
        if hits:
            done.append(rec)
            print('  [%d] 命中 %s → %s' % (i, r['id'], hits[0]))
        elif rejected and not allowed:
            wrongwitness.append({'id': r['id'], 'work': work, 'frag': frag[:40],
                                 'candidates': rejected[:3]})
            print('  [%d] 只在非所引之書命中 %s（%s）→ 不算核過' % (i, r['id'], rejected[0]))
        else:
            notfound.append(rec)
            print('  [%d] 未命中 %s（候選 %s）' % (i, r['id'], allowed[:3]))
        time.sleep(1.2)

    prev = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {}
    merged = {'_about': '未核引文 → zh.wikisource 頁名定位結果。命中＝與轉錄本一致，'
                        '非對 NDL 印刷本校勘。',
              '_at': time.strftime('%Y-%m-%dT%H:%M:%S'),
              'resolved': prev.get('resolved', {}),
              'notfound': prev.get('notfound', {}),
              'wrong_witness': prev.get('wrong_witness', {}),
              'failed': prev.get('failed', {})}
    for x in done:
        merged['resolved'][x['id']] = x
    for x in notfound:
        merged['notfound'][x['id']] = x
    for x in wrongwitness:
        merged['wrong_witness'][x['id']] = x
    for x in failed:
        merged['failed'][x['id']] = x
    OUT.write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding='utf-8')

    print('\n本輪：命中 %d · 查無/未命中 %d · API失敗 %d · 片段過短 %d'
          % (len(done), len(notfound), len(failed), len(partial)))
    print('累計：命中 %d / 未核 %d' % (len(merged['resolved']), len(unchecked)))
    if merged['failed']:
        print('⚠ API 失敗 %d 筆，下輪重試（不計入查無）' % len(merged['failed']))

    with LOG.open('a', encoding='utf-8') as f:
        f.write('\n## %s resolve-unchecked\n' % time.strftime('%Y-%m-%d %H:%M'))
        f.write('- 本輪 %d 筆：命中 %d · 查無 %d · API失敗 %d\n'
                % (len(batch), len(done), len(notfound), len(failed)))
        f.write('- 累計命中 %d / 未核 %d\n' % (len(merged['resolved']), len(unchecked)))
        f.write('- 命中只代表與轉錄本一致，未對 NDL 印刷本校勘\n')


if __name__ == '__main__':
    main()
