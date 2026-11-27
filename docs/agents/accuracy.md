# accuracy｜內容正確性查證

> 本輪只讀 `docs/agents/QUICK.md` 就開工；本檔是參考，只在 QUICK 不夠時讀上面「速查」段（最多 30 行）。
> worktree：`~/Project/historyfirst-1/historyfirst-wt-accuracy`，分支 `agent/accuracy`。

## 速查（只看這段就夠；實作步驟優先載入 `.agents/skills/hf-accuracy/SKILL.md`）

- 佇列：`node scripts/agent-queue.mjs accuracy`（固定取 `--todo` 未查證條目，同典籍或同檔優先）。
- 一輪最多 **4 條**；做完就收工，剩下的寫進「下輪建議」。
- 單項驗證：`npm run audit:quotes > /tmp/q.log 2>&1; echo exit=$?; tail -n 5 /tmp/q.log`，「錯誤」須為 0。
- 引文逐字核對用 `python3 scripts/qsrc.py <篇名> '<引文開頭>'`，只看匹配行。
- 快驗閘門：`npm run gates -- --only=audit:quotes`。
- 具體做法見下方「單一條目的做法」；只在這段不夠時往下讀。



## 目標

把站上的**引文、出處、年份、人名、數字**逐條對回原典，錯的改正，查不到的標明。**查證不等於創作**：你的工作是比對與記錄，不是改寫。

## 佇列：未查證條目優先（`--todo`）

不要自行用 Python 讀 `scripts/quote-audit-ledger.json`；一律由佇列腳本列出未查證條目：

```sh
node scripts/agent-queue.mjs accuracy
```

輸出每行格式：`檔案#條目key` 與對應 `qsrc.py` 查證指令。**優先挑選同檔或同典籍的條目**（快取命中率最高），一輪最多做 4 條。

## 單一條目的做法

以輸出 `2026-11-06 史記/卷006 src/qinhan/data/timeline.ts#unify` 為例。

1. **找到條目**：`grep -n "id: 'unify'\|key: 'unify'\|'unify'" src/qinhan/data/timeline.ts | head`，讀該條目的 `classicQuote`、`classicSource`（或 `quote`／`source`）、`year`。
2. **逐字比對原文**：
   ```sh
   python3 scripts/qsrc.py 史記/卷006 '<引文開頭 6–10 個字>'
   ```
   日本史料加 `--host ja.wikisource.org`。**只看輸出裡「匹配 N 處」那一行**：
   - `N ≥ 1`：再看印出的上下文，確認引文**整句**與原文逐字相同（含標點可略差，用字不可差）。
   - `N = 0`：先換成引文中段、末段各試一次；仍 0，再用 `--loose` 容忍標點空隙。三種都 0＝引文與所引卷不符。
   - 不要用 `-C 400`：上下文太長會截錯位置。
3. **判定**，只有四種結果：

   | 結果 | 條件 | 動作 |
   |---|---|---|
   | 一致 | 整句逐字相同 | 記錄查證（見下） |
   | 漂移 | 原文有，但站上字句不同 | 把站上引文改成與原文逐字一致，再記錄查證 |
   | 不符 | 所引卷查無此句 | 查它是否出自另一卷（`--toc` 看子頁、換卷再搜）。找到就改 `classicSource`；找不到就把 `source` 改成「通說整理，非逐字引文」並在 `note` 說明，**同時把 `classicQuote` 改成意譯寫法或移除引號**，不留假引文 |
   | 查不到頁 | qsrc 找不到該書／卷 | 不動，列入放棄清單，註明頁名 |

4. **記錄查證**（更新 ledger 的日期與戳記，一律用指令，不要手改 JSON）：
   ```sh
   node scripts/audit_quotes.mjs --mark 'src/zhou/data/timeline.ts#unify' --page 史記/卷006
   ```
   `--mark` 後面一定要接**完整的 `檔案#key`**（就是 `--todo` 每條印出的那個 id）。
   裸 key 在本倉有 15+ 組同名（`unify`、`184-huangjin`、`208-chibi`、`zhaoling`…），
   腳本現在會直接拒絕執行：以前它默默挑第一筆，章就蓋到別的檔案的條目上，
   那條沒查過的引文從此顯示「已查證」（2026-11-25 同一輪踩到兩次）。
5. 單項驗證：`npm run audit:quotes > /tmp/q.log 2>&1; echo exit=$?`，結尾「錯誤」必須是 0。

## 其他可查的東西（做完引文後、時間還夠時）

- **年份**：事件 `year` 與 `source` 內寫的年號紀年是否對得上。換算用原典的年號，不要用記憶。對不上且有異說＝設 `disputed: true`，`note` 列各說。
- **死鏈**：`npm run audit:wiki-links > /tmp/w.log 2>&1; echo exit=$?`。若報「未驗」暴增，那是限流，重跑；「死鏈」才是真的。死鏈要改成實際存在的條目名，查證方法是 MediaWiki API 的 `titles=` 回傳 `missing` 與否；HTTP 200 不代表條目存在。
- **簡體標題**：zh.wikipedia 的簡體標題可能沒有條目，要改用正體條目名。

## 判斷準則（不確定時）

- 兩部史書說法不同＝兩說並存，不選邊。設 `disputed`，各說各附書名卷數。
- 原典本身有異文（版本不同）＝以 Wikisource 該頁為準，`note` 寫「據 Wikisource 該卷本文」。
- 《史記》三家注、集解、索隱、正義的字句**不是**本紀本文。引文若出自注，`classicSource` 要寫到注。
- 後世追述（例如晉人注前代事）不能當同時代記載使用，`note` 要寫明。
- 只能用 `python3 scripts/qsrc.py`、`scripts/exa.mjs` 取得的文字當證據。**不要憑記憶補一句原文。**

## 這支 agent 專屬的禁止

- 只准改你查證的那個欄位。不順手改旁邊的敘述、不重寫段落。
- 不准把意譯改成引文，也不准把引文「改得通順」。
- 不改 `scripts/audit_*`、`scripts/quote-audit-ledger.json` 以外的腳本；ledger 只用 `--mark` 指令寫。
- 不新增事件、不刪除事件。

## 報告：追加到 `reports/source-audit.md`

先 `grep -n "^## 第 .* 輪" reports/source-audit.md | tail -2` 看上一輪是第幾輪，本輪編號加一。報告**追加在檔尾**，不覆蓋，格式照最近一輪：

```text
---

## 第 N 輪（YYYY-MM-DD）

### 1) 本輪範圍
（查了哪些條目；從 ledger 第幾舊開始）

### 2) 查證與修改
1. <條目 id>：<一致／漂移已改正／不符已改標>，<一句證據：qsrc 匹配 N 處、原文頁名>
...

### 3) 前後對照
| 指標 | 前 | 後 |
| --- | --- | --- |
| audit:quotes 錯誤／提醒 | | |
| audit:chars 硬傷 | | |

### 4) 剩餘佇列（交下輪）
1. ...
```

報告用 `git add reports/source-audit.md` 一併 commit，commit 訊息：`docs(audit): 第N輪查證報告——<一句摘要>`。

## 停止條件

- 連續 3 條都「查不到頁」：可能是網路或 Wikisource 問題，停止，寫報告。
- `audit:quotes` 的「錯誤」變成非 0：撤回最後一批，重做。
- 同一條目修改兩次仍不一致：放棄清單，不要第三次。

## 本輪指標

「最舊戳記批」的覆核條數（報告寫 x／y 條一致）；`audit:quotes` 錯誤保持 0、提醒不增加；`audit:chars` 硬傷保持 0。
