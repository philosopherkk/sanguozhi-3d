/** Types for the Japanese Sengoku topic only — never mix with 三國志 FactionId. */

export type SengokuEventType = 'war' | 'politics' | 'succession'

export type SengokuFactionId =
  | '織田'
  | '豐臣'
  | '德川'
  | '武田'
  | '上杉'
  | '今川'
  | '北條'
  | '毛利'
  | '島津'
  | '足利'
  | '其他'

export type SengokuRegionId =
  | '奧羽'
  | '關東'
  | '甲信'
  | '越後'
  | '東海'
  | '尾張三河'
  | '近畿'
  | '中國'
  | '四國'
  | '九州'

export interface SengokuSourced {
  source: string
  disputed?: boolean
  note?: string
}

import type { TimelineDateFields } from '../types/timelineDate'

export interface SengokuTimelineEvent extends SengokuSourced, TimelineDateFields {
  id: string
  year: number
  title: string
  desc: string
  factions: SengokuFactionId[]
  location: string
  type: SengokuEventType
  /**
   * 關鍵事變：導致時代改變，或令地圖上一個政權出現／消失，或令整體權力格局
   * 改變（政體與正統、選官與賦稅、中央與地方、軍權歸屬）的事件。
   * 判據取自資料本身（轉折年、快照換圖年、勢力興亡年），不是主觀分級；另見政治轉折清單
   * reports/critical-incidents.md。詳情卡要寫明點解呢一年改變了格局。
   */
  critical?: boolean
}

export interface SengokuFaction {
  id: SengokuFactionId
  name: string
  color: string
  activeFrom: number
  activeTo: number
  source: string
}

export interface SengokuFactionTenure {
  faction: SengokuFactionId
  from: number
  to?: number
}

export interface SengokuPerson extends SengokuSourced {
  id: string
  name: string
  /** 日文原名／通稱 */
  aka?: string
  birth?: number
  death?: number
  faction_by_year: SengokuFactionTenure[]
  role: '政治' | '軍事' | '謀士'
  zhwiki_url: string
  /** 想像圖路徑（public/portraits/…）；無圖者不設，介面改以姓名首字代替 */
  portrait?: string
  /** 想像圖之考據依據（繪製所本），顯示於圖之提示文字 */
  portrait_note?: string
}

export interface SengokuRegion {
  id: SengokuRegionId
  name: string
  /** Rings in basemap pixel coords */
  rings: [number, number][][]
}

export type SengokuRegionControl = Partial<
  Record<SengokuRegionId, SengokuFactionId>
>
