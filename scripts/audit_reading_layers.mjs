#!/usr/bin/env node
/**
 * audit_reading_layers.mjs — 三層意譯的「分層閘門」。
 *
 * 為什麼要新增（使用者回饋 2026-11-08）：
 * 「小學生/中學生/大學生 have different level of understanding.
 *   please make sure different number / difficulty of passages are given.」
 * 既有 audit:event-depth 只檢查三層「有冇」，所以 198 組三層全部通過，
 * 但實測中位數比只有 1 : 1.3 : 3.6（中學生層跟小學生層幾乎一樣），
 * 而且 36／198 組連長度都沒有遞增。「有」不等於「有分別」，這裡補後者。
 *
 * 逐條判準（不用總平均，避免少量超長條目拉高指標掩住問題）：
 *   1) 三層文字不可重複
 *   2) 長度必須遞增：elementary ≤ secondary ≤ university
 *   3) university 至少為 elementary 的 3 倍（深度要有東西）
 *   4) secondary 至少為 elementary 的 1.5 倍（中間層不可跟第一層一樣）
 * 另報總體中位數比（目標 1 : 2 : 4），只報不擋，供人工逐步收緊。
 *
 * 用法：
 *   node scripts/audit_reading_layers.mjs
 *   node scripts/audit_reading_layers.mjs --json
 *   node scripts/audit_reading_layers.mjs --selftest   # 驗證閘門有牙
 *   node scripts/audit_reading_layers.mjs --require=src/countries/korea/koancientPack.ts:READINGS#ko-668:university:305
 *     # 唯讀逐條斷言（工作單驗收用）：該 key 條目嘅 university 欄要 ≥305 字，唔夠即 exit 1
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const LAYERS = ['elementary', 'secondary', 'university']
const MIN_UNIVERSITY_RATIO = 3
const MIN_SECONDARY_RATIO = 1.5

/**
 * 逐條字數斷言（唯讀）：`--require=<檔>[:<物件名>]#<key>:<層>:<最少字>`
 *
 * 為什麼要新增（2026-11-28 覆核四國工作單）：`docs/plans/` 入面有八條「補大學生層至
 * 305 字」嘅行，驗收卻只得 `country_check.mjs`（佢只查資料形狀，唔計層字數）。
 * 即係代理改唔改都 exit 0，嗰條 ☑ 永遠係假綠。呢度把「該欄 ≥ N 字」變成會失敗嘅斷言。
 *
 * 點解錨點用 key 唔用行號：實測八條行號有兩條偏咗一行（指去條目之後），行號又會跟住
 * 改檔漂移，照行號斷言會永遠做唔到。
 * 點解要可以加物件名：同一個 key 喺 `READINGS` 同 `DETAILS` 入面各有一塊（引文帳本
 * 都中過同一個坑），只認 key 會拿到另一塊嘅字數——嗰啲係另一條嘅成績，即假綠。
 * 所以同 key 命中超過一塊時一定要寫物件名，唔准揀第一塊。
 */

/** 抓某個欄名所有字串值，連同佢開始嗰一行（--require 用） */
function grabAt(src, key) {
  const re = new RegExp(
    key + ':\\s*(?:\\x27((?:\\\\.|[^\\x27\\\\])*)\\x27|"((?:\\\\.|[^"\\\\])*)"|\\x60((?:\\\\.|[^\\x60\\\\])*)\\x60)',
    'gs',
  )
  const out = []
  for (const m of src.matchAll(re)) {
    out.push({
      line: src.slice(0, m.index).split('\n').length,
      text: (m[1] ?? m[2] ?? m[3] ?? '').trim(),
    })
  }
  return out
}

/** 純判斷：該層現有字數夠唔夠。抽成純函數俾 selftest 離線證明有牙，唔使寫盤 */
function judgeLength(where, len, min) {
  if (len === null) return { ok: false, msg: `${where}｜無呢一層（斷言唔准靜靜通過）` }
  if (len >= min) return { ok: true, msg: `${where} ${len} 字 ≥ ${min}` }
  return { ok: false, msg: `${where} 得 ${len} 字，不足 ${min}（缺 ${min - len}）` }
}

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * 純函數：喺 src 入面搵 `<key>: {` 嗰一塊嘅起止行（只限 <物件名> 嗰個頂層物件之內）。
 * 有歧義就返 { error }，唔准自己揀其中一塊——揀錯塊就係假綠。
 */
function findBlock(src, key, objectName) {
  const lines = src.split('\n')
  let start = 0
  let end = lines.length
  if (objectName) {
    const objRe = new RegExp('^\\s*(?:export\\s+)?(?:const|let|var)\\s+' + escRe(objectName) + '\\b')
    start = lines.findIndex((l) => objRe.test(l))
    if (start < 0) return { error: `物件「${objectName}」喺呢支檔搵唔到` }
    const topRe = /^\s*(?:export\s+)?(?:const|let|var)\s+\w/
    for (let i = start + 1; i < lines.length; i++) {
      if (topRe.test(lines[i])) {
        end = i
        break
      }
    }
  }
  const keyRe = new RegExp('^(\\s*)["\\x27\\x60]?' + escRe(key) + '["\\x27\\x60]?\\s*:\\s*\\{')
  const hits = []
  for (let i = start; i < end; i++) {
    const m = keyRe.exec(lines[i])
    if (m) hits.push({ keyLine: i + 1, indent: m[1].length })
  }
  if (!hits.length) return { error: `搵唔到 key「${key}」` }
  if (hits.length > 1) {
    return {
      error: `key「${key}」喺第 ${hits.map((h) => h.keyLine).join('、')} 行都有（同 key 多塊），要寫明物件名，例 READINGS#${key}`,
    }
  }
  const h = hits[0]
  const closeRe = new RegExp('^\\s{' + h.indent + '}\\}')
  const sibRe = new RegExp('^\\s{' + h.indent + '}["\\x27\\x60]?[\\w-]+["\\x27\\x60]?\\s*:\\s*\\{')
  let blockEnd = end
  for (let i = h.keyLine; i < end; i++) {
    if (closeRe.test(lines[i]) || sibRe.test(lines[i])) {
      blockEnd = i
      break
    }
  }
  return { from: h.keyLine, to: blockEnd }
}

/** 解析 `--require=` 嗰個規格並落盤讀檔判斷（純邏輯喺 findBlock／judgeLength） */
function assertLength(spec) {
  const parts = spec.split(':')
  if (parts.length < 4) {
    return { ok: false, msg: `規格錯：${spec}（要 <檔>[:<物件名>]#<key>:<層>:<最少字>）` }
  }
  const min = Number(parts.pop())
  const layer = parts.pop()
  const head = parts.join(':')
  if (!LAYERS.includes(layer)) return { ok: false, msg: `層名錯：${layer}（得 ${LAYERS.join('/')}）` }
  if (!Number.isInteger(min) || min <= 0) return { ok: false, msg: `最少字數唔啱：${min}` }
  const hash = head.indexOf('#')
  if (hash < 0) return { ok: false, msg: `缺 #key 錨點：${spec}（行號會漂移，斷言唔接行號）` }
  const key = head.slice(hash + 1)
  const filePart = head.slice(0, hash)
  const colon = filePart.lastIndexOf(':')
  const file = colon > 0 ? filePart.slice(0, colon) : filePart
  const objectName = colon > 0 ? filePart.slice(colon + 1) : ''
  const abs = join(ROOT, file)
  if (!existsSync(abs)) return { ok: false, msg: `${file} 唔存在` }
  const blk = findBlock(readFileSync(abs, 'utf8'), key, objectName)
  if (blk.error) return { ok: false, msg: `${file}｜${blk.error}` }
  const hits = grabAt(readFileSync(abs, 'utf8'), layer).filter((h) => h.line > blk.from && h.line <= blk.to)
  if (hits.length > 1) {
    return { ok: false, msg: `${file}#${key}｜第 ${blk.from}–${blk.to} 行內有 ${hits.length} 筆 ${layer}，指唔準邊一筆` }
  }
  const label = `${file}:${objectName ? objectName + '#' : ''}${key}（第 ${blk.from} 行）`
  return judgeLength(label, hits.length ? [...hits[0].text].length : null, min)
}

const requireSpecs = process.argv.filter((a) => a.startsWith('--require='))
if (requireSpecs.length) {
  let bad = 0
  for (const a of requireSpecs) {
    const r = assertLength(a.slice('--require='.length))
    console.log(`  ${r.ok ? '✓' : '✗'} ${r.msg}`)
    if (!r.ok) bad++
  }
  console.log(`audit:reading-layers --require — 斷言 ${requireSpecs.length} 條／失敗 ${bad}`)
  process.exit(bad ? 1 : 0)
}

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    if (f === 'node_modules' || f === 'dist' || f === '.git') continue
    const p = join(dir, f)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (p.endsWith('.ts')) out.push(p)
  }
  return out
}

/** 抓某個欄名的所有字串值（單引號／雙引號／反引號，允許跨行） */
function grab(src, key) {
  const re = new RegExp(
    key + ':\\s*(?:\\x27((?:\\\\.|[^\\x27\\\\])*)\\x27|"((?:\\\\.|[^"\\\\])*)"|\\x60((?:\\\\.|[^\\x60\\\\])*)\\x60)',
    'gs',
  )
  const out = []
  for (const m of src.matchAll(re)) {
    out.push((m[1] ?? m[2] ?? m[3] ?? '').trim())
  }
  return out
}

function collect() {
  const groups = []
  for (const p of walk(join(ROOT, 'src'))) {
    const src = readFileSync(p, 'utf8')
    if (!src.includes('elementary')) continue
    const vals = Object.fromEntries(LAYERS.map((k) => [k, grab(src, k)]))
    const n = Math.min(...LAYERS.map((k) => vals[k].length))
    for (let i = 0; i < n; i++) {
      const g = {}
      LAYERS.forEach((k) => (g[k] = vals[k][i]))
      groups.push({ file: p.slice(ROOT.length + 1), index: i, ...g })
    }
  }
  return groups
}

function median(v) {
  if (!v.length) return 0
  const s = [...v].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

function evaluate(groups) {
  const fails = []
  for (const g of groups) {
    const len = { e: [...g.elementary].length, s: [...g.secondary].length, u: [...g.university].length }
    const why = []
    if (new Set([g.elementary, g.secondary, g.university]).size < 3) why.push('三層文字重複')
    if (!(len.e <= len.s && len.s <= len.u)) why.push('長度未遞增')
    if (len.e > 0 && len.u < len.e * MIN_UNIVERSITY_RATIO) why.push('大學層不足小學生層 3 倍')
    if (len.e > 0 && len.s < len.e * MIN_SECONDARY_RATIO) why.push('中學生層不足小學生層 1.5 倍')
    if (why.length) fails.push({ file: g.file, index: g.index, why, ...len })
  }
  const med = Object.fromEntries(
    [['e', 'elementary'], ['s', 'secondary'], ['u', 'university']].map(([k, name]) => [
      k,
      median(groups.map((g) => [...g[name]].length)),
    ]),
  )
  return { fails, med, total: groups.length }
}

const groups = collect()
const { fails, med, total } = evaluate(groups)

if (process.argv.includes('--selftest')) {
  let bad = 0
  const probe = (name, g, want) => {
    const got = evaluate([g]).fails.length > 0
    console.log(`  ${got === want ? '✓' : '✗'} ${name} → ${got ? '報出' : '沒報'}（期望${want ? '報' : '不報'}）`)
    if (got !== want) bad++
  }
  const good = groups.find(
    (g) => [...g.university].length >= [...g.elementary].length * 4 && [...g.secondary].length >= [...g.elementary].length * 2,
  )
  if (!good) {
    console.log('  ? selftest：找不到合格樣本')
    process.exit(1)
  }
  const base = { file: 't', index: 0, elementary: good.elementary, secondary: good.secondary, university: good.university }
  probe('合格樣本不應誤報', base, false)
  probe('三層同文', { ...base, secondary: base.elementary, university: base.elementary }, true)
  probe('長度倒掛', { ...base, elementary: base.university }, true)
  probe('大學層太短', { ...base, university: base.elementary + '。' }, true)
  probe('中學生層太短', { ...base, secondary: base.elementary + '。' }, true)
  const jl = (name, len, min, want) => {
    const got = judgeLength('t', len, min).ok
    console.log(`  ${got === want ? '✓' : '✗'} 字數斷言 ${name} → ${got ? '通過' : '失敗'}（期望${want ? '通過' : '失敗'}）`)
    if (got !== want) bad++
  }
  jl('字數夠用不應誤報', 8, 8, true)
  jl('少一字都要報', 7, 8, false)
  jl('無呢一層要報', null, 8, false)
  const fb = (name, src, key, objectName, want) => {
    const b = findBlock(src, key, objectName)
    const got = b.error ? '錯' : `${b.from}-${b.to}`
    console.log(`  ${got === want ? '✓' : '✗'} key 錨點 ${name} → ${got}（期望 ${want}）`)
    if (got !== want) bad++
  }
  const two = [
    'const READINGS = {',
    "  'a-1': {",
    "    university: 'x',",
    '  },',
    "  'a-2': { university: 'y' },",
    '}',
    'const DETAILS = {',
    "  'a-1': {",
    "    university: 'z',",
    '  },',
    '}',
    '',
  ].join('\n')
  fb('唯一命中要畀到塊界', two, 'a-1', 'READINGS', '2-3')
  fb('同 key 有兩塊要報歧義', two, 'a-1', '', '錯')
  fb('加物件名可以消歧', two, 'a-1', 'DETAILS', '8-9')
  fb('物件名唔存在要報', two, 'a-1', 'NOPE', '錯')
  fb('key 唔存在要報', two, 'a-9', 'READINGS', '錯')
  console.log(bad ? `✗ 咬合力測試 ${bad} 項失敗` : '✓ 退化情況全部有牙（分層 5 項＋字數斷言 3 項＋key 錨點 5 項）')
  process.exit(bad ? 1 : 0)
}

const ratio = med.e ? `1 : ${(med.s / med.e).toFixed(1)} : ${(med.u / med.e).toFixed(1)}` : 'n/a'
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ total, gap: fails.length, medianRatio: ratio, med, worst: fails.slice(0, 20) }, null, 2))
} else {
  console.log('=== 三層意譯分層（逐條判準，非總平均）===')
  console.log(`  三層組數 ${total}｜不合格 ${fails.length}`)
  console.log(`  中位數比 小:中:大 = ${ratio}   （目標 1 : 2 : 4）`)
  const byFile = {}
  for (const f of fails) byFile[f.file] = (byFile[f.file] || 0) + 1
  for (const [f, n] of Object.entries(byFile).sort((a, b) => b[1] - a[1]).slice(0, 12)) {
    console.log(`  ${String(n).padStart(4)}  ${f}`)
  }
  console.log('\n  不合格範例（前 10）：')
  for (const f of fails.slice(0, 10)) {
    console.log(`    ${f.file} 第 ${f.index + 1} 組 小${f.e}/中${f.s}/大${f.u} → ${f.why.join('；')}`)
  }
  console.log(`\naudit:reading-layers — 三層 ${total} 組／分層不合格 ${fails.length}（中位比 ${ratio}）`)
}

if (process.argv.includes('--fail-on-gap') && fails.length > 0) process.exit(1)
