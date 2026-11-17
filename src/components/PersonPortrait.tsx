import { useState } from 'react'

type PersonPortraitProps = {
  src?: string
  name: string
  note?: string
  size?: 'sm' | 'md' | 'lg'
}

// 人物想像圖：清單用 40px 圓形、展開的介紹用 96px。
// 沒有圖檔或圖檔載入失敗時，退回名字的第一個字，列高不變。
export function PersonPortrait({
  src,
  name,
  note,
  size = 'sm',
}: PersonPortraitProps) {
  const [failed, setFailed] = useState(false)
  const initial = Array.from(name.trim())[0] ?? '?'
  const title = note ? `考據：${note}` : `想像圖 · ${name}`
  const cls =
    size === 'lg'
      ? 'person-portrait person-portrait--lg'
      : size === 'md'
        ? 'person-portrait person-portrait--md'
        : 'person-portrait'

  return (
    <span className={cls} title={title}>
      {src && !failed ? (
        <img
          src={src}
          alt={`想像圖 · ${name}`}
          width={1024}
          height={1024}
          decoding="async"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="person-portrait__initial" aria-hidden>
          {initial}
        </span>
      )}
    </span>
  )
}
