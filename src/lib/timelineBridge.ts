/**
 * 年份橋：任何外殼（底欄書籤、簡易版時光列）都經這裡讀寫「目前時代」的年份。
 *
 * 各時代 App 的年份狀態各自為政（11 套實作），唯一共通的介面是頁面上的
 * `.year-scrubber input[type=range]` 與 `tk:timeline` 廣播。本檔把
 * `BottomBar` 已驗證有效的寫法抽出共用，行為不變；簡易版另用 `useEraYear()`。
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import {
  announceTimeline,
  onTimelineChange,
  readTimelineFromUrl,
  writeTimelineToUrl,
} from './timelineUrl'
import type { EraSlotMeta } from '../state/TopicContext'

const SCRUBBER = '.year-scrubber input[type=range]'

/**
 * 把年份交給目前這個時代的畫面。
 *
 * 只有 imperial／bakumatsu／日本時代深潛三組 context 會訂閱 `tk:timeline`；
 * 其餘時代（三國、漢、戰國、平安等）的年份只由年代滑桿驅動，光寫 URL 的
 * `?y=` 對它們完全無效。因此這裡除了廣播之外，另外把滑桿的值直接寫一次
 * （用原生 setter，否則 React 的 value tracker 會吞掉 change 事件）。
 * 滑桿在 lazy 分塊內，換時代時要輪詢等它出現。換時代的點擊當刻，頁面上
 * 掛著的還是舊時代的滑桿：對它判年份界線會用錯的範圍，寫進去也只驅動舊
 * 時代，所以先記住舊節點，等新時代的滑桿換上才寫。
 */
export function useYearPush() {
  const timers = useRef<number[]>([])
  useEffect(
    () => () => timers.current.forEach((id) => window.clearTimeout(id)),
    [],
  )
  return (
    year: number,
    slot: EraSlotMeta<string>,
    sameEra: boolean,
    say: (msg: string) => void,
  ) => {
    const stale = sameEra
      ? null
      : document.querySelector<HTMLInputElement>(
          '.year-scrubber input[type=range]',
        )
    const attempt = (tries: number) => {
      const input = document.querySelector<HTMLInputElement>(
        '.year-scrubber input[type=range]',
      )
      if (!input || input === stale) {
        if (tries < 20) {
          timers.current.push(window.setTimeout(() => attempt(tries + 1), 150))
        } else {
          say(`找不到 ${slot.label} 的年代滑桿，請重新整理頁面。`)
        }
        return
      }
      const lo = Number(input.min)
      const hi = Number(input.max)
      const outOfRange =
        Number.isFinite(lo) && Number.isFinite(hi) && (year < lo || year > hi)
      if (outOfRange) {
        // 年份落在該時代範圍之外：只換到該時代，不把滑桿硬推出界；URL 的
        // `?y=` 一併改成畫面實際停留的年份，否則分享連結與畫面各說一套。
        const fmt = (y: number) => (y < 0 ? `前${-y}` : `${y}`)
        say(
          `${fmt(year)} 年不在 ${slot.label}（${fmt(lo)}–${fmt(hi)}）之內。`,
        )
        const landed = Number(input.value)
        if (Number.isFinite(landed)) {
          writeTimelineToUrl({ year: landed, month: null })
        }
        return
      }
      announceTimeline({ year, month: null })
      if (input.value === String(year)) return
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set
      if (!setter) return
      setter.call(input, String(year))
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
    // 同時代換年：滑桿已在頁面上，立刻寫。換時代：等 React 提交與分塊載入。
    attempt(sameEra ? 0 : 1)
  }
}

/**
 * 目前年份以 URL 的 `?y=` 為準（UrlBridge 於滑桿 input 時寫回）。
 * 只有三組時代 context 會廣播 `tk:timeline`，其餘時代要靠滑桿的 input
 * 事件才跟得上，否則面板上的年份會停在舊值。
 */
export function subscribeTimelineYear(notify: () => void): () => void {
  const offBroadcast = onTimelineChange(notify)
  const onInput = (ev: Event) => {
    const el = ev.target
    if (el instanceof HTMLInputElement && el.type === 'range') notify()
  }
  document.addEventListener('input', onInput)
  window.addEventListener('popstate', notify)
  return () => {
    offBroadcast()
    document.removeEventListener('input', onInput)
    window.removeEventListener('popstate', notify)
  }
}

export function useTimelineYear(): number | null {
  return useSyncExternalStore(subscribeTimelineYear, () =>
    readTimelineFromUrl().year,
  )
}

/** 目前時代滑桿的範圍與現值；滑桿未載入時為 null。 */
export interface EraRange {
  min: number
  max: number
  value: number
}

function scrubber(): HTMLInputElement | null {
  return document.querySelector<HTMLInputElement>(SCRUBBER)
}

function rangeKey(): string {
  const input = scrubber()
  if (!input) return ''
  return `${input.min}|${input.max}|${input.value}`
}

/**
 * 滑桿在 lazy 分塊內，換時代時會整個換掉而不發任何事件；除了 input 與
 * 廣播之外，另以 300ms 輕量輪詢（只比較字串）補上。
 */
function subscribeRange(notify: () => void): () => void {
  const off = subscribeTimelineYear(notify)
  const id = window.setInterval(notify, 300)
  return () => {
    off()
    window.clearInterval(id)
  }
}

export function useEraRange(): EraRange | null {
  const key = useSyncExternalStore(subscribeRange, rangeKey, () => '')
  return useMemo(() => {
    if (!key) return null
    const [min, max, value] = key.split('|').map(Number)
    if (![min, max, value].every(Number.isFinite)) return null
    return { min, max, value }
  }, [key])
}

/** 把年份直接寫入目前頁面上的滑桿（同時代用；界外自動夾回範圍內）。 */
export function writeEraYear(year: number): void {
  const input = scrubber()
  if (!input) return
  const lo = Number(input.min)
  const hi = Number(input.max)
  const y = Math.max(lo, Math.min(hi, Math.round(year)))
  announceTimeline({ year: y, month: null })
  if (input.value === String(y)) return
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set
  if (!setter) return
  setter.call(input, String(y))
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

export interface EraYear {
  /** 目前年份（滑桿未載入時為 null） */
  year: number | null
  min: number | null
  max: number | null
  /** 跳到某一年（自動夾在本時代範圍內） */
  setYear: (year: number) => void
  /** 前後移動 n 年；到頭到尾不動 */
  step: (delta: number) => void
  playing: boolean
  play: () => void
  stop: () => void
}

const PLAY_MS = 1200

/** 簡易版時光列用：年份、範圍、上一年／下一年、自動播放。 */
export function useEraYear(): EraYear {
  const range = useEraRange()
  const [playing, setPlaying] = useState(false)
  const rangeRef = useRef(range)
  rangeRef.current = range

  const setYear = useCallback((year: number) => writeEraYear(year), [])
  const step = useCallback((delta: number) => {
    const r = rangeRef.current
    if (!r) return
    writeEraYear(r.value + delta)
  }, [])
  const play = useCallback(() => setPlaying(true), [])
  const stop = useCallback(() => setPlaying(false), [])

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      const r = rangeRef.current
      if (!r || r.value >= r.max) {
        setPlaying(false)
        return
      }
      writeEraYear(r.value + 1)
    }, PLAY_MS)
    return () => window.clearInterval(id)
  }, [playing])

  return {
    year: range?.value ?? null,
    min: range?.min ?? null,
    max: range?.max ?? null,
    setYear,
    step,
    playing,
    play,
    stop,
  }
}
