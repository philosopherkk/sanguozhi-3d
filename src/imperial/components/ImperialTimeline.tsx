import { useMemo, useState } from 'react'
import {
  ClassicDetailModal,
  type ClassicDetailContent,
} from '../../components/ClassicDetailModal'
import { DEPTH_EVENTS } from '../data/depth'
import { imperialFactionColor } from '../lib/factionColor'
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
  const [showAll, setShowAll] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const events = useMemo(
    () => [...pack.events, ...(DEPTH_EVENTS[pack.id] ?? [])],
    [pack.events, pack.id],
  )
  const yearEvents = useMemo(
    () => events.filter((e) => e.year === year),
    [events, year],
  )
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
          {yearEvents.length
            ? `本年 ${yearEvents.length} 事 · 點標題可深入`
            : '本年無專條——點鄰近年份可跳轉'}
        </p>
      </header>
      {yearEvents.length === 0 ? (
        <p className="empty-hint">
          {pack.emptyHint ?? '此年無登錄專條。可拖時間軸或按刻度。'}
        </p>
      ) : (
        <ol className="timeline-list">
          {yearEvents.map((e) => (
            <Item
              key={e.id}
              e={e}
              colorFor={(id) => imperialFactionColor(pack, id)}
              onOpen={() => setOpenId(e.id)}
            />
          ))}
        </ol>
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
  return (
    <li className={onJump ? 'timeline-item' : 'timeline-item is-active'}>
      {onJump ? (
        <button
          type="button"
          className="timeline-year timeline-year--btn"
          onClick={onJump}
        >
          {e.year}
        </button>
      ) : (
        <time className="timeline-year">{e.year}</time>
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
