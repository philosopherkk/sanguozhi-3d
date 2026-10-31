import type { JapanPaintShade } from '../../sengoku/data/japanKokugunPaint'
import { shadesFromDomainControl } from '../../sengoku/data/japanKokugunPaint'
import { BAKUMATSU_HAN_MESHES } from './bakumatsuHanMeshes'
import { hanDisplayNameZh } from './hanDisplayNames'

/** 幕末：村→藩 dissolve mesh 著色；幾何 CC BY-SA（見 ATTRIBUTION-CODH-HAN-BY-SA.md）。 */
export function shadesFromHanDomainControl(
  control: Record<string, string>,
  nameByDomain?: Record<string, string>,
  fallbackFaction = '',
): JapanPaintShade[] {
  if (!BAKUMATSU_HAN_MESHES.length) {
    return shadesFromDomainControl(control, nameByDomain, fallbackFaction)
  }
  return BAKUMATSU_HAN_MESHES.map((mesh) => ({
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
  })).filter((s) => s.faction !== '')
}

export function bakumatsuHanMeshCount(): number {
  return BAKUMATSU_HAN_MESHES.length
}

export function useBakumatsuHanMeshes(): boolean {
  return BAKUMATSU_HAN_MESHES.length > 0
}
