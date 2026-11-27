import {
  countryLabelForTopic,
  eraSlotsForTopic,
  useTopic,
  type AppTopic,
} from '../state/TopicContext'
import { setPendingYear } from '../state/pendingYear'

/**
 * 一國的事件指向另一國的同時事件。
 *
 * 為什麼要有：中日兩邊的年表各寫各的，元寇、白村江、萬曆朝鮮之役、
 * 二十一條這種「兩國同時發生」的事，讀者看完日本那條就以為看完了。
 * 加這層連結後，年表上能直接跳到對面那一國同一件事的寫法。
 * 國家不止中日：槽位 id 全站唯一，任何一國的時代都能當目標。
 */
export interface CrossRef {
  topic: AppTopic
  /** 目標時代 id（COUNTRY_ERA_SLOTS 各槽位的 id）；找不到就不渲染 */
  era: string
  year: number
  label: string
}

export function CrossEraLinks({ refs }: { refs?: CrossRef[] }) {
  const { setTopic, setEraForTopic } = useTopic()
  if (!refs || refs.length === 0) return null

  return (
    <div className="cross-era-links">
      {refs.map((r) => {
        const slot = eraSlotsForTopic(r.topic).find((s) => s.id === r.era)
        if (!slot) return null
        const country = countryLabelForTopic(r.topic)
        return (
          <button
            key={`${r.topic}/${r.era}/${r.year}`}
            type="button"
            className="cross-era-link"
            title={`切到${country}的「${slot.label}」看同一件事（${r.year}年）`}
            onClick={() => {
              // 先記年份，目標 app 的 year context 初始化時會取走（跨度不符就退回預設年）
              setPendingYear(r.year)
              setTopic(r.topic)
              setEraForTopic(r.topic, r.era)
            }}
          >
            <span className="cross-era-link__who">{country}</span>
            <span className="cross-era-link__what">
              {slot.label} {r.year}：{r.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
