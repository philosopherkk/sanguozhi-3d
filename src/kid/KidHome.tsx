/**
 * 第①屏：選國家（6 張大卡）。
 * 第 0 期骨架：只定好 props 介面，內容由 docs/plans/2026-11-28/ui.md
 * 「home」行補上（驗收：node scripts/audit_kid_ui.mjs --require=home）。
 */
export interface KidHomeProps {
  /** 選好國家之後呼叫，外殼轉去第②屏 */
  onPick: () => void
}

export function KidHome(props: KidHomeProps) {
  void props
  return <section className="kid-home" />
}
