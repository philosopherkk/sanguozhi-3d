import { useEffect, useRef } from 'react'
import {
  countryLabelForTopic,
  eraSlotsForTopic,
  useTopic,
} from '../state/TopicContext'

/** 頂欄之下的時代列：六國各自顯示本國槽位，預設時代由 TopicContext 決定。 */
export function EraBar() {
  const { topic, activeEra, setEraForTopic } = useTopic()
  const slots = eraSlotsForTopic(topic)
  const btnRefs = useRef(new Map<string, HTMLButtonElement | null>())

  // 窄屏時代列是單行橫向卷軸：把目前時代捲入視野並置中，
  // 首次載入與切換後都看得到「自己在哪一格」（批次 5）。
  // 桌面為 flex-wrap 多列，橫向無溢出時此呼叫無效果。
  useEffect(() => {
    const el = btnRefs.current.get(activeEra)
    if (!el) return
    el.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [activeEra, topic])

  const slotButton = (
    slotId: string,
    isActive: boolean,
    label: string,
    range: string,
    onClick: () => void,
  ) => (
    <button
      key={slotId}
      type="button"
      ref={(node) => {
        btnRefs.current.set(slotId, node)
      }}
      className={isActive ? 'is-active' : undefined}
      aria-current={isActive ? 'true' : undefined}
      onClick={onClick}
    >
      <span>{label}</span>
      <small>{range}</small>
    </button>
  )

  return (
    <nav className="era-bar" aria-label={`${countryLabelForTopic(topic)}時代`}>
      {slots.map((slot) =>
        slotButton(
          slot.id,
          activeEra === slot.id,
          slot.label,
          slot.range,
          () => setEraForTopic(topic, slot.id),
        ),
      )}
    </nav>
  )
}
