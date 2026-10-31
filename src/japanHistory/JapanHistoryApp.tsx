import { ChengyuPanel } from '../chengyu/components/ChengyuPanel'
import { localesForJapanTrack } from '../chengyu/lib/filterByYear'
import { AppSideRail } from '../components/AppSideRail'
import { CollapsibleAppFooter } from '../components/CollapsibleAppFooter'
import { EraBar } from '../components/EraBar'
import { JapanEraMap } from './components/JapanEraMap'
import { JapanHeader } from './components/JapanHeader'
import { JapanPeople } from './components/JapanPeople'
import { JapanPowers } from './components/JapanPowers'
import { JapanTimeline } from './components/JapanTimeline'
import { JapanYearScrubber } from './components/JapanYearScrubber'
import { JapanYearProvider, useJapanYear } from './state/JapanYearContext'

function JapanHistoryMain() {
  const { year, setYear, yearMin, yearMax } = useJapanYear()
  return (
    <div className="app-shell__main app-shell__main--map-side">
      <JapanEraMap />
      <AppSideRail
        storageKey="japan-history-side-rail"
        year={year}
        events={<JapanTimeline />}
        people={
          <>
            <JapanPowers />
            <JapanPeople />
          </>
        }
        chengyu={
          <ChengyuPanel
            year={year}
            yearMin={yearMin}
            yearMax={yearMax}
            locales={localesForJapanTrack()}
            onJumpYear={setYear}
          />
        }
      />
    </div>
  )
}

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

        <JapanHistoryMain />

        <CollapsibleAppFooter>
          <p>{footer}</p>
        </CollapsibleAppFooter>
      </div>
    </JapanYearProvider>
  )
}
