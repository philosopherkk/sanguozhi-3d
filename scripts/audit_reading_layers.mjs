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
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const LAYERS = ['elementary', 'secondary', 'university']
const MIN_UNIVERSITY_RATIO = 3
const MIN_SECONDARY_RATIO = 1.5

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
  console.log(bad ? `✗ 咬合力測試 ${bad} 項失敗` : '✓ 五種退化情況全部有牙')
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
