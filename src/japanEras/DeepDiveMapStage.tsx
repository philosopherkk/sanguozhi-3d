import { useMemo } from 'react'
import { MARCH_ROUTE_SAME_YEAR } from '../components/map/RouteOverlay'
import type { JapanDeepDivePack } from './deepDiveTypes'
import { EraRouteDock, EraTerritoryDock } from './EraDocks'
import { EraMapView } from './EraMapView'
import { useDeepDiveSelection } from './DeepDiveSelectionContext'
import { useDeepDiveYear } from './DeepDiveYearContext'
import { shadesFromDomainControl } from '../sengoku/data/japanKokugunPaint'
import { CODH_KOKUGUN_MESHES } from '../sengoku/data/codhKokugunMeshes'
import { pathLabelPoint } from '../geo/pathLabelPoint'
import {
  ASIA_WAR_EXTENTS_GEOMETRY,
  ASIA_WAR_TERRITORY_NOTE_ZH,
} from '../data/territory/provenance'

/** 舊國 mesh 已覆蓋的 domainId；其余（蝦夷地、東蝦夷地、松前、琉球等）要另行渲染。 */
const KOKUGUN_DOMAIN_IDS = new Set(CODH_KOKUGUN_MESHES.map((m) => m.domainId))

export function DeepDiveMapStage({ pack }: { pack: JapanDeepDivePack }) {
  const { year, territoryYear, control, shadeNote, mapWindow } =
    useDeepDiveYear()
  const { selectedFaction, selectFaction } = useDeepDiveSelection()

  /**
   * 時段地圖窗口生效時，底圖／領土／路線／地名整套改用窗口資料（座標系不同，
   * 不能與 pack 預設混繪）；無窗口時全部沿用 pack，行為與從前相同。
   */
  const base = mapWindow?.mapBase ?? pack.mapBase
  const domainSource = mapWindow ? mapWindow.domains : pack.domains
  const activeRoutes = mapWindow ? mapWindow.routes : pack.routes
  const activePlaces = mapWindow ? mapWindow.places : pack.places

  const colorFor = (id: string) =>
    pack.factions.find((f) => f.id === id)?.color ?? '#78716C'
  const nameFor = (id: string) =>
    pack.factions.find((f) => f.id === id)?.name ?? id

  const domains = useMemo(() => {
    /**
     * 戰爭時代（明治至當代）用矢量戰區底圖：區塊以現成 SVG path 表達
     * （經緯度區間剪裁到真實海岸線），不適用日本舊國 mesh。
     */
    if (base) {
      return domainSource
        .filter((d): d is typeof d & { d: string } => Boolean(d.d))
        .map((d) => ({
          id: d.id,
          name: d.name,
          d: d.d,
          labelAt: pathLabelPoint(d.d),
          faction: control[d.id] ?? '',
        }))
        .filter((s) => s.faction !== '')
    }
    const names = Object.fromEntries(domainSource.map((d) => [d.id, d.name]))
    const kokugun = shadesFromDomainControl(control, names)
    /**
     * pack.domains 中不屬於舊國 mesh 的區塊（蝦夷地、東蝦夷地、松前、琉球…）
     * 之前完全無進入渲染，只用於名字，所以北海道的逐年變化於地圖上看不見。
     */
    const extras = domainSource.flatMap((d) => {
      if (KOKUGUN_DOMAIN_IDS.has(d.id) || !d.ring) return []
      return [
        {
          id: d.id,
          name: d.name,
          ring: d.ring,
          extraRings: d.extraRings,
          faction: control[d.id] ?? '',
        },
      ]
    }).filter((s) => s.faction !== '')
    return [...kokugun, ...extras]
  }, [domainSource, base, control])

  return (
    <section className="map-stage" aria-label={`${pack.title}地圖`}>
      <div className="map-stage__canvas">
        <EraMapView
          ariaLabel={`${pack.title}勢力示意`}
          year={year}
          territoryYear={territoryYear}
          shadeNote={shadeNote}
          domains={domains}
          routes={activeRoutes}
          places={activePlaces}
          colorFor={colorFor}
          nameFor={nameFor}
          selectedFaction={selectedFaction}
          onSelectFaction={selectFaction}
          visibleYears={MARCH_ROUTE_SAME_YEAR}
          hideInlineRouteLegend
          mapBase={base}
          domainGeometryProvenance={
            base ? mapWindow?.geometryNote ?? ASIA_WAR_EXTENTS_GEOMETRY : undefined
          }
          territoryNote={
            base
              ? mapWindow?.territoryNote ?? ASIA_WAR_TERRITORY_NOTE_ZH
              : undefined
          }
        />
      </div>
      <EraRouteDock pack={pack} />
      <EraTerritoryDock pack={pack} />
      <div className="map-stage__overlay map-stage__overlay--bl">
        <p className="map-stage__hint">
          {year} 年勢力（疆域快照 {territoryYear}）· 左行軍・右勢力範圍（可摺、可拖）
          · 底圖下方「圖層」開關色塊、路線、地名
        </p>
      </div>
    </section>
  )
}
