import type { TimelineDateFields } from '../types/timelineDate'

export interface ChinaTimelineEvent extends TimelineDateFields {
  id: string
  /** Signed year: negative = BCE */
  year: number
  title: string
  desc: string
  era: string
  type: 'war' | 'politics' | 'succession' | 'culture'
  location: string
  source: string
  disputed?: boolean
  note?: string
}

export interface ChinaPerson {
  id: string
  name: string
  years: string
  role: string
  era: string
  summary: string
  source: string
  /** Active roughly when |year - mid| is small; optional range */
  activeFrom: number
  activeTo: number
}

export interface ChinaEraBand {
  id: string
  label: string
  from: number
  to: number
  color: string
}
