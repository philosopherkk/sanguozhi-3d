/**
 * 簡易版「時光機」全部畫面文字。`src/kid/` 其他檔一律由這裡 import，
 * 不得在元件內直接寫中文（`audit_kid_ui.mjs` 會檢查）。
 * 用詞對象是幼稚園至小學低年級：短句、常用字、每個按鈕最多四個字。
 */
import type { AppTopic } from '../state/TopicContext'

export const S = {
  appName: '小小時光機',
  pickCountry: '你想去哪一個國家？',
  pickEra: '你想去哪一個時代？',
  home: '回首頁',
  back: '返回',
  prevYear: '上一年',
  nextYear: '下一年',
  play: '自動走',
  stop: '停下來',
  tabStory: '故事',
  tabPeople: '人物',
  tabMap: '地圖',
  prevStory: '上一個故事',
  nextStory: '下一個故事',
  noStory: '這一年沒有故事',
  noPeople: '這個時代還沒有人物卡',
  close: '收起來',
  settings: '設定',
  fontSize: '字的大小',
  fontSmall: '小',
  fontMid: '中',
  fontBig: '大',
  dayNight: '白天／晚上',
  day: '白天',
  night: '晚上',
  level: '難易',
  levelEasy: '簡單',
  levelMid: '普通',
  levelDeep: '深入',
  toClassic: '切換到詳細版',
  toKid: '切換到簡易版',
  hintPick: '用手指點一張卡',
  loading: '載入中',
  steps: ['選國家', '選時代', '時光機'] as const,
  /** 麵包屑的讀屏文字：第幾步、共幾步 */
  stepOf: (n: number, total: number) => `第 ${n} 步，共 ${total} 步`,
  /** 年份大字：西元前寫成「前 N」，年字另放一個小字 */
  yearNumber: (year: number) => (year < 0 ? `前${-year}` : `${year}`),
  yearUnit: '年',
}

/**
 * 選國家卡的代表人物頭像（`public/portraits/` 下的檔名，經 `PersonPortrait`）。
 * 未有合適頭像的國家留空，卡片改用國名首字圓章。
 */
export const TOPIC_FACE: Record<AppTopic, string | undefined> = {
  china: '/portraits/sanguozhi/zhuge-liang.jpg',
  japan: '/portraits/japan-history/oda-nobunaga.jpg',
  korea: '/portraits/kojoseon/ko-p-sunsin.jpg',
  thailand: undefined,
  vietnam: undefined,
  malaysia: undefined,
}

/** 時間河踏腳石的代表人物頭像；未列者用時代名首字圓章。 */
export const ERA_FACE: Record<string, string | undefined> = {
  xia: '/portraits/zhou/xia-yu.jpg',
  shang: '/portraits/zhou/shang-wuding.jpg',
  xizhou: '/portraits/zhou/zhou-wu.jpg',
  chunqiu: '/portraits/zhou/qi-huan.jpg',
  zhanguo: '/portraits/zhou/bai-qi.jpg',
  qin: '/portraits/qinhan/ying-zheng.jpg',
  han: '/portraits/qinhan/liu-bang.jpg',
  sanguo: '/portraits/sanguozhi/zhuge-liang.jpg',
  jin: '/portraits/imperial-jin/p-sima-yan.jpg',
  nanbei: '/portraits/imperial-nanbei/p-xiaowen.jpg',
  sui: '/portraits/imperial-sui/p-yangjian.jpg',
  tang: '/portraits/imperial-tang/p-taizong.jpg',
  wudai: '/portraits/imperial-wudai/p-chai.jpg',
  liaosong: '/portraits/imperial-liaosong/p-yue.jpg',
  yuanmingqing: '/portraits/imperial-yuanmingqing/p-zhu-yuanzhang.jpg',
  minguo: '/portraits/imperial-minguo/p-sun.jpg',
  civilwar: '/portraits/imperial-civilwar/cw-p00.jpg',
  prc: '/portraits/imperial-prc/p-deng.jpg',
  asuka: '/portraits/japan-history/shotoku.jpg',
  nara: '/portraits/japan-nara/nr-shomu.jpg',
  heian: '/portraits/heian/murasaki-shikibu.jpg',
  kamakura: '/portraits/japan-kamakura/km-yoritomo.jpg',
  muromachi: '/portraits/japan-muromachi/mu-takauji.jpg',
  sengoku: '/portraits/sengoku/takeda-shingen.jpg',
  azuchi: '/portraits/japan-azuchi/az-hideyoshi.jpg',
  edo: '/portraits/japan-edo/ed-p-ieyasu.jpg',
  bakumatsu: '/portraits/bakumatsu/saigo.jpg',
  modern: '/portraits/japan-history/meiji-tenno.jpg',
  kojoseon: '/portraits/kojoseon/ko-p-sunsin.jpg',
}
