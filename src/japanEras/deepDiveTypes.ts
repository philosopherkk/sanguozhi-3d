import type { MarchRoute } from '../data/marchRoutes'
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
