import { useMemo, useState } from 'react'
import { PersonWiki } from '../../components/PersonWiki'
import { DEPTH_PEOPLE } from '../data/depth'
import { imperialFactionColor, imperialFactionName } from '../lib/factionColor'
import { useImperialSelection } from '../state/ImperialSelectionContext'
import { useImperialYear } from '../state/ImperialYearContext'

export function ImperialPeople() {
  const { pack, year } = useImperialYear()
  const { selectedFaction, selectFaction } = useImperialSelection()
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const people = DEPTH_PEOPLE[pack.id] ?? pack.people ?? []

  const list = useMemo(() => {
    const needle = query.trim()
    return people.filter((p) => {
      if (year < p.activeFrom || year > p.activeTo) return false
      if (selectedFaction && p.faction !== selectedFaction) return false
      if (!needle) return true
      return p.name.includes(needle)
    })
  }, [people, year, selectedFaction, query])

  const open = people.find((p) => p.id === openId) ?? null

  return (
    <section className="panel people-panel panel--dock" aria-label="人物">
      <header className="panel-header">
        <h2>人物</h2>
        <p className="panel-sub">
          {selectedFaction
            ? `篩選：${imperialFactionName(pack, selectedFaction)}`
            : `${year} 年在活動 ${list.length} 人`}
          {selectedFaction ? (
            <>
              {' · '}
              <button
                type="button"
                className="text-btn"
                onClick={() => selectFaction(null)}
              >
                清除篩選
              </button>
            </>
          ) : null}
        </p>
      </header>
      <input
        className="people-search"
        value={query}
        placeholder="搜尋人名"
        onChange={(e) => setQuery(e.target.value)}
      />
      {list.length === 0 ? (
        <p className="empty-hint">這一年沒有登錄在活動的人物。</p>
      ) : (
        <ul className="people-list">
          {list.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className={
                  openId === p.id ? 'people-card is-active' : 'people-card'
                }
                onClick={() => setOpenId(openId === p.id ? null : p.id)}
              >
                <strong>{p.name}</strong>
                <span
                  className="faction-chip"
                  style={{ borderColor: imperialFactionColor(pack, p.faction) }}
                >
                  <i style={{ background: imperialFactionColor(pack, p.faction) }} />
                  {imperialFactionName(pack, p.faction)}
                </span>
                <span className="people-role">{p.role}</span>
                <span className="people-card__summary">{p.summary}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open ? (
        <article className="person-detail">
          <h3>{open.name}</h3>
          <p>
            {open.role} · {imperialFactionName(pack, open.faction)}
          </p>
          <p>{open.summary}</p>
          <p className="person-source">{open.source}</p>
          {open.note ? <p className="person-note">{open.note}</p> : null}
          <PersonWiki name={open.name} localNote={open.summary} />
        </article>
      ) : null}
    </section>
  )
}
