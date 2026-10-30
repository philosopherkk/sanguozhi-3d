import type {
  Feature,
  FeatureCollection,
  MultiPolygon,
  Polygon,
} from 'geojson'

/**
 * GeoJSON Feature properties for plate-traced territory layers under `src/data/territory/`.
 * Live schematic rings elsewhere should use {@link TerritoryGeometryProvenance} until swapped.
 */
export interface TerritoryFeatureProperties {
  /** 譚冊圖幅、日本學術地圖頁碼，或誠實標示非追蹤來源 */
  source_plate: string
  approx: boolean
  disputed?: boolean
  note?: string
  /** 地圖集全名，例如 譚其驤《中國歷史地圖集》第三冊 */
  atlas?: string
  /** 圖幅對應年代（公元年）；BC 用負數 */
  year?: number
  /** 座標參考說明，例如 EPSG:4326 或 relief 像素空間 */
  crs?: string
}

export type TerritoryPolygon = Polygon | MultiPolygon

export type TerritoryFeature = Feature<TerritoryPolygon, TerritoryFeatureProperties>

export type TerritoryFeatureCollection = FeatureCollection<
  TerritoryPolygon,
  TerritoryFeatureProperties
>

/** Empty collection — safe default until CB-01 / CB-02 digitization lands. */
export const EMPTY_TERRITORY_COLLECTION: TerritoryFeatureCollection = {
  type: 'FeatureCollection',
  features: [],
}

export function isTerritoryFeatureCollection(
  value: unknown,
): value is TerritoryFeatureCollection {
  if (typeof value !== 'object' || value === null) return false
  const v = value as { type?: string; features?: unknown }
  return v.type === 'FeatureCollection' && Array.isArray(v.features)
}
