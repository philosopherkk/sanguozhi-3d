#!/usr/bin/env node
/**
 * 閘門護欄：跑齊各審計，與已提交基線比較，**只在惡化時失敗**。
 *
 * 為什麼要基線：目前多條閘門仍有既存缺口（引文、接線、年份口徑、成語…）。
 * 直接把它們設為硬性通過門檻，會讓每個 PR 都變紅，結果是所有人都學會忽略它們；
 * 護欄式比較可以在「不惡化」的前提下逐輪收緊，數字下降時更新基線即可。
 *
 * 用法：
 *   npm run gates                       比較基線（CI 用）
 *   npm run gates -- --update-baseline  記錄新基線（只應在數字改善後執行）
 */
import { execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const BASELINE = join(ROOT, 'reports', 'gate-baseline.json')

/** 每條閘門：指令 + 從輸出抽幾個數字（名字要穩定，基線靠它對照）。 */
const GATES = [
  {
    name: 'audit:data',
    cmd: 'npm run audit:data',
    metrics: { fail: /audit:data — fail (\d+)/, warn: /audit:data — fail \d+, warn (\d+)/ },
  },
  { name: 'audit:wiring', cmd: 'npm run audit:wiring', metrics: { fail: /audit:wiring — fail (\d+)/ } },
  {
    name: 'audit:ranges',
    cmd: 'npm run audit:ranges',
    metrics: { fail: /audit:ranges — fail (\d+)/, warn: /audit:ranges — fail \d+, warn (\d+)/ },
  },
  // 注意：audit:quotes 每檔都會印「錯誤 N｜提醒 N」，錨定要落在「合計」行，
  // 否則量到嘅係第一個檔案嘅數字（呢個 bug 曾令護欄一直睇錯引文缺口）。
  { name: 'audit:quotes', cmd: 'npm run audit:quotes', metrics: { errors: /合計：[^\n]*錯誤 (\d+)/, warns: /合計：[^\n]*提醒 (\d+)/ } },
  {
    name: 'audit:chengyu',
    cmd: 'npm run audit:chengyu',
    metrics: { fail: /audit:chengyu — 條目 \d+｜fail (\d+)/, warn: /｜fail \d+｜warn (\d+)/ },
  },
  {
    name: 'audit:map',
    cmd: 'npm run audit:map',
    metrics: { fail: /audit:map —[^\n]*fail (\d+)/, warn: /｜fail \d+｜warn (\d+)/ },
  },
  { name: 'audit:chars', cmd: 'npm run audit:chars', metrics: { hard: /硬傷 (\d+)/ } },
  // 2026-11-08 補：使用者隨機抽查應仁之亂即見內容極薄，追查發現既有 event-depth
  // 從未讀取事件詳情檔案（timelineDetails 字串比對 0 次）。41 條受測、27 條缺口。
  // 分開一支閘門是為了不打斷其他 agent 已有的 event-depth 基線。
  // 2026-11-09 補：三層意譯「有冇分層」閘門。既有 event-depth 只查有冇三層，
  // 所以 198 組全過；實測中位數比只有 1:1.3:3.6，146 組其實冇分層。
  // 2026-11-09 補：成語覆蓋率與疆域几何品質。兩者都係「既有閘門報綠但使用者
  // 一眼就見到問題」的類型——格式合格不等於覆蓋夠、海陸一致不等於形状真。
  {
    name: 'audit:chengyu-coverage',
    cmd: 'npm run audit:chengyu-coverage',
    metrics: {
      missingCentury: /空白世紀 (\d+)/,
      thinCentury: /薄弱世紀 (\d+)/,
      noEventLink: /無 event 連結 (\d+)/,
    },
  },
  {
    name: 'audit:war-shape',
    cmd: 'npm run audit:war-shape',
    metrics: { schematic: /示意框 (\d+)/, selfInt: /自我相交 (\d+)/ },
  },
  {
    name: 'audit:reading-layers',
    cmd: 'npm run audit:reading-layers',
    metrics: { gap: /分層不合格 (\d+)/ },
  },
  {
    name: 'audit:detail-depth',
    cmd: 'npm run audit:detail-depth',
    metrics: { gap: /缺口 (\d+)/ },
  },
  {
    name: 'audit:event-depth',
    cmd: 'npm run audit:event-depth',
    metrics: { gap: /缺口 (\d+)/, padding: /灌水嫌疑 (\d+) 段/, jpGap: /日本三層未達 (\d+)/ },
  },
]

/** audit:geo 需要 Python + numpy；CI runner 未必裝好，缺就跳過而非誤判失敗。 */
function hasNumpy() {
  try {
    execSync('python3 -c "import numpy"', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}
if (hasNumpy()) {
  GATES.push({ name: 'audit:geo', cmd: 'npm run audit:geo', metrics: {} })
} else {
  console.log('提示：偵測不到 python3+numpy，本輪跳過 audit:geo（裝好後自動納入）')
}

function run(cmd) {
  try {
    return { code: 0, out: execSync(cmd, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64e6 }) }
  } catch (err) {
    return { code: err.status ?? 1, out: `${err.stdout ?? ''}${err.stderr ?? ''}` }
  }
}

function measure() {
  const got = {}
  for (const g of GATES) {
    const { code, out } = run(g.cmd)
    const m = { exit: code }
    for (const [key, re] of Object.entries(g.metrics)) {
      const hit = out.match(re)
      if (hit) m[key] = Number(hit[1])
      // 抽唔到數字一定係壞事：輸出格式改咗之後，護欄會以為「冇呢個指標」
      // 而永遠跳過該項比較——即係無聲消失。必須當失敗，唔可以靜落。
      else m[`__miss_${key}`] = 1
    }
    got[g.name] = m
  }
  return got
}

const UPDATE = process.argv.includes('--update-baseline')
const current = measure()

const missing = []
for (const [name, m] of Object.entries(current)) {
  for (const k of Object.keys(m)) {
    if (k.startsWith('__miss_')) missing.push(`${name}.${k.slice(7)}`)
  }
}
if (missing.length) {
  console.error(
    '\ngates — 以下指標喺閘門輸出抽唔到，護欄等於冇檢查，請修正比對式或輸出格式：\n  ' + missing.join('\n  '),
  )
  process.exit(1)
}

if (UPDATE || !existsSync(BASELINE)) {
  writeFileSync(BASELINE, JSON.stringify(current, null, 2) + '\n')
  console.log(`gates — 已記錄基線（${Object.keys(current).length} 條閘門）→ reports/gate-baseline.json`)
  process.exit(0)
}

const base = JSON.parse(readFileSync(BASELINE, 'utf8'))
/** 每條閘門有沒有「可追蹤的數字指標」，決定 exit 要不要計入失敗。 */
const gMetrics = Object.fromEntries(GATES.map((g) => [g.name, g.metrics]))
const worse = []
const better = []
const lines = []
for (const [name, cur] of Object.entries(current)) {
  const old = base[name] ?? {}
  const parts = []
  for (const [key, val] of Object.entries(cur)) {
    if (key === 'exit') continue
    const b = old[key]
    const tag = b === undefined ? '新' : val < b ? `↓${b - val}` : val > b ? `↑${val - b}` : '='
    parts.push(`${key}=${val}(${tag})`)
    if (b !== undefined && val > b) worse.push(`${name}.${key} ${b} → ${val}`)
    if (b !== undefined && val < b) better.push(`${name}.${key} ${b} → ${val}`)
  }
  // 有數字指標的閘門以指標為準：audit:wiring 等目前就有既存 fail，
  // 把 exit≠0 當成惡化會讓護欄永遠紅，最後所有人都忽略它——這正是要避免的失效模式。
  const tracked = Object.keys(gMetrics[name] ?? {})
  if (cur.exit !== 0 && tracked.length === 0 && (old.exit ?? 0) === 0) {
    worse.push(`${name} 指令失敗（exit ${cur.exit}）`)
  }
  if (cur.exit !== 0 && tracked.length > 0) parts.push(`exit=${cur.exit}(既有缺口)`)
  lines.push(`${name.padEnd(20)} ${parts.join(' ') || '僅查 exit code'}`)
}

console.log(lines.join('\n'))
if (better.length) console.log('\n改善：\n  ' + better.join('\n  '))
if (worse.length) {
  console.error('\ngates — 惡化，請修回或（確屬口徑調整時）由人工更新基線：\n  ' + worse.join('\n  '))
  process.exit(1)
}
console.log('\ngates — 無惡化（與基線一致或更好）')
