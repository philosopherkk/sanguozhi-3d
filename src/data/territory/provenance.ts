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
    '手繪經緯示意框，scripts/tighten_land_borders.py 裁至現代東亞地勢；非譚其驤《中國歷史地圖集》第三冊圖幅矢量化',
  note: '目標檔：tk_262_zhou.geojson',
}

/** 日本大名域 seed-Voronoi（d0–d27 對照表；幾何已改 CODH 旧国 mesh） */
export const JAPAN_VORONOI_DOMAINS: TerritoryGeometryProvenance = {
  approx: true,
  source:
    'untraced-modern-voronoi：現代列島地勢上最近種子分割（scripts/tighten_land_borders.build_japan_from_seeds）',
  note: '僅作 d0–d27 勢力域對照；著色 mesh 見 JAPAN_CODH_KOKUGUN_GEOMETRY',
}

/** CODH 旧国・旧郡境界（CC BY-NC 4.0）— 見 ATTRIBUTION-CODH-BY-NC.md */
export const JAPAN_CODH_KOKUGUN_GEOMETRY: TerritoryGeometryProvenance = {
  approx: true,
  source:
    'CODH『旧国・旧郡境界データセット』doi:10.20676/00000454 · https://geoshape.ex.nii.ac.jp/kg/ · NIHU 幕末明治地勢地図境界データ',
  note: '幕末明治旧国界 mesh；大名／藩歸屬仍示意，非 CODH 村→藩（CB-02b）',
}

/** 北海道／琉球外周（K74・K75–K85 等 CODH 元件） */
export const JP_ERA_RINGS_GEOMETRY: TerritoryGeometryProvenance = {
  approx: true,
  source:
    'CODH K74 琉球、K75–K85 北海道開拓國；松前為 K78 渡島南部切分（scripts/build_japan_kokugun_rings.py）',
  note: '1604 松前非全島；1609–1879 琉球附庸／雙重朝貢示意；不臆造阿イヌ政治界',
}

/** 戰國大名歸屬著色（待 CB-03 地圖圖幅） */
export const SENGOKU_CONTROL_GEOMETRY: TerritoryGeometryProvenance = {
  approx: true,
  source:
    '中文維基各氏專條／戰國大名領地通說；幾何 mesh 為 CODH 旧国（JAPAN_CODH_KOKUGUN_GEOMETRY）',
  note: '歸屬敘事非學術地圖 SoT',
}

/** gen_era_regions.py 經緯示意框（待 CB-05 各冊分幅） */
export const ERA_REGIONS_GEOMETRY: TerritoryGeometryProvenance = {
  approx: true,
  source:
    'scripts/gen_era_regions.py 現代省界型 lon/lat 示意框，裁至 china_edcp_relief 海岸；譚其驤「精神」非圖幅追蹤',
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
  '疆域色塊為示意；標示 approx 者非譚圖／非學術地圖矢量化追蹤。'

export const TK_TERRITORY_NOTE_ZH =
  '州界為示意，據勢力中心歸屬著色；細郡爭奪與羈縻未盡標出。幾何非譚第三冊圖幅追蹤。'

export const JAPAN_TERRITORY_NOTE_ZH =
  '色塊邊界為 CODH 幕末明治旧国 mesh（CC BY-NC，見 ATTRIBUTION-CODH-BY-NC.md）；大名／藩歸屬仍示意，非村→藩 dissolve（CB-02b 後續）。'

/** 幕末／總覽共用：JP_ERA_RINGS 北海道窗（1869 開拓使，仍 approx） */
export const JP_ERA_RINGS_HOKKAIDO_1869_NOTE_ZH =
  '1869年7月開拓使設置、蝦夷地改称北海道之行政示意（approx）；同年箱館戰爭，非全島即時平定。幾何為 CODH K75–K85。'

export const JP_ERA_RINGS_MATSUMAE_NOTE_ZH =
  '1604年起松前交易領（渡島南部示意），非全島征服；見《德川實紀》慶長九年。'

export const JP_ERA_RINGS_RYUKYU_DASHED_NOTE_ZH =
  '1609年起琉球對薩摩附庸、王國仍存之雙重朝貢示意（虛線）；1879年前非沖繩縣界。'
