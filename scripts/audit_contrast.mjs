#!/usr/bin/env node
/**
 * audit_contrast.mjs — 深／淺兩主題對比度與地圖浮層／色塊結構閘門。
 *
 * 為什麼需要：
 * 1. 深／淺主題文字色對底色：色值調淺一號在開發畫面裡肉眼看不出來，到了淺色
 *    底上就掉到 WCAG AA 門檻以下。
 * 2. 淺色主題地圖浮層（.map-layer-bar 等）：App.css 在淺色主題下仍於深藍海面
 *    上保留淺字 token，必須驗證這組 token 對地圖深底仍達 4.5:1。
 * 3. 勢力／路線／時代色塊（swatch）：淺色面板（rgba(255, 252, 246, 0.94) 疊在
 *    --bg-deep #efe8da 上 ＝ #fefaf2）上的色塊必須達 WCAG 1.4.11 圖形對比
 *    >= 3.0:1，且 .power-board__swatch 等必須有淺色主題深色外框（不可留白框）。
 * 4. 領地填色於地圖底色採樣：以 fillOpacity 0.62 疊加於深海（#1b2838）、中度
 *    地形（#5a5040）與淺紙底（#f6f1e6），驗證淺紙面上填色可辨（>= 1.5:1）且
 *    領地標籤（#f0e6d0 字面配 #1a1810 外描邊）於三種底色均達 >= 3.0:1。
 *
 * 計算方式：WCAG 2.x 相對亮度公式（sRGB 線性化後加權），對比度取
 * (L1 + 0.05) / (L2 + 0.05)，範圍 1:1 至 21:1。
 *
 * 色塊掃描範圍：遞迴掃描 src/ 內所有 .ts／.tsx／.js／.mjs 檔的 `color: '#xxxxxx'`
 * 字面量（排除僅繪製於深色浮雕底圖、不上淺色面板的 src/geo/rivers.ts）。
 *
 * 跑法：node scripts/audit_contrast.mjs [--teeth]
 *   --teeth 在記憶體中注入：
 *     - 深／淺主題 --ink-muted 換成與 --bg 同色
 *     - 淺色地圖浮層 --ink-muted 換成 #0f1724
 *     - 勢力／路線／時代色塊注入淺色 #d8d2c5
 *   末行輸出 `audit:contrast --teeth — 失敗 N 項`，scripts/gate-ci.mjs 以之為指標，
 *   改格式要一起改那邊。
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

// --files-root 讓副本（暫存目錄）仍讀到真正的 CSS／src，做法同 audit_mobile_css.mjs。
const PREFIX = '--files-root='
const flag = process.argv.find((a) => a.startsWith(PREFIX)) ?? ''
const ROOT = flag.slice(PREFIX.length) || join(import.meta.dirname, '..')

const BG_VARS = ['--bg', '--bg-deep']
const TEXT_VARS = ['--ink', '--ink-muted', '--accent', '--accent-dim']
const OTHER_VARS = ['--line']
const ALL_VARS = [...BG_VARS, ...TEXT_VARS, ...OTHER_VARS]
const TEXT_FLOOR = 4.5
const SWATCH_FLOOR = 3.0
const FILL_DISTINGUISH_FLOOR = 1.5
const TERRITORY_FILL_OPACITY = 0.62

// 僅繪製於地形圖面、不出現在淺色面板圖例的檔案不納入色塊掃描。
const SWATCH_EXCLUDE = new Set(['src/geo/rivers.ts'])

const MAP_OVERLAY_SELECTOR = "html[data-theme='light'] .map-layer-bar"
const LIGHT_SWATCH_BORDER_SELECTORS = [
  "html[data-theme='light'] .power-board__swatch",
  "html[data-theme='light'] .faction-situation__swatch",
  "html[data-theme='light'] .person-swatch",
]

const RELIEF_SURFACES = [
  { label: '深海 #1b2838', hex: '#1b2838', checkDistinguish: false },
  { label: '中度地形 #5a5040', hex: '#5a5040', checkDistinguish: false },
  { label: '淺紙底 #f6f1e6', hex: '#f6f1e6', checkDistinguish: true },
]

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

function selectorMatches(ruleSelector, target) {
  return ruleSelector
    .split(',')
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .includes(target)
}

/** 依層疊順序合併指定選擇器的宣告（自訂屬性或一般屬性）；後出現覆蓋先前者。 */
function readDeclarations(sources) {
  const decls = {}
  let matchedRules = 0
  for (const [file, selector] of sources) {
    const css = stripComments(readFileSync(join(ROOT, file), 'utf8'))
    for (const r of rules(css)) {
      if (!selectorMatches(r.selector, selector)) continue
      matchedRules++
      for (const m of r.body.matchAll(/([\w-]+)\s*:\s*([^;}]+)/g)) {
        decls[m[1].trim()] = m[2].trim()
      }
    }
  }
  return { decls, matchedRules }
}

/** 依層疊順序合併指定選擇器的自訂屬性；後出現的檔覆蓋先前者。 */
function readVars(sources) {
  const { decls } = readDeclarations(sources)
  const vars = {}
  for (const [k, v] of Object.entries(decls)) {
    if (k.startsWith('--')) vars[k] = v
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
  for (const b of blind) fails.push(`盲區 ${b}`)
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

/** 檢查淺色主題下地圖浮層（.map-layer-bar 等）token 對深色海面／深底的對比度。 */
function evaluateMapOverlay(darkVars, overrideVars = {}) {
  const { decls, matchedRules } = readDeclarations([['src/App.css', MAP_OVERLAY_SELECTOR]])
  const merged = { ...decls, ...overrideVars }
  const rows = []
  const fails = []
  const blind = []

  if (!matchedRules) {
    fails.push(`找不到 ${MAP_OVERLAY_SELECTOR} 規則`)
    return { rows, fails, blind }
  }

  const mapBackdrops = [
    ['地圖海面 #0f1724', parseColor('#0f1724')],
    ['深色 --bg-deep', parseColor(darkVars['--bg-deep'])],
  ]

  for (const [bLabel, bColor] of mapBackdrops) {
    if (!bColor) {
      blind.push(`${bLabel}：無法解析`)
      fails.push(`盲區 ${bLabel}：無法解析`)
      continue
    }
    for (const t of TEXT_VARS) {
      const raw = merged[t]
      const c = parseColor(raw)
      if (!c) {
        const msg = raw === undefined ? `${t}：未定義` : `${t}：${raw}`
        blind.push(msg)
        fails.push(`盲區 ${msg}`)
        continue
      }
      const fg = composite(c, bColor)
      const ratio = contrast(fg.rgb, bColor.rgb)
      const ok = ratio >= TEXT_FLOOR
      rows.push({ text: t, bg: bLabel, hex: toHex(fg.rgb), ratio, ok })
      if (!ok) fails.push(`${t} (${toHex(fg.rgb)}) / ${bLabel}：${ratio.toFixed(2)}:1 < ${TEXT_FLOOR}:1`)
    }
  }
  return { rows, fails, blind }
}

function walkSourceFiles(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walkSourceFiles(abs))
    else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) out.push(abs)
  }
  return out.sort()
}

/** 掃描 src/ 內勢力／路線／時代的 color: '#xxxxxx' 字面量（排除純浮雕線段 src/geo/rivers.ts）。 */
function collectSwatchColors() {
  const items = []
  const srcRoot = join(ROOT, 'src')
  for (const abs of walkSourceFiles(srcRoot)) {
    const rel = relative(ROOT, abs).replace(/\\/g, '/')
    if (SWATCH_EXCLUDE.has(rel)) continue
    const lines = readFileSync(abs, 'utf8').split('\n')
    lines.forEach((rawLine, idx) => {
      const code = rawLine.replace(/\/\/.*$/, '')
      for (const m of code.matchAll(/\bcolor\s*:\s*['"](#[0-9a-fA-F]{3,6})['"]/g)) {
        items.push({ file: rel, line: idx + 1, hex: m[1] })
      }
    })
  }
  return items
}

/** 計算淺色面板實色底色（rgba(255, 252, 246, 0.94) 疊在淺色 --bg-deep 上 ＝ #fefaf2）。 */
function resolveLightPanelBg(lightVars) {
  const deep = parseColor(lightVars['--bg-deep'])
  const { decls, matchedRules } = readDeclarations([['src/App.css', "html[data-theme='light'] .power-board"]])
  const panelRaw = decls.background || decls['background-color']
  const panel = parseColor(panelRaw)
  if (!deep || !matchedRules || !panel) return null
  return composite(panel, deep)
}

/** 從 CSS 宣告值中擷取最後一個顏色（例如 box-shadow: 0 0 0 1px rgba(...) 或 border: 1px solid #...）。 */
function extractBorderColor(decl) {
  if (!decl) return null
  const m = decl.match(/(rgba?\([^)]+\)|#[0-9a-fA-F]{3,6})/)
  return m ? parseColor(m[1]) : null
}

function evaluateSwatches(lightVars, injectedSwatches = []) {
  const fails = []
  const panelBg = resolveLightPanelBg(lightVars)
  if (!panelBg) {
    fails.push('無法解析淺色面板底色（html[data-theme=\'light\'] .power-board 或 --bg-deep）')
    return { panelHex: '未定', borderResults: [], swatches: [], fails, minRatio: 0 }
  }
  const panelHex = toHex(panelBg.rgb)

  // 1. 檢查淺色主題色塊外框規則（不可只留深色主題的白色陰影在白底上）。
  const borderResults = []
  for (const sel of LIGHT_SWATCH_BORDER_SELECTORS) {
    const { decls, matchedRules } = readDeclarations([['src/App.css', sel]])
    if (!matchedRules) {
      borderResults.push({ sel, ok: false, note: '缺少淺色主題外框規則' })
      fails.push(`缺少 ${sel} 淺色外框規則`)
      continue
    }
    const rawBorder = decls['box-shadow'] || decls['border-color'] || decls.border
    const borderCol = extractBorderColor(rawBorder)
    if (!borderCol) {
      borderResults.push({ sel, ok: false, note: `無法解析外框色：${rawBorder ?? '未定義'}` })
      fails.push(`${sel} 外框色無法解析`)
      continue
    }
    const compBorder = composite(borderCol, panelBg)
    const ratio = contrast(compBorder.rgb, panelBg.rgb)
    const darkerThanPanel = luminance(compBorder.rgb) < luminance(panelBg.rgb)
    const ok = darkerThanPanel && ratio >= SWATCH_FLOOR
    borderResults.push({ sel, ok, ratio, hex: toHex(compBorder.rgb) })
    if (!ok) {
      fails.push(`${sel} 外框對淺底對比不足：${toHex(compBorder.rgb)} / ${panelHex} = ${ratio.toFixed(2)}:1 < ${SWATCH_FLOOR}:1`)
    }
  }

  // 2. 掃描所有色塊顏色對淺色面板 #fefaf2 的圖形對比（WCAG 1.4.11 >= 3.0:1）。
  const swatches = [...collectSwatchColors(), ...injectedSwatches]
  if (!swatches.length) {
    fails.push('未掃描到任何色塊 color 定義（掃描路徑或正則退化）')
  }
  let minRatio = Infinity
  for (const s of swatches) {
    const c = parseColor(s.hex)
    if (!c) {
      fails.push(`${s.file}:${s.line} 無法解析色值 ${s.hex}`)
      continue
    }
    const fg = composite(c, panelBg)
    const ratio = contrast(fg.rgb, panelBg.rgb)
    s.panelRatio = ratio
    if (ratio < minRatio) minRatio = ratio
    if (ratio < SWATCH_FLOOR) {
      fails.push(`色塊 ${s.hex}（${s.file}:${s.line}）對淺底 ${panelHex} 對比 ${ratio.toFixed(2)}:1 < ${SWATCH_FLOOR}:1`)
    }
  }

  return {
    panelHex,
    borderResults,
    swatches,
    fails,
    minRatio: Number.isFinite(minRatio) ? minRatio : 0,
  }
}

/** 驗證領地填色（fillOpacity 0.62）於代表性底色上的可辨度與標籤文字可讀性。 */
function evaluateTerritoryFills(swatches) {
  const fails = []
  const labelFill = parseColor('#f0e6d0')
  const labelStroke = parseColor('#1a1810')
  let minDistinguish = Infinity
  let minLabelRatio = Infinity

  for (const s of swatches) {
    const c = parseColor(s.hex)
    if (!c) continue
    const fillLayer = { rgb: c.rgb, a: TERRITORY_FILL_OPACITY }
    for (const surf of RELIEF_SURFACES) {
      const bg = parseColor(surf.hex)
      const filled = composite(fillLayer, bg)
      if (surf.checkDistinguish) {
        const dist = contrast(filled.rgb, bg.rgb)
        if (dist < minDistinguish) minDistinguish = dist
        if (dist < FILL_DISTINGUISH_FLOOR) {
          fails.push(
            `領地填色 ${s.hex}（${s.file}:${s.line}）於 ${surf.label}（α=${TERRITORY_FILL_OPACITY}）僅 ${dist.toFixed(2)}:1 < ${FILL_DISTINGUISH_FLOOR}:1`,
          )
        }
      }
      // 領地標籤為淺米白填字配深褐外描邊（paintOrder="stroke"），兩者擇優須達 >= 3.0:1。
      const bestLabel = Math.max(contrast(labelFill.rgb, filled.rgb), contrast(labelStroke.rgb, filled.rgb))
      if (bestLabel < minLabelRatio) minLabelRatio = bestLabel
      if (bestLabel < SWATCH_FLOOR) {
        fails.push(
          `領地標籤於 ${s.hex} 疊 ${surf.label}（${s.file}:${s.line}）最高對比 ${bestLabel.toFixed(2)}:1 < ${SWATCH_FLOOR}:1`,
        )
      }
    }
  }

  return {
    checked: swatches.length,
    minDistinguish: Number.isFinite(minDistinguish) ? minDistinguish : 0,
    minLabelRatio: Number.isFinite(minLabelRatio) ? minLabelRatio : 0,
    fails,
  }
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

function printMapOverlay(res) {
  console.log('淺色地圖浮層（html[data-theme=\'light\'] .map-layer-bar）')
  for (const r of res.rows) {
    const mark = r.ok ? '✓' : '✗'
    console.log(`  ${mark} ${r.text.padEnd(12)} ${r.hex} ／ ${r.bg.padEnd(16)} ${r.ratio.toFixed(2)}:1（門檻 ${TEXT_FLOOR}）`)
  }
  for (const b of res.blind) console.log(`  ! 無法解析（不算合格）：${b}`)
}

function printSwatches(swatchRes, fillRes) {
  console.log(`淺色色塊對比（底色 ${swatchRes.panelHex}，共 ${swatchRes.swatches.length} 處）`)
  for (const b of swatchRes.borderResults) {
    if (b.ratio !== undefined) {
      console.log(`  ${b.ok ? '✓' : '✗'} 外框 ${b.sel}（${b.hex}）：${b.ratio.toFixed(2)}:1（門檻 ${SWATCH_FLOOR}）`)
    } else {
      console.log(`  ✗ 外框 ${b.sel}：${b.note}`)
    }
  }
  const swatchOk = swatchRes.fails.filter((f) => f.startsWith('色塊 ')).length === 0
  console.log(
    `  ${swatchOk ? '✓' : '✗'} 色塊最低對比度：${swatchRes.minRatio.toFixed(2)}:1（門檻 ${SWATCH_FLOOR}）`,
  )
  console.log(
    `領地填色與標籤（α=${TERRITORY_FILL_OPACITY}，採樣 ${RELIEF_SURFACES.map((s) => s.label).join('／')}）`,
  )
  console.log(
    `  ${fillRes.minDistinguish >= FILL_DISTINGUISH_FLOOR ? '✓' : '✗'} 淺紙底 #f6f1e6 填色辨識最低：${fillRes.minDistinguish.toFixed(2)}:1（門檻 ${FILL_DISTINGUISH_FLOOR}）`,
  )
  console.log(
    `  ${fillRes.minLabelRatio >= SWATCH_FLOOR ? '✓' : '✗'} 領地標籤（#f0e6d0＋#1a1810 描邊）最低：${fillRes.minLabelRatio.toFixed(2)}:1（門檻 ${SWATCH_FLOOR}）`,
  )
}

if (process.argv.includes('--teeth')) {
  // 注入原始缺陷：只改記憶體，確認各項規則都會抓到。
  let bad = 0
  const themes = themeVars()
  const darkVars = themes[0][1]
  const lightVars = themes[1][1]

  for (const [label, vars] of themes) {
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

  // 注入淺色地圖浮層深字缺陷：--ink-muted 改為海面色 #0f1724。
  const overlayRes = evaluateMapOverlay(darkVars, { '--ink-muted': '#0f1724' })
  const overlayCaught = overlayRes.fails.filter((f) => f.startsWith('--ink-muted'))
  const overlayHit = overlayCaught.length > 0
  console.log(
    `  ${overlayHit ? '✓' : '✗'} 淺色地圖浮層：--ink-muted 改為 #0f1724 後${
      overlayHit ? ` 抓到 ${overlayCaught.length} 項` : ' 沒被抓到'
    }`,
  )
  if (!overlayHit) bad++

  // 注入淺色色塊 #d8d2c5，確認淺色面板對比（< 3.0）與淺紙領地填色辨識（< 1.5）均可抓到。
  const paleTooth = { file: '<teeth-inject>', line: 1, hex: '#d8d2c5' }
  const swatchRes = evaluateSwatches(lightVars, [paleTooth])
  const swatchCaught = swatchRes.fails.filter((f) => f.includes('#d8d2c5'))
  const fillRes = evaluateTerritoryFills([paleTooth])
  const fillCaught = fillRes.fails.filter((f) => f.includes('#d8d2c5'))
  const paleHit = swatchCaught.length > 0 && fillCaught.length > 0
  console.log(
    `  ${paleHit ? '✓' : '✗'} 淺色色塊 #d8d2c5 注入：面板抓到 ${swatchCaught.length} 項、淺紙領地抓到 ${fillCaught.length} 項`,
  )
  if (!paleHit) bad++

  // 指標行永遠打印（gate-ci 對「抽不到數字」當失敗），要改格式就一起改那邊。
  console.log(`audit:contrast --teeth — 失敗 ${bad} 項`)
  process.exit(bad ? 1 : 0)
}

const rawThemes = themeVars()
const darkVars = rawThemes[0][1]
const lightVars = rawThemes[1][1]
const themes = rawThemes.map(([label, vars]) => ({ label, res: evaluate(vars) }))
const overlayRes = evaluateMapOverlay(darkVars)
const swatchRes = evaluateSwatches(lightVars)
const fillRes = evaluateTerritoryFills(swatchRes.swatches)

for (const t of themes) {
  printTheme(t.label, t.res)
  console.log('')
}
printMapOverlay(overlayRes)
console.log('')
printSwatches(swatchRes, fillRes)
console.log('')

const groups = [
  ...themes.map((t) => ({ label: t.label, fails: t.res.fails })),
  { label: '地圖浮層', fails: overlayRes.fails },
  { label: '色塊', fails: swatchRes.fails },
  { label: '領地填色', fails: fillRes.fails },
]
const total = groups.reduce((n, g) => n + g.fails.length, 0)
if (total) {
  console.error('不合格組合：')
  for (const g of groups) {
    for (const f of g.fails) console.error(`  [${g.label}] ${f}`)
  }
}
const detail = groups.map((g) => `${g.label} ${g.fails.length}`).join('／')
console.log(`audit:contrast — 不合格 ${total} 項（${detail}）`)
process.exit(total ? 1 : 0)
