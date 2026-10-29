import { ReadingControls } from '../../components/ReadingControls'
import { TopicSwitcher } from '../../components/TopicSwitcher'
import { japanBandAt } from '../data/eras'
import { useJapanYear } from '../state/JapanYearContext'

export function JapanHeader({
  heading,
  tag,
}: {
  heading: string
  tag: string
}) {
  const { year, playing, togglePlay, setYear, yearMin, yearMax } = useJapanYear()
  const band = japanBandAt(year)

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <h1 className="app-header__title">{heading}</h1>
        <p className="app-header__tag">{tag}</p>
      </div>

      <TopicSwitcher />

      <div className="app-header__year-block">
        <button
          type="button"
          className="app-header__step"
          aria-label="上一年"
          onClick={() => setYear(year - (year < 600 ? 10 : 1))}
          disabled={year <= yearMin}
        >
          −
        </button>
        <ReadingControls />
        <div className="app-header__year" aria-live="polite">
          <span className="app-header__num">{year}</span>
          <span className="app-header__era">年</span>
          {band ? <span className="app-header__nengo">{band.label}</span> : null}
        </div>
        <button
          type="button"
          className="app-header__step"
          aria-label="下一年"
          onClick={() => setYear(year + (year < 600 ? 10 : 1))}
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
