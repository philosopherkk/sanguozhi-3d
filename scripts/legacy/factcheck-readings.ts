/**
 * factcheck-readings.ts — 解讀文字有沒有引入資料裡沒有的年代／數字。
 *
 * 委派寫作最容易出的錯是把推論寫成史實：條目只寫 1869，三層卻冒出 1868；
 * 條目沒寫數字，詳情卻憑空加一個。
 *
 * 分兩級，避免把「正當的跨事件引用」與「憑空的事實」混在同一個清單裡要人逐條看：
 * - INVENTED：這個數字在本模組的原始資料（事件條目、地圖快照、人物、路線、著色備註、
 *   快照年）裡完全找不到 → 硬錯誤，閘門基準 0。
 * - crossEvent：本模組別處有、但本條沒有 → 正常（跨事件引用），只記基準擋增量。
 * 索引刻意不含被審查的解讀文字本身，否則 A 條憑空寫的數字會變成 B 條的依據；
 * 時代包的三級語譯是前幾輪已核過（audit:quotes 逐字比對）的內容，列入索引，
 * 這一輪被審的是新寫的起因／經過／結果。
 *
 * Run: tsx scripts/factcheck-readings.ts [--all] [--update-baseline]
 */
import { ASUKA_PACK, AZUCHI_PACK, KAMAKURA_PACK, KOFUN_PACK, MUROMACHI_PACK, NARA_PACK } from '../src/japanEras/packs'
import { HEIAN_EVENTS, HEIAN_PEOPLE, heianReadingFor, heianDetailFor } from '../src/heian/data/history'
import {
  BAKUMATSU_EVENTS,
  BAKUMATSU_PEOPLE,
  bakumatsuReadingFor,
  bakumatsuDetailFor,
} from '../src/bakumatsu/data/history'
import { CIVIL_WAR_PACK } from '../src/imperial/data/civilWarPack'
import { JIN_PACK } from '../src/imperial/data/jinPack'
import { NANBEI_PACK } from '../src/imperial/data/nanbeiPack'
import { SUI_PACK } from '../src/imperial/data/suiPack'
import { TANG_PACK } from '../src/imperial/data/tangPack'
import { WUDAI_PACK } from '../src/imperial/data/wudaiPack'
import { LIAOSONG_PACK } from '../src/imperial/data/liaosongPack'
import { YUAN_MING_QING_PACK } from '../src/imperial/data/yuanMingQingPack'
import { MINGUO_PACK } from '../src/imperial/data/minguoPack'
import { PRC_PACK } from '../src/imperial/data/prcPack'
const IMPERIAL_PACKS = [
  JIN_PACK, NANBEI_PACK, SUI_PACK, TANG_PACK, WUDAI_PACK,
  LIAOSONG_PACK, YUAN_MING_QING_PACK, MINGUO_PACK, PRC_PACK,
]
import { imperialReadingFor } from '../src/imperial/data/readings'
import type { ReadingLayers } from '../src/components/ClassicDetailModal'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { enforceGate } from './lib/gate-baseline.ts'

interface Row {
  module: string
  id: string
  base: string
  layers?: ReadingLayers
  /** 起因／經過／結果與影響也要一起檢查 */
  extra?: string
  /** 事件自身年份，用於年代一致性檢查 */
  year?: number
}

const rows: Row[] = []
const packs = [KOFUN_PACK, ASUKA_PACK, NARA_PACK, KAMAKURA_PACK, MUROMACHI_PACK, AZUCHI_PACK]

for (const pack of packs) {
  for (const e of pack.events) {
    const reading = pack.readingFor(e.id)
    const detail = pack.detailFor(e.id)
    rows.push({
      module: `時代包-${pack.id}`,
      id: e.id,
      // 已核過的三級語譯與原文也算事實來源：起因／經過只是把那些事實重新組織，不該引入新數字。
      base: [
        e.title,
        String(e.year),
        e.desc,
        e.note ?? '',
        e.source,
        e.location,
        (e.factions ?? []).join(' '),
        reading?.quote ?? '',
        reading?.source ?? '',
        reading?.gloss ?? '',
        reading?.layers.elementary ?? '',
        reading?.layers.secondary ?? '',
        reading?.layers.university ?? '',
      ].join(' '),
      layers: reading?.layers,
      extra: [detail?.causes, detail?.course, detail?.outcome].join(' '),
      year: e.year,
    })
  }
}
for (const e of HEIAN_EVENTS) {
  const reading = heianReadingFor(e.id)
  const detail = heianDetailFor(e.id)
  rows.push({
    module: '平安',
    id: e.id,
    base: [
      e.title,
      String(e.year),
      e.desc,
      e.note ?? '',
      e.source,
      reading?.quote ?? '',
      reading?.source ?? '',
      reading?.gloss ?? '',
      reading?.layers.university ?? '',
    ].join(' '),
    layers: reading?.layers,
    extra: [detail?.causes, detail?.course, detail?.outcome].join(' '),
    year: e.year,
  })
}
for (const e of BAKUMATSU_EVENTS) {
  const reading = bakumatsuReadingFor(e.id)
  const detail = bakumatsuDetailFor(e.id)
  rows.push({
    module: '幕末',
    id: e.id,
    base: [
      e.title,
      String(e.year),
      e.desc,
      e.note ?? '',
      e.source,
      e.location,
      (e.factions ?? []).join(' '),
      reading?.quote ?? '',
      reading?.source ?? '',
      reading?.gloss ?? '',
      reading?.layers.university ?? '',
    ].join(' '),
    layers: reading?.layers,
    extra: [detail?.causes, detail?.course, detail?.outcome].join(' '),
    year: e.year,
  })
}
for (const e of CIVIL_WAR_PACK.events) {
  const r = imperialReadingFor('civilwar', e.id)
  if (!r) continue
  // 同年同月的地圖快照備註也是事實來源（城市易手的相鄰日期多從這裡來），一併放進 base。
  const notes = CIVIL_WAR_PACK.snapshots
    .filter((s) => s.year === e.year && (s.month ?? null) === (e.month ?? null))
    .map((s) => s.note ?? '')
    .join(' ')
  rows.push({
    module: '內戰',
    id: e.id,
    base: [e.title, String(e.year), String(e.month ?? ''), e.desc, e.source, (e.factions ?? []).join(' '), notes].join(' '),
    layers: {
      elementary: r.layers.elementary ?? e.desc,
      secondary: r.layers.secondary ?? e.secondary,
      university: r.layers.university ?? e.university,
    },
    extra: [r.causes, r.course, r.outcome].join(' '),
    year: e.year,
  })
}

// 中國／近現代帝國包：目前只有事件檔短文，沒有解讀層，所以這裡先不產生 rows（沒有東西可查）；
// 一旦某包補了 readings（imperialReadingFor 有值），新寫的三層與起因／經過／結果就會自動進這道檢查。
for (const pack of IMPERIAL_PACKS) {
  for (const e of pack.events) {
    const r = imperialReadingFor(pack.id, e.id)
    if (!r) continue
    const notes = pack.snapshots
      .filter((s) => s.year === e.year && (s.month ?? null) === (e.month ?? null))
      .map((s) => s.note ?? '')
      .join(' ')
    rows.push({
      module: `帝國包-${pack.id}`,
      id: e.id,
      base: [
        e.title,
        String(e.year),
        String(e.month ?? ''),
        e.desc,
        e.source,
        e.location ?? '',
        (e.factions ?? []).join(' '),
        e.secondary,
        e.university,
        e.outcome ?? '',
        notes,
      ].join(' '),
      layers: {
        elementary: r.layers.elementary ?? e.desc,
        secondary: r.layers.secondary ?? e.secondary,
        university: r.layers.university ?? e.university,
      },
      extra: [r.causes, r.course, r.outcome].join(' '),
      year: e.year,
    })
  }
}

/** 比對規則在 scripts/lib/fact-numbers.ts，那裡有測試。 */
import { allowCovers, allowReason, covered, nums, type AllowEntry } from './lib/fact-numbers.ts'

/**
 * 已逐條核過、但事實來源在本模組資料之外的數字（例：1825 異國船打拂令、1871 廢藩置縣）。
 * 記在 reports/fact-allowlist.json 而不是放進程式：這樣「誰核過的、憑什麼」是可讀的，
 * 而且新的憑空數字仍然會被標出來（閘門基準 0）。
 */
function loadAllowlist(): Record<string, Record<string, AllowEntry>> {
  const p = join(dirname(fileURLToPath(import.meta.url)), '..', 'reports', 'fact-allowlist.json')
  if (!existsSync(p)) return {}
  try {
    return JSON.parse(readFileSync(p, 'utf8')) as Record<string, Record<string, AllowEntry>>
  } catch {
    console.log('（fact-allowlist.json 讀不到，忽略）')
    return {}
  }
}
const allowlist = loadAllowlist()

/**
 * 模組級事實索引：這個模組的「原始資料」裡出現過的所有數字。
 * 不收被審查的解讀文字本身，否則 A 條憑空的數字會變成 B 條的依據。
 */
function buildModuleFacts(): Map<string, Set<string>> {
  const acc = new Map<string, string[]>()
  const add = (m: string, s: string) => acc.set(m, [...(acc.get(m) ?? []), s])
  const evText = (e: {
    title: string
    year: number
    month?: number
    desc: string
    note?: string
    source: string
    location?: string
    factions?: string[]
  }) =>
    [e.title, String(e.year), String(e.month ?? ''), e.desc, e.note ?? '', e.source, e.location ?? '', (e.factions ?? []).join(' ')].join(' ')
  const readingText = (r?: { quote: string; source: string; gloss?: string; layers: ReadingLayers }) =>
    r ? [r.quote, r.source, r.gloss ?? '', r.layers.elementary, r.layers.secondary, r.layers.university].join(' ') : ''
  const personText = (p: { name: string; aka?: string; role: string; summary: string; source: string; birth?: number; death?: number }) =>
    [p.name, p.aka ?? '', p.role, p.summary, p.source, String(p.birth ?? ''), String(p.death ?? '')].join(' ')

  for (const pack of packs) {
    const m = `時代包-${pack.id}`
    for (const e of pack.events) add(m, evText(e))
    for (const e of pack.events) add(m, readingText(pack.readingFor(e.id)))
    for (const p of pack.people) add(m, personText(p))
    for (const r of pack.routes) add(m, [r.name, String(r.year), r.source].join(' '))
    for (const v of Object.values(pack.shadeNotes ?? {})) add(m, v)
    for (const y of Object.keys(pack.territoryByYear ?? {})) add(m, y)
    // 詳情常寫「28 個領域中 14 域標鎌倉幕府」——這種計數是地圖資料推出來的，
    // 資料裡沒有字面數字。把每個快照年的總域數與各勢力域數加進索引，
    // 這樣正確的計數會被接受、寫錯的計數仍然會被標出來。
    for (const [y, row] of Object.entries(pack.territoryByYear ?? {})) {
      const counts = new Map<string, number>()
      for (const f of Object.values(row)) counts.set(f, (counts.get(f) ?? 0) + 1)
      const total = Object.keys(row).length
      // 「其餘 N 域」是總數減某勢力，也要算進去，否則正確的寫法會被當憑空。
      const complements = [...counts.values()].map((c) => total - c)
      add(m, [y, String(total), ...counts.values(), ...complements].join(' '))
    }
  }
  for (const e of HEIAN_EVENTS) add('平安', evText(e))
  for (const e of HEIAN_EVENTS) add('平安', readingText(heianReadingFor(e.id)))
  for (const p of HEIAN_PEOPLE) add('平安', personText(p))
  for (const e of BAKUMATSU_EVENTS) add('幕末', evText(e))
  for (const e of BAKUMATSU_EVENTS) add('幕末', readingText(bakumatsuReadingFor(e.id)))
  for (const p of BAKUMATSU_PEOPLE) add('幕末', personText(p))
  for (const e of CIVIL_WAR_PACK.events) add('內戰', evText(e))
  for (const s of CIVIL_WAR_PACK.snapshots) add('內戰', [String(s.year), String(s.month ?? ''), s.note ?? ''].join(' '))
  for (const r of (CIVIL_WAR_PACK as unknown as { routes?: { name: string; year: number; source: string }[] }).routes ?? [])
    add('內戰', [r.name, String(r.year), r.source].join(' '))

  // 中國／近現代帝國包：事件檔自己的 secondary／university／outcome 是已存在的內容，
  // 算事實來源；新寫的解讀引用這些數字不該被當成憑空。
  for (const pack of IMPERIAL_PACKS) {
    const m = `帝國包-${pack.id}`
    for (const e of pack.events) {
      add(m, evText(e))
      add(m, [e.secondary, e.university, e.outcome ?? '', e.classicQuote ?? '', e.classicSource ?? ''].join(' '))
    }
    for (const s of pack.snapshots)
      add(m, [String(s.year), String(s.month ?? ''), s.note ?? '', s.label].join(' '))
    for (const r of pack.routes ?? []) add(m, [r.name, String(r.year), r.source].join(' '))
    for (const p of pack.people ?? []) add(m, personText(p))
  }

  const out = new Map<string, Set<string>>()
  for (const [m, arr] of acc) out.set(m, nums(arr.join(' ')))
  return out
}

const moduleFacts = buildModuleFacts()

let invented = 0
let inventedEntries = 0
let crossEvent = 0
let crossEntries = 0
for (const r of rows) {
  if (!r.layers) continue
  const bn = nums(r.base)
  const mf = moduleFacts.get(r.module) ?? new Set<string>()
  const out = [r.layers.elementary, r.layers.secondary, r.layers.university, r.extra ?? ''].join(' ')
  const fresh = [...nums(out)].filter((n) => !covered(n, bn))
  // 年代也要看：比事件本身超過一年的四位年份，若本模組別處也沒有，就是憑空的年代。
  const far = r.year
    ? fresh.filter((n) => /^\d{4}$/.test(n) && Math.abs(Number(n) - r.year) > 1)
    : []
  const bad = [...new Set([...fresh, ...far])].filter((n) => !covered(n, mf))
  const cross = fresh.filter((n) => covered(n, mf))
  const allowed = allowlist[`${r.module} ${r.id}`] ?? {}
  const reviewed = bad.filter((n) => allowCovers(allowed[n], out))
  const real = bad.filter((n) => !allowCovers(allowed[n], out))
  if (reviewed.length)
    console.log(
      `allowlisted ${r.module} ${r.id}: ${reviewed.map((n) => `${n}（${allowReason(allowed[n]!)}）`).join('、')}`,
    )
  if (real.length) {
    invented += real.length
    inventedEntries += 1
    console.log(`INVENTED ${r.module} ${r.id}: ${real.join(' ')}（本模組原始資料裡找不到；條目內數字：${[...bn].join(' ') || '無'}）`)
  }
  if (cross.length) {
    crossEvent += cross.length
    crossEntries += 1
    if (process.argv.includes('--all'))
      console.log(`crossEvent ${r.module} ${r.id}: ${cross.join(' ')}（本模組別處有，屬跨事件引用）`)
  }
}

console.log(
  `\n檢查 ${rows.length} 條：憑空數字 ${invented} 個（${inventedEntries} 條）、跨事件引用 ${crossEvent} 個（${crossEntries} 條）`,
)
console.log('（跨事件引用是正常寫法；要逐條看加 --all。憑空的數字才是錯誤，預設只列這些。）')
// 憑空數字要趨近 0；跨事件引用只擋增量。重記基準：tsx scripts/factcheck-readings.ts --update-baseline
let factFailed = false
if (enforceGate('audit:fact:invented', invented)) factFailed = true
if (enforceGate('audit:fact:crossEvent', crossEvent)) factFailed = true
if (factFailed) process.exitCode = 1

// 檢查器本身的檢查：回報 0 有可能是索引太寬、什麼都放過。每次跑都驗證，
// 不要等有人記得加 --self-test。塞一個內戰模組一定沒有的年份，必須被當成憑空；
// 正當年份則不應被誤標。
{
  const mf = moduleFacts.get('內戰') ?? new Set<string>()
  const bogus = '1743'
  const legit = '1949'
  const caught = !covered(bogus, mf)
  const notFalsePositive = covered(legit, mf)
  console.log(`self-test：憑空數字 ${bogus} ${caught ? '會被標出' : '不會被標出 ← 檢查器失效'}`)
  console.log(`self-test：正當數字 ${legit} ${notFalsePositive ? '不被標出' : '被誤標 ← 索引太窄'}`)
  if (!caught || !notFalsePositive) process.exitCode = 1
}
