#!/bin/sh
# agent-run.sh — 排程 agent 的「同時只准一支」互斥鎖與時間預算。
#
#   sh scripts/agent-run.sh start <key>   開工前第一個指令；印 GO 才准繼續，印 BUSY 就收工
#   sh scripts/agent-run.sh left          還剩幾分鐘（每做完一項都要看一次，並刷新鎖心跳）
#   sh scripts/agent-run.sh end <key>     收工最後一個指令；釋放鎖
#
# 為什麼要有鎖：排程已錯開成每兩小時一支，但某一輪若跑超時，下一支不該疊上去。
# 本機模型一次只載一個，兩支同時跑會互相拖垮或排隊逾時。
# 活性判斷加入「心跳」：2026-11-18—19 實測排程工作階段實際開工可遲
# 50—90 分鐘，前一輪跑完沒 end 或中途死掉時，只按開工時間（STALE）會把下一支
# 連環卡 BUSY。鎖檔第三行記最後心跳：
#   - 心跳在 `left` 時刷新（手冊規定每做完一項跑一次 `left`）；
#   - 開工未滿 STALE 分鐘（預設 100）或最後心跳未滿 HB 分鐘（預設 35），任一成立即仍在跑；
#   - 兩者皆過才視為已死，准接手；舊鎖檔無心跳行時只看開工時間。
# 時間：預算 BUDGET 分鐘（預設 60）。
# 鎖檔放在 $HOME，不放 /tmp（沙箱會擋 /tmp）。內容三行：key、開工 epoch 秒、最後心跳 epoch 秒。
LOCK="${HF_AGENT_LOCK:-$HOME/.historyfirst-agent.lock}"
BUDGET="${HF_AGENT_BUDGET_MIN:-60}"
STALE="${HF_AGENT_STALE_MIN:-100}"
HB="${HF_AGENT_HB_MIN:-35}"
now=$(date +%s)

read_lock() {
  lk_key=$(sed -n 1p "$LOCK" 2>/dev/null)
  lk_at=$(sed -n 2p "$LOCK" 2>/dev/null)
  lk_hb=$(sed -n 3p "$LOCK" 2>/dev/null)
  case "$lk_at" in ''|*[!0-9]*) lk_at=0 ;; esac
  case "$lk_hb" in ''|*[!0-9]*) lk_hb= ;; esac
  lk_age=$(( (now - lk_at) / 60 ))
  if [ -n "$lk_hb" ]; then hb_age=$(( (now - lk_hb) / 60 )); else hb_age=; fi
}

# alive：開工未滿 STALE 分鐘，或最後心跳未過 HB 分鐘，任一成立即視為仍在跑。
# 小模型常忘了跑 left，所以不能單靠心跳；心跳的作用是讓確實在做事的一輪活過 STALE。
alive() {
  [ "$lk_age" -lt "$STALE" ] && return 0
  [ -n "$hb_age" ] && [ "$hb_age" -lt "$HB" ] && return 0
  return 1
}

write_lock() {
  printf '%s\n%s\n%s\n' "$1" "$2" "$3" > "$LOCK"
}

case "$1" in
  start)
    key="$2"
    [ -n "${key}" ] || { echo "用法：agent-run.sh start <key>"; exit 2; }
    if [ -f "${LOCK}" ]; then
      read_lock
      if alive; then
        echo "BUSY：${lk_key} 已開工 ${lk_age} 分鐘前、最後心跳 ${hb_age:-無} 分鐘前（開工 ${STALE} 分鐘內或心跳 ${HB} 分鐘內視為仍在跑）。"
        echo "本輪不做任何事，在報告寫「因 ${lk_key} 仍在執行而跳過」後結束。"
        exit 3
      fi
      if [ -n "$hb_age" ]; then
        echo "（接手死鎖：${lk_key}，最後心跳已是 ${hb_age} 分鐘前）"
      else
        echo "（接手過期的鎖：${lk_key}，已 ${lk_age} 分鐘）"
      fi
    fi
    write_lock "${key}" "$now" "$now" || { echo "寫不進 ${LOCK}"; exit 2; }
    echo "GO：${key} 開工 $(date '+%Y-%m-%d %H:%M')，預算 ${BUDGET} 分鐘，到 $(date -r $((now + BUDGET * 60)) '+%H:%M') 前收工。"
    ;;
  left)
    [ -f "${LOCK}" ] || { echo "沒有鎖：還沒跑 start？先跑 sh scripts/agent-run.sh start <key>"; exit 2; }
    read_lock
    write_lock "$lk_key" "$lk_at" "$now"   # 心跳：跑 left 即表態還在做事
    rest=$(( BUDGET - lk_age ))
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
