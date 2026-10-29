import { EraBar } from '../components/EraBar'
import { ZhouHeader } from './components/ZhouHeader'
import { ZhouMapStage } from './components/ZhouMapStage'
import { ZhouPeople } from './components/ZhouPeople'
import { ZhouTimeline } from './components/ZhouTimeline'
import { ZhouYearScrubber } from './components/ZhouYearScrubber'
import { ZhouSelectionProvider } from './state/ZhouSelectionContext'
import { ZhouYearProvider } from './state/ZhouYearContext'

/** 夏、商、西周、春秋、戰國共用這套州格。時段由年份上下限切開。 */
export function ZhouApp({
  yearMin = -770,
  yearMax = -221,
  initialYear = -632,
  title = '春秋戰國',
  footer = '中國 · 春秋戰國（前770–前221）· 據《左傳》《史記》《資治通鑑》· 不用《東周列國志》· 底圖為現代東亞地勢 · 色塊與行軍為示意 · 戎狄非編戶',
}: {
  yearMin?: number
  yearMax?: number
  initialYear?: number
  title?: string
  footer?: string
}) {
  return (
    <ZhouYearProvider
      yearMin={yearMin}
      yearMax={yearMax}
      initialYear={initialYear}
      title={title}
    >
      <ZhouSelectionProvider>
        <div className="app-shell app-shell--zhou">
          <ZhouHeader />
          <EraBar />
          <ZhouYearScrubber />

          <div className="app-shell__main">
            <ZhouMapStage />

            <div className="app-shell__side">
              <section className="events-cell" aria-label={`${title}大事`}>
                <ZhouTimeline />
              </section>
              <aside className="people-cell" aria-label={`${title}人物`}>
                <ZhouPeople />
              </aside>
            </div>
          </div>

          <footer className="app-footer">
            <p>{footer}</p>
          </footer>
        </div>
      </ZhouSelectionProvider>
    </ZhouYearProvider>
  )
}
