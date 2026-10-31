export interface JapanTimelineEvent {
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
