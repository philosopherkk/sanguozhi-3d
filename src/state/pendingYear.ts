/**
 * 跨國連結要落在**對的那一年**，不是該時代的預設年。
 *
 * 各 app 的 year context 各自獨立、路由也不帶年份，所以用一個極小的
 * 一次性暫存：連結點下去時 `setPendingYear(1274)`，目標 app 的 year context
 * 初始化時 `takePendingYear(min, max)` 取走（取完即清空，超出範圍回 null，
 * 讓它退回自己的預設年，不會跳出一個不存在的年份）。
 */
let pending: number | null = null

export function setPendingYear(year: number | null): void {
  pending = year
}

/** 取走並清空。年份不在該專題的跨度內就回 null（退回預設年）。 */
export function takePendingYear(min: number, max: number): number | null {
  if (pending === null) return null
  const y = pending
  pending = null
  return y >= min && y <= max ? y : null
}

export function peekPendingYear(): number | null {
  return pending
}
