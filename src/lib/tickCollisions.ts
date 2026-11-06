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
  const YEAR_HALF = 2.4 // 四位年份喺滑桿上大約佔嘅百分比闊度
  const laid = items.map((t) => {
    const labelLen = (t.label || '').length
    const labelHalf = labelLen > 0 ? Math.max(3, labelLen * 1.15 + 2) / 2 + 0.8 : 0
    return {
      ...t,
      pct: ((t.year - yearMin) / span) * 100,
      labelHalf,
      half: Math.max(labelHalf, YEAR_HALF),
    }
  })

  // 已擺好嘅區間（年數字同一個標籤都算一份，避免「年」壓住隔籬「標籤」）
  const placed: [number, number][] = []
  const free = (l: number, r: number) =>
    placed.every(([pl, pr]) => l >= pr - 0.4 || r <= pl + 0.4)
  const claim = (l: number, r: number) => {
    placed.push([l, r])
  }

  const boxFor = (i: number, kind: 'label' | 'year') => {
    const t = laid[i]
    const half = kind === 'label' ? t.labelHalf : YEAR_HALF
    const clampLeft = t.pct <= 4 ? 0 : t.pct >= 96 ? 2 * half : half
    return [t.pct - clampLeft, t.pct - clampLeft + 2 * half] as [number, number]
  }

  const shown = laid.map(() => ({ okLabel: false, okYear: false, okDot: true }))
  laid.forEach((t, i) => {
    if (t.labelHalf > 0) {
      const [l, r] = boxFor(i, 'label')
      if (free(l, r)) {
        shown[i].okLabel = true
        claim(l, r)
      }
    }
    const [yl, yr] = boxFor(i, 'year')
    if (free(yl, yr)) {
      shown[i].okYear = true
      claim(yl, yr)
    } else if (!shown[i].okLabel) {
      shown[i].okDot = false
    }
  })
  const ai = activeYear === undefined ? -1 : laid.findIndex((t) => t.year === activeYear)
  if (ai >= 0) {
    // 當前年一定要見到：清走任何壓住佢嘅隔籬標籤／年份
    const [al, ar] = boxFor(ai, laid[ai].labelHalf > 0 ? 'label' : 'year')
    const [ayl, ayr] = boxFor(ai, 'year')
    const lo = Math.min(al, ayl)
    const hi = Math.max(ar, ayr)
    for (let j = 0; j < laid.length; j++) {
      if (j === ai) continue
      if (shown[j].okLabel) {
        const [l, r] = boxFor(j, 'label')
        if (!(l >= hi || r <= lo)) shown[j].okLabel = false
      }
      if (shown[j].okYear) {
        const [l, r] = boxFor(j, 'year')
        if (!(l >= hi || r <= lo)) shown[j].okYear = false
      }
    }
    if (laid[ai].labelHalf > 0) shown[ai].okLabel = true
    shown[ai].okYear = true
    if (!shown[ai].okLabel) shown[ai].okDot = false
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
