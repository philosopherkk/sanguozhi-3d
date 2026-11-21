#!/bin/sh
# agent-run.sh — 排程 agent 的「同時只准一支」互斥鎖與時間預算。
#
#   sh scripts/agent-run.sh start <key>   開工前第一個指令；印 GO 才准繼續
#                                         印 WAIT 就原樣再跑一次同一指令（最多等 MAXWAIT 分鐘）
#                                         印 BUSY 才是放棄本輪
#   sh scripts/agent-run.sh left <key>    還剩幾分鐘（每做完一項都要看一次，並刷新鎖心跳）
#   sh scripts/agent-run.sh end <key>     收工最後一個指令；釋放鎖
#
# 為什麼要有鎖：排程已錯開成每兩小時一支，但某一輪若跑超時，下一支不該疊上去。
# 本機模型一次只載一個，兩支同時跑會互相拖垮或排隊逾時。
#
# 活性規則（鎖檔三行：key、開工 epoch 秒、最後心跳 epoch 秒）：
#   - 開工未滿 BUDGET 分鐘（預設 60）：一定視為仍在跑；
#   - 滿 BUDGET 但未滿 HARD 分鐘（預設 90）：最後心跳未滿 HB 分鐘（預設 35）才視為仍在跑；
#   - 滿 HARD 分鐘：一律視為已死，下一支可接手（外部收割程式也會在此時中止該 session）。
# 心跳只有鎖主自己跑 left <key> 才會刷新。別人誤跑 left 只會收到 NOT_OWNER，不會延長他人的鎖。
# 鎖檔放在 $HOME，不放 /tmp（沙箱會擋 /tmp）。
LOCK="${HF_AGENT_LOCK:-$HOME/.historyfirst-agent.lock}"
BUDGET="${HF_AGENT_BUDGET_MIN:-60}"
HARD="${HF_AGENT_HARD_MIN:-90}"
HB="${HF_AGENT_HB_MIN:-35}"
WAITSEC="${HF_AGENT_WAIT_SEC:-100}"
MAXWAIT="${HF_AGENT_MAXWAIT_MIN:-60}"
now=$(date +%s)

read_lock() {
  lk_key=$(sed -n 1p "$LOCK" 2>/dev/null)
  lk_at=$(sed -n 2p "$LOCK" 2>/dev/null)
  lk_hb=$(sed -n 3p "$LOCK" 2>/dev/null)
  case "$lk_at" in ''|*[!0-9]*) lk_at=0 ;; esac
  case "$lk_hb" in ''|*[!0-9]*) lk_hb=$lk_at ;; esac
  lk_age=$(( (now - lk_at) / 60 ))
  hb_age=$(( (now - lk_hb) / 60 ))
}

alive() {
  [ "$lk_age" -ge "$HARD" ] && return 1
  [ "$lk_age" -lt "$BUDGET" ] && return 0
  [ "$hb_age" -lt "$HB" ] && return 0
  return 1
}

write_lock() {
  printf '%s\n%s\n%s\n' "$1" "$2" "$3" > "$LOCK"
}

case "$1" in
  start)
    key="$2"
    [ -n "${key}" ] || { echo "用法：agent-run.sh start <key>"; exit 2; }
    WF="${LOCK}.wait.${key}"
    if [ -f "${LOCK}" ]; then
      read_lock
      if [ "${lk_key}" != "${key}" ] && alive; then
        [ -f "${WF}" ] || printf '%s\n' "$now" > "${WF}"
        w0=$(cat "${WF}" 2>/dev/null); case "$w0" in ''|*[!0-9]*) w0=$now ;; esac
        waited=$(( (now - w0) / 60 ))
        if [ "${waited}" -ge "${MAXWAIT}" ]; then
          rm -f "${WF}"
          echo "BUSY：${lk_key} 仍在執行，已等 ${waited} 分鐘。本輪不做任何事，在報告寫「因 ${lk_key} 仍在執行而跳過」後結束。"
          exit 3
        fi
        i=0
        while [ "$i" -lt "$WAITSEC" ]; do
          sleep 5; i=$((i + 5))
          [ -f "${LOCK}" ] || break
          now=$(date +%s); read_lock
          alive || break
        done
        if [ -f "${LOCK}" ] && [ "${lk_key}" != "${key}" ] && alive; then
          echo "WAIT：${lk_key} 還在跑（開工 ${lk_age} 分鐘前、心跳 ${hb_age} 分鐘前）。你已等 ${waited} 分鐘，最多等 ${MAXWAIT} 分鐘。"
          echo "什麼都不要做，原樣再跑一次：sh scripts/agent-run.sh start ${key}"
          exit 6
        fi
      elif [ "${lk_key}" != "${key}" ]; then
        echo "（接手已死的鎖：${lk_key}，開工 ${lk_age} 分鐘前、最後心跳 ${hb_age} 分鐘前）"
      fi
    fi
    rm -f "${WF}"
    now=$(date +%s)
    write_lock "${key}" "$now" "$now" || { echo "寫不進 ${LOCK}"; exit 2; }
    echo "GO：${key} 開工 $(date '+%Y-%m-%d %H:%M')，預算 ${BUDGET} 分鐘，到 $(date -r $((now + BUDGET * 60)) '+%H:%M') 前收工。"
    ;;
  left)
    key="$2"
    [ -n "${key}" ] || { echo "用法：agent-run.sh left <key>（要帶你自己的 key）"; exit 2; }
    [ -f "${LOCK}" ] || { echo "沒有鎖：你還沒跑 start，或鎖已被收走。先跑 sh scripts/agent-run.sh start ${key}"; exit 2; }
    read_lock
    if [ "${lk_key}" != "${key}" ]; then
      echo "NOT_OWNER：鎖屬於 ${lk_key}，你（${key}）沒有鎖。立刻停止所有修改，不要 commit、不要 push，回報一句「未持有鎖」就結束。"
      exit 5
    fi
    write_lock "$lk_key" "$lk_at" "$now"
    rest=$(( BUDGET - lk_age ))
    if [ "${lk_age}" -ge $(( HARD - 10 )) ]; then
      echo "STOP：已用 ${lk_age} 分鐘，逼近硬上限 ${HARD} 分鐘（到點會被強制中止）。現在只做：commit 已驗證的成果、end。不要再改任何檔。"
      exit 4
    fi
    if [ "${rest}" -le 0 ]; then
      echo "TIMEUP：已用 ${lk_age} 分鐘（預算 ${BUDGET}）。不要再改任何檔案；直接 commit、push、寫報告、end。"
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
    echo "用法：agent-run.sh start <key> | left <key> | end <key>"
    exit 2
    ;;
esac
