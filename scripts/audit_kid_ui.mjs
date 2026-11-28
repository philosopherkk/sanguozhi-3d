#!/usr/bin/env node
/**
 * audit_kid_ui.mjs — 簡易版「時光機」逐條驗收（靜態、唯讀、CI 無 Chrome 也能跑）。
 *
 *   node scripts/audit_kid_ui.mjs --require=<id>   單條斷言：做好 exit 0、未做 exit 1、未知 id exit 2
 *   node scripts/audit_kid_ui.mjs --list           列出全部 id 與對應檔案
 *   node scripts/audit_kid_ui.mjs --all            逐條報告（任何一條未過 exit 1）
 *   node scripts/audit_kid_ui.mjs --teeth          自測：每條的「合格樣本」要過，逐項拆掉要紅
 *
 * 工作單 docs/plans/2026-11-28/ui.md 每一行對應這裡一個 id。檢查分兩類：
 * - 元件（.tsx）：必有的寫法（token）＋禁止的寫法；`src/kid/` 元件另有共通衛生規則：
 *   不准寫死中文（字串由 strings.ts 來）、不准 emoji、不准自畫 <svg>／<path>
 *   （圖示由 icons.tsx 來）、不准自行查 `.year-scrubber`（年份經 timelineBridge）。
 * - 樣式（kid.css）：選擇器＋屬性＋最小值，`var(--kid-*)` 會展開成 px 再比；
 *   另查 kid.css 全檔：每條選擇器都要限定在簡易版內（`.kid-*`、`[data-kid…]`、
 *   `[data-ui=kid]` 或 `:root`），因為 kid.css 會打包進全站，未限定的規則會改到詳細版。
 *
 * 合格樣本（golden）由規格自動產生，`--teeth` 對每一項逐一拆掉／縮小，
 * 證明每個 id 都「改壞會紅」；teeth 有任何一項沒咬到即 exit 1。
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(import.meta.url), '..', '..')
const CSS = 'src/kid/kid.css'

// ───────────────────────── 共通工具 ─────────────────────────

function readRepo(path) {
  const abs = join(ROOT, path)
  return existsSync(abs) ? readFileSync(abs, 'utf8') : null
}

/** 去掉註解（JSX 的 {/* *\/} 也屬區塊註解）；字串中的 // 不常見於 src/kid，從簡處理。 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
}

/** src/kid 元件的共通衛生規則（strings.ts、icons.tsx、KidShell.tsx 除外）。 */
function kidHygiene(code) {
  const out = []
  const han = code.match(/.*\p{Script=Han}.*/u)
  if (han) out.push(`寫死中文（要改用 strings.ts 的 S.xxx）：${han[0].trim().slice(0, 60)}`)
  const emo = code.match(/.*\p{Extended_Pictographic}.*/u)
  if (emo) out.push(`用了 emoji 或符號圖（要改用 <Icon name>）：${emo[0].trim().slice(0, 60)}`)
  if (/<svg\b|<path\b/.test(code)) out.push('自畫 <svg>／<path>（圖示只可用 icons.tsx 的 <Icon name>）')
  if (/year-scrubber/.test(code)) out.push('直接查 .year-scrubber（年份一律經 lib/timelineBridge 的 useEraYear）')
  return out
}

// ───────────────────────── CSS 解析 ─────────────────────────

function normSel(sel) {
  return sel
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*([>+~])\s*/g, ' $1 ')
    .replace(/\[\s*([\w-]+)\s*([~|^$*]?=)\s*["']?([^\]"']*)["']?\s*\]/g, '[$1$2$3]')
}

/** 回傳 [{ media, sels: string[], decls: Map }]；支援巢狀 @media／@supports。 */
function parseCss(src) {
  const text = src.replace(/\/\*[\s\S]*?\*\//g, '')
  const out = []
  function walk(s, media) {
    let i = 0
    while (i < s.length) {
      const open = s.indexOf('{', i)
      if (open < 0) break
      const head = s.slice(i, open).trim()
      let depth = 1
      let j = open + 1
      while (j < s.length && depth > 0) {
        if (s[j] === '{') depth++
        else if (s[j] === '}') depth--
        j++
      }
      const body = s.slice(open + 1, j - 1)
      if (head.startsWith('@media') || head.startsWith('@supports')) {
        walk(body, media ? `${media} and ${head}` : head)
      } else if (!head.startsWith('@')) {
        const decls = new Map()
        for (const part of body.split(';')) {
          const k = part.indexOf(':')
          if (k < 0) continue
          decls.set(part.slice(0, k).trim().toLowerCase(), part.slice(k + 1).trim())
        }
        out.push({ media, sels: head.split(',').map(normSel), decls })
      }
      i = j
    }
  }
  walk(text, '')
  return out
}

function mediaKind(media) {
  if (!media) return 'base'
  if (/prefers-reduced-motion\s*:\s*reduce/.test(media)) return 'reduce'
  const min = media.match(/min-width\s*:\s*(\d+)px/)
  if (min && Number(min[1]) >= 1025 && !/max-width/.test(media)) return 'desktop'
  return 'other'
}

function cssVars(rules) {
  const vars = new Map()
  for (const r of rules) {
    if (r.media) continue
    for (const [k, v] of r.decls) if (k.startsWith('--')) vars.set(k, v)
  }
  return vars
}

function resolveVars(value, vars, depth = 0) {
  if (depth > 8) return value
  const next = value.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)/g, (_, name, fb) =>
    vars.has(name) ? vars.get(name) : (fb ?? ''),
  )
  return next === value ? value : resolveVars(next, vars, depth + 1)
}

function toPx(token) {
  const m = token.trim().match(/^(-?\d*\.?\d+)(px|rem)?$/)
  if (!m) return NaN
  const n = Number(m[1])
  if (m[2] === 'rem') return n * 16
  if (!m[2]) return n === 0 ? 0 : NaN
  return n
}

/** 尺寸值換成 px：支援 px／rem／var()／clamp（取下限）／max()／min()；calc 不算。 */
function lengthPx(value, vars) {
  const v = resolveVars(value, vars).trim()
  const fn = v.match(/^(clamp|max|min)\((.*)\)$/)
  if (fn) {
    const args = fn[2].split(',').map((a) => lengthPx(a, vars))
    if (fn[1] === 'clamp') return args[0]
    return fn[1] === 'max' ? Math.max(...args) : Math.min(...args)
  }
  return toPx(v)
}

/** 值中出現的最大長度（外框／陰影寬度用）。 */
function maxLengthIn(value, vars) {
  const v = resolveVars(value, vars)
  const nums = [...v.matchAll(/(-?\d*\.?\d+)(px|rem)/g)].map((m) =>
    m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]),
  )
  return nums.length ? Math.max(...nums) : NaN
}

function declsFor(rules, selRe, kind) {
  const merged = new Map()
  for (const r of rules) {
    if (mediaKind(r.media) !== kind) continue
    if (!r.sels.some((s) => selRe.test(s))) continue
    for (const [k, v] of r.decls) merged.set(k, v)
  }
  return merged
}

const SCOPED = /\.kid-|\[data-kid|\[data-ui=kid\]|^:root$/

function cssHygiene(rules) {
  const out = []
  for (const r of rules) {
    for (const s of r.sels) {
      if (!SCOPED.test(s)) out.push(`kid.css 選擇器未限定在簡易版內（會改到詳細版）：${s}`)
      if (/^(html|body|#root)$/.test(s) && /hidden/.test(r.decls.get('overflow') ?? '')) {
        out.push(`kid.css 對 ${s} 設 overflow:hidden（窄屏要整頁捲動）`)
      }
    }
  }
  return out
}

// ───────────────────────── 規格 ─────────────────────────

/** 元件 token：[說明, 正則, 合格樣本片段, 最少次數?] */
const T = (label, re, ex, min = 1) => ({ label, re, ex, min })
/** 樣式需求：選擇器（正則＋樣本）、媒體、屬性與判準。 */
const N = (sel, ex, media, prop, test, val) => ({ sel, ex, media, prop, test, val })
const atLeast = (n) => ({ kind: 'min', n })
const is = (s) => ({ kind: 'eq', s })
const like = (re) => ({ kind: 're', re })
const widthAtLeast = (n) => ({ kind: 'width', n })

const TOKENS_CSS = `:root {
  --kid-tap: 64px;
  --kid-font: 22px;
  --kid-year: 40px;
}
`

const CHECKS = {
  // ── 第 1 期 ──
  home: {
    file: 'src/kid/KidHome.tsx',
    desc: '第①屏：六國大卡',
    tokens: [
      T('用 TOPIC_META.map 出卡', /\bTOPIC_META\.map\(/, 'TOPIC_META.map((t) => ('),
      T('<button> 卡', /<button\b/, '<button type="button"'),
      T('data-kid="topic"', /data-kid="topic"/, 'data-kid="topic"'),
      T('data-topic={…}', /data-topic=\{/, 'data-topic={t.id}'),
      T('setTopic(…)', /\bsetTopic\(/, 'onClick={() => { setTopic(t.id); props.onPick() }}>'),
      T('呼叫 onPick()', /\bonPick\(\)/, ''),
      T('<PersonPortrait size="lg">', /<PersonPortrait\b[^>]*size="lg"/, '<PersonPortrait size="lg" src={TOPIC_FACE[t.id]} name={t.label} />'),
      T('頭像用 TOPIC_FACE', /\bTOPIC_FACE\[/, ''),
      T('卡上寫國名 {t.label}', />\{t\.label\}</, '<span className="kid-home__name">{t.label}</span></button>))}'),
      T('標題 S.pickCountry', /\bS\.pickCountry\b/, '<h1 className="kid-title">{S.pickCountry}</h1>'),
      T('格線容器 className="kid-home__grid"', /className="kid-home__grid"/, '<div className="kid-home__grid">'),
    ],
  },
  'home-size': {
    file: CSS,
    desc: '六國卡尺寸與欄數',
    needs: [
      N(/\[data-kid=topic\]$/, '[data-kid="topic"]', 'base', 'min-height', atLeast(64), 'var(--kid-tap)'),
      N(/\[data-kid=topic\]$/, '[data-kid="topic"]', 'base', 'min-width', atLeast(64), 'var(--kid-tap)'),
      N(/\[data-kid=topic\]$/, '[data-kid="topic"]', 'base', 'font-size', atLeast(22), 'var(--kid-font)'),
      N(/\.kid-home__grid$/, '.kid-home__grid', 'base', 'display', is('grid'), 'grid'),
      N(/\.kid-home__grid$/, '.kid-home__grid', 'base', 'grid-template-columns', like(/^repeat\(\s*2\s*,/), 'repeat(2, 1fr)'),
      N(/\.kid-home__grid$/, '.kid-home__grid', 'desktop', 'grid-template-columns', like(/^repeat\(\s*3\s*,/), 'repeat(3, 1fr)'),
    ],
  },
  'era-river': {
    file: 'src/kid/EraRiver.tsx',
    desc: '第②屏：時間河踏腳石',
    tokens: [
      T('用 eraSlotsForTopic(topic)', /\beraSlotsForTopic\(/, 'eraSlotsForTopic(topic).map((slot) => ('),
      T('data-kid="era"', /data-kid="era"/, '<button type="button" data-kid="era"'),
      T('data-era={…}', /data-era=\{/, 'data-era={slot.id}'),
      T('目前時代 aria-current', /aria-current=\{/, 'aria-current={slot.id === activeEra ? \'true\' : undefined}'),
      T('setEraForTopic(…)', /\bsetEraForTopic\(/, 'onClick={() => { setEraForTopic(topic, slot.id); props.onPick() }}>'),
      T('呼叫 onPick()', /\bonPick\(\)/, ''),
      T('頭像用 ERA_FACE', /\bERA_FACE\[/, '{ERA_FACE[slot.id] ? <PersonPortrait size="lg" src={ERA_FACE[slot.id]} name={slot.label} />'),
      T('<PersonPortrait>', /<PersonPortrait\b/, ''),
      T('冇頭像用首字圓章 kid-river__stamp', /className="kid-river__stamp"/, ': <span className="kid-river__stamp">{Array.from(slot.label)[0]}</span>}'),
      T('卡上寫時代名 {slot.label}', /\{slot\.label\}<\/span>/, '<span className="kid-river__name">{slot.label}</span></button>))}'),
      T('載入時 scrollIntoView 目前時代', /\.scrollIntoView\(/, 'ref.current?.scrollIntoView({ block: \'center\', inline: \'center\' })'),
      T('標題 S.pickEra', /\bS\.pickEra\b/, '<h1 className="kid-title">{S.pickEra}</h1>'),
      T('容器 className="kid-river"', /className="kid-river"/, '<div className="kid-river">'),
    ],
  },
  'era-river-size': {
    file: CSS,
    desc: '踏腳石尺寸、直／橫排與目前時代外框',
    needs: [
      N(/\[data-kid=era\]$/, '[data-kid="era"]', 'base', 'min-height', atLeast(64), 'var(--kid-tap)'),
      N(/\[data-kid=era\]$/, '[data-kid="era"]', 'base', 'min-width', atLeast(64), 'var(--kid-tap)'),
      N(/\.kid-river$/, '.kid-river', 'base', 'display', is('flex'), 'flex'),
      N(/\.kid-river$/, '.kid-river', 'base', 'flex-direction', is('column'), 'column'),
      N(/\.kid-river$/, '.kid-river', 'desktop', 'flex-direction', is('row'), 'row'),
      N(/\.kid-river$/, '.kid-river', 'desktop', 'overflow-x', like(/^(auto|scroll)$/), 'auto'),
      N(/\.kid-river$/, '.kid-river', 'desktop', 'scroll-snap-type', like(/^x mandatory$/), 'x mandatory'),
      N(/\[data-kid=era\]\[aria-current=true\]$|\[aria-current=true\]\[data-kid=era\]$/, '[data-kid="era"][aria-current="true"]', 'base', 'outline', widthAtLeast(3), '4px solid var(--accent)'),
    ],
  },
  'time-dock': {
    file: 'src/kid/TimeDock.tsx',
    desc: '時光列：上一年／年份／下一年／播放',
    tokens: [
      T('經 useEraYear()', /\buseEraYear\(\)/, 'const { year, min, max, step, playing, play, stop } = useEraYear()'),
      T('上一年 <Icon name="prev">', /<Icon name="prev"/, '<button type="button" aria-label={S.prevYear} disabled={year === null || year <= (min ?? year)} onClick={() => step(-1)}><Icon name="prev" /></button>'),
      T('aria-label={S.prevYear}', /aria-label=\{S\.prevYear\}/, ''),
      T('下一年 <Icon name="next">', /<Icon name="next"/, '<button type="button" aria-label={S.nextYear} disabled={year === null || year >= (max ?? year)} onClick={() => step(1)}><Icon name="next" /></button>'),
      T('aria-label={S.nextYear}', /aria-label=\{S\.nextYear\}/, ''),
      T('到頭到尾 disabled（兩個）', /disabled=\{/, '', 2),
      T('年份大字 aria-live="polite"', /aria-live="polite"/, '<output className="kid-dock__year" aria-live="polite">'),
      T('年份大字 className="kid-dock__year"', /className="kid-dock__year"/, ''),
      T('年份用 S.yearNumber(…)', /\bS\.yearNumber\(/, '{year === null ? \'\' : S.yearNumber(year)}<small>{S.yearUnit}</small></output>'),
      T('播放 <Icon name="play">', /<Icon name="play"/, '<button type="button" onClick={playing ? stop : play}>{playing ? <Icon name="stop" /> : <Icon name="play" />}'),
      T('停 <Icon name="stop">', /<Icon name="stop"/, ''),
      T('播放字 S.play', /\bS\.play\b/, '{playing ? S.stop : S.play}</button>'),
      T('停字 S.stop', /\bS\.stop\b/, ''),
      T('容器 className="kid-dock"', /className="kid-dock"/, '<nav className="kid-dock">'),
    ],
  },
  'time-dock-size': {
    file: CSS,
    desc: '時光列固定底部、按鈕與年份字級',
    needs: [
      N(/\.kid-dock$/, '.kid-dock', 'base', 'position', is('fixed'), 'fixed'),
      N(/\.kid-dock$/, '.kid-dock', 'base', 'bottom', like(/^0(px)?$/), '0'),
      N(/\.kid-dock$/, '.kid-dock', 'base', 'padding-bottom', like(/env\(safe-area-inset-bottom\)/), 'env(safe-area-inset-bottom)'),
      N(/\.kid-dock button$/, '.kid-dock button', 'base', 'min-height', atLeast(64), 'var(--kid-tap)'),
      N(/\.kid-dock button$/, '.kid-dock button', 'base', 'min-width', atLeast(64), 'var(--kid-tap)'),
      N(/\.kid-dock__year$/, '.kid-dock__year', 'base', 'font-size', atLeast(40), 'var(--kid-year)'),
      N(/\.kid-dock$/, '.kid-dock', 'desktop', 'max-width', is('720px'), '720px'),
    ],
  },
  tabs: {
    file: 'src/kid/KidTabs.tsx',
    desc: '故事／人物／地圖三個大分頁',
    tokens: [
      T('role="tablist"', /role="tablist"/, '<div className="kid-tabs" role="tablist">'),
      T('容器 className="kid-tabs"', /className="kid-tabs"/, ''),
      T('role="tab"', /role="tab"/, '{TABS.map((t) => (<button type="button" role="tab"'),
      T('aria-selected={…}', /aria-selected=\{/, 'aria-selected={props.value === t.id}'),
      T('撳＝onChange(…)', /\bonChange\(/, 'onClick={() => props.onChange(t.id)}><Icon name={t.id} /><span>{t.label}</span></button>))}</div>'),
      T('<Icon name=…>', /<Icon name=/, ''),
      T("'story'", /['"]story['"]/, "const TABS = [{ id: 'story', label: S.tabStory },"),
      T("'people'", /['"]people['"]/, "{ id: 'people', label: S.tabPeople },"),
      T("'map'", /['"]map['"]/, "{ id: 'map', label: S.tabMap }] as const"),
      T('S.tabStory', /\bS\.tabStory\b/, ''),
      T('S.tabPeople', /\bS\.tabPeople\b/, ''),
      T('S.tabMap', /\bS\.tabMap\b/, ''),
    ],
  },
  'tabs-size': {
    file: CSS,
    desc: '分頁按鈕尺寸',
    needs: [
      N(/\.kid-tabs$/, '.kid-tabs', 'base', 'display', like(/^(grid|flex)$/), 'grid'),
      N(/\.kid-tabs \[role=tab\]$/, '.kid-tabs [role="tab"]', 'base', 'min-height', atLeast(64), 'var(--kid-tap)'),
      N(/\.kid-tabs \[role=tab\]$/, '.kid-tabs [role="tab"]', 'base', 'font-size', atLeast(22), 'var(--kid-font)'),
    ],
  },
  'nav-escape': {
    file: 'src/kid/NavCorner.tsx',
    desc: '左上角回首頁＋返回',
    tokens: [
      T('容器 className="kid-nav"', /className="kid-nav"/, '<nav className="kid-nav">'),
      T('回首頁 <Icon name="home">', /<Icon name="home"/, '<button type="button" onClick={props.onHome}><Icon name="home" /><span>{S.home}</span></button>'),
      T('回首頁字 {S.home}', /\{S\.home\}/, ''),
      T('onHome', /\bonHome\b/, ''),
      T('返回只在 showBack 時出現', /\bshowBack\s*(\?|&&)/, '{props.showBack ? ('),
      T('返回 <Icon name="back">', /<Icon name="back"/, '<button type="button" onClick={props.onBack}><Icon name="back" /><span>{S.back}</span></button>) : null}</nav>'),
      T('返回字 {S.back}', /\{S\.back\}/, ''),
      T('onBack', /\bonBack\b/, ''),
    ],
  },
  'nav-size': {
    file: CSS,
    desc: '回首頁／返回按鈕尺寸',
    needs: [
      N(/\.kid-nav$/, '.kid-nav', 'base', 'display', is('flex'), 'flex'),
      N(/\.kid-nav button$/, '.kid-nav button', 'base', 'min-height', atLeast(64), 'var(--kid-tap)'),
      N(/\.kid-nav button$/, '.kid-nav button', 'base', 'min-width', atLeast(64), 'var(--kid-tap)'),
    ],
  },
  wiring: {
    file: 'src/App.tsx',
    desc: 'App 按模式掛上簡易版外殼',
    hygiene: false,
    tokens: [
      T("import { KidShell } from './kid/KidShell'", /import \{ KidShell \} from '\.\/kid\/KidShell'/, "import { KidShell } from './kid/KidShell'"),
      T("import { useUiMode } from './kid/uiMode'", /import \{[^}]*\buseUiMode\b[^}]*\} from '\.\/kid\/uiMode'/, "import { useUiMode } from './kid/uiMode'"),
      T('呼叫 useUiMode()', /\buseUiMode\(\)/, "const mode = useUiMode()"),
      T('<KidShell><TopicRoot /></KidShell>', /<KidShell>\s*<TopicRoot\s*\/>\s*<\/KidShell>/, "{mode === 'kid' ? <KidShell><TopicRoot /></KidShell> : <TopicRoot />}"),
      T('詳細版照舊 <TopicRoot />（共兩處）', /<TopicRoot\s*\/>/, '', 2),
    ],
  },
  'chrome-hidden': {
    file: CSS,
    desc: '簡易版下視覺隱藏舊介面（保留 DOM）',
    needs: ['.app-header', '.era-bar', '.year-scrubber', '.bottom-bar', '.map-layer-bar'].flatMap((c) => {
      const re = new RegExp(`^(html)?\\[data-ui=kid\\] ${c.replace('.', '\\.')}$`)
      const ex = `[data-ui="kid"] ${c}`
      return [
        N(re, ex, 'base', 'position', is('absolute'), 'absolute'),
        N(re, ex, 'base', 'width', is('1px'), '1px'),
        N(re, ex, 'base', 'height', is('1px'), '1px'),
        N(re, ex, 'base', 'overflow', is('hidden'), 'hidden'),
        N(re, ex, 'base', 'clip-path', is('inset(50%)'), 'inset(50%)'),
      ]
    }),
    forbidCss: [
      {
        label: '舊介面不准 display:none（年份橋與手機閘門要它留在 DOM）',
        test: (r) =>
          r.sels.some((s) => /\.(app-header|era-bar|year-scrubber|bottom-bar|map-layer-bar)\b/.test(s)) &&
          /^none\b/.test(r.decls.get('display') ?? ''),
        ex: '[data-ui="kid"] .era-bar { display: none }',
      },
    ],
  },

  // ── 第 2 期 ──
  'story-card': {
    file: 'src/kid/StoryCard.tsx',
    desc: '故事卡：一次一件事，前後故事跳轉',
    tokens: [
      T('useKidStories()', /\buseKidStories\(\)/, 'const { stories } = useKidStories()'),
      T('useEraYear()', /\buseEraYear\(\)/, 'const { year, setYear } = useEraYear()'),
      T('storiesAt(…) 取當年', /\bstoriesAt\(/, 'const now = year === null ? [] : storiesAt(stories, year)'),
      T('容器 className="kid-story"', /className="kid-story"/, '<article className="kid-story">'),
      T('標題 {story.title}', />\{story\.title\}</, '<h2>{story.title}</h2>'),
      T('文字 {story.text}', />\{story\.text\}</, '<p>{story.text}</p>'),
      T('頭像 <PersonPortrait>', /<PersonPortrait\b/, '{story.portrait ? <PersonPortrait size="lg" src={story.portrait} name={story.title} /> : null}'),
      T('上一個故事 prevStoryYear(…)', /\bprevStoryYear\(/, 'const prev = prevStoryYear(stories, year)'),
      T('下一個故事 nextStoryYear(…)', /\bnextStoryYear\(/, 'const next = nextStoryYear(stories, year)'),
      T('跳年 setYear(…)（上一個、下一個各一）', /\bsetYear\(/, '<button type="button" onClick={() => setYear(prev)}><Icon name="prev" />{S.prevStory}</button>', 2),
      T('S.prevStory', /\bS\.prevStory\b/, ''),
      T('S.nextStory', /\bS\.nextStory\b/, '<button type="button" onClick={() => setYear(next)}>{S.nextStory}<Icon name="next" /></button></article>'),
      T('<Icon name="prev">', /<Icon name="prev"/, ''),
      T('<Icon name="next">', /<Icon name="next"/, ''),
    ],
  },
  'empty-state': {
    file: 'src/kid/StoryCard.tsx',
    desc: '空年：這一年沒有故事＋看下一個故事',
    tokens: [
      T('空年容器 className="kid-story__empty"', /className="kid-story__empty"/, '<div className="kid-story__empty">'),
      T('S.noStory', /\bS\.noStory\b/, '<p>{S.noStory}</p>'),
      T('跳去下一個有故事嘅年份 nextStoryYear(…)', /\bnextStoryYear\(/, '<button type="button" onClick={() => setYear(nextStoryYear(stories, year))}>'),
      T('S.nextStory', /\bS\.nextStory\b/, '{S.nextStory}</button></div>'),
    ],
  },
  'people-grid': {
    file: 'src/kid/PeopleGrid.tsx',
    desc: '人物大頭像格',
    tokens: [
      T('useKidStories()', /\buseKidStories\(\)/, 'const { people } = useKidStories()'),
      T('容器 className="kid-people"', /className="kid-people"/, '<section className="kid-people">'),
      T('格線 className="kid-people__grid"', /className="kid-people__grid"/, '<div className="kid-people__grid">'),
      T('冇人物 S.noPeople', /\bS\.noPeople\b/, '{people.length === 0 ? <p>{S.noPeople}</p> : null}'),
      T('<PersonPortrait size="lg">', /<PersonPortrait\b[^>]*size="lg"/, '{people.map((p) => (<button type="button" aria-expanded={open === p.id} onClick={() => setOpen(open === p.id ? null : p.id)}><PersonPortrait size="lg" src={p.portrait} name={p.name} />'),
      T('aria-expanded={…}', /aria-expanded=\{/, ''),
      T('名 {p.name}', />\{p\.name\}</, '<span>{p.name}</span>'),
      T('一句簡介 {p.line}', /\{p\.line\}/, '{open === p.id ? <p>{p.line}</p> : null}</button>))}</div>'),
      T('收起 S.close', /\bS\.close\b/, '<span hidden>{S.close}</span></section>'),
    ],
  },
  'story-size': {
    file: CSS,
    desc: '故事卡字級、行高、段寬、頭像',
    needs: [
      N(/\.kid-story$/, '.kid-story', 'base', 'font-size', atLeast(22), 'var(--kid-font)'),
      N(/\.kid-story$/, '.kid-story', 'base', 'line-height', atLeast(1.6), '1.6'),
      N(/\.kid-story p$/, '.kid-story p', 'base', 'max-width', is('32em'), '32em'),
      N(/\.kid-story button$/, '.kid-story button', 'base', 'min-height', atLeast(64), 'var(--kid-tap)'),
      N(/\.kid-story \.person-portrait$/, '.kid-story .person-portrait', 'base', 'width', atLeast(96), '96px'),
      N(/\.kid-story \.person-portrait$/, '.kid-story .person-portrait', 'base', 'height', atLeast(96), '96px'),
    ],
  },
  'people-size': {
    file: CSS,
    desc: '人物格欄數與頭像尺寸',
    needs: [
      N(/\.kid-people__grid$/, '.kid-people__grid', 'base', 'display', is('grid'), 'grid'),
      N(/\.kid-people__grid$/, '.kid-people__grid', 'base', 'grid-template-columns', like(/^repeat\(\s*3\s*,/), 'repeat(3, 1fr)'),
      N(/\.kid-people__grid$/, '.kid-people__grid', 'desktop', 'grid-template-columns', like(/^repeat\(\s*5\s*,/), 'repeat(5, 1fr)'),
      N(/\.kid-people button$/, '.kid-people button', 'base', 'min-height', atLeast(64), 'var(--kid-tap)'),
      N(/\.kid-people button$/, '.kid-people button', 'base', 'font-size', atLeast(22), 'var(--kid-font)'),
      N(/\.kid-people \.person-portrait$/, '.kid-people .person-portrait', 'base', 'width', atLeast(96), '96px'),
      N(/\.kid-people \.person-portrait$/, '.kid-people .person-portrait', 'base', 'height', atLeast(96), '96px'),
    ],
  },
  'legacy-skin': {
    file: CSS,
    desc: '未接轉接器的時代：舊側欄套大字皮',
    needs: ['.timeline-item', '.person-card', '.people-card'].map((c) =>
      N(new RegExp(`^(html)?\\[data-ui=kid\\] ${c.replace('.', '\\.')}$`), `[data-ui="kid"] ${c}`, 'base', 'font-size', atLeast(22), 'var(--kid-font)'),
    ),
  },

  // ── 第 3 期 ──
  settings: {
    file: 'src/kid/KidSettings.tsx',
    desc: '設定：字級、白天／晚上、難易、切換到詳細版',
    tokens: [
      T('容器 className="kid-settings"', /className="kid-settings"/, '<div className="kid-settings">'),
      T('<Icon name="settings">', /<Icon name="settings"/, '<button type="button" aria-expanded={open} onClick={() => setOpen(!open)}><Icon name="settings" /><span>{S.settings}</span></button>'),
      T('{S.settings}', /\{S\.settings\}/, ''),
      T('開合 aria-expanded', /aria-expanded=\{/, ''),
      T('字級 setFontStep(…)', /\bsetFontStep\(/, '<p>{S.fontSize}</p><button type="button" aria-pressed={prefs.fontStep === 1} onClick={() => setFontStep(1)}><Icon name="text-size" />{S.fontSmall}</button>'),
      T('S.fontSize', /\bS\.fontSize\b/, ''),
      T('<Icon name="text-size">', /<Icon name="text-size"/, ''),
      T('目前選項 aria-pressed', /aria-pressed=\{/, ''),
      T('白天／晚上 setTheme(…)', /\bsetTheme\(/, '<p>{S.dayNight}</p><button type="button" onClick={() => setTheme(\'light\')}><Icon name="sun" />{S.day}</button><button type="button" onClick={() => setTheme(\'dark\')}><Icon name="moon" />{S.night}</button>'),
      T('S.dayNight', /\bS\.dayNight\b/, ''),
      T('<Icon name="sun">', /<Icon name="sun"/, ''),
      T('<Icon name="moon">', /<Icon name="moon"/, ''),
      T('難易 setLevel(…)', /\bsetLevel\(/, '<p>{S.level}</p><button type="button" onClick={() => setLevel(\'elementary\')}>{S.levelEasy}</button>'),
      T("'elementary'", /['"]elementary['"]/, ''),
      T("'secondary'", /['"]secondary['"]/, '<button type="button" onClick={() => setLevel(\'secondary\')}>{S.levelMid}</button>'),
      T("'university'", /['"]university['"]/, '<button type="button" onClick={() => setLevel(\'university\')}>{S.levelDeep}</button>'),
      T('S.levelEasy', /\bS\.levelEasy\b/, ''),
      T('S.levelMid', /\bS\.levelMid\b/, ''),
      T('S.levelDeep', /\bS\.levelDeep\b/, ''),
      T("切換到詳細版 setUiMode('classic')", /\bsetUiMode\('classic'\)/, '<button type="button" onClick={() => setUiMode(\'classic\')}>{S.toClassic}</button></div>'),
      T('S.toClassic', /\bS\.toClassic\b/, ''),
    ],
  },
  'settings-size': {
    file: CSS,
    desc: '設定按鈕尺寸',
    needs: [
      N(/\.kid-settings button$/, '.kid-settings button', 'base', 'min-height', atLeast(64), 'var(--kid-tap)'),
      N(/\.kid-settings button$/, '.kid-settings button', 'base', 'min-width', atLeast(64), 'var(--kid-tap)'),
      N(/\.kid-settings button$/, '.kid-settings button', 'base', 'font-size', atLeast(22), 'var(--kid-font)'),
      N(/\.kid-settings \[aria-pressed=true\]$/, '.kid-settings [aria-pressed="true"]', 'base', 'outline', widthAtLeast(3), '4px solid var(--accent)'),
    ],
  },
  'to-kid': {
    file: 'src/components/BottomBar.tsx',
    desc: '詳細版底欄加「切換到簡易版」',
    hygiene: false,
    tokens: [
      T("import { setUiMode } from '../kid/uiMode'", /import \{[^}]*\bsetUiMode\b[^}]*\} from '\.\.\/kid\/uiMode'/, "import { setUiMode } from '../kid/uiMode'"),
      T("setUiMode('kid')", /\bsetUiMode\('kid'\)/, "<button type=\"button\" onClick={() => setUiMode('kid')}>"),
      T('按鈕字「切換到簡易版」', /切換到簡易版|\bS\.toKid\b/, '切換到簡易版</button>'),
    ],
  },
  breadcrumb: {
    file: 'src/kid/Breadcrumb.tsx',
    desc: '頂部三粒點',
    tokens: [
      T('容器 className="kid-crumbs"', /className="kid-crumbs"/, '<ol className="kid-crumbs" aria-label={S.stepOf(props.step, S.steps.length)}>'),
      T('讀屏文字 S.stepOf(…)', /\bS\.stepOf\(/, ''),
      T('S.steps.map', /\bS\.steps\.map\(/, '{S.steps.map((label, i) => (<li key={label} aria-current={i + 1 === props.step ? \'step\' : undefined}'),
      T('目前一步 aria-current', /aria-current=\{/, ''),
      T('已到嘅點 data-done', /data-done=\{/, 'data-done={i + 1 <= props.step ? \'\' : undefined}>{label}</li>))}</ol>'),
    ],
  },
  onboarding: {
    file: 'src/kid/FirstVisit.tsx',
    desc: '第一次入站提示（無彈窗）',
    tokens: [
      T('讀 localStorage.getItem', /\blocalStorage\.getItem\(/, "const [seen, setSeen] = useState(() => localStorage.getItem('hf.kid.seen') === '1')"),
      T('寫入 localStorage.setItem', /\blocalStorage\.setItem\(/, "useEffect(() => { if (props.dismissed && !seen) { localStorage.setItem('hf.kid.seen', '1'); setSeen(true) } }, [props.dismissed, seen])"),
      T('props.dismissed', /\bdismissed\b/, ''),
      T('容器 className="kid-hint"', /className="kid-hint"/, "if (seen || props.dismissed) return null\nreturn <p className=\"kid-hint\">"),
      T('<Icon name="hand">', /<Icon name="hand"/, '<Icon name="hand" size={48} />'),
      T('S.hintPick', /\bS\.hintPick\b/, '{S.hintPick}</p>'),
    ],
    forbid: [
      ['唔准用彈窗（role="dialog"／<dialog>／aria-modal）', /role="dialog"|<dialog\b|aria-modal/, '<div role="dialog">'],
    ],
  },
  keys: {
    file: 'src/kid/TimeDock.tsx',
    desc: '桌面鍵盤：←／→ 換年、空白鍵播放',
    tokens: [
      T("addEventListener('keydown', …)", /addEventListener\('keydown'/, "useEffect(() => { const onKey = (e: KeyboardEvent) => {"),
      T('焦點喺輸入框唔攔截', /isContentEditable|\.closest\(['"]input|tagName/, "const t = e.target as HTMLElement | null; if (t && (t.isContentEditable || t.closest('input, textarea, select'))) return"),
      T("'ArrowLeft'", /['"]ArrowLeft['"]/, "if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1) }"),
      T("'ArrowRight'", /['"]ArrowRight['"]/, "else if (e.key === 'ArrowRight') { e.preventDefault(); step(1) }"),
      T('空白鍵', /['"] ['"]|['"]Space['"]/, "else if (e.key === ' ') { e.preventDefault(); if (playing) stop(); else play() } }"),
      T('preventDefault()', /\.preventDefault\(\)/, ''),
      T("removeEventListener('keydown', …)", /removeEventListener\('keydown'/, "window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey) }, [step, playing, play, stop])"),
    ],
  },
  motion: {
    file: CSS,
    desc: '減少動態：關閉所有動畫',
    needs: [
      N(/^\.kid-shell \*$/, '.kid-shell *', 'reduce', 'transition', like(/^none\b/), 'none'),
      N(/^\.kid-shell \*$/, '.kid-shell *', 'reduce', 'animation', like(/^none\b/), 'none'),
      N(/^\.kid-shell \*$/, '.kid-shell *', 'reduce', 'scroll-behavior', is('auto'), 'auto'),
    ],
  },
}

/** 元件共通衛生規則不適用：雲端層的檔（KidShell 設 inert 要查舊 chrome 選擇器）。 */
const NO_HYGIENE = new Set(['src/kid/strings.ts', 'src/kid/icons.tsx', 'src/kid/KidShell.tsx'])

// ───────────────────────── 執行 ─────────────────────────

function runTsx(check, src) {
  if (src === null) return [`找不到 ${check.file}`]
  const code = stripComments(src)
  const out = []
  if (check.hygiene !== false && !NO_HYGIENE.has(check.file)) out.push(...kidHygiene(code))
  for (const t of check.tokens) {
    const n = (code.match(new RegExp(t.re.source, t.re.flags.includes('g') ? t.re.flags : t.re.flags + 'g')) ?? []).length
    if (n < t.min) out.push(`缺：${t.label}${t.min > 1 ? `（要 ${t.min} 處，現 ${n}）` : ''}`)
  }
  for (const [label, re] of check.forbid ?? []) if (re.test(code)) out.push(`禁止：${label}`)
  return out
}

function testNeed(need, decls, vars) {
  const v = decls.get(need.prop)
  const where = `${need.ex}${need.media === 'base' ? '' : `（${need.media === 'desktop' ? '@media (min-width: 1025px)' : '@media (prefers-reduced-motion: reduce)'}）`}`
  if (v === undefined) return `缺：${where} { ${need.prop} }`
  const t = need.test
  const resolved = resolveVars(v, vars).trim()
  if (t.kind === 'eq' && resolved !== t.s) return `${where} ${need.prop} 要係 ${t.s}，現為 ${v}`
  if (t.kind === 're' && !t.re.test(resolved)) return `${where} ${need.prop} 要符合 ${t.re}，現為 ${v}`
  if (t.kind === 'min') {
    const n = need.prop === 'line-height' ? Number(resolved) : lengthPx(v, vars)
    if (!(n >= t.n)) return `${where} ${need.prop} 要 ≥ ${t.n}${need.prop === 'line-height' ? '' : 'px'}，現為 ${v}${Number.isNaN(n) ? '（無法換算；用 px、rem 或 var(--kid-*)，唔好用 calc）' : ''}`
  }
  if (t.kind === 'width') {
    const n = maxLengthIn(v, vars)
    if (!(n >= t.n)) return `${where} ${need.prop} 線寬要 ≥ ${t.n}px（唔可以只靠顏色），現為 ${v}`
  }
  return null
}

function runCss(check, src) {
  if (src === null) return [`找不到 ${check.file}`]
  const rules = parseCss(src)
  const vars = cssVars(rules)
  const out = cssHygiene(rules)
  for (const need of check.needs ?? []) {
    const msg = testNeed(need, declsFor(rules, need.sel, need.media), vars)
    if (msg) out.push(msg)
  }
  for (const f of check.forbidCss ?? []) if (rules.some(f.test)) out.push(`禁止：${f.label}`)
  return out
}

function run(id, read = readRepo) {
  const check = CHECKS[id]
  const src = read(check.file)
  return check.needs || check.forbidCss ? runCss(check, src) : runTsx(check, src)
}

// ───────────────────────── 自測（teeth） ─────────────────────────

const MEDIA_HEAD = { desktop: '@media (min-width: 1025px)', reduce: '@media (prefers-reduced-motion: reduce)' }

function goldenCss(needs, skip = -1, shrink = -1) {
  let css = TOKENS_CSS
  needs.forEach((n, i) => {
    if (i === skip) return
    let val = n.val
    if (i === shrink) {
      if (n.test.kind === 'min' || n.test.kind === 'width') val = n.prop === 'line-height' ? '1' : '2px'
      else val = 'unset'
    }
    const rule = `${n.ex} { ${n.prop}: ${val}; }`
    css += n.media === 'base' ? `${rule}\n` : `${MEDIA_HEAD[n.media]} { ${rule} }\n`
  })
  return css
}

function goldenTsx(check) {
  return check.tokens
    .map((t) => t.ex)
    .filter(Boolean)
    .join('\n')
}

function teeth() {
  let bad = 0
  let bites = 0
  const fail = (msg) => {
    bad++
    console.log(`  ✗ ${msg}`)
  }
  for (const [id, check] of Object.entries(CHECKS)) {
    const asFile = (content) => (p) => (p === check.file ? content : readRepo(p))
    if (check.needs) {
      const golden = goldenCss(check.needs)
      const g = run(id, asFile(golden))
      if (g.length) fail(`${id}：合格樣本不過 — ${g[0]}`)
      check.needs.forEach((n, i) => {
        bites += 2
        if (!run(id, asFile(goldenCss(check.needs, i))).length) fail(`${id}：拆走 ${n.ex} { ${n.prop} } 仍綠`)
        if (!run(id, asFile(goldenCss(check.needs, -1, i))).length) fail(`${id}：${n.ex} { ${n.prop} } 改壞仍綠`)
      })
      // 設計 token 縮細：用 var(--kid-*) 的最小值必須跟住變紅
      if (check.needs.some((n) => n.test.kind === 'min' && /var\(--kid-/.test(n.val))) {
        bites++
        const tiny = golden.replace(/--kid-tap: 64px/, '--kid-tap: 40px').replace(/--kid-font: 22px/, '--kid-font: 14px').replace(/--kid-year: 40px/, '--kid-year: 20px')
        if (!run(id, asFile(tiny)).length) fail(`${id}：token 縮細仍綠`)
      }
      bites++
      if (!run(id, asFile(`${golden}.timeline-item { font-size: 30px; }\n`)).length) fail(`${id}：未限定簡易版的選擇器仍綠`)
      for (const f of check.forbidCss ?? []) {
        bites++
        if (!run(id, asFile(`${golden}${f.ex}\n`)).length) fail(`${id}：${f.label} 仍綠`)
      }
    } else {
      const golden = goldenTsx(check)
      const g = run(id, asFile(golden))
      if (g.length) fail(`${id}：合格樣本不過 — ${g.join('；')}`)
      check.tokens.forEach((t) => {
        bites++
        const mutated = golden.replace(new RegExp(t.re.source, 'g'), '/*X*/')
        if (!run(id, asFile(mutated)).length) fail(`${id}：拆走「${t.label}」仍綠`)
      })
      for (const [label, , ex] of check.forbid ?? []) {
        bites++
        if (!run(id, asFile(`${golden}\n${ex}`)).length) fail(`${id}：${label} 仍綠`)
      }
      if (check.hygiene !== false) {
        for (const [what, extra] of [
          ['寫死中文', "const x = '故事'"],
          ['emoji', 'const x = <span>\u{1F3E0}</span>'],
          ['自畫 svg', 'const x = <svg><path d="M0 0" /></svg>'],
          ['直接查滑桿', "document.querySelector('.year-scrubber input')"],
        ]) {
          bites++
          if (!run(id, asFile(`${golden}\n${extra}`)).length) fail(`${id}：${what} 仍綠`)
        }
      }
    }
  }
  console.log(`audit_kid_ui --teeth — ${Object.keys(CHECKS).length} 條、${bites} 次破壞，失敗 ${bad} 項`)
  return bad
}

// ───────────────────────── CLI ─────────────────────────

const args = process.argv.slice(2)
const req = args.find((a) => a.startsWith('--require='))?.slice('--require='.length)

if (args.includes('--list')) {
  for (const [id, c] of Object.entries(CHECKS)) console.log(`${id.padEnd(16)} ${c.file.padEnd(30)} ${c.desc}`)
  process.exit(0)
}
if (args.includes('--teeth')) process.exit(teeth() ? 1 : 0)
if (args.includes('--all')) {
  let red = 0
  for (const id of Object.keys(CHECKS)) {
    const p = run(id)
    if (p.length) red++
    console.log(`${p.length ? '✗' : '✓'} ${id.padEnd(16)} ${p.length ? `${p.length} 項：${p[0]}` : ''}`)
  }
  console.log(`audit_kid_ui --all — 通過 ${Object.keys(CHECKS).length - red}｜未過 ${red}`)
  process.exit(red ? 1 : 0)
}
if (!req) {
  console.error('用法：node scripts/audit_kid_ui.mjs --require=<id> | --list | --all | --teeth')
  process.exit(2)
}
if (!CHECKS[req]) {
  console.error(`未知 id「${req}」；可用：${Object.keys(CHECKS).join(' ')}`)
  process.exit(2)
}
const problems = run(req)
if (problems.length) {
  console.log(`✗ ${req}（${CHECKS[req].file}）— ${problems.length} 項未過：`)
  for (const p of problems) console.log(`  - ${p}`)
  process.exit(1)
}
console.log(`✓ ${req}（${CHECKS[req].file}）`)
