import { TRACED_DOMAINS } from '../../sengoku/data/tracedDomains'
import type { HeianFactionId } from '../types'
import {
  JAPAN_TERRITORY_NOTE_ZH,
  JAPAN_VORONOI_DOMAINS,
  type TerritoryGeometryProvenance,
} from '../../data/territory/provenance'

/** 借用戰國底圖的區塊形狀，改標平安末地名。不是元龜元年的大名。 */
export const HEIAN_TERRITORY_GEOMETRY_PROVENANCE: TerritoryGeometryProvenance =
  JAPAN_VORONOI_DOMAINS

export const HEIAN_TERRITORY_NOTE = JAPAN_TERRITORY_NOTE_ZH
const PLACE: Record<string, string> = {
  d0: '會津',
  d1: '甲斐・駿河',
  d2: '攝津',
  d3: '薩摩',
  d4: '陸奧北',
  d5: '陸奧南',
  d6: '山陽西',
  d7: '關東',
  d8: '豐後',
  d9: '近江',
  d10: '三河',
  d11: '越後',
  d12: '出雲',
  d13: '土佐',
  d14: '尾張',
  d15: '出羽',
  d16: '越前',
  d17: '肥前',
  d18: '奧羽',
  d19: '信濃',
  d20: '常陸',
  d21: '丹波・播磨',
  d22: '肥前西',
  d23: '讚岐・伊予',
  d24: '肥後',
  d25: '紀伊',
  d26: '安房',
  d27: '大隅',
}

export const HEIAN_DOMAINS = TRACED_DOMAINS.map((d) => ({
  id: d.id,
  name: PLACE[d.id] ?? d.id,
  ring: d.ring,
  extraRings: d.extraRings,
}))

const WEST = ['d6', 'd12']
const KINAI_ROAD = ['d21', 'd2']
const OMI = ['d9']
const TOKAI = ['d14', 'd10']
const KANTO = ['d7', 'd20', 'd26']
const SHINANO = ['d19']
const SHIKOKU = ['d23', 'd13']
const KYUSHU = ['d3', 'd8', 'd17', 'd22', 'd24', 'd27']
const OU = ['d0', 'd4', 'd5', 'd15', 'd18']

export const HEIAN_KEY_YEARS = [1156, 1159, 1180, 1183, 1184, 1185] as const
export type HeianKeyYear = (typeof HEIAN_KEY_YEARS)[number]

function paint(
  groups: [string[], HeianFactionId][],
  fallback: HeianFactionId,
): Record<string, HeianFactionId> {
  const out: Record<string, HeianFactionId> = {}
  for (const d of HEIAN_DOMAINS) out[d.id] = fallback
  for (const [ids, faction] of groups) {
    for (const id of ids) out[id] = faction
  }
  return out
}

export const HEIAN_TERRITORY_BY_YEAR: Record<
  HeianKeyYear,
  Record<string, HeianFactionId>
> = {
  /** 保元：兩氏都在京都打仗，尚未割據。西國著平氏，只表示清盛一系的活動地面。 */
  1156: paint(
    [
      [WEST, '平氏'],
      [KINAI_ROAD, '平氏'],
    ],
    '朝廷',
  ),
  /** 平治後平氏專軍權。源義朝已死，源氏沒有領地。 */
  1159: paint(
    [
      [WEST, '平氏'],
      [KINAI_ROAD, '平氏'],
      [TOKAI, '平氏'],
      [SHIKOKU, '平氏'],
    ],
    '朝廷',
  ),
  /** 賴朝據關東，義仲在信濃。平氏仍挾朝廷據畿內以西。近江著朝廷，表示京都仍在。 */
  1180: paint(
    [
      [OMI, '朝廷'],
      [OU, '朝廷'],
      [KANTO, '源氏'],
      [SHINANO, '源氏'],
    ],
    '平氏',
  ),
  /** 俱利伽羅後義仲入京，平氏西走。 */
  1183: paint(
    [
      [OMI, '朝廷'],
      [OU, '朝廷'],
      [WEST, '平氏'],
      [SHIKOKU, '平氏'],
      [KYUSHU, '平氏'],
    ],
    '源氏',
  ),
  /** 一之谷後平氏縮到山陽西端、四國與九州。 */
  1184: paint(
    [
      [OMI, '朝廷'],
      [OU, '朝廷'],
      [['d6'], '平氏'],
      [SHIKOKU, '平氏'],
      [KYUSHU, '平氏'],
    ],
    '源氏',
  ),
  /** 壇之浦後平氏滅亡。奧州藤原仍自立，三色圖裡暫著朝廷，並加註。 */
  1185: paint(
    [
      [OMI, '朝廷'],
      [OU, '朝廷'],
    ],
    '源氏',
  ),
}

const NOTES: Record<HeianKeyYear, string> = {
  1156: '保元時平清盛與源義朝同助後白河，色塊不是兩家對峙的國界。',
  1159: '平治後源氏沒有領地。色塊表示平氏專軍權，不是全國國衙改屬。',
  1180: '關東著源氏（賴朝），信濃著源氏（義仲）。奧羽不是源平的直接領地。',
  1183: '義仲入京後，平氏西走山陽、四國、九州。京都仍標朝廷。',
  1184: '一之谷後平氏失去攝津。山陽西端、讚岐與九州仍著平氏。',
  1185: '平氏滅亡。奧州藤原氏實際自立到1189年，此圖只有三色，奧羽暫著朝廷。',
}

export const HEIAN_MONTH_FROM = 1179
export const HEIAN_MONTH_TO = 1183

const tairaHold = HEIAN_TERRITORY_BY_YEAR[1159]
const genjiEast = HEIAN_TERRITORY_BY_YEAR[1180]
const afterKurikara = paint(
  [
    [OMI, '朝廷'],
    [OU, '朝廷'],
    [KANTO, '源氏'],
    [SHINANO, '源氏'],
    [['d11', 'd16'], '源氏'],
  ],
  '平氏',
)
const afterKyoto = HEIAN_TERRITORY_BY_YEAR[1183]

const HEIAN_MONTH_NOTES: Record<
  string,
  { note: string; control?: Record<string, HeianFactionId> }
> = {
  '1179-1': {
    note: '治承三年正月。平氏仍掌西國與東海道的軍權。本月無大型行軍。',
    control: tairaHold,
  },
  '1179-11': {
    note: '十一月清盛幽禁後白河，史稱治承政變。領地色不因此重畫。',
    control: tairaHold,
  },
  '1180-4': {
    note: '四月以仁王令旨。關東尚未被源氏占住。',
    control: tairaHold,
  },
  '1180-6': {
    note: '六月宇治之戰，以仁王戰死。同月遷都福原。平氏仍控西國。',
    control: tairaHold,
  },
  '1180-9': {
    note: '九月石橋山。賴朝戰敗，沿灣岸走安房。關東色仍未改源氏。',
    control: tairaHold,
  },
  '1180-11': {
    note: '十一月富士川。平維盛退走，關東與信濃改著源氏。',
    control: genjiEast,
  },
  '1180-12': {
    note: '十二月還都平安京。近江著朝廷，表示京都仍在，不是源氏的私領。',
    control: genjiEast,
  },
  '1181-3': {
    note: '三月清盛死。大軍不多動，色塊停在去年年底。',
    control: genjiEast,
  },
  '1182-1': {
    note: '養和、壽永饑饉。1182年各月沒有新的大型會戰，色塊沿1180年底。',
    control: genjiEast,
  },
  '1183-6': {
    note: '六月俱利伽羅。義仲破平氏，越後、越前改著源氏。京都仍在平氏。',
    control: afterKurikara,
  },
  '1183-8': {
    note: '八月義仲入京，平氏西走山陽、四國、九州。京都著朝廷。',
    control: afterKyoto,
  },
}

function heianMonthControl(
  year: number,
  month: number,
): { control: Record<string, HeianFactionId>; note: string } {
  let control = tairaHold
  let note = '治承年間。平氏仍掌軍權。'
  for (let y = HEIAN_MONTH_FROM; y <= year; y += 1) {
    const last = y === year ? month : 12
    for (let m = 1; m <= last; m += 1) {
      const hit = HEIAN_MONTH_NOTES[`${y}-${m}`]
      if (!hit) continue
      if (hit.control) control = hit.control
      note = hit.note
    }
  }
  return { control, note }
}

export function resolveHeianTerritoryYear(year: number): HeianKeyYear {
  let best: HeianKeyYear = HEIAN_KEY_YEARS[0]
  for (const y of HEIAN_KEY_YEARS) {
    if (y <= year) best = y
    else break
  }
  return best
}

export function heianControlForYear(year: number, month: number | null = null) {
  if (month != null && year >= HEIAN_MONTH_FROM && year <= HEIAN_MONTH_TO) {
    return heianMonthControl(year, month).control
  }
  return HEIAN_TERRITORY_BY_YEAR[resolveHeianTerritoryYear(year)]
}

export function heianShadeNote(year: number, month: number | null = null): string {
  if (month != null && year >= HEIAN_MONTH_FROM && year <= HEIAN_MONTH_TO) {
    return heianMonthControl(year, month).note
  }
  return NOTES[resolveHeianTerritoryYear(year)]
}

export function heianFactionCounts(
  control: Record<string, HeianFactionId>,
): { faction: HeianFactionId; n: number }[] {
  const counts = new Map<HeianFactionId, number>()
  for (const f of Object.values(control)) {
    counts.set(f, (counts.get(f) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([faction, n]) => ({ faction, n }))
    .sort((a, b) => b.n - a.n)
}
