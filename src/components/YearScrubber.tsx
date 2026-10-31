import { TERRITORY_KEY_YEARS, TERRITORY_NOTE } from '../data/territoryControl'
import timelineData from '../data/timeline.json'
import { TimelineMonthBar } from './TimelineMonthBar'
import { usePersistedOpen } from '../lib/usePersistedOpen'
import { yearHasMonthDensity } from '../lib/timelineDate'
import { useYear } from '../state/YearContext'
import type { TimelineEvent } from '../types/data'

const timelineEvents = timelineData as TimelineEvent[]

const SNAP_LABELS: Partial<Record<number, string>> = {
  184: '黃巾',
  190: '討董',
  200: '官渡',
  208: '赤壁',
  215: '合肥',
  219: '漢中',
  222: '夷陵',
  234: '五丈原',
  249: '高平陵',
  263: '滅蜀',
  265: '西晉',
  280: '滅吳',
}

function TerritoryNote() {
  const [open, setOpen] = usePersistedOpen('territory-note', false)
  const preview =
    TERRITORY_NOTE.length > 48
      ? `${TERRITORY_NOTE.slice(0, 48)}…`
      : TERRITORY_NOTE

  return (
    <div className="year-scrubber__note-block">
      <p
        className={
          open
            ? 'year-scrubber__note'
            : 'year-scrubber__note year-scrubber__note--preview'
        }
        id="territory-note-body"
      >
        {open ? TERRITORY_NOTE : preview}
      </p>
      <button
        type="button"
        className="year-scrubber__note-toggle"
        aria-expanded={open}
        aria-controls="territory-note-body"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? '收起' : '疆域說明'}
      </button>
    </div>
  )
}

export function YearScrubber() {
  const { year, setYear, yearMin, yearMax, territoryYear, monthFilter, setMonthFilter } =
    useYear()
  const snapLabel = SNAP_LABELS[territoryYear]
  const monthDense = yearHasMonthDensity(timelineEvents, year)

  return (
    <div className="year-scrubber" role="group" aria-label="年代滑桿">
      <div className="year-scrubber__meta">
        <span>
          年表 · 疆域採 {territoryYear}
          {snapLabel ? `（${snapLabel}）` : ''}
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
        aria-label="選擇公元年"
      />

      <div className="year-scrubber__ticks">
        {TERRITORY_KEY_YEARS.map((y) => (
          <button
            key={y}
            type="button"
            className={
              y === territoryYear
                ? 'year-scrubber__tick is-active'
                : 'year-scrubber__tick'
            }
            style={{
              left: `${((y - yearMin) / (yearMax - yearMin)) * 100}%`,
            }}
            onClick={() => setYear(y)}
            title={`${y}${SNAP_LABELS[y] ? ` ${SNAP_LABELS[y]}` : ''}`}
          >
            <span className="year-scrubber__tick-year">{y}</span>
            {SNAP_LABELS[y] ? (
              <span className="year-scrubber__tick-label">{SNAP_LABELS[y]}</span>
            ) : null}
          </button>
        ))}
      </div>

      {monthDense ? (
        <TimelineMonthBar
          year={year}
          events={timelineEvents}
          monthFilter={monthFilter}
          onMonthFilter={setMonthFilter}
          compact
        />
      ) : null}

      <TerritoryNote />
    </div>
  )
}
