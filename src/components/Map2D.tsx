import {
  useEffect,
  useMemo,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  CHINA_MARCH_ROUTES,
  FRONTIER_ZONES,
  type FrontierZone,
} from '../data/marchRoutes'
import { basemapForYear } from '../data/historicalBasemaps'
import { MapLayerBar } from './map/MapLayerBar'
import { MapRouteLegend } from './map/MapRouteLegend'
import { MARCH_ROUTE_SAME_YEAR, RouteOverlay } from './map/RouteOverlay'
import {
  BASEMAP_HEIGHT,
  BASEMAP_WIDTH,
} from '../data/basemapProvinces'
import { THREE_KINGDOMS_PLACES } from '../data/chinaPlaces'
import { provenanceForPlace } from '../data/chinaPlacesProvenance'
import {
  TK_PROVINCE_GEOMETRY,
  TK_TERRITORY_NOTE_ZH,
} from '../data/territory/provenance'
import { formatGeometryProvenance } from './TerritoryGeometryProvenanceNote'
import { factionColor, factionName } from '../lib/factionColors'
import {
  clipBasemapRing,
  mergeFactionTerritoriesBasemap,
} from '../lib/mergeFactionPolygons'
import {
  clampMapPan,
  mapZoomStyle,
  useMapPinch,
  useRafView,
  type ViewTransform,
} from '../lib/mapViewport'
import { usePersistedOpen } from '../lib/usePersistedOpen'
import { useSelection } from '../state/SelectionContext'
import { useYear } from '../state/YearContext'
import type { FactionId } from '../types/data'

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

const DEFAULT_FRONTIER = '#2B6CB0'

function frontierVisible(z: FrontierZone, year: number): boolean {
  return year >= z.from && year <= z.to
}

function frontierColor(z: FrontierZone): string {
  return z.color ?? DEFAULT_FRONTIER
}

function hexFade(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  if (h.length !== 6) return hex
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function frontierLabel(z: FrontierZone): string {
  return z.label ?? z.name
}

function frontierTitle(z: FrontierZone): string {
  if (!z.note && !z.shade) return `${z.name} · ${z.source}`
  const parts = [frontierLabel(z), '示意']
  if (z.note) parts.push(z.note)
  parts.push(z.source)
  return parts.join(' · ')
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

export function Map2D() {
  const { year, control, territoryYear } = useYear()
  const { selectedFaction, selectFaction } = useSelection()
  const basemap = useMemo(() => basemapForYear(year), [year])
  const mapCreditTitle = useMemo(() => {
    const license = basemap.license ? `（${basemap.license}）` : ''
    return `時代底圖：${basemap.credit}${license}。現代東亞地勢，東漢三國與春秋戰國共用，不按時代換古圖。海岸沿底圖陸地收回；內陸界順著黃河、長江、秦嶺、大巴、太行、南嶺的大勢，未能逐縣處為示意；${TK_TERRITORY_NOTE_ZH} ${formatGeometryProvenance(TK_PROVINCE_GEOMETRY)} 具名城邑像素為示意錨點（sidecar coord_confidence），非典籍經緯換算；游標指向城名可見出處。五溪蠻只佔沅水上游山地。塞外部族是活動帶示意，不是郡界。行軍沿黃河、長江、三峽、崤函、祁山。地名用當時稱呼。`
  }, [basemap.credit, basemap.license])
  const shapes = useMemo(() => mergeFactionTerritoriesBasemap(control), [control])
  const shadeRings = useMemo(() => {
    const out = new Map<string, [number, number][][]>()
    for (const z of FRONTIER_ZONES) {
      if (!z.shade || z.legendOnly) continue
      const clipped = clipBasemapRing(z.ring)
      out.set(z.id, clipped.length > 0 ? clipped : [z.ring])
    }
    return out
  }, [])

  const wrapRef = useRef<HTMLDivElement>(null)
  const { view, viewRef, setView } = useRafView()
  // 勢力疆域是本地圖的主體，預設開啟（各時代地圖一致）；行軍與塞外為加分層，預設收。
  // 7b179b2 曾把三項一起關掉，使三國地圖再也看不到州郡界線，此處恢復勢力一項。
  // 三個開關都記住上次選擇，使用者關掉的層不會每次重新載入又被打開。
  const [showTerritory, setShowTerritory] = usePersistedOpen(
    'map2d-layer-territory',
    true,
  )
  const [showRoutes, setShowRoutes] = usePersistedOpen(
    'map2d-layer-routes',
    false,
  )
  const [showFrontier, setShowFrontier] = usePersistedOpen(
    'map2d-layer-frontier',
    false,
  )
  const dragRef = useRef<{
    active: boolean
    x0: number
    y0: number
    tx0: number
    ty0: number
    moved: boolean
  } | null>(null)
  const suppressClickRef = useRef(false)

  // 雙指捏合縮放：縮放層 touch-action:none 已停用瀏覽器原生捏合，由手勢接管
  const pinch = useMapPinch({
    viewRef,
    setView,
    getBox: () => wrapRef.current?.getBoundingClientRect() ?? null,
    mapWidth: BASEMAP_WIDTH,
    mapHeight: BASEMAP_HEIGHT,
    fit: 'contain',
    cancelDrag: () => {
      dragRef.current = null
      suppressClickRef.current = true
    },
    resumeDrag: (x, y) => {
      dragRef.current = {
        active: true,
        x0: x,
        y0: y,
        tx0: viewRef.current.tx,
        ty0: viewRef.current.ty,
        moved: true,
      }
    },
  })

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
        // Zoom toward cursor: keep the point under cursor stable
        const k = nextScale / prev.scale
        const tx = cx - k * (cx - prev.tx)
        const ty = cy - k * (cy - prev.ty)
        return clampPan(
          { scale: nextScale, tx, ty },
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
    if (pinch.onPointerDown(e)) return
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
    if (pinch.onPointerMove(e)) return
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
    // 捏合期間的 pointerup 由 pinch 統一處理（其內部已負責 releasePointerCapture）
    if (pinch.onPointerUp(e)) return
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
          {basemap.srcWebp ? (
            <picture>
              <source type="image/webp" srcSet={basemap.srcWebp} />
              <img
                className="map-2d__basemap"
                src={basemap.src}
                alt={basemap.title}
                draggable={false}
              />
            </picture>
          ) : (
            <img
              className="map-2d__basemap"
              src={basemap.src}
              alt={basemap.title}
              draggable={false}
            />
          )}
          <svg
            className="map-2d__overlay"
            viewBox={`0 0 ${BASEMAP_WIDTH} ${BASEMAP_HEIGHT}`}
            role="img"
            aria-label="勢力範圍示意，點選可篩選人物；滾輪縮放，拖曳平移"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <filter id="map-edge-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation="1.2"
                  floodColor="#0a0c08"
                  floodOpacity="0.85"
                />
              </filter>
            </defs>
            {showTerritory
              ? shapes.map(({ faction, rings, provinceIds, labelAt }) => {
                  const active = selectedFaction === faction
                  const color = factionColor(faction)
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
                          selectFaction(faction as FactionId)
                        }}
                      >
                        <title>
                          {factionName(faction)} · {provinceIds.join('、')}
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
                        {factionName(faction)}
                      </text>
                    </g>
                  )
                })
              : null}
            {showFrontier
              ? FRONTIER_ZONES.filter(
                  (z) => !z.shade && !z.legendOnly && frontierVisible(z, year),
                ).map((z) => (
                    <polygon
                      key={z.id}
                      points={z.ring.map(([x, y]) => `${x},${y}`).join(' ')}
                      fill={hexFade(frontierColor(z), 0.28)}
                      stroke={frontierColor(z)}
                      strokeWidth={1.4}
                      strokeDasharray="4 3"
                      pointerEvents="none"
                    >
                      <title>{frontierTitle(z)}</title>
                    </polygon>
                  ),
                )
              : null}
            {showFrontier
              ? FRONTIER_ZONES.filter(
                  (z) => z.shade && !z.legendOnly && frontierVisible(z, year),
                ).map((z) => (
                    <path
                      key={z.id}
                      d={ringsToPath(shadeRings.get(z.id) ?? [z.ring])}
                      fill={frontierColor(z)}
                      fillOpacity={0.62}
                      stroke={darken(frontierColor(z), 0.15)}
                      strokeWidth={1.4}
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                      pointerEvents="none"
                    >
                      <title>{frontierTitle(z)}</title>
                    </path>
                  ),
                )
              : null}
            {showFrontier
              ? FRONTIER_ZONES.filter(
                  (z) => !z.legendOnly && frontierVisible(z, year),
                ).map((z) => {
                  const [x, y] = z.labelAt ?? [z.ring[0][0] + 12, z.ring[0][1] + 18]
                  return (
                    <text
                      key={`${z.id}-label`}
                      x={x}
                      y={y}
                      className={z.shade ? 'map-2d__faction-label' : 'map-route-label'}
                      fill={z.shade ? '#f0e6d0' : '#f0e0c0'}
                      stroke="#1a1810"
                      strokeWidth={2.5}
                      paintOrder="stroke"
                      textAnchor={z.shade ? 'middle' : 'start'}
                      dominantBaseline={z.shade ? 'middle' : 'auto'}
                      pointerEvents="none"
                    >
                      {frontierLabel(z)}
                    </text>
                  )
                })
              : null}
            {THREE_KINGDOMS_PLACES.map((place) => {
              const prov = provenanceForPlace(place.name)
              const title = prov
                ? `${place.name} · 座標${prov.coord_confidence === 'approx' ? '示意' : prov.coord_confidence} · ${prov.coord_note} 出處：${prov.source}`
                : place.name
              return (
              <g key={place.name} pointerEvents="none">
                <circle
                  cx={place.x}
                  cy={place.y}
                  r={7}
                  fill="#f7edd6"
                  stroke="#1a1810"
                  strokeWidth={1.4}
                >
                  <title>{title}</title>
                </circle>
                <text
                  x={place.x + 14}
                  y={place.y - 10}
                  className="zhou-place-label"
                  fill="#fff8e8"
                  stroke="#1a1810"
                  strokeWidth={3}
                  paintOrder="stroke"
                >
                  <title>{title}</title>
                  {place.name}
                </text>
              </g>
            )})}
            {showRoutes ? (
              <RouteOverlay
                routes={CHINA_MARCH_ROUTES}
                year={year}
                visibleYears={MARCH_ROUTE_SAME_YEAR}
                colorFor={(id) => factionColor(id as FactionId)}
                markerScale={2}
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
          frontierPanel={
            <div
              id="frontier-pop"
              className="frontier-pop route-legend"
              role="region"
              aria-label="塞外部族"
            >
              <h3>塞外部族</h3>
              <ul>
                {FRONTIER_ZONES.map((z) => {
                  const active = frontierVisible(z, year)
                  const note =
                    active || z.id !== 'wuhuan'
                      ? z.note
                      : '本年不著色。建安十二年白狼山之後餘部內徙'
                  return (
                    <li
                      key={z.id}
                      className={active ? undefined : 'is-inactive'}
                    >
                      <span className="route-legend__row">
                        <i
                          className={
                            z.shade
                              ? 'route-legend__swatch'
                              : 'route-legend__swatch route-legend__swatch--dashed'
                          }
                          style={{
                            background: z.shade
                              ? frontierColor(z)
                              : hexFade(frontierColor(z), 0.35),
                            borderColor: frontierColor(z),
                          }}
                          aria-hidden
                        />
                        <strong>{frontierLabel(z)}</strong>
                      </span>
                      {note ? <span>{note}</span> : null}
                    </li>
                  )
                })}
              </ul>
            </div>
          }
        />
        {year < 220 ? (
          <p className="map-2d__dynasty-hint">
            國號不自稱之年改用個人號：220 年十月受禪前為曹操，214 年前為劉備，222 年受封吳王前為孫權
          </p>
        ) : null}
        {showRoutes ? (
          <div className="map-2d__route-legend">
            <MapRouteLegend
              routes={CHINA_MARCH_ROUTES}
              year={year}
              visibleYears={MARCH_ROUTE_SAME_YEAR}
            />
          </div>
        ) : null}
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
          {basemap.title} · 疆域示意採 {territoryYear} 年快照 · 滾輪縮放
        </p>
      </div>

      <p className="map-2d__credit" title={mapCreditTitle}>
        底圖：
        <a href={basemap.commonsUrl} target="_blank" rel="noreferrer" title={mapCreditTitle}>
          {basemap.credit}
        </a>
        {basemap.license ? `（${basemap.license}）` : ''}
      </p>
    </div>
  )
}
