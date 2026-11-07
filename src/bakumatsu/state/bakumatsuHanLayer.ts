import { useSyncExternalStore } from 'react'
import {
  bakumatsuHanMeshCount,
  loadBakumatsuHanMeshes,
} from '../data/bakumatsuHanPaint'

/**
 * 幕末「藩界」圖層狀態。預設關閉：藩級界線幾何體積大（原始檔約 6.5 MB），
 * 只在使用者主動開啟時下載。開啟偏好記錄於 localStorage，曾主動開啟過的
 * 使用者再次進入時會自動載入，其餘人不會下載該檔案。
 */
const STORAGE_KEY = 'bakumatsu-han-layer'

export type BakumatsuHanLayerState = {
  /** 目前係咪使用藩級幾何繪圖 */
  enabled: boolean
  /** 藩級幾何係咪已下載完成 */
  loaded: boolean
  loading: boolean
  meshCount: number
  error: string
}

let state: BakumatsuHanLayerState = {
  enabled: false,
  loaded: false,
  loading: false,
  meshCount: 0,
  error: '',
}

const listeners = new Set<() => void>()

function writePreference(on: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off')
  } catch {
    /* 無 localStorage（例如無痕模式）時忽略 */
  }
}

function readPreference(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'on'
  } catch {
    return false
  }
}

function commit(next: Partial<BakumatsuHanLayerState>) {
  state = { ...state, ...next }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

async function downloadAndEnable() {
  commit({ loading: true, error: '' })
  try {
    await loadBakumatsuHanMeshes()
    commit({
      enabled: true,
      loaded: true,
      loading: false,
      meshCount: bakumatsuHanMeshCount(),
    })
  } catch {
    commit({
      enabled: false,
      loading: false,
      error: '藩級界線載入失敗，可再按一次重試',
    })
  }
}

export function toggleBakumatsuHanLayer() {
  if (state.enabled) {
    writePreference(false)
    commit({ enabled: false, loading: false })
    return
  }
  writePreference(true)
  if (state.loaded) {
    commit({ enabled: true })
    return
  }
  void downloadAndEnable()
}

/** 依偏好自動載入（只有曾主動開啟過的使用者才會下載）。 */
export function restoreBakumatsuHanLayer() {
  if (state.loading || state.loaded) return
  if (readPreference()) void downloadAndEnable()
}

export function useBakumatsuHanLayer() {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  )
  return { ...snapshot, toggle: toggleBakumatsuHanLayer }
}
