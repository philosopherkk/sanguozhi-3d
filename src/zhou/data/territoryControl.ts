import { cover, type FactionRange } from '../../geo/eraCover'
import { extensionAreaStats } from '../../lib/eraShapes'
import {
  ERA_REGIONS_GEOMETRY,
  type TerritoryGeometryProvenance,
} from '../../data/territory/provenance'
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
  /**
   * 本張快照的色塊沿用哪一年的界線（該年要有同一組環編號）。
   * 沒有新的劃界依據時必須填這一欄，介面與 audit:ranges 都靠它分清
   * 「該年真的改了邊界」與「只是沿用舊界」。
   */
  geometryFrom?: number
  control: ZhouControl
  ranges: FactionRange[]
}

export const ZHOU_TERRITORY_GEOMETRY_PROVENANCE: TerritoryGeometryProvenance =
  ERA_REGIONS_GEOMETRY

export const ZHOU_TERRITORY_NOTE =
  '色塊是該時代的示意範圍，跟著海岸，不是三國州界，也不是縣界。幾何非譚第一冊圖幅矢量化追蹤。小國與爭奪地帶沒有逐一畫出。戎狄不是編戶。'

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
    note: '越有故吳地與會稽，吳的色塊收回。越的南界到哪裡，圖上只畫到浙東，不畫福建——《左傳》《史記·越王勾踐世家》只記其北會諸侯於徐州，沒有可據以畫線的南向政區記錄，故南界屬推定。色塊是勢力範圍的上限示意，不是行政區界。',
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
    note: '周安王十六年（前386）周室列田和為諸侯，山東北部改標田齊。色塊是田氏實際掌握的都邑與鄙邑範圍上限示意，不是國界實測：《史記·田敬仲完世家》只記世代與都臨淄，沒有可逐段描繪的邊界記錄，故仍不是整片青州格。',
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
    note: '秦司馬錯取巴蜀（前316）。色塊只畫四川盆地的巴、蜀兩郡範圍上限，不是整個西南；西南夷不在其內，漢中仍屬楚。《史記·秦本紀》《張儀列傳》記其歸附，《華陽國志·蜀志》為東晉以後追述；兩處都不記四界，故蜀地西部屬推定。',
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
    note: '前312年丹陽、藍田之役後，秦襲取楚漢中郡。漢中是秦嶺以南、大巴山以北的一塊，不是整片關中再塗一次。史文只記郡名與役次，不記四界，故色塊是漢中郡歸屬範圍的上限示意；楚秦之際的界線另有異說，屬推定界線，逐段不作實測讀。',
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
    note: '前278年白起拔郢、焚夷陵，楚王東走，江漢之地入秦。色塊依《史記·白起王翦列傳》《楚世家》所記役次與郡名推定，屬秦設郡範圍的上限示意，不是實測界；楚東北徙後的疆界逐段見戰國末年各張，本張只畫到江漢易手為止。',
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
    note: '長平在上黨。邯鄲未下，所以趙的色塊還在。秦已有關中、巴蜀、漢中與郢。前260年這一役沒有改動界線：秦雖坑趙降卒，次年圍邯鄲不克，諸國合救，故色塊沿用前278年白起拔郢後的形勢，不另畫新界。',
    disputed: true,
    geometryFrom: -278,
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
    note: '前256年西周亡、前249年東周亡，洛邑一帶小塊改著秦色，不是整片中原。色塊依《史記·周本紀》所記二周之地推定，只到成周、洛邑附近，屬政區歸屬的上限示意；秦置三川郡之後的郡界屬其次年之事，本張不預支。',
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
    note: '前221年六國名號取消，色塊改為秦的郡縣範圍。河西走廊與嶺南不在這一年——前者其時屬羌胡，後者要到前214年纔下嶺南，故一律不著色。色塊依《史記·秦始皇本紀》三十六郡之目推定，屬郡級管轄範圍的上限示意，不是實測界線；細段見戰國末年各張。',
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
