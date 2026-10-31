import type { DatePrecision, TimelineDateFields } from '../types/timelineDate'

export function getDatePrecision(e: TimelineDateFields): DatePrecision {
  if (e.datePrecision) return e.datePrecision
  if (e.day != null && e.month != null) return 'day'
  if (e.month != null) return 'month'
  return 'year'
}

export function hasSubYearPrecision(e: TimelineDateFields): boolean {
  return getDatePrecision(e) !== 'year'
}

export function formatTimelineDate(
  e: TimelineDateFields & { year: number },
): string {
  const precision = getDatePrecision(e)
  const disputed = e.disputedDate ? '（日有異說）' : ''
  if (precision === 'day' && e.month != null && e.day != null) {
    return `${e.year}年${e.month}月${e.day}日${disputed}`
  }
  if (precision === 'month' && e.month != null) {
    return `${e.year}年${e.month}月${disputed}`
  }
  return `${e.year}年`
}

export function compareTimelineByDate(
  a: TimelineDateFields & { year: number; id: string },
  b: TimelineDateFields & { year: number; id: string },
): number {
  if (a.year !== b.year) return a.year - b.year
  const rank = (e: TimelineDateFields) => {
    const p = getDatePrecision(e)
    if (p === 'year') return 9999
    const m = e.month ?? 0
    const d = e.day ?? 0
    return m * 100 + d
  }
  const diff = rank(a) - rank(b)
  if (diff !== 0) return diff
  return a.id.localeCompare(b.id)
}

export function sortTimelineEvents<T extends TimelineDateFields & { year: number; id: string }>(
  events: T[],
): T[] {
  return [...events].sort(compareTimelineByDate)
}

export function monthsPresentInYear<T extends TimelineDateFields & { year: number }>(
  events: T[],
  year: number,
): number[] {
  const set = new Set<number>()
  for (const e of events) {
    if (e.year !== year || !hasSubYearPrecision(e) || e.month == null) continue
    set.add(e.month)
  }
  return [...set].sort((a, b) => a - b)
}

export function yearHasMonthDensity<T extends TimelineDateFields & { year: number }>(
  events: T[],
  year: number,
): boolean {
  return monthsPresentInYear(events, year).length > 0
}

export function filterEventsForYearView<
  T extends TimelineDateFields & { year: number; id: string },
>(args: {
  events: T[]
  year: number
  monthFilter: number | null
}): { dated: T[]; yearOnly: T[] } {
  const inYear = args.events.filter((e) => e.year === args.year)
  const yearOnly = inYear.filter((e) => !hasSubYearPrecision(e))
  let dated = inYear.filter((e) => hasSubYearPrecision(e))
  dated = sortTimelineEvents(dated)
  if (args.monthFilter != null) {
    dated = dated.filter((e) => e.month === args.monthFilter)
  }
  return {
    dated,
    yearOnly: args.monthFilter == null ? sortTimelineEvents(yearOnly) : [],
  }
}
