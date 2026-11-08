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
 * 用法：node scripts/audit_map_accuracy.mjs [--json] [--fail-on-gap]
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const argv = process.argv.slice(2)
const JSON_OUT = argv.includes('--json')

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

const files = walk(join(ROOT, 'src'))
const read = (f) => readFileSync(f, 'utf8')
const rel = (f) => relative(ROOT, f).replace(/\\/g, '/')

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

/** 由區塊內容抽出「鍵: '值'」形式之鍵（跳過純數字年鍵）。 */
function controlKeys(body) {
  const out = new Set()
  for (const m of body.matchAll(/['"]?([A-Za-z_][\w-]{1,40})['"]?\s*:\s*['"]([\w-]+)['"]/g)) {
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

/** 幾何註冊表：三國州郡、歷史上環、亞洲戰區範圍。 */
const geometryIds = new Set()
const addFrom = (file, re) => {
  let t
  try {
    t = read(join(ROOT, file))
  } catch {
    return
  }
  for (const m of t.matchAll(re)) geometryIds.add(m[1])
}
addFrom('src/data/provinces.ts', /\bid:\s*'([\w-]+)'/g)
addFrom('src/geo/eraRegions.ts', /"([a-z_0-9]+)":\[\[/g)
addFrom('src/geo/asiaWarTerritory.ts', /\bid:\s*'([\w-]+)'/g)
addFrom('src/geo/japanEraRings.ts', /\b([a-z_0-9]+):\s*\[/g)
addFrom('src/japanEras/jpDomains.ts', /\bid:\s*'([\w-]+)'/g)

const issues = []
const add = (level, code, where, msg) => issues.push({ level, code, where, msg })
const coverage = []

for (const f of files) {
  const t = read(f)
  const r = rel(f)

  // 本檔自行定義的區塊 id（pack 的 domains）
  const localIds = new Set()
  for (const m of t.matchAll(/\bid:\s*['"]([\w-]{2,40})['"]/g)) localIds.add(m[1])

  // 1) 版圖鍵必須解到幾何（此條規則對應真實 bug：控制鍵解不到幾何 → 全圖空白）
  const keys = new Set()
  for (const m of t.matchAll(/\bcontrol\s*:\s*\{/g)) {
    for (const k of controlKeys(blockBody(t, m.index + m[0].length - 1))) keys.add(k)
  }
  for (const m of t.matchAll(/\bterritoryByYear\s*:\s*\{/g)) {
    for (const k of territoryKeys(blockBody(t, m.index + m[0].length - 1))) keys.add(k)
  }
  const factionIds = new Set()
  for (const m of t.matchAll(/\bfactions\s*:\s*\[/g)) {
    const body = (() => {
      let depth = 0
      const start = m.index + m[0].length - 1
      for (let i = start; i < t.length; i++) {
        if (t[i] === '[') depth += 1
        else if (t[i] === ']') {
          depth -= 1
          if (depth === 0) return t.slice(start + 1, i)
        }
      }
      return ''
    })()
    for (const fm of body.matchAll(/\bid:\s*['"]([\w-]+)['"]/g)) factionIds.add(fm[1])
  }
  const unresolved = new Map()
  for (const id of keys) {
    if (geometryIds.has(id) || localIds.has(id) || factionIds.has(id)) continue
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
    ['那覇', 127.69, 26.21, true],
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
    ['豊原（樺太）', 142.9, 47.0, true],
    ['馬尼拉', 120.98, 14.6, true],
    ['新加坡', 103.82, 1.35, true],
    ['上海', 121.47, 31.23, true],
    ['那覇', 127.69, 26.21, true],
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
const WAR_THEATRE = /^src\/japanEras\/packs\/modernJapanPack\.ts$/
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

if (JSON_OUT) {
  console.log(JSON.stringify({ geometryIds: geometryIds.size, fails: fails.length, warns: warns.length, issues }, null, 2))
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
  L.push('- territory-id-unresolved：pack 於 control／territoryByYear 使用的 id，必須在 `src/data/provinces.ts`、`src/geo/eraRegions.ts`、`src/geo/asiaWarTerritory.ts`、`src/japanEras/jpDomains.ts` 或本檔 domains 找到；找不到即該區塊永遠不會上色。')
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
