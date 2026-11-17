// 人物想像圖縮影產生器。
//
// 原圖一律 1024px（平均約 390KB、全庫約 132MB），而界面上最大只有 96px：
// 手機若直接拉原圖，碌一頁人物清單就要下載數 MB，解碼 1024×1024 亦耗記憶體。
// 本腳本在 public/portraits/_thumb/ 下按原路徑 1:1 產生 80／192px 兩級縮影
// （對應小圓 40px 與大圖 96px 的 2 倍解析度，jpeg 品質 80），
// 由 PersonPortrait.tsx 由 src 對映路徑，並以 srcset/sizes 讓瀏覽器挑選。
//
// 縮影屬於一次性產生、隨原始檔一併提交的靜態產物（原圖同樣提交於 public/），
// CI 不需要重跑本腳本。用法：
//   npm i --no-save sharp && node scripts/gen_portrait_thumbs.mjs
import { readdir, mkdir, stat } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = 'public/portraits'
const OUT = path.join(ROOT, '_thumb')
const WIDTHS = [80, 192]
const QUALITY = 80

async function* walk(dir) {
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) yield* walk(p)
    else if (ent.name.endsWith('.jpg')) yield p
  }
}

let count = 0
let bytes = 0
for await (const file of walk(ROOT)) {
  const rel = path.relative(ROOT, file)
  if (rel.startsWith('_thumb')) continue
  const outDir = path.join(OUT, path.dirname(rel))
  await mkdir(outDir, { recursive: true })
  const base = path.basename(rel, '.jpg')
  for (const w of WIDTHS) {
    const out = path.join(outDir, `${base}-${w}.jpg`)
    // 原圖皆為正方形，等比縮即可；圓形裁剪仍由 CSS 的 object-fit 處理。
    const info = await sharp(file).resize(w).jpeg({ quality: QUALITY }).toFile(out)
    bytes += info.size
    count += 1
  }
}

console.log(`縮影：${count} 檔，共 ${(bytes / 1024 / 1024).toFixed(1)}MB → ${OUT}`)
