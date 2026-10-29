import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  BASEMAP_HEIGHT,
  BASEMAP_WIDTH,
} from '../../data/basemapProvinces'
import { HISTORICAL_BASEMAPS } from '../../data/historicalBasemaps'
import {
  MARCH_ROUTE_SAME_YEAR,
  RouteOverlay,
} from '../../components/map/RouteOverlay'
import { MapLayerBar } from '../../components/map/MapLayerBar'
import { shapesFromExtensions } from '../../lib/eraShapes'
import { clampMapPan, mapZoomStyle, useRafView, type ViewTransform } from '../../lib/mapViewport'
import { imperialFactionColor, imperialFactionName } from '../lib/factionColor'
import { useImperialSelection } from '../state/ImperialSelectionContext'
import { useImperialYear } from '../state/ImperialYearContext'

const BASEMAP = HISTORICAL_BASEMAPS[0]
const MIN_ZOOM = 1
const MAX_ZOOM = 4.5

function ringsToPath(rings: [number, number][][]): string {
  return rings
    .map((ring) => {
      return (
        ring
          .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
          .join(' ') + ' Z'
      )
    })
    .join(' ')
}

function darken(hex: string, amount = 0.35): string {
  const h = hex.replace('#', '')
  if (h.length !== 6) return hex
  const r = Math.round(parseInt(h.slice(0, 2), 16) * (1 - amount))
  const g = Math.round(parseInt(h.slice(2, 4), 16) * (1 - amount))
  const b = Math.round(parseInt(h.slice(4, 6), 16) * (1 - amount))
  return `rgb(${r},${g},${b})`
}

function clampPan(v: ViewTransform, cw: number, ch: number): ViewTransform {
  return clampMapPan(v, cw, ch, BASEMAP_WIDTH, BASEMAP_HEIGHT, 'contain')
}

export function ImperialMap() {
  const { pack, year, territoryYear, snapshot } = useImperialYear()
  const { selectedFaction, selectFaction } = useImperialSelection()
  const colorFor = (id: string) => imperialFactionColor(pack, id)
  const nameFor = (id: string) => imperialFactionName(pack, id)

  const shapes = useMemo(
    () => shapesFromExtensions(snapshot.extensions),
    [snapshot],
  )

  const wrapRef = useRef<HTMLDivElement>(null)
  const { view, viewRef, setView } = useRafView()
  const [showTerritory, setShowTerritory] = useState(true)
  const [showRoutes, setShowRoutes] = useState(true)
  const dragRef = useRef<{
    active: boolean
    x0: number
    y0: number
    tx0: number
    ty0: number
    moved: boolean
  } | null>(null)
  const suppressClickRef = useRef(false)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
      setView((prev) => {
        const nextScale = Math.min(
          MAX_ZOOM,
          Math.max(MIN_ZOOM, prev.scale * factor),
        )
        if (nextScale === prev.scale) return prev
        const k = nextScale / prev.scale
        return clampPan(
          {
            scale: nextScale,
            tx: cx - k * (cx - prev.tx),
            ty: cy - k * (cy - prev.ty),
          },
          rect.width,
          rect.height,
        )
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0) return
    const el = wrapRef.current
    if (!el) return
    el.setPointerCapture(e.pointerId)
    suppressClickRef.current = false
    dragRef.current = {
      active: true,
      x0: e.clientX,
      y0: e.clientY,
      tx0: viewRef.current.tx,
      ty0: viewRef.current.ty,
      moved: false,
    }
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    const d = dragRef.current
    if (!d?.active) return
    const dx = e.clientX - d.x0
    const dy = e.clientY - d.y0
    if (Math.hypot(dx, dy) > 3) d.moved = true
    if (viewRef.current.scale <= 1.001) return
    const el = wrapRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setView(
      clampPan(
        { scale: viewRef.current.scale, tx: d.tx0 + dx, ty: d.ty0 + dy },
        rect.width,
        rect.height,
      ),
    )
  }

  const onPointerUp = (e: ReactPointerEvent) => {
    const d = dragRef.current
    if (d?.moved) suppressClickRef.current = true
    dragRef.current = null
    try {
      wrapRef.current?.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  const layerStyle = mapZoomStyle(view.scale, view.tx, view.ty)

  return (
    <div className="map-2d">
      <div
        className={`map-2d__basemap-wrap${view.scale > 1.01 ? ' map-2d__basemap-wrap--zoomed' : ''}`}
        ref={wrapRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="map-2d__zoom-layer" style={layerStyle}>
          <img
            className="map-2d__basemap"
            src={BASEMAP.src}
            alt={`${pack.title}底圖`}
            draggable={false}
          />
          <svg
            className="map-2d__overlay"
            viewBox={`0 0 ${BASEMAP_WIDTH} ${BASEMAP_HEIGHT}`}
            role="img"
            aria-label={`${pack.title}勢力示意`}
            preserveAspectRatio="xMidYMid meet"
          >
            {showTerritory
              ? shapes.map(({ faction, rings, labelAt }) => {
                  const active = selectedFaction === faction
                  const color = colorFor(faction)
                  const tributary = String(faction) === '新羅'
                  const [lx, ly] = labelAt
                  return (
                    <g key={faction} className="map-2d__faction">
                      <path
                        d={ringsToPath(rings)}
                        fill={color}
                        fillOpacity={
                          tributary ? (active ? 0.45 : 0.28) : active ? 0.78 : 0.62
                        }
                        stroke={active ? '#f5edd8' : darken(color, 0.15)}
                        strokeWidth={active ? 2.2 : 1.4}
                        strokeDasharray={tributary ? '8 6' : undefined}
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                        className="map-2d__province"
                        onClick={(ev) => {
                          if (suppressClickRef.current) {
                            suppressClickRef.current = false
                            return
                          }
                          ev.stopPropagation()
                          selectFaction(
                            selectedFaction === faction ? null : faction,
                          )
                        }}
                      >
                        <title>
                          {nameFor(faction)} · {territoryYear} · {snapshot.label}
                        </title>
                      </path>
                      <text
                        x={lx}
                        y={ly}
                        className="map-2d__faction-label"
                        fill={active ? '#fff8e8' : '#f0e6d0'}
                        stroke="#1a1810"
                        strokeWidth={2.5}
                        paintOrder="stroke"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        pointerEvents="none"
                      >
                        {nameFor(faction)}
                      </text>
                    </g>
                  )
                })
              : null}
            {showRoutes ? (
              <RouteOverlay
                routes={pack.routes}
                year={year}
                colorFor={colorFor}
                markerScale={2}
                visibleYears={MARCH_ROUTE_SAME_YEAR}
              />
            ) : null}
          </svg>
        </div>

        <MapLayerBar
          showTerritory={showTerritory}
          showRoutes={showRoutes}
          onToggleTerritory={() => setShowTerritory((v) => !v)}
          onToggleRoutes={() => setShowRoutes((v) => !v)}
        />

        <div className="map-2d__zoom-ui">
          <button
            type="button"
            className="map-2d__zoom-btn"
            aria-label="放大"
            onClick={() => {
              const el = wrapRef.current
              if (!el) return
              const rect = el.getBoundingClientRect()
              const cx = rect.width / 2
              const cy = rect.height / 2
              setView((prev) => {
                const nextScale = Math.min(MAX_ZOOM, prev.scale * 1.2)
                const k = nextScale / prev.scale
                return clampPan(
                  {
                    scale: nextScale,
                    tx: cx - k * (cx - prev.tx),
                    ty: cy - k * (cy - prev.ty),
                  },
                  rect.width,
                  rect.height,
                )
              })
            }}
          >
            +
          </button>
          <button
            type="button"
            className="map-2d__zoom-btn"
            aria-label="縮小"
            onClick={() => {
              const el = wrapRef.current
              if (!el) return
              const rect = el.getBoundingClientRect()
              const cx = rect.width / 2
              const cy = rect.height / 2
              setView((prev) => {
                const nextScale = Math.max(MIN_ZOOM, prev.scale / 1.2)
                const k = nextScale / prev.scale
                return clampPan(
                  {
                    scale: nextScale,
                    tx: cx - k * (cx - prev.tx),
                    ty: cy - k * (cy - prev.ty),
                  },
                  rect.width,
                  rect.height,
                )
              })
            }}
          >
            −
          </button>
          <button
            type="button"
            className="map-2d__zoom-btn"
            aria-label="重設"
            onClick={() => setView({ scale: 1, tx: 0, ty: 0 })}
          >
            重置
          </button>
        </div>
      </div>
      <p className="map-2d__credit">
        底圖現代東亞地勢 · 州格示意大於實控 · {snapshot.note ?? snapshot.source}
      </p>
    </div>
  )
}
