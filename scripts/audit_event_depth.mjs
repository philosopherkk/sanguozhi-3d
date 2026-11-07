#!/usr/bin/env node
/**
 * 事件三段深度審計：量度「起因／經過／結果」是否達到大學生程度。
 *
 * 門檻：起因 ≥ 200 字、經過 ≥ 200 字、結果 ≥ 400 字（去空白後計）。
 * 「大學生程度」的實質要求寫在報告尾段，供人工與排程 agent 對照。
 *
 * 用法：
 *   node scripts/audit_event_depth.mjs                 # 摘要＋最短 15 條
 *   node scripts/audit_event_depth.mjs --json          # 機器可讀摘要
 *   node scripts/audit_event_depth.mjs --only src/zhou # 只審某個模組
 *   node scripts/audit_event_depth.mjs --top 40        # 列最短 40 條
 *   node scripts/audit_event_depth.mjs --fail-on-gap   # 有缺口即 exit 1（供 CI）
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const THRESHOLDS = { causes: 200, course: 200, outcome: 400 }
const LABEL = { causes: '起因', course: '經過', outcome: '結果' }
const KEYS = Object.keys(THRESHOLDS)

const argv = process.argv.slice(2)
const has = (f) => argv.includes(f)
const optVal = (flag, dflt) => {
  const i = argv.indexOf(flag)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt
}
const ONLY = optVal('--only', 'src')
const TOP = Number(optVal('--top', 15))

function walk(dir, out) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const ent of entries) {
    const full = join(dir, ent.name)
    if (ent.isDirectory()) walk(full, out)
    else if (ent.name.endsWith('.ts') && !ent.name.endsWith('.test.ts') && !ent.name.endsWith('.d.ts'))
      out.push(full)
  }
  return out
}

/** 由 key 後的第一個引號起，掃到配對的結尾引號；處理跳脫字元與樣板字面值。 */
function readLiteral(text, start) {
  const q = text[start]
  if (q !== "'" && q !== '"' && q !== '`') return null
  let i = start + 1
  let out = ''
  while (i < text.length) {
    const c = text[i]
    if (c === '\\') {
      out += text[i + 1] ?? ''
      i += 2
      continue
    }
    if (c === q) return { value: out, end: i }
    if (q === '`' && c === '$' && text[i + 1] === '{') {
      let depth = 1
      i += 2
      while (i < text.length && depth > 0) {
        if (text[i] === '{') depth += 1
        else if (text[i] === '}') depth -= 1
        i += 1
      }
      out += '內容'
      continue
    }
    out += c
    i += 1
  }
  return null
}

/** 回溯找最近一個 id 欄位，俾報告能指出是哪个事件。 */
function nearestId(text, index) {
  const back = text.slice(Math.max(0, index - 2000), index)
  const matches = [...back.matchAll(/\bid\s*:\s*(['"`])([^'"`\n]{1,80})\1/g)]
  return matches.length ? matches[matches.length - 1][2] : '(未識別 id)'
}

const rows = []
for (const file of walk(join(ROOT, ONLY), [])) {
  const rel = relative(ROOT, file).replace(/\\/g, '/')
  const text = readFileSync(file, 'utf8')
  for (const key of KEYS) {
    for (const m of text.matchAll(new RegExp(`(?:^|[{,\\s])${key}\\s*:\\s*`, 'g'))) {
      const lit = readLiteral(text, m.index + m[0].length)
      if (!lit) continue
      const chars = lit.value.replace(/\s+/g, '').length
      rows.push({
        file: rel,
        id: nearestId(text, m.index),
        field: key,
        chars,
        ok: chars >= THRESHOLDS[key],
        line: text.slice(0, m.index).split('\n').length,
      })
    }
  }
}

const byField = {}
for (const key of KEYS) {
  const list = rows.filter((r) => r.field === key)
  const lens = list.map((r) => r.chars).sort((a, b) => a - b)
  byField[key] = {
    entries: list.length,
    median: lens.length ? lens[Math.floor(lens.length / 2)] : 0,
    mean: lens.length ? Math.round(lens.reduce((a, b) => a + b, 0) / lens.length) : 0,
    threshold: THRESHOLDS[key],
    below: list.filter((r) => !r.ok).length,
  }
}

/**
 * 三層意譯（小學生／中學生／大學生）。使用者明確要求三層都要有內容，
 * 而舊閘門只量起因／經過／結果，所以「小學生層完全未寫」呢類缺口一直不可見。
 * 門檻屬初版政策：腳本同時報每層筆數與中位，覆核後可調。
 */
const LAYERS = {
  elementary: { label: '小學生', min: 60 },
  secondary: { label: '中學生', min: 120 },
  university: { label: '大學生', min: 300 },
}
const layerStats = {}
for (const [key, cfg] of Object.entries(LAYERS)) {
  const lens = []
  for (const file of walk(join(ROOT, ONLY), [])) {
    const text = readFileSync(file, 'utf8')
    for (const m of text.matchAll(new RegExp(`(?:^|[{,\\s])${key}\\s*:\\s*`, 'g'))) {
      const lit = readLiteral(text, m.index + m[0].length)
      if (!lit) continue
      lens.push(lit.value.replace(/\s+/g, '').length)
    }
  }
  lens.sort((a, b) => a - b)
  layerStats[key] = {
    label: cfg.label,
    min: cfg.min,
    entries: lens.length,
    median: lens.length ? lens[Math.floor(lens.length / 2)] : 0,
    below: lens.filter((n) => n < cfg.min).length,
  }
}
const layerMissing = {
  小學生: layerStats.university.entries - layerStats.elementary.entries,
  中學生: layerStats.university.entries - layerStats.secondary.entries,
}
const gaps = rows.filter((r) => !r.ok)
const empty = rows.filter((r) => r.chars === 0)

const byModule = {}
for (const r of rows) {
  const mod = r.file.split('/').slice(0, r.file.startsWith('src/data/') ? 2 : 3).join('/')
  const slot = (byModule[mod] ??= { entries: 0, gaps: 0, causes: 0, course: 0, outcome: 0 })
  slot.entries += 1
  if (!r.ok) {
    slot.gaps += 1
    slot[r.field] += 1
  }
}
const shortest = [...gaps].sort((a, b) => a.chars - b.chars).slice(0, TOP)

if (has('--json')) {
  console.log(
    JSON.stringify(
      {
        scope: ONLY,
        thresholds: THRESHOLDS,
        entries: rows.length,
        gapSegments: gaps.length,
        emptySegments: empty.length,
        byField,
        byModule,
        readingLayers: layerStats,
        readingLayerMissing: layerMissing,
      },
      null,
      2,
    ),
  )
} else {
  const L = []
  L.push('# 事件三段深度審計')
  L.push('')
  L.push(
    `範圍 \`${ONLY}\`｜事件段落 ${rows.length} 筆｜未達標 **${gaps.length} 段**（其中空段落 ${empty.length} 段）`,
  )
  L.push('')
  L.push('| 段 | 筆數 | 中位字數 | 平均字數 | 門檻 | 未達標 |')
  L.push('|---|---|---|---|---|---|')
  for (const key of KEYS) {
    const f = byField[key]
    L.push(`| ${LABEL[key]} | ${f.entries} | ${f.median} | ${f.mean} | ≥${f.threshold} | ${f.below} |`)
  }
  L.push('')
  L.push('## 按模組（未達標段數）')
  L.push('')
  L.push('| 模組 | 段數 | 未達標 | 起因 | 經過 | 結果 |')
  L.push('|---|---|---|---|---|---|')
  for (const [mod, s] of Object.entries(byModule).sort((a, b) => b[1].gaps - a[1].gaps)) {
    if (!s.gaps) continue
    L.push(`| \`${mod}\` | ${s.entries} | **${s.gaps}** | ${s.causes} | ${s.course} | ${s.outcome} |`)
  }
  L.push('')
  L.push(`## 最短 ${shortest.length} 段`)
  L.push('')
  L.push('| 段 | 現長 | 檔 | 事件 id | 行 |')
  L.push('|---|---|---|---|---|')
  for (const r of shortest) {
    L.push(`| ${LABEL[r.field]} | ${r.chars} | \`${r.file}\` | ${r.id} | ${r.line} |`)
  }
  L.push('')
  L.push('## 三層意譯（小學生／中學生／大學生）')
  L.push('')
  L.push('| 層 | 筆數 | 中位字數 | 門檻 | 未達標 |')
  L.push('|---|---|---|---|---|')
  for (const cfg of Object.values(layerStats)) {
    L.push(`| ${cfg.label} | ${cfg.entries} | ${cfg.median} | ≥${cfg.min} | ${cfg.below} |`)
  }
  L.push('')
  L.push(
    `以大學層筆數（${layerStats.university.entries}）為基準：**完全缺小學生層 ${layerMissing.小學生} 個**、缺中學生層 ${layerMissing.中學生} 個。`,
  )
  L.push('')
  L.push('## 「大學生程度」的實質要求（不是湊字數）')
  L.push('')
  L.push('- 起因分兩層：結構性原因（制度、財政、正統性、地緣等慢變數）＋直接觸發（哪一件事令它在此年發生）。')
  L.push('- 經過要有順序與轉折：誰做了什麼決定、哪個環節改變結果；不可把 `desc` 換句話說充數。')
  L.push('- 兩段都要有史料意識：數字標明口徑；有爭議寫明爭議與文獻性質（例如軍記文學成書較晚、敘事有加工）。')
  L.push('- 不可編造出處：只可沿用該模組別處已引、且確實涵蓋同時代同地域的具名著作；不可憑空寫卷頁。')
  L.push('- 分歧數字一律 `disputed: true` 並在 `note` 說明分歧，不寫定數。')
  L.push('')
  mkdirSync(join(ROOT, 'reports'), { recursive: true })
  writeFileSync(join(ROOT, 'reports/event-depth.md'), L.join('\n'), 'utf8')
  console.log(
    `audit:event-depth — 段落 ${rows.length}／缺口 ${gaps.length}（起因 ${byField.causes.below}／經過 ${byField.course.below}／結果 ${byField.outcome.below}）｜三層意譯：小學生 ${layerStats.elementary.entries}・中學生 ${layerStats.secondary.entries}・大學 ${layerStats.university.entries}（缺小學生層 ${layerMissing.小學生}）→ reports/event-depth.md`,
  )
}

if (has('--fail-on-gap') && gaps.length > 0) process.exit(1)
