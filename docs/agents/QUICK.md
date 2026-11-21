# 排程 agent 快速卡（每輪先看這 20 行）

你是本機小模型。一次做一項、做完就 commit，不確定就跳過並寫入放棄清單。

```sh
cd <worktree>
git status --porcelain                      # 非空＝立刻停，報告，不要碰
git fetch origin && git switch agent/<key> && git rebase origin/main
test -f docs/agents/<key>.md || { echo 手冊不在; exit 1; }
sh scripts/agent-run.sh start <key>         # GO 才繼續；WAIT 就原樣再跑；BUSY 就停
node scripts/agent-model-check.mjs          # 必須 MODEL_LOCK_OK
git rev-parse HEAD                          # 記為 BASE
node scripts/agent-queue.mjs <key>          # 照佇列第一項做
```

每做完一項：

```sh
git add -A
node scripts/agent-selfcheck.mjs origin/main
node scripts/agent-selfcheck.mjs --commits origin/main
npm run audit:chars > /tmp/chars-<key>.log 2>&1; echo exit=$?
git commit -m "type(<key>): 摘要"
sh scripts/agent-run.sh left <key>          # LEFT 繼續；TIMEUP／STOP／NOT_OWNER 就收尾
```

收工：`npx tsc -b`、`npm run build`、`npm run lint`、`npm run gates` 全要 0，
`sh scripts/agent-report.sh <key> <BASE>` 產生報告骨架（不要改上面的數字），
`git push origin agent/<key>`、`sh scripts/agent-run.sh end <key>`。

鐵律：正體中文書面語、不編造、不混英文進中文句、引文逐字、scope 用自己的 key。
有疑問才讀 `docs/agents/README.md` 與 `docs/agents/<key>.md` 全文。
