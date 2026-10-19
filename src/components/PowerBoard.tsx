import { useMemo, useState } from 'react'
import { factionColor, factionName } from '../lib/factionColors'
import { territoryStatsForControl } from '../lib/territoryStats'
import { useYear } from '../state/YearContext'

export function PowerBoard() {
  const { year, control, territoryYear } = useYear()
  const [expanded, setExpanded] = useState(true)

  const rows = useMemo(() => territoryStatsForControl(control), [control])
  const maxPercent = rows[0]?.percent ?? 1

  return (
    <aside className="power-board" aria-label="勢力疆域比較">
      <header className="power-board__head">
        <div>
          <h2 className="power-board__title">勢力疆域</h2>
          <p className="power-board__sub">
            {year} 年 · 州塊面積占比
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

      {expanded ? (
        <>
          <ol className="power-board__list">
            {rows.map((row, i) => (
              <li key={row.faction} className="power-board__row">
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
                <div
                  className="power-board__track"
                  role="img"
                  aria-label={`${factionName(row.faction)} 約占 ${row.percent.toFixed(0)} 百分`}
                >
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
              </li>
            ))}
          </ol>
          <p className="power-board__note">
            以示意州多邊形相對面積估算，非實測平方公里。黃巾為起事區示意；劉備集團在圖上自得益州起標「蜀漢」。
          </p>
        </>
      ) : (
        <ul className="power-board__mini">
          {rows.slice(0, 4).map((row) => (
            <li key={row.faction}>
              <span
                className="power-board__swatch"
                style={{ background: factionColor(row.faction) }}
              />
              {factionName(row.faction)} {row.percent.toFixed(0)}%
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
