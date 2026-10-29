import type { JapanEraBand } from '../types'

export const JAPAN_ERA_BANDS: JapanEraBand[] = [
  { id: 'kofun', label: '古墳', from: 250, to: 537, color: '#6a5a4a' },
  { id: 'asuka', label: '飛鳥', from: 538, to: 710, color: '#8a6a4a' },
  { id: 'nara', label: '奈良', from: 710, to: 794, color: '#a08050' },
  { id: 'heian', label: '平安', from: 794, to: 1185, color: '#c4a574' },
  { id: 'kamakura', label: '鎌倉', from: 1185, to: 1333, color: '#5a6a8a' },
  { id: 'muromachi', label: '室町', from: 1336, to: 1573, color: '#4a7a6a' },
  { id: 'sengoku', label: '戰國', from: 1467, to: 1573, color: '#8b3a3a' },
  { id: 'azuchi', label: '安土桃山', from: 1573, to: 1603, color: '#8a4030' },
  { id: 'edo', label: '德川江戶', from: 1603, to: 1868, color: '#2a4a5a' },
  { id: 'bakumatsu', label: '幕末', from: 1853, to: 1868, color: '#6e2430' },
  { id: 'meiji', label: '明治', from: 1868, to: 1912, color: '#4a5a8a' },
  { id: 'taisho', label: '大正', from: 1912, to: 1926, color: '#5a6a7a' },
  { id: 'showa', label: '昭和', from: 1926, to: 1989, color: '#3a4a5a' },
  { id: 'heisei', label: '平成', from: 1989, to: 2019, color: '#4a5a6a' },
  { id: 'reiwa', label: '令和', from: 2019, to: 2026, color: '#5a4a6a' },
]

/** 年份落在重疊帶時，取起始年較後的一段。1868 是明治，1573 是安土桃山。 */
export function japanBandAt(year: number): JapanEraBand | undefined {
  let best: JapanEraBand | undefined
  for (const band of JAPAN_ERA_BANDS) {
    if (year < band.from || year > band.to) continue
    if (!best || band.from >= best.from) best = band
  }
  return best
}

export const JAPAN_YEAR_MIN = 1
export const JAPAN_YEAR_MAX = 2026

export const JAPAN_KEY_YEARS = [
  250, 538, 645, 710, 794, 1185, 1336, 1467, 1573, 1603, 1604, 1609, 1615, 1853,
  1868, 1869, 1879, 1945, 1972, 1989, 2019, 2026,
] as const
