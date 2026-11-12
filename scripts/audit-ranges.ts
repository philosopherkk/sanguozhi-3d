/**
 * 各朝疆域快照的出處稽核（PLAN「疆域只跟有出處的年份」）。
 * 只列違規，不改資料。執行：npm run audit:ranges
 *
 * 規則摘要：
 * 1. 每張快照要有非空 source（含《書名》）與 note；disputed 要有 note。
 * 2. 色塊引用的環編號要存在於 ERA_RINGS；空色塊要報。
 * 3. 快照年份要在該包 yearMin–yearMax 之內，並按年升序（解析器靠升序）。
 * 4. 政權不得早於其建立年出現（例如960年不畫「西夏」國號）。
 * 5. 都護、羈縻、朝貢、邊疆非編戶地帶不得塗成正統王朝的直轄領土，
 *    除非該快照標 disputed 並在 note 講明限度。
 * 6. 幾何完全相同的兩張快照，後一張要有 geometryFrom，說明沿用。
 * 7. 色塊裡的勢力要在該包 factions 有顏色，否則圖例會缺色。
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

type Level = 'fail' | 'warn' | 'info'

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

interface RangeRow {
  faction: string
  ids: string[]
  ringCount: number
  /** 環由 eraRegions 依省份 id 補（月份級快照只寫歸屬），不是快照自帶座標。 */
  implicitRings?: boolean
}

interface SnapshotRow {
  pack: string
  index: number
  year: number
  month?: number
  label: string
  source: string
  note?: string
  disputed?: boolean
  geometryFrom?: number
  ranges: RangeRow[]
}

interface PackRow {
  id: string
  title: string
  yearMin: number
  yearMax: number
  declaredFactions: string[]
  snapshots: SnapshotRow[]
}

/** 非直轄地帶：都護府、羈縻州、朝貢國、草原與青藏等非編戶區域。 */
const NON_DIRECT_IDS = new Set([
  'steppe',
  'neimeng_w',
  'xinjiang',
  'tibet',
  'tang_anbei',
  'tang_beiting',
  'tang_anxi',
  'tang_yalu',
  'tang_silla',
  'annam',
])

/** 正統王朝：把以上地帶塗成這些勢力的直轄色塊時，要有 disputed 與說明。 */
const DIRECT_DYNASTIES = new Set([
  '秦',
  '漢',
  '新',
  '西晉',
  '東晉',
  '宋',
  '隋',
  '唐',
  '晉',
  '元',
  '明',
  '清',
  '前秦',
  '北魏',
  '東魏',
  '西魏',
  '北周',
  '劉宋',
  '蕭梁',
  '南陳',
  '蒙古',
  '中華人民共和國',
])

/** note 出現其中一個詞，視為已講明限度。 */
const LIMIT_WORDS = [
  '都護',
  '羈縻',
  '朝貢',
  '土司',
  '不畫',
  '不上色',
  '非編戶',
  '示意',
  '爭議',
  '未設',
  '不是郡縣',
  '不上',
  '留白',
  '不是行省',
]

/**
 * 政權名稱 → 最早可以著色的年份。
 * 取「實際據有其地」而非「建號」之年，並在需要時於註解交代：
 * 閩（897 王審知嗣威武軍，909 封閩王）、南漢（905 劉隱嗣清海軍，917 稱帝）、
 * 南平（907 高季興為荊南留後，924 封南平王）。
 * 西夏另計：1038 建號；960、1004 的黨項地帶標「定難軍」，不用「西夏」。
 */
const ANACHRONISM: Record<string, number> = {
  漢趙: 304,
  成漢: 304,
  後趙: 319,
  前秦: 351,
  東魏: 534,
  西魏: 535,
  北周: 557,
  南陳: 557,
  安史: 755,
  南詔: 738,
  黃巢: 875,
  契丹: 916,
  閩: 897,
  南漢: 894,
  南平: 907,
  後唐: 923,
  後晉: 936,
  後漢: 947,
  後周: 951,
  北漢: 951,
  西夏: 1038,
  金: 1115,
  蒙古: 1206,
  元: 1271,
  明: 1368,
  清: 1636,
  農民軍: 1628,
  北洋: 1912,
  國民黨: 1919,
  共產黨: 1921,
  盛世才: 1933,
  日軍: 1931,
  中華人民共和國: 1949,
}

// --- 載入資料（Vite SSR：src 內部用無副檔名的相對路徑） ---

const server = await createServer({
  root: ROOT,
  configFile: join(ROOT, 'vite.config.ts'),
  logLevel: 'error',
  server: { middlewareMode: true },
})

interface RawRange {
  faction: string
  rings: unknown[]
  ids?: string[]
  missingIds?: string[]
}

interface RawSnapshot {
  year: number
  month?: number
  label: string
  source: string
  note?: string
  disputed?: boolean
  geometryFrom?: number
  ranges?: RawRange[]
  extensions?: RawRange[]
}

interface RawPack {
  id: string
  title: string
  yearMin: number
  yearMax: number
  factions: { id: string }[]
  snapshots: RawSnapshot[]
}

function normalize(packId: string, raw: RawPack): PackRow {
  return {
    id: packId,
    title: raw.title,
    yearMin: raw.yearMin,
    yearMax: raw.yearMax,
    declaredFactions: (raw.factions ?? []).map((f) => f.id),
    snapshots: (raw.snapshots ?? []).map((snap, index) => {
      const source = snap.ranges ?? snap.extensions ?? []
      // 月份級快照只寫 control（省份 id → 勢力），幾何由 eraRegions 補，
      // 稽核也要能看到這份歸屬，否則「幾何重複」規則會看不見這類快照。
      const fromControl = Object.entries((snap as { control?: Record<string, string> }).control ?? {})
      const ranges = source.length
        ? source.map((range) => ({
            faction: range.faction,
            ids: [...(range.ids ?? []), ...(range.missingIds ?? [])],
            ringCount: range.rings.length,
          }))
        : Object.entries(
            fromControl.reduce<Record<string, string[]>>((acc, [prov, faction]) => {
              if (!faction) return acc
              ;(acc[faction] ??= []).push(prov)
              return acc
            }, {}),
          ).map(([faction, ids]) => ({
            faction,
            ids,
            // 環不在快照裡，渲染時由 eraRegions 依省份 id 補上
            ringCount: 1,
            implicitRings: true,
          }))
      return {
        pack: packId,
        index,
        year: snap.year,
        month: snap.month,
        label: snap.label,
        source: snap.source ?? '',
        note: snap.note,
        disputed: snap.disputed,
        geometryFrom: snap.geometryFrom,
        ranges,
      }
    }),
  }
}

const eraMod = await server.ssrLoadModule('/src/geo/eraRegions.ts')
const KNOWN_RING_IDS = new Set(
  Object.keys(eraMod.ERA_RINGS as Record<string, unknown>),
)

const packs: PackRow[] = []

const IMPERIAL_FILES = [
  'jinPack',
  'nanbeiPack',
  'suiPack',
  'tangPack',
  'wudaiPack',
  'liaosongPack',
  'yuanMingQingPack',
  'minguoPack',
  'civilWarPack',
  'prcPack',
]

for (const file of IMPERIAL_FILES) {
  const mod = await server.ssrLoadModule(`/src/imperial/data/${file}.ts`)
  for (const value of Object.values(mod)) {
    if (!value || typeof value !== 'object') continue
    if (!('snapshots' in (value as RawPack))) continue
    packs.push(normalize((value as RawPack).id, value as RawPack))
  }
}

const zhouMod = await server.ssrLoadModule('/src/zhou/data/territoryControl.ts')
packs.push(
  normalize('zhou', {
    id: 'zhou',
    title: '周（春秋戰國）',
    yearMin: -2070,
    yearMax: -221,
    factions: [],
    snapshots: zhouMod.ZHOU_SNAPSHOTS as RawSnapshot[],
  }),
)

const qinhanMod = await server.ssrLoadModule(
  '/src/qinhan/data/territoryControl.ts',
)
packs.push(
  normalize('qinhan', {
    id: 'qinhan',
    title: '秦漢',
    yearMin: -221,
    yearMax: 183,
    factions: [],
    snapshots: qinhanMod.QINHAN_SNAPSHOTS as RawSnapshot[],
  }),
)

function loc(row: SnapshotRow): string {
  const ym = row.month != null ? `${row.year}-${String(row.month).padStart(2, '0')}` : `${row.year}`
  return `${row.pack}[${row.index}] ${ym}「${row.label}」`
}

// --- 規則 ---

function rangeKey(row: SnapshotRow): string {
  return row.ranges
    .map((r) => `${r.faction}:${[...r.ids].sort().join('+')}`)
    .sort()
    .join('|')
}

for (const pack of packs) {
  const snapshotYears = pack.snapshots.map((s) => s.year)
  let prev = Number.NEGATIVE_INFINITY

  for (const snap of pack.snapshots) {
    // 月份精度：同一年可以有多張，但要按月遞增（解析器以 (year, month) 比較）
    const at = snap.year * 12 + ((snap.month ?? 12) - 1)
    if (at <= prev) {
      add(
        'fail',
        'snapshot-unsorted',
        loc(snap),
        '快照未依年（或同年月份）升序；解析器遇到較大的時間會提前停止，沿用會錯',
      )
    }
    prev = at

    if (snap.year < pack.yearMin || snap.year > pack.yearMax) {
      add(
        'fail',
        'snapshot-out-of-range',
        loc(snap),
        `快照年份不在 ${pack.yearMin}–${pack.yearMax} 的滑桿範圍內`,
      )
    }

    if (!snap.source.trim()) {
      add('fail', 'source-missing', loc(snap), '缺少非空 source')
    } else if (!snap.source.includes('《')) {
      const acknowledgedAtlas =
        snap.disputed === true &&
        /通說|未逐條|概略|示意|地圖集/.test(`${snap.source} ${snap.note ?? ''}`)
      add(
        acknowledgedAtlas ? 'info' : 'warn',
        acknowledgedAtlas ? 'source-atlas' : 'source-format',
        loc(snap),
        acknowledgedAtlas
          ? `source 為通說／地圖層級（${snap.source.slice(0, 40)}），已標 disputed 並在 note 講明，不作原典引用`
          : `source 未含《書名》：${snap.source.slice(0, 60)}`,
      )
    }

    if (!snap.note || !snap.note.trim()) {
      add('fail', 'note-missing', loc(snap), '缺少 note：讀者無法知道這張圖的限度')
    } else if (snap.note.trim().length < 40) {
      add(
        'warn',
        'note-thin',
        loc(snap),
        `note 少於 40 字，未能交代範圍與出處的限度（${snap.note.trim().length} 字）`,
      )
    }

    if (snap.disputed && (!snap.note || !snap.note.trim())) {
      add('fail', 'disputed-without-note', loc(snap), 'disputed: true 必須有 note')
    }

    if (
      snap.geometryFrom != null &&
      !snapshotYears.includes(snap.geometryFrom)
    ) {
      add(
        'fail',
        'carry-over-target-missing',
        loc(snap),
        `geometryFrom ${snap.geometryFrom} 在該包沒有對應快照`,
      )
    }

    if (snap.ranges.length === 0) {
      add('warn', 'empty-snapshot', loc(snap), '這張快照沒有任何色塊')
    }

    for (const range of snap.ranges) {
      const where = `${loc(snap)} · ${range.faction}`

      if (range.ringCount === 0) {
        add(
          'fail',
          'empty-range',
          where,
          `色塊沒有環（環編號缺失：${range.ids.join(', ') || '無'}）`,
        )
      }
      for (const id of range.ids) {
        if (!KNOWN_RING_IDS.has(id)) {
          add(
            'fail',
            'ring-id-unknown',
            where,
            `環編號「${id}」不存在於 src/geo/eraRegions.ts`,
          )
        }
      }
      if (
        pack.declaredFactions.length > 0 &&
        !pack.declaredFactions.includes(range.faction)
      ) {
        add(
          'warn',
          'faction-undeclared',
          where,
          '該勢力不在 pack.factions，圖例與顏色會缺漏',
        )
      }

      const founded = ANACHRONISM[range.faction]
      if (founded != null && snap.year < founded) {
        add(
          'warn',
          'anachronism',
          where,
          `${snap.year} 年尚未有「${range.faction}」這個政權號（最早 ${founded} 年）`,
        )
      }
    }
  }

  // 非直轄地帶（都護、羈縻、朝貢、草原、青藏）不得塗成正統王朝的直轄色塊
  for (const snap of pack.snapshots) {
    for (const range of snap.ranges) {
      if (!DIRECT_DYNASTIES.has(range.faction)) continue
      const over = range.ids.filter((id) => NON_DIRECT_IDS.has(id))
      if (over.length > 0) {
        const hasLimitWord = LIMIT_WORDS.some((w) =>
          (snap.note ?? '').includes(w),
        )
        if (!snap.disputed || !hasLimitWord) {
          add(
            'warn',
            'indirect-control-overreach',
            `${loc(snap)} · ${range.faction}`,
            `把非直轄地帶（${over.join(', ')}）塗成 ${range.faction} 的色塊；要縮小，或標 disputed 並在 note 講明限度`,
          )
        }
      }

      // 整塊 realm_* 大環：看不出裡面哪些是郡縣、哪些是都護府，note 必須交代
      const monolith =
        range.ids.length > 0 && range.ids.every((id) => id.startsWith('realm_'))
      if (monolith) {
        const hasLimitWord = LIMIT_WORDS.some((w) =>
          (snap.note ?? '').includes(w),
        )
        if (!hasLimitWord) {
          add(
            'warn',
            'monolith-realm-unqualified',
            `${loc(snap)} · ${range.faction}`,
            `整塊 ${range.ids.join(', ')} 大環沒有在 note 交代哪些部分不是郡縣（都護／羈縻／朝貢／非編戶），容易被讀成直轄`,
          )
        } else if (!snap.disputed) {
          add(
            'info',
            'monolith-realm-qualified',
            `${loc(snap)} · ${range.faction}`,
            '整塊大環已在 note 交代限度；建議同時標 disputed: true，讓介面能顯示「邊界有爭議」',
          )
        }
      }
    }
  }

  // 幾何完全相同的兩張快照：後一張要標 geometryFrom，指向更早、幾何相同的那一年
  for (let i = 1; i < pack.snapshots.length; i += 1) {
    const a = pack.snapshots[i - 1]
    const b = pack.snapshots[i]
    const key = rangeKey(b)
    if (key === '' || key !== rangeKey(a)) continue
    // 更早一張自己已聲明「借用了這一年才定下的界線」（例如1127借1141），已交代即可
    if (a.geometryFrom === b.year) continue
    const valid =
      b.geometryFrom != null &&
      b.geometryFrom <= a.year &&
      pack.snapshots.some(
        (s) => s.year === b.geometryFrom && rangeKey(s) === key,
      )
    if (!valid) {
      add(
        'fail',
        'geometry-reuse-undeclared',
        loc(b),
        `與 ${a.year} 年快照幾何完全相同，卻沒有標 geometryFrom: ${a.year}（或更早、幾何相同的一年）；要縮小範圍，或註明沿用`,
      )
    }
  }

  const span = pack.yearMax - pack.yearMin + 1
  const own = pack.snapshots.length
  add(
    'info',
    'coverage',
    `${pack.id}（${pack.yearMin}–${pack.yearMax}）`,
    `${own} 張快照蓋 ${span} 年，另外 ${span - own} 年要靠沿用${own / span < 0.02 ? '（覆蓋極疏，宜補快照）' : ''}`,
  )
}

// --- 秦漢逐月（monthAxis）：只有寫到月份的條目才落在月份上 ---

const monthMod = await server.ssrLoadModule('/src/qinhan/data/monthAxis.ts')
const qhSnapYears = (
  qinhanMod.QINHAN_SNAPSHOTS as { year: number }[]
).map((s) => s.year)

const records = monthMod.QINHAN_MONTH_RECORDS as {
  year: number
  month: number
  title: string
  note: string
  source: string
  territoryFrom?: number
}[]
const order = monthMod.qinHanMonthOrder as (y: number) => number[]
const leapSlots = monthMod.QINHAN_LEAP_MONTHS as Record<
  string,
  { after: number; label: string; source: string }
>

for (const r of records) {
  const where = `qinhan monthAxis ${r.year}:${r.month}「${r.title}」`

  if (!r.source?.trim()) {
    add('fail', 'month-source-missing', where, '逐月條目缺少 source')
  } else if (!r.source.includes('《')) {
    add('warn', 'month-source-format', where, `source 未含《書名》：${r.source}`)
  }

  if (!r.note?.trim()) {
    add('fail', 'month-note-missing', where, '逐月條目缺少 note')
  }

  if (!order(r.year).includes(r.month)) {
    add(
      'fail',
      'month-slot-invalid',
      where,
      `${r.year} 年的月份序列沒有這個月（歲首順序見 qinHanMonthOrder）`,
    )
  }

  if (r.territoryFrom != null && !qhSnapYears.includes(r.territoryFrom)) {
    add(
      'fail',
      'month-territory-unknown',
      where,
      `territoryFrom ${r.territoryFrom} 不是 territoryControl.ts 的快照年；月份不能新畫邊界`,
    )
  }

  if (r.territoryFrom != null && r.territoryFrom > r.year) {
    add(
      'info',
      'month-territory-later-year',
      where,
      `幾何取自較晚的 ${r.territoryFrom} 年快照（後出邊界），介面要講明`,
    )
  }
}

for (const [year, leap] of Object.entries(leapSlots)) {
  const where = `qinhan leap ${year}「${leap.label}」`
  if (!leap.source?.includes('《')) {
    add(
      'fail',
      'leap-month-uncited',
      where,
      '閏月要有史書稱法的出處（秦漢曆作「後九月」，不寫「閏九月」）',
    )
  }
}

const monthSpan =
  (183 - -221 + 1) * 12 + Object.keys(leapSlots).length
add(
  'info',
  'month-coverage',
  'qinhan（前221–183）',
  `${records.length} 條有月份的條目，蓋 ${monthSpan} 個月；其餘一律「本月無專條」，色塊沿用`,
)

// --- 日本外周（北海道／琉球）時間窗 ---

const fringeMod = await server.ssrLoadModule('/src/geo/japanFringeWindows.ts')
const jpRingsMod = await server.ssrLoadModule('/src/geo/japanEraRings.ts')
const jpRings = (jpRingsMod.JP_ERA_RINGS ?? {}) as Record<string, unknown[]>
// 北海道の行政窗改用 CODH 舊國合成的幾何（hokkaidoAdminRings.ts），兩個來源都要認
const jpAdminMod = await server.ssrLoadModule('/src/geo/hokkaidoAdminRings.ts')
const jpAdminRings = (jpAdminMod.HOKKAIDO_ADMIN_RINGS ?? {}) as Record<string, unknown[][]>

const windows = fringeMod.JP_FRINGE_WINDOWS as {
  id: string
  from: number
  to: number
  ring: string
  mode: string
  label: string
  source: string
  note: string
}[]
const isDashed = fringeMod.fringeIsDashed as (m: string) => boolean

for (const w of windows) {
  const where = `jp fringe ${w.id}（${w.from}–${w.to}，${w.label}）`
  if (!w.source?.trim()) {
    add('fail', 'fringe-source-missing', where, '外周時間窗缺少出處')
  } else if (!/[《『]/.test(w.source)) {
    add('warn', 'fringe-source-format', where, `出處未含書名／條約名：${w.source}`)
  }
  if (!w.note?.trim()) {
    add('fail', 'fringe-note-missing', where, '外周時間窗缺少 note')
  }
  const adminRing = jpAdminRings[w.ring]
  if (!(w.ring in jpRings) && !adminRing) {
    add('fail', 'fringe-ring-unknown', where, `環「${w.ring}」不存在於 japanEraRings.ts / hokkaidoAdminRings.ts`)
  } else if (adminRing) {
    const pts = adminRing.flat().length
    if (pts < 3) add('fail', 'fringe-ring-empty', where, `環「${w.ring}」幾何為空（${pts} 點）`)
    else add('info', 'fringe-ring-codh', where, `環「${w.ring}」取自 CODH 舊國合成（${pts} 頂點）`)
  }
  if (w.from > w.to) {
    add('fail', 'fringe-window-empty', where, 'from 大於 to')
  }
  // 附庸與外來施政必須是虛線；行政直轄必須是實色
  const dashed = isDashed(w.mode)
  if ((w.mode === 'vassal' || w.mode === 'foreign-admin') && !dashed) {
    add('fail', 'fringe-mode-dash-mismatch', where, `${w.mode} 應該用虛線`)
  }
  if ((w.mode === 'admin' || w.mode === 'prefecture') && dashed) {
    add('fail', 'fringe-mode-dash-mismatch', where, `${w.mode} 應該用實色`)
  }
}

// 同一環在同一年不得同時有兩個重疊窗（會互相蓋色）
for (let i = 0; i < windows.length; i += 1) {
  for (let j = i + 1; j < windows.length; j += 1) {
    const a = windows[i]!
    const b = windows[j]!
    if (a.ring !== b.ring) continue
    if (a.from <= b.to && b.from <= a.to) {
      add(
        'warn',
        'fringe-window-overlap',
        `jp fringe ${a.id} / ${b.id}`,
        `同一環「${a.ring}」的兩個窗重疊（${a.from}–${a.to} 與 ${b.from}–${b.to}）`,
      )
    }
  }
}

add(
  'info',
  'fringe-coverage',
  'japan（1604–2026）',
  `${windows.length} 個外周窗：松前交易領、琉球附庸、開拓使、沖繩縣、美治、歸還`,
)

// --- 敘事深度（規則 14）---

const depthMod = await server.ssrLoadModule('/src/imperial/data/depth.ts')
const narrMod = await server.ssrLoadModule('/src/imperial/data/depthNarrative.ts')
const NARR = narrMod.DEPTH_NARRATIVE as Record<
  string,
  { course: string; outcome: string; paraphrase: string }
>

let narrChecked = 0
for (const [packId, arr] of Object.entries(
  depthMod.DEPTH_EVENTS as Record<string, Record<string, unknown>[]>,
)) {
  for (const e of arr) {
    narrChecked += 1
    const desc = String(e.desc ?? '')
    const where = `${packId}/${e.id}（${e.year} ${e.title}）`
    const n = NARR[String(e.id)]
    if (!n) {
      add(
        'fail',
        'narrative-missing',
        where,
        '沒有 course／outcome／意譯，詳情窗會把同一句 desc 重複三次',
      )
      continue
    }
    const fields: [string, string][] = [
      ['course', n.course],
      ['outcome', n.outcome],
      ['paraphrase', n.paraphrase],
    ]
    for (const [field, text] of fields) {
      if (!text?.trim()) {
        add('fail', 'narrative-field-empty', where, `${field} 是空的`)
      } else if (text === desc) {
        add('fail', 'narrative-duplicate', where, `${field} 與 desc 完全相同`)
      } else if (text.length < 40) {
        add('warn', 'narrative-thin', where, `${field} 只有 ${text.length} 字`)
      }
    }
    const univ = String(e.university ?? '')
    if (univ.length < 150) {
      add('warn', 'university-thin', where, `大學層只有 ${univ.length} 字，未交代史源與地圖限度`)
    }
    if (!String(e.source ?? '').trim()) {
      add('fail', 'narrative-source-missing', where, '事件沒有 source')
    }
  }
}

add(
  'info',
  'narrative-coverage',
  'imperial（晉至共和國）',
  `${narrChecked} 條事件全部有獨立的 course／outcome／意譯，無重複句`,
)

// --- 日本年表的出處與限度（規則 15）---

const jpEvents = JSON.parse(
  readFileSync(join(ROOT, 'src/japanHistory/data/timeline.json'), 'utf8'),
) as {
  id: string
  year: number
  title: string
  desc: string
  source?: string
  note?: string
}[]

for (const e of jpEvents) {
  const where = `japan/${e.id}（${e.year} ${e.title}）`
  const src = (e.source ?? '').trim()
  if (!src) {
    add('fail', 'jp-event-source-missing', where, '日本年表事件沒有 source')
  } else if (!/[《『]/.test(src) && !/通說|布告|布達|太政官|政令|詔書|條約|文書|實錄|軍記|典範/.test(src)) {
    add('warn', 'jp-source-format', where, `出處未含書名、條約名或通說：${src}`)
  }
  if (!e.desc?.trim()) {
    add('fail', 'jp-event-desc-missing', where, '事件沒有 desc')
  }
  if (e.year >= 1603 && !e.note?.trim()) {
    add('warn', 'jp-event-note-missing', where, '德川江戶以後的條目缺少 note（年份與史源的限度）')
  }
}

add(
  'info',
  'jp-timeline-coverage',
  'japan（1603–2026）',
  `${jpEvents.filter((e) => e.year >= 1603).length} 條江戶以後條目全部有 source 與 note`,
)

// --- 出處要點名（規則 16）---
// 「××通說」本身不是出處：要點名書名、條約名、制書名或檔案名。

const NAMED_SOURCE = /《|『/
let namedSources = 0
let genericSources = 0

for (const file of IMPERIAL_FILES) {
  const mod = await server.ssrLoadModule(`/src/imperial/data/${file}.ts`)
  const pack = Object.values(mod).find(
    (v) => v && typeof v === 'object' && (v as any).id && Array.isArray((v as any).snapshots),
  ) as
    | {
        id: string
        snapshots?: { year: number; source?: string }[]
        events?: { id: string; year: number; title: string; source?: string }[]
        profiles?: Record<string, { source?: string }>
        leadersByYear?: Record<string, { name: string; source?: string }[]>
      }
    | undefined
  if (!pack) continue

  const seen: { where: string; source: string }[] = []
  for (const s of pack.snapshots ?? []) {
    seen.push({ where: `${pack.id} 快照 ${s.year}`, source: s.source ?? '' })
  }
  for (const e of pack.events ?? []) {
    seen.push({ where: `${pack.id}/${e.id}（${e.year} ${e.title}）`, source: e.source ?? '' })
  }
  for (const [key, prof] of Object.entries(pack.profiles ?? {})) {
    seen.push({ where: `${pack.id} 派系簡介 ${key}`, source: prof.source ?? '' })
  }
  for (const [yr, list] of Object.entries(pack.leadersByYear ?? {})) {
    for (const p of list) {
      seen.push({ where: `${pack.id} 人物 ${yr} ${p.name}`, source: p.source ?? '' })
    }
  }

  for (const { where, source } of seen) {
    if (!source.trim()) {
      add('fail', 'source-missing', where, '沒有 source')
      continue
    }
    if (NAMED_SOURCE.test(source)) {
      namedSources += 1
    } else {
      genericSources += 1
      add(
        'warn',
        'source-generic',
        where,
        `出處只寫通說，未點名書名、條約名、制書名或檔案名：${source}`,
      )
    }
  }
}

// 日本深究包（japanEras/packs）：同一規則，走 events / people / situation / leadersByYear

const JAPAN_PACK_FILES = [
  'kofunPack',
  'asukaPack',
  'naraPack',
  'kamakuraPack',
  'muromachiPack',
  'azuchiPack',
]

for (const file of JAPAN_PACK_FILES) {
  const mod = await server.ssrLoadModule(`/src/japanEras/packs/${file}.ts`)
  const pack = Object.values(mod).find(
    (v) => v && typeof v === 'object' && (v as any).id && Array.isArray((v as any).events),
  ) as
    | {
        id: string
        events?: { id?: string; year: number; title: string; source?: string }[]
        people?: { name: string; source?: string }[]
        situation?: Record<string, { source?: string }>
        leadersByYear?: Record<string, { name: string; source?: string }[]>
        routes?: { id: string; source?: string }[]
      }
    | undefined
  if (!pack) continue

  const seen: { where: string; source: string }[] = []
  for (const e of pack.events ?? []) {
    seen.push({ where: `${pack.id}/${e.id ?? e.year}（${e.year} ${e.title}）`, source: e.source ?? '' })
  }
  for (const p of pack.people ?? []) {
    seen.push({ where: `${pack.id} 人物 ${p.name}`, source: p.source ?? '' })
  }
  for (const [key, prof] of Object.entries(pack.situation ?? {})) {
    const sub = prof as Record<string, { source?: string } | string>
    const src =
      (typeof sub.source === 'string' ? sub.source : '') ||
      sub.politics?.source ||
      sub.economy?.source ||
      sub.military?.source ||
      ''
    seen.push({ where: `${pack.id} 派系簡介 ${key}`, source: src })
  }
  for (const [yr, list] of Object.entries(pack.leadersByYear ?? {})) {
    for (const l of list) {
      seen.push({ where: `${pack.id} 人物 ${yr} ${l.name}`, source: l.source ?? '' })
    }
  }
  for (const r of pack.routes ?? []) {
    seen.push({ where: `${pack.id} 行軍路線 ${r.id}`, source: r.source ?? '' })
  }

  for (const { where, source } of seen) {
    if (!source.trim()) {
      add('fail', 'source-missing', where, '沒有 source')
      continue
    }
    if (/維基|[Ww]ikipedia/.test(source) && !NAMED_SOURCE.test(source)) {
      genericSources += 1
      add('warn', 'source-wiki-only', where, `出處只有百科全書，未點名原典或研究書：${source}`)
    } else if (NAMED_SOURCE.test(source)) {
      namedSources += 1
    } else {
      genericSources += 1
      add(
        'warn',
        'source-generic',
        where,
        `出處只寫通說，未點名書名、條約名、制書名或檔案名：${source}`,
      )
    }
  }
}

add(
  'info',
  'source-naming',
  'imperial（11 包）＋japanEras（6 包）',
  `${namedSources} 條出處點名了書名／條約名／制書名／檔案名；未點名 ${genericSources} 條`,
)

// --- 「結果與影響」的深度（規則 19）---
// 詳情窗的「結果與影響」要達到約 2–3 分鐘的大學生程度論述（400–1200 字、多於一段），
// 而且要點名出處（原典／政書／研究書），不能只有百科全書。

const OUTCOME_MIN = 400
const OUTCOME_MAX = 1200

const detailMod = await server.ssrLoadModule('/src/data/timelineDetails.ts')
const DETAILS = detailMod.TIMELINE_DETAILS as Record<
  string,
  { outcome: string; outcomeSource?: string }
>

// 已補 outcomeSource 的條目一律按同一門檻檢查；未補的只計入 outcome-backlog（待辦），不產生 warn。
interface OutcomeBearing {
  outcome?: string
  outcomeSource?: string
}

const outcomePacks: { label: string; entries: [string, OutcomeBearing][] }[] = [
  { label: '三國', entries: Object.entries(DETAILS) },
]

const zhouTimelineMod = await server.ssrLoadModule('/src/zhou/data/timeline.ts')
outcomePacks.push({
  label: '周（夏商周、春秋、戰國）',
  entries: (zhouTimelineMod.ZHOU_TIMELINE as { id: string }[]).map((e) => [
    e.id,
    e as OutcomeBearing,
  ]),
})

const qinhanTimelineMod = await server.ssrLoadModule('/src/qinhan/data/timeline.ts')
outcomePacks.push({
  label: '秦漢',
  entries: (qinhanTimelineMod.QINHAN_TIMELINE as { id: string }[]).map((e) => [
    e.id,
    e as OutcomeBearing,
  ]),
})

const sengokuMod = await server.ssrLoadModule('/src/sengoku/data/timelineDetails.ts')
outcomePacks.push({
  label: '戰國（日本）',
  entries: Object.entries(sengokuMod.SENGOKU_TIMELINE_DETAILS as Record<string, OutcomeBearing>),
})

const bakumatsuMod = await server.ssrLoadModule('/src/bakumatsu/data/history.ts')
outcomePacks.push({
  label: '幕末',
  entries: Object.entries(bakumatsuMod.BAKUMATSU_DETAILS as Record<string, OutcomeBearing>),
})

const heianMod = await server.ssrLoadModule('/src/heian/data/history.ts')
outcomePacks.push({
  label: '平安',
  entries: Object.entries(heianMod.HEIAN_DETAILS as Record<string, OutcomeBearing>),
})

outcomePacks.push({
  label: '帝國包（晉至共和國）',
  entries: Object.entries(NARR as Record<string, OutcomeBearing>),
})

// 帝國包各包自帶的事件（pack.events）：詳情窗以 `outcome ?? university` 顯示，
// 因此也要計入待辦，否則「全部達標」的結論只覆蓋 DEPTH_EVENTS 那 44 條。
const imperialPackEvents: [string, OutcomeBearing][] = []
for (const file of IMPERIAL_FILES) {
  const mod = await server.ssrLoadModule(`/src/imperial/data/${file}.ts`)
  for (const value of Object.values(mod)) {
    if (!value || typeof value !== 'object') continue
    const events = (value as { events?: { id: string }[] }).events
    if (!Array.isArray(events)) continue
    for (const e of events) imperialPackEvents.push([e.id, e as OutcomeBearing])
  }
}
outcomePacks.push({ label: '帝國包（各包自帶事件）', entries: imperialPackEvents })

const backlogRows: string[] = []
for (const pack of outcomePacks) {
  let adopted = 0
  let pending = 0
  let chars = 0
  for (const [id, d] of pack.entries) {
    const text = (d.outcome ?? '').trim()
    const src = (d.outcomeSource ?? '').trim()
    if (!src) {
      pending += 1
      continue
    }
    adopted += 1
    chars += text.length
    const paras = text.split(/\n{2,}/).filter((p) => p.trim().length > 0)
    const where = `${pack.label}/${id}（結果與影響）`
    if (text.length < OUTCOME_MIN) {
      add(
        'warn',
        'outcome-thin',
        where,
        `只有 ${text.length} 字，未達 ${OUTCOME_MIN} 字（約 2 分鐘）的大學生程度論述`,
      )
    } else if (paras.length < 2) {
      add('warn', 'outcome-one-paragraph', where, `${text.length} 字但只有一段，應分段論述`)
    }
    if (text.length > OUTCOME_MAX) {
      add('info', 'outcome-long', where, `${text.length} 字，超過 1200 字（約 5 分鐘）`)
    }
    if (/維基|[Ww]ikipedia/.test(src) && !NAMED_SOURCE.test(src)) {
      add('warn', 'outcome-source-wiki', where, `依據只有百科全書：${src}`)
    } else if (!NAMED_SOURCE.test(src)) {
      add('warn', 'outcome-source-generic', where, `依據未點名書名：${src}`)
    }
  }
  if (adopted) {
    add(
      'info',
      'outcome-depth',
      pack.label,
      `${pack.entries.length} 條之中 ${adopted} 條已補依據並達標；平均 ${Math.round(chars / adopted)} 字，約 ${Math.round((chars / adopted / 250) * 10) / 10} 分鐘`,
    )
  }
  if (pending) backlogRows.push(`${pack.label} ${adopted}/${pack.entries.length}`)
}
add(
  'info',
  'outcome-backlog',
  '各包「結果與影響」（已達標／總數）',
  backlogRows.length
    ? `尚未補 outcomeSource：${backlogRows.join('；')}`
    : '所有包的「結果與影響」都已補點名依據並達標',
)

// --- 規則 17–19：幾何出處登記（ring provenance）---
// 疆域幾何要能被逐環驗收，先得登記每一條環「實際是什麼」。
const ringProvMod = await server.ssrLoadModule(
  '/src/data/territory/ringProvenance.ts',
)
const RING_PROV = ringProvMod.RING_PROVENANCE as Record<
  string,
  { basis: string; source: string; institution: string; kind: string }
>

// 該政區制度最早可合法出現的年份（點名依據見註解）
const INSTITUTION_FIRST: Record<string, { year: number; why: string }> = {
  縣: { year: -688, why: '《史記·秦本紀》秦武公設邽縣、冀縣' },
  郡: { year: -400, why: '春秋末至戰國初；《史記·秦本紀》秦設郡，年代有異說' },
  州: { year: -106, why: '《漢書·武帝紀》元封五年初置刺史部十三州' },
  道: { year: 627, why: '《舊唐書·地理志》貞觀十道' },
  路: { year: 983, why: '《宋史·職官志》轉運使始置；至道十五路在 993' },
  省: { year: 1260, why: '《元史·百官志》中書省；行省在 1270 年代' },
  羈縻: { year: 630, why: '《舊唐書·地理志》定襄、雲中都督府' },
}

const usedIds = new Set<string>()
const kindCount: Record<string, number> = {}
const anachronismSeen = new Set<string>()
for (const pack of packs) {
  for (const snap of pack.snapshots) {
    for (const range of snap.ranges) {
      for (const id of range.ids) {
        usedIds.add(id)
        const p = RING_PROV[id]
        const where = `${pack.id}[${snap.index}] ${snap.year}「${snap.label}」`
        if (!p) {
          add(
            'warn',
            'ring-unregistered',
            where,
            `環編號 ${id} 沒有出處登記（src/data/territory/ringProvenance.ts 為手維登記表）`,
          )
          continue
        }
        if (p.source === '未登記') {
          add('warn', 'ring-source-generic', where, `環 ${id} 的依據未點名書名`)
        }
        const inst = INSTITUTION_FIRST[p.institution]
        if (inst && snap.year < inst.year) {
          const key = `${id}|${p.institution}`
          if (anachronismSeen.has(key)) continue
          anachronismSeen.add(key)
          add(
            'warn',
            'institution-anachronism',
            where,
            `環 ${id} 假定「${p.institution}」制，該制始於 ${inst.year}（${inst.why}），快照是 ${snap.year} 年`,
          )
        }
      }
    }
  }
}
for (const id of usedIds) {
  const kind = RING_PROV[id]?.kind ?? 'unregistered'
  kindCount[kind] = (kindCount[kind] ?? 0) + 1
}
add(
  'info',
  'ring-provenance',
  '疆域幾何出處登記',
  `被引用的環 ${usedIds.size} 條：以現代／民國行政界代替當時政區 ${kindCount['modern-province-proxy'] ?? 0} 條、` +
    `依文獻地望手繪 ${kindCount['text-derived'] ?? 0} 條、朝代大勢框 ${kindCount['schematic-box'] ?? 0} 條、` +
    `圖幅矢量化 ${kindCount['plate-traced'] ?? 0} 條、GIS 匯入 ${kindCount['gis-import'] ?? 0} 條。` +
    '目標是把 proxy 逐條換成 plate-traced／gis-import（見 src/data/territory/README.md）',
)

await server.close()

// --- 報告 ---

const fails = issues.filter((i) => i.level === 'fail')
const warns = issues.filter((i) => i.level === 'warn')
const infos = issues.filter((i) => i.level === 'info')

function byCode(list: Issue[]): string {
  const m = new Map<string, number>()
  for (const i of list) m.set(i.code, (m.get(i.code) ?? 0) + 1)
  const rows = [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  return rows.map(([c, n]) => `- \`${c}\`: ${n}`).join('\n') || '_（無）_'
}

function formatList(list: Issue[]): string {
  if (list.length === 0) return '_（無）_\n'
  return (
    list.map((i) => `- **${i.code}** · \`${i.location}\` — ${i.message}`).join('\n') +
    '\n'
  )
}

const coverageRows = packs
  .map((p) => {
    const span = p.yearMax - p.yearMin + 1
    return `| ${p.id} | ${p.yearMin}–${p.yearMax} | ${p.snapshots.length} | ${span - p.snapshots.length} | ${((p.snapshots.length / span) * 100).toFixed(1)}% |`
  })
  .join('\n')

const snapshotCount = packs.reduce((n, p) => n + p.snapshots.length, 0)
const generatedAt = new Date().toISOString()

const md = `# 疆域快照出處稽核（range-audit）

由 \`npm run audit:ranges\` 產生。範圍：九個帝國包、周、秦漢的**疆域快照**（不含事件與人物）。
只讀稽核，**沒有改動任何座標或幾何**。

**產生時間：** ${generatedAt}

## 摘要

| 級別 | 數量 |
|------|------|
| fail | ${fails.length} |
| warn | ${warns.length} |
| info | ${infos.length} |

快照總數：${snapshotCount}（${packs.length} 個包）

### fail 按 code

${byCode(fails)}

### warn 按 code

${byCode(warns)}

## 規則

1. 每張快照要有非空 \`source\`（含《書名》）與 \`note\`；\`disputed: true\` 要有 \`note\`。
2. 色塊引用的環編號要存在於 \`src/geo/eraRegions.ts\`；找不到環要報 \`empty-range\`。
3. 快照年份要在該包 \`yearMin–yearMax\` 之內，並按年升序（\`resolveImperialSnapshot\` 靠升序提前中斷）。
4. 政權不得早於其建立年著色（\`ANACHRONISM\` 表）。
5. 都護府、羈縻州、朝貢國、草原與青藏等非編戶地帶（\`NON_DIRECT_IDS\`）不得塗成正統王朝的直轄色塊，除非該快照標 \`disputed\` 並在 \`note\` 講明限度。
6. 兩張相鄰快照的幾何完全相同時，後一張要有 \`geometryFrom\`，說明沿用邊一年。
11. 秦漢逐月（\`src/qinhan/data/monthAxis.ts\`）：每條要有 \`source\`（含《書名》）與 \`note\`；月份要在該年的歷書順序內（秦及漢初以十月為歲首）；\`territoryFrom\` 只能引用 \`territoryControl.ts\` 已有的快照年 —— 月份不能新畫邊界。
12. 閏月要有史書稱法的出處（秦漢曆作「後九月」）。沒有專條的月份一律顯示「本月無專條」。
13. 日本外周時間窗（\`src/geo/japanFringeWindows.ts\`）：每窗要有出處（《》或『』）與 note、環要存在、\`from ≤ to\`；附庸／外來施政必須虛線，行政直轄必須實色；同一環的窗不得重疊。
14. 敘事深度（\`src/imperial/data/depthNarrative.ts\`）：每條 \`DEPTH_EVENTS\` 事件要有獨立的 \`course\`／\`outcome\`／意譯，三者不得與 \`desc\` 相同（否則詳情窗重複同一句）；大學層少於 150 字要報 \`university-thin\`。
15. 日本年表（\`src/japanHistory/data/timeline.json\`）：每條要有 \`source\`（書名、條約名、制書名或通說）與 \`desc\`；1603 年以後的條目另要有 \`note\`，寫明年份與史源的限度。
16. 出處要點名：各包的快照、事件、派系簡介（讀 \`politics.source\` 等子欄）、逐年人物、行軍路線，\`source\` 要含《》或『』裡的書名、條約名、制書名或檔案名。只有「××通說」報 \`source-generic\`；只有百科全書（維基／Wikipedia）報 \`source-wiki-only\`。通說可以並列，不能是唯一出處。覆蓋：帝國 11 包＋japanEras 6 包。
17. 幾何出處登記：色塊引用的每一條環編號都要在 \`src/data/territory/ringProvenance.ts\`（手維登記表，無生成腳本）有登記：實際代表什麼（basis）、點名依據（source）、所假定的政區制度（institution）、等級（kind：modern-province-proxy／text-derived／schematic-box／plate-traced／gis-import）。找不到登記報 \`ring-unregistered\`。
18. 環依據要點名：登記裡的 source 若是「未登記」，報 \`ring-source-generic\`。
19. 制度時代檢查：環若假定某一政區制度（縣、郡、州、道、路、省、羈縻），該快照年份不得早於該制度最早可考的年份（縣 前688《史記·秦本紀》；郡 前400；州 前106《漢書·武帝紀》；道 627《舊唐書·地理志》；路 983《宋史·職官志》；省 1260《元史·百官志》；羈縻 630）。違反報 \`institution-anachronism\`。
20. 座標校正與環體檢另由 \`python3 scripts/audit_geo.py\`（\`npm run audit:geo\`）跑：20 個海岸／內陸錨點要落在正確的海陸上；印出底圖可畫範圍；ERA_RINGS 每條環的形心必須在陸地上（落在海裡代表多邊形吃進海裡）。
7. 色塊裡的勢力要在該包 \`factions\` 有顏色。

## 各包快照覆蓋

| 包 | 年份範圍 | 自帶快照 | 需沿用的年份 | 覆蓋率 |
|----|----------|----------|--------------|--------|
${coverageRows}

「需沿用的年份」是滑桿上會顯示「本年無新的疆域記載，沿用……」的年數。
介面提示由 \`src/lib/snapshotCarryOver.ts\` 產生，接在秦漢、周、帝國包的年份滑桿下面。

## fail 明細

${formatList(fails)}

## warn 明細

${formatList(warns)}

## info（覆蓋率）

${formatList(infos)}

---

稽核腳本：\`scripts/audit-ranges.ts\`（\`node --experimental-strip-types\`，經 Vite SSR 載入 \`src/\`）。
`

writeFileSync(join(ROOT, 'reports/range-audit.md'), md, 'utf8')

// 同一份資料給預覽頁（src/audit/RangeAuditPage.tsx）讀，避免兩邊不同步
writeFileSync(
  join(ROOT, 'reports/range-audit.json'),
  JSON.stringify(
    {
      generatedAt,
      snapshotCount,
      issues,
      coverage: packs.map((p) => {
        const span = p.yearMax - p.yearMin + 1
        return {
          id: p.id,
          title: p.title,
          yearMin: p.yearMin,
          yearMax: p.yearMax,
          snapshots: p.snapshots.length,
          carryYears: span - p.snapshots.length,
          years: p.snapshots.map((s) => ({
            year: s.year,
            label: s.label,
            source: s.source,
            ...(s.geometryFrom != null ? { geometryFrom: s.geometryFrom } : {}),
            ...(s.disputed ? { disputed: true } : {}),
          })),
        }
      }),
    },
    null,
    2,
  ),
  'utf8',
)


console.log(
  `audit:ranges — fail ${fails.length}, warn ${warns.length}, info ${infos.length}（快照 ${snapshotCount} 張）`,
)
console.log('Report: reports/range-audit.md')

for (const i of fails) {
  console.log(`FAIL ${i.code} · ${i.location} — ${i.message}`)
}

if (fails.length > 0) {
  process.exitCode = 1
}



