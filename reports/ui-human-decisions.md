# UI 人工決定清單（ui-audit）

本檔只列**需要人工拍板**的事項——即超出「CSS 數值／aria／預設布林」小修邊界、
或涉及內容資料與閘門的項目。小修（已直接 commit 的）一律記在 `reports/UI-AUDIT.md`。

格式：**影響 → 實證（可重現） → 建議 → 我需要你 yes/no 的具體一句**。

---

## HU-01（高）三國 App 嘅年份唔寫返去 URL，refresh／分享連結會跳返原位

- **影響**：用家喺三國深潛頁撳年份刻度（例如「280 滅吳」）、或以「播放」逐年推進、
  或由成語面板跳年之後，**重新整理會回到舊年**；share 出去嘅連結唔係佢睇緊嗰年。
- **實證（393×852，iPhone 15 模擬，2026-11-11）**：
  載入 `?c=china&e=sanguo&y=208` → `y=208`；撳「280 滅吳」刻度後
  `input.year-scrubber__range.value = "280"`，但 `location.search` 仍然係
  `?c=china&e=sanguo&y=208`（觀測 700ms／900ms 兩次皆然）。
  同一頁**拖滑桿**就會寫入（實測拖到 250 → URL 變 `y=250`，1.5s 後無被蓋返）。
- **源頭**：`src/App.tsx:354-377` 的 `UrlBridge` 只有兩條寫入路徑——
  (a) 掛喺 `document` 嘅 capture `input` 事件，且只認 `.year-scrubber` 以內嘅
  `input[type=range]`；(b) `onTimelineChange(...)` 訂閱各時代 context 嘅廣播。
  而三國深潛嘅 `src/state/YearContext.tsx` **完全冇呼叫 `announceTimeline`**
  （`grep -c announceTimeline src/state/YearContext.tsx` → `0`），
  所以凡不經 range input 嘅 `setYear` 都不寫 URL。
- **對照**：其他時代 context 都做咗這件事，例如
  `src/japanEras/DeepDiveYearContext.tsx:117`、`src/imperial/state/ImperialYearContext.tsx:135`、
  `src/bakumatsu/state/BakumatsuYearContext.tsx:110`。三國係唯一嘅例外。
- **建議**：喺 `YearContext` 照其他時代嘅寫法補兩步——`useEffect` 內
  `announceTimeline({ year, month })`；並以 `onTimelineChange` 訂閱，於 popstate
  時跟返 URL。要一并決定 `monthFilter`（三國嘅語意係「篩選」）應唔應該寫進 `?mo=`，
  因為其他時代嘅 `month` 係「該月」，語意唔同，亂寫會令分享連結含義漂移。
- **本輪新增證據（2026-11-11，範圍擴大）**：呢個唔係三國獨有。**平安都係**：撳「1159 平治」刻度後滑桿值已到 `1159`，但 `location.search` 仍然係 `y=1156`（實測）。同一測試江戶（→`y=1603`）、中華人民共和國（→`y=1951`）**會**寫入，所以受影響嘅係**三國＋平安**兩個 context：`src/state/YearContext.tsx`、`src/heian/state/HeianYearContext.tsx`（兩檔 `grep announceTimeline` 均為 0）。
- **請你決定**：`monthFilter` 要唔要跟 `?mo=`？（我唔改 `src/state/**`、`src/heian/state/**`，等你一句；修嘅話兩個檔案同一個寫法。）


## HU-02（中）冷開場圖層預設：只有三國收合，其他時代全部預設開色塊（HF-02 範圍問題）

- **現況（冷開 `localStorage.clear()` 後實測，四頁）**：

  | 頁面 | 色塊 polygon | 圖層徽章 |
  |---|---|---|
  | `?c=china&e=sanguo&y=208` | 0 | `圖層已關` |
  | `?c=japan&e=heian&y=1156` | 73 | `已開：勢力` |
  | `?c=japan&e=edo&y=1853` | 76 | `已開：勢力` |
  | `?c=china&e=prc&y=1949` | 2 | `已開：勢力、行軍` |

- **呢個唔係回歸**：HF-02 嗰個 commit（#130 `7b179b2`）嘅 diff **淨係**改
  `src/components/Map2D.tsx`（`useState(true)`→`false`），其餘時代地圖
  （`src/japanEras/EraMapView.tsx:141`、`src/imperial/components/ImperialMap.tsx:71-72`、
  `src/zhou/components/ZhouMap.tsx:84`、`src/qinhan/components/QinHanMap.tsx:80`、
  `src/sengoku/components/SengokuMap.tsx:42`）喺同一個 pack 入面**刻意保留** `true`。
- **但**：我本輪嘅檢查清單寫住「所有時代 App 冷開無色塊、無路線、無徽章」，
  同實作有出入；而日本時代嘅地圖本來就以勢力色塊為主體（平安 stage 嘅提示文字就係
  「底圖下方『圖層』開關色塊、路線、地名」），全部翻轉會令張圖變空白。
  呢個係產品決定，唔係 bug，所以我冇郁。
- **請你決定**：HF-02 嘅「預設收合」係淨係三國，還是要推及全部時代？
  若要推及，改動係上述 5 個檔案各一行 `useState(true)`→`false`（一行一個時代）。

## HU-03（中）內容層簡體字洩漏：`edoPack.ts:780`，而且 `audit:chars` 閘門睇唔到

- **實測**：`?c=japan&e=edo&y=1853` 渲染內文掃到 `试`，上下文：
  「复藩的经营；幕府在北方的直轄试验结束」。
- **來源**：`src/japanEras/packs/edoPack.ts:780` 的 `desc`：
  `...把蝦夷地還給松前藩，恢复藩的经营；幕府在北方的直轄试验结束。`
  → 應作「恢復藩的經營；幕府在北方的直轄試驗結束」（或依日語原文作「直轄経営／試験」之繁體對應）。
  同一段前半「還給松前藩」係正字，即係呢句係混入咗簡體書面語。
- **閘門盲點**：`npm run audit:chars` 回報「硬傷 0 處、待判 306 處」而家係綠；
  佢會報 edoPack 其他行嘅 `内`／`干`（視境字），但**完全冇提** 780 行嘅
  `恢复／经营／试验`。即係話閘門嘅字表或行過濾漏咗呢類常見簡體雙音節詞。
- **我冇郁**：內容資料同 `scripts/audit-*` 都唔喺我嘅邊界內。
- **請你決定**：(1) 邊個改法——「恢復藩的經營／直轄試驗」定保留日語字形？
  (2) 要唔要俾 `audit:chars` 加一批簡體雙字詞（恢复/经营/试验/关系/对于…）做硬傷？

## HU-04（低）地圖出處連結係行內文字鏈，觸控高 17px

- **實測**：`a`（`.map-2d__credit` 以內，無 class）393×852 下 381×17；
  佢係維基共享資源授權出處，屬法律要求嘅署名文字。
- **我冇郁**：要湊 44px 就要把成段署名變成一大塊按鈕，會蓋住地圖；
  呢類「行內引用文字」通常按 WCAG 2.5.8 的「equivalent／inline」豁免處理。
- **請你決定**：收受與否；若要改，建議挪到地圖以外嘅出處區（屬結構改動）。

## HU-05（低）年份刻度 13 顆維持細目標（既有豁免，本輪確認仍存在）

- **實測**：`.year-scrubber__tick` 最小 6×5，18 格密排；`<24×24` 嘅元素全部集中喺呢度。
- **現況**：`src/mobile.css` 註釋已明文記錄呢個豁免（精準操作由滑桿與方向鍵承擔），
  滑桿本身喺窄屏已補到 44px 高，方向鍵會觸發 `input`（即都係 URL 寫入路徑）。
- **我冇郁**，只係喺度註明：如果 HU-01 修好，呢度嘅可用性疑慮會再低一截。

## HU-06（中）頁頭「字級」掣寬度 26px：補到 44px 會令頁頭喺 393px 被裁走 11px

> 註：`src/mobile.css:272` 一直引用 HU-06，但上一輪報告只寫到 HU-05——呢條係本輪補寫，唔係新問題。

- **影響**：`.reading-controls button`（−／小／大／白底）喺 393×852 實測 **26×44**、**37×44**——高度已達 44px（上一輪補咗），**寬度未達**。用家撳「小／大」會撳唔實。
- **實證（本輪覆核）**：上一輪已試過補 `min-width: var(--tap-min)`，後果係 `.app-header__year-block` 由 369px 變 **392px**，而 393px 視口已無 slack → `scrollWidth` 393→**404**，「播放」按鈕會被 `.app-shell` 嘅 `overflow:hidden` 裁走 11px。即「修好觸控目標」直接換嚟「頁頭溢出＋控件被裁」，屬**兩難**，唔係一個 CSS 數值可以解決。
- **我冇郁**：要真正解決需要畝位（例如把字級掣收做一個選單、或允許 `.app-header__year-block` 換行、或將「白底」主題掣挪出頁頭），**呢啲係元件結構改動**。
- **請你決定**：揀邊個？(a) 字級掣收做下拉選單；(b) 頁頭允許換行（會推高頁頭、压缩地圖屏高度）；(c) 主題掣「白底」挪去側欄／頁尾。揀咗我先改。

## HU-07（中）手機版「向下拖入第二屏」需要真機覆核（自動化做唔到原生 touch）

- **背景**：第二屏（大事／人物／成語）係靠 `.app-shell__main` 嘅 `scroll-snap-type: y mandatory` 整屏翻頁（呢個設計就係為了修「地圖下面嘅內容翻唔到」而做，見 `src/mobile.css:115-119`）。
- **本輪量度到嘅兩面**：
  1. **容器本身冇問題**：clientH 382／scrollH 763＝恰好 2 屏；程式化 `scrollTop` 0→381 有吸附；第二屏嘅 tabs（130×65）、月份 chip（44×44）、「詳情」（93×44）全部可用，撳「成語」內文確實更新。
  2. **但**喺地圖上面用**滾輪／滑鼠拖曳**測試，`scrollTop` 恆為 **0**（入唔到第二屏）。根因：`src/components/Map2D.tsx:135-161` 對 `wheel` 用 `{passive:false}` + `e.preventDefault()`——即滾輪屬於地圖縮放，呢個屬設計。
- **我點解唔算佢係 bug**：`.app-shell__main`、`.map-stage`、`.map-2d`、`.map-2d__zoom-layer` 嘅 `touch-action` 實測**全部係 `auto`**，地圖亦冇 `touchstart` 的 `preventDefault`，所以真手指向下拖應由瀏覽器原生滾動進入第二屏。但**無頭瀏覽器無法注入原生 touch 事件**（`matchMedia('(pointer: coarse)')` 都係 false），所以呢一步我無法用自動化證明。
- **請你幫手**：用真手機開 `?c=china&e=sanguo&y=208`，喺地圖上向下滑一次，睇吓會唔會整屏落到「大事・人物・成語」。
  - 如果**會** → 呢項關掉，得返 HU-06。
  - 如果**唔會** → 地圖屏 100% 係地圖本身佔滿（`.map-stage` h=382 ＝ clientH 382），意味著**任何**手勢都從地圖開始，第二屏可能永遠搵唔到；修法要加一個非地圖嘅拖曳把手（屬結構改動），到時我先動工。


