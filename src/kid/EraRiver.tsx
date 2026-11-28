/**
 * 第②屏：時間河（每個時代一粒踏腳石）。
 * 規格見 docs/plans/2026-11-28/ui.md「era-river」行
 * （驗收：node scripts/audit_kid_ui.mjs --require=era-river）。
 */
import { useEffect, useRef } from 'react'
import { PersonPortrait } from '../components/PersonPortrait'
import { eraSlotsForTopic, useTopic } from '../state/TopicContext'
import { ERA_FACE, S } from './strings'

export interface EraRiverProps {
  /** 選好時代之後呼叫，外殼轉去第③屏 */
  onPick: () => void
}

export function EraRiver(props: EraRiverProps) {
  const { topic, activeEra, setEraForTopic } = useTopic()
  const activeRef = useRef<HTMLButtonElement>(null)
  // 載入時把目前時代的踏腳石捲到視線中央（窄屏直排、桌面橫排都適用）。
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'center', inline: 'center' })
  }, [])
  return (
    <section className="kid-era">
      <h1 className="kid-title">{S.pickEra}</h1>
      <div className="kid-river">
        {eraSlotsForTopic(topic).map((slot) => (
          <button
            key={slot.id}
            ref={slot.id === activeEra ? activeRef : undefined}
            type="button"
            data-kid="era"
            data-era={slot.id}
            aria-current={slot.id === activeEra ? 'true' : undefined}
            onClick={() => {
              setEraForTopic(topic, slot.id)
              props.onPick()
            }}
          >
            {ERA_FACE[slot.id] ? (
              <PersonPortrait size="lg" src={ERA_FACE[slot.id]} name={slot.label} />
            ) : (
              <span className="kid-river__stamp">{Array.from(slot.label)[0]}</span>
            )}
            <span className="kid-river__name">{slot.label}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
