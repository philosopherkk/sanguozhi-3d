export type QinHanFactionId =
  | '秦'
  | '漢'
  | '西楚'
  | '張楚'
  | '齊'
  | '趙'
  | '燕'
  | '魏'
  | '新'
  | '吳楚'
  | '黃巾'

export type QinHanRole = '政治' | '軍事' | '謀士'

export type QinHanEventType = 'war' | 'politics'

export interface QinHanPerson {
  id: string
  name: string
  courtesy?: string
  faction: QinHanFactionId
  role: QinHanRole
  activeFrom: number
  activeTo: number
  datesNote: string
  summary: string
  source: string
  disputed?: boolean
  note?: string
}
