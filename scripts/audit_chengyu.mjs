#!/usr/bin/env node
/**
 * 成語審計：查「有無書證、連結是否斷裂、時代與國別覆蓋是否充足」。
 *
 * 規則是 repo 規則（AGENTS.md）：一手史料為限，絕不用《三國演義》；
 * 軍記文學可用但必須標明「文學作品，非史實記錄」；分岐要 disputed。
 *
 * 用法：
 *   node scripts/audit_chengyu.mjs              # 摘要 + 覆蓋表 + 缺失清單
 *   node scripts/audit_chengyu.mjs --json
 *   node scripts/audit_chengyu.mjs --fail-on-gap
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const DATA = join(ROOT, 'src/chengyu/data/idioms.json')
const argv = process.argv.slice(2)
const JSON_OUT = argv.includes('--json')

const SOURCE_CLASSES = ['經典', '史籍', '和歌', '軍記', '近代定型', '民俗']
const LOCALES = ['zh', 'jp', 'shared']
const MILITARY_TALE = /平家物語|治戰記|保元物語|平治物語|源平盛衰記|軍記/
const FICTION = /三國演義|三國志演義|水滸|西遊|東周列國志|羅貫中/
const SIMPLIFIED = /[国学会长门东车为发时这来过说们么没东西习欢进还电点产见飞风仪汉边变云气团万与专书页齐广庄庆击补网对队阳阴隐显灵虽虫医药总画线]/u
const COLLOQUIAL = /[嘅咗佢喺冇咩噉嚟嘢]/u

/** 收集全專案可用的事件／人物 id，令 eraLink 不可懸空。 */
function collectIds() {
  const events = new Set()
  const people = new Set()
  const walk = (dir) => {
    let ents
    try {
      ents = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of ents) {
      const full = join(dir, e.name)
      if (e.isDirectory()) walk(full)
      else if (e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) {
        const t = readFileSync(full, 'utf8')
        for (const m of t.matchAll(/\bid\s*:\s*['"]([\w:.-]{2,60})['"]/g)) events.add(m[1])
        for (const m of t.matchAll(/\bpersonId\s*:\s*['"]([\w:.-]{2,60})['"]/g)) people.add(m[1])
        // 人物檔常用 Record 鍵名（'cao-cao': { … }），並非 id: 欄位；
        // 此處刻意寬收：寧可放過，不可把真實 id 報成死連結。
        for (const m of t.matchAll(/^\s*['"]([a-z][\w:.-]{2,60})['"]\s*:\s*\{/gm)) {
          events.add(m[1])
          people.add(m[1])
        }
      }
    }
  }
  walk(join(ROOT, 'src'))
  return { events, people }
}

const { events, people } = collectIds()
const entries = JSON.parse(readFileSync(DATA, 'utf8'))
const issues = []
const add = (level, code, where, msg) => issues.push({ level, code, where, msg })

const seen = new Map()
for (const [i, e] of entries.entries()) {
  const at = `${e.id || '(無 id)'}#${i}`
  for (const f of ['id', 'lemma', 'reading', 'meaningZhHant', 'locale']) {
    if (!e[f] || String(e[f]).trim() === '') add('fail', '缺欄位', at, `${f} 為空`)
  }
  if (!e.eraLink || !e.eraLink.kind) add('fail', '缺欄位', at, 'eraLink.kind 缺失')
  if (!e.source || !e.source.class || !e.source.cite) {
    add('fail', '缺欄位', at, 'source.class／source.cite 缺失')
  }
  if (e.source?.class && !SOURCE_CLASSES.includes(e.source.class)) {
    add('fail', 'class 非法', at, `class=${e.source.class}（限：${SOURCE_CLASSES.join('、')}）`)
  }
  if (e.locale && !LOCALES.includes(e.locale)) add('fail', 'locale 非法', at, `locale=${e.locale}`)

  const cite = e.source?.cite ?? ''
  if (cite && !/《[^》]{2,}》/.test(cite)) {
    add('fail', '書證不足', at, `cite 無《書名》：${cite.slice(0, 40)}`)
  } else if (cite && !/[·卷篇紀傳第]/u.test(cite)) {
    add('warn', '出處未指篇卷', at, `宜補卷／篇：${cite.slice(0, 40)}`)
  }
  if (FICTION.test(cite)) add('fail', '小說當史料', at, `禁用小說：${cite.slice(0, 40)}`)
  if (MILITARY_TALE.test(cite) && !/文學|非史實/.test(`${e.note ?? ''}`)) {
    add('fail', '軍記未標文學', at, '軍記文學須在 note 標明「文學作品，非史實記錄」')
  }
  const allText = `${e.lemma}${e.reading}${e.meaningZhHant}${cite}${e.note ?? ''}`
  if (SIMPLIFIED.test(allText)) {
    add('fail', '簡體字', at, `疑似簡體：${[...new Set(allText.match(SIMPLIFIED) ?? [])].join('')}`)
  }
  if (COLLOQUIAL.test(allText)) {
    add('fail', '粵語字', at, `應改書面語：${[...new Set(allText.match(COLLOQUIAL) ?? [])].join('')}`)
  }
  if (e.meaningZhHant && e.meaningZhHant.replace(/\s/g, '').length < 12) {
    add('warn', '釋義過短', at, `${e.meaningZhHant.length} 字，宜說明本義與今義`)
  }
  const link = e.eraLink ?? {}
  if (link.kind === 'event' && link.id && !events.has(link.id)) {
    add('fail', '連結懸空', at, `eraLink.kind=event 但查無此 id：${link.id}`)
  }
  if (link.kind === 'person' && link.id && !people.has(link.id) && !events.has(link.id)) {
    add('fail', '連結懸空', at, `eraLink.kind=person 但查無此 id：${link.id}`)
  }
  if (link.kind === 'year' && typeof link.year !== 'number') {
    add('fail', '連結不完整', at, 'kind=year 卻沒有 year')
  }
  if (link.kind !== 'year' && typeof link.year !== 'number') {
    add('warn', '連結缺年份', at, 'event／person 連結宜補 year，令地圖能定位')
  }
  if (typeof e.disputed !== 'boolean' && /一說|一説|或云|相傳/.test(`${e.note ?? ''}${cite}`)) {
    add('warn', '爭議未標', at, '文字有「一說／或云」卻未標 disputed: true')
  }
  const key = `${e.lemma}|${e.locale}`
  if (seen.has(key)) add('fail', '重複條目', at, `與 ${seen.get(key)} 重覆（lemma+locale 相同）`)
  else seen.set(key, at)
}

const byLocale = { zh: 0, jp: 0, shared: 0 }
const byCentury = {}
for (const e of entries) {
  byLocale[e.locale] = (byLocale[e.locale] ?? 0) + 1
  const y = e.eraLink?.year
  if (typeof y === 'number') {
    const c = y > 0 ? Math.ceil(y / 100) : Math.floor(y / 100)
    const label = c > 0 ? `${c}` : `前${Math.abs(c)}`
    byCentury[label] = (byCentury[label] ?? 0) + 1
  }
}
const sortCentury = (a, b) => {
  const num = (s) => (s.startsWith('前') ? -Number(s.slice(1)) : Number(s))
  return num(a) - num(b)
}
const centuries = Object.keys(byCentury).sort(sortCentury)

const fails = issues.filter((i) => i.level === 'fail')
const warns = issues.filter((i) => i.level === 'warn')

if (JSON_OUT) {
  console.log(
    JSON.stringify(
      { entries: entries.length, fails: fails.length, warns: warns.length, byLocale, byCentury, issues },
      null,
      2,
    ),
  )
} else {
  const L = []
  L.push('# 成語審計')
  L.push('')
  L.push(
    `條目 ${entries.length}｜fail **${fails.length}**｜warn ${warns.length}｜國別 中 ${byLocale.zh ?? 0}・日 ${byLocale.jp ?? 0}・共用 ${byLocale.shared ?? 0}`,
  )
  L.push('')
  L.push('| code | 等級 | 位置 | 說明 |')
  L.push('|---|---|---|---|')
  for (const i of [...fails, ...warns].slice(0, 60)) {
    L.push(`| ${i.code} | ${i.level} | \`${i.where}\` | ${i.msg} |`)
  }
  L.push('')
  L.push('## 世紀覆蓋（世紀 → 條目數）')
  L.push('')
  L.push(centuries.map((c) => `${c}世紀:${byCentury[c]}`).join('｜') || '（無）')
  L.push('')
  L.push('## 口徑')
  L.push('')
  L.push('- 書證：`source.cite` 必須含《書名》，並宜指到卷／篇。')
  L.push('- 禁用小說：《三國演義》等一概不得當史料（AGENTS.md）。')
  L.push('- 軍記文學（《平家物語》《治戰記》等）可在，但 `note` 要寫「文學作品，非史實記錄」。')
  L.push('- `eraLink` 連 event／person 時，id 必須在本專案資料裡查得到，避免死連結。')
  L.push('- 有「一說／或云」之類表述者應標 `disputed: true` 並寫 `note`。')
  L.push('')
  mkdirSync(join(ROOT, 'reports'), { recursive: true })
  writeFileSync(join(ROOT, 'reports/chengyu.md'), L.join('\n'), 'utf8')
  console.log(
    `audit:chengyu — 條目 ${entries.length}｜fail ${fails.length}｜warn ${warns.length}（中 ${byLocale.zh ?? 0}／日 ${byLocale.jp ?? 0}／共用 ${byLocale.shared ?? 0}）→ reports/chengyu.md`,
  )
}
if (argv.includes('--fail-on-gap') && fails.length > 0) process.exit(1)

