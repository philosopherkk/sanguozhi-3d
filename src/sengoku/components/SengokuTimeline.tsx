import { useMemo, useState } from 'react'
import { ClassicDetailModal } from '../../components/ClassicDetailModal'
import timelineData from '../data/timeline.json'
import { SENGOKU_READING } from '../data/readingLayers'
import { sengokuTimelineDetailFor } from '../data/timelineDetails'
import { sengokuFactionColor } from '../lib/factionColors'
import { useSengokuYear } from '../state/SengokuYearContext'
import type { SengokuTimelineEvent } from '../types'

const events = timelineData as SengokuTimelineEvent[]

export function SengokuTimeline() {
  const { year, setYear } = useSengokuYear()
  const [showAll, setShowAll] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  const yearEvents = useMemo(
    () => events.filter((e) => e.year === year),
    [year],
  )

  const nearby = useMemo(() => {
    return events
      .filter((e) => e.year !== year)
      .map((e) => ({ e, dist: Math.abs(e.year - year) }))
      .sort((a, b) => a.dist - b.dist || a.e.year - b.e.year)
      .slice(0, showAll ? events.length : 6)
  }, [year, showAll])

  const detail = openId ? sengokuTimelineDetailFor(openId) : undefined
  const openEvent = openId ? events.find((e) => e.id === openId) : undefined

  return (
    <section className="panel timeline-panel panel--dock" aria-labelledby="sg-timeline-heading">
      <header className="panel-header">
        <h2 id="sg-timeline-heading">{year} 年大事</h2>
        <p className="panel-sub">
          {yearEvents.length
            ? `本年 ${yearEvents.length} 事 · 點標題可深入`
            : '本年無專條——點鄰近年份可跳轉'}
        </p>
      </header>

      {yearEvents.length > 0 ? (
        <ol className="timeline-list">
          {yearEvents.map((e) => (
            <TimelineItem
              key={e.id}
              e={e}
              active
              onOpen={() => setOpenId(e.id)}
            />
          ))}
        </ol>
      ) : (
        <p className="empty-hint">
          此年無登錄專條。試 1560（桶狹間）、1582（本能寺）、1600（關原）。
        </p>
      )}

      <h3 className="subhead">鄰近年表</h3>
      <ol className="timeline-list">
        {nearby.map(({ e }) => (
          <TimelineItem
            key={e.id}
            e={e}
            onJump={() => setYear(e.year)}
            onOpen={() => setOpenId(e.id)}
          />
        ))}
      </ol>
      <button
        type="button"
        className="panel-more"
        onClick={() => setShowAll((v) => !v)}
      >
        {showAll ? '收起年表' : `顯示更多（共 ${events.length - 1} 條）`}
      </button>

      {openEvent && detail ? (
        <ClassicDetailModal
          detail={{
            year: openEvent.year,
            title: openEvent.title,
            causes: detail.causes,
            course: detail.course,
            keyFigures: detail.keyFigures,
            outcome: detail.outcome,
            classicQuote:
              SENGOKU_READING[openEvent.id]?.quote ?? detail.brief,
            classicSource:
              SENGOKU_READING[openEvent.id]?.source ??
              '日本史通說整理，非逐字引文',
            layers: SENGOKU_READING[openEvent.id]?.layers ?? {
              elementary: detail.brief,
              secondary: detail.brief,
              university: detail.brief,
            },
            zhwikiUrl: detail.zhwikiUrl,
            furtherReading: detail.furtherReading,
          }}
          onClose={() => setOpenId(null)}
        />
      ) : null}
    </section>
  )
}

function TimelineItem({
  e,
  active,
  onJump,
  onOpen,
}: {
  e: SengokuTimelineEvent
  active?: boolean
  onJump?: () => void
  onOpen: () => void
}) {
  return (
    <li className={active ? 'timeline-item is-active' : 'timeline-item'}>
      {onJump ? (
        <button
          type="button"
          className="timeline-year timeline-year--btn"
          onClick={onJump}
          title={`跳至 ${e.year} 年`}
        >
          {e.year}
        </button>
      ) : (
        <time className="timeline-year" dateTime={String(e.year)}>
          {e.year}
        </time>
      )}
      <div>
        <button type="button" className="timeline-title-link" onClick={onOpen}>
          <strong>{e.title}</strong>
          <span className="timeline-title-link__hint">詳情</span>
        </button>
        <span className="timeline-type">{labelType(e.type)}</span>
        <div className="timeline-factions">
          {e.factions.map((f) => (
            <span
              key={f}
              className="faction-chip"
              style={{ borderColor: sengokuFactionColor(f) }}
            >
              <i style={{ background: sengokuFactionColor(f) }} />
              {f}
            </span>
          ))}
        </div>
        <p>{e.desc}</p>
        <p className="timeline-loc">{e.location}</p>
        <p className="person-source">{e.source}</p>
        {e.note ? <p className="person-note">{e.note}</p> : null}
      </div>
    </li>
  )
}

function labelType(t: SengokuTimelineEvent['type']) {
  switch (t) {
    case 'war':
      return '戰'
    case 'politics':
      return '政'
    case 'succession':
      return '繼'
    default: {
      const _exhaustive: never = t
      return _exhaustive
    }
  }
}
