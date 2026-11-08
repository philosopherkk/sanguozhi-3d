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
const LAND_POLYS = []
{
  const war = read(join(ROOT, 'src/geo/asiaWarBase.ts'))
  const num = (name) => {
    const m = war.match(new RegExp(`export const ${name} = (-?[\\d.]+)`))
    return m ? Number(m[1]) : null
  }
  const ww = num('ASIA_WAR_W')
  const wh = num('ASIA_WAR_H')
  const lo0 = num('ASIA_LON0')
  const lo1 = num('ASIA_LON1')
  const la0 = num('ASIA_LAT0')
  const la1 = num('ASIA_LAT1')
  const body = war.match(/export const ASIA_LAND: string\[\] = \[([\s\S]*?)\n\]/)
  if (body && [ww, wh, lo0, lo1, la0, la1].every((v) => v != null)) {
    for (const s of body[1].matchAll(/'([^']{60,})'/g)) {
      const ring = []
      for (const seg of s[1].matchAll(/([ML])(-?[\d.]+)\s+(-?[\d.]+)/g)) {
        const wx = Number(seg[2])
        const wy = Number(seg[3])
        if (wx < -ww || wx > ww * 2 || wy < -wh || wy > wh * 2) continue // 超出戰區的折返點
        const lon = lo0 + (wx / ww) * (lo1 - lo0)
        const lat = la1 - (wy / wh) * (la1 - la0)
        ring.push(chinaPx(lat, lon, CANVAS.w, CANVAS.h))
      }
      if (ring.length >= 8) LAND_POLYS.push(ring)
    }
  }
}
function inRing([x, y], ring) {
  let hit = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}
const isLandPx = (p) => LAND_POLYS.some((ring) => inRing(p, ring))
/** 1° 經度大約幾多 px：用同一支投影式量出來，避免手推常數出錯。 */
const [PX_1DEG_X] = chinaPx(35, 121, CANVAS.w, CANVAS.h)
const [PX_0DEG_X] = chinaPx(35, 120, CANVAS.w, CANVAS.h)
const COAST_TOL_PX = Math.abs(PX_1DEG_X - PX_0DEG_X) * COAST_TOL_DEG
/** 貼岸判定：自身與上下左右各 COAST_TOL_PX，只要有一格是陸地即視為岸邊，不判。 */
const nearCoastPx = (p) =>
  [
    [0, 0],
    [COAST_TOL_PX, 0],
    [-COAST_TOL_PX, 0],
    [0, COAST_TOL_PX],
    [0, -COAST_TOL_PX],
  ].some(([dx, dy]) => isLandPx([p[0] + dx, p[1] + dy]))
// 錨點沿用 scripts/audit_geo.py 的 ANCHORS，並補滿洲與朝鮮半島（舊版用 landMask 時會誤判這些為海）。
// 自校不過即整支腳本失敗，不接受「載入失敗當沒有問題」。
const ANCHORS = [
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
]
if (LAND_POLYS.length === 0) {
  console.error('audit:map — 載入 LAND_MASK_RING 失敗，海陸規則無法執行（拒絕當成通過）')
  process.exit(1)
}
{
  const bad = ANCHORS.filter(([, lon, lat, shouldLand]) => isLandPx(chinaPx(lat, lon, CANVAS.w, CANVAS.h)) !== shouldLand)
  if (bad.length) {
    console.error(
      'audit:map — 陸地遮罩自我校對失敗，投影式或遮罩已壞，海陸規則不可信：\n  ' +
        bad.map(([n, lon, lat, want]) => `${n}(${lon},${lat}) 期望${want ? '陸' : '海'}`).join('\n  '),
    )
    process.exit(1)
  }
}

/** 遮罩在畫布上的範圍；超出即視為不屬本規則管轄（計數，不判定）。 */
const MASK_BOX = (() => {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const ring of LAND_POLYS) {
    for (const [x, y] of ring) {
      x0 = Math.min(x0, x)
      y0 = Math.min(y0, y)
      x1 = Math.max(x1, x)
      y1 = Math.max(y1, y)
    }
  }
  const pad = COAST_TOL_PX
  return { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad }
})()

/**
 * 只有中國戰區的檔案可用 china_px 對位：日本戰區（sengoku／bakumatsu／japanEras）
 * 雖然同用 1968×1567 畫布，但地理映射不同，拿中國遮罩去判會全錯，
 * 因此名單之外一律跳過並計數；報告必須寫明跳過多少條，不可當作已檢查過。
 */
const CHINA_THEATRE = /^src\/(data|zhou|qinhan|imperial)\//

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

let routesScanned = 0
let routesShort = 0
let routesTotal = 0
let routesOutOfTheatre = 0
let pointsNoMask = 0
for (const f of files) {
  const t = read(f)
  const r = rel(f)
  if (!/points\s*:\s*\[/.test(t)) continue
  const inTheatre = CHINA_THEATRE.test(r)
  for (const m of t.matchAll(/\bpoints\s*:\s*\[/g)) {
    routesTotal += 1
    if (!inTheatre) {
      routesOutOfTheatre += 1
      continue
    }
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
      routesShort += 1
      continue
    }
    const pts = []
    for (const p of t.slice(start, end + 1).matchAll(/\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]/g)) {
      pts.push([Number(p[1]), Number(p[2])])
    }
    if (pts.length < 2) {
      routesShort += 1
      continue
    }
    routesScanned += 1
    const objStart = objectStart(t, m.index)
    const body = objStart >= 0 ? objectBody(t, objStart) : ''
    const idHit = body.match(/\bid:\s*['"]([\w:.-]+)['"]/)
    const rid = idHit ? idHit[1] : '(未識別)'
    const isSeaRoute = /kind:\s*['"]sea['"]/.test(body)
    const covered = pts.filter(
      (p) => p[0] >= MASK_BOX.x0 && p[0] <= MASK_BOX.x1 && p[1] >= MASK_BOX.y0 && p[1] <= MASK_BOX.y1,
    )
    pointsNoMask += pts.length - covered.length
    if (covered.length < 2) continue
    const onLand = covered.filter((p) => isLandPx(p))
    const openSea = covered.filter((p) => !nearCoastPx(p))
    if (isSeaRoute && onLand.length * 2 >= covered.length) {
      add(
        'fail',
        'sea-route-over-land',
        r,
        `海路「${rid}」有 ${onLand.length}/${covered.length} 個點落在陸地上——海上交通或艦戰的路線不該畫在陸上`,
      )
    }
    if (!isSeaRoute && openSea.length >= 2) {
      // 暫列 warn：底圖是 1:50m 示意（約 31px/度），0.4° 容差只有十餘 px，
      // 貼灣海岸線（如遼東灣的錦州—遼西段）容易被判成外海。先交地圖排程逐條判，
      // 判完再升 fail；一開始就製造紅牆只會讓人學會忽略閘門。
      add(
        'warn',
        'land-route-crosses-sea',
        r,
        `陸路「${rid}」有 ${openSea.length}/${covered.length} 個點落在外海（離岸 >${COAST_TOL_DEG}°）——要麼是海路（補 kind: 'sea'），要麼坐標有誤，要麼該點本就貼灣`,
      )
    } else if (!isSeaRoute && openSea.length === 1) {
      add('warn', 'land-route-sea-point', r, `陸路「${rid}」有 1 點落在外海，請人工判定：應拆出海路段，抑或該點坐標有誤`)
    }
  }
}
coverage.push({ file: '(海陸遮罩：中國戰區)', routes: routesScanned })
// 覆蓋率自校：解析到的路線數必須等於 points: 出現次數減去跳過數，
// 否則「0 命中」可能只是解析器漏抓或戰區未覆蓋，而不是資料乾淨。
if (routesTotal !== routesScanned + routesShort + routesOutOfTheatre) {
  add(
    'fail',
    'route-scan-coverage',
    'src/**',
    `掃描 ${routesTotal} 個 points: 欄位，實際處理 ${routesScanned} 條、點數不足 ${routesShort} 條、非中國戰區 ${routesOutOfTheatre} 條——對不上，海陸規則的「0 命中」不可信`,
  )
}
add(
  'info',
  'route-sea-check-coverage',
  'src/**',
  `海陸判定已覆蓋中國戰區 ${routesScanned} 條路線；日本戰區 ${routesOutOfTheatre} 條因映射不同而未判定；${pointsNoMask} 個點落在遮罩框外`,
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
    `幾何註冊表 id ${geometryIds.size} 個｜掃描 ${files.length} 檔｜路線 ${routesScanned} 條｜fail **${fails.length}**｜warn ${warns.length}`,
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
  L.push('- territory-id-unresolved：pack 於 control／territoryByYear 使用的 id，必須在 `src/data/provinces.ts`、`src/geo/eraRegions.ts`、`src/geo/asiaWarTerritory.ts`、`src/japanEras/jpDomains.ts` 或本檔 domains 搵到；找不到即該區塊永遠不會上色。')
  L.push(`- coord-out-of-frame：底圖畫布 ${CANVAS.w}×${CANVAS.h}（附圖容差 ${FRAME_TOL}px）；負值一律判紅。`)
  L.push(
    `- sea-route-over-land（fail）／land-route-crosses-sea（暫 warn）：陸地遮罩取 src/geo/asiaWarBase.ts 的 ASIA_LAND（Natural Earth 1:50m 派生，反算經緯度後用 scripts/audit_geo.py 的 china_px 投到路線畫布）；留 ${COAST_TOL_DEG}° 海岸容差，貼岸點一概不判。啟動前以 ${ANCHORS.length} 個海陸錨點自我校對（含渤海、滿洲、朝鮮半島），校不對即整支腳本失敗。日本戰區路線因映射不同而不判定。`,
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
