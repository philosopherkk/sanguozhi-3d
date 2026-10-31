import type { ReadingLayers } from '../components/ClassicDetailModal'
import type { TimelineDateFields } from '../types/timelineDate'

/** 平安、幕末共用的年表形狀。勢力 id 由各時代自己定義，不混入戰國。 */

export type EraEventType = 'war' | 'politics' | 'succession'

export interface EraEvent extends TimelineDateFields {
  id: string
  year: number
  title: string
  desc: string
  factions: string[]
  location: string
  type: EraEventType
  source: string
  disputed?: boolean
  note?: string
}

export interface EraDetail {
  causes: string
  course: string
  keyFigures: { name: string; role: string }[]
  outcome: string
  brief: string
  zhwikiUrl: string
}

export interface EraReading {
  quote: string
  source: string
  layers: ReadingLayers
}

export interface EraPerson {
  id: string
  name: string
  aka?: string
  birth?: number
  death?: number
  faction: string
  role: string
  summary: string
  source: string
  note?: string
  disputed?: boolean
}

export interface EraFaction {
  id: string
  name: string
  color: string
  activeFrom: number
  activeTo: number
  source: string
}
