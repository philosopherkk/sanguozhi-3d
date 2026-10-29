import { lazy, Suspense, type ComponentType } from 'react'
import { TopicProvider, useTopic } from './state/TopicContext'
import './App.css'

const ZhouApp = lazy(() =>
  import('./zhou/ZhouApp').then((m) => ({ default: m.ZhouApp })),
)
const QinHanApp = lazy(() =>
  import('./qinhan/QinHanApp').then((m) => ({ default: m.QinHanApp })),
)
const SanguozhiApp = lazy(() =>
  import('./SanguozhiApp').then((m) => ({ default: m.SanguozhiApp })),
)
const JapanHistoryApp = lazy(() =>
  import('./japanHistory/JapanHistoryApp').then((m) => ({
    default: m.JapanHistoryApp,
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

function EdoJapan() {
  return (
    <JapanHistoryApp
      initialYear={1603}
      yearMin={1603}
      yearMax={1868}
      heading="德川江戶"
      tag="1603–1868 · 松前與琉球在此 · 幕末詳圖另見"
      footer="日本 · 德川江戶（1603–1868）· 1603年家康任征夷大將軍 · 1604年松前黑印只是渡島南部的交易 · 1609年島津入侵琉球，國王仍在，虛線附庸 · 1615年大坂之陣是幕府開府後的戰事 · 1853年起的逐月地圖在「幕末」· 1868年以後見「明治至當代」· 家康沒有征服整個北海道或沖繩"
    />
  )
}

function ModernJapan() {
  return (
    <JapanHistoryApp
      initialYear={1868}
      yearMin={1868}
      yearMax={2026}
      heading="明治至當代"
      tag="1868–2026 · 明治、大正、昭和、平成、令和"
      footer="日本 · 明治至當代（1868–2026）· 明治 1868–1912、大正 1912–1926、昭和 1926–1989、平成 1989–2019、令和 2019年起 · 1869年設開拓使、改稱北海道 · 1879年琉球處分、設沖繩縣 · 1972年沖繩施政權歸還 · 1604年松前與1609年琉球見「德川江戶」"
    />
  )
}

function TopicRoot() {
  const { topic, chinaEra, japanEra } = useTopic()

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
      case 'prc':
        screen = <PrcApp />
        break
      default: {
        const _exhaustive: never = chinaEra
        screen = _exhaustive
      }
    }
  } else {
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
        screen = <EdoJapan />
        break
      case 'bakumatsu':
        screen = <BakumatsuApp />
        break
      case 'modern':
        screen = <ModernJapan />
        break
      default: {
        const _exhaustive: never = japanEra
        screen = _exhaustive
      }
    }
  }

  return <Suspense fallback={<p className="era-loading">載入中…</p>}>{screen}</Suspense>
}

function App() {
  return (
    <TopicProvider>
      <TopicRoot />
    </TopicProvider>
  )
}

export default App
