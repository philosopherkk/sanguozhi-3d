#!/usr/bin/env node
/**
 * gen_asia_war_base.mjs — 亞太戰區底圖（經緯度註冊，非手繪）
 *
 * 來源：Natural Earth 1:50m 陸地（world-atlas@2 countries-50m.json，公有領域）
 *   下載：curl -o scripts/.cache/countries-50m.json \
 *         https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json
 * 輸出：src/geo/asiaWarBase.ts —— 陸地輪廓 SVG path + 經緯網 + asiaPx(lon,lat)
 *
 * 坐標系：等圓柱投影；經度正規化入 [60, 420)，畫面顯示 60–190。
 * 選定 60°E 做接縫（SEAM）：張圖要跨過 180°（中途島 177°W），環於接縫切開後，
 * 縫正好於畫面左邊之外，不會出現橫跨太平洋的假陸帶。
 *
 * 覆蓋：經 60–190°、緯 -14–62°：英帕爾、科倫坡、新加坡、荷屬東印度、
 * 澳洲北岸、中途島、阿留申、樺太同北海道德全部入面。
 */
import fs from 'node:fs'
import path from 'node:path'

const SRC = process.argv[2] || 'scripts/.cache/countries-50m.json'
const OUT = path.resolve(import.meta.dirname, '../src/geo/asiaWarBase.ts')

const LON0 = 60, LON1 = 190, LAT0 = -14, LAT1 = 62
const W = 1710, H = 1000
const SEAM = 60
// 0.9px 容差：119KB 資產，地標驗證全過；再粗會抹掉細島
const TOL = Number(process.env.TOL || 0.9)

/** 經度正規化入 [SEAM, SEAM+360) */
function normLon(lon) {
  return SEAM + ((((lon - SEAM) % 360) + 360) % 360)
}

const pxRaw = (lon, lat) => [
  +(((lon - LON0) / (LON1 - LON0)) * W).toFixed(1),
  +(((LAT1 - lat) / (LAT1 - LAT0)) * H).toFixed(1),
]
/** 地標／經緯網用：經度先正規化入 [60,420) */
const px = (lon, lat) => pxRaw(normLon(lon), lat)

/** TopoJSON：delta 解碼 + 量化還原（負數索引係 ~i，要反轉） */
function decodeArc(topo, idx) {
  const t = topo.transform
  const a0 = idx < 0 ? ~idx : idx
  let a = 0, b = 0
  return topo.arcs[a0].map((d) => {
    a += d[0]; b += d[1]
    return [t ? a * t.scale[0] + t.translate[0] : a, t ? b * t.scale[1] + t.translate[1] : b]
  })
}
function ringOf(topo, arcIdxs) {
  const out = []
  for (const i of arcIdxs) {
    let seg = decodeArc(topo, i)
    if (i < 0) seg = seg.slice().reverse()
    if (out.length) seg = seg.slice(1)
    out.push(...seg)
  }
  return out
}

/**
 * 把環展開：先將經度正規化入 [60,420)。如果環的經度跨度超過 180°，
 * 代表有段海岸於「遠端帶」（例如歐洲 30°E 被映射成 390°），把嗰啲點減 360°
 * 之後成個環就連續，不會出現橫跨畫面的假陸帶，亦不使切開環。
 */
function unwrapRing(ring) {
  const pts = ring.map(([lo, la]) => [normLon(lo), la])
  let min = Infinity, max = -Infinity
  for (const [lo] of pts) {
    if (lo < min) min = lo
    if (lo > max) max = lo
  }
  if (max - min <= 180) return pts
  const mid = (min + max) / 2
  return pts.map(([lo, la]) => (lo > mid ? [lo - 360, la] : [lo, la]))
}

/** Douglas–Peucker（開鏈） */
function dp(pts, tol) {
  if (pts.length < 3) return pts
  const keep = new Uint8Array(pts.length)
  keep[0] = keep[pts.length - 1] = 1
  const stack = [[0, pts.length - 1]]
  while (stack.length) {
    const [a, b] = stack.pop()
    if (b <= a + 1) continue
    let maxD = -1, idx = -1
    const [x1, y1] = pts[a], [x2, y2] = pts[b]
    const dx = x2 - x1, dy = y2 - y1
    const len = Math.hypot(dx, dy) || 1e-9
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + x2 * y1 - y2 * x1) / len
      if (d > maxD) { maxD = d; idx = i }
    }
    if (maxD > tol) {
      keep[idx] = 1
      stack.push([a, idx], [idx, b])
    }
  }
  return pts.filter((_, i) => keep[i])
}

/**
 * 封閉環簡化：不可以對「首尾同點」的環直接落 DP（基線長 0，成個環會塌晒）。
 * 方法：去重尾點，搵最遠兩點分兩段，分段 DP 再砌返。
 */
function simplifyRing(pts, tol) {
  let ring = pts
  if (ring.length > 3 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]) {
    ring = ring.slice(0, -1)
  }
  const n = ring.length
  if (n < 5) return ring
  let a = 0, b = 0, maxD = -1
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = Math.hypot(ring[i][0] - ring[j][0], ring[i][1] - ring[j][1])
      if (d > maxD) { maxD = d; a = i; b = j }
    }
  }
  if (a > b) { const t = a; a = b; b = t }
  const c1 = dp(ring.slice(a, b + 1), tol)
  const c2 = dp(ring.slice(b).concat(ring.slice(0, a + 1)), tol)
  return c1.concat(c2.slice(1, -1))
}

const area = (pts) => {
  let s = 0
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    s += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1])
  }
  return Math.abs(s / 2)
}

const toPath = (pts) => 'M' + pts.map(([x, y]) => `${x} ${y}`).join('L') + 'Z'
const inside = (poly, p) => {
  let c = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi || 1e-9) + xi) c = !c
  }
  return c
}

// ---------- 主流程 ----------
const topo = JSON.parse(fs.readFileSync(path.resolve(SRC), 'utf8'))
// 用合併後的 land（無現代國界，避免把今天的邊界帶入歷史地圖）
const rawLand = topo.objects.land ? topo.objects.land.geometries ?? [] : topo.objects.countries.geometries
const land = []
const testRings = []
let ringsIn = 0, polysKept = 0

for (const g of rawLand) {
  if (!g || g.type === 'GeometryCollection') continue
  // TopoJSON：Polygon.arcs = [ring]；MultiPolygon.arcs = [polygon[ring]]
  const polygons = g.type === 'Polygon' ? [g.arcs] : g.type === 'MultiPolygon' ? g.arcs : []
  for (const rings of polygons) {
    const d = []
    for (const arcIdxs of rings) {
      ringsIn++
      const piece = unwrapRing(ringOf(topo, arcIdxs))
      // 只做 bbox 相交篩選，不剪裁凹多邊形（剪裁會整爛南亞、中南半島、澳洲北岸）
      let minLo = Infinity, maxLo = -Infinity, minLa = Infinity, maxLa = -Infinity
      for (const [lo, la] of piece) {
        if (lo < minLo) minLo = lo
        if (lo > maxLo) maxLo = lo
        if (la < minLa) minLa = la
        if (la > maxLa) maxLa = la
      }
      if (maxLo < LON0 || minLo > LON1 || maxLa < LAT0 || minLa > LAT1) continue
      const projected = piece.map(([lo, la]) => pxRaw(lo, la))
      const simple = simplifyRing(projected, TOL)
      // 簡化後面積偏差過大就保留原環（不要把海灣、海峽抹走）
      const a0 = area(projected), a1 = area(simple)
      const use = simple.length >= 3 && (a0 === 0 || Math.abs(a1 - a0) / Math.max(a0, 1) < 0.02)
        ? simple
        : projected
      if (use.length < 3) continue
      let sx0 = Infinity, sx1 = -Infinity, sy0 = Infinity, sy1 = -Infinity
      for (const [x, y] of use) {
        if (x < sx0) sx0 = x
        if (x > sx1) sx1 = x
        if (y < sy0) sy0 = y
        if (y > sy1) sy1 = y
      }
      if (sx1 - sx0 < 0.6 && sy1 - sy0 < 0.6) continue // 篩走噪點，細島保留
      testRings.push(use)
      d.push(toPath(use))
    }
    if (d.length) {
      land.push(d.join(''))
      polysKept++
    }
  }
}

const grat = []
for (let lo = 70; lo < LON1; lo += 10) {
  const [x1, y1] = px(lo, LAT0), [x2, y2] = px(lo, LAT1)
  grat.push(`M${x1} ${y1}L${x2} ${y2}`)
}
for (let la = -10; la <= 60; la += 10) {
  const [x1, y1] = px(LON0, la), [x2, y2] = px(LON1, la)
  grat.push(`M${x1} ${y1}L${x2} ${y2}`)
}

const body = `/**
 * 亞太戰區底圖（自動生成，不要手改）
 *
 * 資料：Natural Earth 1:50m 陸地（world-atlas@2 countries-50m.json，公有領域）
 * 生成：node scripts/gen_asia_war_base.mjs scripts/.cache/countries-50m.json
 * 投影：等圓柱；畫面經 ${LON0}–${LON1}°、緯 ${LAT0}–${LAT1}°；畫布 ${W}×${H}
 * 渲染：陸地 path 用 fill-rule="evenodd"；勢力範圍用 clipPath 夾於陸地之上
 */

export const ASIA_WAR_W = ${W}
export const ASIA_WAR_H = ${H}
export const ASIA_LON0 = ${LON0}
export const ASIA_LON1 = ${LON1}
export const ASIA_LAT0 = ${LAT0}
export const ASIA_LAT1 = ${LAT1}

/** 經緯度 -> 畫布像素（同底圖同一套坐標；經度先正規化入 [60,420)） */
export function asiaPx(lon: number, lat: number): [number, number] {
  const seam = ASIA_LON0
  const lo = seam + ((((lon - seam) % 360) + 360) % 360)
  return [
    +(((lo - ASIA_LON0) / (ASIA_LON1 - ASIA_LON0)) * ASIA_WAR_W).toFixed(1),
    +(((ASIA_LAT1 - lat) / (ASIA_LAT1 - ASIA_LAT0)) * ASIA_WAR_H).toFixed(1),
  ]
}

export const ASIA_GRATICULE: string[] = [
${grat.map((dd) => `  '${dd}',`).join('\n')}
]

export const ASIA_LAND: string[] = [
${land.map((dd) => `  '${dd}',`).join('\n')}
]
`
fs.writeFileSync(OUT, body, 'utf8')
const bytes = Buffer.byteLength(body)
console.log(`rings in=${ringsIn} kept=${testRings.length} polys=${polysKept} grat=${grat.length} asset=${(bytes / 1024).toFixed(0)}KB`)

// ---------- 驗證：地標應該落於陸地／海面 ----------
const MARKS = [
  ['新加坡', 103.82, 1.35, true], ['雅加達', 106.85, -6.2, true],
  ['曼德勒', 96.08, 21.98, true], ['英帕爾', 93.94, 24.81, true],
  ['中途島', -177.37, 28.21, false], ['東京', 139.69, 35.69, true],
  ['那霸', 127.68, 26.21, true], ['臺北', 121.51, 25.04, true],
  ['塞班', 145.73, 15.18, true], ['珍珠港', -157.95, 21.35, false],
  ['達爾文內陸', 131.0, -12.8, true], ['科倫坡', 79.86, 6.93, true],
  ['威克島', 166.63, 19.28, false], ['阿圖島', 172.9, 52.83, true],
]
let bad = 0
for (const [name, lo, la, wantLand] of MARKS) {
  const p = px(lo, la)
  const hit = testRings.some((poly) => inside(poly, p))
  const ok = hit === wantLand
  if (!ok) bad++
  console.log(`  ${ok ? 'OK ' : 'BAD'} ${name} -> ${hit ? '陸' : '海'}（期望${wantLand ? '陸' : '海'}）`)
}
console.log(bad === 0 ? '地標驗證全部通過' : `地標驗證 ${bad} 個不啱`)

// ---------- ASCII 預覽：無圖都得看吓shape啱不啱 ----------
if (process.argv.includes('--preview')) {
  const COLS = 118, ROWS = 40
  const bbox = testRings.map((poly) => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
    for (const [x, y] of poly) {
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
    return [x0, x1, y0, y1]
  })
  for (let r = 0; r < ROWS; r++) {
    const y = ((r + 0.5) / ROWS) * H
    let line = ''
    for (let c = 0; c < COLS; c++) {
      const x = ((c + 0.5) / COLS) * W
      let hit = false
      for (let i = 0; i < testRings.length; i++) {
        const [x0, x1, y0, y1] = bbox[i]
        if (x < x0 || x > x1 || y < y0 || y > y1) continue
        if (inside(testRings[i], [x, y])) { hit = true; break }
      }
      line += hit ? '#' : '.'
    }
    console.log(line)
  }
}
