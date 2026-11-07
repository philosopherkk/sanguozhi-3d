/**
 * 掛載稽核（audit:wiring）。
 *
 * 存在的理由：成語面板曾經掛在一個**從未被 router 掛載**的 app（ChinaHistoryApp）上，
 * 結果整個功能在所有頁面上都不見，而 tsc、build、audit:data 全綠。
 * 這類「元件寫好了但沒接上去」的 bug 只有看路由才會被抓到，所以這裡把路由當資料來掃。
 *
 * 檢查：
 *  1. app-unrouted      fail   匯出的 app 殼層沒有出現在 router（也未列入例外）
 *  2. app-no-side-rail  warn   有路由的 app 沒渲染 AppSideRail（側欄三軌的載體）
 *  3. app-no-chengyu    fail   有 AppSideRail 卻沒傳 chengyu 槽（就是那次 bug 的形狀）
 *  4. app-no-events     warn   有 AppSideRail 卻沒傳 events
 *  5. app-no-people     warn   有 AppSideRail 卻沒傳 people
 *  6. chengyu-slot-track fail  ChengyuSlot 少了 track 或值不合法
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const SRC = join(ROOT, 'src')

type Level = 'fail' | 'warn'
interface Issue {
  level: Level
  code: string
  location: string
  message: string
}
const issues: Issue[] = []
function add(level: Level, code: string, location: string, message: string) {
  issues.push({ level, code, location, message })
}

/**
 * 刻意不掛路由的 app：留檔參考用。要留就要在這裡寫理由，
 * 否則 app-unrouted 會直接 fail——這樣「孤兒 app」就不可能再默默存在。
 */
const UNROUTED_APPS: Record<string, string> = {
  // ChinaHistoryApp 已在 2026-11-01 刪除：它沒掛路由、各時代已有自己的專題包，
  // 而且正是「成語面板掛在永遠不會出現的 app 上」那個 bug 的來源（見 HANDOVER §1P）。
  // 它的通史時間軸與人物留檔在 docs/reference/，要沿用再搬回 src。
  // 新的孤兒 app 一律 fail——要留檔就在這裡寫理由。
  JapanHistoryApp:
    '明治至當代已改由 MODERN_JAPAN_PACK 戰區圖承接（src/modernJapan/ModernJapanApp.tsx），' +
    '此通史視圖暫留檔；確認不再需要後，比照 ChinaHistoryApp 遷至 docs/reference/ 再刪除。',
}

/**
 * 從 `<AppSideRail` 開始找到該標籤的 '>'（用大括號深度避開 prop 裡的 `=>`）。
 * 回傳標籤結束位置，找不到回傳 -1。
 */
function tagEnd(src: string, startIdx: number): number {
  let brace = 0
  for (let i = startIdx + 1; i < src.length; i++) {
    const c = src[i]
    if (c === '{') brace++
    else if (c === '}') brace--
    else if (c === '>' && brace === 0) return i + 1
  }
  return -1
}

/**
 * 成語槽必須真的是 AppSideRail 的 prop。
 * 踩過的坑：縮排腳本把 chengyu={...} 搬到標籤的 '/>' 之後，JSX 把
 * `chengyu=` 當文字、把 {<ChengyuSlot/>} 當元素渲染——tsc 全綠，
 * 但面板變成網格直接子節點，13,400px 高把地圖壓扁。
 * 所以不能只問「檔案裡有沒有 chengyu={」，要問它在不在標籤裡面。
 */
function checkChengyuPropNesting(where: string, src: string) {
  const spans: [number, number][] = []
  for (const m of src.matchAll(/<AppSideRail\b/g)) {
    const end = tagEnd(src, m.index!)
    if (end > 0) spans.push([m.index!, end])
  }
  if (spans.length === 0) return

  const inside = (idx: number) => spans.some(([a, b]) => idx >= a && idx <= b)
  for (const m of src.matchAll(/\b(chengyu|events|people)=\{/g)) {
    if (inside(m.index!)) continue
    add(
      'fail',
      'jsx-prop-outside-tag',
      `${where}:${src.slice(0, m.index).split('\n').length}`,
      `「${m[1]}={…}」落在任何標籤之外——JSX 會把它當文字渲染、把元件當兄弟節點掛出去。` +
        `檢查 AppSideRail 的 '/>' 是不是跑到了這個 prop 前面。`,
    )
  }
  for (const [a, b] of spans) {
    if (!src.slice(a, b).includes('chengyu={')) {
      add('fail', 'app-no-chengyu', where, 'AppSideRail 標籤內沒有 chengyu prop（該時代看不到成語卡）')
    }
  }
}

function isSource(p: string): boolean {
  // .json 也要掃：時間軸事件 id 有相當一部分放在 JSON 資料檔裡
  return /\.(tsx|ts|json)$/.test(p)
}

function listFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) listFiles(full, out)
    else if (isSource(full)) out.push(full)
  }
  return out
}

const files = listFiles(SRC)
const rel = (p: string) => relative(ROOT, p)

// ── 1. router 裡實際会出现的 app ────────────────────────────────
// App.tsx 用 lazy(() => import('./x/XApp').then((m) => ({ default: m.XApp })))
// 和 <app.ImperialApp pack=... /> 兩種寫法，所以直接把檔案裡所有
// 看起來像 app 殼層的名字都算有路由。
const appTsx = join(SRC, 'App.tsx')
const routerSrc = readFileSync(appTsx, 'utf8')
const routed = new Set<string>()
for (const m of routerSrc.matchAll(/\b([A-Z][A-Za-z0-9]*(?:App|Japan))\b/g)) routed.add(m[1]!)

// ── 2. 匯出的 app 殼層 ─────────────────────────────────────────
const appShells: { name: string; file: string; src: string }[] = []
for (const f of files) {
  const src = readFileSync(f, 'utf8')
  for (const m of src.matchAll(/export function ([A-Z][A-Za-z0-9]*(?:App|Japan))\b/g)) {
    appShells.push({ name: m[1]!, file: f, src })
  }
}

// 殼層可以層層相依（AsukaApp → DeepDiveApp、JinApp 路由 → ImperialApp），
// 所以「有被用到」要用可達性算，不是只看 App.tsx 有沒有直接出現。
const shellByName = new Map(appShells.map((s) => [s.name, s]))
const reachable = new Set<string>(routed)
let grew = true
while (grew) {
  grew = false
  for (const name of [...reachable]) {
    const shell = shellByName.get(name)
    if (!shell) continue
    for (const other of appShells) {
      if (reachable.has(other.name) || other.name === shell.name) continue
      if (new RegExp('<' + other.name + '\\b').test(shell.src)) {
        reachable.add(other.name)
        grew = true
      }
    }
  }
}

for (const shell of appShells) {
  const where = rel(shell.file)
  if (!reachable.has(shell.name)) {
    const reason = UNROUTED_APPS[shell.name]
    if (reason) {
      console.log(`公認未掛路由：${shell.name}（${where}）— ${reason.slice(0, 40)}…`)
    } else {
      add(
        'fail',
        'app-unrouted',
        where,
        `${shell.name} 匯出了但從 router 到不了它；` +
          '掛在它下面的任何面板都不會出現。要嘛掛路由，要嘛刪掉，要嘛在 UNROUTED_APPS 寫理由。',
      )
    }
    continue
  }

  // 委派給別的殼層（例如 AsukaApp 只包 DeepDiveApp）：三軌由被委派者負責，不重複檢查
  const delegates = appShells.some(
    (o) => o.name !== shell.name && new RegExp('<' + o.name + '\\b').test(shell.src),
  )
  if (delegates) continue

  const hasRail = /<AppSideRail\b/.test(shell.src)
  if (!hasRail) {
    add('warn', 'app-no-side-rail', where, `${shell.name} 沒有 AppSideRail（年表／人物／成語三軌的載體）`)
    continue
  }
  checkChengyuPropNesting(where, shell.src)
  if (!/events=\{/.test(shell.src)) {
    add('warn', 'app-no-events', where, `${shell.name} 的 AppSideRail 沒傳 events`)
  }
  if (!/people=\{/.test(shell.src)) {
    add('warn', 'app-no-people', where, `${shell.name} 的 AppSideRail 沒傳 people`)
  }
}

// ── 3. ChengyuSlot 的 track 要明確 ─────────────────────────────
for (const f of files) {
  const src = readFileSync(f, 'utf8')
  if (!/<ChengyuSlot\b/.test(src)) continue
  for (const m of src.matchAll(/<ChengyuSlot\b([\s\S]*?)\/>/g)) {
    const attrs = m[1]!
    const track = /track=\{?"(china|japan)"\}?/.exec(attrs)?.[1]
    if (!track) {
      add('fail', 'chengyu-slot-track', rel(f), 'ChengyuSlot 少了 track="china"／track="japan"，語別會錯')
    }
  }
}

// ── 4. 成語的 eraLink 綁事件 id 時，那個 id 必須真的是「該年的事件」 ──
// 只查 id 有沒有出現是不夠的：同一個 id 可能出現在年號清單、key years
// 或別的資料結構裡（實測就踩過：kam-koan 是 key year，不是事件）。
// 所以要的是 (id, year) 這一對，而且來源要排除成語檔本身。
{
  const idiomsPath = join(SRC, 'chengyu/data/idioms.json')
  const idioms = JSON.parse(readFileSync(idiomsPath, 'utf8')) as {
    id: string
    lemma: string
    eraLink?: { kind?: string; id?: string; year?: number }
  }[]

  const eventPairs = new Set<string>()
  const pairRes = [
    /id:\s*'([^']+)',\s*\n\s*year:\s*(-?\d+)/g,
    /"id":\s*"([^"]+)",\s*\n\s*"year":\s*(-?\d+)/g,
  ]
  for (const f of files) {
    if (f === idiomsPath) continue
    const text = readFileSync(f, 'utf8')
    for (const re of pairRes) {
      for (const m of text.matchAll(re)) eventPairs.add(`${m[1]}@${m[2]}`)
    }
  }

  for (const e of idioms) {
    const link = e.eraLink
    if (!link || link.kind !== 'event') continue
    if (!link.id) {
      add('fail', 'chengyu-eralink-unresolved', `成語 ${e.id}`, 'kind=event 但沒有 id')
      continue
    }
    if (link.year === undefined) {
      add('fail', 'chengyu-eralink-unresolved', `成語 ${e.id}（${e.lemma}）`, 'kind=event 但沒有 year，無法核對')
      continue
    }
    if (!eventPairs.has(`${link.id}@${link.year}`)) {
      add(
        'fail',
        'chengyu-eralink-unresolved',
        `成語 ${e.id}（${e.lemma}）`,
        `eraLink 指向事件「${link.id}」@${link.year}，但沒有任何時間軸資料裡存在 id=${link.id} 且 year=${link.year} 的事件` +
          `（id 存在但年不同、或只是 key year 都不算）——卡片上的事件連結會失效`,
      )
    }
  }
}

// ── 5. 底圖 <img> 的 object-fit 必須與同檔 SVG 的 preserveAspectRatio 配對 ──
// §1S 那個 bug（色塊錯位 30px 以上）的根因就是 cover 配 meet：
// 底圖按 max 比例放大並裁切，SVG 按 min 比例完整塞入，兩層比例與位移都不同。
// LayoutGuard 在執行時會抓；這裡離線抓，CI 就能擋。
{
  const cssPath = join(SRC, 'App.css')
  const css = readFileSync(cssPath, 'utf8')

  const objectFitForClass = (cls: string): string | null => {
    const re = new RegExp('\\.' + cls + '\\s*\\{([^}]*)\\}', 'g')
    for (const m of css.matchAll(re)) {
      const f = /object-fit:\s*([a-z-]+)/.exec(m[1]!)
      if (f) return f[1]!
    }
    return null
  }

  // 配對表：contain↔meet、cover↔slice、fill↔none
  const PAIR: Record<string, string> = { contain: 'meet', cover: 'slice', fill: 'none' }

  for (const f of files) {
    if (!f.endsWith('.tsx')) continue
    const src = readFileSync(f, 'utf8')
    const imgs = [...src.matchAll(/<img\b([\s\S]*?)\/>/g)]
      .map((m) => /className=\{?"([A-Za-z0-9_ -]+)"/.exec(m[1]!)?.[1]?.trim())
      .filter((c): c is string => Boolean(c))
    const pars = [...src.matchAll(/<svg\b([\s\S]*?)>/g)]
      .map((m) => /preserveAspectRatio=\{?"([^"]+)"/.exec(m[1]!)?.[1])
    if (imgs.length === 0 || pars.length === 0) continue

    for (const cls of imgs) {
      const fit = objectFitForClass(cls)
      for (const parRaw of pars) {
        const par = (parRaw ?? 'meet').split(/\s+/).pop() ?? 'meet'
        const where = rel(f)
        if (!fit) {
          add(
            'warn',
            'basemap-fit-unspecified',
            where,
            `<img class="${cls}"> 在 App.css 沒有 object-fit（預設 fill），但同檔 SVG 用 ${parRaw ?? '(預設 meet)'}：疊加層會錯位。`,
          )
          continue
        }
        if (PAIR[fit] !== par) {
          add(
            'fail',
            'basemap-fit-mismatch',
            where,
            `<img class="${cls}"> object-fit:${fit} 必須配 preserveAspectRatio=${PAIR[fit]}，` +
              `但同檔 SVG 是 ${par}。兩層比例與位移不同，歷史色塊會偏離底圖（見 HANDOVER §1S）。`,
          )
        }
      }
    }
  }
}

// ── 6. 跨國連結（crossRefs）的時代 id 與年份必須對得上 ──
// 跨國連結是給讀者跳的：era id 打錯就靜默失靈，年份超出那個時代的跨度
// 就會跳進一個「這一年不在這裡」的專題。兩邊都要離線檢查。
{
  const topicSrc = readFileSync(join(SRC, 'state', 'TopicContext.tsx'), 'utf8')

  const slotsOf = (name: string) => {
    const at = topicSrc.indexOf(`export const ${name}`)
    if (at < 0) return [] as { id: string; from: number | null; to: number | null }[]
    // 注意：型別註解 `EraSlotMeta<ChinaEraSlot>[]` 裡也有 `]`，
    // 必須從 `= [` 之後找陣列真正的結尾，否則解析出來是空的。
    const open = topicSrc.indexOf('= [', at)
    const end = topicSrc.indexOf('\n]', open)
    if (open < 0 || end < 0) return [] as { id: string; from: number | null; to: number | null }[]
    const body = topicSrc.slice(open, end)
    const yearOf = (range: string): [number | null, number | null] => {
      const m = /(-?[\d,]+|前\s?[\d,]+)\s*[–-]\s*(前?\s?[\d,]+)/.exec(range)
      if (!m) return [null, null]
      const num = (s: string) => {
        const t = s.replace(/[,\s]/g, '')
        return t.startsWith('前') ? -Number(t.slice(1)) : Number(t)
      }
      return [num(m[1]!), num(m[2]!)]
    }
    return [...body.matchAll(/\{\s*id: '([a-z]+)',\s*label: '[^']*',\s*range: '([^']*)'/g)].map(
      (m) => {
        const [from, to] = yearOf(m[2]!)
        return { id: m[1]!, from, to }
      },
    )
  }
  const chinaSlots = slotsOf('CHINA_ERA_SLOTS')
  const japanSlots = slotsOf('JAPAN_ERA_SLOTS')

  for (const f of files) {
    const src = readFileSync(f, 'utf8')
    // .ts 用單引號、.json 用雙引號，兩種都要掃（日本近現代的年表在 JSON 裡）
    for (const m of src.matchAll(
      /"?topic"?\s*:\s*["'](china|japan)["']\s*,\s*"?era"?\s*:\s*["']([a-z]+)["']\s*,\s*"?year"?\s*:\s*(-?\d+)/g,
    )) {
      const [, topic, era, yearRaw] = m
      const year = Number(yearRaw)
      const where = rel(f)
      const slot = (topic === 'china' ? chinaSlots : japanSlots).find((s) => s.id === era)
      if (!slot) {
        add(
          'fail',
          'crossref-bad-era',
          where,
          `crossRefs 指向 ${topic} 的時代 id「${era}」不存在於 CHINA_ERA_SLOTS / JAPAN_ERA_SLOTS，連結會靜默失靈。`,
        )
        continue
      }
      if (slot.from !== null && slot.to !== null && (year < slot.from || year > slot.to)) {
        add(
          'fail',
          'crossref-year-out-of-era',
          where,
          `crossRefs 指向「${slot.id}」但年份 ${year} 不在其跨度 ${slot.from}–${slot.to} 內：跳過去看不到這件事。`,
        )
      }
    }
  }
}

const fails = issues.filter((i) => i.level === 'fail')
const warns = issues.filter((i) => i.level === 'warn')

const lines = [
  '# 掛載稽核（wiring）',
  '',
  `路由裡會出現的 app：${[...routed].sort().join('、')}`,
  '',
  `掃描的 app 殼層：${appShells.length} 個；公認未掛路由：${Object.keys(UNROUTED_APPS).length} 個`,
  '',
  '## fail',
  '',
  ...(fails.length ? fails.map((i) => `- **${i.code}** · \`${i.location}\` — ${i.message}`) : ['_（無）_']),
  '',
  '## warn',
  '',
  ...(warns.length ? warns.map((i) => `- **${i.code}** · \`${i.location}\` — ${i.message}`) : ['_（無）_']),
  '',
  '---',
  '',
  '稽核腳本：`scripts/audit-wiring.ts`。成語面板曾因掛在未掛路由的 app 而全站看不見，',
  '這份稽核就是為了讓那種形狀的 bug 無法通過 CI。',
  '',
].join('\n')

writeFileSync(join(ROOT, 'docs/WIRING.md'), lines, 'utf8')

console.log(
  `audit:wiring — fail ${fails.length}, warn ${warns.length}（路由 app ${routed.size}、殼層 ${appShells.length}）`,
)
console.log('Report: docs/WIRING.md')

if (fails.length > 0) process.exitCode = 1
