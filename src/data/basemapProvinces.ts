/**
 * Province rings in modern East Asia relief pixel space
 * (public/maps/china_edcp_relief.jpg, 1968×1567).
 * Coasts follow that relief's land. Inland edges follow the Yellow River,
 * Yangtze, Qinling, Daba, Taihang and Nanling. Stretches that are not
 * county-surveyed stay schematic; the map credit says 示意.
 */

import ringsData from './basemapProvinceRings.json'
import type { ProvinceId } from './provinces'

export const BASEMAP_WIDTH = ringsData.width as number
export const BASEMAP_HEIGHT = ringsData.height as number

export type ImgPt = [number, number]

const byId = ringsData.provinces as unknown as Record<string, ImgPt[][]>

export function basemapRingsForProvince(id: ProvinceId): ImgPt[][] {
  return byId[id] ?? []
}

export function allBasemapProvinceIds(): ProvinceId[] {
  return Object.keys(byId) as ProvinceId[]
}
