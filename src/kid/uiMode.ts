/**
 * 介面模式：`kid`（簡易版「時光機」）或 `classic`（詳細版）。
 *
 * 優先次序：URL `?ui=` → 使用者存過的偏好 → 預設。
 * 預設為簡易版；但帶 `?e=`／`?y=` 的舊分享連結（且未存過偏好）入詳細版，
 * 免得已分享的連結換了一個面目。`?ui=` 只影響本次，不寫入偏好；
 * 只有 `setUiMode()`（使用者按切換）才會記住。
 *
 * 判定只在首次讀取時做一次並快取：載入後 `TopicProvider` 會把 `?c=`／`?e=`
 * 寫回 URL，若每次重讀，簡易版使用者選完時代就會被誤判成舊連結而跳去詳細版。
 */
import { useSyncExternalStore } from 'react'

export type UiMode = 'kid' | 'classic'

/**
 * 簡易版是否為新訪客預設。使用者已裁定「預設簡易版」，但簡易版由本機代理
 * 逐行完成，未收口前若作預設，半成品會直接見到讀者；故先維持 false，
 * 只有 `?ui=kid` 或按「切換到簡易版」才進入。收口覆核通過後由雲端層改為 true。
 */
export const KID_IS_DEFAULT = false

const KEY = 'hf.uiMode'
const EVENT = 'hf:ui-mode'

function parse(raw: string | null | undefined): UiMode | null {
  return raw === 'kid' || raw === 'classic' ? raw : null
}

let current: UiMode | null = null

function resolveFromLocation(): UiMode {
  const q = new URLSearchParams(window.location.search)
  const fromUrl = parse(q.get('ui'))
  if (fromUrl) return fromUrl
  let saved: UiMode | null = null
  try {
    saved = parse(localStorage.getItem(KEY))
  } catch {
    /* 讀取失敗當未存 */
  }
  if (saved) return saved
  const deepLink = q.has('e') || q.has('era') || q.has('y') || q.has('year')
  if (!KID_IS_DEFAULT) return 'classic'
  return deepLink ? 'classic' : 'kid'
}

export function readUiMode(): UiMode {
  if (typeof window === 'undefined') return 'classic'
  if (current === null) current = resolveFromLocation()
  return current
}

export function isKidMode(): boolean {
  return readUiMode() === 'kid'
}

/** 把模式寫到 `<html data-ui>`，讓 `kid.css` 的選擇器生效。 */
export function applyUiMode(mode: UiMode = readUiMode()): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.ui = mode
}

/** 使用者切換：記住偏好、移除 URL 的 `?ui=`（否則它會蓋過偏好）並通知訂閱者。 */
export function setUiMode(mode: UiMode): void {
  try {
    localStorage.setItem(KEY, mode)
  } catch {
    /* 寫入失敗仍切換本次畫面 */
  }
  const q = new URLSearchParams(window.location.search)
  if (q.has('ui')) {
    q.delete('ui')
    const qs = q.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`)
  }
  current = mode
  applyUiMode(mode)
  window.dispatchEvent(new Event(EVENT))
}

function subscribe(cb: () => void): () => void {
  window.addEventListener(EVENT, cb)
  return () => window.removeEventListener(EVENT, cb)
}

export function useUiMode(): UiMode {
  return useSyncExternalStore(subscribe, readUiMode, () => 'classic' as UiMode)
}
