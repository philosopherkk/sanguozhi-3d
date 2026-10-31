import type { SengokuRegionId } from '../types'
import { CODH_KOKUGUN_MESHES, type CodhKokugunMesh } from './codhKokugunMeshes'

export interface JapanPaintShade {
  id: string
  name: string
  ring: [number, number][]
  extraRings?: [number, number][][]
  faction: string
  domainId: string
  kokugunId: string
  zone: SengokuRegionId
}

/** 依 d0–d27 勢力對照表著色，幾何為 CODH 旧国 mesh。 */
export function shadesFromDomainControl(
  control: Record<string, string>,
  nameByDomain?: Record<string, string>,
  fallbackFaction = '',
): JapanPaintShade[] {
  return CODH_KOKUGUN_MESHES.map((mesh) => ({
    id: mesh.id,
    kokugunId: mesh.kokugunId,
    domainId: mesh.domainId,
    zone: mesh.zone,
    name: nameByDomain?.[mesh.domainId] ?? mesh.name,
    ring: mesh.ring,
    extraRings: mesh.extraRings,
    faction: control[mesh.domainId] ?? fallbackFaction,
  })).filter((s) => s.faction !== '')
}

/** 戰國等地圖：control 以 SENGOKU 區域名（奧羽、關東…）為鍵。 */
export function shadesFromZoneControl(
  zoneControl: Partial<Record<SengokuRegionId, string>>,
): JapanPaintShade[] {
  return CODH_KOKUGUN_MESHES.map((mesh) => ({
    id: mesh.id,
    kokugunId: mesh.kokugunId,
    domainId: mesh.domainId,
    zone: mesh.zone,
    name: mesh.name,
    ring: mesh.ring,
    extraRings: mesh.extraRings,
    faction: zoneControl[mesh.zone] ?? '',
  })).filter((s) => s.faction !== '')
}

export function kokugunMeshCount(): number {
  return CODH_KOKUGUN_MESHES.length
}

export type { CodhKokugunMesh }
