import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { MapRouteLegend } from '../../components/map/MapRouteLegend'
import { MARCH_ROUTE_SAME_YEAR } from '../../components/map/RouteOverlay'
import { zhouRoutesForView } from '../data/lateStages'
import { ZHOU_MARCH_ROUTES } from '../data/marchRoutes'
import { formatZhouYear } from '../lib/formatYear'
import { useZhouYear } from '../state/ZhouYearContext'
import { ZhouFactionCard } from './ZhouFactionCard'
import { ZhouPowerBoard } from './ZhouPowerBoard'

function useDockDrag() {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

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

export function ZhouRouteDock() {
  const { year, month, lateStage } = useZhouYear()
  const routes = useMemo(
    () => zhouRoutesForView(ZHOU_MARCH_ROUTES, year, month),
    [year, month],
  )
  return (
    <Dock side="left" title="行軍路線">
      <MapRouteLegend
        routes={routes}
        year={year}
        formatYear={formatZhouYear}
        visibleYears={MARCH_ROUTE_SAME_YEAR}
      />
      <p className="route-legend__foot">
        {lateStage
          ? '戰國尾每次只顯示這一個月的行軍。'
          : '只顯示該年的行軍，不向後延伸。拖標題可移動。'}
      </p>
      <ZhouFactionCard />
    </Dock>
  )
}

export function ZhouTerritoryDock() {
  return (
    <Dock side="right" title="勢力範圍">
      <ZhouPowerBoard />
    </Dock>
  )
}
