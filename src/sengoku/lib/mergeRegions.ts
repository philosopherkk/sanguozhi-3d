import { SENGOKU_REGIONS } from '../data/regions'
import type {
  SengokuFactionId,
  SengokuRegionControl,
  SengokuRegionId,
} from '../types'

export interface SengokuFactionShape {
  faction: SengokuFactionId
  rings: [number, number][][]
  regionIds: SengokuRegionId[]
  labelAt: [number, number]
}

function ringCentroid(ring: [number, number][]): [number, number] {
  let x = 0
  let y = 0
  for (const [a, b] of ring) {
    x += a
    y += b
  }
  const n = ring.length || 1
  return [x / n, y / n]
}

/** Group region rings by faction (no sea clip — inland archipelago schematic). */
export function mergeSengokuFactionShapes(
  control: SengokuRegionControl,
): SengokuFactionShape[] {
  const byFaction = new Map<
    SengokuFactionId,
    { rings: [number, number][][]; regionIds: SengokuRegionId[] }
  >()

  for (const region of SENGOKU_REGIONS) {
    const faction = control[region.id]
    if (!faction) continue
    const cur = byFaction.get(faction) ?? { rings: [], regionIds: [] }
    for (const ring of region.rings) cur.rings.push(ring)
    cur.regionIds.push(region.id)
    byFaction.set(faction, cur)
  }

  const out: SengokuFactionShape[] = []
  for (const [faction, { rings, regionIds }] of byFaction) {
    if (rings.length === 0) continue
    const largest = rings.reduce((a, b) => (a.length >= b.length ? a : b))
    out.push({
      faction,
      rings,
      regionIds,
      labelAt: ringCentroid(largest),
    })
  }
  out.sort((a, b) => b.regionIds.length - a.regionIds.length)
  return out
}
