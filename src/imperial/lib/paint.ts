import type { ProvinceId } from '../../data/provinces'
import { PROVINCES } from '../../data/provinces'

export type Control = Partial<Record<ProvinceId, string>>

export function fillAll(faction: string): Control {
  const out: Control = {}
  for (const p of PROVINCES) out[p.id] = faction
  return out
}

export function patch(base: Control, next: Control): Control {
  return { ...base, ...next }
}

export function omit(base: Control, ids: ProvinceId[]): Control {
  const out: Control = { ...base }
  for (const id of ids) delete out[id]
  return out
}
