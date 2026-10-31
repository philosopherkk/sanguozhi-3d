# CODH 幕末期近世村領域 → 藩 dissolve — 授權與致謝

本專案在 **KK 明確同意**（2026-10-31）下，於 GitHub Pages 教育用途站點引用下列 **CC BY-SA 4.0** 資料，並依 ShareAlike 義務保留授權標示。

## 資料來源

| 項目 | 內容 |
|------|------|
| 資料集 | CODH／Geoshape『**幕末期近世村領域データセット**』 |
| 入口 | https://geoshape.ex.nii.ac.jp/av/ |
| 加工原典 | 本田謙一『幕末期近世村領域データ』（02_kyudaka_v2.01） |
| 方法論 | doi:[10.5638/thagis.34.1.1](https://doi.org/10.5638/thagis.34.1.1) |
| 空間接合 | 2015年農林業センサス「農業集落境界データ」（農林水産省）— 利用規約見 MAFF サイト |
| 石高參照 | 旧高旧領取調帳データベース（国立歴史民俗博物館） |
| 授權 | **Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)** |

## 藩 ID 對照（非幾何）

| 項目 | 內容 |
|------|------|
| 資料集 | CODH『**藩IDデータセット**』 |
| 入口 | https://codh.rois.ac.jp/han/ |
| 授權 | **CC BY 4.0** |
| 倉庫路徑 | `japan_bakumatsu_1867/vendor/han_catalog.csv` |

## 致謝文案（Geoshape 模板）

> 『幕末期近世村領域データセット』（CODH作成）  
> 「幕末期近世村領域データ」（本田謙一氏）を加工

## 倉庫內路徑

| 路徑 | 用途 |
|------|------|
| `japan_bakumatsu_1867/vendor/villages/Hxxx.geojson` | 村多邊形（依 `ryobun` 對應藩；**非**旧国切分） |
| `japan_bakumatsu_1867/vendor/staged_han.json` | v1 階段性收錄之藩與 `ryobun` 鍵 |
| `japan_bakumatsu_1867/collection.geojson` | 藩 dissolve 索引（`approx: true`） |
| `src/bakumatsu/data/bakumatsuHanMeshes.ts` | 投影 mesh（`scripts/build_bakumatsu_han_rings.py` 生成） |

## ShareAlike 與 repo 授權

- 自 **村領域** 改作之 **藩 dissolve GeoJSON／mesh** 沿用 **CC BY-SA 4.0**；不得以 MIT 等條款再授權改作幾何。
- 應用程式原始碼授權與資料授權分離；見本檔與 UI `provenance` 標示。

## 與旧国 mesh（BY-NC）之區別

| 圖層 | 資料 | 授權 | 用途 |
|------|------|------|------|
| 旧国 mesh | CODH 旧国・旧郡 | **CC BY-NC 4.0** | 戰國／平安著色 substrate；**≠ 藩界** |
| 藩 dissolve | 村→藩 unary_union | **CC BY-SA 4.0** | 幕末著色邊界（示意） |

## 非臆造部分（誠實標示）

- **`approx: true` 永久**：現代農業集落邊界接合，非慶応地籍級藩界。
- **旧国 ≠ 藩**：未以 K01–K73 假裝幕末藩界。
- **琉球（K74）**：不將薩摩藩 mesh 當沖繩縣界；附庸虛線仍用 `JP_ERA_RINGS`。
- **松前／北海道**：1604 渡島南部交易領與 ≥1869 開拓使仍用 CB-02a fringe；**不**臆造阿イヌ內陸政治界（Emishi ≠ Ainu）。
- **v1 階段性**：僅收錄 `staged_han.json` 所列 major 藩；其餘待擴充或代表點 fallback。

## KK 同意紀錄

- 2026-10-31：KK exact yes — vendor CC BY-SA 4.0 幕末村領域於 gh-pages；CB-02b draft PR（不 merge／不 deploy）。
