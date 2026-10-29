import { useMemo } from 'react'
import { zhouTerritoryStats } from '../data/territoryControl'
import {
  zhouFactionColor,
  zhouFactionName,
} from '../lib/factionColors'
import { formatZhouYear } from '../lib/formatYear'
import { useZhouSelection } from '../state/ZhouSelectionContext'
import { useZhouYear } from '../state/ZhouYearContext'
import type { ZhouFactionId } from '../types'

export function ZhouPowerBoard() {
  const { year, snapshot, territoryYear } = useZhouYear()
  const { selectedFaction, selectFaction } = useZhouSelection()
  const rows = useMemo(() => zhouTerritoryStats(snapshot.ranges), [snapshot])
  const maxPercent = rows[0]?.percent ?? 1

  return (
    <aside className="power-board" aria-label="勢力疆域比較">
      <header className="power-board__head">
        <div>
          <h2 className="power-board__title">勢力疆域</h2>
          <p className="power-board__sub">
            {formatZhouYear(year)} 年 · 點色塊或列名，左方看本年詳情
            {territoryYear !== year
              ? `（色塊 ${formatZhouYear(territoryYear)}）`
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
          清除篩選：{zhouFactionName(selectedFaction)}
        </button>
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
                    active ? null : (row.faction as ZhouFactionId),
                  )
                }
                aria-pressed={active}
              >
                <div className="power-board__label">
                  <span
                    className="power-board__swatch"
                    style={{ background: zhouFactionColor(row.faction) }}
                    aria-hidden
                  />
                  <span className="power-board__name">
                    {i + 1}. {zhouFactionName(row.faction)}
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
                      background: zhouFactionColor(row.faction),
                    }}
                  />
                </div>
              </button>
            </li>
          )
        })}
      </ol>
      <p className="power-board__note">面積按本時代的示意塊，不是三國州界，也不是縣界。</p>
    </aside>
  )
}
