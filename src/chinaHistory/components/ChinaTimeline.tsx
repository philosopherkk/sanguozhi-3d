import { useMemo, useState } from 'react'
import timelineData from '../data/timeline.json'
import { formatChinaYear } from '../lib/formatYear'
import { useChinaYear } from '../state/ChinaYearContext'
import type { ChinaTimelineEvent } from '../types'

const events = timelineData as ChinaTimelineEvent[]

export function ChinaTimeline() {
  const { year, setYear, yearMin, yearMax } = useChinaYear()
  const [showAll, setShowAll] = useState(false)
  const scoped = useMemo(
    () => events.filter((e) => e.year >= yearMin && e.year <= yearMax),
    [yearMin, yearMax],
  )

  const yearEvents = useMemo(
    () => scoped.filter((e) => e.year === year),
    [scoped, year],
  )

  const nearby = useMemo(() => {
    return scoped
      .filter((e) => e.year !== year)
      .map((e) => ({ e, dist: Math.abs(e.year - year) }))
      .sort((a, b) => a.dist - b.dist || a.e.year - b.e.year)
      .slice(0, showAll ? scoped.length : 8)
  }, [scoped, year, showAll])

  return (
    <section className="panel timeline-panel panel--dock" aria-labelledby="cn-tl">
      <header className="panel-header">
        <h2 id="cn-tl">{formatChinaYear(year)} 年綱要</h2>
        <p className="panel-sub">
          {yearEvents.length
            ? `本年 ${yearEvents.length} 條`
            : '本年無專條——點鄰近綱要跳轉'}
        </p>
      </header>

      {yearEvents.length > 0 ? (
        <ol className="timeline-list">
          {yearEvents.map((e) => (
            <Item key={e.id} e={e} active />
          ))}
        </ol>
      ) : (
        <p className="empty-hint">
          試前221（秦統）、220（三國）、618（唐）、960（宋）、1644（清入關）、1912（民國）。
        </p>
      )}

      <h3 className="subhead">鄰近綱要</h3>
      <ol className="timeline-list">
        {nearby.map(({ e }) => (
          <Item key={e.id} e={e} onJump={() => setYear(e.year)} />
        ))}
      </ol>
      <button
        type="button"
        className="panel-more"
        onClick={() => setShowAll((v) => !v)}
      >
        {showAll ? '收起' : `顯示更多（共 ${scoped.length} 條）`}
      </button>
    </section>
  )
}

function Item({
  e,
  active,
  onJump,
}: {
  e: ChinaTimelineEvent
  active?: boolean
  onJump?: () => void
}) {
  return (
    <li className={active ? 'timeline-item is-active' : 'timeline-item'}>
      {onJump ? (
        <button
          type="button"
          className="timeline-year timeline-year--btn"
          onClick={onJump}
        >
          {formatChinaYear(e.year)}
        </button>
      ) : (
        <time className="timeline-year" dateTime={String(e.year)}>
          {formatChinaYear(e.year)}
        </time>
      )}
      <div>
        <strong>{e.title}</strong>
        <span className="timeline-type">{labelType(e.type)}</span>
        <span className="faction-chip" style={{ borderColor: 'var(--accent-dim)' }}>
          {e.era}
        </span>
        <p>{e.desc}</p>
        <p className="timeline-loc">{e.location}</p>
        <p className="person-source">{e.source}</p>
        {e.disputed || e.note ? (
          <p className="person-note">
            {e.disputed ? '〔異說〕' : ''}
            {e.note}
          </p>
        ) : null}
      </div>
    </li>
  )
}

function labelType(t: ChinaTimelineEvent['type']) {
  switch (t) {
    case 'war':
      return '戰'
    case 'politics':
      return '政'
    case 'succession':
      return '繼'
    case 'culture':
      return '文'
    default: {
      const _exhaustive: never = t
      return _exhaustive
    }
  }
}
