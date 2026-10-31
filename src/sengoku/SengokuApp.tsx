import { AppSideRail } from '../components/AppSideRail'
import { CollapsibleAppFooter } from '../components/CollapsibleAppFooter'
import { EraBar } from '../components/EraBar'
import { SengokuHeader } from './components/SengokuHeader'
import { SengokuMapStage } from './components/SengokuMapStage'
import { SengokuPeople } from './components/SengokuPeople'
import { SengokuTimeline } from './components/SengokuTimeline'
import { SengokuYearScrubber } from './components/SengokuYearScrubber'
import { SengokuSelectionProvider } from './state/SengokuSelectionContext'
import { SengokuYearProvider, useSengokuYear } from './state/SengokuYearContext'

function SengokuMain() {
  const { year } = useSengokuYear()
  return (
    <div className="app-shell__main app-shell__main--map-side">
      <SengokuMapStage />
      <AppSideRail
        storageKey="sengoku-side-rail"
        year={year}
        events={<SengokuTimeline />}
        people={<SengokuPeople />}
      />
    </div>
  )
}

/** Fully isolated Japanese Sengoku topic — no shared data with 三國志. */
export function SengokuApp() {
  return (
    <SengokuYearProvider>
      <SengokuSelectionProvider>
        <div className="app-shell app-shell--sengoku">
          <SengokuHeader />
          <EraBar />
          <SengokuYearScrubber />

          <SengokuMain />

          <CollapsibleAppFooter>
            <p>
              日本戰國（1467–1573）· 1573年放逐足利義昭起見「安土桃山」· 據日本史通說 ·
              不用演義／遊戲劇情 · 底圖見地圖出處 · 與三國志／通史專題資料分離
            </p>
          </CollapsibleAppFooter>
        </div>
      </SengokuSelectionProvider>
    </SengokuYearProvider>
  )
}
