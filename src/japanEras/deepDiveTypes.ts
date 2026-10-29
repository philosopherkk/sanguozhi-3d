import type { MarchRoute } from '../data/marchRoutes'
import type { FactionProfile } from '../lib/factionYearView'
import type { EraDetail, EraEvent, EraFaction, EraPerson, EraReading } from './types'

export interface DeepDiveDomain {
  id: string
  name: string
  ring: [number, number][]
  extraRings?: [number, number][][]
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
  /** 快照年 → domainId → factionId */
  territoryByYear: Record<number, Record<string, string>>
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
