import { useCallback } from 'react'
import { useHoldRepeat, useMapView } from '../state/MapViewContext'

const YAW = 0.09
const PITCH = 0.07

function HoldButton({
  label,
  title,
  onPulse,
}: {
  label: string
  title: string
  onPulse: () => void
}) {
  const { start, stop } = useHoldRepeat(onPulse, 45)
  return (
    <button
      type="button"
      className="map-view-controls__btn"
      title={title}
      aria-label={title}
      onPointerDown={(e) => {
        e.preventDefault()
        start()
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
    >
      {label}
    </button>
  )
}

export function MapViewControls() {
  const { api } = useMapView()

  const yawCCW = useCallback(() => api?.yaw(YAW), [api])
  const yawCW = useCallback(() => api?.yaw(-YAW), [api])
  const tiltUp = useCallback(() => api?.pitch(-PITCH), [api])
  const tiltDown = useCallback(() => api?.pitch(PITCH), [api])
  const tiltLeft = useCallback(() => api?.yaw(YAW), [api])
  const tiltRight = useCallback(() => api?.yaw(-YAW), [api])

  return (
    <div className="map-view-controls" role="group" aria-label="地圖視角控制">
      <p className="map-view-controls__title">視角</p>
      <div className="map-view-controls__pad">
        <span className="map-view-controls__spacer" />
        <HoldButton label="↑" title="上仰（較俯視）" onPulse={tiltUp} />
        <span className="map-view-controls__spacer" />

        <HoldButton label="↺" title="逆時針旋轉" onPulse={yawCCW} />
        <button
          type="button"
          className="map-view-controls__btn map-view-controls__btn--reset"
          title="重設視角"
          aria-label="重設視角"
          disabled={!api}
          onClick={() => api?.reset()}
        >
          復
        </button>
        <HoldButton label="↻" title="順時針旋轉" onPulse={yawCW} />

        <span className="map-view-controls__spacer" />
        <HoldButton label="↓" title="下俯（較平視）" onPulse={tiltDown} />
        <span className="map-view-controls__spacer" />
      </div>
      <div className="map-view-controls__row">
        <HoldButton label="←" title="向左旋轉" onPulse={tiltLeft} />
        <HoldButton label="→" title="向右旋轉" onPulse={tiltRight} />
      </div>
      <p className="map-view-controls__hint">按住連續轉 · 亦可拖曳地圖</p>
    </div>
  )
}
