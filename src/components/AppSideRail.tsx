import { useState, type ReactNode } from 'react'
import { usePersistedOpenResponsive } from '../lib/usePersistedOpen'
import { usesDocumentScroll } from '../lib/scrollRoot'
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
  // 窄螢幕預設展開：行動版把地圖與內容分成兩屏後，「收合只剩一排標籤」
  // 會讓第二屏變成一條被拉滿的空欄（實測截圖所見）。地圖已經獨立成第一屏，
  // 收合在手機上沒有意義，故預設展開；工具列的「顯示地圖」仍可回到第一屏。
  const [open, setOpen] = usePersistedOpenResponsive(storageKey, {
    desktop: true,
    mobile: true,
  })
  const [tab, setTab] = useState<ContentDockTab>('events')

  const expand = (next: ContentDockTab) => {
    setTab(next)
    setOpen(true)
  }

  const toolbarLabel = chengyu != null ? '紀事 · 人物 · 成語' : '紀事 · 人物'

  // 窄屏是自然捲動的長頁，地圖與內容同在一個捲動容器內，
  // 「顯示地圖」應把頁面捲回地圖而不是收合側欄（收合會把剛看的內容藏起來）；
  // 桌面版地圖與側欄並列，維持原本的收合行為。
  const backToMap = () => {
    if (window.matchMedia('(max-width: 700px)').matches) {
      if (usesDocumentScroll()) {
        window.scrollTo({ top: 0 })
        return
      }
      const scroller = document.querySelector<HTMLElement>('.app-shell__main')
      if (scroller) {
        scroller.scrollTo({ top: 0 })
        return
      }
    }
    setOpen(false)
  }

  return (
    <div
      className={`side-rail${open ? '' : ' side-rail--collapsed'}`}
      data-collapsed={open ? undefined : ''}
    >
      {open ? (
        <>
          <div className="side-rail__toolbar">
            <span className="side-rail__label">{toolbarLabel}</span>
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
              trailing={
                <button
                  type="button"
                  className="side-rail__map-first"
                  aria-expanded={open}
                  onClick={backToMap}
                >
                  <span className="side-rail__map-first--mobile">回到地圖</span>
                  <span className="side-rail__map-first--desktop">顯示地圖</span>
                </button>
              }
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
