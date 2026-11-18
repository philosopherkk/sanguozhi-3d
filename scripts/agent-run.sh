#!/bin/sh
# agent-run.sh — 排程 agent 的「同時只准一支」互斥鎖與時間預算。
#
#   sh scripts/agent-run.sh start <key>   開工前第一個指令；印 GO 才准繼續，印 BUSY 就收工
#   sh scripts/agent-run.sh left          還剩幾分鐘（每做完一項都要看一次）
#   sh scripts/agent-run.sh end <key>     收工最後一個指令；釋放鎖
#
# 為什麼要有鎖：排程已錯開成每兩小時一支，但某一輪若跑超時，下一支不該疊上去。
# 本機模型一次只載一個，兩支同時跑會互相拖垮或排隊逾時。
# 時間：預算 BUDGET 分鐘（預設 60）。鎖超過 STALE 分鐘（預設 100）視為上一輪已死，可接手。
# 鎖檔放在 $HOME，不放 /tmp（沙箱會擋 /tmp）。內容兩行：key、開工 epoch 秒。
LOCK="${HF_AGENT_LOCK:-$HOME/.historyfirst-agent.lock}"
BUDGET="${HF_AGENT_BUDGET_MIN:-60}"
STALE="${HF_AGENT_STALE_MIN:-100}"
now=$(date +%s)

read_lock() {
  lk_key=$(sed -n 1p "$LOCK" 2>/dev/null)
  lk_at=$(sed -n 2p "$LOCK" 2>/dev/null)
  case "$lk_at" in ''|*[!0-9]*) lk_at=0 ;; esac
  lk_age=$(( (now - lk_at) / 60 ))
}

case "$1" in
  start)
    key="$2"
    [ -n "${key}" ] || { echo "用法：agent-run.sh start <key>"; exit 2; }
    if [ -f "${LOCK}" ]; then
      read_lock
      if [ "${lk_age}" -lt "${STALE}" ]; then
        echo "BUSY：${lk_key} 已開工 ${lk_age} 分鐘前（${STALE} 分鐘內視為仍在跑）。"
        echo "本輪不做任何事，在報告寫「因 ${lk_key} 仍在執行而跳過」後結束。"
        exit 3
      fi
      echo "（接手過期的鎖：${lk_key}，已 ${lk_age} 分鐘）"
    fi
    printf '%s\n%s\n' "${key}" "$now" > "${LOCK}" || { echo "寫不進 ${LOCK}"; exit 2; }
    echo "GO：${key} 開工 $(date '+%Y-%m-%d %H:%M')，預算 ${BUDGET} 分鐘，到 $(date -r $((now + BUDGET * 60)) '+%H:%M') 前收工。"
    ;;
  left)
    [ -f "${LOCK}" ] || { echo "沒有鎖：還沒跑 start？先跑 sh scripts/agent-run.sh start <key>"; exit 2; }
    read_lock
    rest=$(( ${BUDGET} - ${lk_age} ))
    if [ "${rest}" -le 0 ]; then
      echo "TIMEUP：已用 ${lk_age} 分鐘（預算 ${BUDGET}）。不要開新項目：commit、push、寫報告、end。"
      exit 4
    fi
    echo "LEFT：還有 ${rest} 分鐘（${lk_key} 已用 ${lk_age} 分鐘）。"
    if [ "${rest}" -le 10 ]; then
      echo "只剩 10 分鐘內：做完手上這一項就收尾，不開新項。"
    fi
    ;;
  end)
    key="$2"
    [ -f "${LOCK}" ] || { echo "（鎖已不在）"; exit 0; }
    read_lock
    if [ "${lk_key}" = "${key}" ]; then
      rm -f "${LOCK}" && echo "DONE：${key} 已釋放鎖，共 ${lk_age} 分鐘。"
    else
      echo "鎖屬於 ${lk_key}，不是 ${key}，不動它。"
    fi
    ;;
  *)
    echo "用法：agent-run.sh start <key> | left | end <key>"
    exit 2
    ;;
esac
