import { EraBar } from '../components/EraBar'
import { QinHanHeader } from './components/QinHanHeader'
import { QinHanMapStage } from './components/QinHanMapStage'
import { QinHanPeople } from './components/QinHanPeople'
import { QinHanTimeline } from './components/QinHanTimeline'
import { QinHanYearScrubber } from './components/QinHanYearScrubber'
import { QinHanSelectionProvider } from './state/QinHanSelectionContext'
import { QinHanYearProvider } from './state/QinHanYearContext'

/** 秦、漢分開。楚漢放在漢的開頭。184年黃巾見三國。 */
export function QinHanApp({
  yearMin = -221,
  yearMax = 183,
  initialYear = -221,
  title = '秦漢',
  footer = '中國 · 秦漢（前221–183）· 據《史記》《漢書》《後漢書》《資治通鑑》· 不用《三國演義》· 底圖為現代東亞地勢 · 色塊與行軍為示意 · 匈奴在塞外 · 184年黃巾見「三國」',
}: {
  yearMin?: number
  yearMax?: number
  initialYear?: number
  title?: string
  footer?: string
}) {
  return (
    <QinHanYearProvider
      yearMin={yearMin}
      yearMax={yearMax}
      initialYear={initialYear}
      title={title}
    >
      <QinHanSelectionProvider>
        <div className="app-shell app-shell--qinhan">
          <QinHanHeader />
          <EraBar />
          <QinHanYearScrubber />

          <div className="app-shell__main">
            <QinHanMapStage />

            <div className="app-shell__side">
              <section className="events-cell" aria-label={`${title}大事`}>
                <QinHanTimeline />
              </section>
              <aside className="people-cell" aria-label={`${title}人物`}>
                <QinHanPeople />
              </aside>
            </div>
          </div>

          <footer className="app-footer">
            <p>{footer}</p>
          </footer>
        </div>
      </QinHanSelectionProvider>
    </QinHanYearProvider>
  )
}
