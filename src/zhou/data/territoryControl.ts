import { cover, type FactionRange } from '../../geo/eraCover'
import { extensionAreaStats } from '../../lib/eraShapes'
import { ZHOU_FACTION_ORDER } from '../lib/factionColors'
import type { ZhouFactionId } from '../types'

/**
 * 色塊是各時代自己的示意環，裁在現代地勢海岸上。
 * 不是東漢三國十八州，也不用 basemapProvinceRings。
 * 大勢據譚其驤《中國歷史地圖集》第一冊；細部依《左傳》《史記》《資治通鑑》。
 * 夏商西周的核心小於後世的國，邊界有爭議。
 */

export type ZhouControl = Partial<Record<string, ZhouFactionId>>

export interface ZhouSnapshot {
  year: number
  label: string
  source: string
  note: string
  disputed?: boolean
  control: ZhouControl
  ranges: FactionRange[]
}

export const ZHOU_TERRITORY_NOTE =
  '色塊是該時代的示意範圍，跟著海岸，不是三國州界，也不是縣界。小國與爭奪地帶沒有逐一畫出。戎狄不是編戶。'

function hold(entries: [string, ZhouFactionId][]): FactionRange[] {
  const grouped = new Map<ZhouFactionId, string[]>()
  for (const [region, faction] of entries) {
    const list = grouped.get(faction) ?? []
    list.push(region)
    grouped.set(faction, list)
  }
  return [...grouped.entries()].map(([faction, ids]) => cover(faction, ...ids))
}

const empty: ZhouControl = {}

export const ZHOU_SNAPSHOTS: ZhouSnapshot[] = [
  {
    year: -2070,
    label: '夏（文獻）',
    source: '《史記·夏本紀》；《竹書紀年》',
    note: '夏沒有甲骨、金文直接證明。色塊是伊洛盆地，不是後來的豫州，更不是全國。晉南異說不另畫。年份與邊界都有爭議。',
    disputed: true,
    control: empty,
    ranges: hold([['yiluo', '夏']]),
  },
  {
    year: -1600,
    label: '商·殷墟',
    source: '殷墟甲骨；《史記·殷本紀》',
    note: '畫的是晚期殷墟（安陽）核心。快照年份用文獻裡的商初，與殷墟的實際年代並不完全重合，所以標爭議。不把河北整片塗成王畿。',
    disputed: true,
    control: empty,
    ranges: hold([['shang_yin', '商']]),
  },
  {
    year: -1046,
    label: '西周',
    source: '西周金文；《史記·周本紀》',
    note: '周的色塊只是豐鎬與洛邑兩小塊。齊、晉、燕、楚是諸侯的核心，不是漢代的州。江東、嶺南不塗。封國界線有爭議。',
    disputed: true,
    control: empty,
    ranges: hold([
      ['zhou_wei', '周'],
      ['zhou_luoyi', '周'],
      ['linzi', '齊'],
      ['jin_quwo', '晉'],
      ['yan_early', '燕'],
      ['chu_early', '楚'],
    ]),
  },
  {
    year: -770,
    label: '東遷',
    source: '《史記·周本紀》《秦本紀》',
    note: '平王在洛邑。秦在關中，仍雜戎。晉在山西，齊在山東北部與半島，楚在江漢，燕在薊。宋、魯、衛、鄭等小國不另畫。不是十八州。',
    disputed: true,
    control: empty,
    ranges: hold([
      ['zhou_luoyi', '周'],
      ['qin_guanzhong', '秦'],
      ['shanxi', '晉'],
      ['qi', '齊'],
      ['hubei', '楚'],
      ['yan_early', '燕'],
    ]),
  },
  {
    year: -632,
    label: '城濮後',
    source: '《左傳》僖公二十八年；《史記》晉、楚、齊、秦世家',
    note: '晉文稱霸。色塊仍是晉在山西的地盤，不把河北塗成晉的郡縣。吳在太湖與長江下游。霸主聲威不是國界。',
    disputed: true,
    control: empty,
    ranges: hold([
      ['zhou_luoyi', '周'],
      ['qin_guanzhong', '秦'],
      ['shanxi', '晉'],
      ['qi', '齊'],
      ['hubei', '楚'],
      ['yan_early', '燕'],
      ['wu_delta', '吳'],
    ]),
  },
  {
    year: -473,
    label: '越滅吳',
    source: '《左傳》哀公二十二年；《史記·越王勾踐世家》',
    note: '越有故吳地與會稽。吳的色塊收回。越的南界到哪裡，圖上只畫到浙東，不畫福建。',
    disputed: true,
    control: empty,
    ranges: hold([
      ['zhou_luoyi', '周'],
      ['qin_guanzhong', '秦'],
      ['shanxi', '晉'],
      ['qi', '齊'],
      ['hubei', '楚'],
      ['yan_early', '燕'],
      ['wu_delta', '越'],
      ['yue_zhe', '越'],
    ]),
  },
  {
    year: -453,
    label: '三家分晉',
    source: '《史記·趙世家》《晉世家》',
    note: '趙有邯鄲與晉北，魏有河東與大梁一帶，韓在豫西。周只剩洛邑。燕加遼東是戰國擴張的示意，年份有爭議。姜齊尚未被田氏正式取代。',
    disputed: true,
    control: empty,
    ranges: hold([
      ['zhou_luoyi', '周'],
      ['qin_guanzhong', '秦'],
      ['zhao_handan', '趙'],
      ['shanxi_n', '趙'],
      ['wei_daliang', '魏'],
      ['wei_hedong', '魏'],
      ['han_state', '韓'],
      ['qi', '齊'],
      ['hubei', '楚'],
      ['hunan', '楚'],
      ['yan_early', '燕'],
      ['ln', '燕'],
    ]),
  },
  {
    year: -386,
    label: '田齊',
    source: '《史記·田敬仲完世家》；《資治通鑑》卷一',
    note: '周安王承認田和為諸侯。山東北部改標田齊，範圍仍不是整片青州格。',
    disputed: true,
    control: empty,
    ranges: hold([
      ['zhou_luoyi', '周'],
      ['qin_guanzhong', '秦'],
      ['zhao_handan', '趙'],
      ['shanxi_n', '趙'],
      ['wei_daliang', '魏'],
      ['wei_hedong', '魏'],
      ['han_state', '韓'],
      ['qi', '田齊'],
      ['hubei', '楚'],
      ['hunan', '楚'],
      ['yan_early', '燕'],
      ['ln', '燕'],
    ]),
  },
  {
    year: -333,
    label: '楚取故吳',
    source: '《史記·越王勾踐世家》《楚世家》',
    note: '楚威王敗越，取故吳地。滅越之年有前333、前306等說。江東畫進楚，越的色塊收回。',
    disputed: true,
    control: empty,
    ranges: hold([
      ['zhou_luoyi', '周'],
      ['qin_guanzhong', '秦'],
      ['zhao_handan', '趙'],
      ['shanxi_n', '趙'],
      ['wei_daliang', '魏'],
      ['wei_hedong', '魏'],
      ['han_state', '韓'],
      ['qi', '田齊'],
      ['hubei', '楚'],
      ['hunan', '楚'],
      ['wu_delta', '楚'],
      ['yue_zhe', '楚'],
      ['yan_early', '燕'],
      ['ln', '燕'],
    ]),
  },
  {
    year: -316,
    label: '秦滅巴蜀',
    source: '《史記·秦本紀》《張儀列傳》',
    note: '秦取巴蜀，畫的是四川盆地，不是整個西南。漢中仍在楚。',
    control: empty,
    ranges: hold([
      ['zhou_luoyi', '周'],
      ['qin_guanzhong', '秦'],
      ['sichuan', '秦'],
      ['zhao_handan', '趙'],
      ['shanxi_n', '趙'],
      ['wei_daliang', '魏'],
      ['wei_hedong', '魏'],
      ['han_state', '韓'],
      ['qi', '田齊'],
      ['hubei', '楚'],
      ['hunan', '楚'],
      ['wu_delta', '楚'],
      ['yue_zhe', '楚'],
      ['yan_early', '燕'],
      ['ln', '燕'],
    ]),
  },
  {
    year: -312,
    label: '秦取漢中',
    source: '《史記·楚世家》《屈原賈生列傳》',
    note: '丹陽、藍田之後秦取漢中。漢中是秦嶺以南的一塊，不是整片關中再塗一次。',
    control: empty,
    ranges: hold([
      ['zhou_luoyi', '周'],
      ['qin_guanzhong', '秦'],
      ['sichuan', '秦'],
      ['hanzhong', '秦'],
      ['zhao_handan', '趙'],
      ['shanxi_n', '趙'],
      ['wei_daliang', '魏'],
      ['wei_hedong', '魏'],
      ['han_state', '韓'],
      ['qi', '田齊'],
      ['hubei', '楚'],
      ['hunan', '楚'],
      ['wu_delta', '楚'],
      ['yue_zhe', '楚'],
      ['yan_early', '燕'],
      ['ln', '燕'],
    ]),
  },
  {
    year: -278,
    label: '拔郢',
    source: '《史記·白起王翦列傳》《楚世家》',
    note: '白起拔郢，江漢入秦，楚東遷到淮上與故吳。逐段地圖見戰國尾。',
    disputed: true,
    control: empty,
    ranges: hold([
      ['zhou_luoyi', '周'],
      ['qin_guanzhong', '秦'],
      ['sichuan', '秦'],
      ['hanzhong', '秦'],
      ['hubei', '秦'],
      ['zhao_handan', '趙'],
      ['shanxi_n', '趙'],
      ['wei_daliang', '魏'],
      ['wei_hedong', '魏'],
      ['han_state', '韓'],
      ['qi', '田齊'],
      ['hunan', '楚'],
      ['wu_delta', '楚'],
      ['yue_zhe', '楚'],
      ['yan_early', '燕'],
      ['ln', '燕'],
    ]),
  },
  {
    year: -260,
    label: '長平',
    source: '《史記·白起王翦列傳》《趙世家》；《資治通鑑》卷五',
    note: '長平在上黨。邯鄲未下，所以趙的色塊還在。秦已有關中、巴蜀、漢中與郢。',
    disputed: true,
    control: empty,
    ranges: hold([
      ['zhou_luoyi', '周'],
      ['qin_guanzhong', '秦'],
      ['sichuan', '秦'],
      ['hanzhong', '秦'],
      ['hubei', '秦'],
      ['zhao_handan', '趙'],
      ['shanxi_n', '趙'],
      ['wei_daliang', '魏'],
      ['wei_hedong', '魏'],
      ['han_state', '韓'],
      ['qi', '田齊'],
      ['hunan', '楚'],
      ['wu_delta', '楚'],
      ['yue_zhe', '楚'],
      ['yan_early', '燕'],
      ['ln', '燕'],
    ]),
  },
  {
    year: -249,
    label: '秦滅東周',
    source: '《史記·周本紀》；《資治通鑑》卷一',
    note: '西周已於前256年亡，東周亡於此年。洛邑一小塊改秦，不是整片中原。',
    disputed: true,
    control: empty,
    ranges: hold([
      ['qin_guanzhong', '秦'],
      ['zhou_luoyi', '秦'],
      ['sichuan', '秦'],
      ['hanzhong', '秦'],
      ['hubei', '秦'],
      ['zhao_handan', '趙'],
      ['shanxi_n', '趙'],
      ['wei_daliang', '魏'],
      ['wei_hedong', '魏'],
      ['han_state', '韓'],
      ['qi', '田齊'],
      ['hunan', '楚'],
      ['wu_delta', '楚'],
      ['yue_zhe', '楚'],
      ['yan_early', '燕'],
      ['ln', '燕'],
    ]),
  },
  {
    year: -221,
    label: '秦統一',
    source: '《史記·秦始皇本紀》；《資治通鑑》卷七',
    note: '六國名號取消。河西走廊與嶺南不在這一年的滅國之內，不著色。細段見戰國尾。',
    disputed: true,
    control: empty,
    ranges: hold([
      ['qin_guanzhong', '秦'],
      ['zhou_luoyi', '秦'],
      ['sichuan', '秦'],
      ['hanzhong', '秦'],
      ['hubei', '秦'],
      ['hunan', '秦'],
      ['henan', '秦'],
      ['shanxi', '秦'],
      ['hebei', '秦'],
      ['shandong', '秦'],
      ['anhui', '秦'],
      ['jiangsu', '秦'],
      ['zhejiang', '秦'],
      ['jiangxi', '秦'],
      ['longxi', '秦'],
      ['ln', '秦'],
      ['han_state', '秦'],
      ['wei_daliang', '秦'],
      ['wei_hedong', '秦'],
    ]),
  },
]

export function resolveZhouTerritoryYear(year: number): number {
  let best = ZHOU_SNAPSHOTS[0].year
  for (const snap of ZHOU_SNAPSHOTS) {
    if (snap.year <= year) best = snap.year
  }
  return best
}

export function zhouSnapshotForYear(year: number): ZhouSnapshot {
  const key = resolveZhouTerritoryYear(year)
  const found = ZHOU_SNAPSHOTS.find((s) => s.year === key)
  return found ?? ZHOU_SNAPSHOTS[0]
}

export function zhouControlForYear(year: number): ZhouControl {
  return zhouSnapshotForYear(year).control
}

export function zhouFactionsPresent(ranges: FactionRange[]): ZhouFactionId[] {
  const present = new Set<ZhouFactionId>()
  for (const range of ranges) {
    if (range.rings.length > 0) present.add(range.faction as ZhouFactionId)
  }
  return ZHOU_FACTION_ORDER.filter((id) => present.has(id))
}

export interface ZhouTerritoryStat {
  faction: ZhouFactionId
  pieceCount: number
  percent: number
}

export function zhouTerritoryStats(ranges: FactionRange[]): ZhouTerritoryStat[] {
  return extensionAreaStats(ranges).map((row) => ({
    faction: row.faction as ZhouFactionId,
    pieceCount: row.pieceCount,
    percent: row.percent,
  }))
}

export function rangesFromHold(
  entries: Partial<Record<string, ZhouFactionId>>,
): FactionRange[] {
  const pairs: [string, ZhouFactionId][] = []
  for (const [region, faction] of Object.entries(entries)) {
    if (faction) pairs.push([region, faction])
  }
  return hold(pairs)
}
