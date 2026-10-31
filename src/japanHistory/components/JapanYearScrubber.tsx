import { JAPAN_KEY_YEARS } from '../data/eras'
import { useJapanYear } from '../state/JapanYearContext'

const SNAP_LABELS: Partial<Record<number, string>> = {
  538: '佛教',
  645: '大化',
  658: '北征',
  710: '奈良',
  794: '平安',
  801: '征夷',
  1185: '鎌倉',
  1314: '三山',
  1336: '室町',
  1372: '冊封',
  1429: '統一',
  1457: 'コシャマイン',
  1467: '戰國',
  1470: '第二尚氏',
  1573: '安土',
  1603: '江戶',
  1604: '松前',
  1609: '琉球',
  1615: '大坂',
  1669: 'シャクシャイン',
  1789: '国後',
  1799: '天領',
  1853: '黑船',
  1868: '明治',
  1869: '北海道',
  1872: '琉球藩',
  1879: '沖繩縣',
  1945: '終戰',
  1972: '沖繩歸還',
}

export function JapanYearScrubber() {
  const { year, setYear, yearMin, yearMax, keyYear } = useJapanYear()
  const ticks = JAPAN_KEY_YEARS.filter((y) => y >= yearMin && y <= yearMax)

  return (
    <div className="year-scrubber" role="group" aria-label="日本通史年代滑桿">
      <div className="year-scrubber__meta">
        <span>
          綱要年表 · 近關鍵年 {keyYear}
          {SNAP_LABELS[keyYear] ? `（${SNAP_LABELS[keyYear]}）` : ''}
        </span>
        <span className="year-scrubber__hint">
          戰國細節請切換「日本戰國」專題
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
        aria-label="選擇公元年"
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
            title={`${y}${SNAP_LABELS[y] ? ` ${SNAP_LABELS[y]}` : ''}`}
          >
            <span className="year-scrubber__tick-year">{y}</span>
            {SNAP_LABELS[y] ? (
              <span className="year-scrubber__tick-label">{SNAP_LABELS[y]}</span>
            ) : null}
          </button>
        ))}
      </div>

      <p className="year-scrubber__note">
        據《日本書紀》《續日本紀》《吾妻鏡》及近現代史通說綱要；神話紀年不採。
        戰國細節請用「日本戰國」專題。
      </p>
    </div>
  )
}
