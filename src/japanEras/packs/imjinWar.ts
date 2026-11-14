/**
 * imjinWar.ts — 文祿・慶長之役（壬辰戰爭／萬曆朝鮮之役，1592–1598）
 *
 * 掛在安土桃山 pack 的「時段地圖窗口」（DeepDiveMapWindow）：年份落在
 * 1592–1598 時，地圖整套由日本列島切到東亞戰區底圖（與「明治至當代」
 * 同一套 Natural Earth 1:50m 投影，1710×1000），拖出區間即切回。
 * 領土區塊由 scripts/gen_imjin_territory.mjs 產生（src/geo/imjinTerritory.ts）。
 *
 * 史料口徑（AGENTS.md）：逐字引文只用 zh.wikisource 可逐字比對者，本檔
 * 全部出自《明史》卷三百二十〈朝鮮傳〉（scripts/qsrc.py 覆核命中）；查無
 * 逐字本文者一律寫「通說整理，非逐字引文」。朝鮮方《宣祖實錄》『懲毖錄』、
 * 日本方『懲韓軍記類』在本庫無逐字比對通道，其內容只以轉述收錄，不冒充原文。
 * 各方分歧的人數、船數一律 disputed、不寫定數。
 */
import { asiaPx, ASIA_LAND, ASIA_GRATICULE } from '../../geo/asiaWarBase'
import { IMJIN_EXTENTS } from '../../geo/imjinTerritory'
import type { MarchRoute } from '../../data/marchRoutes'
import type { DeepDiveDomain, DeepDiveMapWindow } from '../deepDiveTypes'
import type { EraFaction } from '../types'

export const IMJIN_F = {
  jp: '日軍',
  ming: '明軍',
  joseon: '朝鮮',
} as const

/** 經緯度寫坐標，再由 asiaPx 投影——同底圖同一套註冊坐標 */
const P = (lon: number, lat: number) => asiaPx(lon, lat)
const route = (
  id: string,
  name: string,
  year: number,
  faction: string,
  source: string,
  coords: [number, number][],
  kind: 'land' | 'sea' = 'land',
): MarchRoute => ({
  id,
  name,
  year,
  faction,
  kind,
  source,
  points: coords.map(([lo, la]) => P(lo, la)),
})

/**
 * 戰區圖重畫版行軍線（經緯度直寫）。戰國列島圖上的 korea-* 四條只畫九州
 * 集結段，留在 azuchiPack；本檔是東亞戰區坐標系下的完整路線，兩者不混繪。
 * 海路每一點取海面（Natural Earth 1:50m 口徑，audit:map 會逐點驗）。
 */
const RAW_ROUTES: MarchRoute[] = [
  route(
    'imjin-1592-nagashima', '倭船隊：名護屋→釜山浦', 1592, IMJIN_F.jp,
    '通說整理，非逐字引文；《明史》卷三百二十：「（萬曆二十年夏五月）秀吉遂分渠帥行長、清正等率舟師逼釜山鎮」。' +
      '起點取名護屋灣外錨地（129.95E/33.52N，名護屋城 130.22E/33.44N 在內陸市區，照實坐標會判陸），' +
      '終點取釜山浦外海；釜山城（129.04E/35.07N）在陸上，不作海路端點',
    [[129.96, 33.55], [129.6, 34.15], [129.34, 34.68], [129.15, 34.95], [129.09, 35.02]],
    'sea',
  ),
  route(
    'imjin-1592-konishi', '小西行長軍：釜山→王京→平壤', 1592, IMJIN_F.jp,
    '《明史》卷三百二十：「秀吉遂分渠帥行長、清正等率舟師逼釜山鎮，潛渡臨津」「而是時倭已入王京……八道幾盡沒」。' +
      '路線取朝鮮南部至漢陽、平壤之道：釜山—密陽—大邱—尚州—鳥嶺—忠州—王京—開城—平壤，' +
      '沿海河谷地示意，未逐一貼合道路彎折',
    [[129.04, 35.07], [128.75, 35.3], [128.6, 35.87], [128.13, 36.42], [127.92, 36.99], [127.2, 37.24], [126.98, 37.57], [126.56, 37.97], [125.78, 38.75], [125.75, 39.03]],
  ),
  route(
    'imjin-1592-katsu', '加藤清正軍：東路沿海岸北上', 1592, IMJIN_F.jp,
    '通說整理，非逐字引文（東路軍行軍線據日方軍記與朝鮮諸錄轉述）。' +
      '登陸點取鬱陵道方面江原道東海岸（129.37E/36.03N 近永興浦），沿東海岸北上、越太白山北麓、' +
      '經鐵原至平壤；釜山非本線起點，本線不畫慶尚南道',
    [[129.37, 36.03], [129.4, 36.85], [129.22, 37.49], [128.87, 38.11], [128.6, 38.4], [127.9, 38.05], [127.29, 38.14], [126.5, 38.6], [125.75, 39.03]],
  ),
  route(
    'imjin-1592-kwallim', '權慄軍：全州反攻→平壤收復', 1592, IMJIN_F.joseon,
    '朝鮮通說（《宣祖實錄》轉述，非逐字引文）；錦川之戰九月六日勝，《明史》卷三百二十「平壤遂復」條同段可參。' +
      '路線取湖南道北上游：全州—錦川—安城—水原—王京—平壤，示意',
    [[127.15, 35.82], [127.33, 36.22], [127.0, 37.08], [127.02, 37.29], [126.98, 37.57], [126.56, 37.97], [125.78, 38.75], [125.75, 39.03]],
  ),
  route(
    'imjin-1593-crossing', '宋應昌軍：渡鴨綠江進駐', 1593, IMJIN_F.ming,
    '《明史》卷三百二十：「（冬十月）應昌入朝鮮」「十二月，以李如松為東征提督。明年正月，如松督諸將進戰，大捷於平壤」。' +
      '明軍由遼東渡鴨綠江，循西大路南下：渡口（義州—新義州一帶，124.4E/39.8N）位置屬示意，' +
      '因鴨綠江下游為界河、河道古今變遷，且 1:50m 底圖在此以河口灣處理，故首點取渡口以南之陸地；' +
      '其後經定州、郭山、安州、肅川至平壤，再南下黃州、開城至王京',
    [
      [124.45, 39.86],
      [125.68, 39.92],
      [125.68, 39.72],
      [125.37, 39.48],
      [125.54, 39.19],
      [125.73, 39.03],
      [125.7, 38.04],
      [126.55, 37.97],
      [126.98, 37.57],
    ],
  ),
  route(
    'imjin-1593-pursuit', '李如松軍：平壤大捷後南追', 1593, IMJIN_F.ming,
    '《明史》卷三百二十：「大捷於平壤。行長渡大同江，遁還龍山。所失黃海、平安、京畿、江原四道並復，清正亦遁還王京」。' +
      '追擊線自平壤渡大同江而南——薩里院—黃州—開城；碧蹄館之敗在開城赴王京道上，另條不併畫',
    [[125.75, 39.03], [125.78, 38.75], [125.7, 38.04], [126.56, 37.97]],
  ),
  route(
    'imjin-1594-supply', '日軍補給海路：對馬→釜山→倭城線', 1594, IMJIN_F.jp,
    '通說整理，非逐字引文；《明史》卷三百二十「而行長水師番休濟餉，往來如駛」記其有事。' +
      '對馬—釜山—巨濟島—南海島—順天倭城的海上補給線示意；每一點取海面',
    [[129.24, 34.41], [129.13, 34.95], [128.78, 34.9], [128.47, 34.8], [127.87, 34.7], [127.48, 34.8]],
    'sea',
  ),
  route(
    'imjin-1592-hansan', '李舜臣水師出動：閑山島之役', 1592, IMJIN_F.joseon,
    '通說整理，非逐字引文（《宣祖實錄》與『亂中雜錄』轉述）。閑山島海戰月份諸書差數日，本條取通說五月；' +
      '戰地坐標取閑山島南海面，船數與斬級各說分歧不寫定數；路線為朝鮮水師自海南出戰之示意',
    [[128.79, 34.95], [127.87, 34.7], [127.22, 34.47], [126.9, 34.41], [126.43, 34.47]],
    'sea',
  ),
  route(
    'imjin-1597-myeongnyang', '李舜臣水師：鳴梁海峽之役', 1597, IMJIN_F.joseon,
    '通說整理，非逐字引文。鳴梁海峽狹窄、潮流湍急，坐標取鳴梁海峽主槽海面；' +
      '是役詳情出於李氏家傳系統，與朝鮮官方記錄有出入，細節不取一家之言',
    [[126.63, 34.3], [126.42, 34.2], [126.34, 34.16], [126.28, 34.1]],
    'sea',
  ),
  route(
    'imjin-1598-noryang', '明水師：露梁截擊戰', 1598, IMJIN_F.ming,
    '《明史·陳璘傳》：「綎與璘合擊之」；《明史》卷三百二十：「石曼子引舟師救行長，陳璘邀擊敗之。諸倭揚帆盡歸」。' +
      '露梁海戰在巨濟島西北露梁海峽，明、朝鮮聯合水師截擊島津義弘退路；坐標取海面示意',
    [[128.01, 34.98], [127.99, 34.94], [127.73, 34.87], [127.5, 34.8], [127.44, 34.78]],
    'sea',
  ),
  route(
    'imjin-1597-invasion', '日軍再犯：釜山→晉州→忠清', 1597, IMJIN_F.jp,
    '《明史》卷三百二十：「丁酉再亂……陷南原，晉州、海州亦陷」（年份用明紀年）。' +
      '南路自釜山上陸取晉州，北上咸陽—莞城—全州方向，再折向忠清道北漢江一線，示意',
    [[129.04, 35.07], [128.6, 35.42], [128.1, 35.19], [127.72, 35.52], [127.34, 36.0], [127.38, 36.36], [127.51, 36.51], [127.15, 36.81]],
  ),
  route(
    'imjin-1598-retreat', '日軍撤退：忠清→釜山登舟', 1598, IMJIN_F.jp,
    '《明史》卷三百二十：「十一月，清正發舟先走……諸倭揚帆盡歸」；「是月……平秀吉死，各倭俱有歸志」。' +
      '各倭城棄守後沿南海路退集釜山一帶登舟，露梁之役即發生於退路上；本線為陸路段示意',
    [[127.15, 36.81], [127.51, 36.51], [127.92, 36.42], [128.35, 36.16], [128.6, 35.87], [128.75, 35.3], [129.04, 35.07]],
  ),
]

/** 海路 id 清單：audit_map_accuracy 據此逐點驗海面（檔名與 `SEA_ROUTE_IDS` 字面係閘門約定） */
export const SEA_ROUTE_IDS = new Set([
  'imjin-1592-nagashima',
  'imjin-1594-supply',
  'imjin-1592-hansan',
  'imjin-1597-myeongnyang',
  'imjin-1598-noryang',
])

export const IMJIN_ROUTES: MarchRoute[] = RAW_ROUTES

export const IMJIN_DOMAINS: DeepDiveDomain[] = IMJIN_EXTENTS.map((e) => ({
  id: e.id,
  name: e.name,
  d: e.d,
}))

// ---------- 版圖快照（朝鮮八道＋九州集結地；口徑見 territoryNote） ----------
// 逐年快照一律寫死字面 id：audit:map 要逐鍵查幾何，用展開或計算鍵會令整批 id 逃出閘門。
const CONTROL: Record<number, Record<string, string>> = {
  1592: {
    im_kyushu: IMJIN_F.jp,
    im_pyongan: IMJIN_F.jp,
    im_hwanghae: IMJIN_F.jp,
    im_gyeonggi: IMJIN_F.jp,
    im_gangwon: IMJIN_F.jp,
    im_chungcheong: IMJIN_F.jp,
    im_jeolla: IMJIN_F.joseon,
    im_gyeongsang: IMJIN_F.jp,
    im_hamgyong: IMJIN_F.joseon,
  },
  1593: {
    im_kyushu: IMJIN_F.jp,
    im_pyongan: IMJIN_F.ming,
    im_hwanghae: IMJIN_F.ming,
    im_gyeonggi: IMJIN_F.ming,
    im_gangwon: IMJIN_F.ming,
    im_chungcheong: IMJIN_F.jp,
    im_jeolla: IMJIN_F.joseon,
    im_gyeongsang: IMJIN_F.jp,
    im_hamgyong: IMJIN_F.joseon,
  },
  1595: {
    im_kyushu: IMJIN_F.jp,
    im_pyongan: IMJIN_F.ming,
    im_hwanghae: IMJIN_F.ming,
    im_gyeonggi: IMJIN_F.ming,
    im_gangwon: IMJIN_F.joseon,
    im_chungcheong: IMJIN_F.joseon,
    im_jeolla: IMJIN_F.joseon,
    im_gyeongsang: IMJIN_F.jp,
    im_hamgyong: IMJIN_F.joseon,
  },
  1597: {
    im_kyushu: IMJIN_F.jp,
    im_pyongan: IMJIN_F.ming,
    im_hwanghae: IMJIN_F.ming,
    im_gyeonggi: IMJIN_F.ming,
    im_gangwon: IMJIN_F.ming,
    im_chungcheong: IMJIN_F.jp,
    im_jeolla: IMJIN_F.joseon,
    im_gyeongsang: IMJIN_F.jp,
    im_hamgyong: IMJIN_F.joseon,
  },
  1598: {
    im_kyushu: IMJIN_F.jp,
    im_pyongan: IMJIN_F.joseon,
    im_hwanghae: IMJIN_F.joseon,
    im_gyeonggi: IMJIN_F.joseon,
    im_gangwon: IMJIN_F.joseon,
    im_chungcheong: IMJIN_F.joseon,
    im_jeolla: IMJIN_F.joseon,
    im_gyeongsang: IMJIN_F.joseon,
    im_hamgyong: IMJIN_F.joseon,
  },
}

const SHADE_NOTES: Record<number, string> = {
  1592: '年終概況：一月而三都陷、六道破；全羅道八月金川之敗前猶固守，咸鏡道次年始陷——色塊大於實控。',
  1593: '平壤收復後，大同江以北四道明軍收復，臨津江以南仍日軍據點；逐月變化大，色塊大於實控。',
  1595: '封貢期間，日軍退守慶尚道沿海倭城一線，其餘諸道歸朝鮮、明軍戍王京一帶——色塊大於實控。',
  1597: '丁酉再亂，日軍重占忠清、慶尚，明、朝鮮軍守漢江以北；一年內推移劇烈，此為年末快照——色塊大於實控。',
  1598: '露梁之役後日軍盡撤，八道全歸朝鮮；明軍次年亦盡撤。',
}

const PLACES = [
  ['名護屋', 130.22, 33.44], ['對馬', 129.3, 34.35], ['釜山浦', 129.04, 35.07],
  ['王京漢城', 126.98, 37.57], ['開城', 126.56, 37.97], ['平壤', 125.75, 39.03],
  ['義州', 124.4, 39.8], ['安州', 125.53, 39.49], ['黃州', 125.7, 38.04],
  ['咸興', 128.74, 39.79], ['江華', 126.41, 37.73], ['忠州', 127.92, 36.99],
  ['全州', 127.15, 35.82], ['錦川', 127.33, 36.22], ['晉州', 128.1, 35.19],
  ['蔚山', 129.21, 35.55], ['順天', 127.49, 34.85], ['閑山島', 126.54, 34.57],
  ['鳴梁', 126.34, 34.16], ['露梁', 127.7, 34.86], ['碧蹄館', 126.88, 37.68],
  ['義安道口', 124.98, 39.51],
].map(([name, lo, la]) => ({
  name: name as string,
  x: P(lo as number, la as number)[0],
  y: P(lo as number, la as number)[1],
}))

export const IMJIN_FACTIONS: EraFaction[] = [
  { id: IMJIN_F.jp, name: '日軍（豐臣政權出擊軍）', color: '#DC2626', activeFrom: 1592, activeTo: 1598, source: '《明史·朝鮮傳》稱「倭」；本圖用「日軍」為中性記稱' },
  { id: IMJIN_F.ming, name: '明軍（東征軍）', color: '#2563EB', activeFrom: 1592, activeTo: 1598, source: '《明史》卷二百四《宋應昌傳》、卷三百二十《朝鮮傳》' },
  { id: IMJIN_F.joseon, name: '朝鮮（宣祖朝廷與諸道義兵）', color: '#059669', activeFrom: 1592, activeTo: 1598, source: '朝鮮《宣祖實錄》轉述；八道官軍與義兵' },
]

export const IMJIN_WINDOW: DeepDiveMapWindow = {
  id: 'imjin-1592-1598',
  from: 1592,
  to: 1598,
  mapBase: {
    land: ASIA_LAND,
    graticule: ASIA_GRATICULE,
    w: 1710,
    h: 1000,
    credit: '底圖：Natural Earth 1:50m（world-atlas v2），圓柱投影 60°E–190°E／14°S–62°N',
    /**
     * 視窗內容（朝鮮半島、遼東、九州—對馬海路）只佔畫布 x 846–946、
     * y 251–408 一小塊，全幅顯示時朝鮮半島僅約 65px 寬，等於看不見。
     * 裁到經 118°–144°、緯 26°–46°（本州全境、朝鮮、華北沿海俱在），
     * 標題亦改「東亞戰區」；pan 可回看全幅。
     */
    view: { x: 763, y: 210, w: 342, h: 263 },
    title: '東亞戰區（今測海岸線）',
  },
  domains: IMJIN_DOMAINS,
  territoryByYear: CONTROL,
  shadeNotes: SHADE_NOTES,
  routes: IMJIN_ROUTES,
  places: PLACES,
  geometryNote: {
    approx: true,
    source:
      '朝鮮八道與九州以經緯度區間矩形定義，再由 scripts/gen_imjin_territory.mjs 剪裁至 Natural Earth 1:50m 陸地；地標命中驗證 18 條',
    note: '道界為通說示意，非實測政區邊界；色塊表示年度控制估計，不表示主權歸屬',
  },
  territoryNote:
    '八道為朝鮮王朝政區大界；「日軍領」色塊含意：破綻後實際控制多集中於城池、道路點，非整道管領。倭城線為日軍慶尚道沿海要塞一線。九州框示出兵集結地，非佔領區。',
}
