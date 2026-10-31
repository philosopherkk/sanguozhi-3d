import type { ReactNode } from 'react'
import { usePersistedOpenResponsive } from '../lib/usePersistedOpen'

type MapDockProps = {
  title: string
  storageKey: string
  defaultOpenDesktop?: boolean
  defaultOpenMobile?: boolean
  className?: string
  collapsedHint?: string
  children: ReactNode
}

/** 地圖浮層：沿用 zhou-dock 收合樣式。 */
export function MapDock({
  title,
  storageKey,
  defaultOpenDesktop = false,
  defaultOpenMobile = false,
  className = '',
  collapsedHint,
  children,
}: MapDockProps) {
  const [open, setOpen] = usePersistedOpenResponsive(storageKey, {
    desktop: defaultOpenDesktop,
    mobile: defaultOpenMobile,
  })

  return (
    <aside
      className={`zhou-dock map-stage-dock${open ? '' : ' is-collapsed'} ${className}`.trim()}
    >
      <header className="zhou-dock__bar">
        <strong>{title}</strong>
        {!open && collapsedHint ? (
          <span className="map-stage-dock__hint">{collapsedHint}</span>
        ) : null}
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? '收起' : '展開'}
        </button>
      </header>
      {open ? <div className="zhou-dock__body">{children}</div> : null}
    </aside>
  )
}
