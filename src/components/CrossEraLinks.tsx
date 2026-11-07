import {
  CHINA_ERA_SLOTS,
  JAPAN_ERA_SLOTS,
  useTopic,
  type ChinaEraSlot,
  type JapanEraSlot,
} from '../state/TopicContext'
import { setPendingYear } from '../state/pendingYear'

/**
 * 一國的事件指向另一國的同時事件。
 *
 * 為什麼要有：中日兩邊的年表各寫各的，元寇、白村江、萬曆朝鮮之役、
 * 二十一条這種「兩國同時發生」的事，讀者看完日本那條就以為看完了。
 * 加這層連結後，年表上能直接跳到對面那一國同一件事的寫法。
 */
export interface CrossRef {
  topic: 'china' | 'japan'
  /** 目標時代 id（CHINA_ERA_SLOTS / JAPAN_ERA_SLOTS 的 id）；找不到就不渲染 */
  era: string
  year: number
  label: string
}

export function CrossEraLinks({ refs }: { refs?: CrossRef[] }) {
  const { setTopic, setChinaEra, setJapanEra } = useTopic()
  if (!refs || refs.length === 0) return null

  return (
    <div className="cross-era-links">
      {refs.map((r) => {
        const slots = r.topic === 'china' ? CHINA_ERA_SLOTS : JAPAN_ERA_SLOTS
        const slot = slots.find((s) => s.id === r.era)
        if (!slot) return null
        const country = r.topic === 'china' ? '中國' : '日本'
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
              if (r.topic === 'china') setChinaEra(r.era as ChinaEraSlot)
              else setJapanEra(r.era as JapanEraSlot)
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
