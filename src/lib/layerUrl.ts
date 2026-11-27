import { useCallback, useEffect, useRef, useState } from 'react'
import {
  MOBILE_LAYOUT_MAX_PX,
  readPersistedOpen,
  resolveResponsiveOpen,
  writePersistedOpen,
} from './usePersistedOpen'

/**
 * 地圖圖層顯示狀態 ↔ URL 查詢參數 `?layers=...` 的共用契約。
 *
 * 規則：
 * - `?layers=` 以逗號分隔啟用中的圖層鍵：`territory`、`routes`、`frontier`、`places`。
 * - `?layers=none` 代表明確關閉全部圖層，與網址未帶 `layers` 參數有所區分。
 * - 初次載入若網址未帶 `layers`，完全沿用 `localStorage` 與窄屏響應式預設，
 *   且不主動把 `?layers=` 寫入網址，維持網址整潔。
 * - 初次載入若網址已帶 `layers`，依該參數初始化圖層，不覆寫 `localStorage`，
 *   直到使用者實際點擊圖層開關為止；不認識的標記略過不計。
 * - 使用者點擊任一圖層開關時，同時更新 `localStorage`（若有設定鍵名）並以
 *   `window.history.replaceState` 寫回 `?layers=...`，保留其他查詢參數。
 * - 監聽 `popstate`，於瀏覽器前進／後退或程式改寫網址時重新同步圖層狀態。
 */
export type MapLayerKey = 'territory' | 'routes' | 'frontier' | 'places'

export const MAP_LAYER_KEYS: readonly MapLayerKey[] = [
  'territory',
  'routes',
  'frontier',
  'places',
]

const VALID_LAYER_SET = new Set<string>(MAP_LAYER_KEYS)

export interface MapLayerSlotConfig {
  /** 對應 `localStorage` 的鍵名（不含前綴）；省略時僅存於元件狀態與網址。 */
  storageKey?: string
  /** 無網址參數且無 `localStorage` 紀錄時的預設開關狀態。 */
  defaultOpen: boolean | { desktop: boolean; mobile: boolean }
}

/**
 * 讀取 `?layers=`。
 * 回傳 `null` 表示網址未指定該參數（或參數值為空）；
 * 回傳 `Set`（包含空集合，例如 `?layers=none`）表示網址已有明確指定。
 */
export function readLayersFromUrl(): Set<MapLayerKey> | null {
  if (typeof window === 'undefined') return null
  const q = new URLSearchParams(window.location.search)
  if (!q.has('layers')) return null
  const raw = q.get('layers')
  if (raw === null) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (trimmed.toLowerCase() === 'none') return new Set<MapLayerKey>()

  const active = new Set<MapLayerKey>()
  for (const part of trimmed.split(',')) {
    const token = part.trim().toLowerCase()
    if (VALID_LAYER_SET.has(token)) {
      active.add(token as MapLayerKey)
    }
  }
  return active
}

/** 將目前啟用中的圖層鍵寫回 `?layers=`（`replaceState`，保留其餘查詢參數）。 */
export function writeLayersToUrl(
  layers: Partial<Record<MapLayerKey, boolean>>,
): void {
  if (typeof window === 'undefined') return
  const q = new URLSearchParams(window.location.search)
  const active = MAP_LAYER_KEYS.filter((k) => Boolean(layers[k]))
  q.set('layers', active.length > 0 ? active.join(',') : 'none')
  const qs = q.toString()
  const next = `${window.location.pathname}${qs ? `?${qs}` : ''}`
  if (next !== `${window.location.pathname}${window.location.search}`) {
    window.history.replaceState(null, '', next)
  }
}

function resolveDefault(
  defaultOpen: boolean | { desktop: boolean; mobile: boolean },
): boolean {
  return typeof defaultOpen === 'boolean'
    ? defaultOpen
    : resolveResponsiveOpen(defaultOpen)
}

function resolveFallbackState<K extends MapLayerKey>(
  config: Record<K, MapLayerSlotConfig>,
): Record<K, boolean> {
  const out = {} as Record<K, boolean>
  for (const key of Object.keys(config) as K[]) {
    const slot = config[key]
    const stored = slot.storageKey ? readPersistedOpen(slot.storageKey) : null
    out[key] = stored !== null ? stored : resolveDefault(slot.defaultOpen)
  }
  return out
}

function resolveInitialState<K extends MapLayerKey>(
  config: Record<K, MapLayerSlotConfig>,
): Record<K, boolean> {
  const urlLayers = readLayersFromUrl()
  if (urlLayers !== null) {
    const out = {} as Record<K, boolean>
    for (const key of Object.keys(config) as K[]) {
      out[key] = urlLayers.has(key)
    }
    return out
  }
  return resolveFallbackState(config)
}

/**
 * 管理單張地圖的圖層顯示狀態，串接 `?layers=`、`localStorage` 與窄屏響應式預設。
 */
export function useMapLayers<K extends MapLayerKey>(
  config: Record<K, MapLayerSlotConfig>,
): {
  layers: Record<K, boolean>
  toggleLayer: (key: K) => void
} {
  const configRef = useRef(config)
  useEffect(() => {
    configRef.current = config
  })

  const [layers, setLayers] = useState<Record<K, boolean>>(() =>
    resolveInitialState(config),
  )
  const layersRef = useRef(layers)
  useEffect(() => {
    layersRef.current = layers
  }, [layers])

  // 窄屏與桌面跨 640px 縮放時，若網址未帶 ?layers= 且使用者尚未存過偏好，跟隨新預設
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia(`(max-width: ${MOBILE_LAYOUT_MAX_PX}px)`)
    const sync = () => {
      if (readLayersFromUrl() !== null) return
      const curConfig = configRef.current
      let changed = false
      const next = { ...layersRef.current }
      for (const key of Object.keys(curConfig) as K[]) {
        const slot = curConfig[key]
        if (typeof slot.defaultOpen === 'boolean') continue
        if (slot.storageKey && readPersistedOpen(slot.storageKey) !== null) continue
        const target = resolveResponsiveOpen(slot.defaultOpen)
        if (next[key] !== target) {
          next[key] = target
          changed = true
        }
      }
      if (changed) {
        layersRef.current = next
        setLayers(next)
      }
    }
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  // 瀏覽器前進／後退或程式改寫網址時重新讀取 ?layers=（不覆寫 localStorage）
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onPop = () => {
      const urlLayers = readLayersFromUrl()
      if (urlLayers !== null) {
        const next = {} as Record<K, boolean>
        for (const key of Object.keys(configRef.current) as K[]) {
          next[key] = urlLayers.has(key)
        }
        layersRef.current = next
        setLayers(next)
        return
      }
      const fallback = resolveFallbackState(configRef.current)
      layersRef.current = fallback
      setLayers(fallback)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const toggleLayer = useCallback((key: K) => {
    const prev = layersRef.current
    const nextVal = !prev[key]
    const next = { ...prev, [key]: nextVal }
    layersRef.current = next
    setLayers(next)
    const slot = configRef.current[key]
    if (slot?.storageKey) {
      writePersistedOpen(slot.storageKey, nextVal)
    }
    writeLayersToUrl(next)
  }, [])

  return { layers, toggleLayer }
}
