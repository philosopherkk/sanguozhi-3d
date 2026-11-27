import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { announceTimeline, readTimelineFromUrl } from '../lib/timelineUrl'

/** 頂欄六國。中國＝三國志深潛；日本＝戰國深潛；韓國、泰國、越南、馬來西亞＝時代深潛。 */
export type AppTopic =
  | 'china'
  | 'japan'
  | 'korea'
  | 'thailand'
  | 'vietnam'
  | 'malaysia'

export interface TopicMeta {
  id: AppTopic
  label: string
  range: string
}

export const TOPIC_META: TopicMeta[] = [
  { id: 'china', label: '中國', range: '夏–當代' },
  { id: 'japan', label: '日本', range: '有史以來–當代' },
  { id: 'korea', label: '韓國', range: '前108–當代' },
  { id: 'thailand', label: '泰國', range: '1238–當代' },
  { id: 'vietnam', label: '越南', range: '前111–當代' },
  { id: 'malaysia', label: '馬來西亞', range: '1400–當代' },
]

export type ChinaEraSlot =
  | 'xia'
  | 'shang'
  | 'xizhou'
  | 'chunqiu'
  | 'zhanguo'
  | 'qin'
  | 'han'
  | 'sanguo'
  | 'jin'
  | 'nanbei'
  | 'sui'
  | 'tang'
  | 'wudai'
  | 'liaosong'
  | 'yuanmingqing'
  | 'minguo'
  | 'civilwar'
  | 'prc'
export type JapanEraSlot =
  | 'kofun'
  | 'asuka'
  | 'nara'
  | 'heian'
  | 'kamakura'
  | 'muromachi'
  | 'sengoku'
  | 'azuchi'
  | 'edo'
  | 'bakumatsu'
  | 'modern'
export type KoreaEraSlot = 'koancient' | 'kogoryeo' | 'kojoseon' | 'komodern'
export type ThailandEraSlot =
  | 'thsukhothai'
  | 'thayutthaya'
  | 'thchakri'
  | 'thmodern'
export type VietnamEraSlot =
  | 'vnnorth'
  | 'vndynasty'
  | 'vnnguyen'
  | 'vnmodern'
export type MalaysiaEraSlot =
  | 'mymalacca'
  | 'mycolonial'
  | 'mymerdeka'
  | 'mymodern'

export interface EraSlotMeta<T extends string> {
  id: T
  label: string
  range: string
}

export const CHINA_ERA_SLOTS: EraSlotMeta<ChinaEraSlot>[] = [
  { id: 'xia', label: '夏', range: '文獻·有爭議' },
  { id: 'shang', label: '商', range: '前1600–前1046' },
  { id: 'xizhou', label: '西周', range: '前1046–前771' },
  { id: 'chunqiu', label: '春秋', range: '前770–前476' },
  { id: 'zhanguo', label: '戰國', range: '前475–前221' },
  { id: 'qin', label: '秦', range: '前221–前207' },
  { id: 'han', label: '漢', range: '前206–183' },
  { id: 'sanguo', label: '三國', range: '184–280' },
  { id: 'jin', label: '晉', range: '280–316' },
  { id: 'nanbei', label: '十六國南北朝', range: '304–589' },
  { id: 'sui', label: '隋', range: '581–618' },
  { id: 'tang', label: '唐', range: '618–907' },
  { id: 'wudai', label: '五代十國', range: '907–960' },
  { id: 'liaosong', label: '遼宋', range: '960–1279' },
  { id: 'yuanmingqing', label: '元明清', range: '1271–1911' },
  { id: 'minguo', label: '民國軍閥', range: '1912–1949' },
  { id: 'civilwar', label: '國共內戰', range: '1945–1949' },
  { id: 'prc', label: '共和國', range: '1949–2026' },
]

export const JAPAN_ERA_SLOTS: EraSlotMeta<JapanEraSlot>[] = [
  { id: 'kofun', label: '古墳前期', range: '250–537' },
  { id: 'asuka', label: '飛鳥', range: '538–710' },
  { id: 'nara', label: '奈良', range: '710–794' },
  { id: 'heian', label: '平安', range: '794–1185' },
  { id: 'kamakura', label: '鎌倉', range: '1185–1333' },
  { id: 'muromachi', label: '室町前期', range: '1336–1467' },
  { id: 'sengoku', label: '戰國', range: '1467–1573' },
  { id: 'azuchi', label: '安土桃山', range: '1573–1603' },
  { id: 'edo', label: '德川江戶', range: '1603–1868' },
  { id: 'bakumatsu', label: '幕末', range: '1853–1868' },
  { id: 'modern', label: '明治至當代', range: '1868–2026' },
]

/** 韓國四期：年界與 src/countries/korea/*Pack.ts 的 yearMin／yearMax 一致。 */
export const KOREA_ERA_SLOTS: EraSlotMeta<KoreaEraSlot>[] = [
  { id: 'koancient', label: '古朝鮮與三國', range: '前108–668' },
  { id: 'kogoryeo', label: '統一新羅與高麗', range: '668–1392' },
  { id: 'kojoseon', label: '朝鮮王朝', range: '1392–1897' },
  { id: 'komodern', label: '韓國近現代', range: '1897–2026' },
]

/** 泰國四期：年界與 src/countries/thailand/*Pack.ts 的 yearMin／yearMax 一致。 */
export const THAILAND_ERA_SLOTS: EraSlotMeta<ThailandEraSlot>[] = [
  { id: 'thsukhothai', label: '素可泰與蘭納', range: '1238–1351' },
  { id: 'thayutthaya', label: '阿瑜陀耶與吞武里', range: '1438–1767' },
  { id: 'thchakri', label: '卻克里與條約時代', range: '1782–1909' },
  { id: 'thmodern', label: '立憲與戰後', range: '1932–1997' },
]

/** 越南四期：年界與 src/countries/vietnam/*Pack.ts 的 yearMin／yearMax 一致。 */
export const VIETNAM_ERA_SLOTS: EraSlotMeta<VietnamEraSlot>[] = [
  { id: 'vnnorth', label: '北屬與自主立國', range: '前111–1009' },
  { id: 'vndynasty', label: '李陳後黎與鄭阮', range: '1010–1802' },
  { id: 'vnnguyen', label: '阮朝與法國保護', range: '1802–1945' },
  { id: 'vnmodern', label: '戰爭與統一', range: '1945–1990' },
]

/** 馬來西亞四期：年界與 src/countries/malaysia/*Pack.ts 的 yearMin／yearMax 一致。 */
export const MALAYSIA_ERA_SLOTS: EraSlotMeta<MalaysiaEraSlot>[] = [
  { id: 'mymalacca', label: '馬六甲蘇丹國', range: '1400–1511' },
  { id: 'mycolonial', label: '列強與英屬時期', range: '1511–1941' },
  { id: 'mymerdeka', label: '日佔、獨立與聯邦', range: '1941–1965' },
  { id: 'mymodern', label: '聯邦至當代', range: '1965–2026' },
]

/** 六國時代槽位總表：槽位 id 全站唯一，任何一個時代 id 只屬一國。 */
export const COUNTRY_ERA_SLOTS: Record<AppTopic, EraSlotMeta<string>[]> = {
  china: CHINA_ERA_SLOTS,
  japan: JAPAN_ERA_SLOTS,
  korea: KOREA_ERA_SLOTS,
  thailand: THAILAND_ERA_SLOTS,
  vietnam: VIETNAM_ERA_SLOTS,
  malaysia: MALAYSIA_ERA_SLOTS,
}

export function eraSlotsForTopic(topic: AppTopic): EraSlotMeta<string>[] {
  return COUNTRY_ERA_SLOTS[topic]
}

export function countryLabelForTopic(topic: AppTopic): string {
  return TOPIC_META.find((t) => t.id === topic)?.label ?? topic
}

/** 由時代 id 反查所屬國家；六國槽位互不重疊，查不到即不認識的鍵。 */
export function topicForEra(eraId: string): AppTopic | null {
  for (const topic of Object.keys(COUNTRY_ERA_SLOTS) as AppTopic[]) {
    if (COUNTRY_ERA_SLOTS[topic].some((s) => s.id === eraId)) return topic
  }
  return null
}

/** 各國預設時代：直接進站或 URL 只寫國家時落在這些時代。 */
const DEFAULT_ERA: Record<AppTopic, string> = {
  china: 'sanguo',
  japan: 'sengoku',
  korea: 'kojoseon',
  thailand: 'thayutthaya',
  vietnam: 'vndynasty',
  malaysia: 'mymalacca',
}

interface TopicContextValue {
  topic: AppTopic
  setTopic: (t: AppTopic) => void
  chinaEra: ChinaEraSlot
  setChinaEra: (e: ChinaEraSlot) => void
  japanEra: JapanEraSlot
  setJapanEra: (e: JapanEraSlot) => void
  /** 目前國家的目前時代（六國通用）。 */
  activeEra: string
  /** 換某個國家的時代；時代 id 不屬該國時不生效，避免畫面整頁空白。 */
  setEraForTopic: (topic: AppTopic, era: string) => void
  /** 由 URL 讀上來的年份（無則 null）；比年代屏用作初始年。 */
  urlYear: number | null
}

interface UrlSnapshot {
  topic: AppTopic | null
  /** URL 的 `?e=` 原文（可能是不認識的鍵） */
  era: string | null
  /** `?e=` 所屬國家（由槽位反查）；null 代表不認識 */
  eraTopic: AppTopic | null
  year: number | null
}

const TOPIC_IDS = new Set<string>(TOPIC_META.map((t) => t.id))

/**
 * 讀 URL：`?c=<國家>`（或 country）、`?e=<時代槽位>`（或 era）、`?y=<年份>`（或 year）。
 * 此處只係初始值；之後寫回 URL 由下面的 effect 負責。
 */
function readUrlState(): UrlSnapshot {
  const empty: UrlSnapshot = {
    topic: null,
    era: null,
    eraTopic: null,
    year: null,
  }
  if (typeof window === 'undefined') return empty
  const q = new URLSearchParams(window.location.search)
  const c = (q.get('c') ?? q.get('country') ?? '').toLowerCase()
  const topic: AppTopic | null = TOPIC_IDS.has(c) ? (c as AppTopic) : null
  const e = (q.get('e') ?? q.get('era') ?? '').trim()
  const eraTopic = e ? topicForEra(e) : null
  const yRaw = q.get('y') ?? q.get('year')
  const year = yRaw && /^-?\d{1,4}$/.test(yRaw.trim()) ? Number(yRaw.trim()) : null
  return { topic, era: e || null, eraTopic, year }
}

const TopicContext = createContext<TopicContextValue | null>(null)

export function TopicProvider({ children }: { children: ReactNode }) {
  const initial = readUrlState()
  // URL 只寫了時代（未寫國家）也足以判斷落在哪國；例如 ?e=edo 應該落日本。
  const initialTopic: AppTopic = initial.topic ?? initial.eraTopic ?? 'china'
  const [topic, setTopicState] = useState<AppTopic>(initialTopic)
  const [eraByTopic, setEraByTopic] = useState<Record<AppTopic, string>>(() => {
    const eras: Record<AppTopic, string> = { ...DEFAULT_ERA }
    if (initial.era && initial.eraTopic) eras[initial.eraTopic] = initial.era
    return eras
  })
  const urlYear = initial.year
  const setTopic = useCallback((t: AppTopic) => setTopicState(t), [])
  const setEraForTopic = useCallback((t: AppTopic, era: string) => {
    if (!COUNTRY_ERA_SLOTS[t].some((s) => s.id === era)) return
    setEraByTopic((cur) => (cur[t] === era ? cur : { ...cur, [t]: era }))
  }, [])
  const setChinaEra = useCallback(
    (e: ChinaEraSlot) => setEraForTopic('china', e),
    [setEraForTopic],
  )
  const setJapanEra = useCallback(
    (e: JapanEraSlot) => setEraForTopic('japan', e),
    [setEraForTopic],
  )
  /** 把 URL 里的時代（附帶其反查出的國家）併入狀態；不認識的鍵忽略。 */
  const applyUrlEra = useCallback((next: UrlSnapshot) => {
    if (!next.era || !next.eraTopic) return
    const eraTopic = next.eraTopic
    const era = next.era
    setEraByTopic((cur) =>
      cur[eraTopic] === era ? cur : { ...cur, [eraTopic]: era },
    )
  }, [])

  const chinaEra = eraByTopic.china as ChinaEraSlot
  const japanEra = eraByTopic.japan as JapanEraSlot
  const activeEra = eraByTopic[topic]

  // 國家／時代變更 → 寫回 URL（用 replaceState，不要污染返回歷史）。
  useEffect(() => {
    if (typeof window === 'undefined') return
    const q = new URLSearchParams(window.location.search)
    q.set('c', topic)
    q.set('e', eraByTopic[topic])
    const qs = q.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`)
  }, [topic, eraByTopic])

  /**
   * 瀏覽器前／後退，或同一份文件內切換 query 時，以 URL 為權威來源。
   * 此處重讀 URL 更新國家與時代，並將年份、月份廣播給各時代的年代
   * context（context 自行透過 onTimelineChange 訂閱）。
   */
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onPop = () => {
      const next = readUrlState()
      if (next.topic) setTopicState(next.topic)
      applyUrlEra(next)
      announceTimeline(readTimelineFromUrl())
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [applyUrlEra])

  /**
   * 兜底校對：某些導航情境（同一份文件內 query 被改寫、歷史導覽未派送
   * popstate）不會觸發上面的監聽。此處以極輕量的定時比對（只比較字串，
   * 不重複解析大資料）確保 URL 與狀態一致，分享連結永遠落在正確的時代。
   */
  useEffect(() => {
    if (typeof window === 'undefined') return
    const id = window.setInterval(() => {
      const next = readUrlState()
      const targetTopic = next.topic
      if (targetTopic) setTopicState((cur) => (cur === targetTopic ? cur : targetTopic))
      applyUrlEra(next)
      // 年份／月份同樣跟隨 URL（各時代 context 會跟隨 tk:timeline 廣播）
      announceTimeline(readTimelineFromUrl())
    }, 1000)
    return () => window.clearInterval(id)
  }, [applyUrlEra])

  const value = useMemo(
    () => ({
      topic,
      setTopic,
      chinaEra,
      setChinaEra,
      japanEra,
      setJapanEra,
      activeEra,
      setEraForTopic,
      urlYear,
    }),
    [
      topic,
      setTopic,
      chinaEra,
      setChinaEra,
      japanEra,
      setJapanEra,
      activeEra,
      setEraForTopic,
      urlYear,
    ],
  )
  return (
    <TopicContext.Provider value={value}>{children}</TopicContext.Provider>
  )
}

export function useTopic() {
  const ctx = useContext(TopicContext)
  if (!ctx) throw new Error('useTopic must be used within TopicProvider')
  return ctx
}
