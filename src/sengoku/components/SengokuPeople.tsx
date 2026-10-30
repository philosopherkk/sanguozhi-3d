import { useMemo, useState } from 'react'
import { PersonWiki } from '../../components/PersonWiki'
import peopleData from '../data/people.json'
import { sengokuPersonSummary } from '../data/personProfiles'
import {
  sengokuFactionColor,
  sengokuFactionName,
} from '../lib/factionColors'
import {
  filterSengokuPeople,
  sengokuFactionAtYear,
} from '../lib/peopleAtYear'
import { useSengokuSelection } from '../state/SengokuSelectionContext'
import { useSengokuYear } from '../state/SengokuYearContext'
import type { SengokuPerson } from '../types'

const people = peopleData as SengokuPerson[]

export function SengokuPeople() {
  const { year } = useSengokuYear()
  const { selectedFaction, selectFaction, selectedPerson, selectPerson } =
    useSengokuSelection()
  const [query, setQuery] = useState('')

  const list = useMemo(
    () => filterSengokuPeople(people, year, selectedFaction, query),
    [year, selectedFaction, query],
  )

  return (
    <section className="panel people-panel panel--dock" aria-labelledby="sg-people-heading">
      <header className="panel-header">
        <h2 id="sg-people-heading">人物</h2>
        <p className="panel-sub">
          {selectedFaction
            ? `篩選：${sengokuFactionName(selectedFaction)}`
            : `${year} 年在世 ${list.length} 人`}
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
            const fac = sengokuFactionAtYear(p, year)
            const active = selectedPerson?.id === p.id
            return (
              <li key={p.id}>
                <button
                  type="button"
                  className={active ? 'people-card is-active' : 'people-card'}
                  onClick={() => selectPerson(active ? null : p)}
                >
                  <strong>{p.name}</strong>
                  {p.aka ? <span className="people-aka">{p.aka}</span> : null}
                  {fac ? (
                    <span
                      className="faction-chip"
                      style={{ borderColor: sengokuFactionColor(fac) }}
                    >
                      <i style={{ background: sengokuFactionColor(fac) }} />
                      {sengokuFactionName(fac)}
                    </span>
                  ) : null}
                  <span className="people-role">{p.role}</span>
                  {sengokuPersonSummary(p.id) ? (
                    <span className="people-card__summary">
                      {sengokuPersonSummary(p.id)}
                    </span>
                  ) : null}
                  <span className="person-source">{p.source}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {selectedPerson ? (
        <article className="person-detail">
          <h3>{selectedPerson.name}</h3>
          {selectedPerson.aka ? <p>{selectedPerson.aka}</p> : null}
          <p>
            {selectedPerson.birth ?? '？'}–{selectedPerson.death ?? '？'} ·{' '}
            {selectedPerson.role}
          </p>
          {sengokuPersonSummary(selectedPerson.id) ? (
            <p>{sengokuPersonSummary(selectedPerson.id)}</p>
          ) : null}
          <p className="person-source">{selectedPerson.source}</p>
          {selectedPerson.note ? (
            <p className="person-note">{selectedPerson.note}</p>
          ) : null}
          <PersonWiki
            name={selectedPerson.name}
            localNote={sengokuPersonSummary(selectedPerson.id)}
          />
        </article>
      ) : null}
    </section>
  )
}
