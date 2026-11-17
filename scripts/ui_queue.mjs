#!/usr/bin/env node
/**
 * ui_queue.mjs — ui 排程 agent 的工作佇列（純靜態掃描，不需要瀏覽器）。
 *
 *   node scripts/ui_queue.mjs            四類各列前 12 項
 *   node scripts/ui_queue.mjs a11y       只列某一類（a11y｜alt｜font｜focus）
 *
 * a11y   只有符號或圖示、沒有 aria-label／title 的 <button>（讀屏軟體只會念「按鈕」）
 * alt    沒有 alt 屬性的 <img>
 * font   CSS 內小於 0.75rem 的 font-size（手機上難讀；0.7rem 以下尤其）
 * focus  樣式表完全沒有 :focus-visible（鍵盤使用者看不到焦點）；只報一行總結
 *
 * 結束碼永遠是 0：本檔只是佇列，不是閘門。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(import.meta.url), '..', '..')
const only = process.argv[2]
const LIMIT = 12

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}
const files = walk(join(ROOT, 'src'))
const tsx = files.filter((f) => f.endsWith('.tsx'))
const css = files.filter((f) => f.endsWith('.css'))

/** 從 `<tag` 起找開標籤結尾：不理會 {} 內與引號內的 `>`（例如箭頭函式 =>）。 */
function openTagEnd(src, from) {
  let depth = 0
  let q = ''
  for (let i = from; i < src.length; i++) {
    const c = src[i]
    if (q) {
      if (c === q && src[i - 1] !== '\\') q = ''
      continue
    }
    if (c === '"' || c === "'" || c === '`') q = c
    else if (c === '{') depth++
    else if (c === '}') depth--
    else if (c === '>' && depth === 0) return i
  }
  return -1
}
const lineOf = (src, i) => src.slice(0, i).split('\n').length

const a11y = []
const alt = []
for (const f of tsx) {
  const src = readFileSync(f, 'utf8')
  const rel = relative(ROOT, f)
  for (const m of src.matchAll(/<button\b/g)) {
    const end = openTagEnd(src, m.index)
    if (end < 0) continue
    const attrs = src.slice(m.index, end)
    if (/aria-label|aria-labelledby|\btitle=/.test(attrs)) continue
    if (src[end - 1] === '/') continue
    const close = src.indexOf('</button>', end)
    if (close < 0) continue
    let inner = src.slice(end + 1, close)
    inner = inner.replace(/\{[^{}]*(\{[^{}]*\}[^{}]*)*\}/g, ' ').replace(/<[^>]*>/g, ' ')
    const hasText = /[A-Za-z0-9\u3040-\u30ff\u4e00-\u9fff]/.test(inner)
    const hasExpr = /\{/.test(src.slice(end + 1, close))
    if (!hasText && !hasExpr) {
      a11y.push(`${rel}:${lineOf(src, m.index)}｜內容「${inner.trim().slice(0, 12) || '(空或僅圖示)'}」`)
    }
  }
  for (const m of src.matchAll(/<img\b/g)) {
    const end = openTagEnd(src, m.index)
    if (end < 0) continue
    if (!/\balt=/.test(src.slice(m.index, end))) {
      alt.push(`${rel}:${lineOf(src, m.index)}`)
    }
  }
}

const font = []
let focusCount = 0
for (const f of css) {
  const src = readFileSync(f, 'utf8')
  const rel = relative(ROOT, f)
  focusCount += (src.match(/:focus-visible/g) || []).length
  src.split('\n').forEach((line, i) => {
    const m = line.match(/font-size:\s*(0?\.\d+)(rem|em)/)
    if (m && Number(m[1]) < 0.75) font.push(`${rel}:${i + 1}｜${line.trim().slice(0, 60)}`)
  })
}

function show(name, title, list) {
  if (only && only !== name) return
  console.log(`\n## ${title}（共 ${list.length}）`)
  for (const l of list.slice(0, LIMIT)) console.log('  ' + l)
  if (list.length > LIMIT) console.log(`  …另有 ${list.length - LIMIT} 項，修完前面再重跑本指令`)
}
show('a11y', '圖示按鈕缺 aria-label', a11y)
show('alt', '<img> 缺 alt', alt)
show('font', 'font-size 小於 0.75rem', font)
if (!only || only === 'focus') {
  console.log(`\n## :focus-visible 規則數：${focusCount}`)
  if (focusCount === 0) {
    console.log('  全站樣式表沒有 :focus-visible；可在 src/index.css 加一條全域規則（見 docs/agents/ui.md）')
  }
}
console.log(
  `\nui_queue — a11y ${a11y.length}｜alt ${alt.length}｜font ${font.length}｜focus-visible ${focusCount}`,
)
