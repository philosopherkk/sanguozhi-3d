import { useMemo } from 'react'
import { SANGUO_SITUATION } from '../data/factionSituation'
import timelineData from '../data/timeline.json'
import { factionColor, factionName } from '../lib/factionColors'
import {
  composeFactionInspect,
  type ChangeKind,
  type InspectChange,
  type InspectNote,
  type InspectStat,
} from '../lib/factionInspect'
import { territoryStatsForControl } from '../lib/territoryStats'
import { useSelection } from '../state/SelectionContext'
import { useYear } from '../state/YearContext'
import type { TimelineEvent } from '../types/data'
import { MapDock } from './MapDock'

const events = timelineData as TimelineEvent[]

function kindLabel(kind: ChangeKind): string {
  switch (kind) {
    case '政治':
      return '政'
    case '經濟':
      return '經'
    case '軍事':
      return '軍'
    default: {
      const _exhaustive: never = kind
      return _exhaustive
    }
  }
}

function StatTile({ stat }: { stat: InspectStat }) {
  return (
    <section className="faction-inspect__stat">
      <header>
        <h4>{stat.label}</h4>
        <span className="faction-inspect__badge">
          {stat.disputed ? '〔約〕' : ''}
          {stat.badge}
        </span>
      </header>
      <p className="faction-inspect__headline">{stat.headline}</p>
      {stat.detail ? <p className="faction-inspect__detail">{stat.detail}</p> : null}
      <cite>{stat.source}</cite>
    </section>
  )
}

function ChangeItem({ item }: { item: InspectChange }) {
  return (
    <li className="faction-inspect__change">
      <span className={`faction-inspect__kind faction-inspect__kind--${item.kind}`}>
        {kindLabel(item.kind)}
      </span>
      <div>
        <p className="faction-inspect__change-title">
          {item.title}
          {item.thisYear ? '' : ' · 常制'}
        </p>
        <p>{item.text}</p>
        <cite>{item.source}</cite>
      </div>
    </li>
  )
}

/** 東漢三角：點選勢力後，按該年顯示人口、戰力與政經變化。 */
export function FactionInspectCard() {
  const { year, control } = useYear()
  const { selectedFaction, clearFaction } = useSelection()

  const view = useMemo(() => {
    if (!selectedFaction) return null
    const notes: InspectNote[] = events
      .filter(
        (event) =>
          event.year === year && event.factions.includes(selectedFaction),
      )
      .map((event) => ({
        title: event.title,
        desc: event.desc,
        source: event.source,
        type: event.type,
      }))
    return composeFactionInspect(
      selectedFaction,
      SANGUO_SITUATION[selectedFaction],
      year,
      notes,
    )
  }, [selectedFaction, year])

  const land = useMemo(() => {
    if (!selectedFaction) return ''
    const row = territoryStatsForControl(control).find(
      (item) => item.faction === selectedFaction,
    )
    if (!row) return '本年地圖上沒有色塊'
    return `${row.provinceCount} 州 · ${row.provinces.join('、')}`
  }, [control, selectedFaction])

  if (!selectedFaction || !view) return null

  const name = factionName(selectedFaction)
  const color = factionColor(selectedFaction)

  return (
    <MapDock
      title="勢力檢視"
      storageKey="map-faction-inspect"
      defaultOpenDesktop
      defaultOpenMobile={false}
      collapsedHint={name}
      className="map-stage-dock--tl"
    >
      <article
        className="faction-inspect faction-inspect--embedded"
        style={{ borderLeftColor: color }}
        aria-label={`${name} ${year} 年檢視`}
      >
        <header className="faction-inspect__head">
          <p className="faction-inspect__kicker">東漢三角 · 勢力檢視</p>
          <button type="button" onClick={clearFaction}>
            關閉
          </button>
          <h3>
            <i style={{ background: color }} aria-hidden />
            {name}
            <small>{year} 年</small>
          </h3>
          <p className="faction-inspect__land">所據 {land}</p>
        </header>
        <div className="faction-inspect__stats">
          <StatTile stat={view.population} />
          <StatTile stat={view.military} />
        </div>
        <section className="faction-inspect__changes" aria-label="本年變化">
          <h4>本年變化</h4>
          <ul>
            {view.changes.map((item) => (
              <ChangeItem
                key={`${item.kind}-${item.title}`}
                item={item}
              />
            ))}
          </ul>
        </section>
      </article>
    </MapDock>
  )
}
