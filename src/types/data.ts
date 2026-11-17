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
  | '曹操'
  | '劉備'
  | '孫權'
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
  /**
   * 關鍵事變：導致時代改變，或令地圖上一個政權出現／消失，或令整體權力格局
   * 改變（政體與正統、選官與賦稅、中央與地方、軍權歸屬）的事件。
   * 判據取自資料本身（轉折年、快照換圖年、勢力興亡年），不是主觀分級；另見政治轉折清單
   * reports/critical-incidents.md。詳情卡要寫明點解呢一年改變了格局。
   */
  critical?: boolean
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
  quote?: string // 史籍原文，逐字對 Wikisource 驗證
  /** 想像圖路徑（public/portraits/…）；無圖者不設，介面改以姓名首字代替 */
  portrait?: string
  /** 想像圖之考據依據（繪製所本），顯示於圖之提示文字 */
  portrait_note?: string
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
  quote?: string // 史籍原文，逐字對 Wikisource 驗證
}
