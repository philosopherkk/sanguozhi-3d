/**
 * 元龜前後大名漢字標。座標係現代日本地勢底圖像素，落在實地上。
 * 底圖不再印大名，故全部漢字都畫出來。gap 仍表示底圖本身沒有這個名字。
 * 出處：中文維基各氏專條（元龜前後領地通說）。
 * 加賀標「本願寺」：一向一揆實控，富樫氏只係名義守護。能登與紀伊皆畠山氏分家。
 * 大隅南端標「肝付」：元龜元年肝付氏仍據大隅。
 */

export interface SengokuDaimyoLabel {
  name: string
  x: number
  y: number
  /** 現代底圖沒有印這個名字 */
  gap: boolean
}

export const SENGOKU_DAIMYO_LABELS: SengokuDaimyoLabel[] = [
  { name: '南部', x: 965.7, y: 430.9, gap: false },
  { name: '最上', x: 919.6, y: 558.2, gap: false },
  { name: '伊達', x: 946.1, y: 557.6, gap: false },
  { name: '蘆名', x: 899.1, y: 604.4, gap: false },
  { name: '佐竹', x: 926.1, y: 671.6, gap: false },
  { name: '北條', x: 860.1, y: 738.2, gap: false },
  { name: '上杉', x: 814.5, y: 624.8, gap: false },
  { name: '武田', x: 831.1, y: 714.2, gap: false },
  { name: '德川', x: 761.0, y: 756.2, gap: false },
  { name: '織田', x: 740.5, y: 728.6, gap: false },
  { name: '淺井', x: 716.0, y: 726.8, gap: false },
  { name: '朝倉', x: 717.5, y: 695.0, gap: false },
  { name: '尼子', x: 564.0, y: 729.0, gap: false },
  { name: '毛利', x: 539.4, y: 773.0, gap: false },
  { name: '大友', x: 482.8, y: 859.4, gap: false },
  { name: '龍造寺', x: 417.3, y: 858.8, gap: false },
  { name: '島津', x: 426.3, y: 959.1, gap: false },
  { name: '長宗我部', x: 578.9, y: 840.2, gap: false },
  { name: '三好', x: 677.5, y: 774.8, gap: false },
  { name: '安東', x: 904.1, y: 441.1, gap: true },
  { name: '大崎', x: 950.6, y: 539.5, gap: true },
  { name: '葛西', x: 972.7, y: 519.7, gap: true },
  { name: '相馬', x: 948.6, y: 582.8, gap: true },
  { name: '宇都宮', x: 896.6, y: 660.2, gap: true },
  { name: '那須', x: 908.6, y: 650.6, gap: true },
  { name: '岩城', x: 947.1, y: 630.8, gap: true },
  { name: '里見', x: 896.1, y: 754.4, gap: true },
  { name: '畠山', x: 750.0, y: 632.0, gap: true },
  { name: '本願寺', x: 735.5, y: 660.2, gap: true },
  { name: '三木', x: 730.0, y: 669.8, gap: true },
  { name: '山名', x: 643.9, y: 726.8, gap: true },
  { name: '宇喜多', x: 598.4, y: 774.2, gap: true },
  { name: '別所', x: 651.9, y: 765.8, gap: true },
  { name: '畠山', x: 660.9, y: 800.0, gap: true },
  { name: '河野', x: 540.9, y: 823.4, gap: true },
  { name: '香川', x: 604.0, y: 794.0, gap: true },
  { name: '伊東', x: 455.3, y: 950.7, gap: true },
  { name: '阿蘇', x: 458.3, y: 876.8, gap: true },
  { name: '相良', x: 440.3, y: 921.2, gap: true },
  { name: '大村', x: 400.0, y: 879.0, gap: true },
  { name: '肝付', x: 444.8, y: 971.1, gap: true },
]
