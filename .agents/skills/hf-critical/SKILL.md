---
name: hf-critical
description: Resolve critical-incident gaps and unflagged cards in historyfirst via scripts/audit_critical.mjs. Use when assigned to the critical queue.
---

# critical｜關鍵事變盤點技能

## 取佇列
1. 執行 `node scripts/agent-queue.mjs critical`，取前 1–4 項。
2. 嚴守界線規則：報告標為「界線」的年份屬時代交界，**不可為其造卡**。

## 處理兩類待辦
1. **未標卡（有卡但無 `critical: true`）**：
   - 讀該年相關事件與前後快照，依定義判斷是否導致時代改變、地圖政權出現或消失、或整體權力格局轉折。
   - 成立：於該卡加入 `critical: true`，並在詳情說明格局如何改變。
   - 不成立：不加旗幟，留在原卡並在 `note` 說明不屬結構轉折之理由，不得刪既有內容。
2. **缺口（無卡）**：
   - 只依正史、六國史或實錄公文造卡；引文須先用 `python3 scripts/qsrc.py` 逐字核對（查無原文則標「通說整理，非逐字引文」）。
   - 同步補齊該卡之 `causes >= 200`、`course >= 200`、`outcome >= 400` 與三層意譯，確保 `audit:event-depth` 與 `audit:reading-layers` 不退化。

## 驗證
- `node scripts/audit_critical.mjs > /tmp/cr.log 2>&1; echo exit=$?; tail -n 15 /tmp/cr.log`
- `npm run gates -- --only=audit:event-depth > /tmp/ed.log 2>&1; echo exit=$?; tail -n 10 /tmp/ed.log`
- commit scope 依執行者的 key（例如由 `enrich` 執行時用 `(enrich)`）；收工時載入 `hf-gate-commit`。
