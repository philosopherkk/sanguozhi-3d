/**
 * 左上角固定：回首頁＋返回。
 * 第 0 期骨架：只定好 props 介面，內容由 docs/plans/2026-11-28/ui.md
 * 「nav-escape」行補上（驗收：node scripts/audit_kid_ui.mjs --require=nav-escape）。
 */
export interface NavCornerProps {
  /** 第①屏時為 false：不顯示返回，但回首頁按鈕位置不變 */
  showBack: boolean
  onHome: () => void
  onBack: () => void
}

export function NavCorner(props: NavCornerProps) {
  void props
  return <nav className="kid-nav" />
}
