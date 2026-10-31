import { useMemo } from 'react'
import idiomsData from '../data/idioms.json'
import {
  filterChengyuForPanel,
  type ChengyuLocale,
} from '../lib/filterByYear'
import type { ChengyuEntry } from '../types'

const entries = idiomsData as ChengyuEntry[]

type ChengyuPanelProps = {
  year: number
  yearMin: number
  yearMax: number
  locales: ChengyuLocale[]
  onJumpYear?: (y: number) => void
  formatYear?: (y: number) => string
}

function defaultFormatYear(y: number): string {
  if (y < 0) return `前${Math.abs(y)}`
  return String(y)
}

function ChengyuCard({
  entry,
  onJumpYear,
  formatYear,
}: {
  entry: ChengyuEntry
  onJumpYear?: (y: number) => void
  formatYear: (y: number) => string
}) {
  const linkYear = entry.eraLink.year
  const canJump = onJumpYear && linkYear !== undefined

  return (
    <li className="chengyu-card">
      <div className="chengyu-card__head">
        <span className="chengyu-card__lemma">{entry.lemma}</span>
        {entry.disputed ? (
          <span className="chengyu-card__badge" title="出典或史事有爭議">
            存疑
          </span>
        ) : null}
      </div>
      <p className="chengyu-card__reading">{entry.reading}</p>
      <p className="chengyu-card__meaning">{entry.meaningZhHant}</p>
      <p className="chengyu-card__source">
        <span className="chengyu-card__source-class">{entry.source.class}</span>
        {entry.source.cite}
      </p>
      {entry.note ? <p className="chengyu-card__note">{entry.note}</p> : null}
      {linkYear !== undefined ? (
        <p className="chengyu-card__era">
          紀年錨點：
          {canJump ? (
            <button
              type="button"
              className="chengyu-card__jump"
              onClick={() => onJumpYear(linkYear)}
            >
              {formatYear(linkYear)} 年
            </button>
          ) : (
            <span>{formatYear(linkYear)} 年</span>
          )}
        </p>
      ) : null}
    </li>
  )
}

export function ChengyuPanel({
  year,
  yearMin,
  yearMax,
  locales,
  onJumpYear,
  formatYear = defaultFormatYear,
}: ChengyuPanelProps) {
  const { yearMatches, nearby } = useMemo(
    () => filterChengyuForPanel(entries, locales, year, yearMin, yearMax),
    [locales, year, yearMin, yearMax],
  )

  return (
    <section className="panel chengyu-panel panel--dock" aria-labelledby="chengyu-panel-title">
      <header className="panel-header">
        <h2 id="chengyu-panel-title">成語</h2>
        <p className="panel-sub">
          {yearMatches.length
            ? `與 ${formatYear(year)} 年錨點相關 ${yearMatches.length} 條`
            : '本年無錨點卡——見鄰近成語或拖動年表'}
        </p>
      </header>

      {yearMatches.length > 0 ? (
        <ol className="chengyu-list">
          {yearMatches.map((e) => (
            <ChengyuCard
              key={e.id}
              entry={e}
              onJumpYear={onJumpYear}
              formatYear={formatYear}
            />
          ))}
        </ol>
      ) : null}

      {nearby.length > 0 ? (
        <>
          <h3 className="subhead">鄰近成語</h3>
          <ol className="chengyu-list">
            {nearby.map((e) => (
              <ChengyuCard
                key={e.id}
                entry={e}
                onJumpYear={onJumpYear}
                formatYear={formatYear}
              />
            ))}
          </ol>
        </>
      ) : null}

      {yearMatches.length === 0 && nearby.length === 0 ? (
        <p className="empty-hint">本時代窗內暫無收錄成語，請調整年份或換專題。</p>
      ) : null}
    </section>
  )
}
