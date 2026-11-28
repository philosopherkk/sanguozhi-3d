/**
 * 簡易版故事資料 hook：按目前時代載入 pack（與時代 App 共用同一個分塊，
 * 不會重複下載），轉成 `KidStory[]`／`KidPerson[]`。
 * 未接上的時代回傳 `status: 'unsupported'`，外殼改顯示舊側欄（套簡易版皮）。
 */
import { useEffect, useMemo, useState } from 'react'
import type { ImperialPack } from '../imperial/types'
import type { JapanDeepDivePack } from '../japanEras/deepDiveTypes'
import { useReadingPrefs } from '../lib/readingPrefs'
import { useTopic } from '../state/TopicContext'
import {
  peopleFrom,
  storiesFrom,
  type KidPerson,
  type KidSource,
  type KidStory,
} from './stories'

export { nextStoryYear, prevStoryYear, storiesAt } from './stories'
export type { KidPerson, KidStory } from './stories'

const imperial = (pack: ImperialPack): KidSource => ({ kind: 'imperial', pack })
const deep = (pack: JapanDeepDivePack): KidSource => ({ kind: 'deep', pack })

const LOADERS: Record<string, () => Promise<KidSource>> = {
  jin: () =>
    import('../imperial/data/jinPack').then((m) => imperial(m.JIN_PACK)),
  nanbei: () =>
    import('../imperial/data/nanbeiPack').then((m) => imperial(m.NANBEI_PACK)),
  sui: () =>
    import('../imperial/data/suiPack').then((m) => imperial(m.SUI_PACK)),
  tang: () =>
    import('../imperial/data/tangPack').then((m) => imperial(m.TANG_PACK)),
  wudai: () =>
    import('../imperial/data/wudaiPack').then((m) => imperial(m.WUDAI_PACK)),
  liaosong: () =>
    import('../imperial/data/liaosongPack').then((m) => imperial(m.LIAOSONG_PACK)),
  yuanmingqing: () =>
    import('../imperial/data/yuanMingQingPack').then((m) => imperial(m.YUAN_MING_QING_PACK)),
  minguo: () =>
    import('../imperial/data/minguoPack').then((m) => imperial(m.MINGUO_PACK)),
  civilwar: () =>
    import('../imperial/data/civilWarPack').then((m) => imperial(m.CIVIL_WAR_PACK)),
  prc: () =>
    import('../imperial/data/prcPack').then((m) => imperial(m.PRC_PACK)),
  kofun: () =>
    import('../japanEras/packs/kofunPack').then((m) => deep(m.KOFUN_PACK)),
  asuka: () =>
    import('../japanEras/packs/asukaPack').then((m) => deep(m.ASUKA_PACK)),
  nara: () =>
    import('../japanEras/packs/naraPack').then((m) => deep(m.NARA_PACK)),
  kamakura: () =>
    import('../japanEras/packs/kamakuraPack').then((m) => deep(m.KAMAKURA_PACK)),
  muromachi: () =>
    import('../japanEras/packs/muromachiPack').then((m) => deep(m.MUROMACHI_PACK)),
  azuchi: () =>
    import('../japanEras/packs/azuchiPack').then((m) => deep(m.AZUCHI_PACK)),
  edo: () =>
    import('../japanEras/packs/edoPack').then((m) => deep(m.EDO_PACK)),
  koancient: () =>
    import('../countries/korea/koancientPack').then((m) => deep(m.KOANCIENT_PACK)),
  kogoryeo: () =>
    import('../countries/korea/kogoryeoPack').then((m) => deep(m.KOGORYEO_PACK)),
  kojoseon: () =>
    import('../countries/korea/kojoseonPack').then((m) => deep(m.KOJOSEON_PACK)),
  komodern: () =>
    import('../countries/korea/komodernPack').then((m) => deep(m.KOMODERN_PACK)),
  thsukhothai: () =>
    import('../countries/thailand/thsukhothaiPack').then((m) => deep(m.THSUKHOTHAI_PACK)),
  thayutthaya: () =>
    import('../countries/thailand/thayutthayaPack').then((m) => deep(m.THAYUTTHAYA_PACK)),
  thchakri: () =>
    import('../countries/thailand/thchakriPack').then((m) => deep(m.THCHAKRI_PACK)),
  thmodern: () =>
    import('../countries/thailand/thmodernPack').then((m) => deep(m.THMODERN_PACK)),
  vnnorth: () =>
    import('../countries/vietnam/vnnorthPack').then((m) => deep(m.VNNORTH_PACK)),
  vndynasty: () =>
    import('../countries/vietnam/vndynastyPack').then((m) => deep(m.VNDYNASTY_PACK)),
  vnnguyen: () =>
    import('../countries/vietnam/vnnguyenPack').then((m) => deep(m.VNNGUYEN_PACK)),
  vnmodern: () =>
    import('../countries/vietnam/vnmodernPack').then((m) => deep(m.VNMODERN_PACK)),
  mymalacca: () =>
    import('../countries/malaysia/mymalaccaPack').then((m) => deep(m.MYMALACCA_PACK)),
  mycolonial: () =>
    import('../countries/malaysia/mycolonialPack').then((m) => deep(m.MYCOLONIAL_PACK)),
  mymerdeka: () =>
    import('../countries/malaysia/mymerdekaPack').then((m) => deep(m.MYMERDEKA_PACK)),
  mymodern: () =>
    import('../countries/malaysia/mymodernPack').then((m) => deep(m.MYMODERN_PACK)),
}

/** 有故事資料的時代 id（`kid_probe.mjs` 與外殼用來判斷要不要顯示舊側欄）。 */
export const KID_STORY_ERAS = Object.keys(LOADERS)

export function hasKidStories(eraId: string): boolean {
  return eraId in LOADERS
}

export interface KidStories {
  status: 'loading' | 'ready' | 'unsupported'
  stories: KidStory[]
  people: KidPerson[]
}

const EMPTY: KidStory[] = []
const NOBODY: KidPerson[] = []

export function useKidStories(eraId?: string): KidStories {
  const { activeEra } = useTopic()
  const era = eraId ?? activeEra
  const { level } = useReadingPrefs()
  const [loaded, setLoaded] = useState<{ era: string; source: KidSource } | null>(null)

  useEffect(() => {
    const load = LOADERS[era]
    if (!load) return
    let alive = true
    load().then((source) => {
      if (alive) setLoaded({ era, source })
    })
    return () => {
      alive = false
    }
  }, [era])

  const source = loaded && loaded.era === era ? loaded.source : null
  const stories = useMemo(
    () => (source ? storiesFrom(source, level) : EMPTY),
    [source, level],
  )
  const people = useMemo(() => (source ? peopleFrom(source) : NOBODY), [source])

  if (!(era in LOADERS)) return { status: 'unsupported', stories: EMPTY, people: NOBODY }
  if (!source) return { status: 'loading', stories: EMPTY, people: NOBODY }
  return { status: 'ready', stories, people }
}
