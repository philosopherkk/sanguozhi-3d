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

  if (topic === 'china') {
    return (
      <nav className="era-bar" aria-label="中國時代">
        {CHINA_ERA_SLOTS.map((slot) => {
          const active = chinaEra === slot.id
          return (
            <button
              key={slot.id}
              type="button"
              className={active ? 'is-active' : undefined}
              aria-current={active ? 'true' : undefined}
              onClick={() => setChinaEra(slot.id as ChinaEraSlot)}
            >
              <span>{slot.label}</span>
              <small>{slot.range}</small>
            </button>
          )
        })}
      </nav>
    )
  }

  return (
    <nav className="era-bar" aria-label="日本時代">
      {JAPAN_ERA_SLOTS.map((slot) => {
        const active = japanEra === slot.id
        return (
          <button
            key={slot.id}
            type="button"
            className={active ? 'is-active' : undefined}
            aria-current={active ? 'true' : undefined}
            onClick={() => setJapanEra(slot.id as JapanEraSlot)}
          >
            <span>{slot.label}</span>
            <small>{slot.range}</small>
          </button>
        )
      })}
    </nav>
  )
}
