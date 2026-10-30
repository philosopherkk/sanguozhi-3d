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
import { BAKUMATSU_TERRITORY_NOTE } from './data/territory'
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

function BakumatsuBody() {
  const { year, setYear } = useBakumatsuYear()
  const { selectedFaction, selectFaction } = useBakumatsuSelection()
  return (
    <div className="app-shell app-shell--japan">
      <BakumatsuFrame>
        <div className="app-shell__main">
          <BakumatsuMapStage />
          <div className="app-shell__side">
            <section className="events-cell" aria-label="幕末大事">
              <EraTimeline
                headingId="bakumatsu-timeline-heading"
                year={year}
                setYear={setYear}
                events={BAKUMATSU_EVENTS}
                colorFor={colorFor}
                detailFor={bakumatsuDetailFor}
                readingFor={bakumatsuReadingFor}
                emptyHint="此年無登錄專條。試 1853（黑船）、1858（安政）、1860（櫻田）、1866（長州）、1868（戊辰）。"
              />
            </section>
            <aside className="people-cell" aria-label="幕末人物">
              <EraPeople
                headingId="bakumatsu-people-heading"
                year={year}
                people={BAKUMATSU_PEOPLE}
                selectedFaction={selectedFaction}
                onClearFaction={() => selectFaction(null)}
                factionName={nameFor}
                colorFor={colorFor}
              />
            </aside>
          </div>
        </div>
      </BakumatsuFrame>
      <footer className="app-footer">
        <p>
          幕末（1853–1868）· 只是德川江戶的最後一段 · 據日本近代史通說 · 1853至1868可逐月 · 沒有專條的月份標「本月無專條」 · 1869年箱館與開拓使見「明治至當代」 ·
          不用遊戲劇情 · 行軍只顯示該月 · 與戰國、平安、三國志資料分離 · {BAKUMATSU_TERRITORY_NOTE}
        </p>
      </footer>
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
