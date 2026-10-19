import { TERRITORY_KEY_YEARS, TERRITORY_NOTE } from '../data/territoryControl'
import { useYear } from '../state/YearContext'

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

export function YearScrubber() {
  const { year, setYear, yearMin, yearMax, territoryYear } = useYear()
  const snapLabel = SNAP_LABELS[territoryYear]

  return (
    <div className="year-scrubber" role="group" aria-label="年代滑桿">
      <div className="year-scrubber__meta">
        <span>
          疆域：{territoryYear}
          {snapLabel ? ` · ${snapLabel}` : ''}
        </span>
        <span className="year-scrubber__hint">點擊刻度可跳轉關鍵年</span>
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

      <p className="year-scrubber__note">{TERRITORY_NOTE}</p>
    </div>
  )
}
