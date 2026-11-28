#!/usr/bin/env node
/**
 * portrait_credits.mjs — 產生／驗證站上署名清單 `public/portraits/credits.json`。
 *
 * 為什麼要有：CC BY／CC BY-SA 的條件是「署名」。圖只 40px 圓形，
 * 圖片旁塞不下作者與連結，所以站上一律指向這份清單；
 * 清單由 manifest 產生，避免手抄漏一筆就變成「用了人家的圖卻冇署名」。
 *
 * 用法：
 *   node scripts/portrait_credits.mjs              # 依 manifest 重寫清單
 *   node scripts/portrait_credits.mjs --check      # 唯讀斷言：清單與 manifest 是否一致
 *   node scripts/portrait_credits.mjs --list       # 印出應署名的條目（給交辦用）
 *   node scripts/portrait_credits.mjs --selftest   # 授權判定的成對探針（含 Python 口徑對照）
 *
 * 驗收一律用 `--check`：缺筆、過時（作者或連結被改）、多筆幽靈條目都要 exit 1。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { attributionOk, licenseCheck } from './portrait_license.mjs'

const ROOT = join(import.meta.dirname, '..')
const MANIFEST = join(ROOT, 'public', 'portraits', 'manifest.json')
const CREDITS = join(ROOT, 'public', 'portraits', 'credits.json')
const PY = join(ROOT, 'scripts', 'portrait_pd_inventory.py')

/** manifest → 應署名清單（只有 BY 系列要署名；PD／CC0／內部生成不需要）。 */
function required() {
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
  const out = []
  const bad = []
  for (const row of manifest.portraits ?? []) {
    const verdict = licenseCheck(row.license)
    if (!verdict.ok || !verdict.requiresAttribution) continue
    const item = {
      era: row.era,
      id: row.id,
      name: row.name,
      file: row.file,
      license: String(row.license).trim(),
      attribution: String(row.attribution ?? '').trim(),
    }
    if (!attributionOk(item.attribution)) {
      bad.push(`${row.era}:${row.id} — ${row.license} 缺署名（要有作者與來源網址）`)
    }
    out.push(item)
  }
  return { items: out, bad }
}

function render(items) {
  return (
    JSON.stringify(
      {
        note: '本檔由 scripts/portrait_credits.mjs 依 public/portraits/manifest.json 產生，勿手改。凡 CC BY／CC BY-SA 頭像都要在此出現一次。',
        count: items.length,
        credits: items,
      },
      null,
      2,
    ) + '\n'
  )
}

/** 讀現有清單。回傳 `{ items, count }`；檔不存在回傳 null。 */
function readExisting() {
  if (!existsSync(CREDITS)) return null
  let data
  try {
    data = JSON.parse(readFileSync(CREDITS, 'utf8'))
  } catch (err) {
    return { error: `JSON 解析失敗：${err.message}` }
  }
  if (Array.isArray(data)) {
    // 舊形態（整份是陣列、沒有 count）：照樣判內容，但不認 count
    return { items: data, count: null }
  }
  return { items: data.credits ?? [], count: data.count }
}

const { items, bad } = required()

if (process.argv.includes('--selftest')) {
  // 授權判定的成對探針：該放的要放、該擋的要擋，兩邊都測，防止日後被人改弱。
  const probes = [
    ['Public domain', 'ok'],
    ['PD-old', 'ok'],
    ['CC0', 'ok'],
    ['內部生成', 'ok'],
    ['CC BY 3.0', 'by'],
    ['CC BY-SA 4.0', 'by'],
    ['CC BY-SA 2.0', 'by'],
    ['CC BY-NC 4.0', 'no'],
    ['CC BY-NC-SA 3.0', 'no'],
    ['CC BY-ND 4.0', 'no'],
    ['GFDL', 'no'],
    ['Fair use', 'no'],
    ['', 'no'],
    [undefined, 'no'],
  ]
  let failed = 0
  for (const [lic, want] of probes) {
    const v = licenseCheck(lic)
    const got = !v.ok ? 'no' : v.requiresAttribution ? 'by' : 'ok'
    if (got !== want) {
      failed++
      console.error(`  授權判定 ${JSON.stringify(lic)} — 期望 ${want}，實得 ${got}`)
    }
    // Python 盤點工具要與 JS 同一口徑（兩邊各有一份名單，靠這條偵測分岔）
    let py
    try {
      py = execFileSync('python3', [PY, '--classify', lic ?? ''], {
        encoding: 'utf8',
      }).trim()
    } catch (err) {
      py = `錯誤 ${err.status}`
    }
    if (py !== want) {
      failed++
      console.error(`  Python 口徑 ${JSON.stringify(lic)} — 期望 ${want}，實得 ${py}`)
    }
  }
  const attr = [
    ['Prokurator11／Commons，https://commons.wikimedia.org/wiki/File:A.jpg', true],
    ['https://commons.wikimedia.org/wiki/File:A.jpg', false],
    ['佚名', false],
    ['小模型', false],
  ]
  for (const [s, want] of attr) {
    if (attributionOk(s) !== want) {
      failed++
      console.error(`  署名判定 ${JSON.stringify(s)} — 期望 ${want}`)
    }
  }
  console.log(`portrait_credits --selftest — 失敗 ${failed} 項`)
  process.exit(failed ? 1 : 0)
}

if (process.argv.includes('--list')) {
  for (const it of items) {
    console.log(`${it.file}\t${it.license}\t${it.attribution || '（缺署名）'}`)
  }
  for (const b of bad) console.log(b)
  process.exit(0)
}

if (process.argv.includes('--check')) {
  const existing = readExisting()
  const issues = []
  if (!existing || existing.error) {
    issues.push(existing?.error ?? 'credits.json 不存在（先跑 node scripts/portrait_credits.mjs）')
  } else {
    const want = new Map(items.map((i) => [i.file, i]))
    const have = new Map(existing.items.map((i) => [i && i.file, i]))
    for (const [file, it] of want) {
      const got = have.get(file)
      if (!got) issues.push(`${file} 未列入清單`)
      else if (got.license !== it.license || got.attribution !== it.attribution) {
        issues.push(`${file} 清單內容與 manifest 不一致（授權或署名過時）`)
      }
    }
    for (const file of have.keys()) {
      if (!want.has(file)) issues.push(`${file} 在清單中但 manifest 已不需署名（幽靈條目）`)
    }
    if (existing.count !== null && Number(existing.count) !== items.length && !issues.length) {
      issues.push(`count ${existing.count} ≠ ${items.length}`)
    }
  }
  for (const b of bad) issues.push(b)
  console.log(
    `portrait_credits --check — 需署名 ${items.length} 筆，問題 ${issues.length} 項`,
  )
  for (const i of issues) console.log(`  ${i}`)
  process.exit(issues.length ? 1 : 0)
}

writeFileSync(CREDITS, render(items))
console.log(`portrait_credits — 寫入 ${items.length} 筆署名`)
for (const b of bad) console.log(`  ${b}`)
process.exit(bad.length ? 1 : 0)
