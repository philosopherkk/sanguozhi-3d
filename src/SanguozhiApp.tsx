import { AppHeader } from './components/AppHeader'
import { EraBar } from './components/EraBar'
import { MapStage } from './components/MapStage'
import { PeoplePanel } from './components/PeoplePanel'
import { SanguozhiSideRail } from './components/SanguozhiSideRail'
import { TimelinePanel } from './components/TimelinePanel'
import { UnregisteredHouseholdsPanel } from './components/UnregisteredHouseholdsPanel'
import { YearScrubber } from './components/YearScrubber'
import { SelectionProvider } from './state/SelectionContext'
import { YearProvider } from './state/YearContext'

/** Three Kingdoms deep-dive — data under src/data. */
export function SanguozhiApp() {
  return (
    <YearProvider>
      <SelectionProvider>
        <div className="app-shell app-shell--sanguozhi">
          <AppHeader />
          <EraBar />
          <YearScrubber />

          <div className="app-shell__main app-shell__main--sanguozhi">
            <MapStage />

            <SanguozhiSideRail>
              <section className="events-cell" aria-label="歷史大事">
                <UnregisteredHouseholdsPanel />
                <TimelinePanel compact />
              </section>
              <aside className="people-cell" aria-label="人物介紹">
                <PeoplePanel compact />
              </aside>
            </SanguozhiSideRail>
          </div>

          <footer className="app-footer">
            <p>
              中國 · 三國志（184–280）· 據《三國志》裴注、《後漢書》、《資治通鑑》、《晉書》·
              不用《三國演義》· 280 年晉收郡縣，未入編戶者見該年面板 · 塞外部族與行軍為示意
            </p>
          </footer>
        </div>
      </SelectionProvider>
    </YearProvider>
  )
}
