import { useCallback, useEffect, useState } from 'react'

const PREFIX = 'sanguozhi-3d:'
export const MOBILE_LAYOUT_MAX_PX = 640

export function readPersistedOpen(key: string): boolean | null {
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

export function writePersistedOpen(key: string, value: boolean): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`${PREFIX}${key}`, value ? '1' : '0')
  } catch {
    /* ignore quota / private mode */
  }
}

export function isMobileLayoutViewport(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia(`(max-width: ${MOBILE_LAYOUT_MAX_PX}px)`).matches
}

export function resolveResponsiveOpen(defaults: {
  desktop: boolean
  mobile: boolean
}): boolean {
  return isMobileLayoutViewport() ? defaults.mobile : defaults.desktop
}

function initialOpen(storageKey: string, defaultOpen: boolean): boolean {
  const stored = readPersistedOpen(storageKey)
  if (stored !== null) return stored
  return defaultOpen
}

function initialOpenResponsive(
  storageKey: string,
  defaults: { desktop: boolean; mobile: boolean },
): boolean {
  const stored = readPersistedOpen(storageKey)
  if (stored !== null) return stored
  return resolveResponsiveOpen(defaults)
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
        writePersistedOpen(storageKey, value)
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
      if (readPersistedOpen(storageKey) !== null) return
      setOpenState(resolveResponsiveOpen(defaults))
    }
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [storageKey, defaults.desktop, defaults.mobile])

  const setOpen = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      setOpenState((prev) => {
        const value = typeof next === 'function' ? next(prev) : next
        writePersistedOpen(storageKey, value)
        return value
      })
    },
    [storageKey],
  )

  return [open, setOpen]
}
