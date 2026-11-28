#!/usr/bin/env node
/**
 * plan_verify.mjs —— 把「代理自己勾的 ☑」變機械可複驗
 *
 * 為什麼要這個：四國執行計畫（`docs/plans/<date>/*.md`）是一條條
 * `☐ <檔案>｜<動作>｜驗收=<指令>` 的工作單，小模型做完就把行首改成 ☑。
 * 問題是 ☑ 是代理自己寫的——它可能跑過驗收、也可能只是「覺得做完了」。
 * 本機模型只有 300 億參數，不能把品質押在它的自律上。
 *
 * 這個腳本對每個 ☑ **重跑該行自己寫的驗收指令**：
 *   - 驗收不再通過 → 代表這條成果事後壞了（被別人改回去、命令本身寫錯、
 *     或當初根本是假綠）→ exit 1，列入 gate-ci 當硬閘門。
 *   - ☐ 列不跑（還未做），只在結尾報數量。
 *
 * 安全：驗收指令是用 bash 跑的，所以**拒絕執行會寫檔的指令**
 * （`--mark`／`--apply`／`--fix`／`-i`），否則 CI 會把帳本改到髒；
 * 該列計為 SKIP（印出來但不算成㰱）。工作單作者在這種行要改用不寫檔的驗收。
 *
 * 用法：
 *   node scripts/plan_verify.mjs                 # 全部計畫檔
 *   node scripts/plan_verify.mjs --only=map.md    # 只驗某一軌道
 *   node scripts/plan_verify.mjs --verbose        # 每條都印輸出摘要
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')

const PLANS = join(ROOT, 'docs', 'plans')
const ONLY = (() => {
  const a = process.argv.find((s) => s.startsWith('--only='))
  return a ? a.slice(7) : null
})();
const VERBOSE = process.argv.includes('--verbose')
const TIMEOUT = 180_000

/** 會改倉庫／帳本的旗標：這種驗收不可以在 CI 跑 */
const MUTATING = [/--mark\b/, /--apply\b/, /--fix\b/, /\bsed\s+-i\b/, /--write\b/]

/**
 * 防自我遞迴：本腳本會被 gate-ci 呼叫，而 gate-ci 本身又可能被寫進某條驗收。
 * 一旦某行驗收寫 `npm run gates`，就會 plan_verify → gates → plan_verify 無限循環。
 * 同理 `npm run build`（要幾分鐘）不該塞在逐條驗收裡——這種行要改寫成直接的斷言指令。
 */
const RECURSIVE = [/plan_verify/, /gate-ci/, /npm\s+run\s+(gates|build|dev|lint)\b/]

function planFiles() {
  if (!existsSync(PLANS)) return []
  const out = []
  for (const day of readdirSync(PLANS).sort()) {
    const dir = join(PLANS, day)
    for (const f of readdirSync(dir).sort()) {
      if (!f.endsWith('.md')) continue
      if (ONLY && f !== ONLY && !f.endsWith(`/${ONLY}`)) continue
      out.push(join(dir, f))
    }
  }
  return out
}

/**
 * 一行的驗收指令：只認「驗收=」後面的東西。
 *
 * 反引號要**全部**剝掉，不能只剝頭尾：工作單裡有人寫 `驗收=\`cmd\``（整條包），
 * 有人寫 `驗收=\`cmd\` && 另一條`（只包第一條），留低任何一個反引號 bash 都會當成
 * command substitution——實測兩種偽結果：`bash: ✓: command not found`（假紅 exit 127）
 * 與 `unexpected EOF while looking for matching '`。
 * 行尾的中文標點同理（人在句子末補的「。」不屬於指令）。
 */
function acceptance(line) {
  const i = line.indexOf('驗收=')
  if (i < 0) return null
  return line
    .slice(i + '驗收='.length)
    .replace(/`/g, '')
    .trim()
    .replace(/[。．，、；]+$/u, '')
    .trim()
}

const rows = []
for (const file of planFiles()) {
  const lines = readFileSync(file, 'utf8').split('\n')
  lines.forEach((line, idx) => {
    const done = /^☑/.test(line) || /^- \[x\]/.test(line)
    if (!done) return
    const cmd = acceptance(line)
    rows.push({
      file: file.slice(ROOT.length + 1),
      line: idx + 1,
      what: line.replace(/^☑\s*/, '').slice(0, 60),
      cmd,
    })
  })
}

let pass = 0
let fail = 0
let skip = 0
const failures = []
console.log(`工作單複驗 —— ${planFiles().length} 個計畫檔、${rows.length} 條 ☑（☐ 不跑）`)
for (const r of rows) {
  const tag = `${r.file}:${r.line}`
  if (!r.cmd) {
    skip++
    console.log(`  ⊘ ${tag} 無「驗收=」欄——這種行無法複驗，要補\n      ${r.what}`)
    continue
  }
  if (MUTATING.some((re) => re.test(r.cmd))) {
    skip++
    console.log(`  ⊘ ${tag} 驗收會寫檔（帳本類），CI 跳過\n      ${r.what}`)
    continue
  }
  if (RECURSIVE.some((re) => re.test(r.cmd))) {
    skip++
    console.log(`  ⊘ ${tag} 驗收會叫回閘門本身（自我遞迴），要改寫該行\n      ${r.what}`)
    continue
  }
  let ok = false
  let out = ''
  try {
    out = execFileSync('/bin/bash', ['-c', r.cmd], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: TIMEOUT,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    ok = true
  } catch (e) {
    out = (e.stdout || '') + (e.stderr || '')
    if (e.code === 'ETIMEDOUT') out += `\n（逾時 ${TIMEOUT / 1000}s）`
  }
  if (ok) {
    pass++
    console.log(`  ✓ ${tag} ${r.what}`)
  } else {
    fail++
    failures.push({ ...r, out })
    console.log(`  ✗ ${tag} 驗收失敗 —— ${r.what}`)
  }
  if (VERBOSE && out.trim()) {
    for (const l of out.trim().split('\n').slice(-4)) console.log(`      ${l.slice(0, 160)}`)
  }
}

if (fail) {
  console.log('\n=== 失敗細節（該條成果已不可信，要改回 ☐ 或重做）')
  for (const f of failures) {
    console.log(`\n  ${f.file}:${f.line}\n  指令：${f.cmd.slice(0, 300)}`)
    for (const l of (f.out || '').trim().split('\n').slice(-12)) console.log(`    ${l.slice(0, 200)}`)
  }
}
const pending = planFiles().reduce(
  (n, f) => n + readFileSync(f, 'utf8').split('\n').filter((l) => /^☐/.test(l)).length,
  0,
)
console.log(`\n=== 通過 ${pass}｜失敗 ${fail}｜跳過 ${skip}｜未完成 ☐ ${pending}`)
if (fail) console.log('工作單複驗 — 失敗')
else console.log('工作單複驗 — 全部通過')
process.exit(fail ? 1 : 0)
