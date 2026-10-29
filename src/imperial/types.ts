import type { MarchRoute } from '../data/marchRoutes'
import type { ProvinceId } from '../data/provinces'

export interface ImperialFaction {
  id: string
  name: string
  color: string
}

export interface ImperialSnapshot {
  year: number
  label: string
  source: string
  control: Partial<Record<ProvinceId, string>>
  note?: string
  /**
   * 州格蓋不住的陸地，像素環與底圖同一套 1968×1567。
   * 跟 control 併成同一勢力的色塊，不另做一套圖例。
   */
  extensions?: { faction: string; rings: [number, number][][] }[]
}

export interface ImperialEvent {
  id: string
  year: number
  title: string
  desc: string
  factions: string[]
  source: string
  secondary: string
  university: string
  student?: boolean
  location?: string
  type?: 'war' | 'politics' | 'succession'
  causes?: string
  course?: string
  outcome?: string
  keyFigures?: { name: string; role: string }[]
  classicQuote?: string
  classicSource?: string
}

export interface ImperialPerson {
  id: string
  name: string
  faction: string
  role: string
  activeFrom: number
  activeTo: number
  summary: string
  source: string
  note?: string
}

export interface ImperialLeader {
  faction: string
  name: string
  role: string
  source: string
}

export interface ImperialPack {
  id: string
  title: string
  tag: string
  footer: string
  yearMin: number
  yearMax: number
  initialYear: number
  ticks: { year: number; label: string }[]
  factions: ImperialFaction[]
  snapshots: ImperialSnapshot[]
  routes: MarchRoute[]
  events: ImperialEvent[]
  people?: ImperialPerson[]
  profiles: Record<
    string,
    {
      population: string
      military: string
      economy: string
      politics: string
      source: string
      disputed?: boolean
      /** 點開勢力時顯示：這支勢力屬於哪個時代 */
      eraIntro?: string
    }
  >
  leadersByYear?: Record<number, ImperialLeader[]>
  emptyHint?: string
}
