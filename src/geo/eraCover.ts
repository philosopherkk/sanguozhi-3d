import { ERA_RINGS, type EraRing } from './eraRegions'

/** 一個勢力在某年的色塊。環已經裁過陸地，不是三國州界。 */
export interface FactionRange {
  faction: string
  rings: EraRing[]
  /**
   * 組成這個色塊的環編號（ERA_RINGS 的 key），保留呼叫時寫入的順序與重複。
   * 稽核要靠這一份清單判斷兩張快照的幾何是否真的相同：只比 ring 座標太慢，
   * 只比勢力名又會把「換了環但勢力不變」的快照誤判成沿用。
   */
  ids: string[]
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
  return { faction, rings, ids: [...ids] }
}
