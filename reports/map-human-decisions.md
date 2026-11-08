# 地圖精度：需要人工決定的事項

由「地圖精度」排程（branch `content/map-accuracy`）維護。凡涉及產品取捨、跨排程擁有權
或新增閘門的事項，一律記於此檔，不在 agent 輪次內自行決定。

## 1. `npm run test` 在 origin/main 上已經是壞的（非本輪造成）

- 現象：`node scripts/test_audit_quotes.mjs` 報 `MODULE_NOT_FOUND`，exit 1。
- 原因：`package.json` 的 `test` 條目由 `e2c635a`（PR #37）帶進 main，但
  `scripts/test_audit_quotes.mjs` 只在未合併的 `98fd744`（引文查證工作線）裡存在，
  main 的 tree 沒有這個檔案（`git ls-tree origin/main scripts/` 查無）。
- 請示：由引文排程把檔案補回 main，或把 `test` 暫時指向既有測試／移除。本排程不取
  用別條工作線的測試檔。

## 2. `ringProvenance.ts` 宣稱自動生成，但生成腳本不存在

- `src/data/territory/ringProvenance.ts` 檔頭寫「由 `scripts/gen_ring_provenance.py`
  產生」，repo 內找不到該腳本（`git log --all --` 亦無記錄）。
- 後果：`audit:ranges` 規則 17 要求每個環編號都有登記，但新增環編號的唯一途徑是手改
  「不要手改」的生成檔，與規則「生成檔唔准手改」衝突。本輪因此刻意不新增 `realm_*`
  大環，改用已登記的省級環組合來畫清 1911 年版圖。
- 請示：補回生成腳本（把 `basis`／`source` 文字移到可編輯的來源），或承認該檔為手寫
  並改掉檔頭的「自動生成」說法。

## 3. 元明清包 1911 年的外蒙古、西藏：只有「不塗清」，沒有對方勢力色

- 本輪把 1911 年的清色塊減去漠北，西藏色塊保留並標 `disputed`。但色塊之外目前是留白，
  介面讀起來像「無主之地」，而不是「另有政權」。
- 民國包已有「噶廈」「新疆地方」「盛世才」等勢力。元明清包是否要加「外蒙古（博克多格根）」
  與「噶廈」、如何定色票與圖例順序、兩包命名要不要統一，屬產品決定。

## 4. 晚清條約所失之地無法以現有代理呈現

- 1860 年中俄《北京條約》與《璦琿條約》之外的外東北、1864 年《塔爾巴哈台蘇魯界約》的
  西北界，在「現代省界示意環」這套代理之下沒有可縮小的環。本輪只補 `geometryFrom`、
  `disputed` 與注文說明，實際變化仍要依條約文本掌握。
- 若要做對，需要為晚清另做一套 plate-traced／gis-import 邊界。工作量與是否值回，請示。

## 5. 簡體字閘門的兩個缺口

- `scripts/audit-data.ts` 的 `SIMPLIFIED_ONLY_RE` 含「西」，而「西」繁簡同形；只要欄位
  出現「陝西」就會被誤判為簡體。要清同形字，否則不敢擴大掃描範圍。
- `src/japanEras/packs/edoPack.ts` 有 6 處「辖」（簡體，應作「轄」），落在
  `outcome`／`university`／`secondary`／`brief` 敘事欄；`audit:data` 只掃 `src/data/`，
  所以沒報。該檔屬事件深度排程所有，本輪未改。
- 請示：是否把簡體字掃描擴充到各 pack 的資料欄位（並先修同形字誤判）。

## 6. 重新生成幾何所需要的本地資源

- `scripts/gen_era_regions.py` 需要 `public/maps/china_edcp_relief.jpg`（1968×1567 原圖，
  被 `.gitignore` 排除）與 `scripts/out/` 目錄。新的 worktree 沒複製底圖就無法重跑生成，
  到時只能手改生成檔。
- 建議：底圖納入 Git LFS，或補一支 fetch 腳本，並在 CI 先跑「生成後比對」。
- 本輪已從主目錄複製底圖到專用 worktree 完成重新生成（改前先驗證生成器能逐字重現現有
  `src/geo/eraRegions.ts`，確認環境一致）。

## 7. 地標斷言目前不是常駐閘門

- 本輪以一次性腳本跑了 26 條「某地應該／不應該在某色塊內」的斷言，抓出 `xinjiang` 示意環
  把蒙古科布多吃進新疆的真實錯誤（同一環也供民國、中華人民共和國版圖使用，等於地圖上
  科布多被塗成中國）。已修並把斷言留在 `scripts/gen_era_regions.py` 的註解裡。
- 現況只有 `scripts/gen_asia_war_territory.mjs` 自帶這類斷言，而且該腳本因缺
  `scripts/.cache/countries-50m.json` 在本機跑不起來；`ERA_RINGS` 這套環沒有常駐的地標
  閘門。
- 請示：准不准新增 `scripts/audit_era_landmarks.py`（讀 `ERA_RINGS` 與底圖陸地掩膜，
  跑上面 26 條斷言）並納入每輪閘門。新增閘門屬流程決定，先徵求同意。

## 8. 共用 checkout 的干擾

- 主目錄 `/Users/ka-kinpoon/Projects/3kingdoms/sanguozhi-3d` 由 `content/event-depth`
  佔用，並留有未提交的 `docs/AUDIT.md`（只有時間戳差異）與 `reports/event-depth.md`
  （被縮窄成 `src/zhou` 範圍後重新生成，刪掉了其他模組的統計）。本輪依「工作區不乾淨
  就不動」的原則改用專用 worktree `/Users/ka-kinpoon/Projects/3kingdoms-wt-map`，
  未觸碰主目錄。
- 建議：每條排程固定自己的 worktree（chengyu／map／quotes 已如此），主目錄只留人工操作；
  可考慮把 `reports/*.md` 一律 gitignore，避免多條排程互相覆蓋統計。

## 9. `gen_era_regions.py` 會蓋掉 `src/geo/japanEraRings.ts` 的 CODH 成果

- 該腳本除了寫 `src/geo/eraRegions.ts`，也會寫 `src/geo/japanEraRings.ts`。但庫裡現行
  的 `japanEraRings.ts` 檔頭已改用 CODH『旧国・旧郡境界データセット』（doi:10.20676/
  00000454、CC BY-NC 4.0）的來源說明，明顯比腳本寫回的「示意塊」版本新。
- 本輪跑生成器時該檔確實被改寫，已 `git checkout --` 回退，PR 內不含該檔改動。
- 請示：把日本環從 `gen_era_regions.py` 拆出去（由 `build_japan_kokugun_rings.py`／
  `vendor_codh_*.py` 單獨負責），否則任何人重跑生成器都會把 CODH 舊國環蓋回示意版本。

## 10. 日本 pack 的 `places` 錨點偏離實地，行軍線終點因此對不上標籤

- 本輪以 `build_japan_kokugun_rings.py` 的投影（1482×1477，西 121.96／東 151.58／
  北 47.56／南 22.95）把各地名標記反解成經緯度，與實地對比：
  - `edoPack` 那覇 `128.11E, 26.68N`，實地（泊—首里）約 `127.68E, 26.21N`，偏約 66km，
    且落在沖繩本島以東的海面。
  - `asukaPack`／`kamakuraPack`／`kofunPack` 筑紫與博多同用 `130.20E, 33.25N`，實地
    博多約 `130.40E, 33.59N`、太宰府約 `130.55E, 33.51N`，偏約 40km，落在有明海。
  - `kamakuraPack`／`muromachiPack` 鎌倉 `139.30E, 35.40N`，實地鎌倉約 `139.55E, 35.32N`，
    偏約 23km。（飛鳥、難波、京都、江戶、吉野、壇之浦、松前、箱館、目梨 誤差可接受。）
- 本輪只改 `routes`（本排程擁有）：9 條海路補 `kind: 'sea'`，弘安之役終點由八代海改到
  平戶—鷹島海域。**未改 `places`**——該欄位不在本排程擁有範圍內。
- 後果：`edo-1609-ryukyu` 的箭咀若改到實地泊村，會離開「那覇」標籤約 66km；維持現狀則
  箭咀停在沖繩本島以東海面。本輪**刻意不動**該終點（維持與現有標記對齊），等 `places`
  歸屬定了再一次改對，避免同一輪同時出現路線與標籤兩邊偏。
- 請示：由誰修 `places`（事件深度排程？），以及是否一併把博多／筑紫拆成兩個標記。

## 11. 要不要把「海路必標 `kind: 'sea'`」變成常駐閘門

- 本輪修的是口徑不一致：`modernJapanPack` 以 `SEA_ROUTE_IDS` 標海路，但日本古代至幕末
  各 pack 的同一類航路（白村江、文永與弘安兩役、島津征琉球、松前兩役海路、黑船兩至、
  箱館渡海）一概沒有 `kind`，地圖畫成實線陸路，與 `source` 自述的「出海」「派船」「渡海」
  互相矛盾。
- 靠人工發現此類遺漏不可持續。可考慮在 `scripts/audit_map_accuracy.mjs` 加一條規則：
  `source` 出現「出海／航路／渡海／派船／上陸／海戰」而 `kind` 不是 `'sea'`，或 `kind`
  是 `'sea'` 但線段全程在陸地，即報 warn（陸海判定可用 `public/maps/*.jpg` 的海陸啟發式；
  中國底圖 20/20 錨點已驗證，日本底圖對細島與北端判別不準，需先定判定範圍）。
- 新增閘門屬流程決定，本輪未動手，先徵求同意。

## 12. 1:50m 底圖把細島與海峽抹平，部分行軍線無法如實呈現

- 亞太戰區底圖使用 Natural Earth 1:50m（`scripts/gen_asia_war_base.mjs`）。本輪以該陸地沿線
  取樣時發現下列地點在底圖上缺席或被填平：
  - 皮島（石城島，1904 年日軍上陸點）等細島：無環，終點必落海面。
  - 千島諸島：占守島與得撫島之間的海峽被陸地填滿——把占守島—得撫島的線放在任何位置，
    取樣結果都是陸多於海（實測 55.6%–85.7% 陸），因此「千島海上跳轉」一類海路無法誠實繪製。
  - 中途島、威克島、珍珠港本身在 1:50m 亦屬海面（生成器的 MARKS 已把三者視為海面）。
- 本輪處理：刪除 `mj-1945-soviet-karafuto` 中由南樺太直插占守島的一段（該段同時造成
  「由樺太攻千島」的假軸線；歷史上占守島方向來自勘察加的海上進攻）；千島暫不畫線，僅保留
  事件與版圖。遼東線的上陸點皮島則改取半島岸上的復州、金州，並在 `source` 說明細島未繪。
- 請示：是否要（a）改用 1:10m 海岸線重新生成底圖，（b）手動補千島、皮島等細島環，或
  （c）接受現況，相關路線一律只畫到最近的可繪陸點。三者都涉及工作量與資料授權，
  不在排程內自行決定。

## 13. 勢力宣告與色票（`pack.factions`）的歸屬未定

- 本輪把 960／1004 年的黨項地帶改標「定難軍」、317 年石勒部標「漢趙（石勒）」、
  1271 年江南色塊標「南宋」。審計規則 7 要求色塊裡的勢力要在 `pack.factions`
  有顏色，因此必須同時新增三條勢力宣告（只寫 `id`／`name`／`color`，不含敘事文字）。
- `factions` 欄位不在本排程的擁有清單（`routes`／`control`／`territoryByYear`／
  `snapshots`）之內。現行做法是地圖排程為通過閘門而直接改色票宣告，與事件深度
  排程的檔案重疊，容易互相覆蓋。
- 請示：把「勢力宣告與色票」正式劃歸地圖精度排程，或由事件深度排程接手；兩者皆可，
  但不宜長期並存。

## 14. 行軍線的政權號不在任何閘門之內

- 本輪以一次性腳本把 `src/imperial/data/**` 的 `line(...)` 年份與 `audit-ranges.ts`
  的 `ANACHRONISM` 表逐條比對，查出四條路線在政權建號之前就用該政權號：
  312 石勒據襄國標後趙（319 建號）、532 韓陵之戰標東魏（534）、534 宇文泰入關標
  西魏（535）、556 陳霸先北抗齊標南陳（557）。四條已改，並各在 `source` 補一句
  說明建號之年。
- `audit:ranges` 規則 4 只掃快照色塊，`audit:map` 不管政權號，同類遺漏只能靠人工發現。
- 另有一例屬灰色地帶未改：580 年「楊堅入長安輔政」「尉遲迥鄴城」兩條標「隋」——
  楊堅 580 年封隨王、581 年受禪建隋，`ANACHRONISM` 表內沒有「隋」這一項。
- 請示：（一）准不准把規則 4 的檢查範圍由快照擴充到 routes；（二）准不准在
  `ANACHRONISM` 補入「隋 581」。兩項都改動閘門，屬流程決定，本輪未動 `scripts/audit-*`。






## 2026-11-08 海陸路線閘門（audit:map 規則 4–6）交做人

新增規則：sea-route-over-land（fail）、land-route-crosses-sea（暫 warn）、land-route-sea-point（warn）、
route-scan-coverage（fail，解析器自校）。陸地遮罩取 src/geo/landMask.ts，用 scripts/audit_geo.py 的
china_px 投到路線所在畫布；啟動前以 9 個海陸錨點自校，自校不過即整支腳本失敗。

### 待判（本輪不自己決定）
1. **遼東灣一帶 5 條路線被判貼海**：liaodong、qh-liaodong、qin-liaodong（各 1 點）、
   f-liaoshen、f-kmt-ne（各 2/3 點）。三種可能，需逐條定：
   (a) landMask.ts 的遼東半島切口太緊（目前只到 121.2–122.3E、39.2–41.2N）；
   (b) 路線點本身就擺在海面；
   (c) 該段本就是海路，應補 kind: 'sea'。
   判完請把 land-route-crosses-sea 由 warn 升回 fail。
2. **渤海不判定**：audit_geo.py 的「渤海中央(119.8,39)」錨點是以實景 relief 像素判海陸，
   而 landMask.ts 的渤海缺口只畫到 38.2°N，39°N 落在陸側。本規則把渤海整帶列為不判定
   （BOHAI_BOX）。要在渤海判海陸，得改用 relief 像素或把遮罩缺口向北延伸——屬資料變更，交人工定。
3. **日本戰區 67 條路線未判定**：src/sengoku、src/bakumatsu、src/japanEras 同用 1968×1567 畫布，
   但地理映射不同，拿中國遮罩去判會全錯，故目前跳過並計數。要覆蓋需另建日本遮罩與映射。
