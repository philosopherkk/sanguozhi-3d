import { ReadingControls } from '../../components/ReadingControls'
import { TopicSwitcher } from '../../components/TopicSwitcher'
import { CHINA_ERA_BANDS } from '../data/eras'
import { formatChinaYear } from '../lib/formatYear'
import { useChinaYear } from '../state/ChinaYearContext'

export function ChinaHeader() {
  const { year, playing, togglePlay, setYear, yearMin, yearMax } = useChinaYear()
  const band = CHINA_ERA_BANDS.find((b) => year >= b.from && year <= b.to)

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <h1 className="app-header__title">中國通史</h1>
        <p className="app-header__tag">春秋至一九四九 · 綱要年表</p>
      </div>

      <TopicSwitcher />

      <div className="app-header__year-block">
        <button
          type="button"
          className="app-header__step"
          aria-label="上一年"
          onClick={() => setYear(year - (year <= 0 ? 10 : 1))}
          disabled={year <= yearMin}
        >
          −
        </button>
        <ReadingControls />
        <div className="app-header__year" aria-live="polite">
          <span className="app-header__num">{formatChinaYear(year)}</span>
          <span className="app-header__era">年</span>
          {band ? <span className="app-header__nengo">{band.label}</span> : null}
        </div>
        <button
          type="button"
          className="app-header__step"
          aria-label="下一年"
          onClick={() => setYear(year + (year < 0 ? 10 : 1))}
          disabled={year >= yearMax}
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
