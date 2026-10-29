import factionsData from '../data/factions.json'
import type { SengokuFaction, SengokuFactionId } from '../types'

const factions = factionsData as SengokuFaction[]

const colorMap = new Map(factions.map((f) => [f.id, f.color]))
const nameMap = new Map(factions.map((f) => [f.id, f.name]))

export function sengokuFactionColor(id: SengokuFactionId | string): string {
  return colorMap.get(id as SengokuFactionId) ?? '#78716C'
}

export function sengokuFactionName(id: SengokuFactionId | string): string {
  return nameMap.get(id as SengokuFactionId) ?? String(id)
}

export function sengokuFactionsActiveInYear(year: number): SengokuFaction[] {
  return factions.filter((f) => year >= f.activeFrom && year <= f.activeTo)
}
