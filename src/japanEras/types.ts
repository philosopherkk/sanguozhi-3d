import type { ReadingLayers } from '../components/ClassicDetailModal'
import type { CrossRef } from '../components/CrossEraLinks'
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
  /**
   * 關鍵事變：導致時代改變，或令地圖上一個政權出現／消失，或令整體權力格局
   * 改變（政體與正統、選官與賦稅、中央與地方、軍權歸屬）的事件。
   * 判據取自資料本身（`keyYears`、勢力 `activeFrom`／`activeTo`、時代界線年），不是主觀分級；另見政治轉折清單
   * reports/critical-incidents.md。詳情卡要寫明點解呢一年改變了格局。
   */
  critical?: boolean
  /** 同時期另一國（中國）的對應事件 */
  crossRefs?: CrossRef[]
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
  /** 想像圖路徑（public/portraits/…）；無圖者不設，介面改以姓名首字代替 */
  portrait?: string
  /** 想像圖之考據依據（繪製所本），顯示於圖之提示文字 */
  portrait_note?: string
}

export interface EraFaction {
  id: string
  name: string
  color: string
  activeFrom: number
  activeTo: number
  source: string
}
