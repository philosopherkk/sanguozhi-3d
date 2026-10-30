/**
 * Province rings in modern East Asia relief pixel space
 * (public/maps/china_edcp_relief.jpg, 1968×1567).
 * Coasts follow that relief's land. Inland edges are schematic — not 譚 plate-traced.
 */

import ringsData from './basemapProvinceRings.json'
import type { ProvinceId } from './provinces'
import {
  TK_PROVINCE_GEOMETRY,
  type TerritoryGeometryProvenance,
} from './territory/provenance'

export const BASEMAP_PROVINCE_RINGS_PROVENANCE: TerritoryGeometryProvenance =
  TK_PROVINCE_GEOMETRY

export const BASEMAP_WIDTH = ringsData.width as number
export const BASEMAP_HEIGHT = ringsData.height as number

export type ImgPt = [number, number]

const byId = ringsData.provinces as unknown as Record<string, ImgPt[][]>

/** JSON 頂層 approx/source（regen 時由 tighten_land_borders.py 保留） */
export const BASEMAP_RINGS_FILE_PROVENANCE = {
  approx: (ringsData as { approx?: boolean }).approx === true,
  source:
    (ringsData as { source?: string }).source ??
    TK_PROVINCE_GEOMETRY.source,
}

export function basemapRingsForProvince(id: ProvinceId): ImgPt[][] {
  return byId[id] ?? []
}

export function allBasemapProvinceIds(): ProvinceId[] {
  return Object.keys(byId) as ProvinceId[]
}
