---
name: hf-accuracy
description: Verify historical quotes, sources, years, and Wiki links in historyfirst (agent/accuracy). Use when running accuracy rounds or checking quote-audit-ledger items via qsrc.py.
---

# accuracy｜史料與引文查證技能

## 取佇列（不要自己掃 ledger JSON）
1. 執行 `node scripts/agent-queue.mjs accuracy`，只取 `--todo` 列的條目。
2. 優先挑選**同一檔案或同一典籍**（例如同為《三國志》或《明史》）的最多 4 條，利用 `/tmp/qsrc-cache` 快取省時省 token。
3. 讀目標檔時先用 `grep -n "<id>" <檔>` 找行號，只讀該條上下約 30 行。

## 逐字核對規則
1. 執行：`python3 scripts/qsrc.py <書名/卷N> '<引文前6-10字>'`（日本史料加 `--host ja.wikisource.org`）。
2. 只看「匹配 N 處」與該句上下文（**禁用 `-C 400`**）。
   - `N >= 1` 逐字相同：執行 `--mark` 入帳。
   - 漂移：把站上引文改為與原文逐字一致後再 `--mark`。
   - 原卷無此句：用 `--toc` 或 `--loose` 搜他卷；確實查無全文者，將 `source` 改為「通說整理，非逐字引文」並在 `note` 說明，同時移除引號或改寫為意譯，**絕不留假逐字引文**。
   - `N = 0` 且無法取得頁面：不動資料，列入放棄清單（連續 3 條查不到頁即停）。
3. 記錄入帳一律用指令（必須帶完整 `檔案#key`，不可手改 JSON）：
   `node scripts/audit_quotes.mjs --mark '<檔路徑>#<key>' --page '<書名/卷N>'`

## 單項驗證與範圍
- `npm run audit:quotes > /tmp/q.log 2>&1; echo exit=$?; tail -n 10 /tmp/q.log`（「錯誤」須為 0）。
- 只准修改正在查證的欄位；不順手潤飾相鄰敘述，不新增或刪除事件。
- commit scope 一律用 `(accuracy)`。改字時先核對 `references/zh-hant-pitfalls.md`。
- 收工時載入 `hf-gate-commit`。
