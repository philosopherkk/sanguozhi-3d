import {
  formatTimelineDate,
  monthsPresentInYear,
  yearHasMonthDensity,
} from '../lib/timelineDate'
import type { TimelineDateFields } from '../types/timelineDate'

export function TimelineMonthBar<T extends TimelineDateFields & { year: number }>({
  year,
  events,
  monthFilter,
  onMonthFilter,
  compact = false,
}: {
  year: number
  events: T[]
  monthFilter: number | null
  onMonthFilter: (month: number | null) => void
  compact?: boolean
}) {
  if (!yearHasMonthDensity(events, year)) return null
  const months = monthsPresentInYear(events, year)

  return (
    <div
      className={compact ? 'timeline-month-bar timeline-month-bar--compact' : 'timeline-month-bar'}
      role="group"
      aria-label={`${year} 年內月份`}
    >
      {!compact ? <span className="timeline-month-bar__label">本年逐月</span> : null}
      <button
        type="button"
        className={monthFilter == null ? 'timeline-month-chip is-active' : 'timeline-month-chip'}
        aria-pressed={monthFilter == null}
        onClick={() => onMonthFilter(null)}
      >
        全年
      </button>
      {months.map((m) => (
        <button
          key={m}
          type="button"
          className={monthFilter === m ? 'timeline-month-chip is-active' : 'timeline-month-chip'}
          aria-pressed={monthFilter === m}
          onClick={() => onMonthFilter(m)}
        >
          {m}月
        </button>
      ))}
      {compact ? (
        <input
          type="range"
          className="year-scrubber__range timeline-month-bar__range"
          min={1}
          max={12}
          step={1}
          value={monthFilter ?? months[0] ?? 1}
          aria-label="選擇月份"
          aria-valuetext={
            monthFilter != null
              ? formatTimelineDate({ year, month: monthFilter, datePrecision: 'month' })
              : `${year} 年全年`
          }
          onChange={(e) => onMonthFilter(Number(e.target.value))}
        />
      ) : null}
    </div>
  )
}
