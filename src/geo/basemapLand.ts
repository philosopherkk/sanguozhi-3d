/**
 * Legacy land mask from sanguo_xingzheng_hant.png.
 * The 2D overlay now uses pre-clipped rings on the modern relief, not this mask.
 */

import landData from './basemapLandMask.json'
import type { ImgPt } from '../data/basemapProvinces'

export const BASEMAP_LAND_RINGS: ImgPt[][] =
  landData.rings as unknown as ImgPt[][]
