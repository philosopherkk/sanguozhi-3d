/**
 * 第一次入站：第①屏頂一句提示＋大手指圖示，不用彈窗。
 * 第 0 期骨架：只定好 props 介面，內容由 docs/plans/2026-11-28/ui.md
 * 「onboarding」行補上（驗收：node scripts/audit_kid_ui.mjs --require=onboarding）。
 */
export interface FirstVisitProps {
  /** 使用者已經點過任何一張卡（外殼傳入）；為 true 時記住並收起提示 */
  dismissed: boolean
}

export function FirstVisit(props: FirstVisitProps) {
  void props
  return <p className="kid-hint" />
}
