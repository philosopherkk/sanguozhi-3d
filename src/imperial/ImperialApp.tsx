import { AppSideRail } from '../components/AppSideRail'
import { CollapsibleAppFooter } from '../components/CollapsibleAppFooter'
import { EraBar } from '../components/EraBar'
import { ReadingControls } from '../components/ReadingControls'
import { TopicSwitcher } from '../components/TopicSwitcher'
import { ImperialMapStage } from './components/ImperialMapStage'
import { ImperialPeople } from './components/ImperialPeople'
import { ImperialTimeline } from './components/ImperialTimeline'
import { ImperialSelectionProvider } from './state/ImperialSelectionContext'
import { ImperialYearProvider, useImperialYear } from './state/ImperialYearContext'
import type { ImperialPack } from './types'

function ImperialScrubber() {
  const { pack, year, setYear, yearMin, yearMax } = useImperialYear()
  const span = yearMax - yearMin || 1
  const ticks = (() => {
    const items = pack.ticks.map((t) => ({
      ...t,
      pct: ((t.year - yearMin) / span) * 100,
    }))
    let labelRight = -Infinity
    let yearRight = -Infinity
    let dotRight = -Infinity
    const shown = items.map((t) => {
      const half = Math.max(3, t.label.length * 1.15 + 2) / 2 + 0.8
      const okLabel = t.pct - half >= labelRight
      if (okLabel) labelRight = t.pct + half
      const okYear = t.pct - 4 >= yearRight
      if (okYear) yearRight = t.pct + 4
      const okDot = t.pct - 1.8 >= Math.max(dotRight, labelRight, yearRight)
      dotRight = Math.max(dotRight, t.pct + 1.8)
      return { okLabel, okYear, okDot }
    })
    const ai = items.findIndex((t) => t.year === year)
    if (ai >= 0) {
      if (!shown[ai].okLabel) {
        shown[ai].okLabel = true
        for (let j = ai - 1; j >= 0; j--)
          if (shown[j].okLabel) {
            shown[j].okLabel = false
            break
          }
      }
      if (!shown[ai].okYear) {
        shown[ai].okYear = true
        for (let j = ai - 1; j >= 0; j--)
          if (shown[j].okYear) {
            shown[j].okYear = false
            break
          }
      }
    }
    return items.map((t, i) => ({
      ...t,
      showLabel: shown[i].okLabel,
      showYear: shown[i].okYear,
      faint: !shown[i].okDot && !shown[i].okYear,
    }))
  })()
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
      <div className="year-scrubber__ticks">
        {ticks.map((t) => (
          <button
            key={t.year}
            type="button"
            className={
              year === t.year
                ? 'year-scrubber__tick is-active'
                : 'year-scrubber__tick'
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
              {t.showYear ? t.year : '·'}
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
  const { pack, year, step, playing, togglePlay, yearMin, yearMax } =
    useImperialYear()
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
          aria-label="上一年"
          onClick={() => step(-1)}
          disabled={year <= yearMin}
        >
          −
        </button>
        <ReadingControls />
        <div className="app-header__year" aria-live="polite">
          <span className="app-header__num">{year}</span>
          <span className="app-header__era">年</span>
        </div>
        <button
          type="button"
          className="app-header__step"
          aria-label="下一年"
          onClick={() => step(1)}
          disabled={year >= yearMax}
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
