import { FactionLegend } from './FactionLegend'
import { MapScene } from './MapScene'
import { MapViewControls } from './MapViewControls'
import { PowerBoard } from './PowerBoard'

export function MapStage() {
  return (
    <section className="map-stage" aria-label="立體疆域圖">
      <div className="map-stage__canvas">
        <MapScene />
      </div>
      <div className="map-stage__overlay map-stage__overlay--tl">
        <PowerBoard />
      </div>
      <div className="map-stage__overlay map-stage__overlay--tr">
        <MapViewControls />
      </div>
      <div className="map-stage__overlay map-stage__overlay--bl">
        <FactionLegend />
        <p className="map-stage__hint">拖曳旋轉 · 滾輪縮放 · 右上角視角鈕</p>
      </div>
    </section>
  )
}
