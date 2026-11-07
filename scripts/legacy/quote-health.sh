#!/bin/bash
# 引文可核性——收斂後（plateau）每輪健康檢查。唯讀、零外部 HTTP。
#
# 為什麼需要這個腳本：plateau 之後每輪都要重跑同一組「常數檢查」，
# 手炒指令容易把算法抄錯（例如 pin 的取法、黑網洞代理漏一個 env），
# 抄錯就會出現「這輪數字一樣但其實沒驗到東西」。這裡把算法與 pin 寫死。
#
# 三個 pin（由 11-06/11-07 輪實測確立，任何一個漂移都要人工判斷，不可就地更新）：
#   CACHE_TREE 快取全樹逐檔 md5 → 證 `--warm` 執行期零 HTTP、快取未漂移
#   ROWS       quotes-audit.json 的 420 筆 rows（含 verdict／缺片段文字／頁名）md5
#              → 證「判定未漂移」，即沒有人手動把條目標成已核
#   黑網洞代理  全部 proxy env 指向必定拒絕連線的 127.0.0.1:9
#              → 若有任何真實請求，要嘛 FETCH_FAILED、要嘛耗時數秒；失敗 0 + 毫秒級 ＝ 根本沒发请求
#
# 用法：bash scripts/quote-health.sh   （exit 0 = 全部通過；非 0 = 有漂移，別 commit）
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

CACHE_TREE_PIN=c8d3e26da3c4bd54d22ef01d2988c761
ROWS_PIN=f99533f7eb03fb3fce5f82b30362f214
BLACKHOLE=http://127.0.0.1:9
fails=0

# 强制離線：curl（wikisource.fetch）與 urllib 都吃這些 env
export http_proxy=$BLACKHOLE https_proxy=$BLACKHOLE HTTP_PROXY=$BLACKHOLE HTTPS_PROXY=$BLACKHOLE no_proxy= NO_PROXY=

cache_tree() { find vendor/wikisource -type f -exec md5 -q {} \; | sort | md5 -q; }
rows_md5() { python3 -c "import json,sys;sys.stdout.write(json.dumps(json.load(open('reports/quotes-audit.json'))['rows'],ensure_ascii=False))" | md5 -q; }

check() { # label got want
  if [ "$2" = "$3" ]; then echo "  OK   $1 = $2"; else echo "  DRIFT $1 = $2（pin $3）"; fails=$((fails+1)); fi
}

echo '[1] 起點快取樹雜湊'
before=$(cache_tree); nfiles=$(find vendor/wikisource -type f | wc -l | tr -d ' ')
check "CACHE_TREE($nfiles 檔)" "$before" "$CACHE_TREE_PIN"

echo '[2] 黑網洞代理下 --warm（只应命中快取）'
timing=$( { /usr/bin/time -p python3 scripts/wikisource.py --warm; } 2>&1 | tr '\n' '|' )
echo "  $timing"
printf '%s' "$timing" | grep -q '失敗 0：' || { echo '  DRIFT warm 出現失敗頁（黑網洞下不該有任何請求）'; fails=$((fails+1)); }
after=$(cache_tree)
check "CACHE_TREE(warm 後)" "$after" "$CACHE_TREE_PIN"
[ "$before" = "$after" ] || { echo '  DRIFT warm 改動了快取位元組'; fails=$((fails+1)); }

echo '[3] 判定逐筆雜湊（rows）'
check "ROWS_MD5" "$(rows_md5)" "$ROWS_PIN"

echo '[4] 清單↔快取完整性閘門（--cache-gate）'
python3 scripts/quote-forensics.py --cache-gate >/tmp/qh_gate.log 2>&1
rc=$?; [ $rc -eq 0 ] && echo '  OK   --cache-gate exit 0' || { echo "  FAIL --cache-gate exit $rc"; fails=$((fails+1)); tail -15 /tmp/qh_gate.log; }
printf '  清單 %s 行 ↔ 快取 %s 檔\n' "$(wc -l < reports/wikisource-pages.txt | tr -d ' ')" "$nfiles"

echo '[5] 未核成因分類（--classify，不抓網路）'
python3 scripts/quote-forensics.py --classify 2>&1 | grep -E '未核|已達上限' | sed 's/^/  /'

echo '[6] src/** 必須零改動（鐵律 1）'
srccount=$(git status --porcelain | grep -cE '(^|/)src/' || true)
check "src 改動檔數" "$srccount" "0"

echo '[7] 人工裁決清單（唯讀彙整，把分類變成可照著做的單子）'
python3 scripts/human-decision-sheet.py >/tmp/qh_sheet.log 2>&1
rc=$?; [ $rc -eq 0 ] && echo "  OK   $(cat /tmp/qh_sheet.log)" || { echo "  FAIL human-decision-sheet exit $rc"; fails=$((fails+1)); tail -5 /tmp/qh_sheet.log; }

echo '[8] 未核片段 ↔ 轉錄本實際文字對照（closest-witness，離線；自報 A-E＋與 witness-audit 交叉核對）'
python3 scripts/closest-witness.py >/tmp/qh_cw.log 2>&1
rc=$?; [ $rc -eq 0 ] && sed -n 's/^/  /p' /tmp/qh_cw.log | grep -E '未核|歸屬|交叉核對|檢查 A' \
  || { echo "  FAIL closest-witness exit $rc"; fails=$((fails+1)); tail -12 /tmp/qh_cw.log; }

echo '[9] 判定層咬合力（verifier-teeth；黑網洞下跑兩遍，該逐位元組相同）'
python3 scripts/verifier-teeth.py >/tmp/qh_teeth.log 2>&1
rc=$?; [ $rc -eq 0 ] && grep -E '反控通過|suspect 分支|標點對稱|折字表|單一實作|片段下限|批次輸出' /tmp/qh_teeth.log | sed 's/^/  /' \
  || { echo "  FAIL verifier-teeth exit $rc（判定層該紅卻不紅／該過卻被誤殺＝判定層壞了，別 commit）"; fails=$((fails+1)); tail -15 /tmp/qh_teeth.log; }

echo
if [ $fails -eq 0 ]; then
  echo "PASS — 三個 pin 相同、warm 零請求、閘門 0、src 零改動 ⇒ 判定未漂移（收斂態維持）"
  exit 0
else
  echo "FAIL — $fails 項漂移：不要 commit，先人工判斷（不可就地改 pin 或改判定）"
  exit 1
fi
