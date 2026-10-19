import { factionColor, factionName } from '../lib/factionColors'
import { useYear } from '../state/YearContext'

export function FactionLegend() {
  const { year, activeFactions, territoryYear } = useYear()

  return (
    <aside className="faction-legend" aria-label="當前勢力圖例">
      <h2 className="faction-legend__title">
        {year} 年勢力
        {territoryYear !== year ? (
          <span className="faction-legend__sub">（疆域採 {territoryYear}）</span>
        ) : null}
      </h2>
      <ul className="faction-legend__list">
        {activeFactions.map((id) => (
          <li key={id}>
            <span
              className="faction-legend__swatch"
              style={{ background: factionColor(id) }}
              aria-hidden
            />
            <span>{factionName(id)}</span>
          </li>
        ))}
      </ul>
    </aside>
  )
}
