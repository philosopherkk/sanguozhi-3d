import type { MarchRoute } from '../../data/marchRoutes'
import {
  isMarchRouteVisible,
  MARCH_ROUTE_VISIBLE_YEARS,
} from './RouteOverlay'

export function MapRouteLegend({
  routes,
  year,
  formatYear = (y) => String(y),
  visibleYears = MARCH_ROUTE_VISIBLE_YEARS,
}: {
  routes: MarchRoute[]
  year: number
  formatYear?: (year: number) => string
  visibleYears?: number
}) {
  const rows = routes.filter((r) =>
    isMarchRouteVisible(r.year, year, visibleYears),
  )
  if (rows.length === 0) return null
  return (
    <aside className="route-legend" aria-label="行軍路線">
      <h3>行軍路線</h3>
      <ul>
        {rows.map((r) => (
          <li key={r.id}>
            <strong>
              {formatYear(r.year)} {r.name}
            </strong>
            <span>{r.source}</span>
          </li>
        ))}
      </ul>
    </aside>
  )
}
