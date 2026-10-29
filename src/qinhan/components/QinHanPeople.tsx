import { useMemo, useState } from 'react'
import { PersonWiki } from '../../components/PersonWiki'
import { QINHAN_PEOPLE } from '../data/people'
import { qinHanFactionColor, qinHanFactionName } from '../lib/factionColors'
import { formatQinHanYear } from '../lib/formatYear'
import { useQinHanSelection } from '../state/QinHanSelectionContext'
import { useQinHanYear } from '../state/QinHanYearContext'

export function QinHanPeople() {
  const { year } = useQinHanYear()
  const { selectedFaction, selectFaction, selectedPerson, selectPerson } =
    useQinHanSelection()
  const [query, setQuery] = useState('')

  const list = useMemo(() => {
    const needle = query.trim()
    return QINHAN_PEOPLE.filter((p) => {
      if (year < p.activeFrom || year > p.activeTo) return false
      if (selectedFaction && p.faction !== selectedFaction) return false
      if (!needle) return true
      return (
        p.name.includes(needle) ||
        (p.courtesy ? p.courtesy.includes(needle) : false)
      )
    })
  }, [year, selectedFaction, query])

  return (
    <section
      className="panel people-panel panel--dock"
      aria-labelledby="qinhan-people-heading"
    >
      <header className="panel-header">
        <h2 id="qinhan-people-heading">人物</h2>
        <p className="panel-sub">
          {selectedFaction
            ? `篩選：${qinHanFactionName(selectedFaction)}`
            : `${formatQinHanYear(year)} 年在活動 ${list.length} 人`}
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
        placeholder="搜尋姓名或字…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="搜尋人物"
      />

      <ul className="people-list">
        {list.map((p) => {
          const active = selectedPerson?.id === p.id
          return (
            <li key={p.id}>
              <button
                type="button"
                className={active ? 'people-card is-active' : 'people-card'}
                onClick={() => selectPerson(active ? null : p)}
              >
                <strong>{p.name}</strong>
                {p.courtesy ? (
                  <span className="people-aka">字 {p.courtesy}</span>
                ) : null}
                <span
                  className="faction-chip"
                  style={{ borderColor: qinHanFactionColor(p.faction) }}
                >
                  <i style={{ background: qinHanFactionColor(p.faction) }} />
                  {qinHanFactionName(p.faction)}
                </span>
                <span className="people-role">{p.role}</span>
                <span className="people-card__summary">{p.summary}</span>
              </button>
            </li>
          )
        })}
      </ul>

      {list.length === 0 ? (
        <p className="empty-hint">這一年沒有登錄在活動的人物。試前209或前202。</p>
      ) : null}

      {selectedPerson ? (
        <article className="person-detail">
          <h3>{selectedPerson.name}</h3>
          {selectedPerson.courtesy ? <p>字 {selectedPerson.courtesy}</p> : null}
          <p>
            {selectedPerson.datesNote} · {selectedPerson.role}
          </p>
          <p>{selectedPerson.summary}</p>
          <p className="person-source">{selectedPerson.source}</p>
          {selectedPerson.note ? (
            <p className="person-note">{selectedPerson.note}</p>
          ) : null}
          {selectedPerson.disputed ? (
            <p className="person-note">生卒或細節未詳，已標為有爭議。</p>
          ) : null}
          <PersonWiki name={selectedPerson.name} localNote={selectedPerson.summary} />
        </article>
      ) : null}
    </section>
  )
}
