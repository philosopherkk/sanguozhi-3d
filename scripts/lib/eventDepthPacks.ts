/**
 * eventDepthPacks.ts — 把「事件＋深度解讀」的查表關係集中給稽核用。
 * 只讀，不影響執行期（執行期各元件有自己的 detailFor）。
 */
import * as civilWarPack from '../../src/imperial/data/civilWarPack'
import * as jinPack from '../../src/imperial/data/jinPack'
import * as liaosongPack from '../../src/imperial/data/liaosongPack'
import * as minguoPack from '../../src/imperial/data/minguoPack'
import * as nanbeiPack from '../../src/imperial/data/nanbeiPack'
import * as prcPack from '../../src/imperial/data/prcPack'
import * as suiPack from '../../src/imperial/data/suiPack'
import * as tangPack from '../../src/imperial/data/tangPack'
import * as wudaiPack from '../../src/imperial/data/wudaiPack'
import * as yuanMingQingPack from '../../src/imperial/data/yuanMingQingPack'
import * as asukaPack from '../../src/japanEras/packs/asukaPack'
import * as kofunPack from '../../src/japanEras/packs/kofunPack'
import * as naraPack from '../../src/japanEras/packs/naraPack'
import * as kamakuraPack from '../../src/japanEras/packs/kamakuraPack'
import * as muromachiPack from '../../src/japanEras/packs/muromachiPack'
import * as azuchiPack from '../../src/japanEras/packs/azuchiPack'
import { ASUKA_DETAILS } from '../../src/japanEras/details/asukaDetails'
import { KOFUN_DETAILS } from '../../src/japanEras/details/kofunDetails'
import { NARA_DETAILS } from '../../src/japanEras/details/naraDetails'
import { KAMAKURA_DETAILS } from '../../src/japanEras/details/kamakuraDetails'
import { MUROMACHI_DETAILS } from '../../src/japanEras/details/muromachiDetails'
import { AZUCHI_DETAILS } from '../../src/japanEras/details/azuchiDetails'

const packOf = (m: any) => Object.values(m).find((v: any) => v && v.id && v.events) as any

export const CHINA_PACKS = [
  civilWarPack, jinPack, liaosongPack, minguoPack, nanbeiPack,
  prcPack, suiPack, tangPack, wudaiPack, yuanMingQingPack,
].map(packOf)

export const JAPAN_DETAILS: Record<string, unknown> = {
  asuka: ASUKA_DETAILS,
  kofun: KOFUN_DETAILS,
  nara: NARA_DETAILS,
  kamakura: KAMAKURA_DETAILS,
  muromachi: MUROMACHI_DETAILS,
  azuchi: AZUCHI_DETAILS,
}

export const JAPAN_PACKS = [
  { name: '飛鳥', details: 'asuka', pack: packOf(asukaPack) },
  { name: '古墳', details: 'kofun', pack: packOf(kofunPack) },
  { name: '奈良', details: 'nara', pack: packOf(naraPack) },
  { name: '鎌倉', details: 'kamakura', pack: packOf(kamakuraPack) },
  { name: '室町', details: 'muromachi', pack: packOf(muromachiPack) },
  { name: '安土桃山', details: 'azuchi', pack: packOf(azuchiPack) },
]
