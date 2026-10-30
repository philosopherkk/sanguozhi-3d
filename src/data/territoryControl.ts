import type { FactionId } from '../types/data'
import type { ProvinceId } from './provinces'

import {
  TK_PROVINCE_GEOMETRY,
  TK_TERRITORY_NOTE_ZH,
  type TerritoryGeometryProvenance,
} from './territory/provenance'

/**
 * Schematic 州-level control at snapshot years.
 * Borders approximate; when disputed, prefer the power that held the administrative centre.
 * Narrative source: 《三國志》紀傳 + 譚其驤示意；geometry: see TERRITORY_GEOMETRY_PROVENANCE.
 */
export const TERRITORY_GEOMETRY_PROVENANCE: TerritoryGeometryProvenance =
  TK_PROVINCE_GEOMETRY
export const TERRITORY_KEY_YEARS = [
  184, 190, 200, 208, 215, 219, 222, 234, 249, 263, 265, 280,
] as const

export type TerritoryKeyYear = (typeof TERRITORY_KEY_YEARS)[number]

export type ProvinceControl = Partial<Record<ProvinceId, FactionId>>

export const TERRITORY_BY_YEAR: Record<TerritoryKeyYear, ProvinceControl> = {
  /** 黃巾起事：朝廷仍控多數州郡，黃巾為流動起事，圖上僅標冀、豫示意 */
  184: {
    幽州: '東漢',
    冀州: '黃巾',
    并州: '東漢',
    青州: '黃巾',
    徐州: '東漢',
    兗州: '黃巾',
    豫州: '黃巾',
    司隸: '東漢',
    關中: '東漢',
    涼州: '東漢',
    漢中: '東漢',
    益州: '東漢',
    荊州北: '東漢',
    荊州南: '東漢',
    揚州: '東漢',
    交州: '東漢',
    遼東: '東漢',
    武陵: '五溪蠻',
  },
  /** 董卓遷長安；關東州牧分立 */
  190: {
    幽州: '其他',
    冀州: '袁紹',
    并州: '其他',
    青州: '其他',
    徐州: '其他',
    兗州: '曹魏',
    豫州: '袁術',
    司隸: '董卓',
    關中: '董卓',
    涼州: '董卓',
    漢中: '其他',
    益州: '劉璋',
    荊州北: '劉表',
    荊州南: '劉表',
    揚州: '袁術',
    交州: '其他',
    遼東: '公孫氏',
    武陵: '五溪蠻',
  },
  /** 官渡前後：紹據河北，操控河南 */
  200: {
    幽州: '袁紹',
    冀州: '袁紹',
    并州: '袁紹',
    青州: '袁紹',
    徐州: '曹魏',
    兗州: '曹魏',
    豫州: '曹魏',
    司隸: '曹魏',
    關中: '其他',
    涼州: '其他',
    漢中: '其他',
    益州: '劉璋',
    荊州北: '劉表',
    荊州南: '劉表',
    揚州: '孫吳',
    交州: '其他',
    遼東: '公孫氏',
    武陵: '五溪蠻',
  },
  /** 赤壁年：操并荊北；孫劉聯合拒操 */
  208: {
    幽州: '曹魏',
    冀州: '曹魏',
    并州: '曹魏',
    青州: '曹魏',
    徐州: '曹魏',
    兗州: '曹魏',
    豫州: '曹魏',
    司隸: '曹魏',
    關中: '曹魏',
    涼州: '其他',
    漢中: '其他',
    益州: '劉璋',
    荊州北: '曹魏',
    荊州南: '劉表',
    揚州: '孫吳',
    交州: '其他',
    遼東: '公孫氏',
    武陵: '五溪蠻',
  },
  /** 劉備已得益州；曹操方定漢中張魯（建安二十年） */
  215: {
    幽州: '曹魏',
    冀州: '曹魏',
    并州: '曹魏',
    青州: '曹魏',
    徐州: '曹魏',
    兗州: '曹魏',
    豫州: '曹魏',
    司隸: '曹魏',
    關中: '曹魏',
    涼州: '曹魏',
    漢中: '曹魏',
    益州: '蜀漢',
    荊州北: '曹魏',
    荊州南: '蜀漢',
    揚州: '孫吳',
    交州: '孫吳',
    遼東: '公孫氏',
    武陵: '五溪蠻',
  },
  /** 漢中歸備；關羽尚在荊；襄樊戰前 */
  219: {
    幽州: '曹魏',
    冀州: '曹魏',
    并州: '曹魏',
    青州: '曹魏',
    徐州: '曹魏',
    兗州: '曹魏',
    豫州: '曹魏',
    司隸: '曹魏',
    關中: '曹魏',
    涼州: '曹魏',
    漢中: '蜀漢',
    益州: '蜀漢',
    荊州北: '曹魏',
    荊州南: '蜀漢',
    揚州: '孫吳',
    交州: '孫吳',
    遼東: '公孫氏',
    武陵: '五溪蠻',
  },
  /** 夷陵後：荊南歸吳；三分成型 */
  222: {
    幽州: '曹魏',
    冀州: '曹魏',
    并州: '曹魏',
    青州: '曹魏',
    徐州: '曹魏',
    兗州: '曹魏',
    豫州: '曹魏',
    司隸: '曹魏',
    關中: '曹魏',
    涼州: '曹魏',
    漢中: '蜀漢',
    益州: '蜀漢',
    荊州北: '曹魏',
    荊州南: '孫吳',
    揚州: '孫吳',
    交州: '孫吳',
    遼東: '公孫氏',
    武陵: '五溪蠻',
  },
  /** 諸葛亮卒年：仍三分；遼東尚存公孫 */
  234: {
    幽州: '曹魏',
    冀州: '曹魏',
    并州: '曹魏',
    青州: '曹魏',
    徐州: '曹魏',
    兗州: '曹魏',
    豫州: '曹魏',
    司隸: '曹魏',
    關中: '曹魏',
    涼州: '曹魏',
    漢中: '蜀漢',
    益州: '蜀漢',
    荊州北: '曹魏',
    荊州南: '孫吳',
    揚州: '孫吳',
    交州: '孫吳',
    遼東: '公孫氏',
    武陵: '五溪蠻',
  },
  /** 高平陵後：魏政歸司馬；疆域仍三分（遼東已平於 238） */
  249: {
    幽州: '曹魏',
    冀州: '曹魏',
    并州: '曹魏',
    青州: '曹魏',
    徐州: '曹魏',
    兗州: '曹魏',
    豫州: '曹魏',
    司隸: '曹魏',
    關中: '曹魏',
    涼州: '曹魏',
    漢中: '蜀漢',
    益州: '蜀漢',
    荊州北: '曹魏',
    荊州南: '孫吳',
    揚州: '孫吳',
    交州: '孫吳',
    遼東: '曹魏',
    武陵: '五溪蠻',
  },
  /** 魏滅蜀：益、漢中入魏 */
  263: {
    幽州: '曹魏',
    冀州: '曹魏',
    并州: '曹魏',
    青州: '曹魏',
    徐州: '曹魏',
    兗州: '曹魏',
    豫州: '曹魏',
    司隸: '曹魏',
    關中: '曹魏',
    涼州: '曹魏',
    漢中: '曹魏',
    益州: '曹魏',
    荊州北: '曹魏',
    荊州南: '孫吳',
    揚州: '孫吳',
    交州: '孫吳',
    遼東: '曹魏',
    武陵: '五溪蠻',
  },
  /** 西晉代魏 */
  265: {
    幽州: '西晉',
    冀州: '西晉',
    并州: '西晉',
    青州: '西晉',
    徐州: '西晉',
    兗州: '西晉',
    豫州: '西晉',
    司隸: '西晉',
    關中: '西晉',
    涼州: '西晉',
    漢中: '西晉',
    益州: '西晉',
    荊州北: '西晉',
    荊州南: '孫吳',
    揚州: '孫吳',
    交州: '孫吳',
    遼東: '西晉',
    武陵: '五溪蠻',
  },
  /** 滅吳，晉收郡縣；武陵五溪蠻仍分色，不併入西晉 */
  280: {
    幽州: '西晉',
    冀州: '西晉',
    并州: '西晉',
    青州: '西晉',
    徐州: '西晉',
    兗州: '西晉',
    豫州: '西晉',
    司隸: '西晉',
    關中: '西晉',
    涼州: '西晉',
    漢中: '西晉',
    益州: '西晉',
    荊州北: '西晉',
    荊州南: '西晉',
    揚州: '西晉',
    交州: '西晉',
    遼東: '西晉',
    武陵: '五溪蠻',
  },
}

export const TERRITORY_NOTE = TK_TERRITORY_NOTE_ZH

export function resolveTerritoryYear(year: number): TerritoryKeyYear {
  let best: TerritoryKeyYear = TERRITORY_KEY_YEARS[0]
  for (const k of TERRITORY_KEY_YEARS) {
    if (k <= year) best = k
  }
  return best
}

export function controlForYear(year: number): ProvinceControl {
  return TERRITORY_BY_YEAR[resolveTerritoryYear(year)]
}

export function factionsPresent(control: ProvinceControl): FactionId[] {
  const s = new Set<FactionId>()
  for (const f of Object.values(control)) {
    if (f) s.add(f)
  }
  return Array.from(s)
}
