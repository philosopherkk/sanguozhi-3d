import { useMemo, useState } from 'react'
import battlesData from '../data/battles.json'
import { READING_LAYERS } from '../data/readingLayers'
import timelineData from '../data/timeline.json'
import { timelineDetailFor } from '../data/timelineDetails'
import { ClassicDetailModal } from './ClassicDetailModal'
import { TimelineMonthBar } from './TimelineMonthBar'
import { factionColor } from '../lib/factionColors'
import {
  filterEventsForYearView,
  formatTimelineDate,
  yearHasMonthDensity,
} from '../lib/timelineDate'
import { useYear } from '../state/YearContext'
import type { TimelineEvent } from '../types/data'

const events = timelineData as TimelineEvent[]
const battles = battlesData as import('../types/data').Battle[]

export function TimelinePanel({
  compact = false,
  rail = false,
}: {
  compact?: boolean
  rail?: boolean
}) {
  const { year, setYear, monthFilter, setMonthFilter } = useYear()
  const [showAll, setShowAll] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  const { dated, yearOnly } = useMemo(
    () =>
      filterEventsForYearView({
        events,
        year,
        monthFilter,
      }),
    [year, monthFilter],
  )
  const yearBattles = useMemo(() => {
    let list = battles.filter((b) => b.year === year)
    if (monthFilter != null) {
      list = list.filter(
        (b) =>
          b.month == null ||
          (b.datePrecision ?? (b.month != null ? 'month' : 'year')) === 'year' ||
          b.month === monthFilter,
      )
    }
    return list
  }, [year, monthFilter])

  const eventCount = dated.length + yearOnly.length
  const monthDense = yearHasMonthDensity(events, year)

  const nearby = useMemo(() => {
    return events
      .filter((e) => e.year !== year)
      .map((e) => ({ e, dist: Math.abs(e.year - year) }))
      .sort((a, b) => a.dist - b.dist || a.e.year - b.e.year)
      .slice(0, showAll ? events.length : rail ? 4 : 6)
  }, [year, showAll, rail])

  const detail = openId ? timelineDetailFor(openId) : undefined
  const openEvent = openId ? events.find((e) => e.id === openId) : undefined

  const className = [
    'panel',
    'timeline-panel',
    compact || rail ? 'panel--dock' : '',
    rail ? 'panel--rail' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={className} aria-labelledby="timeline-heading">
      <header className="panel-header">
        <h2 id="timeline-heading">{year} 年大事</h2>
        <p className="panel-sub">
          {eventCount || yearBattles.length
            ? `本年 ${eventCount} 事${yearBattles.length ? ` · ${yearBattles.length} 役` : ''}${monthDense ? ' · 可逐月篩選' : ''} · 點標題可深入`
            : '本年無專條——點鄰近年份可跳轉'}
        </p>
      </header>

      {monthDense ? (
        <TimelineMonthBar
          year={year}
          events={events}
          monthFilter={monthFilter}
          onMonthFilter={setMonthFilter}
        />
      ) : null}

      {eventCount === 0 && yearBattles.length === 0 ? (
        <p className="empty-hint">
          此年無登錄專條。試 208（赤壁）、222（夷陵）、263（滅蜀）。
        </p>
      ) : null}

      {dated.length > 0 ? (
        <ol className="timeline-list">
          {dated.map((e) => (
            <TimelineItem
              key={e.id}
              e={e}
              active
              onOpen={() => setOpenId(e.id)}
            />
          ))}
        </ol>
      ) : null}

      {yearOnly.length > 0 ? (
        <>
          <h3 className="subhead">僅知年份</h3>
          <ol className="timeline-list">
            {yearOnly.map((e) => (
              <TimelineItem
                key={e.id}
                e={e}
                active
                onOpen={() => setOpenId(e.id)}
              />
            ))}
          </ol>
        </>
      ) : null}

      {yearBattles.length > 0 ? (
        <>
          <h3 className="subhead">本年戰役</h3>
          <ul className="battle-list">
            {yearBattles.map((b) => (
              <li key={b.id} className="battle-card is-active">
                <strong>
                  {formatTimelineDate(b)} · {b.name}
                </strong>
                <p>
                  <span style={{ color: factionColor(b.attacker) }}>
                    {b.attacker}
                  </span>
                  {' → '}
                  <span style={{ color: factionColor(b.defender) }}>
                    {b.defender}
                  </span>
                  ：{b.result}
                </p>
                <p className="person-source">{b.source}</p>
              </li>
            ))}
          </ul>
        </>
      ) : null}

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
        {showAll ? '收起年表' : `顯示更多（共 ${events.length - 1} 條可跳轉）`}
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
              READING_LAYERS[openEvent.id]?.quote ?? detail.classicQuote,
            classicSource: detail.classicSource,
            layers: READING_LAYERS[openEvent.id]?.layers ?? {
              elementary: detail.modernParaphrase,
              secondary: detail.modernParaphrase,
              university: detail.modernParaphrase,
            },
            zhwikiUrl: detail.zhwikiUrl,
            furtherReading: detail.furtherReading,
            entrySource: detail.source,
            disputed: detail.disputed,
            note: detail.note,
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
  e: TimelineEvent
  active?: boolean
  onJump?: () => void
  onOpen: () => void
}) {
  const label = formatTimelineDate(e)
  return (
    <li className={active ? 'timeline-item is-active' : 'timeline-item'}>
      {onJump ? (
        <button
          type="button"
          className="timeline-year timeline-year--btn"
          onClick={onJump}
          title={`跳至 ${label}`}
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
              style={{ borderColor: factionColor(f) }}
            >
              <i style={{ background: factionColor(f) }} />
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

function labelType(t: TimelineEvent['type']) {
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
