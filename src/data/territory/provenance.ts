/**
 * Honest geometry provenance for schematic / untraced border layers (CB-12).
 * Does not change coordinates — labels only until plate GeoJSON in this folder replaces rings.
 */

export interface TerritoryGeometryProvenance {
  approx: true
  source: string
  note?: string
  disputed?: boolean
}

/** 三國州格 lon/lat 與 basemap 像素環（待 CB-01 譚第三冊矢量化） */
export const TK_PROVINCE_GEOMETRY: TerritoryGeometryProvenance = {
  approx: true,
  source:
    '手繪經緯示意框，裁切對齊現代東亞地勢；非譚其驤《中國歷史地圖集》第三冊圖幅矢量化',
  note: '示意框為手繪調整，非逐縣考訂；幾何供閱讀定位，不作學術復原',
}

/** 日本大名域 seed-Voronoi（d0–d27 對照表；幾何已改 CODH 舊國 mesh） */
export const JAPAN_VORONOI_DOMAINS: TerritoryGeometryProvenance = {
  approx: true,
  source:
    '未經追蹤之示意分割：在現代列島地勢上按種子點作最近分割（Voronoi）',
  note: '僅作諸大名勢力域對照；實際著色幾何為舊國境界資料（見下）',
}

/** CODH 舊國·舊郡境界（CC BY-NC 4.0）— 見 ATTRIBUTION-CODH-BY-NC.md */
export const JAPAN_CODH_KOKUGUN_GEOMETRY: TerritoryGeometryProvenance = {
  approx: true,
  source:
    'CODH 舊國舊郡境界資料集（doi:10.20676/00000454，https://geoshape.ex.nii.ac.jp/kg/，NIHU 幕末明治地勢地圖境界資料）',
  note: '日文原名『舊國·舊郡境界データセット』；幕末明治舊國界網格；大名／藩歸屬仍示意，非以村落界推定藩界',
}

/** 北海道／琉球外周（K74·K75–K85 等 CODH 元件） */
export const JP_ERA_RINGS_GEOMETRY: TerritoryGeometryProvenance = {
  approx: true,
  source:
    'CODH 舊國資料集元件 K74 琉球、K75–K85 北海道開拓國；松前為 K78 渡島南部切分',
  note: '1604 松前非全島；1609–1879 琉球附庸／雙重朝貢示意；不臆造阿伊努政治界',
}

/** 戰國大名歸屬著色（待 CB-03 地圖圖幅） */
export const SENGOKU_CONTROL_GEOMETRY: TerritoryGeometryProvenance = {
  approx: true,
  source:
    '中文維基各氏專條／戰國大名領地通說；幾何 mesh 為 CODH 舊國（JAPAN_CODH_KOKUGUN_GEOMETRY）',
  note: '歸屬敘事出自通說整理，非學術地圖復原',
}

/** gen_era_regions.py 經緯示意框（待 CB-05 各冊分幅） */
export const ERA_REGIONS_GEOMETRY: TerritoryGeometryProvenance = {
  approx: true,
  source:
    '現代省界型經緯示意框，裁至現代海岸線；取譚其驤圖幅之「精神」，非圖幅追蹤',
  note: '非譚圖逐幅矢量化',
}

/** 簡化現代國界外輪（待分朝代 GeoJSON） */
export const MODERN_CHINA_OUTLINE_GEOMETRY: TerritoryGeometryProvenance = {
  approx: true,
  source: '簡化現代中國大陸輪廓像素環；非歷史各朝譚幅實測',
  note: '現代政區示意，不可當清／民國實控復原',
}

/** 民國軍閥 hand boxes（待 CB-11） */
export const WARLORD_RANGES_GEOMETRY: TerritoryGeometryProvenance = {
  approx: true,
  source: '手繪粗略地盤框；北洋—抗戰通說，非譚民國幅矢量化',
  note: '非譚圖追蹤',
}


export const APPROX_LEGEND_ZH =
  '疆域色塊為示意，並非譚其驤圖幅或學術地圖的矢量化追蹤。'

export const TK_TERRITORY_NOTE_ZH =
  '州界為示意，據勢力中心歸屬著色；細郡爭奪與羈縻未盡標出。幾何非譚第三冊圖幅追蹤。'

/** 幕末藩 dissolve（CC BY-SA 4.0）— 見 ATTRIBUTION-CODH-HAN-BY-SA.md */
export const BAKUMATSU_HAN_GEOMETRY: TerritoryGeometryProvenance = {
  approx: true,
  source:
    'CODH／Geoshape『幕末期近世村領域データセット』· doi:10.5638/thagis.34.1.1 · https://geoshape.ex.nii.ac.jp/av/ · 本田謙一氏原典加工 · CC BY-SA 4.0',
  note: '村領域→藩 unary_union 示意；舊國 mesh（BY-NC）≠藩界；2015 農業集落邊界接合。',
}

export const BAKUMATSU_TERRITORY_NOTE_ZH =
  '色塊為幕末村領域匯集成藩的示意；舊國不等於藩界。資料：本田／CODH 幕末期近世村領域（CC BY-SA）。初期版本只繪主要藩；歸屬色仍依戊辰戰爭勢力對照。'

/**
 * 幕末地圖實際係混合幾何：藩級 mesh 只覆蓋 28 個舊國中的 21 個，
 * 未覆蓋的舊國改用舊國 mesh 補畫。出處要如實反映兩套來源。
 */
export const BAKUMATSU_HAN_PLUS_KOKUGUN_GEOMETRY: TerritoryGeometryProvenance = {
  approx: true,
  source:
    '藩級：CODH／Geoshape『幕末期近世村領域データセット』· doi:10.5638/thagis.34.1.1 · 本田謙一氏原典加工 · CC BY-SA 4.0；舊國級補完：CODH 舊國境界資料（BY-NC）',
  note: '藩級境界資料僅覆蓋二十八個舊國中的二十一個；其餘七個舊國以舊國境界補畫，同幅圖因此混合兩套幾何來源。',
}

export const BAKUMATSU_TERRITORY_NOTE_MIXED_ZH =
  '色塊為幕末村領域匯集成藩的示意；舊國不等於藩界。藩級幾何只覆蓋二十八個舊國中的二十一個，未覆蓋的舊國改用 CODH 舊國境界補畫，所以該圖混合 CC BY-SA 藩級與 BY-NC 舊國兩套幾何。歸屬色仍依戊辰戰爭勢力對照。'

export const JAPAN_TERRITORY_NOTE_ZH =
  '色塊邊界為 CODH 幕末明治舊國境界資料（CC BY-NC）；大名／藩歸屬仍屬示意，非以村界推定藩界。'

/**
 * 亞洲—太平洋戰區（明治至當代）色塊：以通說控制範圍之經緯度區間界定，
 * 再與 Natural Earth 1:50m 陸地求交集，故色塊只出現於陸地上。
 * 生成：scripts/gen_asia_war_territory.mjs；坐標系同 asiaWarBase.ts。
 */
export const ASIA_WAR_EXTENTS_GEOMETRY: TerritoryGeometryProvenance = {
  approx: true,
  source:
    '通說控制範圍以經緯度區間界定，再剪裁至 Natural Earth 1:50m 陸地（公有領域）',
  note: '控制範圍示意，非行政區界，亦不表示實效支配無爭議；實控線與爭議見對應事件之起因／經過／結果。',
}

export const ASIA_WAR_TERRITORY_NOTE_ZH =
  '色塊為通說控制範圍示意（經緯度界定後剪裁至真實海岸線），非行政區界；南京事件、沖繩戰、英帕爾等分歧數字一律標 disputed，不寫定數。'

/** 幕末／總覽共用：JP_ERA_RINGS 北海道窗（1869 開拓使，仍 approx） */
export const JP_ERA_RINGS_HOKKAIDO_1869_NOTE_ZH =
  '1869年7月開拓使設置、蝦夷地改稱北海道之行政示意；同年箱館戰爭，非全島即時平定。幾何為 CODH K75–K85。'

export const JP_ERA_RINGS_MATSUMAE_NOTE_ZH =
  '1604年起松前交易領（渡島南部示意），非全島征服；見《德川實紀》慶長九年。'

export const JP_ERA_RINGS_RYUKYU_DASHED_NOTE_ZH =
  '1609年起琉球對薩摩附庸、王國仍存之雙重朝貢示意（虛線）；1879年前非沖繩縣界。'
