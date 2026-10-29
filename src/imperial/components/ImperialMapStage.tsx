import { ImperialRouteDock, ImperialTerritoryDock } from './ImperialDocks'
import { ImperialMap } from './ImperialMap'

export function ImperialMapStage() {
  return (
    <section className="map-stage" aria-label="帝國地圖">
      <div className="map-stage__canvas">
        <ImperialMap />
      </div>
      <ImperialRouteDock />
      <ImperialTerritoryDock />
      <div className="map-stage__overlay map-stage__overlay--bl">
        <p className="map-stage__hint">
          左行軍・右勢力範圍（可摺、可拖）· 行軍只顯示該年
        </p>
      </div>
    </section>
  )
}
