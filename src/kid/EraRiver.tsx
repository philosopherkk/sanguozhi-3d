/**
 * 第②屏：時間河（每個時代一粒踏腳石）。
 * 第 0 期骨架：只定好 props 介面，內容由 docs/plans/2026-11-28/ui.md
 * 「era-river」行補上（驗收：node scripts/audit_kid_ui.mjs --require=era-river）。
 */
export interface EraRiverProps {
  /** 選好時代之後呼叫，外殼轉去第③屏 */
  onPick: () => void
}

export function EraRiver(props: EraRiverProps) {
  void props
  return <section className="kid-river" />
}
