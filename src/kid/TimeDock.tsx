/**
 * 時光列：上一年／年份大字／下一年／自動播放；年份一律經 `useEraYear()`。
 * 第 0 期骨架：只定好 props 介面，內容由 docs/plans/2026-11-28/ui.md
 * 「time-dock」行補上（驗收：node scripts/audit_kid_ui.mjs --require=time-dock）。
 */
export function TimeDock() {
  return <nav className="kid-dock" />
}
