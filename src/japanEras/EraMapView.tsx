import { useMemo, useRef, useState } from 'react'
import { MapLayerBar } from '../components/map/MapLayerBar'
import { MapRouteLegend } from '../components/map/MapRouteLegend'
import {
  MARCH_ROUTE_SAME_YEAR,
  RouteOverlay,
} from '../components/map/RouteOverlay'
import type { MarchRoute } from '../data/marchRoutes'
import { MapZoomControls, useMapViewport } from '../lib/mapViewport'
import { JAPAN_TERRITORY_NOTE_ZH } from '../data/territory/provenance'
import { SENGOKU_BASEMAP } from '../sengoku/data/basemaps'
import { SENGOKU_MAP_H, SENGOKU_MAP_W } from '../sengoku/data/regions'

export interface EraDomainShade {
  id: string
  name: string
  ring: [number, number][]
  extraRings?: [number, number][][]
  faction: string
}

function ringPath(ring: [number, number][]): string {
  return (
    ring
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
      .join(' ') + ' Z'
  )
}

function centroid(ring: [number, number][]): [number, number] {
  let x = 0
  let y = 0
  for (const [a, b] of ring) {
    x += a
    y += b
  }
  const n = ring.length || 1
  return [x / n, y / n]
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
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [showTerritory, setShowTerritory] = useState(true)
  const [showRoutes, setShowRoutes] = useState(false)
  const [showPlaces, setShowPlaces] = useState(false)
  const basemap = SENGOKU_BASEMAP
  const view = useMapViewport(SENGOKU_MAP_W, SENGOKU_MAP_H)

  const labeled = useMemo(
    () => domains.map((d) => ({ ...d, at: centroid(d.ring) })),
    [domains],
  )

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
        {basemap.srcWebp ? (
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
          viewBox={`0 0 ${SENGOKU_MAP_W} ${SENGOKU_MAP_H}`}
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
                    {(d.extraRings ? [d.ring, ...d.extraRings] : [d.ring]).map(
                      (ring, index) => (
                        <path
                          key={index}
                          d={ringPath(ring)}
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
                      ),
                    )}
                  </g>
                )
              })
            : null}
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
          現代列島地勢 · 勢力示意採 {territoryYear} 年快照 · 滾輪縮放，拖曳平移
        </p>
      </div>
      <p className="map-2d__credit">
        底圖：
        <a href={basemap.commonsUrl} target="_blank" rel="noreferrer">
          {basemap.credit}
        </a>
        {basemap.license ? `（${basemap.license}）` : ''}
        。現代列島地勢，平安、戰國、幕末、江戶共用。{JAPAN_TERRITORY_NOTE_ZH} 渡海只標壇之浦與箱館。色塊預設半透明（約
        0.62，點選約 0.78）。{shadeNote}
      </p>
    </div>
  )
}

export function EraLegend({
  year,
  territoryYear,
  factions,
  colorFor,
  selectedFaction,
  onSelectFaction,
}: {
  year: number
  territoryYear: number
  factions: { id: string; name: string }[]
  colorFor: (id: string) => string
  selectedFaction: string | null
  onSelectFaction: (id: string | null) => void
}) {
  return (
    <div className="faction-legend">
      <p className="faction-legend__title">
        {year} 年勢力（疆域快照 {territoryYear}）
      </p>
      <ul className="faction-legend__list">
        {factions.map((f) => (
          <li key={f.id}>
            <button
              type="button"
              className={
                selectedFaction === f.id
                  ? 'faction-legend__btn is-active'
                  : 'faction-legend__btn'
              }
              onClick={() =>
                onSelectFaction(selectedFaction === f.id ? null : f.id)
              }
            >
              <i style={{ background: colorFor(f.id) }} />
              {f.name}
            </button>
          </li>
        ))}
      </ul>
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
                <em>{n} 區</em>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
