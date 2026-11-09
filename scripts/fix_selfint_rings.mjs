#!/usr/bin/env node
/**
 * fix_selfint_rings.mjs — 把 ERA_RINGS 中自我相交（破圖）的環做局部去交叉。
 *
 * 背景（使用者回饋）：「Terroritories are definitely not polygonal... must optimize」。
 * audit:war-shape 查出 ERA_RINGS 有 23 個環自我相交（多為 realm_* 大emap色塊），
 * SVG nonzero 填充下會產生空洞／反色斑塊。成因：光柵輪廓轉多邊形時單點自疊。
 *
 * 做法（保守、可審計）：逐環找第一處交叉線段，比較兩側子鏈長度，
 * 只剪走較小的那一圈（figure-8 拆環），重複到無交叉或達上限。
 * 面積變化僅限於小圈，不改變整體輪廓；每環記錄剪除點數與迭代次數。
 *
 * 用法：node scripts/fix_selfint_rings.mjs          # 就地修改 src/geo/eraRegions.ts
 *      node scripts/fix_selfint_rings.mjs --check  # 只報告不寫檔
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const FILE = join(ROOT, 'src/geo/eraRegions.ts')

function segInt(a, b, c, d) {
  const d1 = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
  const d2 = (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0])
  const d3 = (c[0] - d[0]) * (a[1] - c[1]) - (c[1] - d[1]) * (a[0] - c[0])
  const d4 = (c[0] - d[0]) * (b[1] - c[1]) - (c[1] - d[1]) * (b[0] - c[0])
  return (d1 > 0) !== (d2 > 0) && (d3 > 0) !== (d4 > 0)
}

function firstCrossing(ring) {
  const n = ring.length - 1
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue
      if (segInt(ring[i], ring[i + 1], ring[j], ring[j + 1])) return [i, j]
    }
  }
  return null
}

/**
 * 拆環：搵到交叉後保留較大嗰側子圈（figure-8 拆環）。
 * 教訓（2026-11-09）：序列化必須保留原檔 `x.0` 數字格式——
 * audit_map_accuracy 用正則解析座標，丟咗小數點會令佨漏讀一半註冊表，
 * 一度把成功修復誤判成「剪走錨點」（乾淨 main 對照先搵到真因）。
 */
function uncrossOnce(ring) {
  const cross = firstCrossing(ring)
  if (!cross) return null
  const [i, j] = cross
  const lenA = j - i
  const lenB = ring.length - 1 - (j - i)
  const kept = lenA >= lenB ? ring.slice(i, j + 1) : ring.slice(0, i + 1).concat(ring.slice(j + 1))
  return { ring: kept, removed: ring.length - kept.length }
}

function fixRing(ring) {
  let cur = ring.map((p) => [p[0], p[1]])
  let removed = 0
  let iters = 0
  while (iters < 300) {
    const r = uncrossOnce(cur)
    if (!r) break
    cur = r.ring
    removed += r.removed
    iters++
    if (cur.length < 4) return null
  }
  return firstCrossing(cur) ? null : { ring: cur, removed, iters }
}

/** 序列化保留原檔格式：座標一律一位小數（1421.0），同 gen 腳本輸出一致 */
function ringsToString(rings) {
  const f = (n) => Number(n).toFixed(1)
  return '[' + rings.map((r) => '[' + r.map((p) => `[${f(p[0])},${f(p[1])}]`).join(',') + ']').join(',') + ']'
}

const check = process.argv.includes('--check')
let src = readFileSync(FILE, 'utf8')
let fixedCount = 0
let removedTotal = 0
const report = []

// 逐個受測 key 處理：ERA_RINGS 的值是「環的數組」，同 key 可能多環（realm_qing_high）
const ERA = JSON.parse(src.match(/ERA_RINGS[^=]*=\s*(\{[\s\S]*\})\s*;?\s*$/m)[1])
for (const [key, rings] of Object.entries(ERA)) {
  const bad = rings.some((r) => firstCrossing(r) !== null)
  if (!bad) continue
  const fixedRings = rings.map((r) => {
    if (!firstCrossing(r)) return r
    const f = fixRing(r)
    if (!f) {
      report.push(`  ？ ${key}: 有一環剪不乾淨，保留原樣（需人工）`)
      return r
    }
    removedTotal += f.removed
    return f.ring
  })
  // 就地文字替換：搵 `"key":` 之後第一個 `[`，用括號深度圈住整個值
  const needle = `"${key}":`
  const at = src.indexOf(needle)
  if (at < 0) { report.push(`  ？ ${key}: 搵唔到文字位置，跳過`); continue }
  const start = src.indexOf('[', at)
  let depth = 0, end = start
  for (let p = start; p < src.length; p++) {
    if (src[p] === '[') depth++
    else if (src[p] === ']') { depth--; if (depth === 0) { end = p + 1; break } }
  }
  const oldLen = rings.reduce((s2, r) => s2 + r.length, 0)
  const newLen = fixedRings.reduce((s2, r) => s2 + r.length, 0)
  if (!check) {
    src = src.slice(0, at) + `"${key}":` + ringsToString(fixedRings) + src.slice(end)
  }
  report.push(`  ✓ ${key}: 環數 ${rings.length}｜點數 ${oldLen} → ${newLen}（剪走 ${oldLen - newLen}）`)
  fixedCount++
}

if (!check && fixedCount) writeFileSync(FILE, src)
console.log(`${check ? '[只檢查] ' : ''}修正 ${fixedCount} 個 key，共剪走 ${removedTotal} 個自疊點`)
for (const line of report) console.log(line)
