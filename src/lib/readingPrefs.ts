import { useSyncExternalStore } from 'react'
import {
  CHINA_ERA_SLOTS,
  JAPAN_ERA_SLOTS,
  type AppTopic,
} from '../state/TopicContext'

/**
 * 全站共用的閱讀偏好：字級、深／淺底、閱讀程度（小／中／大學生）與書籤。
 * 以 localStorage 持久化，並用自訂事件廣播，讓底部工具列與各面板同步，
 * 不必把 context 穿過每一個時代元件。
 */

export type ReadingLevel = 'elementary' | 'secondary' | 'university'
export type Theme = 'dark' | 'light'

export const FONT_STEPS = [87.5, 100, 112.5, 125, 137.5] as const

export interface Bookmark {
  /** 唯一鍵：topic:era:year（一律由 normalizeBookmark 重算，不接受存盤值） */
  id: string
  topic: AppTopic
  era: string
  year: number
  label: string
}

const CHINA_ERA_IDS = new Set<string>(CHINA_ERA_SLOTS.map((s) => s.id))
const JAPAN_ERA_IDS = new Set<string>(JAPAN_ERA_SLOTS.map((s) => s.id))

/** 書籤文案用：西元前寫成「前100年」，與站內年份顯示一致。 */
export function yearLabel(year: number): string {
  return year < 0 ? `前${-year}年` : `${year}年`
}

/**
 * 存盤的書籤要重驗：舊版本用過與現在不同的 topic／時代鍵，字串也可能被手改。
 * 時代鍵決定國家（兩國槽位不重疊），所以鍵不屬於原 topic 時改掛到正確國家，
 * 兩邊都不認識才丟掉——把陌生的時代鍵交回 TopicContext 會讓時代畫面整頁空白。
 */
function normalizeBookmark(raw: unknown): Bookmark | null {
  if (raw === null || typeof raw !== 'object') return null
  const stored = raw as Partial<Bookmark>
  if (typeof stored.year !== 'number' || !Number.isInteger(stored.year)) {
    return null
  }
  if (stored.year < -9999 || stored.year > 9999) return null
  const era = typeof stored.era === 'string' ? stored.era.trim() : ''
  const inChina = CHINA_ERA_IDS.has(era)
  const inJapan = JAPAN_ERA_IDS.has(era)
  if (!inChina && !inJapan) return null
  const topic: AppTopic = inJapan ? 'japan' : 'china'
  const slot = (inJapan ? JAPAN_ERA_SLOTS : CHINA_ERA_SLOTS).find(
    (s) => s.id === era,
  )
  // 國家被改掛時，舊 label 寫的是錯的國家名，因此一併重算。
  const moved = stored.topic !== topic
  const country = topic === 'china' ? '中國' : '日本'
  const eraName = slot?.label ?? era
  const label =
    !moved && typeof stored.label === 'string' && stored.label.trim()
      ? stored.label.trim()
      : `${country}·${eraName} ${yearLabel(stored.year)}`
  return {
    id: `${topic}:${era}:${stored.year}`,
    topic,
    era,
    year: stored.year,
    label,
  }
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
    const byId = new Map<string, Bookmark>()
    for (const item of parsed) {
      const mark = normalizeBookmark(item)
      if (mark && !byId.has(mark.id)) byId.set(mark.id, mark)
    }
    return [...byId.values()]
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

function saveBookmarks(list: Bookmark[]) {
  try {
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(list))
  } catch {
    /* 寫入失敗仍更新畫面 */
  }
}

export function toggleBookmark(mark: Omit<Bookmark, 'id'>): boolean {
  const next = normalizeBookmark(mark)
  if (!next) return false
  const current = readBookmarks()
  const existing = current.some((b) => b.id === next.id)
  saveBookmarks(
    existing
      ? current.filter((b) => b.id !== next.id)
      : [...current, next],
  )
  emit()
  return !existing
}

export function removeBookmark(id: string) {
  saveBookmarks(readBookmarks().filter((b) => b.id !== id))
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
