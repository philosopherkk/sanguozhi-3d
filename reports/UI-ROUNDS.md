# ui 輪值報告

> `agent/ui` 排程輪值之逐輪記錄，格式依 `docs/agents/README.md` §6。
> 只記錄已執行指令的輸出；未經指令證實者不寫。

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
