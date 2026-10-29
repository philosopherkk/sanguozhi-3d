import {
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { FactionSituationPanel } from '../../components/FactionSituationPanel'
import { MapRouteLegend } from '../../components/map/MapRouteLegend'
import { MARCH_ROUTE_SAME_YEAR } from '../../components/map/RouteOverlay'
import { composeFactionYear, type YearNote } from '../../lib/factionYearView'
import { routesForMonth } from '../../lib/monthZoom'
import { HEIAN_SITUATION } from '../data/factionSituation'
import { HEIAN_EVENTS } from '../data/history'
import { HEIAN_MARCH_ROUTES } from '../data/marchRoutes'
import { heianFactionCounts } from '../data/territory'
import { useHeianSelection } from '../state/HeianSelectionContext'
import { useHeianYear } from '../state/HeianYearContext'
import { HEIAN_FACTIONS, type HeianFactionId } from '../types'

function useDockDrag() {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null,
  )

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('button')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      ox: offset.x,
      oy: offset.y,
    }
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const start = drag.current
    if (!start) return
    setOffset({
      x: start.ox + event.clientX - start.x,
      y: start.oy + event.clientY - start.y,
    })
  }

  const onPointerUp = () => {
    drag.current = null
  }

  return { offset, onPointerDown, onPointerMove, onPointerUp }
}

function Dock({
  side,
  title,
  children,
}: {
  side: 'left' | 'right'
  title: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(true)
  const { offset, onPointerDown, onPointerMove, onPointerUp } = useDockDrag()

  return (
    <aside
      className={`zhou-dock zhou-dock--${side}${open ? '' : ' is-collapsed'}`}
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
    >
      <header
        className="zhou-dock__bar"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <strong>{title}</strong>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? '收起' : '展開'}
        </button>
      </header>
      {open ? <div className="zhou-dock__body">{children}</div> : null}
    </aside>
  )
}

function colorFor(id: string) {
  return HEIAN_FACTIONS.find((f) => f.id === id)?.color ?? '#78716C'
}

function nameFor(id: string) {
  return HEIAN_FACTIONS.find((f) => f.id === id)?.name ?? id
}

const LEADERS: Record<number, { faction: HeianFactionId; name: string; role: string }[]> =
  {
    1156: [
      { faction: '平氏', name: '平清盛', role: '助後白河' },
      { faction: '源氏', name: '源義朝', role: '助後白河' },
    ],
    1180: [
      { faction: '平氏', name: '平清盛', role: '專權' },
      { faction: '源氏', name: '源賴朝', role: '伊豆起兵' },
    ],
    1183: [
      { faction: '源氏', name: '源義仲', role: '入京' },
      { faction: '平氏', name: '平宗盛', role: '西走' },
    ],
    1185: [
      { faction: '源氏', name: '源賴朝', role: '鎌倉' },
      { faction: '朝廷', name: '後白河法皇', role: '院' },
    ],
  }

export function HeianRouteDock() {
  const { year, month } = useHeianYear()
  const routes = useMemo(
    () => routesForMonth(HEIAN_MARCH_ROUTES, year, month),
    [year, month],
  )
  return (
    <Dock side="left" title="行軍路線">
      <MapRouteLegend
        routes={routes}
        year={year}
        visibleYears={MARCH_ROUTE_SAME_YEAR}
      />
      <p className="route-legend__foot">
        只顯示該年（逐月年份再按月過濾）。拖標題可移動。
      </p>
    </Dock>
  )
}

export function HeianTerritoryDock() {
  const { year, territoryYear, control } = useHeianYear()
  const { selectedFaction, selectFaction } = useHeianSelection()
  const rows = useMemo(() => heianFactionCounts(control), [control])

  const leaders = useMemo(() => {
    const keys = Object.keys(LEADERS)
      .map(Number)
      .sort((a, b) => a - b)
    let best = keys[0]
    for (const y of keys) {
      if (y <= year) best = y
      else break
    }
    return LEADERS[best] ?? []
  }, [year])

  const situation = useMemo(() => {
    if (!selectedFaction) return null
    const notes: YearNote[] = HEIAN_EVENTS.filter(
      (e) => e.year === year && e.factions.includes(selectedFaction),
    ).map((e) => ({ title: e.title, desc: e.desc, source: e.source }))
    return composeFactionYear(HEIAN_SITUATION[selectedFaction], year, notes)
  }, [selectedFaction, year])

  return (
    <Dock side="right" title="勢力範圍">
      <div className="power-board">
        <p className="power-board__title">
          勢力佔區（{territoryYear} 快照）· 點選看人口、戰力、經濟
        </p>
        {selectedFaction && situation ? (
          <FactionSituationPanel
            name={nameFor(selectedFaction)}
            yearLabel={`${year} 年`}
            color={colorFor(selectedFaction)}
            view={situation}
            onClose={() => selectFaction(null)}
          />
        ) : null}
        <ul className="power-board__list">
          {rows.map(({ faction, n }) => {
            const active = selectedFaction === faction
            const lead = leaders.find((l) => l.faction === faction)
            return (
              <li key={faction}>
                <button
                  type="button"
                  className={
                    active
                      ? 'power-board__row power-board__row--btn is-active'
                      : 'power-board__row power-board__row--btn'
                  }
                  aria-pressed={active}
                  onClick={() =>
                    selectFaction(active ? null : (faction as HeianFactionId))
                  }
                >
                  <i style={{ background: colorFor(faction) }} />
                  <span>
                    {nameFor(faction)}
                    {lead ? (
                      <small className="era-dock-leader">
                        {' '}
                        · {lead.name}（{lead.role}）
                      </small>
                    ) : null}
                  </span>
                  <em>{n} 區</em>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </Dock>
  )
}
