import { useSyncExternalStore } from 'react'

/**
 * 全站共用的閱讀偏好：字級、深／淺底、閱讀程度（小／中／大學生）與書籤。
 * 以 localStorage 持久化，並用自訂事件廣播，讓底部工具列與各面板同步，
 * 不必把 context 穿過每一個時代元件。
 */

export type ReadingLevel = 'elementary' | 'secondary' | 'university'
export type Theme = 'dark' | 'light'

export const FONT_STEPS = [87.5, 100, 112.5, 125, 137.5] as const

export interface Bookmark {
  /** 唯一鍵：topic:era:year */
  id: string
  topic: string
  era: string
  year: number
  label: string
}

const FONT_KEY = 'timeline-font-step'
const THEME_KEY = 'timeline-theme'
const LEVEL_KEY = 'reading-level'
const BOOKMARK_KEY = 'reading-bookmarks'

const EVENT = 'reading-prefs-change'

export interface ReadingPrefs {
  fontStep: number
  theme: Theme
  level: ReadingLevel
  bookmarks: Bookmark[]
}

function readFontStep(): number {
  try {
    const raw = localStorage.getItem(FONT_KEY)
    const n = raw ? Number(raw) : 1
    if (Number.isInteger(n) && n >= 0 && n < FONT_STEPS.length) return n
  } catch {
    /* 讀取失敗用預設 */
  }
  return 1
}

function readTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

function readLevel(): ReadingLevel {
  try {
    const raw = localStorage.getItem(LEVEL_KEY)
    if (raw === 'elementary' || raw === 'secondary' || raw === 'university') return raw
  } catch {
    /* 讀取失敗用預設 */
  }
  return 'secondary'
}

function readBookmarks(): Bookmark[] {
  try {
    const raw = localStorage.getItem(BOOKMARK_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (b): b is Bookmark =>
        b != null &&
        typeof b === 'object' &&
        typeof (b as Bookmark).id === 'string' &&
        typeof (b as Bookmark).year === 'number',
    )
  } catch {
    return []
  }
}

/** 把字級與主題寫入 <html>，讓全站 CSS 生效。 */
export function applyDocumentPrefs() {
  const root = document.documentElement
  root.dataset.theme = readTheme()
  root.style.fontSize = `${FONT_STEPS[readFontStep()]}%`
}

function emit() {
  applyDocumentPrefs()
  window.dispatchEvent(new Event(EVENT))
}

export function setFontStep(step: number) {
  const clamped = Math.max(0, Math.min(FONT_STEPS.length - 1, step))
  try {
    localStorage.setItem(FONT_KEY, String(clamped))
  } catch {
    /* 寫入失敗仍更新畫面 */
  }
  emit()
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    /* 寫入失敗仍更新畫面 */
  }
  emit()
}

export function setLevel(level: ReadingLevel) {
  try {
    localStorage.setItem(LEVEL_KEY, level)
  } catch {
    /* 寫入失敗仍更新畫面 */
  }
  emit()
}

export function toggleBookmark(mark: Omit<Bookmark, 'id'>): boolean {
  const id = `${mark.topic}:${mark.era}:${mark.year}`
  const current = readBookmarks()
  const existing = current.find((b) => b.id === id)
  const next = existing
    ? current.filter((b) => b.id !== id)
    : [...current, { ...mark, id }]
  try {
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(next))
  } catch {
    /* 寫入失敗仍更新畫面 */
  }
  emit()
  return !existing
}

export function removeBookmark(id: string) {
  const next = readBookmarks().filter((b) => b.id !== id)
  try {
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(next))
  } catch {
    /* 寫入失敗仍更新畫面 */
  }
  emit()
}

function snapshot(): ReadingPrefs {
  return {
    fontStep: readFontStep(),
    theme: readTheme(),
    level: readLevel(),
    bookmarks: readBookmarks(),
  }
}

// useSyncExternalStore 需要穩定的快照參照；只在值變化時重建。
let cache: ReadingPrefs = snapshot()
function getSnapshot(): ReadingPrefs {
  const next = snapshot()
  if (
    next.fontStep !== cache.fontStep ||
    next.theme !== cache.theme ||
    next.level !== cache.level ||
    next.bookmarks.length !== cache.bookmarks.length ||
    next.bookmarks.some((b, i) => b.id !== cache.bookmarks[i]?.id)
  ) {
    cache = next
  }
  return cache
}

function subscribe(cb: () => void): () => void {
  window.addEventListener(EVENT, cb)
  window.addEventListener('storage', cb)
  return () => {
    window.removeEventListener(EVENT, cb)
    window.removeEventListener('storage', cb)
  }
}

export function useReadingPrefs(): ReadingPrefs {
  return useSyncExternalStore(subscribe, getSnapshot, snapshot)
}
