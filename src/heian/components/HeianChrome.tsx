import type { ReactNode } from 'react'
import { EraBar } from '../../components/EraBar'
import { ReadingControls } from '../../components/ReadingControls'
import { TopicSwitcher } from '../../components/TopicSwitcher'
import { HEIAN_KEY_YEARS } from '../data/territory'
import { useHeianYear } from '../state/HeianYearContext'

function nengo(year: number): string | null {
  if (year === 1156) return '保元元年'
  if (year === 1159) return '平治元年'
  if (year === 1180) return '治承四年'
  if (year === 1183) return '壽永二年'
  if (year === 1184) return '元曆元年'
  if (year === 1185) return '元曆二年'
  if (year >= 1150 && year <= 1153) return '仁平'
  if (year >= 1154 && year <= 1155) return '久壽'
  if (year >= 1157 && year <= 1158) return '保元'
  if (year >= 1160 && year <= 1160) return '永曆'
  if (year >= 1161 && year <= 1162) return '應保'
  if (year >= 1163 && year <= 1164) return '長寬'
  if (year === 1165) return '永萬'
  if (year >= 1166 && year <= 1168) return '仁安'
  if (year >= 1169 && year <= 1170) return '嘉應'
  if (year >= 1171 && year <= 1174) return '承安'
  if (year >= 1175 && year <= 1176) return '安元'
  if (year >= 1177 && year <= 1179) return '治承'
  if (year === 1181) return '養和'
  if (year === 1182) return '壽永'
  return null
}

const TICK: Record<number, string> = {
  1156: '保元',
  1159: '平治',
  1180: '石橋山',
  1183: '俱利伽羅',
  1184: '一之谷',
  1185: '壇之浦',
}

export function HeianHeader() {
  const { year, month, playing, togglePlay, step, yearMin, yearMax } = useHeianYear()
  const era = nengo(year)
  const atStart = year <= yearMin && (month == null || month <= 1)
  const atEnd = year >= yearMax && (month == null || month >= 12)
  return (
    <header className="app-header">
      <div className="app-header__brand">
        <h1 className="app-header__title">平安末期</h1>
        <p className="app-header__tag">1150–1185 · 平安時代為794–1185</p>
      </div>
      <TopicSwitcher />
      <div className="app-header__year-block">
        <button
          type="button"
          className="app-header__step"
          aria-label={month == null ? '上一年' : '上一月'}
          onClick={() => step(-1)}
          disabled={atStart}
        >
          −
        </button>
        <ReadingControls />
        <div className="app-header__year" aria-live="polite">
          <span className="app-header__num">{year}</span>
          <span className="app-header__era">年</span>
          {month != null ? <span className="app-header__era">{month}月</span> : null}
          {era ? <span className="app-header__nengo">{era}</span> : null}
        </div>
        <button
          type="button"
          className="app-header__step"
          aria-label={month == null ? '下一年' : '下一月'}
          onClick={() => step(1)}
          disabled={atEnd}
        >
          +
        </button>
        <button
          type="button"
          className="app-header__play"
          onClick={togglePlay}
          aria-pressed={playing}
        >
          {playing ? '暫停' : '播放'}
        </button>
      </div>
    </header>
  )
}

export function HeianYearScrubber() {
  const { year, month, setYear, setMonth, yearMin, yearMax, territoryYear } =
    useHeianYear()
  return (
    <div className="year-scrubber year-scrubber--compact" role="group" aria-label="平安年份">
      <input
        type="range"
        className="year-scrubber__range"
        min={yearMin}
        max={yearMax}
        step={1}
        value={year}
        onChange={(e) => setYear(Number(e.target.value))}
        aria-valuetext={month == null ? `${year} 年` : `${year} 年 ${month} 月`}
      />
      {month != null ? (
        <div className="year-scrubber__months">
          <span>逐月</span>
          <input
            type="range"
            min={1}
            max={12}
            step={1}
            value={month}
            aria-label="選擇月份"
            aria-valuetext={`${month} 月`}
            onChange={(e) => setMonth(Number(e.target.value))}
          />
          <span>{month}月</span>
        </div>
      ) : null}
      <div className="year-scrubber__ticks">
        {HEIAN_KEY_YEARS.map((y) => (
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
            {TICK[y] ? (
              <span className="year-scrubber__tick-label">{TICK[y]}</span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  )
}

export function HeianFrame({ children }: { children: ReactNode }) {
  return (
    <>
      <HeianHeader />
      <EraBar />
      <HeianYearScrubber />
      {children}
    </>
  )
}
