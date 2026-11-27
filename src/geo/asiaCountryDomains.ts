/**
 * 朝鮮半島・中南半島・馬來群島之領域名示意多邊形與矢量底圖
 *
 * 資料：Natural Earth 1:50m 陸地（world-atlas@2 countries-50m.json，公有領域）
 * 投影：`asiaPx(lon, lat)`（等圓柱，經 60–190°、緯 -14–62°，畫布 1710×1000），
 *       與 `asiaWarBase.ts` 同一套座標；座標一律以經緯度撰寫，不手填畫布像素。
 * 方法：各領域名為通說勢力範圍之經緯度示意多邊形，繪於今測海岸線之上。
 * 注意：這些是區域範圍示意，不是現代行政區界或地籍界線，亦非譚其驤
 *       《中國歷史地圖集》圖幅矢量化；歷代政權界線之分歧見對應事件之
 *       起因／經過／結果與 `territoryByYear` 之註解。
 */

import type { DeepDiveDomain, DeepDiveVectorBasemap } from '../japanEras/deepDiveTypes'
import type { TerritoryGeometryProvenance } from '../data/territory/provenance'
import { ASIA_GRATICULE, ASIA_LAND, asiaPx } from './asiaWarBase'

const round1 = (n: number): number => Math.round(n * 10) / 10

/** 經緯度頂點序列 → SVG path（`M x y L … Z`，保留一位小數） */
export function poly(coords: [number, number][]): string {
  const parts = coords.map(([lon, lat], i) => {
    const [x, y] = asiaPx(lon, lat)
    return `${i === 0 ? 'M' : 'L'} ${round1(x)} ${round1(y)}`
  })
  return `${parts.join(' ')} Z`
}

/** 示意多邊形之幾何出處聲明（供地圖註解與稽核使用） */
export const ASIA_COUNTRY_GEOMETRY_PROVENANCE: TerritoryGeometryProvenance = {
  approx: true,
  source:
    '通說區域範圍以經緯度頂點手繪示意，再投影至 Natural Earth 1:50m 陸地海岸線（公有領域）',
  note: '僅作區域範圍對照，非現代行政區界、非地籍測量界線，亦非譚其驤《中國歷史地圖集》圖幅矢量化；實際界線隨年代變動，爭議見對應事件之起因／經過／結果。',
}

/** 四國矢量底圖（框住該國與周邊，陸地與經緯線同戰區底圖） */
export const COUNTRY_BASEMAPS: Record<
  'korea' | 'thailand' | 'vietnam' | 'malaysia',
  DeepDiveVectorBasemap
> = {
  korea: {
    land: ASIA_LAND,
    graticule: ASIA_GRATICULE,
    w: 1710,
    h: 1000,
    credit: 'Natural Earth 1:50m 陸地（公有領域）',
    title: '朝鮮半島歷史示意（今測海岸線）',
    view: { x: 782.7, y: 236.8, w: 197.3, h: 157.9 },
  },
  thailand: {
    land: ASIA_LAND,
    graticule: ASIA_GRATICULE,
    w: 1710,
    h: 1000,
    credit: 'Natural Earth 1:50m 陸地（公有領域）',
    title: '泰國與中南半島示意（今測海岸線）',
    view: { x: 420.0, y: 520.0, w: 255.0, h: 235.0 },
  },
  vietnam: {
    land: ASIA_LAND,
    graticule: ASIA_GRATICULE,
    w: 1710,
    h: 1000,
    credit: 'Natural Earth 1:50m 陸地（公有領域）',
    title: '越南歷史示意（今測海岸線）',
    view: { x: 490.0, y: 488.0, w: 245.0, h: 235.0 },
  },
  malaysia: {
    land: ASIA_LAND,
    graticule: ASIA_GRATICULE,
    w: 1710,
    h: 1000,
    credit: 'Natural Earth 1:50m 陸地（公有領域）',
    title: '馬來半島與婆羅洲示意（今測海岸線）',
    view: { x: 486.7, y: 664.5, w: 315.7, h: 184.2 },
  },
}

/** 朝鮮半島：遼東與北疆至慶尚道之區域示意 */
export const KOREA_DOMAINS: DeepDiveDomain[] = [
  {
    id: 'ko_liaodong',
    name: '遼東與北疆',
    d: poly([
      [121.5, 42.2],
      [126.5, 42.8],
      [129.0, 41.8],
      [126.0, 40.0],
      [123.8, 39.9],
      [121.8, 40.8],
    ]),
  },
  {
    id: 'ko_north',
    name: '北部（平壤・大同江）',
    d: poly([
      [124.2, 40.2],
      [128.5, 41.2],
      [129.8, 42.3],
      [128.8, 38.8],
      [125.0, 38.2],
    ]),
  },
  {
    id: 'ko_central',
    name: '中部（漢江流域）',
    d: poly([
      [126.0, 38.3],
      [128.9, 38.6],
      [129.2, 36.8],
      [126.5, 36.6],
    ]),
  },
  {
    id: 'ko_southwest',
    name: '西南（錦江・全羅）',
    d: poly([
      [126.2, 36.6],
      [127.8, 36.5],
      [127.8, 34.6],
      [126.1, 34.8],
    ]),
  },
  {
    id: 'ko_southeast',
    name: '東南（洛東江・慶尚）',
    d: poly([
      [127.8, 36.8],
      [129.5, 36.9],
      [129.2, 34.9],
      [127.8, 34.8],
    ]),
  },
]

/** 泰國：泰北、昭披耶平原、東北高原與南方地峽 */
export const THAILAND_DOMAINS: DeepDiveDomain[] = [
  {
    id: 'th_north',
    name: '泰北（蘭納・清邁）',
    d: poly([
      [97.6, 20.4],
      [100.8, 20.3],
      [101.2, 17.8],
      [98.0, 17.8],
    ]),
  },
  {
    id: 'th_central',
    name: '昭披耶平原（素可泰・大城・曼谷）',
    d: poly([
      [98.6, 17.8],
      [101.5, 17.6],
      [101.8, 13.4],
      [99.3, 13.5],
    ]),
  },
  {
    id: 'th_isan',
    name: '東北高原（呵叻）',
    d: poly([
      [101.3, 17.8],
      [105.4, 17.2],
      [105.2, 14.3],
      [101.6, 14.5],
    ]),
  },
  {
    id: 'th_south',
    name: '泰南地峽',
    d: poly([
      [98.3, 12.8],
      [100.3, 12.5],
      [101.8, 6.2],
      [99.0, 6.8],
    ]),
  },
]

/** 越南：紅河三角洲、中部海岸與湄公河三角洲 */
export const VIETNAM_DOMAINS: DeepDiveDomain[] = [
  {
    id: 'vn_north',
    name: '紅河三角洲（交趾・昇龍）',
    d: poly([
      [103.5, 22.8],
      [107.6, 21.8],
      [106.8, 19.8],
      [104.2, 20.0],
    ]),
  },
  {
    id: 'vn_central',
    name: '中部海岸（順化・占婆）',
    d: poly([
      [105.2, 19.8],
      [107.2, 19.6],
      [109.4, 13.0],
      [107.6, 12.6],
      [105.5, 17.2],
    ]),
  },
  {
    id: 'vn_south',
    name: '湄公河三角洲（嘉定・西貢）',
    d: poly([
      [104.8, 12.5],
      [108.4, 12.4],
      [106.9, 9.2],
      [104.7, 9.5],
    ]),
  },
]

/** 馬來西亞：馬來半島、淡馬錫與婆羅洲兩州 */
export const MALAYSIA_DOMAINS: DeepDiveDomain[] = [
  {
    id: 'my_peninsula',
    name: '馬來半島（馬六甲・吉隆坡・柔佛）',
    d: poly([
      [99.8, 6.5],
      [102.2, 6.2],
      [104.2, 1.4],
      [102.0, 1.8],
      [100.2, 4.2],
    ]),
  },
  {
    id: 'my_singapore',
    name: '淡馬錫／新加坡',
    d: poly([
      [103.5, 1.5],
      [104.1, 1.5],
      [104.1, 1.15],
      [103.5, 1.15],
    ]),
  },
  {
    id: 'my_sarawak',
    name: '砂拉越（婆羅洲西岸）',
    d: poly([
      [109.6, 2.0],
      [115.2, 4.9],
      [115.4, 3.2],
      [111.0, 0.9],
    ]),
  },
  {
    id: 'my_sabah',
    name: '沙巴（北婆羅洲）',
    d: poly([
      [115.2, 5.2],
      [117.5, 6.9],
      [119.2, 5.0],
      [117.8, 4.2],
      [115.4, 4.3],
    ]),
  },
]
