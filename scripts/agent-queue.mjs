#!/usr/bin/env node
/**
 * agent-queue.mjs [key] — 五支排程 agent 的統一佇列入口。
 *
 * 以前每支手冊各自寫「跑哪條指令、自己數」，模型常常數錯，或者佇列見底還在原地找。
 * 這支把剩下多少、下一批做什麼集中輸出；agent 只管照單做事，不需要自己設計工作。
 *
 * 用法：
 *   node scripts/agent-queue.mjs          印五支的剩餘量（適合人看）
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
  ui: () => {
    const o = run('node scripts/ui_queue.mjs')
    return last(o, /^ui_queue —/)
  },
  enrich: () => {
    run('node scripts/audit_event_depth.mjs')
    return last(run('node scripts/audit_event_depth.mjs'), /^audit:event-depth —/)
  },
  accuracy: () => {
    const d = JSON.parse(readFileSync(join(ROOT, 'scripts/quote-audit-ledger.json'), 'utf8'))
    return `已戳記 ${Object.keys(d).length} 條`
  },
  map: () => last(run('python3 scripts/check_ring_landmarks.py --unasserted'), /無地標斷言/),
  march: () => last(run('python3 scripts/check_route_landmarks.py --unasserted'), /無斷言/),
}
const detail = {
  ui: () =>
    [
      run('node scripts/ui_queue.mjs').trim(),
      '',
      '開工與收工各跑一次全時代手機實測（約 2 分鐘）：',
      '  node scripts/mobile_probe.mjs --narrow > /tmp/mp.log 2>&1; echo exit=$?; tail -n 8 /tmp/mp.log',
      '有 ✗ 的時代最優先修；手機是整頁捲動設計，規範見 docs/agents/ui.md「手機整頁捲動規範」。',
    ].join('\n'),
  enrich: () => {
    const audit = run('node scripts/audit_event_depth.mjs')
    const rep = readFileSync(join(ROOT, 'reports/event-depth.md'), 'utf8')
    const i = rep.indexOf('## 三層意譯')
    return [last(audit, /^audit:event-depth —/), i < 0 ? rep.slice(-2000) : head(rep.slice(i), 30)].join('\n')
  },
  accuracy: () => {
    const d = JSON.parse(readFileSync(join(ROOT, 'scripts/quote-audit-ledger.json'), 'utf8'))
    const rows = Object.entries(d).sort((a, b) => String(a[1].at).localeCompare(String(b[1].at)))
    return [
      `已戳記 ${rows.length} 條；最舊 ${Math.min(12, rows.length)} 條（先覆核這些）`,
      ...rows.slice(0, 12).map(([k, v]) => `${k}｜${v.at}｜${v.page}｜stamp ${v.stamp}`),
    ].join('\n')
  },
  map: () => {
    const o = run('python3 scripts/check_ring_landmarks.py --unasserted')
    return [last(o, /無地標斷言/), '前十條：', head(o, 12)].join('\n')
  },
  march: () => {
    const o = run('python3 scripts/check_route_landmarks.py --unasserted')
    return [last(o, /無斷言/), '前十條：', head(o, 12)].join('\n')
  },
}

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
