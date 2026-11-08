#!/usr/bin/env node
/**
 * audit:quotes 的契約測試。
 *
 * 為什麼要有這一支：package.json 的 `test` 一度指向一個從未入库的檔案，
 * 而 CI 又沒有跑 `npm run test`，所以「test 全綠」一直是空話（2026-11-08 查實）。
 * 這裡測的不是字數，而是下游 scripts/legacy 四支鑑證工具真正依賴的欄位契約，
 * 以及「匯總行被改名、護欄抽唔到數」這一個真實發生過的失效模式。
 *
 * 用法：npm run test
 */
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const ROWS_FILE = join(ROOT, 'reports', 'quotes-audit.json')
let failures = 0

function check(name, ok, detail = '') {
  if (ok) {
    console.log(`  ok  ${name}${detail ? '  ' + detail : ''}`)
    return
  }
  failures += 1
  console.error(`  FAIL ${name}${detail ? '  ' + detail : ''}`)
}

/**
 * 欄位契約：下游 closest-witness / verifier-teeth / human-decision-sheet 照呢啲欄位讀。
 * state 詞彙（照 scripts/audit_quotes.mjs 的實際取值，唔係憑空定）：
 *   na         引文欄位係動態拼接／非字串，無從逐字查證
 *   verified   已在 Wikisource 逐字對上
 *   unverified 有引文但尚未查證
 *   paraphrase 明確標明是意譯
 *   stale      曾查證但原文已改動
 */
const STATES = new Set(['na', 'verified', 'unverified', 'paraphrase', 'stale'])
function validate(doc) {
  const problems = []
  if (!doc || !Array.isArray(doc.rows)) {
    problems.push('缺少 rows 陣列')
    return problems
  }
  const tally = {}
  for (const [i, r] of doc.rows.entries()) {
    for (const key of ['file', 'line', 'key', 'kind', 'state']) {
      if (r[key] === undefined || r[key] === null || r[key] === '') problems.push(`第 ${i} 行缺 ${key}`)
    }
    if (r.state && !STATES.has(r.state)) problems.push(`第 ${i} 行 state 未知：${r.state}`)
    // 號稱逐字原文卻沒有引文內容或沒有出處，下游會被誤導成「可查證」
    if (r.kind === 'original' && !(r.quote || '').trim()) problems.push(`第 ${i} 行 kind=original 但 quote 空`)
    if (r.state === 'verified' && !(r.source || '').trim()) problems.push(`第 ${i} 行 state=verified 但無 source`)
    tally[r.state] = (tally[r.state] ?? 0) + 1
  }
  const sum = Object.values(tally).reduce((a, b) => a + b, 0)
  if (sum !== doc.rows.length) problems.push(`state 計數 ${sum} 不等於 rows ${doc.rows.length}`)
  return problems
}

console.log('1) 真實輸出：跑 audit:quotes 並檢查匯總行可被護欄抽到')
const out = execSync('node scripts/audit_quotes.mjs', { cwd: ROOT, encoding: 'utf8', maxBuffer: 64e6 })
const sumLine = out.split('\n').find((l) => l.includes('合計'))
check('存在「合計」匯總行', Boolean(sumLine), sumLine ? sumLine.trim().slice(0, 64) : '')
// gate-ci.mjs 用錨定在「合計」的正則抽數；若輸出格式改了，護欄會抽唔到數而靜默失效
const errHit = out.match(/合計：[^\n]*錯誤 (\d+)/)
const warnHit = out.match(/合計：[^\n]*提醒 (\d+)/)
check('護欄式正則能抽到 errors', Boolean(errHit), errHit ? `= ${errHit[1]}` : '')
check('護欄式正則能抽到 warns', Boolean(warnHit), warnHit ? `= ${warnHit[1]}` : '')
// 陷阱本身要鎖住：gate-ci 如果退化返用未錨定的 /錯誤 (\d+)/，會量到第一個檔案嘅數字
const gateSrc = readFileSync(join(ROOT, 'scripts', 'gate-ci.mjs'), 'utf8')
check(
  'gate-ci 用錨定在合計行的比對式',
  /合計：\[[^\]]*\]?\*?錯誤/.test(gateSrc) && /合計：[^\n]*錯誤 \(\\d\+\)/.test(gateSrc),
)
check(
  'gate-ci 未使用未錨定的 /錯誤 (\\d+)/（否則會量到單一檔案）',
  !/metrics:[^\n]*\/錯誤 \(\\d\+\)\//.test(gateSrc),
)
check(
  'gate-ci 對無法抽取的指標會硬性失敗（禁止靜默跳過）',
  gateSrc.includes('__miss_') && /process\.exit\(1\)/.test(gateSrc),
)

console.log('2) --rows 契約：reports/quotes-audit.json 欄位齊備')
execSync('node scripts/audit_quotes.mjs --rows', { cwd: ROOT, encoding: 'utf8', maxBuffer: 64e6 })
check('JSON 已寫出', existsSync(ROWS_FILE))
const doc = JSON.parse(readFileSync(ROWS_FILE, 'utf8'))
check('真實輸出通過契約', validate(doc).length === 0, validate(doc).slice(0, 3).join('；'))

console.log('3) 反例測試：契約破壞時必須報錯（測試自己有牙）')
const bad = [
  ['缺欄位', { rows: [{ file: 'a.ts', line: 1, key: 'x' }] }, '缺 kind'],
  ['未知 state', { rows: [{ file: 'a.ts', line: 1, key: 'x', kind: 'quote', state: 'watever', source: '《史記》' }] }, 'state 未知'],
  ['original 無引文', { rows: [{ file: 'a.ts', line: 1, key: 'x', kind: 'original', state: 'verified', quote: '', source: '《史記》' }] }, 'quote 空'],
  ['verified 無出處', { rows: [{ file: 'a.ts', line: 1, key: 'x', kind: 'original', state: 'verified', quote: '湯始居亳', source: '' }] }, '無 source'],
]
for (const [name, payload, expect] of bad) {
  const probs = validate(payload)
  check(`反例「${name}」被抓到`, probs.some((p) => p.includes(expect)), probs[0] ?? '無問題＝測試已失去作用')
}
check('反例「缺 rows 陣列」被抓到', validate({}).some((p) => p.includes('rows')))

console.log(failures ? `\ntest — 失敗 ${failures} 項` : '\ntest — 全部通過')
process.exit(failures ? 1 : 0)
