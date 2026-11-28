## 現況數字

四國 16 個時代包（`src/countries/*/*Pack.ts`）現共登錄 **103 條**行軍／航海路線，皆以 `P(lo, la)` 呼叫 `asiaPx(lo, la)` 投影至 `1710×1000` 亞太戰區底圖：

| 國家 | 檔案（槽 id） | 年份窗口 | 路線數 | 端點斷言數 | 現況異常（以 `ASIA_LAND` 實測） |
|---|---|---|---:|---:|---|
| 韓國 | `koancientPack.ts`（`koancient`） | `-108..668` | 6 | 0 | 缺隋唐遼東／薩水／安市城／白村江 |
| 韓國 | `kogoryeoPack.ts`（`kogoryeo`） | `668..1392` | 5 | 0 | `ko-1231-goryeo-sea` 海路 2/3 落陸 |
| 韓國 | `kojoseonPack.ts`（`kojoseon`） | `1392..1897` | 6 | 0 | 缺朝鮮水軍（1592 閑山／1597 鳴梁） |
| 韓國 | `komodernPack.ts`（`komodern`） | `1897..2026` | 6 | 0 | 無海陸幾何失敗；缺端點斷言 |
| 泰國 | `thsukhothaiPack.ts`（`thsukhothai`） | `1238..1351` | 4 | 0 | 窗口止於 1351；1378／1409 落空窗 |
| 泰國 | `thayutthayaPack.ts`（`thayutthaya`） | `1438..1767` | 5 | 0 | `th-1767-taksin-sea` 起訖兩端落陸 |
| 泰國 | `thchakriPack.ts`（`thchakri`） | `1782..1909` | 5 | 0 | `th-1893-gunboats-sea` 4/7 落陸；1855/1909 端點落陸 |
| 泰國 | `thmodernPack.ts`（`thmodern`） | `1932..1997` | 5 | 0 | `th-1941-japan-gulf-sea` 4/6 落陸；1941 南端起點落陸 |
| 越南 | `vnnorthPack.ts`（`vnnorth`） | `-111..1009` | 7 | 0 | `vn-m111-louchuan-sea` 訖點落陸 |
| 越南 | `vndynastyPack.ts`（`vndynasty`） | `1010..1802` | 10 | 0 | `vn-1789-tayson-north` 陸路 2/5 落北部灣外海 |
| 越南 | `vnnguyenPack.ts`（`vnnguyen`） | `1802..1945` | 9 | 0 | `vn-1802-nguyen-sea` 6/12、`vn-1858-french-saigon` 5/5、`vn-1945-french-return` 2/2 落陸 |
| 越南 | `vnmodernPack.ts`（`vnmodern`） | `1945..1990` | 10 | 0 | `vn-1975-evacuation-sea` 4/5、`vn-1986-rice-export` 4/4 落陸 |
| 馬來西亞 | `mymalaccaPack.ts`（`mymalacca`） | `1400..1511` | 5 | 0 | 1409/1511 海路末點與港座標重合貼陸；缺南段海峽線 |
| 馬來西亞 | `mycolonialPack.ts`（`mycolonial`） | `1511..1941` | 8 | 0 | `my-1786-light-arrival` 2/4 落陸；1824/1874 海路起點落陸 |
| 馬來西亞 | `mymerdekaPack.ts`（`mymerdeka`） | `1941..1965` | 6 | 0 | `myp3-1965-sea-kl-to-melaka` 3/3 落陸；1941/1963 端點落陸 |
| 馬來西亞 | `mymodernPack.ts`（`mymodern`） | `1965..2026` | 6 | 0 | `myp4-1991-export-lane` 訖點落陸 |

- **端點斷言數**：**0／103 條**（`scripts/check_route_landmarks.py` 未掃 `src/countries/`；`scripts/audit_map_accuracy.mjs` 第 686 行只認 `[x, y]` 字面量不認 `P(lo, la)`，致 103 條全誤歸「點數不足」，`亞洲戰區 0 條`、海陸誤畫零攔截）。
- **尚未有路線之關鍵戰役（含年份、起訖點與窗口判定）**：
  - **韓國**：`koancient`（`-108..668`）缺 **高句麗—隋薩水之役**（612，遼陽→平壤→薩水）、**高句麗—唐遼渡安市城之役**（645，渡遼水→遼東城→安市城）、**白村江海戰**（663，齊州／黃海→白村江口）；`kogoryeo`（`668..1392`）缺 **蒙麗三別抄抗元**（1270，江華→珍島→耽羅海路）與 **威化島回軍南返線**（1388，威化島→開京，現僅有北渡線）；`kojoseon`（`1392..1897`）缺 **壬辰倭亂朝鮮水軍閑山島大捷**（1592，麗水→閑山島海域）與 **鳴梁海戰**（1597）。（若於 `kogoryeo` 補 645／663 或於 `kojoseon` 補 1905 義兵 → **BLOCKED**。）
  - **泰國**：`thsukhothai`（`1238..1351`）與 `thayutthaya`（`1438..1767`）之間 `1352..1437` 存在空窗，故 **素可泰納貢更替（1378 阿瑜陀耶→素可泰）** 與 **明使鄭和來暹（1409 占城外海→昭披耶河口）** 均落兩槽之外 → **BLOCKED**（須擴槽界或另立橋接事件方可見）；`thayutthaya` 缺 **第一次東吁圍大城**（1548，勃固→三塔關→大城）、**東吁太子南下象戰線**（1593，勃固→三塔關→農沙萊）與 **貢榜南路合圍大城**（1767，土瓦／丹那沙林→大城）；`thchakri`（`1782..1909`）缺 **九軍之役**（1785，貢榜多路入暹；若誤寫入 `thayutthaya` → **BLOCKED**）。
  - **越南**：`vnnorth`（`-111..1009`）缺 **前黎白藤江／如月江破宋師**（981，欽廉外海→白藤江口）；`vndynasty`（`1010..1802`）缺 **張輔滅胡南下**（1407，鎮南關→東都）、**藍山抗明支棱伏擊**（1427，支棱→昌江）與 **阮惠首次北伐扶黎滅鄭**（1786，富春→昇龍；若誤寫入 `vnnguyen` `1802..1945` → **BLOCKED**）；`vnnguyen`（`1802..1945`）缺 **法艦攻順安砲台**（1883，峴港外海→順化河口）與 **咸宜帝勤王出奔**（1885，順化→宣光）。
  - **馬來西亞**：`mymalacca`（`1400..1511`）缺 **麻坡—馬六甲海峽南段航線**（1409，淡馬錫外海→麻坡外海→馬六甲外海）、**大城南侵峇株巴轄／麻坡海戰**（1456）及 **1511 末主經麻坡—巴莪南撤段**（現直畫至柔佛）；`mycolonial`（`1511..1941`）缺 **萊佛士新加坡開港航線**（1819，檳榔嶼→馬六甲→新加坡外海；若誤於 `mycolonial` 補 1942 新加坡陷落 → **BLOCKED**，該年屬 `mymerdeka` `1941..1965`）。
- **年份匹配與夾逼規則**：`DeepDiveYearContext.tsx`（第 55、72、99 行）將當前年份夾逼於 `[pack.yearMin, pack.yearMax]`；`DeepDiveMapStage.tsx:91` 與 `EraDocks.tsx:114` 皆傳 `visibleYears={MARCH_ROUTE_SAME_YEAR}`（`= 0`），`RouteOverlay.tsx:16` 判定 `year === r.year` 方繪出。故任何落在 `[yearMin, yearMax]` 之外的路線永遠無法匹配夾逼後年份，地圖與左側列表皆 **完全不可見**；且 `audit:map` 規則 3 要求路線年須有同檔同年事件卡，否則出 `route-year-no-event` warn（基線 0）。

## P0 佇列（本機代理今天可做，<=12 條）

☐ src/countries/korea/kogoryeoPack.ts｜修正 `ko-1231-goryeo-sea`（1231，`sea`，2/3 落陸）改全水點 `P(126.25, 37.55), P(126.32, 37.68), P(126.30, 37.70)`；註明待補斷言 `end＝江華西側渡口外海 (126.48, 37.74)` 容差 20 km｜驗收=`npx oxlint src/countries/korea/kogoryeoPack.ts && node scripts/gate-ci.mjs --only=audit:chars && node scripts/audit_map_accuracy.mjs --fail-on-gap`
☐ src/countries/korea/kogoryeoPack.ts｜補 `ko-1388-return`（1388，`land`，威化島回軍南返）：起 `P(124.15, 40.2)` 經義州 `P(124.4, 40.0)`、平壤 `P(125.75, 39.03)` 至開京 `P(126.55, 37.97)`，引《高麗史·辛禑世家》；待補斷言 `start＝威化島 (124.15, 40.20)` 20 km、`end＝開京 (126.55, 37.97)` 12 km｜驗收=`npx oxlint src/countries/korea/kogoryeoPack.ts && node scripts/gate-ci.mjs --only=audit:chars && node scripts/audit_map_accuracy.mjs --fail-on-gap`
☐ src/countries/korea/kojoseonPack.ts｜補 `ko-1592-hansan-sea`（1592，`sea`，李舜臣閑山島大捷）：全水點 `P(127.75, 34.62), P(128.05, 34.65), P(128.48, 34.70)`，引《宣祖實錄》《亂中日記》；待補斷言 `start＝麗水外海 (127.66, 34.74)` 20 km、`end＝閑山島海域 (128.48, 34.79)` 20 km｜驗收=`npx oxlint src/countries/korea/kojoseonPack.ts && node scripts/gate-ci.mjs --only=audit:chars && node scripts/audit_map_accuracy.mjs --fail-on-gap`
☐ src/countries/thailand/thayutthayaPack.ts｜補 `th-1593-burma-advance`（1593，`land`，東吁太子南下素攀線）：`P(97.15, 17.33), P(98.5, 15.7), P(99.55, 14.0), P(99.95, 14.2)`，引《緬甸編年》《阿瑜陀耶編年》；待補斷言 `end＝農沙萊方向 (99.95, 14.20)` 25 km｜驗收=`npx oxlint src/countries/thailand/thayutthayaPack.ts && node scripts/gate-ci.mjs --only=audit:chars && node scripts/audit_map_accuracy.mjs --fail-on-gap`
☐ src/countries/thailand/thchakriPack.ts｜修正 `th-1893-gunboats-sea`（1893，`sea`，4/7 落陸）改繞金甌角海面 `P(107.3, 10.2), P(106.5, 8.6), P(104.7, 8.2), P(102.5, 10.6), P(101.2, 12.2), P(100.62, 13.42)`，並將 `1855` 末點退 `P(100.62, 13.42)`；待補斷言 `end＝昭披耶河口外海 (100.60, 13.50)` 20 km｜驗收=`npx oxlint src/countries/thailand/thchakriPack.ts && node scripts/gate-ci.mjs --only=audit:chars && node scripts/audit_map_accuracy.mjs --fail-on-gap`
☐ src/countries/thailand/thmodernPack.ts｜修正 `th-1941-japan-gulf-sea`（1941，`sea`，4/6 落陸）改全水點 `P(106.2, 8.5), P(104.5, 8.0), P(102.5, 10.5), P(101.2, 12.2), P(100.62, 13.42)`，並將 `th-1941-south-landings` 起點移至海面 `P(102.35, 6.2)`；待補斷言 `end＝昭披耶河口外海 (100.60, 13.50)` 20 km｜驗收=`npx oxlint src/countries/thailand/thmodernPack.ts && node scripts/gate-ci.mjs --only=audit:chars && node scripts/audit_map_accuracy.mjs --fail-on-gap`
☐ src/countries/vietnam/vndynastyPack.ts｜修正 `vn-1789-tayson-north`（1789，`land`，2/5 誤落北部灣外海）改陸上點 `P(107.59, 16.46), P(106.6, 17.5), P(105.68, 18.68), P(105.8, 19.8), P(105.85, 21.03)`；待補斷言 `start＝富春 (107.59, 16.46)` 15 km、`end＝昇龍 (105.85, 21.03)` 15 km｜驗收=`npx oxlint src/countries/vietnam/vndynastyPack.ts && node scripts/gate-ci.mjs --only=audit:chars && node scripts/audit_map_accuracy.mjs --fail-on-gap`
☐ src/countries/vietnam/vnnguyenPack.ts｜修正 `vn-1858-french-saigon`（1858，`sea`，5/5 落陸）改離岸點 `P(108.5, 16.2), P(109.5, 14.2), P(109.6, 12.2), P(108.4, 10.3), P(107.15, 10.25)`，並修正 `vn-1945-french-return` 為 `P(107.6, 9.8), P(107.15, 10.25)`；待補斷言 `end＝頭頓外海 (107.08, 10.34)` 20 km｜驗收=`npx oxlint src/countries/vietnam/vnnguyenPack.ts && node scripts/gate-ci.mjs --only=audit:chars && node scripts/audit_map_accuracy.mjs --fail-on-gap`
☐ src/countries/vietnam/vnnguyenPack.ts｜修正 `vn-1802-nguyen-sea`（1802，`sea`，6/12 落陸）外移至近海點 `P(107.2, 10.2), P(108.6, 10.6), P(109.6, 12.2), P(109.5, 13.8), P(109.2, 15.4), P(108.4, 16.2), P(107.8, 16.7), P(107.4, 17.8), P(107.2, 19.5), P(106.9, 20.7)`；待補斷言 `start＝西貢河口外海 (107.08, 10.34)` 25 km、`end＝白藤江口外海 (106.85, 20.85)` 25 km｜驗收=`npx oxlint src/countries/vietnam/vnnguyenPack.ts && node scripts/gate-ci.mjs --only=audit:chars && node scripts/audit_map_accuracy.mjs --fail-on-gap`
☐ src/countries/vietnam/vnmodernPack.ts｜修正 `vn-1975-evacuation-sea`（4/5 落陸）為 `P(108.5, 16.1), P(109.5, 14.2), P(109.5, 12.2), P(108.3, 10.4), P(107.2, 10.1)`，並修正 `vn-1986-rice-export`（4/4 落陸）繞金甌出海 `P(106.8, 10.1), P(106.0, 8.8), P(104.8, 8.3), P(104.0, 9.5)`；待補斷言 `1975 end＝頭頓外海 (107.08, 10.34)` 30 km｜驗收=`npx oxlint src/countries/vietnam/vnmodernPack.ts && node scripts/gate-ci.mjs --only=audit:chars && node scripts/audit_map_accuracy.mjs --fail-on-gap`
☐ src/countries/malaysia/mymalaccaPack.ts｜將 `my-1409-ming-convoy-lane`、`my-1511-portuguese-approach` 末點退海面 `P(102.18, 2.15)`，並補 `my-1409-muar-strait-sea`（1409，`sea`，麻坡—馬六甲海峽南段）：`P(103.85, 1.18), P(102.50, 2.00), P(102.18, 2.15)`，引《瀛涯勝覽》；待補斷言 `start＝淡馬錫海峽 (103.85, 1.25)` 20 km、`end＝馬六甲港外海 (102.25, 2.19)` 20 km｜驗收=`npx oxlint src/countries/malaysia/mymalaccaPack.ts && node scripts/gate-ci.mjs --only=audit:chars && node scripts/audit_map_accuracy.mjs --fail-on-gap`
☐ src/countries/malaysia/mycolonialPack.ts｜修正 `my-1786-light-arrival`（`sea`，2/4 落蘇門答臘）為 `P(99.9, 3.3), P(99.8, 4.2), P(100.0, 5.0), P(100.20, 5.42)`，並將 1824/1874 三條海路起訖端點微調離陸；待補斷言 `1786 end＝檳榔嶼外海 (100.33, 5.41)` 20 km｜驗收=`npx oxlint src/countries/malaysia/mycolonialPack.ts && node scripts/gate-ci.mjs --only=audit:chars && node scripts/audit_map_accuracy.mjs --fail-on-gap`

## P1 批次

（注：凡涉及「新增路線年份尚無同年事件卡」者，須俟 `enrich` 先補事件卡或同步進場，以免觸發 `audit:map` `route-year-no-event` warn 棘輪。）

- **批次 1：`src/countries/korea/koancientPack.ts`（依賴 612／645／663 事件卡）**
  1. 補 `ko-612-sui`（612，`land`，隋軍自遼東城渡鴨淥江趨平壤與薩水退軍，引《隋書·高麗傳》）。
  2. 補 `ko-645-anshi`（645，`land`，唐太宗渡遼澤拔遼東城圍安市城，引《舊唐書·高麗傳》）。
  3. 補 `ko-663-baekgang-sea`（663，`sea`，唐羅水軍自熊津外海會於白村江口，與 `asukaPack.ts` 同史實互照）。
- **批次 2：`src/countries/thailand/thayutthayaPack.ts`（1767 南路免等事件；1548／1378／1409 須先解決事件或空窗）**
  1. 補 `th-1767-south-column`（1767，`land`，貢榜南路軍經土瓦／丹那沙林越地峽北圍大城；同年已有 1767 事件）。
  2. 補 `th-1548-tabinshwehti`（1548，`land`，東吁德彬瑞蒂經三塔關首次圍大城；待補 1548 事件卡）。
  3. 決定 `1352..1437` 空窗處置：擴 `thsukhothai.yearMax` 至 `1438` 或 `thayutthaya.yearMin` 下探 `1378` 後，方補 `1378` 素可泰納貢線與 `1409` 鄭和使暹羅海線（現階段 BLOCKED）。
- **批次 3：`src/countries/vietnam/vndynastyPack.ts`**
  1. 補 `vn-1407-ming-invasion`（1407，`land`，張輔分道自鎮南關／蒙自入東都；需同步補 1407 事件卡，現已有 1407 tick）。
  2. 補 `vn-1427-chilang`（1427，`land`，藍山義軍支棱—昌江伏擊柳昇線；需補 1427 事件卡）。
  3. 補 `vn-1786-tayson-first-north`（1786，`sea`／`land`，阮惠自富春北取昇龍扶黎滅鄭；需補 1786 事件卡）。
- **批次 4：`src/countries/vietnam/vnnguyenPack.ts`**
  1. 補 `vn-1883-thuan-an-sea`（1883，`sea`，法艦自峴港外海北襲順化順安砲台；需補 1883 事件卡）。
  2. 補 `vn-1885-can-vuong`（1885，`land`，咸宜帝與尊室說自順化北奔廣治—宣光下勤王詔；需補 1885 事件卡）。
- **批次 5：`src/countries/malaysia/mymalaccaPack.ts`**
  1. 補 `my-1456-batu-pahat-sea`（1456，`sea`，敦霹靂扼麻坡—峇株巴轄海峽卻大城水師；需補 1456 事件卡）。
  2. 檢核 `my-1511-sultan-retreat` 文案與幾何，補麻坡—巴莪段或細化 1511 末主退路註記。
- **批次 6：`src/countries/malaysia/mycolonialPack.ts`**
  1. 補 `my-1819-raffles-singapore`（1819，`sea`，萊佛士自檳榔嶼—馬六甲南航開港淡馬錫；需補 1819 事件卡，現已有 1819 tick）。
  2. 補 `my-1841-brooke-sarawak`（1841，`sea`，布魯克自新加坡渡海入古晉助勃泥平亂；需補 1841 事件卡）。
- **批次 7：`src/countries/thailand/thchakriPack.ts`**
  1. 補 `th-1785-nine-armies`（1785，`land`，貢榜五路犯暹與拉瑪一世分道迎擊；需補 1785 事件卡）。
  2. 補 `th-1827-vientiane`（1827，`land`，曼谷遣師經呵叻渡湄公河入永珍；需補 1827 事件卡）。
- **批次 8：`src/countries/malaysia/mymerdekaPack.ts`**
  1. 修正 `myp3-1965-sea-kl-to-melaka`（3/3 落陸，改取馬六甲海峽水面 `P(103.80, 1.20), P(103.3, 1.35), P(102.5, 1.95), P(102.18, 2.15)`）並移正 `1941`／`1963` 海路端點至海面。
  2. 補 `my-1942-singapore-fall`（1942，`land`，日軍渡柔佛海峽入新加坡；需補 1942 事件卡，現已有 1942 tick）。

## 工具缺口（要雲端那層我來建）

1. **`audit_map_accuracy.mjs` 解析 `P(lo, la)` 座標支援**
   - 輸入：`src/countries/*/*Pack.ts` 內 `points: [P(lo, la), ...]` 與 `asiaPx(lo, la)` 投影式。
   - 輸出：`ASIA_LAND` 海陸判定覆蓋數、`sea-route-over-land`／`land-route-crosses-sea`／`route-year-no-event` 清單，並寫入 `reports/map-accuracy.md`。
   - Pass/Fail 準則：四國路線 `routesTotal === scanned + short` 且 `short` 不得把 `P()` 當點數不足；海路落陸過半即 `fail`、陸路落外海 `>=1` 點即 `warn`、同檔無同年事件卡即 `warn`；補 `--teeth` 注入壞 `P()` 樣本必咬。
2. **`check_route_landmarks.py` 納入四國與經緯度直接檢核**
   - 輸入：新增 `COUNTRY_LONLAT_FILES = src/countries/*/*Pack.ts`，解析 `P(lo, la)` 起訖經緯度，與 `ASSERTS` 內韓／泰／越／馬城市與海灣座標比大圓距離。
   - 輸出：`python3 scripts/check_route_landmarks.py` 逐條印出實測 vs 宣稱距離（km）與容差、`--unasserted` 印出四國未斷言佇列。
   - Pass/Fail 準則：在冊四國路線數須為實數（初版 103 條）；任一斷言距離超容差或 `ASSERTS` 引用不存在 `id` 即 exit 1。
3. **路線年份落入時代窗口閘門**
   - 輸入：各 pack 的 `yearMin`、`yearMax` 與 `routes[].year`（並含 `mapWindows` 各自 `[from, to]`）。
   - 輸出：`route-year-out-of-window` 稽核結果（併入 `audit_map_accuracy.mjs` 與 `gate-ci.mjs`）。
   - Pass/Fail 準則：任一路線 `r.year < yearMin || r.year > yearMax`（且不在適用 `mapWindow` 內）即 `fail`（exit 1），杜絕永遠不可見的幽靈路線。
4. **海路端點與近岸港灣校驗器**
   - 輸入：所有 `kind: 'sea'` 路線首尾 `points`、`ASIA_LAND` 多邊形與 `check_route_landmarks.py` 對應港口斷言座標。
   - 輸出：標示 `sea-endpoint-on-land`（端點落陸）與「港口錨地距市中心超過容差」之明細。
   - Pass/Fail 準則：海路首尾點（除明確註記「登岸岸點」且全線過半在海面外）於 `ASIA_LAND` 須 `!isLand`，且距宣稱港口座標 `<= tol`（15–30 km）；未達者 `fail`。

## 禁止事項

- **禁止編造戰役或地標**：不得虛構無史料依據之軍事行動、航線或年份；古戰場地望有爭議者（如薩水、安市城、農沙萊、支棱）須於 `source` 明寫「示意、非實測日程」且放寬斷言容差。
- **海陸 `kind` 與座標不可錯配**：`kind: 'sea'` 全線須行於水面（不得穿過蘇門答臘、越南中圻或湄公河三角洲陸地）；`kind: 'land'` 不得飄出外海（`>0.4°`）。
- **嚴禁放寬 `MARCH_ROUTE_SAME_YEAR = 0`**：四國沿用 `DeepDiveMapStage` 與 `EraDocks`，只顯示當前年份路線，不得改回多年殘留。
- **避免同年多線碰撞與無事件孤線**：同年多線須用唯一 `id` 且錯開終點／方向免壓字框；新路線年份無同年事件卡前不得單獨合併（會拉高 `audit:map` `route-year-no-event` warn 基線）。
- **嚴禁簡體字與日本新字形**：含程式碼註解、`source`、`name` 與斷言理由（防 `査`/`线`/`国`/`马来` 等錯字），每批改畢必跑 `audit:chars`。
