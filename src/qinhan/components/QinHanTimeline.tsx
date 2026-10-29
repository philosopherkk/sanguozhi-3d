import { useMemo, useState } from 'react'
import { ClassicDetailModal } from '../../components/ClassicDetailModal'
import { qinHanFactionColor } from '../lib/factionColors'
import { formatQinHanYear } from '../lib/formatYear'
import { QINHAN_TIMELINE, type QinHanTimelineEvent } from '../data/timeline'
import { useQinHanYear } from '../state/QinHanYearContext'
import type { QinHanEventType } from '../types'

export function QinHanTimeline() {
  const { year, setYear, yearMin, yearMax } = useQinHanYear()
  const [showAll, setShowAll] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  const yearEvents = useMemo(
    () => QINHAN_TIMELINE.filter((e) => e.year === year),
    [year],
  )

  const nearby = useMemo(() => {
    return QINHAN_TIMELINE.filter(
      (e) => e.year !== year && e.year >= yearMin && e.year <= yearMax,
    )
      .map((e) => ({ e, dist: Math.abs(e.year - year) }))
      .sort((a, b) => a.dist - b.dist || a.e.year - b.e.year)
      .slice(0, showAll ? QINHAN_TIMELINE.length : 6)
  }, [year, showAll, yearMin, yearMax])

  const openEvent = openId
    ? QINHAN_TIMELINE.find((e) => e.id === openId)
    : undefined

  return (
    <section
      className="panel timeline-panel panel--dock"
      aria-labelledby="qinhan-timeline-heading"
    >
      <header className="panel-header">
        <h2 id="qinhan-timeline-heading">{formatQinHanYear(year)} 年大事</h2>
        <p className="panel-sub">
          {yearEvents.length
            ? `本年 ${yearEvents.length} 事 · 點標題可深入`
            : '本年無專條——點鄰近年份可跳轉'}
        </p>
      </header>

      {yearEvents.length === 0 ? (
        <p className="empty-hint">
          此年無登錄專條。試前209（陳勝）、前202（垓下）、前119（漠北）、23（昆陽）。
        </p>
      ) : (
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
        {showAll ? '收起年表' : `顯示更多（共 ${QINHAN_TIMELINE.length} 條）`}
      </button>

      {openEvent ? (
        <ClassicDetailModal
          detail={{
            year: openEvent.year,
            yearLabel: formatQinHanYear(openEvent.year),
            title: openEvent.title,
            causes: openEvent.causes,
            course: openEvent.course,
            keyFigures: openEvent.keyFigures,
            outcome: openEvent.outcome,
            classicQuote: openEvent.classicQuote,
            classicSource: openEvent.classicSource,
            quoteHeading: openEvent.paraphrase ? '意譯' : '典籍原文',
            layers: openEvent.layers,
            zhwikiUrl: openEvent.zhwikiUrl,
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
  e: QinHanTimelineEvent
  active?: boolean
  onJump?: () => void
  onOpen: () => void
}) {
  const label = formatQinHanYear(e.year)
  return (
    <li className={active ? 'timeline-item is-active' : 'timeline-item'}>
      {onJump ? (
        <button
          type="button"
          className="timeline-year timeline-year--btn"
          onClick={onJump}
          title={`跳至 ${label} 年`}
        >
          {label}
        </button>
      ) : (
        <time className="timeline-year" dateTime={String(e.year)}>
          {label}
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
              style={{ borderColor: qinHanFactionColor(f) }}
            >
              <i style={{ background: qinHanFactionColor(f) }} />
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

function labelType(t: QinHanEventType): string {
  switch (t) {
    case 'war':
      return '戰'
    case 'politics':
      return '政'
    default: {
      const _exhaustive: never = t
      return _exhaustive
    }
  }
}
