import { EraBar } from '../components/EraBar'
import { ChinaEraMap } from './components/ChinaEraMap'
import { ChinaHeader } from './components/ChinaHeader'
import { ChinaPeople } from './components/ChinaPeople'
import { ChinaTimeline } from './components/ChinaTimeline'
import { ChinaYearScrubber } from './components/ChinaYearScrubber'
import { ChinaYearProvider } from './state/ChinaYearContext'

/** 春秋至漢，或晉至當代。三國深潛另見 SanguozhiApp。 */
export function ChinaHistoryApp({
  initialYear,
  yearMin,
  yearMax,
}: {
  initialYear: number
  yearMin: number
  yearMax: number
}) {
  return (
    <ChinaYearProvider
      initialYear={initialYear}
      yearMin={yearMin}
      yearMax={yearMax}
    >
      <div className="app-shell app-shell--china">
        <ChinaHeader />
        <EraBar />
        <ChinaYearScrubber />

        <div className="app-shell__main">
          <ChinaEraMap />

          <div className="app-shell__side">
            <section className="events-cell" aria-label="通史大事">
              <ChinaTimeline />
            </section>
            <aside className="people-cell" aria-label="通史人物">
              <ChinaPeople />
            </aside>
          </div>
        </div>

        <footer className="app-footer">
          <p>
            中國時間線（春秋–當代）· 本頁係其中一個時代嘅綱要 ·
            三國地圖、原文同語譯喺「三國」時代
          </p>
        </footer>
      </div>
    </ChinaYearProvider>
  )
}
