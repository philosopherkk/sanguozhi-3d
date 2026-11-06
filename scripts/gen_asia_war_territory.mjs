#!/usr/bin/env node
/**
 * gen_asia_war_territory.mjs — 明治至當代／戰爭時代嘅勢力範圍多邊形
 *
 * 做法：每塊範圍用經緯度矩形（通說控制範圍，唔係行政邊界），
 * 再同 Natural Earth 1:50m 陸地求交集（polygon-clipping），
 * 所以色塊只会出現喺陸地上，海岸線跟真實地形，唔係手繪。
 *
 * 輸出：src/geo/asiaWarTerritory.ts → ASIA_EXTENTS: {id,name,d,note}[]
 * 用法：node scripts/gen_asia_war_territory.mjs scripts/.cache/countries-50m.json
 */
import fs from 'node:fs'
import path from 'node:path'
import polygonClipping from 'polygon-clipping'
import {
  LON0, LON1, LAT0, LAT1, DEFAULT_TOL,
  loadLandMultiPolygon, rectRing, pxRaw, px, simplifyRing, area, toPath, bboxOf, inside,
} from './geo_lib.mjs'

const SRC = process.argv[2] || 'scripts/.cache/countries-50m.json'
const OUT = path.resolve(import.meta.dirname, '../src/geo/asiaWarTerritory.ts')
const TOL = Number(process.env.TOL || DEFAULT_TOL)

/**
 * 範圍定義：rects = [西, 東, 南, 北]（經緯度）。
 * 呢啲係通說控制範圍嘅示意框，唔係行政區界，亦唔表示実効支配無爭議；
 * 實際控制線同爭議喺對應事件嘅起因／經過／結果說明。
 */
const EXTENTS = [
  // ---- 日本版圖與領土變化 ----
  ['okinawa', '沖繩（琉球處分後）', [[126.5, 128.6, 24.0, 27.6]], '1879年琉球處分設沖繩縣'],
  ['chishima', '千島列島', [[148.0, 156.8, 43.5, 51.2]], '1875年千島・樺太交換條約'],
  ['karafuto', '樺太（サハリン）', [[140.5, 144.0, 46.0, 54.4]], '1875年全島屬日本；1905年ポーツ머스条約以北緯50度以南屬日本'],
  ['taiwan', '台灣・澎湖', [[119.8, 122.1, 23.0, 25.4], [118.9, 119.9, 23.2, 23.9]], '1895年馬關條約'],
  ['kanto', '關東州（租借地）', [[120.6, 122.4, 38.7, 39.3]], '1905年繼承俄国喺旅順・大连嘅租借權'],
  ['korea', '朝鮮半島', [[124.0, 130.0, 34.0, 39.2]], '1905年保護權、1910年合併'],
  ['nansho', '南洋群島（委任統治）', [[133.5, 170.0, 4.0, 20.4]], '1920年國聯委任統治：パラオ・ヤップ・マリアナ・カロリン・マーシャル（不含美領グアム）'],
  // ---- 1931–1945 陸上控制範圍（中國側） ----
  ['manshu', '滿洲國', [[118.5, 127.5, 39.6, 53.4]], '1932年建立；範圍係通說示意'],
  ['re_hotung', '熱河・遼東方面', [[116.5, 122.5, 39.5, 43.0]], '1933年熱河作戰之後'],
  ['mengjiang', '蒙疆', [[107.5, 118.5, 37.0, 43.0]], '1937–39年傀儡政權區域'],
  ['huabei', '華北（治安區）', [[113.5, 122.0, 32.5, 40.5]], '佔領主要城市與交通線，乡間control有限'],
  ['huahua', '華中（佔領區）', [[113.0, 122.2, 27.0, 32.6]], '沿長江與沿海佔領'],
  ['hainan', '海南島', [[108.5, 111.3, 18.0, 20.2]], '1939年佔領'],
  // ---- 南方作戦（1941–42） ----
  ['french_ic', '法屬印度支那', [[102.0, 109.6, 8.5, 23.4]], '1940年進駐、1941年全面控制'],
  ['myanmar', '緬甸', [[92.0, 101.2, 9.0, 28.4]], '1942年佔領'],
  ['malaya', '馬來亞', [[99.6, 104.6, 1.2, 7.0]], '1942年1–2月佔領'],
  ['sumatra', '蘇門答臘', [[95.0, 106.6, -6.0, 5.8]], '1942年3月佔領'],
  ['java', '爪哇', [[105.0, 115.4, -9.0, -5.8]], '1942年3月佔領'],
  ['borneo', '婆羅洲', [[108.6, 119.4, -4.2, 7.2]], '1942年1–5月佔領'],
  ['celebes', '蘇拉威西', [[118.9, 125.4, -6.0, 1.8]], '1942年1–2月佔領'],
  ['philippines', '菲律賓', [[117.0, 126.6, 5.0, 18.6]], '1942年5月完全佔領'],
  ['rabaul', '新不列顛・拉包爾', [[146.0, 155.0, -8.0, -1.5]], '1942年1月佔領，南方海軍根拠地'],
  ['newguinea_n', '新幾內亞北部', [[131.0, 148.0, -10.5, -2.0]], '1942–43部分登陸，東部戦線'],
  ['solomons_n', '所羅門北部', [[154.5, 162.0, -8.5, -0.5]], '1942年佔領ラバウル外環'],
  ['attu_kiska', '阿圖・基斯卡', [[170.0, 179.9, 51.5, 53.2]], '1942年6月佔領，1943年8–9月失守'],
  ['imphal', '英帕爾・科希馬方向', [[92.0, 95.5, 24.0, 27.0]], '1944年攻勢，失敗'],
  // ---- 1945 以後 ----
  ['su_karafuto', '樺太・千島（蘇聯／俄羅斯）', [[140.5, 157.0, 43.5, 54.4]], '1945年8月以後蘇聯佔領；北方領土問題'],
  ['us_okinawa', '沖繩（米軍統治）', [[126.5, 128.6, 24.0, 27.6]], '1945–72年米軍統治，1972年施政權歸還'],
]

// 南洋群島要剔除嘅陸地（菲律賓群島、グアム）
const EXCLUDE = [
  [116.0, 127.0, 4.0, 19.5],
  [144.0, 145.2, 13.0, 13.8],
]

const land = loadLandMultiPolygon(SRC)
const exclPoly = EXCLUDE.map((r) => [rectRing(r[0], r[2], r[1], r[3])])
const out = []
const ringsById = new Map()

for (const [id, name, rects, note] of EXTENTS) {
  const subject = rects.map((r) => [rectRing(r[0], r[2], r[1], r[3])])
  let clipped
  try {
    clipped = polygonClipping.intersection(land, subject)
  } catch (e) {
    console.log('  剪裁失敗', id, e.message)
    continue
  }
  if (id === 'nansho' && clipped && clipped.length) {
    try {
      clipped = polygonClipping.difference(clipped, exclPoly)
    } catch (e) {
      console.log('  剔除失敗', id, e.message)
    }
  }
  const paths = []
  const rings = []
  for (const poly of clipped || []) {
    for (const ring of poly) {
      if (ring.length < 4) continue
      const projected = ring.map(([lo, la]) => pxRaw(lo, la))
      const simple = simplifyRing(projected, TOL)
      const a0 = area(projected), a1 = area(simple)
      const use = simple.length >= 3 && (a0 === 0 || Math.abs(a1 - a0) / Math.max(a0, 1) < 0.03)
        ? simple
        : projected
      const [x0, x1, y0, y1] = bboxOf(use)
      if (x1 - x0 < 0.45 && y1 - y0 < 0.45) continue // 環礁（トラック等）都要保留，只篩真噪點
      paths.push(toPath(use))
      rings.push(use)
    }
  }
  if (!paths.length) {
    console.log('  空範圍', id, name)
    continue
  }
  ringsById.set(id, rings)
  out.push({ id, name, d: paths.join(''), note, pieces: rings.length })
}

const body = `/**
 * 明治至當代／戰爭時代嘅勢力範圍（自動生成，唔好手改）
 *
 * 生成：node scripts/gen_asia_war_territory.mjs scripts/.cache/countries-50m.json
 * 方法：通說控制範圍以經緯度矩形定義，再同 Natural Earth 1:50m 陸地求交集，
 *       所以色塊只会出現喺陸地上，海岸線跟真實地形。
 * 注意：呢啲係控制範圍示意，唔係行政區界，亦唔表示実効支配無爭議；
 *       實際控制線同爭議喺對應事件嘅起因／經過／結果說明。
 * 坐標：同 asiaWarBase.ts 同一套畫布（${LON0}–${LON1}° / ${LAT0}–${LAT1}°）。
 */

export interface AsiaExtent {
  id: string
  name: string
  note: string
  d: string
}

export const ASIA_EXTENTS: AsiaExtent[] = [
${out.map((e) => `  {
    id: '${e.id}',
    name: '${e.name}',
    note: '${e.note.replace(/'/g, '’')}',
    d: '${e.d}',
  },`).join('\n')}
]
`
fs.writeFileSync(OUT, body, 'utf8')
console.log(`範圍寫入 ${out.length} 個  bytes=${(Buffer.byteLength(body) / 1024).toFixed(0)}KB  -> ${path.relative(process.cwd(), OUT)}`)

// ---------- 驗證：關鍵地標應該（唔）應該喺範圍內 ----------
const inExtent = (id, lon, lat) => {
  const rings = ringsById.get(id) || []
  const p = px(lon, lat)
  return rings.some((r) => inside(r, p))
}
/**
 * 環礁喺 1:50m 得返一粒塵（トラック等），填色睇唔到係資料精度問題，
 * 所以呢個驗證容許 0.6° 以內有陸地；實際地圖會用地名標記（places）表示。
 */
const inExtentNear = (id, lon, lat, tolDeg = 0.6) => {
  const rings = ringsById.get(id) || []
  const p = px(lon, lat)
  const tolPx = tolDeg * (1710 / (LON1 - LON0))
  return rings.some((r) => inside(r, p) || r.some(([x, y]) => Math.hypot(x - p[0], y - p[1]) <= tolPx))
}
const CHECKS = [
  ['manshu', '奉天', 123.4, 41.8, true], ['manshu', '哈爾浜', 126.6, 45.75, true],
  ['manshu', '北京', 116.4, 39.9, false],
  ['huabei', '北京', 116.4, 39.9, true], ['huabei', '漢口', 114.3, 30.6, false],
  ['huahua', '漢口', 114.3, 30.6, true], ['huahua', '重慶', 106.5, 29.5, false],
  ['taiwan', '台北', 121.5, 25.04, true], ['taiwan', '福州', 119.3, 26.07, false],
  ['korea', '漢城', 127.0, 37.56, true], ['kanto', '旅順', 121.26, 38.8, true],
  ['malaya', '新加坡', 103.82, 1.35, true], ['java', '巴達維亜', 106.85, -6.2, true],
  ['philippines', '馬尼拉', 120.98, 14.6, true],
  ['nansho', 'パラオ', 134.55, 7.45, true],
  ['nansho', '馬尼拉（唔屬南洋群島）', 120.98, 14.6, false],
  ['nansho', 'グアム（美領）', 144.79, 13.44, false],
  ['attu_kiska', 'アツ島', 172.9, 52.83, true],
  ['su_karafuto', '豊原（南樺太）', 142.9, 47.0, true],
  ['okinawa', '那覇', 127.68, 26.21, true], ['karafuto', '稚內（北海道）', 141.6, 45.4, false],
]
let bad = 0
for (const [id, label, lo, la, want] of CHECKS) {
  const hit = inExtent(id, lo, la)
  const ok = hit === want
  if (!ok) bad++
  console.log(`  ${ok ? 'OK ' : 'BAD'} ${id} · ${label} -> ${hit ? '喺範圍內' : '唔喺範圍內'}（期望${want ? '喺' : '唔喺'}）`)
}
const trukOk = inExtentNear('nansho', 151.8, 7.4)
if (!trukOk) bad++
console.log(`  ${trukOk ? 'OK ' : 'BAD'} nansho · トラック（環礁：0.6° 內要有陸地）`)
console.log(bad === 0 ? '範圍地標驗證全部通過' : `範圍地標驗證 ${bad} 個唔啱`)
