# ui 輪值報告

> `agent/ui` 排程輪值之逐輪記錄，格式依 `docs/agents/README.md` §6。
> 只記錄已執行指令的輸出；未經指令證實者不寫。

## 待辦摘要（每輪收工時更新，不超過 30 行）

- 佇列：`node scripts/agent-queue.mjs ui`（font 小於 0.75rem 剩 10 條，全部屬「元件未掛載」或「刻意壓小」兩類，實證見 11-21 兩輪記錄；a11y／alt 已 0）。佇列已空，不要自己另覓新工作。
- 本輪先做：已知結構性缺陷已清（浮層高度、勢力榜、勢力板、`--bl` 核驗皆於 11-22 兩輪完成）；若佇列仍空且無新缺陷，本節保持「無待辦」並輪值照跑。
- 舊輪次往後堆；本節只寫「尚餘／下輪先做」。

## 【ui｜2026-11-22 14:11】

基準：`e301183` → 本輪 HEAD：見 `git log`（本節記錄之 commit 為本輪最後一個）
工作區：`git status --porcelain` 輸出＝空（開工與每次 commit 前皆空）

### 完成項目

1. **實機清單覆核**（午輪下輪建議）／`docs/DEVICE_TEST_CHECKLIST.md` 新增「H. 浮層與勢力板
   （11-22 修）」六項：收起態標題行唔准截短、展開態面板底邊在地圖底邊之上並窗內滾動、
   勢力榜修正前 1084px／底 1526px 對照、sengoku 勢力板詳情滾動＋清單留三行、bakumatsu
   無回歸、浮層唔阻地圖拖動。數值全部取自本晨輪與午輪同源 iframe 實測記錄。
   `audit:chars`=0（初稿「成块」簡體一度 exit=1，commit 前修正）、selfcheck 命中 0、tsc=0、
   build=0、lint=0、gates=0。

### 放棄清單

佇列 font 剩 10 條（8 條元件未掛載＋2 條密集刻度刻意壓小），依手冊停止條件不做修改。

### 指標

`agent-queue ui`：開工＝收工 a11y 0｜alt 0｜font 10｜focus-visible 1（佇列已空）。
`npm run gates` exit=0（無惡化）；tsc=0；build=0；lint exit=0（75 警告＝基線）；chars exit=0。

### 下輪建議

佇列與已知結構性缺陷均已清：下輪若 `agent-queue ui` 仍見底，收工驗證綠即可結，
或等候使用者實機驗證 H 段回傳結果再跟進。

## 【ui｜2026-11-22 12:22】

基準：`e301183` → 本輪 HEAD：見 `git log`（本節記錄之 commit 為本輪最後一個）
工作區：`git status --porcelain` 輸出＝空（開工與每次 commit 前皆空）

### 完成項目

1. **sengoku 頁 390px 勢力板超出視口**（晨輪下輪建議）／`src/App.css:1387` 起新增
   `.map-stage__overlay--tl > .power-board { max-height: 100%; display: flex; flex-direction: column }`
   ＋列表 `overflow-y: auto; overscroll-behavior: contain; min-height: 4.5rem`＋詳情面板
   `.faction-situation` 可縮並內部滾動／同源 iframe 390×844／768×1024／1440×900 實測
   （`?c=japan&e=sengoku`）：390 板高 **482.9→320px**、底 **869→706**（＜視口 844、＜地圖底 714），
   列表 `clientHeight 278＜scrollHeight 441`（內部滾動啟動）；768（484.9  unchanged、底 868＜923）
   與 1440（425、底 696＜819）上限不觸發、零變化。點選勢力後（390）：板維持 320，詳情面板
   141.7px（`clientHeight 140＜scrollHeight 470` 內部滾動）、列表仍留 120px 可換選——修前試做
   僅收緊板高時列表被面板擠至 0 高，故加面板滾動＋列表下限。回歸：bakumatsu 390 板 185.4px、
   底 562、列表 `clientHeight==scrollHeight`（unchanged）；中華頁 `--tl` 內直接子層為 Dock 而非
   勢力板（選擇器實測命中 0），三寬 Dock 與晨輪完全一致（390 高 304、底 746）。三寬
   `scrollWidth==clientWidth`、`scrollHeight==clientHeight`。`audit_mobile_css=0`、`audit_contrast=0`、
   tsc=0、build=0、chars=0。⚠ 本輪教訓：初版 commit 嘅 CSS 註解含簡體兩個字（「歸」「樣」之簡體），`audit:chars`
   exit=1 喺 commit 前已印出但被 `;` 鏈忽略，amend 先至清走——落盤指令要逐個睇 exit 碼先 commit。
2. **`--bl` 疊層五頁核驗**（晨輪下輪建議，純驗證、無改動）：靜態查 heian／qinhan／imperial／
   zhou／deepdive 五頁 `--bl` 之唯一子元素均為短文案 `.map-stage__hint`（無 Dock、無百分比高度），
   不存在同類失效；390px 抽驗兩條最長者（heian／edo 平安同款文案）：hint 高 64.2px、底 620／609
   ＜844，無溢出。結論：`--bl` 族群無需修改。

### 放棄清單

佇列 font 剩 10 條，與前輪記錄相同（8 條元件未掛載＋2 條密集刻度刻意壓小），依手冊停止條件不做修改。

### 指標

`agent-queue ui`：開工＝收工 a11y 0｜alt 0｜font 10｜focus-visible 1（佇列已空，本輪未動字級）。
`npm run gates` exit=0（無惡化）；tsc=0；build=0；lint exit=0（75 警告＝基線）；chars exit=0。

### 下輪建議

已知結構性缺陷已清，佇列亦空：若 `agent-queue ui` 仍見底，下輪可只做收工驗證（gates 綠）即結，
或轉做 `docs/DEVICE_TEST_CHECKLIST.md` 嘅實機清單覆核。

## 【ui｜2026-11-22 04:10】

基準：`c51274a` → 本輪 HEAD：見 `git log`（本節記錄之 commit 為本輪最後一個）
工作區：`git status --porcelain` 輸出＝空（開工與每次 commit 前皆空）

### 完成項目

1. **390px 展開「勢力檢視」Dock 超出視口（上一輪下輪建議）**／`src/App.css:1354`
   （`.map-stage__overlay--inspect`）／加 `height: calc(100% - 1.1rem)`：Dock 的生效上限
   `min(72vh, calc(100% - 1rem))`（`.map-stage-dock.zhou-dock` 兩類別選擇器勝過 `--tl` 一類）
   因包含塊（疊層）高度不定而整體失效，面板高度退化為內容高。同源 iframe 390×844／768×1024／
   1440×900 實測（`?c=china&e=sanguo` 點選州郡，localStorage 釘死展開態）：390 Dock 高
   1194→304px、底 746＜地圖底 771、面板 `clientHeight 247＜scrollHeight 1137`（內部滾動啟動）；
   768 底 898＜923（面板 413＜1198）；1440 底 794＜819（面板 412＜601）；三寬
   `scrollWidth==clientWidth` 且 `scrollHeight==clientHeight`。收起態回歸：390 Dock 158.5×57.2、
   提示「曹魏」`scrollWidth==clientWidth`＝27（768 為 29、1440 為 25，皆無截短）；地圖中央
   `elementFromPoint` 仍為 `map-2d__province`（疊層 `pointer-events:none`，放大範圍不遮擋點擊）。
   `audit_mobile_css=0`、`audit_contrast=0`、`npx tsc -b`=0、`build`=0、`audit:chars`=0。
2. **同類缺陷：右上浮層之「勢力榜」Dock 展開超出視口**／`src/App.css:1371`
   （`.map-stage__overlay--tl`，承載 `?c=china&e=sanguo` 之 `.map-stage-dock--tr`，並由
   sengoku／bakumatsu 兩頁使用）／加同一 `height: calc(100% - 1.1rem)`／實測修正前 390 高
   1084.3px、底 1526px（遠超視口 844，且 `clientHeight==scrollHeight` 內部滾動未啟動）；修正後
   390 高 304px、底 746＜771、面板 247＜1027；768 高 1192.4→470.1、底 898＜923；1440 高
   943.6→448.8、底 794＜819；三寬無溢出。回歸：bakumatsu 390 `--tl` 內 `.power-board`
   高 185.4px、底 562px，正常；sengoku 390 見下輪建議（既有缺陷，非本輪引入：疊層高度變化
   不影響 auto 高度子元素之佈局）。`audit_mobile_css=0`、`audit_contrast=0`、tsc=0、build=0、
   selfcheck 命中 0（新漢字「超遮擋榜」逐個核對碼位無誤）、chars=0。

### 放棄清單

佇列 font 剩 10 條，與 11-21 兩輪記錄相同：`src/App.css:1032`（`.map-2d__toggles`，僅存於
`mapViewport.tsx` 的 `closest()` 字串）、`1861/1906/1918`（`MapViewControls` 未匯入）、
`2835/2850/2912/2920`（`JapanHistoryApp` 未匯入）、`2943/2948`（密集刻度刻意壓小，
前輪實測提升後刻度重疊）。依手冊停止條件不做修改。

### 指標

`agent-queue ui`：開工 a11y 0｜alt 0｜font 10｜focus-visible 1 → 收工 相同（佇列已空，
本輪未動字級）。`audit:mobile` 0；`audit:contrast` 0；tsc 0；build 0；chars 0；lint exit 0
（75 條警告，與基線同數）。`npm run gates`：QUICK 卡未要求開工基準，本輪僅收工跑一次，
exit=0（無惡化，多項指標較基線改善，屬上游資料變動）。

### 下輪建議

- sengoku 頁 390px `--tl` 疊層內 `.power-board` 高 482.9px、底 869px＞視口 844，且
  `scrollHeight==clientHeight`（頁面不捲動），底部約 25px 不可達；屬既有缺陷，須為該板自身
  加高度上限與內部滾動，先量三寬再改。
- `--bl` 疊層（zhou／qinhan／heian／imperial／deepdive 五頁使用）未逐頁核驗；若其中有
  百分比高度限制亦同樣失效，先量後改。

## 【ui｜2026-11-21 14:10】

基準：`9a27e9e` → 本輪 HEAD：見下（2 個 commit：`684ce8e` 與本檔記錄 commit）
工作區：`git status --porcelain` 輸出＝空（開工與每次 commit 前皆空）

### 完成項目

1. **390px「勢力檢視」收起時勢力名被省略號截短（上一輪下輪建議）**／`src/App.css:1353`
   （`.map-stage__overlay--inspect`）與 `src/App.css:254`（`.map-stage-dock--tl`）／
   兩處 `max-width: min(22.5rem, 36vw)` 改為 `min(22.5rem, max(15rem, 36vw))`：390px 下 36vw 只得
   140.4px，收起時標題列放不下「標題＋勢力名＋展開按鈕」（實測需約 146px），勢力名只得 21px／需 27px／
   實測 `?c=china&e=sanguo` 390px 點選州郡：Dock 寬 140.4→158.5px，提示「曹魏」框寬 21.3→27px，
   `scrollWidth == clientWidth`（27＝27，截短消除）；展開態 Dock 寬 140.4→240px，面板內寬
   138.4→238px，`scrollWidth == clientWidth`（238＝238，卡內橫向裁剪一併消除）；768px 收起態提示
   29.1px 無截斷、1440px 收起態 25px 無截斷；390／768／1440 三寬 `documentElement.scrollWidth
   == clientWidth`（無橫向溢出）。`audit_mobile_css=0`、`audit_contrast=0`、`npx tsc -b`=0、`build`=0。
2. **字級佇列 `.map-stage-dock__hint` 低於下限**／`src/App.css:258`／0.58rem→0.75rem／該提示屬 Dock
   標題列的勢力名（一般介面文字，非與縮放綁定之圖上標籤）；實測 1440px 收起態生效後為 12px
   （原規則值 0.58rem＝9.3px 依 CSS 原值推算）；390／768px 生效值仍為 13／14px（`mobile.css` 寬度塊
   覆蓋，字級不變）。佇列 font 11→10。

### 放棄清單（剩 10 條 font，全部附實證）

1. `src/App.css:1031`（`.map-2d__toggles button`）／該 class 只出現在 `src/lib/mapViewport.tsx:351`
   的 `closest()` 字串，全站無元素掛此 class，無法實測。
2. `src/App.css:1858`、`1903`、`1915`（`.map-view-controls__title`／`__btn--reset`／`__hint`）／
   元件 `MapViewControls` 全 repo 無匯入，未掛載於任何頁面。
3. `src/App.css:2832`、`2847`、`2909`、`2917`（`.era-map__credit`／`__kicker`／`__band-label`／`__band-range`）／
   只由 `JapanEraMap` 使用，其父 `JapanHistoryApp` 無被任何處匯入。
4. `src/App.css:2940`、`2945`（`@media (max-width: 640px)` 密集刻度 0.62／0.58rem）／刻意壓小：
   前輪已實測 390px 提升後 `tang` 刻度最小間距 6.2→1.0px、`edo` 原已重疊再惡化。

### 指標

`ui_queue`：開工 a11y 0｜alt 0｜font 11｜focus-visible 1 → 收工 **a11y 0｜alt 0｜font 10｜focus-visible 1**
（佇列實質已空：剩餘全部屬「元件未掛載」或「刻意壓小」兩類）
`audit:mobile` 0 → 0（7 項不變式成立）；`audit:contrast` 0 → 0；tsc 0；build 0；`audit:chars` 硬傷 0。
`npm run gates`（開工）exit=1：唯一紅旗為 `audit:teeth-mutations.fail 0→1`，屬 dev server 併發造成嘅
已知瞬時假紅，單獨複跑 `node scripts/audit_teeth_mutations.mjs` 回「失敗 0 項（突變 56 項）」exit=0；
收工值見下。

### 下輪建議

- 390px 展開「勢力檢視」時 Dock 總高約 1194px，超出 844px 視口：`.map-stage-dock--tl` 的
  `max-height: min(62vh, calc(100% - 8.5rem))` 因包含塊高度不定而未生效（實測 1194px > 62vh），
  `.zhou-dock__body` 內部滾動因此未啟動；屬結構問題，需先給 Dock 確定的高度約束，與佇列無關，本輪未處理。

## 【ui｜2026-11-21 04:10】

基準：`95ea98b` → 本輪 HEAD：`7ff3ac4`（2 個 commit：`eea9ad7`、`7ff3ac4`）
工作區：`git status --porcelain` 輸出＝空（開工與每次 commit 前皆空）

### 完成項目

1. **時間軸舞臺說明文字低於下限**／`src/App.css:1393`（`.map-stage__hint`）／0.68rem → 0.75rem／
   實測 `?c=japan&e=sengoku`：1440px 由 10.9px → 12px，框寬 320px、`scrollWidth == clientWidth`
   （318＝318，無截斷），框高 44px → 46px；390px 為 13px、768px 為 14px（原已達標）。
2. **勢力欄標籤低於下限**／`src/App.css:1513`（`.power-board__label`）／0.72rem → 0.75rem／
   實測 `?c=china&e=qin`：1440px 由 11.5px → 12px，框寬 268px、無內部溢出。
3. **縮放按鈕文字低於下限**／`src/App.css:1274`、`1282`（`.map-2d__zoom-btn--text`／`--reset`）／
   0.72rem／0.7rem → 0.75rem／實測 1440px 由 11.5px／11.2px → 12px，按鈕 40×24 → 41×24px，
   `scrollWidth == clientWidth`（39＝39，未爆字）；390px 按鈕仍 44×44px（≥44px 觸控下限成立）。
4. **國號未立年之地圖提示低於下限**／`src/App.css:1661`、`src/mobile.css:959`（桌面斷點區塊）／
   0.6rem／0.6875rem → 0.75rem／實測 `?c=china&e=zhou`：1440px 由 11px → 12px，框寬 361px、
   `scrollWidth == clientWidth`（359＝359，無截斷），框高 40px → 43px；三寬皆
   `documentElement.scrollWidth == clientWidth`（無橫向溢出）。
5. **側欄分區標籤與月份列標籤之基準值低於下限**／`src/App.css:121`、`555`／0.72rem → 0.75rem／
   實測三寬字級不變（390px 13px、768px 14px、1440px 12px），因 `src/mobile.css` 已有更高優先級
   規則覆蓋；本項只把 `App.css` 的基準值升至同一個下限，不改變現有版面。

驗證（每次 commit 前）：`audit_mobile_css.mjs` 0、`audit_contrast.mjs` 0、`npx tsc -b` 0、
`npm run build` 0、`agent-selfcheck` 命中 0、`audit:chars` 硬傷 0。

### 放棄清單（剩 11 條 font，全部附實證）

1. `src/App.css:1031`（`.map-2d__toggles button`）／該 class 只出現在 `src/lib/mapViewport.tsx:351`
   的 `closest()` 字串，全站無元素掛此 class，無法實測。
2. `src/App.css:1858`、`1903`、`1915`（`.map-view-controls__title`／`__btn--reset`／`__hint`）／
   元件 `MapViewControls` 只在自身檔案定義，`grep` 全 repo 無任何匯入，未掛載於任何頁面。
3. `src/App.css:2832`、`2847`、`2909`、`2917`（`.era-map__credit`／`__kicker`／`__band-label`／`__band-range`）／
   只由 `JapanEraMap` 使用，其父 `JapanHistoryApp` 無被任何處匯入（`src/App.tsx` 無此路線）。
4. `src/App.css:2940`、`2945`（`@media (max-width: 640px)` 之密集刻度 0.62／0.58rem）／
   390px 實測 `?c=japan&e=sengoku` 刻度為 9.9px／9.3px；上一輪已實測提升後 `tang`、`edo` 刻度重疊，
   屬刻意壓小。
5. `src/App.css:258`（`.map-stage-dock__hint`）／只在收起之「勢力檢視」Dock 內渲染；390px 點選州郡後
   實測該處字級已是 13px（非 0.58rem），且文字已被省略號截短（需要 27px、僅得 21px），
   故該基準值在可達視口不生效，改字級反而加劇截短。

### 指標

`ui_queue`：開工 a11y 0｜alt 0｜font 19｜focus-visible 1 → 收工 **a11y 0｜alt 0｜font 11｜focus-visible 1**
`audit:mobile` 0 → 0；`audit:contrast` 0 → 0；tsc 0；build 0；`audit:chars` 硬傷 0。
`npm run gates`（開工基準）exit=0；收工值見下。

### 下輪建議

- 「勢力檢視」Dock 於 390px 收起時，其標題列只剩 21px 寬，「曹魏」兩字已被省略號截短（需 27px）：
  要修的是 `.map-stage-dock__hint` 的寬度與 flex 配置（`src/App.css:257`），非字級。
- 佇列剩餘 11 條 `font` 全部屬「元件未掛載」或「刻意壓小」兩類，依手冊停止條件，`font` 實質已清空。

## 【ui｜2026-11-20 14:52】

基準：`a0918e2` → 本輪 HEAD：`359376b`（3 個 commit：`6449ba2`、`bd7ccaa`、`359376b`）
工作區：`git status --porcelain` 輸出＝空（開工與每次 commit 前皆空）

### 完成項目

1. **深掘年代滑桿的年份刻度於 390px 互相重疊**／`src/japanEras/DeepDiveApp.tsx:117`／
   原本無條件渲染 `{t.year}`，改為依 `layoutTicks` 的 `showYear`、`showDot` 結果渲染，
   與全站其他七支滑桿（`SharedYearScrubber`、`YearScrubber`、`ImperialApp`、`HeianChrome`、
   `QinHanYearScrubber`、`ZhouYearScrubber`、`JapanYearScrubber`）一致／
   實測 `?c=japan&e=edo`：390px 重疊 **7 處 → 1 處**（最大重疊 1.4px）、年份標籤 14 → 9、
   圓點位 5、半透明點擊位 3；768px 與 1440px 皆 **0 處重疊**；三寬 `documentElement.scrollWidth
   == clientWidth`（390／768／1440，無橫向溢出）。
   驗證：`audit_mobile_css.mjs` 0、`audit_contrast.mjs` 0、`npx tsc -b` 0、`npm run build` 0、
   `agent-selfcheck` 命中 0、`audit:chars` 0。
2. **圖層列按鈕與行軍圖例文字低於 0.75rem**／`src/App.css:990`、`1008`、`1078`、`1103`、`1129`，
   `src/mobile.css:961`（桌面斷點區塊拆組）／0.62–0.72rem → 0.75rem／
   實測 `?c=china&e=sanguo`：1440px 圖例標題 11.5px → 12px、圖例出處 10.4px → 12px、
   圖層列按鈕及其說明 11.5px／11px → 12px；768px 為 14px；
   圖例框 `scrollWidth == clientWidth`（254＝254，無內部溢出）；三寬無橫向溢出。
3. **底圖標題、側欄地圖首行按鈕、地圖出處文字低於 0.75rem**／`src/App.css:1297`、`src/App.css:128`、
   `src/mobile.css:309`、`src/mobile.css:976`（桌面斷點區塊併入 0.75rem 群組）／
   0.65–0.71875rem → 0.75rem／實測：1440px 三者 11.5px → 12px；390px 地圖出處 11px → 12px
   且其連結同步為 12px，出處框高度維持 44px；三寬無橫向溢出。

### 放棄清單

1. `src/App.css:2937–2947`（`--compact`／`--dense` 年曆刻度 0.62rem）／
   實測證明不能提升至 0.75rem：390px `?c=china&e=tang` 刻度間距由 6.2px 縮至 1.0px（近乎相接）；
   `?c=japan&e=edo` 於改前已重疊（最小間距 −18.9px、刻度列 `scrollWidth` 378 > `clientWidth` 366），
   提升後為 −24.7px。
2. SVG 地圖標籤 `text`（11px）、`.map-2d__dynasty-hint`（11px）／手冊規定：地圖上與縮放綁定之標籤一律跳過。
3. `?c=japan&e=edo` 之外各時代的 `--compact` 刻度仍受百分比防撞模型限制（見下輪建議）。

### 指標

`ui_queue`：開工 a11y 0｜alt 0｜font 28｜focus-visible 1 → 收工 **a11y 0｜alt 0｜font 19｜focus-visible 1**
`audit:mobile` 0 → 0；`audit:contrast` 0 → 0；tsc 0；build 0；lint 0 error；`audit:chars` 硬傷 0。

### 下輪建議

- 防撞模型 `src/lib/tickCollisions.ts` 的百分比常數以滑桿寬約 1280px 校準（檔內註解已註明），
  在 390px 窄視口會低估實際字寬，故仍有 1 處 1.4px 重疊；徹底修法是把容器實寬傳入該函數，
  但該檔不在 `docs/agents/ui.md` 所列可改範圍（僅 `src/App.css`、`src/mobile.css`、`src/index.css`
  與 `src/**/components/*.tsx`），需使用者授權。
- 390px 的底圖標題採 `white-space: nowrap` 加省略號（`src/mobile.css:1043`），實測文字實際需要 419px
    而框寬 377px，故於手機被截短；是否改為可換行，屬版面設計，待裁定。
