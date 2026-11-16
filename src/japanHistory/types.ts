import type { TimelineDateFields } from '../types/timelineDate'

export interface JapanTimelineEvent extends TimelineDateFields {
  id: string
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

export interface JapanPerson {
  id: string
  name: string
  years: string
  role: string
  era: string
  summary: string
  source: string
  activeFrom: number
  activeTo: number
  disputed?: boolean
  note?: string
  /** 想像圖路徑（public/portraits/…）；無圖者不設，介面改以姓名首字代替 */
  portrait?: string
  /** 想像圖之考據依據（繪製所本），顯示於圖之提示文字 */
  portrait_note?: string
}

export interface JapanPlace {
  id: string
  name: string
  summary: string
  location: string
  source: string
  disputed?: boolean
  note?: string
}

export interface JapanEraBand {
  id: string
  label: string
  from: number
  to: number
  color: string
}
