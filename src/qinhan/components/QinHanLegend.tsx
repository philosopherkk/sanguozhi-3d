import { qinHanFactionColor, qinHanFactionName } from '../lib/factionColors'
import { formatQinHanYear } from '../lib/formatYear'
import { useQinHanYear } from '../state/QinHanYearContext'

export function QinHanLegend() {
  const { year, activeFactions, territoryYear } = useQinHanYear()

  return (
    <aside className="faction-legend" aria-label="當前勢力圖例">
      <h2 className="faction-legend__title">
        {formatQinHanYear(year)} 年勢力
        {territoryYear !== year ? (
          <span className="faction-legend__sub">
            （疆域採 {formatQinHanYear(territoryYear)}）
          </span>
        ) : null}
      </h2>
      <ul className="faction-legend__list">
        {activeFactions.map((id) => (
          <li key={id}>
            <span
              className="faction-legend__swatch"
              style={{ background: qinHanFactionColor(id) }}
              aria-hidden
            />
            <span>{qinHanFactionName(id)}</span>
          </li>
        ))}
      </ul>
    </aside>
  )
}
