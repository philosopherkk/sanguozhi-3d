/** Approximate river courses in [lon, lat] for 三國 theatre visualisation. */

export type LonLat = readonly [number, number]

export interface RiverDef {
  id: string
  name: string
  width: number
  color: string
  path: LonLat[]
}

export const RIVERS: RiverDef[] = [
  {
    id: 'huanghe',
    name: '黃河',
    width: 0.07,
    color: '#c4a06a',
    path: [
      [101.0, 36.5],
      [103.5, 37.2],
      [106.0, 39.0],
      [109.0, 40.5],
      [111.5, 40.2],
      [112.5, 38.5],
      [112.8, 36.0],
      [113.5, 34.8],
      [114.5, 34.9],
      [116.5, 35.0],
      [118.5, 37.5],
      [119.0, 37.7],
    ],
  },
  {
    id: 'changjiang',
    name: '長江',
    width: 0.09,
    color: '#4a7a9a',
    path: [
      [99.5, 29.0],
      [102.0, 28.0],
      [104.0, 29.5],
      [106.5, 29.6],
      [108.5, 30.8],
      [111.0, 30.7],
      [112.5, 30.4],
      [114.3, 30.5],
      [116.0, 30.0],
      [117.5, 31.5],
      [118.8, 32.0],
      [120.5, 31.8],
      [121.5, 31.4],
    ],
  },
  {
    id: 'hanjiang',
    name: '漢水',
    width: 0.045,
    color: '#5a8aaa',
    path: [
      [106.9, 33.1],
      [108.0, 32.8],
      [110.0, 32.7],
      [111.5, 32.0],
      [112.5, 31.2],
      [113.2, 30.6],
    ],
  },
  {
    id: 'huaihe',
    name: '淮河',
    width: 0.04,
    color: '#5a8a7a',
    path: [
      [113.0, 32.5],
      [115.0, 32.8],
      [117.0, 33.0],
      [119.0, 33.5],
    ],
  },
  {
    id: 'weishui',
    name: '渭水',
    width: 0.035,
    color: '#8a9a6a',
    path: [
      [105.0, 34.4],
      [107.0, 34.3],
      [108.9, 34.3],
      [110.2, 34.6],
    ],
  },
]

export const LANDMARKS: {
  id: string
  name: string
  lon: number
  lat: number
  kind: 'mountain' | 'city' | 'pass' | 'basin'
}[] = [
  { id: 'qinling', name: '秦嶺', lon: 108.5, lat: 34.0, kind: 'mountain' },
  { id: 'taihang', name: '太行山', lon: 113.2, lat: 37.5, kind: 'mountain' },
  { id: 'dabashan', name: '大巴山', lon: 108.5, lat: 32.0, kind: 'mountain' },
  { id: 'nanling', name: '南嶺', lon: 113.0, lat: 24.5, kind: 'mountain' },
  { id: 'wuyi', name: '武夷山', lon: 117.5, lat: 27.5, kind: 'mountain' },
  { id: 'hanzhong', name: '漢中', lon: 107.0, lat: 33.1, kind: 'basin' },
  { id: 'guanzhong', name: '關中', lon: 108.9, lat: 34.3, kind: 'basin' },
  { id: 'chengdu', name: '成都', lon: 104.1, lat: 30.7, kind: 'city' },
  { id: 'changan', name: '長安', lon: 108.9, lat: 34.3, kind: 'city' },
  { id: 'luoyang', name: '洛陽', lon: 112.45, lat: 34.7, kind: 'city' },
  { id: 'xuchang', name: '許昌', lon: 113.85, lat: 34.0, kind: 'city' },
  { id: 'ye', name: '鄴', lon: 114.5, lat: 36.3, kind: 'city' },
  { id: 'xiangyang', name: '襄陽', lon: 112.15, lat: 32.05, kind: 'city' },
  { id: 'jiangling', name: '江陵', lon: 112.2, lat: 30.35, kind: 'city' },
  { id: 'chibi', name: '赤壁', lon: 113.9, lat: 29.85, kind: 'pass' },
  { id: 'guandu', name: '官渡', lon: 114.3, lat: 34.85, kind: 'pass' },
  { id: 'yiling', name: '夷陵', lon: 111.3, lat: 30.7, kind: 'pass' },
  { id: 'hefei', name: '合肥', lon: 117.3, lat: 31.85, kind: 'city' },
  { id: 'jianye', name: '建業', lon: 118.8, lat: 32.05, kind: 'city' },
  { id: 'wuchang', name: '武昌', lon: 114.3, lat: 30.55, kind: 'city' },
  { id: 'jinyang', name: '晉陽', lon: 112.55, lat: 37.85, kind: 'city' },
  { id: 'xiangping', name: '襄平', lon: 123.15, lat: 41.15, kind: 'city' },
]
