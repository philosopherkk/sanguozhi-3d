#!/usr/bin/env node
/**
 * 地圖精度審計：版圖鍵是否有幾何、座標是否超出畫布、路線是否有對應事件。
 *
 * 三條規則各自對應一次真實 bug：
 *   1 territory-id-unresolved —— pack 引用了不存在的區塊 id（例：jp_home 未定義，
 *      日本本土從來不上色；國共內戰 38 省 id 解不到幾何，地圖全空白）
 *   2 coord-out-of-frame —— 座標為負或超出畫布（例：中途島 -177.37，位於畫布以外）
 *   3 route-year-no-event —— 路線該年無對應事件，違反「選定該年應同時顯示事件與路線」的設計
 *
 * 用法：node scripts/audit_map_accuracy.mjs [--json] [--fail-on-gap] [--teeth]
 *      --teeth 把壞 id 注入暫存根再掃一遍，確認每條規則都會咬（見檔尾 teeth 區塊）
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = process.cwd()
const argv = process.argv.slice(2)
const JSON_OUT = argv.includes('--json')
/** --teeth 用嘅暫存掃描根（見檔尾 teeth 區塊）：fixture 寫喺 `<根>/src/…`，
 *  令 rel 路徑同真樹一樣，畫布分派與版圖規則先會行到 fixture。 */
const FILES_ROOT_ARG = argv.find((x) => x.startsWith('--files-root='))
const SCAN_ROOT = FILES_ROOT_ARG ? resolve(FILES_ROOT_ARG.slice('--files-root='.length)) : ROOT

/** 畫布：中國底圖與日本 relief 同用 1968×1567；容差留俾附圖。 */
const CANVAS = { w: 1968, h: 1567 }
const FRAME_TOL = 420

function walk(dir, out = []) {
  let ents
  try {
    ents = readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of ents) {
    const full = join(dir, e.name)
    if (e.isDirectory()) walk(full, out)
    else if (e.name.endsWith('.ts') && !e.name.endsWith('.test.ts') && !e.name.endsWith('.d.ts'))
      out.push(full)
  }
  return out
}

const files = walk(join(SCAN_ROOT, 'src'))
const read = (f) => readFileSync(f, 'utf8')
const rel = (f) => relative(SCAN_ROOT, f).replace(/\\/g, '/')

/** 由 `{` 起以深度計數返區塊內容（不靠正則配對，避免嵌套漏抓）。 */
function blockBody(text, braceIdx) {
  let depth = 0
  for (let i = braceIdx; i < text.length; i++) {
    const c = text[i]
    if (c === '{') depth += 1
    else if (c === '}') {
      depth -= 1
      if (depth === 0) return text.slice(braceIdx + 1, i)
    }
  }
  return ''
}

/** 控制區塊入面嘅 metadata 鍵，唔係版圖 id（年 → 月 → `{ note, control }` 呢類
 *  巢狀結構會把呢啲鍵一齊交俾 controlKeys，唔隔離就會誤報 territory-id-unresolved。
 *  呢啲名冇一個係本庫嘅區塊 id；teeth 有控制樣本盯住，防止將來有人加錯嘢。 */
const NON_DOMAIN_KEYS = new Set([
  'note',
  'control',
  'territoryByYear',
  'source',
  'shadeNote',
  'labelNote',
  'geometryNote',
  'territoryNote',
  'label',
  'name',
  'id',
  'year',
  'month',
  'type',
  'kind',
  'desc',
  'brief',
  'factions',
  'location',
  'title',
  'caption',
  'color',
  'fill',
  'capital',
  'seat',
])

/** 找出「有內嵌幾何嘅物件」嘅 id：由 `ring:` 等鍵回溯到包住佢嘅 `{`，再喺嗰段搵
 *  最接近嘅 `id:`。事件、路線、人物都係 `id:` 字面量，但佢哋冇 ring，故唔會被當版圖 id。 */
const GEOM_KEY = /\b(?:extraRings|rings|ring|polys|poly|geometry|circles)\s*:/g
function localDomainIds(text) {
  const out = new Set()
  for (const m of text.matchAll(GEOM_KEY)) {
    let depth = 0
    let open = -1
    for (let i = m.index; i >= 0; i--) {
      const c = text[i]
      if (c === '}') depth += 1
      else if (c === '{') {
        depth -= 1
        if (depth < 0) {
          open = i
          break
        }
      }
    }
    if (open < 0) continue
    const ids = [...text.slice(open, m.index).matchAll(new RegExp(String.raw`\bid:\s*['"]([\p{Script=Han}\w-]+)['"]`, 'gu'))]
    const last = ids[ids.length - 1]
    if (last) out.add(last[1])
  }
  return out
}

/** 由區塊內容抽出「鍵: '值'」形式之鍵（跳過純數字年鍵）。
 *  值可以係引號字串，亦可以係 `IMJIN_F.jp` 呢類常數引用——只認前者會令
 *  整批用常數寫的快照鍵逃過檢查，閘門對嗰啲包永遠全綠。 */
function controlKeys(body) {
  const out = new Set()
  const RE = new RegExp(
    String.raw`['"]?([A-Za-z_\p{Script=Han}][\w\p{Script=Han}-]{1,40})['"]?\s*:\s*(?:'[^']*'|"[^"]*"|[A-Za-z_$][\w$.]*)`,
    // 'u' 一定要喺度：冇佢 `\p{Script=Han}` 就係普通字元集，CJK 鍵照樣靜悄悄失明
    //（本檔第一次寫呢條正則就係咁，靠 --teeth 案例 D 先捉到）。
    'gu',
  )
  for (const m of body.matchAll(RE)) {
    if (NON_DOMAIN_KEYS.has(m[1])) continue
    out.add(m[1])
  }
  return out
}

/** territoryByYear 的區塊 id 位於第二層（年 → 區塊 → 勢力）。 */
function territoryKeys(body) {
  const out = new Set()
  for (const m of body.matchAll(/\{\s*([^{}]*)\}/g)) {
    for (const k of controlKeys(m[1])) out.add(k)
  }
  return out
}

/** `territoryByYear: CONTROL` 呢類識別碼引用：搵同檔嘅 `const CONTROL … = {` 取區塊。
 *  只認「初始化式直接以 `{` 開始」：用 helper 產生嘅（例：`const x = paint(…)`）要傳回
 *  空字串，否則搵唔到花括號就會食到隔籬區塊嘅鍵，把 `note` 之類誤判成版圖鍵。 */
function namedObjectBody(text, name) {
  const m = new RegExp(`\\b(?:const|let|var)\\s+${name}\\b[^=;]*=`).exec(text)
  if (!m) return ''
  let i = m.index + m[0].length
  while (i < text.length && /[\s(]/.test(text[i])) i += 1
  return text[i] === '{' ? blockBody(text, i) : ''
}

// 亞洲戰區畫布（1710×1000）：明治至當代＋朝鮮之役窗口同用 asiaPx 直寫經緯度。
// 要喺呢度：下面嘅版圖規則靠呢個名單判「呢個 id 有冇本畫布嘅幾何」。
const WAR_THEATRE = /^src\/japanEras\/packs\/(modernJapanPack|imjinWar)\.ts$/

/** 幾何註冊表：三國州郡、歷史上環、亞洲戰區範圍。
 *  產生器產物用雙引號、手寫檔用單引號，兩種都要認——只認一種會令整批 id 喺
 *  註冊表消失，配咗名嘅版圖鍵就永遠查唔到（imjinTerritory.ts 就係咁逃咗一輪）。 */
const geometryIds = new Set()
/** 只有呢兩檔嘅 id 先有 1710×1000 戰區畫布嘅幾何。 */
const warGeoIds = new Set()
const addFrom = (file, re, extra) => {
  let t
  try {
    t = read(join(ROOT, file))
  } catch {
    return
  }
  for (const m of t.matchAll(re)) {
    geometryIds.add(m[1])
    if (extra) extra.add(m[1])
  }
}
/** id 與版圖鍵嘅字元集要認中文：`src/data/provinces.ts` 用 `id: '遼東'`，只認 ASCII
 *  就等於成批註冊表 id 對閘門消失，而日後一旦出現 CJK 版圖鍵，整套規則會安靜失明。 */
const ID_Q = new RegExp(String.raw`\bid:\s*['"]([\p{Script=Han}\w-]+)['"]`, 'gu')
addFrom('src/data/provinces.ts', ID_Q)
addFrom('src/geo/eraRegions.ts', /"([a-z_0-9]+)":\[\[/g)
addFrom('src/geo/asiaWarTerritory.ts', ID_Q, warGeoIds)
addFrom('src/geo/imjinTerritory.ts', ID_Q, warGeoIds)
// 環檔嘅鍵係雙引號（`"matsumae": [[[`），正則唔認引號就一個都食唔到——
// 呢條線斷咗嗰陣 matsumae／hokkaido／ryukyu 三個 id 對閘門完全消失。
addFrom('src/geo/japanEraRings.ts', /"([a-z_0-9]+)"\s*:\s*\[/g)
// jpDomains.ts 自己用 `id: d.id`（識別碼，ID_Q 食唔到），真正嘅日本區塊 id 係
// tracedDomains.ts 嘅 d0–d27；只讀 jpDomains 等於呢批 id 從來唔喺註冊表入面。
addFrom('src/sengoku/data/tracedDomains.ts', ID_Q)

const issues = []
const add = (level, code, where, msg) => issues.push({ level, code, where, msg })
const coverage = []

for (const f of files) {
  const t = read(f)
  const r = rel(f)

  // 本檔自行宣告、**而且同一個物件字面量內真的有幾何**（ring/rings/polys…）嘅區塊 id。
  // 淨認 `id:` 係假綠路徑：pack 檔內有幾十個事件 id／路線 id（例：`mj-1874-taiwan`），
  // 寫錯嘅版圖鍵只要撞名就「有幾何」，實際上嗰塊永遠唔會上色。見 --teeth 案例 D。
  const localIds = localDomainIds(t)

  // 1) 版圖鍵必須解到幾何（此條規則對應真實 bug：控制鍵解不到幾何 → 全圖空白）
  //    `territoryByYear: CONTROL`（識別碼引用）同 `territoryByYear: {…}` 一樣要查：
  //    只認花括號會令成份快照靜靜逃出閘門，朝鮮之役窗口就係咁瞞過寫錯嘅 `kyushu`。
  const keys = new Set()
  for (const m of t.matchAll(/\b(control|territoryByYear)\s*:\s*(\{|[A-Za-z_$][\w$]*)/g)) {
    const body = m[2] === '{' ? blockBody(t, m.index + m[0].length - 1) : namedObjectBody(t, m[2])
    for (const k of m[1] === 'control' ? controlKeys(body) : territoryKeys(body)) keys.add(k)
  }
  // （曾經這裡有第三條逃生門：`factions` 陣度入面嘅 id 也算版圖 id。實測淨靠佢解析
  //   嘅版圖鍵 0 個，而佢同「路線 id 撞名」一樣係假綠路徑，故抽走。見 --teeth 案例 D。）
  // 1b) 全域註冊表睇唔到畫布：id 喺別的畫布有幾何（或者畀別檔一個無關嘅 `id:`
  //     字面量湊巧配中），喺亞洲戰區 1710×1000 畫布上冇幾何，結果一樣係永遠唔上色。
  //     只查戰區檔案；其他畫布嘅 pack 用全域註冊表已夠。
  //     勘誤：本檔上一輪commit 寫「實測 `kyushu` 解到 jpDomains 嘅九州」係錯——
  //     `kyushu` 從來唔係區塊 id（jpDomains 用 `id: d.id`，佢只係 marchRoutes 嘅路線 id）。
  //     寫錯嘅 `kyushu` 能瞞過閘門，真正原因是上面三個解析盲點（識別碼引用／雙引號 id／
  //     常數值），唔係跨畫布同名。見 --teeth 案例 A。
  if (WAR_THEATRE.test(r)) {
    const offCanvas = [...keys].filter((id) => !warGeoIds.has(id) && !localIds.has(id))
    if (offCanvas.length) {
      add(
        'fail',
        'territory-id-off-canvas',
        r,
        `亞洲戰區畫布（1710×1000）冇呢啲版圖鍵嘅幾何：${offCanvas.join('、')}（同名 id 或存在於其他畫布，但本畫布畫唔到）`,
      )
    }
  }
  const unresolved = new Map()
  for (const id of keys) {
    if (geometryIds.has(id) || localIds.has(id)) continue
    unresolved.set(id, (unresolved.get(id) ?? 0) + 1)
  }
  for (const [id, n] of unresolved) {
    add('fail', 'territory-id-unresolved', r, `版圖鍵「${id}」在任何幾何註冊表都找不到（${n} 處）→ 該區塊永遠不會上色`)
  }

  // 2) 路線座標
  let routeCount = 0
  const routeYears = []
  for (const m of t.matchAll(/points:\s*\[([\s\S]{0,1600}?)\]\s*,?\s*\n/g)) {
    const pts = [...m[1].matchAll(/\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]/g)]
    if (pts.length === 0) continue
    routeCount += 1
    for (const p of pts) {
      const x = Number(p[1])
      const y = Number(p[2])
      if (x < 0 || y < 0) {
        add('fail', 'coord-out-of-frame', r, `座標為負 [${x}, ${y}]，位於畫布以外`)
      } else if (x > CANVAS.w + FRAME_TOL || y > CANVAS.h + FRAME_TOL) {
        add('fail', 'coord-out-of-frame', r, `座標 [${x}, ${y}] 超出畫布 ${CANVAS.w}×${CANVAS.h}（容差 ${FRAME_TOL}）`)
      }
    }
  }
  for (const m of t.matchAll(/routes:|MARCH_ROUTES|\broutes\b\s*=\s*\[/g)) void m
  for (const m of t.matchAll(/year:\s*(-?\d{1,4})\b/g)) routeYears.push(Number(m[1]))

  if (routeCount > 0) {
    // 3) 路線該年是否有事件（同一檔最可靠；跨檔只作提醒）
    const eventYears = new Set()
    for (const m of t.matchAll(/\bid:\s*['"][\w:.-]+['"][\s\S]{0,240}?year:\s*(-?\d{1,4})/g)) {
      eventYears.add(Number(m[1]))
    }
    if (eventYears.size > 0) {
      const routeOnly = new Set()
      for (const m of t.matchAll(/\bid:\s*['"][\w:.-]+['"][\s\S]{0,200}?points:/g)) {
        const seg = m[0].match(/year:\s*(-?\d{1,4})/)
        if (seg && !eventYears.has(Number(seg[1]))) routeOnly.add(Number(seg[1]))
      }
      for (const y of routeOnly) {
        add('warn', 'route-year-no-event', r, `${y} 年有路線但同檔無同年事件（選定該年將看不到事件）`)
      }
    }
    coverage.push({ file: r, routes: routeCount })
  }
}

/**
 * 規則 4–6：海路應落在海面、陸路不應穿海。
 *
 * 底幾何取 src/geo/asiaWarBase.ts 的 ASIA_LAND（Natural Earth 1:50m 派生）。
 * 該底圖並非測繪級海岸線，因此一律留 COAST_TOL 度數的海岸容差：貼岸的點一概不判，
 * 以免用示意底圖誤殺真實渡口（風陵渡、橫跨朝鮮海峽的貼岸段等）。
 *
 * 啟動前先用已知地標自我校對。自校不過即代表投影或遮罩假設已壞——直接硬失敗，
 * 不接受「載入失敗就視為沒有問題」，那正是本輪在 audit-chars 上查出的失效模式。
 */
/**
 * 規則 4–6：海路應落在海面、陸路不應穿海。
 *
 * 路線 points 存的是底圖畫布 px（實測 802–1557，非經緯度），所以比對前先要把
 * 陸地遮罩投影到同一個畫布：遮罩取 src/geo/landMask.ts 的 LAND_MASK_RING（經緯度），
 * 投影式沿用 scripts/audit_geo.py 的 china_px（同支腳本已用它核過版圖幾何）。
 *
 * 該遮罩是示意海岸線（檔頭自己寫「not a surveyed coastline」），因此：
 *   1 留 COAST_TOL_DEG 度數的海岸容差，貼岸的點一概不判（渡口、灣澳不誤殺）；
 *   2 遮罩範圍以外的點只計數、不判定，避免把「無資料」當「無問題」；
 *   3 啟動前先用 audit_geo.py 既有的一組海陸錨點自我校對，校不對即硬失敗。
 */
const COAST_TOL_DEG = 0.4
const PI = Math.PI
function chinaPx(lat, lon, w, h) {
  const x =
    50 +
    116.80932603407057 * ((1.9996655301850468 - (lat * PI) / 180) * Math.sin((0.5867115434267053 * (lon - 104) * PI) / 180))
  const y =
    50 +
    1.256383 * 116.80932603407057 * 0.02641006622571962 -
    1.256383 *
      116.80932603407057 *
      (1.3713469994670882 - (1.9996655301850468 - (lat * PI) / 180) * Math.cos((0.5867115434267053 * (lon - 104) * PI) / 180))
  return [(x / 100) * w, (y / 100) * h]
}
/**
 * 陸地遮罩：用 src/geo/asiaWarBase.ts 的 ASIA_LAND（Natural Earth 1:50m，戰區 60–190E／−14–62N）。
 * 為什麼不用 src/geo/landMask.ts：那是一塊「東漢／三國海岸線」示意多邊形，北界只到 42.8°N 且不含滿洲，
 * 拿它判遼瀋戰役或抗日路線會把瀋陽、長春判成外海（實測如此），屬系統性誤判。
 * ASIA_LAND 是戰區畫布（1710×1000）的線性投影，可先反算成經緯度，再用 china_px 投到路線所在畫布。
 */
const ASIA = (() => {
  const war = read(join(ROOT, 'src/geo/asiaWarBase.ts'))
  const num = (name) => {
    const m = war.match(new RegExp(`export const ${name} = (-?[\\d.]+)`))
    return m ? Number(m[1]) : null
  }
  const c = {
    ww: num('ASIA_WAR_W'),
    wh: num('ASIA_WAR_H'),
    lo0: num('ASIA_LON0'),
    lo1: num('ASIA_LON1'),
    la0: num('ASIA_LAT0'),
    la1: num('ASIA_LAT1'),
  }
  c.rings = []
  const body = war.match(/export const ASIA_LAND: string\[\] = \[([\s\S]*?)\n\]/)
  if (body && [c.ww, c.wh, c.lo0, c.lo1, c.la0, c.la1].every((v) => v != null)) {
    for (const s of body[1].matchAll(/'([^']{60,})'/g)) {
      const ring = []
      for (const seg of s[1].matchAll(/([ML])(-?[\d.]+)\s+(-?[\d.]+)/g)) {
        const wx = Number(seg[2])
        const wy = Number(seg[3])
        if (wx < -c.ww || wx > c.ww * 2 || wy < -c.wh || wy > c.wh * 2) continue // 超出戰區的折返點
        ring.push([c.lo0 + (wx / c.ww) * (c.lo1 - c.lo0), c.la1 - (wy / c.wh) * (c.la1 - c.la0)])
      }
      if (ring.length >= 8) c.rings.push(ring)
    }
  }
  return c
})()
if (ASIA.rings.length === 0) {
  console.error('audit:map — 載入 ASIA_LAND 失敗，海陸規則無法執行（拒絕當成通過）')
  process.exit(1)
}
/**
 * 日本戰區底圖：japan_relief 等距圓柱（東漢—明治的日本圖都畫在呢度）。畫布尺寸讀
 * src/sengoku/data/regions.ts，投影邊界讀 scripts/tighten_land_borders.py 的 JP_N/S/W/E，
 * 一律不另抄常數——舊版正因為冇呢套映射，日本戰區 67 條路線全部跳過不判。
 */
const JP = (() => {
  const reg = read(join(ROOT, 'src/sengoku/data/regions.ts'))
  const py = read(join(ROOT, 'scripts/tighten_land_borders.py'))
  const o = {
    w: Number(reg.match(/SENGOKU_MAP_W\s*=\s*(\d+)/)?.[1]),
    h: Number(reg.match(/SENGOKU_MAP_H\s*=\s*(\d+)/)?.[1]),
  }
  const b = py.match(/JP_N,\s*JP_S,\s*JP_W,\s*JP_E\s*=\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)/)
  if (b) [o.n, o.s, o.west, o.e] = b.slice(1).map(Number)
  return o
})()
function inRing([x, y], ring) {
  let hit = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}
/** 錨點一律經緯度，由每個畫布各自用自己的投影式判海陸；自校不過即整支腳本失敗。 */
const ANCHORS = {
  // 中國戰區：沿用 scripts/audit_geo.py 的 ANCHORS，並補滿洲與朝鮮半島。
  china: [
    ['黃海中央', 124.0, 36.0, false],
    ['東海中央', 125.5, 30.0, false],
    ['南海中央', 116.0, 18.0, false],
    ['渤海中央', 119.8, 39.0, false],
    ['台灣海峽', 119.0, 23.5, false],
    ['北部灣', 107.8, 20.0, false],
    ['朝鮮海峽', 128.0, 34.5, false],
    ['中原（鄭州）', 113.6, 34.7, true],
    ['成都', 104.1, 30.6, true],
    ['廣州', 113.3, 23.1, true],
    ['瀋陽', 123.4, 41.8, true],
    ['長春', 125.3, 43.9, true],
    ['哈爾濱', 126.6, 45.8, true],
    ['大連', 121.6, 38.95, true],
    ['平壤', 125.7, 39.0, true],
    ['漢城', 127.0, 37.5, true],
    ['東京', 139.7, 35.7, true],
    // 東北亞（2026-11-08 遼東灣交辦所補）：一律取離岸 ≥0.3° 的點，避免用 1:50m 岸線卡貼岸細節
    ['渤海海峽', 121.0, 38.3, false],
    ['遼東灣中央', 121.5, 40.5, false],
    ['鴨綠江口外', 124.0, 39.5, false],
    ['朝鮮灣口', 125.0, 38.0, false],
    ['黃海北部', 123.0, 38.5, false],
    ['日本海（束草外海）', 129.2, 38.8, false],
    ['珍島海峽外', 126.2, 34.2, false],
    ['遼陽', 123.18, 41.27, true],
    ['吉林', 126.55, 43.84, true],
    ['海城', 122.75, 40.88, true],
    ['北鎮', 121.8, 41.6, true],
    ['開城', 126.58, 37.97, true],
    ['首爾', 126.98, 37.57, true],
  ],
  // 日本戰區（japan_relief 1482×1477）：灣澳取灣內水心，陸點取城市中心。
  // 口徑：1:50m 岸線畫不出 <1km 的灣澳與狹頸，所以市街太貼岸的點（函館市街 41.77N、
  // 下關市街 33.95N、釜山市街 35.10N、高松市街 34.35N）在呢個比例尺下會落水，錨點一律
  // 移到實地仍然係陸的位置並在名度寫明（七飯、山口（下關以東）、釜山（北郊））。
  // 這些係底圖解析度上限，不是路線畫錯；判路線時一律靠 COAST_TOL_DEG 貼岸容差兜住。
  japan: [
    ['東京灣', 139.78, 35.4, false],
    ['相模灣', 139.4, 35.2, false],
    ['駿河灣', 138.7, 34.7, false],
    ['伊勢灣', 136.75, 34.9, false],
    ['大阪灣', 135.3, 34.55, false],
    ['瀨戶內海', 133.5, 34.25, false],
    ['若狹灣', 135.9, 35.65, false],
    ['富山灣', 137.05, 36.87, false],
    ['津輕海峽', 140.4, 41.4, false],
    ['宗谷海峽', 142.1, 45.45, false],
    ['日本海（秋田外海）', 139.4, 39.8, false],
    ['太平洋（房總外海）', 140.9, 35.0, false],
    ['朝鮮海峽（對馬西口）', 128.9, 34.4, false],
    ['豐後水道', 132.0, 32.8, false],
    ['五島外海（東海）', 128.3, 32.6, false],
    ['沖繩以東（太平洋）', 128.6, 26.2, false],
    ['東京', 139.69, 35.69, true],
    ['大阪', 135.5, 34.69, true],
    ['京都', 135.77, 35.01, true],
    ['名古屋', 136.91, 35.18, true],
    ['廣島', 132.46, 34.4, true],
    ['山口（下關以東）', 130.98, 34.02, true],
    ['博多', 130.42, 33.59, true],
    ['鹿兒島', 130.56, 31.6, true],
    ['熊本', 130.7, 32.79, true],
    ['長崎', 129.87, 32.74, true],
    ['高松', 134.05, 34.3, true],
    ['松山', 132.77, 33.84, true],
    ['金澤', 136.65, 36.56, true],
    ['新潟', 139.04, 37.92, true],
    ['仙台', 140.87, 38.27, true],
    ['盛岡', 141.15, 39.7, true],
    ['青森', 140.74, 40.82, true],
    ['七飯（渡島，函館北）', 140.65, 41.85, true],
    ['札幌', 141.35, 43.06, true],
    ['旭川', 142.36, 43.77, true],
    ['甲府', 138.57, 35.66, true],
    ['長野', 138.19, 36.23, true],
    ['松江', 133.05, 35.47, true],
    ['那霸', 127.69, 26.21, true],
  ],
  // 亞洲戰區畫布（近代日本 pack 的底圖）：直接驗 ASIA_LAND 本身。
  war: [
    ['渤海中央', 119.8, 39.0, false],
    ['大東溝海域（黃海）', 124.6, 39.2, false],
    ['對馬海峽', 129.2, 34.3, false],
    ['呂宋以北海域', 123.0, 18.5, false],
    ['爪哇海', 110.5, -5.0, false],
    ['南海（巴拉望西）', 114.0, 9.5, false],
    ['中途島海域', 180.0, 28.5, false],
    ['東京灣', 139.78, 35.4, false],
    ['東京', 139.69, 35.69, true],
    ['旅順', 121.27, 38.9, true],
    ['大連', 121.6, 38.95, true],
    ['瀋陽', 123.43, 41.8, true],
    ['漢城', 126.98, 37.57, true],
    ['釜山（北郊）', 129.04, 35.2, true],
    ['海參崴', 131.9, 43.1, true],
    ['豐原（樺太）', 142.9, 47.0, true],
    ['馬尼拉', 120.98, 14.6, true],
    ['新加坡', 103.82, 1.35, true],
    ['上海', 121.47, 31.23, true],
    ['那霸', 127.69, 26.21, true],
  ],
}
/** 三個畫布各自把同一份 ASIA_LAND 投過去；容差按各畫布 1° 經度的 px 數量算，不可共用一個常數。 */
const CANVASES = {
  china: { label: '中國戰區', w: CANVAS.w, h: CANVAS.h, px: (lat, lon) => chinaPx(lat, lon, CANVAS.w, CANVAS.h) },
  japan: {
    label: '日本戰區',
    w: JP.w,
    h: JP.h,
    px: (lat, lon) => [((lon - JP.west) / (JP.e - JP.west)) * JP.w, ((JP.n - lat) / (JP.n - JP.s)) * JP.h],
  },
  war: {
    label: '亞洲戰區',
    w: ASIA.ww,
    h: ASIA.wh,
    px: (lat, lon) => [
      ((lon - ASIA.lo0) / (ASIA.lo1 - ASIA.lo0)) * ASIA.ww,
      ((ASIA.la1 - lat) / (ASIA.la1 - ASIA.la0)) * ASIA.wh,
    ],
  },
}
const selfCheck = []
for (const [key, c] of Object.entries(CANVASES)) {
  const req = key === 'japan' ? [c.w, c.h, JP.n, JP.s, JP.west, JP.e] : [c.w, c.h]
  if (!req.every((v) => Number.isFinite(v))) {
    console.error(
      `audit:map — ${c.label}畫布或投影邊界讀取失敗（${req.join(', ')}），拒絕執行（不接受「讀不到當無問題」）`,
    )
    process.exit(1)
  }
  c.polys = ASIA.rings.map((r) => r.map(([lon, lat]) => c.px(lat, lon)))
  c.isLand = (p) => c.polys.some((ring) => inRing(p, ring))
  const [deg1] = c.px(35, 121)
  const [deg0] = c.px(35, 120)
  c.tolPx = Math.abs(deg1 - deg0) * COAST_TOL_DEG
  /** 貼岸判定：自身與上下左右各 tolPx，只要有一格係陸地即視為岸邊，不判。 */
  c.nearCoast = (p) =>
    [
      [0, 0],
      [c.tolPx, 0],
      [-c.tolPx, 0],
      [0, c.tolPx],
      [0, -c.tolPx],
    ].some(([dx, dy]) => c.isLand([p[0] + dx, p[1] + dy]))
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const ring of c.polys)
    for (const [x, y] of ring) {
      x0 = Math.min(x0, x)
      y0 = Math.min(y0, y)
      x1 = Math.max(x1, x)
      y1 = Math.max(y1, y)
    }
  c.maskBox = { x0: x0 - c.tolPx, y0: y0 - c.tolPx, x1: x1 + c.tolPx, y1: y1 + c.tolPx }
  c.scanned = 0
  c.short = 0
  c.pointsNoMask = 0
  for (const [name, lon, lat, want] of ANCHORS[key]) {
    if (c.isLand(c.px(lat, lon)) !== want)
      selfCheck.push(`${c.label}：${name}(${lon},${lat}) 期望${want ? '陸' : '海'}`)
  }
}
if (selfCheck.length) {
  console.error(
    'audit:map — 陸地遮罩／投影自我校對失敗，海陸規則不可信：\n  ' + selfCheck.join('\n  '),
  )
  process.exit(1)
}

/**
 * 檔案 → 畫布：路線 points 存在邊個畫布，取決於該戰區用邊張底圖，判錯就成批誤判。
 *   中國戰區  china_edcp_relief 1968×1567，投影 china_px
 *   日本戰區  japan_relief 1482×1477（src/sengoku/data/regions.ts SENGOKU_MAP_W/H），投影 japan_px
 *   亞洲戰區  Natural Earth 戰區畫布 1710×1000（modernJapanPack 用 asiaPx 直寫經緯度）
 * 名單之外一律跳過並計數，而且報紅——未登記的新戰區不可默默溜過。
 */
const CHINA_THEATRE = /^src\/(data|zhou|qinhan|imperial)\//
const JAPAN_THEATRE = /^src\/(sengoku|bakumatsu|heian|japanEras)\//
// WAR_THEATRE 喺檔頭定義（版圖規則都要用），呢度只係畫布分派
/** points 係 prop 名而非資料的檔案（渲染元件），唔在海陸判定範圍。 */
const NON_DATA = /^src\/(components|lib)\//
const canvasOf = (relPath) => {
  if (WAR_THEATRE.test(relPath)) return CANVASES.war
  if (JAPAN_THEATRE.test(relPath)) return CANVASES.japan
  if (CHINA_THEATRE.test(relPath)) return CANVASES.china
  return null
}

/** 由 points: 的位置回溯到所屬物件的 {，避免向後固定窗口讀到上一條路線的欄位。 */
function objectStart(text, idx) {
  let depth = 0
  for (let i = idx - 1; i >= 0; i--) {
    const c = text[i]
    if (c === '}') depth += 1
    else if (c === '{') {
      if (depth === 0) return i
      depth -= 1
    }
  }
  return -1
}
/** 取該物件 body：由 start 的 { 起做深度配對。 */
function objectBody(text, start) {
  let depth = 0
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (c === '{') depth += 1
    else if (c === '}') {
      depth -= 1
      if (depth === 0) return text.slice(start + 1, i)
    }
  }
  return ''
}

/**
 * 一條路線的海陸判定口徑，三個畫布共用；cv 決定用邊套遮罩與容差。
 * 規則同舊版：海路落陸過半即 fail；陸路兩個以上點落外海先列 warn（貼灣誤判未清到零，
 * 升 fail 的條件係「各戰區都判過且連續兩輪冇新反例」，見 reports/map-human-decisions.md）。
 */
function judgeRoute(cv, file, rid, pts, isSeaRoute) {
  const box = cv.maskBox
  const covered = pts.filter((p) => p[0] >= box.x0 && p[0] <= box.x1 && p[1] >= box.y0 && p[1] <= box.y1)
  cv.pointsNoMask += pts.length - covered.length
  if (covered.length < 2) return
  const onLand = covered.filter((p) => cv.isLand(p))
  const openSea = covered.filter((p) => !cv.nearCoast(p))
  const tag = `【${cv.label}】`
  if (isSeaRoute && onLand.length * 2 >= covered.length) {
    add(
      'fail',
      'sea-route-over-land',
      file,
      `${tag}海路「${rid}」有 ${onLand.length}/${covered.length} 個點落在陸地上——海上交通或艦戰的路線不該畫在陸上`,
    )
  }
  if (!isSeaRoute && openSea.length >= 2) {
    // 暫列 warn：底圖是 1:50m 示意，容差只有貼岸級別的十餘 px，貼灣海岸線（遼東灣、
    // 瀨戶內海、大阪灣呢類）容易被判成外海。逐條判完先升 fail。
    add(
      'warn',
      'land-route-crosses-sea',
      file,
      `${tag}陸路「${rid}」有 ${openSea.length}/${covered.length} 個點落在外海（離岸 >${COAST_TOL_DEG}°）——要麼是海路（補 kind: 'sea'），要麼坐標有誤，要麼該點本就貼灣`,
    )
  } else if (!isSeaRoute && openSea.length === 1) {
    add('warn', 'land-route-sea-point', file, `${tag}陸路「${rid}」有 1 點落在外海，請人工判定：應拆出海路段，抑或該點坐標有誤`)
  }
}

let routesTotal = 0
let routesNonData = 0
const routesUnregistered = []
for (const f of files) {
  const t = read(f)
  const r = rel(f)
  if (!/points\s*:\s*\[/.test(t)) continue
  const cv = canvasOf(r)
  if (!cv) {
    const hits = [...t.matchAll(/\bpoints\s*:\s*\[/g)].length
    if (NON_DATA.test(r)) routesNonData += hits
    else routesUnregistered.push(`${r}（${hits} 條）`)
    continue
  }
  for (const m of t.matchAll(/\bpoints\s*:\s*\[/g)) {
    routesTotal += 1
    const start = m.index + m[0].length - 1
    let depth = 0
    let end = -1
    for (let i = start; i < t.length; i++) {
      if (t[i] === '[') depth += 1
      else if (t[i] === ']') {
        depth -= 1
        if (depth === 0) {
          end = i
          break
        }
      }
    }
    if (end < 0) {
      cv.short += 1
      continue
    }
    const pts = []
    for (const p of t.slice(start, end + 1).matchAll(/\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]/g)) {
      pts.push([Number(p[1]), Number(p[2])])
    }
    if (pts.length < 2) {
      cv.short += 1
      continue
    }
    cv.scanned += 1
    const objStart = objectStart(t, m.index)
    const body = objStart >= 0 ? objectBody(t, objStart) : ''
    const idHit = body.match(/\bid:\s*['"]([\w:.-]+)['"]/)
    const rid = idHit ? idHit[1] : '(未識別)'
    const isSeaRoute = /kind:\s*['"]sea['"]/.test(body)
    judgeRoute(cv, r, rid, pts, isSeaRoute)
  }
}

/**
 * 第二輪：「經緯度直寫」路線。modernJapanPack 的 points 由
 * route(id, name, year, faction, source, [[經度, 緯度], …]) 產生，檔內冇字面 `points: [`，
 * 第一輪掃描完全看不到——29 條近代日本路線（含黃海、威海衛、中途島、レイテ、沖縄）因此
 * 長期游離在閘門之外。呢輪經同一支 asiaPx 投到戰區畫布再判；kind 依 SEA_ROUTE_IDS
 * （檔內口徑：集合以外一律 land）。
 */
let lonLatTotal = 0
let lonLatParsed = 0
let lonLatShort = 0
for (const f of files) {
  const t = read(f)
  const r = rel(f)
  if (!/const\s+route\s*=\s*\(/.test(t) || !/\broute\(\s*'/.test(t)) continue
  const cv = canvasOf(r)
  if (!cv) {
    routesUnregistered.push(`${r}（經緯度直寫，未登記畫布）`)
    continue
  }
  const seaHit = t.match(/const\s+SEA_ROUTE_IDS\s*=\s*new\s+Set\(\[([\s\S]*?)\]\)/)
  const seaIds = new Set(seaHit ? [...seaHit[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [])
  for (const m of t.matchAll(/\broute\(\s*'([^']+)'\s*,/g)) {
    lonLatTotal += 1
    const open = t.indexOf('(', m.index)
    let depth = 0
    let close = -1
    for (let i = open; i < t.length; i++) {
      const ch = t[i]
      if (ch === '(') depth += 1
      else if (ch === ')') {
        depth -= 1
        if (depth === 0) {
          close = i
          break
        }
      }
    }
    const call = close > open ? t.slice(open, close + 1) : ''
    const arrStart = call.lastIndexOf('[[')
    const coords = []
    if (arrStart >= 0) {
      for (const p of call.slice(arrStart).matchAll(/\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]/g))
        coords.push([Number(p[1]), Number(p[2])])
    }
    if (coords.length < 2) {
      lonLatShort += 1
      continue
    }
    lonLatParsed += 1
    judgeRoute(cv, r, m[1], coords.map(([lo, la]) => cv.px(la, lo)), seaIds.has(m[1]))
  }
}

const scannedAll = Object.values(CANVASES).reduce((n, c) => n + c.scanned, 0)
const shortAll = Object.values(CANVASES).reduce((n, c) => n + c.short, 0)
const noMaskAll = Object.values(CANVASES).reduce((n, c) => n + c.pointsNoMask, 0)
for (const c of Object.values(CANVASES)) coverage.push({ file: `(海陸遮罩：${c.label})`, routes: c.scanned })
// 覆蓋率自校：解析到的路線數必須等於 points: 出現次數減去跳過數，
// 否則「0 命中」可能只是解析器漏抓或戰區未覆蓋，而不是資料乾淨。
if (routesTotal !== scannedAll + shortAll || routesUnregistered.length) {
  add(
    'fail',
    'route-scan-coverage',
    'src/**',
    `掃描 ${routesTotal} 個 points: 欄位，實際處理 ${scannedAll} 條、點數不足 ${shortAll} 條、未登記戰區 ${
      routesUnregistered.join('、') || '無'
    }——對不上，海陸規則的「0 命中」不可信`,
  )
}
if (lonLatTotal !== lonLatParsed + lonLatShort) {
  add(
    'fail',
    'route-scan-coverage',
    'src/**',
    `經緯度直寫路線 ${lonLatTotal} 條，實際解析 ${lonLatParsed} 條、點數不足 ${lonLatShort} 條——解析器漏抓，海陸規則的「0 命中」不可信`,
  )
}
add(
  'info',
  'route-sea-check-coverage',
  'src/**',
  `海陸判定覆蓋：中國戰區 ${CANVASES.china.scanned} 條／日本戰區 ${CANVASES.japan.scanned} 條／亞洲戰區 ${CANVASES.war.scanned} 條；另經緯度直寫 ${lonLatParsed} 條；點數不足 ${shortAll + lonLatShort} 條；非資料檔 ${routesNonData} 個 points: 欄位；${noMaskAll} 個點落在遮罩框外`,
)

const fails = issues.filter((i) => i.level === 'fail')
const warns = issues.filter((i) => i.level === 'warn')

// ── --teeth：證明呢支閘門真係會咬 ──────────────────────────────────────────
// 2026-11-13 教訓：audit:map 連報幾輪「fail 0」，其實成個朝鮮之役窗口喺閘門入面係
// 透明嘅——`territoryByYear: CONTROL`（識別碼引用）、產生器產物嘅雙引號 id、
// `im_x: IMJIN_F.jp`（常數值）三種寫法全部俾正則漏走，寫錯嘅 `kyushu`（正解
// `im_kyushu`）冇人咬，結果九州集結地永遠唔上色而閘門全綠。教訓唔係「再改寬啲
// 正則」，而是閘門要自己證明自己有牙：做法同 audit:chars --teeth 一樣，把壞 id
// 注入暫存根，用同一支掃描邏輯（子行程）掃一次，每條規則都要咬；另外跑控制樣本，
// 防止規則越界或誤殺（豁免方向都要驗）。
if (argv.includes('--teeth')) {
  const dir = mkdtempSync(join(tmpdir(), 'map-teeth-'))
  const write = (relPath, text) => {
    const p = join(dir, relPath)
    mkdirSync(join(p, '..'), { recursive: true })
    writeFileSync(p, text, 'utf8')
    return relPath
  }
  // A：亞洲戰區窗口——一個有效 id、一個跨畫布同名 id、一個邊度都冇嘅 id。
  const fA = write(
    'src/japanEras/packs/imjinWar.ts',
    [
      "export const F = { jp: '日軍', joseon: '朝鮮' }",
      'const LITERAL = { im_kyushu: F.jp }',
      'const CONTROL: Record<number, Record<string, string>> = {',
      '  1592: { im_pyongan: F.jp, kyushu: F.jp, im_bogus: F.joseon },',
      '}',
      'export const PACK = { territoryByYear: CONTROL, control: LITERAL }',
      '',
    ].join('\n'),
  )
  // B：戰區畫布控制樣本——全部係有效 id，另外夾住 `note`／`control` 巢狀 metadata 鍵、
  //    paint() 式 helper（唔係物件字面量），同埋**中文值**（`im_x: '朝鮮'`）——
  //    呢啲都唔該被當版圖鍵誤報，同時證明值唔使係 ASCII 都會被查。
  const fB = write(
    'src/japanEras/packs/modernJapanPack.ts',
    [
      "const helperCtl = paint([['d2']], '幕府')",
      "const MONTHS = { '1592-4': { note: '四月上陸，色塊未改。', control: helperCtl } }",
      "const OK = { im_pyongan: '朝鮮', im_kyushu: '日軍' }",
      'export const PACK = { control: OK, territoryByYear: MONTHS }',
      '',
    ].join('\n'),
  )
  // C：兩個方向都要驗——(a) 豁免：非戰區 pack 用「有其他畫布幾何」嘅鍵（hlj／shanxi
  //     喺中國畫布）係啱嘅，戰區規則唔該唔好伸過去（用真 pack 名做路徑，WAR_THEATRE
  //     一旦被改寬就會咬）；(b) 值嘅形態：呢檔全部用中文值，內含一個假鍵 teeth_fake，
  //     要被 territory-id-unresolved 咬到，先證明規則唔係因為「值唔係 ASCII」而失明。
  const fC = write(
    'src/japanEras/packs/azuchiPack.ts',
    ["export const PACK = { control: { hlj: '北洋', shanxi: '晉系', teeth_fake: '假塊' } }", ''].join('\n'),
  )

  // D：撞名逃生門——路線 id／勢力 id／事件 id 都係同檔嘅 `id:` 字面量，但佢哋冇幾何。
  //    舊規則把佢哋當版圖 id，於是寫錯嘅版圖鍵只要撞名就「有幾何」。另外兩個 CJK 鍵
  //    驗中文命名空間：`幽州` 喺 provinces.ts 有幾何（唔該唔好報），`假州` 冇（要報）。
  const fD = write(
    'src/sengoku/data/teeth_collisions.ts',
    [
      "export const ROUTES = [{ id: 'teeth-route-1', year: 1592, points: [[100, 100], [220, 260]] }]",
      "export const EVENTS = [{ id: 'teeth-event-1', year: 1592, title: '示意事跡' }]",
      "export const PACK = { factions: [{ id: 'teeth_faction', name: '示意勢力' }]",
      "  , control: {",
      "    'teeth-route-1': '甲',",
      "    'teeth-event-1': '乙',",
      "    'teeth_faction': '丙',",
      "    '幽州': '丁',",
      "    '假州': '戊',",
      "  } }",
      '',
    ].join('\n'),
  )

  // E：本檔自訂 domains 嘅**正向**樣本——有 ring 嘅區塊一定要解析到（否則係假紅：
  //    閘門一叫，所有人學識忽略佢）。同一檔再放一個冇幾何嘅區塊，證明判準真係幾何。
  const fE = write(
    'src/heian/data/teeth_territory.ts',
    [
      "export const DOMAINS = [",
      "  { id: 'teeth_ring_block', name: '示意區塊', ring: [[0, 0], [40, 0], [40, 40]] },",
      "  { id: 'teeth_nogeo_block', name: '冇幾何嘅區塊', label: '呢個要報' },",
      ']',
      "export const PACK = { control: { teeth_ring_block: '甲', teeth_nogeo_block: '乙' } }",
      '',
    ].join('\n'),
  )

  const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), `--files-root=${dir}`, '--json'], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  })
  let child
  try {
    child = JSON.parse(r.stdout)
  } catch {
    child = null
  }
  let bad = 0
  const check = (name, ok, detail) => {
    if (ok) return
    bad += 1
    console.log(`  ✗ ${name}${detail ? `：${detail}` : ''}`)
  }
  check('子行程跑唔起（--files-root 掃描失敗）', child !== null, (r.stderr || r.stdout || '').slice(0, 120))
  const iss = child?.issues ?? []
  const terr = iss.filter((i) => i.code.startsWith('territory-id-'))
  const on = (relPath, code) => terr.filter((i) => i.where === relPath && (!code || i.code === code))
  const msgOf = (list) => list.map((i) => i.msg).join(' ')

  // 先證明 fixture 真係掃到——冇呢一步，下面所有「冇報」嘅控制樣本都係假綠。
  const scanned = new Set(child?.scanned ?? [])
  for (const f of [fA, fB, fC, fD, fE]) check(`fixture 冇被掃描：${f}`, scanned.has(f))
  if (child) check('注入壞 id 之後子行程竟然 fail 0', child.fails > 0, '規則可能整套失效')

  // 1) 識別碼引用＋常數值寫法入面嘅假 id 要咬到（呢個係逃咗一輪嘅案例）
  check('territory-id-unresolved 冇抓到注入嘅 im_bogus', on(fA, 'territory-id-unresolved').some((i) => i.msg.includes('im_bogus')))
  // 2) 戰區畫布冇幾何嘅鍵要咬到（`kyushu` 係當初寫錯嗰個，`im_bogus` 係邊度都冇）
  check('territory-id-off-canvas 冇抓到 kyushu', on(fA, 'territory-id-off-canvas').some((i) => i.msg.includes('kyushu')))
  check('territory-id-off-canvas 冇抓到 im_bogus', on(fA, 'territory-id-off-canvas').some((i) => i.msg.includes('im_bogus')))
  // 3) 本畫布有效 id 唔該唔好報（含 `control: LITERAL` 呢類識別碼引用）
  check('有效 id 俾誤報', !/im_pyongan|im_kyushu/.test(msgOf(terr)), msgOf(terr).slice(0, 120))
  // 4) 控制樣本：metadata 鍵／helper 產生嘅 control 唔該唔好報
  check('控制樣本俾誤殺（note／control 鍵或 helper 產生嘅 control）', on(fB).length === 0, msgOf(on(fB)).slice(0, 120))
  // 5a) 豁免方向：戰區規則唔該唔好伸到其他畫布
  check(
    '戰區規則越界食到其他畫布',
    !on(fC, 'territory-id-off-canvas').length,
    msgOf(on(fC, 'territory-id-off-canvas')).slice(0, 120),
  )
  // 5b) 值係中文都照查：如果只認 ASCII 值，成檔 control 會被略過 → 呢條會紅
  check(
    '中文值入面嘅假鍵冇被抓到（規則淨認 ASCII 值就會中招）',
    on(fC, 'territory-id-unresolved').some((i) => i.msg.includes('teeth_fake')),
    msgOf(on(fC, 'territory-id-unresolved')).slice(0, 120),
  )
  check(
    '中文值入面嘅有效鍵俾誤報',
    !/hlj|shanxi/.test(msgOf(on(fC, 'territory-id-unresolved'))),
    msgOf(on(fC, 'territory-id-unresolved')).slice(0, 120),
  )
  // 5c) 撞名逃生門：路線／事件／勢力 id 唔係版圖 id，用佢哋做版圖鍵一律要報
  for (const id of ['teeth-route-1', 'teeth-event-1', 'teeth_faction']) {
    check(
      `撞名逃生門未關：版圖鍵 ${id} 靠同檔非版圖嘅 id 假通過`,
      on(fD, 'territory-id-unresolved').some((i) => i.msg.includes(id)),
    )
  }
  // 5d) 中文命名空間：provinces.ts 嘅 id 係 CJK，鍵都要認得；假州要報、幽州唔該唔好報
  check(
    'CJK 版圖鍵冇被查（假州 應該被 territory-id-unresolved 咬）',
    on(fD, 'territory-id-unresolved').some((i) => i.msg.includes('假州')),
    msgOf(on(fD, 'territory-id-unresolved')).slice(0, 120),
  )
  check('有效嘅 CJK 版圖鍵 幽州 俾誤報', !/幽州/.test(msgOf(terr)), msgOf(terr).slice(0, 120))
  // 5e) 本檔 domains 有 ring 就要解析到（假紅方向）；冇 ring 嘅區塊唔可以蒙混
  check(
    '本檔自訂 domains（有 ring）解析唔到 → 假紅，規則會誤殺真 pack',
    !/teeth_ring_block/.test(msgOf(on(fE, 'territory-id-unresolved'))),
    msgOf(on(fE, 'territory-id-unresolved')).slice(0, 120),
  )
  check(
    '冇幾何嘅區塊（冇 ring）都俾 localDomainIds 收做版圖 id',
    on(fE, 'territory-id-unresolved').some((i) => i.msg.includes('teeth_nogeo_block')),
  )
  // 6) 註冊表每條來源都要有嘢入表：產生器改檔名／引號寫法變／id 變成識別碼，都會令
  //     成批 id 無聲消失，淨睇總數捉唔實（本檔實測過三條斷線：雙引號環檔、
  //     `id: d.id` 嘅 jpDomains、CJK id 嘅 provinces）。逐來源放一個代表 id 落去。
  const REGISTRY_PROBES = {
    hlj: 'eraRegions.ts（中國歷史上環）',
    d3: 'tracedDomains.ts（日本區塊 d0–d27）',
    matsumae: 'japanEraRings.ts（松前／北海道／琉球）',
    jp_home: 'asiaWarTerritory.ts（亞洲戰區陸域）',
    im_kyushu: 'imjinTerritory.ts（朝鮮之役戰區）',
    幽州: 'provinces.ts（中國州郡，id 係 CJK）',
  }
  const probeList = Object.entries(REGISTRY_PROBES)
  for (const [id, src] of probeList) {
    check(`幾何註冊表冇咗 ${id}（來源：${src}）`, geometryIds.has(id))
  }
  // 探針本身都會被人抽走：抽到得返一二條，註冊表就又變回「見到邊個補邊個」。
  check(`註冊表探淨得 ${probeList.length} 條（每條來源要有一條）`, probeList.length >= 6)
  for (const id of ['im_kyushu', 'im_pyongan']) check(`warGeoIds 冇咗 ${id}`, warGeoIds.has(id))
  check(`幾何註冊表淨 ${geometryIds.size} 個 id（似有整檔漏讀）`, geometryIds.size >= 195)
  // 7) 掃描範圍：真樹縮水即係 roots 被人改細，規則會對新 pack 失明
  check(`真樹只掃到 ${files.length} 檔（似有 root 俾人收細）`, files.length >= 100)
  check('真樹冇掃到 imjinWar.ts（窗口資料喺閘門外）', files.some((f) => rel(f).endsWith('packs/imjinWar.ts')))

  rmSync(dir, { recursive: true, force: true })
  console.log(`\naudit:map --teeth — 失敗 ${bad} 項`)
  console.log(bad ? '✗ 閘門已退化：注入嘅壞 id 有人抓唔到' : '✓ 注入嘅壞 id 全部會咬，控制樣本零誤報')
  process.exit(bad ? 1 : 0)
}

if (JSON_OUT) {
  // --files-root（teeth 子行程）要俾父行程知「呢啲 fixture 真係掃到」，
  // 否則案例會因為根本冇掃描而變成假綠。
  const extra = FILES_ROOT_ARG ? { scanned: files.map(rel) } : {}
  console.log(JSON.stringify({ geometryIds: geometryIds.size, fails: fails.length, warns: warns.length, issues, ...extra }, null, 2))
} else {
  const L = []
  L.push('# 地圖精度審計')
  L.push('')
  L.push(
    `幾何註冊表 id ${geometryIds.size} 個｜掃描 ${files.length} 檔｜海陸判定 ${scannedAll} 條（中國 ${CANVASES.china.scanned}／日本 ${CANVASES.japan.scanned}／亞洲戰區 ${CANVASES.war.scanned}）＋經緯度直寫 ${lonLatParsed} 條｜fail **${fails.length}**｜warn ${warns.length}`,
  )
  L.push('')
  L.push('| code | 等級 | 位置 | 說明 |')
  L.push('|---|---|---|---|')
  for (const i of [...fails, ...warns].slice(0, 60)) {
    L.push(`| ${i.code} | ${i.level} | \`${i.where}\` | ${i.msg} |`)
  }
  L.push('')
  L.push('## 口徑')
  L.push('')
  L.push('- territory-id-unresolved：pack 於 control／territoryByYear 使用的 id，必須在 `src/geo/eraRegions.ts`、`src/geo/asiaWarTerritory.ts`、`src/geo/imjinTerritory.ts`、`src/geo/japanEraRings.ts`、`src/sengoku/data/tracedDomains.ts` 或本檔自帶幾何嘅 domains 找到（key 與 id 嘅引號寫法都認，id 亦可係中文）。本檔 domains 只算「同一個物件字面量內真的有 ring/rings/polys」嘅 id——事件 id、路線 id、勢力 id 都係同檔 `id:` 字面量，把佢哋當版圖 id 會令寫錯嘅版圖鍵撞名即過；找不到即該區塊永遠不會上色。`territoryByYear: CONTROL` 呢類識別碼引用會先解析同檔的 `const CONTROL = {…}` 再逐鍵查；註冊表單引號與雙引號都認（產生器產物用雙引號）。')
  L.push('- territory-id-off-canvas：亞洲戰區畫布（`modernJapanPack`／`imjinWar`）的版圖鍵，必須在 `asiaWarTerritory.ts` 或 `imjinTerritory.ts` 有幾何。全域註冊表看不見畫布：同名 id 或在日本／中國畫布有幾何，或乾脆被別檔一個無關的 `id:` 字面量湊巧配中，只要 1710×1000 戰區畫布沒有該塊幾何，該區塊照樣永遠不上色。勘誤：先前此處寫「實測 `kyushu` 解到 `jpDomains` 的九州」有誤——`kyushu` 並非區塊 id（jpDomains 用 `id: d.id`），它兩邊都沒有幾何；它逃過閘門的真正原因是上述三處解析盲點（識別碼引用、雙引號 id、常數值），現由 `--teeth` 案例 A 釘住。')
  L.push(`- coord-out-of-frame：底圖畫布 ${CANVAS.w}×${CANVAS.h}（附圖容差 ${FRAME_TOL}px）；負值一律判紅。`)
  L.push(
    `- sea-route-over-land（fail）／land-route-crosses-sea（暫 warn）：陸地遮罩只有一個來源——src/geo/asiaWarBase.ts 的 ASIA_LAND（Natural Earth 1:50m 派生），反算經緯度後分別投到三個畫布：中國戰區 china_px 1968×1567、日本戰區 japan_px 1482×1477（japan_relief 等距圓柱，邊界取 scripts/tighten_land_borders.py）、亞洲戰區 1710×1000（近代日本 pack 的 asiaPx 畫布）。留 ${COAST_TOL_DEG}° 海岸容差（各畫布按自身 1° 經度 px 數換算），貼岸點一概不判。啟動前以 ${ANCHORS.china.length + ANCHORS.japan.length + ANCHORS.war.length} 個海陸錨點自我校對（中國 ${ANCHORS.china.length}／日本 ${ANCHORS.japan.length}／亞洲戰區 ${ANCHORS.war.length}，含渤海、滿洲、朝鮮半島、東京灣、瀨戶內海、津輕海峽、宗谷海峽、爪哇海），任何一個不符即整支腳本失敗。`,
  )
  L.push(
    `- 覆蓋率：中國戰區 ${CANVASES.china.scanned} 條、日本戰區 ${CANVASES.japan.scanned} 條（sengoku／bakumatsu／heian／japanEras 各 pack）、亞洲戰區 ${CANVASES.war.scanned} 條、經緯度直寫 ${lonLatParsed} 條（modernJapanPack 以 route(id, …, [[經度, 緯度]]) 產生 points，第一輪掃描看不到，第二輪補判）。未登記戰區的資料檔一律報紅，不得默默溜過。`,
  )
  L.push(
    `- route-scan-coverage：解析到的路線數必須等於 points: 出現次數，否則「0 命中」只是解析器漏抓，一律報紅。`,
  )
  L.push('- route-year-no-event：設計要求「揀年同時見到事件同路線」，路線所在年應有同年事件。')
  L.push('- 只係靜態掃描：地理精度（環形心落水、陸地面積比例）由 `npm run audit:geo` 負責，年份口徑由 `npm run audit:ranges` 負責。')
  L.push('')
  mkdirSync(join(ROOT, 'reports'), { recursive: true })
  writeFileSync(join(ROOT, 'reports/map-accuracy.md'), L.join('\n'), 'utf8')
  console.log(
    `audit:map — 幾何 id ${geometryIds.size}｜掃描 ${files.length} 檔｜fail ${fails.length}｜warn ${warns.length} → reports/map-accuracy.md`,
  )
}
if (argv.includes('--fail-on-gap') && fails.length > 0) process.exit(1)
