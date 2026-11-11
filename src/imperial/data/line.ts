import type { MarchRoute } from '../../data/marchRoutes'
import type { Pt } from './waypoints'

export function line(
  id: string,
  name: string,
  year: number,
  faction: string,
  source: string,
  points: Pt[],
): MarchRoute {
  return {
    id,
    name,
    year,
    faction,
    source,
    points: points.map(([x, y]) => [x, y]),
  }
}

/** 海路（kind:'sea'）：RouteOverlay 繪虛線並標「（海路）」；audit:map 按海路口徑判定，落陸點過半即 fail。 */
export function seaLine(
  id: string,
  name: string,
  year: number,
  faction: string,
  source: string,
  points: Pt[],
): MarchRoute {
  return { ...line(id, name, year, faction, source, points), kind: 'sea' }
}
