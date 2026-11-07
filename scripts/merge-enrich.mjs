#!/usr/bin/env node
// merge-enrich.mjs — 逐條 entry 比較兩條工作線，只保留較豐富嘅版本，並記錄取捨理由。
// 用法：node scripts/merge-enrich.mjs --base <A根目錄> --other <C根目錄> [--write] [--report <path>]
// 硬閘（AGENTS.md）：含簡體字或以《三國演義》為出處嘅 entry 一律唔准取替。
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync, mkdirSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'

const ARGV = process.argv
const f = (n) => { const i = ARGV.indexOf(n); return i >= 0 ? ARGV[i + 1] : null }
const BASE = f('--base'), OTHER = f('--other'), WRITE = ARGV.includes('--write')
const INSERT = ARGV.includes('--insert-new')
const REPORT = f('--report') || 'docs/ENRICH_MERGE.md'
if (!BASE || !OTHER) { console.error('需要 --base <dir> --other <dir>'); process.exit(2) }

// 只屬簡體、正體不用嘅字（避免收「余、后、里、会、占、干」等正體亦用之字）
const SIMP = new Set('战国发历传汉门马书东长风云军将帅师众敌达运进迁遗议论证设评识语词读误请谢货贸资赋狱级纪纲纳纵纸线练错邻荣营异弃卖桥检档样荐过远显区击称种却离关认灭协岁岂岛归禄祸详录尘尔术杰夺梦实宠审写丧举乐习乡买产亲仅从仓仪们优伤庆库应庙废学宁宪县坛坏坚垦声处备复窦对寻导层属帮弯彻忆态恳恶悬惊惧愿惨惯谨献环现啸单卫厂厉双叙恋悦报帜帧'.split(''))
const FICTION = /三國演義|三国演义/
const ID = /(^|[,{\s])id:\s*'([^']*)'/
const MARKER = /classicQuote|classicSource|causes:|course:|outcome:|zhwikiUrl|layers:|source:/

const cjk = (s) => (String(s).match(/[\u3400-\u9fff]/g) || []).length

// 平衡擷取所有 object literal，跳過字串與註釋內嘅括號
function blocks(src) {
  const res = [], st = []
  let i = 0, mode = null
  const n = src.length
  while (i < n) {
    const c = src[i], d = src[i + 1]
    if (!mode) {
      if (c === '{') st.push(i)
      else if (c === '}') { const s = st.pop(); if (s !== undefined) res.push({ start: s, end: i + 1, text: src.slice(s, i + 1) }) }
      if (c === "'") mode = 'sq'; else if (c === '"') mode = 'dq'; else if (c === '`') mode = 'tpl'
      else if (c === '/' && d === '/') mode = 'line'; else if (c === '/' && d === '*') mode = 'block'
    } else if (mode === 'line') { if (c === '\n') mode = null }
    else if (mode === 'block') { if (c === '*' && d === '/') mode = null }
    else if (mode === 'sq') { if (c === '\\') i++; else if (c === "'") mode = null }
    else if (mode === 'dq') { if (c === '\\') i++; else if (c === '"') mode = null }
    else if (mode === 'tpl') { if (c === '\\') i++; else if (c === '`') mode = null }
    i++
  }
  return res
}

function score(t) {
  let q = 0, s = 0, fo = 0, la = 0, w = 0, dp = 0
  const gates = []
  const qm = t.match(/classicQuote:\s*(?:\n\s*)?(['"])((?:\\.|(?!\1)[\s\S])*?)\1/)
  const isPara = /\bparaphrase:\s*true\b/.test(t) || (qm ? /^\s*意譯/.test(qm[2]) : false)
  if (qm && !isPara) q = 120 + Math.min(120, cjk(qm[2]))
  else if (qm) q = 20
  for (const m of t.matchAll(/(classicSource|outcomeSource|source):\s*(?:\n\s*)?(['"])((?:\\.|(?!\2)[\s\S]*?)\2)/g)) s += 12 + Math.min(40, cjk(m[3]))
  if (/classicSource:/.test(t)) s += 30
  if (/《[^》]{2,}》/.test(t)) s += 25
  for (const k of ['causes:', 'course:', 'keyFigures:', 'outcome:', 'desc:', 'title:']) if (t.includes(k)) fo += 20
  if (/layers:\s*\{/.test(t)) { la = 30; for (const k of ['elementary', 'middle', 'advanced', 'upper']) if (t.includes(k)) la += 12 }
  if (/zhwikiUrl:\s*['"]http/.test(t)) w += 25
  if (/\bdisputed:\s*true\b/.test(t) && /note:\s*['"]/.test(t)) dp += 20
  const pr = cjk(t)
  const gateText = qm ? t.replace(qm[0], '') : t
  const bad = [...gateText].filter((c) => SIMP.has(c))
  if (bad.length) gates.push(`簡體字×${bad.length}（${[...new Set(bad)].slice(0, 5).join('')}）`)
  if (FICTION.test(t)) gates.push('出處含《三國演義》')
  return { total: q + s + fo + la + w + dp + pr, parts: { q, s, fo, la, pr }, gates }
}
function parseFile(p) {
  const src = readFileSync(p, 'utf8')
  const entries = new Map()
  for (const b of blocks(src)) {
    const m = ID.exec(b.text)
    if (!m || !MARKER.test(b.text)) continue
    let inner = false
    for (const e of entries.values()) if (e.start > b.start && e.end < b.end) { inner = true; break }
    if (inner || entries.has(m[2])) continue
    entries.set(m[2], { ...b, ...score(b.text) })
  }
  return { src, entries }
}

function walk(root) {
  const out = [], rootSrc = join(root, 'src')
  if (!existsSync(rootSrc)) return out
  const st = [rootSrc]
  while (st.length) {
    const d = st.pop()
    for (const e of readdirSync(d)) {
      const p = join(d, e)
      if (statSync(p).isDirectory()) st.push(p)
      else if (e.endsWith('.ts') && p.includes('/data/')) out.push(relative(root, p))
    }
  }
  return out.sort()
}

const baseFiles = walk(BASE), otherFiles = new Set(walk(OTHER))
const stat = { identical: 0, took: 0, kept: 0, gated: 0, newIds: 0, newFiles: 0 }
const fileNotes = [], fileLines = []

for (const rel of baseFiles) {
  if (!otherFiles.has(rel)) { fileLines.push(`- 僅 base：\`${rel}\`（保留）`); continue }
  const A = parseFile(join(BASE, rel)), C = parseFile(join(OTHER, rel))
  if (A.src === C.src) { stat.identical++; continue }
  const splices = [], notes = []
  for (const [id, c] of C.entries) {
    const a = A.entries.get(id)
    if (!a) {
      stat.newIds++
      if (!INSERT) { notes.push(`base 缺 id \`${id}\`（只記錄，不自插）`); continue }
      // 跟 other 嘅排列順序：搵出前面最接近、而且 base 都有嘅 entry，插喺佢後面，保持年份排序
      const order = [...C.entries.keys()]
      let prev = null
      for (let k = order.indexOf(id) - 1; k >= 0; k--) { if (A.entries.has(order[k])) { prev = A.entries.get(order[k]); break } }
      const at = prev ? prev.end : [...A.entries.values()][0]?.start ?? 0
      if (!prev) { notes.push(`插入 ${id} 失敗：base 冇同檔 entry 可錨定`); continue }
      const indent = A.src.slice(at - 1, at).startsWith('}') ? '  ' : '  '
      splices.push({ start: at, end: at, text: `,\n${indent}${c.text.replace(/\n/g, '\n').trim()}` })
      notes.push(`插入 base 缺嘅 id \`${id}\`（score ${c.total}）`)
      continue
    }
    if (c.gates.length) { stat.gated++; notes.push(`拒絕 ${id}：${c.gates.join('；')}`); continue }
    if (a.total >= c.total) { stat.kept++; notes.push(`保留 ${id}：base ${a.total} ≥ other ${c.total}`); continue }
    stat.took++
    splices.push({ start: a.start, end: a.end, text: c.text })
    notes.push(`取 other \`${id}\`：${c.total} > ${a.total}（原文 ${c.parts.q}｜出處 ${c.parts.s}｜四段 ${c.parts.fo}｜三層 ${c.parts.la}｜字 ${c.parts.pr}）`)
  }
  splices.sort((x, y) => y.start - x.start)
  if (WRITE && splices.length) {
    let out = A.src
    for (const sp of splices) out = out.slice(0, sp.start) + sp.text + out.slice(sp.end)
    writeFileSync(join(BASE, rel), out)
  }
  if (splices.length || notes.some((n) => n.startsWith('拒絕'))) fileNotes.push({ rel, n: splices.length, notes })
}

for (const rel of otherFiles) {
  if (baseFiles.includes(rel)) continue
  stat.newFiles++
  if (WRITE) { const dest = join(BASE, rel); mkdirSync(dirname(dest), { recursive: true }); writeFileSync(dest, readFileSync(join(OTHER, rel))) }
  fileLines.push(`- 僅 other：\`${rel}\`${WRITE ? '（已加入）' : '（待加入）'}`)
}

const L = []
L.push('# 兩條工作線內容合併報告（逐條豐富度取捨）', '')
L.push(`- base：\`${BASE}\``, `- other：\`${OTHER}\``, `- 模式：${WRITE ? '已寫入' : '試算（dry-run）'}`, '')
L.push('## 摘要')
L.push(`- 兩邊完全相同嘅資料檔：${stat.identical}`)
L.push(`- 逐條取 other（較豐富）：${stat.took}`)
L.push(`- 逐條保留 base：${stat.kept}`)
L.push(`- 硬閘拒絕（簡體字／演義出處）：${stat.gated}`)
L.push(`- base 缺、未自動插入嘅 id：${stat.newIds}`)
L.push(`- 只在 other 出現嘅新檔：${stat.newFiles}`, '')
if (fileLines.length) L.push('## 檔案層面', ...fileLines, '')
L.push('## 逐檔取捨')
for (const x of fileNotes) { L.push(`### \`${x.rel}\`（換入 ${x.n} 條）`, ...x.notes, '') }
writeFileSync(REPORT, L.join('\n'))
console.log(`相同檔 ${stat.identical}｜換入 ${stat.took}｜保留 base ${stat.kept}｜硬閘拒絕 ${stat.gated}｜base 缺 id ${stat.newIds}｜新檔 ${stat.newFiles}`)
console.log(`報告：${REPORT}`)

