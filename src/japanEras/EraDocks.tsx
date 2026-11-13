import {
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { FactionSituationPanel } from '../components/FactionSituationPanel'
import { MapRouteLegend } from '../components/map/MapRouteLegend'
import { MARCH_ROUTE_SAME_YEAR } from '../components/map/RouteOverlay'
import { withLandlessFactions } from '../lib/factionRows'
import { composeFactionYear, type YearNote } from '../lib/factionYearView'
import type { JapanDeepDivePack } from './deepDiveTypes'
import { useDeepDiveSelection } from './DeepDiveSelectionContext'
import { useDeepDiveYear } from './DeepDiveYearContext'
import { usePersistedOpenResponsive } from '../lib/usePersistedOpen'

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
  storageKey,
  defaultOpenDesktop,
  defaultOpenMobile,
  children,
}: {
  side: 'left' | 'right'
  title: string
  /** 收合與否記入 localStorage；各時代分開記，互不覆蓋。 */
  storageKey: string
  /** 桌面與窄螢幕的初始值；使用者開關過一次之後即以他的選擇為準。 */
  defaultOpenDesktop: boolean
  defaultOpenMobile: boolean
  children: ReactNode
}) {
  const [open, setOpen] = usePersistedOpenResponsive(storageKey, {
    desktop: defaultOpenDesktop,
    mobile: defaultOpenMobile,
  })
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

export function EraRouteDock({ pack }: { pack: JapanDeepDivePack }) {
  const { year, mapWindow } = useDeepDiveYear()
  return (
    <Dock
      side="left"
      title="行軍路線"
      storageKey="era-dock-routes"
      defaultOpenDesktop={false}
      defaultOpenMobile={false}
    >
      <MapRouteLegend
        routes={mapWindow ? mapWindow.routes : pack.routes}
        year={year}
        visibleYears={MARCH_ROUTE_SAME_YEAR}
      />
      <p className="route-legend__foot">
        只顯示該年的行軍，不向後延伸。拖標題可移動。
      </p>
    </Dock>
  )
}

export function EraTerritoryDock({ pack }: { pack: JapanDeepDivePack }) {
  const { year, territoryYear, control } = useDeepDiveYear()
  const { selectedFaction, selectFaction } = useDeepDiveSelection()

  const rows = useMemo(() => {
    const counts = new Map<string, number>()
    for (const f of Object.values(control)) {
      counts.set(f, (counts.get(f) ?? 0) + 1)
    }
    return withLandlessFactions(
      [...counts.entries()]
        .map(([faction, n]) => ({ faction, n }))
        .sort((a, b) => b.n - a.n),
      pack.factions,
      year,
    )
  }, [control, pack.factions, year])

  const leaders = useMemo(() => {
    const keys = Object.keys(pack.leadersByYear)
      .map(Number)
      .sort((a, b) => a - b)
    let best = keys[0]
    for (const y of keys) {
      if (y <= year) best = y
      else break
    }
    return pack.leadersByYear[best] ?? []
  }, [pack.leadersByYear, year])

  const colorFor = (id: string) =>
    pack.factions.find((f) => f.id === id)?.color ?? '#78716C'
  const nameFor = (id: string) =>
    pack.factions.find((f) => f.id === id)?.name ?? id

  const situation = useMemo(() => {
    if (!selectedFaction) return null
    const profile = pack.situation[selectedFaction]
    if (!profile) return null
    const notes: YearNote[] = pack.events
      .filter((e) => e.year === year && e.factions.includes(selectedFaction))
      .map((e) => ({ title: e.title, desc: e.desc, source: e.source }))
    return composeFactionYear(profile, year, notes)
  }, [selectedFaction, year, pack])

  return (
    <Dock
      side="right"
      title="勢力範圍"
      storageKey="era-dock-territory"
      defaultOpenDesktop={true}
      defaultOpenMobile={false}
    >
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
                  onClick={() => selectFaction(active ? null : faction)}
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
                  <em>{n === 0 ? '無區' : `${n} 區`}</em>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </Dock>
  )
}
