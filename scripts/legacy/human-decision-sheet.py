#!/usr/bin/env python3
"""未核引文的「人工裁決清單」——純彙整，不做任何比對、不改任何判定。

存在的理由：收斂條款觸發後，每輪回報只有 (a)(b)(c)(d) 四個**數字**。
數字能證明「自動路線已達上限」，卻無法讓人工接手——要接手的人得自己
去 JSON 裡挖 51 筆、還要把同一事件在多 pack 的重複列去重。本腳本把那
51 筆變成一張可照著做的單子：每筆列出事件 id、出處、現行引文文字、
真正比對不上的片段（quotes-audit 的 `miss`），以及該類型的**人工動作選項**。

邊界（鐵律）：
  * 唯讀。只讀 reports/*.json，只寫 reports/human-decision-sheet.md。
  * 不 import 清洗／比對邏輯，因此也不會複製一份（判定只由 wikisource.py
    --verify-batch 產生；分類只由 quote-forensics.py --classify 產生）。
  * 不碰 src/**、不碰 vendor/**、不打網路、不產生任何「已核」。
  * 自報檢查：清單筆數＝quotes-audit 的 unchecked 總數；每個 id 都必須
    真的在 quotes-audit 裡是 unchecked（擋掉任何憑空 id）。

用法：python3 scripts/human-decision-sheet.py
"""
import json
import os
import sys
from collections import Counter, OrderedDict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIT = os.path.join(ROOT, "reports", "quotes-audit.json")
CLASSIFIED = os.path.join(ROOT, "reports", "remaining-unchecked.json")
OUT = os.path.join(ROOT, "reports", "human-decision-sheet.md")
GAP_CITATION = os.path.join(ROOT, "reports", "citation-gap.json")
GAP_VARIANT = os.path.join(ROOT, "reports", "variant-gap.json")

# 分類代號取自 quote-forensics.py --classify 的定義（只引用，不重新推）。
CLASS_LABEL = {
    "a": "(a) zh.wikisource 無此書／此卷",
    "b": "(b) 出土金文卜辭無轉錄本（本專案刻意不引單版釋文）",
    "c": "(c) 引文為自擬摘要而非逐字",
    "d": "(d) 需人工影像／出處歸屬判斷",
}
# 每類「要人決定的是什麼」——是選項，不是指令；實作一律留給人工。
CLASS_ACTION = {
    "a": "要嘛換成上游有的版本／卷次，要嘛接受「無轉錄本可比」。自動端無可補。",
    "b": "要嘛改出處為可比的轉錄本，要嘛接受不引單版釋文。",
    "c": "要嘛把 src 引文改成轉錄本逐字（人改，改完自然會變原文），要嘛把該條標成意譯。",
    "d": "要嘛補影像核對（NDL／金文圖版），要嘛修正出處歸屬（apparatus 內文字不當作正文）。",
}


def load(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def cell(s):
    return str(s).replace("|", "／").replace("\n", " ")


def main():
    for p in (AUDIT, CLASSIFIED):
        if not os.path.exists(p):
            print(f"缺少輸入：{p}（先跑 npm run audit:quotes:json 與 --classify）")
            return 1
    audit = load(AUDIT)
    cls = load(CLASSIFIED)
    rows = audit["rows"]
    unchecked = [r for r in rows if r.get("kind") == "unchecked"]
    items = cls["items"]

    # (id, work) 去重：同一事件在多個 pack／group 重複列，人工只需裁決一次。
    sheet = OrderedDict()
    for it in items:
        key = (it["id"], it["work"])
        if key not in sheet:
            row = next((r for r in unchecked if r.get("id") == it["id"]), None)
            sheet[key] = {
                "id": it["id"],
                "work": it["work"],
                "reason": it["reason"],
                "quote": (row or {}).get("quote", it.get("quote", "")),
                "source": (row or {}).get("source", it.get("source", "")),
                "miss": (row or {}).get("miss", []) or [],
                "miss_note": "",
                "groups": Counter(),
            }
        sheet[key]["groups"][it.get("group", "?")] += 1
        if not sheet[key]["miss"] and (it.get("frags_missing") or 0) > 0:
            sheet[key]["miss_note"] = f"缺片段 {it['frags_missing']}/{it.get('frags', '?')} 段"

    # 自報檢查（任一不過就不要交清單）
    problems = []
    total_unchecked = audit["totals"].get("unchecked", 0)
    if len(items) != total_unchecked:
        problems.append(f"--classify items {len(items)} ≠ quotes-audit unchecked {total_unchecked}")
    ids_unchecked = {r["id"] for r in unchecked}
    invented = sorted({k[0] for k in sheet if k[0] not in ids_unchecked})
    if invented:
        problems.append(f"清單出現非 unchecked 的 id：{invented[:5]}")
    if sum(sum(v["groups"].values()) for v in sheet.values()) != len(items):
        problems.append("去重後還原 group 列數不符")
    per_class = {c: sum(1 for v in sheet.values() if v["reason"] == c) for c in cls["counts"]}

    L = []
    L.append("# 未核引文的人工裁決清單")
    L.append("")
    L.append(f"來源：`reports/quotes-audit.json`（未核 **{total_unchecked}** 筆）"
             f"＋`reports/remaining-unchecked.json`（`quote-forensics.py --classify` 分類）。")
    uniq_id_group = len(set((it["id"], it.get("group")) for it in items))
    L.append(f"未核 **{len(items)}** 列（同一事件在多 pack／同組多個引文欄重複）"
             f"→ 去重後 **{len(sheet)}** 個裁決點（id×出處書；對照 id×事件組 "
             f"{uniq_id_group} 個）。")
    L.append(f"`auto_route_exhausted = {cls['auto_route_exhausted']}`、"
             f"`still_fetchable = {len(cls.get('still_fetchable', []))}`（可補抓的缺卷 0 筆）。")
    L.append("")
    L.append("> 本單子是**唯讀彙整**：判定仍只由 `wikisource.py --verify-batch` 產生；"
             "這裡不產生任何「已核」、不改 `src/**`、不打網路。")
    L.append("> 「比對不上的片段」＝判定器在已快取的轉錄本裡真的找不到的那段文字，可直接拿去對原書。")
    L.append("")
    for c in ("a", "b", "c", "d"):
        picked = [(k, v) for k, v in sheet.items() if v["reason"] == c]
        if not picked:
            continue
        rows_n = sum(1 for it in items if it["reason"] == c)
        L.append(f"## {CLASS_LABEL[c]} — {len(picked)} 個裁決點（{rows_n} 列）")
        L.append("")
        L.append(f"人工要決定：{CLASS_ACTION[c]}")
        L.append("")
        L.append("| 事件 id | 出處書 | 事件組 | 現行引文（src 原文字，未改） | 出處欄 | 比對不上的片段 |")
        L.append("|---|---|---|---|---|---|")
        for (eid, work), v in picked:
            if v["miss"]:
                seen, uniq = set(), []
                for m in v["miss"]:
                    if m not in seen:
                        seen.add(m)
                        uniq.append(m)
                miss_txt = "；".join(f"「{m}」" for m in uniq)
            else:
                miss_txt = v["miss_note"] or "（片段全部找不到）"
            grp = "、".join(f"{g}×{n}" if n > 1 else g for g, n in sorted(v["groups"].items()))
            L.append(f"| `{eid}` | {cell(work)} | {cell(grp)} "
                     f"| {cell(v['quote'])} | {cell(v['source'])} | {cell(miss_txt)} |")
        L.append("")
    L.append("## 兩道會動到判定語意的開關（數字即時讀自報表，留人工點頭）")
    L.append("")
    if os.path.exists(GAP_CITATION):
        cg = load(GAP_CITATION)
        L.append(f"1. 修 `vendored()` 對《書名》後 `》` 的匹配：{cg['citation_form_book_volume']} 筆出處是"
                 f"「書名＋卷次」形式卻被擋掉 → 未核 {cg['unchecked_rows']}→"
                 f"{cg['unchecked_rows'] - cg['would_escalate_to_suspect']}、可疑 0→"
                 f"{cg['would_escalate_to_suspect']}（`reports/citation-gap.json`）。")
    if os.path.exists(GAP_VARIANT):
        vg = load(GAP_VARIANT)
        pair = vg["candidate_pair"]
        L.append(f"2. 加 `{pair['from']}→{pair['to']}` 折字（要先改 `variant_check()` 明文反例）："
                 f"解鎖 {vg['unlock_count']} 筆（唯一 id {'、'.join(vg['unlock_unique_ids'])}）→ 未核 "
                 f"{vg['unchecked_rows']}→{vg['unchecked_rows'] - vg['unlock_count']}、原文 "
                 f"{vg['original_rows']}→{vg['original_rows'] + vg['unlock_count']}；"
                 f"會破掉的現有原文 {vg['break_count']} 筆（`reports/variant-gap.json`）。")
    L.append("")
    L.append("兩者都是**改被驗證的規則**而非補證據，故本腳本不實作；採納請人工決定後另輪改 `scripts/` 並重跑。")
    L.append("")
    if problems:
        L.append("## ⚠ 自報檢查未全過")
        L += [f"- {p}" for p in problems]
    else:
        L.append("自報檢查：清單列數＝unchecked 總數、無憑空 id、去重可還原 group 數 ⇒ 通過。")
    L.append("")

    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write("\n".join(L))
    print(f"已寫出 {os.path.relpath(OUT, ROOT)}：{len(sheet)} 個裁決點／{len(items)} 列，分類 "
          + " ".join(f"{c}={per_class[c]}" for c in ("a", "b", "c", "d") if per_class.get(c)))
    for p in problems:
        print("檢查失敗:", p)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())

