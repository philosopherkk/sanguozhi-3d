import { useMemo, useRef, useState } from 'react'
import { MapLayerBar } from '../../components/map/MapLayerBar'
import { MapRouteLegend } from '../../components/map/MapRouteLegend'
import { RouteOverlay } from '../../components/map/RouteOverlay'
import { MapZoomControls, useMapViewport } from '../../lib/mapViewport'
import { SENGOKU_DAIMYO_LABELS } from '../data/daimyoLabels'
import { SENGOKU_MARCH_ROUTES } from '../data/marchRoutes'
import { SENGOKU_BASEMAP } from '../data/basemaps'
import { SENGOKU_MAP_H, SENGOKU_MAP_W } from '../data/regions'
import { TRACED_DOMAINS } from '../data/tracedDomains'
import { sengokuFactionColor } from '../lib/factionColors'
import { useSengokuSelection } from '../state/SengokuSelectionContext'
import { useSengokuYear } from '../state/SengokuYearContext'
import type { SengokuFactionId } from '../types'

function ringPath(ring: [number, number][]): string {
  return (
    ring
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
      .join(' ') + ' Z'
  )
}

function darken(hex: string, amount = 0.35): string {
  const h = hex.replace('#', '')
  if (h.length !== 6) return hex
  const r = Math.round(parseInt(h.slice(0, 2), 16) * (1 - amount))
  const g = Math.round(parseInt(h.slice(2, 4), 16) * (1 - amount))
  const b = Math.round(parseInt(h.slice(4, 6), 16) * (1 - amount))
  return `rgb(${r},${g},${b})`
}

export function SengokuMap() {
  const { year, control, territoryYear } = useSengokuYear()
  const { selectedFaction, selectFaction } = useSengokuSelection()
  const rootRef = useRef<HTMLDivElement>(null)
  const [showTerritory, setShowTerritory] = useState(true)
  const [showRoutes, setShowRoutes] = useState(false)
  const [showPlaces, setShowPlaces] = useState(false)
  const view = useMapViewport(SENGOKU_MAP_W, SENGOKU_MAP_H)
  const basemap = SENGOKU_BASEMAP
  const domains = useMemo(
    () =>
      TRACED_DOMAINS.map((d) => ({
        ...d,
        faction: control[d.zone] ?? d.clan,
      })),
    [control],
  )
  const daimyoLabels =
    showPlaces || showTerritory
      ? SENGOKU_DAIMYO_LABELS
      : SENGOKU_DAIMYO_LABELS.filter((label) => label.gap)

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
        <img
          className="map-2d__basemap"
          src={basemap.src}
          alt={basemap.title}
          draggable={false}
        />
        <svg
          className="map-2d__overlay"
          viewBox={`0 0 ${SENGOKU_MAP_W} ${SENGOKU_MAP_H}`}
          role="img"
          aria-label="戰國大名勢力示意，點選可篩選人物；滾輪縮放，拖曳平移"
          preserveAspectRatio="xMidYMid meet"
        >
          {showTerritory
            ? domains.map((d) => {
                const active = selectedFaction === d.faction
                const color = sengokuFactionColor(d.faction)
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
                            selectFaction(d.faction as SengokuFactionId)
                          }}
                        >
                          <title>{d.name}</title>
                        </path>
                      ),
                    )}
                  </g>
                )
              })
            : null}
          {daimyoLabels.map((label) => (
            <text
              key={`${label.name}-${label.x}-${label.y}`}
              x={label.x}
              y={label.y}
              className="map-place-label"
              fill="#241c14"
              stroke="#fffaf0"
              strokeWidth={3}
              paintOrder="stroke"
              textAnchor="middle"
              dominantBaseline="middle"
              pointerEvents="none"
            >
              {label.name}
            </text>
          ))}
          {showRoutes ? (
            <RouteOverlay
              routes={SENGOKU_MARCH_ROUTES}
              year={year}
              colorFor={sengokuFactionColor}
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
        {showRoutes ? (
          <div className="map-2d__route-legend">
            <MapRouteLegend routes={SENGOKU_MARCH_ROUTES} year={year} />
          </div>
        ) : null}
        <p className="map-2d__basemap-title">
          {basemap.title} · 勢力示意採 {territoryYear} 年快照 · 滾輪縮放，拖曳平移
        </p>
      </div>
      <p className="map-2d__credit">
        底圖：
        <a href={basemap.commonsUrl} target="_blank" rel="noreferrer">
          {basemap.credit}
        </a>
        {basemap.license ? `（${basemap.license}）` : ''}
        。現代列島地勢，平安、戰國、幕末、江戶共用，不按時代換古圖。海岸沿底圖陸地收回；大名內陸分界仍是示意，非學術地圖矢量化追蹤。大名用漢字。渡海只標文祿。
      </p>
    </div>
  )
}
