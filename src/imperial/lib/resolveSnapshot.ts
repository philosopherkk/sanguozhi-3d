import type { ImperialPack, ImperialSnapshot } from '../types'

export function resolveImperialSnapshot(
  pack: ImperialPack,
  year: number,
): ImperialSnapshot {
  let best = pack.snapshots[0]
  for (const snap of pack.snapshots) {
    if (snap.year <= year) best = snap
    else break
  }
  return best
}

export function resolveImperialLeaders(
  pack: ImperialPack,
  year: number,
): NonNullable<ImperialPack['leadersByYear']>[number] {
  const table = pack.leadersByYear
  if (!table) return []
  const keys = Object.keys(table)
    .map(Number)
    .sort((a, b) => a - b)
  let best = keys[0]
  for (const y of keys) {
    if (y <= year) best = y
    else break
  }
  return table[best] ?? []
}
