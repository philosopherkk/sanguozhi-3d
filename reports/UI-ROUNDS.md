# ui 輪值報告

> `agent/ui` 排程輪值之逐輪記錄，格式依 `docs/agents/README.md` §6。
> 只記錄已執行指令的輸出；未經指令證實者不寫。

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
