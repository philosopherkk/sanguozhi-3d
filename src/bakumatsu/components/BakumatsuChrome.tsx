import type { ReactNode } from 'react'
import { EraBar } from '../../components/EraBar'
import { ReadingControls } from '../../components/ReadingControls'
import { TopicSwitcher } from '../../components/TopicSwitcher'
import { BAKUMATSU_KEY_YEARS } from '../data/territory'
import { useBakumatsuYear } from '../state/BakumatsuYearContext'

function nengo(year: number): string | null {
  if (year === 1853) return '嘉永六年'
  if (year === 1866) return '慶應二年'
  if (year === 1867) return '慶應三年'
  if (year === 1868) return '明治元年'
  if (year === 1869) return '明治二年'
  if (year >= 1854 && year <= 1859) return '安政'
  if (year === 1860) return '萬延'
  if (year >= 1861 && year <= 1863) return '文久'
  if (year === 1864) return '元治'
  if (year === 1865) return '慶應'
  return null
}

const TICK: Record<number, string> = {
  1853: '黑船',
  1866: '長州',
  1867: '奉還',
  1868: '戊辰',
  1869: '箱館',
}

export function BakumatsuHeader() {
  const { year, month, playing, togglePlay, step, yearMin, yearMax } =
    useBakumatsuYear()
  const era = nengo(year)
  const atStart = year <= yearMin && (month == null || month <= 1)
  const atEnd = year >= yearMax && (month == null || month >= 12)
  return (
    <header className="app-header">
      <div className="app-header__brand">
        <h1 className="app-header__title">幕末</h1>
        <p className="app-header__tag">江戶末年 · 1853–1868</p>
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

export function BakumatsuYearScrubber() {
  const { year, month, setYear, setMonth, yearMin, yearMax, territoryYear } =
    useBakumatsuYear()
  return (
    <div className="year-scrubber year-scrubber--compact" role="group" aria-label="幕末年份">
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
        {BAKUMATSU_KEY_YEARS.filter((y) => y >= yearMin && y <= yearMax).map((y) => (
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

export function BakumatsuFrame({ children }: { children: ReactNode }) {
  return (
    <>
      <BakumatsuHeader />
      <EraBar />
      <BakumatsuYearScrubber />
      {children}
    </>
  )
}
