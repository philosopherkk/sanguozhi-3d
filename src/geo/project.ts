/** Rough Three Kingdoms theatre: 青藏高原東緣 → 沿海，嶺南 → 幽燕 */
export const MAP_BOUNDS = {
  lonMin: 98,
  lonMax: 124,
  latMin: 18,
  latMax: 43,
} as const

export const MAP_WIDTH = 26
export const MAP_DEPTH = 22

/** Equirectangular-ish projection into XZ plane (Y up). */
export function lonLatToWorld(lon: number, lat: number): [number, number] {
  const { lonMin, lonMax, latMin, latMax } = MAP_BOUNDS
  const x = ((lon - lonMin) / (lonMax - lonMin) - 0.5) * MAP_WIDTH
  const z = (0.5 - (lat - latMin) / (latMax - latMin)) * MAP_DEPTH
  return [x, z]
}

export function worldToLonLat(x: number, z: number): [number, number] {
  const { lonMin, lonMax, latMin, latMax } = MAP_BOUNDS
  const lon = ((x / MAP_WIDTH + 0.5) * (lonMax - lonMin) + lonMin)
  const lat = ((0.5 - z / MAP_DEPTH) * (latMax - latMin) + latMin)
  return [lon, lat]
}
