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
 *     或該行從來就 exit 0）→ 計入失敗並 exit 1；
 *   - ☐ 列不跑（還未做），只在結尾報數量。
 *
 *     或當初根本是假綠）→ exit 1，列入 gate-ci 當硬閘門。
 *   - ☐ 列不跑（還未做），只在結尾報數量。
 *
 * 另有一項靜態覆核（`anchorProblems`）：凡行帶 `audit_reading_layers.mjs --require=`
 * 逐條斷言，斷言目標（檔:物件#key:層）必須與行首自己嘅錨點完全相同，形態亦要完整。
 * 2026-11-28 實錄：三條行嘅 `--require` 寫住上一條 key，代理補錯 key 都會變綠。
 * 斷言「而家已經綠」嘅 ☐ 只提示 ⚠（行滯後），唔計失敗。
 *
 * 安全：驗收指令是用 bash 跑的，所以**拒絕執行會寫檔的指令**
 * （`--mark`／`--apply`／`--fix`／`-i`），否則 CI 會把帳本改到髒；
 * 該列計為 SKIP（會印出來，但不列入成績）。工作單作者在這種行要改用不寫檔的驗收。
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
  for (const day of readdirSync(PLANS, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    // docs/plans 得返一個直接擲入嘅 .md（例：臨時筆記）就會 scandir 崩潰，
    // 而呢支係 CI 閘門：閘門本身唔准因為檔放錯層就整支死。
    if (!day.isDirectory()) continue
    const dir = join(PLANS, day.name)
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

/**
 * 行首錨點 ≡ 該行自己嘅逐條斷言（2026-11-28 實錄）：三條「補大學生層至 305 字」
 * 行嘅 `--require` 寫住上一行嘅 key（複製貼上漏改）。後果係代理補錯 key、兩行靠
 * 同一個 key 交貨都會變綠，而真正嗰條照樣短——☑ 完全冇驗到嘢。
 * 逐條斷言而家應該係紅；已經綠嘅 ☐ 代表條行滯後（要改 ☑ 或改緊目標），只提示唔計失敗。
 */
const SELF_ANCHOR = /^(src\/[^\s｜:]+):(\w+)#([\w.-]+)/
const REQUIRE = /audit_reading_layers\.mjs\s+--require=(\S+)/g
const LAYER_NAMES = ['elementary', 'secondary', 'university']
/** 引文帳本嗰類逐條斷言（`audit_quotes.mjs --check '<檔>#<key>'`）同一個坑，一齊查。
 *  行首錨點用冒號（工作單慣例 `檔:錨點`），帳本鍵用井字（工具格式 `檔#key`），要歸一。 */
const SELF_KEY = /^`?(src\/[^\s｜`'"]+?)[:#]([\w.-]+)/
const QUOTE_CHECK = /audit_quotes\.mjs\s+--check\s+['"`]?([^\s'"`｜；;]+)/g

function anchorProblems() {
  const bad = []
  const stale = []
  for (const file of planFiles()) {
    const rel = file.slice(ROOT.length + 1)
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((raw, idx) => {
        const body = raw.replace(/^[☐☑]\s*/, '').replace(/^- \[[ x]\]\s*/, '')
        const reqs = [...body.matchAll(REQUIRE)]
        const checks = [...body.matchAll(QUOTE_CHECK)]
        if (!reqs.length && !checks.length) return
        const tag = `${rel}:${idx + 1}`
        // 引文帳本類：行首錨點係「檔#key」（冇物件名），斷言目標要一樣
        if (!reqs.length && checks.length) {
          const own = SELF_KEY.exec(body)
          if (!own) {
            bad.push(`${tag}｜有 --check 斷言但行首無「檔#key」錨點，無法核對目標`)
            return
          }
          const want = `${own[1]}#${own[2]}`
          for (const m of checks) {
            const target = m[1].replace(/^[\"'`]|['\"`]$/g, '')
            if (target !== want) {
              bad.push(`${tag}｜行首係 ${want}，斷言卻指 ${target}`)
            }
          }
          return
        }
        const own = SELF_ANCHOR.exec(body)
        if (!own) {
          bad.push(`${tag}｜有逐條斷言但行首無「檔:物件#key」錨點，無法核對目標`)
          return
        }
        const want = `${own[1]}:${own[2]}#${own[3]}`
        for (const m of reqs) {
          const spec = m[1].replace(/^["']|["']$/g, '')
          const parts = spec.split(':')
          if (parts.length !== 4 || !parts[1].includes('#')) {
            bad.push(`${tag}｜斷言形態唔對（要係 檔:物件#key:層:最少字）：${spec}`)
            continue
          }
          const [f, objKey, layer, min] = parts
          const [obj, key] = objKey.split('#')
          if (`${f}:${obj}#${key}` !== want) {
            bad.push(`${tag}｜行首係 ${want}，斷言卻指 ${f}:${obj}#${key}`)
            continue
          }
          if (!/^\d+$/.test(min)) {
            bad.push(`${tag}｜最少字數唔係數字：${spec}`)
            continue
          }
          if (!LAYER_NAMES.includes(layer)) {
            bad.push(`${tag}｜層名要係 ${LAYER_NAMES.join('|')}：${layer}`)
            continue
          }
          if (/^☐/.test(raw) && assertGreen(spec)) {
            stale.push(`${tag}｜${key}:${layer} 已達 ${min} 字（條行尚未勾，驗收驗唔到嘢）`)
          }
        }
      })
  }
  return { bad, stale }
}

/** 唯讀跑一次該條斷言：只用於提示，唔計入成績 */
function assertGreen(spec) {
  try {
    execFileSync('node', ['scripts/audit_reading_layers.mjs', `--require=${spec}`], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 60_000,
      stdio: ['ignore', 'ignore', 'ignore'],
    })
    return true
  } catch {
    return false
  }
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

const { bad: anchorBad, stale: anchorStale } = anchorProblems()
for (const msg of anchorStale) console.log(`  ⚠ 錨點滯後 —— ${msg}`)
for (const msg of anchorBad) console.log(`  ✗ 錨點錯位 —— ${msg}`)
fail += anchorBad.length

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
