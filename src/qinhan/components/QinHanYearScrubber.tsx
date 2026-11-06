import { layoutTicks } from '../../lib/tickCollisions'
import { formatQinHanYear } from '../lib/formatYear'
import { useQinHanYear } from '../state/QinHanYearContext'

const TICKS: { year: number; label: string }[] = [
  { year: -221, label: '郡縣' },
  { year: -209, label: '陳勝' },
  { year: -202, label: '垓下' },
  { year: -119, label: '漠北' },
  { year: 23, label: '昆陽' },
  { year: 183, label: '黃巾前' },
]

export function QinHanYearScrubber() {
  const { year, setYear, yearMin, yearMax, territoryYear, snapshot } =
    useQinHanYear()

  return (
    <div className="year-scrubber" role="group" aria-label="秦漢年份">
      <div className="year-scrubber__meta">
        <span>
          年表 · 疆域採 {formatQinHanYear(territoryYear)}（{snapshot.label}）
        </span>
        <span className="year-scrubber__hint">拖曳或點刻度跳年</span>
      </div>

      <input
        type="range"
        className="year-scrubber__range"
        min={yearMin}
        max={yearMax}
        step={1}
        value={year}
        onChange={(e) => setYear(Number(e.target.value))}
        aria-valuemin={yearMin}
        aria-valuemax={yearMax}
        aria-valuenow={year}
        aria-label="選擇年份"
      />

      <div className="year-scrubber__ticks">
        {layoutTicks(TICKS, yearMin, yearMax, year).map((t) => (
          <button
            key={t.year}
            type="button"
            className={
              (t.year === year
                ? 'year-scrubber__tick is-active'
                : 'year-scrubber__tick') +
              (t.pct <= 4
                ? ' year-scrubber__tick--start'
                : t.pct >= 96
                  ? ' year-scrubber__tick--end'
                  : '')
            }
            style={{ left: `${t.pct}%` }}
            onClick={() => setYear(t.year)}
            title={`${formatQinHanYear(t.year)} ${t.label ?? ''}`}
          >
            <span
              className={
                t.showYear
                  ? 'year-scrubber__tick-year'
                  : 'year-scrubber__tick-dot'
              }
              style={t.faint ? { opacity: 0.25 } : undefined}
            >
              {t.showYear ? formatQinHanYear(t.year) : '·'}
            </span>
            {t.showLabel && t.label ? (
              <span className="year-scrubber__tick-label">{t.label}</span>
            ) : null}
          </button>
        ))}
      </div>

      <p className="year-scrubber__note">{snapshot.note}</p>
    </div>
  )
}
