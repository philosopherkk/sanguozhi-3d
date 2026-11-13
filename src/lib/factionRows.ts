/** 補回「是年在任、惟該疆域快照無一區」的勢力，使勢力範圍面板成為勢力圖例的超集。
 *  這些勢力在地圖上本來就沒有色塊；若面板只列實際佔區者，等於在地圖上抹掉它們，
 *  使用者無從點開其人口、戰力與時代簡介（如 1868 年江戶開城後的幕府、1185 年的平氏）。 */
export function withLandlessFactions<T extends string>(
  rows: { faction: T; n: number }[],
  factions: readonly { id: T; activeFrom: number; activeTo: number }[],
  year: number,
): { faction: T; n: number }[] {
  const held = new Set(rows.map((r) => r.faction))
  const missing = factions
    .filter(
      (f) => !held.has(f.id) && year >= f.activeFrom && year <= f.activeTo,
    )
    .map((f) => ({ faction: f.id, n: 0 }))
  return missing.length ? [...rows, ...missing] : rows
}
