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

/**
 * 以滑桿當下年份過濾快照色塊：色塊所屬勢力若登記了 activeFrom／activeTo
 * （政權號存續年份），超出年份即不再著色——沿用舊快照的年份裡，亡國之號
 * （如 1126 年的遼、1235 年的金、980 年的北漢）不該還留在圖上。
 * 沒有登記存續年份的勢力、色塊勢力未見於登錄者，一律照畫，其餘九包行為不變。
 */
export function activeExtensions(
  pack: ImperialPack,
  snapshot: ImperialSnapshot,
  year: number,
): NonNullable<ImperialSnapshot['extensions']> {
  const all = snapshot.extensions ?? []
  if (all.length === 0) return all
  const bounds = new Map(pack.factions.map((f) => [f.id, f]))
  return all.filter((ext) => {
    const f = bounds.get(ext.faction)
    if (!f) return true
    if (f.activeFrom != null && year < f.activeFrom) return false
    if (f.activeTo != null && year > f.activeTo) return false
    return true
  })
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
