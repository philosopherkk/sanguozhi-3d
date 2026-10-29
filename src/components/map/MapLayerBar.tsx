import { useState, type ReactNode } from 'react'

export function MapLayerBar({
  showTerritory,
  showRoutes,
  showPlaces = false,
  onToggleTerritory,
  onToggleRoutes,
  onTogglePlaces,
  showFrontier,
  onToggleFrontier,
  frontierPanel,
}: {
  showTerritory: boolean
  showRoutes: boolean
  showPlaces?: boolean
  onToggleTerritory: () => void
  onToggleRoutes: () => void
  onTogglePlaces?: () => void
  showFrontier?: boolean
  onToggleFrontier?: () => void
  frontierPanel?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const onCount = [
    showTerritory,
    showRoutes,
    onTogglePlaces ? showPlaces : false,
    onToggleFrontier ? showFrontier : false,
  ].filter(Boolean).length

  return (
    <div className="map-layer-bar" role="group" aria-label="地圖圖層">
      <button
        type="button"
        className="map-layer-bar__fold"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        圖層
        <span>{open ? '收起' : `${onCount} 開`}</span>
      </button>
      {open ? (
        <div className="map-layer-bar__tabs">
          <button
            type="button"
            className={showTerritory ? 'is-active' : undefined}
            aria-pressed={showTerritory}
            onClick={onToggleTerritory}
          >
            勢力
          </button>
          <button
            type="button"
            className={showRoutes ? 'is-active' : undefined}
            aria-pressed={showRoutes}
            onClick={onToggleRoutes}
          >
            行軍
          </button>
          {onTogglePlaces ? (
            <button
              type="button"
              className={showPlaces ? 'is-active' : undefined}
              aria-pressed={showPlaces}
              onClick={onTogglePlaces}
            >
              地名
            </button>
          ) : null}
          {onToggleFrontier ? (
            <button
              type="button"
              className={showFrontier ? 'is-active' : undefined}
              aria-pressed={showFrontier}
              aria-expanded={showFrontier}
              onClick={onToggleFrontier}
            >
              塞外部族
            </button>
          ) : null}
        </div>
      ) : null}
      {open && showFrontier ? frontierPanel : null}
    </div>
  )
}
