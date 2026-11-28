/**
 * 三個大分頁：故事／人物／地圖。
 * 第 0 期骨架：只定好 props 介面，內容由 docs/plans/2026-11-28/ui.md
 * 「tabs」行補上（驗收：node scripts/audit_kid_ui.mjs --require=tabs）。
 */
import type { KidTab } from './types'

export interface KidTabsProps {
  value: KidTab
  onChange: (tab: KidTab) => void
}

export function KidTabs(props: KidTabsProps) {
  void props
  return <div className="kid-tabs" />
}
