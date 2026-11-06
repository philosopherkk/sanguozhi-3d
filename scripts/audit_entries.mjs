#!/usr/bin/env node
/**
 * audit_entries.mjs — 逐條目結構篩選（Project A 缺口清單）
 *
 * 期望每條：classical 時代要古文原文＋出處（modern 時代只要現代簡述）、
 * 三層意譯（elementary/secondary/university）、四段（causes/course/keyFigures/outcome）＋維基連結。
 * 內容可以散喺 EVENTS / DETAILS / READING 三個 map，呢個 script 按 id join。
 * 只讀檔。用法：node scripts/audit_entries.mjs [--json]
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const read = (p) => { try { return fs.readFileSync(path.join(ROOT, p), 'utf8') } catch { return '' } }

/** 由 marker 開始，搵佢嘅陣列，深度 1 嘅每个 {...} 係一個元素。 */
function arrayBlocks(src, marker) {
  const at = src.indexOf(marker)
  if (at < 0) return []
  const arrOpen = src.indexOf('[', at)
  if (arrOpen < 0) return []
  const out = []
  let depth = 0, elemStart = -1
  for (let i = arrOpen; i < src.length; i++) {
    const ch = src[i]
    if (ch === '[' || ch === '{' || ch === '(') {
      if (depth === 1 && ch === '{') elemStart = i
      depth++
    } else if (ch === ']' || ch === '}' || ch === ')') {
      depth--
      if (depth === 1 && ch === '}' && elemStart >= 0) out.push({ body: src.slice(elemStart, i + 1), at: elemStart })
      if (depth === 0) break
    }
  }
  return out
}

/** map 形如 `export const X: Record<string, T> = { 'id': { ... } }`；id 用 key。 */
function mapBlocks(src, marker) {
  const at = src.indexOf(marker)
  if (at < 0) return []
  const open = src.indexOf('{', at)
  if (open < 0) return []
  const out = []
  let depth = 0, elemStart = -1
  for (let i = open; i < src.length; i++) {
    const ch = src[i]
    if (ch === '{') {
      if (depth === 1) elemStart = i
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 1 && elemStart >= 0) {
        const head = src.slice(Math.max(0, src.lastIndexOf(',', elemStart - 1)), elemStart)
        out.push({ body: src.slice(elemStart, i + 1), key: (head.match(/'?([A-Za-z0-9_-]+)'?\s*:/) || [])[1] })
      }
      if (depth === 0) break
    }
  }
  return out
}

/** marker 之後嘅容器：.skip 型別註解入面嘅 `[`（例如 `XxxEvent[] = [`）。 */
function findContainer(src, marker) {
  const at = src.indexOf(marker)
  if (at < 0) return null
  const eq = src.indexOf('=', at)
  const from = eq >= 0 && eq - at < 160 ? eq : at
  const a = src.indexOf('[', from)
  const o = src.indexOf('{', from)
  if (a < 0 && o < 0) return null
  if (o < 0 || (a >= 0 && a < o)) return { idx: a }
  return { idx: o }
}

/** 由容器起始括号開始，深度 1 嘅每個 `{...}` 係一個條目；map 形會 backwards 搵 key。 */
function blocksFrom(src, idx) {
  const out = []
  let depth = 0, elemStart = -1
  for (let i = idx; i < src.length; i++) {
    const ch = src[i]
    if (ch === '[' || ch === '{' || ch === '(') {
      if (depth === 1 && ch === '{') elemStart = i
      depth++
    } else if (ch === ']' || ch === '}' || ch === ')') {
      depth--
      if (depth === 1 && ch === '}' && elemStart >= 0) {
        const head = src.slice(Math.max(0, src.lastIndexOf(',', elemStart - 1)), elemStart)
        out.push({
          body: src.slice(elemStart, i + 1),
          key: (head.match(/'?([A-Za-z0-9_-]+)'?\s*:\s*$/) || [])[1],
        })
      }
      if (depth === 0) break
    }
  }
  return out
}


const idOf = (b) => {
  const id = (b.body.match(/\bid:\s*'([^']*)'/) || [])[1] ?? b.key ?? '(無 id)'
  // 過濾誤捕：欄位名本身唔係條目 id
  if (/^(keyFigures|events|details|readings|people|places|routes|ticks|factions|domains|situation|leadersByYear|shadeNotes)$/.test(id)) return null
  return id
}
const has = (t, re) => re.test(t)
const RE = {
  quote: /\b(classicQuote|quote)\s*:/, qsrc: /\b(classicSource|quoteSource|source)\s*:/,
  l1: /\belementary\s*:/, l2: /\bsecondary\s*:/, l3: /\buniversity\s*:/,
  causes: /\bcauses\s*:/, course: /\bcourse\s*:/, figures: /\bkeyFigures\s*:/,
  outcome: /\boutcome\s*:/, wiki: /zhwiki|wikipedia|wikiUrl|_wiki|link\s*:/,
  summary: /\bdesc\s*:/,
}

const JP = [ ['kofunPack','古墳'],['asukaPack','飛鳥'],['naraPack','奈良'],
  ['kamakuraPack','鎌倉'],['muromachiPack','室町'],['azuchiPack','安土桃山'],
  ['edoPack','德川江戶'],['modernJapanPack','明治至當代',1] ]
/** pack 檔嘅事件陣列同詳情／語譯 map 可能用唔同嘅寫法，一次過攪埋。 */
const packEv = (f) => [[`src/japanEras/packs/${f}.ts`,'events: ['],[`src/japanEras/packs/${f}.ts`,'const events']]
const packDet = (f) => [[`src/japanEras/packs/${f}.ts`,'const DETAILS'],[`src/japanEras/packs/${f}.ts`,'Object.assign(DETAILS'],[`src/japanEras/packs/${f}.ts`,'details: {'],[`src/japanEras/packs/${f}.ts`,'DETAILS: {']]
const packRea = (f) => [[`src/japanEras/packs/${f}.ts`,'const READINGS'],[`src/japanEras/packs/${f}.ts`,'readings: {'],[`src/japanEras/packs/${f}.ts`,'READINGS: {']]
const IMP = [ ['jinPack','晉'],['nanbeiPack','十六國南北朝'],['suiPack','隋'],['tangPack','唐'],
  ['wudaiPack','五代十國'],['liaosongPack','遼宋'],['yuanMingQingPack','元明清'],
  ['minguoPack','民國・內戰',1],['prcPack','共和國',1] ]

const ERAS = [
  { era:'夏・商・西周・春秋・戰國', ev:[['src/zhou/data/timeline.ts','ZHOU_TIMELINE'],
    ['src/zhou/data/timelineMore.ts','export const'],['src/zhou/data/earlyDynasty.ts','export const'],
    ['src/zhou/data/earlyDynastyMore.ts','export const'],['src/zhou/data/studentEvents.ts','export const']] },
  { era:'秦・漢', ev:[['src/qinhan/data/timeline.ts','QINHAN_TIMELINE']] },
  { era:'三國', ev:[['src/data/timelineDetails.ts','TIMELINE_DETAILS']], map:1 },
  { era:'平安末期', ev:[['src/heian/data/history.ts','HEIAN_EVENTS']],
    det:[['src/heian/data/history.ts','HEIAN_DETAILS']], rea:[['src/heian/data/history.ts','HEIAN_READING']] },
  { era:'戰國（日本）', ev:[['src/sengoku/data/timelineDetails.ts','SENGOKU_TIMELINE_DETAILS']], map:1 },
  { era:'幕末', mode:'modern', ev:[['src/bakumatsu/data/history.ts','BAKUMATSU_EVENTS']],
    det:[['src/bakumatsu/data/history.ts','BAKUMATSU_DETAILS']], rea:[['src/bakumatsu/data/history.ts','BAKUMATSU_READING']] },
  ...JP.map(([f, label, modern]) => ({ era: label, mode: modern ? 'modern' : 'classical',
    ev: packEv(f), det: packDet(f), rea: packRea(f) })),
  ...IMP.map(([f, label, modern]) => ({ era: label, mode: modern ? 'modern' : 'classical',
    ev: [[`src/imperial/data/${f}.ts`, 'events: [']],
    det: [[`src/imperial/data/${f}.ts`, 'const DETAILS'], [`src/imperial/data/${f}.ts`, 'DETAILS: {']],
    rea: [[`src/imperial/data/${f}.ts`, 'const READINGS'], [`src/imperial/data/${f}.ts`, 'READINGS: {']] })),
]

// 三國／戰國（日本）嘅原文喺 separate reading map
ERAS[2].det = [['src/data/timelineDetails.ts', 'TIMELINE_DETAILS']]
ERAS[2].rea = [['src/data/readingLayers.ts', 'READING_LAYERS']]
ERAS[4].det = [['src/sengoku/data/timelineDetails.ts', 'SENGOKU_TIMELINE_DETAILS']]
ERAS[4].rea = [['src/sengoku/data/readingLayers.ts', 'SENGOKU_READING']]

function collect(spec) {
  const byId = new Map()
  const slot = (id) => {
    if (!byId.has(id)) byId.set(id, { id, ev: '', det: '', rea: '' })
    return byId.get(id)
  }
  const grab = (list, field) => {
    for (const [file, marker] of list ?? []) {
      const src = read(file)
      // marker 可以係 export const 名、`events:`，或者 `export const`（= 攞檔內所有頂層陣列）
      const starts = marker === 'export const'
        ? [...src.matchAll(/export const\s+[A-Za-z0-9_]+\s*(?::[^=]*)?=\s*([[{])/g)]
            .map((m) => ({ idx: m.index + m[0].length - 1 }))
        : [findContainer(src, marker)].filter(Boolean)
      for (const { idx, isMap } of starts) {
        for (const b of blocksFrom(src, idx, isMap)) {
          const id = idOf(b)
          if (!id || id === '(無 id)') continue
          slot(id)[field] += b.body
        }
      }
    }
  }
  grab(spec.ev, 'ev'); grab(spec.det, 'det'); grab(spec.rea, 'rea')
  if (spec.json) {
    let data
    try { data = JSON.parse(read(spec.json.file)) } catch { data = null }
    const evs = Array.isArray(data) ? data : (data?.events ?? [])
    for (const e of evs) {
      const y = Number(e.year ?? 0)
      if (y < spec.json.from || y > spec.json.to) continue
      slot(String(e.id ?? y)).ev = JSON.stringify(e)
    }
  }
  return [...byId.values()]
}

function evaluate(e, mode) {
  const all = e.ev + e.det + e.rea
  const miss = []
  if (mode === 'classical' && !has(all, RE.quote)) miss.push('原文')
  if (mode === 'modern' && !has(all, RE.summary)) miss.push('現代簡述')
  for (const [k, label] of [['l1', '小學生層'], ['l2', '中學生層'], ['l3', '大學生層']])
    if (!has(all, RE[k])) miss.push(label)
  for (const [k, label] of [['causes', '起因'], ['course', '經過'],
    ['figures', '關鍵人物'], ['outcome', '結果及影響']])
    if (!has(all, RE[k])) miss.push(label)
  if (!has(all, RE.wiki)) miss.push('維基連結')
  return miss
}

const rows = ERAS.map((spec) => {
  const entries = collect(spec)
  const mode = spec.mode ?? 'classical'
  return { spec, mode, entries: entries.map((e) => ({ ...e, miss: evaluate(e, mode) })) }
}).filter((r) => r.entries.length)

const total = rows.reduce((a, r) => a + r.entries.length, 0)
const cnt = (list, key) => `${list.filter((e) => has(e.ev + e.det + e.rea, RE[key])).length}/${list.length}`

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(rows.map((r) => ({
    era: r.spec.era, mode: r.mode, entries: r.entries.length,
    full: r.entries.filter((e) => !e.miss.length).length,
  })), null, 2))
  process.exit(0)
}

const L = ['# 條目結構審計（Project A 篩選結果）', '']
L.push(`> \`node scripts/audit_entries.mjs\` 產生。deep-dive 條目合共 **${total}** 條。`)
L.push('> classical 時代要古文原文＋出處；modern 時代（民國・內戰／共和國／幕末／明治至當代）只要現代簡述。')
L.push('>')
L.push('> **點讀呢張表**：`0/n` 未必係「畫面無嘢睇」。DeepDiveApp 有 fallback——無自訂 detail／reading 時會用 event 嘅 `desc` 即時生成一個簡短彈窗，所以用家仍然见到文字，但**缺四段結構、三層意譯、人物維基連結**。呢張表量嘅係結構完備度，唔係有無渲染。')
L.push('> 已完備嘅 pack：`modernJapanPack`、`德川江戶`（7/16，北海道・蝦夷三役全部有原文／四段）、`三國`、`秦漢`、`兩周`、`戰國（日本）`。其餘 pack（古墳→安土、德川江戶餘下 9 條、晉→元明清、民國・共和國）需要補 DETAILS／READINGS，即下面嘅待辦清單。')
L.push('')
L.push('| 時代 | 條目 | 原文 | 三層 | 起因 | 經過 | 人物 | 結果影響 | 維基 | 完全合格 |')
L.push('|---|---|---|---|---|---|---|---|---|---|')
for (const r of rows) {
  const e = r.entries, full = e.filter((x) => !x.miss.length).length
  L.push(`| ${r.spec.era} | ${e.length} | ${r.mode === 'modern' ? 'n/a' : cnt(e, 'quote')} | ` +
    `${e.filter((x) => ['l1','l2','l3'].every((k) => has(x.ev+x.det+x.rea, RE[k]))).length}/${e.length} | ` +
    `${cnt(e,'causes')} | ${cnt(e,'course')} | ${cnt(e,'figures')} | ${cnt(e,'outcome')} | ` +
    `${cnt(e,'wiki')} | **${full}/${e.length}** |`)
}
L.push('', '## 逐條缺項（每時代最多 12 條）')
for (const r of rows) {
  const bad = r.entries.filter((x) => x.miss.length)
  if (!bad.length) continue
  L.push('', `### ${r.spec.era}（${bad.length} 條有缺）`)
  for (const x of bad.slice(0, 12)) L.push(`- \`${x.id}\`：${x.miss.join('、')}`)
  if (bad.length > 12) L.push(`- …另有 ${bad.length - 12} 條`)
}
fs.writeFileSync(path.join(ROOT, 'docs/ENTRY_AUDIT.md'), L.join('\n') + '\n', 'utf8')
console.log(L.join('\n'))
