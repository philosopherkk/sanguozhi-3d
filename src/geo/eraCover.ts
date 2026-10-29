import { ERA_RINGS, type EraRing } from './eraRegions'

/** 一個勢力在某年的色塊。環已經裁過陸地，不是三國州界。 */
export interface FactionRange {
  faction: string
  rings: EraRing[]
}

export function cover(faction: string, ...ids: string[]): FactionRange {
  const rings: EraRing[] = []
  for (const id of ids) {
    const part = ERA_RINGS[id]
    if (!part) continue
    for (const ring of part) {
      if (ring.length >= 3) rings.push(ring)
    }
  }
  return { faction, rings }
}
