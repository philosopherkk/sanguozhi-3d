/**
 * 手維登記表（本 repo 無生成腳本，本檔就是唯一資料來源）。登記每一條 ERA_RINGS 環編號的實際依據。
 * 新增環編號時在本檔加一條登記即可（kind 五級見下），audit:ranges 規則 17 以本檔為準。
 * 目的：把「示意」拆成可稽核的等級，讓疆域幾何的改進可以被逐環驗收。
 * approx 一律 true，直到 plate-traced／gis-import 的 GeoJSON 取代座標。
 */

export type RingKind =
  | 'modern-province-proxy'
  | 'schematic-box'
  | 'text-derived'
  | 'plate-traced'
  | 'gis-import'

export interface RingProvenance {
  /** 這條環實際代表什麼 */
  basis: string
  /** 點名依據（《》或『』內的書名、政書、圖幅名） */
  source: string
  /** 該環所假定的政區制度；無制度則 '無' */
  institution: string
  kind: RingKind
  approx: true
}

export const RING_PROVENANCE: Record<string, RingProvenance> = {
  hlj: { basis: '黑龍江：民國東三省界，非當時政區', source: '現代行政界（民國東三省界）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  jl: { basis: '吉林：民國東三省界，非當時政區', source: '現代行政界（民國東三省界）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  ln: { basis: '遼寧：民國東三省界，非當時政區', source: '現代行政界（民國東三省界）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  rehe: { basis: '熱河：民國熱河省界（1928 始設），非當時政區', source: '現代行政界（民國熱河省界（1928 始設））；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  zhili: { basis: '直隸：清直隸省界，非當時政區', source: '現代行政界（清直隸省界）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  youyun: { basis: '幽薊（古）：依文獻地望的手繪區，非圖幅矢量化', source: '《書·禹貢》幽州；《漢書·地理志》', institution: '無', kind: 'text-derived', approx: true },
  shandong: { basis: '山東：現代山東省界，非當時政區', source: '現代行政界（現代山東省界）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  henan: { basis: '河南：現代河南省界，非當時政區', source: '現代行政界（現代河南省界）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  shanxi: { basis: '山西：現代山西省界，非當時政區', source: '現代行政界（現代山西省界）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  shaanxi: { basis: '陝西：現代陝西省界，非當時政區', source: '現代行政界（現代陝西省界）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  yanan: { basis: '延安：現代陝西北部地市界，非當時政區', source: '現代行政界（現代陝西北部地市界）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  gansu: { basis: '甘肅：現代甘肅省界，非當時政區', source: '現代行政界（現代甘肅省界）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  ningxia: { basis: '寧夏：民國寧夏省界（1928 始設），非當時政區', source: '現代行政界（民國寧夏省界（1928 始設））；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  qinghai: { basis: '青海：現代青海省界，非當時政區', source: '現代行政界（現代青海省界）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  xinjiang: { basis: '新疆：現代新疆維吾爾自治區界，非當時政區', source: '現代行政界（現代新疆維吾爾自治區界）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  tibet: { basis: '西藏：現代西藏自治區界，非當時政區', source: '現代行政界（現代西藏自治區界）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  sichuan: { basis: '四川：現代四川省界，非當時政區', source: '現代行政界（現代四川省界）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  yunnan: { basis: '雲南：現代雲南省界，非當時政區', source: '現代行政界（現代雲南省界）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  guizhou: { basis: '貴州：現代貴州省界，非當時政區', source: '現代行政界（現代貴州省界）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  guangxi: { basis: '廣西：現代廣西省界，非當時政區', source: '現代行政界（現代廣西省界）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  guangdong: { basis: '廣東：現代廣東省界，非當時政區', source: '現代行政界（現代廣東省界）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  hunan: { basis: '湖南：現代湖南省界，非當時政區', source: '現代行政界（現代湖南省界）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  hubei: { basis: '湖北：現代湖北省界，非當時政區', source: '現代行政界（現代湖北省界）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  jiangxi: { basis: '江西：現代江西省界，非當時政區', source: '現代行政界（現代江西省界）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  anhui_n: { basis: '安徽北部：現代安徽省界之半，非當時政區', source: '現代行政界（現代安徽省界之半）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  anhui_s: { basis: '安徽南部：現代安徽省界之半，非當時政區', source: '現代行政界（現代安徽省界之半）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  jiangsu_n: { basis: '江蘇北部：現代江蘇省界之半，非當時政區', source: '現代行政界（現代江蘇省界之半）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  jiangsu_s: { basis: '江蘇南部：現代江蘇省界之半，非當時政區', source: '現代行政界（現代江蘇省界之半）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  zhejiang_n: { basis: '浙江北部：現代浙江省界之半，非當時政區', source: '現代行政界（現代浙江省界之半）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  zhejiang_s: { basis: '浙江南部：現代浙江省界之半，非當時政區', source: '現代行政界（現代浙江省界之半）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  fujian: { basis: '福建：現代福建省界，非當時政區', source: '現代行政界（現代福建省界）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  chahar: { basis: '察哈爾：民國察哈爾省界（1928 始設），非當時政區', source: '現代行政界（民國察哈爾省界（1928 始設））；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  suiyuan: { basis: '綏遠：民國綏遠省界（1928 始設），非當時政區', source: '現代行政界（民國綏遠省界（1928 始設））；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  neimeng_w: { basis: '內蒙古西部：現代內蒙古自治區界，非當時政區', source: '現代行政界（現代內蒙古自治區界）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  steppe: { basis: '草原地帶：依文獻地望的手繪區，非圖幅矢量化', source: '《史記·匈奴列傳》；非編戶地帶', institution: '無', kind: 'text-derived', approx: true },
  yiluo: { basis: '伊洛盆地：依文獻地望的手繪區，非圖幅矢量化', source: '地理范圍；金文與《左傳》地望', institution: '無', kind: 'text-derived', approx: true },
  shang_yin: { basis: '商（殷墟期）：依文獻地望的手繪區，非圖幅矢量化', source: '《史記·殷本紀》世系與殷墟出土範圍', institution: '無', kind: 'text-derived', approx: true },
  zhou_wei: { basis: '西周王畿：依文獻地望的手繪區，非圖幅矢量化', source: '《詩·大雅》《逸周書》系；西周金文分布', institution: '無', kind: 'text-derived', approx: true },
  zhou_luoyi: { basis: '成周洛邑：依文獻地望的手繪區，非圖幅矢量化', source: '《書·洛誥》；何尊「宅茲中國」', institution: '無', kind: 'text-derived', approx: true },
  linzi: { basis: '齊都臨淄：依文獻地望的手繪區，非圖幅矢量化', source: '《史記·齊太公世家》；齊故城考古', institution: '無', kind: 'text-derived', approx: true },
  qi: { basis: '齊（春秋）：依文獻地望的手繪區，非圖幅矢量化', source: '《左傳》《國語·齊語》地望', institution: '無', kind: 'text-derived', approx: true },
  lu: { basis: '魯（春秋）：依文獻地望的手繪區，非圖幅矢量化', source: '《左傳》《國語·魯語》地望', institution: '無', kind: 'text-derived', approx: true },
  yan_early: { basis: '燕（早期）：依文獻地望的手繪區，非圖幅矢量化', source: '《史記·燕世家》；克罍等金文', institution: '無', kind: 'text-derived', approx: true },
  chu_early: { basis: '楚（早期）：依文獻地望的手繪區，非圖幅矢量化', source: '《史記·楚世家》；荊山一带', institution: '無', kind: 'text-derived', approx: true },
  jin_quwo: { basis: '晉（曲沃）：依文獻地望的手繪區，非圖幅矢量化', source: '《左傳》曲沃一系；天馬—曲村考古', institution: '無', kind: 'text-derived', approx: true },
  qin_guanzhong: { basis: '秦（關中）：依文獻地望的手繪區，非圖幅矢量化', source: '《史記·秦本紀》；雍、咸陽地望', institution: '無', kind: 'text-derived', approx: true },
  hanzhong: { basis: '漢中：依文獻地望的手繪區，非圖幅矢量化', source: '《書·禹貢》；《史記·高祖本紀》', institution: '無', kind: 'text-derived', approx: true },
  wu_delta: { basis: '吳（太湖）：依文獻地望的手繪區，非圖幅矢量化', source: '《史記·吳太伯世家》；《越絕書》', institution: '無', kind: 'text-derived', approx: true },
  yue_zhe: { basis: '越（浙江）：依文獻地望的手繪區，非圖幅矢量化', source: '《史記·越王句踐世家》', institution: '無', kind: 'text-derived', approx: true },
  han_state: { basis: '韓（春秋）：依文獻地望的手繪區，非圖幅矢量化', source: '《左傳》；其後為韓原', institution: '無', kind: 'text-derived', approx: true },
  wei_daliang: { basis: '魏（大梁）：依文獻地望的手繪區，非圖幅矢量化', source: '《史記·魏世家》；《戰國策》', institution: '無', kind: 'text-derived', approx: true },
  wei_hedong: { basis: '魏（河東）：依文獻地望的手繪區，非圖幅矢量化', source: '《史記·魏世家》；安邑地望', institution: '無', kind: 'text-derived', approx: true },
  zhao_handan: { basis: '趙（邯郸）：依文獻地望的手繪區，非圖幅矢量化', source: '《史記·趙世家》', institution: '無', kind: 'text-derived', approx: true },
  zhao_dai: { basis: '趙（代）：依文獻地望的手繪區，非圖幅矢量化', source: '《史記·趙世家》；趙北邊', institution: '無', kind: 'text-derived', approx: true },
  longxi: { basis: '隴西：依文獻地望的手繪區，非圖幅矢量化', source: '《史記·秦本紀》；《漢書·地理志》隴西郡', institution: '郡', kind: 'text-derived', approx: true },
  xia_yin: { basis: '夏（二里頭期）：依文獻地望的手繪區，非圖幅矢量化', source: '二里頭遺址分布；無同時文字自證', institution: '無', kind: 'text-derived', approx: true },
  hexie: { basis: '河西走廊：依文獻地望的手繪區，非圖幅矢量化', source: '《史記·大宛列傳》；漢四郡設後', institution: '郡', kind: 'text-derived', approx: true },
  jingnan: { basis: '荊南：依文獻地望的手繪區，非圖幅矢量化', source: '《漢書·地理志》南郡、長沙郡一带', institution: '郡', kind: 'text-derived', approx: true },
  annam: { basis: '日南以南：依文獻地望的手繪區，非圖幅矢量化', source: '《漢書·地理志》；《後漢書·馬援傳》', institution: '郡', kind: 'text-derived', approx: true },
  tang_anbei: { basis: '安北都護府：依文獻地望的手繪區，非圖幅矢量化', source: '《舊唐書·地理志》《唐會要》安北', institution: '羈縻', kind: 'text-derived', approx: true },
  tang_beiting: { basis: '北庭都護府：依文獻地望的手繪區，非圖幅矢量化', source: '《舊唐書·地理志》《新唐書·地理志》', institution: '羈縻', kind: 'text-derived', approx: true },
  tang_anxi: { basis: '安西都護府：依文獻地望的手繪區，非圖幅矢量化', source: '《舊唐書·地理志》《新唐書·西域傳》', institution: '羈縻', kind: 'text-derived', approx: true },
  tang_yalu: { basis: '安東／遼東：依文獻地望的手繪區，非圖幅矢量化', source: '《舊唐書·地理志》安東都護府', institution: '羈縻', kind: 'text-derived', approx: true },
  tang_silla: { basis: '新羅：依文獻地望的手繪區，非圖幅矢量化', source: '《舊唐書·新羅傳》《三國史記》', institution: '無', kind: 'text-derived', approx: true },
  tang_hehuang: { basis: '河湟（吐蕃界）：依文獻地望的手繪區，非圖幅矢量化', source: '《舊唐書·吐蕃傳》；長慶會盟界線', institution: '無', kind: 'text-derived', approx: true },
  hebei_song: { basis: '河北（宋）：現代河北省界代替河北路／京東路，非當時政區', source: '現代行政界（現代河北省界代替河北路／京東路）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  shanxi_n: { basis: '山西北部：現代山西省界之半，非當時政區', source: '現代行政界（現代山西省界之半）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  shanxi_s: { basis: '山西南部：現代山西省界之半，非當時政區', source: '現代行政界（現代山西省界之半）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  shanxi_song: { basis: '山西（宋）：現代山西省界代替河東路，非當時政區', source: '現代行政界（現代山西省界代替河東路）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  shaanxi_rest: { basis: '陝西（不含關中）：現代陝西省界，非當時政區', source: '現代行政界（現代陝西省界）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  qi_west: { basis: '齊（戰國西境）：依文獻地望的手繪區，非圖幅矢量化', source: '《史記·田敬仲完世家》；戰國齊界', institution: '郡', kind: 'text-derived', approx: true },
  qi_east: { basis: '齊（戰國東境）：依文獻地望的手繪區，非圖幅矢量化', source: '同上', institution: '郡', kind: 'text-derived', approx: true },
  hubei_n: { basis: '湖北北部：現代湖北省界之半，非當時政區', source: '現代行政界（現代湖北省界之半）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  hubei_s: { basis: '湖北南部：現代湖北省界之半，非當時政區', source: '現代行政界（現代湖北省界之半）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  anhui: { basis: '安徽：現代安徽省界，非當時政區', source: '現代行政界（現代安徽省界）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  jiangsu: { basis: '江蘇：現代江蘇省界，非當時政區', source: '現代行政界（現代江蘇省界）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  zhejiang: { basis: '浙江：現代浙江省界，非當時政區', source: '現代行政界（現代浙江省界）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  hebei: { basis: '河北：現代河北省界，非當時政區', source: '現代行政界（現代河北省界）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  taiwan: { basis: '台灣：現代台灣島界，非當時政區', source: '現代行政界（現代台灣島界）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  hainan: { basis: '海南：現代海南島界，非當時政區', source: '現代行政界（現代海南島界）；非譚圖圖幅', institution: '無', kind: 'modern-province-proxy', approx: true },
  realm_prc_1949: { basis: '1949 實控：依政書清單的手繪大勢框，非圖幅矢量化', source: '《共同綱領》；其時西南、沿海未定', institution: '省', kind: 'schematic-box', approx: true },
  realm_prc_1951: { basis: '1951 西藏協議後：依政書清單的手繪大勢框，非圖幅矢量化', source: '十七條協議；協議不等於行政推行', institution: '省', kind: 'schematic-box', approx: true },
  realm_qing_1668: { basis: '清康熙初：依政書清單的手繪大勢框，非圖幅矢量化', source: '《清史稿·地理志》', institution: '省', kind: 'schematic-box', approx: true },
  realm_qing_high: { basis: '清盛時邊疆區：依政書清單的手繪大勢框，非圖幅矢量化', source: '《清史稿·地理志》；將軍轄區', institution: '省', kind: 'schematic-box', approx: true },
  realm_ming_1368: { basis: '明初：依政書清單的手繪大勢框，非圖幅矢量化', source: '《明史·地理志》；《明太祖實錄》', institution: '省', kind: 'schematic-box', approx: true },
  realm_yuan_1368: { basis: '元末：依政書清單的手繪大勢框，非圖幅矢量化', source: '《元史·地理志》', institution: '省', kind: 'schematic-box', approx: true },
  realm_ming_1420: { basis: '明永樂後：依政書清單的手繪大勢框，非圖幅矢量化', source: '《明史·地理志》13 布政司；交趾布政司', institution: '省', kind: 'schematic-box', approx: true },
  realm_sui_581: { basis: '隋受禪初：依政書清單的手繪大勢框，非圖幅矢量化', source: '《隋書·高祖紀》；《隋書·地理志》大業前制', institution: '郡', kind: 'schematic-box', approx: true },
  realm_chen_581: { basis: '陳末：依政書清單的手繪大勢框，非圖幅矢量化', source: '《陳書》《南史》；其時江南郡縣', institution: '郡', kind: 'schematic-box', approx: true },
  realm_sui_589: { basis: '隋滅陳後：依政書清單的手繪大勢框，非圖幅矢量化', source: '《隋書·高祖紀》；《隋書·地理志》', institution: '郡', kind: 'schematic-box', approx: true },
  realm_tang_660: { basis: '唐初（顯慶前）：依政書清單的手繪大勢框，非圖幅矢量化', source: '《舊唐書·地理志》貞觀十道；《新唐書·地理志》', institution: '道', kind: 'schematic-box', approx: true },
  realm_tang_701: { basis: '唐長安二年十三道：依政書清單的手繪大勢框，非圖幅矢量化', source: '《舊唐書·地理志》；《唐會要》諸道', institution: '道', kind: 'schematic-box', approx: true },
  realm_yuan_1271: { basis: '元建國號後：依政書清單的手繪大勢框，非圖幅矢量化', source: '《元史·世祖紀》《元史·地理志》', institution: '省', kind: 'schematic-box', approx: true },
  realm_song_1271: { basis: '南宋末：依政書清單的手繪大勢框，非圖幅矢量化', source: '《宋史·地理志》', institution: '路', kind: 'schematic-box', approx: true },
  realm_yuan_1279: { basis: '元滅宋後：依政書清單的手繪大勢框，非圖幅矢量化', source: '《元史·地理志》行省', institution: '省', kind: 'schematic-box', approx: true },
  realm_qin_221: { basis: '秦并天下後：依政書清單的手繪大勢框，非圖幅矢量化', source: '《史記·秦始皇本紀》；譚第二冊秦圖（未矢量化）', institution: '郡', kind: 'schematic-box', approx: true },
  realm_qin_214: { basis: '秦嶺南定後：依政書清單的手繪大勢框，非圖幅矢量化', source: '《史記·秦始皇本紀》；桂林、象郡', institution: '郡', kind: 'schematic-box', approx: true },
  realm_han_202: { basis: '漢初郡國：依政書清單的手繪大勢框，非圖幅矢量化', source: '《漢書·地理志》；《史記》漢初封國', institution: '郡', kind: 'schematic-box', approx: true },
  realm_han_111: { basis: '西漢盛時：依政書清單的手繪大勢框，非圖幅矢量化', source: '《漢書·地理志》；河西四郡、交州九郡', institution: '郡', kind: 'schematic-box', approx: true },
  realm_han_25: { basis: '東漢開始：依政書清單的手繪大勢框，非圖幅矢量化', source: '《續漢書·郡國志》；建武并省', institution: '郡', kind: 'schematic-box', approx: true },
  realm_han_36: { basis: '東漢統一完成：依政書清單的手繪大勢框，非圖幅矢量化', source: '《後漢書·光武帝紀》；建武十二年', institution: '郡', kind: 'schematic-box', approx: true },
  realm_liao: { basis: '遼五京道：依政書清單的手繪大勢框，非圖幅矢量化', source: '《遼史·地理志》', institution: '道', kind: 'schematic-box', approx: true },
  realm_song_1004: { basis: '北宋澶淵後：依政書清單的手繪大勢框，非圖幅矢量化', source: '《宋史·地理志》23 路', institution: '路', kind: 'schematic-box', approx: true },
  realm_jin_1141: { basis: '金皇統後：依政書清單的手繪大勢框，非圖幅矢量化', source: '《金史·地理志》19 路', institution: '路', kind: 'schematic-box', approx: true },
  realm_song_1141: { basis: '南宋紹興和議後：依政書清單的手繪大勢框，非圖幅矢量化', source: '《宋史·地理志》；淮水—大散關界', institution: '路', kind: 'schematic-box', approx: true },
  realm_qing_1644: { basis: '清入關初：依政書清單的手繪大勢框，非圖幅矢量化', source: '《清史稿·地理志》', institution: '省', kind: 'schematic-box', approx: true },
  realm_dashun_1644: { basis: '大順：依政書清單的手繪大勢框，非圖幅矢量化', source: '《明季北略》《甲申傳信錄》；存續極短', institution: '無', kind: 'schematic-box', approx: true },
  realm_ming_1644: { basis: '明末：依政書清單的手繪大勢框，非圖幅矢量化', source: '《明史·地理志》15 布政司', institution: '省', kind: 'schematic-box', approx: true },
}
