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

/** 頂欄只得兩項。中國＝三國志深潛；日本＝戰國深潛。 */
export type AppTopic = 'china' | 'japan'

export interface TopicMeta {
  id: AppTopic
  label: string
  range: string
}

export const TOPIC_META: TopicMeta[] = [
  { id: 'china', label: '中國', range: '夏–當代' },
  { id: 'japan', label: '日本', range: '有史以來–當代' },
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
  { id: 'heian', label: '平安末期', range: '1150–1185' },
  { id: 'kamakura', label: '鎌倉', range: '1185–1333' },
  { id: 'muromachi', label: '室町前期', range: '1336–1467' },
  { id: 'sengoku', label: '戰國', range: '1467–1573' },
  { id: 'azuchi', label: '安土桃山', range: '1573–1603' },
  { id: 'edo', label: '德川江戶', range: '1603–1868' },
  { id: 'bakumatsu', label: '幕末', range: '1853–1868' },
  { id: 'modern', label: '明治至當代', range: '1868–2026' },
]

interface TopicContextValue {
  topic: AppTopic
  setTopic: (t: AppTopic) => void
  chinaEra: ChinaEraSlot
  setChinaEra: (e: ChinaEraSlot) => void
  japanEra: JapanEraSlot
  setJapanEra: (e: JapanEraSlot) => void
  /** 由 URL 讀上來的年份（無則 null）；比年代屏用作初始年。 */
  urlYear: number | null
}

const CHINA_ERA_IDS = new Set<string>(CHINA_ERA_SLOTS.map((s) => s.id))
const JAPAN_ERA_IDS = new Set<string>(JAPAN_ERA_SLOTS.map((s) => s.id))

/**
 * 讀 URL：`?c=china|japan`（或 country）、`?e=<era slot>`（或 era）、`?y=<年份>`（或 year）。
 * 此處只係初始值；之後寫回 URL 由下面的 effect 負責。
 */
function readUrlState() {
  const empty = { topic: null as AppTopic | null, chinaEra: null as ChinaEraSlot | null, japanEra: null as JapanEraSlot | null, year: null as number | null }
  if (typeof window === 'undefined') return empty
  const q = new URLSearchParams(window.location.search)
  const c = (q.get('c') ?? q.get('country') ?? '').toLowerCase()
  const topic: AppTopic | null = c === 'japan' ? 'japan' : c === 'china' ? 'china' : null
  const e = (q.get('e') ?? q.get('era') ?? '').trim()
  const chinaEra = CHINA_ERA_IDS.has(e) ? (e as ChinaEraSlot) : null
  const japanEra = JAPAN_ERA_IDS.has(e) ? (e as JapanEraSlot) : null
  const yRaw = q.get('y') ?? q.get('year')
  const year = yRaw && /^-?\d{1,4}$/.test(yRaw.trim()) ? Number(yRaw.trim()) : null
  return { topic, chinaEra, japanEra, year }
}

const TopicContext = createContext<TopicContextValue | null>(null)

export function TopicProvider({ children }: { children: ReactNode }) {
  const initial = readUrlState()
  // URL 只寫了時代（未寫國家）都足以判斷邊邊；例如 ?e=edo 應該落日本。
  const initialTopic: AppTopic =
    initial.topic ?? (initial.japanEra && !initial.chinaEra ? 'japan' : 'china')
  const [topic, setTopicState] = useState<AppTopic>(initialTopic)
  const [chinaEra, setChinaEraState] = useState<ChinaEraSlot>(initial.chinaEra ?? 'sanguo')
  const [japanEra, setJapanEraState] = useState<JapanEraSlot>(initial.japanEra ?? 'sengoku')
  const urlYear = initial.year
  const setTopic = useCallback((t: AppTopic) => setTopicState(t), [])
  const setChinaEra = useCallback((e: ChinaEraSlot) => setChinaEraState(e), [])
  const setJapanEra = useCallback((e: JapanEraSlot) => setJapanEraState(e), [])

  // 國家／時代變更 → 寫回 URL（用 replaceState，不要污染返回歷史）。
  useEffect(() => {
    if (typeof window === 'undefined') return
    const q = new URLSearchParams(window.location.search)
    q.set('c', topic)
    q.set('e', topic === 'china' ? chinaEra : japanEra)
    const qs = q.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`)
  }, [topic, chinaEra, japanEra])

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
      if (next.chinaEra) setChinaEraState(next.chinaEra)
      if (next.japanEra) setJapanEraState(next.japanEra)
      announceTimeline(readTimelineFromUrl())
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  /**
   * 兜底校對：某些導航情境（同一份文件內 query 被改寫、歷史導覽未派送
   * popstate）不會觸發上面的監聽。此處以極輕量的定時比對（只比較字串，
   * 不重複解析大資料）確保 URL 與狀態一致，分享連結永遠落在正確的時代。
   */
  useEffect(() => {
    if (typeof window === 'undefined') return
    const id = window.setInterval(() => {
      const next = readUrlState()
      const target: AppTopic | null =
        next.topic ?? (next.japanEra && !next.chinaEra ? 'japan' : null)
      if (target) setTopicState((cur) => (cur === target ? cur : target))
      const jpEra = next.japanEra
      if (jpEra) setJapanEraState((cur) => (cur === jpEra ? cur : jpEra))
      const cnEra = next.chinaEra
      if (cnEra) setChinaEraState((cur) => (cur === cnEra ? cur : cnEra))
      // 年份／月份同樣跟隨 URL（各時代 context 會跟隨 tk:timeline 廣播）
      announceTimeline(readTimelineFromUrl())
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  const value = useMemo(
    () => ({
      topic,
      setTopic,
      chinaEra,
      setChinaEra,
      japanEra,
      setJapanEra,
      urlYear,
    }),
    [topic, setTopic, chinaEra, setChinaEra, japanEra, setJapanEra, urlYear],
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
