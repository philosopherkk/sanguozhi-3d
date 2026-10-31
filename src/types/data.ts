import type { TimelineDateFields } from './timelineDate'

export type EventType = 'war' | 'politics' | 'succession'

export type FactionId =
  | '東漢'
  | '黃巾'
  | '董卓'
  | '袁紹'
  | '袁術'
  | '曹魏'
  | '蜀漢'
  | '孫吳'
  | '公孫氏'
  | '劉表'
  | '劉璋'
  | '馬超韓遂'
  | '西晉'
  | '呂布'
  | '五溪蠻'
  | '其他'

export type PersonRole = '政治' | '軍事' | '謀士'

export interface Sourced {
  source: string
  disputed?: boolean
  note?: string
}

export interface TimelineEvent extends Sourced, TimelineDateFields {
  id: string
  year: number
  title: string
  desc: string
  factions: FactionId[]
  location: string
  type: EventType
}

export interface Faction {
  id: FactionId
  name: string
  color: string
  activeFrom: number
  activeTo: number
  source: string
}

export interface PopulationEntry extends Sourced {
  year: number
  faction: FactionId
  households?: number
  population?: number
  soldiers?: number
}

export interface FactionTenure {
  faction: FactionId
  from: number
  to?: number
}

export interface Person extends Sourced {
  id: string
  name: string
  字?: string
  birth?: number
  death?: number
  faction_by_year: FactionTenure[]
  role: PersonRole
  zhwiki_url: string
  grokipedia_url?: string
}

export interface Battle extends Sourced, TimelineDateFields {
  id: string
  name: string
  year: number
  attacker: FactionId
  defender: FactionId
  commanders: string[]
  attackerCommanders?: string[]
  defenderCommanders?: string[]
  wuParallelCommanders?: string[]
  troops?: {
    attacker?: number
    defender?: number
    claimed: true
  }
  result: string
  territory_change?: string
}
