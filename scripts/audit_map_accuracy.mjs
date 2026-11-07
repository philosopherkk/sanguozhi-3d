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

const fails = issues.filter((i) => i.level === 'fail')
const warns = issues.filter((i) => i.level === 'warn')

if (JSON_OUT) {
  console.log(JSON.stringify({ geometryIds: geometryIds.size, fails: fails.length, warns: warns.length, issues }, null, 2))
} else {
  const L = []
  L.push('# 地圖精度審計')
  L.push('')
  L.push(
    `幾何註冊表 id ${geometryIds.size} 個｜掃描 ${files.length} 檔｜fail **${fails.length}**｜warn ${warns.length}`,
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
