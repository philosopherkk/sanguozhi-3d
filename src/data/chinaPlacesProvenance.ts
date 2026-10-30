/**
 * 三國具名地名像素座標出處（sidecar）。
 * 不修改 chinaPlaces.ts 內任何 name／x／y；僅標註 coord_confidence。
 */

import { THREE_KINGDOMS_PLACES } from './chinaPlaces'

export type CoordConfidence = 'attested' | 'approx' | 'unknown'

export interface ChinaPlaceProvenanceRow {
  /** 與 THREE_KINGDOMS_PLACES.name 一致 */
  name: string
  coord_confidence: CoordConfidence
  coord_note: string
  source: string
}

/** 具名地名 → 座標信心 sidecar（100% 覆蓋 THREE_KINGDOMS_PLACES） */
export const CHINA_PLACES_PROVENANCE: ChinaPlaceProvenanceRow[] = [
  {
    name: '洛陽',
    coord_confidence: 'approx',
    coord_note:
      '東漢、魏初帝都所在；像素為現代東亞地勢底圖上手動對齊，非典籍記載之經緯或里數換算。',
    source: '《後漢書·郡國志》；《三國志·魏書·武帝紀》',
  },
  {
    name: '成都',
    coord_confidence: 'approx',
    coord_note:
      '益州治所、蜀漢都城；像素為現代成都平原一帶示意錨點，未逐縣考訂。',
    source: '《三國志·蜀書·先主傳》；《後漢書·郡國志》益州',
  },
  {
    name: '建業',
    coord_confidence: 'approx',
    coord_note:
      '孫吳都城（秣陵／建業）；像素對齊長江下游今南京段地勢，與東吳路線註「不自建業起畫」之早期事件無涉。',
    source: '《三國志·吳書·吳主傳》；《資治通鑑》孫權遷治相關條',
  },
  {
    name: '許',
    coord_confidence: 'approx',
    coord_note:
      '建安元年曹操迎獻帝所都（許縣，後世多稱許昌）；像素為豫州許昌一帶示意，非《武帝紀》里程換算。',
    source: '《三國志·魏書·武帝紀》建安元年都許',
  },
]

/** 編譯期覆蓋檢查：sidecar 與 live 地名集合一致 */
const _liveNames = new Set(THREE_KINGDOMS_PLACES.map((p) => p.name))
const _sidecarNames = new Set(CHINA_PLACES_PROVENANCE.map((p) => p.name))
if (
  _liveNames.size !== _sidecarNames.size ||
  [..._liveNames].some((n) => !_sidecarNames.has(n))
) {
  throw new Error('chinaPlacesProvenance: sidecar 與 THREE_KINGDOMS_PLACES 地名不一致')
}

export function provenanceForPlace(name: string): ChinaPlaceProvenanceRow | undefined {
  return CHINA_PLACES_PROVENANCE.find((p) => p.name === name)
}
