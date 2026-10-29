import { EraBar } from '../components/EraBar'
import { JapanEraMap } from './components/JapanEraMap'
import { JapanHeader } from './components/JapanHeader'
import { JapanPeople } from './components/JapanPeople'
import { JapanPowers } from './components/JapanPowers'
import { JapanTimeline } from './components/JapanTimeline'
import { JapanYearScrubber } from './components/JapanYearScrubber'
import { JapanYearProvider } from './state/JapanYearContext'

/** 德川江戶或明治至當代。幕末詳圖另見 BakumatsuApp。 */
export function JapanHistoryApp({
  initialYear,
  yearMin,
  yearMax,
  heading,
  tag,
  footer,
}: {
  initialYear: number
  yearMin: number
  yearMax: number
  heading: string
  tag: string
  footer: string
}) {
  return (
    <JapanYearProvider
      initialYear={initialYear}
      yearMin={yearMin}
      yearMax={yearMax}
    >
      <div className="app-shell app-shell--japan">
        <JapanHeader heading={heading} tag={tag} />
        <EraBar />
        <JapanYearScrubber />

        <div className="app-shell__main">
          <JapanEraMap />

          <div className="app-shell__side">
            <section className="events-cell" aria-label="通史大事">
              <JapanTimeline />
            </section>
            <aside className="people-cell" aria-label="通史人物">
              <JapanPowers />
              <JapanPeople />
            </aside>
          </div>
        </div>

        <footer className="app-footer">
          <p>{footer}</p>
        </footer>
      </div>
    </JapanYearProvider>
  )
}
