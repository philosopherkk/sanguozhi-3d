import { useCallback, useState } from 'react'

const PREFIX = 'sanguozhi-3d:'

function readStored(key: string, defaultOpen: boolean): boolean {
  if (typeof window === 'undefined') return defaultOpen
  try {
    const raw = localStorage.getItem(`${PREFIX}${key}`)
    if (raw === '1') return true
    if (raw === '0') return false
  } catch {
    /* ignore quota / private mode */
  }
  return defaultOpen
}

/** 記住面板展開狀態（同一瀏覽器分頁關閉前有效）。 */
export function usePersistedOpen(
  storageKey: string,
  defaultOpen: boolean,
): [boolean, (next: boolean | ((prev: boolean) => boolean)) => void] {
  const [open, setOpenState] = useState(() =>
    readStored(storageKey, defaultOpen),
  )

  const setOpen = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      setOpenState((prev) => {
        const value = typeof next === 'function' ? next(prev) : next
        try {
          localStorage.setItem(`${PREFIX}${storageKey}`, value ? '1' : '0')
        } catch {
          /* ignore */
        }
        return value
      })
    },
    [storageKey],
  )

  return [open, setOpen]
}
