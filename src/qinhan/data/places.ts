/** 秦漢都邑，座標用三國底圖像素，與春秋戰國都邑同一套空間。 */

export interface QinHanPlace {
  id: string
  name: string
  x: number
  y: number
  note: string
  source: string
}

export const QINHAN_PLACES: QinHanPlace[] = [
  {
    id: 'xianyang',
    name: '咸陽',
    x: 1139.2,
    y: 907.5,
    note: '秦都。漢初劉邦先入關中，項羽焚之。',
    source: '《史記·秦始皇本紀》《項羽本紀》',
  },
  {
    id: 'changan',
    name: '長安',
    x: 1130.0,
    y: 922.0,
    note: '西漢都城，在渭河南，略偏咸陽之南。',
    source: '《史記·高祖本紀》；《漢書·地理志》',
  },
  {
    id: 'luoyang',
    name: '洛陽',
    x: 1261.2,
    y: 887.6,
    note: '東漢都城。光武定都在此，不在長安。',
    source: '《後漢書·光武帝紀》',
  },
  {
    id: 'xingyang',
    name: '滎陽',
    x: 1296.0,
    y: 878.0,
    note: '楚漢相持與鴻溝所在。敖倉在其旁。',
    source: '《史記·高祖本紀》《項羽本紀》',
  },
  {
    id: 'pengcheng',
    name: '彭城',
    x: 1408.0,
    y: 868.0,
    note: '西楚都。漢二年劉邦攻入，隨即大敗。',
    source: '《史記·項羽本紀》',
  },
  {
    id: 'chen',
    name: '陳',
    x: 1368.0,
    y: 968.0,
    note: '陳勝稱王處。在淮陽，不是後來的陳郡全部。',
    source: '《史記·陳涉世家》',
  },
  {
    id: 'linzi',
    name: '臨淄',
    x: 1440.7,
    y: 777.3,
    note: '齊地。韓信、項羽都曾在這一帶用兵。',
    source: '《史記·淮陰侯列傳》《項羽本紀》',
  },
  {
    id: 'handan',
    name: '邯鄲',
    x: 1319.4,
    y: 801.7,
    note: '趙地。光武定河北時，王郎據邯鄲。',
    source: '《後漢書·光武帝紀》',
  },
  {
    id: 'ji',
    name: '薊',
    x: 1363.4,
    y: 663.6,
    note: '燕地。秦滅齊自北南下，光武定河北亦曾北至附近。',
    source: '《史記·秦始皇本紀》；《後漢書·光武帝紀》',
  },
  {
    id: 'kunyang',
    name: '昆陽',
    x: 1268.0,
    y: 948.0,
    note: '在洛陽與宛之間。新莽大軍南下，劉秀以此城破敵。',
    source: '《後漢書·光武帝紀》',
  },
]
