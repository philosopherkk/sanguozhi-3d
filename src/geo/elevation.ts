/**
 * Stylised but geographically grounded elevation for 東漢末–三國疆域.
 * Ridge / basin centres approximate 譚其驤《中國歷史地圖集》第三冊 theatre.
 * Units: world metres (exaggerated for readability).
 */

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v))
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

function dist2(lon: number, lat: number, lon0: number, lat0: number) {
  const dx = (lon - lon0) * Math.cos((lat0 * Math.PI) / 180)
  const dy = lat - lat0
  return Math.sqrt(dx * dx + dy * dy)
}

/** Distance to a great-circle–ish polyline in lon/lat degrees. */
function distToPolyline(
  lon: number,
  lat: number,
  pts: readonly (readonly [number, number])[],
): number {
  let best = Infinity
  for (let i = 0; i < pts.length - 1; i++) {
    const [lon1, lat1] = pts[i]
    const [lon2, lat2] = pts[i + 1]
    const ax = lon - lon1
    const ay = lat - lat1
    const bx = lon2 - lon1
    const by = lat2 - lat1
    const t = clamp((ax * bx + ay * by) / (bx * bx + by * by + 1e-9), 0, 1)
    const px = lon1 + bx * t
    const py = lat1 + by * t
    best = Math.min(best, dist2(lon, lat, px, py))
  }
  return best
}

function ridge(
  lon: number,
  lat: number,
  pts: readonly (readonly [number, number])[],
  height: number,
  widthDeg: number,
) {
  const d = distToPolyline(lon, lat, pts)
  return height * Math.exp(-(d * d) / (2 * widthDeg * widthDeg))
}

function dome(lon: number, lat: number, lon0: number, lat0: number, h: number, r: number) {
  const d = dist2(lon, lat, lon0, lat0)
  return h * Math.exp(-(d * d) / (2 * r * r))
}

function basin(lon: number, lat: number, lon0: number, lat0: number, depth: number, r: number) {
  const d = dist2(lon, lat, lon0, lat0)
  return -depth * Math.exp(-(d * d) / (2 * r * r))
}

/** Soft coastline mask: ocean → 0, land → 1 */
function landMask(lon: number, lat: number): number {
  // Bohai / Yellow Sea / East China Sea rough cut
  let sea = 0
  if (lon > 119 && lat > 30 && lat < 41) sea = Math.max(sea, smoothstep(119, 122.5, lon))
  if (lon > 120 && lat < 32) sea = Math.max(sea, smoothstep(120, 123, lon) * smoothstep(32, 24, lat))
  if (lon > 117 && lat < 24) sea = Math.max(sea, smoothstep(116, 120, lon))
  // 海南外海
  if (lat < 20 && lon > 108) sea = Math.max(sea, smoothstep(20.5, 18, lat))
  return 1 - clamp(sea, 0, 1)
}

const QINLING: [number, number][] = [
  [104.5, 34.0],
  [107.0, 34.1],
  [109.0, 34.0],
  [111.0, 34.2],
  [113.0, 33.8],
]

const TAIHANG: [number, number][] = [
  [113.0, 40.5],
  [113.5, 38.5],
  [113.2, 36.5],
  [112.8, 35.0],
]

const DABA: [number, number][] = [
  [106.0, 32.2],
  [108.0, 32.0],
  [110.0, 31.8],
  [111.5, 31.5],
]

const WUYI: [number, number][] = [
  [116.5, 28.5],
  [117.5, 27.0],
  [118.0, 25.5],
]

const NANLING: [number, number][] = [
  [110.0, 24.8],
  [112.5, 24.5],
  [115.0, 24.2],
  [117.0, 24.5],
]

const HENGDUAN: [number, number][] = [
  [99.0, 30.0],
  [100.5, 28.5],
  [102.0, 27.0],
  [103.0, 25.5],
]

const YINSHAN: [number, number][] = [
  [106.0, 41.0],
  [110.0, 41.2],
  [114.0, 41.0],
]

/**
 * Returns elevation in world units (0 ≈ coastal plain, ~2.2 青藏高原東緣).
 */
export function sampleElevation(lon: number, lat: number): number {
  const land = landMask(lon, lat)
  if (land < 0.05) return -0.08

  let h = 0.12 // base plain

  // 青藏高原 / 雲貴高原 east rim
  h += dome(lon, lat, 100.5, 33.0, 1.85, 6.5)
  h += dome(lon, lat, 103.0, 26.5, 1.1, 4.0)

  // Ranges
  h += ridge(lon, lat, QINLING, 0.95, 0.55)
  h += ridge(lon, lat, TAIHANG, 0.7, 0.45)
  h += ridge(lon, lat, DABA, 0.75, 0.5)
  h += ridge(lon, lat, WUYI, 0.55, 0.4)
  h += ridge(lon, lat, NANLING, 0.5, 0.45)
  h += ridge(lon, lat, HENGDUAN, 1.2, 0.7)
  h += ridge(lon, lat, YINSHAN, 0.45, 0.5)

  // 山東丘陵
  h += dome(lon, lat, 118.0, 36.2, 0.35, 1.4)
  // 大別山
  h += dome(lon, lat, 115.5, 31.2, 0.4, 1.1)
  // 呂梁 / 晉西
  h += dome(lon, lat, 111.2, 37.5, 0.35, 1.3)

  // Basins & plains (carve)
  h += basin(lon, lat, 104.5, 30.2, 0.85, 2.2) // 四川盆地
  h += basin(lon, lat, 114.5, 34.5, 0.25, 3.5) // 華北平原
  h += basin(lon, lat, 118.5, 32.0, 0.2, 2.0) // 江淮
  h += basin(lon, lat, 112.5, 28.2, 0.22, 2.2) // 兩湖
  h += basin(lon, lat, 108.8, 34.3, 0.35, 1.0) // 關中
  h += basin(lon, lat, 106.9, 33.1, 0.4, 0.7) // 漢中

  // Micro-relief noise (stable hash)
  const n =
    Math.sin(lon * 12.9898 + lat * 78.233) * 43758.5453
  const noise = (n - Math.floor(n)) * 0.06 - 0.03
  h += noise

  h = Math.max(h, 0.02)
  return h * land + -0.08 * (1 - land)
}

export type TerrainKind = 'ocean' | 'plain' | 'hill' | 'mountain' | 'highland'

export function classifyTerrain(h: number): TerrainKind {
  if (h < 0) return 'ocean'
  if (h < 0.22) return 'plain'
  if (h < 0.45) return 'hill'
  if (h < 1.0) return 'mountain'
  return 'highland'
}

/** Soft hypsometric tint for a painted-relief look */
export function terrainColor(h: number): [number, number, number] {
  if (h < 0) return [0.1, 0.32, 0.48]
  if (h < 0.1) return [0.55, 0.68, 0.42] // coastal plain — warm green
  if (h < 0.2) return [0.48, 0.62, 0.36]
  if (h < 0.32) return [0.58, 0.6, 0.38] // hills — olive
  if (h < 0.48) return [0.62, 0.52, 0.36] // foothills — ochre
  if (h < 0.72) return [0.58, 0.48, 0.4] // mountain — taupe
  if (h < 1.05) return [0.62, 0.58, 0.54]
  if (h < 1.45) return [0.72, 0.72, 0.7]
  return [0.9, 0.92, 0.94] // snow / high plateau
}
