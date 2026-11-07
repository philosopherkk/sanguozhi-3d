import type { ImperialPack, ImperialSnapshot } from '../types'

/**
 * 取 (year, month) 當下生效的快照。
 *
 * 快照沒有 month 時視為「年底」，因此不傳 month 的舊呼叫行為完全不變；
 * 有 month 時以 (year, month) 排序，令同一年的地圖可以逐月更換
 * （國共內戰 1945–1949 的逐月版圖即由此路徑生效）。
 */
export function resolveImperialSnapshot(
  pack: ImperialPack,
  year: number,
  month?: number | null,
): ImperialSnapshot {
  const atMonth = month ?? 12
  let best = pack.snapshots[0]
  for (const snap of pack.snapshots) {
    if (snapshotOrd(snap, year, atMonth) <= 0) best = snap
    else break
  }
  return best
}

/** 快照是否已於 (year, atMonth) 或之前生效：返回負數即代表已生效。 */
function snapshotOrd(snap: ImperialSnapshot, year: number, atMonth: number): number {
  if (snap.year !== year) return snap.year - year
  return (snap.month ?? 12) - atMonth
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
