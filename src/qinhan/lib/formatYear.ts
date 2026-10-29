/** 負數紀年顯示為前221；東漢以後用公元年。 */
export function formatQinHanYear(year: number): string {
  if (year < 0) return `前${-year}`
  if (year === 0) return '公元元年前後'
  return String(year)
}

/** 秦、楚漢、西漢、新、東漢。公元25年起算東漢。 */
export function qinHanEraLabel(year: number): string {
  if (year <= -207) return '秦'
  if (year <= -202) return '楚漢'
  if (year < 9) return '西漢'
  if (year < 25) return '新'
  return '東漢'
}
