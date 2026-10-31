import { TRACED_DOMAINS } from '../../sengoku/data/tracedDomains'
import type { BakumatsuFactionId } from '../types'
import {
  BAKUMATSU_HAN_GEOMETRY,
  BAKUMATSU_TERRITORY_NOTE_ZH,
  JAPAN_CODH_KOKUGUN_GEOMETRY,
  JAPAN_TERRITORY_NOTE_ZH,
  type TerritoryGeometryProvenance,
} from '../../data/territory/provenance'
import { JP_ERA_RINGS } from '../../geo/japanEraRings'
import type { JapanPaintShade } from '../../sengoku/data/japanKokugunPaint'
import { useBakumatsuHanMeshes } from './bakumatsuHanPaint'

export const BAKUMATSU_TERRITORY_GEOMETRY_PROVENANCE: TerritoryGeometryProvenance =
  useBakumatsuHanMeshes() ? BAKUMATSU_HAN_GEOMETRY : JAPAN_CODH_KOKUGUN_GEOMETRY

export const BAKUMATSU_TERRITORY_NOTE = useBakumatsuHanMeshes()
  ? BAKUMATSU_TERRITORY_NOTE_ZH
  : JAPAN_TERRITORY_NOTE_ZH

const PLACE: Record<string, string> = {
  d0: '會津',
  d1: '甲斐・駿河',
  d2: '攝津',
  d3: '薩摩',
  d4: '陸奧北',
  d5: '陸奧南',
  d6: '長州方面',
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
  d21: '山陽東',
  d22: '肥前西',
  d23: '讚岐・伊予',
  d24: '肥後',
  d25: '紀伊',
  d26: '安房',
  d27: '大隅',
}

export const BAKUMATSU_DOMAINS = TRACED_DOMAINS.map((d) => ({
  id: d.id,
  name: PLACE[d.id] ?? d.id,
  ring: d.ring,
  extraRings: d.extraRings,
}))

const SATCHO = ['d3', 'd6']
const OU = ['d0', 'd4', 'd5', 'd15', 'd18']
const ECHIGO = ['d11']

export const BAKUMATSU_KEY_YEARS = [1853, 1866, 1867, 1868, 1869] as const
export type BakumatsuKeyYear = (typeof BAKUMATSU_KEY_YEARS)[number]

function paint(
  groups: [string[], BakumatsuFactionId][],
  fallback: BakumatsuFactionId,
): Record<string, BakumatsuFactionId> {
  const out: Record<string, BakumatsuFactionId> = {}
  for (const d of BAKUMATSU_DOMAINS) out[d.id] = fallback
  for (const [ids, faction] of groups) {
    for (const id of ids) out[id] = faction
  }
  return out
}

export const BAKUMATSU_TERRITORY_BY_YEAR: Record<
  BakumatsuKeyYear,
  Record<string, BakumatsuFactionId>
> = {
  1853: paint([], '幕府'),
  /** 第二次長州征討失敗。薩摩與長州（以毛利舊領示意）已不聽幕府。 */
  1866: paint([[SATCHO, '薩長']], '幕府'),
  1867: paint([[SATCHO, '薩長']], '幕府'),
  /** 鳥羽伏見與江戶開城之後。奧羽越仍在抵抗。幕府不再有成片領地。 */
  1868: paint(
    [
      [OU, '奧羽'],
      [ECHIGO, '奧羽'],
    ],
    '薩長',
  ),
  /** 本州戰事結束。箱館在蝦夷地；1869 起以 JP_ERA_RINGS 示意著色北海道（開拓使，approx）。 */
  1869: paint([], '薩長'),
}

const NOTES: Record<BakumatsuKeyYear, string> = {
  1853: '黑船之年，諸藩仍在幕府體制之下。色塊不是現代縣界。',
  1866: '長州以山陽西端的毛利舊領示意，不是精密的長門國界。薩摩著九州南端。',
  1867: '大政奉還後，領地一天內沒有重畫。此快照仍是奉還前的藩勢。',
  1868: '江戶開城後關東著薩長。越後併入奧羽色，表示北越也在抵抗。土佐沒有單獨一色。',
  1869: '本州已無幕府領地。箱館戰爭在渡海之後的蝦夷地，箭咀落到函館；北海道以 CODH K75–K85 mesh 示意開拓使（approx），非即時全島平定。',
}

export const BAKUMATSU_MONTH_FROM = 1853
export const BAKUMATSU_MONTH_TO = 1869

const satchoSettsu = paint(
  [
    [SATCHO, '薩長'],
    [['d2'], '薩長'],
  ],
  '幕府',
)
const satchoTokai = paint(
  [
    [SATCHO, '薩長'],
    [['d2', 'd14', 'd10'], '薩長'],
  ],
  '幕府',
)
const afterEdo = paint(
  [
    [SATCHO, '薩長'],
    [['d2', 'd14', 'd10', 'd7', 'd20', 'd26'], '薩長'],
  ],
  '幕府',
)
const ouetsu = paint(
  [
    [OU, '奧羽'],
    [ECHIGO, '奧羽'],
  ],
  '薩長',
)
const aizuOnly = paint([[OU, '奧羽']], '薩長')
const allNew = paint([], '薩長')

/** 1853–1868 逐月。沒有專條的月份寫「本月無專條」，領地沿用較早一個月。1869年箱館不在這一段。 */
const BAKUMATSU_MONTH_NOTES: Record<string, { note: string; control?: Record<string, BakumatsuFactionId> }> = {
  '1853-6': {
    note: '六月培理艦隊進入江戶灣，在浦賀呈國書。這是通交，不是上陸攻城。',
  },
  '1853-7': {
    note: '七月黑船仍在江戶灣外。幕府尚未定約。本月沒有陸上會戰。',
  },
  '1854-3': {
    note: '三月培理再來，幕府簽神奈川條約。仍不是開戰。',
  },
  '1858-10': {
    note: '安政大獄。幕府處分反對開國的武士，不是戰場。',
  },
  '1859-10': {
    note: '安政大獄的餘波。吉田松陰等已在這前後被處刑。沒有新的會戰。',
  },
  '1860-3': {
    note: '三月三日櫻田門外，井伊直弼被刺。這是暗殺，不是行軍。',
  },
  '1866-1': {
    note: '正月薩摩與長州結盟。領地色還沒有因為同盟而重畫。',
  },
  '1866-6': {
    note: '六月幕府第二次征討長州，沿山陽道西進，沒有打下長州。',
  },
  '1867-1': {
    note: '慶應三年正月。薩摩、長州已不聽幕府，其餘藩領仍著幕府。本月無大型行軍。',
  },
  '1867-10': {
    note: '舊曆慶應三年十月十四日大政奉還，西曆是11月9日。藩領沒有當天重畫。',
  },
  '1867-11': {
    note: '西曆11月9日大政奉還。若按舊曆則屬十月。藩領仍是奉還前的樣子。',
  },
  '1867-12': {
    note: '十二月朝廷與幕府在京都對峙。領地色不變，軍隊尚未東征。',
  },
  '1868-1': {
    note: '一月二十七日起鳥羽、伏見。幕府軍退回，攝津改著薩長。',
    control: satchoSettsu,
  },
  '1868-2': {
    note: '二月東征軍編成，尚未越箱根。色塊停在攝津。',
    control: satchoSettsu,
  },
  '1868-3': {
    note: '三月沿東海道東進，尾張、三河改著薩長。關東仍是舊幕府一方。',
    control: satchoTokai,
  },
  '1868-4': {
    note: '四月軍至箱根。江戶仍未開城。',
    control: satchoTokai,
  },
  '1868-5': {
    note: '五月三日江戶開城。關東改著薩長。這是交城，不是屠城。',
    control: afterEdo,
  },
  '1868-6': {
    note: '六月奧羽越列藩同盟成形。東北與越後改著奧羽，其餘已入新政府的地方著薩長。',
    control: ouetsu,
  },
  '1868-7': {
    note: '七月上野彰義隊戰敗。江戶城內的殘餘結束，關東色不變。',
    control: ouetsu,
  },
  '1868-8': {
    note: '八月北越戰爭，長岡反復易手。越後仍著奧羽，表示抵抗未停。',
    control: ouetsu,
  },
  '1868-9': {
    note: '九月新政府軍稳住越後。越後改著薩長，會津仍在抵抗。',
    control: aizuOnly,
  },
  '1868-10': {
    note: '十月會津若松被圍。奧羽色只剩東北山地這一帶。',
    control: aizuOnly,
  },
  '1868-11': {
    note: '十一月六日會津開城。本州東北改著薩長。榎本艦隊已在秋間離品川。',
    control: allNew,
  },
  '1868-12': {
    note: '十二月本州戰事告一段落。箱館戰爭在明年；1869 年起北海道示意著色（開拓使）。',
    control: allNew,
  },
  '1869-5': {
    note: '五月箱館戰爭。舊幕府軍據五稜郭，新政府軍渡海。箭咀落到函館；北海道環為行政示意，非征服整島。',
    control: allNew,
  },
}

function monthControl(
  year: number,
  month: number,
): { control: Record<string, BakumatsuFactionId>; note: string } {
  let control = BAKUMATSU_TERRITORY_BY_YEAR[resolveBakumatsuTerritoryYear(year)]
  for (let m = 1; m <= month; m += 1) {
    const hit = BAKUMATSU_MONTH_NOTES[`${year}-${m}`]
    if (hit?.control) control = hit.control
  }
  const exact = BAKUMATSU_MONTH_NOTES[`${year}-${month}`]
  return { control, note: exact?.note ?? '本月無專條' }
}

export function resolveBakumatsuTerritoryYear(year: number): BakumatsuKeyYear {
  let best: BakumatsuKeyYear = BAKUMATSU_KEY_YEARS[0]
  for (const y of BAKUMATSU_KEY_YEARS) {
    if (y <= year) best = y
    else break
  }
  return best
}

export function bakumatsuControlForYear(year: number, month: number | null = null) {
  if (
    month != null &&
    year >= BAKUMATSU_MONTH_FROM &&
    year <= BAKUMATSU_MONTH_TO
  ) {
    return monthControl(year, month).control
  }
  return BAKUMATSU_TERRITORY_BY_YEAR[resolveBakumatsuTerritoryYear(year)]
}

export function bakumatsuShadeNote(year: number, month: number | null = null): string {
  if (
    month != null &&
    year >= BAKUMATSU_MONTH_FROM &&
    year <= BAKUMATSU_MONTH_TO
  ) {
    return monthControl(year, month).note
  }
  return NOTES[resolveBakumatsuTerritoryYear(year)]
}

export function bakumatsuFactionCounts(
  control: Record<string, BakumatsuFactionId>,
): { faction: BakumatsuFactionId; n: number }[] {
  const counts = new Map<BakumatsuFactionId, number>()
  for (const f of BAKUMATSU_FACTIONS_ORDER) {
    counts.set(f, 0)
  }
  for (const f of Object.values(control)) {
    counts.set(f, (counts.get(f) ?? 0) + 1)
  }
  return [...counts.entries()]
    .filter(([, n]) => n > 0)
    .map(([faction, n]) => ({ faction, n }))
    .sort((a, b) => b.n - a.n)
}

const BAKUMATSU_FACTIONS_ORDER: BakumatsuFactionId[] = ['幕府', '薩長', '奧羽']

/** 1869 起以 CODH K75–K85 示意北海道開拓使行政；箱館戰爭仍靠箭咀敘事。 */
export function bakumatsuFringeShades(
  year: number,
  _control: Record<string, BakumatsuFactionId>,
): JapanPaintShade[] {
  if (year < 1869) return []
  const rings = JP_ERA_RINGS.hokkaido
  if (!rings.length) return []
  return rings.map((ring, index) => ({
    id: `hokkaido-codh-${index}`,
    kokugunId: 'K75-K85',
    domainId: 'fringe-hokkaido',
    zone: '奧羽',
    name: '北海道（開拓使示意）',
    ring,
    faction: '薩長',
  }))
}
