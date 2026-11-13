#!/usr/bin/env node
/**
 * gen_imjin_territory.mjs — 文祿・慶長之役（壬辰戰爭，1592–1598）的戰區控制範圍
 *
 * 做法同 gen_asia_war_territory.mjs 一脈相承：每道（朝鮮八道）＋九州集結地
 * 用經緯度矩形（通說控制範圍，不是行政區界），再同 Natural Earth 1:50m 陸地
 * 求交集（polygon-clipping），色塊只出現在陸地上，海岸線跟真實地形。
 *
 * 輸出：src/geo/imjinTerritory.ts → IMJIN_EXTENTS: {id,name,d,note}[]
 * 用法：node scripts/gen_imjin_territory.mjs scripts/.cache/countries-50m.json
 */
import fs from 'node:fs'
import path from 'node:path'
import polygonClipping from 'polygon-clipping'
import {
  loadLandMultiPolygon, rectRing, pxRaw, toPath, bboxOf, inside, px,
} from './geo_lib.mjs'

const SRC = process.argv[2] || 'scripts/.cache/countries-50m.json'
const OUT = path.resolve(import.meta.dirname, '../src/geo/imjinTerritory.ts')
const NOISE_PX = Number(process.env.NOISE_PX || 1.0)

// 為什麼這裡不做自我相交修復（gen_asia_war_territory 有，這裡刻意沒有）：
// 朝鮮各道框在 1710×1000 戰區畫布上只有 13–34px 寬，海岸線與矩形邊貼合處經
// pxRaw 的 toFixed(1) 取整後會產生亞像素級微交叉；polygon-clipping 輸出環在
// 矩形角上亦有共用頂點的「 pinch 」觸碰。兩者對 even-odd 填色與地標命中都無
// 影響，但會被逐邊跨立測試誤判為 figure-8，接着 uncrossRing 的剪環就把平壤、
// 釜山等地標剪走（本輪實測：原始環含平壤，剪環後不含）。大框（東南亞、滿洲）
// 才有真 figure-8，小框只有取整噪聲——所以此檔改用「地標命中」做真閘門。

/**
 * 範圍定義：rects = [西, 東, 南, 北]（經緯度）。朝鮮八道取州界級示意框，
 * 道界本身依《東國輿地勝覽》系州鎮方位的通說位置，非實測界線；
 * 各年誰控制哪道見 pack 的 territoryByYear 與事件四段，本檔只給幾何。
 */
const EXTENTS = [
  ['im_kyushu', '九州（出兵集結地）', [[129.8, 131.95, 30.95, 34.0]],
    '文祿・慶長兩役的兵站與出航地；名護屋城（肥前，130.3E/33.4N）為秀吉臨時大本營。不含對馬（宗氏領，129.3E），其役割見路線與事件註'],
  ['im_pyongan', '平安道（平壤）', [[124.3, 126.9, 38.7, 40.7]],
    '鴨綠江渡口義州（124.4E/39.8N）與山城平壤所在；1592年7月小西行長陷平壤，1593年2月李如松復平壤。鴨綠江為通說界線，矩形西緣含少量江北岸陸地，屬示意框誤差'],
  ['im_hwanghae', '黃海道', [[124.85, 126.5, 37.65, 38.7]],
    '江華灣以南、朝鮮西海岸；1592年倭軍經此犯京畿，1593年初明・朝鮮聯軍收復'],
  ['im_gyeonggi', '京畿道（王京）', [[126.5, 127.9, 36.95, 38.25]],
    '王京漢城（126.98E/37.57N）所在；開城在其北緣，碧蹄館之戰（1593年正月）於王京與開城之間'],
  ['im_gangwon', '江原道', [[127.9, 129.2, 37.0, 39.0]],
    '太白山脈以東與朝鮮半島蜂腰東側；1592–93年之戰線西段跨此道南端，屬游擊與拉鋸區，塗色從所屬年度快照'],
  ['im_chungcheong', '忠清道', [[126.0, 128.1, 36.05, 37.0]],
    '1592年7月清州花山陣之戰、1597年7月清州之戰皆在此道；1597年倭軍再度入侵後之南部前沿'],
  ['im_jeolla', '全羅道', [[126.05, 127.85, 34.3, 36.05]],
    '1592年全年倭軍未能深入：全羅監營與郭再祐義兵遲滯第三路，此道為朝鮮稅糧與義兵基地（《亂中雜錄》所記朝鮮後方）'],
  ['im_gyeongsang', '慶尚道', [[127.85, 129.75, 34.85, 37.0]],
    '釜山鎮（129.04E/35.07N）上陸地、洛東江防線（倭軍1592年4月未克），1595–98年倭軍築城屯駐的南部沿海諸砦多在釜山—善山（128.08E/34.93N）一線'],
  ['im_hamgyong', '咸鏡道', [[127.45, 130.0, 39.0, 42.95]],
    '半島東北；1592年加藤清正部曾北擾六鎮，但朝鮮咸鏡監營在任，兩役間此道未在倭軍手，故年度快照多屬朝鮮'],
]

const land = loadLandMultiPolygon(SRC)
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
  const paths = []
  const rings = []
  for (const poly of clipped || []) {
    for (const ring of poly) {
      if (ring.length < 4) continue
      const projected = ring.map(([lo, la]) => pxRaw(lo, la))
      // 不做 DP 簡化：本檔框幅只有 13–52px，RealN Earth 1:50m 海岸本身已粗；
      // 實測 0.9px 容差會把咸鏡東路貼岸窄帶剪走（raw 環含地標、簡化後不含），
      // 與上面自我相交修復同一類錯誤。九個範圍原始點數合共千點級，檔案成本可接受。
      const use = projected
      if (use.length < 4) continue
      const [x0, x1, y0, y1] = bboxOf(use)
      if (x1 - x0 < NOISE_PX && y1 - y0 < NOISE_PX) continue
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
 * 文祿・慶長之役（壬辰戰爭，1592–1598）戰區控制範圍（自動生成，不要手改）
 *
 * 生成：node scripts/gen_imjin_territory.mjs scripts/.cache/countries-50m.json
 * 方法：通說控制範圍以經緯度矩形定義，再同 Natural Earth 1:50m 陸地求交集，
 *       所以色塊只會出現於陸地上，海岸線跟真實地形。
 * 注意：這些係控制範圍示意，不是行政區界，亦不表示實效支配無爭議；
 *       誰控制哪道屬年度快照，口徑與爭點見 imjinWar.ts 的 territoryByYear
 *       shadeNotes 同各事件的起因／經過／結果。
 */

export interface ImjinExtent {
  id: string
  name: string
  d: string
  note: string
}

export const IMJIN_EXTENTS: ImjinExtent[] = ${JSON.stringify(out, null, 2).replace(/"([^"]+)":/g, "$1:")}
`
fs.writeFileSync(OUT, body)
console.log(`已生成 ${path.relative(process.cwd(), OUT)}：${out.length} 個範圍`)

// ---- 範圍地標驗證（閘門有牙）：陸地上要命中、界外點不能命中 ----
const inExtent = (id, lon, lat) => {
  const rings = ringsById.get(id)
  if (!rings) return null
  const p = px(lon, lat)
  return rings.some((r) => inside(r, p))
}
const CHECKS = [
  ['im_pyongan', '平壤', 125.75, 39.03, true],
  ['im_pyongan', '義州以南（渡口一帶）', 124.6, 39.85, true],
  ['im_hwanghae', '黃州', 125.7, 38.04, true],
  ['im_gyeonggi', '王京漢城', 126.98, 37.57, true],
  ['im_gangwon', '平昌', 128.4, 37.37, true],
  ['im_chungcheong', '公州', 127.1, 36.48, true],
  ['im_jeolla', '全州監營', 127.15, 35.82, true],
  ['im_gyeongsang', '慶州', 129.21, 35.84, true],
  ['im_gyeongsang', '安東（善山以北內陸點）', 128.73, 36.57, true],
  ['im_hamgyong', '高原內陸（咸鏡東路，39°N 以東太白山脈貼岸，1:50m 無陸）', 128.9, 40.4, true],
  ['im_kyushu', '名護屋城（肥前）', 130.3, 33.4, true],
  ['im_kyushu', '釜山（屬朝鮮慶尚道，不在九州框）', 129.04, 35.07, false],
  ['im_kyushu', '對馬（宗氏領，不在框）', 129.3, 34.35, false],
  ['im_hamgyong', '王京（不屬咸鏡道）', 126.98, 37.57, false],
  ['im_pyongan', '全羅道全州（不屬平安道）', 127.15, 35.82, false],
  ['im_gangwon', '平壤（不屬江原道）', 125.75, 39.03, false],
  ['im_hwanghae', '王京漢城（屬京畿道）', 126.98, 37.57, false],
  ['im_chungcheong', '王京漢城（屬京畿道）', 126.98, 37.57, false],
]
let bad = 0
for (const [id, label, lo, la, want] of CHECKS) {
  const hit = inExtent(id, lo, la)
  const ok = hit === want
  if (!ok) bad++
  console.log(`  ${ok ? 'OK ' : 'BAD'} ${id} · ${label} -> ${hit === null ? '無此範圍' : hit ? '於範圍內' : '不於範圍內'}（期望${want ? '於' : '不於'}）`)
}
if (bad > 0) process.exit(1)
console.log('朝鮮之役範圍地標驗證全部通過')
