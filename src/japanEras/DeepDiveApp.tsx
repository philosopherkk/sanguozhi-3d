import type { ReactNode } from 'react'
import { ChengyuPanel } from '../chengyu/components/ChengyuPanel'
import { localesForJapanTrack } from '../chengyu/lib/filterByYear'
import { AppSideRail } from '../components/AppSideRail'
import { CollapsibleAppFooter } from '../components/CollapsibleAppFooter'
import { EraBar } from '../components/EraBar'
import { layoutTicks } from '../lib/tickCollisions'
import { ReadingControls } from '../components/ReadingControls'
import { TopicSwitcher } from '../components/TopicSwitcher'
import type { JapanDeepDivePack } from './deepDiveTypes'
import { DeepDiveMapStage } from './DeepDiveMapStage'
import { DeepDiveSelectionProvider, useDeepDiveSelection } from './DeepDiveSelectionContext'
import { DeepDiveYearProvider, useDeepDiveYear } from './DeepDiveYearContext'
import { EraPeople } from './EraPeople'
import { EraTimeline } from './EraTimeline'

function DeepDiveHeader({ pack }: { pack: JapanDeepDivePack }) {
  const { year, month, step, playing, togglePlay, yearMin, yearMax } =
    useDeepDiveYear()
  return (
    <header className="app-header">
      <div className="app-header__brand">
        <h1 className="app-header__title">{pack.title}</h1>
        <p className="app-header__tag">{pack.tag}</p>
      </div>
      <TopicSwitcher />
      <div className="app-header__year-block">
        <button
          type="button"
          className="app-header__step"
          aria-label={month == null ? '上一年' : '上一月'}
          onClick={() => step(-1)}
          disabled={year <= yearMin && (month == null || month <= 1)}
        >
          −
        </button>
        <ReadingControls />
        <div className="app-header__year" aria-live="polite">
          <span className="app-header__num">{year}</span>
          <span className="app-header__era">{month == null ? '年' : `年${month}月`}</span>
        </div>
        <button
          type="button"
          className="app-header__step"
          aria-label={month == null ? '下一年' : '下一月'}
          onClick={() => step(1)}
          disabled={year >= yearMax && (month == null || month >= 12)}
        >
          +
        </button>
        <button
          type="button"
          className={playing ? 'app-header__play is-active' : 'app-header__play'}
          onClick={togglePlay}
        >
          {playing ? '暫停' : '播放'}
        </button>
      </div>
    </header>
  )
}

/**
 * 年代滑桿：放在 EraBar 之下，與其他時代（戰國、幕末、日本通史）一致。
 * 之前嵌於 header 內，令安土桃山與江戶的 header 出現 5–9 個年多按鈕，
 * 與其他時代的 chrome 不一致。
 */
function DeepDiveYearScrubber({ pack }: { pack: JapanDeepDivePack }) {
  const { year, month, setYear, setMonth, yearMin, yearMax } = useDeepDiveYear()
  // 與其他時代一致：刻度以絕對定位分佈於整條滑桿上（之前係一般 <li> 列表，
  // 全部疊於左邊，令安土桃山、江戶的年代軸看落好短）。
  const laid = layoutTicks(pack.ticks, yearMin, yearMax, year)
  return (
    <div className="year-scrubber year-scrubber--compact" role="group" aria-label={`${pack.title}年份`}>
      <input
        type="range"
        className="year-scrubber__range"
        min={yearMin}
        max={yearMax}
        value={year}
        aria-valuetext={`${year} 年`}
        onChange={(e) => setYear(Number(e.target.value))}
      />
      {/* pack 宣告 monthZoom 時先出現：月級政變（例如幕末）要可以在同一年內逐月走 */}
      {month != null ? (
        <div className="year-scrubber__months">
          <span>逐月</span>
          <input
            type="range"
            min={1}
            max={12}
            step={1}
            value={month}
            aria-label="選擇月份"
            aria-valuetext={`${month} 月`}
            onChange={(e) => setMonth(Number(e.target.value))}
          />
          <span>{month}月</span>
        </div>
      ) : null}
      <div className="year-scrubber__ticks">
        {laid.map((t) => (
          <button
            key={t.year}
            type="button"
            className={
              year === t.year
                ? 'year-scrubber__tick is-active'
                : t.pct <= 0
                  ? 'year-scrubber__tick year-scrubber__tick--start'
                  : t.pct >= 100
                    ? 'year-scrubber__tick year-scrubber__tick--end'
                    : 'year-scrubber__tick'
            }
            style={{ left: `${t.pct}%`, opacity: t.faint ? 0.25 : undefined }}
            onClick={() => setYear(t.year)}
            title={`${t.year}${t.label ? ` ${t.label}` : ''}`}
          >
            <span className="year-scrubber__tick-year">{t.year}</span>
            {t.showLabel && t.label ? (
              <span className="year-scrubber__tick-label">{t.label}</span>
            ) : t.showDot ? (
              <span className="year-scrubber__tick-dot" />
            ) : null}
          </button>
        ))}
      </div>
    </div>
  )
}

function DeepDiveBody({ pack }: { pack: JapanDeepDivePack }) {
  const { year, setYear, yearMin, yearMax } = useDeepDiveYear()
  const { selectedFaction, selectFaction } = useDeepDiveSelection()
  const colorFor = (id: string) =>
    pack.factions.find((f) => f.id === id)?.color ?? '#78716C'
  const nameFor = (id: string) =>
    pack.factions.find((f) => f.id === id)?.name ?? id

  return (
    <div className="app-shell app-shell--japan">
      <DeepDiveHeader pack={pack} />
      <EraBar />
      <DeepDiveYearScrubber pack={pack} />
      <div className="app-shell__main app-shell__main--map-side">
        <DeepDiveMapStage pack={pack} />
        <AppSideRail
          storageKey={`deep-dive-${pack.id}-side-rail`}
          year={year}
          events={
            <EraTimeline
              headingId={`${pack.id}-timeline-heading`}
              year={year}
              setYear={setYear}
              events={pack.events}
              colorFor={colorFor}
              detailFor={(id) => {
                const custom = pack.detailFor(id)
                if (custom) return custom
                const event = pack.events.find((item) => item.id === id)
                if (!event) return undefined
                return {
                  causes: event.desc,
                  course: event.desc,
                  keyFigures: event.factions.map((name) => ({
                    name,
                    role: '相關勢力',
                  })),
                  outcome: event.note ?? event.source,
                  brief: event.desc,
                  zhwikiUrl: 'https://zh.wikipedia.org/wiki/日本歷史',
                }
              }}
              readingFor={(id) => {
                const custom = pack.readingFor(id)
                if (custom) return custom
                const event = pack.events.find((item) => item.id === id)
                if (!event) return undefined
                return {
                  quote: event.desc,
                  source: event.source,
                  layers: {
                    elementary: event.desc,
                    secondary: event.note ?? event.desc,
                    university: `${event.source}。${event.note ?? '色塊與行軍是示意，數字無總冊就不寫成精確人口或兵籍。'}`,
                  },
                }
              }}
              emptyHint={pack.emptyHint}
            />
          }
          people={
            <EraPeople
              headingId={`${pack.id}-people-heading`}
              year={year}
              people={pack.people}
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
      <CollapsibleAppFooter>
        <p>{pack.footer}</p>
      </CollapsibleAppFooter>
    </div>
  )
}

export function DeepDiveApp({ pack }: { pack: JapanDeepDivePack }) {
  return (
    <DeepDiveYearProvider pack={pack}>
      <DeepDiveSelectionProvider>
        <DeepDiveBody pack={pack} />
      </DeepDiveSelectionProvider>
    </DeepDiveYearProvider>
  )
}

/** 供各時代入口檔一行包裝。 */
export function makeDeepDiveApp(pack: JapanDeepDivePack): () => ReactNode {
  return function PackedApp() {
    return <DeepDiveApp pack={pack} />
  }
}
