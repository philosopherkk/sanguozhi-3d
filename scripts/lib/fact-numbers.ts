/**
 * fact-numbers.ts — audit:fact 的數字比對規則，抽出來是為了能被測試。
 *
 * 為什麼要抽：2026-11-04 這層出過一個靜默失效的 bug——比對用「兩向子字串」，
 * 而索引去零之後含有 3、4 這種月份數字，結果任何含 3 的年份都被當成「資料裡已有」，
 * 憑空數字的數變成假的 0。規則本身必須有測試，否則檢查器壞了沒人知道。
 */

/** 從文字取出數字並去零：文字寫 1947-03、資料裡月份是 3，是同一個值。 */
export const nums = (s: string): Set<string> =>
  new Set((s.match(/\d{1,4}/g) ?? []).map((n) => String(Number(n))))

/**
 * 數值相等才算同一個事實。刻意不做子字串比對：
 * 索引裡有 '3'（月份）時，'1743'.includes('3') 會讓憑空的年份通過檢查。
 */
export const covered = (n: string, set: Set<string>): boolean => set.has(n)

/**
 * 白名單條目：字串＝理由（放行該條目裡這個數字）；
 * 物件＝理由＋必要的字面上下文（phrase），只有文字裡真的出現 phrase 才算已核過。
 *
 * 為什麼需要 phrase：「1950–51年」會被擷取出片段數字 51。若只放行 '51'，
 * 同一條目以後寫出任何 51（「51師」「殲敵51萬」）都會被當成已核過——
 * 白名單比它要管的東西更寬。
 */
export type AllowEntry = string | { reason: string; phrase: string }

/** 這個已核准的條目能不能蓋住這段文字裡的這個數字。 */
export function allowCovers(entry: AllowEntry | undefined, text: string): boolean {
  if (!entry) return false
  if (typeof entry === 'string') return true
  return text.includes(entry.phrase)
}

/** 列印用的理由。 */
export function allowReason(entry: AllowEntry): string {
  return typeof entry === 'string' ? entry : entry.reason
}
