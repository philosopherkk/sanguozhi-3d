import { useEffect, useMemo, useState } from 'react'
import peopleData from '../data/people.json'
import { personSummary } from '../data/personProfiles'
import { factionColor, factionName } from '../lib/factionColors'
import {
  factionOfPersonInYear,
  peopleForDisplay,
} from '../lib/peopleAtYear'
import { useSelection } from '../state/SelectionContext'
import { useYear } from '../state/YearContext'
import type { FactionId, Person, PersonRole } from '../types/data'
import { ArticlePanel } from './ArticlePanel'

const people = peopleData as Person[]

const ROLES: Array<PersonRole | '全部'> = ['全部', '政治', '軍事', '謀士']

export function PeoplePanel({ compact = false }: { compact?: boolean }) {
  const { year, control } = useYear()
  const { selectedFaction, openPersonArticle, clearFaction } = useSelection()
  const [q, setQ] = useState('')
  const [role, setRole] = useState<(typeof ROLES)[number]>('全部')
  const [faction, setFaction] = useState<FactionId | '全部'>('全部')
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (selectedFaction) {
      setFaction(selectedFaction)
      setShowAll(false)
    }
  }, [selectedFaction])

  useEffect(() => {
    setShowAll(false)
  }, [year])

  const ranked = useMemo(() => {
    return peopleForDisplay({
      people,
      year,
      control,
      factionFilter: faction,
      includePeripheral: showAll || Boolean(q.trim()),
    })
  }, [year, control, faction, showAll, q])

  const filtered = useMemo(() => {
    return ranked.filter((p) => {
      if (role !== '全部' && p.role !== role) return false
      if (q.trim()) {
        const needle = q.trim()
        if (!p.name.includes(needle) && !(p.字 && p.字.includes(needle)))
          return false
      }
      return true
    })
  }, [ranked, role, q])

  return (
    <section
      className={compact ? 'panel panel--dock people-panel' : 'panel people-panel'}
      aria-labelledby="people-heading"
    >
      <ArticlePanel />

      <header className="panel-header">
        <h2 id="people-heading">
          {year} 年要角
          {faction !== '全部' ? ` · ${factionName(faction)}` : ''}
        </h2>
        <p className="panel-sub">
          先列各地圖主力政權之重要人物（按地位排序）· 點勢力色塊或人名可深入
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
          onChange={(e) => {
            const v = e.target.value as FactionId | '全部'
            setFaction(v)
            if (v === '全部') clearFaction()
          }}
          aria-label="勢力"
        >
          <option value="全部">勢力：要角</option>
          {[
            ...new Set(
              people
                .map((p) => factionOfPersonInYear(p, year))
                .filter(Boolean) as FactionId[],
            ),
          ]
            .sort((a, b) => a.localeCompare(b, 'zh-Hant'))
            .map((f) => (
              <option key={f} value={f}>
                {factionName(f)}
              </option>
            ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="empty-hint">
          此年尚無登錄要角。試點地圖色塊，或開啟「顯示更多人物」。
        </p>
      ) : null}

      <ul className="people-list">
        {filtered.map((p, idx) => {
          const fac = factionOfPersonInYear(p, year)
          return (
            <li key={p.id} className="person-card">
              <button
                type="button"
                className="person-card__hit"
                onClick={() => openPersonArticle(p)}
              >
                <div className="person-card__main">
                  <span className="person-rank" aria-hidden>
                    {idx + 1}
                  </span>
                  {fac ? (
                    <span
                      className="person-swatch"
                      style={{ background: factionColor(fac) }}
                      title={factionName(fac)}
                      aria-hidden
                    />
                  ) : null}
                  <strong className="person-name">{p.name}</strong>
                  {p.字 ? <span className="person-zi">字{p.字}</span> : null}
                  <span className="person-meta">
                    {formatYears(p.birth, p.death)} · {p.role}
                    {fac ? ` · ${factionName(fac)}` : ''}
                  </span>
                </div>
                <p className="person-summary">{personSummary(p.id, p.source)}</p>
                <p className="person-factions">
                  {p.faction_by_year
                    .map((t) =>
                      t.to
                        ? `${t.faction}（${t.from}–${t.to}）`
                        : `${t.faction}（自 ${t.from}）`,
                    )
                    .join(' → ')}
                </p>
                <p className="person-card__cta">點擊載入更詳百科</p>
              </button>
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

      {!showAll && faction === '全部' && !q.trim() ? (
        <button
          type="button"
          className="panel-more"
          onClick={() => setShowAll(true)}
        >
          顯示更多人物（含次要角色）
        </button>
      ) : null}
    </section>
  )
}

function formatYears(birth?: number, death?: number) {
  if (birth != null && death != null) return `${birth}–${death}`
  if (death != null) return `？–${death}`
  if (birth != null) return `${birth}–？`
  return '生卒不詳'
}
