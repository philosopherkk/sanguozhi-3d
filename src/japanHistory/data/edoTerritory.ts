/**
 * 德川江戶（1603–1868）的大名領地層。
 *
 * 幾何是 CODH 旧国（與戰國、幕末同一層），不是藩界。一國之內往往並存數藩
 * （例如信濃有松本・松代・高遠・小諸・上田），所以這裡畫的是「哪一系的大名
 * 群佔據這組旧国」，不是逐藩實控。藩層 mesh 目前只覆蓋 21/28 個 domain、
 * 面積僅 16%（見 bakumatsu/data/bakumatsuHanPaint.ts），故不啟用。
 */
import { JP_DOMAINS } from '../../japanEras/jpDomains'
import {
  shadesFromDomainControl,
  type JapanPaintShade,
} from '../../sengoku/data/japanKokugunPaint'

export const EDO_TERRITORY_YEARS = [1603, 1615, 1650, 1700, 1800, 1853] as const

export interface EdoFaction {
  id: string
  name: string
  color: string
  activeFrom: number
  activeTo: number
  source: string
}

export const EDO_FACTIONS: EdoFaction[] = [
  {
    id: '幕府・天領',
    name: '幕府・天領',
    color: '#24404E',
    activeFrom: 1603,
    activeTo: 1868,
    source: '《德川實紀》；《寬政重修諸家譜》。甲府・駿府・長崎・安房等直轄，大阪・奈良・佐渡等亦天領',
  },
  {
    id: '豊臣',
    name: '豊臣（大坂）',
    color: '#8A4030',
    activeFrom: 1603,
    activeTo: 1615,
    source: '《德川實紀》慶長十八年至元和元年。大坂之陣後除封',
  },
  {
    id: '御三家',
    name: '御三家',
    color: '#3E6B8C',
    activeFrom: 1603,
    activeTo: 1868,
    source: '尾張・紀伊・水戶三家。《德川實紀》；『藩翰譜』（牧野成定）',
  },
  {
    id: '譜代・親藩',
    name: '譜代・親藩諸藩',
    color: '#5B7F95',
    activeFrom: 1603,
    activeTo: 1868,
    source: '《寬政重修諸家譜》。彦根井伊・越前松平・松江・浜田・高松・姫路等',
  },
  {
    id: '外樣',
    name: '外樣諸藩',
    color: '#7A6A55',
    activeFrom: 1603,
    activeTo: 1868,
    source: '『藩翰譜』；『武家諸法度』。盛岡南部・秋田佐竹・土佐山内・肥前鍋島・肥後細川等',
  },
  {
    id: '加賀・前田',
    name: '加賀・前田',
    color: '#A08050',
    activeFrom: 1603,
    activeTo: 1868,
    source: '加賀・能登・越前十二萬二千石，外樣最大。『加賀藩政史料』；『藩翰譜』',
  },
  {
    id: '伊達・仙台',
    name: '伊達・仙台',
    color: '#5A6A8A',
    activeFrom: 1603,
    activeTo: 1868,
    source: '陸奧六十二萬石。『伊達家文書』；『奥羽史料』',
  },
  {
    id: '薩摩・島津',
    name: '薩摩・島津',
    color: '#8B3A3A',
    activeFrom: 1603,
    activeTo: 1868,
    source: '萨摩・大隅・日向及琉球支配。『島津家文書』；『琉球国由緒記』',
  },
  {
    id: '長州・毛利',
    name: '長州・毛利',
    color: '#6E2430',
    activeFrom: 1603,
    activeTo: 1868,
    source: '長門・周防・安藝。『毛利家文書』；『長藩政談』',
  },
]

const T = '幕府・天領'
const TOYOTOMI = '豊臣'
const SANGYO = '御三家'
const FUDAI = '譜代・親藩'
const TOZAMA = '外樣'
const KAGA = '加賀・前田'
const DATE = '伊達・仙台'
const SATSUMA = '薩摩・島津'
const CHOSHU = '長州・毛利'

function paint(overrides: Record<string, string>): Record<string, string> {
  const base: Record<string, string> = {
    d0: FUDAI, // 會津：保科正之（會津松平）以降
    d1: T, // 甲斐・駿河：甲府・駿府奉行所領
    d2: T, // 攝津・河内：大阪町奉行所
    d3: SATSUMA,
    d4: TOZAMA, // 陸奧北：盛岡南部
    d5: DATE,
    d6: CHOSHU,
    d7: FUDAI, // 關東：奥平・大久保・阿部等
    d8: TOZAMA, // 豐後：中川・岡
    d9: FUDAI, // 近江：彦根井伊＋湖岸天領
    d10: FUDAI, // 三河：田原・吉田・半田
    d11: FUDAI, // 越後：高田・長岡・新発田
    d12: FUDAI, // 出雲・石見：松江・浜田松平＋石見銀山天領
    d13: TOZAMA, // 土佐：山内
    d14: SANGYO, // 尾張徳川
    d15: TOZAMA, // 出羽：秋田佐竹・久保田
    d16: KAGA, // 加賀・能登・越前：前田
    d17: TOZAMA, // 肥前：鍋島
    d18: TOZAMA, // 奧羽：相馬・田村・秋田分家
    d19: FUDAI, // 信濃：松本・松代・高遠（天領）・上田
    d20: SANGYO, // 常陸：水戶徳川
    d21: FUDAI, // 丹波・播磨：姫路酒井・明石小出
    d22: TOZAMA, // 肥前西：平戸松浦・島原松平
    d23: FUDAI, // 讚岐・伊予：高松松平・今治・松山
    d24: TOZAMA, // 肥後：細川
    d25: SANGYO, // 紀伊徳川
    d26: T, // 安房：天領中心
    d27: SATSUMA, // 大隅：島津分家
  }
  return { ...base, ...overrides }
}

/**
 * 快照年 → domainId → 勢力。1603 與 1615 的差別是豊臣除封；
 * 1615 與 1650 的差別是寬永末年改易・轉封的收尾（會津上杉→保科、
 * 越後堀→松平・酒井、肥後加藤→細川）。1700 以後藩界大致不動，
 * 變動多在國內（分知・減封），舊國層看不出來。
 */
export const EDO_TERRITORY_BY_YEAR: Record<number, Record<string, string>> = {
  1603: paint({ d0: TOZAMA, d2: TOYOTOMI, d11: TOZAMA, d24: TOZAMA }),
  1615: paint({ d0: TOZAMA, d11: TOZAMA, d24: TOZAMA }),
  1650: paint({}),
  1700: paint({}),
  1800: paint({}),
  1853: paint({}),
}

export const EDO_SHADE_NOTES: Record<number, string> = {
  1603: '關原之後、大坂之陣之前。大坂周邊仍屬豊臣，會津（上杉）、越後（堀）、肥後（加藤）尚未換人。',
  1615: '大坂之陣結束，豊臣除封，攝津・河内入天領。',
  1650: '寬永末年：會津歸保科正之、越後分與松平・酒井・堀田、肥後歸細川。武家諸法度與參勤交代已確立。',
  1700: '元祿期。藩界與1650年大致相同，變動多在藩內（分知・減封），舊國層看不出。',
  1800: '寬政期。同1650年的格局；松前與琉球仍以色塊外周另行標示。',
  1853: '嘉永開國前夜。薩摩・長州仍是外樣，但已主導對外交涉；戊辰之戰見「幕末」。',
}

export function edoTerritoryYear(year: number): number | null {
  let best: number | null = null
  for (const y of EDO_TERRITORY_YEARS) {
    if (y <= year && (best === null || y > best)) best = y
  }
  return best
}

export function edoShades(year: number): JapanPaintShade[] {
  const ty = edoTerritoryYear(year)
  if (ty === null) return []
  const control = EDO_TERRITORY_BY_YEAR[ty]
  const names = Object.fromEntries(EDO_FACTIONS.map((f) => [f.id, f.name]))
  return shadesFromDomainControl(control, names, '')
}

export function edoFactionCounts(
  control: Record<string, string>,
): { faction: string; n: number }[] {
  const counts = new Map<string, number>()
  for (const id of Object.values(control)) counts.set(id, (counts.get(id) ?? 0) + 1)
  return EDO_FACTIONS.filter((f) => counts.has(f.id))
    .map((f) => ({ faction: f.id, n: counts.get(f.id) ?? 0 }))
    .sort((a, b) => b.n - a.n)
}

export { JP_DOMAINS }
