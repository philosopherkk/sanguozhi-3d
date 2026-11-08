#!/usr/bin/env python3
"""closest-witness.py — 未核引文的「最接近轉錄本對照」。純離線、不改判定。

為什麼還缺這一片：收斂後每輪回報的是 (a)(b)(c)(d) 四個數字，`human-decision-sheet.py`
再附上「比對不上的片段」。但人工要把 (c) 那 36 個裁決點改成逐字，缺的不是「哪段找不到」
而是**轉錄本那句話實際上長什麼樣**——前 11 輪沒人把這個交出來，要人就得自己在 297 頁、
約 6 MB 快取裡手撈。本腳本把那段擗出來：對每個未核片段，只在**被引那本書自己的頁**
（復用 resolve-unchecked.witness_ok()，類書／輯錄一律排除）做最長共同子串對齊，
輸出轉錄本原文（含原標點）、與卡片引文的逐字差異、頁名，以及跨全部裁決點的
「單字差異普查」。

普查是這輪的關鍵產出：`wikisource.py` 的註解自己定了折字的實證標準——「同一句、
斷後仍接回 6 字以上」才算異體字，否則就是異文／引文改字（于/於、陳/陣、亡/喪 刻意不折）。
以前這個標準只有一句註解，沒有可重跑的統計。本腳本把「前後各 ≥6 字仍逐字相同」的
單字替代全數數出來，人工要裁「要不要加折字規則」時有計數而不是軼事。
**只統計、不採納**：本腳本不碰 VARIANT／clean()/norm()，不產生任何判定。

邊界（鐵律）：
  * 零 HTTP：只走 W.fetch(page, offline=True)；清單外一頁也不抓。
  * 清洗／比對只有一份：一律用 W.clean / W.norm / W.PUNCT / W.INVIS / W.VARIANT 與
    R.witness_ok / R.cited_work / R.named_pages（引用同一份定義，絕不重寫）。
  * 不改判定、不碰 src/**、不碰 vendor/**（唯讀）、不寫任何 allowlist。
  * 輸出是**给人的對照證據**；「已核」仍只由 wikisource.py --verify-batch 產生。

自報檢查（任一不過 → exit 1，報告不交出）：
  A 對映等值：每個用到的頁，逐字元對映出的字串必須與 W.norm(頁) 完全相同
    ⇒ 證明確實只有一份清洗；norm() 若改成多字元變換，這裡先紅而不是悄悄錯判。
  B 正控制：已判「原文」的條目，其片段在同一支對齊器下必須 100% 覆蓋（全快取視角）
    ⇒ 證對齊器找得到真命中，不是只會報「找不到」。
  C 反控制：未核片段若在所引書之頁內 100% 覆蓋 ⇒ 判定與快取不同步（真 bug）→ 紅。
  D 不憑空：每個輸出頁名必須在 W.pages_list()；每段轉錄本文字必須能在該頁 clean()
    後逐字重定位。
  E 判定零漂移：跑前／跑後 quotes-audit.json 的 rows md5 必須相同。

用法：python3 scripts/closest-witness.py   →  reports/closest-witness.json（＋.md）
"""
import datetime
import difflib
import hashlib
import importlib.util
import json
import pathlib
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts'))
import wikisource as W  # noqa: E402  清洗／比對唯一來源


def _load_dash(name):
    """resolve-unchecked.py 檔名有連字號，不能直接 import（同 quote-forensics 的作法）。"""
    p = ROOT / 'scripts' / 'resolve-unchecked.py'
    spec = importlib.util.spec_from_file_location('resolve_unchecked_cw', p)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


R = _load_dash('resolve_unchecked_cw')

AUDIT = ROOT / 'reports' / 'quotes-audit.json'
OUTJ = ROOT / 'reports' / 'closest-witness.json'
OUTM = ROOT / 'reports' / 'closest-witness.md'

SEED_KS = (12, 10, 8, 6, 4)   # 種子長度：片段內若有改字，較短種子仍能落在 unchanged 段上
MIN_FLANK = 6                 # 折字實證標準：前後各要接回 ≥6 字（取自 wikisource.py 註解）
PUNCT_SET = set(W.PUNCT)
PAD = 10                      # 對齊區左右各多帶幾個 norm 字元，讓差異有上下文


def norm_map(s):
    """回 (正規化字串, 每個正規字元對應到 s 的位址)。

    只*引用* W.PUNCT / W.INVIS / W.VARIANT——同一份定義，不是第二份實作；
    等值性由 main() 的檢查 A 逐頁驗證（不对就整份報告不交出）。
    """
    out, idxs = [], []
    for i, ch in enumerate(s):
        if ch.isspace() or ch in PUNCT_SET or W.INVIS.fullmatch(ch):
            continue
        folded = ch.translate(W.VARIANT)
        out.append(folded)
        idxs.extend([i] * len(folded))
    return ''.join(out), idxs


def runs_by_offset(F, T, ks=SEED_KS, hit_cap=2000, stride=1):
    """片段 F 對文字 T：回 {offset: [(fi, ti, len), ...]}（最長精確Runs，按片段位分組）。

    offset = ti - fi。同一 offset 的 run 就是「把引文平移 k 格正好落在轉錄本上」的證據；
    改字／省字會把 run 切開，但它們仍落在同一 offset 上 → 之後取覆蓋最多的 offset。
    """
    found, seen = {}, set()
    usable = tuple(k for k in ks if k <= len(F)) or (max(3, min(len(F), 6)),)
    for k in usable:
        hits = 0
        for fi in range(0, len(F) - k + 1, stride):
            seed = F[fi:fi + k]
            ti = T.find(seed)
            while ti != -1:
                hits += 1
                # 往兩側擴張成極大精確 run
                a, b = fi, ti
                while a > 0 and b > 0 and F[a - 1] == T[b - 1]:
                    a -= 1
                    b -= 1
                c, d = fi + k, ti + k
                while c < len(F) and d < len(T) and F[c] == T[d]:
                    c += 1
                    d += 1
                if (a, b, c - a) not in seen:
                    seen.add((a, b, c - a))
                    found.setdefault(ti - a, []).append((a, b, c - a))
                if c - a >= len(F):        # 整段逐字命中：不必再找
                    return {ti - a: [(a, b, len(F))]}
                if hits >= hit_cap:
                    break
                ti = T.find(seed, ti + 1)
            if hits >= hit_cap:
                break
    return found


def merge(runs):
    """(fi, ti, len) 列表 → 按 fi 合併重疊区，回 (合并後列表, 覆蓋字數)."""
    merged = []
    for fi, ti, ln in sorted(runs):
        if merged and fi <= merged[-1][0] + merged[-1][2]:
            end = max(merged[-1][0] + merged[-1][2], fi + ln)
            merged[-1] = (merged[-1][0], merged[-1][1], end - merged[-1][0])
        else:
            merged.append((fi, ti, ln))
    return merged, sum(m[2] for m in merged)


class WorkText:
    """被引那本書的全部已快取頁 → 一份可比對文字，並保留 norm 位址 →（頁, clean 後文字）。

    頁的篩選一律交給 R.witness_ok()（類書／輯錄排除），本腳本不自訂書名規則。
    """

    def __init__(self, pages):
        self.pages, self.T, self.bounds = [], '', []   # (start, end, page, cleaned, idxs)
        for p in pages:
            raw = W.fetch(p, offline=True)             # offline=True：清單外一頁也不抓
            if not raw or raw.startswith(('NOT_CACHED', 'FETCH_FAILED', 'PAGE_NOT_FOUND')):
                continue
            cleaned = W.clean(raw)
            normed, idxs = norm_map(cleaned)
            if not normed:
                continue
            self.pages.append(p)
            self.bounds.append((len(self.T), len(self.T) + len(normed), p, cleaned, idxs))
            self.T += normed

    def page_at(self, i):
        for b in self.bounds:
            if b[0] <= i < b[1]:
                return b
        return None


def align_frag(F, T, min_flank=MIN_FLANK, ks=SEED_KS, stride=1):
    """回 (offset, merged_runs, covered) 或 None（沒有 ≥min_flank 字的精確對應就視為無候選）。"""
    best = None
    for off, runs in runs_by_offset(F, T, ks=ks, stride=stride).items():
        merged, cov = merge(runs)
        if not any(m[2] >= min_flank for m in merged):
            continue
        if best is None or cov > best[2]:
            best = (off, merged, cov)
    return best


def evidence_for_frag(frag, wt, pad=PAD):
    """單個片段 → 最接近的轉錄本段落＋逐字差異。回 dict（找不到也回，寫明為什麼）。"""
    Fn, qidxs = norm_map(frag)
    if not wt.T:
        return {'frag': frag[:80], 'coverage': None, 'candidate_page': None,
                'why': '該書在 vendor/wikisource 有 0 頁 → 無轉錄本可比'}
    best = align_frag(Fn, wt.T)
    if best is None:
        return {'frag': frag[:80], 'coverage': 0.0, 'candidate_page': None,
                'why': '在所引書已快取的 %d 頁裡找不到 ≥%d 字的連續對應' % (len(wt.pages), MIN_FLANK)}
    off, merged, cov = best
    exact = cov >= len(Fn)
    big = max(merged, key=lambda m: m[2])
    b = wt.page_at(big[1])
    st, en, page, cleaned, idxs = b
    lo = max(st, min(big[1], merged[0][1]) - pad)
    hi = min(en - 1, big[1] + big[2] - 1 + pad)
    Wn = wt.T[lo:hi + 1]
    fi_lo, fi_hi = max(0, lo - off), min(len(Fn) - 1, hi - off)
    Fsub = Fn[fi_lo:fi_hi + 1]
    c0, c1 = idxs[lo - st], idxs[hi - st]
    transcript_raw = cleaned[c0:c1 + 1]
    ops = difflib.SequenceMatcher(None, Fsub, Wn, autojunk=False).get_opcodes()
    diffs, fold_pairs = [], []
    for i, (tag, a, b2, c, d) in enumerate(ops):
        if tag == 'equal':
            continue
        left = (ops[i - 1][2] - ops[i - 1][1]) if i and ops[i - 1][0] == 'equal' else 0
        right = (ops[i + 1][2] - ops[i + 1][1]) if i + 1 < len(ops) and ops[i + 1][0] == 'equal' else 0
        a, b2 = a + fi_lo, b2 + fi_lo          # 換算回「整個片段」的正規座標
        if a == b2:                            # difflib 在窗口邊界會給零寬 insert
            q_raw = ''
        elif a < len(qidxs) and b2 - 1 < len(qidxs):
            q_raw = frag[qidxs[a]:qidxs[b2 - 1] + 1]
        else:
            q_raw = Fn[a:b2]
        pj0, pj1 = lo + c - st, lo + d - 1 - st   # Wn 座標 → 該頁 clean() 文字的 norm 座標
        if c == d:
            t_raw = ''
        elif 0 <= pj0 and pj1 < len(idxs):
            t_raw = cleaned[idxs[pj0]:idxs[pj1] + 1]
        else:
            t_raw = Wn[c:d]
        single = tag == 'replace' and (b2 - a) == 1 and (d - c) == 1
        strong = single and left >= MIN_FLANK and right >= MIN_FLANK
        diffs.append({'op': tag, 'quote': Fn[a:b2], 'transcript': Wn[c:d],
                      'quote_raw': q_raw, 'transcript_raw': t_raw,
                      'flank_left': left, 'flank_right': right, 'fold_evidence': strong})
        if strong:
            fold_pairs.append((Fn[a], Wn[c]))
    return {'frag': frag[:80], 'coverage': round(cov / len(Fn), 3), 'exact': exact,
            'candidate_page': page, 'runs': len(merged),
            'longest_run': big[2], 'covered': cov, 'frag_len': len(Fn),
            'similarity': round(difflib.SequenceMatcher(None, Fsub, Wn, autojunk=False).ratio(), 3),
            'transcript': ' '.join(transcript_raw.split()),
            'transcript_raw': transcript_raw, 'page_cleaned_text': cleaned,
            'diffs': diffs, 'fold_pairs': fold_pairs}

def work_text_for(work, listed, wt_cache, map_ok, problems):
    """被引書 → WorkText（快取於 wt_cache）。頁的取舍完全交給 R.witness_ok（類書排除）。"""
    work = work or ''
    if work not in wt_cache:
        pages = [p for p in listed if work and R.witness_ok(work, p)]
        wt = WorkText(pages)
        for st, en, page, cleaned, idxs in wt.bounds:                 # 檢查 A
            map_ok[1] += 1
            if norm_map(cleaned)[0] != W.norm(cleaned):
                problems.append('檢查 A 失敗：%s 的逐字元對映不等於 W.norm()' % page)
            else:
                map_ok[0] += 1
        wt_cache[work] = wt
    return wt_cache[work]


def hint(max_cov):
    if max_cov is None:
        return '無轉錄本可比'
    if max_cov >= 0.999:
        return '判定與快取不同步（片段其實逐字可命中）'
    if max_cov >= 0.9:
        return '同一段、只差少數字（逐字化／折字規則的候選）'
    if max_cov >= 0.5:
        return '同一段但有省字／改字'
    if max_cov > 0:
        return '只找到零星重疊＝引文為自擬摘要'
    return '在所引書已快取的頁裡找不到對應段落＝摘要或該卷未快取'


def collect():
    if not AUDIT.exists():
        print('缺少 reports/quotes-audit.json（先跑 npm run audit:quotes:json）')
        return 1
    rows = json.loads(AUDIT.read_text(encoding='utf-8'))['rows']
    md5_before = hashlib.md5(json.dumps(rows, ensure_ascii=False).encode()).hexdigest()
    un = [r for r in rows if r.get('kind') == 'unchecked']
    og = [r for r in rows if r.get('kind') == 'original']
    listed = W.pages_list()
    listed_set = set(listed)
    problems = []
    map_ok = [0, 0]                       # 檢查 A：逐字元對映 == W.norm() 通過／失敗
    fold_census, out_rows = {}, []
    wt_cache = {}
    t0 = time.time()
    corpus_all = W.corpus()              # 判定層用的同一個比對池，不是本腳本自己組的
    # 同一份比對池、但保留「哪一頁」的歸屬：判定層只問「在不在全庫」，這裡要回答「在哪一頁」。
    page_norms = {}
    for p in listed:
        raw = W.fetch(p, offline=True)
        if raw and not raw.startswith(('NOT_CACHED', 'FETCH_FAILED', 'PAGE_NOT_FOUND')):
            page_norms[p] = W.norm(W.clean(raw))
    for r in un:
        q, src = (r.get('quote') or ''), (r.get('source') or '')
        work = R.cited_work(src)
        wt = work_text_for(work, listed, wt_cache, map_ok, problems)
        named = set(R.named_pages(src))
        frags = [f for f in q.split('……') if len(W.norm(f)) >= 6]
        evs = []
        miss_list = r.get('miss') or []
        for f in frags:
            e = evidence_for_frag(f, wt)
            evs.append(e)
            Fn = norm_map(f)[0]
            # 檢查 C（對齊器 ↔ 判定層交叉驗證，同一個比對池）：判定層自己標的 `miss` 才是權威。
            # verify_batch 是拿「整份快取」做子串比對，所以對齊器在同一池上是否 100% 覆蓋，
            # 必須與「此片段不在 miss 清單」等價。兩個方向任一不一致都要紅：
            #   命中卻被標 miss → 判定與快取不同步；標命中卻到不了 100% → 對齊器失靈。
            in_miss = any(m == f or f.startswith(m) or m.startswith(f) for m in miss_list)
            e['in_miss'] = in_miss
            in_corpus = Fn in corpus_all        # 與 verify_batch 完全同一個判斷式（全庫子串）
            hits_pages = [p for p, t in page_norms.items() if Fn in t]
            e['in_whole_corpus'] = in_corpus
            e['corpus_hit_pages'] = hits_pages[:6]
            if in_corpus and in_miss:
                problems.append('檢查 C 失敗：%s 判定層標 miss，但片段逐字存在於 %s ⇒ 判定與快取不同步'
                                % (r['id'], hits_pages[0] if hits_pages else '（跨頁）'))
            if not in_corpus and not in_miss:
                problems.append('檢查 C 失敗：%s 判定層說此片段已逐字命中，但全庫逐字找不到 ⇒ 判定與快取不同步'
                                % r['id'])
            # 出處歸屬線索（不是 bug，是要給人的風險）：判定層算「有命中」，但所引那本書的頁
            # 裡沒有 ⇒ 命中來自別本書。判定層用全庫 corpus()、`witness_ok()` 只在解析層用，
            # 所以「只在別書出現過的句子」今天是能撐起「原文」的。
            if in_corpus and not e.get('exact'):
                e['hit_outside_cited_work'] = True
            # 檢查 D：頁名要在清單上、要屬於被引那本書、轉錄本文字要能逐字重定位
            if e.get('candidate_page'):
                if e['candidate_page'] not in listed_set:
                    problems.append('檢查 D 失敗：頁名 %s 不在 reports/wikisource-pages.txt'
                                    % e['candidate_page'])
                if e['candidate_page'] not in wt.pages:
                    problems.append('檢查 D 失敗：%s 的候選頁不屬於被引那本書（witness_ok 失守）' % r['id'])
                if e['transcript_raw'] not in e['page_cleaned_text']:
                    problems.append('檢查 D 失敗：%s 的轉錄本對照無法逐字重定位' % r['id'])
            for qc, tc in e.get('fold_pairs', []):
                d = fold_census.setdefault((qc, tc), {'count': 0, 'ids': [], 'pages': []})
                d['count'] += 1
                if len(d['ids']) < 4:
                    d['ids'].append(r['id'])
                if e.get('candidate_page') and len(d['pages']) < 4:
                    d['pages'].append(e['candidate_page'])
        covs = [e['coverage'] for e in evs if e.get('coverage') is not None]
        # hint 只看「判定層標 miss 的片段」——那才是卡住的地方；已命中的片段覆蓋率當然是 1，
        # 混進來會讓多片段條目看起来像「判定與快取不同步」（第一版就踩過這個）。
        mcovs = [e['coverage'] for e in evs if e.get('in_miss') and e.get('coverage') is not None]
        hits = [e['candidate_page'] for e in evs if e.get('candidate_page')]
        out_rows.append({'id': r['id'], 'group': r.get('group'), 'work': work,
                         'source': src[:120], 'quote': q[:200],
                         'cached_pages_for_work': len(wt.pages),
                         'cited_volume_pages_cached': sorted(p for p in named if p in listed_set)[:8],
                         'hit_page_is_cited_volume': bool([p for p in hits if p in named]),
                         'frags': len(frags),
                         'miss_frags': sum(1 for e in evs if e.get('in_miss')),
                         'min_coverage': min(covs) if covs else None,
                         'max_coverage': max(covs) if covs else None,
                         'max_coverage_miss_frags': max(mcovs) if mcovs else None,
                         'hint': ('無可比片段（引文低於 6 字比對下限）' if not frags
                                  else hint(max(mcovs) if mcovs else (max(covs) if covs else None))),
                         'evidence': [{k: v for k, v in e.items() if k != 'page_cleaned_text'}
                                      for e in evs]})
        if len(out_rows) % 15 == 0:
            print('  …%d/%d 筆（%ss）' % (len(out_rows), len(un), round(time.time() - t0, 1)))
    return {'problems': problems, 'fold_census': fold_census, 'rows_out': out_rows,
            'wt_cache': wt_cache, 'og': og, 'corpus_all': corpus_all, 'un': un,
            'listed': listed, 'map_ok': map_ok, 'page_norms': page_norms,
            'md5_before': md5_before, 't0': t0}


def attribution_scan(og, listed, wt_cache, map_ok, problems, page_norms, max_frags=0):
    """已判「原文」的條目：那次命中真的在被引那本書裡嗎？

    判定層比對的是全庫 `corpus()`，`witness_ok()`（排除類書／輯錄）只在解析層用。
    所以一條標《史記》的引文，可能只因為某本類書或另一本書出現過同一句就被判「原文」。
    這個函數把「命中不在所引書之頁」的筆數點出來。這是**假陽性風險**、不是本輪要改的
    判定（鐵律 1/2：不能動被驗證的對象，也不能手動改標），但鐵律 4 要求發現就不能放過，
    所以數字與清單都要交出去。
    """
    risky, checked = [], 0
    for r in og:
        q, src = (r.get('quote') or ''), (r.get('source') or '')
        work = R.cited_work(src)
        frags = [f for f in q.split('……') if len(W.norm(f)) >= 6]
        if max_frags:
            frags = frags[:max_frags]        # 0／未設定＝不截斷（第一版截 3 段會漏報）
        if not frags:
            continue
        wt = work_text_for(work, listed, wt_cache, map_ok, problems)
        outside = []
        for f in frags:
            Fn = norm_map(f)[0]
            checked += 1
            inside = align_frag(Fn, wt.T, ks=(10,), stride=1) if wt.T else None
            if not inside or inside[2] < len(Fn):
                outside.append({'frag': f[:40],
                                'hit_pages': [p for p, t in page_norms.items() if Fn in t][:6]})
        if outside:
            risky.append({'id': r['id'], 'group': r.get('group'), 'work': work,
                          'source': src[:100], 'quote': q[:120],
                          'cached_pages_for_work': len(wt.pages),
                          'frags_not_in_cited_work': outside})
    return checked, risky


def main():
    c = collect()
    problems, corpus_all, og = c['problems'], c['corpus_all'], c['og']
    # 檢查 B（正控制）：已判「原文」的條目，同一支對齊器必須 100% 覆蓋。
    # 沒有這一条，「找不到」的報告可能是對齊器壞了而不是引文非逐字——那才是假的收斂證據。
    pos_n, pos_fail = 0, []
    for r in og[:16]:
        for f in [x for x in (r.get('quote') or '').split('……') if len(W.norm(x)) >= 6]:
            Fn = norm_map(f)[0]
            pos_n += 1
            best = align_frag(Fn, corpus_all, ks=(10,), stride=2)
            if not best or best[2] < len(Fn):
                pos_fail.append(r['id'])
    if pos_fail:
        problems.append('檢查 B 失敗：%d/%d 條已判「原文」的引文，對齊器無法 100%% 覆蓋（例 %s）'
                        ' ⇒ 對齊器失靈，本報告不可信' % (len(pos_fail), pos_n, pos_fail[:3]))

    # 檢查 E：本腳本不得動到判定（rows 逐筆雜湊要相同）
    md5_after = hashlib.md5(json.dumps(
        json.loads(AUDIT.read_text(encoding='utf-8'))['rows'], ensure_ascii=False).encode()).hexdigest()
    if c['md5_before'] != md5_after:
        problems.append('檢查 E 失敗：quotes-audit.json 的 rows 在本輪被改動（%s→%s）'
                        % (c['md5_before'], md5_after))

    # 出處歸屬掃描：已判「原文」的條目，那次命中是否真的落在被引那本書的頁裡
    attr_checked, attr_risky = attribution_scan(og, c['listed'], c['wt_cache'],
                                                c['map_ok'], problems, c['page_norms'])

    # 交叉核對：`resolve-unchecked.py --witness-audit` 早就把「命中在哪本書」攤開過
    # （strong／weak／cross_page）。兩套各自寫出来的程式要指出同一批條目，
    # 這個結論才算可重複驗證，而不是單一腳本的自說自話。
    cross = None
    wf = ROOT / 'reports' / 'witness-findings.json'
    if wf.exists():
        w = json.loads(wf.read_text(encoding='utf-8'))
        t_weak = {x['id'] for x in w.get('weak', [])}
        t_xp = {x['id'] for x in w.get('cross_page', [])}
        mine = {x['id'] for x in attr_risky}
        cross = {'this_scan_flagged': sorted(mine),
                 'witness_audit_weak': sorted(t_weak),
                 'witness_audit_cross_page': sorted(t_xp),
                 'weak_all_also_flagged_here': bool(t_weak.issubset(mine)),
                 'only_this_scan': sorted(mine - t_weak - t_xp),
                 'only_witness_audit': sorted((t_weak | t_xp) - mine),
                 'note': ('本腳本判準＝「有片段不在**被引那本書**」（書層級）；'
                          'cross_page 判準＝「沒有單一頁含全部片段」（頁層級，同書不同卷也算）。'
                          '兩者重疊但不必相等，差異要能解釋。')}

    secs = round(time.time() - c['t0'], 1)
    frag_n = sum(len(r['evidence']) for r in c['rows_out'])
    hist = {}
    for row in c['rows_out']:
        hist[row['hint']] = hist.get(row['hint'], 0) + 1
    out = {'_about': ('未核引文的「最接近轉錄本對照」＋單字差異普查。純離線（只讀 vendor/wikisource，'
                      '零 HTTP）、不改判定、不改 src、不碰 clean()/norm()/VARIANT。'
                      'coverage = 片段與轉錄本最長精確對應的覆蓋率，是对照證據、不是「已核」；'
                      '「已核」仍只由 wikisource.py --verify-batch 產生。'),
           '_at': datetime.datetime.now().isoformat(timespec='seconds'),
           'seconds': secs,
           'unchecked_rows': len(c['un']),
           'cached_pages_per_cited_work': {w: len(v.pages) for w, v in c['wt_cache'].items() if w},
           'hint_hist': hist,
           'fold_pair_census': [{'quote_char': k[0], 'transcript_char': k[1], 'count': v['count'],
                                 'ids': v['ids'], 'pages': v['pages']}
                                for k, v in sorted(c['fold_census'].items(), key=lambda kv: -kv[1]['count'])],
           'self_checks': {
               'A_norm_mapping': '%d/%d 頁：逐字元對映 == W.norm()' % (c['map_ok'][0], c['map_ok'][1]),
               'B_positive_control': '%d/%d 條已判原文之片段 100%% 覆蓋' % (pos_n - len(pos_fail), pos_n),
               'C_aligner_vs_verdict_miss': ('%d 段對照與判定層的 miss 完全互斥（兩層同視角）' % frag_n
                                             if not any(p.startswith('檢查 C') for p in problems)
                                             else '有片段兩層講法不一致（見 problems）'),
               'D_no_invented_page_or_text': '所有頁名在清單且屬被引書、所有轉錄本對照可逐字重定位' if not any(
                   p.startswith('檢查 D') for p in problems) else '有輸出無法重定位',
               'E_verdicts_untouched_rows_md5': c['md5_before']},
           'attribution_risk': {
               '_about': ('已判「原文」的條目，命中是否落在被引那本書自己的頁裡。判定層用全庫 '
                          'corpus()、witness_ok() 只在解析層 ⇒ 「只在別書出現過的句子」今天仍能'
                          '撑起「原文」。這裡只點名，不改判定。'),
               'original_rows_scanned': len(og),
               'frags_checked': attr_checked,
               'rows_whose_hit_is_not_in_cited_work': len(attr_risky),
               'cross_check_against_witness_audit': cross,
               'rows': attr_risky},
           'problems': problems,
           'rows': c['rows_out']}
    OUTJ.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
    write_md(out, c['fold_census'])
    print('未核 %d 筆／片段對照 %d 段，用時 %ss（全部 offline=True，零 HTTP）'
          % (out['unchecked_rows'], sum(len(r['evidence']) for r in out['rows']), secs))
    for k, v in sorted(hist.items(), key=lambda kv: -kv[1]):
        print('  %-46s %d 筆' % (k, v))
    print('  單字差異普查（前後各 ≥%d 字仍逐字相同）：%s'
          % (MIN_FLANK, '、'.join('%s↔%s ×%d' % (x['quote_char'], x['transcript_char'], x['count'])
                                 for x in out['fold_pair_census'][:10]) or '（無）'))
    print('  出處歸屬掃描：已判「原文」%d 條／%d 段 → 命中不在所引書之頁的 %d 條%s'
          % (len(og), attr_checked, len(attr_risky),
             '（例：%s）' % '、'.join(x['id'] for x in attr_risky[:6]) if attr_risky else ''))
    if cross:
        print('  與 `--witness-audit` 交叉核對：weak %d ⊆ 本掃描 %d → %s｜只在本掃描 %s｜只在 witness-audit %s'
              % (len(cross['witness_audit_weak']), len(cross['this_scan_flagged']),
                 '是' if cross['weak_all_also_flagged_here'] else '否',
                 cross['only_this_scan'] or '無', cross['only_witness_audit'] or '無'))
    print('  檢查 A %s ｜ B %s ｜ E rows md5 %s（未變）'
          % (out['self_checks']['A_norm_mapping'], out['self_checks']['B_positive_control'],
             c['md5_before'][:8]))
    print('已寫出', OUTJ)
    for p in problems:
        print('檢查失敗:', p)
    return 1 if problems else 0


def write_md(out, fold_census):
    L = ['# 未核引文：最接近的轉錄本對照（closest witness）', '',
         '> 這**不是判定**。「已核」仍只由 `wikisource.py --verify-batch` 產生；本檔只回答一件事——',
         '> 那 %d 筆未核，轉錄本**實際上**寫了什麼、跟卡片引文差在哪幾個字、差在哪一頁。' % out['unchecked_rows'],
         '',
         '> 純離線（只讀 `vendor/wikisource/`，全部 `offline=True`，零 HTTP）；不改 `src/**`、不碰',
         '> `clean()`/`norm()`/`VARIANT`；頁的取舍沿用 `resolve-unchecked.witness_ok()`（類書／輯錄一律',
         '> 排除，避免把「只在別本書出現過的短句」當命中）。',
         '',
         '生成：`python3 scripts/closest-witness.py`（%ss）。coverage = 片段與轉錄本最長精確對應的覆蓋率。'
         % out['seconds'], '',
         '## 覆蓋率分布', '']
    for k, v in sorted(out['hint_hist'].items(), key=lambda kv: -kv[1]):
        L.append('- %s：**%d** 筆' % (k, v))
    L += ['', '## 逐筆對照']
    for row in out['rows']:
        L += ['', '### `%s` — %s ｜ %s' % (row['id'], row['work'] or '（出處未點名書名）', row['hint']), '',
              '- 出處欄：`%s`' % row['source'],
              '- 現行引文（src 原文字，未改）：`%s`' % row['quote'],
              '- 該書已快取 %d 頁；出處點名之卷已快取：%s；對齊命中頁＝點名之卷：%s'
              % (row['cached_pages_for_work'],
                 '、'.join(row['cited_volume_pages_cached']) or '（無／出處未點名卷次）',
                 '是' if row['hit_page_is_cited_volume'] else '否')]
        for e in row['evidence']:
            L.append('')
            L.append('- 片段 `%s` → 在所引書頁的覆蓋率 %s｜全庫逐字命中：%s'
                     % (e['frag'], e.get('coverage', '—'),
                        '、'.join(e['corpus_hit_pages']) if e.get('corpus_hit_pages')
                        else ('（命中跨頁）' if e.get('in_whole_corpus') else '無')))
            if e.get('candidate_page'):
                L.append('  - 轉錄本（`%s`；已去模板標記、保留原標點）：%s'
                         % (e['candidate_page'], e['transcript']))
                if e['diffs']:
                    for d in e['diffs']:
                        L.append('  - %s：引文作「%s」／轉錄本作「%s」（左 %d 字、右 %d 字逐字相同%s）'
                                 % (d['op'], d['quote_raw'], d['transcript_raw'],
                                    d['flank_left'], d['flank_right'],
                                    ' ← 達折字實證標準' if d['fold_evidence'] else ''))
                else:
                    L.append('  - 差異：無（此段逐字相同）')
            else:
                L.append('  - %s' % e.get('why', ''))
    ar = out['attribution_risk']
    L += ['', '## ⚠ 出處歸屬掃描：已判「原文」，但命中不在被引那本書（%d／%d 條）'
          % (ar['rows_whose_hit_is_not_in_cited_work'], ar['original_rows_scanned']), '',
          '判定層 `verify_batch()` 比對的是**全庫** `corpus()`，`witness_ok()`（排除類書／輯錄）'
          '只在解析層用。',
          '所以下列條目的逐字命中**不是**出現在它自己標的那本書裡（該書已快取的頁沒有這句話）。'
          '本腳本**不改判定**（鐵律 1/2），只把這 %d 條點出來給人判斷。'
          % ar['rows_whose_hit_is_not_in_cited_work'], '',
          '掃描範圍：已判「原文」%d 條、%d 個片段。' % (ar['original_rows_scanned'], ar['frags_checked']), '']
    for x in ar['rows'][:40]:
        segs = '；'.join('「%s」→命中在 %s'
                         % (o['frag'], '、'.join(o['hit_pages']) or '（全庫逐字無＝跨頁命中）')
                         for o in x['frags_not_in_cited_work'])
        L.append('- `%s`（%s）出處 `%s`｜該書已快取 %d 頁｜%s'
                 % (x['id'], x['work'] or '（未點名書名）', x['source'],
                    x['cached_pages_for_work'], segs))
    if not ar['rows']:
        L.append('（無：全部已判「原文」之片段都落在所引書自己的頁裡）')
    L += ['', '## 單字差異普查（只統計、不採納）', '',
          '`wikisource.py` 的註解替折字定了實證標準：「同一句、斷後仍接回 6 字以上」才算異體字，'
          '否則屬異文／引文改字（于/於、陳/陣、亡/喪 明文不折）。',
          '下表只數「單字替換，且左右各 ≥%d 字仍逐字相同」的差異——就是那條標準的可重跑版本。'
          '已被 `VARIANT` 折掉的字形不會出現在這裡。' % MIN_FLANK, '',
          '| 卡片引文作 | 轉錄本作 | 次數 | 事件 id（例） | 頁（例） |', '|---|---|---|---|---|']
    for k, v in sorted(fold_census.items(), key=lambda kv: -kv[1]['count']):
        L.append('| %s | %s | %d | %s | %s |'
                 % (k[0], k[1], v['count'], '、'.join(v['ids']), '、'.join(v['pages'])))
    L += ['', '要不要加折字是**改被驗證的規則**（會同時動「原文」與「可疑」兩個數字），'
          '故本腳本只交出計數，不實作、不採納。', '']
    if out['problems']:
        L.append('## ⚠ 自報檢查未全過')
        L += ['- %s' % p for p in out['problems']]
    else:
        L.append('自報檢查 A/B/C/D/E 全過（清洗對映等值、正控制 100% 覆蓋、無判定／快取不同步、'
                 '無憑空頁或文字、rows 雜湊未變）。')
    L.append('')
    OUTM.write_text('\n'.join(L), encoding='utf-8')


if __name__ == '__main__':
    sys.exit(main())


