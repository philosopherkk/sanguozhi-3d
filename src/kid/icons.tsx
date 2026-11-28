/**
 * 簡易版圖示集（自繪 SVG）。`src/kid/` 內只准經 `<Icon name>` 用圖示，
 * 不得另寫 `<svg>`／`<path>` 或用 emoji（`audit_kid_ui.mjs` 會檢查）。
 * 統一 24×24、`currentColor`、線寬 2.5、圓角端點；圖示只作裝飾
 * （`aria-hidden`），按鈕文字另由 `strings.ts` 提供。
 */
import type { ReactNode } from 'react'

const PATHS = {
  home: (
    <>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9.5h13V10" />
      <path d="M10 19.5v-5h4v5" />
    </>
  ),
  back: (
    <>
      <path d="M10 6 4 12l6 6" />
      <path d="M4 12h11a5 5 0 0 1 0 10h-2" />
    </>
  ),
  prev: <path d="M15 4 7 12l8 8" />,
  next: <path d="m9 4 8 8-8 8" />,
  play: <path d="M7 4.5v15L19.5 12z" />,
  stop: (
    <>
      <path d="M8 5v14" />
      <path d="M16 5v14" />
    </>
  ),
  story: (
    <>
      <path d="M4 5.5c2.5-1.3 5.5-1.3 8 0v14c-2.5-1.3-5.5-1.3-8 0z" />
      <path d="M12 5.5c2.5-1.3 5.5-1.3 8 0v14c-2.5-1.3-5.5-1.3-8 0" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.8 3.4-6 6.5-6s5.7 2.2 6.5 6" />
      <path d="M16 4.8a3.5 3.5 0 0 1 0 6.4" />
      <path d="M18 14.4c1.8.9 3 2.8 3.5 5.6" />
    </>
  ),
  map: (
    <>
      <path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z" />
      <path d="M9 4v13.5" />
      <path d="M15 6.5V20" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M5.5 18.5l1.8-1.8M16.7 7.3l1.8-1.8" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />,
  'text-size': (
    <>
      <path d="M3 19 8 6l5 13" />
      <path d="M4.8 14.5h6.4" />
      <path d="m14 19 3.5-9 3.5 9" />
      <path d="M15.2 16h4.6" />
    </>
  ),
  hand: (
    <>
      <path d="M9 11V4.5a1.8 1.8 0 0 1 3.6 0V10" />
      <path d="M12.6 9.5a1.8 1.8 0 0 1 3.6 0v1.5" />
      <path d="M16.2 10.5a1.8 1.8 0 0 1 3.6 0V15a7 7 0 0 1-7 7h-1a7 7 0 0 1-5.6-2.8L3.5 15.4a1.8 1.8 0 0 1 2.8-2.2L9 15.5" />
    </>
  ),
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof PATHS

export const ICON_NAMES = Object.keys(PATHS) as IconName[]

export function Icon({ name, size = 32 }: { name: IconName; size?: number }) {
  return (
    <svg
      className={`kid-icon kid-icon--${name}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  )
}
