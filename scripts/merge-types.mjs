#!/usr/bin/env node
// merge-types.mjs — 把 other 工作線較完整的 interface 宣告 union 入 base。
// 只於「C 的欄位集合 ⊇ base」時先替換，否則列出需要人手合併的欄位。
// 用法：node scripts/merge-types.mjs --other <C根目錄> [--max 6]
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const A = process.argv
const f = (n) => { const i = A.indexOf(n); return i >= 0 ? A[i + 1] : null }
const OTHER = f('--other')
const MAX = Number(f('--max') || 6)
if (!OTHER) { console.error('需要 --other <dir>'); process.exit(2) }

function tscErrors() {
  try { execSync('npx tsc -b --pretty false', { stdio: 'pipe' }); return [] }
  catch (e) { return ((e.stdout || '') + (e.stderr || '')).toString().split('\n').filter((l) => /error TS/.test(l)) }
}

function walkTs(root) {
  const out = [], st = [join(root, 'src')]
  while (st.length) {
    const d = st.pop()
    for (const e of readdirSync(d)) {
      const p = join(d, e)
      if (statSync(p).isDirectory()) st.push(p)
      else if (/\.(ts|tsx)$/.test(e)) out.push(p)
    }
  }
  return out
}

function declBlock(src, name) {
  const re = new RegExp('(export )?interface ' + name + '\\s*(extends [^{]+)?\\{', 'm')
  const m = re.exec(src)
  if (!m) return null
  let i = m.index + m[0].length, depth = 1
  while (i < src.length && depth) {
    if (src[i] === '{') depth++
    else if (src[i] === '}') depth--
    i++
  }
  return { start: m.index, end: i, text: src.slice(m.index, i) }
}
const fields = (block) => new Set([...block.matchAll(/^\s{2}([A-Za-z_][\w]*)\??[:<(]/gm)].map((m) => m[1]))

const otherFiles = walkTs(OTHER)
const log = []
for (let round = 1; round <= MAX; round++) {
  const errs = tscErrors()
  const wanted = new Map()
  for (const line of errs) {
    const m = line.match(/^(.+?)\(\d+,\d+\): error TS2353: .*?'([A-Za-z_]\w*)' does not exist in type '([A-Z]\w*)'/)
    if (m) wanted.set(m[3], (wanted.get(m[3]) || new Set()).add(m[2]))
  }
  if (!wanted.size) { console.log(`第 ${round} 輪：無 interface 缺欄錯誤；剩 ${errs.length} 個錯誤`); if (errs.length) console.log(errs.slice(0, 8).join('\n')); break }
  let changed = 0
  for (const [typeName, missingFields] of wanted) {
    const cands = otherFiles.filter((p) => new RegExp('(export )?interface ' + typeName + '(\\s+extends\\s+[^{]+)?\\s*\\{').test(readFileSync(p, 'utf8')))
    if (!cands.length) { log.push(`✗ ${typeName}：other 都無這個 interface（缺欄 ${[...missingFields].join(', ')}）→ 要人手補`); continue }
    let done = false
    for (const cf of cands) {
      const cBlock = declBlock(readFileSync(cf, 'utf8'), typeName)
      if (!cBlock) continue
      const baseFiles = walkTs('.')
      for (const bf of baseFiles) {
        const src = readFileSync(bf, 'utf8')
        const bBlock = declBlock(src, typeName)
        if (!bBlock) continue
        const need = fields(cBlock.text), have = fields(bBlock.text)
        const add = [...need].filter((x) => !have.has(x))
        if (!add.length) continue
        if (![...have].every((x) => need.has(x))) {
          log.push(`△ ${typeName} in ${bf}：C 無 base 全部欄位（缺 ${[...have].filter((x) => !need.has(x)).join(', ')}）→ 只補欄`)
          const insertAt = bBlock.end - 1
          const extra = [...add].map((x) => { const l = cBlock.text.split('\n').find((y) => new RegExp('^\\s{2}' + x + '\\??[:(]').test(y)); return l || `  ${x}?: unknown` })
          writeFileSync(bf, src.slice(0, insertAt) + '\n' + extra.join('\n') + src.slice(insertAt))
          changed++
          break
        }
        writeFileSync(bf, src.slice(0, bBlock.start) + cBlock.text + src.slice(bBlock.end))
        log.push(`✓ ${typeName} in ${bf}：改用 other 較完整宣告（補 ${add.length} 欄）`)
        changed++
        done = true
        break
      }
      if (done) break
    }
    if (!changed) log.push(`✗ ${typeName}：無法自動 union（缺欄 ${[...missingFields].join(', ')}）`)
  }
  console.log(`第 ${round} 輪：處理 ${wanted.size} 個 interface，改 ${changed} 處`)
  if (!changed) break
}
console.log('\n取捨記錄：')
console.log(log.join('\n') || '（無）')
