import { FactionInspectCard } from './FactionInspectCard'
import { MapDock } from './MapDock'
import { Map2D } from './Map2D'
import { PowerBoard } from './PowerBoard'

/** 2D era map only — territory polygons clipped to land mask. */
export function MapStage() {
  return (
    <section className="map-stage" aria-label="疆域地圖">
      <div className="map-stage__canvas">
        <Map2D />
      </div>

      <div className="map-stage__overlay map-stage__overlay--inspect">
        <FactionInspectCard />
      </div>

      <div className="map-stage__overlay map-stage__overlay--tl">
        <MapDock
          title="勢力疆域"
          storageKey="map-power-board"
          defaultOpenDesktop={false}
          defaultOpenMobile={false}
          className="map-stage-dock--tr"
        >
          <PowerBoard embedded />
        </MapDock>
      </div>
    </section>
  )
}
