import { useEffect, useMemo, useState } from 'react'
import {
  applyDocumentPrefs,
  FONT_STEPS,
  removeBookmark,
  setFontStep,
  setLevel,
  setTheme,
  toggleBookmark,
  useReadingPrefs,
  type ReadingLevel,
} from '../lib/readingPrefs'
import { useCollapseOnScroll } from '../lib/useCollapseOnScroll'
import { readTimelineFromUrl, writeTimelineToUrl } from '../lib/timelineUrl'
import {
  CHINA_ERA_SLOTS,
  JAPAN_ERA_SLOTS,
  useTopic,
  type AppTopic,
} from '../state/TopicContext'

const LEVELS: { id: ReadingLevel; label: string }[] = [
  { id: 'elementary', label: '小學' },
  { id: 'secondary', label: '中學' },
  { id: 'university', label: '大學' },
]

type Panel = 'search' | 'bookmarks' | null

interface Hit {
  el: HTMLElement
  kind: string
  text: string
}

const SEARCH_TARGETS: { selector: string; kind: string }[] = [
  { selector: '.timeline-item', kind: '大事' },
  { selector: '.person-card, .people-card', kind: '人物' },
  { selector: '.chengyu-item, .chengyu-card, [data-chengyu]', kind: '成語' },
]

function collectHits(term: string): Hit[] {
  const needle = term.trim()
  if (!needle) return []
  const root = document.querySelector('.app-shell__main') ?? document.body
  const hits: Hit[] = []
  for (const { selector, kind } of SEARCH_TARGETS) {
    root.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      const text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim()
      if (text.includes(needle)) hits.push({ el, kind, text: text.slice(0, 48) })
    })
  }
  return hits.slice(0, 30)
}

function eraLabel(topic: string, era: string): string {
  const slots = topic === 'china' ? CHINA_ERA_SLOTS : JAPAN_ERA_SLOTS
  return slots.find((s) => s.id === era)?.label ?? era
}

/** 固定於畫面底部的常駐設定列：字級、黑白底、閱讀程度、搜尋與書籤。 */
export function BottomBar() {
  const prefs = useReadingPrefs()
  const { topic, chinaEra, japanEra, setTopic, setChinaEra, setJapanEra } =
    useTopic()
  const era = topic === 'china' ? chinaEra : japanEra
  useCollapseOnScroll(`${topic}:${era}`)
  const [panel, setPanel] = useState<Panel>(null)
  const [term, setTerm] = useState('')
  const [hits, setHits] = useState<Hit[]>([])
  const [year, setYear] = useState<number | null>(null)

  useEffect(() => {
    applyDocumentPrefs()
  }, [])

  // 年份寫在 URL（由 UrlBridge 維護）；開面板時才讀，避免常駐輪詢。
  useEffect(() => {
    if (panel) setYear(readTimelineFromUrl().year)
  }, [panel])

  const marked = useMemo(() => {
    const id = `${topic}:${era}:${year}`
    return prefs.bookmarks.some((b) => b.id === id)
  }, [prefs.bookmarks, topic, era, year])

  const toggle = (p: Exclude<Panel, null>) =>
    setPanel((cur) => (cur === p ? null : p))

  const runSearch = (value: string) => {
    setTerm(value)
    setHits(collectHits(value))
  }

  const jumpToHit = (hit: Hit) => {
    setPanel(null)
    hit.el.scrollIntoView({ block: 'center' })
    hit.el.classList.add('search-flash')
    window.setTimeout(() => hit.el.classList.remove('search-flash'), 2200)
  }

  const addBookmark = () => {
    const y = year ?? readTimelineFromUrl().year
    if (y === null) return
    toggleBookmark({
      topic,
      era,
      year: y,
      label: `${topic === 'china' ? '中國' : '日本'}·${eraLabel(topic, era)} ${y}年`,
    })
  }

  const goBookmark = (t: string, e: string, y: number) => {
    setPanel(null)
    if (t === 'china') setChinaEra(e as typeof chinaEra)
    else setJapanEra(e as typeof japanEra)
    setTopic(t as AppTopic)
    writeTimelineToUrl({ year: y, month: null })
  }

  return (
    <>
      {panel === 'search' ? (
        <div className="bottom-bar__panel" role="dialog" aria-label="搜尋">
          <input
            className="bottom-bar__input"
            type="search"
            value={term}
            autoFocus
            placeholder="搜尋本頁的大事、人物、成語"
            onChange={(ev) => runSearch(ev.target.value)}
          />
          <ul className="bottom-bar__list">
            {hits.map((h, i) => (
              <li key={i}>
                <button type="button" onClick={() => jumpToHit(h)}>
                  <span className="bottom-bar__kind">{h.kind}</span>
                  {h.text}
                </button>
              </li>
            ))}
          </ul>
          <p className="bottom-bar__hint">
            {term.trim() && hits.length === 0
              ? '找不到。搜尋範圍為目前年份、目前分頁已顯示的內容，可切換分頁或年份再搜。'
              : '搜尋範圍：目前年份、目前分頁已顯示的內容。'}
          </p>
        </div>
      ) : null}

      {panel === 'bookmarks' ? (
        <div className="bottom-bar__panel" role="dialog" aria-label="書籤">
          <button
            type="button"
            className="bottom-bar__primary"
            onClick={addBookmark}
          >
            {marked ? '取消本年書籤' : '加入本年書籤'}
          </button>
          <ul className="bottom-bar__list">
            {prefs.bookmarks.length === 0 ? (
              <li className="bottom-bar__hint">尚無書籤。</li>
            ) : null}
            {prefs.bookmarks.map((b) => (
              <li key={b.id} className="bottom-bar__row">
                <button
                  type="button"
                  onClick={() => goBookmark(b.topic, b.era, b.year)}
                >
                  {b.label}
                </button>
                <button
                  type="button"
                  aria-label={`刪除書籤 ${b.label}`}
                  onClick={() => removeBookmark(b.id)}
                >
                  刪除
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <nav className="bottom-bar" aria-label="閱讀設定">
        <div className="bottom-bar__group" role="group" aria-label="字級">
          <button
            type="button"
            aria-label="縮小字"
            disabled={prefs.fontStep <= 0}
            onClick={() => setFontStep(prefs.fontStep - 1)}
          >
            A−
          </button>
          <button
            type="button"
            aria-label="放大字"
            disabled={prefs.fontStep >= FONT_STEPS.length - 1}
            onClick={() => setFontStep(prefs.fontStep + 1)}
          >
            A+
          </button>
        </div>
        <button
          type="button"
          className="bottom-bar__solo"
          aria-pressed={prefs.theme === 'light'}
          onClick={() => setTheme(prefs.theme === 'dark' ? 'light' : 'dark')}
        >
          {prefs.theme === 'dark' ? '白底' : '黑底'}
        </button>
        <div className="bottom-bar__group" role="group" aria-label="閱讀程度">
          {LEVELS.map((lv) => (
            <button
              key={lv.id}
              type="button"
              aria-pressed={prefs.level === lv.id}
              onClick={() => setLevel(lv.id)}
            >
              {lv.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="bottom-bar__solo"
          aria-expanded={panel === 'search'}
          onClick={() => toggle('search')}
        >
          搜尋
        </button>
        <button
          type="button"
          className="bottom-bar__solo"
          aria-expanded={panel === 'bookmarks'}
          onClick={() => toggle('bookmarks')}
        >
          書籤{prefs.bookmarks.length ? ` ${prefs.bookmarks.length}` : ''}
        </button>
      </nav>
    </>
  )
}
