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

export interface SengokuTimelineEvent extends SengokuSourced {
  id: string
  year: number
  title: string
  desc: string
  factions: SengokuFactionId[]
  location: string
  type: SengokuEventType
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
