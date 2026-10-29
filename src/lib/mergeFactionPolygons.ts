import polygonClipping from 'polygon-clipping'
import { basemapRingsForProvince, type ImgPt } from '../data/basemapProvinces'
import { LAND_MASK_RING } from '../geo/landMask'
import { PROVINCES, type ProvinceId } from '../data/provinces'
import type { ProvinceControl } from '../data/territoryControl'
import type { FactionId } from '../types/data'

export type LonLat = [number, number]
export type RingPt = [number, number]

export interface FactionTerritoryShape {
  faction: FactionId
  /** Outer rings after union + land clip (may be multi-polygon). */
  rings: RingPt[][]
  provinceIds: ProvinceId[]
  labelAt: RingPt
  /** True when intersection with land mask removed offshore area */
  clippedToLand: boolean
}

function closeRing(ring: RingPt[]): RingPt[] {
  if (ring.length < 3) return ring
  const [x0, y0] = ring[0]
  const [xn, yn] = ring[ring.length - 1]
  if (x0 === xn && y0 === yn) return ring
  return [...ring, [x0, y0]]
}

function ringCentroid(ring: RingPt[]): RingPt {
  let x = 0
  let y = 0
  const n = ring.length
  for (const [a, b] of ring) {
    x += a
    y += b
  }
  return [x / n, y / n]
}

function ringArea(ring: RingPt[]): number {
  let a = 0
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i]
    const [x2, y2] = ring[(i + 1) % ring.length]
    a += x1 * y2 - x2 * y1
  }
  return a / 2
}

function geomArea(geom: polygonClipping.Geom): number {
  let total = 0
  for (const polygon of geom) {
    const outer = polygon[0]
    if (!outer || outer.length < 3) continue
    const ring: RingPt[] = []
    for (const pt of outer) {
      if (!Array.isArray(pt) || pt.length < 2) continue
      ring.push([Number(pt[0]), Number(pt[1])])
    }
    total += Math.abs(ringArea(ring))
  }
  return total
}

function geomToRings(geom: polygonClipping.Geom): RingPt[][] {
  const rings: RingPt[][] = []
  for (const polygon of geom) {
    const outer = polygon[0]
    if (!outer || outer.length < 3) continue
    const ring: RingPt[] = []
    for (const pt of outer) {
      if (!Array.isArray(pt) || pt.length < 2) continue
      ring.push([Number(pt[0]), Number(pt[1])])
    }
    if (ring.length >= 3) rings.push(ring)
  }
  return rings
}

function buildLandGeom(rings: RingPt[][]): polygonClipping.Geom {
  let united: polygonClipping.Geom | null = null
  for (const ring of rings) {
    const g: polygonClipping.Geom = [[closeRing(ring)]]
    united = united ? polygonClipping.union(united, g) : g
  }
  return united ?? [[[0, 0], [0, 1], [1, 1], [0, 0]]]
}

const GEO_LAND_GEOM = buildLandGeom([LAND_MASK_RING])

/** Intersect merged rings with a land mask. */
export function clipRingsToLand(
  rings: RingPt[][],
  landGeom: polygonClipping.Geom = GEO_LAND_GEOM,
): {
  rings: RingPt[][]
  clipped: boolean
  areaBefore: number
  areaAfter: number
} {
  let united: polygonClipping.Geom | null = null
  for (const ring of rings) {
    const g: polygonClipping.Geom = [[closeRing(ring)]]
    united = united ? polygonClipping.union(united, g) : g
  }
  if (!united) {
    return { rings: [], clipped: false, areaBefore: 0, areaAfter: 0 }
  }
  const areaBefore = geomArea(united)
  let clippedGeom: polygonClipping.Geom
  try {
    clippedGeom = polygonClipping.intersection(united, landGeom)
  } catch {
    return {
      rings: geomToRings(united),
      clipped: false,
      areaBefore,
      areaAfter: areaBefore,
    }
  }
  const areaAfter = geomArea(clippedGeom)
  const clipped = areaAfter < areaBefore * 0.985
  return {
    rings: geomToRings(clippedGeom),
    clipped,
    areaBefore,
    areaAfter,
  }
}

/** Basemap rings are already coastline-clipped; keep a stable API for callers. */
export function clipBasemapRing(ring: RingPt[]): RingPt[][] {
  if (ring.length < 3) return []
  return [closeRing(ring)]
}

/** Factions whose offshore area was removed in the last merge (for diagnostics). */
export let lastLandClipReport: { faction: FactionId; cutRatio: number }[] = []

function pickLabelRing(rings: RingPt[][]): RingPt {
  let best = rings[0]
  let bestArea = 0
  for (const r of rings) {
    const a = Math.abs(ringArea(r))
    if (a > bestArea) {
      bestArea = a
      best = r
    }
  }
  return ringCentroid(best)
}

function mergeFromProvinceRings(
  control: ProvinceControl,
  ringsFor: (id: ProvinceId) => RingPt[][],
  landGeom: polygonClipping.Geom | null,
): FactionTerritoryShape[] {
  const byFaction = new Map<FactionId, { id: ProvinceId; rings: RingPt[][] }[]>()
  for (const p of PROVINCES) {
    const faction = control[p.id]
    if (!faction) continue
    const rings = ringsFor(p.id)
    if (rings.length === 0) continue
    const list = byFaction.get(faction) ?? []
    list.push({ id: p.id, rings })
    byFaction.set(faction, list)
  }

  const out: FactionTerritoryShape[] = []
  const clipReport: { faction: FactionId; cutRatio: number }[] = []

  for (const [faction, entries] of byFaction) {
    let united: polygonClipping.Geom | null = null
    for (const { rings } of entries) {
      for (const ring of rings) {
        const g: polygonClipping.Geom = [[closeRing(ring)]]
        united = united ? polygonClipping.union(united, g) : g
      }
    }
    if (!united) continue

    let rings: RingPt[][]
    let clipped = false
    if (landGeom) {
      const beforeRings = geomToRings(united)
      const clippedResult = clipRingsToLand(beforeRings, landGeom)
      rings = clippedResult.rings
      clipped = clippedResult.clipped
      if (
        clipped &&
        clippedResult.areaBefore > 0
      ) {
        clipReport.push({
          faction,
          cutRatio: 1 - clippedResult.areaAfter / clippedResult.areaBefore,
        })
      }
    } else {
      // Basemap province rings are already land-clipped; skip a full-frame intersect.
      rings = geomToRings(united)
    }
    if (rings.length === 0) continue

    out.push({
      faction,
      rings,
      provinceIds: entries.map((e) => e.id),
      labelAt: pickLabelRing(rings),
      clippedToLand: clipped || landGeom === null,
    })
  }

  lastLandClipReport = clipReport
  out.sort((a, b) => b.provinceIds.length - a.provinceIds.length)
  return out
}

function controlCacheKey(control: ProvinceControl): string {
  const parts: string[] = []
  for (const p of PROVINCES) {
    const f = control[p.id]
    if (f) parts.push(`${p.id}:${f}`)
  }
  return parts.join('|')
}

const basemapMergeCache = new Map<string, FactionTerritoryShape[]>()

/** Group provinces by faction (lon/lat rings) — used by 3D map. */
export function mergeFactionTerritories(
  control: ProvinceControl,
): FactionTerritoryShape[] {
  return mergeFromProvinceRings(
    control,
    (id) => {
      const p = PROVINCES.find((x) => x.id === id)
      return p ? [p.ring as LonLat[]] : []
    },
    GEO_LAND_GEOM,
  )
}

/**
 * Merge using modern-relief pixel rings (already clipped to that coastline).
 * Results are cached by control signature — year scrub often reuses the same snapshot.
 */
export function mergeFactionTerritoriesBasemap(
  control: ProvinceControl,
): FactionTerritoryShape[] {
  const key = controlCacheKey(control)
  const hit = basemapMergeCache.get(key)
  if (hit) return hit
  const shapes = mergeFromProvinceRings(
    control,
    (id) => basemapRingsForProvince(id) as ImgPt[][],
    null,
  )
  basemapMergeCache.set(key, shapes)
  return shapes
}

/** Union extra basemap rings into faction shapes. Label sits on the largest ring. */
export function unionExtraRings(
  shapes: FactionTerritoryShape[],
  extras: { faction: string; rings: RingPt[][] }[] | undefined,
): FactionTerritoryShape[] {
  if (!extras || extras.length === 0) return shapes
  const map = new Map(shapes.map((shape) => [String(shape.faction), shape]))
  const grouped = new Map<string, RingPt[][]>()
  for (const extra of extras) {
    const list = grouped.get(extra.faction) ?? []
    list.push(...extra.rings)
    grouped.set(extra.faction, list)
  }
  for (const [faction, extraRings] of grouped) {
    const existing = map.get(faction)
    const rings = [...(existing?.rings ?? []), ...extraRings]
    let united: polygonClipping.Geom | null = null
    for (const ring of rings) {
      if (ring.length < 3) continue
      const piece: polygonClipping.Geom = [[closeRing(ring)]]
      if (!united) {
        united = piece
        continue
      }
      try {
        united = polygonClipping.union(united, piece)
      } catch {
        // A ring that will not union stays out of this piece.
      }
    }
    if (!united) continue
    const outRings = geomToRings(united)
    if (outRings.length === 0) continue
    let best = outRings[0]
    let bestArea = 0
    for (const ring of outRings) {
      const area = Math.abs(ringArea(ring))
      if (area > bestArea) {
        bestArea = area
        best = ring
      }
    }
    map.set(faction, {
      faction: faction as FactionId,
      rings: outRings,
      provinceIds: existing?.provinceIds ?? [],
      labelAt: ringCentroid(best),
      clippedToLand: existing?.clippedToLand ?? true,
    })
  }
  return [...map.values()].sort(
    (a, b) => b.provinceIds.length - a.provinceIds.length,
  )
}

