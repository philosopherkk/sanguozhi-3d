import {
  sengokuFactionColor,
  sengokuFactionName,
} from '../lib/factionColors'
import { useSengokuSelection } from '../state/SengokuSelectionContext'
import { useSengokuYear } from '../state/SengokuYearContext'

export function SengokuLegend() {
  const { year, activeFactions, territoryYear } = useSengokuYear()
  const { selectedFaction, selectFaction } = useSengokuSelection()

  return (
    <div className="faction-legend">
      <p className="faction-legend__title">
        {year} 年勢力（疆域快照 {territoryYear}）
      </p>
      <ul className="faction-legend__list">
        {activeFactions.map((id) => (
          <li key={id}>
            <button
              type="button"
              className={
                selectedFaction === id
                  ? 'faction-legend__btn is-active'
                  : 'faction-legend__btn'
              }
              onClick={() =>
                selectFaction(selectedFaction === id ? null : id)
              }
            >
              <i style={{ background: sengokuFactionColor(id) }} />
              {sengokuFactionName(id)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
