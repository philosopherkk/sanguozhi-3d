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
 * `--teeth` 會把破壞注入記憶體副本（錯名、錯檔、資料路徑被換、count 被改、
 * 授權缺署名等），每種都必須被同一支稽核咬到，防止日後把規則改弱而數字仍然全綠。
 *
 * 授權（2026-11-28 使用者裁定：准 CC BY-SA）：
 *   白名單＝Public domain／PD-*／CC0／CC BY／CC BY-SA（可帶版本號）；
 *   NC（非商業）與 ND（禁止改作）一律不准——本站把圖改畫成頭像，ND 圖根本不能碰。
 *   需要署名的授權（BY 系列）要有 `attribution`（作者＋來源網址），
 *   而且必須出現在 `public/portraits/credits.json`（站上看得見的署名清單）。
 *   既有的 352 張內部生成條目沒有 `license`，屬既有成果，不追溯；
 *   但四國新增條目一律要有 `license`，新圖不能再用「查無授權」混過去。
 *
 * 輸出尾行：
 *   `audit:portraits — fail N, linked M, files K`
 *   `audit:portraits --teeth — 失敗 N 項`（帶 --teeth 時）
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { attributionOk, licenseCheck } from './portrait_license.mjs'

const ROOT = join(import.meta.dirname, '..')
const MANIFEST = join(ROOT, 'public', 'portraits', 'manifest.json')
const CREDITS = join(ROOT, 'public', 'portraits', 'credits.json')

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
  // 2026-11-28：韓國、泰國、越南、馬來西亞 16 槽。現在四國還沒有任何 portrait 條目，
  // 鍵先登記好，代理補第一張圖時閘門才認得該 era——否則會以 unknown-era 判紅，
  // 而代理為求過閘只能亂塞一個既有的日本 era（實測發生過別處的同類走樣）。
  koancient: ['src/countries/korea/koancientPack.ts'],
  kogoryeo: ['src/countries/korea/kogoryeoPack.ts'],
  kojoseon: ['src/countries/korea/kojoseonPack.ts'],
  komodern: ['src/countries/korea/komodernPack.ts'],
  thsukhothai: ['src/countries/thailand/thsukhothaiPack.ts'],
  thayutthaya: ['src/countries/thailand/thayutthayaPack.ts'],
  thchakri: ['src/countries/thailand/thchakriPack.ts'],
  thmodern: ['src/countries/thailand/thmodernPack.ts'],
  vnnorth: ['src/countries/vietnam/vnnorthPack.ts'],
  vndynasty: ['src/countries/vietnam/vndynastyPack.ts'],
  vnnguyen: ['src/countries/vietnam/vnnguyenPack.ts'],
  vnmodern: ['src/countries/vietnam/vnmodernPack.ts'],
  mymalacca: ['src/countries/malaysia/mymalaccaPack.ts'],
  mycolonial: ['src/countries/malaysia/mycolonialPack.ts'],
  mymerdeka: ['src/countries/malaysia/mymerdekaPack.ts'],
  mymodern: ['src/countries/malaysia/mymodernPack.ts'],
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

/** 四國 16 槽：新增條目一律要寫 license（既有的中國／日本條目不追溯）。 */
const FOUR_COUNTRY_ERAS = new Set([
  'koancient',
  'kogoryeo',
  'kojoseon',
  'komodern',
  'thsukhothai',
  'thayutthaya',
  'thchakri',
  'thmodern',
  'vnnorth',
  'vndynasty',
  'vnnguyen',
  'vnmodern',
  'mymalacca',
  'mycolonial',
  'mymerdeka',
  'mymodern',
])

/** 授權與署名的判定口徑在 portrait_license.mjs（閘門與產生器共用一份）。 */
function readCredits() {
  if (!existsSync(CREDITS)) return null
  try {
    const data = JSON.parse(readFileSync(CREDITS, 'utf8'))
    return Array.isArray(data) ? data : (data.credits ?? [])
  } catch {
    return null
  }
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

  // 授權與署名：需要署名的授權，署名欄與站上清單都要在，缺一不可
  const credits = opts.credits ?? readCredits()
  const creditFiles = new Set((credits ?? []).map((c) => c && c.file))
  for (const row of rows) {
    const where = `${row.era}:${row.id}`
    if (!String(row.license ?? '').trim()) {
      if (FOUR_COUNTRY_ERAS.has(row.era)) {
        fail(
          'license-missing',
          where,
          '四國新增條目要寫 license（Public domain／CC0／CC BY／CC BY-SA）',
        )
      }
      continue
    }
    const verdict = licenseCheck(row.license)
    if (!verdict.ok) {
      fail('license-unknown', where, verdict.why)
      continue
    }
    if (!verdict.requiresAttribution) continue
    if (!attributionOk(row.attribution)) {
      fail(
        'license-no-attribution',
        where,
        `授權 ${row.license} 要求署名：attribution 要有作者與來源網址`,
      )
    }
    if (!creditFiles.has(row.file)) {
      fail('credits-missing', where, `${row.file} 未列入 public/portraits/credits.json`)
    }
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
  const BY_ROW = {
    era: 'koancient',
    id: 'teeth-bysa',
    name: '探針人物',
    file: 'koancient/teeth-bysa.jpg',
    license: 'CC BY-SA 4.0',
    attribution:
      'Prokurator11／Wikimedia Commons，https://commons.wikimedia.org/wiki/File:Taejo.jpg',
  }
  const CREDITS_OK = [{ file: BY_ROW.file }]
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
    // 授權四針：真庫裡目前一張 CC 圖都未有，用合成條目測（合成檔名會另外觸發
    // file-missing／not-linked，屬預期噪聲，探針只認自己那一個錯誤碼）
    {
      name: 'license-required',
      expect: 'license-missing',
      run: () =>
        check(
          [...rows, { ...BY_ROW, license: undefined }],
          { credits: CREDITS_OK },
        ),
    },
    {
      name: 'license-nc',
      expect: 'license-unknown',
      run: () => check([...rows, { ...BY_ROW, license: 'CC BY-NC-SA 4.0' }], { credits: CREDITS_OK }),
    },
    {
      name: 'license-no-attribution',
      expect: 'license-no-attribution',
      run: () => check([...rows, { ...BY_ROW, attribution: undefined }], { credits: CREDITS_OK }),
    },
    {
      name: 'credits-dropped',
      expect: 'credits-missing',
      run: () => check([...rows, BY_ROW], { credits: [] }),
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
  // 反向對照：合規的 BY-SA 條目不該被授權四針任何一招誤殺（只准咬錯的）。
  // 只認合成探針那一筆的 issue——真庫裡未標授權的條目另有 license-missing，
  // 混進來就會把「誤殺與否」測成永遠紅，等於冇測。
  {
    const codes = new Set([
      'license-missing',
      'license-unknown',
      'license-no-attribution',
      'credits-missing',
    ])
    const bad = check([...rows, BY_ROW], { credits: CREDITS_OK }).issues.filter(
      (i) => i.where === `${BY_ROW.era}:${BY_ROW.id}` && codes.has(i.code),
    )
    if (bad.length) {
      failed++
      console.error(`  合規 BY-SA — 被誤判 ${bad.map((i) => i.code).join('、')}`)
    }
  }
  console.log(`audit:portraits --teeth — 失敗 ${failed} 項`)
  process.exit(failed ? 1 : 0)
}

process.exit(result.issues.length ? 1 : 0)
