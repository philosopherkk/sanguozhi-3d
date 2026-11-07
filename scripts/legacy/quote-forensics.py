#!/usr/bin/env python3
"""quote-forensics.py — 未核／已核引文的**診斷**工具（唯讀，不改判定、不碰 src）。

清洗與比對邏輯一律 import scripts/wikisource.py（只有一份），這裡絕不重寫。
audit:quotes 的判定仍只由 `wikisource.py --verify-batch` 產生；本腳本只回答兩個
「我們的驗證本身是否誠實／是否漏判」的問題，輸出 reports/quote-forensics.json。

用法：
  python3 scripts/quote-forensics.py --raw-check     # 未核片段是不是被 clean() 刪掉的？
  python3 scripts/quote-forensics.py --splice-check  # 已核命中有無只靠「跨頁拼接」？
  python3 scripts/quote-forensics.py --classify      # 剩餘未核依**證據**分 (a)(b)(c)(d) 類
                                                     # → reports/remaining-unchecked.json
  python3 scripts/quote-forensics.py --citation-gap  # 反事實：卷次匹配不被《書名》後的 》
                                                     # 擋掉時，哪幾筆未核會升「可疑」
                                                     # → reports/citation-gap.json
  python3 scripts/quote-forensics.py --variant-gap   # 反事實：候選折字對（于/於）會解鎖幾筆未核、
                                                     # 又會破掉幾筆現有「原文」
                                                     # → reports/variant-gap.json
  python3 scripts/quote-forensics.py --cache-audit   # 證據基礎（vendor/wikisource 297 頁）本身
                                                     # 的完整性：清單↔快取雙向一致、有無類書
                                                     # 污染回來、導向頁／哨兵／重複正文
                                                     # → reports/cache-audit.json
 --classify 的動機：自動路線跑到不再產生新命中時，「剩餘未核」必須變成可重複驗證的分類，
 而不是印象話。每筆的類別都由可查的訊號推得（該書在快取有幾頁、片段拆掉全部模板後存不存在、
 出處點名的卷是否已快取、resolve-unchecked 的查無/限速紀錄），不需人工標記。
 判定本身仍不由本腳本產生（鐵律 2）：它只解釋「為什麼這些仍未核」，並給下輪一個對照基準。


--raw-check 的兩個視角：
  clean 視角 = norm(clean(raw))  ← 判定實際用的正文
  keep  視角 = norm(unwrap_all(raw)) ← 拆掉**所有**模板外殼、內容全留（含 apparatus）
  片段在 keep 視角比 clean 視角走得更遠 ⇒ 那段文字在原始 wikitext 裡存在、卻被 clean()
  刪掉了。這**不等於**該放寬：还要看斷點外層是哪個模板——若是書誌／apparatus
  （{{SK notes}}、{{仮題}}、{{nop}}、集解／正義／索隱），刪是對的（放寬會製造假命中）；
  若包的是正文（像 {{專|禹}}、{{ProperNoun|遼}} 那兩次實測 bug），才是真假陰性。
  所以輸出附斷點周边的**原始 wikitext** 讓人工判。

--splice-check 的動機：corpus() 把各頁 norm 之後**無分隔**串起來，
理論上存在「前半在 A 頁末、後半在 B 頁首」的跨頁假命中。若屬實，
「與轉錄本一致」的數字就被誇大了（鐵律 5 禁止假命中）。本檢查逐條核。
"""
import datetime
import hashlib
import json
import pathlib
import re
import sys
import time

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import wikisource as W  # noqa: E402  清洗／比對唯一來源

ROOT = pathlib.Path(__file__).resolve().parent.parent
AUDIT = ROOT / 'reports' / 'quotes-audit.json'
OUT = ROOT / 'reports' / 'quote-forensics.json'

# 候選折字對：只給 --variant-gap 做**對照計算**，絕不套進 W.norm()/W.VARIANT/clean()。
# 為什麼放在診斷腳本而不是判定腳本：加進 VARIANT 之前要先過 wikisource.variant_check()
# 的正例／反例，而 于/於 目前是**明文反例**（「不折（轉錄本自身两用）」）——那是人工的
# 判定語意決定，排程輪次不單方面改。這裡只把「改動會怎樣」變成可重跑的數字。
CANDIDATE_FOLD = {'于': '於'}


def unwrap_all(t):
    """拆掉所有模板外殼、**內容全留**（含 apparatus）。僅供診斷，決不用於判定。

    單參數 {{A|X}} → X；多參數 {{A|X|Y}} → 內容相連（丟掉參數名，不丟內容）。
    反覆到不動點以處理巢狀。"""
    for _ in range(14):
        t2 = re.sub(r'\{\{[^{}|]*\|([^{}]*)\}\}', r'\1', t)
        t2 = re.sub(r'\{\{[^{}|]+\}\}', '', t2)          # 無參數模板（{{nop}} 等）無內容
        if t2 == t:
            break
        t = t2
    return t


def pages_raw():
    """已快取頁 → (快取檔名, raw wikitext)。"""
    out = []
    for p in sorted(W.CACHE.glob('*.txt')):
        if p.stat().st_size == 0:
            continue
        out.append((p.name, p.read_text(encoding='utf-8')))
    return out


def anchor_re(frag, n=6):
    """取片段前 n 個漢字，中間允許少量標點／markup，用於在**原始 wikitext** 裡定位。"""
    chs = [c for c in frag if '\u3400' <= c <= '\u9fff'][:n]
    if len(chs) < 4:
        return None
    return re.compile(r'[\s\S]{0,8}'.join(re.escape(c) for c in chs))


def longest_prefix(frag_norm, corpus):
    """回最長可命中前綴長度（片段已 norm()；corpus 是同一視角的整份文字）。

    「前綴 k 命中」對較短的 k 一定仍命中 → 單調，用二分搜尋。
    （逐 k 線性搜尋在 6 MB corpus × 數百片段會跑到分鐘級，二分只要 ~6 次/片段。）"""
    lo, hi = 0, len(frag_norm)
    while lo < hi:
        mid = (lo + hi + 1) // 2
        if frag_norm[:mid] in corpus:
            lo = mid
        else:
            hi = mid - 1
    return lo



def load_rows():
    return json.loads(AUDIT.read_text(encoding='utf-8'))['rows']


def raw_check():
    """未核片段：是 clean() 刪掉了（真假陰性候選），還是原始 wikitext 裡也沒有？"""
    per_page = []
    for name, raw in pages_raw():
        per_page.append((name, raw, W.norm(W.clean(raw)), W.norm(unwrap_all(raw))))
    clean_corpus = ''.join(p[2] for p in per_page)
    keep_corpus = ''.join(p[3] for p in per_page)

    counts = {'items': 0, 'frags_missing': 0, 'clean_swallowed': 0, 'absent_in_raw_too': 0}
    items = []
    for r in load_rows():
        if r.get('kind') != 'unchecked':
            continue
        frags = [f for f in (r.get('quote') or '').split('……') if len(W.norm(f)) >= 6]
        miss = [f for f in frags if W.norm(f) not in clean_corpus]
        if not miss:
            continue
        counts['items'] += 1
        det = []
        for f in miss:
            counts['frags_missing'] += 1
            fc = W.norm(f)
            ck = longest_prefix(fc, clean_corpus)
            kk = longest_prefix(fc, keep_corpus)
            if kk > ck:
                counts['clean_swallowed'] += 1
            else:
                counts['absent_in_raw_too'] += 1
            raw_ctx, rx = '', anchor_re(f)
            if rx:
                for name, raw, _c, _k in per_page:
                    m = rx.search(raw)
                    if m:
                        s = max(0, m.start() - 40)
                        raw_ctx = name + ' ⟶ ' + re.sub(r'\s+', ' ', raw[s:m.end() + 110])
                        break
            det.append({'frag': f[:70], 'break_clean': ck, 'break_keep': kk,
                        'len': len(fc), 'raw_ctx': raw_ctx[:320]})
        items.append({'id': r['id'], 'group': r.get('group'),
                      'source': r.get('source'), 'frags': det})
    out = {'_about': ('診斷：未核片段是被 clean() 刪掉（break_keep > break_clean）還是在'
                      '拆掉全部模板後仍找不到（absent_in_raw_too）。不改判定、不改 src。'),
           '_at': datetime.datetime.now().isoformat(timespec='seconds'),
           'counts': counts, 'items': items}
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
    print('未核（有缺片段）%d 筆／缺片段 %d 段' % (counts['items'], counts['frags_missing']))
    print('  拆模板後才找得到（clean() 吃掉）：%d' % counts['clean_swallowed'])
    print('  拆全部模板也沒有（＝非逐字或該頁未快取）：%d' % counts['absent_in_raw_too'])
    print('已寫出', OUT)
    for it in items[:10]:
        print('---', it['id'], '|', (it['source'] or '')[:46])
        for d in it['frags'][:3]:
            print('   clean %d/%d → keep %d | %s' % (d['break_clean'], d['len'],
                                                     d['break_keep'], d['frag'][:40]))
            if d['raw_ctx']:
                print('   raw:', d['raw_ctx'][:150])
    return 0


def splice_check():
    """已核片段能否在**單一頁**內命中；只有跨頁拼接才命中＝假命中風險。"""
    per_page = [(n, W.norm(W.clean(raw))) for n, raw in pages_raw()]
    corpus = ''.join(t for _n, t in per_page)
    stats = {'original_rows': 0, 'frags': 0, 'single_page': 0, 'splice_only': 0, 'not_found': 0}
    bad = []
    for r in load_rows():
        if r.get('kind') != 'original':
            continue
        stats['original_rows'] += 1
        for f in [x for x in (r.get('quote') or '').split('……') if len(W.norm(x)) >= 6]:
            fc = W.norm(f)
            if not fc:
                continue
            stats['frags'] += 1
            if any(fc in t for _n, t in per_page):
                stats['single_page'] += 1
            elif fc in corpus:
                stats['splice_only'] += 1
                bad.append({'id': r['id'], 'group': r.get('group'), 'frag': f[:70],
                            'source': (r.get('source') or '')[:70]})
            else:
                stats['not_found'] += 1
                bad.append({'id': r['id'], 'group': r.get('group'), 'frag': f[:70],
                            'why': 'not_in_corpus（讀到的快取與判定不同步？）'})
    print('original %d 筆／片段 %d 段：單頁命中 %d · 僅跨頁拼接 %d · 找不到 %d'
          % (stats['original_rows'], stats['frags'], stats['single_page'],
             stats['splice_only'], stats['not_found']))
    for b in bad[:20]:
        print('  ', b)
    p = ROOT / 'reports' / 'quote-splice.json'
    p.write_text(json.dumps({'_about': '已核片段能否在單一頁內命中（僅跨頁拼接＝假命中風險）',
                             'counts': stats, 'suspect_splices': bad},
                            ensure_ascii=False, indent=2), encoding='utf-8')
    print('已寫出', p)
    return 0
RESOLVED = ROOT / 'reports' / 'unchecked-resolved.json'
OUTC = ROOT / 'reports' / 'remaining-unchecked.json'

# 出土金文卜辭：出處欄自己寫明「不引單版釋文」，所以這批不是「上游查無」，
# 而是本專案刻意沒有轉錄本可比。混在未核的搜尋失敗裡會被誤讀成自動路線還沒跑完。
INSCRIPTION = ('甲骨', '卜辭', '利簋', '何尊', '子白盤', '金文', '銘文', '釋文')


def load_resolver():
    """importlib 載入 resolve-unchecked.py（檔名有連字號，不能直接 import）。

    目的是 reuse 它那三條規則——出處→書名、頁名→書名根、出處點名了哪些已快取之卷——
    這片腳本一律不重寫（清洗／比對／卷次只有一份）。"""
    import importlib.util
    p = ROOT / 'scripts' / 'resolve-unchecked.py'
    spec = importlib.util.spec_from_file_location('resolve_unchecked_ro', p)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def classify():
    """剩餘未核 → (a)(b)(c)(d) 四類。純離線、不改判定，只把「為什麼還沒核」變可重跑的事實。

    每筆的類別都由可查訊號決定：
      cached_pages  該書在 vendor/wikisource 有幾頁（0＝沒有轉錄本可比）
      named_pages   出處點名的卷是否已快取（已快取＝文字就在手邊、引文卻不是那句話）
      absent_in_raw 片段在 clean 視角與 keep 視角（拆掉全部模板）都找不到
      transient     resolve-unchecked 標過 API 限速／失敗（那不是「查無」，下輪要重試）
    """
    R = load_resolver()
    un = [r for r in load_rows() if r.get('kind') == 'unchecked']
    st = json.loads(RESOLVED.read_text(encoding='utf-8')) if RESOLVED.exists() else {}
    done_ids = set(st.get('resolved', {}))
    fail_ids = set(st.get('failed', {}))

    per_page = [(n, W.norm(W.clean(raw)), W.norm(unwrap_all(raw)))
                for n, raw in pages_raw()]
    clean_pages = [p[1] for p in per_page]
    keep_pages = [p[2] for p in per_page]

    by_root = {}
    for p in W.pages_list():
        root = R.page_root(p)
        by_root[root] = by_root.get(root, 0) + 1

    def cached_for(work):
        for cand in R.ALIAS.get(work, (work,)):
            if cand in by_root:
                return by_root[cand]
        return 0

    # 「出處點名之卷」的正文（離線，走 wikisource.fetch 這條共用路徑，不自己算快取檔名）。
    # 這是判 retry 有無價值的決定性證據：卡片自己標的那卷已在快取、那段文字卻不在裡面，
    # 再去搜尋／抓頁不會改變判定——文字不在它聲稱的出處裡。
    page_cache = {}

    def page_norms(p):
        if p not in page_cache:
            raw = W.fetch(p, offline=True)
            if not raw or raw.startswith(('NOT_CACHED', 'FETCH_FAILED', 'PAGE_NOT_FOUND')):
                page_cache[p] = ('', '')
            else:
                page_cache[p] = (W.norm(W.clean(raw)), W.norm(unwrap_all(raw)))
        return page_cache[p]

    items, counts = [], {}
    for r in un:
        q, src = (r.get('quote') or ''), (r.get('source') or '')
        frags = [f for f in q.split('……') if len(W.norm(f)) >= 6]
        work = R.cited_work(src)
        pages = cached_for(work)
        named = R.named_pages(src) if (work or src) else []
        miss = [f for f in frags if not any(W.norm(f) in t for t in clean_pages)]
        absent_raw = [f for f in miss if not any(W.norm(f) in t for t in keep_pages)]
        swallowed = [f for f in miss if f not in absent_raw]

        if any(k in src for k in INSCRIPTION):
            # 順序有意：何尊「宅茲中國」同時犯「無轉錄本」與「低於 6 字下限」，
            # 但根本理由是前者——就算放宽下限也沒有正文可比。
            reason = 'b'
            why = '出土金文／卜辭：出處欄已註明不引單版釋文，無轉錄本可比'
            if not frags:
                why += '（且引文低於 6 字比對下限）'
        elif not frags:
            reason, why = ('d', '引文短於 6 字／是陳述不是引文，比對下限之下，需人工決定')
        elif swallowed:
            reason, why = ('d', '缺片段只在注疏／附引塊（apparatus）內出現，屬出處歸屬問題')
        elif pages == 0:
            reason, why = ('a', 'zh.wikisource 無此書（該書快取 0 頁）')
        elif not miss:
            reason, why = ('?', '片段都在快取內卻仍是未核——判定與快取不同步，要查 verify-batch')
        elif named and len(absent_raw) == len(miss):
            reason, why = ('c', '出處點名之卷已快取，片段拆掉全部模板仍找不到＝引文非逐字')
        elif len(absent_raw) == len(miss):
            reason, why = ('c', '該書已快取 %d 頁，片段拆掉全部模板仍找不到＝引文非逐字' % pages)
        else:
            reason, why = ('c', '缺片段有部分在快取頁內，其餘上游沒有＝引文省字／改寫')
        transient = r['id'] in fail_ids
        # 「还能自动推进」不能只看 failed 桶——那是逐轮累积的，同一 id 後來搜尋成功也
        # 還留在裡面。這裡要的是**具体证据**：
        #   absent_in_cited_volume  缺的片段在「出處自己點名之卷」的正文（clean 與拆全部
        #                           模板兩種視角）都不存在 → 抓再多頁也不會改變判定
        #   retry_could_help        上輪限速、且上面那條**不成立**（有可能存在別頁）
        #   volume_gap              出處**明寫卷次**、但那卷不在快取 → gap-fill 有明確目標
        #                           （只寫篇名如《史記·周本紀》不算：卷次無法從篇名推，
        #                            那類由搜尋端定位，本輪已全數搜過、新頁 0）
        named_clean = ''.join(page_norms(p)[0] for p in named)
        named_keep = ''.join(page_norms(p)[1] for p in named)
        absent_in_cited = bool(named and miss and
                               all(W.norm(f) not in named_clean and
                                   W.norm(f) not in named_keep for f in miss))
        retry_could_help = bool(transient and miss and
                                reason not in ('b', 'd') and not absent_in_cited)
        names_a_volume = False
        for m in re.finditer(r'卷\s*([0-9〇一二三四五六七八九十百千廿卅卌]+)', src):
            if W.volnum(m.group(1)) is not None:
                names_a_volume = True
                break
        volume_gap = bool(names_a_volume and not named and pages > 0)
        items.append({'id': r['id'], 'group': r.get('group'), 'work': work,
                      'reason': reason, 'why': why,
                      'source': src[:120], 'quote': q[:120],
                      'cached_pages_for_work': pages,
                      'named_pages_cached': named[:6],
                      'absent_in_cited_volume': absent_in_cited,
                      'frags': len(frags), 'frags_missing': len(miss),
                      'frags_absent_even_unwrapped': len(absent_raw),
                      'frags_only_in_apparatus': len(swallowed),
                      'transient_api_failure_in_failed_bucket': transient,
                      'retry_could_help': retry_could_help,
                      'citation_names_volume': names_a_volume,
                      'volume_gap_fetchable': volume_gap,
                      'previously_resolved_elsewhere': r['id'] in done_ids})
        counts[reason] = counts.get(reason, 0) + 1

    # 自動路線是否已達上限：沒有「缺卷可補」、沒有「重試可能改變判定」、
    # 也沒有分類不明的筆（? = 片段都在快取內卻仍未核，那是判定與快取不同步的 bug 訊號）。
    fetchable = [it for it in items
                 if it['volume_gap_fetchable'] or it['retry_could_help']]
    unknown = counts.get('?', 0)
    exhausted = not fetchable and not unknown
    out = {'_about': ('剩餘未核的原因分類（純離線診斷，不改判定、不改 src、不打網路）。'
                      'a=上游無此書/此卷、b=出土金文卜辭無轉錄本、c=引文非逐字、'
                      'd=需人工（比對下限／apparatus 歸屬／影像）。'
                      'auto_route_exhausted 只在「沒有出處點名却未快取的缺卷」且'
                      '「沒有重試可能改變判定的限速筆」時才是 true。'),
           '_at': datetime.datetime.now().isoformat(timespec='seconds'),
           'counts': counts,
           'unchecked_rows': len(un),
           'auto_route_exhausted': exhausted,
           'still_fetchable': [{'id': it['id'],
                                'volume_gap': it['volume_gap_fetchable'],
                                'retry_could_help': it['retry_could_help']}
                               for it in fetchable],
           'items': items}
    OUTC.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
    print('未核 %d 筆 → ' % len(un) +
          ' · '.join('(%s) %d' % (k, counts[k]) for k in sorted(counts)))
    print('  仍可自動推進（缺卷可補 %d · 重試可能改變判定 %d）'
          % (sum(1 for it in items if it['volume_gap_fetchable']),
             sum(1 for it in items if it['retry_could_help'])))
    if fetchable:
        for it in fetchable[:10]:
            print('    %s 卷缺口=%s 重試=%s | %s'
                  % (it['id'], it['volume_gap_fetchable'], it['retry_could_help'],
                     it['source'][:60]))
    print('  自動路線已達上限：%s' % ('是' if exhausted else '否'))
    print('已寫出', OUTC)
    return 0


def citation_gap():
    """診斷（反事實對照）：出處寫成《書名》卷次 時，判定層的卷次匹配被書名後的 》 擋掉，
    於是「點名之卷已在快取、引文片段卻找不到」的條目留在「未核」而沒升成「可疑」。

    為什麼要量化而不是口頭講：鐵律 4 要求「可疑變多不要放過」，但把卷次正則修好會讓
    這一筆數直接從未核搬進可疑、閘門 14 立刻變紅，而真正的修法只能是改 `src/**` 的
    引文（鐵律 1 不許自動改）。所以本輪先給出**可重跑的數字與清單**交人工決定。

    誠實做法：只把出處文字裡擋路的 `》卷` 改成 ` 卷`（移開一個標點位置），再呼叫
    **判定那一家**（wikisource）的同一個卷次判定函數做對照——不重寫匹配邏輯、
    不碰 clean()/norm()/VARIANT、不改任何判定、不打網路（pages_list 只讀清單）。
    """
    un = [r for r in load_rows() if r.get('kind') == 'unchecked']
    hit, nochange = [], []
    for r in un:
        src = r.get('source') or ''
        alt = src.replace('》卷', ' 卷')
        if alt == src:
            continue                       # 出處不是《書名》卷次 這種寫法
        now = W.vendored(src)
        fixed = W.vendored(alt, return_page=True)   # 頁名＝鐵律 4 要求的人工實據
        if (not now) and fixed:
            hit.append({'id': r['id'], 'group': r.get('group'),
                        'source': src[:150], 'quote': (r.get('quote') or '')[:150],
                        'miss': (r.get('miss') or [])[:6],
                        'vendored_now': bool(now),
                        'cached_page_named_by_source': fixed})
        else:
            nochange.append(r['id'])
    out = {'_about': ('反事實診斷：若卷次匹配不被《書名》後的 》 挡住，現在判未核的哪幾筆'
                      '會升為可疑（＝已知偵測缺口涵蓋範圍）。只讀、不改判定；修法屬改 '
                      'src 引文或改閘門語意，留人工決定。'),
           '_at': datetime.datetime.now().isoformat(timespec='seconds'),
           'unchecked_rows': len(un),
           'citation_form_book_volume': sum(
               1 for r in un if '》卷' in (r.get('source') or '')),
           'would_escalate_to_suspect': len(hit),
           'unchanged_ids': nochange,
           'items': hit}
    p = ROOT / 'reports' / 'citation-gap.json'
    p.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
    print('未核 %d 筆中，出處為《書名》卷次 寫法：%d 筆'
          % (len(un), out['citation_form_book_volume']))
    print('  卷次匹配若不被 》 擋掉會升「可疑」：%d 筆（現行判定不變）' % len(hit))
    for x in hit[:14]:
        print('   - %-16s ｜ %s ｜ 點名且已快取之頁：%s'
              % (x['id'], x['source'][:56], x['cached_page_named_by_source']))
    print('已寫出', p)
    return 0


def variant_gap():
    """診斷（反事實）：把「候選折字對」套上去，會讓幾筆未核變原文、又會破掉幾筆现有「原文」？

    為什麼要量化：`norm()` 的 VARIANT 表是判定的一環，加一對字就可能把未核變原文。
    但加不加**不是本輪能決定的**——`wikisource.variant_check()` 有明文反例
    （`于/於 不折（轉錄本自身两用）`），那是人工先做的決定，且 `npm run audit:volnum`
    （在 `npm run verify` 裡）會把它當閘門跑。所以這裡只產**可重跑的數字與清單**：
    解鎖幾筆、破掉幾筆、影響哪些 id，交人工決定要不要改反例。

    鐵律 5 邊界：候選對**只用於本函數的對照計算**，絕不套進 `W.norm()`／`W.VARIANT`
    ／`clean()`，也不寫回任何判定；兩側同折才是公平對照（只折一側會把現在匹配的
    片段弄破，實測 67→68，那種量法錯）。
    """
    rows = load_rows()
    body = W.corpus()                       # 判定實際用的正文（clean/norm 仍只有一份）
    fold = str.maketrans(CANDIDATE_FOLD)
    body_f = body.translate(fold)

    def frags(r):
        return [W.norm(f) for f in (r.get('quote') or '').split('……') if len(W.norm(f)) >= 6]
    miss_cur = lambda fs: [f for f in fs if f not in body]
    miss_cf = lambda fs: [f for f in fs if f.translate(fold) not in body_f]

    un = [r for r in rows if r.get('kind') == 'unchecked']
    og = [r for r in rows if r.get('kind') == 'original']
    unlock = [{'id': r['id'], 'group': r.get('group'), 'source': (r.get('source') or '')[:120],
               'freed_frags': [m[:60] for m in miss_cur(frags(r))[:3]]}
              for r in un if miss_cur(frags(r)) and not miss_cf(frags(r))]
    broken = [{'id': r['id'], 'group': r.get('group'),
               'now_missing': [m[:60] for m in miss_cf(frags(r))[:3]]}
              for r in og if not miss_cur(frags(r)) and miss_cf(frags(r))]
    a, b = next(iter(CANDIDATE_FOLD.items()))
    out = {'_about': ('反事實：候選折字對套進 norm() 後，未核→原文 會解鎖幾筆、現有原文 '
                      '會破掉幾筆。只計算，不套進判定；加不加由 variant_check() 的 '
                      '正例/反例（人工決定）把關，該檢查在 npm run verify 內。'),
           '_at': datetime.datetime.now().isoformat(timespec='seconds'),
           'candidate_pair': {'from': a, 'to': b},
           'currently_folded': W.norm(a) == W.norm(b),
           'guard': ('variant_check() 反例明文「于/於 不折（轉錄本自身两用）」；'
                     '加此對要先改那道反例 → 屬人工決定，本輪不做'),
           'unchecked_rows': len(un), 'original_rows': len(og),
           'missing_frags_now': sum(len(miss_cur(frags(r))) for r in un),
           'missing_frags_if_folded': sum(len(miss_cf(frags(r))) for r in un),
           'unlock_count': len(unlock),
           'unlock_unique_ids': sorted({x['id'] for x in unlock}),
           'break_count': len(broken),
           'unlock_items': unlock, 'break_items': broken}
    p = ROOT / 'reports' / 'variant-gap.json'
    p.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
    print('候選折字對 %s→%s：現行已折=%s' % (a, b, out['currently_folded']))
    print('  未核 %d 筆缺片段 %d 段 → 折後 %d 段；從未核升「原文」%d 筆（唯一 id：%s）'
          % (len(un), out['missing_frags_now'], out['missing_frags_if_folded'],
             len(unlock), '、'.join(out['unlock_unique_ids']) or '—'))
    print('  現有原文 %d 筆中會被折字破掉的：%d 筆' % (len(og), len(broken)))
    print('  把關：%s' % out['guard'])
    print('已寫出', p)
    return 0


CACHEOUT = ROOT / 'reports' / 'cache-audit.json'

# 判定「與轉錄本一致」所依據的正文 = corpus() = glob 整個 vendor/wikisource。
# 所以 224 筆原文的可信度，全押在「快取裡每一頁都是可引用的轉錄本」這件事上。
# 本專案真的发生过一次污染（11-06 02:10 輪：通志／繹史／尚書古文疏證 被全文搜尋抓進來，
# 標《尚書》的引文在「論證古文尚書是偽書」的那本書裡命中 → 假證據），當時靠 --prune 清掉。
# 但「清掉了」沒有站著把关的檢查 → 本函數把它變成每輪可重跑的斷言。
SENTINELS = ('PAGE_NOT_FOUND', 'FETCH_FAILED', 'NOT_CACHED')
TINY_CHARS = 100         # 正規化後 <=100 字：外殼／占位／目錄頁，對逐字比對近乎無貢獻
RE_COMMENT = re.compile(r'<!--.*?-->', re.S)
BOOK_TEXT_IN_COMMENT = 1000   # 單頁註解字數 > 此值 ⇒ 那註解包的是書本正文（非編輯 boilerplate）
GATE_KEYS = ('list_cache_parity', 'no_derivative_witness', 'no_sentinel_saved',
             'no_redirect_stub', 'no_empty_file', 'no_duplicated_real_text',
             'corpus_fully_curated')


def page_stats():
    """每頁：頁名、書名本體、clean 後字數、去註解後字數、註解字數、有無 {{: transclusion。

    清洗一律走 W.clean/W.norm（只有一份）；去註解只是**對照視角**，不用來改判定。
    """
    R = load_resolver()
    names = {W.cache_key(p).name: p for p in W.pages_list()}
    out = []
    for f in sorted(W.CACHE.glob('*.txt')):
        if f.stat().st_size == 0:
            continue
        raw = f.read_text(encoding='utf-8')
        page = names.get(f.name, '(不在清單)')
        a = W.norm(W.clean(raw))
        b = W.norm(W.clean(RE_COMMENT.sub('', raw)))
        out.append({'file': f.name, 'page': page, 'root': R.page_root(page),
                    'chars': len(a), 'chars_no_comment': len(b),
                    'comment_chars': len(a) - len(b),
                    'transclusion': '{{:' in raw, 'body': a})
    return out


def cache_audit(gate=False):
    """證據基礎本身的稽核（純離線、唯讀、不改判定）。

    斷言全部可重跑：
      1 清單 ↔ 快取 **雙向**一致：缺頁（warm 會打網路）與孤兒頁（在 corpus() 裡、
        卻不在策展清單上＝不可離線還原的證據）都必須為 0。
      2 快取內不得有 DERIVATIVE（類書／後世輯錄）之書 — 污染是否回來了。
      3 不得有 fetch 哨兵字串被當成正文存檔。
      4 不得有 #REDIRECT 存根（非正文頁會污染 whole_book 規則）。
      5 不得有空檔（corpus() 會跳過，但清單上有它＝warm 名義成功實質缺頁）。
      6 不得有「同一**正文**存成兩個頁名」（同一文字計兩次＝語料灌水）。
        ≤TINY_CHARS 的重複組是外殼頁的 boilerplate（見 shells），不算灌水，單獨列。
      7 corpus() 全量（glob）與「只算清單上那批」的字數必須相同 —
        不同即代表有清單外文字進入了比對池。
      8 未核引文被引之書，在快取裡必須有**真正文**（不是只有外殼頁）。
        這是對「(a) zh.wikisource 無此書/此卷＝0」那結論的覆核：之前只看「有幾頁」，
        本輪實測 297 頁裡 18 頁是 transclusion 外殼（clean 後 ≤100 字），
        「有頁」不等於「有正文」。
      9 「與轉錄本一致」的命中不得只靠 HTML 註解區成立，且註解區若是編輯 boilerplate
        （校對提醒之类）不得成為證據。去註解視角只對照、不改判定。
    """
    R = load_resolver()
    listed = W.pages_list()
    seen, listed_dups = {}, []
    for p in listed:
        if p in seen:
            listed_dups.append(p)
        seen[p] = True
    expect = {W.cache_key(p).name: p for p in seen}

    files = sorted(W.CACHE.glob('*.txt'))
    missing = sorted(p for p in seen
                     if not (W.cache_key(p).exists() and W.cache_key(p).stat().st_size > 0))
    orphans = sorted(f.name for f in files if f.name not in expect)
    empty = sorted(f.name for f in files if f.stat().st_size == 0)

    stats = page_stats()
    sentinel, redirects, shell_pages, targets = [], [], [], set()
    body_hash = {}
    for f in files:
        if f.stat().st_size == 0:
            continue
        raw = f.read_text(encoding='utf-8')
        page = expect.get(f.name, '(不在清單)')
        if raw.lstrip().startswith(SENTINELS):
            sentinel.append(page)
        if raw.lstrip().lower().startswith('#redirect'):
            redirects.append(page)
        for m in re.finditer(r'\{\{:([^|}]+)', raw):
            targets.add(m.group(1).strip())
    for s in stats:
        if s['chars'] <= TINY_CHARS:
            shell_pages.append({'page': s['page'], 'chars': s['chars'],
                                'transclusion': s['transclusion'],
                                'root': s['root']})
        body_hash.setdefault(hashlib.md5(s['body'].encode()).hexdigest(), []).append(s['page'])
    dup_groups = [v for v in body_hash.values() if len(v) > 1]
    dup_real = [v for v in dup_groups
                if len(W.norm(W.clean(W.cache_key(v[0]).read_text()))) > TINY_CHARS]

    # 註解區：是書本正文還是編輯 boilerplate？（實測 ja 的 Remix 頁把整本書包在 <!-- --> 內）
    comment_total = sum(s['comment_chars'] for s in stats)
    book_text_pages = [{'page': s['page'], 'comment_chars': s['comment_chars']}
                       for s in stats if s['comment_chars'] > BOOK_TEXT_IN_COMMENT]
    apparatus_chars = comment_total - sum(x['comment_chars'] for x in book_text_pages)
    # 三個對照視角（都不改判定，只量「拿掉 apparatus 會不會傷到判定」）：
    #   corpus_all          = 現行判定用的 corpus()（含全部註解）
    #   corpus_noc          = 拿掉**所有** HTML 註解
    #   corpus_app_stripped = 只拿掉「編輯 boilerplate 級」註解（單頁註解 ≤1000 字），
    #                         保留 ja Remix 頁那種「整本書包在註解裡」的正文
    raws = {f.name: f.read_text(encoding='utf-8') for f in files if f.stat().st_size > 0}
    cmap = {s['file']: s['comment_chars'] for s in stats}
    ordered = sorted(raws)
    corpus_all = ''.join(W.norm(W.clean(raws[n])) for n in ordered)
    corpus_noc = ''.join(W.norm(W.clean(RE_COMMENT.sub('', raws[n]))) for n in ordered)
    corpus_app_stripped = ''.join(
        W.norm(W.clean(RE_COMMENT.sub('', raws[n])
                       if cmap.get(n, 0) <= BOOK_TEXT_IN_COMMENT else raws[n]))
        for n in ordered)
    listed_body_chars = sum(s['chars'] for s in stats if s['file'] in expect)

    # 未核被引之書 → 快取有無「真正文」（覆核「(a) 無此書/此卷＝0」那結論的口徑）
    roots, root_chars, deriv_exact, deriv_prefix = {}, {}, [], []
    for p in seen:
        root = R.page_root(p)
        roots[root] = roots.get(root, 0) + 1
        if root in R.DERIVATIVE:
            deriv_exact.append(p)
        elif any(root.startswith(d) for d in R.DERIVATIVE):
            deriv_prefix.append(p)
    for s in stats:
        if s['chars'] > TINY_CHARS:
            root_chars[s['root']] = root_chars.get(s['root'], 0) + s['chars']
    un = [r for r in load_rows() if r.get('kind') == 'unchecked']
    works_no_text, works_shell_only = [], []
    for r in un:
        w = R.cited_work(r.get('source') or '')
        if not w:
            continue
        # 書名要過 ALIAS（左傳→春秋左氏傳/春秋左傳註疏），否則明明有快取會被誤報「完全沒快取」
        cands = list(R.ALIAS.get(w, (w,))) + [w]

        def hit(k):
            return any(k == c or k.startswith(c) or c.startswith(k) for c in cands)
        real = sum(v for k, v in root_chars.items() if hit(k))
        pages = sum(v for k, v in roots.items() if hit(k))
        if pages and not real:
            works_shell_only.append({'id': r['id'], 'work': w, 'pages': pages})
        if not pages:
            works_no_text.append({'id': r['id'], 'work': w, 'pages': 0})

    # 「與轉錄本一致」有幾筆是靠註解區的文字成立的？
    # 關鍵區分：ja 的 Remix 頁把**整本書**包在 <!-- --> 內（那是正文），
    # 四庫/四部叢刊頁的註解只是「請根據掃描版校對本頁」這類編輯 boilerplate（那是 apparatus）。
    # 所以問的不是「有無命中在註解裡」，而是「把編輯 boilerplate 拿掉会不会傷到判定」。
    og = [r for r in load_rows() if r.get('kind') == 'original']
    frag_of = lambda r: [W.norm(x) for x in (r.get('quote') or '').split('……')
                         if len(W.norm(x)) >= 6]
    comment_only = [r['id'] for r in og
                    if frag_of(r) and all(x in corpus_all for x in frag_of(r))
                    and not all(x in corpus_noc for x in frag_of(r))]
    broken_by_apparatus_strip = [
        r['id'] for r in og
        if frag_of(r) and all(x in corpus_all for x in frag_of(r))
        and not all(x in corpus_app_stripped for x in frag_of(r))]
    still_ok_noc = sum(1 for r in og if frag_of(r) and all(x in corpus_noc for x in frag_of(r)))

    out = {'_about': 'vendor/wikisource 快取（= corpus() 的比對池）完整性稽核。'
                     '只讀，不改判定；判定仍只由 wikisource.py --verify-batch 產生。',
           '_at': time.strftime('%Y-%m-%dT%H:%M:%S'),
           'listed_lines': len(listed), 'listed_unique': len(seen),
           'listed_duplicates': sorted(set(listed_dups)),
           'cache_files': len(files),
           'missing_pages': missing, 'orphan_files': orphans, 'empty_files': empty,
           'sentinel_pages': sentinel, 'redirect_pages': redirects,
           'shell_pages': sorted(shell_pages, key=lambda x: x['chars']),
           'shell_page_count': len(shell_pages),
           'transclusion_targets_named_by_shells': len(targets),
           'duplicate_body_groups_real': dup_real,
           'duplicate_body_groups_shell': [v for v in dup_groups if v not in dup_real],
           'derivative_pages_exact': sorted(deriv_exact),
           'derivative_pages_prefix': sorted(deriv_prefix),
           'distinct_books': len(roots),
           'books_with_pages_but_no_real_text': sorted(
               set(R.page_root(p) for p in seen if not root_chars.get(R.page_root(p)))),
           'book_page_counts': dict(sorted(roots.items(), key=lambda kv: -kv[1])),
           'book_real_text_chars': dict(sorted(root_chars.items(), key=lambda kv: -kv[1])),
           'unchecked_items_whose_work_has_only_shells': works_shell_only,
           'unchecked_items_whose_work_is_not_cached': works_no_text,
           'corpus_chars_all': len(corpus_all),
           'corpus_chars_listed_only': listed_body_chars,
           'corpus_contains_uncurated_chars': len(corpus_all) - listed_body_chars,
           'comment_chars_total': comment_total,
           'comment_chars_book_text': comment_total - apparatus_chars,
           'comment_chars_apparatus': apparatus_chars,
           'pages_with_book_text_in_comment': book_text_pages,
           'corpus_chars_without_comments': len(corpus_noc),
           'corpus_chars_apparatus_stripped': len(corpus_app_stripped),
           'original_quotes_total': len(og),
           'original_quotes_ok_without_comments': still_ok_noc,
           'original_quotes_needing_comment_text': comment_only,
           'original_quotes_broken_by_stripping_apparatus': broken_by_apparatus_strip,
           'assertions': {
               'list_cache_parity': not missing and not orphans,
               'no_derivative_witness': not deriv_exact and not deriv_prefix,
               'no_sentinel_saved': not sentinel,
               'no_redirect_stub': not redirects,
               'no_empty_file': not empty,
               'no_duplicated_real_text': not dup_real,
               'corpus_fully_curated': len(corpus_all) == listed_body_chars,
               'cited_works_have_real_text': not works_shell_only,
               'no_hit_from_comment_apparatus': not broken_by_apparatus_strip}}
    CACHEOUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
    print('快取完整性稽核（離線、唯讀）→ %s' % CACHEOUT)
    print('  清單 %d 行／%d 唯一（重複列 %d）· 快取檔 %d'
          % (len(listed), len(seen), len(set(listed_dups)), len(files)))
    print('  缺頁 %d · 孤兒頁 %d · 空檔 %d · 哨兵 %d · 導向頁 %d · 重複正文（真）%d'
          % (len(missing), len(orphans), len(empty), len(sentinel), len(redirects), len(dup_real)))
    print('  外殼頁（clean 後 ≤%d 字）%d 頁／%d 種書 · 它們點名的 transclusion 目標 %d 個（未抓）'
          % (TINY_CHARS, len(shell_pages), len({s['root'] for s in shell_pages}), len(targets)))
    print('  類書（DERIVATIVE）命中：%d（前綴式 %d）· 書名本體 %d 種'
          % (len(deriv_exact), len(deriv_prefix), len(roots)))
    print('  未核 %d 筆：被引書只有外殼頁 %d 筆 · 完全沒快取 %d 筆'
          % (len(un), len(works_shell_only), len(works_no_text)))
    print('  corpus() 字數 %d（只算清單 %d）→ 清單外文字 %d 字'
          % (len(corpus_all), listed_body_chars, len(corpus_all) - listed_body_chars))
    print('  註解區字數 %d（書本正文 %d／編輯 boilerplate %d）· 去註解後 corpus %d 字'
          % (comment_total, comment_total - apparatus_chars, apparatus_chars, len(corpus_noc)))
    print('  原文 %d 筆：去註解後仍成立 %d 筆 · 只靠註解區文字成立 %d 筆 %s'
          % (len(og), still_ok_noc, len(comment_only), ' '.join(comment_only[:8])))
    print('  只拿掉編輯 boilerplate（保留 ja Remix 正文）：corpus %d 字，破掉原文 %d 筆 %s'
          % (len(corpus_app_stripped), len(broken_by_apparatus_strip),
             ' '.join(broken_by_apparatus_strip[:8]) or '（零）'))
    bad = [k for k, v in out['assertions'].items() if not v]
    if gate:
        # 只把「不可争議的完整性」接進 npm run verify：類書污染／清單與快取不一致／
        # 哨兵存檔／導向存根／空檔／真正文重複／清單外文字進比對池。
        # cited_works_have_real_text 與 no_hit_from_comment_apparatus 依賴 src 引文內容，
        # 入閘門會讓「新增一條引用」變成 CI 紅燈（那是 audit:quotes 的職責），故只入報告。
        bad = [k for k in bad if k in GATE_KEYS]
    print('  斷言：%s%s' % ('全部通過' if not bad else '失敗 ' + ' '.join(sorted(bad)),
                            '（閘門口徑：只算完整性 7 項）' if gate else ''))
    for k in ('shell_pages', 'redirect_pages', 'duplicate_body_groups_real',
              'derivative_pages_exact', 'orphan_files',
              'unchecked_items_whose_work_has_only_shells'):
        if out[k]:
            print('    %s：%s' % (k, json.dumps(out[k][:6], ensure_ascii=False)))
    return 0 if not bad else 1


if __name__ == '__main__':
    a = sys.argv[1:]
    if a[:1] == ['--cache-audit']:
        sys.exit(cache_audit())
    if a[:1] == ['--cache-gate']:
        sys.exit(cache_audit(gate=True))
    if a[:1] == ['--variant-gap']:
        sys.exit(variant_gap())
    if a[:1] == ['--citation-gap']:
        sys.exit(citation_gap())
    if a[:1] == ['--raw-check']:
        sys.exit(raw_check())
    if a[:1] == ['--splice-check']:
        sys.exit(splice_check())
    if a[:1] == ['--classify']:
        sys.exit(classify())
    print(__doc__)
    sys.exit(2)
