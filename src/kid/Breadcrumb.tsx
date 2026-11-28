/**
 * 頂部三粒點：國家 → 時代 → 時光機。
 * 第 0 期骨架：只定好 props 介面，內容由 docs/plans/2026-11-28/ui.md
 * 「breadcrumb」行補上（驗收：node scripts/audit_kid_ui.mjs --require=breadcrumb）。
 */
export interface BreadcrumbProps {
  /** 目前第幾步（1＝選國家、2＝選時代、3＝時光機） */
  step: 1 | 2 | 3
}

export function Breadcrumb(props: BreadcrumbProps) {
  void props
  return <ol className="kid-crumbs" />
}
