import { useState } from 'react'

type PersonPortraitProps = {
  src?: string
  name: string
  note?: string
  size?: 'sm' | 'md' | 'lg'
}

// 人物想像圖：清單用 40px 圓形、展開的介紹用 96px。
// 沒有圖檔或圖檔載入失敗時，退回名字的第一個字，列高不變。
//
// 原圖一律 1024px（平均約 390KB），而界面上最大只有 96px：手機若直接
// 拉原圖，向下滑動一頁人物清單就要下載數 MB。構建時以
// scripts/gen_portrait_thumbs.mjs 預先產生 80／192px 兩級縮影
// （對應 2 倍解析度）放在 portraits/_thumb/，此處由 src 對映縮影路徑，
// 並以 sizes 讓瀏覽器按實際尺寸挑選。縮影載入失敗先退回原圖，
// 原圖再失敗才退回首字徽章。
const THUMB_WIDTHS = [80, 192] as const

// 資料欄位的 portrait 是根絕對路徑，但頁面部署在 base（例如
// /sanguozhi-3d/）之下；只有以 Vercel 根路徑部署時兩者才恰好重合。
// 渲染時一律以 import.meta.env.BASE_URL 為前綴解析，兩種部署通用。
export function withBase(src: string) {
  return src.startsWith('/') ? `${import.meta.env.BASE_URL}${src.slice(1)}` : src
}

function thumbSrc(src: string, width: number) {
  return withBase(
    src
      .replace('/portraits/', '/portraits/_thumb/')
      .replace(/\.jpg$/, `-${width}.jpg`)
  )
}

export function PersonPortrait({
  src,
  name,
  note,
  size = 'sm',
}: PersonPortraitProps) {
  const [thumbFailed, setThumbFailed] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)
  const initial = Array.from(name.trim())[0] ?? '?'
  // 「想像圖」三字一律放最前：hover 提示不得被考據 note 蓋掉（繪像非寫生）。
  const title = note ? `想像圖 · 考據：${note}` : `想像圖 · ${name}`
  const cls =
    size === 'lg'
      ? 'person-portrait person-portrait--lg'
      : size === 'md'
        ? 'person-portrait person-portrait--md'
        : 'person-portrait'
  const hasImage = Boolean(src) && !imgFailed

  return (
    <span className={cls} title={title}>
      {src && !imgFailed ? (
        <img
          src={withBase(src)}
          srcSet={
            thumbFailed
              ? undefined
              : THUMB_WIDTHS.map((w) => `${thumbSrc(src, w)} ${w}w`).join(', ')
          }
          sizes={
            thumbFailed
              ? undefined
              : size === 'lg'
                ? '96px'
                : size === 'md'
                  ? '64px'
                  : '40px'
          }
          alt={`想像圖 · ${name}`}
          width={1024}
          height={1024}
          decoding="async"
          loading="lazy"
          onError={() => (thumbFailed ? setImgFailed(true) : setThumbFailed(true))}
        />
      ) : (
        <span className="person-portrait__initial" aria-hidden>
          {initial}
        </span>
      )}
      {/* 可見角標：alt／title 讀屏之外，眼睛也要看到「想像圖」。
          圓形縮圖只有 40px，全稱放不下，sm 用單字「想」；lg 給足三字。 */}
      {hasImage ? (
        <span className="person-portrait__badge" aria-hidden>
          {size === 'lg' ? '想像圖' : '想'}
        </span>
      ) : null}
    </span>
  )
}
