import { QinHanLegend } from './QinHanLegend'
import { QinHanMap } from './QinHanMap'
import { QinHanRouteDock, QinHanTerritoryDock } from './QinHanDocks'

export function QinHanMapStage() {
  return (
    <section className="map-stage" aria-label="秦漢地圖">
      <div className="map-stage__canvas">
        <QinHanMap />
      </div>
      <QinHanRouteDock />
      <QinHanTerritoryDock />
      <div className="map-stage__overlay map-stage__overlay--bl">
        <QinHanLegend />
        <p className="map-stage__hint">
          左行軍・右勢力（可摺可拖）· 楚漢著重 · 行軍只顯示該年 · 塞外部族在圖層掣
        </p>
      </div>
    </section>
  )
}
