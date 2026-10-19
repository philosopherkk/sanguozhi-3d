import { useYear } from '../state/YearContext'

export function AppHeader() {
  const { year, playing, togglePlay, setYear, yearMin, yearMax } = useYear()

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <h1 className="app-header__title">三國志</h1>
        <p className="app-header__tag">正史疆域 · 勢力與人物</p>
      </div>

      <div className="app-header__year-block">
        <button
          type="button"
          className="app-header__step"
          aria-label="上一年"
          onClick={() => setYear(year - 1)}
          disabled={year <= yearMin}
        >
          −
        </button>
        <div className="app-header__year" aria-live="polite">
          <span className="app-header__num">{year}</span>
          <span className="app-header__era">年</span>
        </div>
        <button
          type="button"
          className="app-header__step"
          aria-label="下一年"
          onClick={() => setYear(year + 1)}
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
