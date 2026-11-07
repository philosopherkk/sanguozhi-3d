import type { JapanPaintShade } from '../../sengoku/data/japanKokugunPaint'
import { shadesFromDomainControl } from '../../sengoku/data/japanKokugunPaint'
import { hanDisplayNameZh } from './hanDisplayNames'

type BakumatsuHanMeshModule = typeof import('./bakumatsuHanMeshes')

let hanMeshModule: BakumatsuHanMeshModule | null = null
let hanMeshLoading: Promise<BakumatsuHanMeshModule> | null = null

/**
 * 載入藩級 mesh。原始檔約 6.5 MB（229,551 個座標數），靜態 import 會令幕末
 * chunk 由數十 KB 膨至 1.6 MB，因此只在使用者開啟「藩界」圖層時動態載入。
 * 同一工作階段只載入一次；失敗後可重試。
 */
export function loadBakumatsuHanMeshes(): Promise<BakumatsuHanMeshModule> {
  if (hanMeshModule) return Promise.resolve(hanMeshModule)
  if (!hanMeshLoading) {
    hanMeshLoading = import('./bakumatsuHanMeshes')
      .then((mod) => {
        hanMeshModule = mod
        hanMeshLoading = null
        return mod
      })
      .catch((err) => {
        hanMeshLoading = null
        throw err
      })
  }
  return hanMeshLoading
}

export function hasBakumatsuHanMeshes(): boolean {
  return hanMeshModule !== null
}

export function bakumatsuHanMeshCount(): number {
  return hanMeshModule?.BAKUMATSU_HAN_MESHES.length ?? 0
}

/**
 * 幕末：村→藩 dissolve mesh 著色；幾何 CC BY-SA（見 ATTRIBUTION-CODH-HAN-BY-SA.md）。
 *
 * 藩級 mesh 只覆蓋 21 個舊國（d0–d27 之中的 21 個），其餘 7 個舊國
 * （d1、d2、d8、d14、d22、d26、d27）於藩級 mesh 入面完全無幾何。這些地域會改用
 * CODH 舊國級 mesh 補回，否則幕末地圖會缺一舊，而且同注記互相矛盾——
 * 例如 1868 年 1 月注記寫「攝津改著薩長」，但攝津（d2）未畫過。
 */
export function shadesFromHanDomainControl(
  control: Record<string, string>,
  nameByDomain?: Record<string, string>,
  fallbackFaction = '',
  useHan = false,
): JapanPaintShade[] {
  const meshes = useHan ? hanMeshModule?.BAKUMATSU_HAN_MESHES : undefined
  if (!meshes || !meshes.length) {
    return shadesFromDomainControl(control, nameByDomain, fallbackFaction)
  }
  const han: JapanPaintShade[] = meshes.map((mesh) => ({
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
  const covered = new Set(meshes.map((mesh) => mesh.domainId))
  const gaps = shadesFromDomainControl(control, nameByDomain, fallbackFaction).filter(
    (shade) => !covered.has(shade.domainId),
  )
  return [...han, ...gaps].filter((s) => s.faction !== '')
}

