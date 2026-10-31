import { useEffect, useMemo, useState } from 'react'
import {
  ClassicDetailModal,
  type ClassicDetailContent,
} from '../../components/ClassicDetailModal'
import { TimelineMonthBar } from '../../components/TimelineMonthBar'
import { DEPTH_EVENTS } from '../data/depth'
import { imperialFactionColor } from '../lib/factionColor'
import {
  filterEventsForYearView,
  formatTimelineDate,
  yearHasMonthDensity,
} from '../../lib/timelineDate'
import { useImperialYear } from '../state/ImperialYearContext'
import type { ImperialEvent } from '../types'

function toDetail(event: ImperialEvent): ClassicDetailContent {
  const elementary = event.desc
  const secondary = event.secondary || event.desc
  const university = event.university || event.secondary || event.desc
  return {
    year: event.year,
    title: event.title,
    causes: event.causes ?? secondary,
    course: event.course ?? elementary,
    keyFigures:
      event.keyFigures ??
      event.factions.map((name) => ({ name, role: '相關勢力' })),
    outcome: event.outcome ?? university,
    classicQuote: event.classicQuote ?? elementary,
    classicSource: event.classicSource ?? `意譯，據${event.source}`,
    quoteHeading: '意譯',
    layers: {
      elementary,
      secondary,
      university,
    },
    zhwikiUrl: 'https://zh.wikipedia.org/wiki/中國歷史',
  }
}

export function ImperialTimeline() {
  const { pack, year, setYear } = useImperialYear()
  const [monthFilter, setMonthFilter] = useState<number | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const events = useMemo(
    () => [...pack.events, ...(DEPTH_EVENTS[pack.id] ?? [])],
    [pack.events, pack.id],
  )

  useEffect(() => {
    setMonthFilter(null)
  }, [year])

  const { dated, yearOnly } = useMemo(
    () => filterEventsForYearView({ events, year, monthFilter }),
    [events, year, monthFilter],
  )
  const eventCount = dated.length + yearOnly.length
  const monthDense = yearHasMonthDensity(events, year)

  const nearby = useMemo(() => {
    return events
      .filter((e) => e.year !== year)
      .map((e) => ({ e, dist: Math.abs(e.year - year) }))
      .sort((a, b) => a.dist - b.dist || a.e.year - b.e.year)
      .slice(0, showAll ? events.length : 6)
  }, [events, year, showAll])
  const openEvent = openId ? events.find((e) => e.id === openId) : undefined

  return (
    <section className="panel timeline-panel panel--dock" aria-label="大事">
      <header className="panel-header">
        <h2>{year} 年大事</h2>
        <p className="panel-sub">
          {eventCount
            ? `本年 ${eventCount} 事${monthDense ? ' · 可逐月篩選' : ''} · 點標題可深入`
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

      {eventCount === 0 ? (
        <p className="empty-hint">
          {pack.emptyHint ?? '此年無登錄專條。可拖時間軸或按刻度。'}
        </p>
      ) : (
        <>
          {dated.length > 0 ? (
            <ol className="timeline-list">
              {dated.map((e) => (
                <Item
                  key={e.id}
                  e={e}
                  colorFor={(id) => imperialFactionColor(pack, id)}
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
                  <Item
                    key={e.id}
                    e={e}
                    colorFor={(id) => imperialFactionColor(pack, id)}
                    onOpen={() => setOpenId(e.id)}
                  />
                ))}
              </ol>
            </>
          ) : null}
        </>
      )}
      <h3 className="subhead">鄰近年表</h3>
      <ol className="timeline-list">
        {nearby.map(({ e }) => (
          <Item
            key={e.id}
            e={e}
            colorFor={(id) => imperialFactionColor(pack, id)}
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
        {showAll ? '收起年表' : `顯示更多（共 ${events.length} 條）`}
      </button>
      {openEvent ? (
        <ClassicDetailModal
          detail={toDetail(openEvent)}
          onClose={() => setOpenId(null)}
        />
      ) : null}
    </section>
  )
}

function Item({
  e,
  colorFor,
  onOpen,
  onJump,
}: {
  e: ImperialEvent
  colorFor: (id: string) => string
  onOpen: () => void
  onJump?: () => void
}) {
  const label = formatTimelineDate(e)
  return (
    <li className={onJump ? 'timeline-item' : 'timeline-item is-active'}>
      {onJump ? (
        <button
          type="button"
          className="timeline-year timeline-year--btn"
          onClick={onJump}
        >
          {label}
        </button>
      ) : (
        <time className="timeline-year">{label}</time>
      )}
      <div>
        <button type="button" className="timeline-title-link" onClick={onOpen}>
          <strong>{e.title}</strong>
          <span className="timeline-title-link__hint">詳情</span>
        </button>
        <div className="timeline-factions">
          {e.factions.map((f) => (
            <span key={f} className="faction-chip" style={{ borderColor: colorFor(f) }}>
              <i style={{ background: colorFor(f) }} />
              {f}
            </span>
          ))}
        </div>
        <p>{e.desc}</p>
        <p className="person-source">{e.source}</p>
      </div>
    </li>
  )
}
