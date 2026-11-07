/**
 * 由 SVG path（僅含 M/L/Z 直線段，即 scripts/gen_asia_war_territory.mjs 之產物）
 * 計算區域標籤錨點：取面積最大的 subpath 之多邊形形心；若各 subpath 皆近線状
 * （面積趨零，例如千島列島這種細碎島鏈），則退回全部座標之外框中心。
 */
const cache = new Map<string, [number, number]>()

export function pathLabelPoint(d: string): [number, number] {
  const hit = cache.get(d)
  if (hit !== undefined) return hit

  let best: { area: number; pt: [number, number] } | null = null
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const sub of d.match(/M[^MZ]*/g) ?? []) {
    const nums = sub.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? []
    const pts: [number, number][] = []
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const x = nums[i]
      const y = nums[i + 1]
      pts.push([x, y])
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
    let twice = 0
    let cx = 0
    let cy = 0
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i]
      const [x2, y2] = pts[(i + 1) % pts.length]
      const cross = x1 * y2 - x2 * y1
      twice += cross
      cx += (x1 + x2) * cross
      cy += (y1 + y2) * cross
    }
    if (Math.abs(twice) < 1e-6) continue
    const pt: [number, number] = [cx / (3 * twice), cy / (3 * twice)]
    const area = Math.abs(twice / 2)
    if (!best || area > best.area) best = { area, pt }
  }

  const point: [number, number] =
    best?.pt ?? [(minX + maxX) / 2, (minY + maxY) / 2]
  cache.set(d, point)
  return point
}
