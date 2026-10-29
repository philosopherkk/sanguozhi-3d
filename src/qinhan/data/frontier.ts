/** 塞外示意。匈奴不是郡縣編戶。 */

export interface QinHanFrontierZone {
  id: string
  name: string
  source: string
  from: number
  to: number
  ring: [number, number][]
}

export const QINHAN_FRONTIER_ZONES: QinHanFrontierZone[] = [
  {
    id: 'saiwai-north',
    name: '塞外·匈奴',
    source:
      '《史記·匈奴列傳》；《漢書·匈奴傳》。此圈在幽、并北緣之外，不是郡。武帝以後匈奴遠徙，塞外並未變成編戶。',
    from: -221,
    to: 183,
    ring: [
      [1110.0, 638.0],
      [1201.0, 637.0],
      [1310.0, 631.0],
      [1423.0, 612.0],
      [1444.0, 585.0],
      [1347.0, 586.0],
      [1234.0, 611.0],
      [1128.0, 625.0],
    ],
  },
  {
    id: 'saiwai-hexi',
    name: '塞外·河西',
    source:
      '《史記·衛將軍驃騎列傳》。河西在四郡設置之前是匈奴、月氏活動的走廊，不先塗成漢郡。',
    from: -221,
    to: -112,
    ring: [
      [965.0, 757.0],
      [928.0, 701.0],
      [818.0, 673.0],
      [786.0, 707.0],
      [871.0, 747.0],
    ],
  },
]
