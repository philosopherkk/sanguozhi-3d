import type { ReactNode } from 'react'
import { usePersistedOpen } from '../lib/usePersistedOpen'

/** 三國志側欄：可收合為窄標籤，預設收合以地圖為主。 */
export function SanguozhiSideRail({ children }: { children: ReactNode }) {
  const [open, setOpen] = usePersistedOpen('side-rail', false)

  return (
    <div
      className={`side-rail${open ? '' : ' side-rail--collapsed'}`}
      data-collapsed={open ? undefined : ''}
    >
      {open ? (
        <>
          <div className="side-rail__toolbar">
            <span className="side-rail__label">紀事 · 人物</span>
            <button
              type="button"
              className="side-rail__toggle"
              aria-expanded
              onClick={() => setOpen(false)}
            >
              <span className="collapsible-shell__chevron" aria-hidden>
                ▾
              </span>
              收起側欄
            </button>
          </div>
          <div className="app-shell__side">{children}</div>
        </>
      ) : (
        <button
          type="button"
          className="side-rail__tab"
          aria-expanded={false}
          aria-label="展開紀事與人物側欄"
          onClick={() => setOpen(true)}
        >
          <span className="side-rail__tab-chevron" aria-hidden>
            ◂
          </span>
          <span className="side-rail__tab-text">紀事 · 人物</span>
        </button>
      )}
    </div>
  )
}
