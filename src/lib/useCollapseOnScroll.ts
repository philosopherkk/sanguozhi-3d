import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { usesDocumentScroll } from './scrollRoot'

const COLLAPSE_AT = 0.6
const EXPAND_AT = 0.3

export type ChromeState = 'top' | 'collapsed' | 'pinned'

function mainEl(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.app-shell__main')
}

/** 以地圖高度為尺：捲過地圖六成就算進入內容，回到三成以內就算回到地圖。 */
function mapHeight(main: HTMLElement): number {
  const first = main.firstElementChild as HTMLElement | null
  return Math.max(first?.offsetHeight ?? 0, 1)
}

/**
 * 窄屏時：整份文件捲過地圖六成就算進入內容，把 <html data-chrome="collapsed">
 * 打開，由 CSS 收起底欄並移動浮動「時間軸」鈕。各時代標頭不同，所以旗標掛在
 * 文件根而非任何一個標頭上，所有時代共用同一套行為。
 * 桌面版文件不捲動，主區 scrollTop 恆為 0，旗標恆關閉，桌面版面不受影響。
 *
 * 頁頭、時代列與年代軸隨文件自然捲走，不再被 display:none 收起（高度突變會令
 * 捲動位置跳動）。要回到時間軸，`reveal()` 平滑捲回頁首（狀態 pinned，捲回
 * 地圖時自動解除）；pinned 時再按 `hide()` 只是回到收起前的狀態。
 *
 * 收起與展開用不同門檻（遲滯），避免底欄收放改變高度後在門檻附近來回閃動。
 *
 * @param resetKey 換國家或時代時變動；新時代從地圖開始，狀態要歸零。
 */
export function useCollapseOnScroll(resetKey: string): {
  state: ChromeState
  reveal: () => void
  hide: () => void
} {
  const [auto, setAuto] = useState(false)
  const [pinned, setPinned] = useState(false)

  useEffect(() => {
    const onScroll = (ev: Event) => {
      const main = mainEl()
      if (!main) return
      let top: number
      if (usesDocumentScroll()) {
        if (ev.target !== document) return
        top = window.scrollY - (main.getBoundingClientRect().top + window.scrollY)
      } else {
        if (ev.target !== main) return
        top = main.scrollTop
      }
      const map = mapHeight(main)
      setAuto((cur) => (cur ? top > map * EXPAND_AT : top > map * COLLAPSE_AT))
      if (top <= map * EXPAND_AT) setPinned(false)
    }
    // scroll 不冒泡，用捕獲階段在文件層接；時代元件是 lazy 載入，不必等它掛載。
    document.addEventListener('scroll', onScroll, { capture: true, passive: true })
    return () =>
      document.removeEventListener('scroll', onScroll, { capture: true })
  }, [])

  useEffect(() => {
    setAuto(false)
    setPinned(false)
  }, [resetKey])

  const collapsed = auto && !pinned

  useLayoutEffect(() => {
    const root = document.documentElement
    if (collapsed) root.dataset.chrome = 'collapsed'
    else delete root.dataset.chrome
  }, [collapsed])

  const reveal = useCallback(() => {
    setPinned(true)
    if (usesDocumentScroll()) window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])
  const hide = useCallback(() => setPinned(false), [])

  return {
    state: collapsed ? 'collapsed' : auto && pinned ? 'pinned' : 'top',
    reveal,
    hide,
  }
}
