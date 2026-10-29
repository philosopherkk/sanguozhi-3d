import type { MarchRoute } from '../../data/marchRoutes'
import { SENGOKU_MARCH_ROUTES } from '../../sengoku/data/marchRoutes'
import { SENGOKU_SITUATION } from '../../sengoku/data/factionSituation'
import {
  SENGOKU_KEY_YEARS,
  SENGOKU_TERRITORY_BY_YEAR,
} from '../../sengoku/data/territoryControl'
import type { SengokuFactionId, SengokuRegionId } from '../../sengoku/types'
import type { JapanDeepDivePack } from '../deepDiveTypes'
import { JP_DOMAINS } from '../jpDomains'
import { noDetail, noReading } from '../packHelpers'

const REGION_DOMAINS: Record<SengokuRegionId, string[]> = {
  奧羽: ['d0', 'd4', 'd5', 'd15', 'd18'],
  關東: ['d7', 'd20', 'd26'],
  甲信: ['d1', 'd19'],
  越後: ['d11', 'd16'],
  東海: ['d10'],
  尾張三河: ['d14', 'd10'],
  近畿: ['d9', 'd2', 'd21', 'd25'],
  中國: ['d6', 'd12'],
  四國: ['d23', 'd13'],
  九州: ['d3', 'd8', 'd17', 'd22', 'd24', 'd27'],
}

function regionControlToDomains(
  control: Partial<Record<SengokuRegionId, SengokuFactionId>>,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const d of JP_DOMAINS) out[d.id] = '其他'
  for (const [region, faction] of Object.entries(control) as [
    SengokuRegionId,
    SengokuFactionId,
  ][]) {
    for (const id of REGION_DOMAINS[region] ?? []) out[id] = faction
  }
  return out
}

const AZUCHI_YEARS = SENGOKU_KEY_YEARS.filter((y) => y >= 1573)

const territoryByYear: Record<number, Record<string, string>> = {}
for (const y of AZUCHI_YEARS) {
  territoryByYear[y] = regionControlToDomains(SENGOKU_TERRITORY_BY_YEAR[y])
}

const routes: MarchRoute[] = SENGOKU_MARCH_ROUTES.filter((r) => r.year >= 1573)

const FACTIONS = [
  {
    id: '織田',
    name: '織田',
    color: '#B91C1C',
    activeFrom: 1573,
    activeTo: 1582,
    source: '日本戰國通說：信長政權',
  },
  {
    id: '豐臣',
    name: '豐臣',
    color: '#CA8A04',
    activeFrom: 1582,
    activeTo: 1615,
    source: '日本戰國通說：秀吉—秀賴',
  },
  {
    id: '德川',
    name: '德川',
    color: '#1D4ED8',
    activeFrom: 1573,
    activeTo: 1615,
    source: '日本戰國通說：家康',
  },
  {
    id: '武田',
    name: '武田',
    color: '#7C3AED',
    activeFrom: 1573,
    activeTo: 1582,
    source: '日本戰國通說',
  },
  {
    id: '上杉',
    name: '上杉',
    color: '#0F766E',
    activeFrom: 1573,
    activeTo: 1615,
    source: '日本戰國通說',
  },
  {
    id: '北條',
    name: '北條',
    color: '#9F1239',
    activeFrom: 1573,
    activeTo: 1590,
    source: '日本戰國通說：後北條',
  },
  {
    id: '毛利',
    name: '毛利',
    color: '#166534',
    activeFrom: 1573,
    activeTo: 1615,
    source: '日本戰國通說',
  },
  {
    id: '島津',
    name: '島津',
    color: '#9A3412',
    activeFrom: 1573,
    activeTo: 1615,
    source: '日本戰國通說',
  },
  {
    id: '其他',
    name: '其他',
    color: '#78716C',
    activeFrom: 1573,
    activeTo: 1615,
    source: '地圖圖例',
  },
]

export const AZUCHI_PACK: JapanDeepDivePack = {
  id: 'azuchi',
  title: '安土桃山',
  tag: '織豐 · 關原',
  footer:
    '安土桃山（1573–1603）· 1603年家康任將軍，江戶幕府由此起 · 1615年大坂之陣見「德川江戶」，不是本時代的結束年 · 資料收斂自戰國專題 · 石高語言見勢力詳情 · 行軍只顯示該年 · 色塊示意大於實控',
  yearMin: 1573,
  yearMax: 1603,
  initialYear: 1582,
  ticks: [
    { year: 1573, label: '放逐義昭' },
    { year: 1582, label: '本能寺' },
    { year: 1590, label: '小田原' },
    { year: 1600, label: '關原' },
    { year: 1603, label: '開幕府' },
  ],
  factions: FACTIONS,
  domains: JP_DOMAINS,
  keyYears: [...AZUCHI_YEARS],
  territoryByYear,
  shadeNotes: {
    1573: '義昭被放逐，信長掌控畿內。安土城稍後築於近江。',
    1582: '本能寺後：織田名義仍在，秀吉開始主導統一。',
    1590: '小田原後秀吉名義統一。德川移封關東。',
    1600: '關原：德川大勝，豐臣收縮。',
    1615: '大坂之陣後豐臣滅亡，戰國終結。',
  },
  routes,
  places: [
    { name: '安土', x: 711.0, y: 740.0 },
    { name: '京都', x: 691.0, y: 753.2 },
    { name: '大坂', x: 677.5, y: 771.8 },
    { name: '關原', x: 726.0, y: 731.6 },
    { name: '小田原', x: 860.1, y: 738.2 },
    { name: '江戶', x: 885.1, y: 702.2 },
  ],
  events: [
    {
      id: 'az-1573',
      year: 1573,
      title: '放逐足利義昭',
      desc: '信長放逐將軍義昭，室町幕府實質終結，進入織田霸權期。',
      factions: ['織田'],
      location: '京都',
      type: 'politics',
      source: '中文維基「足利義昭」；日本戰國通說',
    },
    {
      id: 'az-1582',
      year: 1582,
      title: '本能寺之變',
      desc: '信長死於本能寺。秀吉中國大返還，山崎擊敗光秀。',
      factions: ['織田', '豐臣'],
      location: '京都／山崎',
      type: 'war',
      source: '中文維基「本能寺之變」',
    },
    {
      id: 'az-1590',
      year: 1590,
      title: '小田原征伐',
      desc: '秀吉滅後北條，名義統一列島；家康移封關東。',
      factions: ['豐臣', '北條', '德川'],
      location: '小田原',
      type: 'war',
      source: '中文維基「小田原征伐」',
    },
    {
      id: 'az-1600',
      year: 1600,
      title: '關原之戰',
      desc: '德川東軍勝，豐臣政權轉入守勢。',
      factions: ['德川', '豐臣'],
      location: '關原',
      type: 'war',
      source: '中文維基「關原之戰」',
    },
  ],
  people: [
    {
      id: 'az-nobunaga',
      name: '織田信長',
      faction: '織田',
      role: '霸主',
      death: 1582,
      summary: '上洛、築安土，死於本能寺。',
      source: '日本戰國通說',
    },
    {
      id: 'az-hideyoshi',
      name: '豐臣秀吉',
      faction: '豐臣',
      role: '關白・太閤',
      death: 1598,
      summary: '統一戰爭與朝鮮之役。',
      source: '日本戰國通說',
    },
    {
      id: 'az-ieyasu',
      name: '德川家康',
      faction: '德川',
      role: '將軍',
      death: 1616,
      summary: '關原勝出，開江戶幕府；大坂之陣滅豐臣。',
      source: '日本戰國通說',
    },
  ],
  situation: SENGOKU_SITUATION,
  leadersByYear: {
    1573: [
      { faction: '織田', name: '織田信長', role: '霸主', source: '日本戰國通說' },
      { faction: '德川', name: '德川家康', role: '同盟', source: '日本戰國通說' },
    ],
    1582: [
      { faction: '豐臣', name: '羽柴秀吉', role: '主導', source: '日本戰國通說' },
    ],
    1590: [
      { faction: '豐臣', name: '豐臣秀吉', role: '關白', source: '日本戰國通說' },
      { faction: '德川', name: '德川家康', role: '關東', source: '日本戰國通說' },
    ],
    1600: [
      { faction: '德川', name: '德川家康', role: '東軍', source: '日本戰國通說' },
    ],
    1615: [
      { faction: '德川', name: '德川家康', role: '大御所', source: '日本戰國通說' },
    ],
  },
  emptyHint: '此年無登錄專條。試 1573、1582、1600。大坂之陣在「德川江戶」。',
  detailFor: noDetail,
  readingFor: noReading,
}
