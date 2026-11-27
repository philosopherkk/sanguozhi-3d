#!/usr/bin/env node
/**
 * audit_critical.mjs — 「關鍵事變」盤點閘門：邊啲年改變時代／地圖政權，邊啲年冇卡。
 *
 * KK 定義（見 src/types/data.ts）：導致時代改變、令地圖上一個政權出現／消失、
 * 或令整體權力格局改變（政治轉折）嘅事件。準則唔寫死年份，全部讀自資料本身：
 *   1. pack 嘅 ticks／keyYears／territoryByYear（換圖年）
 *   2. snapshots 或 territoryByYear 相鄰幀嘅政權集合差分（首次出現／最後消失）
 *      · 中國槽 extensions 係 identifier → 去 realmRanges／warlordRanges 拆政權名
 *      · 日本槽／平安／幕末嘅 paint 幀用 F.x 或字面政權名
 *   3. factions[].activeFrom／activeTo（政權興亡登記）
 *   4. 時代起點 yearMin／終點 yearMax（pack 欄；獨立槽讀 state 嘅 YEAR_MIN／MAX）
 * 判定：
 *   界線標記 = 時代終點年；以及落在最後一個換圖年（含）之後嘅「政權退出」——
 *              例如古墳 537、飛鳥 709、奈良 793、明治 2026，屬時代界線，唔算缺口。
 *   缺口 = 連事件卡都冇，而且唔淨係界線原因。
 *   未標 = 有卡但冇一張係 critical: true（周／秦漢嘅舊 interface 冇呢個欄，跳過）。
 * 手法同其他 scripts/audit_*.mjs：淨掃字串（跳過字串與註解），唔 import TS。
 *
 * 用法：node scripts/audit_critical.mjs [--md 輸出.md] [--era 關鍵字] [--strict]
 *       --md 只重寫第一節；檔案已有「## 第二節：政治轉折年」時原樣保留該節。
 *       --cards 傾所有事件卡（槽<TAB>年<TAB>標題<TAB>critical），俾第二節對帳。
  *       --todo N 列出前 N 項待辦（缺口先、未標其次，附原因與檔案路徑）；
  *                --start K 分頁。給 agent-queue.mjs 同關鍵事變代理用。
 *       HF_ROOT=… 指住任何 checkout／worktree 跑（默認用腳本自身所在嘅倉）
 * 輸出（gate-ci 錨定 summary 行，唔好改格式）：
 *   <槽名>｜關鍵年 n｜有卡 n｜缺口 n｜未標 n｜界線 年…
 *   audit:critical — n 槽｜關鍵年 n｜有卡 n｜缺口 n｜未標 n｜界線 n
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.env.HF_ROOT || join(import.meta.dirname, '..')
const SRC = join(ROOT, 'src')
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u
const unresolved = new Set()

/* ---------- 掃字串：跳過 '...' "..." `...`、// 與 /* 註解 ---------- */
function nextCode(s, i) {
  const c = s[i]
  if (c === '"' || c === "'" || c === '`') return skipString(s, i)
  if (c === '/' && s[i + 1] === '/') {
    i += 2
    while (i < s.length && s[i] !== '\n') i++
    return i
  }
  if (c === '/' && s[i + 1] === '*') {
    i += 2
    while (i < s.length && !(s[i] === '*' && s[i + 1] === '/')) i++
    return i + 2
  }
  return i + 1
}
function skipString(s, i) {
  const q = s[i]
  i++
  while (i < s.length) {
    if (s[i] === '\\') {
      i += 2
      continue
    }
    if (s[i] === q) return i + 1
    i++
  }
  return i
}
/** 由 `open`（指向 { 或 [）掃到平衡結束，返 { body, end } */
function balance(s, open) {
  let i = open
  let d = 0
  while (i < s.length) {
    const c = s[i]
    if (c === '"' || c === "'" || c === '`' ||
      (c === '/' && (s[i + 1] === '/' || s[i + 1] === '*'))) {
      i = nextCode(s, i)
      continue
    }
    if (c === '{' || c === '[') d++
    if (c === '}' || c === ']') {
      d--
      if (d === 0) return { body: s.slice(open + 1, i), end: i + 1 }
    }
    i++
  }
  return { body: s.slice(open + 1), end: s.length }
}
/** 深度 0 嘅 `{...}` 物件逐個掃出 */
function scanObjects(s) {
  const out = []
  let i = 0
  let d = 0
  while (i < s.length) {
    const c = s[i]
    if (c === '"' || c === "'" || c === '`' ||
      (c === '/' && (s[i + 1] === '/' || s[i + 1] === '*'))) {
      i = nextCode(s, i)
      continue
    }
    if (c === '{') {
      if (d === 0) {
        const { body, end } = balance(s, i)
        out.push(body)
        i = end
        continue
      }
      d++
    } else if (c === '}') d--
    i++
  }
  return out
}
/** 搵 `key:` 右邊嘅起點；冇就 -1 */
function rhsStart(body, key) {
  let i = 0
  while (i < body.length) {
    const c = body[i]
    if (c === '"' || c === "'" || c === '`' ||
      (c === '/' && (body[i + 1] === '/' || body[i + 1] === '*'))) {
      i = nextCode(body, i)
      continue
    }
    const m = new RegExp('^' + key + '\\s*:').exec(body.slice(i))
    if (m) return i + m[0].length
    i++
  }
  return -1
}
/** 一個 key 嘅字面值（字串／數字／true／false／identifier） */
function literal(body, key) {
  const j = rhsStart(body, key)
  if (j < 0) return undefined
  let k = j
  while (k < body.length && /\s/.test(body[k])) k++
  const c = body[k]
  if (c === '"' || c === "'" || c === '`') {
    const end = skipString(body, k)
    return body.slice(k + 1, end - 1)
  }
  const m = /^(-?\d+(?:\.\d+)?|true|false|null|[A-Za-z_$][\w$]*)/.exec(body.slice(k))
  return m ? m[1] : undefined
}
/** 跳過型別注釋，搵到 `=` 嘅位置（避開 `==`、`=>`） */
function assignEq(text, from) {
  let i = from
  while (i < text.length) {
    const c = text[i]
    if (c === '"' || c === "'" || c === '`' ||
      (c === '/' && (text[i + 1] === '/' || text[i + 1] === '*'))) {
      i = nextCode(text, i)
      continue
    }
    if (c === '=' && text[i + 1] !== '=' && text[i + 1] !== '>') return i
    i++
  }
  return -1
}
/** 由 `const NAME` 嘅名字末端跳到值嘅起點 */
function valueStart(text, from) {
  const eq = assignEq(text, from)
  if (eq < 0) return -1
  let i = eq + 1
  while (i < text.length && /\s/.test(text[i])) i++
  return i
}

/* ---------- 跨檔 const 索引（SENGOKU_KEY_YEARS 呢啲係 import 過嚟嘅） ---------- */
const texts = new Map()
function readAbs(p) {
  if (!texts.has(p)) texts.set(p, readFileSync(p, 'utf8'))
  return texts.get(p)
}
function tsFiles(dir) {
  const out = []
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name)
    if (ent.isDirectory()) out.push(...tsFiles(p))
    else if (/\.tsx?$/.test(ent.name)) out.push(p)
  }
  return out
}
let constIdx = null
function constHits(name) {
  if (!constIdx) {
    constIdx = new Map()
    for (const p of tsFiles(SRC)) {
      const t = readAbs(p)
      for (const m of t.matchAll(/(?:const|let)\s+([A-Za-z_$][\w$]*)/g)) {
        const at = m.index + m[0].length
        if (!constIdx.has(m[1])) constIdx.set(m[1], [])
        constIdx.get(m[1]).push({ p, at })
      }
    }
  }
  return constIdx.get(name) || []
}
/**
 * 值體解析：開頭係 open 就取平衡體；「fn(…)」呢啲 helper（hold／cover）攞參數體；
 * identifier 就跨檔跟落去（AZUCHI_YEARS → SENGOKU_KEY_YEARS、QING_1860 → QING_1750）。
 */
function valueBodyAt(text, vs, open, depth = 0) {
  if (vs < 0 || vs >= text.length) return null
  if (text[vs] === open) return balance(text, vs).body
  const call = /^([A-Za-z_$][\w$]*)\s*\(/.exec(text.slice(vs))
  if (call) return balance(text, vs + call[0].lastIndexOf('(')).body
  if (depth > 3) return null
  const ident = /^([A-Za-z_$][\w$]*)/.exec(text.slice(vs))
  if (!ident) return null
  for (const hit of constHits(ident[1])) {
    const t = readAbs(hit.p)
    const vs2 = valueStart(t, hit.at)
    if (t[vs2] === '(') continue // 函數（cover／paint 呢啲 helper），唔係資料
    const r = valueBodyAt(t, vs2, open, depth + 1)
    if (r !== null) return r
  }
  unresolved.add(ident[1])
  return null
}
/** 一個 const 嘅值體（值本身可以係另一個 const 嘅別名） */
function constBody(name, open) {
  for (const hit of constHits(name)) {
    const t = readAbs(hit.p)
    const r = valueBodyAt(t, valueStart(t, hit.at), open, 1)
    if (r !== null) return r
  }
  return null
}
/** 同檔嘅 `const NAME = {`／`= [`（events 之類用 shorthand 嘅槽）。
 * 一定要用 valueStart 跳過型別注釋：`NAME: Record<…> = {` 嗰個冒號唔係 key。 */
function localConst(text, name, open) {
  for (const m of text.matchAll(new RegExp('(?:const|let)\\s+' + name + '\\b', 'g'))) {
    const vs = valueStart(text, m.index + m[0].length)
    if (vs > 0 && text[vs] === open) return balance(text, vs).body
  }
  return null
}
/** 頂層 const：先讀同檔（跳過型別注釋），值係 identifier 先跨檔跟 */
function constTop(text, name, open) {
  return localConst(text, name, open) ?? constBody(name, open)
}
/** `key: [..]`／`key: {..}`／`key: IDENT`／`key: fn(…)` → 值體或 null */
function valueFor(body, key, open) {
  const j = rhsStart(body, key)
  if (j < 0) return null
  let k = j
  while (k < body.length && /\s/.test(body[k])) k++
  return valueBodyAt(body, k, open)
}
/** 深度 0 嘅整數列表（keyYears），`...IDENT` 會展開 */
function numberList(body) {
  const out = []
  let i = 0
  let d = 0
  while (i < body.length) {
    const c = body[i]
    if (c === '"' || c === "'" || c === '`' ||
      (c === '/' && (body[i + 1] === '/' || body[i + 1] === '*'))) {
      i = nextCode(body, i)
      continue
    }
    if (c === '{' || c === '[') {
      d++
      i++
      continue
    }
    if (c === '}' || c === ']') {
      d--
      i++
      continue
    }
    if (d === 0) {
      const sp = /^\.\.\.\s*([A-Za-z_$][\w$]*)/.exec(body.slice(i))
      if (sp) {
        const r = constBody(sp[1], '[')
        if (r === null) unresolved.add(sp[1])
        else out.push(...numberList(r))
        i += sp[0].length
        continue
      }
      const m = /^(-?\d+)(?![\w.])/.exec(body.slice(i))
      if (m) {
        out.push(Number(m[1]))
        i += m[0].length
        continue
      }
    }
    i++
  }
  return out
}
/** 深度 0 嘅 `250: …`／`-221: …` 條目 → [{ year, text }] */
function keyedEntries(body) {
  const marks = []
  let i = 0
  let d = 0
  let lastSig = ''
  while (i < body.length) {
    const c = body[i]
    if (c === '"' || c === "'" || c === '`' ||
      (c === '/' && (body[i + 1] === '/' || body[i + 1] === '*'))) {
      i = nextCode(body, i)
      continue
    }
    if (c === '{' || c === '[') {
      d++
      lastSig = c
      i++
      continue
    }
    if (c === '}' || c === ']') {
      d--
      lastSig = c
      i++
      continue
    }
    if (d === 0 && /[{,]/.test(lastSig)) {
      const m = /^(-?\d+)\s*:/.exec(body.slice(i))
      if (m) {
        marks.push({ year: Number(m[1]), at: i, end: i + m[0].length })
        lastSig = ':'
        i += m[0].length
        continue
      }
    }
    if (!/\s/.test(c)) lastSig = c
    i++
  }
  const out = []
  for (let k = 0; k < marks.length; k++) {
    const stop = k + 1 < marks.length ? marks[k + 1].at : body.length
    out.push({ year: marks[k].year, text: body.slice(marks[k].end, stop) })
  }
  return out
}
/** 幀體入面嘅政權名：CJK 字面值 ＋ F.xxx（檔頭 `const F = { k: '名' }`） */
function frameFactions(text, fmap) {
  const set = new Set()
  for (const m of text.matchAll(/'([^'\\\n]+)'|"([^"\\\n]+)"/g)) {
    const s = m[1] ?? m[2]
    if (CJK.test(s)) set.add(s)
  }
  for (const m of text.matchAll(/\bF\.([A-Za-z_$][\w$]*)/g)) {
    const n = fmap.get(m[1])
    if (n) set.add(n)
  }
  return set
}
function fConst(fileText) {
  const m = new Map()
  const body = localConst(fileText, 'F', '{')
  if (!body) return m
  for (const mm of body.matchAll(/([A-Za-z_$][\w$]*)\s*:\s*'([^']+)'/g)) m.set(mm[1], mm[2])
  return m
}
/** 一段 ranges／control 文字入面嘅政權名（含 identifier 展開，深 2 層封頂） */
function rangeFactions(refs, depth = 0) {
  const set = new Set()
  for (const c of refs.matchAll(/cover\(\s*'([^']+)'/g)) set.add(c[1])
  for (const c of refs.matchAll(/'([^'\\\n]+)'|"([^"\\\n]+)"/g)) {
    const s = c[1] ?? c[2]
    if (CJK.test(s)) set.add(s)
  }
  if (depth >= 2) return set
  for (const m of refs.matchAll(/[A-Za-z_$][\w$]*/g)) {
    const body = constBody(m[0], '[')
    if (body === null) continue
    for (const c of rangeFactions(body, depth + 1)) set.add(c)
  }
  return set
}

/* ---------- 事件卡 ---------- */
/**
 * 掃一個陣列體入面嘅事件卡：要有 year: 同 title:（快照／幾何／路線體冇 title）。
 * 去重靠 year＋title。flagged=false 俾冇 critical 欄嘅舊 interface（周／秦漢）用。
 */
function scanEvents(body, flagged = true) {
  const out = []
  const seen = new Set()
  if (!body) return out
  for (const b of scanObjects(body)) {
    const year = Number(literal(b, 'year'))
    if (!Number.isFinite(year)) continue
    const title = literal(b, 'title')
    if (!title) continue
    const key = `${year}|${title}`
    if (seen.has(key)) continue
    seen.add(key)
    // 一併取出 id：packSlot 以 events 的 id 與 depthEvents() 去重，此前未寫
    // 本欄，該集合恆為 {undefined}，去重等於無效，重複條目會被重計。
    out.push({
      year,
      id: literal(b, 'id'),
      title,
      critical: literal(b, 'critical') === 'true',
      flagged,
    })
  }
  return out
}
/** JSON 檔（三國／戰國 timeline.json）嘅卡 */
function jsonEvents(arr) {
  const out = []
  const seen = new Set()
  for (const it of arr || []) {
    if (!it || typeof it !== 'object') continue
    if (!Number.isFinite(it.year) || typeof it.title !== 'string') continue
    const key = `${it.year}|${it.title}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ year: it.year, id: it.id, title: it.title, critical: it.critical === true })
  }
  return out
}

/* ---------- 讀檔 ---------- */
function read(rel) {
  const p = join(SRC, rel)
  return existsSync(p) ? readFileSync(p, 'utf8') : ''
}
function readJson(rel) {
  const p = join(SRC, rel)
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null
}

/* ---------- 槽 ---------- */
const slots = []
function mark(map, year, reason) {
  if (!Number.isFinite(year)) return
  if (!map.has(year)) map.set(year, new Set())
  map.get(year).add(reason)
}
/** 相鄰幀嘅政權集合差分：首次出現／最後消失（換色唔算） */
function frameDiffYears(rows) {
  const out = new Map()
  rows.sort((a, b) => a.year - b.year)
  let prev = null
  for (const row of rows) {
    if (prev && row.year !== prev.year) {
      for (const n of row.set) if (!prev.set.has(n)) mark(out, row.year, `政權出現:${n}`)
      for (const n of prev.set) if (!row.set.has(n)) mark(out, row.year, `政權退出:${n}`)
    }
    prev = row
  }
  return out
}
/** factions 陣體 → [{ id, name, af, at }] */
function factionRows(body) {
  const rows = []
  for (const b of scanObjects(body || '')) {
    const name = literal(b, 'name')
    const id = literal(b, 'id')
    const af = literal(b, 'activeFrom')
    const at = literal(b, 'activeTo')
    if (!name || (af === undefined && at === undefined)) continue
    rows.push({ id, name, af: Number(af), at: Number(at) })
  }
  return rows
}

/** 一個 pack 槽（中國 EraPack／日本 JapanDeepDivePack 通用） */
/* `depth.ts` 嘅補深條目喺 UI 同 pack 事件一齊渲染（ImperialTimeline 把它
 * 哋串埋一齊），所以佢哋都算「有卡」；同 id 時保留 pack 嗰條 —— UI 都係
 * 以 id 去重、先出現者勝。唔計呢啲條目會將「已有短卡」嘅年誤報為缺口。 */
let depthByPack = null
function depthEvents(packId) {
  if (depthByPack === null) {
    depthByPack = new Map()
    const text = read('imperial/data/depth.ts')
    const body = text ? localConst(text, 'DEPTH_EVENTS', '{') : null
    if (body) {
      for (const m of body.matchAll(/^  ([A-Za-z]+): \[/gm)) {
        const arr = balance(body, m.index + m[0].length - 1).body
        const list = []
        for (const e of arr.matchAll(/\bev\(\s*'([^']+)'\s*,\s*(-?\d+)/g))
          list.push({ id: e[1], year: Number(e[2]), critical: false })
        depthByPack.set(m[1], list)
      }
    }
  }
  return depthByPack.get(packId) || []
}

function packSlot(label, dir, file) {
  const text = read(join(dir, file))
  if (!text) return
  const m = /export const \w+: \w+Pack = \{/.exec(text)
  if (!m) return
  const packBody = balance(text, text.indexOf('{', m.index)).body
  const yMin = Number(literal(packBody, 'yearMin'))
  const yMax = Number(literal(packBody, 'yearMax'))
  const crit = new Map()
  const mapYears = []

  const ticks = valueFor(packBody, 'ticks', '[')
  if (ticks !== null) {
    for (const mm of ticks.matchAll(/\byear:\s*(-?\d+)/g)) mark(crit, Number(mm[1]), 'tick')
  }
  const keyYears = valueFor(packBody, 'keyYears', '[')
  if (keyYears !== null) for (const y of numberList(keyYears)) mark(crit, y, 'keyYear')

  const facBody = valueFor(packBody, 'factions', '[')
  const idName = new Map()
  for (const f of factionRows(facBody)) {
    if (f.id) idName.set(f.id, f.name)
    mark(crit, f.af, `政權出現:${f.name}`)
    mark(crit, f.at, `政權退出:${f.name}`)
  }

  // snapshots（中國槽）：extensions 指向 realmRanges 嗰啲 FactionRange[]，冇就先讀 control
  const reg = extRegistry()
  const snaps = valueFor(packBody, 'snapshots', '[')
  if (snaps !== null) {
    const rows = []
    for (const b of scanObjects(snaps)) {
      const y = Number(literal(b, 'year'))
      if (!Number.isFinite(y)) continue
      const set = new Set()
      const er = literal(b, 'extensions')
      if (er && reg.has(er)) {
        for (const n of reg.get(er)) set.add(n)
      } else if (er !== undefined && !/^(null|undefined)$/.test(er)) {
        unresolved.add(er)
      } else {
        const ctl = valueFor(b, 'control', '{')
        if (ctl !== null) {
          for (const c of ctl.matchAll(/:\s*'([^']+)'/g)) {
            const v = c[1]
            if (CJK.test(v)) set.add(idName.get(v) || v)
          }
        }
      }
      if (!set.size) continue
      rows.push({ year: y, set })
      mapYears.push(y)
    }
    for (const [y, rs] of frameDiffYears(rows)) for (const r of rs) mark(crit, y, r)
  }

  // territoryByYear（日本槽為主）：numeric key 幀 → 政權集合差分
  const tbyBody = valueFor(packBody, 'territoryByYear', '{') ||
    localConst(text, 'territoryByYear', '{')
  if (tbyBody !== null) {
    const fmap = fConst(text)
    const rows = []
    for (const e of keyedEntries(tbyBody)) {
      const set = frameFactions(e.text, fmap)
      if (!set.size) continue
      rows.push({ year: e.year, set })
      mapYears.push(e.year)
    }
    for (const [y, rs] of frameDiffYears(rows)) for (const r of rs) mark(crit, y, r)
  }

  const ev = valueFor(packBody, 'events', '[') || localConst(text, 'events', '[')
  const events = scanEvents(ev)
  const packId = /export const \w+: \w+Pack = \{\s*id:\s*'([^']+)'/.exec(text)?.[1]
  const known = new Set(events.map((e) => e.id))
  for (const d of depthEvents(packId)) if (!known.has(d.id)) events.push(d)
  slots.push({
    name: label,
    file: `src/${join(dir, file)}`,
    yearMin: yMin,
    yearMax: yMax,
    lastMapYear: mapYears.length ? Math.max(...mapYears) : null,
    crit,
    events,
  })
  mark(crit, yMin, '時代起點')
  mark(crit, yMax, '時代終點')
}

/* extensions identifier → 政權名集合（realmRanges／warlordRanges）。
 * 用 valueStart 先至唔會俾 `: FactionRange[]` 入面嘅中括號呃到。 */
const EXT_FILES = ['imperial/data/realmRanges.ts', 'imperial/data/warlordRanges.ts']
let extReg = null
function extRegistry() {
  if (extReg) return extReg
  extReg = new Map()
  for (const f of EXT_FILES) {
    const text = read(f)
    const alias = new Map()
    for (const m of text.matchAll(/(?:const|let)\s+([A-Za-z_$][\w$]*)/g)) {
      const vs = valueStart(text, m.index + m[0].length)
      if (vs < 0) continue
      if (text[vs] === '[') {
        const names = new Set()
        for (const c of balance(text, vs).body.matchAll(/cover\(\s*'([^']+)'/g)) names.add(c[1])
        if (names.size) extReg.set(m[1], names)
        continue
      }
      // QING_1860 = QING_1750 呢啲別名：第二輪先補到
      const id = /^[A-Za-z_$][\w$]*/.exec(text.slice(vs))
      if (id && id[0] !== m[1]) alias.set(m[1], id[0])
    }
    for (const [name, target] of alias) {
      if (extReg.has(name)) continue
      let cur = extReg.get(target)
      let hops = 0
      while (!cur && hops++ < 3) cur = extReg.get(alias.get(target) || '')
      if (cur) extReg.set(name, cur)
    }
  }
  return extReg
}

for (const [label, file] of [
  ['兩晉', 'jinPack.ts'],
  ['南北朝', 'nanbeiPack.ts'],
  ['隋', 'suiPack.ts'],
  ['唐', 'tangPack.ts'],
  ['五代', 'wudaiPack.ts'],
  ['遼宋', 'liaosongPack.ts'],
  ['元明清', 'yuanMingQingPack.ts'],
  ['中華民國', 'minguoPack.ts'],
  ['國共內戰', 'civilWarPack.ts'],
  ['新中國', 'prcPack.ts'],
]) packSlot(label, 'imperial/data', file)

for (const [label, file] of [
  ['古墳', 'kofunPack.ts'],
  ['飛鳥', 'asukaPack.ts'],
  ['奈良', 'naraPack.ts'],
  ['鎌倉', 'kamakuraPack.ts'],
  ['室町', 'muromachiPack.ts'],
  ['安土桃山', 'azuchiPack.ts'],
  ['江戶', 'edoPack.ts'],
  ['明治大正昭和', 'modernJapanPack.ts'],
]) packSlot(label, 'japanEras/packs', file)

/** 獨立槽（冇 pack 物件）：周、秦漢、三國、平安、幕末、戰國 */
function standaloneSlot(label, opts) {
  const { crit, mapYears, events, yearMin, yearMax, noCriticalField, file } = opts
  mark(crit, yearMin, '時代起點')
  mark(crit, yearMax, '時代終點')
  slots.push({
    name: label,
    file,
    yearMin,
    yearMax,
    lastMapYear: mapYears.length ? Math.max(...mapYears) : null,
    crit,
    events,
    noCriticalField,
  })
}

/* 三國主槽（App.tsx 直接行 src/data/）：TERRITORY_BY_YEAR 幀差分
 * ＋ factions.json 興亡 ＋ timeline.json 嘅卡 */
{
  const text = read('data/territoryControl.ts')
  const table = constTop(text, 'TERRITORY_BY_YEAR', '{')
  const fj = readJson('data/factions.json') || []
  const idName = new Map(fj.map((f) => [f.id, f.name]))
  const crit = new Map()
  const mapYears = []
  if (table !== null) {
    const rows = []
    for (const e of keyedEntries(table)) {
      const set = new Set()
      for (const c of e.text.matchAll(/:\s*'([^']+)'/g)) {
        if (CJK.test(c[1])) set.add(idName.get(c[1]) || c[1])
      }
      if (!set.size) continue
      rows.push({ year: e.year, set })
      mapYears.push(e.year)
    }
    for (const [y, rs] of frameDiffYears(rows)) for (const r of rs) mark(crit, y, r)
  }
  const events = jsonEvents(readJson('data/timeline.json'))
  for (const f of fj) {
    mark(crit, f.activeFrom, `政權出現:${f.name}`)
    mark(crit, f.activeTo, `政權退出:${f.name}`)
  }
  const years = [...mapYears, ...events.map((e) => e.year)]
  standaloneSlot('三國', {
    crit,
    file: 'src/data/timeline.json',
    mapYears,
    events,
    yearMin: Math.min(...years),
    yearMax: Math.max(...years),
  })
}

/* 周：ZHOU_SNAPSHOTS 嘅 ranges: hold([['yiluo','夏']])，第二個字面就係政權名 */
{
  const text = read('zhou/data/territoryControl.ts')
  const arr = constTop(text, 'ZHOU_SNAPSHOTS', '[')
  const crit = new Map()
  const mapYears = []
  const years = []
  if (arr !== null) {
    const rows = []
    for (const b of scanObjects(arr)) {
      const y = Number(literal(b, 'year'))
      if (!Number.isFinite(y)) continue
      years.push(y)
      const set = rangeFactions(valueFor(b, 'ranges', '[') || '')
      if (!set.size) continue
      rows.push({ year: y, set })
      mapYears.push(y)
    }
    for (const [y, rs] of frameDiffYears(rows)) for (const r of rs) mark(crit, y, r)
  }
  let ev = []
  for (const f of ['timeline.ts', 'timelineMore.ts', 'earlyDynasty.ts', 'earlyDynastyMore.ts']) {
    ev = ev.concat(scanEvents(read(join('zhou/data', f)), false))
  }
  standaloneSlot('夏商周', {
    crit,
    file: 'src/zhou/data/timeline*.ts',
    mapYears,
    events: ev,
    yearMin: Math.min(...years),
    yearMax: Math.max(...years),
    noCriticalField: true,
  })
}

/* 秦漢：QINHAN_SNAPSHOTS 嘅 ranges 用 identifier（qin221 等），
 * 去同檔 `const qin221 = cover('秦', …)` 拆政權名；終點取卡嘅最晚年 */
{
  const text = read('qinhan/data/territoryControl.ts')
  const arr = constTop(text, 'QINHAN_SNAPSHOTS', '[')
  const crit = new Map()
  const mapYears = []
  const years = []
  if (arr !== null) {
    const rows = []
    for (const b of scanObjects(arr)) {
      const y = Number(literal(b, 'year'))
      if (!Number.isFinite(y)) continue
      years.push(y)
      const set = rangeFactions(valueFor(b, 'ranges', '[') || '')
      if (!set.size) continue
      rows.push({ year: y, set })
      mapYears.push(y)
    }
    for (const [y, rs] of frameDiffYears(rows)) for (const r of rs) mark(crit, y, r)
  }
  const ev = scanEvents(read('qinhan/data/timeline.ts'), false)
  standaloneSlot('秦漢', {
    crit,
    file: 'src/qinhan/data/timeline.ts',
    mapYears,
    events: ev,
    yearMin: Math.min(...years),
    yearMax: Math.max(...ev.map((e) => e.year), ...years),
    noCriticalField: true,
  })
}

/* 平安／幕末：*_TERRITORY_BY_YEAR 幀 ＋ *_KEY_YEARS ＋ types.ts 嘅 *_FACTIONS
 * ＋ state 嘅 YEAR_MIN／YEAR_MAX。資料檔（history.ts 等）只讀唔改。 */
for (const [label, dir, prefix, stateFile] of [
  ['平安', 'heian', 'HEIAN', 'HeianYearContext.tsx'],
  ['幕末', 'bakumatsu', 'BAKUMATSU', 'BakumatsuYearContext.tsx'],
]) {
  const ter = read(join(dir, 'data/territory.ts'))
  const types = read(join(dir, 'types.ts'))
  const state = read(join(dir, 'state', stateFile))
  const crit = new Map()
  const mapYears = []
  const table = constTop(ter, `${prefix}_TERRITORY_BY_YEAR`, '{')
  if (table !== null) {
    const rows = []
    for (const e of keyedEntries(table)) {
      const set = frameFactions(e.text, new Map())
      if (!set.size) continue
      rows.push({ year: e.year, set })
      mapYears.push(e.year)
    }
    for (const [y, rs] of frameDiffYears(rows)) for (const r of rs) mark(crit, y, r)
  }
  const ky = constTop(ter, `${prefix}_KEY_YEARS`, '[')
  if (ky !== null) for (const m of ky.matchAll(/-?\d+/g)) mark(crit, Number(m[0]), 'keyYear')
  for (const f of factionRows(constTop(types, `${prefix}_FACTIONS`, '['))) {
    mark(crit, f.af, `政權出現:${f.name}`)
    mark(crit, f.at, `政權退出:${f.name}`)
  }
  standaloneSlot(label, {
    crit,
    file: `src/${dir}/data/history.ts`,
    mapYears,
    events: scanEvents(read(join(dir, 'data/history.ts'))),
    yearMin: Number(/YEAR_MIN\s*=\s*(-?\d+)/.exec(state)?.[1]),
    yearMax: Number(/YEAR_MAX\s*=\s*(-?\d+)/.exec(state)?.[1]),
  })
}

/* 戰國：SENGOKU_KEY_YEARS 幀年 ＋ factions.json 興亡 ＋ timeline.json 嘅卡
 * ＋ state 視窗（1573 年之後屬安土桃山槽，視窗過濾會擋住） */
{
  const ctl = read('sengoku/data/territoryControl.ts')
  const fj = readJson('sengoku/data/factions.json') || []
  const state = read('sengoku/state/SengokuYearContext.tsx')
  const crit = new Map()
  const mapYears = []
  const ky = constTop(ctl, 'SENGOKU_KEY_YEARS', '[')
  if (ky !== null) {
    for (const y of numberList(ky)) {
      mark(crit, y, 'keyYear')
      mapYears.push(y)
    }
  }
  const events = jsonEvents(readJson('sengoku/data/timeline.json'))
  for (const f of fj) {
    mark(crit, f.activeFrom, `政權出現:${f.name}`)
    mark(crit, f.activeTo, `政權退出:${f.name}`)
  }
  standaloneSlot('戰國', {
    crit,
    file: 'src/sengoku/data/timeline.json',
    mapYears,
    events,
    yearMin: Number(/YEAR_MIN\s*=\s*(-?\d+)/.exec(state)?.[1]),
    yearMax: Number(/YEAR_MAX\s*=\s*(-?\d+)/.exec(state)?.[1]),
  })
}

/* ---------- 判定與輸出 ---------- */
const eraFilter = argAfter('--era')
const mdOut = argAfter('--md')
const strict = process.argv.includes('--strict')
function argAfter(flag) {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? process.argv[i + 1] : null
}

let allYears = 0
let allCards = 0
let allGaps = 0
let allUnflagged = 0
let allBound = 0
const lines = []
const queue = []
const md = [
  '# 關鍵事變盤點（audit:critical）',
  '',
  '本報告分兩節：第一節係閘門輸出，由 `node scripts/audit_critical.mjs --md ' +
    'reports/critical-incidents.md` 生成（準則讀自資料，唔寫死年份）；' +
    '第二節係人工整理嘅政治轉折清單，重跑第一節時會原樣保留。',
  '對應閘門：`npm run gates` 嘅 `audit:critical`（warn 級：只擋惡化）。',
  '',
  '## 第一節：地理政權興亡年（本節由 `node scripts/audit_critical.mjs --md` 生成）',
  '',
  '準則讀自資料，唔寫死年份：`ticks`／`keyYears`／`territoryByYear` 換圖年、' +
    'snapshots 相鄰幀嘅政權集合差分（出現／退出）、`factions[].activeFrom`／' +
    '`activeTo`、時代起點 `yearMin`／終點 `yearMax`。',
  '',
  '「界線標記」＝時代終點嗰年，或「政權退出」恰好落喺最後一個換圖年或之後' +
    '（古墳 537、飛鳥 709、奈良 793、明治 2026 呢類）——屬時代界線，唔算缺口；' +
    '呢啲年就算冇卡亦唔計入「有卡」。缺口＝連事件卡都冇而且唔淨係界線原因。' +
    '未標＝有卡但冇一張標咗 `critical: true`。有卡唔代表深度夠，要逐條驗。',
  '',
  '註：`activeFrom` 早於第一個換圖年（平安 平氏 1150，但地圖由 1156 先畫色塊）' +
    '照樣算缺口——嗰一年嘅權力變化確實冇卡；只有時代界線先豁免。' +
    '六個模組嘅事件 interface（周、秦漢、三國、帝制、戰國、日本時代 pack）都已有 ' +
    '`critical?` 欄，故全部槽都計「未標」。',
  '',
]
for (const s of slots) {
  const byYear = new Map()
  for (const e of s.events) {
    if (!byYear.has(e.year)) byYear.set(e.year, [])
    byYear.get(e.year).push(e)
  }
  const rows = []
  for (const [year, reasons] of [...s.crit].sort((a, b) => a[0] - b[0])) {
    if (!Number.isFinite(year)) continue
    if (year < s.yearMin || year > s.yearMax) continue
    const cards = byYear.get(year) || []
    // 界線原因：時代終點嗰年嘅一切原因；落在最後換圖年或之後嘅「政權退出」
    const isBoundary = (r) =>
      year === s.yearMax ||
      (r.startsWith('政權退出') && s.lastMapYear !== null && year >= s.lastMapYear)
    const boundaryOnly = [...reasons].every(isBoundary)
    rows.push({
      year,
      reasons,
      cardCount: cards.length,
      unflagged: cards.length > 0 && !cards.some((c) => c.critical),
      boundaryOnly,
      gap: cards.length === 0 && !boundaryOnly,
      titles: cards.map((c) => c.title),
    })
  }
  const gaps = rows.filter((x) => x.gap)
  const bound = rows.filter((x) => x.boundaryOnly)
  const unflagged = rows.filter((x) => x.unflagged)
  const withCard = rows.filter((x) => x.cardCount > 0)
  allYears += rows.length
  allGaps += gaps.length
  allBound += bound.length
  allUnflagged += unflagged.length
  allCards += withCard.length
  if (eraFilter && !s.name.includes(eraFilter)) continue
  // 待辦佇列：缺口（連事件卡也沒有）排前，未標（有卡但需判斷）其次。
  // 每項附原因與檔案路徑，代理不必自行搜尋目標。
  for (const g of gaps) {
    queue.push({
      kind: '缺口',
      slot: s.name,
      year: g.year,
      why: [...g.reasons].join('、'),
      // 沒有 critical: true，補完卡只是把該年從「缺口」推到「未標」：
      // 總待辦數不動，代理卻會以為已經做完。
      todo: '新增事件卡並設 critical: true（出處要引原典，深度要過 audit:event-depth）',
      file: s.file,
    })
  }
  for (const u of unflagged) {
    queue.push({
      kind: '未標',
      slot: s.name,
      year: u.year,
      why: [...u.reasons].join('、'),
      cards: u.titles.join('；'),
      todo: '判斷是否關鍵事變：是則加 critical: true，否則在 note 寫明理由',
      file: s.file,
    })
  }
  lines.push(
    `${s.name}｜關鍵年 ${rows.length}｜有卡 ${withCard.length}` +
      `｜缺口 ${gaps.length}｜未標 ${unflagged.length}` +
      `｜界線 ${bound.map((x) => x.year).join('、') || '無'}`
  )
  md.push(
    `### ${s.name}｜關鍵年 ${rows.length}，有卡 ${withCard.length}，` +
      `缺口 ${gaps.length}，未標 ${unflagged.length}，界線 ${bound.length}`
  )
  md.push('')
  if (gaps.length) {
    md.push('無事件卡（缺口）：', '')
    for (const g of gaps) md.push(`- **${g.year}** — ${[...g.reasons].join('、')}`)
    md.push('')
  }
  const withCards = rows.filter((x) => !x.gap && !x.boundaryOnly)
  if (withCards.length) {
    md.push('已有卡（深度要逐條驗）：', '')
    for (const g of withCards) {
      md.push(
        `- ${g.year} — ${[...g.reasons].join('、')} → ${g.titles.join('；')}` +
          (g.unflagged && !s.noCriticalField ? '（未標 critical）' : '')
      )
    }
    md.push('')
  }
  if (bound.length) {
    md.push('界線標記（屬時代界線，非缺口）：', '')
    for (const b of bound) md.push(`- ${b.year} — ${[...b.reasons].join('、')}`)
    md.push('')
  }
}
console.log(lines.join('\n'))
if (unresolved.size) {
  console.error(`提示：拆唔到嘅 identifier：${[...unresolved].sort().join('、')}`)
}
console.log(
  `audit:critical — ${slots.length} 槽｜關鍵年 ${allYears}｜有卡 ${allCards}` +
    `｜缺口 ${allGaps}｜未標 ${allUnflagged}｜界線 ${allBound}`
)
if (mdOut) {
  // 第二節（政治轉折年）係人工整理的清單，重跑只換第一節，唔准打爛第二節
  const prev = existsSync(mdOut) ? readFileSync(mdOut, 'utf8') : ''
  const at = prev.indexOf('## 第二節：政治轉折年')
  const tail = at >= 0 ? '\n' + prev.slice(at).trimEnd() + '\n' : ''
  writeFileSync(mdOut, md.join('\n').replace(/\s*$/, '\n') + tail)
  console.log(`寫入 ${mdOut}${tail ? '（已保留第二節）' : ''}`)
}
// --todo N：列出可執行的待辦（缺口先、未標其次），讓代理每輪照辦幾項
if (argAfter('--todo') !== null) {
  const n = Math.max(1, Number(argAfter('--todo')) || 1)
  const start = Math.max(0, Number(argAfter('--start')) || 0)
  const rank = { 缺口: 0, 未標: 1 }
  const items = [...queue].sort(
    (a, b) => rank[a.kind] - rank[b.kind] || a.year - b.year
  )
  const nGap = items.filter((x) => x.kind === '缺口').length
  const slice = items.slice(start, start + n)
  console.log(
    `audit:critical --todo — 待辦 ${items.length}（缺口 ${nGap}｜未標 ${items.length - nGap}）` +
      `｜本次列第 ${start + 1}–${start + slice.length} 項`
  )
  console.log(
    '準則：關鍵事變＝改變時代，或令地圖上的政權出現／消失；時代界線年豁免（見報告第一節）。'
  )
  slice.forEach((it, i) => {
    const cut = (s2, k) => (s2 && s2.length > k ? s2.slice(0, k) + '…' : s2 || '')
    console.log(
      `${start + i + 1}. ${it.kind}｜${it.slot}｜${it.year}｜${cut(it.why, 60)}` +
        (it.cards ? `｜已有卡：${cut(it.cards, 40)}` : '') +
        `｜${it.todo} → ${it.file || '（未記檔案）'}`
    )
  })
  const rest = items.length - slice.length
  if (rest > 0) {
    console.log(
      `尚餘 ${rest} 項未列，下一批用 node scripts/audit_critical.mjs --todo ${n} --start ${start + slice.length}`
    )
  }
  console.log('改完必跑：npm run gates 與 node scripts/agent-selfcheck.mjs --branch')
}
// --cards：傾每張事件卡一行（槽<TAB>年<TAB>標題<TAB>critical），俾第二節對帳用
if (process.argv.includes('--cards')) {
  const rows = []
  for (const s of slots) {
    for (const e of [...s.events].sort((a, b) => a.year - b.year)) {
      rows.push(`${s.name}\t${e.year}\t${e.title}\t${e.critical ? 'critical' : ''}`)
    }
  }
  console.log(rows.join('\n'))
}
if (strict && allGaps > 0) process.exitCode = 1
