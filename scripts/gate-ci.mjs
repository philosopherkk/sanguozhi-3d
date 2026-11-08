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
  {
    name: 'audit:event-depth',
    cmd: 'npm run audit:event-depth',
    metrics: { gap: /缺口 (\d+)/, padding: /灌水嫌疑 (\d+) 段/ },
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
  console.log('提示：偵測不到 python3+numpy，本轮跳過 audit:geo（裝好後自動納入）')
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
