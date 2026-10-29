import { FactionInspectCard } from './FactionInspectCard'
import { FactionLegend } from './FactionLegend'
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
        <PowerBoard />
      </div>

      <div className="map-stage__overlay map-stage__overlay--bl">
        <FactionLegend />
        <p className="map-stage__hint">
          底圖下方「圖層」可開勢力、行軍、塞外部族
        </p>
      </div>
    </section>
  )
}
