import { EraPeople } from '../japanEras/EraPeople'
import { EraTimeline } from '../japanEras/EraTimeline'
import { HeianFrame } from './components/HeianChrome'
import { HeianMapStage } from './components/HeianMapStage'
import {
  HEIAN_EVENTS,
  HEIAN_PEOPLE,
  heianDetailFor,
  heianReadingFor,
} from './data/history'
import { HEIAN_TERRITORY_NOTE } from './data/territory'
import { HeianSelectionProvider, useHeianSelection } from './state/HeianSelectionContext'
import { HeianYearProvider, useHeianYear } from './state/HeianYearContext'
import { HEIAN_FACTIONS } from './types'

function colorFor(id: string) {
  return HEIAN_FACTIONS.find((f) => f.id === id)?.color ?? '#78716C'
}

function nameFor(id: string) {
  return HEIAN_FACTIONS.find((f) => f.id === id)?.name ?? id
}

function HeianBody() {
  const { year, setYear } = useHeianYear()
  const { selectedFaction, selectFaction } = useHeianSelection()
  return (
    <div className="app-shell app-shell--japan">
      <HeianFrame>
        <div className="app-shell__main">
          <HeianMapStage />
          <div className="app-shell__side">
            <section className="events-cell" aria-label="平安大事">
              <EraTimeline
                headingId="heian-timeline-heading"
                year={year}
                setYear={setYear}
                events={HEIAN_EVENTS}
                colorFor={colorFor}
                detailFor={heianDetailFor}
                readingFor={heianReadingFor}
                emptyHint="此年無登錄專條。試 1156（保元）、1180（石橋山）、1185（壇之浦）。"
              />
            </section>
            <aside className="people-cell" aria-label="平安人物">
              <EraPeople
                headingId="heian-people-heading"
                year={year}
                people={HEIAN_PEOPLE}
                selectedFaction={selectedFaction}
                onClearFaction={() => selectFaction(null)}
                factionName={nameFor}
                colorFor={colorFor}
              />
            </aside>
          </div>
        </div>
      </HeianFrame>
      <footer className="app-footer">
        <p>
          平安末期（1150–1185）· 平安時代是794–1185，本專題只收源平合戰 · 據《吾妻鏡》系及日本中世史通說 ·
          不用遊戲劇情、不把軍記對話當作實錄 · 行軍只顯示該年 ·
          左行軍右勢力 · 與戰國、幕末、三國志資料分離 · {HEIAN_TERRITORY_NOTE}
        </p>
      </footer>
    </div>
  )
}

export function HeianApp() {
  return (
    <HeianYearProvider>
      <HeianSelectionProvider>
        <HeianBody />
      </HeianSelectionProvider>
    </HeianYearProvider>
  )
}
