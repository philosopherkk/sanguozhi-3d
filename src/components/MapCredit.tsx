/**
 * MapCredit — 六個地圖元件共用的底圖出處與授權說明。
 *
 * 背景：同一內容原先是一條 `<p className="map-2d__credit">`，長版達 140–346 字，
 * 在窄屏約三成寬的欄內撐到 88–198px 高，永久蠶食地圖高度（393px 視口實測，
 * 見 docs/MOBILE_PLAN.md 修 14 跟進節）。本元件在窄屏（≤700px）以原生
 * `<details>` 把全文收攏成一行開關，展開後才佔位；桌面與平板滑鼠下由 CSS
 * 隱藏 summary、全文常開自然換行，同時取代舊 nowrap+ellipsis 行為——
 * 截斷令授權資訊不可達。
 *
 * 實現注意：視口判斷只出現在 useEffect 內——渲染期間讀 window 或寫 ref
 * 都與 React 相抵觸。＋/－ 指示器是純文字偽元素，不引入新圖示字型或 SVG。
 * 700px 斷點與 mobile.css 的收攏規則共用，改動時要兩邊同步。
 */
import { useEffect, useState, type ReactNode } from 'react'

/** 與 mobile.css 的收攏規則共用同一組媒體條件，改動時要兩邊同步。 */
const COLLAPSE_QUERY = '(max-width: 1023px) and (pointer: coarse), (max-width: 700px)'

export interface MapCreditProps {
  /** 窄屏收起狀態的一行標題（正文很長，不宜拿全文做標題） */
  summary?: string
  /** 桌面懸停提示（三國短版原有 mapCreditTitle 提示，保留同等行為） */
  title?: string
  /** 完整底圖與授權文字：原文照搬，一字不動 */
  children: ReactNode
}

export const MapCredit = ({
  summary = '底圖與授權說明',
  title,
  children,
}: MapCreditProps) => {
  const [open, setOpen] = useState(true)

  useEffect(() => {
    const media = window.matchMedia(COLLAPSE_QUERY)
    const apply = () => setOpen(!media.matches)
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [])

  return (
    <details
      className="map-2d__credit"
      title={title}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="map-2d__credit__summary">{summary}</summary>
      <span className="map-2d__credit__body">{children}</span>
    </details>
  )
}
