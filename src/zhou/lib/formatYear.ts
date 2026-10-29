/** 負數紀年顯示為前770。 */
export function formatZhouYear(year: number): string {
  if (year < 0) return `前${-year}`
  if (year === 0) return '公元元年前後'
  return String(year)
}

/** 教科書分段：春秋至前476，其後至秦統一前為戰國。 */
export function zhouEraLabel(year: number): string {
  if (year <= -1601) return '夏'
  if (year <= -1047) return '商'
  if (year <= -771) return '西周'
  if (year <= -476) return '春秋'
  if (year <= -222) return '戰國'
  return '秦并天下'
}
