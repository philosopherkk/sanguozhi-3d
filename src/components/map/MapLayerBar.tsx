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
  extraTabs,
  extraTabsOn = false,
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
  /** 時代專用圖層按鈕（例如幕末「藩界」），沿用同一列樣式與計數 */
  extraTabs?: ReactNode
  extraTabsOn?: boolean
}) {
  const [open, setOpen] = useState(false)
  const onNames = [
    showTerritory ? '勢力' : null,
    showRoutes ? '行軍' : null,
    onTogglePlaces && showPlaces ? '地標' : null,
    onToggleFrontier && showFrontier ? '塞外' : null,
    extraTabs && extraTabsOn ? '附加' : null,
  ].filter(Boolean) as string[]

  return (
    <div className="map-layer-bar" role="group" aria-label="地圖圖層">
      <button
        type="button"
        className="map-layer-bar__fold"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        圖層
        <span>{open ? '收起' : onNames.length === 0 ? '圖層已關' : `已開：${onNames.join('、')}`}</span>
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
          {extraTabs}
        </div>
      ) : null}
      {open && showFrontier ? frontierPanel : null}
    </div>
  )
}
