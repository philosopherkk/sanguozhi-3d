import { cover, type FactionRange } from '../../geo/eraCover'
import { extensionAreaStats } from '../../lib/eraShapes'
import {
  ERA_REGIONS_GEOMETRY,
  type TerritoryGeometryProvenance,
} from '../../data/territory/provenance'
import { QINHAN_FACTION_ORDER } from '../lib/factionColors'
import type { QinHanFactionId } from '../types'

/**
 * 秦漢勢力用本時代的示意環，裁在現代地勢海岸上。
 * 不是東漢三國十八州，也不用 basemapProvinceRings。
 * 大勢據譚其驤《中國歷史地圖集》第二冊與《史記》《漢書》《資治通鑑》。
 * 塞外匈奴不著色。西域都護不是郡縣，不畫進新疆全境。
 */

export type QinHanControl = Partial<Record<string, QinHanFactionId>>

export interface QinHanSnapshot {
  year: number
  label: string
  source: string
  note: string
  disputed?: boolean
  control: QinHanControl
  ranges: FactionRange[]
}

export const QINHAN_TERRITORY_GEOMETRY_PROVENANCE: TerritoryGeometryProvenance =
  ERA_REGIONS_GEOMETRY

export const QINHAN_TERRITORY_NOTE =
  '色塊是該時代的示意範圍，跟著海岸，不是三國州界，也不是郡國實測。幾何非譚第二冊圖幅矢量化追蹤。匈奴在塞外，不是編戶。'

const empty: QinHanControl = {}

const qin221 = cover('秦', 'realm_qin_221')
const qin214 = cover('秦', 'realm_qin_214')
const han202 = cover('漢', 'realm_han_202')
const han111 = cover('漢', 'realm_han_111')
const han25 = cover('漢', 'realm_han_25')
const han36 = cover('漢', 'realm_han_36')

export const QINHAN_SNAPSHOTS: QinHanSnapshot[] = [
  {
    year: -221,
    label: '秦郡縣',
    source: '《史記·秦始皇本紀》；《資治通鑑》卷七',
    note: '六國之地入秦。嶺南尚未取，河西只到隴西，不畫敦煌，也不畫雲南。三十六郡之數有異說。',
    disputed: true,
    control: empty,
    ranges: [qin221],
  },
  {
    year: -214,
    label: '略取嶺南',
    source: '《史記·秦始皇本紀》',
    note: '桂林、南海、象郡是這幾年的事。色塊到廣東、廣西和紅河下游，大於實郡。閩中鬆散，一併標爭議。',
    disputed: true,
    control: empty,
    ranges: [qin214],
  },
  {
    year: -206,
    label: '楚漢',
    source: '《史記·項羽本紀》《高祖本紀》',
    note: '漢王先有巴蜀、漢中，隨即還定關中。西楚以彭城為中心，畫淮上與江漢，不是後來的漢郡。齊、趙、燕是諸侯。涼州與嶺南不著色。',
    disputed: true,
    control: empty,
    ranges: [
      cover('漢', 'qin_guanzhong', 'hanzhong', 'sichuan'),
      cover('西楚', 'henan', 'jiangsu', 'anhui', 'hubei', 'hunan', 'jiangxi', 'zhejiang'),
      cover('齊', 'shandong'),
      cover('趙', 'hebei_song', 'shanxi'),
      cover('燕', 'yan_early', 'ln'),
    ],
  },
  {
    year: -202,
    label: '西漢初',
    source: '《史記·高祖本紀》；《漢書·高帝紀》',
    note: '垓下之後核心歸漢，仍是郡國並行，王國沒有另色。河西、南越、閩越尚未入漢。',
    disputed: true,
    control: empty,
    ranges: [han202],
  },
  {
    year: -111,
    label: '西漢盛時',
    source: '《史記·孝武本紀》《衛將軍驃騎列傳》《南越列傳》；《資治通鑑》卷二十、卷二十一',
    note: '河西四郡與平南越、閩越之後。雲南的益州郡剛置，色塊大於實郡。西域不畫：都護是後來的事，不是這一年的郡縣。匈奴仍在塞外。',
    disputed: true,
    control: empty,
    ranges: [han111],
  },
  {
    year: 9,
    label: '新莽',
    source: '《漢書·王莽傳》；《資治通鑑》卷三十七',
    note: '王莽改漢為新。邊郡不穩，範圍仍沿西漢盛時的示意，只改名號。不是重新測繪。',
    disputed: true,
    control: empty,
    ranges: [cover('新', 'realm_han_111')],
  },
  {
    year: 25,
    label: '東漢初',
    source: '《後漢書·光武帝紀》；《資治通鑑》卷四十',
    note: '光武稱帝於鄗，都洛陽。隴、蜀未定，所以關中、河西、四川這一年不塗漢。不是建武十二年以後的版圖。',
    disputed: true,
    control: empty,
    ranges: [han25],
  },
  {
    year: 36,
    label: '東漢定隴蜀',
    source: '《後漢書·光武帝紀》；《資治通鑑》卷四十三',
    note: '建武十二年公孫述敗，隴右在此前已定。色塊收回關中、漢中與四川。西域都護時通時絕，不畫新疆。',
    disputed: true,
    control: empty,
    ranges: [han36],
  },
]

export function resolveQinHanTerritoryYear(year: number): number {
  let best = QINHAN_SNAPSHOTS[0].year
  for (const snap of QINHAN_SNAPSHOTS) {
    if (snap.year <= year) best = snap.year
  }
  return best
}

export function qinHanSnapshotForYear(year: number): QinHanSnapshot {
  const key = resolveQinHanTerritoryYear(year)
  const found = QINHAN_SNAPSHOTS.find((s) => s.year === key)
  return found ?? QINHAN_SNAPSHOTS[0]
}

export function qinHanControlForYear(year: number): QinHanControl {
  return qinHanSnapshotForYear(year).control
}

export function qinHanFactionsPresent(
  ranges: FactionRange[],
): QinHanFactionId[] {
  const present = new Set<QinHanFactionId>()
  for (const range of ranges) {
    if (range.rings.length > 0) present.add(range.faction as QinHanFactionId)
  }
  return QINHAN_FACTION_ORDER.filter((id) => present.has(id))
}

export interface QinHanTerritoryStat {
  faction: QinHanFactionId
  pieceCount: number
  percent: number
}

export function qinHanTerritoryStats(
  ranges: FactionRange[],
): QinHanTerritoryStat[] {
  return extensionAreaStats(ranges).map((row) => ({
    faction: row.faction as QinHanFactionId,
    pieceCount: row.pieceCount,
    percent: row.percent,
  }))
}
