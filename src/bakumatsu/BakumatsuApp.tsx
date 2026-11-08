import { ChengyuPanel } from '../chengyu/components/ChengyuPanel'
import { localesForJapanTrack } from '../chengyu/lib/filterByYear'
import { AppSideRail } from '../components/AppSideRail'
import { CollapsibleAppFooter } from '../components/CollapsibleAppFooter'
import { EraPeople } from '../japanEras/EraPeople'
import { EraTimeline } from '../japanEras/EraTimeline'
import { BakumatsuFrame } from './components/BakumatsuChrome'
import { BakumatsuMapStage } from './components/BakumatsuMapStage'
import {
  BAKUMATSU_EVENTS,
  BAKUMATSU_PEOPLE,
  bakumatsuDetailFor,
  bakumatsuReadingFor,
} from './data/history'
import { bakumatsuTerritoryNote } from './data/territory'
import { useBakumatsuHanLayer } from './state/bakumatsuHanLayer'
import {
  BakumatsuSelectionProvider,
  useBakumatsuSelection,
} from './state/BakumatsuSelectionContext'
import { BakumatsuYearProvider, useBakumatsuYear } from './state/BakumatsuYearContext'
import { BAKUMATSU_FACTIONS } from './types'

function colorFor(id: string) {
  return BAKUMATSU_FACTIONS.find((f) => f.id === id)?.color ?? '#78716C'
}

function nameFor(id: string) {
  return BAKUMATSU_FACTIONS.find((f) => f.id === id)?.name ?? id
}

/**
 * 成語窗下限：幕末只有 1853–1868 十六年，若成語也按同一窗，江戶後期才定型的語
 * （如『一期一會』1845）一張也進不來，面板會常年空白。故成語取 1780 年以後，
 * 讓「鄰近成語」真的有意義；地圖與年表所用的年窗不受影響。
 */
const CHENGYU_YEAR_MIN = 1780

function BakumatsuBody() {
  const { year, setYear, month, yearMax } = useBakumatsuYear()
  const { selectedFaction, selectFaction } = useBakumatsuSelection()
  const hanLayer = useBakumatsuHanLayer()
  return (
    <div className="app-shell app-shell--japan">
      <BakumatsuFrame>
        <div className="app-shell__main app-shell__main--map-side">
          <BakumatsuMapStage />
          <AppSideRail
            storageKey="bakumatsu-side-rail"
            year={year}
            events={
              <EraTimeline
                headingId="bakumatsu-timeline-heading"
                year={year}
                setYear={setYear}
                events={BAKUMATSU_EVENTS}
                colorFor={colorFor}
                detailFor={bakumatsuDetailFor}
                readingFor={bakumatsuReadingFor}
                emptyHint="此年無登錄專條。試 1853（黑船）、1858（安政）、1860（櫻田）、1866（長州）、1868（戊辰）。"
                monthFilter={month}
              />
            }
            people={
              <EraPeople
                headingId="bakumatsu-people-heading"
                year={year}
                people={BAKUMATSU_PEOPLE}
                selectedFaction={selectedFaction}
                onClearFaction={() => selectFaction(null)}
                factionName={nameFor}
                colorFor={colorFor}
              />
            }
            chengyu={
              <ChengyuPanel
                year={year}
                yearMin={CHENGYU_YEAR_MIN}
                yearMax={yearMax}
                locales={localesForJapanTrack()}
                onJumpYear={setYear}
              />
            }
          />
        </div>
      </BakumatsuFrame>
      <CollapsibleAppFooter>
        <p>
          幕末（1853–1868）· 只是德川江戶的最後一段 · 據日本近代史通說 · 1853至1868可逐月 · 沒有專條的月份標「本月無專條」 · 1869年箱館與開拓使見「明治至當代」 ·
          不用遊戲劇情 · 行軍只顯示該月 · 與戰國、平安、三國志資料分離 · {bakumatsuTerritoryNote(hanLayer.enabled)}
        </p>
      </CollapsibleAppFooter>
    </div>
  )
}

export function BakumatsuApp() {
  return (
    <BakumatsuYearProvider>
      <BakumatsuSelectionProvider>
        <BakumatsuBody />
      </BakumatsuSelectionProvider>
    </BakumatsuYearProvider>
  )
}
