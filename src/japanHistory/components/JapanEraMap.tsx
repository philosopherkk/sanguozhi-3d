import { useRef } from 'react'
import { JP_ERA_RINGS } from '../../geo/japanEraRings'
import { MapZoomControls, useMapViewport } from '../../lib/mapViewport'
import { SENGOKU_BASEMAP } from '../../sengoku/data/basemaps'
import { SENGOKU_MAP_H, SENGOKU_MAP_W } from '../../sengoku/data/regions'
import { JAPAN_ERA_BANDS, japanBandAt } from '../data/eras'
import { useJapanYear } from '../state/JapanYearContext'

function LandMarks({
  rings,
  fill,
  label,
  dashed = false,
}: {
  rings: [number, number][][]
  fill: string
  label: string
  dashed?: boolean
}) {
  if (rings.length === 0) return null
  const labelRing = rings.reduce((best, ring) =>
    ring.length > best.length ? ring : best,
  )
  let x = 0
  let y = 0
  for (const [px, py] of labelRing) {
    x += px
    y += py
  }
  x /= labelRing.length
  y /= labelRing.length
  return (
    <g>
      {rings.map((ring, index) => (
        <polygon
          key={`${label}-${index}`}
          points={ring.map(([px, py]) => `${px},${py}`).join(' ')}
          fill={fill}
          stroke="#f3e6c8"
          strokeWidth={2}
          strokeDasharray={dashed ? '7 5' : undefined}
        />
      ))}
      <text x={x} y={y} className="era-map__mark-label">
        {label}
      </text>
    </g>
  )
}

export function JapanEraMap() {
  const { year } = useJapanYear()
  const active = japanBandAt(year)
  const canvasRef = useRef<HTMLDivElement>(null)
  const view = useMapViewport(SENGOKU_MAP_W, SENGOKU_MAP_H, 'cover', canvasRef)

  return (
    <section className="map-stage era-map" aria-label="時代示意">
      <div className="map-stage__canvas era-map__canvas" ref={canvasRef}>
        <div
          className="era-map__zoom"
          ref={view.wrapRef}
          onPointerDown={view.onPointerDown}
          onPointerMove={view.onPointerMove}
          onPointerUp={view.onPointerUp}
          onPointerCancel={view.onPointerUp}
        >
          <div className="era-map__zoom-layer" style={view.layerStyle}>
            {SENGOKU_BASEMAP.srcWebp ? (
              <picture>
                <source type="image/webp" srcSet={SENGOKU_BASEMAP.srcWebp} />
                <img
                  className="era-map__photo"
                  src={SENGOKU_BASEMAP.src}
                  alt=""
                  draggable={false}
                />
              </picture>
            ) : (
              <img
                className="era-map__photo"
                src={SENGOKU_BASEMAP.src}
                alt=""
                draggable={false}
              />
            )}
            {year >= 1604 && year <= 1868 ? (
              <svg
                className="era-map__marks"
                viewBox={`0 0 ${SENGOKU_MAP_W} ${SENGOKU_MAP_H}`}
                preserveAspectRatio="xMidYMid slice"
              >
                <LandMarks
                  rings={JP_ERA_RINGS.matsumae}
                  fill="rgba(42, 74, 90, 0.55)"
                  label="松前"
                />
                {year >= 1609 ? (
                  <LandMarks
                    rings={JP_ERA_RINGS.ryukyu}
                    fill="rgba(184, 92, 56, 0.28)"
                    label="琉球"
                    dashed
                  />
                ) : null}
              </svg>
            ) : null}
            {year >= 1869 && year <= 1878 ? (
              <svg
                className="era-map__marks"
                viewBox={`0 0 ${SENGOKU_MAP_W} ${SENGOKU_MAP_H}`}
                preserveAspectRatio="xMidYMid slice"
              >
                <LandMarks
                  rings={JP_ERA_RINGS.hokkaido}
                  fill="rgba(74, 90, 138, 0.4)"
                  label="北海道"
                />
                <LandMarks
                  rings={JP_ERA_RINGS.ryukyu}
                  fill="rgba(184, 92, 56, 0.28)"
                  label="琉球"
                  dashed
                />
              </svg>
            ) : null}
            {year >= 1879 ? (
              <svg
                className="era-map__marks"
                viewBox={`0 0 ${SENGOKU_MAP_W} ${SENGOKU_MAP_H}`}
                preserveAspectRatio="xMidYMid slice"
              >
                <LandMarks
                  rings={JP_ERA_RINGS.hokkaido}
                  fill="rgba(74, 90, 138, 0.35)"
                  label="北海道"
                />
                <LandMarks
                  rings={JP_ERA_RINGS.ryukyu}
                  fill="rgba(74, 90, 138, 0.55)"
                  label="沖繩"
                />
              </svg>
            ) : null}
          </div>
        </div>
        <MapZoomControls
          onZoomIn={view.zoomIn}
          onZoomOut={view.zoomOut}
          onReset={view.resetView}
        />
        <div className="era-map__hero">
          <p className="era-map__kicker">時代綱要</p>
          <h2 className="era-map__title">{active?.label ?? '—'}</h2>
          <p className="era-map__year">{year} 年</p>
          <p className="era-map__note">
            底圖是現代列島地勢，不是該時代的藩圖。可放大、縮小、拖曳。
            {year >= 1604 && year <= 1868
              ? ' 1604年家康把渡島南部的交易交給松前氏，不是征服整個北海道。1609年以後琉球是薩摩的附庸，虛線，國王仍在，不是幕府直領。'
              : ''}
            {year >= 1869 && year <= 1878
              ? ' 1869年明治政府設開拓使，北海道才進入國家行政。琉球仍是虛線，處分尚未發生。'
              : ''}
            {year >= 1879
              ? ' 1879年以後沖繩是縣，不再是薩摩附庸。1972年以前的施政權歸還是另一件事，地圖不逐年改色。'
              : ''}
          </p>
        </div>

        <ol className="era-map__bands" aria-label="時代色帶">
          {JAPAN_ERA_BANDS.map((b) => {
            const on = year >= b.from && year <= b.to
            return (
              <li
                key={b.id}
                className={on ? 'era-map__band is-active' : 'era-map__band'}
                style={{
                  ['--band-color' as string]: b.color,
                  flexGrow: Math.max(1, Math.round((b.to - b.from) / 80)),
                }}
              >
                <span className="era-map__band-label">{b.label}</span>
                <span className="era-map__band-range">
                  {b.from}–{b.to}
                </span>
              </li>
            )
          })}
        </ol>
        <p className="era-map__credit">
          底圖：
          <a href={SENGOKU_BASEMAP.commonsUrl} target="_blank" rel="noreferrer">
            {SENGOKU_BASEMAP.credit}
          </a>
          （{SENGOKU_BASEMAP.license}）
        </p>
      </div>
    </section>
  )
}
