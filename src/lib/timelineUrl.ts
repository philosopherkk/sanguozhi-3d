/**
 * 年份／月份 ↔ URL 的共用契約。
 *
 * 舊況：只有操作年代滑桿（range input）才會寫入 `y`，月份完全未入 URL；
 * app 亦未監聽 `popstate`，因此瀏覽器前／後退、或同一份文件內切換 query
 * 時皆不會重讀 URL（初次載入的分享連結正常，返回時即偏離）。
 *
 * 現行：各時代的 year context 變更時呼叫 `announceTimeline()`，由
 * `UrlBridge` 統一寫回 `y`／`mo`；`popstate` 時由 TopicProvider 重讀 URL
 * 再廣播，各 context 跟隨。不逐月的時代傳 month = null，URL 會移除 `mo`。
 */
export interface TimelineState {
  year: number | null
  month: number | null
}

export const TIMELINE_EVENT = 'tk:timeline'

/** 時代 context 通知「我現在於該年／月」。年份未知時不要播。 */
export function announceTimeline(state: TimelineState): void {
  if (typeof window === 'undefined' || state.year === null) return
  window.dispatchEvent(new CustomEvent<TimelineState>(TIMELINE_EVENT, { detail: state }))
}

/** 訂閱時序變更（UrlBridge 寫 URL；context 於 popstate 時跟隨 URL）。 */
export function onTimelineChange(cb: (state: TimelineState) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = (ev: Event) => {
    const detail = (ev as CustomEvent<TimelineState>).detail
    if (detail && typeof detail.year === 'number') cb(detail)
  }
  window.addEventListener(TIMELINE_EVENT, handler)
  return () => window.removeEventListener(TIMELINE_EVENT, handler)
}

/** 讀 `?y=`（或 year）與 `?mo=`（或 m／month）。月份只接受 1–12。 */
export function readTimelineFromUrl(): TimelineState {
  const empty: TimelineState = { year: null, month: null }
  if (typeof window === 'undefined') return empty
  const q = new URLSearchParams(window.location.search)
  const yRaw = q.get('y') ?? q.get('year')
  const mRaw = q.get('mo') ?? q.get('m') ?? q.get('month')
  const year = yRaw && /^-?\d{1,4}$/.test(yRaw.trim()) ? Number(yRaw.trim()) : null
  const month = mRaw && /^\d{1,2}$/.test(mRaw.trim()) ? Number(mRaw.trim()) : null
  return { year, month: month !== null && month >= 1 && month <= 12 ? month : null }
}

/** 寫回 URL（replaceState，不污染返回歷史）；無變動就不寫。 */
export function writeTimelineToUrl(state: TimelineState): void {
  if (typeof window === 'undefined') return
  const q = new URLSearchParams(window.location.search)
  if (state.year !== null) q.set('y', String(state.year))
  if (state.month !== null) q.set('mo', String(state.month))
  else q.delete('mo')
  const qs = q.toString()
  const next = `${window.location.pathname}${qs ? `?${qs}` : ''}`
  if (next !== `${window.location.pathname}${window.location.search}`) {
    window.history.replaceState(null, '', next)
  }
}
