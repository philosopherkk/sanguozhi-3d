#!/usr/bin/env node
/**
 * audit:portraits — 人物想像圖的完整與配對稽核。
 *
 * 存在的理由：350 張圖各自有 id／era／name，靠人工對永遠對不完；一旦有檔案不見、
 * manifest 寫錯資料夾、或者把 A 的圖掛到 B 的記錄上，build 同其他閘門全綠，
 * 使用者只會見到一張錯人頭像。這裡把三件事當資料查：
 *
 *  1. manifest 自己：count、檔名、資料夾、檔案存在、JPEG 尺寸一致
 *  2. 資料掛載：每張圖的 `/portraits/<file>` 必須出現在所屬 era 的資料檔
 *  3. 身份配對：該筆記錄的 id 與 name 必須與 manifest 相同
 *
 * `--teeth` 會把四種破壞注入記憶體副本（錯名、錯檔、資料路徑被換、count 被改），
 * 每種都必須被同一支稽核咬到，防止日後把規則改弱而數字仍然全綠。
 *
 * 輸出尾行：
 *   `audit:portraits — fail N, linked M, files K`
 *   `audit:portraits --teeth — 失敗 N 項`（帶 --teeth 時）
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const MANIFEST = join(ROOT, 'public', 'portraits', 'manifest.json')

/** era → 人物資料檔；depth.ts 的 imperial-* 另由 DEPTH_SECTION 處理。 */
const ERA_FILES = {
  sanguozhi: ['src/data/people.json'],
  qinhan: ['src/qinhan/data/people.ts'],
  zhou: [
    'src/zhou/data/people.ts',
    'src/zhou/data/earlyDynasty.ts',
    'src/zhou/data/earlyDynastyMore.ts',
  ],
  'imperial-civilwar': ['src/imperial/data/civilWarPack.ts'],
  'japan-history': ['src/japanHistory/data/people.json'],
  sengoku: ['src/sengoku/data/people.json'],
  heian: ['src/heian/data/history.ts'],
  bakumatsu: ['src/bakumatsu/data/history.ts'],
  'japan-asuka': ['src/japanEras/packs/asukaPack.ts'],
  'japan-nara': ['src/japanEras/packs/naraPack.ts'],
  'japan-kamakura': ['src/japanEras/packs/kamakuraPack.ts'],
  'japan-muromachi': ['src/japanEras/packs/muromachiPack.ts'],
  'japan-azuchi': ['src/japanEras/packs/azuchiPack.ts'],
  'japan-edo': ['src/japanEras/packs/edoPack.ts'],
  'japan-modern': ['src/japanEras/packs/modernJapanPack.ts'],
  'japan-imjin': ['src/japanEras/packs/imjinWarEvents.ts'],
}
const DEPTH = 'src/imperial/data/depth.ts'
const DEPTH_SECTION = {
  'imperial-jin': 'jin',
  'imperial-nanbei': 'nanbei',
  'imperial-sui': 'sui',
  'imperial-tang': 'tang',
  'imperial-wudai': 'wudai',
  'imperial-liaosong': 'liaosong',
  'imperial-yuanmingqing': 'yuanmingqing',
  'imperial-minguo': 'minguo',
  'imperial-prc': 'prc',
}

function jpegSize(file) {
  const buf = readFileSync(file)
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null
  let i = 2
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) {
      i++
      continue
    }
    const marker = buf[i + 1]
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)]
    }
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2
      continue
    }
    i += 2 + buf.readUInt16BE(i + 2)
  }
  return null
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 從 TS 原始碼的 portrait 行附近取出 id 與 name。 */
function tsIdentity(lines, at, id) {
  const tail = Math.max(0, at - 22)
  const window = lines.slice(tail, at + 3).join('\n')
  // person('id', 'name', ...)——depth.ts 有單行與多行兩種寫法，
  // 視窗內可能有多個 person() 呼叫，必須逐個比對 id，唔可以只攞第一個。
  for (const m of window.matchAll(/person\(\s*'([^']+)'\s*,\s*'([^']+)'/g)) {
    if (m[1] === id) return { id: m[1], name: m[2] }
  }
  // 資料物件的 id 欄：id: '…' 或 "id": "…"，name 在後面
  const idAt = window.search(
    new RegExp(`\\bid:\\s*['"]${escapeRe(id)}['"]|"id":\\s*"${escapeRe(id)}"`),
  )
  if (idAt < 0) return null
  const nameAt = /[\s\S]{0,600}?\bname:\s*['"]([^'"]+)['"]/.exec(window.slice(idAt))
  return nameAt ? { id, name: nameAt[1] } : null
}

/**
 * 跑一次完整稽核。opts.overrides 只存在於記憶體，用嚟畀 teeth 注入破壞；
 * 唔會寫回任何 tracked 檔。
 */
function check(rows, opts = {}) {
  const issues = []
  const fail = (code, where, message) => issues.push({ code, where, message })
  const overrides = opts.overrides ?? {}
  const cache = new Map()

  if ((opts.count ?? rows.length) !== rows.length) {
    fail('manifest-count', 'manifest.json', `count ${opts.count} ≠ ${rows.length} 筆`)
  }

  const seenPaths = new Set()
  for (const row of rows) {
    const rel = row.file
    const file = join(ROOT, 'public', 'portraits', rel)
    if (seenPaths.has(rel)) fail('manifest-duplicate', rel, '檔案路徑重複')
    seenPaths.add(rel)
    if (!rel.startsWith(row.era + '/')) {
      fail('manifest-era-folder', rel, `era=${row.era} 與資料夾不符`)
    }
    if (!rel.endsWith('/' + row.id + '.jpg')) {
      fail('manifest-id-file', rel, `id=${row.id} 與檔名不符`)
    }
    if (!existsSync(file)) {
      fail('file-missing', rel, '圖檔不存在')
      continue
    }
    const size = jpegSize(file)
    if (!size || size[0] !== 1024 || size[1] !== 1024) {
      fail('file-size', rel, `尺寸 ${size ? size.join('x') : '非 JPEG'}，期望 1024x1024`)
    }
  }

  const linesOf = (rel) => {
    if (!cache.has(rel)) {
      const lines = overrides[rel] ?? readFileSync(join(ROOT, rel), 'utf8').split('\n')
      cache.set(rel, [...lines])
    }
    return cache.get(rel)
  }
  const jsonPeopleOf = (rel) => {
    if (!cache.has(rel)) {
      const data = JSON.parse(readFileSync(join(ROOT, rel), 'utf8'))
      const seq = Array.isArray(data)
        ? data
        : Object.values(data).find((v) => Array.isArray(v) && v.some((x) => x && x.portrait))
      cache.set(rel, seq ?? [])
    }
    return cache.get(rel)
  }

  let linked = 0
  for (const row of rows) {
    const path = '/portraits/' + row.file
    const rels = row.era in DEPTH_SECTION ? [DEPTH] : ERA_FILES[row.era] ?? []
    if (!rels.length) {
      fail('unknown-era', row.id, `未知 era ${row.era}`)
      continue
    }
    let hit = false
    for (const rel of rels) {
      if (rel.endsWith('.json')) {
        const person = jsonPeopleOf(rel).find((p) => p && p.portrait === path)
        if (!person) continue
        hit = true
        if (person.id !== row.id) {
          fail('id-mismatch', `${rel}:${row.id}`, `資料 id=${person.id}，manifest=${row.id}`)
        }
        if (!person.name?.includes(row.name)) {
          fail('name-mismatch', `${rel}:${row.id}`, `資料 name=${person.name}，manifest=${row.name}`)
        }
        break
      }
      const lines = linesOf(rel)
      const at = lines.findIndex((line) => line.includes(path))
      if (at < 0) continue
      const identity = tsIdentity(lines, at, row.id)
      if (!identity) {
        fail('identity-missing', `${rel}:${row.id}`, '找不到對應的 id／name')
        hit = true
        break
      }
      hit = true
      if (!identity.name.includes(row.name)) {
        fail('name-mismatch', `${rel}:${row.id}`, `資料 name=${identity.name}，manifest=${row.name}`)
      }
      break
    }
    if (hit) linked++
    else fail('not-linked', `${row.era}:${row.id}`, '沒有任何人物資料掛起這張圖')
  }

  const files = rows.filter((r) => existsSync(join(ROOT, 'public', 'portraits', r.file))).length
  return { issues, linked, files }
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
const rows = manifest.portraits ?? []
const result = check(rows, { count: manifest.count })
console.log(
  `audit:portraits — fail ${result.issues.length}, linked ${result.linked}/${rows.length}, files ${result.files}`,
)
for (const issue of result.issues) {
  console.log(`  ${issue.code}\t${issue.where}\t${issue.message}`)
}

if (process.argv.includes('--teeth')) {
  const depthLines = readFileSync(join(ROOT, DEPTH), 'utf8').split('\n')
  const portraitLine = depthLines.findIndex((line) =>
    line.includes('/portraits/imperial-jin/p-sima-yan.jpg'),
  )
  const brokenDepth = [...depthLines]
  brokenDepth[portraitLine] = brokenDepth[portraitLine].replace(
    '/portraits/imperial-jin/p-sima-yan.jpg',
    '/portraits/imperial-jin/not-here.jpg',
  )
  const teeth = [
    {
      name: 'manifest-name',
      expect: 'name-mismatch',
      run: () => check(rows.map((row, i) => (i === 0 ? { ...row, name: '錯誤姓名' } : row))),
    },
    {
      name: 'manifest-file',
      expect: 'file-missing',
      run: () =>
        check(
          rows.map((row, i) =>
            i === 0 ? { ...row, file: 'sanguozhi/not-exist.jpg', id: 'not-exist' } : row,
          ),
        ),
    },
    {
      name: 'data-unlink',
      expect: 'not-linked',
      run: () => check(rows, { overrides: { [DEPTH]: brokenDepth } }),
    },
    {
      name: 'manifest-count',
      expect: 'manifest-count',
      run: () => check(rows.slice(1), { count: rows.length }),
    },
  ]
  let failed = 0
  for (const tooth of teeth) {
    const got = tooth.run().issues.some((issue) => issue.code === tooth.expect)
    if (!got) {
      failed++
      console.error(`  ${tooth.name} — 注入破壞後沒有咬到 ${tooth.expect}`)
    }
  }
  console.log(`audit:portraits --teeth — 失敗 ${failed} 項`)
  process.exit(failed ? 1 : 0)
}

process.exit(result.issues.length ? 1 : 0)
