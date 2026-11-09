#!/usr/bin/env node
/**
 * audit_war_shape.mjs — 疆域色塊的「几何品質」閘門。
 *
 * 為什麼要新增（使用者回饋 2026-11-09）：「maps are fact. Territories are definitely
 * not polygonal in shape. so the occupied region have to be precise and accurate.」
 * 本專案多數勢力範圍是「經緯示意框 × 陸地」生成，因此內陸邊必然是直線段，
 * 看起來就是矩形；但既有 audit:map 只量海陸一致性，完全沒檢查形状本身。
 *
 * 指標：
 *   schematic  最長共線段佔環周長 > 0.25（直邊明顯）或點數 < 12 的環
 *   selfInt    自我相交（會產生破圖/空洞）的環
 * 只對 ≤400 點的環做自我相交檢測（O(n²) 成本可控）。
 *
 * 用法：node scripts/audit_war_shape.mjs [--json] [--selftest]
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const STRAIGHT_LIMIT = 0.25
const MIN_POINTS = 12

function collinearRatio(ring) {
  if (ring.length < 8) return 1
  const dirs = []
  for (let i = 0; i < ring.length - 1; i++) {
    dirs.push(Math.atan2(ring[i + 1][1] - ring[i][1], ring[i + 1][0] - ring[i][0]))
  }
  let best = 1, cur = 1
  for (let i = 1; i < dirs.length; i++) {
    if (Math.abs(dirs[i] - dirs[i - 1]) < 0.08) cur++
    else { best = Math.max(best, cur); cur = 1 }
  }
  return Math.max(best, cur) / dirs.length
}

function segInt(a, b, c, d) {
  const d1 = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
  const d2 = (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0])
  const d3 = (c[0] - d[0]) * (a[1] - c[1]) - (c[1] - d[1]) * (a[0] - c[0])
  const d4 = (c[0] - d[0]) * (b[1] - c[1]) - (c[1] - d[1]) * (b[0] - c[0])
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0))
}

function selfIntersecting(ring) {
  const n = Math.min(ring.length - 1, 400)
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue
      if (segInt(ring[i], ring[i + 1], ring[j], ring[j + 1])) return true
    }
  }
  return false
}

/** 把 SVG path 的 d 還原成點（只支援本專案用的 M/L/Z，含小數） */
function ringsFromPath(d) {
  const rings = []
  let cur = []
  for (const m of d.matchAll(/([MLZmlz])\s*(-?[\d.]+)[,\s]+(-?[\d.]+)/g)) {
    if (cur.length && m[1].toUpperCase() === 'M') { rings.push(cur); cur = [] }
    if (m[1].toUpperCase() !== 'Z') cur.push([parseFloat(m[2]), parseFloat(m[3])])
  }
  if (cur.length) rings.push(cur)
  return rings
}

function collect() {
  const all = []
  const era = JSON.parse(
    readFileSync(join(ROOT, 'src/geo/eraRegions.ts'), 'utf8').match(/ERA_RINGS[^=]*=\s*(\{[\s\S]*\})\s*;?\s*$/m)[1],
  )
  for (const [k, rings] of Object.entries(era)) {
    for (const r of rings) all.push({ key: k, ring: r.map((p) => [p[0], p[1]]), src: 'eraRegions' })
  }
  const aw = readFileSync(join(ROOT, 'src/geo/asiaWarTerritory.ts'), 'utf8')
  for (const m of aw.matchAll(/id:\s*'([^']+)'[\s\S]*?d:\s*'([^']+)'/g)) {
    for (const r of ringsFromPath(m[2])) all.push({ key: m[1], ring: r, src: 'asiaWarTerritory' })
  }
  return all
}

function evaluate(all) {
  const schematic = [], selfInt = []
  for (const g of all) {
    if (g.ring.length < 4) continue
    if (g.ring.length < MIN_POINTS || collinearRatio(g.ring) > STRAIGHT_LIMIT) schematic.push(g)
    else if (g.ring.length <= 400 && selfIntersecting(g.ring)) selfInt.push(g)
  }
  return { schematic, selfInt, total: all.length }
}

const all = collect()
const { schematic, selfInt, total } = evaluate(all)

if (process.argv.includes('--selftest')) {
  const box = [[0, 0], [100, 0], [100, 50], [0, 50], [0, 0]]
  const bowtie = [[0, 0], [100, 0], [0, 100], [100, 100], [0, 0]]
  let bad = 0
  const chk = (name, cond) => { console.log(`  ${cond ? '✓' : '✗'} ${name}`); if (!cond) bad++ }
  chk('矩形應被判定為示意框', collinearRatio(box) > STRAIGHT_LIMIT)
  chk('自我相交 bowtie 應被抓到', selfIntersecting(bowtie))
  const wavy = []
  for (let i = 0; i < 200; i++) wavy.push([i, Math.sin(i / 3) * 20])
  chk('真實曲折邊界不应誤報', collinearRatio(wavy) <= STRAIGHT_LIMIT)
  console.log(bad ? `✗ selftest ${bad} 項失敗` : '✓ 几何偵測有牙')
  process.exit(bad ? 1 : 0)
}

const bySrc = {}
for (const g of schematic) bySrc[g.src] = (bySrc[g.src] || 0) + 1

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ total, schematic: schematic.length, selfInt: selfInt.length,
    bySource: bySrc, worst: schematic.slice(0, 30).map((g) => ({ key: g.key, pts: g.ring.length, src: g.src })),
    selfIntList: selfInt.slice(0, 60).map((g) => ({ key: g.key, pts: g.ring.length, src: g.src })) }, null, 2))
} else {
  console.log('=== 疆域几何品質（真實邊界不應是矩形／長直段）===')
  console.log(`  受測環 ${total}｜示意框形狀 ${schematic.length}｜自我相交 ${selfInt.length}`)
  for (const [s, n] of Object.entries(bySrc)) console.log(`    ${s}: ${n}`)
  console.log('\n  最像矩形的前 12 個：')
  for (const g of schematic.slice(0, 12)) console.log(`    ${g.key.padEnd(26)} 點數 ${String(g.ring.length).padStart(5)}  ${g.src}`)
  console.log(`\naudit:war-shape — 受測 ${total}｜示意框 ${schematic.length}｜自我相交 ${selfInt.length}`)
}
