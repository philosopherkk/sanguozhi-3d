import { useMemo, useState } from 'react'
import { PersonWiki } from '../../components/PersonWiki'
import peopleData from '../data/people.json'
import { useChinaYear } from '../state/ChinaYearContext'
import type { ChinaPerson } from '../types'

const people = peopleData as ChinaPerson[]

export function ChinaPeople() {
  const { year } = useChinaYear()
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const ranked = useMemo(() => {
    const filtered = people.filter(
      (p) =>
        !q ||
        p.name.includes(q) ||
        p.role.includes(q) ||
        p.era.includes(q),
    )
    return [...filtered].sort((a, b) => {
      const da = yearInRange(year, a) ? 0 : 1
      const db = yearInRange(year, b) ? 0 : 1
      if (da !== db) return da - db
      return a.activeFrom - b.activeFrom
    })
  }, [year, q])

  const open = openId ? people.find((p) => p.id === openId) : undefined

  return (
    <section className="panel panel--dock" aria-labelledby="cn-people">
      <header className="panel-header">
        <h2 id="cn-people">人物舉要</h2>
        <p className="panel-sub">與當前年接近者優先</p>
      </header>

      <input
        className="people-search"
        type="search"
        placeholder="搜尋姓名、時代…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="搜尋人物"
      />

      {ranked.length === 0 ? (
        <p className="empty-hint">沒有符合的人物。試清除篩選或改搜尋。</p>
      ) : (
        <ul className="people-list">
          {ranked.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className={
                  openId === p.id ? 'people-card is-active' : 'people-card'
                }
                onClick={() => setOpenId(p.id)}
              >
                <strong>{p.name}</strong>
                <span className="people-aka">{p.years}</span>
                <span className="people-role">{p.role}</span>
                <span className="person-source">{p.source}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <div className="person-detail">
          <h3>{open.name}</h3>
          <p>
            {open.era} · {open.role} · {open.years}
          </p>
          <p>{open.summary}</p>
          <p className="person-source">{open.source}</p>
          <PersonWiki name={open.name} localNote={open.summary} />
          <button type="button" className="text-btn" onClick={() => setOpenId(null)}>
            收起
          </button>
        </div>
      ) : null}
    </section>
  )
}

function yearInRange(year: number, p: ChinaPerson) {
  return year >= p.activeFrom - 20 && year <= p.activeTo + 20
}
