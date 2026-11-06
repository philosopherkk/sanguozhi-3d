import type { MarchRoute } from '../../data/marchRoutes'
import { JP_ERA_RINGS } from '../../geo/japanEraRings'
import type { JapanDeepDivePack } from '../deepDiveTypes'
import { JP_DOMAINS, paintDomains } from '../jpDomains'
import { fact, noDetail, noReading, profile } from '../packHelpers'

const F = {
  bakufu: '幕府直轄',
  han: '諸藩',
  matsumae: '松前藩',
  ainu: '蝦夷（阿伊努）',
  ryukyu: '琉球國',
} as const

/**
 * 江戶時代三個非本州區塊。海岸環同其他日本時代同一套底圖坐標，
 * 由 scripts/gen_era_regions.py 喺列島海岸裁出，唔係手繪。
 * 松前只有渡島南部；蝦夷地全島到1869年先算入版圖。
 */
const EXTRA_DOMAINS = [
  {
    id: 'ezochi',
    name: '蝦夷地',
    ring: JP_ERA_RINGS.hokkaido[0],
    extraRings: [JP_ERA_RINGS.hokkaido[1]],
  },
  { id: 'matsumae', name: '松前（渡島南部）', ring: JP_ERA_RINGS.matsumae[0] },
  { id: 'ryukyu', name: '琉球諸島', ring: JP_ERA_RINGS.ryukyu[0] },
]

const DOMAINS = [...JP_DOMAINS, ...EXTRA_DOMAINS]

/**
 * 江戶時代往蝦夷、往琉球都係海路。箭咀行喺海面，唔跨陸地；
 * 落點用已裁好海岸環內嘅坐標（松前 916.9,342.9；目梨方面 1150,222）。
 */
const routes: MarchRoute[] = [
  {
    id: 'edo-1609-ryukyu',
    name: '島津征琉球',
    year: 1609,
    faction: F.han,
    source:
      '日本近世史通說；《琉球國舊記》等。薩摩藩兵由薩摩出海，喺沖繩本島登陸。箭咀喺海面，係航路示意',
    points: [
      [438.0, 985.0],
      [400.0, 1050.0],
      [360.0, 1120.0],
      [330.0, 1190.0],
      [307.0, 1250.0],
    ],
  },
  {
    id: 'edo-1669-shakushain',
    name: 'シャクシャイン之役（松前藩出兵）',
    year: 1669,
    faction: F.matsumae,
    source:
      '日本近世史通說；松前藩側史料《新羅東志》等。松前藩船沿道南海岸北上，雙方喺道東交戰。海路示意，戰場位置有爭議',
    points: [
      [916.9, 342.9],
      [940.0, 372.0],
      [1000.0, 398.0],
      [1090.0, 388.0],
      [1165.0, 340.0],
      [1210.0, 272.0],
      [1150.0, 222.0],
    ],
  },
  {
    id: 'edo-1789-menashi',
    name: '目梨・國後起事',
    year: 1789,
    faction: F.matsumae,
    source:
      '日本近世史通說；松前藩史料。商人衝突殺死阿伊努首領，藩廳派船彈壓。海路示意；本役無大規模戰鬥',
    points: [
      [916.9, 342.9],
      [960.0, 380.0],
      [1060.0, 390.0],
      [1180.0, 300.0],
      [1150.0, 222.0],
    ],
  },
]

/** 代表天領：大坂・甲府・駿府・佐渡・長崎・房州。大區劃示意，唔逐領劃色。 */
const BAKURYO = ['d2', 'd1', 'd15', 'd17', 'd26']

function paint(year: number): Record<string, string> {
  const groups: [string[], string][] = [
    [['ezochi'], F.ainu],
    [['ryukyu'], F.ryukyu],
    [BAKURYO, F.bakufu],
  ]
  if (year >= 1604) groups.push([['matsumae'], F.matsumae])
  return paintDomains(groups, F.han)
}

const KEY_YEARS = [1603, 1604, 1609, 1615, 1635, 1639, 1669, 1716, 1789, 1853, 1867]
const CONTROL: Record<number, Record<string, string>> = {}
for (const y of KEY_YEARS) CONTROL[y] = paint(y)

export const EDO_PACK: JapanDeepDivePack = {
  id: 'edo',
  title: '德川江戶',
  tag: '1603–1868 · 幕藩體制 · 松前與琉球在此 · 蝦夷未入版圖',
  footer:
    '日本 · 德川江戶（1603–1868）· 1603年家康任征夷大將軍 · 色塊係大區劃示意：幕府直轄只列大坂・甲府・駿府・佐渡・長崎・房州等代表，其餘歸諸藩，唔係逐領實界 · 松前只是渡島南部（1604年黑印），蝦夷地（阿伊努）不屬幕府版圖，1869年才改稱北海道 · 琉球1609年後為薩摩附庸但國王仍在，本圖仍標琉球國 · 1853年以後嘅逐月地圖見「幕末」 · 家康沒有征服整個北海道或沖繩',
  yearMin: 1603,
  yearMax: 1868,
  initialYear: 1635,
  ticks: [
    { year: 1603, label: '開幕' },
    { year: 1615, label: '大坂' },
    { year: 1635, label: '參勤' },
    { year: 1639, label: '鎖國' },
    { year: 1669, label: 'シャクシャイン' },
    { year: 1716, label: '吉宗' },
    { year: 1789, label: '目梨' },
    { year: 1853, label: '黑船' },
    { year: 1867, label: '奉還' },
  ],
  factions: [
    { id: F.bakufu, name: F.bakufu, color: '#2a4a5a', activeFrom: 1603, activeTo: 1868, source: '日本近世史通說' },
    { id: F.han, name: F.han, color: '#6a5a4a', activeFrom: 1603, activeTo: 1868, source: '日本近世史通說' },
    { id: F.matsumae, name: F.matsumae, color: '#8a6a4a', activeFrom: 1604, activeTo: 1868, source: '松前黑印記載（《徳川実紀》系）' },
    { id: F.ainu, name: F.ainu, color: '#5a6a5a', activeFrom: 1603, activeTo: 1868, source: '日本近世史通說；阿伊努自有領域' },
    { id: F.ryukyu, name: F.ryukyu, color: '#4a7a6a', activeFrom: 1603, activeTo: 1868, source: '琉球王國通說；1609年後為薩摩附庸' },
  ],
  domains: DOMAINS,
  keyYears: KEY_YEARS,
  territoryByYear: CONTROL,
  routes,
  places: [
    { name: '江戶', x: 890.1, y: 713.0 },
    { name: '京都', x: 691.0, y: 753.2 },
    { name: '大坂', x: 680.1, y: 776.9 },
    { name: '長崎', x: 400.0, y: 855.0 },
    { name: '薩摩', x: 424.3, y: 952.8 },
    { name: '松前', x: 916.9, y: 342.9 },
    { name: '箱館', x: 940.1, y: 345.7 },
    { name: '目梨', x: 1150.0, y: 222.0 },
    { name: '那覇', x: 307.9, y: 1253.2 },
  ],
  shadeNotes: {
    1603: '關原之後：德川氏領有關東，各大名領地犬牙交錯。本圖色塊只到大區劃。',
    1604: '松前氏獲賜黑印御朱印船貿易牌照，範圍是渡島南部與沿岸交易場，不是全蝦夷。',
    1609: '島津入侵琉球，國王尚寧被押到江戶。琉球王國繼續存在，一面納貢薩摩、一面受明清冊封，雙屬狀態維持到1872年。',
    1615: '大坂之陣後《武家諸法度》頒行，大名廢置、婚姻由幕府節制。',
    1635: '參勤交代制度化：大名隔年往來江戶，妻子留江戶。道路與宿場因而發達。',
    1639: '第三次鎖國令：禁止西班牙船來航；貿易收束到長崎（唐船、蘭船）。',
    1669: 'シャクシャイン之役：阿伊努與松前藩貿易衝突擴大，道東戰事。松前藩只控沿岸場所，內陸不屬其領。',
    1716: '吉宗就任八代將軍，後稱享保改革；米價、新田、目安箱等措施。',
    1789: '目梨・國後起事：貿易糾紛演成殺害事件，松前藩派船彈壓。阿伊努方面死者眾。',
    1853: '培理艦隊入江戶灣呈國書；1854年再至，翌年締結日美和親條約。逐月詳圖見「幕末」。',
    1867: '大政奉還與王政復古；次年戊辰戰爭開始。',
  },
  events: [
    {
      id: 'edo-1603-open',
      year: 1603,
      title: '家康任征夷大將軍，幕府開府',
      desc: '關原（1600）之後德川氏掌握關東，1603年家康在江戶開府。朝廷仍在京都，將軍由將軍家與御三家承襲。',
      factions: ['幕府直轄', '諸藩'],
      location: '江戶',
      type: 'politics',
      source: '《徳川実紀》；日本近世史通說',
    },
    {
      id: 'edo-1604-matsumae',
      year: 1604,
      title: '蠣崎慶広拝謁，賜姓松前、給黑印',
      desc: '蠣崎慶広歸順幕府，獲賜「松前」之姓與黑印御朱印船貿易牌照。其有效範圍是渡島南部與沿岸交易場，不是整個蝦夷。',
      factions: ['松前藩'],
      location: '松前',
      type: 'politics',
      source: '日本近世史通說；松前藩家世記載',
    },
    {
      id: 'edo-1609-ryukyu',
      year: 1609,
      title: '島津入侵琉球，尚寧王被押至江戶',
      desc: '薩摩藩兵渡海攻琉球，國王尚寧被押到江戶拜謁將軍。琉球王國不被吞併，繼續統治沖繩本島以外諸島，一面納貢薩摩、一面受明清冊封。',
      factions: ['諸藩', '琉球國'],
      location: '琉球',
      type: 'war',
      source: '《琉球國舊記》等；日本近世史與琉球關係史通說',
      note: '「琉球处分」是1872–1879年的事，不在本年。',
    },
    {
      id: 'edo-1615-osaka',
      year: 1615,
      title: '大坂之陣；《武家諸法度》頒行',
      desc: '冬之陣（1614年底）與夏之陣（1615年5–6月）滅豐臣氏。戰後以《武家諸法度》（元和令）節制大名：廢置、修城、婚姻皆須幕府許可。',
      factions: ['幕府直轄', '諸藩'],
      location: '大坂',
      type: 'war',
      source: '《徳川実紀》；日本近世史通說',
    },
    {
      id: 'edo-1635-sankin',
      year: 1635,
      title: '參勤交代制度化',
      desc: '外樣大名改為隔年往來江戶，妻子留居江戶。大名財政被道路與江戶宅邸消耗，同時道路、宿場與城下町因而發達。',
      factions: ['幕府直轄', '諸藩'],
      location: '江戶',
      type: 'politics',
      source: '日本近世史通說（寛永體制）',
    },
    {
      id: 'edo-1637-shimabara',
      year: 1637,
      title: '島原・天草一揆（1637–1638）',
      desc: '島原、天草的農民與吉利支丹起事，據原城。幕府動員諸藩鎮壓，城陷後死者眾。此後幕府對天主教取締更嚴。',
      factions: ['幕府直轄', '諸藩'],
      location: '島原',
      type: 'war',
      source: '日本近世史通說',
      disputed: true,
      note: '起事者人數與鎮壓軍動員數各方記載差異大，只宜約數。',
    },
    {
      id: 'edo-1639-sakoku',
      year: 1639,
      title: '第三次鎖國令，貿易收束長崎',
      desc: '禁止西班牙船來航，荷蘭船限定長崎出島，唐船亦在長崎。貿易、情報與西洋技術的入口收窄到一個口岸。',
      factions: ['幕府直轄'],
      location: '長崎',
      type: 'politics',
      source: '日本近世史通說（鎖國令系列）',
    },
    {
      id: 'edo-1657-meireki',
      year: 1657,
      title: '明曆大火',
      desc: '江戶大半燒失，死者以萬計。事後重建帶動江戶再擴張，也是幕府財政與都市形態的轉折點。',
      factions: ['幕府直轄'],
      location: '江戶',
      type: 'politics',
      source: '日本近世史通說',
      disputed: true,
      note: '死者數各家記載差距大。',
    },
    {
      id: 'edo-1669-shakushain',
      year: 1669,
      title: 'シャクシャイン之役（蝦夷）',
      desc: '松前藩的場所經營與貿易糾紛引發阿伊努各コタン連合抗爭，戰火延到道東。1671年松前藩以和談與暗殺終局。幕府未直接出兵，松前藩控制沿岸場所，內陸不屬其領。',
      factions: ['松前藩', '蝦夷（阿伊努）'],
      location: '蝦夷（道東）',
      type: 'war',
      source: '日本近世史通說；松前藩側史料《新羅東志》等',
      disputed: true,
      note: '戰場位置、參战コタン範圍與死者數均有爭議；阿伊努側無自己的文字記録。',
    },
    {
      id: 'edo-1716-yoshimune',
      year: 1716,
      title: '德川吉宗繼任（享保改革）',
      desc: '紀伊出身的吉宗成第八代將軍。增新田、穩米價、設目安箱、重整綱紀，史稱享保改革。',
      factions: ['幕府直轄'],
      location: '江戶',
      type: 'succession',
      source: '日本近世史通說',
    },
    {
      id: 'edo-1789-menashi',
      year: 1789,
      title: '目梨・國後起事（蝦夷）',
      desc: '松前藩商人在貿易衝突中殺害阿伊努首領，目梨、國後一帶阿伊努起而報復。藩廳派船彈壓，阿伊努方面死者眾，此後對蝦夷的貿易管制更嚴。',
      factions: ['松前藩', '蝦夷（阿伊努）'],
      location: '目梨・國後',
      type: 'war',
      source: '日本近世史通說；松前藩史料',
      disputed: true,
      note: '起因細節與死者數各方記載不一。',
    },
    {
      id: 'edo-1825-harai',
      year: 1825,
      title: '異國船打払令',
      desc: '幕府命各藩驅逐近岸的外國船。實務上各藩執行不一，1842年因澗戶船事件改為只驅逐、不打無駕駛能力的船。',
      factions: ['幕府直轄', '諸藩'],
      location: '沿海諸藩',
      type: 'politics',
      source: '日本近世史通說',
    },
    {
      id: 'edo-1837-oshio',
      year: 1837,
      title: '大塩平八郎之亂',
      desc: '饑饉中大阪的町人與幕臣大塩平八郎舉兵開倉，短時間內失敗。顯示幕府直轄地的社會裂痕。',
      factions: ['幕府直轄'],
      location: '大坂',
      type: 'war',
      source: '日本近世史通說',
    },
    {
      id: 'edo-1853-kurofune',
      year: 1853,
      title: '培理艦隊入江戶灣',
      desc: '四艘船入浦賀，呈遞國書；幕府破例向諸藩諮詢。翌年再至，1854年締結日美和親條約，開下田、箱館。逐月詳圖在「幕末」。',
      factions: ['幕府直轄'],
      location: '浦賀・江戶灣',
      type: 'politics',
      source: '日本近代史通說（培理遠征記録）',
    },
    {
      id: 'edo-1858-treaty',
      year: 1858,
      title: '日美修好通商條約；安政大獄',
      desc: '未經天皇敕許簽訂通商條約，開五口、行協定稅率。反對派被鎮壓（安政大獄），幕府權威反被動搖。',
      factions: ['幕府直轄', '諸藩'],
      location: '江戶',
      type: 'politics',
      source: '日本近代史通說',
    },
    {
      id: 'edo-1867-hōkan',
      year: 1867,
      title: '大政奉還',
      desc: '慶喜把政權還給朝廷，試圖保住德川家的主導。同年王政復古，次年戊辰戰爭開始（見「幕末」）。',
      factions: ['幕府直轄', '諸藩'],
      location: '京都',
      type: 'politics',
      source: '日本近代史通說',
    },
  ],
  people: [
    {
      id: 'ed-p-ieyasu',
      name: '德川家康',
      birth: 1543,
      death: 1616,
      faction: '幕府直轄',
      role: '開府將軍',
      summary: '關原之後掌握關東與全國秩序，1603年開府。晚年退居駿府仍掌決策（大御台）。',
      source: '《徳川実紀》；日本近世史通說',
    },
    {
      id: 'ed-p-iemitsu',
      name: '德川家光',
      birth: 1604,
      death: 1651,
      faction: '幕府直轄',
      role: '第三代將軍',
      summary: '確立參勤交代、武家諸法度體系與鎖國方向；朝廷方面以禁中並公家中制諸。',
      source: '日本近世史通說',
    },
    {
      id: 'ed-p-yoshimune',
      name: '德川吉宗',
      birth: 1684,
      death: 1751,
      faction: '幕府直轄',
      role: '第八代將軍',
      summary: '紀伊家出身，享保改革：增新田、穩米價、目安箱、解禁漢籍與蘭學書籍。',
      source: '日本近世史通說',
    },
    {
      id: 'ed-p-tadanori',
      name: '松平定信',
      birth: 1759,
      death: 1829,
      faction: '幕府直轄',
      role: '老中（寬政改革）',
      summary: '1787年起改革：節制奢侈、設根回御救小屋穩定米價，同時壓制異議（寛政異學之禁）。',
      source: '日本近世史通說',
    },
    {
      id: 'ed-p-matsumae-k',
      name: '松前慶広（蠣崎慶広）',
      birth: 1548,
      death: 1616,
      faction: '松前藩',
      role: '初代松前藩主',
      summary: '歸順幕府獲賜黑印，取得渡島南部與對阿伊努貿易的專營地位；其後藩政以場所經營為核心。',
      source: '日本近世史通說；松前藩家世記載',
    },
    {
      id: 'ed-p-shakushain',
      name: 'シャクシャイン',
      death: 1672,
      faction: '蝦夷（阿伊努）',
      role: 'コタン連合領袖（1669年）',
      summary: '松前藩貿易與場所糾紛中整合道東各コタン抗爭；1671年和談後被殺。其名與事跡出松前藩側記録。',
      source: '《新羅東志》等松前藩史料；日本近世史通說',
      disputed: true,
      note: '本名、出身コタン與戰役細節在阿伊努口傳與藩側記錄中不一致。',
    },
    {
      id: 'ed-p-shonen',
      name: '尚寧',
      birth: 1564,
      death: 1620,
      faction: '琉球國',
      role: '琉球國王',
      summary: '1609年被薩摩押至江戶拜謁將軍；歸國後繼續統治，但向薩摩納貢，琉球雙屬格局自此。',
      source: '《琉球國舊記》等；琉球王國史通說',
    },
    {
      id: 'ed-p-mamiya',
      name: '間宮林蔵',
      birth: 1780,
      death: 1850,
      faction: '幕府直轄',
      role: '探險・測量家',
      summary: '測繪蝦夷地、樺太，確認韃靼海峽（間宮海峽）。幕府對北方版圖的知識主要來自這類實測。',
      source: '日本近世探險史通說',
    },
  ],
  situation: {
    '幕府直轄': profile({
      population: fact('幕府不掌握全國戶口總冊；直轄地的百姓數字各方推算不同。', '日本近世史通說', true),
      military: fact('直轄地與旗本・御家人的動員，加上對諸藩的軍役命令；沒有統一的常備軍數字。', '日本近世史通說', true),
      grain: fact('一般說天領石高約四百萬石上下，約佔全國石高數分一；各書統計口徑不同。', '日本近世史通說', true),
      politics: fact('將軍＋老中／若年寄；以《武家諸法度》、參勤交代與大名配分維系統治。', '日本近世史通說'),
      economy: fact('直轄地的年貢、礦山（佐渡等）、長崎貿易利益與諸藩賦役（助役）。', '日本近世史通說'),
    }),
    '諸藩': profile({
      population: fact('各藩戶口自領自報；無全國統一數字。', '日本近世史通說', true),
      military: fact('軍役由石高與家格決定，戰時召集，非常備。', '日本近世史通說', true),
      grain: fact('全國石高合計通常說約三千萬石，但為檢地數字，與實產有距離。', '日本近世史通說', true),
      politics: fact('外樣・譜代大名在藩廳自治，受幕府法度與參勤交代約束。', '日本近世史通說'),
      economy: fact('藩領年貢＋領內特產與馬市、港灣收入；大阪市場與諸藩藏屋敷是核心。', '日本近世史通說'),
    }),
    '松前藩': profile({
      population: fact('渡島南部與人地口數見於藩政記録，數字有出入。', '松前藩政記録；日本近世史通說', true),
      military: fact('動員規模有限；對蝦夷用場所番屋與鐵砲，兵力不大。', '日本近世史通說', true),
      grain: fact('渡島南部產量有限，藩庫主要靠對阿伊努貿易與海產。', '日本近世史通說'),
      politics: fact('1604年賜黑印，專營對蝦夷貿易；1669、1789年兩度出現大規模衝突。', '日本近世史通說'),
      economy: fact('場所制：藩將交易場租借給家臣或商人，阿伊努在其中納物、交易。', '日本近世史通說'),
    }),
    '蝦夷（阿伊努）': profile({
      population: fact('阿伊努人口無自己的文字統計，近世數字都由藩側估計，差異大。', '日本近世史通說', true),
      military: fact('以コタン為單位的動員；1669年一度連合道東各コタン。', '日本近世史通說', true),
      grain: fact('漁獵採集為本：鮭、海產、鹿皮、鷹羽；部分沿岸有耕作。', '日本近世史通說'),
      politics: fact('非幕府版圖。與松前藩以「シャクシャイン之役」等事件反覆衝突。', '日本近世史通說'),
      economy: fact('對松前藩的交易場納物交換米、鐵、酒；利益分配是衝突主因。', '日本近世史通說'),
    }),
    '琉球國': profile({
      population: fact('王國戶口見於中國與琉球側記録，數字各家不一。', '琉球王國史通說', true),
      military: fact('1609年對薩摩戰敗後不另建大軍；防衛由薩摩影子承擔。', '琉球王國史通說', true),
      grain: fact('沖繩本島與離島的石高統計以王府帳簿為準，口徑不一。', '琉球王國史通說', true),
      politics: fact('尚氏王統，首里王府；1609年後一面事薩摩、一面受明清冊封（雙屬）。', '琉球王國史通說'),
      economy: fact('以轉口貿易起家；近世以後糖、海產與朝貢貿易為主要收入。', '琉球王國史通說'),
    }),
  },
  leadersByYear: {
    1603: [{ faction: '幕府直轄', name: '德川家康', role: '征夷大將軍', source: '《徳川実紀》' }],
    1615: [
      { faction: '幕府直轄', name: '德川秀忠', role: '第二代將軍', source: '《徳川実紀》' },
      { faction: '幕府直轄', name: '德川家康', role: '大御台（駿府）', source: '《徳川実紀》' },
    ],
    1635: [{ faction: '幕府直轄', name: '德川家光', role: '第三代將軍', source: '日本近世史通說' }],
    1669: [
      { faction: '蝦夷（阿伊努）', name: 'シャクシャイン', role: 'コタン連合領袖', source: '《新羅東志》等' },
      { faction: '松前藩', name: '松前藩廳', role: '出兵指揮（藩主世系以通說）', source: '日本近世史通說' },
    ],
    1716: [{ faction: '幕府直轄', name: '德川吉宗', role: '第八代將軍', source: '日本近世史通說' }],
    1789: [
      { faction: '幕府直轄', name: '松平定信', role: '老中', source: '日本近世史通說' },
      { faction: '松前藩', name: '松前藩廳', role: '派船彈壓', source: '日本近世史通說' },
    ],
    1853: [{ faction: '幕府直轄', name: '德川家慶', role: '第十二代將軍', source: '日本近代史通說' }],
    1867: [{ faction: '幕府直轄', name: '德川慶喜', role: '末代將軍', source: '日本近代史通說' }],
  },
  emptyHint:
    '試 1603、1609、1635、1669、1789、1853 · 1669與1789會見到松前海路；1609見到薩摩到琉球的航路',
  detailFor: noDetail,
  readingFor: noReading,
}

