/** Display signed year as 前770／1949. */
export function formatChinaYear(year: number): string {
  if (year < 0) return `前${-year}`
  if (year === 0) return '公元元年前後'
  return String(year)
}
