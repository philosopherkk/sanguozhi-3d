import type { ImperialPack } from '../types'

const FALLBACK = [
  '#8b3a3a',
  '#2f6b4f',
  '#2a4a6a',
  '#c9a227',
  '#6b3a6a',
  '#3a6a8a',
  '#8b7355',
  '#4a7a6a',
  '#c45c4a',
  '#5a4030',
]

export function imperialFactionColor(pack: ImperialPack, id: string): string {
  const hit = pack.factions.find((f) => f.id === id)
  if (hit) return hit.color
  let h = 0
  for (let i = 0; i < id.length; i += 1) h = (h + id.charCodeAt(i) * (i + 1)) % FALLBACK.length
  return FALLBACK[h]
}

export function imperialFactionName(pack: ImperialPack, id: string): string {
  return pack.factions.find((f) => f.id === id)?.name ?? id
}
