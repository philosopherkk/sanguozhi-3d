import { AppSideRail } from '../components/AppSideRail'
import { CollapsibleAppFooter } from '../components/CollapsibleAppFooter'
import { EraBar } from '../components/EraBar'
import { ReadingControls } from '../components/ReadingControls'
import { TopicSwitcher } from '../components/TopicSwitcher'
import { layoutTicks } from '../lib/tickCollisions'
import { ImperialMapStage } from './components/ImperialMapStage'
import { ImperialPeople } from './components/ImperialPeople'
import { ImperialTimeline } from './components/ImperialTimeline'
import { ImperialSelectionProvider } from './state/ImperialSelectionContext'
import { ImperialYearProvider, useImperialYear } from './state/ImperialYearContext'
import type { ImperialPack } from './types'

function ImperialScrubber() {
  const { pack, year, month, setYear, setMonth, yearMin, yearMax } = useImperialYear()
  const ticks = layoutTicks(
    pack.ticks.map((t) => ({ year: t.year, label: t.label })),
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
        <span>年表 · {pack.title}</span>
        <span className="year-scrubber__hint">拖曳或點刻度跳年</span>
      </div>
      <input
        type="range"
        className="year-scrubber__range"
        min={yearMin}
        max={yearMax}
        value={year}
        onChange={(e) => setYear(Number(e.target.value))}
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
        {ticks.map((t) => (
          <button
            key={t.year}
            type="button"
            className={
              (year === t.year ? 'year-scrubber__tick is-active' : 'year-scrubber__tick') +
              (t.pct <= 4
                ? ' year-scrubber__tick--start'
                : t.pct >= 96
                  ? ' year-scrubber__tick--end'
                  : '')
            }
            style={{ left: `${t.pct}%` }}
            title={`${t.year} ${t.label}`}
            onClick={() => setYear(t.year)}
          >
            <span
              className={
                t.showYear
                  ? 'year-scrubber__tick-year'
                  : 'year-scrubber__tick-dot'
              }
              style={t.faint ? { opacity: 0.25 } : undefined}
            >
              {t.showYear ? t.year : t.showDot ? '·' : ''}
            </span>
            {t.showLabel ? (
              <span className="year-scrubber__tick-label">{t.label}</span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  )
}

function ImperialHeader() {
  const { pack, year, month, step, playing, togglePlay, yearMin, yearMax } =
    useImperialYear()
  const atStart = year <= yearMin && (month == null || month <= 1)
  const atEnd = year >= yearMax && (month == null || month >= 12)
  return (
    <header className="app-header">
      <div className="app-header__brand">
        <h1 className="app-header__title">{pack.title}</h1>
        <p className="app-header__tag">{pack.tag}</p>
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
          {month != null ? (
            <span className="app-header__era">{month}月</span>
          ) : null}
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
          className={
            playing ? 'app-header__play is-active' : 'app-header__play'
          }
          onClick={togglePlay}
        >
          {playing ? '暫停' : '播放'}
        </button>
      </div>
    </header>
  )
}

function ImperialMain() {
  const { year } = useImperialYear()
  return (
    <div className="app-shell__main app-shell__main--map-side">
      <ImperialMapStage />
      <AppSideRail
        storageKey="imperial-side-rail"
        year={year}
        events={<ImperialTimeline />}
        people={<ImperialPeople />}
      />
    </div>
  )
}

function ImperialBody() {
  const { pack } = useImperialYear()
  return (
    <div className="app-shell app-shell--imperial">
      <ImperialHeader />
      <EraBar />
      <ImperialScrubber />
      <ImperialMain />
      <CollapsibleAppFooter>
        <p>{pack.footer}</p>
      </CollapsibleAppFooter>
    </div>
  )
}

export function ImperialApp({ pack }: { pack: ImperialPack }) {
  return (
    <ImperialYearProvider pack={pack}>
      <ImperialSelectionProvider>
        <ImperialBody />
      </ImperialSelectionProvider>
    </ImperialYearProvider>
  )
}
