export type ZhouFactionId =
  | '夏'
  | '商'
  | '周'
  | '齊'
  | '晉'
  | '秦'
  | '楚'
  | '吳'
  | '越'
  | '燕'
  | '趙'
  | '魏'
  | '韓'
  | '田齊'

export type ZhouRole = '政治' | '軍事' | '謀士'

export type ZhouEventType = 'war' | 'politics'

export interface ZhouPerson {
  id: string
  name: string
  courtesy?: string
  faction: ZhouFactionId
  role: ZhouRole
  /** 畫面上「在世／在活動」的起訖，含生卒未詳時的估計活動年。 */
  activeFrom: number
  activeTo: number
  datesNote: string
  summary: string
  source: string
  disputed?: boolean
  note?: string
}
