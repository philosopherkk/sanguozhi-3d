/** 人物名對中文維基條目。對不上單一人物的不造假連結。 */

const TITLE: Record<string, string> = {
  漢高祖劉邦: '劉邦',
  漢獻帝劉協: '漢獻帝',
  唐太宗李世民: '唐太宗',
  宋太祖趙匡胤: '趙匡胤',
  明太祖朱元璋: '朱元璋',
  '廄戶皇子（聖德太子）': '聖德太子',
  吳王夫差: '夫差',
  吳王闔閭: '闔閭',
  越王勾踐: '勾踐',
  中大兄皇子: '天智天皇',
  大海人皇子: '天武天皇',
  西鄉吉之助: '西鄉隆盛',
  羽柴秀吉: '豐臣秀吉',
  後白河法皇: '後白河天皇',
  培理: '馬休·培理',
  元宏: '魏孝文帝',
  拓跋燾: '魏太武帝',
  李淵: '唐高祖',
  李世民: '唐太宗',
  李隆基: '唐玄宗',
  趙炅: '宋太宗',
  趙構: '宋高宗',
  趙禎: '宋仁宗',
  完顏守緒: '金哀宗',
  玄燁: '康熙帝',
  弘曆: '乾隆帝',
  蔣介石: '蔣中正',
  有栖川宮熾仁: '有栖川宮熾仁親王',
  山內容堂: '山內容堂',
}

/** 人物欄裡沒有單一百科條目的名字。 */
export const UNMATCHED_PEOPLE: Record<string, string> = {
  'ヤマト大王（總稱）': '古墳時代王權的總稱，沒有單一人物條目。',
  '細川勝元／山名宗全': '兩人寫在同一格，不能對上一條人物頁。',
}

export interface PersonWikiRef {
  name: string
  title: string
  url: string
  matched: boolean
  reason?: string
}

export function personWikiRef(name: string): PersonWikiRef {
  const reason = UNMATCHED_PEOPLE[name]
  if (reason) {
    return { name, title: name, url: '', matched: false, reason }
  }
  const title = TITLE[name] ?? name
  return {
    name,
    title,
    url: `https://zh.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    matched: true,
  }
}
