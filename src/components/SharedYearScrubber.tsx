import { layoutTicks } from '../lib/tickCollisions'

/**
 * 全闊年份滑桿（共用）：中國 Imperial、日本 DeepDive 都用呢個實作，
 * 確保每個時代嘅時間軸貼滿螢幕闊度、刻度用同一套防撞規則（Project B 一致性）。
 */
export function SharedYearScrubber({
  title,
  year,
  yearMin,
  yearMax,
  ticks,
  onYear,
}: {
  title: string
  year: number
  yearMin: number
  yearMax: number
  ticks: { year: number; label?: string }[]
  onYear: (year: number) => void
}) {
  const laid = layoutTicks(
    ticks.map((t) => ({ year: t.year, label: t.label })),
    yearMin,
    yearMax,
    year,
  )
  return (
    <div
      className="year-scrubber year-scrubber--compact"
      role="group"
      aria-label="年份滑桿"
    >
      <div className="year-scrubber__meta">
        <span>年表 · {title}</span>
        <span className="year-scrubber__hint">拖曳或點刻度跳年</span>
      </div>
      <input
        type="range"
        className="year-scrubber__range"
        min={yearMin}
        max={yearMax}
        value={year}
        onChange={(e) => onYear(Number(e.target.value))}
        aria-label="選擇公元年"
      />
      <div className="year-scrubber__ticks">
        {laid.map((t) => (
          <button
            key={t.year}
            type="button"
            className={
              (year === t.year
                ? 'year-scrubber__tick is-active'
                : 'year-scrubber__tick') +
              (t.pct <= 4
                ? ' year-scrubber__tick--start'
                : t.pct >= 96
                  ? ' year-scrubber__tick--end'
                  : '')
            }
            style={{ left: `${t.pct}%`, opacity: t.faint ? 0.25 : undefined }}
            title={t.label ? `${t.year} ${t.label}` : String(t.year)}
            onClick={() => onYear(t.year)}
          >
            <span
              className={
                t.showYear
                  ? 'year-scrubber__tick-year'
                  : 'year-scrubber__tick-dot'
              }
            >
              {t.showYear ? t.year : t.showDot ? '·' : ''}
            </span>
            {t.showLabel && t.label ? (
              <span className="year-scrubber__tick-label">{t.label}</span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  )
}
