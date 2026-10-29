/** 塞外示意。只標西北戎狄，不當作編戶政區。 */

export interface ZhouFrontierZone {
  id: string
  name: string
  source: string
  from: number
  to: number
  ring: [number, number][]
}

export const ZHOU_FRONTIER_ZONES: ZhouFrontierZone[] = [
  {
    id: 'rongdi',
    name: '戎狄，非編戶',
    source:
      '《左傳》記諸戎、狄；《史記·匈奴列傳》追述戎狄居北。此圈只標隴右塞外，不是郡縣。',
    from: -770,
    to: -221,
    ring: [
      [944.0, 878.0],
      [1003.0, 890.0],
      [1059.0, 876.0],
      [1035.0, 821.0],
      [964.0, 838.0],
    ],
  },
]
