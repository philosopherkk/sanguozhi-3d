/** 年代滑桿刻度防撞：太近的年份收做圓點、標籤重疊時只保留一個。
 *  Imperial 與日本滑桿共用（Project B 一致性）。 */

export type TickItem = { year: number; label?: string }
export type TickView = {
  year: number
  pct: number
  label?: string
  showYear: boolean
  showLabel: boolean
  faint: boolean
}

export function layoutTicks(
  items: TickItem[],
  yearMin: number,
  yearMax: number,
  activeYear?: number,
): TickView[] {
  const span = yearMax - yearMin || 1
  const laid = items.map((t) => ({ ...t, pct: ((t.year - yearMin) / span) * 100 }))
  let labelRight = -Infinity
  let yearRight = -Infinity
  let dotRight = -Infinity
  const shown = laid.map((t) => {
    const labelLen = (t.label || '').length
    const half = labelLen > 0 ? Math.max(3, labelLen * 1.15 + 2) / 2 + 0.8 : 0
    const leftPad = t.pct <= 4 ? 0 : t.pct >= 96 ? 2 * half : half
    const okLabel = labelLen > 0 && t.pct - leftPad >= labelRight
    if (okLabel) labelRight = t.pct - leftPad + 2 * half
    const okYear = t.pct - 4 >= yearRight
    if (okYear) yearRight = t.pct + 4
    const okDot = t.pct - 1.8 >= Math.max(dotRight, labelRight, yearRight)
    dotRight = Math.max(dotRight, t.pct + 1.8)
    return { okLabel, okYear, okDot }
  })
  const halfOf = (i: number) => {
    const t = laid[i]
    const labelLen = (t.label || '').length
    return labelLen > 0 ? Math.max(3, labelLen * 1.15 + 2) / 2 + 0.8 : 3
  }
  const ai = activeYear === undefined ? -1 : laid.findIndex((t) => t.year === activeYear)
  if (ai >= 0) {
    if (!shown[ai].okLabel && (laid[ai].label || '').length > 0) {
      shown[ai].okLabel = true
      for (let j = ai - 1; j >= 0; j--)
        if (shown[j].okLabel) {
          shown[j].okLabel = false
          break
        }
    }
    if (shown[ai].okLabel) {
      for (let j = ai + 1; j < laid.length; j++) {
        const need = halfOf(ai) + halfOf(j)
        if (laid[j].pct - laid[ai].pct < need) shown[j].okLabel = false
        else break
      }
    }
    if (!shown[ai].okYear) {
      shown[ai].okYear = true
      for (let j = ai - 1; j >= 0; j--)
        if (shown[j].okYear) {
          shown[j].okYear = false
          break
        }
    }
  }
  return laid.map((t, i) => ({
    year: t.year,
    pct: t.pct,
    label: t.label,
    showYear: shown[i].okYear,
    showLabel: shown[i].okLabel,
    faint: !shown[i].okDot && !shown[i].okYear,
  }))
}
