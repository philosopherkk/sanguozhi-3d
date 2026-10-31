import type { ReactNode } from 'react'
import { usePersistedOpen } from '../lib/usePersistedOpen'

/** 頁尾長文預設收合，避免佔用垂直空間。 */
export function CollapsibleAppFooter({ children }: { children: ReactNode }) {
  const [open, setOpen] = usePersistedOpen('app-footer', false)

  return (
    <footer className={`app-footer${open ? '' : ' app-footer--collapsed'}`}>
      <button
        type="button"
        className="app-footer__toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? '收起' : '展開'}出處說明
      </button>
      {open ? <div className="app-footer__body">{children}</div> : null}
    </footer>
  )
}
