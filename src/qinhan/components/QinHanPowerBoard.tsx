import { useMemo } from 'react'
import { FactionSituationPanel } from '../../components/FactionSituationPanel'
import { composeFactionYear, type YearNote } from '../../lib/factionYearView'
import { QINHAN_SITUATION } from '../data/factionSituation'
import { QINHAN_TIMELINE } from '../data/timeline'
import { qinHanTerritoryStats } from '../data/territoryControl'
import {
  qinHanFactionColor,
  qinHanFactionName,
} from '../lib/factionColors'
import { formatQinHanYear } from '../lib/formatYear'
import { useQinHanSelection } from '../state/QinHanSelectionContext'
import { useQinHanYear } from '../state/QinHanYearContext'
import type { QinHanFactionId } from '../types'

export function QinHanPowerBoard() {
  const { year, snapshot, territoryYear } = useQinHanYear()
  const { selectedFaction, selectFaction } = useQinHanSelection()
  const rows = useMemo(() => qinHanTerritoryStats(snapshot.ranges), [snapshot])
  const maxPercent = rows[0]?.percent ?? 1
  const situation = useMemo(() => {
    if (!selectedFaction) return null
    const notes: YearNote[] = QINHAN_TIMELINE.filter(
      (event) => event.year === year && event.factions.includes(selectedFaction),
    ).map((event) => ({
      title: event.title,
      desc: event.desc,
      source: event.source,
    }))
    return composeFactionYear(QINHAN_SITUATION[selectedFaction], year, notes)
  }, [selectedFaction, year])

  return (
    <aside className="power-board" aria-label="勢力疆域比較">
      <header className="power-board__head">
        <div>
          <h2 className="power-board__title">勢力疆域</h2>
          <p className="power-board__sub">
            {formatQinHanYear(year)} 年 · 點選可看人口、戰力與本年境況
            {territoryYear !== year
              ? `（色塊 ${formatQinHanYear(territoryYear)}）`
              : ''}
          </p>
        </div>
      </header>

      {selectedFaction ? (
        <button
          type="button"
          className="power-board__clear"
          onClick={() => selectFaction(null)}
        >
          清除篩選：{qinHanFactionName(selectedFaction)}
        </button>
      ) : null}

      {selectedFaction && situation ? (
        <FactionSituationPanel
          name={qinHanFactionName(selectedFaction)}
          yearLabel={`${formatQinHanYear(year)} 年`}
          color={qinHanFactionColor(selectedFaction)}
          view={situation}
          onClose={() => selectFaction(null)}
        />
      ) : null}

      <ol className="power-board__list">
        {rows.map((row, i) => {
          const active = selectedFaction === row.faction
          return (
            <li key={row.faction}>
              <button
                type="button"
                className={
                  active
                    ? 'power-board__row power-board__row--btn is-active'
                    : 'power-board__row power-board__row--btn'
                }
                onClick={() =>
                  selectFaction(
                    active ? null : (row.faction as QinHanFactionId),
                  )
                }
                aria-pressed={active}
              >
                <div className="power-board__label">
                  <span
                    className="power-board__swatch"
                    style={{ background: qinHanFactionColor(row.faction) }}
                    aria-hidden
                  />
                  <span className="power-board__name">
                    {i + 1}. {qinHanFactionName(row.faction)}
                  </span>
                  <span className="power-board__nums">
                    {row.percent.toFixed(0)}% · {row.pieceCount} 塊
                  </span>
                </div>
                <div className="power-board__track">
                  <div
                    className="power-board__bar"
                    style={{
                      width: `${(row.percent / maxPercent) * 100}%`,
                      background: qinHanFactionColor(row.faction),
                    }}
                  />
                </div>
              </button>
            </li>
          )
        })}
      </ol>
      <p className="power-board__note">面積按本時代的示意塊，不是三國州界，也不是郡界。</p>
    </aside>
  )
}
