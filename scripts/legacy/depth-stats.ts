/**
 * depth-stats.ts — 各模組三級語譯／起因／經過／結果與影響的實際字數分布。
 * 用途：加厚前後對照，判斷「是不是真的變厚」，不是只看合格與否；
 * 同時抓跨條重複句——同一句話出現在多條，就是樣板文字的特徵。
 * Run: npx tsx scripts/depth-stats.ts
 */
import { ASUKA_PACK, AZUCHI_PACK, KAMAKURA_PACK, KOFUN_PACK, MUROMACHI_PACK, NARA_PACK } from '../src/japanEras/packs'
import { HEIAN_EVENTS, heianDetailFor, heianReadingFor } from '../src/heian/data/history'
import { BAKUMATSU_EVENTS, bakumatsuDetailFor, bakumatsuReadingFor } from '../src/bakumatsu/data/history'
import { CIVIL_WAR_PACK } from '../src/imperial/data/civilWarPack'
import { JIN_PACK } from '../src/imperial/data/jinPack'
import { NANBEI_PACK } from '../src/imperial/data/nanbeiPack'
import { SUI_PACK } from '../src/imperial/data/suiPack'
import { TANG_PACK } from '../src/imperial/data/tangPack'
import { WUDAI_PACK } from '../src/imperial/data/wudaiPack'
import { LIAOSONG_PACK } from '../src/imperial/data/liaosongPack'
import { YUAN_MING_QING_PACK } from '../src/imperial/data/yuanMingQingPack'
import { MINGUO_PACK } from '../src/imperial/data/minguoPack'
import { PRC_PACK } from '../src/imperial/data/prcPack'
const IMPERIAL_PACKS = [
  JIN_PACK, NANBEI_PACK, SUI_PACK, TANG_PACK, WUDAI_PACK,
  LIAOSONG_PACK, YUAN_MING_QING_PACK, MINGUO_PACK, PRC_PACK,
]
import { imperialReadingFor } from '../src/imperial/data/readings'

interface Sample {
  id: string
  layers?: { elementary: string; secondary: string; university: string }
  causes?: string
  course?: string
  outcome?: string
  figs?: number
}

const modules: { name: string; rows: Sample[] }[] = []

for (const pack of [KOFUN_PACK, ASUKA_PACK, NARA_PACK, KAMAKURA_PACK, MUROMACHI_PACK, AZUCHI_PACK]) {
  modules.push({
    name: `時代包-${pack.id}`,
    rows: pack.events.map((e) => {
      const d = pack.detailFor(e.id)
      const r = pack.readingFor(e.id)
      return {
        id: e.id,
        layers: r?.layers,
        causes: d?.causes,
        course: d?.course,
        outcome: d?.outcome,
        figs: d?.keyFigures.length,
      }
    }),
  })
}
modules.push({
  name: '平安',
  rows: HEIAN_EVENTS.map((e) => {
    const d = heianDetailFor(e.id)
    return {
      id: e.id,
      layers: heianReadingFor(e.id)?.layers,
      causes: d?.causes,
      course: d?.course,
      outcome: d?.outcome,
      figs: d?.keyFigures.length,
    }
  }),
})
modules.push({
  name: '幕末',
  rows: BAKUMATSU_EVENTS.map((e) => {
    const d = bakumatsuDetailFor(e.id)
    return {
      id: e.id,
      layers: bakumatsuReadingFor(e.id)?.layers,
      causes: d?.causes,
      course: d?.course,
      outcome: d?.outcome,
      figs: d?.keyFigures.length,
    }
  }),
})
modules.push({
  name: '內戰',
  rows: CIVIL_WAR_PACK.events.map((e) => {
    const r = imperialReadingFor('civilwar', e.id)
    return {
      id: e.id,
      layers: r?.layers,
      causes: r?.causes,
      course: r?.course,
      outcome: r?.outcome,
      figs: r?.keyFigures.length,
    }
  }),
})

// 中國／近現代帝國包：照 toDetail() 的 fallback 鏈取樣，數字才是讀者看到的數字。
for (const pack of IMPERIAL_PACKS) {
  modules.push({
    name: `帝國包-${pack.id}`,
    rows: pack.events.map((e) => {
      const r = imperialReadingFor(pack.id, e.id)
      const elementary = e.desc
      const secondary = e.secondary || e.desc
      const university = e.university || e.secondary || e.desc
      return {
        id: e.id,
        layers: {
          elementary: r?.layers.elementary ?? elementary,
          secondary: r?.layers.secondary ?? secondary,
          university: r?.layers.university ?? university,
        },
        causes: r?.causes ?? e.causes ?? secondary,
        course: r?.course ?? e.course ?? elementary,
        outcome: r?.outcome ?? e.outcome ?? university,
        figs: (r?.keyFigures ?? e.keyFigures ?? []).length,
      }
    }),
  })
}

const KEYS = ['elementary', 'secondary', 'university', 'causes', 'course', 'outcome'] as const
const stat = (v: number[]) =>
  `min ${String(Math.min(...v)).padStart(3)}  avg ${String(Math.round(v.reduce((a, b) => a + b, 0) / v.length)).padStart(4)}  max ${String(Math.max(...v)).padStart(4)}`

for (const m of modules) {
  const covered = m.rows.filter((r) => (r.causes ?? '').trim()).length
  console.log(`\n${m.name}：${m.rows.length} 條事件，有起因／經過／結果 ${covered} 條`)
  for (const k of KEYS) {
    const v = m.rows.map((r) => {
      const src = k === 'elementary' || k === 'secondary' || k === 'university' ? r.layers?.[k] : r[k as 'causes' | 'course' | 'outcome']
      return (src ?? '').trim().length
    })
    console.log(`  ${k.padEnd(11)} ${stat(v)}`)
  }
  console.log(`  ${'figs'.padEnd(11)} ${stat(m.rows.map((r) => r.figs ?? 0))}`)

  // 跨條重複句：同一句話出現在 3 條以上，通常是樣板文字。
  // 注意要數「不同條目」而非出現次數——同一條在自己內文裡重複一句是另一種毛病，不算樣板。
  const sentences = new Map<string, Set<string>>()
  for (const r of m.rows) {
    const text = [r.layers?.elementary, r.layers?.secondary, r.layers?.university, r.causes, r.course, r.outcome].join(' ')
    for (const s of text.split(/[。！？；]/).map((x) => x.trim())) {
      if (s.length < 12) continue
      sentences.set(s, new Set([...(sentences.get(s) ?? []), r.id]))
    }
  }
  const shared = [...sentences.entries()].filter(([, ids]) => ids.size > 2).sort((a, b) => b[1].size - a[1].size)
  console.log(`  跨條重複句（>2 條共用同一句）：${shared.length} 處`)
  for (const [s, ids] of shared.slice(0, 5)) console.log(`    x${ids.size} 「${s.slice(0, 36)}…」`)
}
