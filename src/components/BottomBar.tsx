import { useEffect, useMemo, useRef, useState } from 'react'
import {
  applyDocumentPrefs,
  FONT_STEPS,
  removeBookmark,
  setFontStep,
  setLevel,
  setTheme,
  toggleBookmark,
  useReadingPrefs,
  type Bookmark,
  type ReadingLevel,
  yearLabel,
} from '../lib/readingPrefs'
import { useCollapseOnScroll } from '../lib/useCollapseOnScroll'
import {
  announceTimeline,
  onTimelineChange,
  readTimelineFromUrl,
  writeTimelineToUrl,
} from '../lib/timelineUrl'
import {
  CHINA_ERA_SLOTS,
  JAPAN_ERA_SLOTS,
  useTopic,
  type ChinaEraSlot,
  type EraSlotMeta,
  type JapanEraSlot,
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

/**
 * 把年份交給目前這個時代的畫面。
 *
 * 只有 imperial／bakumatsu／日本時代深潛三組 context 會訂閱 `tk:timeline`；
 * 其餘時代（三國、漢、戰國、平安等）的年份只由年代滑桿驅動，光寫 URL 的
 * `?y=` 對它們完全無效。因此這裡除了廣播之外，另外把滑桿的值直接寫一次
 * （用原生 setter，否則 React 的 value tracker 會吞掉 change 事件）。
 * 滑桿在 lazy 分塊內，換時代時要輪詢等它出現。
 */
function useYearPush() {
  const timers = useRef<number[]>([])
  useEffect(
    () => () => timers.current.forEach((id) => window.clearTimeout(id)),
    [],
  )
  return (
    year: number,
    slot: EraSlotMeta<string>,
    sameEra: boolean,
    say: (msg: string) => void,
  ) => {
    const attempt = (tries: number) => {
      const input = document.querySelector<HTMLInputElement>(
        '.year-scrubber input[type=range]',
      )
      if (!input) {
        if (tries < 20) {
          timers.current.push(window.setTimeout(() => attempt(tries + 1), 150))
        } else {
          say(`找不到 ${slot.label} 的年代滑桿，請重新整理頁面。`)
        }
        return
      }
      const lo = Number(input.min)
      const hi = Number(input.max)
      const outOfRange =
        Number.isFinite(lo) && Number.isFinite(hi) && (year < lo || year > hi)
      if (outOfRange) {
        // 年份落在該時代範圍之外：只換到該時代，不把滑桿硬推出界。
        say(`${year} 年不在 ${slot.label}（${lo}–${hi}）之內。`)
        return
      }
      announceTimeline({ year, month: null })
      if (input.value === String(year)) return
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set
      if (!setter) return
      setter.call(input, String(year))
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
    // 同時代換年：滑桿已在頁面上，立刻寫。換時代：等 React 提交與分塊載入。
    attempt(sameEra ? 0 : 1)
  }
}

/** 固定於畫面底部的常駐設定列：字級、黑白底、閱讀程度、搜尋與書籤。 */
export function BottomBar() {
  const prefs = useReadingPrefs()
  const { topic, chinaEra, japanEra, setTopic, setChinaEra, setJapanEra } =
    useTopic()
  const era = topic === 'china' ? chinaEra : japanEra
  const chrome = useCollapseOnScroll(`${topic}:${era}`)
  const [panel, setPanel] = useState<Panel>(null)
  const [term, setTerm] = useState('')
  const [hits, setHits] = useState<Hit[]>([])
  const [year, setYear] = useState<number | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const statusTimer = useRef<number | undefined>(undefined)
  const pushYear = useYearPush()

  useEffect(() => {
    applyDocumentPrefs()
  }, [])

  // 年份寫在 URL（由 UrlBridge 維護）；開面板時先讀一次，之後跟著時代
  // 廣播更新，拖滑桿時「加入／取消本年書籤」才不會停在舊年。
  useEffect(() => {
    if (panel) setYear(readTimelineFromUrl().year)
  }, [panel])
  useEffect(() => onTimelineChange((state) => setYear(state.year)), [])

  useEffect(
    () => () => window.clearTimeout(statusTimer.current),
    [],
  )

  const say = (message: string) => {
    setStatus(message)
    window.clearTimeout(statusTimer.current)
    statusTimer.current = window.setTimeout(() => setStatus(null), 6000)
  }

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
    if (y === null) {
      say('目前沒有年份可加入書籤，請先選擇年份。')
      return
    }
    const label = `${topic === 'china' ? '中國' : '日本'}·${eraLabel(
      topic,
      era,
    )} ${yearLabel(y)}`
    const added = toggleBookmark({ topic, era, year: y, label })
    say(added ? `已加入書籤：${label}` : `已取消書籤：${label}`)
  }

  const goBookmark = (b: Bookmark) => {
    const slots = b.topic === 'china' ? CHINA_ERA_SLOTS : JAPAN_ERA_SLOTS
    const slot = slots.find((s) => s.id === b.era)
    // 時代鍵與國家不配的書籤（舊版本殘留或手改過存檔）會把時代畫面
    // 變成一片空白，因此寧可不跳，也不把它交回 TopicContext。
    if (!slot) {
      say(`書籤的時代「${b.era}」已不存在，請刪除後重新加入。`)
      return
    }
    const sameEra = topic === b.topic && era === b.era
    setPanel(null)
    if (b.topic === 'china') setChinaEra(b.era as ChinaEraSlot)
    else setJapanEra(b.era as JapanEraSlot)
    setTopic(b.topic)
    writeTimelineToUrl({ year: b.year, month: null })
    pushYear(b.year, slot, sameEra, say)
    if (sameEra && year === b.year) say(`已在 ${slot.label} ${b.year} 年。`)
  }

  const removeOne = (b: Bookmark) => {
    removeBookmark(b.id)
    say(`已刪除書籤：${b.label}`)
  }

  const statusLine = status ? (
    <p className="bottom-bar__status" role="status" aria-live="polite">
      {status}
    </p>
  ) : null

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
          {statusLine}
          <button
            type="button"
            className="bottom-bar__primary"
            onClick={addBookmark}
          >
            {marked ? '取消本年書籤' : '加入本年書籤'}
          </button>
          <ul className="bottom-bar__list">
            {prefs.bookmarks.length === 0 ? (
              <li className="bottom-bar__hint">
                尚無書籤。加入後會記住國家、時代與年份。
              </li>
            ) : null}
            {prefs.bookmarks.map((b) => (
              <li key={b.id} className="bottom-bar__row">
                <button type="button" onClick={() => goBookmark(b)}>
                  {b.label}
                </button>
                <button
                  type="button"
                  aria-label={`刪除書籤 ${b.label}`}
                  onClick={() => removeOne(b)}
                >
                  刪除
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {panel === null ? statusLine : null}

      {chrome.state !== 'top' ? (
        <button
          type="button"
          className="chrome-fab"
          aria-expanded={chrome.state === 'pinned'}
          onClick={chrome.state === 'pinned' ? chrome.hide : chrome.reveal}
        >
          {chrome.state === 'pinned' ? '收起時間軸 ▴' : '時間軸 ▾'}
        </button>
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
