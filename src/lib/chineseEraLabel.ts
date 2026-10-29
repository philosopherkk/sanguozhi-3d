/**
 * Approximate Chinese reign / era labels for the Three Kingdoms window.
 * Prefer 資治通鑑紀年習慣；邊界年號以通說為準，僅供 UI 提示。
 */

interface EraSpan {
  from: number
  to: number
  label: string
}

const SPANS: EraSpan[] = [
  { from: 184, to: 189, label: '漢中平／初平' },
  { from: 190, to: 193, label: '漢初平' },
  { from: 194, to: 195, label: '漢興平' },
  { from: 196, to: 219, label: '漢建安' },
  { from: 220, to: 226, label: '魏黃初' },
  { from: 227, to: 232, label: '魏太和' },
  { from: 233, to: 236, label: '魏青龍' },
  { from: 237, to: 239, label: '魏景初' },
  { from: 240, to: 248, label: '魏正始' },
  { from: 249, to: 253, label: '魏嘉平' },
  { from: 254, to: 255, label: '魏正元' },
  { from: 256, to: 259, label: '魏甘露' },
  { from: 260, to: 263, label: '魏景元' },
  { from: 264, to: 265, label: '魏咸熙' },
  { from: 266, to: 274, label: '晉泰始' },
  { from: 275, to: 279, label: '晉咸寧' },
  { from: 280, to: 280, label: '晉太康' },
]

/** e.g. 208 → 「漢建安十三年」近似（建安元年＝196） */
export function chineseEraLabel(year: number): string | null {
  const span = SPANS.find((s) => year >= s.from && year <= s.to)
  if (!span) return null

  if (year >= 196 && year <= 219) {
    const n = year - 195
    return `漢建安${toCnOrdinal(n)}年`
  }
  if (year >= 220 && year <= 226) {
    const n = year - 219
    return `魏黃初${toCnOrdinal(n)}年`
  }
  if (year === 280) return '晉太康元年'
  return span.label
}

function toCnOrdinal(n: number): string {
  const map = [
    '元',
    '二',
    '三',
    '四',
    '五',
    '六',
    '七',
    '八',
    '九',
    '十',
    '十一',
    '十二',
    '十三',
    '十四',
    '十五',
    '十六',
    '十七',
    '十八',
    '十九',
    '二十',
    '二十一',
    '二十二',
    '二十三',
    '二十四',
  ]
  return map[n - 1] ?? String(n)
}
