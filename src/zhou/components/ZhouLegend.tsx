import { zhouFactionColor, zhouFactionName } from '../lib/factionColors'
import { formatZhouYear } from '../lib/formatYear'
import { useZhouYear } from '../state/ZhouYearContext'

export function ZhouLegend() {
  const { year, activeFactions, territoryYear } = useZhouYear()

  return (
    <aside className="faction-legend" aria-label="當前勢力圖例">
      <h2 className="faction-legend__title">
        {formatZhouYear(year)} 年勢力
        {territoryYear !== year ? (
          <span className="faction-legend__sub">
            （疆域採 {formatZhouYear(territoryYear)}）
          </span>
        ) : null}
      </h2>
      <ul className="faction-legend__list">
        {activeFactions.map((id) => (
          <li key={id}>
            <span
              className="faction-legend__swatch"
              style={{ background: zhouFactionColor(id) }}
              aria-hidden
            />
            <span>{zhouFactionName(id)}</span>
          </li>
        ))}
      </ul>
    </aside>
  )
}
