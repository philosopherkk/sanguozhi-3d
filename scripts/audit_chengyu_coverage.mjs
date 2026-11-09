#!/usr/bin/env node
/**
 * audit_chengyu_coverage.mjs — 成語「覆蓋率」閘門。
 *
 * 為什麼要新增（使用者回饋 2026-11-09）：「成語 enrichment is still poor」。
 * 既有 audit:chengyu 檢查逐條格式與出處有無（現況 fail 0），
 * 但 47 條要覆蓋夏→當代加日本全時代，覆蓋率根本不夠，卻一直顯示「fail 0」。
 * 格式合格不等於够用，這裡只量覆蓋面。
 *
 * 指標：
 *   missingCentury  完全沒有成語的世紀（按能定年的條目計）
 *   thinCentury     有但少於 TARGET_PER_CENTURY 條的世紀
 *   noEventLink     eraLink 未接到 event 的條目數（年/人連結無法在地圖年表顯示成語卡）
 *
 * 用法：node scripts/audit_chengyu_coverage.mjs [--json] [--selftest]
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const TARGET_PER_CENTURY = 3

/** 世紀分桶：公元後用 200 表示 200s；公元前 -770 → -700（即前 700s 桶）。 */
function centuryOf(y) {
  const a = Math.floor(Math.abs(y) / 100) * 100
  return y < 0 ? -a : a
}

const raw = JSON.parse(readFileSync(join(ROOT, 'src/chengyu/data/idioms.json'), 'utf8'))
const items = Array.isArray(raw) ? raw : (raw.idioms ?? Object.values(raw))

const century = {}
let noEvent = 0
let undateable = 0
for (const it of items) {
  const link = it.eraLink || {}
  if (link.kind !== 'event') noEvent += 1
  let y = null
  if (link.kind === 'year' && typeof link.year === 'number') y = link.year
  else if (typeof link.year === 'number') y = link.year
  if (y == null) {
    undateable += 1
    continue
  }
  const c = centuryOf(y)
  century[c] = (century[c] || 0) + 1
}

// 中國史主要世紀：前 8 世紀 → 20 世紀（與本專案時代範圍對應）
const SCOPE = []
for (let c = -700; c <= 2000; c += 100) SCOPE.push(c)

const missing = SCOPE.filter((c) => !century[c])
const thin = SCOPE.filter((c) => century[c] && century[c] < TARGET_PER_CENTURY)

if (process.argv.includes('--selftest')) {
  const probe = (name, data, want) => {
    const r = evaluate(data)
    const ok = r.missing > 0
    console.log(`  ${ok === want ? '✓' : '✗'} ${name} → missingCentury=${r.missing}（期望${want ? '有缺口' : '無缺口'}）`)
    return ok === want
  }
  let bad = 0
  if (!probe('只有 1 個世紀有資料', [{ eraLink: { kind: 'year', year: 200 } }], true)) bad++
  if (!probe('每世紀都填滿則無缺口', (() => { const a = []; for (let c = -700; c <= 2000; c += 100) for (let i = 0; i < 3; i++) a.push({ eraLink: { kind: 'year', year: c + (c < 0 ? -50 : 50) } }); return a })(), false)) bad++
  console.log(bad ? `✗ selftest ${bad} 項失敗` : '✓ 覆蓋偵測有牙')
  process.exit(bad ? 1 : 0)
}

function evaluate(list) {
  const cent = {}
  for (const it of list) {
    const y = (it.eraLink || {}).year
    if (typeof y !== 'number') continue
    const c = centuryOf(y)
    cent[c] = (cent[c] || 0) + 1
  }
  return {
    missing: SCOPE.filter((c) => !cent[c]).length,
    thin: SCOPE.filter((c) => cent[c] && cent[c] < TARGET_PER_CENTURY).length,
  }
}

const out = {
  total: items.length,
  missingCentury: missing.length,
  thinCentury: thin.length,
  noEventLink: noEvent,
  undateable,
  missingList: missing,
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(out, null, 2))
} else {
  console.log('=== 成語覆蓋率（audit:chengyu 的 fail 0 掩住的部分）===')
  console.log(`  條目 ${items.length}｜目標：每個世紀至少 ${TARGET_PER_CENTURY} 條`)
  console.log(`  完全空白世紀 ${missing.length}｜不足 ${TARGET_PER_CENTURY} 條嘅世紀 ${thin.length}`)
  console.log(`  未能定年嘅條目 ${undateable}｜eraLink 未接 event 者 ${noEvent}（呢啲無法喺年表顯示成語卡）`)
  console.log(`  空白世紀：${missing.map((c) => (c < 0 ? `前${-c}` : c) + 's').join(' ')}`)
  console.log(`\naudit:chengyu-coverage — 空白世紀 ${missing.length}｜薄弱世紀 ${thin.length}｜無 event 連結 ${noEvent}`)
}
