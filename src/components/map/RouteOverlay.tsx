import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { MarchRoute } from '../../data/marchRoutes'

/**
 * 預設由該年起再留十五年。
 * 春秋戰國、秦漢、十六國南北朝、隋唐傳 0：只顯示標示嗰一年，不向後延伸。
 */
export const MARCH_ROUTE_VISIBLE_YEARS = 15
export const MARCH_ROUTE_SAME_YEAR = 0

export function isMarchRouteVisible(
  routeYear: number,
  selectedYear: number,
  extraYears = MARCH_ROUTE_VISIBLE_YEARS,
): boolean {
  return selectedYear >= routeYear && selectedYear <= routeYear + extraYears
}

function pointsToPath(points: [number, number][]): string {
  return points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`)
    .join(' ')
}

/**
 * 箭咀螢幕尺寸。闊度係深色邊嘅三倍：平常 7×3＝21，近本年 9×3＝27。
 * 長度平常 16、近本年 18。短段最多縮到約六成。不隨地圖縮放變大。
 */
const ARROW_LENGTH_PX = { hot: 18, rest: 16 }
const ARROW_WIDTH_PX = { hot: 27, rest: 21 }
const ARROW_MIN_SCALE = 0.62

/**
 * 三角形尖端伸出折線終點之外。
 * userOverhang 是螢幕像素換算後的突出長度，避免粗線把尖端吞進線身。
 */
function arrowHead(
  points: [number, number][],
  userLength: number,
  userWidth: number,
  userOverhang: number,
): string | null {
  if (points.length < 2) return null
  const [x1, y1] = points[points.length - 2]
  const [x2, y2] = points[points.length - 1]
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy)
  if (len < 0.001 || userLength <= 0) return null
  const ux = dx / len
  const uy = dy / len
  const px = -uy
  const py = ux
  const length = Math.min(userLength, Math.max(userLength * ARROW_MIN_SCALE, len * 0.45))
  const half = (userWidth * (length / userLength)) / 2
  const tipX = x2 + ux * userOverhang
  const tipY = y2 + uy * userOverhang
  const bx = tipX - ux * length
  const by = tipY - uy * length
  const left: [number, number] = [bx + px * half, by + py * half]
  const right: [number, number] = [bx - px * half, by - py * half]
  return `${tipX},${tipY} ${left[0]},${left[1]} ${right[0]},${right[1]}`
}

interface LabelAnchor {
  x: number
  y: number
  anchor: 'start' | 'end'
}

interface LabelShift {
  dx: number
  dy: number
}

interface LabelBox {
  id: string
  x: number
  y: number
  w: number
  h: number
}

/** 終點附近先錯開，再按實際字框把仍然相交的說明推開。 */
function labelAnchors(routes: MarchRoute[], markerScale: number): Map<string, LabelAnchor> {
  const placed: { x: number; y: number }[] = []
  const out = new Map<string, LabelAnchor>()
  for (const route of routes) {
    const pts = route.points
    const last = pts[pts.length - 1]
    const prev = pts[pts.length - 2] ?? last
    const dx = last[0] - prev[0]
    const dy = last[1] - prev[1]
    const len = Math.hypot(dx, dy) || 1
    const ux = dx / len
    const uy = dy / len
    const px = -uy
    const py = ux
    let slot = 0
    for (const earlier of placed) {
      if (Math.hypot(last[0] - earlier.x, last[1] - earlier.y) < 90 * markerScale) slot += 1
    }
    placed.push({ x: last[0], y: last[1] })
    const side = slot % 2 === 0 ? 1 : -1
    const ring = Math.floor(slot / 2)
    out.set(route.id, {
      x: last[0] + ux * (22 * markerScale) + px * side * (28 * markerScale),
      y: last[1] + uy * (8 * markerScale) + py * side * ((36 + ring * 40) * markerScale),
      anchor: side > 0 ? 'start' : 'end',
    })
  }
  return out
}

function boxesOverlap(a: LabelBox, b: LabelBox, pad: number): boolean {
  return a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y
}

function pushApart(placed: LabelBox[], pad: number) {
  const order = placed.map((box, index) => ({ index, y: box.y, x: box.x }))
  order.sort((a, b) => a.y - b.y || a.x - b.x)
  for (const item of order) {
    let guard = 0
    while (guard < 24) {
      const hit = placed.find(
        (other, index) => index !== item.index && boxesOverlap(placed[item.index], other, pad),
      )
      if (!hit) break
      const overlapY =
        Math.min(placed[item.index].y + placed[item.index].h, hit.y + hit.h) -
        Math.max(placed[item.index].y, hit.y)
      placed[item.index].y += overlapY + pad
      guard += 1
    }
  }
}

function keepInside(
  box: LabelBox,
  bounds: { width: number; height: number; margin: number },
) {
  const maxX = Math.max(bounds.margin, bounds.width - bounds.margin - box.w)
  const maxY = Math.max(bounds.margin, bounds.height - bounds.margin - box.h)
  box.x = Math.min(Math.max(box.x, bounds.margin), maxX)
  box.y = Math.min(Math.max(box.y, bounds.margin), maxY)
}

/** 由上至下推開相交說明，並把字框留在底圖裡面。 */
function separateLabels(
  boxes: LabelBox[],
  pad: number,
  bounds?: { width: number; height: number; margin: number },
): Record<string, LabelShift> {
  const placed = boxes.map((box) => ({ ...box }))
  pushApart(placed, pad)
  if (bounds) {
    for (const box of placed) keepInside(box, bounds)
    pushApart(placed, pad)
  }
  const shifts: Record<string, LabelShift> = {}
  for (let i = 0; i < boxes.length; i += 1) {
    shifts[boxes[i].id] = {
      dx: placed[i].x - boxes[i].x,
      dy: placed[i].y - boxes[i].y,
    }
  }
  return shifts
}

function sameShifts(a: Record<string, LabelShift>, b: Record<string, LabelShift>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const key of keys) {
    const left = a[key]
    const right = b[key]
    if (!left || !right) return false
    if (Math.abs(left.dx - right.dx) > 0.5 || Math.abs(left.dy - right.dy) > 0.5) return false
  }
  return true
}

function RouteOverlayInner({
  routes,
  year,
  colorFor,
  formatYear = (y) => String(y),
  markerScale = 1,
  visibleYears = MARCH_ROUTE_VISIBLE_YEARS,
}: {
  routes: MarchRoute[]
  year: number
  colorFor: (faction: string) => string
  /** 預設直接顯示數字。春秋戰國傳入「前632」這類標示，不改三國既有呼叫。 */
  formatYear?: (year: number) => string
  /** 底圖像素變大時放大箭咀與地名偏移，筆畫仍用 non-scaling-stroke。 */
  markerScale?: number
  /** 向後再顯示幾年。0 表示只顯示路線標示的那一年。 */
  visibleYears?: number
}) {
  const visible = routes.filter((r) =>
    isMarchRouteVisible(r.year, year, visibleYears),
  )
  const anchors = useMemo(
    () => labelAnchors(visible, markerScale),
    [visible, markerScale],
  )
  const [shifts, setShifts] = useState<Record<string, LabelShift>>({})
  const [pxPerUnit, setPxPerUnit] = useState(0.45)
  const groupRef = useRef<SVGGElement>(null)
  const textRefs = useRef(new Map<string, SVGTextElement>())
  const signature = visible.map((route) => route.id).join('|')

  useLayoutEffect(() => {
    const group = groupRef.current
    if (!group) return

    let cancelled = false
    const svg = group.ownerSVGElement
    const layout = () => {
      if (cancelled) return
      const scaleCtm = group.getScreenCTM()
      const nextPx = scaleCtm ? Math.hypot(scaleCtm.a, scaleCtm.b) || 0.45 : 0.45
      setPxPerUnit((prev) => (Math.abs(prev - nextPx) < 0.02 ? prev : nextPx))
      const nodes: { id: string; el: SVGTextElement }[] = []
      for (const route of visible) {
        const el = textRefs.current.get(route.id)
        if (el) nodes.push({ id: route.id, el })
      }
      if (nodes.length === 0) {
        setShifts((prev) => (Object.keys(prev).length === 0 ? prev : {}))
        return
      }
      const ctm = nodes[0].el.getScreenCTM()
      const pxPerUnit = ctm ? Math.hypot(ctm.a, ctm.b) || 1 : 1
      const pad = 10 / pxPerUnit
      const boxes: LabelBox[] = nodes.map(({ id, el }) => {
        const box = el.getBBox()
        return { id, x: box.x, y: box.y, w: box.width, h: box.height }
      })
      const view = svg?.viewBox.baseVal
      const bounds =
        view && view.width > 0 && view.height > 0
          ? { width: view.width, height: view.height, margin: 12 / pxPerUnit }
          : undefined
      const next = separateLabels(boxes, pad, bounds)
      setShifts((prev) => (sameShifts(prev, next) ? prev : next))
    }

    layout()
    const observer = svg ? new ResizeObserver(layout) : null
    if (svg && observer) observer.observe(svg)
    const fonts = document.fonts
    if (fonts?.ready) void fonts.ready.then(layout)
    return () => {
      cancelled = true
      observer?.disconnect()
    }
    // signature 已涵蓋可見路線；visible 每次 render 都是新陣列，不能放進依賴。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])

  return (
    <g className="map-routes" ref={groupRef} pointerEvents="none">
      {visible.map((r) => {
        const hot = Math.abs(r.year - year) <= 8
        const d = pointsToPath(r.points)
        const head = arrowHead(
          r.points,
          (hot ? ARROW_LENGTH_PX.hot : ARROW_LENGTH_PX.rest) / pxPerUnit,
          (hot ? ARROW_WIDTH_PX.hot : ARROW_WIDTH_PX.rest) / pxPerUnit,
          (hot ? 16 : 14) / pxPerUnit,
        )
        const anchor = anchors.get(r.id)
        const shift = shifts[r.id] ?? { dx: 0, dy: 0 }
        const color = colorFor(r.faction)
        const label = `${formatYear(r.year)} ${r.name}`
        return (
          <g key={r.id}>
            <path
              d={d}
              fill="none"
              stroke="#fff6df"
              strokeOpacity={0.92}
              strokeWidth={hot ? 14 : 11}
              strokeLinecap="butt"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={d}
              fill="none"
              stroke="#1a1810"
              strokeOpacity={0.95}
              strokeWidth={hot ? 9 : 7}
              strokeLinecap="butt"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={d}
              fill="none"
              stroke={color}
              strokeOpacity={1}
              strokeWidth={hot ? 5.5 : 4.2}
              strokeLinecap="butt"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            {head ? (
              <polygon
                points={head}
                fill={color}
                fillOpacity={0.95}
                stroke="#1a1810"
                strokeWidth={0.6}
                vectorEffect="non-scaling-stroke"
                strokeLinejoin="miter"
              />
            ) : null}
            {anchor ? (
              <text
                ref={(el) => {
                  if (el) textRefs.current.set(r.id, el)
                  else textRefs.current.delete(r.id)
                }}
                x={anchor.x}
                y={anchor.y}
                transform={`translate(${shift.dx} ${shift.dy})`}
                textAnchor={anchor.anchor}
                className="map-route-label"
                fill="#f7edd6"
                stroke="#1a1810"
                strokeWidth={3}
                paintOrder="stroke"
              >
                {label}
                <title>
                  {r.name}（{formatYear(r.year)}）· {r.source}
                </title>
              </text>
            ) : null}
          </g>
        )
      })}
    </g>
  )
}

export const RouteOverlay = memo(RouteOverlayInner)
