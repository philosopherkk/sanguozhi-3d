/** 各朝快照用的勢力環。只引用 eraRegions，不引用三國州界。
 * 地理大勢據譚其驤《中國歷史地圖集》精神；邊是示意，不是縣界。
 */
import { cover, type FactionRange } from '../../geo/eraCover'

const NORTH = [
  'hebei',
  'shanxi',
  'shandong',
  'henan',
  'shaanxi',
] as const

const JIANGNAN = [
  'jiangsu',
  'anhui',
  'zhejiang',
  'jiangxi',
  'hubei',
  'hunan',
  'fujian',
  'guangdong',
  'guangxi',
] as const

const AGRARIAN = [
  ...NORTH,
  'hubei',
  'hunan',
  'jiangxi',
  'anhui',
  'jiangsu',
  'zhejiang',
  'fujian',
  'guangdong',
  'guangxi',
  'hainan',
  'sichuan',
  'hanzhong',
  'gansu',
  'ningxia',
] as const

const MANCHURIA = ['hlj', 'jl', 'ln'] as const

export const JIN_280: FactionRange[] = [
  cover('西晉', ...AGRARIAN, 'longxi'),
]

export const JIN_291: FactionRange[] = [
  cover('西晉', ...AGRARIAN, 'longxi'),
  cover('司馬氏諸王', 'qin_guanzhong', 'zhou_luoyi', 'zhao_handan'),
]

export const JIN_311: FactionRange[] = [
  cover('漢趙', 'shanxi', 'henan', 'hebei', 'shandong'),
  cover('西晉', ...JIANGNAN, 'shaanxi', 'hanzhong'),
  cover('成漢', 'sichuan'),
]

export const JIN_316: FactionRange[] = [
  cover('漢趙', 'shanxi', 'henan', 'hebei', 'shandong', 'shaanxi', 'longxi'),
  cover('西晉', ...JIANGNAN),
  cover('成漢', 'sichuan'),
]

export const NANBEI_304: FactionRange[] = [
  cover('漢趙', 'shanxi_s'),
  cover('東晉', ...JIANGNAN),
  cover('成漢', 'sichuan'),
]

export const NANBEI_317: FactionRange[] = [
  cover('漢趙', 'shaanxi', 'longxi'),
  cover('後趙', 'hebei', 'henan', 'shandong', 'shanxi'),
  cover('東晉', ...JIANGNAN),
  cover('成漢', 'sichuan'),
]

export const NANBEI_383: FactionRange[] = [
  cover(
    '前秦',
    'hebei',
    'henan',
    'shandong',
    'shanxi',
    'shaanxi',
    'gansu',
    'ningxia',
    'sichuan',
    'hanzhong',
    'hubei_n',
  ),
  cover('東晉', 'jiangsu', 'anhui', 'zhejiang', 'jiangxi', 'hubei_s', 'hunan', 'fujian', 'guangdong', 'guangxi'),
]

export const NANBEI_420: FactionRange[] = [
  cover('北魏', 'hebei', 'shanxi', 'youyun'),
  cover('夏', 'shaanxi'),
  cover('劉宋', 'shandong', 'henan', ...JIANGNAN, 'sichuan', 'hanzhong'),
]

export const NANBEI_439: FactionRange[] = [
  cover('北魏', 'hebei', 'shanxi', 'shaanxi', 'gansu', 'henan', 'youyun', 'ln', 'ningxia'),
  cover('劉宋', 'shandong', ...JIANGNAN, 'sichuan', 'hanzhong'),
]

export const NANBEI_534: FactionRange[] = [
  cover('東魏', 'hebei', 'shanxi', 'shandong', 'henan'),
  cover('西魏', 'shaanxi', 'gansu', 'ningxia'),
  cover('蕭梁', ...JIANGNAN, 'sichuan', 'hanzhong'),
]

export const NANBEI_577: FactionRange[] = [
  cover('北周', ...NORTH, 'gansu', 'ningxia', 'sichuan', 'hanzhong', 'hubei'),
  cover('南陳', 'jiangsu_s', 'zhejiang', 'jiangxi', 'hunan', 'fujian', 'guangdong', 'guangxi'),
]

export const SUI_581: FactionRange[] = [
  cover('隋', 'realm_sui_581'),
  cover('陳', 'realm_chen_581'),
]

export const SUI_589: FactionRange[] = [cover('隋', 'realm_sui_589')]

export const SUI_617: FactionRange[] = [
  cover('唐', 'qin_guanzhong', 'shanxi'),
  cover('隋', 'hebei', 'shandong', 'henan', ...JIANGNAN, 'sichuan', 'hanzhong', 'gansu', 'hainan'),
]

export const TANG_618: FactionRange[] = [cover('唐', 'qin_guanzhong', 'shanxi', 'hanzhong')]

export const TANG_660: FactionRange[] = [
  cover('唐', 'realm_tang_660'),
  cover('新羅', 'tang_silla'),
]

export const TANG_701: FactionRange[] = [cover('唐', 'realm_tang_701')]

export const TANG_756: FactionRange[] = [
  cover('安史', 'hebei', 'youyun', 'shanxi', 'henan', 'shaanxi'),
  cover('唐', 'sichuan', 'hanzhong', ...JIANGNAN, 'shandong', 'gansu'),
]

export const TANG_820: FactionRange[] = [
  cover('藩鎮', 'hebei', 'youyun', 'shandong'),
  cover('吐蕃', 'gansu', 'hexie', 'tang_hehuang'),
  cover('南詔', 'yunnan'),
  cover(
    '唐',
    'shaanxi',
    'shanxi_song',
    'henan',
    'hubei',
    'hunan',
    'jiangxi',
    'anhui',
    'jiangsu',
    'zhejiang',
    'fujian',
    'guangdong',
    'guangxi',
    'hainan',
    'sichuan',
    'hanzhong',
  ),
]

export const TANG_880: FactionRange[] = [
  cover('黃巢', 'shaanxi'),
  cover('唐', 'sichuan', 'hanzhong', 'jiangsu_s', 'zhejiang', 'jiangxi', 'hunan', 'fujian', 'guangdong', 'guangxi'),
  cover('藩鎮', 'hebei', 'shanxi', 'henan', 'shandong', 'hubei', 'anhui', 'jiangsu_n'),
]

export const WUDAI_907: FactionRange[] = [
  cover('後梁', 'henan', 'shandong', 'hebei_song', 'hubei'),
  cover('前蜀', 'sichuan', 'hanzhong'),
  cover('吳', 'jiangsu', 'anhui', 'jiangxi'),
  cover('楚', 'hunan'),
  cover('南漢', 'guangdong', 'guangxi', 'hainan'),
  cover('吳越', 'zhejiang'),
  cover('閩', 'fujian'),
]

export const WUDAI_923: FactionRange[] = [
  cover('後唐', 'hebei', 'youyun', 'shanxi', 'henan', 'shandong', 'hubei'),
  cover('前蜀', 'sichuan', 'hanzhong'),
  cover('吳', 'jiangsu', 'anhui', 'jiangxi'),
  cover('楚', 'hunan'),
  cover('南漢', 'guangdong', 'guangxi', 'hainan'),
  cover('吳越', 'zhejiang'),
  cover('閩', 'fujian'),
  cover('南平', 'jingnan'),
]

export const WUDAI_936: FactionRange[] = [
  cover('契丹', 'youyun'),
  cover('後晉', 'hebei_song', 'henan', 'shandong', 'shanxi_song'),
  cover('後蜀', 'sichuan', 'hanzhong'),
  cover('吳', 'jiangsu', 'anhui', 'jiangxi'),
  cover('楚', 'hunan'),
  cover('南漢', 'guangdong', 'guangxi', 'hainan'),
  cover('吳越', 'zhejiang'),
  cover('閩', 'fujian'),
  cover('南平', 'jingnan'),
]

export const WUDAI_947: FactionRange[] = [
  cover('契丹', 'youyun'),
  cover('後漢', 'hebei_song', 'henan', 'shandong', 'shanxi_song'),
  cover('後蜀', 'sichuan', 'hanzhong'),
  cover('南唐', 'jiangsu', 'anhui', 'jiangxi', 'fujian'),
  cover('楚', 'hunan'),
  cover('南漢', 'guangdong', 'guangxi', 'hainan'),
  cover('吳越', 'zhejiang'),
  cover('南平', 'jingnan'),
]

export const WUDAI_960: FactionRange[] = [
  cover('契丹', 'youyun'),
  cover('後周', 'hebei_song', 'henan', 'shandong', 'anhui_n', 'jiangsu_n', 'hubei'),
  cover('北漢', 'shanxi'),
  cover('後蜀', 'sichuan', 'hanzhong'),
  cover('南唐', 'jiangsu_s', 'anhui_s', 'jiangxi', 'fujian', 'hunan'),
  cover('南漢', 'guangdong', 'guangxi', 'hainan'),
  cover('吳越', 'zhejiang'),
  cover('南平', 'jingnan'),
]

export const LIAOSONG_960: FactionRange[] = [
  cover('宋', 'hebei_song', 'henan', 'shandong', 'anhui_n', 'jiangsu_n', 'hubei'),
  cover('遼', 'realm_liao'),
  cover('北漢', 'shanxi'),
  cover('西夏', 'xia_yin'),
]

export const LIAOSONG_1004: FactionRange[] = [
  cover('宋', 'realm_song_1004'),
  cover('遼', 'realm_liao'),
  cover('西夏', 'xia_yin', 'ningxia', 'hexie'),
]

export const LIAOSONG_1127: FactionRange[] = [
  cover('金', 'realm_jin_1141'),
  cover('宋', 'realm_song_1141'),
  cover('西夏', 'gansu', 'ningxia', 'xia_yin'),
]

export const LIAOSONG_1141: FactionRange[] = [
  cover('金', 'realm_jin_1141'),
  cover('宋', 'realm_song_1141'),
  cover('西夏', 'gansu', 'ningxia', 'xia_yin'),
]

export const LIAOSONG_1279: FactionRange[] = [cover('蒙古', 'realm_yuan_1279')]

export const YUAN_1271: FactionRange[] = [
  cover('元', 'realm_yuan_1271'),
  cover('宋', 'realm_song_1271'),
]

export const YUAN_1279: FactionRange[] = [cover('元', 'realm_yuan_1279')]

export const MING_1368: FactionRange[] = [
  cover('明', 'realm_ming_1368'),
  cover('元', 'realm_yuan_1368'),
]

export const MING_1420: FactionRange[] = [cover('明', 'realm_ming_1420')]

export const QING_1644: FactionRange[] = [
  cover('清', 'realm_qing_1644'),
  cover('農民軍', 'realm_dashun_1644'),
  cover('明', 'realm_ming_1644'),
]

export const QING_1668: FactionRange[] = [cover('清', 'realm_qing_1668')]

export const QING_1750: FactionRange[] = [cover('清', 'realm_qing_high')]

export const QING_1860: FactionRange[] = QING_1750
export const QING_1911: FactionRange[] = QING_1750

export const MINGUO_1912: FactionRange[] = [
  cover('北洋', 'hebei', 'shandong', 'henan', 'jiangsu', 'anhui', 'hubei', ...MANCHURIA, 'rehe'),
  cover('晉系', 'shanxi'),
  cover('滇系', 'yunnan'),
  cover('粵系', 'guangdong'),
  cover('桂系', 'guangxi'),
  cover('川系', 'sichuan'),
  cover('新疆地方', 'xinjiang'),
  cover('噶厦', 'tibet'),
  cover('日本', 'taiwan'),
]

export const MINGUO_1916: FactionRange[] = [
  cover('皖系', 'anhui', 'zhejiang', 'fujian', 'shandong', 'henan', 'shaanxi'),
  cover('直系', 'hebei', 'jiangsu', 'jiangxi', 'hubei'),
  cover('奉系', ...MANCHURIA),
  cover('晉系', 'shanxi'),
  cover('桂系', 'guangxi', 'guangdong'),
  cover('滇系', 'yunnan', 'guizhou'),
  cover('川系', 'sichuan'),
  cover('新疆地方', 'xinjiang'),
  cover('噶厦', 'tibet'),
  cover('日本', 'taiwan'),
]

export const MINGUO_1922: FactionRange[] = [
  cover('直系', 'hebei', 'henan', 'hubei', 'jiangsu', 'jiangxi', 'hunan', 'shaanxi'),
  cover('皖系', 'anhui', 'zhejiang', 'fujian', 'shandong'),
  cover('奉系', ...MANCHURIA, 'rehe'),
  cover('晉系', 'shanxi'),
  cover('滇系', 'yunnan'),
  cover('粵系', 'guangdong'),
  cover('桂系', 'guangxi'),
  cover('川系', 'sichuan'),
  cover('新疆地方', 'xinjiang'),
  cover('噶厦', 'tibet'),
  cover('日本', 'taiwan'),
]

export const MINGUO_1928: FactionRange[] = [
  cover('國民黨', 'guangdong', 'jiangsu', 'zhejiang', 'anhui', 'jiangxi', 'fujian', 'shandong'),
  cover('西北軍', 'shaanxi', 'henan', 'gansu', 'ningxia', 'qinghai'),
  cover('晉系', 'shanxi', 'hebei', 'chahar', 'suiyuan'),
  cover('桂系', 'guangxi', 'hubei', 'hunan'),
  cover('奉系', ...MANCHURIA, 'rehe'),
  cover('滇系', 'yunnan'),
  cover('川系', 'sichuan'),
  cover('新疆地方', 'xinjiang'),
  cover('噶厦', 'tibet'),
  cover('日本', 'taiwan'),
]

export const MINGUO_1937: FactionRange[] = [
  cover('日軍', ...MANCHURIA, 'rehe', 'hebei', 'shandong', 'shanxi_n', 'jiangsu_s', 'zhejiang_n', 'chahar'),
  cover('國民黨', 'hubei', 'hunan', 'jiangxi', 'fujian', 'guangdong', 'guizhou', 'henan', 'shaanxi_rest', 'gansu', 'ningxia', 'qinghai', 'anhui', 'jiangsu_n', 'zhejiang_s', 'suiyuan'),
  cover('晉系', 'shanxi_s'),
  cover('桂系', 'guangxi'),
  cover('滇系', 'yunnan'),
  cover('川系', 'sichuan'),
  cover('共產黨', 'yanan'),
  cover('盛世才', 'xinjiang'),
  cover('噶厦', 'tibet'),
  cover('日本', 'taiwan'),
]

export const MINGUO_1949: FactionRange[] = [
  cover('共產黨', 'realm_prc_1949'),
  cover('噶厦', 'tibet'),
  cover('國民黨', 'taiwan', 'hainan'),
]

export const PRC_1949: FactionRange[] = [
  cover('中華人民共和國', 'realm_prc_1949'),
  cover('中華民國', 'taiwan'),
]

export const PRC_1951: FactionRange[] = [
  cover('中華人民共和國', 'realm_prc_1951'),
  cover('中華民國', 'taiwan'),
]
