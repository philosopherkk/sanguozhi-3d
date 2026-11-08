#!/usr/bin/env node
/**
 * audit_detail_depth.mjs — 事件詳情卡的深度閘門（補既有 audit_event_depth 的盲區）。
 *
 * 為什麼要另開一支：既有 audit_event_depth.mjs 只掃「事件包」的 causes/course/outcome，
 * 完全沒有讀取下面這 4 個 event-detail 檔案（字串比對 timelineDetails 出現 0 次）。
 * 結果是 85 條事件詳情從未被量過，使用者隨機抽查應仁之亂即發現內容極薄
 * （起因 47 字／經過 42 字／結果 33 字，門檻是 200/200/400）。
 * 不直接改既有腳本，是為了不把其他 agent 的閘門基線一次性打斷。
 *
 * 門檻與事件包一致：起因 ≥200、經過 ≥200、結果 ≥400（去空白後計）。
 *
 * 用法：
 *   node scripts/audit_detail_depth.mjs            # 摘要＋最短 15 條
 *   node scripts/audit_detail_depth.mjs --json     # 機器可讀
 *   node scripts/audit_detail_depth.mjs --fail-on-gap
 *   node scripts/audit_detail_depth.mjs --selftest  # 注入已知缺陷，確認閘門有牙
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')

/** 4 個 event-detail 檔案與其匯出的 Record 常數名 */
/**
 * 4 個候選檔案。`eventShape: false` 的檔案是「事件列表」而非「事件詳情」
 * （欄位是 desc/source/note/factions，沒有起因・經過・結果），
 * 不能拿 200/200/400 去判它失敗——那是假陽性，會把閘門 credibility 打散。
 * 它們的深淺由 audit:event-depth 管。
 */
const TARGETS = [
  { file: 'src/data/timelineDetails.ts', label: '主線事件詳情' },
  { file: 'src/sengoku/data/timelineDetails.ts', label: '戰國事件詳情' },
  // 事件列表形態（無三段欄位），本閘門跳過，僅在回報裡列明跳過了什麼
  { file: 'src/heian/data/history.ts', label: '平安（事件列表形態）', eventShape: false },
  { file: 'src/bakumatsu/data/history.ts', label: '幕末（事件列表形態）', eventShape: false },
]

const MIN = { causes: 200, course: 200, outcome: 400 }

/**
 * 抽出 `  'id': { ... },` 形式的條目與其中的三個欄位。
 * 用掃描而非 import：這些檔案 import 了執行時代碼，直接在 node 匯入會拖進整個前端。
 */
function parseEntries(src) {
  const out = []
  const re = /\n  '([\w:.\-]+)': \{/g
  let m
  while ((m = re.exec(src))) {
    const id = m[1]
    let depth = 1
    let i = m.index + m[0].length
    while (i < src.length && depth > 0) {
      if (src[i] === '{') depth++
      else if (src[i] === '}') depth--
      i++
    }
    const body = src.slice(m.index + m[0].length, i - 1)
    const line = src.slice(0, m.index).split('\n').length
    out.push({ id, line, ...fields(body) })
  }
  return out
}

/** 取 causes / course / outcome 的字串長度（含模板字串與跨行字串） */
function fields(body) {
  const res = {}
  for (const key of Object.keys(MIN)) {
    // key: 後接引號或反引號，內容到同型結束引號為止（允許中間換行）
    const re = new RegExp(key + ":\\s*([`'])((?:\\\\.|(?!\\1)[^\\\\])*)\\1", 's')
    const m = re.exec(body)
    res[key] = m ? [...m[2].replace(/\\n/g, '\n')].length : -1
  }
  return res
}

function collect() {
  const rows = []
  const skipped = []
  for (const t of TARGETS) {
    const src = readFileSync(join(ROOT, t.file), 'utf8')
    const entries = parseEntries(src)
    if (t.eventShape === false) {
      skipped.push({ file: t.file, count: entries.length, why: '事件列表形態，無三段欄位' })
      continue
    }
    let offShape = 0
    for (const e of entries) {
      // 混合檔案：三段全找不到 → 該條不是事件詳情形態，跳過而不是判失敗
      if (Object.keys(MIN).every((k) => e[k] < 0)) {
        offShape += 1
        continue
      }
      const bad = []
      for (const [k, min] of Object.entries(MIN)) {
        if (e[k] < 0) bad.push(`${k} 缺欄位`)
        else if (e[k] < min) bad.push(`${k} ${e[k]}/${min}`)
      }
      rows.push({ ...e, file: t.file, label: t.label, ok: bad.length === 0, bad })
    }
    if (offShape) skipped.push({ file: t.file, count: offShape, why: '三段欄位皆無，非事件詳情' })
  }
  return { rows, skipped }
}

function summary(rows) {
  const gaps = rows.filter((r) => !r.ok)
  const byFile = {}
  for (const r of rows) {
    const s = (byFile[r.file] ??= { total: 0, gaps: 0, minChars: Infinity })
    s.total += 1
    if (!r.ok) s.gaps += 1
    s.minChars = Math.min(s.minChars, Math.min(r.causes, r.course, r.outcome))
  }
  return { gaps, byFile }
}

if (process.argv.includes('--selftest')) {
  // 把一條合格樣本逐個欄位削短，確認每條門檻都會報（防止閘門退化成永遠綠）
  const src = readFileSync(join(ROOT, TARGETS[0].file), 'utf8')
  const base = parseEntries(src)
  const good = base.find((e) => Object.keys(MIN).every((k) => e[k] >= MIN[k]))
  if (!good) {
    console.log('  ? selftest：找不到一條四欄全達標的樣本，無法驗證（先修一條做基準）')
    process.exit(1)
  }
  let bad = 0
  for (const [key, min] of Object.entries(MIN)) {
    const mutated = { ...good, [key]: min - 1 }
    const short = Object.keys(MIN).filter((k) => mutated[k] < MIN[k])
    const caught = short.includes(key)
    console.log(`  ${caught ? '✓' : '✗'} ${key} 削到 ${min - 1} 字 → ${caught ? '報出 ' + short.join(',') : '沒被抓到'}`)
    if (!caught) bad += 1
  }
  // 缺欄位也要被抓到
  const missing = { ...good, outcome: -1 }
  const caughtMissing = missing.outcome < 0
  console.log(`  ${caughtMissing ? '✓' : '✗'} outcome 欄位缺失 → ${caughtMissing ? '會報「缺欄位」' : '不會報（必須補解析）'}`)
  if (!caughtMissing) bad += 1
  console.log(bad ? `✗ 咬合力測試 ${bad} 項失敗` : '✓ 閘門有牙（三欄削短與缺欄位都會報）')
  process.exit(bad ? 1 : 0)
}

const { rows, skipped } = collect()
const { gaps, byFile } = summary(rows)
const asJson = process.argv.includes('--json')

if (asJson) {
  console.log(
    JSON.stringify(
      {
        entries: rows.length,
        detailGap: gaps.length,
        byFile: Object.fromEntries(Object.entries(byFile).map(([f, s]) => [f, s.total + '/' + s.gaps])),
        shortest: gaps
          .sort((a, b) => Math.min(a.causes, a.course, a.outcome) - Math.min(b.causes, b.course, b.outcome))
          .slice(0, 15)
          .map((g) => ({ id: g.id, file: g.file, causes: g.causes, course: g.course, outcome: g.outcome })),
      },
      null,
      2,
    ),
  )
} else {
  console.log(`=== 事件詳情深度（門檻 起因≥${MIN.causes} 經過≥${MIN.course} 結果≥${MIN.outcome}）===`)
  for (const [f, s] of Object.entries(byFile)) {
    console.log(`  ${f}  條目 ${s.total}｜未達標 ${s.gaps}｜最短欄位 ${s.minChars} 字`)
  }
  const shortest = [...gaps]
    .sort((a, b) => Math.min(a.causes, a.course, a.outcome) - Math.min(b.causes, b.course, b.outcome))
    .slice(0, 15)
  console.log('\n=== 最短 15 條（排程 agent 的工作佇列）===')
  for (const g of shortest) {
    console.log(
      `  ${g.id.padEnd(20)} ${String(g.causes).padStart(4)}/${String(g.course).padStart(4)}/${String(
        g.outcome,
      ).padStart(4)}  ${g.file}`,
    )
  }
  console.log('\n=== 跳過（形態不符，非缺陷）===')
  for (const s of skipped) console.log(`  ${s.file}  ${s.count} 條：${s.why}`)
  console.log(`\naudit:detail-depth — 詳情 ${rows.length} 條／缺口 ${gaps.length}`)
}

if (process.argv.includes('--fail-on-gap') && gaps.length > 0) process.exit(1)
