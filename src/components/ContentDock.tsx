import { useId, useState, type ReactNode } from 'react'

export type ContentDockTab = 'events' | 'people'

type ContentDockProps = {
  year: number
  events: ReactNode
  people: ReactNode
  tab?: ContentDockTab
  onTabChange?: (tab: ContentDockTab) => void
  eventsLabel?: string
  peopleLabel?: string
  /** 分頁 id 前綴，避免多個 dock 在同一頁衝突 */
  dockId?: string
}

const DEFAULT_TABS: { id: ContentDockTab; label: string }[] = [
  { id: 'events', label: '大事' },
  { id: 'people', label: '人物' },
]

function sanitizeDockId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '-')
}

export function ContentDock({
  year,
  events,
  people,
  tab: controlledTab,
  onTabChange,
  eventsLabel = '大事',
  peopleLabel = '人物',
  dockId,
}: ContentDockProps) {
  const [internalTab, setInternalTab] = useState<ContentDockTab>('events')
  const autoId = useId()
  const idBase = sanitizeDockId(dockId ?? autoId)

  const tab = controlledTab ?? internalTab
  const setTab = onTabChange ?? setInternalTab

  const tabs = DEFAULT_TABS.map((t) =>
    t.id === 'events' ? { ...t, label: eventsLabel } : { ...t, label: peopleLabel },
  )

  return (
    <section className="content-dock" aria-label="紀事與人物">
      <div className="content-dock__tabs" role="tablist" aria-label="內容切換">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`${idBase}-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`${idBase}-panel-${t.id}`}
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
        id={`${idBase}-panel-${tab}`}
        aria-labelledby={`${idBase}-tab-${tab}`}
      >
        {tab === 'events' ? events : people}
      </div>
    </section>
  )
}
