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
