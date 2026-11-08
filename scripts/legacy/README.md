# scripts/legacy — 已遷入但**尚未接上**嘅旧工具

來源：离線 repo `cline/0667b`（283c743），該 repo 冇 remote、永遠上唔到網站。
呢度保留係因為我哋迟早要呢啲能力；**它哋而家唔好行**，原因逐條寫明，唔扮有效。

| 工具 | 狀態 | 阻塞位 |
|---|---|---|
| `wikisource.py` | 可 import、CLI 與舊 prompt 唔同（`--help` 會報 unknown flag） | 需要照舊 repo 嗰邊嘅呼叫方式包一層 |
| `resolve-unchecked.py` | CLI 可跑 | 輸入要 `reports/quotes-audit.json`，本 repo 嘅 `audit_quotes.mjs` 冇輸出 JSON |
| `closest-witness.py`、`human-decision-sheet.py`、`verifier-teeth.py`、`quote-health.sh` | 全部 exit 1 | 同上：缺 `reports/quotes-audit.json`（舊由 `audit-quotes.ts` 產生，欄位含 id/group/work/witness 等） |
| `quote-forensics.py` | 可跑（反假命中核查） | 同樣依賴上述 JSON |
| `depth-stats.ts` | exit 1 | `ERR_UNSUPPORTED_DIR_IMPORT`：佢 import 目錄 `src/japanEras/packs`，本 repo 無 index barrel |
| `audit-event-depth-jp.ts` | exit 1 | `ERR_MODULE_NOT_FOUND`：佢 import `src/heian/data/history`，本 repo 嘅平安時代資料路徑唔同 |
| `factcheck-readings.ts`、`citation-triage.ts` | 未試行 | 同樣假設舊 JSON／資料路徑 |

## 接上嚟個位嘅順序（下次做）
1. 俾 `audit_quotes.mjs` 加 `--json`，輸出 `reports/quotes-audit.json`，欄位要含 `id / group / work / file / line / quote / source / status`
2. 先接 `resolve-unchecked.py`（定位器）→ 再接 `closest-witness.py`（轉錄本對照）→ 最後 `verifier-teeth.py`（比對器咬合力測試，防判定層退化成橡皮章）
3. TS 嗰兩支要改 import 路徑（用檔案而不是目錄 barrel）

## 2026-11-08 更新：JSON 契約已補上
- `npm run audit:quotes:json`（即 `audit_quotes.mjs --rows`）會輸出 `reports/quotes-audit.json`，形狀為 `{"totals":…, "rows":[{id,file,line,key,kind,state,quote,source,pages,disputed,issues}]}`
- `kind` 對齊舊契約：`original / unchecked / paraphrase / missing / modern`
- 交叉核對通過（同文字報告逐數一致）：`unchecked 166` = 未查證 166、`paraphrase 53` = 意譯 53、`missing 1556` = 1811 − 255 有引文、`original 36` = 已查證 21 ＋ 引文已改 13（另 2 筆同類）
- 遷入時造成嘅路徑錯已修：`ROOT` 原以 `parent.parent` 計算，放進 `scripts/legacy/` 後會指向 `scripts/`，令佢哋搵 `scripts/scripts/…`；已改 `parents[2]`／多一層 `dirname`
- 修正過程中我一度把「冇引文」嘅 1556 條全部歸做 `modern`（近現代），等於把最大宗缺口隱瞞；已改為先歸 `missing`，`modern` 只留給近現代標籤者

**仍然跑唔通，原因只剩一個**：`closest-witness / quote-forensics / resolve-unchecked / verifier-teeth` 都 `import wikisource`（舊線嘅清洗、正規化、快取、`witness_ok` 單一實作），而本 repo 嘅同一功能是 `scripts/qsrc.py`（有 `verify_batch`／`PUNCT`，但無 `clean`／`norm`／`VARIANT`／`witness_ok` 同名 API）。
下一步應係**寫一個門面轉接（約數十行，含測試）把 `wikisource` 導向 `qsrc` 的同一實作**，而唔係把舊 `wikisource.py` 當第二份實作放進 `scripts/`——兩份清洗／比對邏輯正係舊線文檔反覆警告嘅做法（兩份實作會各自漂移，令「與轉錄本一致」呢類判定失效）。
順序：門面 → `resolve-unchecked.py --classify`（產 `reports/remaining-unchecked.json`）→ `human-decision-sheet.py` → `closest-witness.py` → `verifier-teeth.py`（咬合力測試）。

## 已經接上嘅（唔喺呢度）
- `scripts/audit-chars.ts`：預設掃成個 `src`，`src/imperial` 命中 189 處——正正補上 `audit:data` 只掃 `src/data` 嘅缺口；已入 `npm run audit:chars`
- `scripts/gen_civil_war.py`：內戰 pack 嘅生成器（我哋一直只有產物無生成器）。原產出簡體「三大战役」，已改正；而家重跑與已提交 pack **逐字節一致**
- `scripts/lib/`（citationRules / eventDepthPacks / fact-numbers / gate-baseline）：audit-chars 需要
- `docs/legacy/`：舊 repo 嘅 HANDOVER／COVERAGE／PROGRESS／CITATION-TRIAGE／FACT-ESCALATION／RESEARCH-ASKS（內容描述嘅數字屬舊線，只作經驗參考）
