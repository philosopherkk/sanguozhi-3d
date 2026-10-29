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
import { ZHOU_FRONTIER_ZONES } from '../data/frontier'
import { zhouRoutesForView } from '../data/lateStages'
import { ZHOU_MARCH_ROUTES } from '../data/marchRoutes'
import { ZHOU_PLACES } from '../data/places'
import { ZHOU_TERRITORY_NOTE } from '../data/territoryControl'
import { clampMapPan, mapZoomStyle, useRafView, type ViewTransform } from '../../lib/mapViewport'
import { zhouFactionColor, zhouFactionName } from '../lib/factionColors'
import { formatZhouYear } from '../lib/formatYear'
import { useZhouSelection } from '../state/ZhouSelectionContext'
import { useZhouYear } from '../state/ZhouYearContext'
import type { ZhouFactionId } from '../types'

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

function ringCentroid(ring: [number, number][]): [number, number] {
  let x = 0
  let y = 0
  for (const [a, b] of ring) {
    x += a
    y += b
  }
  return [x / ring.length, y / ring.length]
}

export function ZhouMap() {
  const { year, month, territoryYear, snapshot } = useZhouYear()
  const marchRoutes = useMemo(
    () => zhouRoutesForView(ZHOU_MARCH_ROUTES, year, month),
    [year, month],
  )
  const { selectedFaction, selectFaction } = useZhouSelection()
  const shapes = useMemo(
    () => shapesFromExtensions(snapshot.ranges),
    [snapshot],
  )

  const wrapRef = useRef<HTMLDivElement>(null)
  const { view, viewRef, setView } = useRafView()
  const [showTerritory, setShowTerritory] = useState(true)
  const [showRoutes, setShowRoutes] = useState(true)
  const [showFrontier, setShowFrontier] = useState(false)
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
        const tx = cx - k * (cx - prev.tx)
        const ty = cy - k * (cy - prev.ty)
        return clampPan({ scale: nextScale, tx, ty }, rect.width, rect.height)
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

  const resetView = () => setView({ scale: 1, tx: 0, ty: 0 })
  const layerStyle = mapZoomStyle(view.scale, view.tx, view.ty)
  const frontiers = ZHOU_FRONTIER_ZONES.filter(
    (z) => year >= z.from && year <= z.to,
  )

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
            alt="現代東亞地勢，標周世都邑"
            draggable={false}
          />
          <svg
            className="map-2d__overlay"
            viewBox={`0 0 ${BASEMAP_WIDTH} ${BASEMAP_HEIGHT}`}
            role="img"
            aria-label="春秋戰國勢力示意，點選可篩選人物；滾輪縮放，拖曳平移"
            preserveAspectRatio="xMidYMid meet"
          >
            {showTerritory
              ? shapes.map(({ faction, rings, labelAt }) => {
                  const id = faction as ZhouFactionId
                  const active = selectedFaction === id
                  const color = zhouFactionColor(id)
                  const d = ringsToPath(rings)
                  const [lx, ly] = labelAt
                  return (
                    <g key={faction} className="map-2d__faction">
                      <path
                        d={d}
                        fill={color}
                        fillOpacity={active ? 0.78 : 0.62}
                        stroke={active ? '#f5edd8' : darken(color, 0.15)}
                        strokeWidth={active ? 2.2 : 1.4}
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                        className="map-2d__province"
                        onClick={(ev) => {
                          if (suppressClickRef.current) {
                            suppressClickRef.current = false
                            return
                          }
                          ev.stopPropagation()
                          selectFaction(selectedFaction === id ? null : id)
                        }}
                      >
                        <title>
                          {zhouFactionName(id)} · {formatZhouYear(territoryYear)}
                          {snapshot.label}
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
                        {zhouFactionName(id)}
                      </text>
                    </g>
                  )
                })
              : null}
            {showFrontier
              ? frontiers.map((z) => (
                  <polygon
                    key={z.id}
                    points={z.ring.map(([x, y]) => `${x},${y}`).join(' ')}
                    fill="rgba(120, 96, 64, 0.28)"
                    stroke="#e6d2a8"
                    strokeWidth={1.2}
                    strokeDasharray="4 3"
                    pointerEvents="none"
                  >
                    <title>
                      {z.name} · {z.source}
                    </title>
                  </polygon>
                ))
              : null}
            {showFrontier
              ? frontiers.map((z) => {
                  const [x, y] = ringCentroid(z.ring)
                  return (
                    <text
                      key={`${z.id}-label`}
                      x={x}
                      y={y}
                      className="map-route-label"
                      fill="#f0e0c0"
                      stroke="#1a1810"
                      strokeWidth={2.5}
                      paintOrder="stroke"
                      textAnchor="middle"
                      pointerEvents="none"
                    >
                      {z.name}
                    </text>
                  )
                })
              : null}
            {ZHOU_PLACES.filter((place) => {
              if (place.fromYear != null && year < place.fromYear) return false
              if (place.toYear != null && year > place.toYear) return false
              return true
            }).map((place) => (
              <g key={place.id} pointerEvents="none">
                <circle
                  cx={place.x}
                  cy={place.y}
                  r={7}
                  fill="#f7edd6"
                  stroke="#1a1810"
                  strokeWidth={1}
                />
                <text
                  x={place.x + 14}
                  y={place.y - 10}
                  className="zhou-place-label"
                  fill="#fff8e8"
                  stroke="#1a1810"
                  strokeWidth={3}
                  paintOrder="stroke"
                >
                  {place.name}
                </text>
                <title>
                  {place.name} · {place.note} · {place.source}
                </title>
              </g>
            ))}
            {showRoutes ? (
              <RouteOverlay
                routes={marchRoutes}
                year={year}
                colorFor={zhouFactionColor}
                formatYear={formatZhouYear}
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
          showFrontier={showFrontier}
          onToggleFrontier={() => setShowFrontier((v) => !v)}
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
                const nextScale = Math.min(MAX_ZOOM, prev.scale * 1.25)
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
            ＋
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
                const nextScale = Math.max(MIN_ZOOM, prev.scale / 1.25)
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
            －
          </button>
          {view.scale > 1.01 ? (
            <button
              type="button"
              className="map-2d__zoom-btn map-2d__zoom-btn--reset"
              aria-label="重設視野"
              onClick={resetView}
            >
              重設
            </button>
          ) : null}
        </div>

        <p className="map-2d__basemap-title">
          周世勢力示意 · 快照 {formatZhouYear(territoryYear)}（{snapshot.label}）
          · 滾輪縮放
        </p>
      </div>

      <p className="map-2d__credit">
        底圖借用
        <a href={BASEMAP.commonsUrl} target="_blank" rel="noreferrer">
          {BASEMAP.credit}
        </a>
        {BASEMAP.license ? `（${BASEMAP.license}）` : ''}
        。現代東亞地勢，與東漢三國共用，不按時代換古圖。都邑用周名（洛邑、臨淄、郢、咸陽、邯鄲、大梁）。海岸沿底圖陸地收回；內陸界順著山河大勢，未能逐國處為示意。行軍沿河谷與崤函，不穿秦嶺。{ZHOU_TERRITORY_NOTE}
      </p>
    </div>
  )
}
