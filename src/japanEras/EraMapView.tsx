import { useMemo, useRef, useState, type ReactNode } from 'react'
import { MapLayerBar } from '../components/map/MapLayerBar'
import { MapRouteLegend } from '../components/map/MapRouteLegend'
import {
  MARCH_ROUTE_SAME_YEAR,
  RouteOverlay,
} from '../components/map/RouteOverlay'
import type { MarchRoute } from '../data/marchRoutes'
import { MapZoomControls, useMapViewport } from '../lib/mapViewport'
import {
  JAPAN_TERRITORY_NOTE_ZH,
  JP_ERA_RINGS_GEOMETRY,
  JP_ERA_RINGS_HOKKAIDO_1869_NOTE_ZH,
  JP_ERA_RINGS_MATSUMAE_NOTE_ZH,
  JP_ERA_RINGS_RYUKYU_DASHED_NOTE_ZH,
  type TerritoryGeometryProvenance,
} from '../data/territory/provenance'
import { formatGeometryProvenance } from '../components/TerritoryGeometryProvenanceNote'
import { BakumatsuFringeOverlays } from './JapanEraRingOverlays'
import { SENGOKU_BASEMAP } from '../sengoku/data/basemaps'
import { SENGOKU_MAP_H, SENGOKU_MAP_W } from '../sengoku/data/regions'
import type { DeepDiveVectorBasemap } from './deepDiveTypes'

export interface EraDomainShade {
  id: string
  name: string
  ring?: [number, number][]
  extraRings?: [number, number][][]
  /** 現成 SVG path（亞洲—太平洋戰區等以 path 表達之區塊）；優先於 ring */
  d?: string
  /** 區域標籤錨點；僅在呼叫端明確提供時才在圖上標名（日本舊國圖不標） */
  labelAt?: [number, number]
  faction: string
}

/**
 * 環路徑與形心對同一份幾何永遠不變，但每次 pan/zoom 都會重新 render。
 * 幕末的藩 dissolve mesh 有 20 萬個座標數，逐幀重建字串會令地圖嚴重卡頓，
 * 因此以 ring 的物件身份做快取（資料模組內的 ring 是穩定參照）。
 */
const pathCache = new Map<[number, number][], string>()
const centroidCache = new Map<[number, number][], [number, number]>()

function ringPath(ring: [number, number][]): string {
  const hit = pathCache.get(ring)
  if (hit !== undefined) return hit
  const d =
    ring
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
      .join(' ') + ' Z'
  pathCache.set(ring, d)
  return d
}

/**
 * 同一個 domain 的所有 ring 合成單一 path（多個 subpath）。
 * 幕末的藩 mesh 每個 domain 有幾百條 extraRings，逐條出 `<path>` 會產生
 * 數千個 SVG 節點，pan/zoom 時要逐個重新佈局，係地圖卡頓的主因。
 */
const domainPathCache = new Map<object, string>()

function domainPath(ring: [number, number][], extraRings?: [number, number][][]): string {
  const key = extraRings ?? ring
  const hit = domainPathCache.get(key)
  if (hit !== undefined) return hit
  const d = (extraRings ? [ring, ...extraRings] : [ring]).map(ringPath).join(' ')
  domainPathCache.set(key, d)
  return d
}

function centroid(ring: [number, number][]): [number, number] {
  const hit = centroidCache.get(ring)
  if (hit !== undefined) return hit
  let x = 0
  let y = 0
  for (const [a, b] of ring) {
    x += a
    y += b
  }
  const n = ring.length || 1
  const c: [number, number] = [x / n, y / n]
  centroidCache.set(ring, c)
  return c
}

function darken(hex: string, amount = 0.35): string {
  const h = hex.replace('#', '')
  if (h.length !== 6) return hex
  const r = Math.round(parseInt(h.slice(0, 2), 16) * (1 - amount))
  const g = Math.round(parseInt(h.slice(2, 4), 16) * (1 - amount))
  const b = Math.round(parseInt(h.slice(4, 6), 16) * (1 - amount))
  return `rgb(${r},${g},${b})`
}

export function EraMapView({
  ariaLabel,
  year,
  territoryYear,
  shadeNote,
  domains,
  routes,
  places,
  colorFor,
  nameFor,
  selectedFaction,
  onSelectFaction,
  visibleYears = MARCH_ROUTE_SAME_YEAR,
  hideInlineRouteLegend = false,
  japanFringe,
  domainGeometryProvenance,
  extraLayerTabs,
  extraLayerOn = false,
  territoryNote = JAPAN_TERRITORY_NOTE_ZH,
  mapBase,
  fringeGeometryProvenance = JP_ERA_RINGS_GEOMETRY,
}: {
  ariaLabel: string
  year: number
  territoryYear: number
  shadeNote: string
  domains: EraDomainShade[]
  routes: MarchRoute[]
  places: { name: string; x: number; y: number }[]
  colorFor: (id: string) => string
  nameFor: (id: string) => string
  selectedFaction: string | null
  onSelectFaction: (id: string | null) => void
  visibleYears?: number
  hideInlineRouteLegend?: boolean
  japanFringe?: 'bakumatsu'
  domainGeometryProvenance?: TerritoryGeometryProvenance
  extraLayerTabs?: ReactNode
  extraLayerOn?: boolean
  /** 矢量底圖（亞洲—太平洋戰區）；不提供時改用日本列島 relief */
  mapBase?: DeepDiveVectorBasemap
  /** 色塊著色口徑；幕末需要跟「藩界」圖層實際狀態切換 */
  territoryNote?: string
  fringeGeometryProvenance?: TerritoryGeometryProvenance
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [showTerritory, setShowTerritory] = useState(true)
  // 日本各地圖預設收起行軍線（與合并前一致）；戰爭時代（戰區底圖）以入侵路線為主要
  // 內容，預設展開，使用者仍可用下方「行軍」開關收起。
  const [showRoutes, setShowRoutes] = useState(Boolean(mapBase))
  const [showPlaces, setShowPlaces] = useState(false)
  const basemap = SENGOKU_BASEMAP
  const mapW = mapBase?.w ?? SENGOKU_MAP_W
  const mapH = mapBase?.h ?? SENGOKU_MAP_H
  const view = useMapViewport(mapW, mapH)

  const labeled = useMemo(
    () => domains.map((d) => ({ ...d, at: d.ring ? centroid(d.ring) : undefined })),
    [domains],
  )

  const fringeFootnote = useMemo(() => {
    if (japanFringe !== 'bakumatsu') return ''
    if (year >= 1869) {
      return `${formatGeometryProvenance(fringeGeometryProvenance)} ${JP_ERA_RINGS_HOKKAIDO_1869_NOTE_ZH} ${JP_ERA_RINGS_RYUKYU_DASHED_NOTE_ZH}`
    }
    return `${formatGeometryProvenance(fringeGeometryProvenance)} ${JP_ERA_RINGS_MATSUMAE_NOTE_ZH} ${JP_ERA_RINGS_RYUKYU_DASHED_NOTE_ZH}`
  }, [fringeGeometryProvenance, japanFringe, year])

  const domainFootnote = domainGeometryProvenance
    ? formatGeometryProvenance(domainGeometryProvenance)
    : ''

  return (
    <div className="map-2d" ref={rootRef}>
      <div
        className={`map-2d__basemap-wrap${view.view.scale > 1.01 ? ' map-2d__basemap-wrap--zoomed' : ''}`}
        ref={view.wrapRef}
        onPointerDown={view.onPointerDown}
        onPointerMove={view.onPointerMove}
        onPointerUp={view.onPointerUp}
        onPointerCancel={view.onPointerUp}
      >
        <div className="map-2d__zoom-layer" style={view.layerStyle}>
        {mapBase ? (
          <svg
            className="map-2d__basemap map-2d__basemap--vector"
            viewBox={`0 0 ${mapW} ${mapH}`}
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
          >
            <rect x={0} y={0} width={mapW} height={mapH} className="map-2d__sea" />
            {mapBase.graticule.map((g, i) => (
              <path key={`grat-${i}`} d={g} className="map-2d__graticule" />
            ))}
            {mapBase.land.map((l, i) => (
              <path key={`land-${i}`} d={l} className="map-2d__land" />
            ))}
          </svg>
        ) : basemap.srcWebp ? (
          <picture>
            <source type="image/webp" srcSet={basemap.srcWebp} />
            <img
              className="map-2d__basemap"
              src={basemap.src}
              alt={ariaLabel}
              draggable={false}
            />
          </picture>
        ) : (
          <img
            className="map-2d__basemap"
            src={basemap.src}
            alt={ariaLabel}
            draggable={false}
          />
        )}
        <svg
          className="map-2d__overlay"
          viewBox={`0 0 ${mapW} ${mapH}`}
          role="img"
          aria-label={`${ariaLabel}；滾輪縮放，拖曳平移`}
          preserveAspectRatio="xMidYMid meet"
        >
          {showTerritory
            ? labeled.map((d) => {
                if (!d.faction) return null
                const active = selectedFaction === d.faction
                const color = colorFor(d.faction)
                return (
                  <g key={d.id} className="map-2d__faction">
                    <path
                      d={d.d ?? domainPath(d.ring ?? [], d.extraRings)}
                      fill={color}
                      fillOpacity={active ? 0.78 : 0.62}
                      stroke={active ? '#fff8ea' : darken(color, 0.45)}
                      strokeWidth={active ? 2.6 : 1.35}
                      strokeLinejoin="round"
                      className="map-2d__province"
                      onClick={() => {
                        if (view.suppressClickRef.current) {
                          view.suppressClickRef.current = false
                          return
                        }
                        onSelectFaction(active ? null : d.faction)
                      }}
                    >
                      <title>
                        {d.name} · {nameFor(d.faction)}
                      </title>
                    </path>
                    {d.labelAt ? (
                      <text
                        x={d.labelAt[0]}
                        y={d.labelAt[1]}
                        className="map-2d__region-label"
                        fill="#fffaf0"
                        stroke="#1a1610"
                        strokeWidth={3.2}
                        paintOrder="stroke"
                        textAnchor="middle"
                        pointerEvents="none"
                      >
                        {d.name}
                      </text>
                    ) : null}
                  </g>
                )
              })
            : null}
          {showTerritory && japanFringe === 'bakumatsu' ? (
            <BakumatsuFringeOverlays
              year={year}
              hokkaidoColor={colorFor('薩長')}
            />
          ) : null}
          {showPlaces
            ? places.map((p) => (
                <text
                  key={p.name}
                  x={p.x}
                  y={p.y}
                  className="map-place-label"
                  fill="#fffaf0"
                  stroke="#1a1610"
                  strokeWidth={3}
                  paintOrder="stroke"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  pointerEvents="none"
                >
                  {p.name}
                </text>
              ))
            : null}
          {showRoutes ? (
            <RouteOverlay
              routes={routes}
              year={year}
              colorFor={colorFor}
              visibleYears={visibleYears}
            />
          ) : null}
        </svg>
        </div>
        <MapZoomControls
          onZoomIn={view.zoomIn}
          onZoomOut={view.zoomOut}
          onReset={view.resetView}
        />
        <MapLayerBar
          showTerritory={showTerritory}
          showRoutes={showRoutes}
          showPlaces={showPlaces}
          onToggleTerritory={() => setShowTerritory((v) => !v)}
          onToggleRoutes={() => setShowRoutes((v) => !v)}
          onTogglePlaces={() => setShowPlaces((v) => !v)}
          extraTabs={extraLayerTabs}
          extraTabsOn={extraLayerOn}
        />
        {showRoutes && !hideInlineRouteLegend ? (
          <div className="map-2d__route-legend">
            <MapRouteLegend
              routes={routes}
              year={year}
              visibleYears={visibleYears}
            />
          </div>
        ) : null}
        <p className="map-2d__basemap-title">
          {mapBase ? '亞洲—太平洋戰區（今測海岸線）' : '現代列島地勢'} · 勢力示意採 {territoryYear}
          年快照 · 滾輪縮放，拖曳平移
        </p>
      </div>
      <p className="map-2d__credit">
        底圖：
        {mapBase ? (
          `${mapBase.credit}。`
        ) : (
          <>
            <a href={basemap.commonsUrl} target="_blank" rel="noreferrer">
              {basemap.credit}
            </a>
            {basemap.license ? `（${basemap.license}）` : ''}
            。現代列島地勢，平安、戰國、幕末、江戶共用。
          </>
        )}
        {territoryNote}
        {domainFootnote ? ` ${domainFootnote}` : ''}
        {fringeFootnote ? ` 外周：${fringeFootnote}` : ''}
        渡海只標壇之浦與箱館。色塊預設半透明（約
        0.62，點選約 0.78）。{shadeNote}
      </p>
    </div>
  )
}

export function EraPowerBoard({
  territoryYear,
  rows,
  colorFor,
  nameFor,
  selectedFaction,
  onSelectFaction,
  eraIntro,
}: {
  territoryYear: number
  rows: { faction: string; n: number }[]
  colorFor: (id: string) => string
  nameFor: (id: string) => string
  selectedFaction: string | null
  onSelectFaction: (id: string | null) => void
  eraIntro?: (id: string) => string | undefined
}) {
  const intro = selectedFaction ? eraIntro?.(selectedFaction) : undefined
  return (
    <div className="power-board">
      <p className="power-board__title">勢力佔區（{territoryYear} 快照）</p>
      {intro ? (
        <p className="power-board__sub">
          <strong>時代簡介 · </strong>
          {intro}
        </p>
      ) : null}
      <ul className="power-board__list">
        {rows.map(({ faction, n }) => {
          const active = selectedFaction === faction
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
                onClick={() => onSelectFaction(active ? null : faction)}
              >
                <i style={{ background: colorFor(faction) }} />
                <span>{nameFor(faction)}</span>
                <em>{n === 0 ? '無區' : `${n} 區`}</em>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
