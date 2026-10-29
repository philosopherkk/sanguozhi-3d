import type { FactionTerritoryShape } from './mergeFactionPolygons'
import type { ProvinceId } from '../data/provinces'

/**
 * 舊版把東漢州名對到橢圓。那仍是十八州的分配，不能再拿來畫其他朝代。
 * 三國深潛走 basemapProvinceRings；其餘時代只走 eraShapes。
 * 這個函數固定回傳空陣列，避免任何呼叫端退回漢代州格。
 */
export function schematicFactionShapes(
  _control: Partial<Record<ProvinceId, string>>,
): FactionTerritoryShape[] {
  return []
}
