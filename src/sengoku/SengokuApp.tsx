import { EraBar } from '../components/EraBar'
import { SengokuHeader } from './components/SengokuHeader'
import { SengokuMapStage } from './components/SengokuMapStage'
import { SengokuPeople } from './components/SengokuPeople'
import { SengokuTimeline } from './components/SengokuTimeline'
import { SengokuYearScrubber } from './components/SengokuYearScrubber'
import { SengokuSelectionProvider } from './state/SengokuSelectionContext'
import { SengokuYearProvider } from './state/SengokuYearContext'

/** Fully isolated Japanese Sengoku topic — no shared data with 三國志. */
export function SengokuApp() {
  return (
    <SengokuYearProvider>
      <SengokuSelectionProvider>
        <div className="app-shell app-shell--sengoku">
          <SengokuHeader />
          <EraBar />
          <SengokuYearScrubber />

          <div className="app-shell__main">
            <SengokuMapStage />

            <div className="app-shell__side">
              <section className="events-cell" aria-label="戰國大事">
                <SengokuTimeline />
              </section>
              <aside className="people-cell" aria-label="戰國人物">
                <SengokuPeople />
              </aside>
            </div>
          </div>

          <footer className="app-footer">
            <p>
              日本戰國（1467–1573）· 1573年放逐足利義昭起見「安土桃山」· 據日本史通說 ·
              不用演義／遊戲劇情 · 底圖見地圖出處 · 與三國志／通史專題資料分離
            </p>
          </footer>
        </div>
      </SengokuSelectionProvider>
    </SengokuYearProvider>
  )
}
