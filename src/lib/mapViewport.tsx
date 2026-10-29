import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'

/**
 * Pan/zoom for a basemap layer with transform-origin 0 0 and
 * `translate() scale()` (translate first). Screen = local * scale + t.
 * Limits pin the fitted image edges to the viewport, including the
 * object-fit letterbox. Do not use the ±(scale-1)*size/2 formula; that
 * assumes transform-origin center.
 */

export const MAP_MIN_ZOOM = 1
export const MAP_MAX_ZOOM = 4.5

export interface ViewTransform {
  scale: number
  tx: number
  ty: number
}

export type MapFit = 'contain' | 'cover'

interface DragState {
  active: boolean
  x0: number
  y0: number
  tx0: number
  ty0: number
  moved: boolean
}

/** tx/ty that pins one edge of the pre-scale rect onto the matching viewport edge. */
function edgeTranslations(
  offset: number,
  size: number,
  viewport: number,
  scale: number,
): { min: number; max: number } {
  const atStart = -offset * scale
  const atEnd = viewport - (offset + size) * scale
  return { min: Math.min(atStart, atEnd), max: Math.max(atStart, atEnd) }
}

export function clampMapPan(
  v: ViewTransform,
  cw: number,
  ch: number,
  mapWidth: number,
  mapHeight: number,
  fit: MapFit = 'contain',
): ViewTransform {
  const { scale, tx, ty } = v
  if (fit === 'contain' && scale <= 1.001) return { scale: 1, tx: 0, ty: 0 }
  if (cw <= 0 || ch <= 0) return v
  const mapAspect = mapWidth / mapHeight
  const boxAspect = cw / ch
  const containWider = boxAspect > mapAspect
  let dispW: number
  let dispH: number
  if (fit === 'contain' ? containWider : !containWider) {
    dispH = ch
    dispW = ch * mapAspect
  } else {
    dispW = cw
    dispH = cw / mapAspect
  }
  const txLim = edgeTranslations((cw - dispW) / 2, dispW, cw, scale)
  const tyLim = edgeTranslations((ch - dispH) / 2, dispH, ch, scale)
  const nextScale = Math.min(MAP_MAX_ZOOM, Math.max(MAP_MIN_ZOOM, scale))
  return {
    scale: nextScale,
    tx: Math.min(txLim.max, Math.max(txLim.min, tx)),
    ty: Math.min(tyLim.max, Math.max(tyLim.min, ty)),
  }
}

function zoomFactor(e: WheelEvent): number {
  const pinch = e.ctrlKey || e.metaKey
  if (pinch) return Math.exp(-e.deltaY * 0.012)
  return e.deltaY < 0 ? 1.12 : 1 / 1.12
}

/**
 * Lay the map out at the zoomed size and only translate it.
 * CSS `scale()` rasterises the layer first, so relief labels and
 * overlay type go soft at maximum zoom.
 */
/** 拖曳同滾輪收成每幀一次 setState，避免每個 pointermove 重畫整幅地圖。 */
export function useRafView(initial: ViewTransform = { scale: 1, tx: 0, ty: 0 }) {
  const [view, setViewState] = useState(initial)
  const viewRef = useRef(view)
  const frame = useRef(0)

  const setView = useCallback(
    (next: ViewTransform | ((prev: ViewTransform) => ViewTransform)) => {
      const resolved =
        typeof next === 'function' ? next(viewRef.current) : next
      const prev = viewRef.current
      if (
        resolved.scale === prev.scale &&
        resolved.tx === prev.tx &&
        resolved.ty === prev.ty
      ) {
        return
      }
      viewRef.current = resolved
      if (frame.current) return
      frame.current = requestAnimationFrame(() => {
        frame.current = 0
        setViewState(viewRef.current)
      })
    },
    [],
  )

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current)
    },
    [],
  )

  return { view, viewRef, setView }
}

export function mapZoomStyle(scale: number, tx: number, ty: number): CSSProperties {
  return {
    width: `${scale * 100}%`,
    height: `${scale * 100}%`,
    transform: `translate(${tx}px, ${ty}px)`,
  }
}

export function useMapViewport(
  mapWidth: number,
  mapHeight: number,
  fit: MapFit = 'contain',
  wheelTargetRef?: RefObject<HTMLElement | null>,
) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const { view, viewRef, setView } = useRafView()
  const dragRef = useRef<DragState | null>(null)
  const suppressClickRef = useRef(false)
  const fitRef = useRef(fit)
  fitRef.current = fit

  useEffect(() => {
    const el = wheelTargetRef?.current ?? wrapRef.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const box = (wrapRef.current ?? el).getBoundingClientRect()
      const cx = e.clientX - box.left
      const cy = e.clientY - box.top
      setView((prev) => {
        const factor = zoomFactor(e)
        const nextScale = Math.min(
          MAP_MAX_ZOOM,
          Math.max(MAP_MIN_ZOOM, prev.scale * factor),
        )
        if (nextScale === prev.scale) return prev
        const k = nextScale / prev.scale
        return clampMapPan(
          {
            scale: nextScale,
            tx: cx - k * (cx - prev.tx),
            ty: cy - k * (cy - prev.ty),
          },
          box.width,
          box.height,
          mapWidth,
          mapHeight,
          fitRef.current,
        )
      })
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [mapWidth, mapHeight, wheelTargetRef])

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement | null
    if (target?.closest('button, a, input, .map-2d__toggles, .map-layer-bar, .era-map__bands')) return
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
    const el = wrapRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setView((prev) => {
      if (fitRef.current === 'contain' && prev.scale <= 1.001) return prev
      return clampMapPan(
        { scale: prev.scale, tx: d.tx0 + dx, ty: d.ty0 + dy },
        rect.width,
        rect.height,
        mapWidth,
        mapHeight,
        fitRef.current,
      )
    })
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

  const zoomAboutCenter = (factor: number) => {
    const el = wrapRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cx = rect.width / 2
    const cy = rect.height / 2
    setView((prev) => {
      const nextScale = Math.min(
        MAP_MAX_ZOOM,
        Math.max(MAP_MIN_ZOOM, prev.scale * factor),
      )
      const k = nextScale / prev.scale
      return clampMapPan(
        {
          scale: nextScale,
          tx: cx - k * (cx - prev.tx),
          ty: cy - k * (cy - prev.ty),
        },
        rect.width,
        rect.height,
        mapWidth,
        mapHeight,
        fitRef.current,
      )
    })
  }

  const resetView = () => setView({ scale: 1, tx: 0, ty: 0 })

  return {
    wrapRef,
    view,
    layerStyle: mapZoomStyle(view.scale, view.tx, view.ty),
    suppressClickRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    zoomIn: () => zoomAboutCenter(1.25),
    zoomOut: () => zoomAboutCenter(1 / 1.25),
    resetView,
  }
}

export function MapZoomControls({
  onZoomIn,
  onZoomOut,
  onReset,
}: {
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
}) {
  return (
    <div
      className="map-2d__zoom-ui"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="map-2d__zoom-btn map-2d__zoom-btn--text"
        aria-label="放大"
        onClick={onZoomIn}
      >
        放大
      </button>
      <button
        type="button"
        className="map-2d__zoom-btn map-2d__zoom-btn--text"
        aria-label="縮小"
        onClick={onZoomOut}
      >
        縮小
      </button>
      <button
        type="button"
        className="map-2d__zoom-btn map-2d__zoom-btn--text map-2d__zoom-btn--reset"
        aria-label="重設"
        onClick={onReset}
      >
        重設
      </button>
    </div>
  )
}
