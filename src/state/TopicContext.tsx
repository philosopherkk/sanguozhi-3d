import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

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
}

const TopicContext = createContext<TopicContextValue | null>(null)

export function TopicProvider({ children }: { children: ReactNode }) {
  const [topic, setTopicState] = useState<AppTopic>('china')
  const [chinaEra, setChinaEraState] = useState<ChinaEraSlot>('sanguo')
  const [japanEra, setJapanEraState] = useState<JapanEraSlot>('sengoku')
  const setTopic = useCallback((t: AppTopic) => setTopicState(t), [])
  const setChinaEra = useCallback((e: ChinaEraSlot) => setChinaEraState(e), [])
  const setJapanEra = useCallback((e: JapanEraSlot) => setJapanEraState(e), [])
  const value = useMemo(
    () => ({
      topic,
      setTopic,
      chinaEra,
      setChinaEra,
      japanEra,
      setJapanEra,
    }),
    [topic, setTopic, chinaEra, setChinaEra, japanEra, setJapanEra],
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
