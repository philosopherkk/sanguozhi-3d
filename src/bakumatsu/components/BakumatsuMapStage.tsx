import { useMemo } from 'react'
import {
  EraLegend,
  EraMapView,
  EraPowerBoard,
} from '../../japanEras/EraMapView'
import { BAKUMATSU_MARCH_ROUTES, BAKUMATSU_PLACES } from '../data/marchRoutes'
import {
  BAKUMATSU_DOMAINS,
  BAKUMATSU_TERRITORY_GEOMETRY_PROVENANCE,
  bakumatsuFactionCounts,
  bakumatsuShadeNote,
  bakumatsuFringeShades,
} from '../data/territory'
import { shadesFromHanDomainControl } from '../data/bakumatsuHanPaint'
import { useBakumatsuSelection } from '../state/BakumatsuSelectionContext'
import { routesForMonth } from '../../lib/monthZoom'
import { useBakumatsuYear } from '../state/BakumatsuYearContext'
import { BAKUMATSU_FACTIONS, type BakumatsuFactionId } from '../types'

function colorFor(id: string) {
  return BAKUMATSU_FACTIONS.find((f) => f.id === id)?.color ?? '#78716C'
}

function nameFor(id: string) {
  return BAKUMATSU_FACTIONS.find((f) => f.id === id)?.name ?? id
}

export function BakumatsuMapStage() {
  const { year, month, territoryYear, control } = useBakumatsuYear()
  const routes = useMemo(
    () => routesForMonth(BAKUMATSU_MARCH_ROUTES, year, month),
    [year, month],
  )
  const { selectedFaction, selectFaction } = useBakumatsuSelection()
  const domains = useMemo(() => {
    const names = Object.fromEntries(BAKUMATSU_DOMAINS.map((d) => [d.id, d.name]))
    const base = shadesFromHanDomainControl(control, names, '幕府')
    return [...base, ...bakumatsuFringeShades(year, control)]
  }, [control, year])
  const rows = useMemo(() => bakumatsuFactionCounts(control), [control])
  const legend = BAKUMATSU_FACTIONS.filter(
    (f) => year >= f.activeFrom && year <= f.activeTo,
  )

  return (
    <section className="map-stage" aria-label="幕末地圖">
      <div className="map-stage__canvas">
        <EraMapView
          ariaLabel="幕末戊辰勢力示意"
          year={year}
          territoryYear={territoryYear}
          shadeNote={bakumatsuShadeNote(year, month)}
          domains={domains}
          routes={routes}
          places={BAKUMATSU_PLACES}
          colorFor={colorFor}
          nameFor={nameFor}
          selectedFaction={selectedFaction}
          onSelectFaction={(id) =>
            selectFaction(id as BakumatsuFactionId | null)
          }
          japanFringe="bakumatsu"
          domainGeometryProvenance={BAKUMATSU_TERRITORY_GEOMETRY_PROVENANCE}
        />
      </div>
      <div className="map-stage__overlay map-stage__overlay--tl">
        <EraPowerBoard
          territoryYear={territoryYear}
          rows={rows}
          colorFor={colorFor}
          nameFor={nameFor}
          selectedFaction={selectedFaction}
          onSelectFaction={(id) =>
            selectFaction(id as BakumatsuFactionId | null)
          }
          eraIntro={(id) => BAKUMATSU_FACTIONS.find((f) => f.id === id)?.eraIntro}
        />
      </div>
      <div className="map-stage__overlay map-stage__overlay--bl">
        <EraLegend
          year={year}
          territoryYear={territoryYear}
          factions={legend}
          colorFor={colorFor}
          selectedFaction={selectedFaction}
          onSelectFaction={(id) =>
            selectFaction(id as BakumatsuFactionId | null)
          }
        />
        <p className="map-stage__hint">
          底圖下方「圖層」可開勢力、行軍、地名 · 行軍只顯示該月
        </p>
      </div>
    </section>
  )
}
