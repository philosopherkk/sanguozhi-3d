/** 年代滑桿刻度防撞：太近的年份收作圓點、標籤重疊時只保留一個。
 *  Imperial 與日本滑桿共用（Project B 一致性）。 */

export type TickItem = { year: number; label?: string }
export type TickView = {
  year: number
  pct: number
  label?: string
  showYear: boolean
  showLabel: boolean
  /** 圓點能就位先畫；無法就位就留空（不要壓住鄰近的標籤） */
  showDot: boolean
  /** 年、標籤、圓點都放不下：先收作半透明的點擊位 */
  faint: boolean
}

export function layoutTicks(
  items: TickItem[],
  yearMin: number,
  yearMax: number,
  activeYear?: number,
): TickView[] {
  const span = yearMax - yearMin || 1
  // 校準自實際渲染：滑桿闊約1280px時，一個中日文字約1.1%、四位年份約3.4%、圓點約1.2%
  const YEAR_HALF = 1.9
  const DOT_HALF = 0.7
  // 年數字與標籤係上下兩行，所以同一條刻度只需要一個橫向區間
  const inRange = items.filter((t) => t.year >= yearMin && t.year <= yearMax)
  const laid = inRange.map((t) => {
    const labelLen = (t.label || '').length
    const labelHalf = labelLen > 0 ? labelLen * 1.05 + 0.9 : 0
    const pct = Math.min(100, Math.max(0, ((t.year - yearMin) / span) * 100))
    return { ...t, pct, labelHalf }
  })

  const placed: [number, number][] = []
  const free = (l: number, r: number) =>
    placed.every(([pl, pr]) => l >= pr - 0.3 || r <= pl + 0.3)
  const claim = (l: number, r: number) => placed.push([l, r])

  // 貼邊：0% 同100%的標籤會溢出滑桿，要單邊對齊
  const box = (t: { pct: number; labelHalf: number }, half: number): [number, number] => {
    const atStart = t.pct <= half
    const atEnd = t.pct >= 100 - half
    if (atStart) return [0, 2 * half]
    if (atEnd) return [100 - 2 * half, 100]
    return [t.pct - half, t.pct + half]
  }

  const shown = laid.map(() => ({ okLabel: false, okYear: false, okDot: false }))
  laid.forEach((t, i) => {
    const full = Math.max(t.labelHalf, YEAR_HALF)
    if (t.labelHalf > 0 && free(...box(t, full))) {
      shown[i].okLabel = true
      shown[i].okYear = true
      claim(...box(t, full))
      return
    }
    if (free(...box(t, YEAR_HALF))) {
      shown[i].okYear = true
      claim(...box(t, YEAR_HALF))
      return
    }
    if (t.labelHalf > 0 && free(...box(t, t.labelHalf))) {
      shown[i].okLabel = true
      claim(...box(t, t.labelHalf))
      return
    }
    if (free(...box(t, DOT_HALF))) {
      shown[i].okDot = true
      claim(...box(t, DOT_HALF))
    }
  })
  const ai = activeYear === undefined ? -1 : laid.findIndex((t) => t.year === activeYear)
  if (ai >= 0) {
    // 當前年一定要看到：移除遮擋它的鄰近刻度（轉回半透明點擊位）
    const t = laid[ai]
    const [lo, hi] = box(t, Math.max(t.labelHalf, YEAR_HALF))
    for (let j = 0; j < laid.length; j++) {
      if (j === ai) continue
      const s = shown[j]
      const half = Math.max(
        s.okLabel ? laid[j].labelHalf : 0,
        s.okYear ? YEAR_HALF : 0,
        s.okDot ? DOT_HALF : 0,
      )
      if (half <= 0) continue
      const [l, r] = box(laid[j], half)
      if (!(l >= hi || r <= lo)) shown[j] = { okLabel: false, okYear: false, okDot: false }
    }
    if (t.labelHalf > 0) shown[ai].okLabel = true
    shown[ai].okYear = true
  }
  return laid.map((t, i) => ({
    year: t.year,
    pct: t.pct,
    label: t.label,
    showYear: shown[i].okYear,
    showLabel: shown[i].okLabel,
    showDot: shown[i].okDot,
    faint: !shown[i].okYear && !shown[i].okLabel && !shown[i].okDot,
  }))
}
