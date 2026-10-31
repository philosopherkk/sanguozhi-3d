import { useSengokuYear } from '../state/SengokuYearContext'
import { SENGOKU_KEY_YEARS } from '../data/territoryControl'
import timelineData from '../data/timeline.json'
import { TimelineMonthBar } from '../../components/TimelineMonthBar'
import { yearHasMonthDensity } from '../../lib/timelineDate'
import type { SengokuTimelineEvent } from '../types'

const timelineEvents = timelineData as SengokuTimelineEvent[]

const ERA: Record<number, string> = {
  1467: '應仁',
  1550: '天文',
  1560: '桶狹間',
  1573: '室町終',
}

const SCRUB_YEARS = SENGOKU_KEY_YEARS.filter((y) => y <= 1572)

export function SengokuYearScrubber() {
  const { year, setYear, yearMin, yearMax, territoryYear, monthFilter, setMonthFilter } =
    useSengokuYear()
  const monthDense = yearHasMonthDensity(timelineEvents, year)

  return (
    <div className="year-scrubber year-scrubber--compact" role="group" aria-label="戰國年份">
      <input
        type="range"
        className="year-scrubber__range"
        min={yearMin}
        max={yearMax}
        step={1}
        value={year}
        onChange={(e) => setYear(Number(e.target.value))}
        aria-valuetext={`${year} 年`}
      />
      {monthDense ? (
        <TimelineMonthBar
          year={year}
          events={timelineEvents}
          monthFilter={monthFilter}
          onMonthFilter={setMonthFilter}
          compact
        />
      ) : null}
      <div className="year-scrubber__ticks">
        {SCRUB_YEARS.map((y) => (
          <button
            key={y}
            type="button"
            className={
              territoryYear === y
                ? 'year-scrubber__tick is-active'
                : 'year-scrubber__tick'
            }
            style={{
              left: `${((y - yearMin) / (yearMax - yearMin)) * 100}%`,
            }}
            onClick={() => setYear(y)}
          >
            <span className="year-scrubber__tick-year">{y}</span>
            {ERA[y] ? (
              <span className="year-scrubber__tick-label">{ERA[y]}</span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  )
}
