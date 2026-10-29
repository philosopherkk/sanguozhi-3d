import { CHINA_KEY_YEARS } from '../data/eras'
import { formatChinaYear } from '../lib/formatYear'
import { useChinaYear } from '../state/ChinaYearContext'

const SNAP_LABELS: Partial<Record<number, string>> = {
  [-770]: '春秋',
  [-475]: '戰國',
  [-221]: '秦',
  [-202]: '漢',
  [220]: '三國',
  [280]: '晉',
  [589]: '隋',
  [618]: '唐',
  [960]: '宋',
  [1279]: '元',
  [1368]: '明',
  [1644]: '清',
  [1912]: '民國',
  [1949]: '1949',
}

export function ChinaYearScrubber() {
  const { year, setYear, yearMin, yearMax, keyYear } = useChinaYear()
  const ticks = CHINA_KEY_YEARS.filter((y) => y >= yearMin && y <= yearMax)

  return (
    <div className="year-scrubber" role="group" aria-label="通史年代滑桿">
      <div className="year-scrubber__meta">
        <span>
          綱要年表 · 近關鍵年 {formatChinaYear(keyYear)}
          {SNAP_LABELS[keyYear] ? `（${SNAP_LABELS[keyYear]}）` : ''}
        </span>
        <span className="year-scrubber__hint">
          疆域細圖未全覆蓋——三國／近代將分期補完
        </span>
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
        aria-label="選擇公元年（負數為公元前）"
      />

      <div className="year-scrubber__ticks year-scrubber__ticks--dense">
        {ticks.map((y) => (
          <button
            key={y}
            type="button"
            className={
              y === keyYear ? 'year-scrubber__tick is-active' : 'year-scrubber__tick'
            }
            style={{
              left: `${((y - yearMin) / (yearMax - yearMin)) * 100}%`,
            }}
            onClick={() => setYear(y)}
            title={`${formatChinaYear(y)}${SNAP_LABELS[y] ? ` ${SNAP_LABELS[y]}` : ''}`}
          >
            <span className="year-scrubber__tick-year">{formatChinaYear(y)}</span>
            {SNAP_LABELS[y] ? (
              <span className="year-scrubber__tick-label">{SNAP_LABELS[y]}</span>
            ) : null}
          </button>
        ))}
      </div>

      <p className="year-scrubber__note">
        據《史記》《漢書》《後漢書》《三國志》《資治通鑑》及正史紀傳綱要；地圖分期擴充中。
        三國細節請切換「三國志」專題。
      </p>
    </div>
  )
}
