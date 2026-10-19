import type { Faction } from '../types/data'
import factionsData from '../data/factions.json'
import type { FactionId } from '../types/data'

const factions = factionsData as Faction[]

const EXTRA: Partial<Record<FactionId, string>> = {
  其他: '#6a6a5a',
}

const map = new Map<FactionId, string>()
for (const f of factions) map.set(f.id, f.color)
for (const [id, color] of Object.entries(EXTRA) as [FactionId, string][]) {
  map.set(id, color)
}

export function factionColor(id: FactionId): string {
  return map.get(id) ?? '#888888'
}

export function factionName(id: FactionId): string {
  if (id === '其他') return '其他／未定'
  return factions.find((f) => f.id === id)?.name ?? id
}

export { factions as FACTION_LIST }
