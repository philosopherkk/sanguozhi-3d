import { useMemo } from 'react'
import { MARCH_ROUTE_SAME_YEAR } from '../components/map/RouteOverlay'
import type { JapanDeepDivePack } from './deepDiveTypes'
import { EraRouteDock, EraTerritoryDock } from './EraDocks'
import { EraLegend, EraMapView } from './EraMapView'
import { useDeepDiveSelection } from './DeepDiveSelectionContext'
import { useDeepDiveYear } from './DeepDiveYearContext'
import { shadesFromDomainControl } from '../sengoku/data/japanKokugunPaint'

export function DeepDiveMapStage({ pack }: { pack: JapanDeepDivePack }) {
  const { year, territoryYear, control, shadeNote } = useDeepDiveYear()
  const { selectedFaction, selectFaction } = useDeepDiveSelection()

  const colorFor = (id: string) =>
    pack.factions.find((f) => f.id === id)?.color ?? '#78716C'
  const nameFor = (id: string) =>
    pack.factions.find((f) => f.id === id)?.name ?? id

  const domains = useMemo(() => {
    const names = Object.fromEntries(pack.domains.map((d) => [d.id, d.name]))
    return shadesFromDomainControl(control, names)
  }, [pack.domains, control])

  const legend = pack.factions.filter(
    (f) => year >= f.activeFrom && year <= f.activeTo,
  )

  return (
    <section className="map-stage" aria-label={`${pack.title}地圖`}>
      <div className="map-stage__canvas">
        <EraMapView
          ariaLabel={`${pack.title}勢力示意`}
          year={year}
          territoryYear={territoryYear}
          shadeNote={shadeNote}
          domains={domains}
          routes={pack.routes}
          places={pack.places}
          colorFor={colorFor}
          nameFor={nameFor}
          selectedFaction={selectedFaction}
          onSelectFaction={selectFaction}
          visibleYears={MARCH_ROUTE_SAME_YEAR}
          hideInlineRouteLegend
        />
      </div>
      <EraRouteDock pack={pack} />
      <EraTerritoryDock pack={pack} />
      <div className="map-stage__overlay map-stage__overlay--bl">
        <EraLegend
          year={year}
          territoryYear={territoryYear}
          factions={legend}
          colorFor={colorFor}
          selectedFaction={selectedFaction}
          onSelectFaction={selectFaction}
        />
        <p className="map-stage__hint">
          左行軍・右勢力範圍（可摺、可拖）· 底圖下方「圖層」開關色塊、路線、地名
        </p>
      </div>
    </section>
  )
}
