#!/usr/bin/env node
/**
 * audit_mobile_css.mjs — 流動版樣式的結構閘門。
 *
 * 這不是視覺測試（本專案沒有瀏覽器自動化依賴），而是「結構不變量」檢查：
 * 每條規則都對應一個本專案真實發生過、而且肉眼看不出來的缺陷。
 *
 *  1 blowout        .app-shell > * 必須有 min-width: 0
 *                   實測：393px 螢幕上 grid item 的 min-content 把整欄撑到 421px，
 *                   overflow:hidden 再把右側 28px 永久剪掉。
 *  2 mapside-stack  窄屏把主區改單欄時，必須同時覆蓋 .app-shell__main--map-side
 *                   實測：640px 的單欄規則只寫在 .app-shell__main 上，而掛側欄的
 *                   時代用的是 --map-side class，其 859px 兩欄規則位置較後、特異度
 *                   相同 → 手機上側欄被壓成 147px 窄條，從未生效。
 *  3 safe-area      貼底元素必須引用安全區，否則被 iPhone 主頁指示條壓住
 *                   實測：全 repo 原本零個 env(safe-area-inset-*)。
 *  4 bare-vh        .app-shell 高度必須用 dvh（行動瀏覽器地址欄會吃掉 vh）
 *  5 tap-min        主要控件在窄屏必須補到 ≥40px 按擊區
 *
 * 跑法：node scripts/audit_mobile_css.mjs [--teeth]
 *   --teeth 會把每個缺陷重新注入記憶體中的 CSS，確認規則真的會報（防止閘門
 *         退化成永遠綠的橡皮章）。
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const FILES = ['src/mobile.css', 'src/App.css']

/**
 * 把 CSS 拆成扁平規則清單。自己做是因為要能區分「選擇器」與「區塊內容」，
 * 用正則掃全文會把註釋裡的 class 名當成真實規則（本檔註釋就提過
 * .app-shell__main--map-side，掃全文會造成假通過）。
 */
function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, '')
}

function parseRules(css, media = null, out = []) {
  let i = 0
  let selStart = 0
  while (i < css.length) {
    if (css[i] === '{') {
      const selector = css.slice(selStart, i).replace(/\s+/g, ' ').trim()
      let depth = 1
      let j = i + 1
      while (j < css.length && depth > 0) {
        if (css[j] === '{') depth++
        else if (css[j] === '}') depth--
        j++
      }
      const body = css.slice(i + 1, j - 1)
      if (selector.startsWith('@media')) {
        parseRules(body, selector, out)
      } else if (!selector.startsWith('@')) {
        out.push({ media, selector, body })
      }
      i = j
      selStart = j
    } else {
      i++
    }
  }
  return out
}

function mediaMaxW(media) {
  if (!media) return Infinity
  const m = /max-width:\s*(\d+)px/.exec(media)
  return m ? Number(m[1]) : Infinity
}

function declOf(body, prop) {
  const re = new RegExp('(?:^|;|\\s)' + prop + '\\s*:\\s*([^;}]+)')
  const m = re.exec(body)
  return m ? m[1].trim() : null
}

/** selector 是否命中某個 class（按整個 token 比對，避免子字串誤判） */
function selHas(rule, cls) {
  return rule.selector.split(',').some((s) => new RegExp('\\.' + cls + '(?![\\w-])').test(s))
}

/** 收集 :root 自訂屬性，讓 var(--x) 能被解析成實際數值（否則 44px 檢查形同虛設） */
function collectVars(rules) {
  const map = {}
  for (const r of rules) {
    if (r.selector.trim() !== ':root') continue
    for (const m of r.body.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) {
      map[m[1]] = m[2].trim()
    }
  }
  return map
}

function resolveVar(value, vars) {
  if (!value) return value
  return value.replace(/var\((--[\w-]+)\)/g, (_, name) => vars[name] ?? '0')
}

/** 同一 selector 可能有多條規則（mobile.css 只補 padding，App.css 才設高度），
 *  必須全部看；否則前者會遮掉後者的 dvh 而誤報。 */
function declAny(rules, selectorIs, prop, vars) {
  const vals = rules
    .filter((r) => selectorIs(r))
    .map((r) => resolveVar(declOf(r.body, prop), vars))
    .filter(Boolean)
  return vals
}

function check(css) {
  const rules = parseRules(stripComments(css))
  const vars = collectVars(rules)
  const fails = []
  const narrow = (r) => r.media && mediaMaxW(r.media) <= 760

  // 1 爆框
  const blow = rules.some(
    (r) =>
      !r.media &&
      /(^|\s|>)\.app-shell\s*>\s*\*/.test(r.selector) &&
      declOf(r.body, 'min-width') === '0',
  )
  if (!blow) fails.push('blowout')

  // 2 側欄時代沒被改成單欄／堆疊
  //   認三種等價寫法：單欄 grid、display:block、flex 直向。
  //   只認 grid-template-columns 會讓「改成 block 滾動翻頁」這種正確做法誤報。
  const stacksTo1col = (cls) =>
    rules.some(
      (r) =>
        narrow(r) &&
        selHas(r, cls) &&
        (/(^|\D)1fr(\D|$)/.test(declOf(r.body, 'grid-template-columns') ?? '') ||
          declOf(r.body, 'display') === 'block' ||
          declOf(r.body, 'flex-direction') === 'column'),
    )
  if (stacksTo1col('app-shell__main') && !stacksTo1col('app-shell__main--map-side')) {
    fails.push('mapside-stack')
  }

  // 2b 地圖下方的內容必須翻得到：主區要有垂直整屏翻頁（或等價的可滾動容器）
  const pager = rules.some(
    (r) =>
      narrow(r) &&
      selHas(r, 'app-shell__main') &&
      /y/.test(declOf(r.body, 'scroll-snap-type') ?? '') &&
      declOf(r.body, 'overflow-y') === 'auto',
  )
  if (!pager) fails.push('mobile-pager')

  // 3 安全區
  for (const cls of ['map-layer-bar', 'app-footer']) {
    const ok = rules.some(
      (r) => selHas(r, cls) && (/safe-area/.test(r.body) || /--safe-/.test(r.body)),
    )
    if (!ok) fails.push('safe-area:.' + cls)
  }

  // 4 dvh
  const heights = declAny(rules, (r) => r.selector.trim() === '.app-shell', 'height', vars)
  if (!heights.some((v) => /dvh/.test(v))) fails.push('bare-vh')

  // 5 按擊區
  const tapOk = (v) => {
    const rem = /(\d*\.?\d+)rem/.exec(v)
    if (rem) return parseFloat(rem[1]) >= 2.5
    const px = /(\d*\.?\d+)px/.exec(v)
    if (px) return parseFloat(px[1]) >= 40
    return false
  }
  const tap = rules.some(
    (r) =>
      narrow(r) &&
      selHas(r, 'app-header__step') &&
      declAny([r], () => true, 'min-height', vars).some(tapOk),
  )
  if (!tap) fails.push('tap-min')

  return fails
}

const css = FILES.map((f) => readFileSync(join(ROOT, f), 'utf8')).join('\n')
const base = check(css)

if (process.argv.includes('--teeth')) {
  // 逐条注入原始缺陷，確認對應規則會報紅（只改記憶體，不動檔案）
  const injections = [
    ['blowout', (s) => s.replace(/\.app-shell > \*\s*\{[^}]*\}/, '.app-shell > * { }')],
    [
      'mapside-stack',
      (s) =>
        s.replace(
          /\.app-shell__main,\s*\n?\s*\.app-shell__main--map-side,?\s*\n?\s*\.app-shell__main--map-side:has\([^)]*\)\s*\{/,
          '.app-shell__main {\n',
        ),
    ],
    ['safe-area', (s) => s.replace(/bottom: calc\(0\.45rem \+ var\(--safe-bottom\)\);/, 'bottom: 0.45rem;')],
    ['bare-vh', (s) => s.replace(/(\.app-shell \{\n\s*height: )100dvh/, '$1100vh')],
    [
      'mobile-pager',
      // 模擬有人把整屏翻頁換回不可滾動的版面（地圖下方內容再度翻不到）
      (s) =>
        s.replace(
          /display: block;\n\s*overflow-y: auto;\n\s*overscroll-behavior-y: contain;\n\s*scroll-snap-type: y mandatory;/,
          'display: grid;\n    grid-template-rows: minmax(0, 1.4fr) minmax(0, 1fr);',
        ),
    ],
    [
      'tap-min',
      // 模擬有人把全域按擊區下限調細（同時驗證 var() 解析真的在做事）
      (s) => s.replace(/--tap-min:\s*2\.75rem/, '--tap-min: 1rem'),
    ],
  ]
  let bad = 0
  for (const [name, mutate] of injections) {
    const mutated = mutate(css)
    if (mutated === css) {
      console.log(`  ? ${name}: 注入無效（原始缺陷形態已變，需更新注入樣板）`)
      bad++
      continue
    }
    const got = check(mutated)
    const caught = got.some((f) => f === name || f.startsWith(name + ':'))
    console.log(`  ${caught ? '✓' : '✗'} ${name} 注入後 ${caught ? '被抓到' : '沒被抓到'}（報出 ${got.length} 項）`)
    if (!caught) bad++
  }
  console.log(bad ? `✗ 咬合力測試 ${bad} 項失敗` : '✓ 六條規則全部有牙')
  process.exit(bad ? 1 : 0)
}

if (base.length) {
  console.error('✗ audit:mobile — 流動版結構不變量被破壞：')
  for (const f of base) console.error('  ' + f)
  console.error('（背景與實測數據見 docs/MOBILE_PLAN.md）')
  process.exit(1)
}
console.log('✓ audit:mobile — 6 項結構不變量全部成立')
