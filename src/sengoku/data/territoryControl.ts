import type { SengokuFactionId, SengokuRegionControl } from '../types'
import {
  SENGOKU_CONTROL_GEOMETRY,
  type TerritoryGeometryProvenance,
} from '../../data/territory/provenance'

export type { SengokuRegionControl }

/**
 * Schematic daimyō control by snapshot year.
 * Control narrative: 中文維基各氏專條／通說 — not cartographic SoT.
 * Geometry: see SENGOKU_TERRITORY_GEOMETRY_PROVENANCE.
 */
export const SENGOKU_TERRITORY_GEOMETRY_PROVENANCE: TerritoryGeometryProvenance =
  SENGOKU_CONTROL_GEOMETRY

export const SENGOKU_TERRITORY_NOTE =
  '大名歸屬為通說示意；域界為 CODH 旧国 mesh（CC BY-NC）。'
export const SENGOKU_KEY_YEARS = [
  1467, 1550, 1560, 1573, 1582, 1590, 1600, 1615,
] as const

export type SengokuKeyYear = (typeof SENGOKU_KEY_YEARS)[number]

export const SENGOKU_TERRITORY_BY_YEAR: Record<
  SengokuKeyYear,
  SengokuRegionControl
> = {
  /** 應仁之亂：幕府權威崩壞，地方分立 */
  1467: {
    奧羽: '其他',
    關東: '其他',
    甲信: '其他',
    越後: '其他',
    東海: '今川',
    尾張三河: '其他',
    近畿: '足利',
    中國: '其他',
    四國: '其他',
    九州: '島津',
  },
  /** 天文末：今川、武田、北條鼎立東海—關東 */
  1550: {
    奧羽: '其他',
    關東: '北條',
    甲信: '武田',
    越後: '上杉',
    東海: '今川',
    尾張三河: '織田',
    近畿: '足利',
    中國: '毛利',
    四國: '其他',
    九州: '島津',
  },
  /** 桶狹間後：織田崛起，今川衰退 */
  1560: {
    奧羽: '其他',
    關東: '北條',
    甲信: '武田',
    越後: '上杉',
    東海: '今川',
    尾張三河: '織田',
    近畿: '足利',
    中國: '毛利',
    四國: '其他',
    九州: '島津',
  },
  /** 室町終焉：信長放逐義昭，進逼畿內 */
  1573: {
    奧羽: '其他',
    關東: '北條',
    甲信: '武田',
    越後: '上杉',
    東海: '德川',
    尾張三河: '織田',
    近畿: '織田',
    中國: '毛利',
    四國: '其他',
    九州: '島津',
  },
  /** 本能寺：信長橫死，秀吉開始統一戰爭 */
  1582: {
    奧羽: '其他',
    關東: '北條',
    甲信: '織田',
    越後: '上杉',
    東海: '德川',
    尾張三河: '織田',
    近畿: '織田',
    中國: '毛利',
    四國: '其他',
    九州: '島津',
  },
  /** 小田原征伐後：秀吉名義統一 */
  1590: {
    奧羽: '豐臣',
    關東: '德川',
    甲信: '豐臣',
    越後: '上杉',
    東海: '德川',
    尾張三河: '豐臣',
    近畿: '豐臣',
    中國: '毛利',
    四國: '豐臣',
    九州: '島津',
  },
  /** 關原：德川大勝，丰臣勢力收縮 */
  1600: {
    奧羽: '其他',
    關東: '德川',
    甲信: '德川',
    越後: '上杉',
    東海: '德川',
    尾張三河: '德川',
    近畿: '豐臣',
    中國: '毛利',
    四國: '其他',
    九州: '島津',
  },
  /** 大坂之陣後：德川霸權確立 */
  1615: {
    奧羽: '德川',
    關東: '德川',
    甲信: '德川',
    越後: '德川',
    東海: '德川',
    尾張三河: '德川',
    近畿: '德川',
    中國: '其他',
    四國: '其他',
    九州: '島津',
  },
}

export function resolveSengokuTerritoryYear(year: number): SengokuKeyYear {
  let best: SengokuKeyYear = SENGOKU_KEY_YEARS[0]
  for (const y of SENGOKU_KEY_YEARS) {
    if (y <= year) best = y
    else break
  }
  return best
}

export function sengokuControlForYear(year: number): SengokuRegionControl {
  return SENGOKU_TERRITORY_BY_YEAR[resolveSengokuTerritoryYear(year)]
}

export function sengokuFactionsPresent(
  control: SengokuRegionControl,
): SengokuFactionId[] {
  const set = new Set<SengokuFactionId>()
  for (const f of Object.values(control)) {
    if (f) set.add(f)
  }
  return [...set]
}
