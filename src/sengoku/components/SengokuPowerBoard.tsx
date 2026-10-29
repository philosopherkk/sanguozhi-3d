import { useMemo } from 'react'
import { FactionSituationPanel } from '../../components/FactionSituationPanel'
import { composeFactionYear, type YearNote } from '../../lib/factionYearView'
import { SENGOKU_SITUATION } from '../data/factionSituation'
import { SENGOKU_REGIONS } from '../data/regions'
import timelineData from '../data/timeline.json'
import {
  sengokuFactionColor,
  sengokuFactionName,
} from '../lib/factionColors'
import { useSengokuSelection } from '../state/SengokuSelectionContext'
import { useSengokuYear } from '../state/SengokuYearContext'
import type { SengokuFactionId, SengokuTimelineEvent } from '../types'

const events = timelineData as SengokuTimelineEvent[]

export function SengokuPowerBoard() {
  const { year, control, territoryYear } = useSengokuYear()
  const { selectedFaction, selectFaction } = useSengokuSelection()

  const rows = useMemo(() => {
    const counts = new Map<SengokuFactionId, number>()
    for (const r of SENGOKU_REGIONS) {
      const f = control[r.id]
      if (!f) continue
      counts.set(f, (counts.get(f) ?? 0) + 1)
    }
    return [...counts.entries()]
      .map(([faction, n]) => ({ faction, n }))
      .sort((a, b) => b.n - a.n)
  }, [control])
  const situation = useMemo(() => {
    if (!selectedFaction) return null
    const notes: YearNote[] = events
      .filter(
        (event) =>
          event.year === year && event.factions.includes(selectedFaction),
      )
      .map((event) => ({
        title: event.title,
        desc: event.desc,
        source: event.source,
      }))
    return composeFactionYear(SENGOKU_SITUATION[selectedFaction], year, notes)
  }, [selectedFaction, year])

  return (
    <div className="power-board">
      <p className="power-board__title">勢力佔區（{territoryYear} 快照）</p>
      {selectedFaction && situation ? (
        <FactionSituationPanel
          name={sengokuFactionName(selectedFaction)}
          yearLabel={`${year} 年`}
          color={sengokuFactionColor(selectedFaction)}
          view={situation}
          onClose={() => selectFaction(null)}
        />
      ) : null}
      <ul className="power-board__list">
        {rows.map(({ faction, n }) => {
          const active = selectedFaction === faction
          return (
            <li key={faction}>
              <button
                type="button"
                className={
                  active
                    ? 'power-board__row power-board__row--btn is-active'
                    : 'power-board__row power-board__row--btn'
                }
                aria-pressed={active}
                onClick={() =>
                  selectFaction(active ? null : faction)
                }
              >
                <i style={{ background: sengokuFactionColor(faction) }} />
                <span>{sengokuFactionName(faction)}</span>
                <em>{n} 區</em>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
