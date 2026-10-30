import {
  UNREGISTERED_AFTER_280,
  UNREGISTERED_AFTER_280_LEAD,
  UNREGISTERED_AFTER_280_LEAD_SOURCE,
  UNREGISTERED_AFTER_280_TITLE,
} from '../data/unregisteredHouseholds'
import { useYear } from '../state/YearContext'

/** Visible at the end of the Three Kingdoms scrubber (280). */
export function UnregisteredHouseholdsPanel() {
  const { year } = useYear()
  if (year !== 280) return null

  return (
    <section className="unreg-panel" aria-labelledby="unreg-heading">
      <header className="unreg-panel__head">
        <h2 id="unreg-heading">{UNREGISTERED_AFTER_280_TITLE}</h2>
        <p className="unreg-panel__lead">{UNREGISTERED_AFTER_280_LEAD}</p>
        <p className="person-source">{UNREGISTERED_AFTER_280_LEAD_SOURCE}</p>
      </header>
      <ol className="unreg-panel__list">
        {UNREGISTERED_AFTER_280.map((group) => (
          <li key={group.id} className="unreg-panel__item">
            <h3 className="unreg-panel__name">
              {group.name}
              <span className="unreg-panel__place">{group.place}</span>
            </h3>
            <p className="unreg-panel__text">{group.text}</p>
            <p className="person-source">{group.source}</p>
            {group.note ? <p className="person-note">{group.note}</p> : null}
          </li>
        ))}
      </ol>
    </section>
  )
}
