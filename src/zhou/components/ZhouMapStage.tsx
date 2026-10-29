import { ZhouRouteDock, ZhouTerritoryDock } from './ZhouDocks'
import { ZhouLegend } from './ZhouLegend'
import { ZhouMap } from './ZhouMap'

export function ZhouMapStage() {
  return (
    <section className="map-stage" aria-label="春秋戰國地圖">
      <div className="map-stage__canvas">
        <ZhouMap />
      </div>

      <ZhouRouteDock />
      <ZhouTerritoryDock />

      <div className="map-stage__overlay map-stage__overlay--bl">
        <ZhouLegend />
        <p className="map-stage__hint">
          行軍路線在左，勢力範圍在右。兩邊可收起，亦可拖標題移動。
        </p>
      </div>
    </section>
  )
}
