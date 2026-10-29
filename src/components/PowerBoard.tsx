import { useMemo, useState } from 'react'
import { factionColor, factionName } from '../lib/factionColors'
import { territoryStatsForControl } from '../lib/territoryStats'
import { useSelection } from '../state/SelectionContext'
import { useYear } from '../state/YearContext'

export function PowerBoard() {
  const { year, control, territoryYear } = useYear()
  const { selectedFaction, selectFaction, clearFaction } = useSelection()
  const [expanded, setExpanded] = useState(true)

  const rows = useMemo(() => territoryStatsForControl(control), [control])
  const maxPercent = rows[0]?.percent ?? 1

  return (
    <aside className="power-board" aria-label="勢力疆域比較">
      <header className="power-board__head">
        <div>
          <h2 className="power-board__title">勢力疆域</h2>
          <p className="power-board__sub">
            {year} 年 · 點選勢力，左方開啟本年檢視
            {territoryYear !== year ? `（底圖 ${territoryYear}）` : ''}
          </p>
        </div>
        <button
          type="button"
          className="power-board__toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? '收起' : '展開'}
        </button>
      </header>

      {selectedFaction ? (
        <button
          type="button"
          className="power-board__clear"
          onClick={clearFaction}
        >
          清除篩選：{factionName(selectedFaction)}
        </button>
      ) : null}

      {expanded ? (
        <>
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
                    onClick={() => selectFaction(row.faction)}
                    aria-pressed={active}
                  >
                    <div className="power-board__label">
                      <span
                        className="power-board__swatch"
                        style={{ background: factionColor(row.faction) }}
                        aria-hidden
                      />
                      <span className="power-board__name">
                        {i + 1}. {factionName(row.faction)}
                      </span>
                      <span className="power-board__nums">
                        {row.percent.toFixed(0)}% · {row.provinceCount} 州
                      </span>
                    </div>
                    <div className="power-board__track">
                      <div
                        className="power-board__bar"
                        style={{
                          width: `${(row.percent / maxPercent) * 100}%`,
                          background: factionColor(row.faction),
                        }}
                      />
                    </div>
                    <p className="power-board__provinces">
                      {row.provinces.join('、')}
                    </p>
                  </button>
                </li>
              )
            })}
          </ol>
          <p className="power-board__note">
            點色塊或勢力列可看該年人口、戰力、糧食與境內政治、經濟。州數只表示色塊，不是戶籍。黃巾為起事區示意；劉備集團自得益州起標「蜀漢」。
          </p>
        </>
      ) : (
        <ul className="power-board__mini">
          {rows.slice(0, 4).map((row) => (
            <li key={row.faction}>
              <button
                type="button"
                className="power-board__mini-btn"
                onClick={() => selectFaction(row.faction)}
              >
                <span
                  className="power-board__swatch"
                  style={{ background: factionColor(row.faction) }}
                />
                {factionName(row.faction)} {row.percent.toFixed(0)}%
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
