#!/usr/bin/env node
/**
 * audit_contrast.mjs — 深／淺兩主題「文字色對底色」的結構閘門。
 *
 * 為什麼需要：淺色主題的字看不清是已經修過一次的真實缺陷，但修完沒有任何
 * 檢查會擋住下一次退化。色值調一個位元組（例如 --ink-muted 調淺一號）在
 * 開發畫面裡肉眼看不出來，到了淺色底上就掉到 WCAG AA 門檻以下。本閘門把
 * 「token 對 token 的對比度」變成可重跑、可比較基線的數字。
 *
 * 計算方式：WCAG 2.x 相對亮度公式（sRGB 線性化後加權），對比度取
 * (L1 + 0.05) / (L2 + 0.05)，範圍 1:1 至 21:1。
 *
 * 檢查組合：--ink、--ink-muted、--accent、--accent-dim 各自對 --bg 與
 * --bg-deep，共 4 文字色 × 2 底色 × 2 主題 = 16 組。
 *
 * 門檻一律 4.5:1（正文級），包含 --accent-dim：grep 實測它在 src 有 30 處
 * `color:` 用法（未選中的時代按鈕、年代標籤、圖例小字、面板輔助說明），
 * 只有 9 處是邊框與裝飾線，所以它是文字色而非裝飾色，不適用 3.0:1 的放寬。
 * 若日後真的把它改作純裝飾用色，才考慮降為 3.0:1，並在此寫明依據。
 *
 * --line 只做邊框與分隔線，不在文字組合裡；但它寫成 rgba()，本閘門仍解析
 * 並疊到 --bg 上列印，讓「rgba 先疊底色」這條路徑一直有東西可驗證。
 * 另註：App.css 對地圖浮層（.map-layer-bar、.map-2d__zoom-btn 等）在淺色主題
 * 下刻意保留深色 token，那組文字壓在地圖底色上、不是壓在 --bg 上，故不列入
 * 本矩陣；要驗那一組得先取得地圖底色，屬於另一件事。
 *
 * 解析支援：#rgb、#rrggbb、rgb()、rgba()（rgba 先疊在 --bg 上）。其餘
 * （hsl()、具名色、含 var() 的值）一律跳過並列在輸出裡 —— 解析不到絕不
 * 當合格，而是當成盲區讓人人看得見。
 *
 * 跑法：node scripts/audit_contrast.mjs [--teeth]
 *   --teeth 把 --ink-muted 在記憶體中換成與 --bg 同色（對比 1:1），確認兩個
 *   主題都會報不合格，防止閘門退化成永遠綠的橡皮章。末行輸出
 *   `audit:contrast --teeth — 失敗 N 項`，scripts/gate-ci.mjs 以之為指標，
 *   改格式要一起改那邊。
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// --files-root 讓副本（暫存目錄）仍讀到真正的 CSS，做法同 audit_mobile_css.mjs。
const PREFIX = '--files-root='
const flag = process.argv.find((a) => a.startsWith(PREFIX)) ?? ''
const ROOT = flag.slice(PREFIX.length) || join(import.meta.dirname, '..')

const BG_VARS = ['--bg', '--bg-deep']
const TEXT_VARS = ['--ink', '--ink-muted', '--accent', '--accent-dim']
const OTHER_VARS = ['--line']
const ALL_VARS = [...BG_VARS, ...TEXT_VARS, ...OTHER_VARS]
const TEXT_FLOOR = 4.5

/** 深色 token 的預設值在 src/index.css 的 :root；淺色覆寫在 src/App.css。
 *  兩個主題都按真實載入順序讀取，所以 App.css 後段的 :root 也能補足
 *  index.css 沒定義的 token（等同瀏覽器的層疊結果）。 */
const DARK_SOURCES = [
  ['src/index.css', ':root'],
  ['src/App.css', ':root'],
]
const LIGHT_SOURCE = [['src/App.css', "html[data-theme='light']"]]

function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, '')
}

/** 掃出頂層規則。自己做是因為要能區分「選擇器」與「規則內容」：註釋裡也寫過
 *  html[data-theme='light']，直接正則掃全文會把說明文字當成 token 區塊。 */
function rules(css) {
  const out = []
  let i = 0
  let selStart = 0
  while (i < css.length) {
    if (css[i] === ';') {
      // 頂層語句（例如 @import）沒有大括號，要把它從下一段選擇器裡剔掉，
      // 否則 index.css 開頭的 @import 會和隨後的 :root 黏成一個選擇器。
      selStart = i + 1
      i++
      continue
    }
    if (css[i] !== '{') {
      i++
      continue
    }
    const selector = css.slice(selStart, i).replace(/\s+/g, ' ').trim()
    let depth = 1
    let j = i + 1
    while (j < css.length && depth > 0) {
      if (css[j] === '{') depth++
      else if (css[j] === '}') depth--
      j++
    }
    const body = css.slice(i + 1, j - 1)
    if (!selector.startsWith('@')) out.push({ selector, body })
    i = j
    selStart = j
  }
  return out
}

/** 依層疊順序合併指定選擇器的自訂屬性；後出現的檔覆蓋先前者。 */
function readVars(sources) {
  const vars = {}
  for (const [file, selector] of sources) {
    const css = stripComments(readFileSync(join(ROOT, file), 'utf8'))
    for (const r of rules(css)) {
      if (r.selector !== selector) continue
      for (const m of r.body.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) {
        vars[m[1]] = m[2].trim()
      }
    }
  }
  return vars
}

/** 回傳 { rgb: [r,g,b], a }；解析不了回 null，由呼叫方列入盲區清單。 */
function parseColor(raw) {
  if (!raw) return null
  const s = raw.trim().toLowerCase().replace(/\s+/g, ' ')
  let m = /^#([0-9a-f]{3})$/.exec(s)
  if (m) return { rgb: m[1].split('').map((c) => parseInt(c + c, 16)), a: 1 }
  m = /^#([0-9a-f]{6})$/.exec(s)
  if (m) {
    const hex = m[1]
    const rgb = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16))
    return { rgb, a: 1 }
  }
  m = /^rgba?\(([^)]*)\)$/.exec(s)
  if (m) {
    const parts = m[1].split(/[\s,/]+/).filter(Boolean).map(Number)
    if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return null
    const [r, g, b] = parts
    if ([r, g, b].some((n) => n < 0 || n > 255)) return null
    const a = parts.length >= 4 ? parts[3] : 1
    if (!(a >= 0 && a <= 1)) return null
    return { rgb: [r, g, b], a }
  }
  return null
}

/** 半透明色要先疊在實色底色上，才看得見真實對比。 */
function composite(fg, bg) {
  if (fg.a >= 1) return fg
  const a = fg.a
  const rgb = fg.rgb.map((c, i) => Math.round(a * c + (1 - a) * bg.rgb[i]))
  return { rgb, a: 1 }
}

const toLinear = (v) => {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function luminance(rgb) {
  const [r, g, b] = rgb
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

function contrast(a, b) {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

function toHex(rgb) {
  const clamped = rgb.map((n) => Math.max(0, Math.min(255, n)))
  return '#' + clamped.map((n) => n.toString(16).padStart(2, '0')).join('')
}

/** 算出一個主題的對比度矩陣；回傳列、不合格項與無法解析的 token。 */
function evaluate(vars) {
  const colors = {}
  const blind = []
  for (const name of ALL_VARS) {
    const raw = vars[name]
    const c = parseColor(raw)
    if (c) colors[name] = c
    else blind.push(raw === undefined ? `${name}：未定義` : `${name}：${raw}`)
  }
  const bg = colors['--bg']
  if (bg) {
    for (const name of Object.keys(colors)) {
      if (name !== '--bg') colors[name] = composite(colors[name], bg)
    }
  }

  const rows = []
  const fails = []
  for (const t of TEXT_VARS) {
    for (const b of BG_VARS) {
      // 解析失敗的 token 已在上面列入盲區清單，這裡只算算得出的組合。
      if (!colors[t] || !colors[b]) continue
      const ratio = contrast(colors[t].rgb, colors[b].rgb)
      const ok = ratio >= TEXT_FLOOR
      rows.push({ text: t, bg: b, ratio, ok })
      if (!ok) fails.push(`${t} / ${b}：${ratio.toFixed(2)}:1 < ${TEXT_FLOOR}:1`)
    }
  }
  return { colors, rows, fails, blind }
}

function themeVars() {
  const dark = readVars(DARK_SOURCES)
  const light = { ...dark, ...readVars(LIGHT_SOURCE) }
  return [
    ['深色', dark],
    ['淺色', light],
  ]
}

function printTheme(label, res) {
  console.log(`${label}主題`)
  const tokens = ALL_VARS.filter((n) => res.colors[n]).map(
    (n) => `${n} ${toHex(res.colors[n].rgb)}`,
  )
  for (let i = 0; i < tokens.length; i += 3) {
    console.log(`${i ? '  ' : '  token：'}${tokens.slice(i, i + 3).join('、')}`)
  }
  for (const r of res.rows) {
    const mark = r.ok ? '✓' : '✗'
    const pair = `${r.text.padEnd(12)}／ ${r.bg.padEnd(10)}`
    console.log(`  ${mark} ${pair}${r.ratio.toFixed(2)}:1（門檻 ${TEXT_FLOOR}）`)
  }
  for (const b of res.blind) console.log(`  ! 無法解析（不算合格）：${b}`)
}

if (process.argv.includes('--teeth')) {
  // 注入原始缺陷：把 --ink-muted 換成與 --bg 同色（對比 1:1）。只改記憶體。
  let bad = 0
  for (const [label, vars] of themeVars()) {
    if (vars['--ink-muted'] === vars['--bg']) {
      console.log(`  ✗ ${label}：注入無效（--ink-muted 已與 --bg 同色）`)
      bad++
      continue
    }
    const res = evaluate({ ...vars, '--ink-muted': vars['--bg'] })
    const caught = res.fails.filter((f) => f.startsWith('--ink-muted'))
    const hit = caught.length > 0
    console.log(
      `  ${hit ? '✓' : '✗'} ${label}：--ink-muted 疊成 --bg 後${
        hit ? ` 抓到 ${caught.length} 項` : ' 沒被抓到'
      }（該主題共報 ${res.fails.length} 項）`,
    )
    if (!hit) bad++
  }
  // 指標行永遠打印（gate-ci 對「抽不到數字」當失敗），要改格式就一起改那邊。
  console.log(`audit:contrast --teeth — 失敗 ${bad} 項`)
  process.exit(bad ? 1 : 0)
}

const themes = []
for (const [label, vars] of themeVars()) {
  themes.push({ label, res: evaluate(vars) })
}
for (const t of themes) {
  printTheme(t.label, t.res)
  console.log('')
}
const total = themes.reduce((n, t) => n + t.res.fails.length, 0)
if (total) {
  console.error('不合格組合：')
  for (const t of themes) {
    for (const f of t.res.fails) console.error(`  ${t.label} ${f}`)
  }
}
const detail = themes.map((t) => `${t.label} ${t.res.fails.length}`).join('／')
console.log(`audit:contrast — 不合格 ${total} 項（${detail}）`)
process.exit(total ? 1 : 0)
