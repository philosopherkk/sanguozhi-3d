import { useEffect, useLayoutEffect, useState } from 'react'

const COLLAPSE_AT = 0.6
const EXPAND_AT = 0.3

function mainEl(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.app-shell__main')
}

/**
 * 窄屏時：主區（.app-shell__main）捲向內容頁後，把 <html data-chrome="collapsed">
 * 打開，由 CSS 收起朝代列、年代滑桿與專題切換。各時代標頭不同，所以旗標掛在
 * 文件根而非任何一個標頭上，所有時代共用同一套行為。
 * 桌面版主區不捲動，scrollTop 恆為 0，旗標恆關閉，桌面版面不受影響。
 *
 * 收起會讓主區變高，垂直 scroll-snap 隨即把位置吸回地圖頁，若只看位置
 * 便會立刻展開而來回閃動。因此收起與展開用不同門檻，收起後再把捲動位置
 * 釘回內容頁起點。
 *
 * @param resetKey 換國家或時代時變動；新時代從地圖頁開始，旗標要歸零。
 */
export function useCollapseOnScroll(resetKey: string): void {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const onScroll = (ev: Event) => {
      const main = ev.target
      if (!(main instanceof HTMLElement) || main !== mainEl()) return
      const ratio = main.scrollTop / Math.max(main.clientHeight, 1)
      setCollapsed((cur) => (cur ? ratio > EXPAND_AT : ratio > COLLAPSE_AT))
    }
    // scroll 不冒泡，用捕獲階段在文件層接；時代元件是 lazy 載入，不必等它掛載。
    document.addEventListener('scroll', onScroll, { capture: true, passive: true })
    return () =>
      document.removeEventListener('scroll', onScroll, { capture: true })
  }, [])

  useEffect(() => {
    setCollapsed(false)
  }, [resetKey])

  useLayoutEffect(() => {
    const root = document.documentElement
    if (collapsed) {
      root.dataset.chrome = 'collapsed'
      const main = mainEl()
      if (main) main.scrollTop = main.clientHeight
    } else {
      delete root.dataset.chrome
    }
  }, [collapsed])
}
