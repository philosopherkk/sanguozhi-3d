/** 指定年份內逐月走，走出範圍就回到按年。 */

export function clampYear(year: number, yearMin: number, yearMax: number): number {
  return Math.max(yearMin, Math.min(yearMax, Math.round(year)))
}

export function routesForMonth<T extends { year: number; month?: number }>(
  routes: T[],
  year: number,
  month: number | null,
): T[] {
  if (month == null) return routes.filter((route) => route.month == null)
  return routes.filter((route) => route.year === year && route.month === month)
}

export function inMonthZoom(year: number, from: number, to: number): boolean {
  return year >= from && year <= to
}

export function enterYear(args: {
  year: number
  zoomFrom: number
  zoomTo: number
  yearMin: number
  yearMax: number
  previousYear: number
  previousMonth: number | null
}): { year: number; month: number | null } {
  const year = clampYear(args.year, args.yearMin, args.yearMax)
  if (!inMonthZoom(year, args.zoomFrom, args.zoomTo)) {
    return { year, month: null }
  }
  if (year === args.previousYear && args.previousMonth != null) {
    return { year, month: args.previousMonth }
  }
  return { year, month: 1 }
}

export function stepTimeline(args: {
  year: number
  month: number | null
  dir: -1 | 1
  zoomFrom: number
  zoomTo: number
  yearMin: number
  yearMax: number
}): { year: number; month: number | null } {
  const { year, month, dir, zoomFrom, zoomTo, yearMin, yearMax } = args
  if (inMonthZoom(year, zoomFrom, zoomTo) && month != null) {
    const next = month + dir
    if (next >= 1 && next <= 12) return { year, month: next }
    if (dir < 0) {
      const prevYear = year - 1
      if (prevYear < yearMin) return { year, month }
      if (inMonthZoom(prevYear, zoomFrom, zoomTo)) return { year: prevYear, month: 12 }
      return { year: prevYear, month: null }
    }
    const nextYear = year + 1
    if (nextYear > yearMax) return { year, month }
    if (inMonthZoom(nextYear, zoomFrom, zoomTo)) return { year: nextYear, month: 1 }
    return { year: nextYear, month: null }
  }
  const stepped = clampYear(year + dir, yearMin, yearMax)
  if (stepped === year) return { year, month: null }
  if (inMonthZoom(stepped, zoomFrom, zoomTo)) {
    return { year: stepped, month: dir > 0 ? 1 : 12 }
  }
  return { year: stepped, month: null }
}
