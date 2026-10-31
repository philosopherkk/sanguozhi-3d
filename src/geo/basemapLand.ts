/**
 * 陸域環線取自 basemapLandMask.json（離線預算，非執行期 PNG）。
 * 二維圖層在現代地形底圖上疊加這些環線，不再載入 public/maps 內之行政 PNG。
 */

import landData from './basemapLandMask.json'
import type { ImgPt } from '../data/basemapProvinces'

export const BASEMAP_LAND_RINGS: ImgPt[][] =
  landData.rings as unknown as ImgPt[][]
