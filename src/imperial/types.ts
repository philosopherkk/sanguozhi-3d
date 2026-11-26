import type { MarchRoute } from '../data/marchRoutes'
import type { CrossRef } from '../components/CrossEraLinks'
import type { TimelineDateFields } from '../types/timelineDate'

export interface ImperialFaction {
  id: string
  name: string
  color: string
  /** 政權號最早有效的年份（未登記之勢力不查）。缺省視為常年有效。 */
  activeFrom?: number
  /** 政權號最後有效的年份（亡國、改號之年）。缺省視為常年有效。 */
  activeTo?: number
}

export interface ImperialSnapshot {
  year: number
  /**
   * 月份精度（1–12）。沒有這個欄的快照視為「年底」，與舊行為相同。
   * 有這個欄時，解析器以 (year, month) 比較，地圖可以在同一年內換圖。
   */
  month?: number
  label: string
  source: string
  /**
   * 省份 id → 勢力 id。民國以後的 pack 用 `src/geo/eraRegions.ts` 的環編號
   * （anhui_n、jiangsu_s…），三國時代才用 provinces.ts 的 ProvinceId，
   * 所以鍵是字串而不是 ProvinceId。
   */
  control: Record<string, string>
  note?: string
  /** 範圍大於出處、或年份與邊界有異說時要標 true。 */
  disputed?: boolean
  /**
   * 這張快照的幾何沿用更早一年的快照（例如清 1860、1911 沿用 1750 年示意）。
   * 有這個欄時，介面會註明真正的測繪年份，稽核腳本亦不會報「幾何重複」。
   */
  geometryFrom?: number
  /**
   * 州格蓋不住的陸地，像素環與底圖同一套 1968×1567。
   * 跟 control 併成同一勢力的色塊，不另做一套圖例。
   */
  extensions?: { faction: string; rings: [number, number][][]; ids?: string[] }[]
  /**
   * 底圖上畫不出來的小地方（香港、澳門、金門、馬祖）：點加地名，不按比例。
   * 座標與底圖同一套 1968×1567。
   */
  markers?: {
    faction: string
    name: string
    x: number
    y: number
    /** 地名相對於點的位移，避免兩個近點重疊。 */
    dx?: number
    dy?: number
    anchor?: 'start' | 'middle' | 'end'
  }[]
  /** 主圖畫布蓋不到的海域用附圖（例如南海諸島，主圖南界約在北緯18.5°）。 */
  inset?: 'south-china-sea'
}

export interface ImperialEvent extends TimelineDateFields {
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
  type?: 'war' | 'politics' | 'succession' | 'culture'
  causes?: string
  course?: string
  outcome?: string
  outcomeSource?: string
  keyFigures?: { name: string; role: string }[]
  classicQuote?: string
  classicSource?: string
  /** 原文段之標題：預設「典籍原文」；近現代公文改傳「原文」「詔書」「電文」等。 */
  quoteHeading?: string
  note?: string
  disputed?: boolean
  /**
   * 關鍵事變：導致時代改變，或令地圖上一個政權出現／消失，或令整體權力格局
   * 改變（政體與正統、選官與賦稅、中央與地方、軍權歸屬）的事件。
   * 判據取自資料本身（`ticks` 轉折年、快照換圖年、勢力 `activeFrom`／`activeTo`），不是主觀分級；另見政治轉折清單
   * reports/critical-incidents.md。詳情卡要寫明點解呢一年改變了格局。
   */
  critical?: boolean
  /** 同時期另一國（日本）的對應事件 */
  crossRefs?: CrossRef[]
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
  /** 想像圖路徑（public/portraits/…）；無圖者不設，介面改以姓名首字代替 */
  portrait?: string
  /** 想像圖之考據依據（繪製所本），顯示於圖之提示文字 */
  portrait_note?: string
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
      /** disputed 的理據一句（AGENTS.md：理由寫落 note 欄） */
      note?: string
      /** 點開勢力時顯示：這支勢力屬於哪個時代 */
      eraIntro?: string
    }
  >
  leadersByYear?: Record<number, ImperialLeader[]>
  emptyHint?: string
}
