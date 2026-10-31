import { FactionInspectCard } from './FactionInspectCard'
import { FactionLegend } from './FactionLegend'
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

      <div className="map-stage__overlay map-stage__overlay--bl">
        <MapDock
          title="勢力圖例"
          storageKey="map-faction-legend"
          defaultOpenDesktop={false}
          defaultOpenMobile={false}
          collapsedHint="底圖「圖層」可開勢力、行軍、塞外"
          className="map-stage-dock--bl"
        >
          <FactionLegend />
          <p className="map-stage__hint map-stage__hint--in-dock">
            底圖下方「圖層」可開勢力、行軍、塞外部族
          </p>
        </MapDock>
      </div>
    </section>
  )
}
