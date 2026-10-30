import type { FactionId } from '../types/data'

export interface FactionArticleRef {
  title: string
  /** English Grokipedia page slug (spaces → underscores in URL) */
  grokipediaSlug: string
  /** zh Wikipedia title for REST summary API */
  zhwikiTitle: string
  blurb: string
  /** Primary basis for blurb claims (AGENTS.md); wiki/Grokipedia are UX only */
  source: string
  disputed?: boolean
  note?: string
}

/** Clickable faction → encyclopedia targets (English Grokipedia + zh wiki). */
export const FACTION_ARTICLES: Partial<Record<FactionId, FactionArticleRef>> = {
  黃巾: {
    title: '黃巾',
    grokipediaSlug: 'Yellow_Turban_Rebellion',
    zhwikiTitle: '黃巾之亂',
    blurb: '東漢末太平道起事勢力；地圖上州塊為示意活動區，非固定行政疆域。',
    source: '《後漢書·皇甫嵩傳》',
  },
  董卓: {
    title: '董卓',
    grokipediaSlug: 'Dong_Zhuo',
    zhwikiTitle: '董卓',
    blurb: '廢立獻帝、遷都長安；關中一時為其勢力核心。',
    source: '《三國志·魏書·董卓傳》',
  },
  東漢: {
    title: '東漢朝廷',
    grokipediaSlug: 'Eastern_Han',
    zhwikiTitle: '東漢',
    blurb: '獻帝名義下的中央；實權常操於權臣之手。',
    source: '《後漢書·孝獻帝紀》',
  },
  袁紹: {
    title: '袁紹',
    grokipediaSlug: 'Yuan_Shao',
    zhwikiTitle: '袁紹',
    blurb: '據河北四州，官渡之戰前北方最大割據。',
    source: '《三國志·魏書·袁紹傳》',
  },
  袁術: {
    title: '袁術',
    grokipediaSlug: 'Yuan_Shu',
    zhwikiTitle: '袁術',
    blurb: '據淮南一帶，一度稱帝號仲家。',
    source: '《三國志·魏書·袁術傳》',
  },
  呂布: {
    title: '呂布',
    grokipediaSlug: 'Lu_Bu',
    zhwikiTitle: '呂布',
    blurb: '往來兗、徐；建安三年敗亡於下邳。',
    source: '《三國志·魏書·呂布傳》',
  },
  劉表: {
    title: '劉表',
    grokipediaSlug: 'Liu_Biao',
    zhwikiTitle: '劉表',
    blurb: '荊州牧，保境安民，赤壁前卒。',
    source: '《三國志·魏書·劉表傳》',
  },
  劉璋: {
    title: '劉璋',
    grokipediaSlug: 'Liu_Zhang_(warlord)',
    zhwikiTitle: '劉璋',
    blurb: '益州牧，後降劉備。',
    source: '《三國志·蜀書·劉二牧傳》',
  },
  馬超韓遂: {
    title: '馬超／韓遂',
    grokipediaSlug: 'Ma_Chao',
    zhwikiTitle: '馬超',
    blurb: '關西聯軍抗曹操；馬超後歸劉備。',
    source: '《三國志·魏書·武帝紀》；《三國志·蜀書·馬超傳》',
  },
  公孫氏: {
    title: '公孫氏',
    grokipediaSlug: 'Gongsun_Yuan',
    zhwikiTitle: '公孫淵',
    blurb: '遼東割據，後為司馬懿所滅。',
    source: '《三國志·魏書·公孫度傳》',
  },
  曹魏: {
    title: '曹魏',
    grokipediaSlug: 'Cao_Wei',
    zhwikiTitle: '曹魏',
    blurb: '曹操奠基，曹丕受禪；北方主體政權。',
    source: '《三國志·魏書·武帝紀》；《三國志·魏書·文帝紀》',
  },
  蜀漢: {
    title: '蜀漢（劉備集團）',
    grokipediaSlug: 'Shu_Han',
    zhwikiTitle: '蜀漢',
    blurb: '劉備自得益州、稱帝後之政權；圖上「蜀漢」含其取蜀前之相承著色。',
    source: '《三國志·蜀書·先主傳》',
  },
  孫吳: {
    title: '孫吳',
    grokipediaSlug: 'Eastern_Wu',
    zhwikiTitle: '孫吳',
    blurb: '孫氏據江東，後稱帝，與魏、蜀鼎立。',
    source: '《三國志·吳書·吳主傳》',
  },
  西晉: {
    title: '西晉',
    grokipediaSlug: 'Western_Jin_(266–316)',
    zhwikiTitle: '西晉',
    blurb: '司馬炎代魏，太康元年滅吳，接收孫吳郡縣。五溪蠻等未入編戶。',
    source: '《晉書·武帝紀》',
  },
  其他: {
    title: '其他／未定',
    grokipediaSlug: 'Three_Kingdoms',
    zhwikiTitle: '三國',
    blurb: '地圖上尚未歸入主要割據色塊的地區或過渡勢力。',
    source: '《後漢書·郡國志》',
    disputed: true,
    note: '地圖示意分類，尚待逐區對讀紀傳出典。',
  },
  五溪蠻: {
    title: '五溪蠻',
    grokipediaSlug: 'Wuling_Man',
    zhwikiTitle: '五溪蠻',
    blurb:
      '武陵沅水上游五溪羈縻，不是荊州全境，也不是獨立王朝。280 年不併入西晉編戶。曹魏未曾領有武陵。',
    source: '《後漢書·南蠻傳》',
  },
}

export function grokipediaPageUrl(slug: string) {
  return `https://grokipedia.com/page/${slug}`
}
