import { AppHeader } from './components/AppHeader'
import { AppSideRail } from './components/AppSideRail'
import { CollapsibleAppFooter } from './components/CollapsibleAppFooter'
import { EraBar } from './components/EraBar'
import { MapStage } from './components/MapStage'
import { PeoplePanel } from './components/PeoplePanel'
import { TimelinePanel } from './components/TimelinePanel'
import { UnregisteredHouseholdsPanel } from './components/UnregisteredHouseholdsPanel'
import { YearScrubber } from './components/YearScrubber'
import { SelectionProvider } from './state/SelectionContext'
import { YearProvider, useYear } from './state/YearContext'

function SanguozhiMain() {
  const { year } = useYear()
  return (
    <div className="app-shell__main app-shell__main--map-side">
      <MapStage />
      <AppSideRail
        storageKey="sanguozhi-side-rail"
        year={year}
        events={
          <>
            <UnregisteredHouseholdsPanel />
            <TimelinePanel compact />
          </>
        }
        people={<PeoplePanel compact />}
      />
    </div>
  )
}

/** Three Kingdoms deep-dive — data under src/data. */
export function SanguozhiApp() {
  return (
    <YearProvider>
      <SelectionProvider>
        <div className="app-shell app-shell--sanguozhi">
          <AppHeader />
          <EraBar />
          <YearScrubber />

          <SanguozhiMain />

          <CollapsibleAppFooter>
            <p>
              中國 · 三國志（184–280）· 據《三國志》裴注、《後漢書》、《資治通鑑》、《晉書》·
              不用《三國演義》· 280 年晉收郡縣，未入編戶者見該年面板 · 塞外部族與行軍為示意
            </p>
          </CollapsibleAppFooter>
        </div>
      </SelectionProvider>
    </YearProvider>
  )
}
