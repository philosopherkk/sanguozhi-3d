import { SengokuLegend } from './SengokuLegend'
import { SengokuMap } from './SengokuMap'
import { SengokuPowerBoard } from './SengokuPowerBoard'

export function SengokuMapStage() {
  return (
    <section className="map-stage" aria-label="日本戰國地圖">
      <div className="map-stage__canvas">
        <SengokuMap />
      </div>
      <div className="map-stage__overlay map-stage__overlay--tl">
        <SengokuPowerBoard />
      </div>
      <div className="map-stage__overlay map-stage__overlay--bl">
        <SengokuLegend />
        <p className="map-stage__hint">
          底圖中央下方「圖層」可開勢力、行軍、地名
        </p>
      </div>
    </section>
  )
}
