import { PROVINCES, type Province, type ProvinceId } from '../data/provinces'
import type { ProvinceControl } from '../data/territoryControl'
import type { FactionId } from '../types/data'

/** Approximate planar area from lon/lat ring (deg², cos-lat corrected). Schematic only. */
export function provinceArea(province: Province): number {
  const ring = province.ring
  if (ring.length < 3) return 0
  let lat0 = 0
  for (const [, lat] of ring) lat0 += lat
  lat0 /= ring.length
  const cos = Math.cos((lat0 * Math.PI) / 180)

  let sum = 0
  for (let i = 0; i < ring.length; i++) {
    const [lon1, lat1] = ring[i]
    const [lon2, lat2] = ring[(i + 1) % ring.length]
    sum += lon1 * cos * lat2 - lon2 * cos * lat1
  }
  return Math.abs(sum) / 2
}

const AREA_BY_ID: Record<ProvinceId, number> = Object.fromEntries(
  PROVINCES.map((p) => [p.id, provinceArea(p)]),
) as Record<ProvinceId, number>

export interface FactionTerritoryStat {
  faction: FactionId
  provinceCount: number
  provinces: ProvinceId[]
  area: number
  /** Share of mapped land area, 0–100 */
  percent: number
}

export function territoryStatsForControl(
  control: ProvinceControl,
): FactionTerritoryStat[] {
  const buckets = new Map<
    FactionId,
    { provinces: ProvinceId[]; area: number }
  >()

  for (const p of PROVINCES) {
    const faction = control[p.id]
    if (!faction) continue
    const cur = buckets.get(faction) ?? { provinces: [], area: 0 }
    cur.provinces.push(p.id)
    cur.area += AREA_BY_ID[p.id] ?? 0
    buckets.set(faction, cur)
  }

  let totalArea = 0
  for (const b of buckets.values()) totalArea += b.area
  if (totalArea <= 0) totalArea = 1

  const rows: FactionTerritoryStat[] = []
  for (const [faction, b] of buckets) {
    rows.push({
      faction,
      provinceCount: b.provinces.length,
      provinces: b.provinces,
      area: b.area,
      percent: (b.area / totalArea) * 100,
    })
  }

  rows.sort((a, b) => b.area - a.area || b.provinceCount - a.provinceCount)
  return rows
}
