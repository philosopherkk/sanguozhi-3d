import type { MarchRoute } from '../data/marchRoutes'
import type { TerritoryGeometryProvenance } from '../data/territory/provenance'
import type { FactionProfile } from '../lib/factionYearView'
import type { EraDetail, EraEvent, EraFaction, EraPerson, EraReading } from './types'

export interface DeepDiveDomain {
  id: string
  name: string
  ring?: [number, number][]
  extraRings?: [number, number][][]
  /** 現成 SVG path（多島地區：菲律賓、南洋群島等） */
  d?: string
}

/** 矢量底圖（亞洲—太平洋戰區）；未提供就用日本列島 relief */
export interface DeepDiveVectorBasemap {
  land: string[]
  graticule: string[]
  w: number
  h: number
  credit: string
}

/**
 * 時段地圖窗口：年份落在 [from, to] 時，地圖整體改用另一套底圖、領土與路線
 * （例：秀吉朝鮮之役 1592–1598 由日本列島圖切到東亞戰區圖，拖出區間切回）。
 * 視窗生效時是「取代」pack 預設而非合併——兩套圖的座標系不同，混繪必錯。
 */
export interface DeepDiveMapWindow {
  id: string
  from: number
  to: number
  /** 換底圖（戰區矢量圖）；不提供即沿用 pack 的 mapBase／列島 relief */
  mapBase?: DeepDiveVectorBasemap
  /** 窗口領土區塊（座標系屬本窗口底圖） */
  domains: DeepDiveDomain[]
  /** 快照年 → domainId → factionId；快照年屬窗口本身，不進 pack.keyYears */
  territoryByYear: Record<number, Record<string, string>>
  /** 快照年 → 色塊口徑說明 */
  shadeNotes: Record<number, string>
  routes: MarchRoute[]
  places: { name: string; x: number; y: number }[]
  /** 區塊幾何出處（取代戰區底圖的預設出處） */
  geometryNote?: TerritoryGeometryProvenance
  /** 領土口徑說明（取代 territoryNote 預設文字） */
  territoryNote?: string
}

export interface DeepDiveLeader {
  faction: string
  name: string
  role: string
  source: string
}

export interface JapanDeepDivePack {
  id: string
  title: string
  tag: string
  footer: string
  yearMin: number
  yearMax: number
  initialYear: number
  ticks: { year: number; label: string }[]
  factions: EraFaction[]
  domains: DeepDiveDomain[]
  /** 用矢量底圖（亞洲—太平洋戰區）取代日本列島 relief */
  mapBase?: DeepDiveVectorBasemap
  /** 時段地圖窗口（見 DeepDiveMapWindow）：年份在區間內即取代本 pack 的地圖 */
  mapWindows?: DeepDiveMapWindow[]
  /** 快照年 → domainId → factionId */
  territoryByYear: Record<number, Record<string, string>>
  /**
   * 逐月放大區間（含首尾）。未提供即本 pack 一律按年，行為與從前完全相同；
   * 幕末（1853–1868）這類月級政變與交戰才需要宣告本欄。
   */
  monthZoom?: { from: number; to: number }
  /** 「年-月」（月補零）→ domainId → factionId；只在 monthZoom 年分內優先於 territoryByYear */
  territoryByMonth?: Record<string, Record<string, string>>
  /** 「年-月」→ 色塊口徑說明；優先於 shadeNotes */
  shadeNotesByMonth?: Record<string, string>
  keyYears: number[]
  routes: MarchRoute[]
  places: { name: string; x: number; y: number }[]
  events: EraEvent[]
  people: EraPerson[]
  situation: Record<string, FactionProfile>
  leadersByYear: Record<number, DeepDiveLeader[]>
  shadeNotes: Record<number, string>
  emptyHint: string
  detailFor: (id: string) => EraDetail | undefined
  readingFor: (id: string) => EraReading | undefined
}
