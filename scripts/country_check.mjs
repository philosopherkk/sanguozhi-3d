#!/usr/bin/env node
// Fast single-pack checker for country era packs (korea/thailand/vietnam/malaysia).
// Node built-ins only. Runs in well under a second and prints <= 15 lines.
// usage: node scripts/country_check.mjs <path-to-pack.ts>
import { readFileSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(new URL('.', import.meta.url))
const target = process.argv[2]
if (!target) {
  console.log('usage: node scripts/country_check.mjs <pack.ts>')
  process.exit(2)
}
const abs = resolve(target)
if (!existsSync(abs)) {
  console.log(`country_check  ${target}\n✗ no such file`)
  process.exit(2)
}
const src = readFileSync(abs, 'utf8')
const name = target.split('/').pop()

// --- index helpers -----------------------------------------------------------
const lineStarts = [0]
for (let i = 0; i < src.length; i++) if (src[i] === '\n') lineStarts.push(i + 1)
function lineAt(idx) {
  let lo = 0
  let hi = lineStarts.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (lineStarts[mid] <= idx) lo = mid
    else hi = mid - 1
  }
  return lo + 1
}
const nonWs = (s) => s.replace(/\s+/g, '').length
const stripped = (s) => s.replace(/\s+/g, '')

// --- string/template aware scanners -----------------------------------------
// readLiteral: given index at a quote char, return { content, end } past close.
function readLiteral(i) {
  const q = src[i]
  let j = i + 1
  let out = ''
  if (q === '`') {
    while (j < src.length) {
      const c = src[j]
      if (c === '\\') {
        out += 'x'
        j += 2
        continue
      }
      if (c === '`') return { content: out, end: j + 1 }
      if (c === '$' && src[j + 1] === '{') {
        let depth = 1
        j += 2
        while (j < src.length && depth > 0) {
          if (src[j] === '{') depth++
          else if (src[j] === '}') depth--
          j++
        }
        out += 'x'
        continue
      }
      out += c
      j++
    }
    return { content: out, end: j }
  }
  while (j < src.length) {
    const c = src[j]
    if (c === '\\') {
      out += 'x'
      j += 2
      continue
    }
    if (c === q) return { content: out, end: j + 1 }
    out += c
    j++
  }
  return { content: out, end: j }
}
// skipWs: skip whitespace and // and /* */ comments.
function skipWs(i) {
  while (i < src.length) {
    const c = src[i]
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      i++
      continue
    }
    if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++
      continue
    }
    if (c === '/' && src[i + 1] === '*') {
      const e = src.indexOf('*/', i + 2)
      i = e < 0 ? src.length : e + 2
      continue
    }
    break
  }
  return i
}
// readValue: from just after `key:`, join one or more string/template literals
// joined by `+`. Type annotations (`key: string`) yield hasLiteral=false -> skip.
// `concat` is true when the value is a `'…' + '…'` chain (2+ literals).
function readValue(i) {
  let pos = skipWs(i)
  const parts = []
  let hasLiteral = false
  while (pos < src.length) {
    const c = src[pos]
    if (c === '`' || c === "'" || c === '"') {
      const r = readLiteral(pos)
      parts.push(r.content)
      hasLiteral = true
      pos = skipWs(r.end)
    } else if (c === '+') {
      pos = skipWs(pos + 1)
    } else break
  }
  return { text: parts.join(''), hasLiteral, end: pos, concat: parts.length > 1 }
}
// matchBracket: src[from] is '[' or '{'; return index of matching close or -1.
function matchBracket(from) {
  const open = src[from]
  const close = open === '[' ? ']' : open === '{' ? '}' : ')'
  let depth = 0
  let i = from
  while (i < src.length) {
    const c = src[i]
    if (c === "'" || c === '"' || c === '`') {
      i = readLiteral(i).end
      continue
    }
    if (c === '/' && (src[i + 1] === '/' || src[i + 1] === '*')) {
      i = skipWs(i)
      continue
    }
    if (c === open) depth++
    else if (c === close) {
      depth--
      if (depth === 0) return i
    }
    i++
  }
  return -1
}
// bodyOf: run regex, then locate the bracket it opens ('auto' = last char of
// match already IS the bracket; otherwise skip to next non-ws char == opener).
// Returns the inner text of the matched [..]/{..} block, or null.
function bodyOf(reKey, opener) {
  const m = reKey.exec(src)
  if (!m) return null
  let start
  if (opener === 'auto') start = m.index + m[0].length - 1
  else {
    const p = skipWs(m.index + m[0].length)
    if (src[p] !== opener) return null
    start = p
  }
  const end = matchBracket(start)
  if (end < 0) return null
  return src.slice(start, end + 1)
}
function collectField(key) {
  const res = []
  const re = new RegExp('(?:^|[\\s{,])' + key + '\\s*:', 'g')
  let m
  while ((m = re.exec(src))) {
    const colon = m.index + m[0].length - 1
    const v = readValue(colon + 1)
    if (!v.hasLiteral) continue
    res.push({ line: lineAt(colon), text: v.text, len: nonWs(v.text), concat: v.concat })
  }
  return res
}
function yearsIn(body) {
  const ys = new Set()
  if (!body) return ys
  for (const m of body.matchAll(/year:\s*(-?\d+)/g)) ys.add(Number(m[1]))
  return ys
}

// --- contrast ----------------------------------------------------------------
function contrastOnPanel(hex) {
  let h = hex.slice(1)
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const fg = [0, 2, 4].map((k) => parseInt(h.slice(k, k + 2), 16))
  const bg = [0xfe, 0xfb, 0xf4]
  const lum = (rgb) => {
    const a = rgb.map((v) => {
      const s = v / 255
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]
  }
  const l1 = lum(fg)
  const l2 = lum(bg)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

const problems = []
const ok = []

// --- 0) concat fast-fail ------------------------------------------------------
// audit_event_depth.mjs and audit_reading_layers.mjs only read the FIRST string
// literal of a `'…' + '…'` chain, so a concatenated field silently reads as too
// short (缺口 / 分層不合格). These six fields must be ONE unbroken literal;
// reject concatenation here immediately, with the same field-detection regex.
const concatFails = []
for (const key of ['causes', 'course', 'outcome', 'elementary', 'secondary', 'university']) {
  for (const f of collectField(key)) if (f.concat) concatFails.push(`${key}@L${f.line}`)
}
if (concatFails.length > 0) {
  console.log(
    `country_check  ${name}\n\u2717 concat  (${concatFails.length}) causes/course/outcome/elementary/secondary/university must be a single '…' literal, no '…' + '…': ${concatFails.slice(0, 4).join(', ')}${concatFails.length > 4 ? ', …' : ''}`,
  )
  console.log('FAIL')
  process.exit(1)
}
ok.push('concat  single-literal')

// --- 1) chars via audit-chars.ts --------------------------------------------
const audit = spawnSync(
  process.execPath,
  ['--experimental-strip-types', join(here, 'audit-chars.ts'), abs],
  { encoding: 'utf8' },
)
const charsOut = (audit.stdout || '') + (audit.stderr || '')
const hardLines = charsOut.split('\n').filter((l) => l.startsWith('HARD '))
if (hardLines.length === 0) ok.push('chars  HARD=0')
else
  problems.push({
    cat: 'chars',
    detail: hardLines.slice(0, 2).map((l) => l.replace(/^HARD /, '').slice(0, 60)),
    n: hardLines.length,
  })

// --- 2) contrast -------------------------------------------------------------
let colorCount = 0
const colorFails = []
for (const m of src.matchAll(/color:\s*(["'])(#[0-9a-fA-F]{3,6})\1/g)) {
  colorCount++
  const ratio = contrastOnPanel(m[2])
  if (ratio < 3.0) colorFails.push(`${m[2]}@L${lineAt(m.index)}=${ratio.toFixed(2)}`)
}
if (colorFails.length === 0) ok.push(`contrast  ${colorCount} colors >=3.0`)
else problems.push({ cat: 'contrast', detail: colorFails, n: colorFails.length })

// --- 3) depth (causes/course/outcome) ---------------------------------------
const dThr = { causes: 200, course: 200, outcome: 400 }
let depthCount = 0
const depthFails = []
for (const key of ['causes', 'course', 'outcome']) {
  for (const f of collectField(key)) {
    depthCount++
    if (f.len < dThr[key]) depthFails.push(`${key}@L${f.line}=${f.len}<${dThr[key]}`)
  }
}
if (depthFails.length === 0) ok.push(`depth  ${depthCount} fields`)
else problems.push({ cat: 'depth', detail: depthFails, n: depthFails.length })

// --- 4) readings triples -----------------------------------------------------
const elem = collectField('elementary')
const sec = collectField('secondary')
const uni = collectField('university')
const readFails = []
const triples = Math.max(elem.length, sec.length, uni.length)
if (elem.length !== sec.length || elem.length !== uni.length)
  readFails.push(`layer-count elem=${elem.length} sec=${sec.length} uni=${uni.length}`)
for (let i = 0; i < triples; i++) {
  const e = elem[i]
  const s = sec[i]
  const u = uni[i]
  if (!e || !s || !u) {
    readFails.push(`incomplete triple #${i + 1}`)
    continue
  }
  const se = stripped(e.text)
  const ss = stripped(s.text)
  const su = stripped(u.text)
  if (s.len < 1.5 * e.len) readFails.push(`sec@L${s.line}=${s.len}<${(1.5 * e.len).toFixed(0)}`)
  if (u.len < 3.0 * e.len) readFails.push(`uni@L${u.line}=${u.len}<${(3.0 * e.len).toFixed(0)}`)
  if (se === ss || ss === su || se === su) readFails.push(`dup triple@L${e.line}`)
}
if (readFails.length === 0) ok.push(`readings  ${elem.length} triple(s)`)
else problems.push({ cat: 'readings', detail: readFails, n: readFails.length })

// --- 5) wiring: route years vs event years; territory ids vs domain ids ------
const wireFails = []
const routeYears = new Set([
  ...yearsIn(bodyOf(/\bconst\s+routes\b[^=]*=\s*\[/, 'auto')),
  ...yearsIn(bodyOf(/\broutes\s*:\s*\[/, 'auto')),
])
const eventYears = new Set([
  ...yearsIn(bodyOf(/\bconst\s+events\b[^=]*=\s*\[/, 'auto')),
  ...yearsIn(bodyOf(/\bevents\s*:\s*\[/, 'auto')),
])
if (routeYears.size && eventYears.size) {
  for (const y of routeYears) if (!eventYears.has(y)) wireFails.push(`route-year-no-event ${y}`)
}
// territory domain keys (literal ids only) must exist in domains ids
const domainsBody = bodyOf(/\bdomains\s*:/, '[')
const domainIds = new Set()
if (domainsBody) for (const m of domainsBody.matchAll(/id:\s*["']([^"']+)["']/g)) domainIds.add(m[1])
const terrBody = bodyOf(/\bterritoryByYear\s*:\s*\{/, 'auto')
const terrKeys = new Set()
if (terrBody) {
  for (const m of terrBody.matchAll(/\[\s*["']([^"']+)["']\s*,/g)) terrKeys.add(m[1])
  for (const m of terrBody.matchAll(/["']([^"']+)["']\s*:/g)) terrKeys.add(m[1])
}
if (domainIds.size && terrKeys.size) {
  for (const k of terrKeys) if (!domainIds.has(k)) wireFails.push(`territory-id-off-list ${k}`)
}
if (wireFails.length === 0) {
  const dnote = domainIds.size ? '' : ' (domains imported)'
  ok.push(`wiring  routes+domains${dnote}`)
} else problems.push({ cat: 'wiring', detail: wireFails, n: wireFails.length })

// --- 6) era id must be lowercase letters only --------------------------------
const eraM = src.match(/:\s*\w*Pack\w*\s*=\s*\{[\s\S]*?\bid:\s*(['"])([^'"]+)\1/)
const eraId = eraM ? eraM[2] : null
if (eraId === null) ok.push('era-id  n/a')
else if (/^[a-z]+$/.test(eraId)) ok.push(`era-id  ${eraId}`)
else problems.push({ cat: 'era-id', detail: [`"${eraId}" not [a-z]+`], n: 1 })

// --- print (<= 15 lines) -----------------------------------------------------
console.log(`country_check  ${name}`)
for (const o of ok) console.log(`\u2713 ${o}`)
for (const p of problems)
  console.log(`\u2717 ${p.cat}  (${p.n}) ${p.detail.slice(0, 4).join(', ')}`)
const fail = problems.length > 0
console.log(fail ? 'FAIL' : 'PASS')
process.exit(fail ? 1 : 0)
