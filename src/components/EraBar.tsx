import { useEffect, useRef } from 'react'
import {
  CHINA_ERA_SLOTS,
  JAPAN_ERA_SLOTS,
  useTopic,
  type ChinaEraSlot,
  type JapanEraSlot,
} from '../state/TopicContext'

/** 頂欄之下的時代。中國預設三國，日本預設戰國。 */
export function EraBar() {
  const { topic, chinaEra, setChinaEra, japanEra, setJapanEra } = useTopic()
  const active = topic === 'china' ? chinaEra : japanEra
  const btnRefs = useRef(new Map<string, HTMLButtonElement | null>())

  // 窄屏時代列是單行橫向卷軸：把目前時代捲入視野並置中，
  // 首次載入與切換後都看得到「自己在哪一格」（批次 5）。
  // 桌面為 flex-wrap 多列，橫向無溢出時此呼叫無效果。
  useEffect(() => {
    const el = btnRefs.current.get(active)
    if (!el) return
    el.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [active, topic])

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

  if (topic === 'china') {
    return (
      <nav className="era-bar" aria-label="中國時代">
        {CHINA_ERA_SLOTS.map((slot) =>
          slotButton(
            slot.id,
            chinaEra === slot.id,
            slot.label,
            slot.range,
            () => setChinaEra(slot.id as ChinaEraSlot),
          ),
        )}
      </nav>
    )
  }

  return (
    <nav className="era-bar" aria-label="日本時代">
      {JAPAN_ERA_SLOTS.map((slot) =>
        slotButton(
          slot.id,
          japanEra === slot.id,
          slot.label,
          slot.range,
          () => setJapanEra(slot.id as JapanEraSlot),
        ),
      )}
    </nav>
  )
}
