/**
 * 北海道與琉球／沖繩的「外周」時間窗：哪一年是交易領、附庸、行政直轄、外來施政。
 *
 * 虛線＝不是直轄（松前的交易領、琉球的薩摩附庸、1945–72 的美治）。
 * 實色＝進入國家行政（1869 開拓使、1879 沖繩縣）。
 * 每一窗要有出處；沒有出處的年份不畫色，見 docs/PLAN.md「北海道同沖繩要入鏡」。
 */

import { JP_ERA_RINGS } from './japanEraRings'
import { HOKKAIDO_ADMIN_RINGS, type HokkaidoAdminRingKey } from './hokkaidoAdminRings'

export type FringeRingKey =
  | 'matsumae'
  | 'hokkaido'
  | 'ryukyu'
  | HokkaidoAdminRingKey

export type FringeMode =
  /** 1604 黑印：渡島南部的交易權，不是征服全島 */
  | 'trade'
  /** 1609 以後：薩摩附庸，國王仍在 */
  | 'vassal'
  /** 1869 開拓使：進入國家行政 */
  | 'admin'
  /** 1879 琉球處分：設縣 */
  | 'prefecture'
  /** 1945（1952 條約生效）–1972：施政權在美國 */
  | 'foreign-admin'

/**
 * 實際寫資料用的視窗：`from` 含、`toExclusive` **不含**。
 * 半開區間是刻意的——相鄰政權交替那年（1799、1807、1869、1886…）
 * 如果兩邊都寫「含到某年」，同一年會被畫兩種顏色。
 * 匯出時統一換成共用的閉區間型別（見檔案末尾的 JP_FRINGE_WINDOWS）。
 */
interface RawFringeWindow extends Omit<FringeWindow, 'to'> {
  toExclusive: number
}

export interface FringeWindow {
  id: string
  from: number
  /** 閉區間的最後一年（由 toExclusive - 1 換算，不要手寫） */
  to: number
  ring: FringeRingKey
  mode: FringeMode
  label: string
  /** 史源或條約名。日文文獻用『』，中文用《》。 */
  source: string
  note: string
  /** 範圍是示意（不是實測界線）時要標 */
  disputed?: boolean
}

const JP_FRINGE_WINDOWS_AUTHORED: RawFringeWindow[] = [
  {
    id: 'matsumae-trade',
    from: 1604,
    toExclusive: 1799,
    ring: 'matsumae',
    mode: 'trade',
    label: '松前',
    source: '『徳川實紀』家康公記；松前氏受領的黑印状（慶長9年，1604）',
    note: '1604年家康把渡島南部的交易交給松前氏。色塊只有渡島南部，不是整個北海道；蝦夷／阿伊努的內陸政治界線不臆造。1799年東蝦夷地上知，這個窗就此結束。',
    disputed: true,
  },
  {
    id: 'ryukyu-vassal',
    from: 1609,
    toExclusive: 1872,
    ring: 'ryukyu',
    mode: 'vassal',
    label: '琉球（薩摩附庸）',
    source: '『嶋津琉球軍精記』（島津家本，東京大學史料編纂所藏；另有阪巻・寶玲文庫十四卷本，琉球大學數珠庫公開）；『薩琉軍記』（近世後期寫本，屬軍記／讀本，追想性質，非官方記錄，僅作敘事旁證）；『琉球國舊記』（1731年鄭秉哲編，首里王府地誌）',
    note: '1609年島津入侵後琉球是薩摩的附庸，虛線表示不是幕府直領；尚氏國王仍在，向明清貢。出處查證（2026-11-10）：原本掛『島津国衆軍前軍忠次第』一書，經三次精確查證（Exa 精確字串「軍前軍忠次第」零命中；再以「軍忠次第」＋島津／琉球檢索，只得中世《忽那一族軍忠次第》等同類文書名；史料目錄比對無此條）皆查無根據，疑為誤構書名，已刪除。改列可查證者：『嶋津琉球軍精記』（東京大學史料編纂所「島津家本」請求記號 島津家本-さⅠ-8-48）為慶長琉球之役的後出纂記；『薩琉軍記』屬軍記讀本，記慶長十四年出兵而多鋪陳，不可當官方記錄引用；『琉球國舊記』成於1731年、係王府自編地誌，可證琉球內部制度與對明清貢，但不能單獨作為「薩摩附庸」的直接證據——附庸關係應以薩摩側出兵文書為憑，此處只作旁證。',
    disputed: true,
  },
  {
    id: 'ezo-east-baku',
    from: 1799,
    toExclusive: 1807,
    ring: 'ezo_east',
    mode: 'admin',
    label: '東蝦夷地（幕府直轄）',
    source: '《蝦夷地一件》；《遠國奉行》箱館奉行・松前奉行・蝦夷奉行條（寬政11年暫上知、享和2年永久上知，設蝦夷奉行，5月改稱箱館奉行）',
    note: '1799年只暫上知東蝦夷地（太平洋岸與千島、得撫方面），1802年設箱館奉行。西蝦夷地（日本海一侧與鄂霍次克一侧）和和人地在這年仍在松前手中。膽振國以國界切開，指白老以東。',
    disputed: true,
  },
  {
    id: 'ezo-all-baku',
    from: 1807,
    toExclusive: 1821,
    ring: 'hokkaido_all',
    mode: 'admin',
    label: '蝦夷地全般（幕府直轄·松前奉行）',
    source: '《德川實紀》文化四年條；《遠國奉行》條（文化4年因「文化露寇」把和人地與西蝦夷地一并上知，箱館奉行改稱松前奉行並遷到松前）',
    note: '1807年松前藩改易，連和人地一并上知，全蝦夷地成為幕領。1809年把庫頁島從西蝦夷地分立、改稱北蝦夷地。色塊是CODH舊國K75–K85的合成，屬上限示意，內陸的阿伊努政治界線不臆造。',
    disputed: true,
  },
  {
    id: 'matsumae-return',
    from: 1821,
    toExclusive: 1856,
    ring: 'hokkaido_all',
    mode: 'trade',
    label: '蝦夷地（還給松前氏）',
    source: '《遠國奉行》條（文政4年把和人地與全蝦夷地還給松前氏，廢松前奉行）；《新羅之記錄》一系藩史',
    note: '1821年俄國威脅消退，還給松前氏，名義上再次成為松前領。實際支配是渡島半島的和人地與「場所」（場所請負制），內陸仍由阿伊努支配，所以用虛線。',
    disputed: true,
  },
  {
    id: 'ezo-re-chokatsu',
    from: 1856,
    toExclusive: 1869,
    ring: 'hokkaido_all',
    mode: 'admin',
    label: '蝦夷地·和人地北部（幕府直轄·箱館奉行再置）',
    source: '《遠國奉行》條（安政3年把乙部村以北、木古内村以東的和人地與全蝦夷地再上知，在箱館重設箱館奉行；元治元年奉行所遷到五稜郭）；《日露和親條約》（安政2年）',
    note: '以開港為契機，1856年再上知。1855年《日露和親條約》擱置國界（千島與庫頁的邊界到1875年仍未定）。1868年幕府滅亡，箱館奉行改為箱館裁判所。',
    disputed: true,
  },
  {
    id: 'hokkaido-kaitakushi',
    from: 1869,
    toExclusive: 1882,
    ring: 'hokkaido_all',
    mode: 'admin',
    label: '北海道（開拓使）',
    source: '《開拓使設置》太政官達（明治2年，1869）；明治3年（1870）開拓使管轄區域的達',
    note: '1869年改蝦夷地為北海道，設開拓使（本廳在札幌，另有函館、根室兩支廳）。1869年8月15日設11國34郡。色塊是CODH舊國K75–K85的合成。',
  },
  {
    id: 'ken-hakodate',
    from: 1882,
    toExclusive: 1886,
    ring: 'ken_hakodate',
    mode: 'prefecture',
    label: '函館県',
    source: '明治15年2月8日太政官布告第8號「廢開拓使、置函館札幌根室三縣」；《法令全書》第17冊（明治15年）轄區劃分',
    note: '由開拓使函館支廳的區域成立：渡島國全域＋後志國的久遠、奧尻、太櫓、瀨棚、島牧、壽都、歌棄、磯谷8郡＋胆振國山越郡。範圍是幕末和人地扣除後志國岩内郡以北。地圖只涂渡島國（CODH是舊國層級，切不到郡）。',
    disputed: true,
  },
  {
    id: 'ken-sapporo',
    from: 1882,
    toExclusive: 1886,
    ring: 'ken_sapporo',
    mode: 'prefecture',
    label: '札幌県',
    source: '明治15年2月8日太政官布告第8號；『法令全書』第17冊（明治15年）管轄區畫',
    note: '開拓使本廳的區域：石狩、天塩、十勝、日高全域＋後志國的岩内、古宇、積丹、美國、古平、余市、忍路、高島、小樽9郡＋胆振國的虻田、有珠、室蘭、幌別、白老、勇払、千歲7郡＋北見國的宗谷、枝幸、利尻、禮文4郡。四至是宗谷岬、神威岬、襟裳岬。',
    disputed: true,
  },
  {
    id: 'ken-nemuro',
    from: 1882,
    toExclusive: 1886,
    ring: 'ken_nemuro',
    mode: 'prefecture',
    label: '根室県',
    source: '明治15年2月8日太政官布告第8號；『法令全書』第17冊（明治15年）管轄區畫',
    note: '開拓使根室支廳的區域：根室、釧路、千島全域＋北見國的紋別、常呂、網走、斜里4郡。1886年全道26.5萬人中函館縣占15.1萬、根室縣只有1.7萬，這種不均就是三縣制破綻的原因（金子堅太郎視察，伊藤博文於1885年決定）。',
    disputed: true,
  },
  {
    id: 'hokkaido-cho',
    from: 1886,
    toExclusive: 2027,
    ring: 'hokkaido_all',
    mode: 'prefecture',
    label: '北海道庁',
    source: '明治19年1月26日布告第壹號《廢函館札幌根室三縣及北海道事業管理局另設北海道廳布告》（國立公文書館數位檔案庫）',
    note: '廢三縣一局，設北海道廳（廳在札幌，支廳在函館、根室）。此後1897年的一縣制與支廳重編等內部界線會變，但這張地圖固定為全道一個區塊，不畫逐年支廳界。',
  },
  {
    id: 'okinawa-prefecture',
    from: 1879,
    toExclusive: 1945,
    ring: 'ryukyu',
    mode: 'prefecture',
    label: '沖繩縣',
    source: '『琉球藩処置』太政官達（明治12年，1879）；『沖縄県設置』',
    note: '1879年琉球處分，設沖繩縣，不再是薩摩附庸，所以由虛線改實色。1872年設琉球藩是中間步驟，地圖不另開一色。',
  },
  {
    id: 'okinawa-us-admin',
    from: 1945,
    toExclusive: 1972,
    ring: 'ryukyu',
    mode: 'foreign-admin',
    label: '沖繩（施政權在美國）',
    source: '《與日本國之和平條約》第3條（昭和26年簽訂、昭和27年生效）；《關於琉球諸島及大隅諸島之日本國與美利堅合眾國協定》（昭和46年簽訂、昭和47年生效）',
    note: '1945年起（和約第3條自1952年生效）沖繩的施政權在美國，1972年歸還。虛線是範圍示意，不是日本行政直轄；這一段不逐年改色。',
    disputed: true,
  },
  {
    id: 'okinawa-return',
    from: 1972,
    toExclusive: 2027,
    ring: 'ryukyu',
    mode: 'prefecture',
    label: '沖繩縣',
    source: '《關於琉球諸島及大隅諸島之日本國與美利堅合眾國協定》昭和47年5月15日生效',
    note: '1972年5月15日施政權歸還，沖繩縣回到日本行政之下。',
  },
]

/** 換算成閉區間对外匯出；作者端一律寫 toExclusive。 */
export const JP_FRINGE_WINDOWS: FringeWindow[] = JP_FRINGE_WINDOWS_AUTHORED.map(
  ({ toExclusive, ...rest }) => ({ ...rest, to: toExclusive - 1 }),
)

/** 該年适用的外周窗。 */
export function fringeWindowsAt(year: number): FringeWindow[] {
  return JP_FRINGE_WINDOWS.filter((w) => year >= w.from && year <= w.to)
}

/**
 * ring key → 像素環。北海道的行政窗是用 CODH 舊國合成的實測幾何
 * （`hokkaidoAdminRings.ts`），其餘情況才退回舊的示意環。
 */
export function fringeRingsFor(key: FringeRingKey): [number, number][][] {
  const admin = (HOKKAIDO_ADMIN_RINGS as Record<string, [number, number][][]>)[key]
  if (admin) return admin
  return (JP_ERA_RINGS as Record<string, [number, number][][]>)[key] ?? []
}

/** 虛線用於附庸與外來施政；實色用於行政直轄。 */
export function fringeIsDashed(mode: FringeMode): boolean {
  // 交易領、附庸、外來施政都不是行政直轄 → 虛線
  return mode === 'trade' || mode === 'vassal' || mode === 'foreign-admin'
}

export const JP_FRINGE_LEGEND =
  '虛線＝不是行政直轄（1604松前交易領、1609琉球附庸、1945–72美治），實色＝進入國家行政（1869開拓使、1879沖繩縣）。'
