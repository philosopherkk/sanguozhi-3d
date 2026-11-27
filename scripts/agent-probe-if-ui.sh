#!/bin/sh
# agent-probe-if-ui.sh <BASE> — 僅在有改動介面／樣式檔案時才執行手機瀏覽器探針，
# 避免純資料／引文／地理斷言輪次無謂啟動 Chrome（節省時間與本機模型 token）。
set -u
BASE="${1:-origin/main}"
changed=$(git diff --name-only "${BASE}..HEAD" 2>/dev/null || true)
ui_hit=0
for f in $changed; do
  case "$f" in
    *.tsx|*.css|index.html|src/lib/tickCollisions.ts|src/lib/scrollRoot.ts|src/lib/use*.ts)
      ui_hit=1
      break
      ;;
  esac
done

if [ "$ui_hit" -eq 0 ]; then
  echo "mp=SKIP(no-ui-diff)"
  exit 0
fi

node scripts/mobile_probe.mjs --narrow > /tmp/mp-ui.log 2>&1
rc=$?
echo "mp=$rc"
tail -n 5 /tmp/mp-ui.log
exit "$rc"
