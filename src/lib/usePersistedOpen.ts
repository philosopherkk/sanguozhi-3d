import { useCallback, useEffect, useState } from 'react'

const PREFIX = 'sanguozhi-3d:'
export const MOBILE_LAYOUT_MAX_PX = 640

function readStored(key: string): boolean | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(`${PREFIX}${key}`)
    if (raw === '1') return true
    if (raw === '0') return false
  } catch {
    /* ignore quota / private mode */
  }
  return null
}

export function isMobileLayoutViewport(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia(`(max-width: ${MOBILE_LAYOUT_MAX_PX}px)`).matches
}

function responsiveDefault(defaults: { desktop: boolean; mobile: boolean }): boolean {
  return isMobileLayoutViewport() ? defaults.mobile : defaults.desktop
}

function initialOpen(storageKey: string, defaultOpen: boolean): boolean {
  const stored = readStored(storageKey)
  if (stored !== null) return stored
  return defaultOpen
}

function initialOpenResponsive(
  storageKey: string,
  defaults: { desktop: boolean; mobile: boolean },
): boolean {
  const stored = readStored(storageKey)
  if (stored !== null) return stored
  return responsiveDefault(defaults)
}

/** 記住面板展開狀態（同一瀏覽器分頁關閉前有效）。 */
export function usePersistedOpen(
  storageKey: string,
  defaultOpen: boolean,
): [boolean, (next: boolean | ((prev: boolean) => boolean)) => void] {
  const [open, setOpenState] = useState(() =>
    initialOpen(storageKey, defaultOpen),
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

/** 依 viewport 決定首次預設；使用者未存過前，跨 640px 會跟新預設；存過後不再跟 resize。 */
export function usePersistedOpenResponsive(
  storageKey: string,
  defaults: { desktop: boolean; mobile: boolean },
): [boolean, (next: boolean | ((prev: boolean) => boolean)) => void] {
  const [open, setOpenState] = useState(() =>
    initialOpenResponsive(storageKey, defaults),
  )

  useEffect(() => {
    const query = `(max-width: ${MOBILE_LAYOUT_MAX_PX}px)`
    const mq = window.matchMedia(query)
    const sync = () => {
      if (readStored(storageKey) !== null) return
      setOpenState(responsiveDefault(defaults))
    }
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [storageKey, defaults.desktop, defaults.mobile])

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
