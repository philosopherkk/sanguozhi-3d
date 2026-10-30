/**
 * One modern East Asia relief for every China-era map.
 * Faction colours and period labels still change; the picture underneath does not.
 */

export interface HistoricalBasemap {
  id: string
  /** Apply when year is >= this and before next map */
  fromYear: number
  /** JPEG fallback (all browsers) */
  src: string
  /** Optional WebP; Map2D serves via `<picture>` when set */
  srcWebp?: string
  title: string
  credit: string
  license: string
  commonsUrl: string
}

const base = import.meta.env.BASE_URL

/**
 * Equidistant-conic relief of East Asia (Natural Earth), local copy.
 * Same file for 春秋戰國 and 東漢三國. Year range of the scrubber stays 184–280.
 */
export const HISTORICAL_BASEMAPS: HistoricalBasemap[] = [
  {
    id: 'east-asia-relief',
    fromYear: -770,
    /** 顯示用 1968×1567（州格座標）；原檔 7872×6268 解碼過慢 */
    src: `${base}maps/china_edcp_relief_display.jpg`,
    srcWebp: `${base}maps/china_edcp_relief_display.webp`,
    title: '現代東亞地勢（各時代共用）',
    credit: '維基共享資源〈China edcp relief location map.jpg〉· Uwe Dedering',
    license: 'CC BY-SA 3.0',
    commonsUrl:
      'https://commons.wikimedia.org/wiki/File:China_edcp_relief_location_map.jpg',
  },
]

export function basemapForYear(_year: number): HistoricalBasemap {
  return HISTORICAL_BASEMAPS[0]
}
