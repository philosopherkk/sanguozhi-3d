#!/usr/bin/env node
/**
 * agent-queue.mjs [key] — 排程 agent 的統一佇列入口。
 *
 * 以前每支手冊各自寫「跑哪條指令、自己數」，模型常常數錯，或者佇列見底還在原地找。
 * 這支把剩下多少、下一批做什麼集中輸出；agent 只管照單做事，不需要自己設計工作。
 *
 * 2026-11-27 新增 critical：關鍵事變的缺口與未標卡（見 reports/critical-incidents.md）。
 *
 * 用法：
 *   node scripts/agent-queue.mjs          印各支的剩餘量（適合人看）
 *   node scripts/agent-queue.mjs <key>    印該支的明細（agent 用）
 */
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const key = process.argv[2]

const run = (cmd) => {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8', timeout: 180000, stdio: ['ignore', 'pipe', 'ignore'] })
  } catch (e) {
    return `（指令失敗：${String(e.message).split('\n')[0]}）\n${e.stdout ?? ''}`
  }
}
const last = (s, pat) => s.split('\n').filter((l) => pat.test(l)).pop() ?? '（找不到總結行）'
const head = (s, n) => s.split('\n').slice(0, n).join('\n')

const summary = {
  enrich: () => {
    run('node scripts/audit_event_depth.mjs')
    return last(run('node scripts/audit_event_depth.mjs'), /^audit:event-depth —/)
  },
  accuracy: () => {
    const d = JSON.parse(readFileSync(join(ROOT, 'scripts/quote-audit-ledger.json'), 'utf8'))
    return `已戳記 ${Object.keys(d).length} 條（另有出處具名卻無原文的條目，見 detail）`
  },
  map: () => last(run('python3 scripts/check_ring_landmarks.py --unasserted'), /無地標斷言/),
  march: () => last(run('python3 scripts/check_route_landmarks.py --unasserted'), /無斷言/),
  critical: () => last(run('node scripts/audit_critical.mjs'), /^audit:critical —/),
}
const detail = {
  enrich: () => {
    run('node scripts/audit_event_depth.mjs')
    // 以前只轉發統計表（「中學生層未達標 164 條」），agent 不知道是哪幾條，
    // 每輪自己 grep 猜目標。現在直接給 檔:行｜層｜現字數 的具體清單。
    const todo = run('node scripts/audit_event_depth.mjs --todo 12')
    return [last(run('node scripts/audit_event_depth.mjs'), /^audit:event-depth —/), '', todo.trim()].join('\n')
  },
  accuracy: () => {
    const d = JSON.parse(readFileSync(join(ROOT, 'scripts/quote-audit-ledger.json'), 'utf8'))
    /**
     * 2026-11-25 修正：本欄以前只列「最舊的 12 條已戳記引文」，
     * 等於叫 accuracy 每輪去覆核自己查過的東西——332 條蓋過章的引文就這樣被轉圈查了十幾輪，
     * 而 1,690 條從未查證的引文一條都沒進佇列。待辦一律以 --todo 為準（未查證優先）。
     */
    const todo = run('node scripts/audit_quotes.mjs --todo --limit 12')
    return [
      `已戳記 ${Object.keys(d).length} 條（覆核用的舊帳本不當日佇列）`,
      '',
      todo.trim(),
    ].join('\n')
  },
  map: () => {
    const o = run('python3 scripts/check_ring_landmarks.py --unasserted')
    // 佇列見底就明講見底：之前照樣印「前十條」，agent 找不到事做就自己發明工作
    // （實測發生過憑空畫政權），寧可讓它改去做備援清單。
    return [last(o, /無地標斷言/), head(o, 12), MAP_FALLBACK].join('\n')
  },
  march: () => {
    const o = run('python3 scripts/check_route_landmarks.py --unasserted')
    return [last(o, /無斷言/), head(o, 12), MARCH_FALLBACK].join('\n')
  },
  critical: () => {
    const o = run('node scripts/audit_critical.mjs --todo 12')
    // 前面 24 行是各槽統計（給人看），代理只要待辦清單，故從 --todo 總結行起轉發
    const at = o.indexOf('audit:critical --todo')
    return [at >= 0 ? o.slice(at).trimEnd() : o, CRITICAL_NOTE].join('\n')
  },
}
// 關鍵事變的界線：盤點器的「界線」年屬時代終點、或最後一個換圖年之後的政權退出，
// 屬時代界線而非缺口；未標的卡必須逐條判斷後才加旗幟（定義由 KK 定，不得放寬）。
const CRITICAL_NOTE = `
界線年（報告第一節標「界線」者）屬時代界線，不算缺口，不要為它們造卡。
「未標」的卡要逐條判斷：只有關係政權興亡或改變時代，才加 critical: true；
判斷不成立的，留在原卡並在 note 寫明理由，不得刪除既有內容。
「缺口」造新卡時：正史／六國史為據，引文用 node scripts/qsrc.py 查原文與卷次，
不得憑空創造地圖上的政權；新增行軍線一律示意並吸附既有表。`
// 主佇列見底時的備援工作（都是量出來的具體清單，不是「再想想做什麼」）。
const MAP_FALLBACK = `
主佇列若見底（剩下的都是已放棄／巨框），改做：
  npm run audit:war-shape > /tmp/ws.log 2>&1; echo exit=$?
報告裡「示意框」那一批（目前 57 個）才是可核的實地標；
或跑 node scripts/audit_critical.mjs --todo 20 補關鍵年地圖上的政權興亡。`
const MARCH_FALLBACK = `
主佇列若見底（其餘全部已載明理由地延後），改做：
  node scripts/audit_critical.mjs --cards | grep critical | head -60
挑沒有行軍線的關鍵年補線（新線一律示意、吸附既有表，不得憑空造政權）。`

if (key && !summary[key]) {
  console.error(`未知 agent：${key}（可用：${Object.keys(summary).join('、')}）`)
  process.exit(2)
}
if (key) {
  console.log(`## ${key} 佇列\n`)
  console.log(detail[key]())
} else {
  for (const [k, fn] of Object.entries(summary)) console.log(`${k.padEnd(9)} ${fn()}`)
}
