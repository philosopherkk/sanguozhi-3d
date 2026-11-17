import { useId, useRef, useState, type ReactNode } from 'react'

export type ContentDockTab = 'events' | 'people' | 'chengyu'

type ContentDockProps = {
  year: number
  events: ReactNode
  people: ReactNode
  chengyu?: ReactNode
  tab?: ContentDockTab
  onTabChange?: (tab: ContentDockTab) => void
  eventsLabel?: string
  peopleLabel?: string
  chengyuLabel?: string
  /** 分頁 id 前綴，避免多個 dock 在同一頁衝突 */
  dockId?: string
}

function buildTabs(
  eventsLabel: string,
  peopleLabel: string,
  chengyuLabel: string,
  hasChengyu: boolean,
): { id: ContentDockTab; label: string }[] {
  const tabs: { id: ContentDockTab; label: string }[] = [
    { id: 'events', label: eventsLabel },
    { id: 'people', label: peopleLabel },
  ]
  if (hasChengyu) {
    tabs.push({ id: 'chengyu', label: chengyuLabel })
  }
  return tabs
}

function sanitizeDockId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '-')
}

function panelForTab(
  tab: ContentDockTab,
  events: ReactNode,
  people: ReactNode,
  chengyu: ReactNode | undefined,
): ReactNode {
  switch (tab) {
    case 'events':
      return events
    case 'people':
      return people
    case 'chengyu':
      return chengyu
    default: {
      const _exhaustive: never = tab
      return _exhaustive
    }
  }
}

export function ContentDock({
  year,
  events,
  people,
  chengyu,
  tab: controlledTab,
  onTabChange,
  eventsLabel = '大事',
  peopleLabel = '人物',
  chengyuLabel = '成語',
  dockId,
  trailing,
}: ContentDockProps) {
  const [internalTab, setInternalTab] = useState<ContentDockTab>('events')
  const autoId = useId()
  const idBase = sanitizeDockId(dockId ?? autoId)

  const tab = controlledTab ?? internalTab
  const setTab = onTabChange ?? setInternalTab
  const bodyRef = useRef<HTMLDivElement | null>(null)

  const tabs = buildTabs(eventsLabel, peopleLabel, chengyuLabel, chengyu != null)

  // 切換分頁時回到新分頁的頂端：否則會沿用上一個分頁的捲動位置，
  // 一按「人物」就落在名單中段。窄屏另把分頁列對齊主區頂端，
  // 因為那是唯一的捲動容器（桌面的內層捲軸歸零即可）。
  const selectTab = (next: ContentDockTab) => {
    if (next === tab) return
    setTab(next)
    if (bodyRef.current) bodyRef.current.scrollTop = 0
    const scroller = document.querySelector<HTMLElement>('.app-shell__main')
    if (!scroller || getComputedStyle(scroller).overflowY !== 'auto') return
    const head = scroller.querySelector<HTMLElement>('.content-dock__head')
    if (!head) return
    const offset = head.getBoundingClientRect().top - scroller.getBoundingClientRect().top
    if (offset < 0) scroller.scrollTop += offset
  }

  return (
    <section className="content-dock" aria-label="紀事、人物與成語">
      <div className="content-dock__head">
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
        {trailing ? <div className="content-dock__tools">{trailing}</div> : null}
      </div>

      <div
        className="content-dock__body"
        ref={bodyRef}
        role="tabpanel"
        id={`${idBase}-panel-${tab}`}
        aria-labelledby={`${idBase}-tab-${tab}`}
      >
        {panelForTab(tab, events, people, chengyu)}
      </div>
    </section>
  )
}
