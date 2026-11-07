import type { JapanPaintShade } from '../../sengoku/data/japanKokugunPaint'
import { shadesFromDomainControl } from '../../sengoku/data/japanKokugunPaint'
import { BAKUMATSU_HAN_MESHES } from './bakumatsuHanMeshes'
import { hanDisplayNameZh } from './hanDisplayNames'

/**
 * 幕末：村→藩 dissolve mesh 著色；幾何 CC BY-SA（見 ATTRIBUTION-CODH-HAN-BY-SA.md）。
 *
 * 藩級 mesh 只覆蓋 21 個舊國（d0–d27 之中嘅 21 個），其餘 7 個舊國
 * （d1、d2、d8、d14、d22、d26、d27）喺藩級 mesh 入面完全冇幾何。呢啲地域會改用
 * CODH 舊國級 mesh 補回，否則幕末地圖會缺一舊，而且同注記互相矛盾——
 * 例如 1868 年 1 月注記寫「攝津改著薩長」，但攝津（d2）冇畫過。
 */
export function shadesFromHanDomainControl(
  control: Record<string, string>,
  nameByDomain?: Record<string, string>,
  fallbackFaction = '',
): JapanPaintShade[] {
  if (!BAKUMATSU_HAN_MESHES.length) {
    return shadesFromDomainControl(control, nameByDomain, fallbackFaction)
  }
  const han: JapanPaintShade[] = BAKUMATSU_HAN_MESHES.map((mesh) => ({
    id: mesh.id,
    kokugunId: mesh.hanId,
    domainId: mesh.domainId,
    zone: mesh.zone,
    name:
      nameByDomain?.[mesh.domainId] ??
      hanDisplayNameZh(mesh.hanId, mesh.name),
    ring: mesh.ring,
    extraRings: mesh.extraRings,
    faction: control[mesh.domainId] ?? fallbackFaction,
  }))
  const covered = new Set(BAKUMATSU_HAN_MESHES.map((mesh) => mesh.domainId))
  const gaps = shadesFromDomainControl(control, nameByDomain, fallbackFaction).filter(
    (shade) => !covered.has(shade.domainId),
  )
  return [...han, ...gaps].filter((s) => s.faction !== '')
}

export function bakumatsuHanMeshCount(): number {
  return BAKUMATSU_HAN_MESHES.length
}

export function hasBakumatsuHanMeshes(): boolean {
  return BAKUMATSU_HAN_MESHES.length > 0
}
