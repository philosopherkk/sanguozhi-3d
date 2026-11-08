#!/usr/bin/env python3
"""verifier-teeth.py — 判定層到底有沒有「咬合力」（受控變異 / 反控掃描）。

plateau 之後「未核」不再下降，剩下要證的是**另一側**：那 224 條「與轉錄本一致」
是判定出來的，還是橡皮章蓋出來的？一支永遠回 OK 的比對器和一支會紅的比對器，
在 reports/ 裡看起來一模一樣。本腳本用受控變異把判定層的「靈敏度」與「寬容邊界」
變成可重跑的數字。

**所有判定一律透過 `scripts/wikisource.py --verify-batch`**（清洗 clean/norm、
出處匹配 vendored、片段規則都只有一家；本腳不複製、不自行 substring 比對）。
本腳只負責：造變異 → 送進去 → 讀回判定 → 檢查「該紅的有沒有紅、該過的有沒有過」。

七組變異（對每條已判「與轉錄本一致」的引文各做一輪，固定種子 ⇒ 可重跑同結果）：
  F1 sub        改一個字（換成轉錄本正文幾乎不出現的罕用字）→ 該紅（未核或可疑）
  F2 punct      塞一個現代標點                  → 該**仍過**（norm 去標點，兩向對稱）
  F3 variant    換成 VARIANT 表內的異體字        → 該**仍過**（折字表真的生效）
  F4 nonvariant 換成刻意**不折**的字（于↔於 等）  → 資訊性：仍過只代表轉錄本別處真有該寫法，
                                                   不是放水（折字表沒有解它）
  F5 foreign    整段換成**別本書**快取頁的逐字文字、出處欄照舊 → 仍過＝該判定不證「歸屬」
  F6 fake-src   F1 的錯文字 + 出處改成未快取之書  → 該 unchecked（沒快取不算錯）
  F7 cached-vol F1 的錯文字 + 出處改成已快取之卷  → 該 suspect（有該卷卻找不到＝引文有誤）

反控（同批）：
  B0 已判「原文」→ 必須仍 ok；B1 未核 → 必須仍不 ok（任一違反＝JSON 被手改，破鐵律 2）
  B2 意譯/無原文/近現代免 → 只探 classify() 邊界：有幾條其實逐字命中（只報，不改規則）

零 HTTP：整個批次跑兩遍，第二遍全部 proxy env 指向必定拒絕連線的 127.0.0.1:9；
兩遍輸出逐位元組相同 ⇒ 判定層不需要網路（順帶證確定性）。

唯讀：不寫 src/、不改判定、不產生任何「已核」紀錄。只寫
reports/verifier-teeth.json（**合成變異的診斷**，不是任何條目的判定）。
用法：python3 scripts/verifier-teeth.py     （exit 0 = 自我檢查全過）
"""
import ast
import hashlib
import json
import os
import pathlib
import random
import subprocess
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts'))
import wikisource as W  # noqa: E402  清洗／清單／快取路徑只有一家

AUDIT = ROOT / 'reports' / 'quotes-audit.json'
OUT = ROOT / 'reports' / 'verifier-teeth.json'
SEED = 20261107
BLACKHOLE = 'http://127.0.0.1:9'
RARE = '玄顗珉乂翊顓隗睆彧'      # 罕用字：換進去後轉錄本大概率不存在該串 → 該紅
NONFOLD = {'于': '於', '於': '于', '陳': '陣', '陣': '陳', '亡': '喪', '喪': '亡'}
FAKE_BOOK = '燼天錄'             # 確定不在 reports/wikisource-pages.txt 上的書名
SLICE = 18                      # F5 取別本書的逐字片段長度（遠超片段下限 6）


def verifiable_chars(q):
    """引文裡「可換的字」（排除標點／空白）→ 索引清單。"""
    return [i for i, c in enumerate(q) if c not in W.PUNCT and not c.isspace()]


def run_batch(items, blackhole=False):
    """判定只從 wikisource.py --verify-batch 來（單一實作，本腳不比對任何文字）。

    兩遍對照的意義：第一遍**明確清掉**所有 proxy env（直連视野），第二遍全部指向必定拒絕
    連線的 127.0.0.1:9。兩遍輸出逐位元組相同 ⇒ 判定層沒有任何網路依賴。
    （若不 clear，在 quote-health.sh 裡跑時兩遍都是黑網洞，對照就變成自己跟自己比。）
    """
    env = dict(os.environ)
    for k in ('http_proxy', 'https_proxy', 'HTTP_PROXY', 'HTTPS_PROXY', 'no_proxy', 'NO_PROXY'):
        env.pop(k, None)
    if blackhole:
        for k in ('http_proxy', 'https_proxy', 'HTTP_PROXY', 'HTTPS_PROXY'):
            env[k] = BLACKHOLE
    p = subprocess.run([sys.executable, str(ROOT / 'scripts' / 'wikisource.py'), '--verify-batch'],
                       input=json.dumps(items, ensure_ascii=False),
                       capture_output=True, text=True, env=env)
    if p.returncode != 0:
        raise SystemExit('verify-batch 失敗：' + p.stderr[:400])
    return json.loads(p.stdout)


def main():
    rng = random.Random(SEED)
    rows = json.load(open(AUDIT, encoding='utf-8'))['rows']
    orig = [r for r in rows if r['kind'] == 'original']
    unchk = [r for r in rows if r['kind'] == 'unchecked']
    bypass = [r for r in rows if r['kind'] in ('paraphrase', 'missing', 'modern')
              and (r.get('quote') or '').strip()]
    print('判定層咬合力掃描：已判原文 %d · 未核 %d · 走 classify 捷徑（意譯/無原文/近現代）%d'
          % (len(orig), len(unchk), len(bypass)))

    # F5 素材：各快取頁的正規化正文（走同一份 clean/norm）。
    # F7 素材：卷次是數字的頁（出處要能點名到具體卷）。
    page_norm, vol_pages = {}, []
    for p in W.pages_list():
        name = p[3:] if p.startswith('ja:') else p
        book, _, vol = name.partition('/')
        f = W.cache_key(p)
        if f.exists() and f.stat().st_size > 0:
            page_norm[p] = (book, W.norm(W.clean(f.read_text())))
            if vol.startswith('卷') and vol[1:].isdigit():
                vol_pages.append((p, book, vol[1:]))
    vol_pages.sort()
    cand = sorted(page_norm)
    print('素材：%d 頁正規化正文（F5）、%d 頁可作 F7 的具名卷' % (len(cand), len(vol_pages)))

    items, fam, meta = [], {}, {}
    seq = [0]

    def add(family, rid, quote, source):
        # 唯一鍵：事件 id 在不同群組會重複（例：帝制-金／pack-jin 都取自 DEPTH_EVENTS['jin']，
        # 未核群也有同名 id）。上一輪 human-decision-sheet 就是栽在 set 吃重複列——
        # 這裡若照 id 當鍵，224 條會縮成 168 條，檢查變成假通過。
        seq[0] += 1
        key = '%04d|%s|%s' % (seq[0], family, rid)
        fam[key] = family
        meta[key] = {'rid': rid, 'family': family, 'quote': quote, 'source': source}
        items.append({'id': key, 'quote': quote, 'source': source})

    for r in rows:                       # 反控 B0/B1/B2：原文字、原出處、原樣送
        add('B-' + r['kind'], r['id'], r['quote'], r['source'])

    for r in orig:
        q, src = r['quote'], r['source']
        pos = verifiable_chars(q)
        if not pos:
            continue
        i = pos[len(pos) // 2]
        old = q[i]
        new = next((c for c in RARE if c != old and c not in NONFOLD), '玄')
        mut = q[:i] + new + q[i + 1:]
        add('F1', r['id'], mut, src)                      # 該紅
        meta[items[-1]['id']]['pos'] = i                  # 漏網時要能解釋是哪一段
        add('F2', r['id'], q[:i] + '，' + q[i:], src)     # 該仍過
        # F3：換成折字表內的異體字。注意 str.maketrans 的 key 是**序數（int）**，
        # 直接 `q[j] in W.VARIANT` 永遠 False（本腳開發時踩過：F3 會靜靜地 0 筆）。
        # 這裡只是把同一張表讀成「字→字」來**造變異**，判定仍全部由 --verify-batch 做。
        for a, b in sorted((chr(k), val) for k, val in W.VARIANT.items()
                           if isinstance(k, int) and isinstance(val, str) and len(val) == 1):
            j = next((t for t in pos if q[t] == a), None)
            if j is None:
                j = next((t for t in pos if q[t] == b), None)
            if j is not None:
                rep = b if q[j] == a else a
                add('F3', r['id'], q[:j] + rep + q[j + 1:], src)     # 該仍過
                break
        nf = next((j for j in pos if q[j] in NONFOLD), None)
        if nf is not None:
            add('F4', r['id'], q[:nf] + NONFOLD[q[nf]] + q[nf + 1:], src)   # 資訊性
        pool = [p for p in cand if page_norm[p][0] not in (src or '')]      # F5 別本書
        if pool:
            nt = page_norm[pool[rng.randrange(len(pool))]][1]
            if len(nt) >= SLICE:
                add('F5', r['id'], nt[rng.randrange(len(nt) - SLICE):][:SLICE], src)
        add('F6', r['id'], mut, FAKE_BOOK + '卷12')              # 該 unchecked
        if vol_pages:                                            # 該 suspect
            _, b, vv = vol_pages[rng.randrange(len(vol_pages))]
            add('F7', r['id'], mut, '%s卷%s' % (b, vv))

    t0 = time.time()
    res1 = run_batch(items)
    res2 = run_batch(items, blackhole=True)      # 黑網洞代理：輸出該逐位元組相同
    dt = time.time() - t0
    d1 = hashlib.md5(json.dumps(res1, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
    d2 = hashlib.md5(json.dumps(res2, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
    v = {x['id']: x['verdict'] for x in res1}

    def stat(family):
        ids = [k for k, f in fam.items() if f == family]
        hist = {}
        for k in ids:
            key = v.get(k, 'ABSENT')
            hist[key] = hist.get(key, 0) + 1
        return {'n': len(ids), 'ok': hist.get('ok', 0), 'not_ok': len(ids) - hist.get('ok', 0),
                'verdicts': hist,
                'not_ok_ids': sorted({k.split('|')[2] for k in ids if v.get(k) != 'ok'})[:25]}

    s = {f: stat(f) for f in ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7',
                              'B-original', 'B-unchecked', 'B-paraphrase', 'B-missing', 'B-modern']}
    # F1 改一個字卻仍命中的條目（同一個錯文字也送進 F6/F7，所以那兩組的 ok 必來自這裡）
    leak = [k for k, f in fam.items() if f == 'F1' and v.get(k) == 'ok']
    leak_rid = sorted({k.split('|')[2] for k in leak})
    leak_detail = []
    for k in leak:
        m = meta[k]
        frags = m['quote'].split('……')
        # 片段下限是 6 字（判定層規則）；這裡只是列出各片段正規化後的長度來**解釋**漏網，
        # 比對本身仍由 --verify-batch 做，沒有重現判定。
        lens = [(f[:24], len(W.norm(f))) for f in frags]
        leak_detail.append({'id': m['rid'], 'mutated_index': m.get('pos'),
                            'fragments': [{'text': t, 'norm_len': n} for t, n in lens]})

    # ---- 自我檢查 A–H：任一不過就不交報告 ----
    fails, notes = [], []
    # 反空轉：任何一組變異若 0 筆，該組的檢查就是假的（前輪學到的教訓）
    empty = [f for f in ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7'] if s[f]['n'] == 0]
    if empty:
        fails.append('V 反空轉失敗：變異組 %s 是 0 筆 ⇒ 該組檢查沒有執行到' % ','.join(empty))
    else:
        notes.append('V 反空轉：七組變異筆數 %s ⇒ 每組檢查都真的執行到'
                     % ' '.join('%s=%d' % (f, s[f]['n']) for f in ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7']))
    if s['B-original']['not_ok'] or s['B-unchecked']['ok']:
        fails.append('A 反控失敗：B0 有 %d 條不為 ok／B1 有 %d 條為 ok ⇒ quotes-audit.json 與快取不同步'
                     % (s['B-original']['not_ok'], s['B-unchecked']['ok']))
    else:
        notes.append('A 反控通過：%d/%d 已判原文仍 ok、%d/%d 未核仍不 ok（沒有人手動標已核）'
                     % (s['B-original']['ok'], s['B-original']['n'],
                        s['B-unchecked']['not_ok'], s['B-unchecked']['n']))
    if s['F2']['ok'] != s['F2']['n']:
        fails.append('B 標點兩向對稱失敗：F2 有 %d/%d 塞標點被誤殺' % (s['F2']['not_ok'], s['F2']['n']))
    else:
        notes.append('B 標點對稱：%d/%d 塞現代標點仍過 ⇒ 去標點是兩向規則，不是單向放水'
                     % (s['F2']['ok'], s['F2']['n']))
    if s['F3']['ok'] != s['F3']['n']:
        fails.append('C 折字表失敗：F3 有 %d/%d 換異體字後被紅（VARIANT 沒生效？）'
                     % (s['F3']['not_ok'], s['F3']['n']))
    else:
        notes.append('C 折字表：%d/%d 換成 VARIANT 表內異體字仍過' % (s['F3']['ok'], s['F3']['n']))
    if s['F6']['verdicts'] in ({'unchecked': s['F6']['n']},
                               {'unchecked': s['F6']['n'] - len(leak), 'ok': len(leak)}):
        notes.append('D1 unchecked 分支：%d/%d（錯文字＋未快取之書）判未核、不判錯'
                     '（其中 %d 條的 ok 來自 F1 漏網，見 f1_leak_detail）'
                     % (s['F6']['not_ok'], s['F6']['n'], len(leak)))
    else:
        fails.append('D1 unchecked 分支異常：%s' % json.dumps(s['F6']['verdicts'], ensure_ascii=False))
    if s['F7']['verdicts'] in ({'suspect': s['F7']['n']},
                               {'suspect': s['F7']['n'] - len(leak), 'ok': len(leak)}):
        notes.append('D2 suspect 分支有牙：%d/%d（錯文字＋已快取之卷）判可疑 ⇒ 判定層不是橡皮章'
                     % (s['F7']['not_ok'], s['F7']['n']))
    else:
        fails.append('D2 suspect 分支異常（該紅卻不紅＝橡皮章）：%s'
                     % json.dumps(s['F7']['verdicts'], ensure_ascii=False))
    if s['F1']['not_ok'] == s['F1']['n']:
        notes.append('E F1 改一個字：%d/%d 全數判紅 ⇒ 判定層對單字改動有咬合力' % (s['F1']['n'], s['F1']['n']))
    else:
        notes.append('E F1 改一個字：抓到 %d/%d；漏網者＝改後轉錄本別處真的存在該串（見 not_ok_ids）'
                     % (s['F1']['not_ok'], s['F1']['n']))
    if d1 != d2:
        fails.append('F 黑網洞代理下輸出不同（%s ≠ %s）⇒ 判定層有網路依賴' % (d1[:8], d2[:8]))
    else:
        notes.append('F 黑網洞代理下批次輸出逐位元組相同（md5 %s）⇒ 判定層零 HTTP＋結果確定' % d1[:12])
    notes.append('G classify 捷徑邊界：意譯 %d／無原文 %d／近現代 %d 條裡，逐字命中快取的各為 '
                 '%d／%d／%d（只是規則邊界，本腳不改 classify）'
                 % (s['B-paraphrase']['n'], s['B-missing']['n'], s['B-modern']['n'],
                    s['B-paraphrase']['ok'], s['B-missing']['ok'], s['B-modern']['ok']))
    # H：本腳不可複製判定層（清洗／正規化／折字表）。用 AST 看「本模組自己定義了什麼」，
    # 不用字串搜尋——字串搜尋會命中自己寫的反控清單（本腳開發時踩過：六個全紅的假警報）。
    own = ast.parse(pathlib.Path(__file__).read_text(encoding='utf-8'))
    defined = set()
    for node in own.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            defined.add(node.name)
        elif isinstance(node, ast.Assign):
            for t in node.targets:
                if isinstance(t, ast.Name):
                    defined.add(t.id)
        elif isinstance(node, ast.ImportFrom):
            for a in node.names:
                defined.add(a.asname or a.name)
    dup = sorted(defined & {'norm', 'clean', 'clean_strict', 'corpus', 'verify', 'verify_batch',
                            'vendored', 'PUNCT', 'PUNCT_RE', 'VARIANT', 'INVIS', 'unwrap_body'})
    if dup:
        fails.append('H 本腳複製了判定層成分（本模組自己定義了 %s）——清洗／比對只許一份' % ','.join(dup))
    else:
        notes.append('H 單一實作：本腳沒有定義 norm/clean/vendored/corpus/VARIANT 等，'
                     '判定一律取自 --verify-batch 子程序')
    # ---- 判定層邊界診斷（只測量，不改規則）----
    # verify_batch 的片段規則是「split('……') 後正規化長度 ≥ 6 才比對」。
    # 本腳用同一份 W.norm 去**數**有幾條引文含「短於 6 字」的片段——那些片段從未進比對池，
    # 所以該條的「與轉錄本一致」只覆盖長片段。這數字是給人工裁的，不是改規則的理由。
    short_rows = []
    for r in rows:
        q = (r.get('quote') or '').strip()
        if not q or r['kind'] not in ('original', 'unchecked'):
            continue
        frags = q.split('……')
        short = [(f, len(W.norm(f))) for f in frags if len(W.norm(f)) < 6]
        if short and len(frags) > 1:
            short_rows.append({'id': r['id'], 'group': r['group'], 'kind': r['kind'],
                               'short_fragments': [{'text': t, 'norm_len': n} for t, n in short],
                               'checked_fragments': len(frags) - len(short)})
    if short_rows:
        notes.append('I 片段下限 6 字的暴露面：%d 條多片段引文含有「正規化 <6 字」的片段（那些片段從未進比對池）'
                     % len(short_rows))

    payload = {
        '_about': '判定層咬合力掃描（受控變異／反控）。此處的 verdict 是**合成變異**的診斷結果，'
                  '不是任何事件卡的判定，也不是任何 allowlist；真正進入 audit 的判定只來自 '
                  'scripts/wikisource.py --verify-batch（clean/norm/vendored 只有一家）。'
                  '本腳不改 src/、不改判定、不新增快取頁。',
        '_at': time.strftime('%Y-%m-%dT%H:%M:%S'),
        'seed': SEED,
        'items': len(items),
        'batch_digest': d1,
        'batch_digest_blackhole': d2,
        'seconds': round(dt, 2),
        'counts': {'original': len(orig), 'unchecked': len(unchk), 'classify_bypass': len(bypass)},
        'families': s,
        'f1_leak_ids': leak_rid,
        'f1_leak_detail': leak_detail,
        'short_fragment_rows': short_rows,
        'self_checks': {'notes': notes, 'failures': fails},
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
    for fam_ in ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7']:
        x = s[fam_]
        print('  %-3s n=%-4d ok=%-4d 判定分配 %s'
              % (fam_, x['n'], x['ok'], json.dumps(x['verdicts'], ensure_ascii=False)))
    for n in notes:
        print('  OK   ' + n)
    for f in fails:
        print('  FAIL ' + f)
    print('  F5 判讀：把引文整段換成「別本書」快取頁的逐字文字、出處欄照舊 → %d/%d 仍 ok。'
          '所以「與轉錄本一致」證的是「該串存在於快取某處」，**不證歸屬**；'
          '歸屬另由 --witness-audit / closest-witness 的書層級掃描計。'
          % (s['F5']['ok'], s['F5']['n']))
    print('  F4 判讀：刻意不折的字（于↔於、陳↔陣、亡↔喪）換掉後 %d/%d 仍 ok ⇒ 那些是轉錄本別處'
          '真的存在該寫法，不是折字表放水（F3 只走 VARIANT 表）。' % (s['F4']['ok'], s['F4']['n']))
    for d in leak_detail:
        print('  F1 漏網 %s：片段 %s（改在第 %s 字元）'
              % (d['id'], [(f['text'], f['norm_len']) for f in d['fragments']], d['mutated_index']))
    for d in short_rows[:12]:
        print('  短片段（從未進比對池）%-16s %s ｜ 已比對片段 %d 個 ｜ 短片段 %s'
              % (d['id'], d['kind'], d['checked_fragments'],
                 [(f['text'], f['norm_len']) for f in d['short_fragments']]))
    print('已寫出 reports/verifier-teeth.json（%d 個合成判定，%.1fs）' % (len(items), dt))
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main())

