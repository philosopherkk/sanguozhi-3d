import type { MarchRoute } from '../../data/marchRoutes'
import {
  isMarchRouteVisible,
  MARCH_ROUTE_VISIBLE_YEARS,
} from './RouteOverlay'
import { usePersistedOpenResponsive } from '../../lib/usePersistedOpen'

/**
 * 行軍路線說明盒。窄屏（≤640px）對首次訪客收起成一行摘要「行軍路線 · N 條」，
 * 免得清單蓋住小地圖大半（見 mobile.css 修 16）；桌面預設展開。
 * 使用者收過或開過之後跟 localStorage，不再受預設影響。
 */
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
  const [open, setOpen] = usePersistedOpenResponsive('map-route-legend-open', {
    desktop: true,
    mobile: false,
  })
  const rows = routes.filter((r) =>
    isMarchRouteVisible(r.year, year, visibleYears),
  )
  if (rows.length === 0) return null
  return (
    <aside
      className={open ? 'route-legend' : 'route-legend route-legend--collapsed'}
      aria-label="行軍路線"
    >
      <h3>
        <button
          type="button"
          className="route-legend__toggle"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          行軍路線{open ? null : ` · ${rows.length} 條`}
        </button>
      </h3>
      {open ? (
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
      ) : null}
    </aside>
  )
}
