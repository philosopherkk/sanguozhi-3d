import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { MapRouteLegend } from '../../components/map/MapRouteLegend'
import { MARCH_ROUTE_SAME_YEAR } from '../../components/map/RouteOverlay'
import { QINHAN_MARCH_ROUTES } from '../data/marchRoutes'
import { formatQinHanYear } from '../lib/formatYear'
import { useQinHanYear } from '../state/QinHanYearContext'
import { QinHanPowerBoard } from './QinHanPowerBoard'

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
          onClick={() => setOpen((v) => !v)}
        >
          {open ? '收起' : '展開'}
        </button>
      </header>
      {open ? <div className="zhou-dock__body">{children}</div> : null}
    </aside>
  )
}

export function QinHanRouteDock() {
  const { year } = useQinHanYear()
  return (
    <Dock side="left" title="行軍路線">
      <MapRouteLegend
        routes={QINHAN_MARCH_ROUTES}
        year={year}
        formatYear={formatQinHanYear}
        visibleYears={MARCH_ROUTE_SAME_YEAR}
      />
      <p className="route-legend__foot">
        只顯示該年的行軍（楚漢各役按年出現）。拖標題可移動。
      </p>
    </Dock>
  )
}

export function QinHanTerritoryDock() {
  return (
    <Dock side="right" title="勢力範圍">
      <QinHanPowerBoard />
    </Dock>
  )
}
