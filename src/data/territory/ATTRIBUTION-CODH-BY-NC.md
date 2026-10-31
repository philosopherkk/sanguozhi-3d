# CODH 旧国・旧郡境界データセット — 授權與致謝

本專案（philosopherkk/sanguozhi-3d）在 **KK 明確同意** 下，於教育用途 GitHub Pages（無廣告）中引用下列資料。

## 資料來源

| 項目 | 內容 |
|------|------|
| 資料集 | CODH『旧国・旧郡境界データセット』 |
| 入口 | https://geoshape.ex.nii.ac.jp/kg/ |
| DOI | [10.20676/00000454](https://doi.org/10.20676/00000454) |
| 底圖／方法 | NIHU「幕末明治地勢地図境界データ」 |
| 授權 | **Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)** |

## 倉庫內路徑

| 路徑 | 用途 |
|------|------|
| `src/data/territory/japan_kokugun/vendor/K01.geojson` … `K85.geojson` | 原始 GeoJSON（舊国 K01–K73、琉球 K74、北海道 K75–K85） |
| `src/data/territory/japan_kokugun/index.geojson` | 本州・四国・九州旧国索引（屬性含 `source_plate`） |
| `src/sengoku/data/codhKokugunMeshes.ts` | 投影至日本地勢 1482×1477 的著色 mesh（`scripts/build_japan_kokugun_rings.py` 生成） |
| `src/geo/japanEraRings.ts` | 松前（K78 南部切分）、北海道（K75–K85）、琉球（K74）外周環 |

## 致謝文案（建議 UI／README 引用）

> 日本旧国境界 GeoJSON：CODH『旧国・旧郡境界データセット』（doi:10.20676/00000454, CC BY-NC 4.0），基於 NIHU 幕末明治地勢地図境界データ。

## 非 CODH 部分（誠實標示）

- **d0–d27 勢力對照**仍沿用 seed-Voronoi 分域邏輯，只作著色鍵；**不是**藩界或 CODH 村→藩 dissolve（CB-02b 後續）。
- **大名／朝廷歸屬**敘事仍為通說示意，非維基或 CODH 邊界本身。
- **阿イヌ政治界**不臆造；1604 松前為渡島南部交易領示意，非全島征服。
- **1609–1879 琉球**為王國／附庸／縣之時間窗示意，非薩摩普通一郡。

## CB-02b（幕末藩 dissolve · CC BY-SA）

幕末村→藩 dissolve 見 `ATTRIBUTION-CODH-HAN-BY-SA.md` 與 `japan_bakumatsu_1867/`（**非**本 BY-NC 檔所涵蓋之改作幾何）。
