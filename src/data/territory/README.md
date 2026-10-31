# 疆域 GeoJSON（譚／學術地圖矢量化層）

本目錄存放**從地圖圖幅 digitize** 的 GeoJSON，供各時代載入器取代現有示意環。  
現行 live rings 仍在 `src/data/provinces.ts`、`basemapProvinceRings.json`、`sengoku/data/tracedDomains.ts`、`geo/eraRegions.ts` 等；**本 PR（CB-04）不換座標**。

## Feature 屬性（見 `types.ts`）

| 欄位 | 必填 | 說明 |
|------|------|------|
| `source_plate` | 是 | 譚冊圖幅名、日本地圖頁碼，或誠實標示「非追蹤」 |
| `approx` | 是 | `true` 表示非精確圖幅邊；plate-traced 仍可在有爭議邊段標 `true` |
| `disputed` | 否 | 邊界或歸屬有史學爭議 |
| `note` | 否 | 補充（zh-Hant） |
| `atlas` | 否 | 地圖集全名 |
| `year` | 否 | 圖幅對應公元年（BC 用負數） |
| `crs` | 否 | 座標系說明 |

## 計劃檔名（尚未提交多邊形）

| 檔案 | 用途 | 地圖來源（目標） |
|------|------|------------------|
| `tk_262_zhou.geojson` | 三國州界（262 年基準） | 譚其驤《中國歷史地圖集》第三冊 · 三國時期全圖及州分幅（CB-01） |
| `japan_sengoku_1572.geojson` | 戰國大名領 | 児玉《標準日本史地圖》或 西岡・服部《日本歴史地図》具名圖幅（CB-02） |
| `japan_heian_genpei.geojson` | 源平活動帶 | 同上 · 古代／中世圖幅 |
| `japan_bakumatsu_1867.geojson` | 幕末藩配置 | 同上 · 近世圖幅 |
| `realm_qin_221.geojson` … | 各朝 realm | 譚第一～八冊對應圖幅（CB-05） |

## 規則

- **禁止**在無圖幅依據下 invent 內陸邊界。
- 中國正史敘事仍見各 `territoryControl.ts`；幾何與敘事分離。
- UI 一律繁體中文（zh-Hant）。
- 示意層的 `approx`／`source` 見 `provenance.ts`（CB-12）。

## 空集合

`index.geojson` 為 schema 占位（零 features），型別見 `types.ts`。

## 日本分時代 stub（CB-20）

各子目錄含 `collection.geojson`（零 features）與 README（plate 名稱；**不** invent 內陸界）：

| 目錄 | 用途 |
|------|------|
| `japan_ezo_matsumae/` | 1604–1868 松前交易領 |
| `japan_hokkaido_1869/` | ≥1869 開拓使（CODH K75–K85 **HOLD**） |
| `japan_ryukyu_k74/` | 琉球／沖繩（CODH K74 **HOLD**） |
| `japan_sengoku_1572/` | 戰國大名（CB-03） |
| `japan_heian_genpei/` | 平安源平（CB-06） |
| `japan_bakumatsu_1867/` | 幕末藩 dissolve（CB-02b，**CC BY-SA** · 見 `ATTRIBUTION-CODH-HAN-BY-SA.md`） |

Live 幾何仍在 `geo/japanEraRings.ts` 與 Voronoi；stub 待 digitize／授權後載入。
