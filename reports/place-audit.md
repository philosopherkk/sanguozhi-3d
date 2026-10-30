# 具名地名稽核（place-audit）

> 只讀稽核（Pack 4）。資料來源：`src/data/chinaPlaces.ts`、`src/data/chinaPlacesProvenance.ts`。  
> **未修改** `chinaPlaces.ts` / `marchRoutes.ts` 內任何座標數值。

## 摘要

| 項目 | 數值 |
|------|------|
| `THREE_KINGDOMS_PLACES` 筆數 | 4 |
| sidecar 覆蓋筆數 | 4（100%） |
| sidecar 缺 `source` 筆數 | **0** |
| `marchRoutes` 唯一孤兒座標 | **102**（詳見 [`route-coord-orphans.md`](./route-coord-orphans.md)） |

## 依 `coord_confidence` 合計

| coord_confidence | 筆數 | 地名 |
|------------------|------|------|
| attested | 0 | — |
| approx | 4 | 洛陽、成都、建業、許 |
| unknown | 0 | — |

### 解讀

正史典籍可考證**地名與政軍意義**，但本專案座標為**現代東亞地勢底圖像素**（見 `chinaPlaces.ts` 檔首註），並無典籍可直接對應之 x/y。故四城皆標 `approx`，並在 sidecar `coord_note` 說明對齊方式。

## 重複／別名嫌疑

現登錄無同座標不同名或同名不同座標之**硬重複**。下列為擴充地名登錄時易混淆之**別名／通稱**，供後續合併政策參考（本輪未改資料）：

| 登錄名 | 嫌疑別名／通稱 | 備註 |
|--------|----------------|------|
| 許 | 許縣、許昌 | 《武帝紀》「都許」；後世方志多作許昌 |
| 建業 | 秣陵、金陵 | 孫吳遷都後江東稱建業；與早期「不從建業起畫」路線註並存 |
| 洛陽 | 雒陽（史籍用字） | 同一都城；Unicode 異體，非第二座標 |
| 成都 | 雒城（蜀漢宮城所在，非同一點） | 若將來分開登錄需另給像素；現僅一城錨點 |

## sidecar 一覽

| name | x | y | coord_confidence | source（節錄） |
|------|---|---|------------------|----------------|
| 洛陽 | 1261.2 | 887.6 | approx | 《後漢書·郡國志》；《三國志·魏書·武帝紀》 |
| 成都 | 986.4 | 1058.2 | approx | 《三國志·蜀書·先主傳》；《後漢書·郡國志》益州 |
| 建業 | 1483.1 | 964.5 | approx | 《三國志·吳書·吳主傳》；《資治通鑑》 |
| 許 | 1309.4 | 906.5 | approx | 《三國志·魏書·武帝紀》建安元年都許 |

## 缺口（本輪僅報告）

1. **地名登錄 vs 路線**：31 條行軍路線共 173 個路線點，僅 19 次命中四城具名座標；102 個唯一像素未登錄（孤兒）。  
2. **attested 像素**：無；若將來引入考據經緯或文獻里程換算，需新 sidecar 欄位或方法論，仍不得在未稽核前改動 live 座標。  
3. **FRONTIER_ZONES**：塞外示意環座標未納入本 sidecar（範圍僅 `THREE_KINGDOMS_PLACES`）。

## 相關檔案

- Sidecar：`src/data/chinaPlacesProvenance.ts`
- 路線孤兒：`reports/route-coord-orphans.md`
