import type { ChinaEraBand } from '../types'

/** Schematic dynasty / period bands for the overview map (approx.). */
export const CHINA_ERA_BANDS: ChinaEraBand[] = [
  { id: 'chunqiu', label: '春秋', from: -770, to: -476, color: '#8b7355' },
  { id: 'zhanguo', label: '戰國', from: -475, to: -222, color: '#a67c52' },
  { id: 'qin', label: '秦', from: -221, to: -207, color: '#6b5b4a' },
  { id: 'han', label: '漢', from: -206, to: 219, color: '#c45c4a' },
  { id: 'sanguo', label: '三國', from: 220, to: 279, color: '#4a6fa5' },
  { id: 'jin', label: '晉／十六國／南北朝', from: 280, to: 580, color: '#5a7a5a' },
  { id: 'suitang', label: '隋唐', from: 581, to: 906, color: '#c9a227' },
  { id: 'wudai', label: '五代遼宋夏金', from: 907, to: 1270, color: '#7a5a8a' },
  { id: 'yuan', label: '元', from: 1271, to: 1367, color: '#3d5a4a' },
  { id: 'ming', label: '明', from: 1368, to: 1643, color: '#8b3a3a' },
  { id: 'qing', label: '清', from: 1644, to: 1911, color: '#2a4a6a' },
  { id: 'minguo', label: '中華民國', from: 1912, to: 1948, color: '#4a6a8a' },
  { id: 'prc', label: '中華人民共和國', from: 1949, to: 2026, color: '#8a3030' },
]

export const CHINA_YEAR_MIN = -770
export const CHINA_YEAR_MAX = 2026

export const CHINA_KEY_YEARS = [
  -770, -475, -221, -202, 220, 280, 589, 618, 645, 690, 880, 960, 1004, 1069,
  1271, 1279, 1368, 1405, 1449, 1644, 1912, 1949, 1978, 2026,
] as const
