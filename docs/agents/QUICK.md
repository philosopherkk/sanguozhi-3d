# 排程 agent 快速卡（本輪唯一必讀，約 45 行）

你是本機小模型。**只讀本卡就開工**；不要讀 `README.md`，也不要讀完整手冊。
只有本卡講不清楚、或指令輸出看不懂時，才讀自己手冊開頭的「速查」那段（最多 30 行）。
讀檔一律只取需要的那幾十行：`grep -n` 找行號，再取該段，不整檔讀入。

## 開工（照順序，不跳步）

```sh
cd <worktree>
git status --porcelain                      # 非空＝立刻停，報告，不要碰
git fetch origin && git switch agent/<key> && git rebase origin/main
test -f docs/agents/QUICK.md && echo QUICK_OK || exit 1
sh scripts/agent-run.sh start <key>         # GO 才繼續；WAIT 原樣再跑；BUSY 就停
node scripts/agent-model-check.mjs          # 必須 MODEL_LOCK_OK，否則停
git rev-parse HEAD                          # 記為 BASE
node scripts/agent-queue.mjs <key>          # 照佇列第一項做，不自己找事
```

## 每一項的標準節奏

```sh
# 改完、單項驗證之後，commit 前必跑：
git add -A
node scripts/agent-selfcheck.mjs origin/main
node scripts/agent-selfcheck.mjs --commits origin/main
npm run audit:chars > /tmp/chars-<key>.log 2>&1; echo exit=$?
git commit -m "type(<key>): 摘要"
sh scripts/agent-run.sh left <key>          # LEFT 繼續；TIMEUP／STOP／NOT_OWNER 就收尾
```

## 輸出大小（省 token，務必遵守）

- 任何指令的**長輸出都用重導向**，只看結論：`指令 > /tmp/x.log 2>&1; echo exit=$?; tail -n 20 /tmp/x.log`。
- **絕不用管線接 `grep`**（會把失敗碼吃掉）；`head`／`tail` 只在重導向之後用。
- 不用內嵌 Python 印明細；檢查與報告一律用現成腳本：`scripts/agent-queue.mjs`、`scripts/agent-report.sh`。
- 手冊與報告只讀相關段落；一次讀入超過 40 行就是浪費。

## 工作量上限

**一輪最多做 4 項**，做完就收工，不要為跑滿 60 分鐘預算而繼續找事。
早點收工比晚點亂做更好；剩下的寫進報告「下輪建議」。

## 收工

```sh
git status --porcelain                      # 必須空
npx tsc -b; echo tsc=$?
npm run build > /tmp/build-<key>.log 2>&1; echo build=$?
npm run lint > /tmp/lint-<key>.log 2>&1; echo lint=$?
npm run gates > /tmp/gates-after-<key>.log 2>&1; echo gates=$?   # 單項可先用 --only=<閘門名> 快驗
sh scripts/agent-report.sh <key> <BASE> > /tmp/report-<key>.txt
git push origin agent/<key>
sh scripts/agent-run.sh end <key>           # 最後一個指令
```

## 鐵律

正體中文書面語、不編造、不混英文進中文句、引文逐字、scope 用自己的 key。
報告數字以指令輸出為準，沒跑過的指令不要寫進報告。有疑問才讀 `docs/agents/README.md` 與手冊全文。
