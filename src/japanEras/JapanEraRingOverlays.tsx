import { JP_ERA_RINGS, type EraRing } from '../geo/japanEraRings'

function LandMarks({
  rings,
  fill,
  label,
  dashed = false,
  showLabel = true,
}: {
  rings: EraRing[]
  fill: string
  label: string
  dashed?: boolean
  showLabel?: boolean
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
    <g aria-label={label}>
      {rings.map((ring, index) => (
        <polygon
          key={`${label}-${index}`}
          points={ring.map(([px, py]) => `${px},${py}`).join(' ')}
          fill={fill}
          stroke="#f3e6c8"
          strokeWidth={2}
          strokeDasharray={dashed ? '7 5' : undefined}
        >
          <title>{label}</title>
        </polygon>
      ))}
      {showLabel ? (
        <text x={x} y={y} className="era-map__mark-label">
          {label}
        </text>
      ) : null}
    </g>
  )
}

/** 日本史總覽（japanHistory）外周示意：松前／北海道／琉球時間窗。 */
export function JapanOverviewFringeOverlays({ year }: { year: number }) {
  if (year >= 1604 && year <= 1868) {
    return (
      <>
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
      </>
    )
  }
  if (year >= 1869 && year <= 1878) {
    return (
      <>
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
      </>
    )
  }
  if (year >= 1879) {
    return (
      <>
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
      </>
    )
  }
  return null
}

function hexWithAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  if (h.length !== 6) return hex
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

/** 幕末勢力圖：1853–1868 松前＋琉球虛線；1869 起著色北海道（開拓使示意）並保留琉球虛線。 */
export function BakumatsuFringeOverlays({
  year,
  hokkaidoColor = '#B91C1C',
}: {
  year: number
  hokkaidoColor?: string
}) {
  const hokkaidoFill = hexWithAlpha(hokkaidoColor, 0.42)
  if (year < 1853) return null

  if (year >= 1869) {
    return (
      <>
        <LandMarks
          rings={JP_ERA_RINGS.hokkaido}
          fill={hokkaidoFill}
          label="北海道"
          showLabel
        />
        <LandMarks
          rings={JP_ERA_RINGS.ryukyu}
          fill="rgba(184, 92, 56, 0.22)"
          label="琉球"
          dashed
        />
      </>
    )
  }

  return (
    <>
      <LandMarks
        rings={JP_ERA_RINGS.matsumae}
        fill="rgba(42, 74, 90, 0.5)"
        label="松前"
      />
      <LandMarks
        rings={JP_ERA_RINGS.ryukyu}
        fill="rgba(184, 92, 56, 0.22)"
        label="琉球"
        dashed
      />
    </>
  )
}
