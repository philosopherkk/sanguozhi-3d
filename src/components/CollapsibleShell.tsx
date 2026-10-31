import type { ReactNode } from 'react'
import { usePersistedOpen } from '../lib/usePersistedOpen'

type CollapsibleShellProps = {
  /** 標題列左側文字 */
  title: string
  /** localStorage 鍵（不含前綴） */
  storageKey: string
  /** 首次造訪且無紀錄時是否展開 */
  defaultOpen?: boolean
  className?: string
  /** 收合時仍顯示在標題列的摘要（可選） */
  collapsedHint?: string
  children: ReactNode
}

/** 可收合面板外殼：標題列 + 展開／收起，狀態寫入 localStorage。 */
export function CollapsibleShell({
  title,
  storageKey,
  defaultOpen = false,
  className = '',
  collapsedHint,
  children,
}: CollapsibleShellProps) {
  const [open, setOpen] = usePersistedOpen(storageKey, defaultOpen)

  return (
    <section
      className={`collapsible-shell${open ? '' : ' is-collapsed'} ${className}`.trim()}
    >
      <header className="collapsible-shell__bar">
        <strong className="collapsible-shell__title">{title}</strong>
        {!open && collapsedHint ? (
          <span className="collapsible-shell__hint">{collapsedHint}</span>
        ) : null}
        <button
          type="button"
          className="collapsible-shell__toggle"
          aria-expanded={open}
          aria-controls={`collapsible-${storageKey}`}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="collapsible-shell__chevron" aria-hidden>
            {open ? '▾' : '▸'}
          </span>
          {open ? '收起' : '展開'}
        </button>
      </header>
      {open ? (
        <div
          id={`collapsible-${storageKey}`}
          className="collapsible-shell__body"
        >
          {children}
        </div>
      ) : null}
    </section>
  )
}
