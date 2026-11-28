# 地圖疆域幾何規劃（韓國・泰國・越南・馬來西亞）

> 執行模型：`strata/unsloth-ud-iq4_xs-v31`（每輪最多 4 項、單軌執行）。所有幾何改動須遵守**來源紀律**：僅可採用可追溯之公開向量來源（Natural Earth `ne_10m_admin_0_countries`／`ne_10m_admin_1_states_provinces` 或 `world-atlas@2` 圖層＋要素鍵）或具名歷史地圖集；未完成追蹤之手繪多邊形必須保留 `approx: true` 與示意標記，供閘門誠實計數。

## 現況數字

### 1. 四國 × 時代現況（共 16 槽、16 個領域環，目前 100% 屬未剪裁示意多邊形）

| 國家 | 共用環陣列（`src/geo/asiaCountryDomains.ts`） | 環數（頂點數） | 時代槽（`src/countries/*/*Pack.ts`） | 快照年數（條目） | 幾何性質 |
|---|---|---|---|---|---|
| 韓國 | `KOREA_DOMAINS`（`ko_liaodong`/`ko_north`/`ko_central`/`ko_southwest`/`ko_southeast`） | 5（6,5,4,4,4） | `koancient`(-108..668), `kogoryeo`(668..1392), `kojoseon`(1392..1897), `komodern`(1897..2026) | 各 4（各 20；`koancient:-108` 含壞鍵 `[F.cmd]`） | 100% 手繪示意（未貼岸、未剪裁） |
| 泰國 | `THAILAND_DOMAINS`（`th_north`/`th_central`/`th_isan`/`th_south`） | 4（4,4,4,4） | `thsukhothai`(1238..1351), `thayutthaya`(1438..1767), `thchakri`(1782..1909), `thmodern`(1932..1997) | 4/4/5/5（16/16/20/20） | 100% 手繪四邊形示意 |
| 越南 | `VIETNAM_DOMAINS`（`vn_north`/`vn_central`/`vn_south`） | 3（4,5,4） | `vnnorth`(-111..1009), `vndynasty`(1010..1802), `vnnguyen`(1802..1945), `vnmodern`(1945..1990) | 4/6/4/5（12/18/12/15） | 100% 手繪四至五邊形示意 |
| 馬來西亞 | `MALAYSIA_DOMAINS`（`my_peninsula`/`my_singapore`/`my_sarawak`/`my_sabah`） | 4（5,4,4,5） | `mymalacca`(1400..1511), `mycolonial`(1511..1941), `mymerdeka`(1941..1965), `mymodern`(1965..2026) | 5/9/6/4（20/36/24/16） | 100% 手繪四至五邊形示意 |

- **底圖與投影**：`src/geo/asiaWarBase.ts` 之 `asiaPx(lon: number, lat: number): [number, number]`（等圓柱投影，經 `60–190°` 正規化至 `[60, 420)`、緯 `-14–62°`、畫布 `1710×1000`，陸地 `ASIA_LAND` 取自 Natural Earth 1:50m）。四國在 `COUNTRY_BASEMAPS`（`src/geo/asiaCountryDomains.ts`）各以 `view` 裁切：`korea` `{x:782.7,y:236.8,w:197.3,h:157.9}`、`thailand` `{x:420,y:520,w:255,h:235}`、`vietnam` `{x:490,y:488,w:245,h:235}`、`malaysia` `{x:486.7,y:664.5,w:315.7,h:184.2}`。
- **出處字串（現有誠實度缺陷）**：`src/geo/asiaCountryDomains.ts` 匯出 `ASIA_COUNTRY_GEOMETRY_PROVENANCE`（`approx: true`，聲明手繪經緯頂點投影至 1:50m 底圖），但**全站零引用**。`src/japanEras/DeepDiveMapStage.tsx:95` 實際傳給 `EraMapView` 的是 `ASIA_WAR_EXTENTS_GEOMETRY`（「再剪裁至 Natural Earth 1:50m 陸地」），且 `src/App.tsx:197` 之 `COUNTRY_TERRITORY_NOTE_ZH` 同樣錯寫「剪裁至真實海岸線」，與未剪裁現況不符。
- **既有閘門實測數字**：
  - `node scripts/audit_map_accuracy.mjs`：`幾何 id 224｜掃描 182 檔｜fail 0｜warn 0`（已納 `asiaCountryDomains.ts` 16 鍵，但四國 103 條 `P(lo,la)` 路線因無 `[x,y]` 字面量全數被計為「點數不足」跳過；`koancientPack.ts:247` 計算鍵 `[F.cmd]` 被 `controlKeys()` 漏掃）。
  - `node scripts/audit_war_shape.mjs`：`受測 750｜示意框 57｜自我相交 0`（`eraRegions: 2`、`asiaWarTerritory: 55`）。`schematic=` 指 `ring.length < 12` 或 `collinearRatio(ring) > 0.25`（最長近似共線段佔周長逾 25%）之環。`asiaCountryDomains.ts` 16 環因執行期才呼叫 `poly()` 產出 `d`，**目前完全未納入 `audit:war-shape` 計數**（若納入則 16/16 全屬 `schematic`）。

## P0 佇列（本機代理今天可做，<=12 條）

☐ src/countries/korea/koancientPack.ts｜將 `-108` 快照誤寫的計算鍵 `[F.cmd]: F.han` 改為 `ko_liaodong: F.han`（原鍵實值 `'漢四郡'` 不在 `KOREA_DOMAINS`，致遼東不上色）｜驗收=node scripts/country_check.mjs src/countries/korea/koancientPack.ts && node scripts/audit_map_accuracy.mjs --json
☐ src/countries/korea/komodernPack.ts｜修正 `1987` 快照 `ko_central: F.dprk` 為 `F.rokkuk`（`ko_central` 含首爾 `37.57N`，1987 不應塗為北韓）｜驗收=node scripts/country_check.mjs src/countries/korea/komodernPack.ts && node scripts/audit_map_accuracy.mjs --json
☐ src/countries/korea/komodernPack.ts｜以 `python3 scripts/wp_coord.py Chosan --lang en` 核對 `places`「楚山」與 `ko-1950-pva` 經緯度（現 `128.2,41.9` 誤落惠山附近）並修正｜驗收=node scripts/country_check.mjs src/countries/korea/komodernPack.ts && node --experimental-strip-types scripts/audit-chars.ts src/countries/korea/komodernPack.ts
☑ src/japanEras/DeepDiveMapStage.tsx｜於無 `mapWindow` 且採 `ASIA_LAND` 矢量底圖（依 `pack.id` 或 `pack.mapBase.credit` 區分四國）時改傳 `ASIA_COUNTRY_GEOMETRY_PROVENANCE`（自 `src/geo/asiaCountryDomains.ts` 匯入），停用錯掛的 `ASIA_WAR_EXTENTS_GEOMETRY`｜驗收=node --experimental-strip-types scripts/audit-wiring.ts && npx oxlint src/japanEras/DeepDiveMapStage.tsx
☑ src/App.tsx｜改寫 `COUNTRY_TERRITORY_NOTE_ZH`，刪除與現況不符之「剪裁至真實海岸線」，改為誠實聲明「以經緯度示意多邊形繪於今測海岸線之上（未逐段剪裁海岸線）」｜驗收=node --experimental-strip-types scripts/audit-chars.ts src/App.tsx && npx oxlint src/App.tsx
☐ src/geo/asiaCountryDomains.ts｜用 `python3 scripts/wp_coord.py` 查「義州」「蔚山」（`--lang ko`/`en`），調整 `ko_liaodong`／`ko_north` 邊界消除義州重疊，並將 `ko_southeast` 東緣包住蔚山｜驗收=node --experimental-strip-types scripts/audit-chars.ts src/geo/asiaCountryDomains.ts && node scripts/audit_map_accuracy.mjs --json
☐ src/geo/asiaCountryDomains.ts｜用 `python3 scripts/wp_coord.py` 查「Johor Bahru」「Kota Bharu」「Kota Kinabalu」（`--lang en`），收緊 `my_singapore` 北界不跨海峽覆蓋新山，並擴展 `my_peninsula` 東北角與 `my_sabah` 西北緣包住哥打巴魯・亞庇｜驗收=node --experimental-strip-types scripts/audit-chars.ts src/geo/asiaCountryDomains.ts && node scripts/audit_map_accuracy.mjs --json
☐ src/geo/asiaCountryDomains.ts｜用 `python3 scripts/wp_coord.py` 查「Chanthaburi」「Rayong」「Nong Khai」（`--lang en`），調整 `th_central` 東南角與 `th_isan` 北緣包住尖竹汶・羅勇・廊開（不跨入寮國）｜驗收=node --experimental-strip-types scripts/audit-chars.ts src/geo/asiaCountryDomains.ts && node scripts/audit_map_accuracy.mjs --json
☐ src/geo/asiaCountryDomains.ts｜用 `python3 scripts/wp_coord.py` 查「Dien Bien Phu」「Cao Bang」「Quy Nhon」「Nha Trang」「Buon Ma Thuot」（`--lang en`），調整 `vn_north`・`vn_central`・`vn_south` 邊界包住五地並消去 `12.5–13.0N` 斷裂帶｜驗收=node --experimental-strip-types scripts/audit-chars.ts src/geo/asiaCountryDomains.ts && node scripts/audit_map_accuracy.mjs --json
☐ src/countries/thailand/thchakriPack.ts｜將 `1893` 快照 `th_isan: F.france` 改為 `F.chakri`（1893 割讓地為湄公河東岸寮國，非呵叻高原），並更新 `shadeNotes[1893]` 口徑｜驗收=node scripts/country_check.mjs src/countries/thailand/thchakriPack.ts && node --experimental-strip-types scripts/audit-chars.ts src/countries/thailand/thchakriPack.ts
☐ src/countries/thailand/thchakriPack.ts｜用 `python3 scripts/wp_coord.py "Alor Setar" "Kota Bharu" --lang en` 核對馬來四邦在 `th_south`（`6.2–12.8N`）南緣之外，將 `1909` 快照 `th_south: F.malay` 改回 `F.chakri` 並更新 `shadeNotes[1909]`｜驗收=node scripts/country_check.mjs src/countries/thailand/thchakriPack.ts && node --experimental-strip-types scripts/audit-chars.ts src/countries/thailand/thchakriPack.ts
☐ src/countries/malaysia/mymalaccaPack.ts｜依同檔 `shadeNotes[1446]`「北婆羅洲不著色」及史實（馬六甲未轄砂拉越），將 `1446`/`1489` 之 `my_sarawak` 改為 `F.minor` 並移除 `my_sabah` 著色（同步改 `shadeNotes[1446]`）｜驗收=node scripts/country_check.mjs src/countries/malaysia/mymalaccaPack.ts && node --experimental-strip-types scripts/audit-chars.ts src/countries/malaysia/mymalaccaPack.ts

## P1 批次

### 批次 A：`src/geo/asiaCountryDomains.ts`（雲端生成腳本落地後執行）
- A1：以 Natural Earth 1:10m admin-1/admin-0 生成器取代 `KOREA_DOMAINS`/`THAILAND_DOMAINS`/`VIETNAM_DOMAINS`/`MALAYSIA_DOMAINS` 手繪多邊形，改存靜態 SVG `d` 字串（投影沿用 `asiaPx`）。
- A2：補齊分治/割讓必需之細分區塊：`ko_central_n`（開城・鐵原，38 線／停戰線以北）與 `ko_central_s`（漢城・漢江），以及 `vn_central_n`（清化—廣平，17 度線以北）與 `vn_central_s`（順化—芽莊）。
- A3：更新 `ASIA_COUNTRY_GEOMETRY_PROVENANCE` 之 `source` 欄位，如實列明 Natural Earth 圖層與要素鍵（仍維持 `approx: true` 直到接入歷史地圖集矢量化）。

### 批次 B：`src/countries/korea/komodernPack.ts` 與 `src/countries/korea/kogoryeoPack.ts`
- B1（`komodernPack.ts`）：將 `1950` 與 `1987` 快照改用 `ko_central_n`／`ko_central_s`，反映 38 線與休戰線南北分界，不把漢城歸北或把開城歸南。
- B2（`kogoryeoPack.ts`）：核對 `918`（後三國）與 `1231`（蒙麗戰前）`ko_liaodong` 歸屬，若無固定控制權（契丹/金/元邊境游動）則不強制替無實控勢力著色。

### 批次 C：`src/countries/vietnam/vnmodernPack.ts` 與 `src/countries/vietnam/vndynastyPack.ts`
- C1（`vnmodernPack.ts`）：將 `1954` 與 `1968` 快照改用 `vn_central_n`（`F.drv`）與 `vn_central_s`（`F.sviet`/`F.rgv`），消除現版 17 度線被 `vn_central` 整體吞入南越之誤差。
- C2（`vndynastyPack.ts`）：核對 `1288`、`1407`、`1428`（1471 滅占城前）`vn_central_s` 應維持 `F.champa`，僅 `vn_central_n` 屬陳・明・後黎。

### 批次 D：`src/countries/malaysia/mycolonialPack.ts` 與 `src/countries/malaysia/mymerdekaPack.ts`
- D1（`mycolonialPack.ts`）：檢視 `1511`/`1641`/`1786`/`1824` 快照，半島葡/荷/英僅控馬六甲或海峽港口，修正 `shadeNotes` 或切分海峽殖民地與馬來諸邦（不以整片半島代表單一港口）。
- D2（`mymerdekaPack.ts`）：依 `1957` 獨立與 `1963` 馬來西亞成立、`1965` 新加坡分離，核對 `my_singapore` 僅覆蓋新加坡島而不包柔佛南岸。

## 工具缺口（要雲端那層我來建）

1. **四國領域環生成器**（`scripts/gen_asia_country_domains.mjs`，比照 `gen_asia_war_territory.mjs`）
   - 輸入：Natural Earth 1:10m admin-0/admin-1 TopoJSON/GeoJSON（`scripts/.cache/ne_10m_admin_1_states_provinces.json`）與每國 `domainId → [NE 要素鍵清單 / 經緯裁切框]` 映射表。
   - 輸出：覆寫 `src/geo/asiaCountryDomains.ts` 各國靜態 `d` 字串與註解內要素來源清單（使用 `asiaPx` 投影，經 `simplifyRing`＋`uncrossRing` 去自交與亞像素碎環）。
   - 通過/失敗標準：每環頂點數 `>= 12`、`selfIntersecting === false`、同國相鄰環重疊面積 `< 1%`、保留歷史示意框仍須在註解與 provenance 明確標記 `schematic`。
2. **四國地標歸屬斷言檢查器**（`scripts/check_country_ring_landmarks.py`，比照 `check_ring_landmarks.py`）
   - 輸入：`src/geo/asiaCountryDomains.ts` 投影環與 `LANDMARKS` 列表（`wp_coord.py` 實查經緯度 + `should` 環 + `should_not` 相鄰環）。
   - 輸出：逐點 `OK`/`FAIL` 報告與 `--unasserted` 佇列清單。
   - 通過/失敗標準：每個 `domainId` 至少 1 條正例＋1 條反例斷言，失敗數必須為 `0`（exit 0）。
3. **形狀與投影健全度閘門擴充**（修補 `scripts/audit_war_shape.mjs` 與 `scripts/audit_map_accuracy.mjs`）
   - 輸入：`src/geo/asiaCountryDomains.ts`（補掃 16 環，不再漏算）與 `src/countries/*/*Pack.ts`（補掃 `P(lo,la)` 路線與 `[expr]` 計算鍵）。
   - 輸出：`audit:war-shape` 分列 `asiaCountryDomains` 之 `schematic` 與 `selfInt` 數（誠實納管，不減不偽）；`audit:map` 補驗四國 103 條路線海陸與 `COUNTRY_BASEMAPS[c].view` 框內檢查。
   - 通過/失敗標準：既有 `fail` 維持 `0`，`selfInt` 必須為 `0`；未追蹤環仍記於 `schematic` 基線，待生成器落地後方可下調。

## 禁止事項

- **禁止為無固定領土之勢力臆造疆域環**：如明朝（鄭和船隊）、早期的海權貿易據點或游動游擊區，維持僅畫路線或僅在 `shadeNotes` 說明，不硬畫成片色塊。
- **禁止偽造或粉飾幾何出處字串**：未經 Natural Earth 要素追蹤或歷史地圖集矢量化之多邊形，必須維持 `approx: true` 與 `schematic` 標記；不得寫「已剪裁至海岸線」若實際未剪裁。
- **禁止觸動中國・日本底圖與既有閘門門檻**：不動 `src/geo/eraRegions.ts`、`src/geo/asiaWarTerritory.ts`、`src/sengoku/data/tracedDomains.ts`、`scripts/audit_geo.py` 及 `reports/gate-baseline.json` 中既有的中國／日本指標。
- **禁止更動預設地圖圖層開關**：不得修改 `EraMapView.tsx` 之 `useMapLayers` 預設值（`territory`/`routes` 桌機開・手機關、`places` 關）及 `MARCH_ROUTE_SAME_YEAR`。
- **禁止使用簡體字、日本新字形或粵語口語寫入程式碼與註解**：每次提交前須通過 `audit-chars.ts` 與 `agent-selfcheck.mjs`。
