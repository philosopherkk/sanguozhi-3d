/**
 * 三國志專題（184–280）資料稽核。只列違規，不改資料。
 * 執行：npm run audit:data
 */

import {
  readFileSync,
  readdirSync,
  writeFileSync,
  type Dirent,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import battles from '../src/data/battles.json' with { type: 'json' }
import factions from '../src/data/factions.json' with { type: 'json' }
import people from '../src/data/people.json' with { type: 'json' }
import population from '../src/data/population.json' with { type: 'json' }
import timeline from '../src/data/timeline.json' with { type: 'json' }
import { FACTION_ARTICLES } from '../src/data/factionArticles.ts'
import { SANGUO_SITUATION } from '../src/data/factionSituation.ts'
import { CHINA_MARCH_ROUTES, FRONTIER_ZONES } from '../src/data/marchRoutes.ts'
import { PERSON_PROFILES } from '../src/data/personProfiles.ts'
import { READING_LAYERS } from '../src/data/readingLayers.ts'
import { timelineDetailFor } from '../src/data/timelineDetails.ts'
import {
  UNREGISTERED_AFTER_280,
  UNREGISTERED_AFTER_280_LEAD_SOURCE,
  wuxiLegendNote,
} from '../src/data/unregisteredHouseholds.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const YEAR_MIN = 184
const YEAR_MAX = 280

/** 正史主 source 允許書名（#16：宋書僅可作 note 後代史回溯） */
const PRIMARY_BOOK_MARKERS = ['三國志', '後漢書', '資治通鑑', '晉書', '裴注'] as const

const YANYI_TROPE_WARN = [
  '草船借箭',
  '空城計',
  '桃園結義',
  '溫酒斬華雄',
  '連環計',
] as const

/** 簡體專用字（與繁體不同碼位；不含繁簡同形如「表」「西」） */
const SIMPLIFIED_ONLY_RE =
  /[国学会长门东车为发时这来过说们么没东西习欢进还电点产见飞风仪汉边变云气团万与专书页齐广庄庆击补网对队阳阴隐显灵虽虫医药总画线]/u

type Level = 'fail' | 'warn'

interface Issue {
  level: Level
  code: string
  location: string
  message: string
}

const issues: Issue[] = []

function add(level: Level, code: string, location: string, message: string) {
  issues.push({ level, code, location, message })
}

function hasSourceShape(source: string): boolean {
  if (!source.trim()) return false
  if (!source.includes('《')) return false
  return /[·卷篇傳紀志書]/.test(source)
}

function bookTitlesIn(source: string): string[] {
  const titles: string[] = []
  const re = /《([^》]+)》/g
  let m: RegExpExecArray | null
  while ((m = re.exec(source)) !== null) {
    titles.push(m[1]!)
  }
  return titles
}

function titleMatchesPrimary(title: string): boolean {
  if (title.includes('裴注')) return true
  return PRIMARY_BOOK_MARKERS.some(
    (m) => m !== '裴注' && title.includes(m),
  )
}

function auditSourceField(
  location: string,
  source: unknown,
  note: unknown,
  opts?: { skipAllowlist?: boolean },
) {
  if (typeof source !== 'string' || !source.trim()) {
    add('fail', 'source-missing', location, '缺少非空 source（須含書名＋卷／篇）')
    return
  }
  if (!hasSourceShape(source)) {
    add(
      'fail',
      'source-format',
      location,
      `source 格式不符（須含《書名·卷／篇》）：${source.slice(0, 80)}`,
    )
  }
  if (source.includes('宋書')) {
    add(
      'fail',
      'source-songshu-primary',
      location,
      '宋書不得列為主 source；應移入 note 並標「後代史回溯」',
    )
  }
  if (opts?.skipAllowlist) return
  for (const title of bookTitlesIn(source)) {
    if (title.includes('宋書')) continue
    if (!titleMatchesPrimary(title)) {
      add(
        'warn',
        'source-allowlist',
        location,
        `source 含非主允許書名《${title}》（允許：三國志、裴注、後漢書、資治通鑑、晉書）`,
      )
    }
  }
  if (
    typeof note === 'string' &&
    note.includes('宋書') &&
    !note.includes('後代史回溯')
  ) {
    add(
      'warn',
      'note-songshu-tag',
      location,
      'note 引用宋書但未標「後代史回溯」',
    )
  }
}

function auditDisputed(location: string, obj: Record<string, unknown>) {
  if (obj.disputed === true) {
    const note = obj.note
    if (typeof note !== 'string' || !note.trim()) {
      add('fail', 'disputed-no-note', location, 'disputed:true 須有 note')
    }
  }
}

function auditYearField(location: string, year: unknown, strict: boolean) {
  if (typeof year !== 'number' || Number.isNaN(year)) return
  if (year < YEAR_MIN || year > YEAR_MAX) {
    add(
      strict ? 'fail' : 'warn',
      'year-range',
      location,
      `year ${year} 不在 ${YEAR_MIN}–${YEAR_MAX}`,
    )
  }
}

function walkWithSource(
  value: unknown,
  location: string,
  opts?: { yearStrict?: boolean; skipAllowlist?: boolean },
) {
  if (Array.isArray(value)) {
    value.forEach((item, i) =>
      walkWithSource(item, `${location}[${i}]`, opts),
    )
    return
  }
  if (!value || typeof value !== 'object') return
  const obj = value as Record<string, unknown>
  if (typeof obj.source === 'string') {
    auditSourceField(location, obj.source, obj.note, opts)
    auditDisputed(location, obj)
    if ('year' in obj) {
      auditYearField(location, obj.year, opts?.yearStrict ?? false)
    }
  }
  for (const [k, v] of Object.entries(obj)) {
    walkWithSource(v, `${location}.${k}`, opts)
  }
}

function scanStringsForYanyi(value: unknown, location: string) {
  if (typeof value === 'string') {
    for (const trope of YANYI_TROPE_WARN) {
      if (value.includes(trope)) {
        add(
          'warn',
          'yanyi-trope',
          location,
          `可能為演義情節用語：「${trope}」`,
        )
      }
    }
    if (SIMPLIFIED_ONLY_RE.test(value)) {
      const chars = [...new Set(value.match(SIMPLIFIED_ONLY_RE) ?? [])].join('')
      add(
        'warn',
        'simplified-han',
        location,
        `疑似簡體字：${chars}`,
      )
    }
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => scanStringsForYanyi(item, `${location}[${i}]`))
    return
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      scanStringsForYanyi(v, `${location}.${k}`)
    }
  }
}

function collectTsxFiles(dir: string, out: string[]) {
  let entries: Dirent[]
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const ent of entries) {
    const full = join(dir, ent.name)
    if (ent.isDirectory()) collectTsxFiles(full, out)
    else if (ent.name.endsWith('.tsx')) out.push(full)
  }
}

function scanUiFiles() {
  const files: string[] = []
  collectTsxFiles(join(ROOT, 'src/components'), files)
  files.push(join(ROOT, 'src/SanguozhiApp.tsx'))
  const seen = new Set<string>()
  for (const file of files) {
    if (seen.has(file)) continue
    seen.add(file)
    let text: string
    try {
      text = readFileSync(file, 'utf8')
    } catch {
      continue
    }
    if (SIMPLIFIED_ONLY_RE.test(text)) {
      const chars = [...new Set(text.match(SIMPLIFIED_ONLY_RE) ?? [])].join('')
      add(
        'warn',
        'simplified-ui',
        file.replace(ROOT + '/', ''),
        `UI 檔疑似簡體字：${chars}`,
      )
    }
  }
}

// --- 資料集 ---

walkWithSource(battles, 'src/data/battles.json', { yearStrict: true })
walkWithSource(timeline, 'src/data/timeline.json', { yearStrict: true })
walkWithSource(people, 'src/data/people.json')
walkWithSource(population, 'src/data/population.json', { yearStrict: false })
walkWithSource(factions, 'src/data/factions.json')

for (const [i, route] of CHINA_MARCH_ROUTES.entries()) {
  const loc = `src/data/marchRoutes.ts:CHINA_MARCH_ROUTES[${i}] (${route.id})`
  auditSourceField(loc, route.source, undefined)
  auditYearField(loc, route.year, true)
}

for (const [i, zone] of FRONTIER_ZONES.entries()) {
  const loc = `src/data/marchRoutes.ts:FRONTIER_ZONES[${i}] (${zone.id})`
  if ('source' in zone && typeof zone.source === 'string') {
    auditSourceField(loc, zone.source, undefined)
  }
}

walkWithSource(PERSON_PROFILES, 'src/data/personProfiles.ts')
walkWithSource(FACTION_ARTICLES, 'src/data/factionArticles.ts')
walkWithSource(SANGUO_SITUATION, 'src/data/factionSituation.ts')
walkWithSource(UNREGISTERED_AFTER_280, 'src/data/unregisteredHouseholds.ts')
auditSourceField(
  'src/data/unregisteredHouseholds.ts:LEAD_SOURCE',
  UNREGISTERED_AFTER_280_LEAD_SOURCE,
  undefined,
)

for (const row of timeline) {
  const detail = timelineDetailFor(row.id)
  if (detail) {
    walkWithSource(detail, `src/data/timelineDetails.ts:${row.id}`)
  }
}

scanStringsForYanyi(battles, 'src/data/battles.json')
scanStringsForYanyi(timeline, 'src/data/timeline.json')
scanStringsForYanyi(people, 'src/data/people.json')
scanStringsForYanyi(population, 'src/data/population.json')
scanStringsForYanyi(READING_LAYERS, 'src/data/readingLayers.ts')
scanStringsForYanyi(SANGUO_SITUATION, 'src/data/factionSituation.ts')
scanStringsForYanyi(UNREGISTERED_AFTER_280, 'src/data/unregisteredHouseholds.ts')
scanStringsForYanyi(wuxiLegendNote(280), 'unregisteredHouseholds.wuxiLegendNote')

scanUiFiles()

// --- 報告 ---

const fails = issues.filter((i) => i.level === 'fail')
const warns = issues.filter((i) => i.level === 'warn')

const byCode = (list: Issue[]) => {
  const m = new Map<string, number>()
  for (const i of list) {
    m.set(i.code, (m.get(i.code) ?? 0) + 1)
  }
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
}

function formatList(list: Issue[]): string {
  if (list.length === 0) return '_（無）_\n'
  return (
    list
      .map(
        (i) =>
          `- **${i.code}** · \`${i.location}\` — ${i.message}`,
      )
      .join('\n') + '\n'
  )
}

const generatedAt = new Date().toISOString()

const md = `# 三國志資料稽核報告

由 \`npm run audit:data\` 產生。範圍：\`src/data/\` 三國專題（184–280），另掃描 \`SanguozhiApp\` 與 \`src/components/**\` 簡體字。

**產生時間：** ${generatedAt}

## 摘要

| 級別 | 數量 |
|------|------|
| fail | ${fails.length} |
| warn | ${warns.length} |

### fail 按 code

${byCode(fails).map(([c, n]) => `- \`${c}\`: ${n}`).join('\n') || '_（無）_'}

### warn 按 code

${byCode(warns).map(([c, n]) => `- \`${c}\`: ${n}`).join('\n') || '_（無）_'}

## 規則

1. 每筆含 \`source\` 的資料列須非空，且含《書名·卷／篇》。
2. \`disputed: true\` 須有 \`note\`。
3. 事件／戰役／行軍 \`year\` 須在 184–280（人口對照年等例外為 warn）。
4. 主 \`source\` 允許：三國志、裴注、後漢書、資治通鑑、晉書；**宋書** 僅可出現在 \`note\` 並標「後代史回溯」。
5. 演義專屬情節（草船借箭、空城計、桃園結義、溫酒斬華雄、連環計）→ warn（三顧茅廬不在此列）。
6. 簡體專用字 → warn。

## fail 明細

${formatList(fails)}

## warn 明細

${formatList(warns)}

---

稽核腳本：\`scripts/audit-data.ts\`。CI 見 \`.github/workflows/check.yml\`。
`

writeFileSync(join(ROOT, 'docs/AUDIT.md'), md, 'utf8')

console.log(`audit:data — fail ${fails.length}, warn ${warns.length}`)
console.log(`Report: docs/AUDIT.md`)

if (fails.length > 0) {
  process.exitCode = 1
}
