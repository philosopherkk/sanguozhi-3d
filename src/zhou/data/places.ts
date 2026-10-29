/** 周世都邑，像素對齊現代東亞地勢（與州格同一套空間）。 */

export interface ZhouPlace {
  id: string
  name: string
  x: number
  y: number
  note: string
  source: string
  /** 含此年。不填則各時段都顯示。 */
  fromYear?: number
  /** 含此年。不填則不設結束。 */
  toYear?: number
}

export const ZHOU_PLACES: ZhouPlace[] = [
  {
    id: 'luoyi',
    name: '洛邑',
    x: 1261.2,
    y: 887.6,
    note: '平王東遷後的王城。色塊用司隸一格，大於實有王畿。',
    source: '《史記·周本紀》',
    fromYear: -770,
  },
  {
    id: 'chengzhou',
    name: '成周',
    x: 1261.2,
    y: 887.6,
    note: '西周東都。何尊說宅茲中國，中國指洛邑所在的中土。城本身小於司隸一格。',
    source: '何尊；《史記·周本紀》',
    fromYear: -1046,
    toYear: -772,
  },
  {
    id: 'yinxu',
    name: '殷墟',
    x: 1317.0,
    y: 821.7,
    note: '晚商都邑，在安陽。甲骨與墓葬主要是武丁以後。盤庚是否遷到這裡，《史記》與《竹書紀年》不一致。',
    source: '殷墟甲骨；《史記·殷本紀》；《竹書紀年》',
    fromYear: -1300,
    toYear: -1046,
  },
  {
    id: 'feng',
    name: '豐',
    x: 1140.1,
    y: 911.9,
    note: '西周都，在今西安以西。與鎬相鄰，圖上分成兩點。',
    source: '《史記·周本紀》',
    fromYear: -1046,
    toYear: -771,
  },
  {
    id: 'hao',
    name: '鎬',
    x: 1144.1,
    y: 913.3,
    note: '西周都，前771年犬戎攻破。次年平王東遷。',
    source: '《史記·周本紀》',
    fromYear: -1046,
    toYear: -771,
  },
  {
    id: 'linzi',
    name: '臨淄',
    x: 1440.7,
    y: 777.3,
    note: '齊都。田氏代齊後仍都臨淄。',
    source: '《史記·齊太公世家》《田敬仲完世家》',
    fromYear: -770,
  },
  {
    id: 'jiang',
    name: '絳',
    x: 1228.7,
    y: 850.0,
    note: '晉都，在河東。底圖并州一格含晉北，大於絳邑本身。',
    source: '《史記·晉世家》；《左傳》',
    fromYear: -770,
  },
  {
    id: 'ying',
    name: '郢',
    x: 1266.8,
    y: 1060.0,
    note: '楚郢都。前278年白起拔郢，楚東遷陳、壽春。',
    source: '《史記·楚世家》《白起王翦列傳》',
    fromYear: -770,
  },
  {
    id: 'xianyang',
    name: '咸陽',
    x: 1139.2,
    y: 907.5,
    note: '秦孝公十二年以後的秦都。春秋時秦都在雍、櫟陽，圖上仍標咸陽以便對照。',
    source: '《史記·秦本紀》',
    fromYear: -770,
  },
  {
    id: 'handan',
    name: '邯鄲',
    x: 1319.4,
    y: 801.7,
    note: '趙後來的都城。三家初分時趙的重心仍近晉陽。',
    source: '《史記·趙世家》',
    fromYear: -386,
  },
  {
    id: 'daliang',
    name: '大梁',
    x: 1322.6,
    y: 874.4,
    note: '魏惠王遷都後的魏都。此前魏都安邑，在河東。',
    source: '《史記·魏世家》',
    fromYear: -364,
  },
  {
    id: 'bo-zheng',
    name: '鄭亳',
    x: 1304,
    y: 876,
    note: '這一點取鄭州商城的鄭亳說，好讓它和洛邑分開。偃師西亳就在洛邑東側，再點一點會疊在一起，所以不另點。北亳又有山東等說。三說都沒有湯的自名可以裁定。前1600至前1301是時間軸上的早商。',
    source: '《史記·殷本紀》',
    fromYear: -1600,
    toYear: -1301,
  },
  {
    id: 'zhi',
    name: '彘',
    x: 1238,
    y: 812,
    note: '《周本紀》只寫厲王出奔於彘、死於彘。點放在臨汾以北、太原以南，取霍太山一帶的通說。本紀沒有寫霍州。這是流放的地名，不是新的都城。',
    source: '《史記·周本紀》',
    fromYear: -841,
    toYear: -828,
  },
  {
    id: 'qufu',
    name: '曲阜',
    x: 1388,
    y: 815,
    note: '《魯周公世家》說封於少昊之虛曲阜，伯禽代就封。點小於青州一格。前1040只是東征之後的架子。前771年以後魯仍都曲阜，春秋圖不再加點。',
    source: '《史記·魯周公世家》',
    fromYear: -1040,
    toYear: -771,
  },
  {
    id: 'lishan',
    name: '驪山',
    x: 1166,
    y: 924,
    note: '《周本紀》寫幽王被殺於驪山下。點放在鎬東，略為錯開，免得和豐、鎬疊成一點。實際的山更近鎬。這是標名，不是犬戎的全線。',
    source: '《史記·周本紀》',
    fromYear: -781,
    toYear: -771,
  },
]
