import { useState } from 'react'

/** 勢力面板一律預設收起；返回展開狀態與切換函式。 */
export function useBoardCollapsed() {
  const [open, setOpen] = useState(false)
  return {
    open,
    toggle: () => setOpen((v) => !v),
  }
}
