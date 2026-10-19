import { useState } from 'react'
import { PeoplePanel } from './PeoplePanel'
import { TimelinePanel } from './TimelinePanel'
import { useYear } from '../state/YearContext'

type TabId = 'events' | 'people'

const TABS: { id: TabId; label: string }[] = [
  { id: 'events', label: '大事與戰役' },
  { id: 'people', label: '人物' },
]

export function ContentDock() {
  const { year } = useYear()
  const [tab, setTab] = useState<TabId>('events')

  return (
    <section className="content-dock" aria-label="紀事與人物">
      <div className="content-dock__tabs" role="tablist" aria-label="內容切換">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            className={tab === t.id ? 'content-dock__tab is-active' : 'content-dock__tab'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            <span className="content-dock__tab-year">{year}</span>
          </button>
        ))}
      </div>

      <div
        className="content-dock__body"
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
      >
        {tab === 'events' ? <TimelinePanel compact /> : <PeoplePanel compact />}
      </div>
    </section>
  )
}
