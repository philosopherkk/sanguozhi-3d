/**
 * 成語面板出口驗證（成語 agent，非閘門）：
 * 用 panel 實際渲染時所调用嘅 filterChengyuForPanel，逐條檢查本輪新增lemma
 * 喺邊個時代 pack 嘅 [yearMin, yearMax] × locale 範圍内會以 yearMatches 出現。
 * 範圍取自源碼（行號見註），唔係憑空寫。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  filterChengyuForPanel,
  localesForChinaTrack,
  localesForJapanTrack,
} from '../src/chengyu/lib/filterByYear.ts'

const ROOT = join(import.meta.dirname, '..')
const entries = JSON.parse(readFileSync(join(ROOT, 'src/chengyu/data/idioms.json'), 'utf8'))

// 中國軌：src/App.tsx 181-297（xia..prc）＋ src/imperial/data/*Pack.ts 嘅 yearMin/yearMax
const CHINA: [string, number, number][] = [
  ['chunqiu', -770, -476], // App.tsx:221
  ['zhanguo', -475, -221], // App.tsx:233
  ['qin', -221, -207], // App.tsx:245
  ['han', -206, 183], // App.tsx:257
  ['jin', 280, 316], // jinPack.ts:12
  ['nanbei', 304, 589], // nanbeiPack.ts:20
  ['sui', 581, 618], // suiPack.ts:13
  ['tang', 618, 907], // tangPack.ts:20
  ['wudai', 907, 960], // wudaiPack.ts:20
  ['liaosong', 960, 1279], // liaosongPack.ts:18
  ['yuanmingqing', 1271, 1911], // yuanMingQingPack.ts:22
  ['minguo', 1912, 1949], // minguoPack.ts:19
  ['prc', 1949, 2026], // prcPack.ts:12
]
// 日本軌：src/japanEras/packs/*.ts ＋ heian/sengoku/bakumatsu state
const JAPAN: [string, number, number][] = [
  ['asuka', 538, 710], // asukaPack.ts:140
  ['nara', 710, 794], // naraPack.ts:115
  ['heian', 794, 1185], // src/heian/state/HeianYearContext.tsx:20（YEAR_MIN 794／YEAR_MAX 1185；旧標 1150 係誤記）
  ['kamakura', 1185, 1333], // kamakuraPack.ts:169
  ['muromachi', 1336, 1467], // muromachiPack.ts:149
  ['sengoku', 1467, 1572], // SengokuYearContext.tsx:19
  ['azuchi', 1573, 1603], // azuchiPack.ts:183
  ['edo', 1603, 1868], // edoPack.ts:486
  ['bakumatsu', 1780, 1868], // BakumatsuApp.tsx:37（CHENGYU_YEAR_MIN）
  ['modern', 1868, 2026], // modernJapanPack.ts:1169（ModernJapanApp 即 DeepDiveApp＋MODERN_JAPAN_PACK，成語槽見 DeepDiveApp.tsx:203）
]

const NEW_IDS = process.argv.slice(2)
let bad = 0
for (const id of NEW_IDS) {
  const e = entries.find((x) => x.id === id)
  if (!e) {
    console.log(`MISSING ${id}`)
    bad++
    continue
  }
  const y = e.eraLink.year
  const hits: string[] = []
  for (const [era, lo, hi] of e.locale === 'jp' ? JAPAN : CHINA) {
    const locales = e.locale === 'jp' ? localesForJapanTrack() : localesForChinaTrack()
    const { yearMatches } = filterChengyuForPanel(entries, locales, y, lo, hi)
    if (yearMatches.some((m) => m.id === id)) {
      const c = e.locale === 'jp' ? 'japan' : 'china'
      hits.push(`?c=${c}&e=${era}&y=${y}`)
    }
  }
  if (hits.length === 0) {
    console.log(`NO EXIT  ${e.lemma} (${e.locale}, ${y})`)
    bad++
  } else {
    console.log(`OK  ${e.lemma} (${e.locale}, ${y}) → ${hits.join('  ')}`)
  }
}
console.log(bad === 0 ? 'panel-exit — 全部新條目喺面板有出口' : `panel-exit — ${bad} 條冇出口`)
process.exit(bad === 0 ? 0 : 1)
