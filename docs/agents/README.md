# 排程 agent 共同手冊

> 四支排程 agent（enrich、accuracy、march、map；ui 已於 2026-11-22 停用）每輪**只讀 `docs/agents/QUICK.md`（約 45 行）就開工**。本檔與各 `docs/agents/<key>.md` 是疑問時的參考，不是每輪必讀；若要讀，只看各檔開頭的「速查」段（最多 30 行）。重複整檔讀入會吃掉本機模型的 token，是必須避免的浪費。
> 本檔隨 repo 版本控制，改它不需要 sudo，下一輪就生效。
> 上位規章：`docs/SCHEDULED_AGENTS.md`（真確性鐵律）與 `AGENTS.md`。衝突時以那兩份為準。

## 0. 你是誰，怎麼做事

你是一個在本機跑的小模型。你的長處是照步驟做、一次做一小件。你的弱點是：

- 會把相近的字打錯（例如「將」「隊」「潰」「擱」「無」常被打成簡體字或碼位相近的錯字）。
- 會在中文句子中間插入英文單字或工具呼叫的殘片。
- 會宣稱做了其實沒做的事。
- 會越做越多，一輪就想改幾十個檔案。

所以請遵守五條行為準則：

1. **一次只做一項**（一條事件、一條路線、一個環、一條 CSS 規則）。做完、驗證、存檔、commit，才開下一項。
2. **不確定就跳過**。跳過的項目寫進報告的「放棄清單」，附一句原因。跳過不是失敗，編造才是。
3. **所有數字、年份、地名、引文都要有出處**。查不到就標 `disputed` 或寫「通說整理，非逐字引文」，不要自己猜。
4. **宣稱以指令輸出為準**。報告裡每個「完成」都要能用 `git log`、`git status`、指令輸出證明。
5. **時間到就收**。每做完一項跑一次 `sh scripts/agent-run.sh left <key>`（要帶你自己的 key），不夠就收尾。
6. **一輪最多 4 項**。做完就收工，不要為跑滿時間預算而繼續找事。剩下的寫進報告「下輪建議」。早收工比晚亂做好。

## 1. 開工流程（照順序，一步都不要跳）

下面的 `<worktree>` 與 `<key>` 由你的任務指令給定。

```sh
cd <worktree>
git status --porcelain            # 有輸出＝有別人的改動，立刻停止，報告，不要碰
git fetch origin
git switch agent/<key>
git rebase origin/main            # 衝突就：git rebase --abort，然後停止並報告「REBASE_CONFLICT」
test -f docs/agents/<key>.md || echo "手冊不在"   # 不在＝本輪停止並報告
sh scripts/agent-run.sh start <key>               # 印 GO 才繼續；印 WAIT 就原樣再跑一次同一指令（最多約 30 次）；印 BUSY 才停止
node scripts/agent-model-check.mjs     # 比對鎖檔內容與權威 registry，不只是看檔案在不在
```

- 印 `MODEL_LOCK_MISSING`、或任何工具回報 `Model unavailable`／`Blocked by configuration policy`：本輪立即停止，報告貼原文。不准換模型，不准改鎖定檔。
- 若 `node_modules` 不存在：`ln -s ~/Project/historyfirst-1/historyfirst/node_modules node_modules`。
- 記下基準：`git rev-parse HEAD` 存為 BASE，收工時要用。
- 取佇列：`node scripts/agent-queue.mjs <key>`（五支統一入口，直接照它列的項目做，不要自己另找事）。
- baseline 只量你會動的那條：`npm run gates -- --only=<閘門名> > /tmp/gates-before-<key>.log 2>&1; echo exit=$?`（閘門名見自己手冊的最後一節）。不確定才跑全量。**不要**用管線接 `grep`（會吃掉失敗的結束碼）。

## 2. 每一項的標準節奏

```text
選項目 → 讀相關檔 → 小改動 → 存檔 → 單項驗證 → 自檢 → commit → 看剩餘時間
```

1. **選項目**：用自己手冊裡的「佇列指令」取第一個尚未處理的項目。
2. **讀檔**：只讀那一項需要的幾十行。用 `grep -n` 找行號，再 `read` 那段，不要整檔讀。
3. **小改動**：只改該項。一個 commit 最多 2–4 項。
4. **單項驗證**：手冊裡每個項目都列了對應指令，跑了才算數。
   - 長輸出一律重導向再看結尾：`指令 > /tmp/x.log 2>&1; echo exit=$?; tail -n 20 /tmp/x.log`。
   - 絕不用管線接 `grep`（會吃掉失敗碼）；`head`／`tail` 只在重導向之後用。
   - 不用內嵌 Python 印明細，改用現成腳本（`agent-queue.mjs`、`agent-report.sh`）。
5. **自檢**（每次 commit 前，必跑三行）：
   ```sh
   git add -A
   node scripts/agent-selfcheck.mjs origin/main
   node scripts/agent-selfcheck.mjs --commits origin/main
   npm run audit:chars > /tmp/chars-<key>.log 2>&1; echo exit=$?
   ```
   `--commits` 查的是本輪已 commit 的標題；看到簡體字立刻用 `git commit --amend` 改掉，不要留到最後。
   - `agent-selfcheck` 有任何 `✗` 行：修掉才能 commit。
   - 它列出的「新出現的漢字」要逐個看：是不是你想打的那個字？看到簡體字或怪字，用該檔既有的同一個詞去複製，不要憑記憶重打。
   - `audit:chars` 結束碼不是 0：修掉才能 commit。
6. **commit**：訊息要與內容相符，用 `type(scope): 摘要`；`scope` 必須是**自己的 key**（map 用 `fix(map):`、march 用 `test(march):`），不准借用別人的 scope。例：`data(zhou): zhou-zhao 結果欄補寫至 400 字並附出處`。一個 commit 不混不同類的事。
7. **看時間**：`sh scripts/agent-run.sh left <key>`。印 `TIMEUP` 或 `STOP` 就收尾，不開新項。印 `NOT_OWNER` 代表你沒有鎖：立刻停止所有修改，不要 commit，不要 push，回報一句就結束。

## 3. 收工流程

```sh
git status --porcelain                          # 必須是空的；不是空的先 commit 或還原
npx tsc -b; echo tsc=$?                         # 必須 0（注意：tsc --noEmit 在本專案是空操作，不算數）
npm run build > /tmp/build-<key>.log 2>&1; echo build=$?   # 必須 0
npm run lint > /tmp/lint-<key>.log 2>&1; echo lint=$?      # 0 error
npm run gates > /tmp/gates-after-<key>.log 2>&1; echo gates=$?   # 改完單項可用 npm run gates -- --only=<閘門名> 先快驗
git push --force-with-lease origin agent/<key>
git ls-remote origin refs/heads/agent/<key>     # 前 40 字元必須等於 git rev-parse HEAD
node scripts/agent-selfcheck.mjs origin/main    # 最後再跑一次
sh scripts/agent-run.sh end <key>
```

- `gates` 結束碼非 0：讀 `/tmp/gates-after-<key>.log` 結尾的「惡化」段。若是你的改動造成的，`git revert` 該批 commit 再重跑。若是 `audit:wiki-links` 的 `unvalidated` 變多（維基限流的假紅），等一下重跑一次，仍紅才算數。
- `git ls-remote` 與 `git rev-parse HEAD` 不一致：本輪算失敗，報告貼兩者原文。
- push 被拒：不准 `--force`。rebase 之後只准 `--force-with-lease`。
- 沒有 open PR 就：`gh pr create --base main --head agent/<key> --title "<標題>" --body "<摘要>"`；已有就不重開。報告貼 `gh pr view --json number,state,mergeable` 的輸出。

## 4. 禁止事項

- 不准改：`reports/gate-baseline.json`、`scripts/audit-*`、`scripts/audit_*`、`scripts/gate-ci.mjs`、`AGENTS.md`、`.cursorrules`、`docs/agents/`、`.opencode/`、`.agents/`。不准跑任何 `--update-baseline`。
- 不准 `git reset --hard`、`git stash`、`git push --force`、`git checkout -- <檔>`（會洗掉別人的改動）。
- 不准 `cd` 到自己 worktree 以外的目錄；尤其不准碰 `~/Project/historyfirst-1/historyfirst`（使用者自己的工作目錄）。
- 不准 `git merge`、不准 `git rebase` 以外的整合動作。
- 不准刪除任何既有資料條目、既有的「無區」列、`disputed` 標記。
- 暫存檔與 log 放 `/tmp`。若 `/tmp` 寫不進，改放 `$HOME/.historyfirst-tmp/`（先 `mkdir -p`）。不要把暫存檔放進 worktree。
- 不准在任何檔案貼 API key、密碼。

## 5. 寫作規則（所有進入 `src/` 的文字）

- 一律**正體中文書面語**。不用簡體字、不用日本新字體（日文漢字寫法混入中文敘述）、不用粵語口語（嘅、咗、唔、冇、喺、佢、哋 等）。
- 程式註釋同樣適用。註釋只在「行為不明顯」時才寫，寫短。
- 不夾英文單字進中文句子（專有名詞如 `eraLink`、檔名、欄位名除外，且要放在反引號內）。
- 日本史人名地名用正體漢字（德川、關原），不用日文新字體寫法。引文保留原典字形。
- 風格：無分號、單引號、2 空格縮排、每行 80 欄內。
- 禁止「灌水」：同一句話或同一個樣板重複套用到多個事件，會被 `audit:event-depth` 偵測並計為惡化。

## 6. 報告格式（收工前最後輸出，也追加到對應報告檔）

先跑 `sh scripts/agent-report.sh <key> <BASE> > /tmp/report-<key>.txt` 產生骨架；注意：產生的骨架不要改上面的數字，你只補「完成項目／放棄清單／下輪建議」。

每份報告開頭維持一個 `## 待辦摘要`（不超過 30 行）：寫佇列剩餘量、下輪先做哪幾項。舊輪次往後堆，不要覆蓋；但任何時候摘要都要能一眼看完。

```text
【<key>｜<日期> <時:分>】
基準：<BASE 短碼> → 本輪 HEAD：<短碼>（<N> 個 commit）
工作區：git status --porcelain 輸出＝<空 / 貼出內容>
完成項目（每項一行：id／檔:行／做了什麼／驗證指令與結果）
  1. ...
放棄清單（每項：id／原因）
  1. ...
指標：<指標名> <前> → <後>；gates exit=<碼>；tsc=<碼>；build=<碼>；chars exit=<碼>
push：git ls-remote 與 git rev-parse HEAD ＝ <一致 / 不一致，貼原文>
PR：<網址或「已存在 #N」>
下輪建議：<一句>
```

沒有跑過的指令不要寫進報告。做不到的項目寫進放棄清單，不要寫成完成。

## 7. 常見錯誤速查

| 症狀 | 原因 | 做法 |
|---|---|---|
| `tsc --noEmit` 回 0 但 build 失敗 | 本專案 `tsconfig.json` 的 `files` 是空的 | 改用 `npx tsc -b` 與 `npm run build` |
| `npm run gates \| grep ...` 看起來全綠 | `grep` 的結束碼蓋掉了閘門的結束碼 | 一律 `> /tmp/x.log 2>&1; echo exit=$?` 再讀 log |
| 新 worktree 跑不了閘門 | 沒有 `node_modules` | 建符號連結（見開工流程） |
| `audit:wiki-links` 突然多了二十幾個「未驗」 | 維基限流 | 重跑，仍紅才處理 |
| `audit:chars` 報「硬傷」 | 簡體字或日本新字混入 | 開 log 找檔名行號，用同檔既有字詞複製替換 |
| 把引文改得「更通順」 | 引文必須逐字 | 引文只改成與 Wikisource 原文一致，不潤飾 |
| 想新增一個事件／路線／色塊來「補齊」 | 沒有史料等於編造 | 不新增；寫進放棄清單 |
| edit 工具回報成功，但 `git diff` 看不到 | 寫盤失敗 | 每次編輯後 `git diff --stat` 實證 |
| 檔案被別的程序還原 | cron 或其他 agent 動了同一個 worktree | 改完立刻 commit，再用 `git log -1` 實證 |
