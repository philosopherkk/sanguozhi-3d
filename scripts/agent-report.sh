#!/bin/sh
# agent-report.sh <key> <BASE> — 產生收工報告骨架，數字由指令抓，不由模型憑記憶寫。
# 用法：sh scripts/agent-report.sh march abc1234 > /tmp/report-march.txt
# 模型只需在骨架上補「完成項目／放棄清單／下輪建議」，不要改既有數字。
set -u
key="$1"; base="$2"
head=$(git rev-parse --short HEAD)
n=$(git rev-list --count "${base}..HEAD" 2>/dev/null || echo '?')
dirty=$(git status --porcelain)
remote=$(git ls-remote origin "refs/heads/agent/${key}" 2>/dev/null | cut -f1)
local=$(git rev-parse HEAD 2>/dev/null)
if [ "$remote" = "$local" ]; then push='一致'; else push="不一致（遠端 ${remote:-無}／本機 ${local}）"; fi
if [ -z "$dirty" ]; then ws='空'; else ws="非空：$(echo "$dirty" | head -3 | tr '\n' ';')"; fi
cat <<EOF
【${key}｜$(date '+%Y-%m-%d %H:%M')】
基準：${base} → 本輪 HEAD：${head}（${n} 個 commit）
工作區：git status --porcelain 輸出＝${ws}
完成項目（每項一行：id／檔:行／做了什麼／驗證指令與結果）
  1.
放棄清單（每項：id／原因）
  1.
指標：<指標名> <前> → <後>；gates exit=<碼>；tsc=<碼>；build=<碼>；chars exit=<碼>
push：git ls-remote 與 git rev-parse HEAD ＝ ${push}
PR：<網址或「已存在 #N」>
下輪建議：<一句>
EOF
