# 由旧（离線）repo 揀返嚟嘅嘢

來源：`cline/0667b`（commit 283c743，191 個 commit）。嗰個 repo **冇任何 remote**，所以佢嘅成果本來永遠上唔到網站。本次唔係整條 branch merge 入嚟——兩邊嘅腳本架構已經分岔（舊用 `audit-quotes.ts`＋`vendor/`，我哋用 `audit_quotes.mjs`＋`qsrc.py`），硬 merge 只會撞。改做**逐件評估、能跑先留**。

## 已接上（呢個 PR 之內）

| 項目 | 點解值得 | 驗證 |
|---|---|---|
| `scripts/audit-chars.ts`（＋`scripts/lib/`） | 預設掃**成個 `src`**，`src/imperial` 命中 **189** 處；填咗 `audit:data` 只掃 `src/data` 嘅缺口 | `npm run audit:chars` exit 0，回報 274 項（尚未記基準） |
| `scripts/gen_civil_war.py` | 內戰 pack 嘅**生成器**——我哋一直只有產物、冇生成器，等於不可重建 | 佢原本輸出簡體「三大战役」；改正 2 個字後重跑，與已提交嘅 `civilWarPack.ts` **逐字節一致** |
| `docs/legacy/`（HANDOVER／COVERAGE／PROGRESS／CITATION-TRIAGE／FACT-ESCALATION／RESEARCH-ASKS） | 舊線踩過嘅坑與紀律文字 | 內容描述嘅數字屬舊線，只作經驗參考，唔係本 repo 現況 |

## 順手修咗自己嘅閘門
`audit-data.ts` 嘅簡體偵測字集**漏咗「战」**（仲補咗「观／舰」）。如果唔係將生成器輸出與已提交 pack 對跑，呢個洞唔會現形——即係話：閘門要對跑產物先算可信，淨掃資料層會漏。

## 遷入但**未接上**（保留並寫明阻塞位，唔扮有效）
`scripts/legacy/README.md` 逐條列明：`wikisource.py`、`resolve-unchecked.py`、`closest-witness.py`、`human-decision-sheet.py`、`verifier-teeth.py`、`quote-health.sh`、`quote-forensics.py`、`depth-stats.ts`、`audit-event-depth-jp.ts`、`factcheck-readings.ts`、`citation-triage.ts`。

共同阻塞位只有一個：**本 repo 嘅 `audit:quotes` 冇輸出 `reports/quotes-audit.json`**（舊線由 `audit-quotes.ts` 產生，欄位含 id／group／work／witness）。所以接上順序好清楚：
1. `audit_quotes.mjs` 加 `--json`
2. 接 `resolve-unchecked.py`（定位器）→ `closest-witness.py`（轉錄本對照）→ `verifier-teeth.py`（比對器咬合力測試，防止判定層退化成橡皮章）
3. 兩支 TS 工具改 import 路徑（本 repo 冇 `src/japanEras/packs` barrel，平安時代資料路徑亦唔同）

## 冇揀嘅嘢
舊線嘅敘事加厚（起因／經過／結果）**冇 wholesale 搬入**：本 repo 嘅加厚 agent 正在同一批檔案上逐模組工作，硬搬會覆寫佢嘅改動，而且舊線一啲條文引用嘅卷頁我未逐條查證。呢啲留在旧 repo，等本線 agent 收斂後再逐模組對照取長。
