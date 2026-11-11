# UI 審計報告（feat/ui-audit）

本檔採**附加制**：每輪在結尾新增一節，唔覆蓋既有內容。格式：日期｜視口｜檢查項｜結果｜檔案:行｜動作（修／報告）。

- 量度工具：`agent-browser`（真實 Chromium，非模擬器推論）＋ `getBoundingClientRect` / `getComputedStyle` 逐個元素量。
- 視口：`set device 'iPhone 15'`（393×852，dpr=3，UA=iPhone）、`768×1024`、`1440×900`；另補 `390×844` 收口清單第 4 項。
  - 註：本版 agent-browser **無「iPhone 14 Pro」**呢個裝置名（可用：iPhone 15/16/16 Pro/17、iPad、iPad Pro、Pixel 9、Galaxy S25）；`iPhone 15` 嘅 CSS 視口正正係 393×852，同清單要求一致，故用佢。
  - 註：無頭瀏覽器 `matchMedia('(pointer: coarse)').matches === false`（實測），所以 44px 規則必須掛**寬度斷點**先可以被自動化驗證（見 `src/mobile.css:292` 註解）。
- 每次開頁之前都 `storage local clear` + `console --clear`，確保冷開。
- 截圖（唔入 git，喺 /tmp）：`/tmp/ui-393-<page>.png`、`/tmp/ui-tab768-<page>.png`、`/tmp/ui-desk1440-<page>.png`（共 12 張）。

---

## 2026-11-11（第三輪）

四頁：`?c=china&e=sanguo&y=208`、`?c=japan&e=heian&y=1156`、`?c=japan&e=edo&y=1853`、`?c=china&e=prc&y=1949`。

### 摘要（計數）

| 視口 | 發現問題 | 已修 | 需人工 | 屬既有豁免 |
|---|---|---|---|---|
| 393×852 | 5 類 | 4 類（含 5 處小修） | 3 類 | 3 類 |
| 768×1024 | 2 類 | 2 類（本輪補 2 個控件入平板帶） | 3 類 | 3 類 |
| 1440×900 | 1 類 | 0（上一輪 24px 帶已生效，本輪覆核） | 2 類 | 2 類 |

### 逐項結果

| # | 檢查項 | 視口 | 結果（實測數字） | 檔案:行 | 動作 |
|---|---|---|---|---|---|
| 1 | 觸控目標 ≥44×44 | 393×852 | 可點元素 61–71／頁。未達標（修前→修後）：三國 17→17、平安 15→13、江戶 26→18、PRC 11→10。**本輪修好**：`.power-board__row--btn` 241×38→241×44（平安/江戶/PRC）、`.faction-legend__btn` 43~109×25→43~109×**44**（江戶 5 顆、平安 1 顆），再補 `min-width` 令寬 43→44 補足最後 1px | `src/mobile.css:242-259`、`334-341` | **修** |
| 1b | 淨餘未達標項 | 393×852 | 全部屬三類既有豁免：年刻度 `.year-scrubber__tick` 6×5／10×21／25-28×22（等價控制＝滑桿＋方向鍵，WCAG 2.5.8 豁免，`src/mobile.css:204` 已記錄）；`.reading-controls button` 26×44／37×44（高達標、寬未達，HU-06）；`.map-2d__credit a` 360×34（法律署名行內連結，HU-04） | `src/mobile.css:268-272` | 報告 |
| 1c | 觸控目標 ≥24×24（WCAG 2.2 AA 2.5.8） | 1440×900 | 未達標：三國 14、江戶 8、平安 6、PRC 2，**全部係年刻度＋出處連結**；上一輪 24px 帶已清除 `timeline-title-link 93×23`、`timeline-month-chip 40×22`、`year-scrubber__note-toggle 56×19`、`side-rail__map-first 58×22`、`app-footer__toggle 79×21`、`reading-controls 26×21`（本輪逐一覆核冇再現） | `src/mobile.css:367-386` | 通過 |
| 1d | 觸控目標 ≥44×44 | 768×1024 | 勢力榜行與圖例掣喺平板同樣唔達標（241×38、43~109×25）→ 本輪補入平板帶，唔再出現 | `src/mobile.css:334-349` | **修** |
| 2 | 手機兩屏翻頁 | 393×852 | `.app-shell__main` clientH 382／scrollH 763＝**恰好 2 屏**（江戶 505／1010 同）；`scroll-snap-type: y mandatory`；scrollTop 0→381 有吸附。第二屏可用：`大事/人物/成語` 130×65、`全年`/`12月` 44×44、`赤壁之戰 詳情` 93×44；撳「成語」內文確實改變（1836→1895 字；江戶 1906→1730 字）。「▾ 向下拖」提示喺第一屏 `::after`=`"▾ 向下拖：大事・人物・成語"`（opacity 1），掛喺 `> :first-child::after` 即**只屬第一屏** | `src/mobile.css:120-177` | 通過 |
| 2b | 滾動方式 | 393×852 | 地圖上**滾輪／滑鼠拖曳無法入第二屏**（scrollTop 恆 0）。根因：`Map2D.tsx:135-161` 對 `wheel` 用 `{passive:false}`+`preventDefault()`（滾輪＝地圖縮放，屬設計）。而 `.app-shell__main`／`.map-stage`／`.map-2d`／`.map-2d__zoom-layer` 嘅 `touch-action` 實測全部 `auto`，地圖亦冇 `touchstart` preventDefault → 真手指向下拖應由原生滾動進屏。**無頭瀏覽器注入唔到原生 touch，需真機覆核**（HU-07） | `src/components/Map2D.tsx:135-161` | 報告 |
| 2c | 兩屏翻頁 | 768×1024 | `display:grid`、`overflow-y:hidden`、snap `none`；地圖 x=0–402、側欄 x=402–768，**兩欄同時喺視口內**→ 冇翻頁需求，故無「向下拖」提示（斷點 ≤700px）屬正確設計 | `src/mobile.css:115-132` | 通過 |
| 3 | 地圖預設收合（HF-02 回歸） | 393×852（三視口一致） | 三國冷開：polygon **0**、path **0**、徽章 `圖層 圖層已關` → **無回歸 PASS**。平安 73 paths／`已開：勢力`；江戶 76 paths／`已開：勢力`；PRC 1 polygon＋5 paths／`已開：勢力、行軍` → 其他時代預設仍開（HU-02 產品決定，本輪冇郁） | `src/components/Map2D.tsx`、`src/components/map/MapLayerBar.tsx:47` | 通過（三國）／報告（其他） |
| 4 | 無橫向溢出 | 390×844 | 四頁 `documentElement.scrollWidth` 全部 **390 = innerWidth**、`OVERFLOW:false` | — | 通過 |
| 4b | 無橫向溢出 | 393／768／1440 | scrollWidth 393／768／1440，逐頁等於各自 innerWidth；橫向超出視口嘅節點全部落喺刻意可橫滑嘅容器（`nav[aria=中國時代]:auto`、`nav[aria=日本時代]:auto`，即朝代列橫滑），唔係漏出 | — | 通過 |
| 5 | innerText 簡體／粵語 scan | 393×852（三視口一致） | 掃描長度 1836／2717／1906／1668 字。**江戶 5 命中屬真洩漏**：`恢复`／`经营`／`试验`（「…把蝦夷地還給松前藩，恢复藩的经营；幕府在北方的直轄试验结束。」）。三國、平安 **0 命中**。PRC 嗰 1 命中 `解放` 係繁體同形正字 → **誤報**，已標記。粵語語氣字（嘅咗冇唔佢俾嗰嘢嚟哋啲咁噉㗎）四頁 **0 命中** | `src/japanEras/packs/edoPack.ts:780` | 報告（HU-03，資料檔非我邊界） |
| 5b | 同上（CSS 註解） | — | 上一輪遺留嘅 CSS 註解有簡體字，而 `audit:chars` **確實會掃 `.css`**：實測 `HARD src/mobile.css:369 线→線` 令閘門 `hard 0→1`（即本分支一度惡化）。已改正：`底线`→`底線`（:369）、`宁可`→`寧可`（:271）。修後 `audit:chars — 硬傷 0 處` | `src/mobile.css:271`、`:369` | **修** |
| 6 | console 冇錯誤 | 393／768／1440 | 4 頁 × 3 視口全部 `console` 空、`errors` 空 → **0 error、0 warning** | — | 通過 |
| 7 | URL `?y=` 同步 setYear | 393×852 | 冷開四頁 URL 年＝滑桿值（208/1156/1853/1949）。**拖滑桿**：四頁都寫入 URL（→244／1036／1767／1997）PASS。**點年刻度**：江戶 `y=1603` PASS、PRC `y=1951` PASS；**三國** state 已到 184 而 URL 仍 `y=208` FAIL、**平安** state 已到 1159 而 URL 仍 `y=1156` FAIL → HU-01 範圍由「淨三國」擴大為「三國＋平安」 | `src/state/YearContext.tsx`、`src/heian/state/HeianYearContext.tsx`（無 `announceTimeline`；對照 `src/japanEras/DeepDiveYearContext.tsx`、`src/imperial/state/ImperialYearContext.tsx` 有 call） | 報告（state 層非我邊界） |
| 8 | 對比率 WCAG AA | 393／768／1440 | 每頁抽 9 個主要 class，共 12 個「頁面×視口」組合。**唯一 FAIL**：`.app-footer` 用 `--accent-dim` #8a7355 對 `rgb(12,16,12)` 實測 **4.26:1 < 4.5**（該段出處說明 0.65rem≈10.4px 屬細字，必須守 4.5）。改 `#9e8564` → **5.47:1**（沿用上一輪 `.era-bar button` 同一個「AA 安全暗金色」；選中態 `--accent` #c4a574 仍較亮，層級不變；浅色版由 `html[data-theme='light'] .app-footer{color:var(--ink)}` 覆蓋，不影響）。修後 **12/12 FAIL=0**。`.side-rail__chip` 喺呢四頁未渲染（NOT_FOUND），已註明而非假裝通過 | `src/App.css:2666-2674` | **修** |
| 9 | 側欄收合重載後保留 | 393×852 | 冷開 storage 空 → 撳「顯示地圖」寫入 `sanguozhi-3d:sanguozhi-side-rail=0`／`heian-side-rail=0`／`deep-dive-edo-side-rail=0`／`imperial-side-rail=0`；`reload` 後 key 保留且 `.side-rail--collapsed` 仍 true → 四頁全 PASS | `src/lib/usePersistedOpen.ts:3-16,56,94` | 通過 |

### 本輪 commit 嘅小修（全部喺我邊界內，diff 為純新增 0 行刪除）

1. `src/mobile.css:242-259` — `.power-board__row--btn`、`.faction-legend__btn` 補 `min-height: var(--tap-min)`，圖例另補 `min-width`。實測 38→44、25→44、寬 43→44。
2. `src/mobile.css:261-266` — `.faction-legend__list` 加 `max-height: 40vh` ＋內部滾動。理由：江戶 5 顆掣加高大約多出 95px，唔設上限會撐出螢幕；實測圖例 `bottom=739`（視口 852）無溢出，`scrollH 142 = clientH 142`（無裁切）。
3. `src/mobile.css:334-349` — 平板帶（701–1024px）補同一組規則（768 實測 241×38、43~109×25 → 已達標）。
4. `src/App.css:2666-2674` — 深色 `.app-footer` 文字 #8a7355 → **#9e8564**（4.26 → **5.47**）。
5. `src/mobile.css:271`、`:369` — CSS 註解簡體改正（其中 `线` 係 `audit:chars` 實測 HARD 項，修後硬傷回 **0**）。

### 閘門（交付前）

`npm run build` EXIT 0｜`npm run lint` **70 warnings、0 errors**｜`npm run test` 全部通過｜`npm run audit:wiring` **fail 0、warn 0**（路由 app 26、殼層 16）｜`npm run gates` 見下方附註，`audit:chars` 硬傷 **0**（與基線一致）。無使用 `--update-baseline`。

#### 附註：`audit:wiki-links` 數字波動（已隔離證明唔係本分支造成）

第一次跑 `npm run gates` 曾報 `audit:wiki-links unvalidated 0 → 75`。我用 `git stash` 喺同一 worktree、同一環境做前後對照（腳本用 `trap` 保證一定 pop 返）：

| 狀態 | 結果 |
|---|---|
| 帶本輪 CSS 改動（單獨跑） | `連結 389｜死鏈 0｜未驗 0` |
| 乾淨 origin/main HEAD（單獨跑） | `連結 389｜死鏈 0｜未驗 50`，報錯 `zh.wikipedia.org 批次 7 重試 4 次仍失敗（50 條計為未驗）：Unexpected token 'Y', "You are ma"... is not valid JSON` |

即：該數字係 Wikipedia API **限流／網路瞬斷**（回傳「You are making too many requests…」而唔係 JSON），喺**乾淨 main 同樣重現**；本輪 diff 只係 `.css`，唔可能影響維基連結驗證；`dead=0` 喺兩種狀態一致。

