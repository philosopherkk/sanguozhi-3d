import { useMemo } from 'react'
import { MARCH_ROUTE_SAME_YEAR } from '../../components/map/RouteOverlay'
import { EraLegend, EraMapView } from '../../japanEras/EraMapView'
import { routesForMonth } from '../../lib/monthZoom'
import { shadesFromDomainControl } from '../../sengoku/data/japanKokugunPaint'
import { HEIAN_MARCH_ROUTES, HEIAN_PLACES } from '../data/marchRoutes'
import {
  HEIAN_DOMAINS,
  heianShadeNote,
} from '../data/territory'
import { useHeianSelection } from '../state/HeianSelectionContext'
import { useHeianYear } from '../state/HeianYearContext'
import { HEIAN_FACTIONS, type HeianFactionId } from '../types'
import { HeianRouteDock, HeianTerritoryDock } from './HeianDocks'

function colorFor(id: string) {
  return HEIAN_FACTIONS.find((f) => f.id === id)?.color ?? '#78716C'
}

function nameFor(id: string) {
  return HEIAN_FACTIONS.find((f) => f.id === id)?.name ?? id
}

export function HeianMapStage() {
  const { year, month, territoryYear, control } = useHeianYear()
  const routes = useMemo(
    () => routesForMonth(HEIAN_MARCH_ROUTES, year, month),
    [year, month],
  )
  const { selectedFaction, selectFaction } = useHeianSelection()
  const domains = useMemo(() => {
    const names = Object.fromEntries(HEIAN_DOMAINS.map((d) => [d.id, d.name]))
    return shadesFromDomainControl(control, names, '朝廷')
  }, [control])
  const legend = HEIAN_FACTIONS.filter(
    (f) => year >= f.activeFrom && year <= f.activeTo,
  )

  return (
    <section className="map-stage" aria-label="平安地圖">
      <div className="map-stage__canvas">
        <EraMapView
          ariaLabel="平安末源平勢力示意"
          year={year}
          territoryYear={territoryYear}
          shadeNote={heianShadeNote(year, month)}
          domains={domains}
          routes={routes}
          places={HEIAN_PLACES}
          colorFor={colorFor}
          nameFor={nameFor}
          selectedFaction={selectedFaction}
          onSelectFaction={(id) => selectFaction(id as HeianFactionId | null)}
          visibleYears={MARCH_ROUTE_SAME_YEAR}
          hideInlineRouteLegend
        />
      </div>
      <HeianRouteDock />
      <HeianTerritoryDock />
      <div className="map-stage__overlay map-stage__overlay--bl">
        <EraLegend
          year={year}
          territoryYear={territoryYear}
          factions={legend}
          colorFor={colorFor}
          selectedFaction={selectedFaction}
          onSelectFaction={(id) => selectFaction(id as HeianFactionId | null)}
        />
        <p className="map-stage__hint">
          左行軍・右勢力範圍（可摺、可拖）· 底圖下方「圖層」開關色塊、路線、地名
        </p>
      </div>
    </section>
  )
}
