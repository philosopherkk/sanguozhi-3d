import type { MarchRoute } from '../../data/marchRoutes'
import type { JapanDeepDivePack } from '../deepDiveTypes'
import { D, JP_DOMAINS, paintDomains } from '../jpDomains'
import { fact, noDetail, noReading, profile } from '../packHelpers'

const F = {
  court: '朝廷',
  fujiwara: '藤原',
  emishi: '蝦夷',
} as const

const routes: MarchRoute[] = [
  {
    id: 'nara-heijo',
    name: '遷都平城',
    year: 710,
    faction: F.court,
    source: '《續日本紀》。自藤原京一帶遷平城京，短途示意',
    points: [
      [700.0, 775.0],
      [705.0, 762.0],
    ],
  },
  {
    id: 'nara-fujiwara-nakamaro',
    name: '惠美押勝之亂',
    year: 764,
    faction: F.fujiwara,
    source: '《續日本紀》。藤原仲麻呂（惠美押勝）起兵敗死。近畿短途示意',
    points: [
      [705.0, 762.0],
      [691.0, 753.2],
      [677.5, 771.8],
    ],
  },
  {
    id: 'nara-emishi',
    name: '征夷示意',
    year: 780,
    faction: F.court,
    source: '《續日本紀》系；奈良末至平安初對東北經營。路線示意，非單次年精確日誌',
    points: [
      [705.0, 762.0],
      [802.5, 678.8],
      [890.1, 713.0],
      [942.6, 557.6],
    ],
  },
]

export const NARA_PACK: JapanDeepDivePack = {
  id: 'nara',
  title: '奈良',
  tag: '平城京 · 律令',
  footer:
    '奈良（710–794）· 據《續日本紀》及日本古代史通說 · 794年遷平安京，平安時代由此起 · 色塊為律令國家示意 · 幾何非學術地圖矢量化追蹤 · 行軍只顯示該年 · 戶籍構想有，全國精確口數仍不宜入圖當總冊',
  yearMin: 710,
  yearMax: 794,
  initialYear: 710,
  ticks: [
    { year: 710, label: '平城' },
    { year: 752, label: '大佛' },
    { year: 764, label: '仲麻呂' },
    { year: 784, label: '長岡' },
  ],
  factions: [
    {
      id: F.court,
      name: '朝廷',
      color: '#C9A227',
      activeFrom: 710,
      activeTo: 793,
      source: '《續日本紀》：平城京律令國家',
    },
    {
      id: F.fujiwara,
      name: '藤原',
      color: '#8B4A6A',
      activeFrom: 710,
      activeTo: 793,
      source: '日本古代史通說：藤原氏在朝廷內的政治影響力（非獨立王國）',
    },
    {
      id: F.emishi,
      name: '蝦夷',
      color: '#4A6A5A',
      activeFrom: 710,
      activeTo: 793,
      source: '《續日本紀》系：東北未完全編戶地帶',
    },
  ],
  domains: JP_DOMAINS,
  keyYears: [710, 752, 764, 784],
  territoryByYear: {
    710: paintDomains(
      [
        [D.yamato, F.court],
        [D.kinai, F.court],
        [D.tokai, F.court],
        [D.kanto, F.court],
        [D.kyushu, F.court],
        [D.west, F.court],
        [D.shikoku, F.court],
        [D.ou, F.emishi],
      ],
      F.court,
    ),
    752: paintDomains(
      [
        [D.yamato, F.court],
        [D.kinai, F.court],
        [D.tokai, F.court],
        [D.kanto, F.court],
        [D.kyushu, F.court],
        [D.west, F.court],
        [D.shikoku, F.court],
        [D.ou, F.emishi],
      ],
      F.court,
    ),
    764: paintDomains(
      [
        [D.yamato, F.court],
        [D.kinai, F.fujiwara],
        [D.tokai, F.court],
        [D.kanto, F.court],
        [D.kyushu, F.court],
        [D.west, F.court],
        [D.shikoku, F.court],
        [D.ou, F.emishi],
      ],
      F.court,
    ),
    784: paintDomains(
      [
        [D.yamato, F.court],
        [D.kinai, F.court],
        [D.tokai, F.court],
        [D.kanto, F.court],
        [D.kyushu, F.court],
        [D.west, F.court],
        [D.shikoku, F.court],
        [D.ou, F.emishi],
      ],
      F.court,
    ),
  },
  shadeNotes: {
    710: '遷都平城：律令國家以畿內為核心，東北著蝦夷示意。',
    752: '東大寺大佛開眼前後，佛教國家儀禮高峰。',
    764: '惠美押勝之亂：藤原仲麻呂敗，畿內短暫標藤原活動帶。',
    784: '遷長岡京前夕；桓武朝將轉入平安。',
  },
  routes,
  places: [
    { name: '平城京', x: 705.0, y: 762.0 },
    { name: '難波', x: 677.5, y: 771.8 },
    { name: '東大寺', x: 708.0, y: 760.0 },
    { name: '多賀城方向', x: 960.1, y: 471.7 },
  ],
  events: [
    {
      id: 'nr-710',
      year: 710,
      title: '遷都平城京',
      desc: '和銅三年遷都奈良平城京。律令與佛教並盛。',
      factions: [F.court],
      location: '平城京',
      type: 'politics',
      source: '《續日本紀》',
    },
    {
      id: 'nr-752',
      year: 752,
      title: '東大寺大佛開眼',
      desc: '盧舍那佛開眼供養，象徵律令佛教國家。',
      factions: [F.court],
      location: '東大寺',
      type: 'politics',
      source: '《續日本紀》；日本古代史通說',
    },
    {
      id: 'nr-764',
      year: 764,
      title: '惠美押勝之亂',
      desc: '藤原仲麻呂起兵失敗被殺，稱德—道鏡政局轉折。',
      factions: [F.fujiwara, F.court],
      location: '近畿',
      type: 'war',
      source: '《續日本紀》',
    },
    {
      id: 'nr-784',
      year: 784,
      title: '遷長岡京',
      desc: '桓武天皇遷長岡，其後再遷平安京，奈良時代結束。',
      factions: [F.court],
      location: '長岡',
      type: 'politics',
      source: '《續日本紀》',
    },
  ],
  people: [
    {
      id: 'nr-shomu',
      name: '聖武天皇',
      faction: F.court,
      role: '天皇',
      death: 756,
      summary: '推動東大寺與國分寺制度。',
      source: '《續日本紀》',
    },
    {
      id: 'nr-nakamaro',
      name: '藤原仲麻呂',
      aka: '惠美押勝',
      faction: F.fujiwara,
      role: '大臣',
      death: 764,
      summary: '專權後起兵敗死。',
      source: '《續日本紀》',
    },
  ],
  situation: {
    [F.court]: profile({
      population: fact(
        '律令有戶籍、計帳制度，但傳世精確「某年全國口數」不宜直接當總冊入圖。',
        '《續日本紀》；日本古代史通說',
        true,
      ),
      military: fact('衛府與征夷軍有編制敘事，全國兵籍總數不載。', '《續日本紀》', true),
      grain: fact('租庸調是財政語言。斛數因帳而異。', '律令通說'),
      politics: fact('天皇—太政官體制。藤原氏常居中樞。', '《續日本紀》'),
      economy: fact('京與畿內是財政核心；東北經營耗費大。', '日本古代史通說'),
    }),
    [F.fujiwara]: profile({
      population: fact('藤原氏不是獨立戶籍單位。', '日本古代史通說'),
      military: fact('仲麻呂能動員部分兵力，敗於764年。', '《續日本紀》', true),
      grain: fact('靠官職與庄园。無獨立倉斛。', '日本古代史通說'),
      politics: fact('北家等支系長期掌政。', '日本古代史通說'),
      economy: fact('庄园與貴族經濟。', '日本古代史通說'),
    }),
    [F.emishi]: profile({
      population: fact('東北未完全編戶，口數不詳。', '《續日本紀》系', true),
      military: fact('與朝廷軍屢有衝突。兵數不載。', '《續日本紀》', true),
      grain: fact('在地農業、狩獵。無租庸調總冊。', '日本古代史通說'),
      politics: fact('色塊表示未納入完整律令支配的地帶。', '地圖圖例'),
      economy: fact('與城柵貿易、朝貢關係複雜。', '日本古代史通說'),
    }),
  },
  leadersByYear: {
    710: [
      { faction: F.court, name: '元明天皇', role: '遷都', source: '《續日本紀》' },
    ],
    752: [
      { faction: F.court, name: '聖武天皇', role: '大佛開眼', source: '《續日本紀》' },
    ],
    764: [
      {
        faction: F.fujiwara,
        name: '藤原仲麻呂',
        role: '起兵敗死',
        source: '《續日本紀》',
      },
      { faction: F.court, name: '稱德天皇', role: '朝廷', source: '《續日本紀》' },
    ],
    784: [
      { faction: F.court, name: '桓武天皇', role: '遷長岡', source: '《續日本紀》' },
    ],
  },
  emptyHint: '此年無登錄專條。試 710、752、764、784。',
  detailFor: noDetail,
  readingFor: noReading,
}
