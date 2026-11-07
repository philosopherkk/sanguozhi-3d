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

