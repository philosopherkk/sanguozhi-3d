import { useState, type ReactNode } from 'react'
import { usePersistedOpenResponsive } from '../lib/usePersistedOpen'
import { ContentDock, type ContentDockTab } from './ContentDock'

type AppSideRailProps = {
  year: number
  events: ReactNode
  people: ReactNode
  chengyu?: ReactNode
  /** localStorage 鍵（不含前綴）；各專題請分開 */
  storageKey?: string
}

/** 側欄：桌面預設展開；窄螢幕預設收合為「大事／人物／成語」標籤。展開時以分頁呈現。 */
export function AppSideRail({
  year,
  events,
  people,
  chengyu,
  storageKey = 'side-rail',
}: AppSideRailProps) {
  const [open, setOpen] = usePersistedOpenResponsive(storageKey, {
    desktop: true,
    mobile: false,
  })
  const [tab, setTab] = useState<ContentDockTab>('events')

  const expand = (next: ContentDockTab) => {
    setTab(next)
    setOpen(true)
  }

  const toolbarLabel = chengyu != null ? '紀事 · 人物 · 成語' : '紀事 · 人物'

  return (
    <div
      className={`side-rail${open ? '' : ' side-rail--collapsed'}`}
      data-collapsed={open ? undefined : ''}
    >
      {open ? (
        <>
          <div className="side-rail__toolbar">
            <span className="side-rail__label">{toolbarLabel}</span>
            <button
              type="button"
              className="side-rail__map-first"
              aria-expanded={open}
              onClick={() => setOpen(false)}
            >
              顯示地圖
            </button>
          </div>
          <div className="app-shell__side app-shell__side--tabs">
            <ContentDock
              dockId={storageKey}
              year={year}
              events={events}
              people={people}
              chengyu={chengyu}
              tab={tab}
              onTabChange={setTab}
            />
          </div>
        </>
      ) : (
        <div className="side-rail__chips" role="group" aria-label="開啟側欄">
          <button
            type="button"
            className="side-rail__chip"
            aria-expanded={false}
            onClick={() => expand('events')}
          >
            大事
          </button>
          <button
            type="button"
            className="side-rail__chip"
            aria-expanded={false}
            onClick={() => expand('people')}
          >
            人物
          </button>
          {chengyu != null ? (
            <button
              type="button"
              className="side-rail__chip"
              aria-expanded={false}
              onClick={() => expand('chengyu')}
            >
              成語
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}
