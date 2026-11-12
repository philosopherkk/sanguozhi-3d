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
/**
 * desc-echo 閾值（字二元組 Jaccard）。訂閾值前先量現有語料分佈（報告會印 p50/p90/max），
 * 避免用直覺設一個把既有正常條目大批誤殺、或者形同虛設的數字。
 */
const DESC_ECHO = Number(optVal('--desc-echo', 0.35))
let descEchoStats = { samples: 0, p50: 0, p90: 0, max: 0 }

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

/** 回溯找最近一個 id 欄位，俾報告能指出是哪個事件。 */
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
        text: lit.value,
        ok: chars >= THRESHOLDS[key],
        line: text.slice(0, m.index).split('\n').length,
      })
    }
  }
}

/**
 * 灌水偵測：舊版只量字數，結果「把 desc 換句話說」「同一句貼三次」都能過閘。
 * 呢度量三種實際形態的灌水，數字入基線，惡化即 CI 紅。
 *  1. dup-in-event：同一事件內出現完全相同的句子（跨段或同段重複）
 *  2. boilerplate：同一模組內 ≥3 個不同事件共用同一句子（樣板灌水）
 *  3. desc-echo：經過／起因與該事件 desc 高度同形（換句話說充數）
 * 閾值由現有語料分佈訂出，見報告「灌水偵測」節。
 */
const SENT_MIN = 12
/** 去空白與標點，只留可比較的實字，先至比得出「同一句」。 */
function normSentence(s) {
  return s
    .replace(/[\s「」『』《》〈〉（）()[\]【】‘’“”'",、，。；：！？…—－·．-]/g, '')
    .trim()
}
function sentences(text) {
  return text
    .split(/[。！？；\n]/)
    .map(normSentence)
    .filter((s) => s.length >= SENT_MIN)
}
/** 字二元組 Jaccard：中文無詞邊界，二元組對「改寫」最敏感。 */
function bigrams(s) {
  const g = new Set()
  for (let i = 0; i + 1 < s.length; i += 1) g.add(s.slice(i, i + 2))
  return g
}
function jaccard(a, b) {
  if (!a.size || !b.size) return 0
  let inter = 0
  for (const x of a) if (b.has(x)) inter += 1
  return inter / (a.size + b.size - inter)
}

// 各模組、各事件的 desc，供 desc-echo 對照。
const descByKey = new Map()
for (const file of walk(join(ROOT, ONLY), [])) {
  const rel = relative(ROOT, file).replace(/\\/g, '/')
  const text = readFileSync(file, 'utf8')
  for (const m of text.matchAll(/(?:^|[{,\s])desc\s*:\s*/g)) {
    const lit = readLiteral(text, m.index + m[0].length)
    if (!lit) continue
    const key = `${rel}|${nearestId(text, m.index)}`
    if (!descByKey.has(key)) descByKey.set(key, normSentence(lit.value))
  }
}

const moduleOf = (f) => f.split('/').slice(0, f.startsWith('src/data/') ? 2 : 3).join('/')
const dupInEvent = []
{
  const byEvent = new Map()
  for (const r of rows) {
    const key = `${r.file}|${r.id}`
    if (!byEvent.has(key)) byEvent.set(key, [])
    byEvent.get(key).push(r)
  }
  for (const list of byEvent.values()) {
    if (list.length < 2) continue
    const seen = new Map()
    for (const r of list) {
      for (const s of sentences(r.text)) {
        if (!seen.has(s)) seen.set(s, [])
        seen.get(s).push(LABEL[r.field])
      }
    }
    for (const [s, fields] of seen) {
      if (fields.length < 2) continue
      const [head] = list
      dupInEvent.push({
        module: moduleOf(head.file),
        file: head.file,
        id: head.id,
        fields: [...new Set(fields)].join('＋'),
        sentence: s.slice(0, 40),
      })
    }
  }
}

const boilerplate = []
{
  const byModule = new Map()
  for (const r of rows) {
    const mod = moduleOf(r.file)
    if (!byModule.has(mod)) byModule.set(mod, new Map())
    const map = byModule.get(mod)
    for (const s of sentences(r.text)) {
      if (!map.has(s)) map.set(s, new Map())
      map.get(s).set(`${r.file}|${r.id}`, r.file)
    }
  }
  for (const [mod, map] of byModule) {
    for (const [s, owners] of map) {
      if (owners.size < 3) continue
      boilerplate.push({
        module: mod,
        events: owners.size,
        sentence: s.slice(0, 40),
        file: [...owners.values()][0],
      })
    }
  }
}

const descEcho = []
{
  const scored = []
  for (const r of rows) {
    if (r.field === 'outcome') continue
    const d = descByKey.get(`${r.file}|${r.id}`)
    if (!d || d.length < SENT_MIN) continue
    const score = jaccard(bigrams(normSentence(r.text)), bigrams(d))
    if (score >= DESC_ECHO) {
      descEcho.push({
        module: moduleOf(r.file),
        file: r.file,
        id: r.id,
        field: LABEL[r.field],
        score: Number(score.toFixed(2)),
        chars: r.chars,
      })
    }
    scored.push(score)
  }
  descEchoStats = { samples: scored.length, p50: 0, p90: 0, max: 0 }
  if (scored.length) {
    scored.sort((a, b) => a - b)
    const at = (q) => Number(scored[Math.min(scored.length - 1, Math.floor(scored.length * q))].toFixed(2))
    descEchoStats.p50 = at(0.5)
    descEchoStats.p90 = at(0.9)
    descEchoStats.max = at(1)
  }
}

const paddingCount = dupInEvent.length + boilerplate.length + descEcho.length

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
/**
 * 按戰區分開統計。日本側曾長期只有 edoPack／modernJapanPack 有 READINGS，
 * 其餘 pack 靠 DeepDiveApp 用 desc／note 自動填三層——面板「有內容」但實質是佔位文字。
 * 只看全倉庫總數會把這個落差掩蓋掉（日本的空缺被中國的樣本稀釋），所以各區自己計。
 */
const JP_PATHS = ['src/japanEras/', 'src/bakumatsu/', 'src/sengoku/', 'src/heian/', 'src/japanHistory/']
const CN_PATHS = ['src/data/', 'src/zhou/', 'src/qinhan/', 'src/imperial/']
const theatreOf = (relPath) =>
  JP_PATHS.some((p) => relPath.startsWith(p)) ? '日本' : CN_PATHS.some((p) => relPath.startsWith(p)) ? '中國' : '其他'

const layerStats = {}
const layerByTheatre = { 日本: {}, 中國: {} }
/**
 * 抽一處 `layers: layers('小','中','大')` 呼叫嘅三個位置參數字面值。
 * 盲點修正（2026-11-09，加厚輪 enrich-human-decisions A 案）：
 * bakumatsu／heian 用本地 helper 傳參，只掃 `elementary:` key 會完全睇唔到
 * 該 20 條（ jpGap 一度假綠）。呢度只加偵測，唔改門檻。
 */
function layersHelperCall(literalReader) {
  return (text) => {
    const out = []
    for (const m of text.matchAll(/\blayers\s*:\s*layers\s*\(/g)) {
      let pos = m.index + m[0].length
      for (let arg = 0; arg < 3; arg++) {
        // 跳過空白同逗號
        while (pos < text.length && /[\s,]/.test(text[pos])) pos++
        const lit = literalReader(text, pos)
        if (!lit) break
        out.push(lit.value.replace(/\s+/g, '').length)
        pos = lit.end + 1
      }
    }
    return out
  }
}
const helperLens = new Map() // file → [n,n,n,...]（每檔）
for (const file of walk(join(ROOT, ONLY), [])) {
  const text = readFileSync(file, 'utf8')
  if (!/\blayers\s*:\s*layers\s*\(/.test(text)) continue
  helperLens.set(file, layersHelperCall(readLiteral)(text))
}
for (const [key, cfg] of Object.entries(LAYERS)) {
  const idx = { elementary: 0, secondary: 1, university: 2 }[key]
  const lens = []
  const byTheatre = { 日本: [], 中國: [] }
  for (const file of walk(join(ROOT, ONLY), [])) {
    const text = readFileSync(file, 'utf8')
    const th = theatreOf(relative(ROOT, file).replace(/\\/g, '/'))
    for (const m of text.matchAll(new RegExp(`(?:^|[{,\\s])${key}\\s*:\\s*`, 'g'))) {
      const lit = readLiteral(text, m.index + m[0].length)
      if (!lit) continue
      const n = lit.value.replace(/\s+/g, '').length
      lens.push(n)
      if (byTheatre[th]) byTheatre[th].push(n)
    }
    // helper 形式：每 3 個長度一組，按位置歸屬 elementary/secondary/university
    const hl = helperLens.get(file)
    if (hl) {
      for (let g = idx; g < hl.length; g += 3) {
        lens.push(hl[g])
        if (byTheatre[th]) byTheatre[th].push(hl[g])
      }
    }
  }
  for (const [th, arr] of Object.entries(byTheatre)) {
    arr.sort((a, b) => a - b)
    layerByTheatre[th][key] = {
      entries: arr.length,
      median: arr.length ? arr[Math.floor(arr.length / 2)] : 0,
      below: arr.filter((n) => n < cfg.min).length,
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
/** 日本三層未達標總數（入 CI 基線：只能降、不能升）。 */
const JP_GAP = Object.values(layerByTheatre.日本).reduce((a, b) => a + b.below, 0)
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
        readingLayersByTheatre: layerByTheatre,
        japanLayerGap: JP_GAP,
        padding: {
          thresholdDescEcho: DESC_ECHO,
          dupInEvent: dupInEvent.length,
          boilerplate: boilerplate.length,
          descEcho: descEcho.length,
          total: paddingCount,
          descEchoStats,
          dupSamples: dupInEvent.slice(0, 20),
          boilerSamples: [...boilerplate].sort((a, b) => b.events - a.events).slice(0, 20),
          descEchoSamples: [...descEcho].sort((a, b) => b.score - a.score).slice(0, 20),
        },
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
  L.push('### 按戰區（日本的空缺從前被中國的樣本稀釋，故分開計）')
  L.push('')
  L.push('| 戰區 | 層 | 筆數 | 中位字數 | 未達標 |')
  L.push('|---|---|---|---|---|')
  for (const th of ['日本', '中國']) {
    for (const [key, cfg] of Object.entries(LAYERS)) {
      const t = layerByTheatre[th][key]
      L.push(`| ${th} | ${cfg.label} | ${t.entries} | ${t.median} | ${t.below} |`)
    }
  }
  L.push('')
  L.push(
    '注意：沒有 READINGS 的日本 pack 仍會顯示三層，因為 DeepDiveApp 會用 events 的 desc／note／source 自動填充。' +
      '那屬於佔位文字，不是加厚成果；判斷好壞要看上面「筆數／中位」而非面板是否有字。',
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
  L.push('## 灌水偵測（長度合格但內容重複）')
  L.push('')
  L.push(
    `共 **${paddingCount} 段**嫌疑｜同事件重複句 ${dupInEvent.length}｜跨事件樣板 ${boilerplate.length}｜與 desc 同形 ${descEcho.length}`,
  )
  L.push('')
  L.push(
    `desc 同形度分佈（樣本 ${descEchoStats.samples}，閾值 ${DESC_ECHO}）：p50 ${descEchoStats.p50}／p90 ${descEchoStats.p90}／最大 ${descEchoStats.max}。` +
      '閾值要高於 p90 才不會大批誤殺既有正常條目。',
  )
  L.push('')
  L.push('| 形態 | 模組 | 事件 | 說明 |')
  L.push('|---|---|---|---|')
  for (const d of dupInEvent.slice(0, 15)) {
    L.push(`| 同事件重複句 | \`${d.module}\` | ${d.id} | ${d.fields}：「${d.sentence}」 |`)
  }
  for (const b of [...boilerplate].sort((a, x) => x.events - a.events).slice(0, 15)) {
    L.push(`| 跨事件樣板 | \`${b.module}\` | ${b.events} 個事件 | 「${b.sentence}」 |`)
  }
  for (const e of [...descEcho].sort((a, x) => x.score - a.score).slice(0, 15)) {
    L.push(`| 與 desc 同形 | \`${e.module}\` | ${e.id} | ${e.field} 同形度 ${e.score}（${e.chars} 字） |`)
  }
  L.push('')
  mkdirSync(join(ROOT, 'reports'), { recursive: true })
  writeFileSync(join(ROOT, 'reports/event-depth.md'), L.join('\n'), 'utf8')
  console.log(
    `audit:event-depth — 段落 ${rows.length}／缺口 ${gaps.length}（起因 ${byField.causes.below}／經過 ${byField.course.below}／結果 ${byField.outcome.below}）｜三層意譯：小學生 ${layerStats.elementary.entries}・中學生 ${layerStats.secondary.entries}・大學 ${layerStats.university.entries}（缺小學生層 ${layerMissing.小學生}）｜日本三層未達 ${JP_GAP}（小 ${layerByTheatre.日本.elementary.below}／中 ${layerByTheatre.日本.secondary.below}／大 ${layerByTheatre.日本.university.below}，筆數 ${layerByTheatre.日本.elementary.entries}/${layerByTheatre.日本.secondary.entries}/${layerByTheatre.日本.university.entries}）｜灌水嫌疑 ${paddingCount} 段（同句 ${dupInEvent.length}／樣板 ${boilerplate.length}／改寫 ${descEcho.length}）→ reports/event-depth.md`,
  )
}

if (has('--fail-on-gap') && gaps.length > 0) process.exit(1)
