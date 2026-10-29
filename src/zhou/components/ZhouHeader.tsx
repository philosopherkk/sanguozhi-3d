import { ReadingControls } from '../../components/ReadingControls'
import { TopicSwitcher } from '../../components/TopicSwitcher'
import { formatZhouMonth } from '../data/lateStages'
import { formatZhouYear, zhouEraLabel } from '../lib/formatYear'
import { useZhouYear } from '../state/ZhouYearContext'

export function ZhouHeader() {
  const { year, month, lateStage, playing, togglePlay, step, yearMin, yearMax, title } =
    useZhouYear()
  const inLate = lateStage != null

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <h1 className="app-header__title">{title}</h1>
        <p className="app-header__tag">正史疆域 · 勢力與人物</p>
      </div>

      <TopicSwitcher />

      <div className="app-header__year-block">
        <button
          type="button"
          className="app-header__step"
          aria-label={inLate ? '上一段' : '上一年'}
          onClick={() => step(-1)}
          disabled={year <= yearMin && month == null}
        >
          −
        </button>
        <ReadingControls />
        <div className="app-header__year" aria-live="polite">
          <span className="app-header__num">{formatZhouYear(year)}</span>
          <span className="app-header__era">年</span>
          {month != null ? (
            <span className="app-header__era">{formatZhouMonth(month)}</span>
          ) : null}
          <span className="app-header__nengo">
            {lateStage?.label ?? zhouEraLabel(year)}
          </span>
        </div>
        <button
          type="button"
          className="app-header__step"
          aria-label={inLate ? '下一段' : '下一年'}
          onClick={() => step(1)}
          disabled={year >= yearMax && (lateStage == null || lateStage.id === 'qin-qi')}
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
