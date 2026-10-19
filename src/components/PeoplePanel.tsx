import { useMemo, useState } from 'react'
import peopleData from '../data/people.json'
import { factionColor, factionName } from '../lib/factionColors'
import {
  factionOfPersonInYear,
  peopleActiveInYear,
} from '../lib/peopleAtYear'
import { useYear } from '../state/YearContext'
import type { FactionId, Person, PersonRole } from '../types/data'

const people = peopleData as Person[]

const ROLES: Array<PersonRole | '全部'> = ['全部', '政治', '軍事', '謀士']

export function PeoplePanel({ compact = false }: { compact?: boolean }) {
  const { year } = useYear()
  const [q, setQ] = useState('')
  const [role, setRole] = useState<(typeof ROLES)[number]>('全部')
  const [faction, setFaction] = useState<FactionId | '全部'>('全部')

  const active = useMemo(() => peopleActiveInYear(people, year), [year])

  const factions = useMemo(() => {
    const s = new Set<FactionId>()
    for (const p of active) {
      const f = factionOfPersonInYear(p, year)
      if (f) s.add(f)
    }
    return ['全部' as const, ...Array.from(s).sort((a, b) => a.localeCompare(b, 'zh-Hant'))]
  }, [active, year])

  const filtered = useMemo(() => {
    return active.filter((p) => {
      if (role !== '全部' && p.role !== role) return false
      const fac = factionOfPersonInYear(p, year)
      if (faction !== '全部' && fac !== faction) return false
      if (q.trim()) {
        const needle = q.trim()
        if (!p.name.includes(needle) && !(p.字 && p.字.includes(needle))) return false
      }
      return true
    })
  }, [active, q, role, faction, year])

  return (
    <section
      className={compact ? 'panel panel--dock people-panel' : 'panel people-panel'}
      aria-labelledby="people-heading"
    >
      <header className="panel-header">
        <h2 id="people-heading">{year} 年在世</h2>
        <p className="panel-sub">
          {filtered.length} 人 · 色點＝該年所屬 · 鏈接維基／Grokipedia
        </p>
      </header>

      <div className="filters filters--sticky">
        <input
          type="search"
          placeholder="搜尋姓名或字…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="搜尋人物"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])}
          aria-label="職任"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r === '全部' ? '職任' : r}
            </option>
          ))}
        </select>
        <select
          value={faction}
          onChange={(e) => setFaction(e.target.value as FactionId | '全部')}
          aria-label="勢力"
        >
          {factions.map((f) => (
            <option key={f} value={f}>
              {f === '全部' ? '勢力' : factionName(f)}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="empty-hint">此年篩選下無人物。放寬條件或換一年試試。</p>
      ) : null}

      <ul className="people-list">
        {filtered.map((p) => {
          const fac = factionOfPersonInYear(p, year)
          return (
            <li key={p.id} className="person-card">
              <div className="person-card__main">
                {fac ? (
                  <span
                    className="person-swatch"
                    style={{ background: factionColor(fac) }}
                    title={factionName(fac)}
                    aria-label={factionName(fac)}
                  />
                ) : null}
                <strong className="person-name">{p.name}</strong>
                {p.字 ? <span className="person-zi">字{p.字}</span> : null}
                <span className="person-meta">
                  {formatYears(p.birth, p.death)} · {p.role}
                  {fac ? ` · ${factionName(fac)}` : ''}
                </span>
              </div>
              <p className="person-factions">
                {p.faction_by_year
                  .map((t) =>
                    t.to ? `${t.faction}（${t.from}–${t.to}）` : `${t.faction}（自 ${t.from}）`,
                  )
                  .join(' → ')}
              </p>
              {p.disputed ? (
                <p className="person-note">存疑：{p.note ?? '生卒或事蹟有異說。'}</p>
              ) : p.note ? (
                <p className="person-note">{p.note}</p>
              ) : null}
              <p className="person-source">{p.source}</p>
              <div className="person-links">
                <a href={p.zhwiki_url} target="_blank" rel="noreferrer">
                  維基百科
                </a>
                {p.grokipedia_url ? (
                  <a href={p.grokipedia_url} target="_blank" rel="noreferrer">
                    Grokipedia
                  </a>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function formatYears(birth?: number, death?: number) {
  if (birth != null && death != null) return `${birth}–${death}`
  if (death != null) return `？–${death}`
  if (birth != null) return `${birth}–？`
  return '生卒不詳'
}
