/**
 * One modern Japan relief for 平安、戰國、幕末、江戶.
 * Period labels stay contemporary; the picture underneath does not change by era.
 */

export interface SengokuBasemap {
  id: string
  src: string
  title: string
  credit: string
  license: string
  commonsUrl: string
}

const base = import.meta.env.BASE_URL

export const SENGOKU_BASEMAP: SengokuBasemap = {
  id: 'japan-relief',
  /** 顯示用縮小版；原檔約 5900² 解碼過慢 */
  src: `${base}maps/japan_relief_display.jpg`,
  title: '現代日本列島地勢（平安、戰國、幕末、江戶共用）',
  credit: '維基共享資源〈Japan relief location map.jpg〉· Eric Gaba（Sting）',
  license: 'CC BY-SA',
  commonsUrl: 'https://commons.wikimedia.org/wiki/File:Japan_relief_location_map.jpg',
}
