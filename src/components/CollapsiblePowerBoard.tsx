import { useState, type ReactNode } from 'react'

/**
 * 勢力面板外殼：所有時代一律預設收起，只留標題與「展開」鍵，
 * 免得窄屏地圖一進去就被勢力清單遮住。內容完全保留，展開即可讀。
 */
export function CollapsiblePowerBoard({
  title,
  children,
  className,
  ariaLabel = '勢力疆域比較',
}: {
  title: ReactNode
  children: ReactNode
  className?: string
  ariaLabel?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <aside
      className={className ? `power-board ${className}` : 'power-board'}
      aria-label={ariaLabel}
    >
      <div className="power-board__head">
        <p className="power-board__title">{title}</p>
        <button
          type="button"
          className="power-board__toggle"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? '收起' : '展開'}
        </button>
      </div>
      {open ? children : null}
    </aside>
  )
}
