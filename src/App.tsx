import { lazy, Suspense, useEffect, type ComponentType } from 'react'
import { PortraitGallery } from './components/PortraitGallery'
import {
  countryLabelForTopic,
  eraSlotsForTopic,
  TopicProvider,
  useTopic,
  type KoreaEraSlot,
  type MalaysiaEraSlot,
  type ThailandEraSlot,
  type VietnamEraSlot,
} from './state/TopicContext'
import type { JapanDeepDivePack } from './japanEras/deepDiveTypes'
import {
  onTimelineChange,
  readTimelineFromUrl,
  writeTimelineToUrl,
} from './lib/timelineUrl'
import { BottomBar } from './components/BottomBar'
import './App.css'
import './mobile.css'

const ZhouApp = lazy(() =>
  import('./zhou/ZhouApp').then((m) => ({ default: m.ZhouApp })),
)
const QinHanApp = lazy(() =>
  import('./qinhan/QinHanApp').then((m) => ({ default: m.QinHanApp })),
)
const SanguozhiApp = lazy(() =>
  import('./SanguozhiApp').then((m) => ({ default: m.SanguozhiApp })),
)
const ModernJapanApp = lazy(() =>
  import('./modernJapan/ModernJapanApp').then((m) => ({
    default: m.ModernJapanApp,
  })),
)
const HeianApp = lazy(() =>
  import('./heian/HeianApp').then((m) => ({ default: m.HeianApp })),
)
const SengokuApp = lazy(() =>
  import('./sengoku/SengokuApp').then((m) => ({ default: m.SengokuApp })),
)
const BakumatsuApp = lazy(() =>
  import('./bakumatsu/BakumatsuApp').then((m) => ({ default: m.BakumatsuApp })),
)
const KofunApp = lazy(() =>
  import('./kofun/KofunApp').then((m) => ({ default: m.KofunApp })),
)
const AsukaApp = lazy(() =>
  import('./asuka/AsukaApp').then((m) => ({ default: m.AsukaApp })),
)
const NaraApp = lazy(() =>
  import('./nara/NaraApp').then((m) => ({ default: m.NaraApp })),
)
const KamakuraApp = lazy(() =>
  import('./kamakura/KamakuraApp').then((m) => ({ default: m.KamakuraApp })),
)
const MuromachiApp = lazy(() =>
  import('./muromachi/MuromachiApp').then((m) => ({ default: m.MuromachiApp })),
)
const AzuchiApp = lazy(() =>
  import('./azuchi/AzuchiApp').then((m) => ({ default: m.AzuchiApp })),
)
const EdoJapanApp = lazyPack(() =>
  Promise.all([
    import('./japanEras/DeepDiveApp'),
    import('./japanEras/packs/edoPack'),
  ]).then(([app, data]) => ({
    default: function EdoEra() {
      return <app.DeepDiveApp pack={data.EDO_PACK} />
    },
  })),
)

function lazyPack(
  loadPack: () => Promise<{ default: ComponentType }>,
) {
  return lazy(loadPack)
}

const JinApp = lazyPack(() =>
  Promise.all([
    import('./imperial/ImperialApp'),
    import('./imperial/data/jinPack'),
  ]).then(([app, data]) => ({
    default: function JinEra() {
      return <app.ImperialApp pack={data.JIN_PACK} />
    },
  })),
)
const NanbeiApp = lazyPack(() =>
  Promise.all([
    import('./imperial/ImperialApp'),
    import('./imperial/data/nanbeiPack'),
  ]).then(([app, data]) => ({
    default: function NanbeiEra() {
      return <app.ImperialApp pack={data.NANBEI_PACK} />
    },
  })),
)
const SuiApp = lazyPack(() =>
  Promise.all([
    import('./imperial/ImperialApp'),
    import('./imperial/data/suiPack'),
  ]).then(([app, data]) => ({
    default: function SuiEra() {
      return <app.ImperialApp pack={data.SUI_PACK} />
    },
  })),
)
const TangApp = lazyPack(() =>
  Promise.all([
    import('./imperial/ImperialApp'),
    import('./imperial/data/tangPack'),
  ]).then(([app, data]) => ({
    default: function TangEra() {
      return <app.ImperialApp pack={data.TANG_PACK} />
    },
  })),
)
const WudaiApp = lazyPack(() =>
  Promise.all([
    import('./imperial/ImperialApp'),
    import('./imperial/data/wudaiPack'),
  ]).then(([app, data]) => ({
    default: function WudaiEra() {
      return <app.ImperialApp pack={data.WUDAI_PACK} />
    },
  })),
)
const LiaoSongApp = lazyPack(() =>
  Promise.all([
    import('./imperial/ImperialApp'),
    import('./imperial/data/liaosongPack'),
  ]).then(([app, data]) => ({
    default: function LiaoSongEra() {
      return <app.ImperialApp pack={data.LIAOSONG_PACK} />
    },
  })),
)
const YuanMingQingApp = lazyPack(() =>
  Promise.all([
    import('./imperial/ImperialApp'),
    import('./imperial/data/yuanMingQingPack'),
  ]).then(([app, data]) => ({
    default: function YuanMingQingEra() {
      return <app.ImperialApp pack={data.YUAN_MING_QING_PACK} />
    },
  })),
)
const MinguoApp = lazyPack(() =>
  Promise.all([
    import('./imperial/ImperialApp'),
    import('./imperial/data/minguoPack'),
  ]).then(([app, data]) => ({
    default: function MinguoEra() {
      return <app.ImperialApp pack={data.MINGUO_PACK} />
    },
  })),
)
const CivilWarApp = lazyPack(() =>
  Promise.all([
    import('./imperial/ImperialApp'),
    import('./imperial/data/civilWarPack'),
  ]).then(([app, data]) => ({
    default: function CivilWarEra() {
      return <app.ImperialApp pack={data.CIVIL_WAR_PACK} />
    },
  })),
)
const PrcApp = lazyPack(() =>
  Promise.all([
    import('./imperial/ImperialApp'),
    import('./imperial/data/prcPack'),
  ]).then(([app, data]) => ({
    default: function PrcEra() {
      return <app.ImperialApp pack={data.PRC_PACK} />
    },
  })),
)

/**
 * 韓國、泰國、越南、馬來西亞四國十六包的共同補充欄。
 * pack 檔本身不動：維基總覽連結、成語語域與領土口徑都在這裡補上，
 * 免得把「亞洲—太平洋戰區」的戰區口徑誤掛到馬六甲或素可泰的地圖上。
 */
const COUNTRY_WIKI_URL: Record<
  'korea' | 'thailand' | 'vietnam' | 'malaysia',
  string
> = {
  korea: 'https://zh.wikipedia.org/wiki/韓國歷史',
  thailand: 'https://zh.wikipedia.org/wiki/泰國歷史',
  vietnam: 'https://zh.wikipedia.org/wiki/越南歷史',
  malaysia: 'https://zh.wikipedia.org/wiki/馬來西亞歷史',
}

const COUNTRY_TERRITORY_NOTE_ZH =
  '色塊為通說控制範圍示意（經緯度界定後剪裁至真實海岸線），非行政區界，亦不表示實效支配無爭議；界線隨年代變動，爭議見對應事件之起因／經過／結果。'

type CountryKey = keyof typeof COUNTRY_WIKI_URL

function countryPack(
  pack: JapanDeepDivePack,
  country: CountryKey,
): JapanDeepDivePack {
  return {
    ...pack,
    countryWikiUrl: COUNTRY_WIKI_URL[country],
    territoryNote: COUNTRY_TERRITORY_NOTE_ZH,
    chengyuLocales: ['shared'],
  }
}

const KoAncientApp = lazyPack(() =>
  Promise.all([
    import('./japanEras/DeepDiveApp'),
    import('./countries/korea/koancientPack'),
  ]).then(([app, data]) => ({
    default: function KoAncientEra() {
      return (
        <app.DeepDiveApp pack={countryPack(data.KOANCIENT_PACK, 'korea')} />
      )
    },
  })),
)
const KoGoryeoApp = lazyPack(() =>
  Promise.all([
    import('./japanEras/DeepDiveApp'),
    import('./countries/korea/kogoryeoPack'),
  ]).then(([app, data]) => ({
    default: function KoGoryeoEra() {
      return (
        <app.DeepDiveApp pack={countryPack(data.KOGORYEO_PACK, 'korea')} />
      )
    },
  })),
)
const KoJoseonApp = lazyPack(() =>
  Promise.all([
    import('./japanEras/DeepDiveApp'),
    import('./countries/korea/kojoseonPack'),
  ]).then(([app, data]) => ({
    default: function KoJoseonEra() {
      return (
        <app.DeepDiveApp pack={countryPack(data.KOJOSEON_PACK, 'korea')} />
      )
    },
  })),
)
const KoModernApp = lazyPack(() =>
  Promise.all([
    import('./japanEras/DeepDiveApp'),
    import('./countries/korea/komodernPack'),
  ]).then(([app, data]) => ({
    default: function KoModernEra() {
      return <app.DeepDiveApp pack={countryPack(data.KOMODERN_PACK, 'korea')} />
    },
  })),
)
const ThSukhothaiApp = lazyPack(() =>
  Promise.all([
    import('./japanEras/DeepDiveApp'),
    import('./countries/thailand/thsukhothaiPack'),
  ]).then(([app, data]) => ({
    default: function ThSukhothaiEra() {
      return (
        <app.DeepDiveApp
          pack={countryPack(data.THSUKHOTHAI_PACK, 'thailand')}
        />
      )
    },
  })),
)
const ThAyutthayaApp = lazyPack(() =>
  Promise.all([
    import('./japanEras/DeepDiveApp'),
    import('./countries/thailand/thayutthayaPack'),
  ]).then(([app, data]) => ({
    default: function ThAyutthayaEra() {
      return (
        <app.DeepDiveApp
          pack={countryPack(data.THAYUTTHAYA_PACK, 'thailand')}
        />
      )
    },
  })),
)
const ThChakriApp = lazyPack(() =>
  Promise.all([
    import('./japanEras/DeepDiveApp'),
    import('./countries/thailand/thchakriPack'),
  ]).then(([app, data]) => ({
    default: function ThChakriEra() {
      return (
        <app.DeepDiveApp pack={countryPack(data.THCHAKRI_PACK, 'thailand')} />
      )
    },
  })),
)
const ThModernApp = lazyPack(() =>
  Promise.all([
    import('./japanEras/DeepDiveApp'),
    import('./countries/thailand/thmodernPack'),
  ]).then(([app, data]) => ({
    default: function ThModernEra() {
      return (
        <app.DeepDiveApp pack={countryPack(data.THMODERN_PACK, 'thailand')} />
      )
    },
  })),
)
const VnNorthApp = lazyPack(() =>
  Promise.all([
    import('./japanEras/DeepDiveApp'),
    import('./countries/vietnam/vnnorthPack'),
  ]).then(([app, data]) => ({
    default: function VnNorthEra() {
      return <app.DeepDiveApp pack={countryPack(data.VNNORTH_PACK, 'vietnam')} />
    },
  })),
)
const VnDynastyApp = lazyPack(() =>
  Promise.all([
    import('./japanEras/DeepDiveApp'),
    import('./countries/vietnam/vndynastyPack'),
  ]).then(([app, data]) => ({
    default: function VnDynastyEra() {
      return (
        <app.DeepDiveApp pack={countryPack(data.VNDYNASTY_PACK, 'vietnam')} />
      )
    },
  })),
)
const VnNguyenApp = lazyPack(() =>
  Promise.all([
    import('./japanEras/DeepDiveApp'),
    import('./countries/vietnam/vnnguyenPack'),
  ]).then(([app, data]) => ({
    default: function VnNguyenEra() {
      return (
        <app.DeepDiveApp pack={countryPack(data.VNNGUYEN_PACK, 'vietnam')} />
      )
    },
  })),
)
const VnModernApp = lazyPack(() =>
  Promise.all([
    import('./japanEras/DeepDiveApp'),
    import('./countries/vietnam/vnmodernPack'),
  ]).then(([app, data]) => ({
    default: function VnModernEra() {
      return <app.DeepDiveApp pack={countryPack(data.VNMODERN_PACK, 'vietnam')} />
    },
  })),
)
const MyMalaccaApp = lazyPack(() =>
  Promise.all([
    import('./japanEras/DeepDiveApp'),
    import('./countries/malaysia/mymalaccaPack'),
  ]).then(([app, data]) => ({
    default: function MyMalaccaEra() {
      return (
        <app.DeepDiveApp pack={countryPack(data.MYMALACCA_PACK, 'malaysia')} />
      )
    },
  })),
)
const MyColonialApp = lazyPack(() =>
  Promise.all([
    import('./japanEras/DeepDiveApp'),
    import('./countries/malaysia/mycolonialPack'),
  ]).then(([app, data]) => ({
    default: function MyColonialEra() {
      return (
        <app.DeepDiveApp pack={countryPack(data.MYCOLONIAL_PACK, 'malaysia')} />
      )
    },
  })),
)
const MyMerdekaApp = lazyPack(() =>
  Promise.all([
    import('./japanEras/DeepDiveApp'),
    import('./countries/malaysia/mymerdekaPack'),
  ]).then(([app, data]) => ({
    default: function MyMerdekaEra() {
      return (
        <app.DeepDiveApp pack={countryPack(data.MYMERDEKA_PACK, 'malaysia')} />
      )
    },
  })),
)
const MyModernApp = lazyPack(() =>
  Promise.all([
    import('./japanEras/DeepDiveApp'),
    import('./countries/malaysia/mymodernPack'),
  ]).then(([app, data]) => ({
    default: function MyModernEra() {
      return <app.DeepDiveApp pack={countryPack(data.MYMODERN_PACK, 'malaysia')} />
    },
  })),
)

function TopicRoot() {
  const { topic, chinaEra, japanEra, activeEra } = useTopic()

  let screen = null
  if (topic === 'china') {
    switch (chinaEra) {
      case 'xia':
        screen = (
          <ZhouApp
            key="xia"
            yearMin={-2070}
            yearMax={-1601}
            initialYear={-1900}
            title="夏"
            footer="中國 · 夏（文獻記載，約前2070–前1600，年份有爭議）· 據《史記·夏本紀》《竹書紀年》· 沒有甲骨金文直接證明 · 只標伊洛核心，不塗全國"
          />
        )
        break
      case 'shang':
        screen = (
          <ZhouApp
            key="shang"
            yearMin={-1600}
            yearMax={-1047}
            initialYear={-1250}
            title="商"
            footer="中國 · 商（約前1600–前1046）· 殷墟甲骨可證晚期王世系 · 色塊只圈安陽殷墟 · 不把河北塗成王畿 · 商初年份與殷墟年代並不完全重合"
          />
        )
        break
      case 'xizhou':
        screen = (
          <ZhouApp
            key="xizhou"
            yearMin={-1046}
            yearMax={-771}
            initialYear={-1046}
            title="西周"
            footer="中國 · 西周（前1046–前771）· 據西周金文與《史記·周本紀》· 豐鎬在關中，成周在洛邑 · 不把江東嶺南塗成周"
          />
        )
        break
      case 'chunqiu':
        screen = (
          <ZhouApp
            key="chunqiu"
            yearMin={-770}
            yearMax={-476}
            initialYear={-632}
            title="春秋"
            footer="中國 · 春秋（前770–前476）· 據《左傳》《史記》· 宋、魯、衛、蔡、鄭、曹、陳、許不另畫州界 · 韓、趙、魏尚未分晉 · 不用《東周列國志》"
          />
        )
        break
      case 'zhanguo':
        screen = (
          <ZhouApp
            key="zhanguo"
            yearMin={-475}
            yearMax={-221}
            initialYear={-260}
            title="戰國"
            footer="中國 · 戰國（前475–前221）· 據《史記》《資治通鑑》· 韓、趙、魏自三家分晉（前453）才分色，此前仍標晉 · 戰國尾可按月逐段"
          />
        )
        break
      case 'qin':
        screen = (
          <QinHanApp
            key="qin"
            yearMin={-221}
            yearMax={-207}
            initialYear={-221}
            title="秦"
            footer="中國 · 秦（前221–前207）· 據《史記·秦始皇本紀》《資治通鑑》· 嶺南在前214年前後才畫入 · 不用《三國演義》· 不是三國州界"
          />
        )
        break
      case 'han':
        screen = (
          <QinHanApp
            key="han"
            yearMin={-206}
            yearMax={183}
            initialYear={-206}
            title="漢"
            footer="中國 · 漢（前206–183，含楚漢、新、東漢）· 據《史記》《漢書》《後漢書》《資治通鑑》· 楚漢爭雄在開頭 · 184年黃巾見「三國」· 不用《三國演義》"
          />
        )
        break
      case 'sanguo':
        screen = <SanguozhiApp />
        break
      case 'jin':
        screen = <JinApp />
        break
      case 'nanbei':
        screen = <NanbeiApp />
        break
      case 'sui':
        screen = <SuiApp />
        break
      case 'tang':
        screen = <TangApp />
        break
      case 'wudai':
        screen = <WudaiApp />
        break
      case 'liaosong':
        screen = <LiaoSongApp />
        break
      case 'yuanmingqing':
        screen = <YuanMingQingApp />
        break
      case 'minguo':
        screen = <MinguoApp />
        break
      case 'civilwar':
        screen = <CivilWarApp />
        break
      case 'prc':
        screen = <PrcApp />
        break
      default: {
        const _exhaustive: never = chinaEra
        screen = _exhaustive
      }
    }
  } else if (topic === 'japan') {
    switch (japanEra) {
      case 'kofun':
        screen = <KofunApp />
        break
      case 'asuka':
        screen = <AsukaApp />
        break
      case 'nara':
        screen = <NaraApp />
        break
      case 'heian':
        screen = <HeianApp />
        break
      case 'kamakura':
        screen = <KamakuraApp />
        break
      case 'muromachi':
        screen = <MuromachiApp />
        break
      case 'sengoku':
        screen = <SengokuApp />
        break
      case 'azuchi':
        screen = <AzuchiApp />
        break
      case 'edo':
        screen = <EdoJapanApp />
        break
      case 'bakumatsu':
        screen = <BakumatsuApp />
        break
      case 'modern':
        screen = <ModernJapanApp />
        break
      default: {
        const _exhaustive: never = japanEra
        screen = _exhaustive
      }
    }
  } else {
    // 韓國、泰國、越南、馬來西亞：activeEra 即本國目前時代，
    // 槽位一律經 setEraForTopic 驗過，此處轉回本國槽位型別。
    switch (topic) {
      case 'korea': {
        const era = activeEra as KoreaEraSlot
        switch (era) {
          case 'koancient':
            screen = <KoAncientApp />
            break
          case 'kogoryeo':
            screen = <KoGoryeoApp />
            break
          case 'kojoseon':
            screen = <KoJoseonApp />
            break
          case 'komodern':
            screen = <KoModernApp />
            break
          default: {
            const _exhaustive: never = era
            screen = _exhaustive
          }
        }
        break
      }
      case 'thailand': {
        const era = activeEra as ThailandEraSlot
        switch (era) {
          case 'thsukhothai':
            screen = <ThSukhothaiApp />
            break
          case 'thayutthaya':
            screen = <ThAyutthayaApp />
            break
          case 'thchakri':
            screen = <ThChakriApp />
            break
          case 'thmodern':
            screen = <ThModernApp />
            break
          default: {
            const _exhaustive: never = era
            screen = _exhaustive
          }
        }
        break
      }
      case 'vietnam': {
        const era = activeEra as VietnamEraSlot
        switch (era) {
          case 'vnnorth':
            screen = <VnNorthApp />
            break
          case 'vndynasty':
            screen = <VnDynastyApp />
            break
          case 'vnnguyen':
            screen = <VnNguyenApp />
            break
          case 'vnmodern':
            screen = <VnModernApp />
            break
          default: {
            const _exhaustive: never = era
            screen = _exhaustive
          }
        }
        break
      }
      case 'malaysia': {
        const era = activeEra as MalaysiaEraSlot
        switch (era) {
          case 'mymalacca':
            screen = <MyMalaccaApp />
            break
          case 'mycolonial':
            screen = <MyColonialApp />
            break
          case 'mymerdeka':
            screen = <MyMerdekaApp />
            break
          case 'mymodern':
            screen = <MyModernApp />
            break
          default: {
            const _exhaustive: never = era
            screen = _exhaustive
          }
        }
        break
      }
      default: {
        const _exhaustive: never = topic
        screen = _exhaustive
      }
    }
  }

  return <Suspense fallback={<p className="era-loading">載入中…</p>}>{screen}</Suspense>
}

/**
 * 年份 ↔ URL 橋。
 * 讀：`?y=` 送入現在邊個時代的滑桿（滑桿於 lazy chunk 入面，所以要 retry 一段短時間）。
 * 寫：使用者拖滑桿就將年份寫回入 URL，refresh 先可以還原。
 * 標題：跟國家／時代改 document.title 同 OG 標籤，方便分享卡同 SEO。
 */
function UrlBridge() {
  const { topic, activeEra, urlYear } = useTopic()
  const eraId = activeEra
  const eraKey = `${topic}:${eraId}`

  useEffect(() => {
    // 滑桿（range input）：只帶年份，月份保留現況（逐月時代由 context 廣播月份）
    const onInput = (ev: Event) => {
      const el = ev.target as HTMLElement | null
      if (!el || typeof el.closest !== 'function' || !el.closest('.year-scrubber')) return
      const input = el as HTMLInputElement
      if (input.type !== 'range') return
      writeTimelineToUrl({
        year: Number(input.value),
        month: readTimelineFromUrl().month,
      })
    }
    document.addEventListener('input', onInput, true)
    // 各時代 context 的年份／月份變更 → 統一寫回 URL
    const unsubscribe = onTimelineChange((state) => writeTimelineToUrl(state))
    return () => {
      document.removeEventListener('input', onInput, true)
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (urlYear === null) return
    let tries = 0
    const timer = window.setInterval(() => {
      tries += 1
      const input = document.querySelector<HTMLInputElement>('.year-scrubber input[type=range]')
      if (!input) {
        if (tries > 20) window.clearInterval(timer)
        return
      }
      const lo = Number(input.min)
      const hi = Number(input.max)
      if (Number.isFinite(lo) && Number.isFinite(hi) && (urlYear < lo || urlYear > hi)) {
        window.clearInterval(timer) // URL 的年份於這個時代範圍之外，不要亂設
        return
      }
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
      if (!setter || input.value === String(urlYear)) {
        window.clearInterval(timer)
        return
      }
      setter.call(input, String(urlYear))
      input.dispatchEvent(new Event('input', { bubbles: true }))
      window.clearInterval(timer)
    }, 150)
    return () => window.clearInterval(timer)
  }, [eraKey, urlYear])

  useEffect(() => {
    const slot = eraSlotsForTopic(topic).find((s) => s.id === eraId)
    const country = countryLabelForTopic(topic)
    // 中日保留原站名；新增的韓國、泰國、越南、馬來西亞用通用書名。
    const isChinaOrJapan = topic === 'china' || topic === 'japan'
    const brand = isChinaOrJapan ? '中日歷史回顧' : '歷史回顧'
    const title = slot ? `${country}·${slot.label}（${slot.range}）｜${brand}` : brand
    document.title = title
    const setMeta = (selector: string, content: string) => {
      const el = document.head.querySelector(selector)
      if (el) el.setAttribute('content', content)
    }
    setMeta('meta[property="og:title"]', title)
    setMeta('meta[name="twitter:title"]', title)
    const desc = slot
      ? `${country}${slot.label}（${slot.range}）——正史疆域、勢力與人物、行軍路徑逐年對照`
      : isChinaOrJapan
        ? '中日歷史回顧——中國（夏—當代）與日本（有史以來—當代）的正史疆域、勢力與人物互動年表'
        : '歷史回顧——韓國（前108—當代）、泰國（1238—當代）、越南（前111—當代）與馬來西亞（1400—當代）的正史疆域、勢力與人物互動年表'
    setMeta('meta[property="og:description"]', desc)
    setMeta('meta[name="description"]', desc)
    setMeta('meta[name="twitter:description"]', desc)
  }, [topic, eraId])

  return null
}

function App() {
  return (
    <TopicProvider>
      <UrlBridge />
      <TopicRoot />
      <PortraitGallery />
      <BottomBar />
    </TopicProvider>
  )
}

export default App
