#!/usr/bin/env node
/**
 * 史料引文稽核（quote / source audit）。
 *
 *   npm run audit:quotes                        摘要報告
 *   npm run audit:quotes -- --todo              待辦清單（附 qsrc.py 查證指令）
 *   npm run audit:quotes -- --live              逐字對 Wikisource 原文（可加 --mark-verified）
 *   npm run audit:quotes -- --todo --all        連明標意譯／通說的引文都列出
 *   npm run audit:quotes -- --json              機器可讀輸出
 *   npm run audit:quotes -- --stats             只印統計
 *   npm run audit:quotes -- --mark <key> --page <書名/卷N>   記錄已查證
 *
 * 規則取自 AGENTS.md：每條都要 source；出處要正史《》；不用《三國演義》；
 * disputed 要 note；文字用繁體。查證原文用 /tmp/qsrc.py 對 Wikisource。
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(import.meta.url), '..', '..')
const LEDGER_PATH = join(ROOT, 'scripts', 'quote-audit-ledger.json')
const QUOTE_FIELDS = ['classicQuote', 'quote']
const SOURCE_FIELDS = ['classicSource', 'source']

// 非書籍出處的合法標記（出土文獻、意譯、通說）
const ALLOWED_MARKERS = [
  '意譯',
  '通說',
  '甲骨',
  '卜辭',
  '銘文',
  '金文',
  '釋文',
  '出土',
  '利簋',
  '何尊',
  '非逐字',
  '非條約原文',
  '青銅',
  '盤',
  '簋',
  '尊',
  '碑',
  '石刻',
  '簡牘',
  '墓誌',
]

// 常見簡體字（zh-Hant 規則）；只收無歧義的字，免得误報
// 2026-11-08 修正：原本字表誤收「點」（點本身即正字，簡體是「点」），
// 導致每個繁體「點」都被當成簡體字報錯——這是假陽性，曾使地圖 PR 的 CI 變紅
// （audit:quotes.errors 2 → 9，其中 7 條全是「點」）。現改為收「点」，
// 既移除誤報，也補回原先漏掉的那個簡體字。
const SIMPLIFIED =
  /[让们这为与东车马长门问语记讲议谢请诸风龙页顶项国汉刘孙关赵陈绍备权军号历图书败众优应庙彻显写点炼坚击获处迁达遗职联顾献]/

/* ------------------------------------------------------------------ 用法 */

const argv = process.argv.slice(2)
const has = (f) => argv.includes('--' + f)
const opt = (name) => {
  const i = argv.indexOf('--' + name)
  return i >= 0 ? argv[i + 1] : undefined
}
const MODE = has('json') ? 'json' : has('live') ? 'live' : has('todo') ? 'todo' : 'report'
// --rows：照 scripts/legacy/* 的契約輸出 {"rows":[{kind,quote,source,...}]}，
// 令 closest-witness／verifier-teeth／quote-forensics／human-decision-sheet 有得食。
const ROWS_OUT = has('rows')
const ROWS_PATH = join(ROOT, 'reports', 'quotes-audit.json')
const ONLY_STATS = has('stats')
const ALL = has('all')
const MARK_VERIFIED = has('mark-verified')
const MARK = opt('mark')
const PAGE = opt('page')

function usage(code = 0) {
  console.log(
    [
      '用法: node scripts/audit_quotes.mjs [--todo|--json|--stats]',
      '      node scripts/audit_quotes.mjs --mark <entry-key> --page <書名/卷N>',
      '',
      'npm run audit:quotes -- --todo',
    ].join('\n'),
  )
  process.exit(code)
}
if (has('help') || has('h')) usage(0)

/* -------------------------------------------------- 字串遮罩 + 結構掃描 */

// 把字串內容與註解遮成空格（保留換行與長度），令結構掃描不受中文內容干擾。
function maskLiterals(src) {
  const chars = src.split('')
  const blank = (a, b) => {
    for (let k = a; k < b; k++) if (chars[k] !== '\n') chars[k] = ' '
  }
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (c === '/' && src[i + 1] === '/') {
      const end = src.indexOf('\n', i)
      const stop = end < 0 ? src.length : end
      blank(i, stop)
      i = stop
      continue
    }
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2)
      const stop = end < 0 ? src.length : end + 2
      blank(i, stop)
      i = stop
      continue
    }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1
      while (j < src.length) {
        if (src[j] === '\\') {
          j += 2
          continue
        }
        if (src[j] === c) break
        j++
      }
      blank(i + 1, Math.min(j, src.length))
      i = j + 1
      continue
    }
    i++
  }
  return chars.join('')
}

const IDENT = /[A-Za-z_$][A-Za-z0-9_$]*/
const FIELD_RE = /[A-Za-z_$][A-Za-z0-9_$]*(\s*:)?/y
const KEY_BEFORE = /(?:'([^']*)'|"([^"]*)"|([A-Za-z_$][A-Za-z0-9_$]*))\s*:\s*$/

function unquoteKey(m) {
  return m[1] ?? m[2] ?? m[3] ?? null
}

// 由 value 起點讀到值結束（深度 0 的 , ; ) ] }）
function readValue(masked, src, start) {
  let depth = 0
  let i = start
  while (i < masked.length) {
    const c = masked[i]
    if (c === '(' || c === '[' || c === '{') depth++
    else if (c === ')' || c === ']' || c === '}') {
      if (depth === 0) break
      depth--
    } else if (depth === 0 && (c === ',' || c === ';')) break
    i++
  }
  return src.slice(start, i)
}

const JS_ESCAPES = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', 0: '\0' }

// 把 'a' + 'b' 這種字面值拼起來；識別不了就回報 dynamic。
function literalValue(raw) {
  const t = raw.trim()
  if (t === '') return { kind: 'empty', value: '' }
  if (t === 'true' || t === 'false') return { kind: 'bool', value: t === 'true' }
  if (t.includes('${')) return { kind: 'dynamic', value: t }
  let out = ''
  let i = 0
  let sawString = false
  while (i < t.length) {
    const c = t[i]
    if (/\s|\+/.test(c)) {
      i++
      continue
    }
    if (c === "'" || c === '"' || c === '`') {
      let j = i + 1
      let s = ''
      while (j < t.length && t[j] !== c) {
        if (t[j] === '\\') {
          const nx = t[j + 1]
          if (nx === 'u') {
            s += String.fromCharCode(parseInt(t.slice(j + 2, j + 6), 16))
            j += 6
            continue
          }
          s += JS_ESCAPES[nx] ?? nx
          j += 2
          continue
        }
        s += t[j]
        j++
      }
      if (j >= t.length) return { kind: 'dynamic', value: t }
      out += s
      sawString = true
      i = j + 1
      continue
    }
    return { kind: 'dynamic', value: t } // 識別字或運算式
  }
  return sawString ? { kind: 'str', value: out } : { kind: 'dynamic', value: t }
}

/* -------------------------------------------------- TS 條目掃描 */

function scanTs(file, src) {
  const masked = maskLiterals(src)
  const lineOf = (idx) => src.slice(0, idx).split('\n').length
  const objs = [] // {key,line,start,end,fields:Map<name,{raw,kind,value}>}
  const stack = []

  for (let i = 0; i < masked.length; ) {
    const c = masked[i]
    if (c === '{' || c === '[') {
      // key 由原文攞（遮罩會食了字串內容）
      const back = src.slice(Math.max(0, i - 200), i)
      const km = KEY_BEFORE.exec(back)
      const typed =
        /(?:\binterface\s+[A-Za-z_$][\w$]*|\btype\s+[A-Za-z_$][\w$]*\s*=)\s*$/.test(back) ||
        Boolean(stack.length && stack[stack.length - 1].typed)
      stack.push({
        kind: c,
        start: i,
        line: lineOf(i),
        key: km ? unquoteKey(km) : null,
        typed,
        fields: new Map(),
      })
      i++
      continue
    }
    if (c === '}' || c === ']') {
      const top = stack.pop()
      const opener = c === '}' ? '{' : '['
      if (top && top.kind === opener) {
        top.end = i
        if (c === '}' && !top.typed) objs.push(top)
      }
      i++
      continue
    }
    // 欄位名：必須是 identifier 且後面跟冒號
    if (!IDENT.test(masked[i]) || (i > 0 && /[A-Za-z0-9_$]/.test(masked[i - 1]))) {
      i++
      continue
    }
    FIELD_RE.lastIndex = i
    const m = FIELD_RE.exec(masked)
    if (!m || !m[1]) {
      i++
      continue
    }
    const name = m[0].slice(0, m[0].length - m[1].length)
    let vs = FIELD_RE.lastIndex
    while (vs < masked.length && /\s/.test(masked[vs])) vs++
    const raw = readValue(masked, src, vs)
    const ctx = findObj(stack)
    if (ctx && !ctx.fields.has(name)) {
      ctx.fields.set(name, { line: lineOf(i), raw, ...literalValue(raw) })
    }
    i = FIELD_RE.lastIndex
  }
  return objs
    .filter((o) => o.fields.size > 0)
    .map((o) => shape(file, o, src))
    .filter(Boolean)
}

function findObj(stack) {
  for (let i = stack.length - 1; i >= 0; i--) if (stack[i].kind === '{') return stack[i]
  return null
}

function shape(file, o, src) {
  const f = o.fields
  const get = (n) => f.get(n)
  const quoteField = QUOTE_FIELDS.map(get).find(Boolean)
  const sourceField = SOURCE_FIELDS.map(get).find(Boolean)
  if (!quoteField && !sourceField) return null
  const idField = get('id')
  const titleField = get('title')
  const key = o.key ?? idField?.value ?? titleField?.value ?? `#${o.line}`
  const block = src.slice(o.start, o.end + 1)
  return {
    file,
    key,
    line: quoteField?.line ?? sourceField.line,
    title: titleField?.value ?? '',
    quote: quoteField ?? null,
    source: sourceField ?? null,
    disputed: get('disputed')?.value === true,
    note: get('note')?.value ?? '',
    datesNote: get('datesNote')?.value ?? '',
    others: [...f.entries()]
      .filter(
        ([n, v]) =>
          !QUOTE_FIELDS.includes(n) &&
          !SOURCE_FIELDS.includes(n) &&
          !['disputed', 'note', 'paraphrase', 'id', 'title', 'datesNote'].includes(n) &&
          v.kind === 'str',
      )
      .map(([, v]) => v.value)
      .join(' '),
    paraphrase: get('paraphrase') ? get('paraphrase').value === true : null,
    wikisource: wikisourcePages(block),
  }
}

// 由條目本體抽出 Wikisource 頁（furtherReading 已列的原文頁最可靠）
function wikisourcePages(block) {
  const out = []
  const re = /zh\.wikisource\.org\/wiki\/([^"'\s)\\]+)/g
  let m
  while ((m = re.exec(block))) {
    const path = decodeURIComponent(m[1].split('#')[0].split('?')[0])
    if (path && !path.startsWith('Author:') && !out.includes(path)) out.push(path)
  }
  return out
}

/* -------------------------------------------------- JSON 條目掃描 */

function scanJson(file, src) {
  let data
  try {
    data = JSON.parse(src)
  } catch {
    return []
  }
  const out = []
  const walk = (node, key, line) => {
    if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, key ?? `#${i}`))
      return
    }
    if (!node || typeof node !== 'object') return
    const quoteKey = QUOTE_FIELDS.find((k) => node[k] !== undefined)
    const sourceKey = SOURCE_FIELDS.find((k) => node[k] !== undefined)
    if (quoteKey || sourceKey) {
      out.push({
        file,
        key: node.id ?? key ?? '#',
        line: line ?? 1,
        title: node.title ?? '',
        quote: quoteKey ? { kind: 'str', value: String(node[quoteKey]) } : null,
        source: sourceKey ? { kind: 'str', value: String(node[sourceKey]) } : null,
        disputed: node.disputed === true,
        note: node.note ?? '',
        datesNote: node.datesNote ?? '',
        others: Object.entries(node)
          .filter(
            ([k, v]) =>
              typeof v === 'string' &&
              !QUOTE_FIELDS.includes(k) &&
              !SOURCE_FIELDS.includes(k) &&
              !['disputed', 'note', 'paraphrase', 'id', 'title', 'datesNote'].includes(k),
          )
          .map(([, v]) => v)
          .join(' '),
        paraphrase: node.paraphrase === true,
        wikisource: [],
      })
    }
    for (const [k, v] of Object.entries(node)) if (v && typeof v === 'object') walk(v, k)
  }
  walk(data, null, 1)
  return out
}


// 出處解析：埋「卷N」一齊攞，否則會跌了於索引頁
const CITE_RE = /《[^》]+》(?:\s*[卷卷]\s*[0-9〇零一二三四五六七八九十百千兩]+)?/
const CITE_RE_G = /《[^》]+》(?:\s*[卷卷]\s*[0-9〇零一二三四五六七八九十百千兩]+)?/g

/* -------------------------------------------------- 檢查 */

const hash = (s) => {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  return h.toString(16)
}

const text = (v) => (v && v.kind === 'str' ? v.value : v && v.kind === 'dynamic' ? v.value : '')

// 「不採演義」「非演義」此類否定語不算違規，只有真正引用才報
function citesYanyue(s) {
  const re = /演義/g
  let m
  while ((m = re.exec(s))) {
    const back = s.slice(Math.max(0, m.index - 4), m.index)
    if (!/(不|非|無|未|毋|去|棄|摒|剔)[^，。；：\s]{0,3}$/.test(back)) return true
  }
  return false
}

function check(e, all) {
  const issues = []
  const srcText = text(e.source)
  const quoteText = text(e.quote)

  if (e.quote && !e.source) {
    // 閱讀層（readingLayers）本身不寫出處，沿用同目錄同 id 條目（出處最長嗰個）
    const dir = (p) => p.slice(0, p.lastIndexOf('/'))
    const twins = all.filter(
      (x) => x !== e && x.key === e.key && x.source && dir(x.file) === dir(e.file),
    )
    twins.sort((a, b) => text(b.source).length - text(a.source).length)
    const twin = twins[0]
    if (twin) issues.push(['info', '沿用出處', `見 ${relative(ROOT, twin.file)}:${twin.line}`])
    else issues.push(['error', '無出處', '有引文但無 source／classicSource'])
  }
  if (e.source && e.source.kind === 'empty') issues.push(['error', '空出處', 'source 是空字串'])
  if (e.source && e.source.kind === 'dynamic')
    issues.push(['info', '動態出處', '值在執行期組合，需查產生器'])
  if (e.source && e.source.kind === 'str') {
    if (citesYanyue(srcText)) issues.push(['error', '演義出處', 'AGENTS.md 禁止《三國演義》'])
    // 只有引文才要求正史書名；路線、圖例此類 secondary source 不強制《》
    if (e.quote && !/《[^》]+》/.test(srcText) && !ALLOWED_MARKERS.some((m) => srcText.includes(m)))
      issues.push(['error', '引文出處無書名', `source: ${srcText.slice(0, 40)}`])
    if (/意譯|通說/.test(srcText))
      issues.push(['info', '意譯出處', '非逐字原文，查證只需對意思'])
  }
  // disputed 的理由：note 最好，datesNote / 內文有清楚說明都算記錄了
  const HEDGE =
    /不詳|未詳|異說|爭議|異於|約數|推定|敘事|示意|總冊|不宜|失實|追述|不可|估算|前後|無.{0,4}戶籍|沒有|不是/

  if (e.disputed) {
    if (!e.note) {
      if (e.datesNote) issues.push(['info', '以 datesNote 說明', e.datesNote.slice(0, 36)])
      else if (HEDGE.test(e.others || ''))
        issues.push(['warn', '理由散見內文', 'AGENTS.md 希望寫落 note 欄'])
      else issues.push(['error', 'disputed 無 note', 'AGENTS.md 要求說明理由'])
    }
  }
  const bad = [...(quoteText + srcText)].filter((ch) => SIMPLIFIED.test(ch))
  if (bad.length) issues.push(['error', '簡體字', [...new Set(bad)].join('')])
  if (quoteText && quoteText.length < 6 && e.source)
    issues.push(['warn', '引文過短', `只 ${quoteText.length} 字，難以查證`])
  return issues
}

// 找一段夠長、沒標點的文字做查證關鍵字
function needleOf(quote) {
  const parts = String(quote)
    .split(/[^\p{Script=Han}]+/u)
    .filter((s) => s.length >= 4)
    .sort((a, b) => b.length - a.length)
  return parts[0]?.slice(0, 8) ?? ''
}

function verifyCommand(e) {
  const needle = needleOf(text(e.quote))
  if (!needle) return null
  const script = existsSync(join(ROOT, 'scripts', 'qsrc.py')) ? 'scripts/qsrc.py' : '/tmp/qsrc.py'
  const page = e.wikisource[0]
  if (page) return `python3 ${script} ${page} '${needle}'`
  const cite = CITE_RE.exec(text(e.source) || '')
  if (cite) return `python3 ${script} --cite '${cite[0]}' '${needle}'`
  return null
}

/* -------------------------------------------------- 查證紀錄 */

function loadLedger() {
  return existsSync(LEDGER_PATH) ? JSON.parse(readFileSync(LEDGER_PATH, 'utf8')) : {}
}

function stamp(e) {
  return hash(`${text(e.quote)}\u241f${text(e.source)}`)
}

function verifyState(e, ledger) {
  if (!e.quote || e.quote.kind !== 'str') return 'na' // 動態引文無得逐字查證
  if (/意譯|通說/.test(text(e.source))) return 'paraphrase' // 明標意譯，無原文可以逐字對
  const rec = ledger[`${relative(ROOT, e.file)}#${e.key}`]
  if (!rec) return 'unverified'
  if (rec.stamp !== stamp(e)) return 'stale'
  return 'verified'
}

/* -------------------------------------------------- 主流程 */

function collect() {
  const files = []
  const walk = (dir) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      if (ent.name.startsWith('.') || ent.name === 'node_modules') continue
      const p = join(dir, ent.name)
      if (ent.isDirectory()) walk(p)
      else if (/\.(ts|json)$/.test(ent.name)) files.push(p)
    }
  }
  walk(join(ROOT, 'src'))
  const entries = []
  for (const f of files) {
    const src = readFileSync(f, 'utf8')
    if (!/(classicQuote|classicSource|\bsource\b|\bquote\b)/.test(src)) continue
    entries.push(...(f.endsWith('.json') ? scanJson(f, src) : scanTs(f, src)))
  }
  return entries
}

function main() {
  const entries = collect()
  const ledger = loadLedger()

  if (MARK) {
    const hit = entries.find((e) => e.key === MARK)
    if (!hit) {
      console.error(`找不到條目 key：${MARK}`)
      console.error('可用 key：', entries.map((e) => e.key).join(', ').slice(0, 1500))
      process.exit(1)
    }
    ledger[`${relative(ROOT, hit.file)}#${hit.key}`] = {
      stamp: stamp(hit),
      page: PAGE ?? '',
      at: new Date().toISOString().slice(0, 10),
    }
    writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2) + '\n')
    console.log(
      `已記錄查證：${relative(ROOT, hit.file)}:${hit.line} ${hit.key} → ${PAGE ?? '(未填頁碼)'}`,
    )
    return
  }

  const rows = entries.map((e) => ({ e, issues: check(e, entries), state: verifyState(e, ledger) }))
  const byFile = new Map()
  for (const r of rows) {
    const f = relative(ROOT, r.e.file)
    if (!byFile.has(f)) byFile.set(f, [])
    byFile.get(f).push(r)
  }
  const isError = (r) => r.issues.some((i) => i[0] === 'error')
  const isWarn = (r) => r.issues.some((i) => i[0] === 'warn')
  const errors = rows.filter(isError)
  const warns = rows.filter(isWarn)
  const stale = rows.filter((r) => r.state === 'stale')
  const unverified = rows.filter((r) => r.state === 'unverified')
  const withQuote = rows.filter((r) => r.e.quote)

  if (ROWS_OUT) {
    /**
     * kind 对口 scripts/legacy：original（已判原文）／unchecked（未核）／
     * paraphrase（明標意譯通說）／missing（無原文）／modern（近現代，不逐字對）。
     * 判定只用 verifyState 與稽核標籤本身，不在這裡另起一套標準。
     */
    const kindOf = (r) => {
      const tags = r.issues.map((i) => i[1]).join('、')
      // 冇原文的條目先歸 missing（近現代只是其中一個例外原因），
      // 否則全部無引文條目都會被當成「近現代不逐字對」而隱瞞過去。
      if (!r.e.quote) return /近現代/.test(tags) ? 'modern' : 'missing'
      if (/近現代/.test(tags)) return 'modern'
      if (r.state === 'paraphrase') return 'paraphrase'
      if (r.state === 'unverified') return 'unchecked'
      return 'original'
    }
    const out = rows.map((r) => ({
      id: `${relative(ROOT, r.e.file)}#${r.e.key}`,
      file: relative(ROOT, r.e.file),
      line: r.e.line,
      key: r.e.key,
      title: r.e.title ?? '',
      kind: kindOf(r),
      state: r.state,
      quote: text(r.e.quote) ?? '',
      source: text(r.e.source) ?? '',
      pages: r.e.wikisource ?? [],
      disputed: r.e.disputed === true,
      issues: r.issues.map(([sev, tag, why]) => ({ sev, tag, why })),
    }))
    const tally = {}
    for (const r of out) tally[r.kind] = (tally[r.kind] ?? 0) + 1
    mkdirSync(join(ROOT, 'reports'), { recursive: true })
    writeFileSync(
      ROWS_PATH,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          source: 'scripts/audit_quotes.mjs --rows',
          totals: tally,
          rows: out,
        },
        null,
        2,
      ) + '\n',
    )
    console.log(
      `audit:quotes --rows — ${out.length} 筆 → reports/quotes-audit.json（` +
        Object.entries(tally).map(([k, v]) => `${k} ${v}`).join('／') + '）',
    )
    return
  }

  if (MODE === 'live') {
    const script = existsSync(join(ROOT, 'scripts', 'qsrc.py'))
      ? join(ROOT, 'scripts', 'qsrc.py')
      : '/tmp/qsrc.py'
    const targets = rows.filter(
      (r) => r.e.quote?.kind === 'str' && (ALL || r.state === 'unverified' || r.state === 'stale'),
    )
    const items = []
    let homeless = 0
    for (const r of targets) {
      const cites = [...(text(r.e.source) || '').matchAll(CITE_RE_G)].map((m) => m[0])
      const page = r.e.wikisource[0] ?? null
      if (!page && !cites.length) {
        homeless++
        continue
      }
      items.push({
        id: `${relative(ROOT, r.e.file)}#${r.e.key}`,
        page,
        cites,
        quote: text(r.e.quote),
      })
    }
    console.log(`逐字查證 ${items.length} 條引文（Wikisource，快取 /tmp/qsrc-cache）…`)
    const raw = execFileSync('python3', [script, '--verify-batch'], {
      input: JSON.stringify(items),
      maxBuffer: 128 * 1024 * 1024,
    }).toString()
    const res = new Map(JSON.parse(raw).map((x) => [x.id, x]))
    const tally = {}
    let marked = 0
    for (const it of items) {
      const got = res.get(it.id) ?? { status: 'unresolved', why: 'qsrc.py 無回此筆' }
      tally[got.status] = (tally[got.status] ?? 0) + 1
      if (got.status === 'ok') {
        if (MARK_VERIFIED) {
          const r = rows.find((x) => `${relative(ROOT, x.e.file)}#${x.e.key}` === it.id)
          if (r) {
            ledger[it.id] = {
              stamp: stamp(r.e),
              page: got.page ?? '',
              at: new Date().toISOString().slice(0, 10),
            }
            marked++
          }
        }
        continue
      }
      console.log(`\n\u001b[31m✗ ${it.id}\u001b[0m（${got.status}）`)
      if (it.cite) console.log(`   出處: ${it.cite}${got.page ? ` → ${got.page}` : ''}`)
      if (got.why) console.log(`   原因: ${got.why}`)
      if (got.status === 'mismatch') {
        console.log(`   對到 ${got.matched}/${got.chars} 字；此處開始分岔：`)
        console.log(`     我哋寫: ${got.ours}`)
        console.log(`     原文有: ${got.theirs}`)
      } else if (it.quote) {
        console.log(`   引文: ${String(it.quote).replace(/\s+/g, ' ').slice(0, 52)}`)
      }
    }
    if (marked) writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2) + '\n')
    console.log(
      `\n查證結果：對得上 ${tally.ok ?? 0}｜異文／漏字 ${tally.mismatch ?? 0}｜找不到 ${tally.absent ?? 0}｜出處解析不到 ${tally.unresolved ?? 0}` +
        (homeless ? `（另 ${homeless} 條無 Wikisource 頁亦無《》出處）` : '') +
        (MARK_VERIFIED ? `；已自動記錄對了的 ${marked} 條入 ledger` : '；加 --mark-verified 先會記錄對了的'),
    )
    return
  }

  if (MODE === 'json') {
    console.log(
      JSON.stringify(
        rows.map((r) => ({
          file: relative(ROOT, r.e.file),
          line: r.e.line,
          key: r.e.key,
          title: r.e.title,
          state: r.state,
          issues: r.issues,
        })),
        null,
        2,
      ),
    )
    return
  }

  if (MODE === 'todo') {
    let n = 0
    for (const [f, list] of byFile) {
      const items = list.filter(
        (r) =>
          isError(r) ||
          r.state === 'stale' ||
          r.state === 'unverified' ||
          (ALL && r.state === 'paraphrase'),
      )
      if (!items.length) continue
      console.log(`\n\u001b[1m${f}\u001b[0m`)
      for (const r of items) {
        n++
        const tags = [
          ...r.issues.filter((i) => i[0] !== 'info').map((i) => i[1]),
          ...(r.state === 'stale'
            ? ['引文已改，需重查']
            : r.state === 'unverified'
              ? ['未查證']
              : []),
        ]
        console.log(`  ☐ ${r.e.key}（:${r.e.line}） ${tags.join('、')}`)
        const q = text(r.e.quote).replace(/\s+/g, ' ')
        if (q) console.log(`      引文: ${q.slice(0, 64)}`)
        if (text(r.e.source)) console.log(`      出處: ${text(r.e.source)}`)
        const cmd = verifyCommand(r.e)
        if (cmd) console.log(`      查證: ${cmd}`)
      }
    }
    const para = ALL ? 0 : rows.filter((r) => r.state === 'paraphrase').length
    console.log(
      `\n待辦 ${n} 條` +
        (para ? `（另 ${para} 條明標意譯／通說，無原文可以逐字對；要看加 --all）` : '') +
        `。查證後記錄： npm run audit:quotes -- --mark <key> --page <書名/卷N>` +
        `（寫入 ${relative(ROOT, LEDGER_PATH)}）`,
    )
    return
  }

  if (!ONLY_STATS) {
    for (const [f, list] of byFile) {
      const q = list.filter((r) => r.e.quote).length
      const bad = list.filter(isError).length
      const warn = list.filter(isWarn).length
      console.log(
        `${f.padEnd(40)} 條目 ${String(list.length).padStart(3)}  引文 ${String(q).padStart(3)}  錯誤 ${String(bad).padStart(2)}  提醒 ${String(warn).padStart(2)}`,
      )
    }
    console.log('')
    for (const r of errors) {
      console.log(`\u001b[31m✗ ${relative(ROOT, r.e.file)}:${r.e.line} ${r.e.key}\u001b[0m`)
      for (const [sev, tag, why] of r.issues)
        console.log(`   ${sev === 'error' ? '!' : sev === 'warn' ? '~' : ' '} ${tag}：${why}`)
    }
    for (const r of warns.filter((x) => !isError(x)))
      console.log(
        `\u001b[33m~ ${relative(ROOT, r.e.file)}:${r.e.line} ${r.e.key}\u001b[0m ${r.issues.map((i) => i[1]).join('、')}`,
      )
  }

  console.log(
    [
      '',
      `合計：條目 ${rows.length}｜有引文 ${withQuote.length}｜錯誤 ${errors.length}｜提醒 ${warns.length}`,
      `查證狀態：已查證 ${rows.filter((r) => r.state === 'verified').length}｜未查證 ${unverified.length}｜意譯 ${rows.filter((r) => r.state === 'paraphrase').length}｜引文已改 ${stale.length}`,
    ].join('\n'),
  )
}

if (process.argv[1]?.endsWith('audit_quotes.mjs')) main()

// 給測試 script 直接 import
export { scanTs, scanJson, collect, check, maskLiterals, literalValue }

