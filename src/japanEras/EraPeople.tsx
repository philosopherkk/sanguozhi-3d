import { useMemo, useState } from 'react'
import { PersonWiki } from '../components/PersonWiki'
import type { EraPerson } from './types'

export function EraPeople({
  headingId,
  year,
  people,
  selectedFaction,
  onClearFaction,
  factionName,
  colorFor,
}: {
  headingId: string
  year: number
  people: EraPerson[]
  selectedFaction: string | null
  onClearFaction: () => void
  factionName: (id: string) => string
  colorFor: (id: string) => string
}) {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const list = useMemo(() => {
    const q = query.trim()
    return people.filter((p) => {
      if (p.birth != null && year < p.birth) return false
      if (p.death != null && year > p.death) return false
      if (selectedFaction && p.faction !== selectedFaction) return false
      if (!q) return true
      return p.name.includes(q) || (p.aka?.includes(q) ?? false)
    })
  }, [people, year, selectedFaction, query])

  const selected = people.find((p) => p.id === selectedId) ?? null

  return (
    <section className="panel people-panel panel--dock" aria-labelledby={headingId}>
      <header className="panel-header">
        <h2 id={headingId}>人物</h2>
        <p className="panel-sub">
          {selectedFaction
            ? `篩選：${factionName(selectedFaction)}`
            : `${year} 年在世 ${list.length} 人`}
          {selectedFaction ? (
            <>
              {' · '}
              <button type="button" className="text-btn" onClick={onClearFaction}>
                清除篩選
              </button>
            </>
          ) : null}
        </p>
      </header>
      <input
        className="people-search"
        type="search"
        placeholder="搜尋姓名…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {list.length === 0 ? (
        <p className="empty-hint">
          {query.trim() || selectedFaction
            ? '沒有符合的人物。試清除篩選或改搜尋。'
            : '這一年沒有登錄在世的人物。'}
        </p>
      ) : (
        <ul className="people-list">
          {list.map((p) => {
            const active = selected?.id === p.id
            return (
              <li key={p.id}>
                <button
                  type="button"
                  className={active ? 'people-card is-active' : 'people-card'}
                  onClick={() => setSelectedId(active ? null : p.id)}
                >
                  <strong>{p.name}</strong>
                  {p.aka ? <span className="people-aka">{p.aka}</span> : null}
                  <span
                    className="faction-chip"
                    style={{ borderColor: colorFor(p.faction) }}
                  >
                    <i style={{ background: colorFor(p.faction) }} />
                    {factionName(p.faction)}
                  </span>
                  <span className="people-role">{p.role}</span>
                  <span className="people-card__summary">{p.summary}</span>
                  <span className="person-source">{p.source}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {selected ? (
        <article className="person-detail">
          <h3>{selected.name}</h3>
          {selected.aka ? <p>{selected.aka}</p> : null}
          <p>
            {selected.birth ?? '？'}–{selected.death ?? '？'} · {selected.role}
          </p>
          <p>{selected.summary}</p>
          <p className="person-source">{selected.source}</p>
          {selected.note ? <p className="person-note">{selected.note}</p> : null}
          <PersonWiki name={selected.name} localNote={selected.summary} />
        </article>
      ) : null}
    </section>
  )
}
