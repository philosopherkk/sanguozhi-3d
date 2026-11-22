import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from 'react'
import {
  applyDocumentPrefs,
  FONT_STEPS,
  removeBookmark,
  setFontStep,
  setLevel,
  setTheme,
  toggleBookmark,
  useReadingPrefs,
  yearLabel,
  type Bookmark,
  type ReadingLevel,
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
 * 滑桿在 lazy 分塊內，換時代時要輪詢等它出現。換時代的點擊當刻，頁面上
 * 掛著的還是舊時代的滑桿：對它判年份界線會用錯的範圍，寫進去也只驅動舊
 * 時代，所以先記住舊節點，等新時代的滑桿換上才寫。
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
    const stale = sameEra
      ? null
      : document.querySelector<HTMLInputElement>(
          '.year-scrubber input[type=range]',
        )
    const attempt = (tries: number) => {
      const input = document.querySelector<HTMLInputElement>(
        '.year-scrubber input[type=range]',
      )
      if (!input || input === stale) {
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
        // 年份落在該時代範圍之外：只換到該時代，不把滑桿硬推出界；URL 的
        // `?y=` 一併改成畫面實際停留的年份，否則分享連結與畫面各說一套。
        const fmt = (y: number) => (y < 0 ? `前${-y}` : `${y}`)
        say(
          `${fmt(year)} 年不在 ${slot.label}（${fmt(lo)}–${fmt(hi)}）之內。`,
        )
        const landed = Number(input.value)
        if (Number.isFinite(landed)) {
          writeTimelineToUrl({ year: landed, month: null })
        }
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

/**
 * 目前年份以 URL 的 `?y=` 為準（UrlBridge 於滑桿 input 時寫回）。
 * 只有三組時代 context 會廣播 `tk:timeline`，其餘時代要靠滑桿的 input
 * 事件才跟得上，否則面板上的年份會停在舊值。
 */
function subscribeTimelineYear(notify: () => void): () => void {
  const offBroadcast = onTimelineChange(notify)
  const onInput = (ev: Event) => {
    const el = ev.target
    if (el instanceof HTMLInputElement && el.type === 'range') notify()
  }
  document.addEventListener('input', onInput)
  window.addEventListener('popstate', notify)
  return () => {
    offBroadcast()
    document.removeEventListener('input', onInput)
    window.removeEventListener('popstate', notify)
  }
}

function useTimelineYear(): number | null {
  return useSyncExternalStore(subscribeTimelineYear, () =>
    readTimelineFromUrl().year,
  )
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
  const [cursor, setCursor] = useState(-1)
  const [status, setStatus] = useState<string | null>(null)
  const statusTimer = useRef<number | undefined>(undefined)
  const pushYear = useYearPush()

  useEffect(() => {
    applyDocumentPrefs()
  }, [])

  const year = useTimelineYear()

  useEffect(
    () => () => window.clearTimeout(statusTimer.current),
    [],
  )

  // 面板開啟時 Escape 一律關面板（搜尋框以外還有書籤列）。
  useEffect(() => {
    if (!panel) return
    const onKey = (ev: globalThis.KeyboardEvent) => {
      if (ev.key === 'Escape') setPanel(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [panel])

  const say = (message: string) => {
    setStatus(message)
    window.clearTimeout(statusTimer.current)
    statusTimer.current = window.setTimeout(() => setStatus(null), 6000)
  }

  const marked = useMemo(() => {
    const id = `${topic}:${era}:${year}`
    return prefs.bookmarks.some((b) => b.id === id)
  }, [prefs.bookmarks, topic, era, year])

  const toggle = (p: Exclude<Panel, null>) => {
    setPanel((cur) => (cur === p ? null : p))
    setCursor(-1)
  }

  const runSearch = (value: string) => {
    setTerm(value)
    setHits(collectHits(value))
    setCursor(-1)
  }

  const flashHit = (hit: Hit) => {
    hit.el.scrollIntoView({ block: 'center' })
    hit.el.classList.add('search-flash')
    window.setTimeout(() => hit.el.classList.remove('search-flash'), 2200)
  }

  const jumpToHit = (hit: Hit, index: number) => {
    // 命中記錄是 DOM 參照；換過年份或分頁後該節點已不在文件裡，
    // scrollIntoView 會靜靜失敗，所以要先確認。
    if (!hit.el.isConnected) {
      setHits([])
      setCursor(-1)
      say('那一則內容已不在目前畫面，請重新搜尋。')
      return
    }
    setCursor(index)
    flashHit(hit)
  }

  const stepHit = (dir: 1 | -1) => {
    const found = hits.length ? hits : collectHits(term)
    if (found.length !== hits.length) setHits(found)
    if (found.length === 0) {
      say(`本分頁沒有符合「${term.trim()}」的內容。`)
      return
    }
    const next =
      cursor < 0
        ? dir === 1
          ? 0
          : found.length - 1
        : (cursor + dir + found.length) % found.length
    jumpToHit(found[next], next)
  }

  const onSearchKey = (ev: KeyboardEvent<HTMLInputElement>) => {
    if (ev.key !== 'Enter') return
    ev.preventDefault()
    stepHit(ev.shiftKey ? -1 : 1)
  }

  const addBookmark = () => {
    const y = year
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
    if (sameEra && year === b.year) {
      say(`已在 ${slot.label} ${yearLabel(b.year)}。`)
    }
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

  const trimmed = term.trim()
  const searchHint = !trimmed
    ? '搜尋範圍：目前年份、目前分頁已顯示的大事、人物與成語。'
    : hits.length === 0
      ? `本分頁沒有符合「${trimmed}」的內容；其他年份與分頁要換過去再搜。`
      : `找到 ${hits.length} 個命中${
          cursor >= 0 ? `，目前第 ${cursor + 1} 個` : ''
        }。點結果可跳到該處。`

  return (
    <>
      {panel === 'search' ? (
        <div className="bottom-bar__panel" role="dialog" aria-label="搜尋">
          <div className="bottom-bar__panel-head">
            <strong>搜尋</strong>
            <button
              type="button"
              className="bottom-bar__close"
              onClick={() => setPanel(null)}
            >
              關閉
            </button>
          </div>
          {statusLine}
          <input
            className="bottom-bar__input"
            type="search"
            value={term}
            autoFocus
            placeholder="搜尋本頁的大事、人物、成語"
            onChange={(ev) => runSearch(ev.target.value)}
            onKeyDown={onSearchKey}
          />
          <p className="bottom-bar__hint" role="status" aria-live="polite">
            {searchHint}
          </p>
          <div className="bottom-bar__tools">
            <div className="bottom-bar__group">
              <button
                type="button"
                disabled={hits.length === 0}
                onClick={() => stepHit(-1)}
              >
                上一個
              </button>
              <button
                type="button"
                disabled={hits.length === 0}
                onClick={() => stepHit(1)}
              >
                下一個
              </button>
            </div>
          </div>
          <ul className="bottom-bar__list">
            {hits.map((h, i) => (
              <li key={i}>
                <button
                  type="button"
                  className={i === cursor ? 'is-current' : undefined}
                  onClick={() => jumpToHit(h, i)}
                >
                  <span className="bottom-bar__kind">{h.kind}</span>
                  {h.text}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {panel === 'bookmarks' ? (
        <div className="bottom-bar__panel" role="dialog" aria-label="書籤">
          <div className="bottom-bar__panel-head">
            <strong>書籤</strong>
            <button
              type="button"
              className="bottom-bar__close"
              onClick={() => setPanel(null)}
            >
              關閉
            </button>
          </div>
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
