---
name: hf-gate-commit
description: Run pre-commit self-checks, conditional mobile probe, build/lint/gates, push, and generate the final report for any scheduled historyfirst agent. Use before every commit and at wrap-up.
---

# gate-commit｜提交前自檢與收工流程

## 每一項 commit 前（必跑四步）
```sh
git add -A
node scripts/agent-selfcheck.mjs origin/main > /tmp/sc.log 2>&1; echo sc=$?; tail -n 20 /tmp/sc.log
node scripts/agent-selfcheck.mjs --commits origin/main
npm run audit:chars > /tmp/chars.log 2>&1; echo chars=$?; tail -n 10 /tmp/chars.log
```
- 確認 `sc=0`、`chars=0`，並人工核對 `/tmp/sc.log` 列出的「新出現的漢字」碼位正確。
- `git commit -m "type(<key>): 摘要"`（`scope` 必須是自己的 `<key>`）。
- `sh scripts/agent-run.sh left <key>`（印 `TIMEUP`/`STOP`/`NOT_OWNER` 立即停止開新項）。

## 收工（嚴禁以 grep 接管線；長輸出重導向後只看 tail -n 20）
```sh
git status --porcelain
npx tsc -b; echo tsc=$?
npm run build > /tmp/build.log 2>&1; echo build=$?; tail -n 10 /tmp/build.log
npm run lint > /tmp/lint.log 2>&1; echo lint=$?; tail -n 10 /tmp/lint.log
sh scripts/agent-probe-if-ui.sh "${BASE:-origin/main}"
npm run gates > /tmp/gates-after.log 2>&1; echo gates=$?; tail -n 20 /tmp/gates-after.log
sh scripts/agent-report.sh <key> "${BASE:-origin/main}" > /tmp/report.txt
git push --force-with-lease origin agent/<key>
git ls-remote origin refs/heads/agent/<key>
sh scripts/agent-run.sh end <key>
```
- `agent-probe-if-ui.sh` 僅於改動 `.tsx`/`.css`/`.html` 時啟動 Chrome，其餘資料或腳本輪次會直接印 `mp=SKIP(no-ui-diff)`。
- 若 `gates` 非 0，檢查 `/tmp/gates-after.log` 結尾「惡化」區；若是你的 commit 造成，先 `git revert` 再重驗。
- 將 `/tmp/report.txt` 補齊完成項目、放棄清單與下輪建議作為最終輸出。
