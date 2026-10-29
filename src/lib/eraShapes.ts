import polygonClipping from 'polygon-clipping'
import type { RingPt } from './mergeFactionPolygons'

export interface EraShape {
  faction: string
  rings: RingPt[][]
  labelAt: RingPt
}

function ringArea(ring: RingPt[]): number {
  let a = 0
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i]
    const [x2, y2] = ring[(i + 1) % ring.length]
    a += x1 * y2 - x2 * y1
  }
  return Math.abs(a) / 2
}

function centroid(ring: RingPt[]): RingPt {
  let x = 0
  let y = 0
  for (const [a, b] of ring) {
    x += a
    y += b
  }
  return [x / ring.length, y / ring.length]
}

function closeRing(ring: RingPt[]): [number, number][] {
  const pts = ring.map(([x, y]) => [x, y] as [number, number])
  const [x0, y0] = pts[0]
  const [xn, yn] = pts[pts.length - 1]
  if (x0 !== xn || y0 !== yn) pts.push([x0, y0])
  return pts
}

/** 同一勢力先併成外輪廓。相接的省塊不再各自描邊。離島仍可另成一環。 */
function uniteRings(rings: RingPt[][]): RingPt[][] {
  if (rings.length <= 1) return rings
  try {
    let acc: polygonClipping.Geom | null = null
    for (const ring of rings) {
      const piece: polygonClipping.Geom = [[closeRing(ring)]]
      acc = acc ? polygonClipping.union(acc, piece) : piece
    }
    if (!acc) return rings
    const outer: RingPt[][] = []
    for (const polygon of acc) {
      const shell = polygon[0]
      if (!shell || shell.length < 4) continue
      outer.push(shell.map((pt) => [pt[0], pt[1]]))
    }
    return outer.length > 0 ? outer : rings
  } catch {
    return rings
  }
}

/**
 * 非三國時代只畫這批環。不讀 provinces.ts，也不讀 basemapProvinceRings。
 * 每個勢力先併成一塊（或數個離島），描邊只剩外海岸。
 */
export function shapesFromExtensions(
  extras: { faction: string; rings: RingPt[][] }[] | undefined,
): EraShape[] {
  const grouped = new Map<string, RingPt[][]>()
  for (const extra of extras ?? []) {
    const list = grouped.get(extra.faction) ?? []
    for (const ring of extra.rings) {
      if (ring.length >= 3) list.push(ring)
    }
    if (list.length > 0) grouped.set(extra.faction, list)
  }
  const out: { shape: EraShape; area: number }[] = []
  for (const [faction, parts] of grouped) {
    const rings = uniteRings(parts)
    let best = rings[0]
    let bestArea = 0
    let total = 0
    for (const ring of rings) {
      const area = ringArea(ring)
      total += area
      if (area > bestArea) {
        bestArea = area
        best = ring
      }
    }
    out.push({
      shape: { faction, rings, labelAt: centroid(best) },
      area: total,
    })
  }
  out.sort((a, b) => b.area - a.area)
  return out.map((item) => item.shape)
}

export function extensionAreaStats(
  extras: { faction: string; rings: RingPt[][] }[] | undefined,
): { faction: string; pieceCount: number; percent: number }[] {
  const buckets = new Map<string, { pieces: number; area: number }>()
  let total = 0
  for (const extra of extras ?? []) {
    const bucket = buckets.get(extra.faction) ?? { pieces: 0, area: 0 }
    for (const ring of extra.rings) {
      if (ring.length < 3) continue
      bucket.pieces += 1
      const area = ringArea(ring)
      bucket.area += area
      total += area
    }
    buckets.set(extra.faction, bucket)
  }
  return [...buckets.entries()]
    .map(([faction, bucket]) => ({
      faction,
      pieceCount: bucket.pieces,
      percent: total > 0 ? (bucket.area / total) * 100 : 0,
    }))
    .sort((a, b) => b.percent - a.percent || b.pieceCount - a.pieceCount)
}
