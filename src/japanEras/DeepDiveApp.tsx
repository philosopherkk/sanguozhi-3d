import type { ReactNode } from 'react'
import { EraBar } from '../components/EraBar'
import { ReadingControls } from '../components/ReadingControls'
import { TopicSwitcher } from '../components/TopicSwitcher'
import type { JapanDeepDivePack } from './deepDiveTypes'
import { DeepDiveMapStage } from './DeepDiveMapStage'
import { DeepDiveSelectionProvider, useDeepDiveSelection } from './DeepDiveSelectionContext'
import { DeepDiveYearProvider, useDeepDiveYear } from './DeepDiveYearContext'
import { EraPeople } from './EraPeople'
import { EraTimeline } from './EraTimeline'

function DeepDiveHeader({ pack }: { pack: JapanDeepDivePack }) {
  const { year, setYear, step, playing, togglePlay, yearMin, yearMax } =
    useDeepDiveYear()
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
          className={playing ? 'app-header__play is-active' : 'app-header__play'}
          onClick={togglePlay}
        >
          {playing ? '暫停' : '播放'}
        </button>
      </div>
      <div className="year-scrubber year-scrubber--inline" aria-label="年份">
        <input
          type="range"
          min={yearMin}
          max={yearMax}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        />
        <ol className="year-scrubber__ticks">
          {pack.ticks.map((t) => (
            <li key={t.year}>
              <button type="button" onClick={() => setYear(t.year)}>
                {t.label}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </header>
  )
}

function DeepDiveBody({ pack }: { pack: JapanDeepDivePack }) {
  const { year, setYear } = useDeepDiveYear()
  const { selectedFaction, selectFaction } = useDeepDiveSelection()
  const colorFor = (id: string) =>
    pack.factions.find((f) => f.id === id)?.color ?? '#78716C'
  const nameFor = (id: string) =>
    pack.factions.find((f) => f.id === id)?.name ?? id

  return (
    <div className="app-shell app-shell--japan">
      <DeepDiveHeader pack={pack} />
      <EraBar />
      <div className="app-shell__main">
        <DeepDiveMapStage pack={pack} />
        <div className="app-shell__side">
          <section className="events-cell" aria-label={`${pack.title}大事`}>
            <EraTimeline
              headingId={`${pack.id}-timeline-heading`}
              year={year}
              setYear={setYear}
              events={pack.events}
              colorFor={colorFor}
              detailFor={(id) => {
                const custom = pack.detailFor(id)
                if (custom) return custom
                const event = pack.events.find((item) => item.id === id)
                if (!event) return undefined
                return {
                  causes: event.desc,
                  course: event.desc,
                  keyFigures: event.factions.map((name) => ({
                    name,
                    role: '相關勢力',
                  })),
                  outcome: event.note ?? event.source,
                  brief: event.desc,
                  zhwikiUrl: 'https://zh.wikipedia.org/wiki/日本歷史',
                }
              }}
              readingFor={(id) => {
                const custom = pack.readingFor(id)
                if (custom) return custom
                const event = pack.events.find((item) => item.id === id)
                if (!event) return undefined
                return {
                  quote: event.desc,
                  source: event.source,
                  layers: {
                    elementary: event.desc,
                    secondary: event.note ?? event.desc,
                    university: `${event.source}。${event.note ?? '色塊與行軍是示意，數字無總冊就不寫成精確人口或兵籍。'}`,
                  },
                }
              }}
              emptyHint={pack.emptyHint}
            />
          </section>
          <aside className="people-cell" aria-label={`${pack.title}人物`}>
            <EraPeople
              headingId={`${pack.id}-people-heading`}
              year={year}
              people={pack.people}
              selectedFaction={selectedFaction}
              onClearFaction={() => selectFaction(null)}
              factionName={nameFor}
              colorFor={colorFor}
            />
          </aside>
        </div>
      </div>
      <footer className="app-footer">
        <p>{pack.footer}</p>
      </footer>
    </div>
  )
}

export function DeepDiveApp({ pack }: { pack: JapanDeepDivePack }) {
  return (
    <DeepDiveYearProvider pack={pack}>
      <DeepDiveSelectionProvider>
        <DeepDiveBody pack={pack} />
      </DeepDiveSelectionProvider>
    </DeepDiveYearProvider>
  )
}

/** 供各時代入口檔一行包裝。 */
export function makeDeepDiveApp(pack: JapanDeepDivePack): () => ReactNode {
  return function PackedApp() {
    return <DeepDiveApp pack={pack} />
  }
}
