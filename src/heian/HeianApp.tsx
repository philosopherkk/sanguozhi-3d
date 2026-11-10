import { ChengyuPanel } from '../chengyu/components/ChengyuPanel'
import { localesForJapanTrack } from '../chengyu/lib/filterByYear'
import { AppSideRail } from '../components/AppSideRail'
import { CollapsibleAppFooter } from '../components/CollapsibleAppFooter'
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
  const { year, setYear, yearMin, yearMax } = useHeianYear()
  const { selectedFaction, selectFaction } = useHeianSelection()
  return (
    <div className="app-shell app-shell--japan">
      <HeianFrame>
        <div className="app-shell__main app-shell__main--map-side">
          <HeianMapStage />
          <AppSideRail
            storageKey="heian-side-rail"
            year={year}
            events={
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
            }
            people={
              <EraPeople
                headingId="heian-people-heading"
                year={year}
                people={HEIAN_PEOPLE}
                selectedFaction={selectedFaction}
                onClearFaction={() => selectFaction(null)}
                factionName={nameFor}
                colorFor={colorFor}
              />
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
      </HeianFrame>
      <CollapsibleAppFooter>
        <p>
          平安（794–1185）· 前中期收六國史大事，末期以源平合戰為重 ·
          據六國史、《吾妻鏡》系及日本史通說 · 不用遊戲劇情、不把軍記對話當作實錄 ·
          行軍只顯示該年 · 左行軍右勢力 · 與戰國、幕末、三國志資料分離 · {HEIAN_TERRITORY_NOTE}
        </p>
      </CollapsibleAppFooter>
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
