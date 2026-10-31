import { FactionInspectCard } from './FactionInspectCard'
import { FactionLegend } from './FactionLegend'
import { CollapsibleShell } from './CollapsibleShell'
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
        <CollapsibleShell
          title="勢力疆域"
          storageKey="map-power-board"
          defaultOpen={false}
          className="map-dock map-dock--tr"
        >
          <PowerBoard embedded />
        </CollapsibleShell>
      </div>

      <div className="map-stage__overlay map-stage__overlay--bl">
        <CollapsibleShell
          title="勢力圖例"
          storageKey="map-faction-legend"
          defaultOpen={false}
          className="map-dock map-dock--bl"
        >
          <FactionLegend />
          <p className="map-stage__hint">
            底圖下方「圖層」可開勢力、行軍、塞外部族
          </p>
        </CollapsibleShell>
      </div>
    </section>
  )
}
