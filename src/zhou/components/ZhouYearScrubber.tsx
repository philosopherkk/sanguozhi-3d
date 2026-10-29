import {
  formatZhouMonth,
  LATE_FROM,
  LATE_STAGES,
  lateStageIndex,
} from '../data/lateStages'
import { formatZhouYear } from '../lib/formatYear'
import { useZhouYear } from '../state/ZhouYearContext'

const TICKS: { year: number; label: string }[] = [
  { year: -770, label: '東遷' },
  { year: -632, label: '城濮' },
  { year: -453, label: '分晉' },
  { year: -341, label: '馬陵' },
  { year: -260, label: '長平' },
  { year: -221, label: '統一' },
]

export function ZhouYearScrubber() {
  const {
    year,
    month,
    setYear,
    setLateStage,
    yearMin,
    yearMax,
    territoryYear,
    snapshot,
    lateStage,
  } = useZhouYear()
  const stageIndex =
    year >= LATE_FROM ? lateStageIndex(year, month) : 0
  const stage = LATE_STAGES[stageIndex]
  const onStage =
    lateStage != null && lateStage.year === year && lateStage.month === month

  return (
    <div className="year-scrubber" role="group" aria-label="春秋戰國年份">
      <div className="year-scrubber__meta">
        <span>
          年表 · 疆域採 {formatZhouYear(territoryYear)}（{snapshot.label}）
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
        {TICKS.map((tick) => (
          <button
            key={tick.year}
            type="button"
            className={
              tick.year === year
                ? 'year-scrubber__tick is-active'
                : 'year-scrubber__tick'
            }
            style={{
              left: `${((tick.year - yearMin) / (yearMax - yearMin)) * 100}%`,
            }}
            onClick={() => setYear(tick.year)}
            title={`${formatZhouYear(tick.year)} ${tick.label}`}
          >
            <span className="year-scrubber__tick-year">
              {formatZhouYear(tick.year)}
            </span>
            <span className="year-scrubber__tick-label">{tick.label}</span>
          </button>
        ))}
      </div>

      <p className="year-scrubber__note">{snapshot.note}</p>

      {year >= LATE_FROM ? (
        <div className="late-stage-bar" aria-label="戰國尾逐段">
          <div className="late-stage-bar__meta">
            <span>
              戰國尾逐段 · {formatZhouYear(stage.year)}
              {formatZhouMonth(stage.month)} · {stage.label}
              {stage.monthDisputed ? '（月份未載於史）' : '（九月見《白起列傳》）'}
            </span>
          </div>
          <input
            type="range"
            className="year-scrubber__range"
            min={0}
            max={LATE_STAGES.length - 1}
            step={1}
            value={stageIndex}
            onChange={(event) => setLateStage(Number(event.target.value))}
            aria-label="戰國尾月份階段"
          />
          <div className="late-stage-bar__row">
            {LATE_STAGES.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={index === stageIndex ? 'is-active' : undefined}
                onClick={() => setLateStage(index)}
              >
                {formatZhouMonth(item.month)}
                <small>{item.label}</small>
              </button>
            ))}
          </div>
          <p className="year-scrubber__note">
            {onStage
              ? stage.note
              : `色塊沿用${formatZhouYear(stage.year)}${formatZhouMonth(stage.month)}。這一年沒有另開行軍，點上方月份才顯示該段路線。`}
            {' '}
            出處：{stage.source}
          </p>
        </div>
      ) : (
        <p className="late-stage-bar__jump">
          <button type="button" onClick={() => setYear(LATE_FROM)}>
            打開戰國尾逐段（前284起）
          </button>
        </p>
      )}
    </div>
  )
}
