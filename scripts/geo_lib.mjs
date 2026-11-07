/**
 * geo_lib.mjs — 亞洲—太平洋戰區地圖的共用地理工具
 *
 * 資料：Natural Earth 1:50m（world-atlas@2 countries-50m.json，公有領域）
 * 使用者：scripts/gen_asia_war_base.mjs（陸地底圖）、
 *       scripts/gen_asia_war_territory.mjs（勢力範圍，剪裁到真實海岸線）
 */
import fs from 'node:fs'

export const LON0 = 60, LON1 = 190, LAT0 = -14, LAT1 = 62
export const W = 1710, H = 1000
export const SEAM = 60
export const DEFAULT_TOL = 0.9

/** 經度正規化入 [SEAM, SEAM+360) */
export function normLon(lon) {
  return SEAM + ((((lon - SEAM) % 360) + 360) % 360)
}

export const pxRaw = (lon, lat) => [
  +(((lon - LON0) / (LON1 - LON0)) * W).toFixed(1),
  +(((LAT1 - lat) / (LAT1 - LAT0)) * H).toFixed(1),
]
export const px = (lon, lat) => pxRaw(normLon(lon), lat)

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
export function ringOf(topo, arcIdxs) {
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
 * 環展開：經度正規化之後，如果環的跨度超過 180°，把遠端帶的點減 360°，
 * 令成個環連續。不樣會拖出一條橫跨太平洋的假陸帶，even-odd 填充會把海面變陸。
 */
export function unwrapRing(ring) {
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

/** 讀入 Natural Earth，回傳 MultiPolygon（已展開經度；保留原始精度給剪裁用） */
export function loadLandMultiPolygon(srcPath) {
  const topo = JSON.parse(fs.readFileSync(srcPath, 'utf8'))
  const geoms = topo.objects.land ? topo.objects.land.geometries ?? [] : topo.objects.countries.geometries
  const multi = []
  for (const g of geoms) {
    if (!g || g.type === 'GeometryCollection') continue
    const polygons = g.type === 'Polygon' ? [g.arcs] : g.type === 'MultiPolygon' ? g.arcs : []
    for (const rings of polygons) {
      const ringsOut = rings
        .map((arcIdxs) => unwrapRing(ringOf(topo, arcIdxs)))
        .filter((r) => r.length >= 3)
      if (ringsOut.length) multi.push(ringsOut)
    }
  }
  return multi
}

/** 讀入 Natural Earth 陸地，供 even-odd 命中測試用（環陣列） */
export function loadLandRings(srcPath) {
  const topo = JSON.parse(fs.readFileSync(srcPath, 'utf8'))
  const geoms = topo.objects.land ? topo.objects.land.geometries ?? [] : topo.objects.countries.geometries
  const rings = []
  for (const g of geoms) {
    if (!g || g.type === 'GeometryCollection') continue
    const polygons = g.type === 'Polygon' ? [g.arcs] : g.type === 'MultiPolygon' ? g.arcs : []
    for (const poly of polygons) for (const arcIdxs of poly) {
      const r = unwrapRing(ringOf(topo, arcIdxs))
      if (r.length >= 3) rings.push(r)
    }
  }
  return rings
}

/** 經緯度矩形 -> 閉合環（[lon,lat]） */
export function rectRing(lonA, latA, lonB, latB) {
  const a = normLon(lonA), b = normLon(lonB)
  const lo = Math.min(a, b), hi = Math.max(a, b)
  const la = Math.min(latA, latB), ha = Math.max(latA, latB)
  return [[lo, la], [hi, la], [hi, ha], [lo, ha], [lo, la]]
}

export function bboxOf(ring) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
  for (const [x, y] of ring) {
    if (x < x0) x0 = x
    if (x > x1) x1 = x
    if (y < y0) y0 = y
    if (y > y1) y1 = y
  }
  return [x0, x1, y0, y1]
}

/** Douglas–Peucker（開鏈） */
export function dp(pts, tol) {
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

/** 封閉環簡化：去重尾點，搵最遠兩點分兩段，分段 DP 再砌返 */
export function simplifyRing(pts, tol) {
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

export const area = (pts) => {
  let s = 0
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    s += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1])
  }
  return Math.abs(s / 2)
}

export const toPath = (pts) => 'M' + pts.map(([x, y]) => `${x} ${y}`).join('L') + 'Z'

export const inside = (poly, p) => {
  let c = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi || 1e-9) + xi) c = !c
  }
  return c
}