# 交接紀錄（HANDOVER）

最後更新：2026-11-03。本檔給接手的 agent 讀，假設你沒有前一次對話的 context。

> **先讀 `docs/AGENT-BRIEF.md`（60 行）並跑它的三條暖身指令**，需要查歷史決策時再 grep 本檔對應小節，
> 不要整份讀本檔（1400+ 行）。本檔是決策與教訓的存檔，不是入口。

## 0. 這是什麼 repo

`/Users/ka-kinpoon/Documents/my-project/sanguozhi-3d` — 中日歷史互動地圖網站（Vite + React + TS，另有 r3f 3D 層）。
規則見 `AGENTS.md` 與 `.cursorrules`，重點：

- 介面文字一律繁體書面語（zh-Hant），不要簡體、不要口語。
- 每筆資料要有 `source`（《書名·卷／篇》）；有異說要 `disputed: true` + `note`。
- 不用《三國演義》情節當史實；正史以外要標明層級（通說／地圖集）。
- **commit 政策（2026-11-01 更新）**：要 commit。本 repo 已在 `main` 上累積 9 個 commit，
  下一個 agent 接手時請照常 commit（一個邏輯變更一個 commit，訊息寫清楚做了什麼與驗證結果）。
  舊版這裡寫「不要 commit」，那是上一輪的要求，已失效。
- **repo 結構**：git repo 的根是上層 `my-project/`，專案在 `sanguozhi-3d/` 子目錄
  （這名字是當初從 GitHub 下載 ZIP 留下來的，不是 clone 來的，所以沒有 upstream remote）。
  repo 根只放 `.github/workflows/audit.yml`、`.gitignore`、`README.md`；CI 要跑的是
  `sanguozhi-3d/` 裡的 npm scripts，workflow 已用 `working-directory` 處理。

常用指令：

```bash
npm run dev -- --port 5177 --strictPort   # 預覽（已在跑，http://localhost:5177/）
npm run build                              # tsc + vite build，目前 clean
npx tsc --noEmit -p tsconfig.app.json      # 只檢查型別
npm run audit:data                         # 三國專題（184–280）資料稽核 → docs/AUDIT.md
npm run audit:ranges                       # 疆域快照出處稽核 → reports/range-audit.md + .json
```

## 1. 本輪做的事：PLAN 的 `audit-ranges`（任務 1）

Cursor 的 plan 檔：`~/.cursor/plans/史實疆域與秦漢逐月_aa004c01.plan.md`，四項 todo：
`audit-ranges`（本輪）、`qinhan-months`、`jp-islands`、`lengthen-narrative`（後三項**未動**）。

目標：各朝疆域快照**只按有出處的年代著色**；沒有新記載的年份**沿用上一張並註明**，不為求逐年不同而改色。

### 1.1 資料層慣例（重要：欄位名是 `geometryFrom`，不是 `carryOverFrom`）

三套快照型別都加了這個欄位：

- `src/imperial/types.ts` → `ImperialSnapshot.geometryFrom?: number`
- `src/qinhan/data/territoryControl.ts` → `QinHanSnapshot.geometryFrom?`
- `src/zhou/data/territoryControl.ts` → `ZhouSnapshot.geometryFrom?`

語意：這張快照**實際畫的是另一年的邊界**（可早可晚）。範例：

- `src/zhou/data/territoryControl.ts:282` — 前260「長平」的色塊其實同前278 → `geometryFrom: -278`
- 元明清 1860／1911 → `geometryFrom: 1750`
- 共和國 1962／1978／1979／1997／2026 → `geometryFrom: 1951`
- 遼宋 1127 → 沿用 1141（後出邊界，介面會講「是後出的邊界，不是本年實況」）

### 1.2 共用提示模組

`src/lib/snapshotCarryOver.ts`：

- `carryOverNote(year, snapshot, formatYear?)` → 要顯示的整句，本年另有出處時傳回 `null`
- `describeCarryOver()` → `{ exact, beforeFirst, drawnYear, fromLaterYear, gapYears }`
- `carryOverBadge()`、`formatCarryOverYear()`（負數顯示「前221」）

已接進三個年份滑桿（在 `snapshot.note` 下面多一段 `.year-scrubber__carry`）：

- `src/qinhan/components/QinHanYearScrubber.tsx`
- `src/zhou/components/ZhouYearScrubber.tsx`（戰國尾逐段 `lateStage` 時不顯示，因為那是逐段而非沿用）
- `src/imperial/ImperialApp.tsx`（順帶把快照 label／source／note 顯示在滑桿下）

CSS：`src/App.css` 的 `.year-scrubber__carry`。

實測（agent-browser，2026-11-01）：

| 頁面 | 年份 | 顯示 |
|------|------|------|
| `#/china/han` | 前150 | 本年無新的疆域記載，沿用前202年快照「西漢初」；色塊與該年相同，不是本年實測。 |
| `#/china/chunqiu` | 前600 | 本年無新的疆域記載，沿用前632年快照「城濮後」… |
| `#/china/prc` | 1970 | 本年無新的疆域記載，色塊沿用1951年測繪的邊界；1962年快照「中印邊境戰爭」本身也沒有新的記載。 |

### 1.3 稽核腳本 `scripts/audit-ranges.ts`

跑 `npm run audit:ranges` → `reports/range-audit.md`（人讀）+ `reports/range-audit.json`（預覽頁讀）。
**只讀稽核，不改座標。** 用 Vite SSR 載入 `src/`（`src` 內的 import 沒有副檔名，`node --experimental-strip-types` 直接 import 會失敗，所以一定要經 `createServer().ssrLoadModule`）。

規則（code → 級別）：

1. `source-missing` / `source-format`（fail/warn）— 快照要有非空 `source`，含《書名》；「通說／地圖集」層級若已標 `disputed` + `note`，降為 `source-atlas`（info）。
2. `note-missing` / `note-thin`（fail/warn）— `note` 少於 40 字視為沒交代限度。
3. `disputed-without-note`（fail）。
4. `snapshot-unsorted` / `snapshot-out-of-range`（fail）— 解析器（`resolveImperialSnapshot`、`qinHanSnapshotForYear`、`zhouSnapshotForYear`）靠**升序**提前中斷，排序錯會沿用錯年。
5. `ring-id-unknown` / `empty-range`（fail）— 色塊的環編號要存在於 `src/geo/eraRegions.ts`。`cover()` 現在會回傳 `ids` 與 `missingIds`（見 `src/geo/eraCover.ts`），缺號不會靜默變空圖。
6. `carry-over-target-missing`（fail）— `geometryFrom` 指向的年份要在同一包有快照。
7. `anachronism`（warn）— 政權號早於建立年（表 `ANACHRONISM`）。已修：960／1004 年改畫「定難軍」而非「西夏」（`src/imperial/data/realmRanges.ts:239-252`）。
8. `indirect-control-overreach` / `monolith-realm-unqualified`（warn）— 都護府、羈縻州、朝貢國、草原、青藏（`NON_DIRECT_IDS`）不得塗成正統王朝的直轄色塊，除非 `disputed: true` 且 `note` 講明限度（詞表 `LIMIT_WORDS`：都護／羈縻／朝貢／土司／不畫／不上色／非編戶／示意／爭議／未設／不是郡縣／不上／留白／不是行省）。
9. `geometry-reuse-undeclared`（fail）— 相鄰兩張快照幾何完全相同時，後一張要標 `geometryFrom`。
10. `coverage`（info）— 各包快照數 vs 年份跨度。

**目前狀態：fail 0、warn 0、info 24（75 張快照、11 個包）。**

### 1.4 預覽頁

`src/audit/RangeAuditPage.tsx` + `src/audit/rangeAudit.css`，網址 **`http://localhost:5177/#/audit/ranges`**。
內容：沿用提示模擬器（選包＋年份，顯示滑桿會講什麼）、各包覆蓋表（`↩` = `geometryFrom`）、問題明細（可按級別／code 過濾）。

為了讓預覽連結可直接分享，`src/state/TopicContext.tsx` 加了 hash 路由：`#/china/han`、`#/japan/sengoku` 等，並監聽 `hashchange`（貼連結／前後退都會切畫面）。`EraBar` 末端多一個「疆域稽核」連結。


### 1.5 本輪改過的檔案

新增：

- `scripts/audit-ranges.ts`（疆域快照稽核）
- `src/lib/snapshotCarryOver.ts`（沿用提示）
- `src/audit/RangeAuditPage.tsx`、`src/audit/rangeAudit.css`（預覽頁）
- `reports/range-audit.md`、`reports/range-audit.json`（產物）
- `docs/HANDOVER.md`（本檔）

修改：

- `package.json` — 加 `audit:ranges` script
- `src/geo/eraCover.ts` — `cover()` 保留 `ids`／`missingIds`，另有 `rangeRingIds()`、`sameRingSet()`
- `src/imperial/types.ts`、`src/qinhan/data/territoryControl.ts`、`src/zhou/data/territoryControl.ts` — 快照型別加 `geometryFrom`（部分包已填值）
- `src/qinhan/components/QinHanYearScrubber.tsx`、`src/zhou/components/ZhouYearScrubber.tsx`、`src/imperial/ImperialApp.tsx` — 顯示沿用提示
- `src/App.css` — `.year-scrubber__carry`、`.era-bar__audit`
- `src/App.tsx`、`src/state/TopicContext.tsx`、`src/components/EraBar.tsx` — hash 路由與稽核頁入口
- 資料 `note` 補限度說明：`src/imperial/data/suiPack.ts`、`liaosongPack.ts`、`yuanMingQingPack.ts`、`prcPack.ts`、`tangPack.ts`、`src/qinhan/data/territoryControl.ts`（並把 589／660／701／1004／1279／1271／1420 等極盛快照標 `disputed: true`）
- `src/imperial/data/realmRanges.ts` — 960／1004 年改畫「定難軍」（1038 年才有「西夏」國號）

## 1B. 任務 2（`qinhan-months`）：秦漢前221–183 逐月 — 已做

做法照幕末（`src/bakumatsu/data/territory.ts` 的 `MONTH_NOTES` + `monthControl()`），不是另起一套。

新增 **`src/qinhan/data/monthAxis.ts`**：

- `QINHAN_MONTH_ZOOM = { from: -221, to: 183 }` — 整個秦漢專題都在逐月。
- **歲首**：秦及漢初行顓頊曆，**以十月為歲首**，《資治通鑑》沿用這個紀年，所以前104年以前的月份順序是
  十月→十一月→十二月→正月→…→九月；`TAICHU_CALENDAR = -103` 之後由正月排起。
  `qinHanMonthOrder(year)` 負責順序，`monthOrdinal(year, month)` 負責比較。
- **閏月**：秦漢曆寫「後九月」，不寫「閏九月」。只收有出處的一年（前205 後九月，《資治通鑑》卷九）。
  內部用負數 slot（`-109` = 該年閏九月）避免與九月撞鍵。其餘年份的閏月要查陳垣《二十史朔閏表》才補。
- `QINHAN_MONTH_RECORDS`：**50 條**有月份的條目，全部對得回原典的月字
  （前209–前195 一段 26 條，前180–168 一段 24 條，見 §1G）
  （《資治通鑑》卷九·漢紀一 逐月；《史記》卷七·項羽本紀、卷八·高祖本紀）。
  每條有 `note` + `source`；月次有異說的標 `disputedDate: true`（前202 十月 臧荼反、前207 十月 劉邦入關）。
- `territoryFrom`：**月份不能新畫邊界**，只能指定「從本月起改用哪一年的既有快照」。
  目前兩處：前206 十月 → 前214「略取嶺南」（秦形勢，二月才分封）；前206 二月 → 前206「楚漢」（項羽分天下王諸將）。

接進 **`src/qinhan/state/QinHanYearContext.tsx`**：`month`、`monthLabel`、`monthNote`、`monthRecord`、
`setMonth`、`stepMonth`、`stepYear`；`snapshot` 走 `qinHanTerritoryFromMonth(year, month) ?? year`。
播放鍵仍是**按年**步進（404年×12月＝4861個月，逐月播放要一小時，故不自動跑月）。

UI **`src/qinhan/components/QinHanYearScrubber.tsx`**：月份條（上一月／本月／下一月、12–13 個月份刻度、
有專條的月份加黑點）、專條本文＋出處、無專條時顯示「本月無專條：…色塊沿用X年快照」，
以及歷書註（歲首、不換算西曆）。CSS 在 `src/App.css` 的 `.month-bar*`。

年表 **`src/qinhan/components/QinHanTimeline.tsx`**：標題改成「前206 二月 大事」，
副標顯示「本月專條：…」或「本月無專條——色塊不因換月而改畫」；
條目加月份徽章（`二月`／`僅紀年`，本月符合的加 `is-now`）；同年事件按該年歷書順序排。
`src/qinhan/data/timeline.ts` 加了 `month?`／`datePrecision?`／`disputedDate?`，
已填的 5 條：陳勝（前209 七月）、劉邦入關（前207 十月，有異說）、項羽分封（前206 二月）、
彭城（前205 四月）。

稽核加進 `npm run audit:ranges`（規則 11–12）：月份條目要有《書名》出處與 note、
月份要在該年歷書順序內、`territoryFrom` 只能是既有快照年、閏月要有史書稱法出處。
**目前 fail 0、warn 0。**

### 任務 2 還剩什麼

1. **補更多有月份的條目**。已核過出處：前209–前195（26 條）＋前180–168（24 條，見 §1G）。
   仍未核：《資治通鑑》卷八（秦紀三，巨鹿、項梁之死）、卷十一–十二（河西、漠北）、
   《漢書》帝紀的災異與詔令、《資治通鑑》漢紀末（黨錮以後；黃巾在184年，已過本專題下界）。
   核到才填，月次不一致的標 `disputedDate`。
2. **閏月**：只有前205 有。要按陳垣《二十史朔閏表》補前221–183 的閏月，才有完整的 13 月年。
3. **月份級快照**：`territoryFrom` 現在有四條（前202、8、25、36），仍全部指向既有快照年。
   楚漢之間若核到某月某地易手（例如前205 八月後雍地入漢、前205 九月魏地入漢），
   先在 `territoryControl.ts` 加有出處的快照年／幾何，再讓月份指向它。
4. **秦漢以外**（周、帝國包、日本）尚未接月份；`src/lib/monthZoom.ts` 仍是三國／幕末在用。


## 1C. 任務 3（`jp-islands`）：北海道與沖繩入鏡 — 已做

PLAN §3 三件事：(a) 江戶／幕末／明治至當代改用 `contain`，(b) 幕末 1868–69 不把全道塗成已征服，
(c) 1945–72 沖繩美治要講明。

### 取景

`src/japanHistory/components/JapanEraMap.tsx`：`useMapViewport(..., 'cover')` → **`'contain'`**，
SVG `preserveAspectRatio` 由 `slice`（= cover 裁邊）改 **`meet`**。
德川江戶與明治至當代都走這個元件，所以兩邊一起修好。
（`src/japanEras/EraMapView.tsx` 本來就是 `contain` + `meet`，不用改。）

### 時間窗改成資料驅動

新增 **`src/geo/japanFringeWindows.ts`**：`JP_FRINGE_WINDOWS`，每窗有
`from/to`、`ring`（matsumae／hokkaido／ryukyu）、`mode`、`label`、`source`、`note`、`disputed`。

| 窗 | 年 | 線 | 出處 |
|----|----|----|------|
| 松前（交易領） | 1604–1868 | 虛線 | 『徳川実紀』家康公記；松前氏黑印状（慶長9年） |
| 琉球（薩摩附庸） | 1609–1871 | 虛線 | 『島津国衆軍前軍忠次第』；『琉球国旧記』 |
| 北海道（開拓使） | 1869–現在 | 實色 | 『開拓使設置』太政官達（明治2年） |
| 沖繩縣 | 1879–1944 | 實色 | 『琉球藩処置』太政官達（明治12年） |
| 沖繩（施政權在美國） | 1945–1971 | 虛線 | 『日本国との平和條約』第3條（1952生效）；『琉球諸島及び大隅諸島に関する…協定』（1972生效） |
| 沖繩縣（歸還後） | 1972–現在 | 實色 | 同上協定 昭和47年5月15日発効 |

規則：**虛線＝不是行政直轄**（交易領、附庸、外來施政），**實色＝進入國家行政**（開拓使、沖繩縣）。
`fringeIsDashed(mode)` 是唯一判斷點。

`src/japanEras/JapanEraRingOverlays.tsx`：
`JapanOverviewFringeOverlays` 與 `BakumatsuFringeOverlays` 都不再寫死年份，改讀 `fringeWindowsAt(year)`。
幕末那個函數**過濾掉 `admin` 窗**，所以幕末圖只有 松前＋琉球 虛線，
1868–69 的箱館戰爭仍靠渡海箭咀與函館／五稜郭敘事（`src/bakumatsu/data/history.ts:189`
「北海道未另著色」），全島色塊只在「明治至當代」出現。

`JapanEraMap` 的地圖說明改成列出**該年适用的窗**（年份、label、範圍示意標記、note、出處），
加圖例 `JP_FRINGE_LEGEND`。CSS：`.era-map__fringe-notes`。

### 稽核（規則 13）

`npm run audit:ranges` 會檢查：每窗要有出處（《》或『』）與 note、環要存在於 `japanEraRings.ts`、
`from ≤ to`、附庸／外來施政必須虛線、行政直轄必須實色、同一環的窗不得重疊
（這條抓到 1945–1972 與 1972–2026 在 1972 重疊，已改成 1945–1971）。

### 任務 3 還剩什麼

1. **1872 琉球藩**沒有單獨窗（現在 1609–1871 附庸、1879 起縣，中隔 1872–1878 無色）。
   要補就要有出處（『琉球藩処置』明治5年）；或把附庸窗延到 1878 並在 note 寫 1872 設藩。
2. **開拓使的轄區**現在用 CODH K75–K85 全島環作「行政示意」。1869–1886 的開拓使實際管轄
   （北海道＋千島＋樺太一部分）與全島不同，要嘛換環，要嘛在 note 講明差距。
3. **1945–1952** 現在同一個「美治」窗（和約 1952 才生效）。若要分開「占領」與「施政权委付」，
   要再加一個窗與出處（SCAPIN 指令等）。
4. 幕末圖的**渡海箭咀**只有 1869 一條（`history.ts`）；1868 戊辰戰爭的東北／箱館路線尚未畫全。


## 1D. 任務 4（`lengthen-narrative`）：加長敘事，只加有出處的一邊 — 已做

### 真正的毛病不是「層太少」，是同一句被用三次

`src/imperial/data/depth.ts` 的 `ev()` 把 `desc` 同時塞進 `course` 與 `classicQuote`，
`outcome` 又直接等於 `university`。詳情窗（`src/components/ClassicDetailModal.tsx`）
因此把同一句顯示三次。大學層本身其實已有 180–220 字，只有兩條唐條目是 23–31 字。

### 做法

新增 **`src/imperial/data/depthNarrative.ts`**：`DEPTH_NARRATIVE`，按事件 id 補
`course`（過程）、`outcome`（結果與地圖限度）、`paraphrase`（意譯，不假稱原文）。
**44 條事件全部補齊**，措辭互不相同。

`depth.ts` 末端把匯入拆開：原本的物件改名 `RAW_DEPTH_EVENTS`，
`export const DEPTH_EVENTS` 改為 `Object.fromEntries(...)` 合併敘事，
所以 `course`／`outcome`／`classicQuote` 不再等於 `desc`。

另外：
- `tang-756-luoyang`、`tang-759-luoyang` 的大學層由 23–31 字擴到 200 字上下，
  寫明《通鑑》卷次、舊曆月份（陷洛在十二月、入洛在閏十月）與「色塊只表示駐軍易手」的限度。
- `ls-1141` 的 `desc` 原本寫「岳飛被殺在此前」，與《宋史·高宗紀》的月日順序相反
  （和議成於十一月，岳飛死於十二月廿九日），已改成「岳飛死於和議既成之後」。
- 敘事一律**不引原文**，只寫意譯並標出所據紀、傳，避免假造引文。

### 日本側（PLAN §4 的條目清單）

`src/japanHistory/data/timeline.json` 由 50 條增至 **52 條**：
- **1637 島原・天草一揆**（《德川實紀》家光公記寬永十四至十五年；島原藩・天草領屋敷文書）
- **1868 戊辰戰爭（鳥羽伏見至箱館）**（《復古記》；《政府實錄》明治元年條）

另外 12 條 1603 年以後的條目原本沒有 `note`，全部補上（年份換算、條約簽署與生效之別、
保護領與併吞之別、改元不涉疆域等）。現在 **1603 年以後 25 條全部有 `source` 與 `note`**。

### 稽核（規則 14、15）

`npm run audit:ranges` 新增：
- 規則 14：每條 `DEPTH_EVENTS` 要有敘事筆；`course`／`outcome`／`paraphrase` 不得等於 `desc`；
  少於 40 字報 `narrative-thin`；大學層少於 150 字報 `university-thin`；缺 `source` 為 fail。
- 規則 15：日本年表每條要有 `source`（書名、條約名、制書名或通說）與 `desc`；
  1603 年以後要有 `note`。

結果：**fail 0、warn 0、info 28**（`narrative-coverage` 44 條、`jp-timeline-coverage` 25 條）。

### 任務 4 還剩什麼

1. `DEPTH_PEOPLE` 的人物 `summary` 仍是一行。PLAN 明言人物不做三層語譯，
   除非該頁已有語譯欄位 —— 要動之前先確認 `ImperialPeople` 的渲染有沒有三層。
2. ~~元明清、民國、新中國各條的 `source` 仍是「通說」級別~~ —— **已做，見 §1E**（規則 16 已把
   「只有通說」變成 warn，233 條出處全部點名）。
3. 周、戰國、日本各包（`japanEras/packs/*`）的敘事不在 `DEPTH_EVENTS` 之內，
   規則 14 目前只覆蓋帝國包（晉至共和國）；規則 16 目前也只走帝國包，
   周／秦漢／日本各包的人物與簡介出處尚未納入。


## 1E. 追加：把「××通說」升級成點名出處（規則 16）

用戶接手後的第一項升級。`source: '近代史通說'` 這種寫法不是出處，只是「我聽人說的」。

### 改了什麼（70 + 6 條）

| 檔 | 原本 | 現在 |
|----|------|------|
| `depth.ts` 元明清、民國、新中國 12 條 | 清史通說／近代史通說／當代史通說 | 《清太祖武皇帝實錄》《滿文老檔》《明神宗實錄》；《清聖祖實錄》＋施琅《恭陳海疆棄留疏》＋《清史稿·施琅傳》；《清文宗實錄》＋《剿平粵匪方略》＋《天朝田畝制度》；《明太宗實錄》；《明英宗實錄》；《宋史·瀛國公紀》；《政府公報》＋来新夏《北洋軍閥史》；《北伐宣言》＋中國第二歷史檔案館藏國民革命軍檔案；國聯《李頓報告書》＋《日本外交文書》；《終戰詔書》＋《降伏文書》＋《雙十協定》；《共同綱領》＋《中蘇友好同盟互助條約》；十一屆三中全會公報 |
| `minguoPack.ts` 事件 5 條 | 近代史通說 | 《中華民國臨時政府組織大綱》＋《清帝退位詔書》；《政府公報》＋郭廷以《中華民國史事日誌》；来新夏《北洋軍閥史》＋《申報》；《北伐宣言》＋張學良易幟通電；防衛省防衛研究所《中國陸軍作戦》 |
| `minguoPack.ts` 派系簡介 20 條、人物 30 條 | 近代史通說 | 軍閥各系 → 来新夏《北洋軍閥史》＋郭廷以《中華民國史事日誌》；國民黨 → 郭廷以＋《北伐宣言》；共產黨 → 中共中央黨史研究室《中國共產黨歷史》第一冊；日軍 → 防衛省《中國陸軍作戦》；盛世才、噶厦、新疆地方 → 郭廷以＋通說 |
| `prcPack.ts` 事件 7 條、簡介 2 條、人物 2 條、快照 6 張 | 當代史通說 | 十七條協議（1951年5月23日）；三中全會公報；《鄧小平文選》第二冊；《中英聯合聲明》（1984）＋《香港基本法》（1990）；《中葡聯合聲明》（1987）＋《澳門基本法》（1993）；《中華人民共和國憲法》（1954）；《中華人民共和國行政區劃簡冊》（民政部） |
| `yuanMingQingPack.ts` 事件 3 條、簡介 5 條、人物 4 條 | 明史、清史通說 | 《明史·莊烈帝紀》《李自成傳》＋《清世祖實錄》；《南京條約》＋《清宣宗實錄》；《鄂州約法》＋《清帝退位詔書》；《清實錄》《清史稿》；《明實錄》《明史》；吳偉業《綏寇紀略》 |

原則是**通說可以並列，不能是唯一出處**：拿不準的地方（盛世才、噶厦、1962、1979）保留「通說」二字，
但前面一定要有一個能翻得到的書名或條約名。

### 規則 16

`npm run audit:ranges` 現在會走每一包的**快照、事件、派系簡介、逐年人物**，
`source` 沒有《》或『』就報 `source-generic`。本輪結果：
**233 條出處點名，0 條未點名**（`source-naming` info）。

### 教訓（已寫進 §5）

批量改 `source` 一定要**按區塊判斷**，不能只看「最近一個事件 id」：
第一版腳本把 `profiles` 與 `leadersByYear` 的出處跟著上一個事件走，
結果 粵系、新疆地方 拿到防衛省《中國陸軍作戦》，毛澤東拿到《中葡聯合聲明》。
改完要用 dump 腳本逐條讀一遍，不要只信 grep 的計數。


## 1F. 追加：規則 16 延伸到日本各包，並把維基出處清掉

### 覆蓋面擴大

`scripts/audit-ranges.ts` 的規則 16 現在除帝國 11 包之外，也走 **japanEras 六包**
（`kofunPack`、`asukaPack`、`naraPack`、`kamakuraPack`、`muromachiPack`、`azuchiPack`）的
`events`／`people`／`situation`／`leadersByYear`／**`routes`（行軍路線）**。
新增 code **`source-wiki-only`**：出處只有百科全書（維基／Wikipedia）而沒有點名原典 → warn。

第一次跑這條規則，立刻抓出 **fail 30、warn 63**：
其中 30 個 fail 是誤報（派系簡介的出處存在 `politics.source` 等子欄，不是頂層 `source`），
已把讀法改成 `source ?? politics.source ?? economy.source ?? military.source`。
教訓：**新加稽核先跑一次看誤報**，不要直接改資料。

### 改了 131 條出處（233 → 364 條點名，未點名 0）

| 包 | 原本 | 換成 |
|----|------|------|
| kofun | 日本古代史通說 | 『日本書紀』（應神・仁徳紀，標『追述』）、『古事記』（和銅4年，712）、『宋書·倭國傳』倭五王條、『出雲風土記』（天平5年，733）、『稲荷山鉄剣銘文』（武寧王紀年銘，1968年出土）、考古編年（古墳型式學） |
| asuka | 日本古代史通說 | 『日本書紀』推古・敏達・用明天皇紀、『隋書·倭國傳』大業三年條、『上宮聖徳法王帝説』 |
| nara | 日本古代史通說 | 『續日本紀』（聖武・神護景雲・延暦條）、『養老令』（養老2年，718）、『東征伝』 |
| kamakura | 日本中世史通說 | 『吾妻鏡』、『愚管抄』（慈円）、『保暦間記』、『園太暦』、『八幡愚童訓』、『蒙古襲来絵詞』（13世紀後期） |
| muromachi | 日本中世史通說 | 『梅松論』、『花営三代記』、『建武式目』（延元元年，1336）、『園太暦』、『太平記』（標軍記）、『應仁記』（標軍記） |
| azuchi ＋ `src/sengoku/data/factionSituation.ts`（51 條）＋ `marchRoutes.ts`（16 條） | 中文維基「×」／日本戰國通說 | 『信長公記』（太田牛一）、『言経卿記』、『甫庵太閤記』（標軍記）、『甲陽軍鑑』（標『軍記，史料価値に爭い』）、『慶長記』（実徳寺慶保）、『関原軍記大成』（標軍記）、『小田原衆所領役帳』、『陰徳永日』、『關八軍記』（標軍記）、『名将記』（小瀬甫庵）、『島津家文書』、『征韓録』（標軍記）、『徳川実紀』 |
| 只有「地圖圖例」的條目 | 地圖圖例 | 『CODH 旧国・旧郡境界データセット』；地圖圖例 |

兩條原則：
1. **軍記要標軍記**。『甲陽軍鑑』『太平記』『甫庵太閤記』『關八軍記』『征韓録』都是軍記物，
   不是實錄；『甲陽軍鑑』另標「史料価値に爭い」，因為它的史料地位本身有爭議。
2. **神話紀年要標追述**。古墳時代引『日本書紀』應神・仁徳・神武紀時一律寫「の追述」，
   並列考古編年，不把書紀紀年當成實錄（與 `timeline.json` 第一條的立場一致）。

### 結果

```
source-naming · imperial（11 包）＋japanEras（6 包） — 364 條出處點名；未點名 0 條
audit:ranges — fail 0, warn 0, info 23
```

瀏覽器實測：`#/japan/kamakura` 1281（弘安之役）→ 頁面出現『八幡愚童訓』『保暦間記』✓

### 還剩什麼

- `src/bakumatsu/data/*`（幕末詳圖的事件與藩）與 `src/sengoku/data/territory*` 不在規則 16 的走查裡。
- `src/imperial/data/depth.ts` 的 `DEPTH_PEOPLE` 人物 `summary` 仍是一行（見 §1D）。
- 周、秦漢各包（`src/zhou/data`、`src/qinhan/data`）的出處本來就是《史記》《漢書》
  《資治通鑑》、何尊、殷墟甲骨這一級，規則 16 走過去也不會報。


## 1G. 追加：秦漢逐月專條 26 → 50 條（前180–168 一段補齊）

任務 2 原本只核到前195年，前195年以後的 379 年完全沒有月份條目。這一輪補 **24 條**，
全部對得回帝紀／列傳的月字：

| 年 | 月 | 條目 | 出處 |
|----|----|------|------|
| 前202 | 十二月 | 垓下之戰，項羽死 | 《資治通鑑》卷十·漢紀二；《史記·項羽本紀》《高祖本紀》 |
| 前180 | 八月／十一月 | 誅諸呂／代王即皇帝位（文帝） | 《漢書·高后紀》《文帝紀》；《通鑑》卷十三 |
| 前154 | 十月／三月 | 吳楚七國舉兵西向／周亞夫破吳楚 | 《漢書·景帝紀》三年；《史記·絳侯周勃世家》；《通鑑》卷十六 |
| 前119 | 四月 | 衛青、霍去病分道出塞 | 《漢書·武帝紀》元狩四年；《史記·衛將軍驃騎列傳》 |
| 前91／前87 | 七月／二月 | 巫蠱獄起，太子據敗／武帝崩五柞宮 | 《漢書·武帝紀》；《武五子傳》；《通鑑》卷二十二、二十六 |
| 前74 | 六月／七月 | 廢昌邑王／病已即皇帝位（宣帝） | 《漢書·霍光傳》《宣帝紀》；《通鑑》卷二十五 |
| 前33 | 正月 | 呼韓邪單于來朝，賜王牆 | 《漢書·元帝紀》；《漢書·匈奴傳下》 |
| 前8 | 六月 | 哀帝崩，王莽復輔政 | 《漢書·哀帝紀》《王莽傳上》；《通鑑》卷三十五 |
| 8 | 正月 | 王莽即真，改元始建國 | 《漢書·王莽傳中》；《通鑑》卷三十六 |
| 23 | 六月／十月 | 昆陽之戰／長安破，王莽死 | 《後漢書·光武帝紀》《王莽傳下》；《通鑑》卷三十九 |
| 25 | 六月 | 光武即位于鄗，改元建武 | 《後漢書·光武帝紀》建武元年六月己未；《通鑑》卷四十 |
| 27／36 | 正月／十一月 | 赤眉降于宜陽／吳漢拔成都，公孫述死 | 《後漢書·光武帝紀》《公孫述傳》 |
| 57／73 | 二月 | 光武帝崩／竇固出敦煌擊伊吾，班超行西域 | 《後漢書·光武帝紀》《明帝紀》《班超傳》 |
| 121／125 | 三月 | 鄧太后崩／安帝崩于葉 | 《後漢書·安帝紀》《和熹鄧皇后紀》 |
| 159／168 | 八月／十月 | 誅大將軍梁冀／竇武、陳蕃敗死 | 《後漢書·梁冀傳》《竇武傳》《陳蕃傳》；《通鑑》卷五十四、五十六 |

三條紀律：

1. **月次有異說就標 `disputedDate`**：前154 三月（《漢書》與《通鑑》卷十六小異）、
   前91 七月、23 十月（莽死月次諸書不一）。
2. **`territoryFrom` 只指向已有快照年**：新增四條（前202、8、25、36），
   沒有為任何月份新畫邊界。前119、前33、73 這類塞外之戰明確寫「不畫成郡縣」。
3. **沒有月的著名事件仍留在年級**：巨鹿之戰、井陘之戰、外戚專政的整體過程等，
   不因為要填滿月份而編造月次。

驗證：`audit:ranges` 規則 11 全過（fail 0、warn 0），`month-coverage` 現報 **50 條**；
瀏覽器實測 `#/china/han`：前154 十月顯示七國舉兵（歲首從十月排起）、
25 六月顯示光武即位並改畫25年快照、100 正月顯示「本月無專條，色塊沿用36年快照」✓


## 1H. 追加：「結果與影響」改成大學生程度論述（三國 28 條已做）

詳情窗（`src/components/ClassicDetailModal.tsx`）的「結果與影響」原本是一兩句摘要
（平均 34 字）。本輪把三國 28 條全部改寫為**三段式論述**，並加一條可覆核的依據：

1. **直接結果**：以原典的年月與人名落實（例：官渡之後 205–207 年取冀青幽并）。
2. **結構性影響**：制度、戶口、邊防、人才流動（例：九品官人法、州牧制、淮南屯田、徙民）。
3. **史學討論**：數字存疑、異說、近人解釋（例：袁紹「十萬」為號稱；赤壁之敗多因疫病；
   「七擒七縱」僅見裴注引《漢晉春秋》）。

新增欄位 `outcomeSource`（`TimelineDetail`／`ClassicDetailContent`），在詳情窗以
「結果與影響之依據：…」顯示，點名原典、政書與研究書——
田餘莊《東晉門閥政治》、唐長孺《魏晉南北朝隋唐史三論》《孫吳的建國和江南開發》、
呂思勉《三國史話》《兩晉南北朝史》、閻步克《品位與職位》、余英時《士與中國文化》、
錢穆《國史大綱》、顧祖禹《讀史方輿紀要》、陳垣《二十史朔閏表》、譚其驤主編《中國歷史地圖集》等。
百科全書只留在「延伸閱讀」，不作為依據。

改動：
- `ClassicDetailModal.tsx`：`outcome` 以空行分段渲染，並顯示「大學生程度論述 · N 字 · 約 X 分鐘」
  （每分鐘 250 字估算）；新增 `outcomeSource` 一段。
- `App.css`：`.event-detail__outcome p + p`（分段縮排）與 `.event-detail__outcome-meta`。
- `src/data/timelineDetails.ts`：28 條 outcome 全部重寫，平均 **516 字（約 2.1 分鐘）**。
- `scripts/audit-ranges.ts` 規則 19（`outcome-depth`）：少於 400 字 → `outcome-thin`；
  只有一段 → `outcome-one-paragraph`；無依據或依據未點名書名 → `outcome-source-missing`／
  `outcome-source-generic`／`outcome-source-wiki`。另以 `outcome-backlog` 列出其他包的達標率。

驗證：`audit:ranges` fail 0、warn 0、info 26，`outcome-depth` 報 **28/28 達標**；
`audit:data` 仍是 fail 0、warn 63（未新增警告）；`tsc` 與 `npm run build` 通過；
瀏覽器實測 `#/china/sanguo` → 208 赤壁之戰：meta 顯示「576 字 · 約 2.3 分鐘」、四段、
依據列點名《江表傳》、唐長孺、顧祖禹 ✓

### 規則 19 的待辦：**已全部完成**（249 條）

已達標（四段、≥400 字、依據點名書名），按 `outcome-depth`：
**三國 28/28**（516 字）、**周 81/81**（491）、**秦漢 21/21**（447）、**戰國（日本）13/13**（471）、**幕末 15/15**（472）、**平安 9/9**（468）、**帝國包 44/44**（473）、**帝國包各包自帶事件 38/38**（464）。
`outcome-backlog` 現在報：「所有包的『結果與影響』都已補點名依據並達標」。

檔案對應：`data/timelineDetails.ts`（三國）、`zhou/*`（81）、`qinhan/data/timeline.ts`（21）、`sengoku/data/timelineDetails.ts`（13）、`bakumatsu/data/history.ts`（15）、`heian/data/history.ts`（9）、`imperial/data/depthNarrative.ts`（44）、`imperial/data/{jin,nanbei,sui,tang,wudai,liaosong,yuanMingQing,minguo,prc}Pack.ts`（38）。

**注意帝國包有兩層事件**：`ImperialTimeline` 的事件清單是 `[...pack.events, ...DEPTH_EVENTS[pack.id]]`，即各包自帶事件（38 條，詳情窗以 `outcome ?? university` 顯示）與 `depthNarrative.ts` 的 44 條是兩批。規則 19 原本只掃 `DEPTH_NARRATIVE`，會漏掉那 38 條；本輪已把它們加入 `outcomePacks`（label「帝國包（各包自帶事件）」），否則「全部達標」的結論只覆蓋 44 條。

`outcomeSource` 的接線（本輪補齊）：`imperial/types.ts`、`imperial/data/depth.ts`（把 narrative 的 `outcomeSource` 套到事件）、`ImperialTimeline.toDetail`、`qinhan/data/timeline.ts` 介面、`QinHanTimeline`、`japanEras/types.ts`（`EraDetail`）、`EraTimeline`、`sengoku/data/timelineDetails.ts` 介面、`SengokuTimeline`。渲染端一直是 `ClassicDetailModal`（「結果與影響之依據：…」）。

思想史條目的寫法（`studentEvents.ts` 與北魏太學、元嘉四學、梁五經博士諸條已確立的紀律）：不假設生徒名冊、教官編制或課程；把「議政空間」與「學校制度」分開（鄉校≠後世學校）；把可考活動與後起的制度想像分開（孟子「夏曰校殷曰序周曰庠」是戰國的想像）；詔令裡的員額（北魏「三千」）不是點名冊；人物年（孔子卒、子路死）只作時間節點，不畫機構。

戰爭條目的寫法紀律（本輪反覆使用）：兵力與斬獲的數字一律標為量級（長平四十餘萬、伊闕二十四萬、苻堅百萬、關原八萬）；「陷」不等於該地戶口改屬；佔有不等於編戶（樂毅下七十餘城、元取江南）；盟約與名分事件（葵丘、踐土、黃池、澶淵、大政奉還、王政復古）標而不畫邊界；復國與領土恢復不等於實力恢復（田單復齊）。

規則 19 是**棘輪**：條目一旦補了 `outcomeSource`，就必須同時滿足 400 字與分段論述，否則 `outcome-thin` 會報 warn；未補的只計入 backlog，不產生 warn。現在 backlog 為空，因此任何新增條目若缺 `outcomeSource` 會立刻出現在 `outcome-backlog`，若補了卻不夠長則立刻 warn——棘輪對未來新增仍然有效。

上古段的寫法紀律（給下一輪）：夏只引傳世文獻並標 disputed；商自武丁起才可引卜辭；西周可引金文（利簋、何尊、大盂鼎、宜侯夨簋、多友鼎、虢季子白盤等）；前841 起才有連續紀年。異說必須並列（古本／今本《竹書紀年》、偽古文《尚書》、清華簡《系年》），年代採斷代工程但要標明是模型。

順帶修了 `scripts/audit-data.ts` 的簡體字檢查：原本把「西」當簡體字，造成 29 條誤報（`audit:data` 的 warn 因此由 63 降到 34）；同時補進原本漏掉的常用簡體字形（`继、让、记、论、语、数、据、权、别、将、历、当、亲、启、陈、传、众、从、达、迁、关、马、军、戰、礼、应、区、实、备、刘、绍 等`），並明確不收兩形通用的 西、后、里、并、余、于、采、沉。本輪寫長文時確實混入過「继」「与」「别」「当」「亲」等字，靠這個檢查與逐檔掃描撿回。



## 1I. 追加：疆域幾何的護欄（Phase 0）與下一輪的路線

使用者提議的兩件事：（1）把疆域邊界畫到盡可能準確，中國從最早到當代，再日本；（2）兩國的 UI 一致性以三國包為基準。本輪先做護欄，因為沒有護欄，幾何的改進無法驗收。

### 現況（量過的，不是印象）

- 中國側：`src/geo/eraRegions.ts` 有 **108 個環編號、130 條環**，由 `scripts/gen_era_regions.py` 從手繪的經緯示意塊裁到海岸生成。檔頭自己寫：「地理大勢據譚其驤精神；幾何非譚圖逐幅矢量化」。
- 其中 **44 條被引用的環其實是現代／民國行政界**（`hebei`、`shandong`、`rehe` 熱河、`chahar` 察哈爾、`suiyuan` 綏遠、`ningxia` 寧夏、`hlj/jl/ln` 東北三省…），拿 1928 年才有的省名去畫漢、唐、清的邊。
- 日本側已經是真資料：`src/data/territory/japan_kokugun`（CODH 舊國・舊郡，22MB，CC BY-NC）與 `japan_bakumatsu_1867`（藩，32MB，CC BY-SA）經 `build_japan_kokugun_rings.py`／`build_bakumatsu_han_rings.py` 生成 `codhKokugunMeshes.ts`（17,757 行）。還缺的是 stub／HOLD 那幾層：大名領 1572（仍是 seed-Voronoi）、源平活動帶、松前、北海道 1869、琉球 K74。
- 座標系：環與底圖同為 **1968×1567 像素**；`tighten_land_borders.py:china_px()` 是已擬合的圓錐投影（圓錐常數 0.5867、頂點經度 104°E）。日本側是等距圓柱（`japan_px`）。**這條經緯→像素的路徑已經存在且可用**，所以中國幾何是「換輸入」，不是重寫。

### 本輪建好的三件護欄

1. **`src/data/territory/ringProvenance.ts`**（由 `scripts/gen_ring_provenance.py` 產生）：108 條環逐條登記 basis／source／institution／kind。kind 分五級：`modern-province-proxy`（現代省界代替）、`text-derived`（依文獻地望手繪）、`schematic-box`（朝代大勢框）、`plate-traced`、`gis-import`。後兩級目前是 0，這就是要追的進度指標。
2. **`audit:ranges` 規則 17–19**：環沒有登記 → `ring-unregistered`；登記未點名 → `ring-source-generic`；環假定的政區制度早於該制度最早可考年份 → `institution-anachronism`（縣 前688《史記·秦本紀》、郡 前400、州 前106《漢書·武帝紀》、道 627《舊唐書·地理志》、路 983《宋史·職官志》、省 1260《元史·百官志》、羈縻 630）。已用「把郡的門檻暫時改成 1900」做過反證測試：會報 12 條，所以現在 warn 0 是真綠，不是規則空轉。
3. **`npm run audit:geo`（`scripts/audit_geo.py`）**：
   - 20 個海岸／內陸錨點（黃海、東海、南海、渤海、台灣海峽、北部灣、朝鮮海峽／鄭州、四川盆地、泰山、汾河谷地、漢水中游、珠江三角洲、遼東半島、山東半島北岸、朝鮮半島、台灣中央山脈、海南島、河套、河西走廊）經 `china_px` 投到底圖，用 b−r 色差分類海陸：**20/20 正確**，投影可信。
   - 解析反函數 `china_ll()` 算出**底圖可畫範圍：經 64.70–143.26、緯 14.98–52.02**。超出此範圍的環不可能對位——這也暴露 `geo/project.ts` 的 `MAP_BOUNDS`（經 98–124、緯 18–43）只是三國劇場窗，與中國各包實際使用的全東亞底圖不一致。
   - 環體檢：**10 條環的形心落在海裡**（`guangdong`、`jiangsu`、`jiangsu_s`、`zhejiang_n`、`qi`、`jingnan`、`hebei_song`、`realm_ming_1368`、`realm_sui_589`、`realm_tang_701`）。海岸省份尚可解釋為灣內，但 `realm_sui_589`／`realm_tang_701` 形心都在 (1374,1059)（錢塘口外海），`qi`（春秋齊）形心在渤海——這些多邊形吃進了海裡，是下一輪要修的第一批。
   - 另有 13 條環的邊界框觸及圖幅最外圈（元、清、共和國、遼、金等）：需逐條判斷是「圖幅裁掉了它」還是「政權真的到此」，不是自動的錯誤。

### UI 一致性：先糾正我自己的誤判

第一輪用「App 檔有沒有 import 共用元件」做矩陣，結論過度悲觀——各包把 chrome 放在自己的 `components/` 裡，被我的過濾條件排除了。重測（含 `components/`）後的真實差距：

- 一致的部分：所有包都用同一套 `year-scrubber*` class（`ZhouYearScrubber`、`QinHanYearScrubber`、`SengokuYearScrubber`、`ChinaYearScrubber`、`JapanYearScrubber`、幕末／平安的 chrome 內聯）；`TerritoryGeometryProvenanceNote` 經 `MapStage → FactionLegend` 在所有包都顯示；`EraBar`、`ReadingControls`、`TopicSwitcher`、`AppSideRail`、`CollapsibleAppFooter` 各包都有。所以**使用者看到的 chrome 已經大致一致**，問題是六份重複實作（維護風險），不是視覺不一致。
- 真實差距（已在瀏覽器與原始碼兩邊核過）：月軸不一致——三國、帝國、戰國(日)、japanEras 走共用 `TimelineMonthBar`，秦漢自己實作一份 `month-bar`（class 名相同、程式碼另一份），幕末與平安**只有表頭用 ‹ › 逐月步進（顯示「N月」），沒有那條 12 格的月份條**，周完全沒有月軸。`FactionSituationPanel` 在幕末沒有。`PowerBoard` 只在三國出現，其他包一律沒有。
- 下一輪的 UI 做法：先寫一個 `scripts/audit-ui.ts`，對每個路由量「渲染出來的 chrome class 集合」，以 `#/china/sanguo` 為基準，差集非空就報 warn；再把六份 scrubber 收斂成一個 `<EraShell>`＋slot。**先有量測再重構**，否則「一致性」只是口號。

### 下一輪（Phase 1–2）的順序建議

1. 先修 10 條形心在海裡的環（小、可驗、立刻改善觀感與正確性）。
2. 依 C 案來源路線做中國五個 tranche：先秦（邑／都＋勢力域，不 invent 郡界）→ 秦漢（郡國，《漢書·地理志》《續漢書·郡國志》永和二年）→ 三國兩晉南北朝（州郡＋僑州郡問題）→ 隋唐五代遼宋金（貞觀十道／節度、遼五京道、宋 23 路、金 19 路）→ 元明清民國共和國（行省／都司／土司、18→25 省、將軍轄區、行政督察區）。每 tranche 都要：選定該時代的「政區單位」→ 取得經授權的向量（CHGIS 及其衍生圖層要先查授權與涵蓋年）→ 用 `china_px` 生成環 → 換掉 snapshot 的 id → 把該環的 kind 從 proxy 升到 gis-import／plate-traced。
3. 日本：把 1572 大名域的 Voronoi 換成實測大名領，再解 HOLD（松前、北海道 1869、琉球 K74）。
4. 全程 `audit:ranges`（規則 17–19）＋`audit:geo` 必須維持 fail 0；`ring-provenance` 那行 info 的 proxy 計數就是進度表。


## 1J. 修正：幕末卡頓與幕末／古墳地圖「定義不清」

使用者回報兩件事：古墳與幕末的地圖定義不清；幕末執行時很卡。兩條其實是同一個根源。

### 根因（量出來的）

`src/bakumatsu/data/bakumatsuHanMeshes.ts` 有 32 個藩，但村→藩 dissolve 留下 **21,296 塊、114,727 個頂點**，而這些塊的面積**中位數 0.00 px²、p90 只有 0.4 px²、p99 是 8.1 px²、最大 802 px²** —— 99% 是次像素碎片。後果有兩個：

1. **卡頓**：`EraMapView` 原本逐塊輸出 `<path>`（每塊還帶一個 `<title>`），幕末地圖有 **21,296 個 path、四萬多個 SVG 節點**；而且 `d={ringPath(ring)}` 寫在 JSX 裡，任何重繪（滾輪、拖曳、逐月播放、選勢力）都會把 114,727 個頂點重新 `toFixed(1)` 一次。
2. **看起來定義不清**：兩萬條次像素小塊各自描邊，地圖變成一片雜訊，看不出藩的輪廓。古墳包同理——58 個 `map-2d__faction` 群、154 條各自描邊的令制國色塊，讀起來是一堆破碎小塊而不是一個圈域。

### 做了三件事

1. **剪碎片**：`scripts/prune_han_meshes.py`（冪等，可 `--dry-run`）把面積 < 4 px²（約 2×2 像素）的塊剪掉。實測 **21,296 塊 → 356 塊、114,727 頂點 → 7,052 頂點，保留 85.1% 的可視面積**；來源檔 6.5MB → 380KB。同一個門檻也寫進 `scripts/build_bakumatsu_han_rings.py`（`MIN_PIECE_AREA_PX2 = 4.0`），重新生成不會再把碎片帶回來。
2. **同勢力合併成一條 path**：`EraMapView` 改成 `factionLayers`，把同一勢力的所有塊合成一條 `d`。幕末 **21,296 條 path → 2 條**、SVG 節點 118 個；古墳 **154 條 → 4 條**。點擊行為不變（本來就是選勢力），`<title>` 改成「幕府 · 334 塊 · 陸奧北、奧羽、…」（名字去重）。
3. **快取固定的 path 字串**：環的座標是死的，只有填色隨年份變，所以 `RING_PATH_CACHE` 按環的參考識別快取一次，重繪不再重吐字串。

另外補一個真的漏電：`DeepDiveMapStage` 從來沒把 `JP_DOMAINS_GEOMETRY_PROVENANCE` 傳給 `EraMapView`，所以古墳、飛鳥、奈良、鎌倉、室町、安土桃山六個包的色塊**完全沒有幾何出處註記**（不知道那些形狀是 CODH 旧国界）。已補上。

### 驗收

| 項目 | 修正前 | 修正後 |
|---|---|---|
| 幕末 SVG path | 21,296 | 2 |
| 幕末頂點 | 114,727 | 6,698 |
| 幕末 SVG 節點 | 42,000+ | 118 |
| 古墳 path | 154 | 4 |
| 幕末藩 mesh 來源檔 | 6.5 MB / 501,837 行 | 380 KB / 29,253 行 |
| 30 次逐月步進（同步段） | — | 1.5 ms |

`tsc` 通過、`npm run build` 通過、`audit:ranges` fail 0／warn 0、`audit:data` fail 0、`audit:geo` 20/20。瀏覽器實測 kofun／asuka／nara／kamakura／muromachi／azuchi／bakumatsu 都有色塊與圖例（古墳 4 條 path、3,305 頂點、出處註記已顯示）。

### 第二層根因（使用者回報「看起來沒變」之後才挖出來）

剪碎片與合併 path 只解決了卡頓與雜訊，**沒有解決「地圖上有很多空洞」**。量下去才發現：

- 幕末的藩層（CODH 村→藩 dissolve）只有 **32 個藩、覆蓋 21/28 個 domain**，總面積 **13,961 px²**。
- 其他日本包（戰國、古墳、飛鳥、奈良、鎌倉、室町、安土桃山）共用的 **旧国層有 87,434 px²**，28 個 domain 全部覆蓋。
- 幕末的 `shadesFromHanDomainControl` 是**用藩層取代旧国層**，不是疊加。結果就是：別包滿滿的地圖，幕末只有零星小塊與大片空洞 —— 這才是「定義不清」的真正原因。

修法：`src/bakumatsu/data/bakumatsuHanPaint.ts` 加 `USE_HAN_MESH_LAYER = false`，幕末改以旧国層為底（`useBakumatsuHanMeshes()` 一起把 `BAKUMATSU_TERRITORY_GEOMETRY_PROVENANCE` 從藩的 CC BY-SA 切回旧国的 CC BY-NC，出處與授權不會講錯）。藩的資料留著不刪，等藩數與面積補齊（270 個藩都要有、面積要對得上旧国）再把開關打開。`bakumatsuHanCoveredDomains()` 可列出目前覆蓋了哪些 domain。

實測填色面積：幕末 **13,961 → 70,364 px²**（瀏覽器量 `.map-2d__province` 的實際多邊形面積）。對照：戰國 87,434、古墳 42,098、平安 31,816 px²。

### 還要注意的

- 古墳（250–537）的色塊底層仍是 **令制國**（CODH 旧国），令制國是大寶令以後才有的制度。現在地圖會顯示幾何出處、頁腳也寫「色塊是文化／政治圈示意，不是令制國」，但形狀本身仍然是令制國拼出來的圈域。要做準，得依考古（古墳群分布）畫圈，而不是拿令制國湊。
- 各包沒有「此地無政區」的中性層：圈域之外就是空白，看起來像漏畫。要補需要一張日本陸域 mask（可以照 `tighten_land_borders.py` 對 `japan_relief` 的做法產生），再把未著色陸地畫成灰色／斜紋並標「無政區可據」。
- 次像素碎片不是幕末獨有：`codhKokugunMeshes.ts`（古墳等六包共用）195 塊裡有 **37.9% 小於 4 px²**。數量少（不是卡頓來源），但同樣會造成邊緣雜訊；要剪的話把 `prune_han_meshes.py` 的門檻套到那個檔即可。


## 1K. 追加：北海道領有史（把「何時被日本統治」放進網站）

使用者問：日本何時統治北海道，網站裡那一段在那裡。原本網站只有 1604／1669／1750／1789／1799／1868／1869 七條，**1869 年之後完全沒有**，而且 658／801／1457 三條寫在 `src/japanHistory/data/timeline.json` 卻沒有任何包的年份範圍涵蓋它們（室町包 1336–1573、飛鳥 538–710、平安 1150–1185），等於寫了但點不到。

### 補了什麼

1. **`scripts/add_hokkaido_timeline.py`**（冪等，同 id 更新不重複插）把 11 條補進 `src/japanHistory/data/timeline.json`（52 → 63 條）：
   - 江戶段：**1807** 蝦夷地直轄・置箱館奉行（松前改易）、**1821** 還地松前、**1855** 日露通好條約（境界第一次由條約劃，得撫・択捉之間，樺太雑居）。
   - 明治段：**1871** 廃藩置県（對照用：北海道側已由開拓使管）、**1872** 北海道開拓規則（三策・本業定置）、**1875** 樺太・千島交換條約、**1882** 廢開拓使設函館・札幌・根室三県、**1886** 北海道庁、**1899** 北海道旧土人保護法。
   - 当代段：**1997** アイヌ文化振興法、**2019** アイヌ民族支援法（首次法律承認「先住民族」，2020 upopoy）。
   每條都有《》／『』點名出處（規則 16），1603 年以後都有 note 講限度（規則 15）；不確定的（開拓規則的細部施行、旧土人法的土地效果）標 `disputed`。
2. **地圖層**：`src/geo/japanFringeWindows.ts` 新增 `ezo-chokatsu`（**1799–1821**，ring `hokkaido`，mode `admin` 實色，出處『蝦夷地一件』＋《徳川実紀》）。原本 1799 年幕府直轄只有文字、地圖不換；現在 `#/japan/edo` 滑到 1807，外周註記會出現三條：松前（1604–1868）、琉球（1609–1871）、**蝦夷地（幕府直轄・箱館奉行）1799–1821**。註記自己寫清楚限度：全島輪廓是上限示意，實際直轄以東半部與箱館・松前據點為主。
3. **把孤兒條放回有年份範圍的包**：1457 コシャマイン → `muromachiPack`（`mu-1457-koshamaoin`）；658 阿倍比羅夫 → `asukaPack`（`as-658-abe-hirofumi`）；801 坂上田村麻呂 → `src/heian/data/history.ts`（`heian-801-shoi`）。三條都標 `disputed` 並註明「文獻蝦夷≠近代アイヌ」「色塊不是アイヌ領有界」。

### 瀏覽器實測（路徑與操作）

| 要看的東西 | 路徑 | 操作 |
|---|---|---|
| 1604 松前黑印（只有渡島南部） | `#/japan/edo` | 滑到 1604 |
| 1799–1821 幕府直轄蝦夷地 | `#/japan/edo` | 滑到 1807，看外周三條註記 |
| 1868 箱館戰爭 | `#/japan/bakumatsu` | 滑到 1868（可逐月） |
| 1869 開拓使、改稱北海道 | `#/japan/modern` | 滑到 1869 |
| 1871–1886 開拓使→三県→北海道庁 | `#/japan/modern` | 點「顯示更多（共 23 條）」 |
| 1899 旧土人保護法、1997、2019 | `#/japan/modern` | 同上，列表尾段 |
| 1457 コシャマイン | `#/japan/muromachi` | 時間軸 |
| 658 阿倍比羅夫 | `#/japan/asuka` | 時間軸 |
| 801 坂上田村麻呂 | `#/japan/heian` | 點「顯示更多（共 24 條）」 |

### 已知限制（不是這輪弄壞的）

- **平安包的滑桿只有 1150–1185**（`HeianYearContext` YEAR_MIN/MAX），但 `HEIAN_EVENTS` 有 794–1185 共 24 條。所以 794–1150 這段只能在地點清單看到，**沒有對應年份的地圖**。要補得先做 794–1150 的疆域快照，否則滑桿一放寬就會出現空白地圖（正是使用者抱怨過的「定義不清」）。
- 北海道／松前的形狀仍是 `geo/japanEraRings.ts` 的示意環（CODH 旧国的 K78 渡島切分＋K75–K85 合成），`src/data/territory/japan_ezo_matsumae/`、`japan_hokkaido_1869/` 還是零 feature 的 HOLD stub。
- 1855／1875 的國界只有文字，沒有 ring；要畫得先加千島・樺太的幾何。

`tsc` 通過、`npm run build` 通過、`audit:ranges` fail 0／warn 0（含規則 13 外周窗、15 年表、16 點名出處）、`audit:data` fail 0、`audit:geo` 20/20。


## 1L. 護欄修正：`audit:geo` 的環體檢原本全錯（已修）

原本 `audit:geo` 報「10 條環形心在海裡」（guangdong、jiangsu、jiangsu_s、zhejiang_n、qi、jingnan、hebei_song、realm_ming_1368、realm_sui_589、realm_tang_701）。查證結果是**規則壞了，不是環壞了**，三個獨立錯誤疊在一起：

1. **用頂點平均當形心**（`pts.mean(axis=0)`）。海岸線頂點密集的多邊形會被拉出海：`realm_sui_589` 有 266 個點、面積 395,088 px²，面積形心在 (1229,1003) 是陸地，頂點平均卻在 (1374,1059) 的錢塘口外海。改用 shoelace 面積形心。
2. **海陸遮罩是顏色啟發式（B−R>15），湖、河、海同為「水」**。`jiangsu` 面積形心 118.81E/33.09N 是洪澤湖，`jingnan` 112.12E/30.25N 是洞庭湖，`wu_delta` 在太湖口，`realm_qing_1668` 在長江——四條都是合法的環。
3. 我新寫的「離最近陸地」距離圖**從海向外擴散而不是從陸地**，結果深洋也算離陸 1px；另外顏色雜訊讓海中出現孤立陸點。兩處都修了（BFS 改從陸地擴散 + 5×5 多數決去雜訊）。

新規則：面積形心落水**且離陸 >20px** 才算可疑，另加「環內陸地 <40%」抓真正畫到海上的多邊形。門檻有實測依據：現存環最遠只有 9px（太湖口），南海中央的假環是 60px（距離圖上限）＋0% 陸地；青海湖半寬約 15px，所以取 20 而不是 12。

`audit:geo` 現在會先跑**偵測器自我測試**（海上方塊必須被抓到、內陸方塊與湖中方塊必須乾淨），否則 exit 1——否則「0 可疑」可能只是規則失效。結果：130 條環 0 可疑、20/20 校正錨點、0.5 秒跑完。

## 1M. 舊國 mesh 剪碎片（影響戰國／平安／深度專題地圖）

`src/sengoku/data/codhKokugunMeshes.ts` 有 195 塊，其中 74 塊（38%）小於 4 px²——離島與海岸雜訊，在地圖上看不見卻要進 SVG。新增 `scripts/prune_kokugun_meshes.py`（冪等，重跑 121→121）：

- 195 → 121 塊、頂點 4,201 → 3,798、檔案 217KB → 194KB，**保留 99.9% 可視面積**。
- **安全界**：絕不刪掉整個物件。若某國所有環都低於門檻，保留最大環並警告。小國必須留得住——壱岐 40px²、志摩 84px²、隠岐 103px²、對馬 198px²。實測 0 個物件觸發警告。
- `scripts/build_japan_kokugun_rings.py` 同步加 `MIN_RING_AREA_PX2 = 4.0`，重建不會跑回原形。
- 瀏覽器實測 `#/japan/sengoku`：SVG path 由 195 條變 121 條，地圖照常著色。

## 1N. 版本庫與 CI（原本專案完全沒進 git）

- **專案之前是完全未追蹤的**（`git status` 顯示 `?? sanguozhi-3d/`）。首次提交 `b604006`：358 檔、109,734 行。
- **54MB CODH 原始 GeoJSON 不入庫**（`src/data/territory/*/vendor/` 加進 .gitignore）。理由：體積，且 NIHU 資料是 CC BY-NC-SA 非商業授權，重分散不理想。要重現跑 `scripts/vendor_codh_kokugun.py`、`scripts/vendor_codh_bakumatsu_av.py`，再由 build 腳本產 mesh（mesh 有入庫，最大檔 380KB）。已用 `git clone` 到別處驗證：**沒有 vendor 資料也能 build、三個 audit 全過**。
- **CI 原本永遠不會跑**：workflow 在 `sanguozhi-3d/.github/workflows/`，但 repo 根是上層 `my-project/`，GitHub Actions 只讀 repo 根的 `.github/workflows/`。已在 repo 根建 `audit.yml`（`working-directory: sanguozhi-3d`、`cache-dependency-path` 指到子目錄 lock），內容：`npm ci` → `build` → `pip install pillow numpy` → `audit:data` → `audit:ranges` → `audit:geo`。子目錄那份保留並標註「這份不會跑」，等專案獨立成 repo 才生效。


## 1O. 北海道：地圖終於依史實換疆域（不再是全島一色）

使用者問「invation to hokkaido 能不能依歷史畫疆域」。原本 `japanFringeWindows.ts` 只有兩窗：
`matsumae-trade` 1604–1868 與 `hokkaido-kaitakushi` **1869–2026 一整段同一色**。
1799/1807/1821/1856/1882/1886 六次管轄變化在地圖上完全看不出來。

### 查證（全部點名到文獻層級）

- 『遠国奉行』箱館奉行・松前奉行・蝦夷奉行項：**寛政11(1799)** 東蝦夷地仮上知 → **享和2(1802)** 永久上知・蝦夷奉行設置（5月改称箱館奉行）→ **文化4(1807)** 文化露寇を機に和人地及び西蝦夷地も上知、箱館奉行を松前奉行と改め松前に移転 → **文化6(1809)** 樺太を北蝦夷地に改称 → **文政4(1821)** 和人地及び全蝦夷地を松前氏に還付、松前奉行廃止 → **安政3(1856)** 乙部村以北・木古内村以東の和人地と全蝦夷地を再上知、箱館奉行再置（元治1・1864 五稜郭へ移転）。
- 明治15年2月8日太政官布告第8号＋『法令全書』第17冊：三県管轄は**郡**単位。函館県=渡島全域＋後志8郡＋胆振山越郡；札幌県=石狩・天塩・十勝・日高全域＋後志9郡＋胆振7郡＋北見4郡（宗谷・枝幸・利尻・礼文）；根室県=根室・釧路・千島全域＋北見4郡（紋別・常呂・網走・斜里）。
  **一開始我猜十勝・日高屬根室県，是錯的**——查證後屬札幌県。四至（宗谷岬・神威岬・襟裳岬）也在札幌県側，可交叉驗證。
- 明治19年1月26日布告第壹號（国立公文書館）：三県一局廃し北海道庁、廳札幌・支廳函館・根室。破綻理由是人口不均衡（1886年全道26.5万、函館県15.1万、根室県1.7万；金子堅太郎視察→伊藤博文、1885年）。

### 做了什麼

1. `scripts/build_hokkaido_admin_rings.py`：讀 CODH 旧國 K75–K85（石狩・膽振・後志・渡島・天塩・北見・日高・十勝・釧路・根室・千島），**先投影到底圖像素再簡化**（在度空間用 tol 1.6 等於 1.6 經度，整塊會塌成三角形——這是第一次跑只有29個頂點的原因），產 `src/geo/hokkaidoAdminRings.ts`：`hokkaido_all` 10環212頂點28,018px2、`ezo_east` 190頂點、三県各自成塊。輪廓與舊示意環 `hokkaido` 同範圍（x 873–1347 vs 869–1348、y 121–370 vs 121–372），但邊界是真的舊國界。
2. `japanFringeWindows.ts` 拆成 9 窗：1604–1798 松前／1799–1806 東蝦夷地直轄／1807–1820 蝦夷地全般（松前奉行）／1821–1855 松前還付（虛線）／1856–1868 再上知／1869–1881 開拓使／1882–1885 函館・札幌・根室三県／1886– 北海道庁。每窗有出處與 note。
3. **交接年不重疊**：`fringeWindowsAt` 是閉區間，原本 1821/1856/1882/1886 會同時塗兩層，`audit:ranges` 以 `fringe-window-overlap` 抓到（warn 2）。窗尾改成「該窗最後一年」。
4. `audit-ranges.ts` 的 `fringe-ring-unknown` 規則原本只認 `japanEraRings.ts`，新環在 `hokkaidoAdminRings.ts` 會誤報 fail 9；改成兩個來源都認，並新增 `fringe-ring-codh` info（報頂點數）與 `fringe-ring-empty` fail。
5. 年表 1799／1882／1886 三條的 source 換成上面的一手文獻，新增 **1856 蝦夷地再上知**（64 條）。

瀏覽器實測：`#/japan/edo` 1780→松前、1800→東蝦夷地、1810→蝦夷地全般、1830→松前還付、1860→再上知；`#/japan/modern` 1875→開拓使、1884→函館県＋札幌県＋根室県、1900→北海道庁。

**界**：CODH 是舊國層級，1882 年的三県是郡級分割（後志・胆振・北見三國被切開），國級幾何無法精確重現，故三國以面積多數側歸一県，note 寫出完整郡名單並標 `disputed`。要畫精確需郡級多邊圖。

## 1P. 成語：加了 26 條「史事」說明，並修好中國端完全看不到的問題

原本 `src/chengyu/data/idioms.json` 44 條，只有 `meaningZhHant`（一句話意思）＋出處書名，**沒有講成語背後實際發生的事**；時代也偏：日本平安／鎌倉／室町、中國魏晉／宋完全空白。

1. `types.ts` 新增 `history?`（誰、何年、何地、做了什麼、為什麼後來變成這個說法），`ChengyuPanel` 以「史事」區塊顯示，`App.css` 加 `.chengyu-card__history`。
2. 新增 26 條（44 → 70），全部附 `history` 與點名到篇的出處：
   - 中國 17：城下之盟(前700《左傳·桓公十二年》)、問鼎輕重(前606《左傳·宣公三年》)、三家分晉(前403《資治通鑑》周紀四)、立木之信(前356)、作法自斃(前338)、圍魏救趙(前353)、約法三章(前206)、項莊舞劍(前206)、沐猴而冠(前202)、匈奴未滅無以家為(前119)、不入虎穴(73《後漢書·班超傳》)、洛陽紙貴(300《晉書·左思傳》)、風聲鶴唳草木皆兵(383《晉書·苻堅載記下》)、請君入甕(691《資治通鑑》長壽二年)、黃袍加身(960)、杯酒釋兵權(961)、盡忠報國(1141)。
   - 日本 9：諸行無常(1185『平家物語』開卷)、一蓮托生(1185)、人間五十年(1184 敦盛最期)、風林火山(『孫子』＋『甲陽軍鑑』，disputed)、和魂漢才(903『菅家後記』，disputed)、三方一両損(1730 講談『大岡政談』，disputed)、文明開化(1875『文明論之概略』)、脱亜入欧(1885『脱亜入論』，disputed)、八紘一宇(1940＋『日本書紀』「神武條」，note 寫明它掩蓋的支配關係)。
   時代分佈現在是 先秦18／秦漢13／魏晉南北朝6／隋唐7／宋元8／明清12／明治以後6。
3. **真正的 bug**：`ChinaHistoryApp`（唯一掛 `ChengyuPanel` 的中國元件）**完全沒有被 router 掛載**，所以中國任何頁面都看不到成語。已把 panel 掛進三個實際在跑的中國殼層：`ImperialApp`（晉～共和國）、`ZhouApp`（夏～戰國）、`QinHanApp`（秦漢）。
4. 瀏覽器實測：`#/china/liaosong` 960→黃袍加身＋杯酒釋兵權（含史事）；`#/china/chunqiu` -606→問鼎輕重；`#/china/han` -206→約法三章＋項莊舞劍＋沐猴而冠；`#/japan/modern` 1875→文明開化＋脱亜入欧。

**還剩**：舊的 44 條沒有 `history`（要逐條補史事）；日本各時代包（飛鳥／奈良／平安／鎌倉／室町／戰國）也沒有成語面板，只有 `#/japan/edo`、`#/japan/modern` 兩個總覽軌有，所以 903 和魂漢才、1185 諸行無常這類目前點不到。

## 1Q. 成語深潛：44 → 107 條，每條都有史事；並補上中國端／日本端的掛載洞

使用者要求「兩國還有更多出自史事的成語，深挖」＋「把 leftover 做一做」。

### 內容
- **舊 44 條全部補上 `history`**（之前只有一句話意思＋書名）。其中 12 條其實是**寓言／設喻**，不是史事，
  history 裡明說：刻舟求劍、掩耳盜鈴、畫蛇添足、濫竽充數、守株待兔（戰國寓言）、盲人摸象（佛喻）、
  井の中の蛙（莊子設喻）、呉越同舟（兵家設喻）、七転八起／竹馬の友／花鳥風月／水の泡（語彙移植・俗諺）。
  把「寓言」和「史事」混在一起是這類卡片最容易犯的錯。
- **新增 37 條**（70 → 107），全部附史事與點名到篇／到文件的出處：
  - 中國 27：四面楚歌（前202垓下）、胯下之辱、兔死狗烹（前196韓信／范蠡系）、焚書坑儒（前213・前212）、
    迎刃而解＋勢如破竹（280杜預）、新亭對泣（313）、聞雞起舞（317祖逖）、投鞭斷流（383）、
    東床坦腹（340年代王羲之）、以史為鏡（643魏徵）、莫須有（1141）、自壞長城（1141）、
    清君側（前154七國之亂＋1399靖難）、割地賠款（1895馬關）、量中華之物力結與國之歡心（1901上諭）、
    外爭主權內除國賊（1919五四）、革命尚未成功同志仍須努力（1925國父遺囑）、宜將剩勇追窮寇（1949詩）、
    糖衣炮彈（1949七屆二中全會）、破四舊（1966）、上山下鄉（1968）、黑貓白貓（1962/1979）等。
  - 日本 10：神風（1274・1281）、下剋上（1467応仁の乱）、忠臣蔵（1703赤穂事件）、黒船（1853）、
    武士道（1900新渡戸）、皇国興廃在此一戦（1905電文）、欲しがりません勝つまでは・隣組（1940）、
    三光作戦（1940起）、一億総玉砕（1943アッツ）、玉音放送・一億総懺悔（1945）、
    ボランティア元年（1995阪神）、失われた10年（1997）、忖度（2018森友文書）。
- **時代分佈**：先秦18／秦漢17／魏晉南北朝11／隋唐8／宋元11／明清16／明治以後26。
  原本空白的魏晉、宋、元、民國、昭和、平成都補上了。
- **存疑 13 條**一律 `disputed` + note 寫清爭議：神風（暴風事實 vs 明治国民叙事）、風林火山（軍記のみ）、
  一石二鳥（網路傳的龍馬／西鄉說無根據）、脱亜入欧（蘇峰原文是『脱亜入論』）、
  一億総玉砕（口號初出割裂）、黑貓白貓（語源是安徽民間諺）等。
  加害／迫害相關的條目（三光作戦、破四舊、八紘一宇）在 note 裡標明是記錄事實而非認可口號。

### 掛載洞（真的 bug）
- `ChinaHistoryApp` 從未被 router 掛載 → 中國任何頁面都看不到成語。已掛進實際在跑的
  `ImperialApp`（晉～共和國）、`ZhouApp`（夏～戰國）、`QinHanApp`（秦漢）。
- 日本側只有 `#/japan/edo`、`#/japan/modern` 有成語面板，各時代包沒有 →
  已掛進 `DeepDiveApp`（飛鳥・奈良・鎌倉・室町・戰國・安土桃山共用殼）、`HeianApp`、`BakumatsuApp`。
- 瀏覽器實測：鎌倉 1281→神風；室町 1467→下剋上；共和國 1966→破四舊・上山下鄉・黑貓白貓・
  宜將剩勇追窮寇・糖衣炮彈；明治至當代 1945→玉音放送・一億総懺悔・一億総玉砕・八紘一宇・三光作戦…；
  漢 -206→約法三章・項莊舞劍・沐猴而冠；遼宋 960→黃袍加身・杯酒釋兵權。

### 新增守則（audit:data 規則 7）
成語卡片現在由 `audit:data` 守住：每條要有 `history`（<40字報 warn）、要有出處、要有紀年錨點、
`locale`/出處類別要合法、`disputed` 要有 note、id 不重複。
第一跑就抓到 **22 條出處只是描述**（「江戶時代諺語」「和製漢語」這種）。修法不是放寬規則，而是：
近現代條目允許引文件（電文・條約・社説・上諭・統計＋年份），真正沒有單一書目的
（俗諺・和製漢語・譯語・寓言・傳說層）新增 `source.citeKind` 標明類別。
現在成語 warn 0、全站 warn 34（都是舊有的）。

### leftover
- `reports/*.md` 改成不進版本（每次跑都變）。**但 `reports/range-audit.json` 必須留著**——
  `src/audit/RangeAuditPage.tsx` 直接 import 它，一開始我把整個 `reports/` 都 ignore，
  查了 import 才收回來。
- 根目錄那四個未追蹤的檔（`app.js`、`calendar.js`、`index.html`、`styles.css`）是另一個
  獨立小專案「Three Calendars」（中・日・US 萬年曆，10月16日的檔），和本專案無關，
  沒有動它們；要 commit／ignore／刪其中一個請說一聲。

## 1R. 改進回合：掛載稽核、面板可用性、成語再補 11 條

### 新增 audit:wiring（`scripts/audit-wiring.ts`，已進 CI）
把「路由」當資料掃，專抓**元件寫好了但沒接上去**這一類 bug（成語面板就是這樣消失過一次）：
- `app-unrouted` fail：匯出的 app 殼層從 router 到不了（用可達性算，`AsukaApp → DeepDiveApp`
  這種委派不會誤報；lazy import 與 `<app.ImperialApp/>` 兩種寫法都認）。
- `app-no-chengyu` fail：有 `AppSideRail` 卻沒傳 `chengyu` 槽。
- `app-no-side-rail` / `app-no-events` / `app-no-people` warn。
- `chengyu-slot-track` fail：`ChengyuSlot` 沒寫 track。
- `chengyu-eralink-unresolved` fail：成語綁的事件 id 必須真的存在**且同年**
  （只查 id 不夠——第一次跑就抓到我把 key year `kam-koan` 當成事件 id）。

**它第一次跑就抓到兩件真的事**：①`SengokuApp` 有自己的側欄但完全沒有成語槽（戰國時代看不到成語）；
②我自己綁錯的事件 id。報告在 `docs/WIRING.md`。

### 成語面板可用性
- **`ChengyuSlot`**：六個 app（Imperial／Zhou／QinHan／Heian／Bakumatsu／DeepDive）原本各自
  內聯同一段設定，現在一行搞定；SengokuApp 補上。
- **範圍切換**：本年附近（±80年，原本唯一行為）／**本時代**（專題年窗全部）／**全部**（依年代）。
  118 條裡大部分在單一年份本來永遠看不到。
- **存疑徽章分種類**：`disputeKind` = 出典／史実／後世定型／数値，卡片直接寫「存疑·出典」。
- **相條**：68 條有 `related`，卡片上排成可點回鏈（id 不存在自動忽略）。跨國同構也連了
  （噂をすれば影 ↔ 說曹操，曹操到；中體西用 ↔ 文明開化）。
- **跳到事件**：`eraLink.kind='event'` 的 7 條（神風→km-1281、下剋上→mu-1467、三日天下／
  敵は本能寺にあり→az-1582、黒船→1853-perry、玉音放送／一億総懺悔→jp-1945-end）
  不只改年份，還會把時間軸那一條捲到可見並閃一下（`EraTimeline` 加了 `data-event-id`）。

### 成語 107 → 118（補明、清、太平天國前後、室町、江戸後期、明治、昭和）
兩袖清風（1449 于謙）、留頭不留髮（1645 剃髮令）、揚州十日（1645，並標《揚州十日記》真偽爭議）、
師夷長技以制夷（1843《海國圖志》）、中體西用（1861 馮桂芬／1898 張之洞，四字是後世概括）、
流血請自嗣同始（1898）、徳政令（1441 嘉吉の徳政一揆）、一向一揆（1488 加賀）、
「鎖国（1639 令；「鎖国」一詞其實是 1801 志筑忠雄『鎖国論』造的）、文明開化（1875『開化書』）、
鹿鳴館（1883）、安保闘争（1960）。
現在 118 條：zh 69／jp 46／shared 3，全部有史事，存疑 16 條都標了 disputeKind。

### audit:data 的 34 條 warn 全部清掉（不是放寬，是分類）
- 8 個出處只寫傳名沒點名書：《田疇傳》→《三國志·魏書·田疇傳》、《呂布傳》、《劉二牧傳》、
  《文帝紀》、《後主傳》、《雲別傳》→裴注引、《陶侃傳》→《晉書·陶侃傳》、《劉元海載記》→《晉書·載記》。
- 新增**副次史料層**：裴注所引雜史（漢晉春秋・帝王世紀・蜀記・晉陽秋）、政書地志（通典・續漢書・
  華陽國志・魏略）屬正當補充來源，不再報 warn；「裴注引《某書》」的某書也算裴注。
- 人口資料紀年下限放到 140（東漢桓帝永壽基準年 157 是正當對照），事件／戰役仍限 184–280。
- 演義關鍵字：該行自己寫明「後出／小說／戲曲／不見於正文」時自動放行（那些句子是在**反駁**演義）。

### 北海道外周窗改半開區間
`japanFringeWindows.ts` 作者端改寫 `toExclusive`（不含），匯出時換算回閉區間。
14 個視窗的實際範圍一一核對過沒變。理由：`from`/`to` 都含時，政權交替那年（1799、1807、1869、1886…）
只要寫錯邊就會同年畫兩種顏色——半開讓這件事在結構上不可能發生，audit 規則只是事後追補。

### ChinaHistoryApp
仍然沒掛路由，但現在被 `audit:wiring` 的 `UNROUTED_APPS` 明確列出並寫了理由
（通用中國殼層＋`chinaHistory/data` 的通史時間軸與人物資料留供未來時代包沿用）。
要真的刪請說一聲，連同那條例外一起刪。

### 驗證
tsc、build、`audit:data` fail 0 warn 0、`audit:ranges` fail 0 warn 0、`audit:geo` 20/20＋130 環 0 可疑、
`audit:wiring` fail 0 warn 0。瀏覽器實測：鎌倉 1281 點「1281 年 ·事件」→ `km-1281` 捲動並閃示；
幕末 1853 黒船卡顯示 5 個相條；本時代模式（鎌倉 1185–1333）由 1 條變成 3 條。

## 1S. 日本時代頁版面修正（兩個真 bug）

### 成語面板佔滿整頁
`DeepDiveApp`、`HeianApp`、`BakumatsuApp` 的 `chengyu={...}` 被上一輪的縮排腳本搬到
`<AppSideRail ... />` 的收合 `/>` **之後**。JSX 把 `chengyu=` 當文字、把 `{<ChengyuSlot/>}`
當元素渲染，面板於是變成 `app-shell__main--map-side` 網格的直接子節點：
實測 `.chengyu-panel` 高 **13,404px**、`.side-rail` 高 **0**，地圖被壓扁。
tsc 與 build 全綠——這在 JSX 裡是合法語法，只有看渲染結果才會發現。
修好後鏈變回 `chengyu-panel < content-dock__body(383px, overflow:auto) < content-dock
< app-shell__side < side-rail(483px)`，地圖回到 656×483。

### 德川／明治至當代的色塊錯位（北海道看起來被「入侵」到海上）
`.era-map__photo` 用 `object-fit: cover`（按 max 比例放大、上下各裁 56px），而
`.era-map__marks` 的 SVG 用 `preserveAspectRatio="xMidYMid meet"`（按 min 比例完整塞入、
左右各留 56px）。兩層比例（0.4427 vs 0.367）與位移都不同，松前／蝦夷／琉球的環全部偏 30px 以上。
`cover` 還會裁掉北海道與沖繩，違反 `JapanEraMap` 註解寫的「整張列島入鏡」。
改成 `contain` 後兩者一致：實測環 vb(869,326) 落到螢幕 (375,381)，與底圖同一變換
（修正前底圖那點在 (385,348)）。其他地圖（`EraMapView`／`SengokuMap`／`Map2D`）
本來就用 `.map-2d__basemap` 的 `contain`，只有總覽圖是 `cover`。
標籤改用最大環的外框中心（凹形與離散群島的頂點平均會飄到海上），放不下字時不畫標籤。

### 防範：audit:wiring 新增 `jsx-prop-outside-tag`
舊的 `app-no-chengyu` 只問「檔案裡有沒有 `chengyu={`」，所以這個 bug 當時**是通過稽核的**。
現在會算出 `<AppSideRail … >` 的標籤範圍，要求 prop 真的在標籤內，並標記任何掉在標籤外的
`chengyu=` / `events=` / `people={`。實測驗證：把 bug 塞回去 → fail 2；還原 → fail 0。

## 1T. 版面可用度與幾何守衛（§7 佇列 1、3、4、5）

### `src/components/LayoutGuard.tsx`（只在 dev 掛載，`App.tsx` 裡 `import.meta.env.DEV`）
把「必須用眼睛看才發現」的版面錯誤變成斷言，右下角紅框列出並 `console.error`：
- **A** 成語面板必須在 `.side-rail` 內；超長時側欄內要有可捲動容器吸收
  （面板本身比側欄高是正常的，它是捲動內容——第一版把這條寫成「面板高度 ≤ 側欄×1.25」
  結果是**誤報**，改掉了）。
- **B** `.map-stage` 不得被壓扁（≥320×220）。
- **C** 底圖 `<img>` 與疊加 `<svg>` 的實際繪製範圍必須重合：
  `cover`↔`slice`、`contain`↔`meet`、`fill`↔`none`。用 `clientWidth/Height`（layout 尺寸）算，
  不用 `getBoundingClientRect`——地圖縮放時 layer 有 transform，bounding rect 會被放大、數字虛高。

實測驗證（用注入樣式破壞，不改原始碼）：
- 健康頁面（鎌倉／戰國／幕末／共和國）→ 安靜，不誤報。
- 注入 `.era-map__photo{object-fit:cover}` → 報「偏移 109,109px、比例差 0.1472」，
  與手算一致（762×542 層、底圖 1482×1477）。
- 注入 `.content-dock__body{overflow:visible}` → 報「側欄內沒有可捲動容器」。
- 移除注入 → 恢復安靜。
注意：Vite 的 CSS 模組會卡在瀏覽器快取裡，實測要用 `?cb=…` 之類的 query 強制重載，
否則會看到「守衛報 cover 但原始檔已是 contain」的假象。

### 成語清單分批
`ChengyuPanel` 每批 15 條＋「再多 N 條（還有 M 條）」，標題列顯示「顯示 15 / 49 條」。
`全部` 模式不再一次倒出 49 張卡（13,404px）。

### 側欄寬度與 sticky
`.app-shell__main--map-side` 由 `minmax(18rem, 0.95fr)` 改成 `minmax(18rem, 0.68fr)`
（1280px 下側欄 49% → 40%）；`.chengyu-scope`（本年附近／本時代／全部）改 sticky，長清單捲動時還在。



## 1U. 站名、進站首頁與內容缺口盤點

### 站名（不再是「東漢三國」）
- `index.html`：`<title>正史疆域 · 中國與日本（前2070–2026）</title>`；meta description 改成雙國跨度。
- `AppHeader`（三國專題的 brand）：h1 改「正史疆域」（可點，回索引頁），tag 留「東漢三國 184–280 · 以陳壽《三國志》裴注為本」。
  各時代 app 自己的 header（ZhouHeader、HeianChrome、DeepDiveHeader…）本來就顯示各自時代名，不用改。

### 進站首頁 = 時代索引（`#/`）
新增 `src/components/SiteIndex.tsx`：中國 17 格＋日本 11 格，每格顯示時代名與年份跨度，點了直接進該時代。
**沒有把預設設成「夏」**：夏是文獻層（前2070–前1600 年份有爭議、無甲骨金文直接證明、地圖只標伊洛核心），
第一眼放最弱且最容易誤導的內容不好；要最早請按「夏」格。
`EraBar` 加「時代索引」按鈕（所有 app 共用，改一處全部都有）。
實測：`#/` 顯示索引（28 格）→ 點「夏」→ `#/china/xia`、滑桿 -2070/-1601；從鎌倉點「時代索引」→ 回 `#/`。

踩到的坑：`TopicContext` 用 `history.replaceState` 寫網址，**不會觸發 `hashchange`**，
所以「有沒有進入某個時代」不能靠網址事件推。改成 context 自己記 `started`
（`readHash()` 回傳 started；三個 setter 會 setStarted(true)；`goToIndex()` 回索引；
hash effect 在 `!started` 時寫 `#/`）。第一版我在 `App()` 裡用 hash 分支，結果從索引點時代時
hash 變了但畫面不換——已改掉。

### 內容缺口盤點（下一輪主戰場）
每時代的**年表事件只有 4–8 條**，這是最大的洞；人物相對夠：
- 日本包（`src/japanEras/packs/`）：asuka 6、kamakura 5、muromachi 5、nara 4、azuchi 4、kofun 4 條事件；人物 9–13。
- 中國帝國包（`src/imperial/data/`）：jin 4、nanbei 5、liaosong 5、minguo 6、prc 8 條事件；人物 jin 8、liaosong 13、nanbei 22。
- 成語 118 條分佈：先秦18／秦漢17／魏晉11／隋唐8／宋元11／明清16／明治以後26（隋唐、元偏薄）。
目標：每時代 15–25 條事件、人物 12–20。補的時候照舊規則——每條要有可點名出處，
異說要 `disputed` + `note`，不能拿通說充數。

### 剩餘的靜態護欄（已做）
`audit:wiring` 第 5 條：同檔 `<img class=X>` 的 `object-fit` 必須與 `<svg preserveAspectRatio>` 配對
（contain↔meet、cover↔slice、fill↔none）。實測：把 `.era-map__photo` 改回 cover → fail 2；改回 contain → fail 0。

## 1V. 兩國互動補齊（元寇、白村江、遣隋使、萬曆朝鮮之役、一戰、二戰）

### 起點改回赤壁之戰
使用者要求進站不要從夏開始，改從赤壁之戰。`readHash()` 的 fallback 改回
`{ topic:'china', chinaEra:'sanguo', started:true }`，而 `YearContext` 本來就 `useState(208)`
（= 赤壁之戰當年），所以進站即 184–280 年表的 208 年。時代索引頁仍在，
從 `EraBar` 的「時代索引」按鈕進入（`started=false` → `#/`）。

### 新增 `CrossEraLinks`：年表上的跨國跳轉
`src/components/CrossEraLinks.tsx`。事件加 `crossRefs: [{topic, era, year, label}]`，
三個年表元件（`japanEras/EraTimeline`、`imperial/components/ImperialTimeline`、
`japanHistory/components/JapanTimeline`）在出處下面渲染。點了就 `setTopic` + `setChinaEra/setJapanEra`。
**已知限制**：只切時代，不同步年份（各 app 的 year context 各自獨立，路由不帶年份）——
連結文字裡會寫年份。同步年份列在 §7。

### 補了什麼（兩側都要有，這是這輪的規矩）
| 事件 | 中國側 | 日本側 |
|---|---|---|
| 遣隋使 607 | `suiPack` sui-607 | `asukaPack` as-607（新增） |
| 白村江 663 | `tangPack` tang-663（新增） | asukaPack as-663（出處補到《舊唐書》《三國史記》） |
| 鑑真東渡 753 | tangPack tang-753（新增，`type:'culture'`） | `naraPack` nr-753（新增） |
| 元寇 1274/1281 | `yuanMingQingPack` ymq-1274、ymq-1281（新增） | kamakuraPack km-1274、km-1281（改寫） |
| 萬曆朝鮮之役 1592/1598 | yuanMingQingPack ymq-1592、ymq-1598（新增） | `azuchiPack` az-1592、az-1597（新增，原本完全沒有朝鮮出兵） |
| 一戰 1914/1915/1919 | `minguoPack` mg-1914、mg-1915、mg-1919（新增） | `japanHistory/data/timeline.json`（原本 1914-1919 完全空白） |
| 二戰 1931/1937/1945 | minguoPack mg-1931、mg-1945（新增；1937 原有） | timeline.json jp-1937（新增；1931/1941/1945 原有） |

元寇那兩條按使用者點名的重點寫：**對馬、壱岐是先被攻下的**（1274 六月對馬→壱岐→閏七月博多灣，
對馬守將宗國助戰死），不是「途中遭遇」；「神風」標 `disputed`，並寫明那是日本近世以降的強調，
元方記錄的因果是兩路失期與將領被追究。兩側敘事並列。

### 稽核抓到自己的漏（值得記）
`audit:ranges` 的 `outcome-thin` 規則：有 `outcomeSource` 的事件必須有 ≥400 字、分段的
`outcome`（結果與影響）。我新加的 12 條帝國包事件全部只有 `outcomeSource`，
第一次跑就 warn 12，補完才歸零。**這正是規則存在的理由**：跨國事件不能只寫一句「某某發生」。

`audit:wiring` 新增第 6 條：`crossRefs` 的 `era` id 必須存在於 `CHINA_ERA_SLOTS`/`JAPAN_ERA_SLOTS`，
且 `year` 要落在該時代的跨度內（從 slot 的 `range` 字串解析，`前1600–前1046` → -1600/-1046）。
寫這條時自己踩了一個坑：`indexOf(']')` 會抓到型別註解 `EraSlotMeta<ChinaEraSlot>[]` 的 `]`，
解析出來是空陣列，結果 19 條連結全部誤報 `crossref-bad-era`——要從 `= [` 之後找陣列結尾。

### 其他
- `EraEventType` 與 `ImperialEvent.type` 加 `'culture'`（鑑真那條），`EraTimeline.labelType` 加「文」。
- 新文字一律繁體；掃過一輪簡體混入（`国内→國內、对等→對等、在东大寺→在東大寺`）。
  書名`《六十年来中国与日本》`與「二十一條」是原名，保留簡體字形是對的，不要「順手改掉」。



## 1W. 三個決定、跨國連結的年份同步、互動內容第二批

### 三個懸而未決的決定（已做）
1. **目錄改名** `sanguozhi-3d-main/` → `sanguozhi-3d/`（`git mv`，歷史保留）。
   跟著改：根 `.gitignore`、根與子目錄兩份 `audit.yml`、README、HANDOVER。
   順帶把 `__pycache__/`、`*.pyc` 加進 `.gitignore`（盤上有 .pyc，未入庫）。
2. **授權**：根 `LICENSE` = **MIT，只涵蓋程式碼**（檔頭寫明不覆蓋資料）；
   根 `LICENSE-data.md` = 資料分層（CODH CC BY-NC 4.0／部分 CC BY-SA、Commons 底圖各檔自有授權、
   自有整理提議 CC BY-NC 4.0）。結論：整個網站的再利用受限於 NC，MIT 不等於資料可商用。
3. **刪 `src/chinaHistory/`**：它沒掛路由、各時代已有自己的包，而且就是「成語面板掛在永遠不會出現的
   app 上」那個 bug 的來源。`lib/formatYear.ts` 搬到 `src/lib/formatChinaYear.ts`（ImperialApp 在用），
   通史時間軸與人物留檔搬到 `docs/reference/china-overview-{timeline,people}.json`。
   `audit-wiring` 的 `UNROUTED_APPS` 例外跟著刪（留註解說明機制仍在：新的孤兒 app 一律 fail）。

### 跨國連結現在會同步年份
`src/state/pendingYear.ts`：極小的一次性暫存。`CrossEraLinks` 點下去時 `setPendingYear(year)`，
目標 app 的 year context 初始化時 `takePendingYear(min, max)` 取走（跨度不符回 null，退回自己的預設年）。
9 個 year context 全部改：`useState(<預設>)` → `useState(() => takePendingYear(...) ?? <預設>)`。
深連結形式：**`#/japan/kamakura@1274`**（`readHash()` 解析 `@年份`）。
實測：元 1274 的連結 → 鎌倉滑桿停在 1274（不是 1185）；`#/japan/kamakura@1281` 直接開在 1281；
鎌倉 1268 → `#/china/liaosong`、滑桿 1268。
**缺口已補（§7 4c）**：hash 現在會寫 `#/${topic}/${era}@${year}`，
年份由各 app 的 year context 回報（`src/state/yearReport.ts`）。實測見下方 4c。
踩的坑：用腳本插 import 時插進多行 `import {` 的中間，9 個檔一起 syntax error——
要一路找到 `}` 才算一條 import 結束。

### 互動內容第二批（15 條）
- 元寇的外交段：`ls-1268`（元遣使、日本不奉書）、`ls-1275`（元使被斬於博多，disputed）、
  `ymq-1294`（三度征伐之議中止）、`km-1268`、`km-1275`、`km-1293`（鎮西探題＝防衛常設化）。
- 對馬主線：`1510-amiu` 三浦之亂（己未倭變，戰國 app）、`jp-1609-kiyu-joujou` 己酉約條、
  `jp-1877-tushima-kizoku` 対馬帰屬問題（外務省『対馬島帰屬考』、金弘集『修信使日記』）。
- 一戰：`mg-1917` 對德奧宣戰與華工、`mg-1922-wash` 華盛頓與山東歸還、`jp-1922-washington`。
- 二戰：`mg-1932` 滿洲國＋一二八、`mg-1943` 開羅宣言、`jp-1943-cairo`。
- `SengokuTimeline` 也接上 `CrossEraLinks`（`SengokuTimelineEvent.crossRefs`）。

### 稽核抓到兩類**真的** bug（不是誤報）
`crossref-year-out-of-era` 連同各包的 `yearMin/yearMax` 暴露出「事件放錯包、根本點不到」：
- 1268、1275 放在元明清包（`yearMin: 1271`）→ 滑桿走不到這兩年 → **移到遼宋包（960-1279）**，
  並在 secondary 寫明為什麼放這個包。
- 1510 三浦之亂放在室町包（1336-1467）→ 同樣點不到 → **移到戰國 app 的 `timeline.json`（1467-1572）**。
教訓：加事件之前先看該包的 `yearMin/yearMax`，不是看時代名對不對。

### 上傳準備（未執行）
新增 `docs/PUBLISH.md`：已檢查過的項目（357 檔、.git 2.7MB、無祕密、`reports/range-audit.json` 必須入庫、
vendor 54MB 已 gitignore）、`gh auth` 卡在 token 無效、建 repo 的指令、
以及**不要 force-push 到既有 upstream**（本地是重新 `git init` 的歷史，與原上傳那份無共同祖先）。



## 1X. 日本側時間軸內容大批補建（2026-11-01 夜間批次）

### 數量（本輪前 → 本輪後）
| 專題 | 前 | 後 |
|---|---|---|
| 古墳 kofunPack | 4 | 14 |
| 飛鳥 asukaPack | 7 | 23 |
| 奈良 naraPack | 5 | 19 |
| 平安 heian（history.ts） | 25 | 30 |
| 鎌倉 kamakuraPack | 8 | 23 |
| 室町 muromachiPack | 5 | 16 |
| 戰國 sengoku timeline.json | 14 | 20 |
| 安土桃山 azuchiPack | 6 | 12 |
| 幕末 bakumatsu（history.ts） | 15 | 28 |
| 江戶＋近現代 japanHistory timeline.json | 72 | 112 |
| **合計** | **161** | **297** |

全部條目：出處點名到書名／條約名／檔案名（『日本書紀』『續日本紀』『吾妻鏡』『愚管抄』『百錬抄』
『御成敗式目』『増鏡』『園太曆』『日本紀略』『満済准后日記』『華夷變態』『明太祖實錄』
『日米和親條約』『中日天津條約』『日本国との平和條約』『村山談話』等）；
有爭議的一律 `disputed: true` + note（七支刀、好太王碑、稻荷山鐵劍銘、十七條憲法、任那、
公曉動機、永禄之変主導者、比叡山死者數）。japanHistory 的 1603 年以後條目**全部**有 `note`
（`jp-event-note-missing` 歸零）。

### 語體：正文是繁體中文，不是日文
本專案連日文書名都用繁體形（續日本紀 42 例 vs 続 3 例；百濟 11 vs 百済 9）。
本輪最初把 desc/note 寫成日文句法（「ハリスが…迫り」「幕府の武威は…終る」），
與既有條目（例如櫻田門外那條的中文寫法）風格明顯不一致——已全部改寫。
**規則：寫資料文字用中文句法；日文只留在書名、專名（ヤマト、アイヌ、コシャマインの戦い）
與資料集名（CODH 旧国・旧郡境界データセット）。**
字形的批量轉換必須帶**保護清單**：一次全檔替換把 `の戦い`→`の戰い`、`摂関`→`摂關`
這種日文原文改壞過，已 `git checkout` 還原，改為只對我們自己寫的條目做轉換。

### 工具教訓（腳本批量插事件時）
- 插入位置的正則要錨在**物件的 `{`**，不是 `id:`；錨在 `id:` 會把既有物件切開（幕末那次 tsc 爆 100+ 行）。
- 派系名要加引號：`factions: ['豐臣']`，不是 `factions: [豐臣]`（evlib 只對 `F.xxx` 該裸寫）。
- 各 app 的陣列起點不同：`events: [`（japanEras）、`export const HEIAN_EVENTS: EraEvent[] = [`、
  `export const BAKUMATSU_EVENTS: EraEvent[] = [`、JSON 檔則是純陣列——插入器要能吃自訂 opener。
- 加事件前先查該專題的 `yearMin/yearMax`（戰國 app 的 YEAR_MAX 是 1572，1576 放進去就點不到）。
- 幕末事件有月級欄位（`month`、`datePrecision: 'month'`），新增時要一起給。

### 雙向連結的對稱性（本輪最後一段）
日本側有 71 條 `crossRefs` 指向中國側，其中 **47 條落到中國側沒有事件的年份**（跳過去是空的）。
本輪補了最核心的 8 條中國側事件：
- 明—日本：`ymq-1369` 詔諭日本、`ymq-1372` 冊封良懐、`ymq-1401` 冊封源道義、`ymq-1404` 勘合貿易
- 清—日本：`ymq-1874` 台灣出兵、`ymq-1885` 天津條約、`ymq-1894` 甲午戰爭、`ymq-1904` 日露戰爭與清的「中立」
每條都要有 `university`／`outcome`（**≥400 字**，注意：中文密度高，我寫的三段常只有 300-370 字，
`outcome-thin` 會挑；補到四點才過）／`outcomeSource`。

**還缺的中國側落點**（用 `python3 /tmp/symmetry.py` 比對 crossRefs 與各包事件年；腳本思路：掃 `topic: 'china'` 的年份，對照 `src/imperial/data/*Pack.ts` 的事件年）：
本輪已補 10 條（民國 1918/1940、共和國 1952/1972/1982/1995/2012、元明清 1715、南北朝 478、唐 702），
**空年 47 → 30**。残り（優先順、真の交互 > 同時代脈絡）：
- 元明清包：1858（日米通商條約と阿羅戦争の同年比較）、1864、1873、1877（対馬帰屬問題で清が朝鮮の宗主として関与）、
  1610／1635／1655／1713（朱印船・鎖国の段階・通信使・華夷観）、1441／1493／1549／1565／1568／1571（戰國）、
  1297／1318／1324／1331／1338（鎌倉末〜元中、元寇以降の外交）
- 共和國包：1965（日韓基本條約と中華人民共和国の立場）
- 唐包：646／664／701／708／754／794（大宝律令・白村江後の防衛・鑑真・平安京）— 754 は鑑真、702 は済み
- 飛鳥→随の 608 は、既存事件 `sui-607`（倭國遣隋使）に crossRef を寄せた（年をずらすのではなく**実在する対応事件に合わせる**のが正しい直し方）

**書き方の注意（本輪で出た監査ルール）**
- `outcome-thin`：中文は密度が高く、3 段落でも 280-350 字しかない。**結果＋影響を4〜5点**書かないと 400 字に届かない。
- `outcome-source-generic`：`outcomeSource` に《》か『』の書名が最低1つ必要（「検定関連文書」だけでは落ちる）。
- 上記2つで本輪は3回やり直しになった。次は最初から5点・書名2つで書くこと。


### 本輪總計
日本側事件 161 → 297（+136）；中國側 +12（明—日本 4、清—日本 4、上一輪的元寇/一戰/二戰 4 已在 §1W）。
四支稽核全綠（wiring 0/0、data 0/0、ranges 0/0、geo 130 環 0 可疑），tsc 與 build 通過，
瀏覽器實測 `#/japan/{asuka,nara,kamakura,muromachi,sengoku,azuchi,bakumatsu,heian,modern,edo}@年份`
都停在該年、chips 渲染、LayoutGuard 全程 quiet；`#/china/yuanmingqing@1894` 出現
「日本 明治至當代 1894：日清戰爭開戰（日方視角）」的反向連結。


### 年表滑桿的寬度（UI 一致性，2026-11-01 修正）
六個日本時代專題（`DeepDiveApp`）把滑桿放在 `.app-header` 的 flex 列裡卻沒給 `flex-basis`，
被擠到 **129px**（拖不動、點不准），而戰國/幕末/平安/江戶/近現代的滑桿是 **1240px** 滿版。
修正：`.year-scrubber--inline { flex: 1 1 100% }` 讓它自己佔一排，刻度（`<ol><li><button>`，
原本沒有任何樣式規則套得到）改成 48-60×30px 的年份 chip，並高亮「已通過的關鍵年」而非只高亮完全同年。
**規則：新增時代專題時，header 內的滑桿一律滿版；刻度用 `<ol>` 變體就要確認 CSS 有覆蓋到
（`.year-scrubber__tick` 那組規則只作用於絕對定位的 `<button class="year-scrubber__tick">`，
套不到 `<li><button>`）。** 窄視窗（820px）下 chip 會自動換行、不產生橫向捲動。


### 還可續做的（日本側）
- 古墳 14 條仍偏薄（考古類，需要點名考古報告而非史書）。
- 平安 app 的窗口只有 1150-1185，10-11 世紀的條目在滑桿上點不到（通史錨），要否把窗口拉寬是產品決定。
- 戰國 app 的 `timeline.json` 有 1573-1615 的條目但 `YEAR_MAX` 是 1572（既有狀況，非本輪造成）：
  那些條目在戰國 app 點不到，由安土桃山 app 覆蓋；要清就兩邊一起清。



## 2. 任務 1 還剩什麼（按價值排序）

1. **補快照，減少沿用年數**。目前要靠沿用的年份：周 1835、元明清 632、唐 284、十六國南北朝 279、秦漢 397、遼宋 315、共和國 71、五代 49、隋 35、晉 33、民國 32。有明確出處（《漢書·地理志》《續漢書·郡國志》《隋書·地理志》《元和郡縣圖志》《元史·地理志》《明史·地理志》《清史稿·地理志》、譚其驤《中國歷史地圖集》各幅）的年份才加，加完跑 `npm run audit:ranges`。
2. **秦漢 100–183 只有 36 年一張**，是跨度最大的一段；《續漢書·郡國志》永和（135–140）／建安（196–220）都有可據的郡國，值得加一張。
3. **把幕末的沿用文字統一進 `carryOverNote()`**。`src/bakumatsu/data/territory.ts` 自己寫了一套「沿用」措辭，沒走 `src/lib/snapshotCarryOver.ts`；統一之後所有專題措辭一致（稽核頁的模擬器也能涵蓋日本）。
4. **`source-atlas`（通說／地圖集層級）目前只列 info**：共和國 1949–2026、元明清 1750／1860／1911 的 `source` 是「××通說」。要升級成原典引用，或維持 info 但在圖例顯示層級標籤。
5. **圖例顯示 `geometryFrom`**：`src/components/FactionLegend.tsx` 與各包 Legend 目前不顯示「這塊色塊其實取自某年」，只有滑桿下方有提示。
6. ~~把 `audit:ranges` 加進 CI~~ 已做（見 §1N）。注意原本那份 workflow 在子目錄、永遠不會跑；現在 repo 根那份跑 build + 三個 audit。

## 3. PLAN 的四項 todo 全部完成

| todo | 名稱 | 狀態 | 本文件 |
|------|------|------|--------|
| 1 | `audit-ranges` | 已做 | §1 |
| 2 | `qinhan-months` | 已做 | §1B |
| 3 | `jp-islands` | 已做 | §1C |
| 4 | `lengthen-narrative` | 已做 | §1D |
| 4+ | 出處升級（用戶追加） | 已做 | §1E |
| 4++ | 規則 16 延伸到日本各包、清掉維基出處 | 已做 | §1F |
| 4+++ | 秦漢逐月專條 26 → 50 條 | 已做 | §1G |
| 4++++ | 「結果與影響」改寫為大學生程度論述（三國 28 條）＋規則 19 | 已做 | §1H |

下一輪要接手，先讀 §1、§1B、§1C、§1D、§1E、§1F、§1G 末段的「還剩什麼」，那些才是按價值排好的候補項；
其中最有價值的一項是把其他包的「結果與影響」也寫成同樣的深度：規則 19 的
`outcome-backlog` 現報帝國包 0/44、周 0/70、秦漢 0/21、幕末 0/15、戰國 0/13、平安 0/9
（三國已 28/28，見 §1H）。其次：秦漢閏月只有前205 一年（要查陳垣《二十史朔閏表》）、
開拓使轄區與全島環不符、幕末與戰國包的出處還沒納入規則 16。


## 4. 其他遺留（不是 PLAN 的 todo）

- `npm run audit:data` 有 **63 條 warn、0 fail**（`docs/AUDIT.md`）：`source-allowlist` 30、`simplified-han` 28、`yanyi-trope` 3、`year-range` 1、`simplified-ui` 1。注意 `scripts/audit-data.ts:51` 的簡體字表把「西」列進去了 → 會誤報正常的「西」，先修 linter 再清資料。
- `reports/route-coord-orphans.md`：102 個行軍座標沒有對應事件（舊腳本產物，未處理）。
- `docs/PLAN.md` 的 Phases 是舊清單，跟現在的專題結構不符；本檔第 1–3 節才是現況。

## 5. 踩過的坑（務必避開）

1. 欄位名是 **`geometryFrom`**，不是 `carryOverFrom`。兩邊都寫過，已統一；看到舊註寫 `carryOverFrom` 就是沒更新。
2. 快照陣列**必須按年升序**：`resolveImperialSnapshot()` 一旦遇到比目標年大的就 `break`，排序錯會沿用錯年（稽核有 `snapshot-unsorted`）。
3. 在 `scripts/` 裡 import `src/` 要用 **Vite SSR**（`createServer().ssrLoadModule('/src/...')`），因為 `src` 內的 import 沒有副檔名，`node --experimental-strip-types` 直接 import 會失敗。
4. `cover()` 找不到環編號時過去會靜默略過 → 現在會進 `missingIds`，稽核報 `ring-id-unknown`。改 `src/geo/eraRegions.ts` 的環號要一起改引用。
5. 介面文字是繁體書面語；`audit:data` 會掃 `src/components/**` 的簡體字。
6. 不要 commit（repo root 在上層 `my-project/`，整個專案 untracked）。
7. 改完一定要跑：`npx tsc --noEmit -p tsconfig.app.json`、`npm run build`、`npm run audit:ranges`、`npm run audit:data`。
8. 秦漢的月份**不是正月排起**：前104年以前以十月為歲首（顓頊曆，《資治通鑑》沿用）。
   要比較兩個月份的先後，一律用 `monthOrdinal(year, month)`，不要用 `month` 直接比大小。
9. 月份 slot 用負數表示閏月（`-109` = 後九月）。`formatQinHanMonth(year, month)` 會處理；
   自己拼字串就會顯示錯。
10. 月份不能新畫邊界：`territoryFrom` 只能引用 `territoryControl.ts` 已有的快照年，
    否則 `audit:ranges` 報 `month-territory-unknown`。
11. 日本外周的年份**不要在元件裡寫死**：一律 `fringeWindowsAt(year)`（`src/geo/japanFringeWindows.ts`）。
    虛線與否只由 `fringeIsDashed(mode)` 決定；新加窗要在同一檔加 `source`，否則稽核 fail。
12. `scripts/audit-ranges.ts` 的報告是**單一模板字串**：裡面要寫反引號必須 `\`` 跳脫，
    否則整個腳本 syntax error（改規則文字時最容易踩）。
13. 改 `src/japanHistory/data/timeline.json` 要用腳本插入並**立刻 `json.loads` 驗證**：
    條目最後一行與 `},` 之間只能有一個逗號，手動加 `note` 很容易做出 `",\n  },` 的尾逗號。
14. 敘事檔一律**繁體**：寫長中文時簡體字（`統、历、后、农、实`）會混進去，
    改完要 grep 一次。日文專名（シャクシャイン、クナシリ）保持原文，不要硬翻。
15. **不要引原文**，除非能核對出處。`classicQuote` 這一欄現在一律是意譯，
    `classicSource` 寫「意譯，據《…》」；假造引文比沒有引文更糟。
16. 批量改 `source` 要**按區塊**判斷（events / profiles / leadersByYear / snapshots），
    不能只記「最近一個事件 id」。第一版把派系簡介與人物的出處跟著上一個事件走，
    粵系拿到防衛省《中國陸軍作戦》、毛澤東拿到《中葡聯合聲明》。
    改完一定要 dump 出每一條 source 親眼看一遍。
17. **百科全書不能是唯一出處**。規則 16 的 `source-wiki-only` 會抓「中文維基「×」」這種寫法；
    要換成該事件真正的軍記、日記、文書或條約名，軍記物要標「軍記」（『甲陽軍鑑』另標爭議），
    神話紀年要標「追述」並列考古編年。
18. **新加稽核規則先跑一次看誤報**，再改資料。規則 16 第一次跑就報 fail 30，
    全是誤報：派系簡介的出處存在 `politics.source` 等子欄，不是頂層 `source`。

## 6. 驗證清單（本輪已跑過，全綠）

```bash
npx tsc --noEmit -p tsconfig.app.json   # clean
npm run build                            # clean
npm run audit:ranges                     # fail 0, warn 0, info 28（快照 75 張 + 月份 + 外周窗 + 敘事 + 日本年表）
npm run audit:data                       # fail 0, warn 63（既有，與本輪無關）
```

瀏覽器實測（agent-browser，port 5177）：

- 沿用提示：`#/china/han` 前150、`#/china/chunqiu` 前600、`#/china/prc` 1970 ✓
- 秦漢逐月：`#/china/han` 前206 十月（沿用前214）→ 二月（改畫前206楚漢）→ 三月（本月無專條）；
  `#/china/qin` 前221 十月起逐月；前205 有「後九月」刻度 ✓
- 日本外周：`#/japan/modern` 1960 → 北海道實色 + 沖繩虛線（美治，附條約出處）；
  1980 → 沖繩縣實色；`#/japan/edo` 1700 → 松前＋琉球虛線；1603 → 無外周色（1604 才有黑印）；
  `#/japan/bakumatsu` → 只有 松前／琉球（薩摩附庸），全道未塗 ✓
- 敘事四層不重複：`#/china/tang` 780 兩稅法 → 詳情窗的 起因／經過／結果與影響／意譯
  四段文字各不相同（以前 經過 與 意譯 都是同一句 desc）✓
- 日本年表新增條目：`#/japan/edo` 1637 → 島原・天草一揆；`#/japan/modern` 1868 →
  戊辰戰爭（鳥羽伏見至箱館）與明治維新並列 ✓
- 出處升級：`#/china/minguo` 1928 → 頁面出現《北伐宣言》、張學良易幟通電、
  来新夏《北洋軍閥史》、郭廷以《中華民國史事日誌》；`#/china/prc` 1978 →
  十一屆三中全會公報、《鄧小平文選》第二冊、《中國共產黨歷史》✓
- 日本各包出處：`#/japan/kamakura` 1281（弘安之役）→ 頁面出現『八幡愚童訓』『保暦間記』✓；
  規則 16 現在走帝國 11 包＋japanEras 6 包（含行軍路線），
  `source-naming` = **364 條點名、未點名 0 條** ✓
- 截圖：`/tmp/audit-page.png`、`/tmp/audit-probe.png`、`/tmp/han-carry.png`、`/tmp/zhou-carry.png`、
  `/tmp/qinhan-months.png`、`/tmp/jp-fringe-1960.png`

## 7. 接手佇列（2026-11-01 更新，依價值排序）

### 現況（本輪結束時）
- 成語 118 條（zh 69／jp 46／shared 3），**全部**有 `history`（史事）、16 條 `disputed` 都標了 `disputeKind`、68 條有 `related`、7 條 `eraLink.kind='event'` 會跳到時間軸事件並閃示。
- 四支稽核全綠：`audit:wiring` 0/0、`audit:data` 0/0、`audit:ranges` 0/0、`audit:geo` 130 環 0 可疑。
- 已知並已修：成語槽掉在 `AppSideRail` 外（§1S）、總覽圖 `cover` vs `meet` 造成色塊錯位（§1S）。

### 值得做（便宜→有價值）
1. ~~**視覺回歸測試**~~ **已做（§1T）**：`src/components/LayoutGuard.tsx`（只在 dev 掛載）
   把「用眼睛看版面」變成幾何斷言。要進 CI 還差一個無頭瀏覽器步驟（讀守衛的 console 輸出即可）。
2. ~~**註冊檢查的靜態版還沒做**~~ **已做（§1U）**：`audit:wiring` 第 5 條離線比對
   `<img class=X>` 的 `object-fit` 與同檔 `<svg preserveAspectRatio>`
   （`cover`↔`slice`、`contain`↔`meet`、`fill`↔`none`）。實測：改回 cover → fail 2。
3. ~~**成語清單要能收**~~ **已做（§1T）**：每批 15 條＋「再多 N 條」。
4. ~~**側欄寬度**~~ **已做（§1T）**：`minmax(18rem, 0.68fr)`，1280px 下側欄 40%（原本 49%）。
4b. ~~**跨國連結只切時代、不同步年份**~~ **已做（§1W）**：`src/state/pendingYear.ts` ＋
    `#/japan/kamakura@1274` 的 hash 形式，9 個 year context 初始化時 `takePendingYear(min,max)`。
    實測：元 1274 → 鎌倉滑桿停在 1274。
4c. ~~**跳過去之後網址不寫年份**~~ **已做**：`src/state/yearReport.ts`（單一訂閱點，
    理由與 `pendingYear` 相同：九個 year context 分散九個專題，傳 prop 要穿每一層 provider）＋
    九個 context 各加 `useEffect(() => reportYear(year), [year])`，`TopicContext` 收下來寫
    `#/${topic}/${era}@${year}`。`replaceState` 不觸發 hashchange，所以不會重複跳轉。
    **換時代時先把 year 清成 null**：不清的話 hash effect 會把**上一個專題**的年份寫進新時代的
    網址，那比不寫年份更糟（是一個看起來正確的錯誤年份）。
    順手把 hash 解析抽成 `src/state/hashRoute.ts` 的純函數——專案的測試是 `tsx --test`、
    沒有 jsdom，放 in component 的 effect 驗不到。
    抽出來立刻抓到一個**既有 bug**：`Number('')` 是 0，所以 `#/japan/kamakura@`（年份漏填）
    會被當成「西元 0 年」寫進網址、還把滑桿跳到 0。現只認 `/^-?\d+$/`。
    驗收（agent-browser 實測 http://localhost:5199）：`#/china/yuanmingqing` → 網址自動變
    `@1644`；`#/japan/kamakura@1274` → 滑桿 1274、網址保留 `@1274`、**重新整理仍在 1274**；
    點側欄換到平安 → `#/japan/heian@1184`（不留 1274）；拖滑桿到 1166 → 網址跟到 `@1166`；
    拖到超出跨度（平安 1150–1185 拖 1127）→ 夾到 1150，網址也寫 1150。
    測試：`tests/hash-year.test.ts` 8 條（含公元前負數 `@-1046`、舊的無年份連結照樣解析）。
    驗收：從元 1274 跳到鎌倉後，網址應是 `#/japan/kamakura@1274`，重新整理仍在 1274。
5. ~~**範圍切換要 sticky**~~ **已做（§1T）**：`.chengyu-scope` 改成 sticky。

### 資料債（要外部資料，不能手繪）
6. 1882 三県的**郡級**界（現在是旧國多數決近似）、1897 一県制・支庁再編、千島・樺太界線
   （1855／1875／1905／1945）——都要先拿到 CODH 旧郡或同等資料集。
7. 中國疆域 44 張仍是現代邊界代理（0 個實測）；CHGIS 那一批才是解法。
8. 平安 794–1150 有事件無地圖年；圖例不顯示 `geometryFrom`（沿用哪一年的色塊）。
9. 成語缺口：元（崖山・元寇的中國側）、明中（土木堡 1449、萬麗之役）、隋唐只有 8 條。

### 打掃
10. `ChinaHistoryApp` 仍未掛路由（`audit:wiring` 的 `UNROUTED_APPS` 有理由）；要刪要掛都行的時候說一聲。
11. `sanguozhi-3d/` 這個目錄名是 ZIP 遺跡；若要改名成 `sanguozhi-3d/`，
    要同時改 `.github/workflows/audit.yml` 的 `working-directory` 與 `cache-dependency-path`、
    以及本檔與 README 的路徑。

### 不要做
- 不要用手繪多邊形補歷史界線。
- 不要把 `reports/range-audit.json` 加進 gitignore（它是 build 輸入）。
- 改 JSX 縮排／結構的腳本要特別小心：prop 掉到標籤外不會編譯失敗（§1S）。

## 1Y. 江戶大名領地層與明治擴張年表（2026-11-01）

### 江戶的大名領地（任務一）
`src/japanHistory/data/edoTerritory.ts` 把 28 個 traced domain（d0–d27，CODH 旧國）
在六個快照年映射到大名系：幕府・天領、豊臣（僅 1603）、御三家、譜代・親藩、外樣、
加賀・前田、伊達・仙台、薩摩・島津、長州・毛利。`JapanEraMap` 在 1603–1868 之間
畫色塊與該年的行軍虛線（`edoMarchRoutes.ts`：大坂之陣、島原・天草、島津出兵琉球、
シャクシャイン、クナシリ・メナシ、慶安之變、禁門之變、第二次長州征討、大塩之亂）。

- **快照年之間的真實變動**：1603→1615 是豊臣除封（攝津入天領）；1615→1650 是寬永末年
  改易・轉封的收尾（會津上杉→保科、越後堀→松平・酒井、肥後加藤→細川）。1700 以後
  舊國層不動，變動在藩內（分知・減封），這層看不出來——這是刻意限制，不是漏資料。
- **藩界沒有畫**：`bakumatsuHanMeshes.ts` 的藩層只覆蓋 21/28 domain、面積僅 16%，
  `USE_HAN_MESH_LAYER` 因此是 false。江戶沿用同一判斷，用旧國層＋圖層說明，
  不用手繪多邊形補藩界。
- 行軍端點取自 traced domain 形心（見 `/tmp/centroids.py` 的做法），是「該國大致位置」，
  不是城址實測；慶安之變那條是計畫方向，已在 source 與 note 標明未實行。

### 明治至當代的擴張（任務二）
`timeline.json` 新增 15 條：馬關條約割台、乙未戰爭、六三法、第二次日韓協約與關東州、
朝鮮軍解散與丁未偽詔、三・一運動、濟南與皇姑屯、南京、近衛聲明與蒙疆、諾門罕、
進駐法屬印度支那、馬來亞・新加坡・蘭印・緬甸、英帕爾・塞班・萊特、蘇聯對日參戰、
降伏後的權力真空。明治以後由 56 條增至 67 條。

- crossRefs 的 era id 是 `yuanmingqing`／`minguo`／`prc`（**不是** `mingguo`），
  且 `year` 必須是目標包裡實際存在的年份，否則連結靜默失靈；audit:wiring 會抓 id，
  不會抓年份，年份要自己查（`grep "year: 1905" src/imperial/data/yuanMingQingPack.ts`）。

### 已知做不到的（地圖幾何）
通史的地圖底圖是 1482×1477 的**列島**範圍，朝鮮、台灣、滿洲、東南亞不在鏡內
（琉球環在 x≈50–300、y≈1230–1410，台灣再往西南約一千像素，已在畫布外）。
所以擴張「領土」目前只有年表與文字，沒有色塊。中國側的地圖（`src/geo/eraRegions.ts`，
1968×1567）才有東北、朝鮮半島、台灣的環。**要做擴張地圖，必須新做一張底圖與環，
不是把環塞進現有的通史地圖。**

### 還沒做的（任務三、四）
- 共和國（prc）領土精度與 1949 年後的戰事（韓戰、中印邊界、中蘇邊境、中越）——任務三。
- 民國（minguo）領土不準，需細修——任務四。
- `timeline.json` 的明治以後條目仍有大量日文（1902、1904、1910、1918、1923、1925、
  1932、1933、1936、1940、1951、1952、1965、1978、1982、1995、1997），
  與「本文一律繁體中文」的規則不符；新增條目已依規則寫，舊條目尚未清理。

## 1Z. 共和國與民國的領土精度（任務三、四，2026-11-01）

### 共和國（prc）
- 新增 **1950年快照**（`PRC_1950 = realm_prc_1949 + hainan`）：海南1950年5月易手，
  西藏1950年10月有昌都戰役但拉薩1951年才簽《十七條協議》，所以1950這張**含海南、不含西藏**。
  實測驗證：海南框（x 1160-1260, y 1470-1555）在 1949 年 0 個點、1950 年 26 個點、1951 年 22 個點。
- 新增 1949 年後的戰事專條：抗美援朝 1950、金門炮戰與一江山島 1954、八二三炮戰 1958、
  珍寶島 1969、西沙海戰 1974、赤瓜礁海戰 1988。每條都有 `outcome`（≥400字、四段）與
  帶書名的 `outcomeSource`，audit:data 才過得去。
- **不改色塊的戰事**：朝鮮、中蘇邊境、南海島礁。理由寫在專條裡——邊境衝突不改變行政歸屬，
  島礁在舊圖比例下不可畫。把南海整片塗色會掩蓋「實控」與「主張」的差別。

### 民國（minguo）
- 新增 **1945年受降後快照**（`MINGUO_1945`）：台灣回歸、東北四省由偽滿恢復、陝甘寧仍是共產黨、
  新疆在國民黨、西藏仍噶厦。1937→1949 之間原本沒有快照，這段是民國版圖變動最大的一段。
- 新增領土專條：**外蒙古公投與唐努烏梁海的消失**（1945/1946）、**接收南海諸島與十一段線**（1946/1947）。
- **外蒙古與圖瓦不畫**：`eraRegions` 沒有蒙古環，`steppe`（x 516-1539, y 253-597）橫跨內蒙古與滿洲，
  不能當外蒙古用；規則也禁止手繪多邊形補歷史界線。因此只在快照注文與專條記錄。
- 1949 那張的注文本來就已寫明逐月易手的順序（四月渡江、十月廣州、十二月川滇），
  這層（單一大色塊）無法再細，要更細必須拆 `realm_prc_1949` 的幾何。

### 教訓
用 editor 工具在 TS 陣列插入元素時，**anchor 若含被插入元素自己的開頭（`{ id: 'x',`），
會被一起換掉**，留下孤兒欄位（本次 mg-1945 被吃掉，tsc 立刻報 TS1005）。
插入後一定要跑 tsc，不要只看 diff。

## 1AA. 江戶地圖改用共用 EraMapView、戰爭詳情（2026-11-01）

### 為什麼之前看起來「比較暗、看不到行軍」
第一版把大名色塊疊在通史的 `JapanEraMap` 上：73 個 `<path>`、`fillOpacity 0.55`、
行軍用 2.4px 虛線、只在完全同年出現，而且**沒有圖層開關**。其他時代用的是
`EraMapView`：底圖不加濾鏡、色塊依勢力合併成一條 path（預設 0.62、點選 0.78）、
行軍由 `RouteOverlay` 畫三重粗線（米色邊＋黑＋勢力色）加箭咀與自避讓標籤，
另有「圖層」開關（勢力／行軍／地名）。兩套畫法不同，所以江戶顯得又暗又空。

### 現在的做法
`src/japanHistory/components/EdoMapStage.tsx` 用 `EraMapView`，`JapanHistoryApp`
以 `territoryMap="edo"` 切換（`App.tsx`）。`JapanEraMap` 回到只做底圖＋外周。
舊的 `edoMarchRoutes.ts` 與自訂 overlay 已刪。

### 行軍端點的來源
`edoMapData.ts` 的座標不是手繪：先算 CODH 旧國 mesh（`codhKokugunMeshes`）各國形心與
範圍（腳本見 `/tmp/koku_centroids.py`），再把城下町移到海岸或盆地該在的位置，
檔案頭寫了三個例子（摂津→大坂、武蔵→江戶、長門→萩）。仍是示意，不是城址實測。
`visibleYears` 沿用各包一致的 `MARCH_ROUTE_SAME_YEAR`（只在該年），與其他時代相同。

### 戰爭詳情
`src/japanHistory/data/warDetails.ts`（`JAPAN_WAR_DETAILS`，key 是 `timeline.json` 的 id）
＋ `JapanTimeline` 的「詳情」鈕與 `ClassicDetailModal`。已寫：大坂之陣、島原・天草一揆、
承久之亂、戊辰戰爭，每條有 causes／course／keyFigures／outcome（四段、≥400字）／
outcomeSource（點名原典）／小中大三種讀法。引文不能逐字確認的一律 `quoteHeading: '意譯'`。
**其餘戰爭仍是空白**，這是后補的入口。

### 精度與東南亞的實話
- 藩界畫不出來：`BAKUMATSU_HAN_MESHES` 只有 33 個藩、覆蓋 21/28 domain、面積 16%，
  所以 `USE_HAN_MESH_LAYER=false`，江戶與幕末都用旧國層。要真藩界得重跑
  `scripts/build_bakumatsu_han_rings.py` 的來源資料並補齊藩數。
- 東南亞不在任何一張底圖裡：`public/maps/` 只有 `japan_relief_display`（1482×1477，列島）
  與 `china_edcp_relief_display`（1968×1567，東亞；`annam` 環在 y 1383–1474，中南半島邊緣）。
  馬來半島、印尼、菲律賓在兩張圖外。要做必須新增一張更寬的底圖並重算全部座標，
  不是把環塞進現有的圖。

## 1AC. 日本史：原文先列後今譯＋三級語譯全面補齊（2026-11-03 夜間輪）

### 使用者指示（本輪依據）
1. 「繁體 UI 裡如何呈現日文漢文原文」→ **先列原文（漢文／日文），緊接其下給今譯**，
   不要求讀者切換程度就能讀懂。
2. 日本史也要加厚，**小學生／中學生／大學生三種程度必須都有**。

### UI／型別
- `ClassicDetailModal`：新增 `quoteTranslation`／`translationHeading`，原文 blockquote 之下直接顯示
  「今譯：……」（CSS `.event-detail__quote-gloss`）。
- `EraReading`（`src/japanEras/types.ts`）與 `SengokuReadingPack`：新增 `gloss`（今譯）、
  `quoteHeading`（未取得逐字原文時傳「意譯」）。`EraTimeline`、`SengokuTimeline` 都接線。
- `DeepDiveApp` 的 fallback **不再拿 `event.desc` 冒充原文**（無原典文句時原文欄整個不顯示）。
  這是誠實性修正：舊行為等於把解釋當成史料。

### 新增稽核 `npm run audit:depth`（`scripts/audit-depth.ts`）
對日本史五個模組（六個時代包＋平安＋幕末＋戰國＋戰爭專條，共 182 條）檢查：
`no-reading`／`level-thin`（小≥40、中≥90、大≥160 字）／`level-duplicate`／`quote-is-desc`／
`quote-source-missing`／`gloss-missing`（引日文假名原文卻沒今譯）。
出處自承「意譯」不算錯誤，另計 info。
**基線 0/182 → 本輪結束 182/182 合格**（六個時代包 107 條、平安 30、幕末 28、戰國 13、戰爭專條 4）。
另有 12 條出處自承意譯（列 info，不是錯誤）——全部卡在「該原典在維基文庫沒有全文」，見 §1AC 末。
幕末原有 11 條（三層只有 20–45 字）改寫在 `bakumatsuReadingsDeep.ts`，
`bakumatsuReadingFor` 查表順序為 DEEP → 原表 → MORE。

### 三級語譯的寫法（下一輪照做）
- 事實只能取自該事件自身的 `title/year/desc/note/source/location/factions`；
  **不可新增人名、年號、數字、地名、戰役名、官名**。可以改寫句式、把已有事實的因果講清楚。
- 小學生 60–110 字：短句、具體、術語要用白話解釋。中學生 120–200 字：機制與後果。
  大學生 220–380 字：制度意義＋史料限度＋爭點（`disputed: true` 的條目必須呈現 `note` 的爭點，不選邊）。
- 檔案位置：時代包放 `src/japanEras/readings/<pack>Readings.ts`，pack 裡
  `readingFor: (id: string) => X_READINGS[id]`；平安／幕末放 `<module>ReadingsMore.ts`，
  `heianReadingFor`／`bakumatsuReadingFor` 先查原表再查補寫表。
- 事實檢核（本輪做法）：把每條三層文字與事件自身文字並列，比對其中出現的
  2–4 位年份數字與姓氏（源／北條／蘇我／藤原…）。本輪時代包 60 條零新增專名；
  只有平安九條（主 agent 自己寫）有跨條年表引用（1185、1189 等通行系年）。

### 本輪補的逐字原文（全部已用快取逐字比對，flagged 0）
- 《吾妻鏡》（zh.wikisource 卷001–005、052；ja 卷一、二）：
  石橋山（治承四年八月廿三日）、富士川（十月廿日，**水鳥說見於《吾妻鏡》本文**，
  舊 note「水鳥之說出自軍記」已改）、一谷（鵯越）、屋嶋、壇浦（安徳入水、建礼門院被撈起）。
  - 注意：zh 本的卷次／系月與通行本有異（一谷之役系於「二月大七日丙寅」、壇浦系於
    「三月大廿四日丁未」），`classicSource` 已寫明「句讀從原本」「系月與通行本有異」。
  - 缺卷：壽永二年卷（俱利伽羅）、元暦元年宇治橋條 → 那兩條只能標意譯。
- 《信長公記》（ja「我自刊我書」本，舊假名）：桶狹間、長篠、本能寺。
- 《川角太閤記》：山崎。
- 《日本書紀》（zh 全三十卷）：冠位十二階、十七條憲法、改新之詔、白村江、壬申之亂、
  八色之姓、小野妹子使唐／裴世清來朝。《古事記》序：nr-712。
- 引文規則（踩過的坑）：引文片段要在**清理後**的正文裡逐字出現，所以
  **不要自己加句號、讀點或後引號**；截斷處用 `……` 且放在引號內。
  比對前要把零寬字（U+FE00–U+FE0F、U+200B）與空白一起去掉，ja 本的 Remix 標記會留這些字元。

### 史料清單（依使用者規則：只用原典／研究概述，不用法律資料庫或裁判文書）
`reports/source-inventory.json`：title／date／sourceType／corpus／relevance／status／usedFor／blockedFor。
本輪確認「無全文」而仍待補的：《續日本紀》《應仁記》《鐵炮記》《德川實紀》
《明太祖・太宗實錄》《華夷變態》《保元・平治物語》《言経卿記》系。

### 順手改正
- 既有簡體字：體制→體制（體）、解體、陸奧話記、三條殿、補給線、下知狀、奧州、條文、
  三好殘黨、原來的、誰說了算、締結；`xuống`（誤植的外文）→「而下」。
- 富士川條：水鳥之說出自《吾妻鏡》本文，不是只有軍記。

### 中國內戰包（1945–1949）的三級語譯與四段加厚（2026-11-03）

使用者要求：內戰模組的「語譯（分程度）」與「起因／經過／相關勢力／結果與影響」要明顯變好。

**改法**：pack 檔的 `desc`／`secondary`／`university` 同時要當時間軸卡片短文與語譯層，兩邊都不夠，
所以深度文字另放三檔，由 `ImperialTimeline.toDetail()` 優先取用（查表順序：readings → 事件欄位 → fallback）：

| 檔 | 內容 |
|---|---|
| `src/imperial/data/civilWarReadings.ts` | 13 條主要事件（受降、重慶談判、政協、中原突圍、延安、大別山、遼沈、淮海、平津、渡江、新疆與政協、建國、西南） |
| `civilWarReadingsRoute.ts` | 14 條作戰路線（`cw-r-*`） |
| `civilWarReadingsCity.ts` | 37 條城市易手（`cw-c-*`）——原本是 37 條共用同一套樣板 |
| `readings.ts` | 註冊表 `IMPERIAL_READINGS[pack.id][event.id]`，其他 imperial pack 要加就往這裡併 |

**數字（`npm run depth:stats`）**：加厚前 desc 平均 32 字、secondary 30、university 39，
causes／course／outcome 全為 0（介面拿語譯頂替）；加厚後 elementary 平均 97、
secondary 133、university 244、causes 107、course 150、outcome 277，keyFigures 2–4 個，
跨條重複句 0 處。`audit:depth` 從 182/182 變成 **246/246**（新增內戰 64 條）。

**audit:depth 新增的檢查碼**：`causes-thin`（<85字）、`course-thin`（<130字）、
`outcome-thin`（<220字）、`no-figures`；只對 `requireDetail: true` 的模組生效（目前是內戰包），
日本各時代包的詳情窗另有 `detailFor`，尚未納入。

**內戰條目的寫作紀律**（這一輪實際用過的規則）：
1. 只用事件條目與同年地圖快照 `note` 裡出現過的年代、地名、部隊、人名；
   不確定就寫到月份層、用部隊／機構名，不憑空加指揮官與日期。
2. 數字一律標口徑：殲敵數含被俘與起義、不是陣亡；兵力 310萬對290萬兩側口徑不同、不能相減。
3. 三種易手方式要分開寫：攻克、起義、改編。地圖色塊相同、成因不同——這是本包最重要的方法論。
4. 「城市點 vs 省格面」：城市易手是月精確的點，省格是上限示意；拉鋸區不是單方控制。
5. 兩側中性（「國軍」「解放軍／共軍」並用），不寫評價性口號。
6. 來源不足要明說（例：「本條未載守軍番號」），不要用小說或通說補空白。

### 日本時代包與平安／幕末的「起因／經過／結果與影響」補齊（2026-11-04）

使用者選 P0：把內戰包那套深度做法複製到日本各時代包。

**改前的實際狀態**（先量再改，別憑印象）：
- 六個時代包（asuka 23、kofun 14、nara 19、kamakura 23、muromachi 16、azuchi 12＝**107 條**）
  全部 `detailFor: noDetail`，`noDetail()` 回傳 `undefined`，
  於是 `DeepDiveApp` 的 fallback 把 `event.desc` **同時填進起因與經過**（同一句話出現兩次），
  「結果與影響」拿 `note ?? source` 頂替，延伸閱讀一律連到 `zh.wikipedia.org/wiki/日本歷史`
  （跟事件無關的總論頁，讀者會當出處）。
- 平安 30 條只有 9 條有詳情、幕末 28 條只有 15 條；`EraTimeline` 的視窗條件是
  `openEvent && detail`，所以那 **34 條點了完全沒反應**（不是文字薄，是功能壞了）。
- 既有的 24 條詳情（平安 9＋幕末 15）outcome 夠厚，但 causes 平均 30 字、course 平均 40 字。

**改後**：
| 檔 | 條數 |
|---|---|
| `src/japanEras/details/{asuka,kofun,nara,kamakura,muromachi,azuchi}Details.ts` | 107（全新增） |
| `src/heian/data/heianDetailsMore.ts`／`src/bakumatsu/data/bakumatsuDetailsMore.ts` | 21＋13（補死點擊） |
| `src/heian/data/heianDetailsEnriched.ts`／`src/bakumatsu/data/bakumatsuDetailsEnriched.ts` | 9＋15（加厚既有條目的 causes／course） |
查表順序：`ENRICHED[id] ?? DETAILS[id] ?? DETAILS_MORE[id]`（`heianDetailFor`／`bakumatsuDetailFor`）；
時代包則 `detailFor: (id) => <ERA>_DETAILS[id]`。

**介面層的修正（這部分比文字更重要）**：
- `EraDetail.zhwikiUrl` 改為選填；`ClassicDetailContent` 的 causes／course／keyFigures／outcome 改為選填。
- `ClassicDetailModal` 對空白段落整段不顯示，沒有連結就不顯示「延伸閱讀」——
  缺資料就承認缺，不拿語譯或事件描述頂替。
- `EraTimeline` 的開窗條件改成只要有 `openEvent` 就開（缺詳情時只填事件檔確實有的欄位），
  34 條死點擊因此可用；`DeepDiveApp` 的 fallback 不再把 desc 填兩次、不再給總論連結。

**數字（`npm run depth:stats`，現在涵蓋九個模組）**：時代包 causes 平均 100–117、
course 144–167、outcome 405–481 字，keyFigures 2–4；`audit:depth` 從「只查三級語譯」
變成同時查起因／經過／結果（`requireDetail` 套到時代包＋平安＋幕末＋內戰），
**246/246 合格**。跨條重複句九個模組皆 0。

**踩過的坑（寫下來給下一輪）**：
1. `grep -c "  id: '"` 數事件會把 routes／domains／people 一起算進去——
   我一度以為時代包有 155 條事件，實際是 107。要數事件就用 `pack.events.length`。
2. `depth-stats` 的重複句偵測原本數「出現次數」，同一條在自己內文重複一句會被當成
   跨條樣板；要數**不同 id**（`Set`）。
3. 委派寫作的條目會自己加「地圖方面，本條快照沿用 YYYY 年地圖：28 個領域中 14 域標鎌倉幕府…」
   這類句子——這是從我給的 `territory` JSON 來的，可驗證（實測 kamakura 1185 確為
   28 域／14 鎌倉幕府／4 朝廷／10 西國）。給寫作者快照資料時，要同時要求「每條的地圖段各寫各的」。

### CI 閘門補齊與閘門基準機制（2026-11-04，P2）

使用者要求把新的品質閘門接進 CI。查過之後發現問題比「沒接」更嚴重：

1. **`npm run audit:depth` 根本壞了**：script 寫的是 bare `tsx`，但 `tsx` 不在 devDependencies
   （`node_modules/.bin` 只有 oxlint、vite）。本地一直用 `npx tsx` 才沒發現——
   `npm run audit:depth` 實際報 `sh: tsx: command not found`。CI 的 `npm ci` 之後同樣會壞。
   → `npm i -D tsx`，並把 `audit:fact`／`depth:stats`／`depth:inputs` 的 `npx tsx` 改成 bare `tsx`
   （`npx` 在 CI 會觸發網路安裝）。
2. **四項稽核永遠不會讓 CI 變紅**：`audit-depth`、`audit-chars`、`audit-quotes`、
   `factcheck-readings` 都沒有設 exit code（`audit-data`／`wiring`／`ranges` 有，`audit_geo.py`
   用 `sys.exit(main())` 也有）。就算接進 CI 也只是裝飾。
3. **`npm run lint` 有 3 個錯誤**（`useBakumatsuHanMeshes` 被在非元件函式與模組層呼叫）。
   該函式其實不是 Hook，只是圖層開關檢查——`use` 前綴是誤命名，改名
   `hasBakumatsuHanMeshes` 後 3 個錯誤消失（67 個警告不擋，exit 0）。

**閘門基準（`scripts/lib/gate-baseline.ts`＋`reports/gate-baseline.json`）**：
chars／quotes／fact 有當下可接受的已知數（硬傷 2 是史料原文字形、14 條是原典無全文、
fact 旗標多數是正當跨事件引用）。直接讓 CI 變紅只會讓人把步驟拿掉，所以改成只擋增量：
`enforceGate(name, count)` 比基準，變多才 `process.exitCode = 1`；
`--update-baseline` 重記。順手修了 `audit-chars` 的參數解析——它把 positional 參數當掃描路徑，
`--update-baseline` 會被拿去 `statSync` 而 crash，現在旗標與路徑分開。

**CI**（實際生效的是 repo 根 `my-project/.github/workflows/audit.yml`）：
原本只跑 wiring／data／ranges／geo，現在跑 `npm run verify`（build＋九項稽核）＋`npm run lint`
＋`npm run depth:stats`（純資訊）。子目錄那份休眠的 workflow 也同步，避免漂移。

**驗證**：`npm run verify` 本地全綠（exit 0）；把 `audit:chars` 基準從 2 降到 1 會 exit 1、
還原後 exit 0——證明閘門真的會咬，不是裝飾。`tsc -b`、`npm run lint`（0 錯誤）皆通過。

### audit:fact 從「人工逐條看」變成閘門（2026-11-04，P3）

原本 `audit:fact` 會吐 104 個「條目外數字」＋64 個「遠年」旗標，全部要人逐條判斷，
實際上沒人會看，等於沒有閘門。原本的提議是每條加 `claims` 欄位列出每個數字的出處——
量過之後發現這不成比例（246 條 × 多個數字），而且多數旗標本來就是正當的跨事件引用。

**改法：把「允許的數字」從模組自己的資料推出來**，而不是手寫：
`buildModuleFacts()` 收集該模組的原始資料（事件條目、地圖快照 note、人物 birth/death、
路線 source、著色備註、快照年，以及**每個快照年的總域數／各勢力域數／總數減某勢力**），
然後分兩級：
- **INVENTED**：本模組原始資料裡完全找不到 → 錯誤，閘門基準 0。
- **crossEvent**：本模組別處有、本條沒有 → 正常寫法，只記基準擋增量（現況 327）。
索引刻意不含被審查的解讀文字本身，否則 A 條憑空的數字會變成 B 條的依據。

效果：168 個模糊旗標 → **10 個候選**，逐條查過全是有依據但來源在本模組之外的事實
（1825 異國船打拂令、1842 薪水給與令、1871 廢藩置縣、1190 賴朝上洛、1954 憲法、1950–51 西藏）。
這些放進 `reports/fact-allowlist.json`（key＝「模組 id」，value＝數字→依據），
於是憑空門檻可以真的設 0，而新的、沒核過的數字仍會被標出。

**順手抓到自己兩個 bug**（這就是為什麼要有 self-test）：
1. 數字比對原本用「兩向包含」（710 對 1710）。把月份去零成 3、4 之後，
   任何含 3 的年份都被當成已涵蓋——塞 1743 進內戰模組也不會被標，等於檢查器失效。
   → 改成數值相等（`set.has`）。
2. 修好之後發明的數字從 0 變 10，才看出先前的 0 是假的。
現在每次跑 `audit:fact` 都自檢：塞 1743 必須被標、1949 不得被誤標，否則 exit 1。

**地圖計數現在可驗證**：詳情寫「28 個領域中 14 域標鎌倉幕府」「其餘 25 域」這類句子，
以前無法檢查。把快照年的總數、各勢力數、總數減勢力加進索引後，
實測 kamakura 1185（28/14/4/10）與 muromachi 1372（28 總、南朝 3、其餘 25）都對上；
寫錯計數就會被標。

### 內戰包補上非軍事的事件（2026-11-04，P4）

原本的 64 條全是戰役、城市易手與作戰線，起因／經過／結果與影響寫得再好，
也只能解釋「怎麼打」，不能解釋「為什麼這樣打、誰能動員」。新增 6 條（原計畫 5 條，
把中蘇條約與外蒙公投拆開比較好排時間軸）：

| id | 事件 | 為什麼要補 |
|---|---|---|
| `cw-1945-08b` | 中蘇友好同盟條約（1945-08-14、21年、1950年被取代） | 東北的受降與蘇軍撤出綁在一起，1945年東北色塊是重疊不是單一控制 |
| `cw-1945-10b` | 外蒙古公投與承認獨立（1945-10-20、1946-01） | 領土變化有「戰場」與「程序」兩種性質，地圖只畫得出前者 |
| `cw-1946-12` | 制憲國民大會與《中華民國憲法》（11/15開幕、12/25通過、1947-01-01公布、12/25施行） | 制憲與全面內戰數月內並行；代表性爭議關係戰後「法統」論述的效力 |
| `cw-1947-02` | 二二八事件與台灣行政改組 | 本包地圖不含台灣，這件事在地圖上完全不可見，只能靠時間軸保留 |
| `cw-1947-09` | 《中國土地法大綱》與土改（1947-07會議、9月頒布） | 動員基礎從士紳轉向分地農戶，是支前規模的制度條件，不是「民心」 |
| `cw-1948-08` | 金圓券與國統區通膨（1948-08-19、1949再惡化） | 貨幣改革在戰爭財政約束下無法獨立成功 |

**事實紀律**：新條目的數字一律先寫進事件列（`desc`／`note`／`source`），
因為 `audit:fact` 的事實索引就是從事件列建的——解讀引用索引沒有的數字會被標為憑空。
傷亡與通膨率這類各資料差異極大的數字，明確寫成「本條不列數字」，不假裝確定。
二二八與外蒙公投標 `disputed: true`。

**驗證**：`audit:depth` 252/252（內戰 70/70）；`audit:fact` 憑空數字 0、
self-test 通過；新增條目引入 9 個跨事件引用（1950新約、1946全面內戰、1948糾偏等），
逐條看過屬正當，重記基準 327→336；`audit:chars` 新增文字 0 簡體字；
`audit:data`／`wiring`／`ranges`／`geo` 皆 0；`npm run verify` exit 0。
內戰包現在 causes 平均 106、course 150、outcome 281 字，跨條重複句 0。

### 內戰時間軸的三個可用性修正（2026-11-04，P5）

1. **同名的城市易手條目**：`延安易手` ×3、`張家口易手` ×3、`錦州／長春／瀋陽易手` ×2，
   列表與詳情窗標題完全一樣，要點開才知道是哪一次。12 條標題改成帶年份與方式
   （`延安易手（1947・國軍進入、共軍撤出）`、`長春易手（1948・和平解放）`…），
   括號一律取自該條自己的 `desc`，不另外判斷。現在重複標題 0。
   順帶把「攻克／和平解放／起義／接收／佔領」這個區分寫進標題——這是本包最重要的方法論，
   以前只在 outcome 文字裡。
2. **詳情窗加「看當月地圖快照」**：省級色塊是年快照、城市易手與作戰線到月，
   從事件跳到對應快照是這個模組最實用的動作。沒有當月快照時取同年最接近的一張，
   並把按鈕寫成「看最近的地圖快照（1948年9月）」而不是假稱當月。
   實作細節：`setYear` 會觸發 `useEffect` 把 monthFilter 清空，所以用 `pendingMonthRef`
   把要套用的月份帶過去，否則跳年月會被 effect 抹掉。
3. **拿掉每個 imperial 事件都掛的假連結**：`toDetail()` 原本硬寫
   `zhwikiUrl: 'https://zh.wikipedia.org/wiki/中國歷史'`，所有事件的「延伸閱讀」
   都連到同一個總論頁。與前一輪在日本包修掉的是同一個缺陷；現在沒有查過的條目就不顯示這一段。

**尚未做**（有明確代價，留給下一輪）：把 outcome 裡的年代引用做成可點跳轉（需要解析規則，
誤連結的風險比收益大）；在地圖上區分攻克／起義／改編（要給 37 個城市逐條標記，
標錯就是事實錯誤，不該批量生成）。

**驗證**：`tsc --noEmit` 通過、`npm run lint` 0 錯誤、`npm run build` 通過、
`npm run verify` exit 0（audit:depth 252/252、audit:fact 憑空 0、self-test 通過、
chars／data／wiring／ranges／geo 皆與基準相同）。

### 第一組測試，以及把之前擱下的項目收掉（2026-11-04，P6＋收尾）

**P6 測試（31 條）**：repo 原本沒有任何測試。用 Node 內建 test runner（Node 26 原生跑 .ts），
不新增依賴；但 codebase 是 bundler 式無副檔名 import，bare `node --test` 會 ERR_MODULE_NOT_FOUND，
所以 runner 走 tsx。`npm test` 放進 verify 第一步，CI 自動涵蓋。
測的是**壞了不會報錯**的邏輯，不是資料內容（資料由稽核腳本管）：
fact-numbers（去零與數值相等）、gate-baseline（只擋增量）、timelineDate、
snapshotJump、yearLinks、handoffMode、data-integrity（id／標題不重複、勢力有宣告、
快照排列順序——`resolveImperialSnapshot` 靠這假設，亂序不會報錯只會顯示錯地圖）。
做過突變測試：把 `covered` 改回兩向子字串 → 21 pass／1 fail、exit 1；還原 → exit 0。

**收掉 P5 擱下的兩項**：
1. **年份可點跳轉**：不解析任意年代，只把「YYYY年」四位加年切成連結，
   且只連結模組宣告範圍（`yearRange`）內的年份——範圍外的點了沒有內容，
   所以不存在「連錯」的可能；`1948–49年`、`47.2萬`、`12月25日` 都不連結。
   切割規則抽成 `src/lib/yearLinks.ts` 並測。
2. **攻克／起義／改編的區分**：原本打算給 37 個城市逐條標記，查過之後發現
   有 15 條 desc 只有日期、沒有方式，補上就是憑空加事實；而且城市條目沒有座標，
   地圖上本來就不畫（只畫 routes 與命名標記），要做 glyph 得先為 37 個城市補座標，
   那是另一件事。改成**從既有文字擷取**（`handoffModeOf`）：有線索就顯示標記、
   沒有就不顯示，判斷依據可追溯。時間軸加圖例說明這些方式的差別。
   實測 37 條裡 22 條有方式、15 條留空。

**順手修掉 P6 過程中發現的兩個問題**：
- P5 的快照跳轉挑「月份最接近」的一張，可能選到事件**之後**的快照
  （金圓券 1948-08 跳到 1948-09），等於把還沒發生的地圖狀態當成事件當時的樣子。
  改成沿用 `resolveImperialSnapshot`（事件當時生效的最後一張），按鈕文字寫明顯示哪張快照。
- `audit-chars` 的參數解析把 `--gate` 的**數值**當成掃描路徑而 crash（statSync ENOENT）。
  現在旗標與其數值都不進 positional。

**新增兩個閘門**：`lint:gate`（oxlint 警告數進基準，現況 67，變多才失敗）、
`audit:chars:docs`（文件簡體字，基準 0）——後者正是之前我自己兩度在文件裡寫入簡體字
而閘門完全沒看到的漏洞。`audit:chars` 加 `--gate <name>` 讓同一支腳本對不同範圍各記基準。

**驗證**：`npm run verify` exit 0——31 條測試全過，七個閘門全部「與基準相同」
（depth 0、chars 2、chars:docs 0、quotes 14、fact:invented 0、fact:crossEvent 336、lint:warnings 67），
`tsc --noEmit` 與 `npm run build` 通過。

### 修掉上一輪自己留下的誤標，並把「只印不擋」的數字變成閘門（2026-11-04，P7）

**1. 易手方式標記誤標（P6 的回歸）**：第一版在元件裡直接 `handoffModeOf(標題＋desc)`，
實測 **15 條非城市事件被標記**——遼沈戰役的作戰線被標成「和平解放」、日本投降被標成「投降」、
劉鄧大軍被標成「進入」；民國包也跟著冒出 4 個標記與圖例。
修法不是加例外，而是讓**包自己宣告**哪些事件是易手記錄（`ImperialPack.handoffEventIdPrefix`，
內戰包 `cw-c-`），判斷收進純函數 `handoffModeForEvent`。修後：內戰標記 41→26、非城市標記 15→0、民國 4→0。
（原本想用 `location` 欄位當判別，查過發現城市條目根本沒有 location，70 條裡只有 6 條有——不可用。）

**2. `snapshotJumpFor` 對沒有快照的包會 crash**：`resolveImperialSnapshot` 回傳 undefined，
下一行讀 `snap.year` 就拋錯，詳情窗整個白屏。改成回傳 null，元件不顯示這個動作。目前所有包都有快照，
所以這是潛在而不是現行故障，但詳情窗白屏是最難查的故障形狀。

**3. 四個只印不擋的數字進基準**：`audit:ranges` 的 warn 37／info 44、`audit:data` 的 warn 0、
`audit:wiring` 的 warn 0——之前這些可以一路變多而 CI 全綠，正是 P2 那次的失效模式。

**4. `audit:chars` 不再用總數當基準**：基準 2 的寫法讓「修掉一個、同時闖進另一個」完全看不出來。
改成逐條記 `reports/chars-allowlist.json`（檔名＋字＋理由），硬傷基準因此降到 0。

**5. `audit:fact` 白名單加 phrase 條件**：放行裸 `51`（來自「1950–51年」）等於放行該條目裡任何 51。
白名單條目現在可以是 `{ reason, phrase }`，只有文字裡真的出現該 phrase 才算已核過。
突變驗證：把 phrase 改成「1950–99」→ 憑空數字 0→2；還原 → 0。

**6. `engines: node >=23.6`**：測試靠 Node 原生型別撕除，Node 20 的使用者只會看到莫名的模組錯誤。

**7. 補測試（31→41 條）**：
- `tests/detail-fallback.test.ts`：P0 那次「點了沒反應」就是這層接錯，卻沒有任何測試盯它。
  現在盯三件事：每個事件都有詳情與語譯、加厚版優先於基礎版（平安 9 條、幕末 15 條重疊 id 逐一比對）、
  只有補條（`*_MORE`）有的 id 第三層 fallback 仍要拿到內容。
- `tests/data-integrity.test.ts` 補平安／幕末（58 條事件不在 pack 結構裡，前面的 id／標題重複檢查掃不到；
  現況乾淨，這是防未來）。
- `tests/handoff-mode.test.ts` 補標記範圍三條（作戰線不算、沒宣告的包不算、城市條目算）。
- `tests/fact-numbers.test.ts` 補 phrase 條件；`tests/snapshot-jump.test.ts` 補空快照回傳 null。

**驗證**：`npm run verify` exit 0——41 條測試全過，11 個閘門全部「與基準相同」
（wiring:warn 0、data:warn 0、ranges:warn 37、ranges:info 44、depth 0、chars 0、chars:docs 0、
quotes 14、fact:invented 0、fact:crossEvent 336、lint:warnings 67）；`tsc --noEmit` 與 build 通過。

**仍未做**：這輪所有 UI 改動（年份連結、易手標記、圖例、快照按鈕、標題改名）都只有型別、建置與
邏輯測試撐著，**沒有在瀏覽器看過**。省級色塊要畫城市易手也需要先為 37 個城市補座標，那是另一件事。

### 第一次真的用瀏覽器看過（2026-11-04，#9 視覺檢查）

新增 `scripts/qa-visual.sh`（agent-browser 跑 dev 頁面），把「只有用眼睛看才會發現」變成可重跑的斷言：
LayoutGuard 違規、標題被截斷、易手標記只出現在有宣告的包、詳情窗的年份連結與快照按鈕存在且範圍正確。

**通過的**：12 個改名後的標題都沒有被擠到截斷（`scrollWidth <= clientWidth`）；內戰包時間軸有 7 個易手標記與圖例，
民國／共和國／唐包都是 0 個標記、無圖例；詳情窗有 6 個年份連結，全落在 1945–1949，
快照按鈕寫著「看 1946年1月 的地圖（快照 1945年11月）」——事件當年、快照是當時生效的那張，不是未來的。

**發現一個真問題（不是這輪改出來的）**：內戰包的時間軸面板把地圖擠到 **762×168px**，
觸發 repo 自帶的 dev 版面守衛（門檻 220px）。原因是 `.app-shell--imperial` 的 grid 列把
年份滑軌切成 **264px**（其他包 122–135px）：兩列刻度 42+42、月份列 35、備註 54、承接列 20，
加上 era-bar 105px，chrome 佔掉 633px 視窗的 58%，地圖只剩 168px。
排除法：把圖例、標記、9 列事件從畫面移除，地圖高度都是 168px 不變——所以不是 P6/P7 加的東西造成的，
是內戰包「逐月」滑軌本身的體積。修法要取捨（滑軌收合、備註移到詳情窗、或地圖設 min-height），
屬於版面決策，未擅自改。

**一則方法教訓**：探測時不要在 eval 裡 `remove()` React 管理的節點。我這樣做之後點年份連結，
整頁白屏，看起來像年份連結的 P0 bug；重載後同一動作正常，重播「先移除節點再點」才重現白屏。
歸因要讀 CSS、量高度，不要動 DOM。腳本註解已把這條寫進去。

### 內容加厚第一步：先把閘門蓋到中國包，再補唐（2026-11-04，P8）

**先做閘門（step 1）**：`audit:depth`、`depth:stats`、`audit:fact` 之前只掃日本史＋內戰，
九個中國帝國包（晉、南北朝、隋、唐、五代、遼宋、元明清、民國、共和國，83 條）**從未被量過**。
`audit:depth` 基準 0 給人的印象是「全部合格」，其實是這 83 條被跳過。
補法：照 `ImperialTimeline.toDetail()` 的同一條 fallback 鏈取值，量讀者實際看到的內容——
`causes ?? secondary`、`course ?? elementary` 這種湊出來的欄位會以 level-thin／level-duplicate 現形。
`audit:fact` 同時把九包加進模組事實索引，之後新寫的歷史文字才會被查（之前新 prose 完全不過 fact）。
`audit:depth` 加 self-test（同 audit:fact 的慣例），檢查器壞掉時會自己失敗。
基線：合計 335 條、合格 252、不合格 83；`audit:depth` 從 0 重記為 382（這是記分板，只能往下）。

**閘門立刻修正了我自己的估計**：我原先以為唐包「三層與起因經過都空」。量出來是
university 平均 227 字、outcome 平均 449 字——這兩層本來就夠；
真正空的是 elementary 平均 29 字（最短 12）、secondary 平均 30 字（最短 9 字）、
causes／course 全是 fallback、keyFigures 全 0。工作範圍因此小得多，也準得多。

**step 2 第一批：唐 7 條**（新增 `src/imperial/data/tangReadings.ts`）。
只補缺的層：`CivilWarReading` 的 layers／causes／course／outcome 改為可省略，
省略時 `toDetail()` 退回事件檔——已合格的 university（164–373）與 outcome（427–494）不重複寫，
避免兩份內容各自漂移。
寫作限制由閘門強制：不引入本包既有文字之外的年代／數字，所以文中出現的年份
（618、628、637、663、670、676、701、702、717、721、733、742、630、753、755、756、759、763、766、817、819、822、885、894、904、905、907）
全部取自事件檔或地圖備註，沒有新增任何一個數字。
結果：唐 0/7 → 7/7；elementary 12–55 → 50–83、secondary 9–63 → 121–144、
causes 9–63 → 93–131、course 12–55 → 139–174、keyFigures 0 → 3–4。
`audit:depth` 382 → 350（已重記基準）。`audit:fact` 憑空 0；跨事件引用 336 → 337，
新增的一筆是安史之亂的起因引用 637（該數字在 618 條的 outcome 裡），屬正當引用，已重記基準。

**順手抓出一個 P6 的真 bug（年份連結在三位數年代全面失效）**：
`splitYearMentions` 的 regex 要求四位數加年（`\d{4}年`），是照內戰 1945–1949 寫的。
唐、隋、晉、南北朝、周、秦漢這些三位數年代的模組裡，連結**靜默不出現**——
唐包詳情窗明明寫著「628年」「618年」，year-link 數量是 0，而且不會報錯。
改成 `\d{3,4}年`：三位起跳（三位數年份是本專案常態），不認一、二位以避開「2年」「49年」
這類工期／範圍寫法；範圍外的年份本來就不連結，所以安全性不變。
補兩條測試（三位數要連結、一二位不連結）——之前 6 條測試全用四位數年份，所以這條漏掉。
瀏覽器驗證：唐包「唐朝建立」詳情窗出現 628年／637年／628年／618年 四個連結，
點 628年 時間軸跳到「628 年大事」。

**一個待定的 UX**：連結只保證年份在包的範圍內，不保證該年有專條。628年沒有事件，
跳過去時間軸顯示「本年無專條」＋鄰近年表。對地圖有意義（628 的色塊與 618 不同），
但讀者可能預期「有點就有東西」。要不要只連結有專條的年份，是下一個取捨。

驗證：`npm run verify` exit 0（43 測試、11 閘門與基準相同）；`audit:depth` 350、
`audit:fact` 憑空 0／跨事件 337、`audit:chars` 0；瀏覽器實測連結與跳轉。

### 本輪另補的古籍原文（古墳包）
- 《宋書》卷九十七・倭國傳：永初二年詔（kf-421）、元嘉二十年／二十八年條（kf-438）、
  昇明二年上表＋詔除六國（kf-478，自稱「七國」、所削唯百濟，將軍號仍舊）。
- 《梁書》卷五十四・倭國傳：「齊建元中…鎭東大將軍。高祖即位，進武號征東將軍」（kf-502）。
  注意：「征東將軍」是《梁書》對武的記載，與《宋書》的「安東大將軍」各自成立，
  上一輪改正 nb-478 時是針對《宋書》脈絡，兩者不可混用。

### 下一輪的入口
1. `audit:quotes` 1840 年以前不合格 14 條（清單：`npm run audit:quotes -- --todo`），
   全部卡在「該原典沒有全文」，不是沒找：《續日本紀》《應仁記》《鐵炮記》《德川實紀》
   《明太祖・太宗實錄》《華夷變態》《保元・平治物語》《言経卿記》系。
   要突破得用其他數位典藏（且要先確認可引用），或維持「意譯」標註。
2. 日本各時代包的 `detailFor` 仍是 `noDetail`（詳情窗的起因／經過／結果與影響走 fallback）。
   這是 audit:depth 沒覆蓋的下一層，下一輪可加 `details/<pack>Details.ts`。
3. 戰國、平安、幕末的原文欄目前只有 12 條有逐字原文；其餘標「意譯」，
   要升級仍取決於 1。

### 本輪踩到的字形坑（下次直接查）
- 簡體／日本新字混入：條約、德川、下關、奧州、條文、體制、解體、陸奧、補給、下知狀、
  並、說、締、殘、來。`/tmp/simcheck2.py` 用「簡體專用字」清單掃，避免把 治／松／系／落／干
  這類兩用字誤判。
- 引文裡的 `于`、`并` 若是原典字形（《宋書》「作藩于外」），保留原字，不要「繁化」。



## 1AB. 引文稽核：再補 17 條逐字原文（2026-11-03）

### 做法（下一輪照樣做）
- `npm run audit:quotes -- --todo` 列出 1840 年以前仍無原文的條目（含已引出的處）。
- 取原文：`python3 /tmp/qsrc.py '書名/卷N' '正則'`（維基文庫 `action=parse&prop=wikitext`，快取在 `/tmp/cache`）。
  卷次頁名用阿拉伯數字，零填充不一：`宋書/卷97`、`南史/卷71`、`元史/卷010`、`梁書/卷02`、`清史稿/卷7`。
  `qsrc.py` 的 `clean()` 已先解開 `{{ul|X}}`、`{{YL|X}}` 等內容型模板——不解開會把正文整段刪掉，
  且 `{{另|比|北}}` 一類校記會把正文變成錯字（隋書「多利思比孤」曾被讀成「多利思孤」）。
- 貼回：pack 事件用 `classicQuote`／`classicSource`；帝制 `DEPTH_EVENTS` 用 `depthNarrative.ts` 的
  `quote`／`quoteSource`（`ev()` 會自動把 `desc` 頂替成 `classicQuote`，所以沒有 `quote` 就一定是意譯）。
- `classicSource` 不得含「意譯」「非逐字」「通說意譯」，否則 audit:quotes 仍判不合格。
- 逐字校驗：把 `classicQuote` 按 `……` 切段，每段要在「清理後的維基文庫正文」裡找到才算過。
  本輪 17 條全過，只有兩處是刻意標明的正規化：《隋書》「多利思{{另|比|北}}孤」取正文「比孤」（已在出處註「北孤」一讀）、
  《唐大和上東征傳》的「︰」作「：」（已在出處註明）。引文在中途截斷時，省略號要放在引號內（`……」`），
  不要自己補一個句號或後引號。

### 本輪補上的 17 條
- pack-nanbei：`taixue-399`《魏書·太祖紀》天興二年、`sixue-438`《宋書·隱逸傳·雷次宗》元嘉十五年、
  `nb-478`《宋書·夷蠻傳·倭國》昇明二年（上表全文與詔除之文並存）、`wujing-505`《梁書·武帝紀》天監四年＋《梁書·儒林傳·嚴植之》。
- pack-sui：`sui-607`《隋書·東夷傳·俀國》開皇二十年、大業三年；`sui-617`《舊唐書·高祖紀》大業十三年。
- pack-tang：`tg-702`《新唐書·日本傳》（含「使者不以情，故疑焉」）；`tang-753`《唐大和上東征傳》天寶十二載。
- pack-liaosong：`ls-1275`《元史·外夷傳·日本》至元十二年、十七年。
- pack-yuanmingqing：`ymq-1281`、`ymq-1294`（《元史·日本傳》＋《世祖紀》至元三十一年崩條）、
  `ymq-1401`、`ymq-1404`（《明史·日本傳》）。
- 帝制（depthNarrative）：`ls-1044`《宋史·外國傳·夏國上》慶曆四年誓表、`ymq-1279b`《元史·世祖紀》＋《宋史·瀛國公傳》附二王、
  `ymq-1616`《清史稿·太祖紀》天命元年、`ymq-1683`《清史稿·聖祖本紀》＋施琅《恭陳臺灣棄留疏》。
- 稽核：合計 414 條，原文 267（原 250）· 意譯 21 · 無原文 2 · 近現代免 124；1840 年以前不合格 23 條（原 40）。
  四支稽核仍全綠：`audit:wiring` 0/0、`audit:data` 0/0、`audit:ranges` fail 0／warn 37（與本輪前同）、`audit:geo` 不變。

### 順手改正的史文錯誤（都是因為原文釘死了才看得见）
- 倭王武：《宋書》自稱「使持節、都督倭百濟新羅任那加羅秦韓慕韓七國諸軍事、安東大將軍、倭國王」，
  詔除作「都督倭新羅任那加羅秦韓慕韓六國諸軍事、安東大將軍、倭王」——所削唯百濟，新羅在許與之內，將軍號仍其舊。
  舊文「征東将軍」「削去百濟、新羅」是錯的（`nb-478` 與 `kofunPack/kf-478` 已改）。
- 倭王濟：《宋書》系於元嘉二十年（443）受安東將軍、倭國王，二十八年（451）加都督六國諸軍事；
  `kf-438` 的「元嘉十五年」系年與「征東將軍」已改並標存疑。
- 元嘉四學：史學屬何承天、文學屬謝元（舊文寫反）；「詔開五館，建立國學，總以五經教授，置五經博士各一人」
  是《南史·儒林傳》序之文，不是《梁書》（`梁書/卷49` 是文學傳，儒林傳在 `梁書/卷48`）。
- 李淵入關：拔京城十一月丙辰、立代王癸亥、進封唐王甲子（舊文「六月封唐王」已改）。
- 鑑真：《唐大和上東征傳》十月十九日自龍興寺出發、十二月二十日著薩摩國阿多郡秋妻屋浦、
  天平勝寶六年二月四日入京（舊文「十一月出發、翌年正月抵著」已改）。
- 崖山：《元史·世祖紀》作至元十六年正月甲戌，《宋史·瀛國公傳》附二王作二月癸未，兩紀系月不同，已在 `quoteSource` 標明。
- `nb-478`、`tg-702` 兩條的 secondary／university／outcome 原是日文，已改寫為繁體書面語（AGENTS 規則）。

### 仍欠原文的 23 條（都是「文本不在維基文庫」，不是沒找）
- 日本中世 9 條（吾妻鏡系）、日本戰國 12 條（信長公記、應仁記、鐵炮記）：要日文校本（ja.wikisource 或國史大系），
  且與「本文一律繁體中文」的規則要一起決定怎麼呈現；現一律保留「據通說意譯」的標註，不要改成看似原文。
- `ymq-1372`（洪武五年冊封良懐）：《明史·日本傳》只記洪武四年祖來奉表稱臣、賜良懷大統曆，無冊封之文；
  冊封見《明太祖實錄》與《善鄰國寶》，兩者在維基文庫沒有。
- `ymq-1715`（正徳の貿易制限與銅）：德川實紀／華夷變態系，不在維基文庫。
- 結構限制：`japanEras` 的 `EraEvent` 沒有 `classicQuote`／`classicSource` 欄位，日本各包要列原文得先擴型別。

## 1AD. 帝國包加厚：28＋19 條、location 接通、出處具體化（2026-11-04）

**閘門先擴到帝國包**（前一轮已做）：`audit-depth`、`depth-stats`、`factcheck-readings` 都讀九個帝國包，
走 `ImperialTimeline.toDetail()` 同一條 fallback 鏈。擴之前 83 條帝國事件從未被量過，
`audit:depth` 基準 0 是假象。

**這轮補了 40 條**：
- `jinReadings`（3）、`nanbeiReadings`（5）、`suiReadings`（4）、`wudaiReadings`（3）、`liaosongReadings`（6）
- `yuanMingQingReadings`（19）
只補缺的層。各包的 university／outcome 多數已合格（帝國包平均 university 227 字、outcome 449 字），
重複寫會造成同一篇文字在 modal 出現兩次。例外是十條 university 本身低於 160 下限的，那些連 university 一起補。

**結果**：合格 252→299，不合格 83→36（只剩民國 18、共和國 18）。
`audit:depth` 0→350→246→165。`audit:ranges` warn 37→14。`audit:fact` 憑空 0（檢查 235→282 條）。

**五個真 bug，其中三個是閘門抓到我自己寫的錯**：
1. `audit:fact` 擋下 ls-960 引用 936、947、951——這三年在五代包，不在遼宋包。改寫，不放白名單。
2. `audit:fact` 擋下 ymq-1904 的「1906」——本包寫「1905-06年」，索引讀成 1905 與 06。改寫為「1905年以後」。
3. `audit:chars` 抓到新寫檔案裡的簡體字（條、補、戰、徳、对）。這批是靠手動跑才發現的——
   `src/imperial/data` 原本不在 PROSE 掃描清單，已加入。
4. HARD 表缺 `写、变、读、误、难、边、类、医、银、钱、响、极`。擴表後全 repo 只抓到一處既存硬傷：
   `nanbeiPack.ts` 的「写成」。這個簡體字之前在正式內容裡而閘門全綠。
5. **`location` 在 ImperialTimeline 從不渲染**：其他六個時間軸元件都有 `<p className="timeline-loc">`，
   唯獨這一份沒有。所以「46/83 缺 location」有一半是假問題。接上之後立刻現形第二個 bug：
   `depth.ts` 的 `ev()` 寫 `location: figures[0]?.name`，時間軸開始顯示「李靖」「武則天」當地點。已移除。

**出處具體化**：內戰包 27 處「XX戰役戰史」改為《中國人民解放軍第N野戰軍戰史》（軍事科學出版社）。
包本 footer 已宣告「兵力與殲敵為軍事科學院一系統計」，這是把既存出處寫到可查，不是新增來源。
留下的 14 條（東北行營檔案、胡宗南部戰報、東北戰事…）是檔案／戰事的描述性說法，
包上《》只會讓閘門變綠而引用品質沒改善——要清需真正的檔案編號，離線查不到。

**crossRefs 的「缺口」多數不是缺口**：安史之亂、八王之亂、幽雲十六州、北魏太學沒有同時期的日本事件可對應。
已有的中日對應（白村江 663、遣隋使 607、遣唐使 702、鑑真 753、倭王上表 478、元使 1268/1275）都在，
新增一條崖山 1279 → 鎌倉 1281（弘安之役）。硬湊會造出假對應，比缺連結更糟。

**留下的資料問題**：`ymq-1715`（正徳の貿易制限と銅）整條是日文（desc／secondary／university 都是），
補的三層用中文，現在同一條目混排。要嘛整條譯中、要嘛整條留日，不該由補缺的動作順手改掉。

**下一步**：民國 18、共和國 18（近現代，出處多為檔案與條約，需特別小心）；
14 條引文缺口需網路（`npm run warm:sources`，本地 cache 22 頁不夠）；
年連結跳到無專條年份的 UX 決定（見 1AC）。

## 1AE. 民國與共和國補完：全專案 335/335 合格（2026-11-04）

`minguoReadings`（18）、`prcReadings`（18）完成。**audit:depth 165→0，合格 299→335，不合格 36→0**——
全專案每一條事件現在都過三級語譯／起因／經過／keyFigures 的門檻，基準重記為 0。

近現代兩包同樣只補缺的層（university／outcome 多數已合格）。例外是九條本身低於下限的，
那些連 university 一起補（mg-1914/1916/1922/1928/1937、prc-1954/1958/1978/1988）。

**閘門在近現代包特別有用**，因為這裡的數字最容易混入口徑：
- `audit:fact` 擋下六個外來年份：mg-1931 的 1905、prc-1949 的 1948、prc-1978 的 1976、
  prc-1969 的 1960、prc-1999 與 prc-2012 的 2000（「2000年代」）。全部改寫而不放白名單——
  本包沒有依據的年份就不該寫，哪怕它是常識。
- `audit:chars` 擋下我寫入的簡體字（`国、时、间、决、满、环`）與一個錯詞（軍閥軍據→軍閥割據）。

**留下的語言問題（比元明清那條更嚴重）**：prc-1952、prc-1982、prc-1995、prc-2012 四條的
desc／secondary／university 整條是日文，我補的三層是中文，所以這四條現在中英日混排。
加上 ymq-1715 共五條。要嘛整條譯中、要嘛整條留日，這是內容決定，不該由補缺順手改。

**仍未處理**：14 條引文缺口（需網路）；14 條 ranges 警告（需檔案編號）；年連結 UX（1AC）。

## 1AF. 引文缺口：補 4 條逐字原文，並查清另外 10 條為什麼補不了（2026-11-04）

`audit:quotes` 14→10（戰國 原文 5→9）。

**補上的 4 條**（全部 `wikisource.py --verify` 逐字 OK，來源是 ja 維基文庫
『徳川実紀』東照宮御実紀 卷四／卷五）：
- `1590-odawara`、`1598-hideyoshi-death`（葉月十八日うせられぬ）、`1600-sekigahara`、`1603-edo-bakufu`（征夷大將軍宣下）
四條都按既有慣例補上 `quoteHeading: '典籍原文（日文漢文）'` 與中文 `gloss`——
`audit:depth` 有 `gloss-missing` 規則：日文原文沒有今譯就不合格。
1600 那條書中自己標為「大道寺内藏助が物語」（傳聞），來源欄已照實寫，
人數屬軍記量級也在 gloss 裡註明。

**另外 10 條查過、確認補不了**（不是懶，是維基文庫沒有可逐字引用的本文）：
- 保元物語、平治物語：ja 維基文庫只有索引頁＋NDL 掃描連結，無本文。
- 吾妻鏡：ja 維基文庫只有 /第一（治承四年）、/第二（養和元年）；
  壽永（1183）與元暦（1184）兩卷根本不在，比 HANDOVER 原先記的「缺壽永二年卷」更少。
- 應仁記、言経卿記、甫庵太閤記、落城軍談記、関原軍記大成：404。
- 鐵炮記：頁面在，但本文是 `<pages index="南浦文集.djvu">` 掃描轉錄，取不到 wikitext。
- 1615 大坂：東照宮御実紀只到卷五（慶長八年），卷六以後未收錄。
- ymq-1372（明太祖實錄／華夷變態）、ymq-1715（正徳，在續徳川実紀；文昭院・有章院兩卷未收錄）。

**發現 `audit:quotes` 的分類是字面的**：它只看 source 欄有沒有「意譯」二字。
`1592-bunroku` 的 source 明明寫「此處不逐字引用」，卻被算成原文。
所以「原文 N 條」這個數字會高估；要修就得讓它去比對快取，而不是讀關鍵字。
（已修，見 1AG。）

## 1AG. audit:quotes 改成逐字比對快取（2026-11-04）

不再讀關鍵字。判定順序：
1. 無引文 → `missing`（1840 以後 → `modern`）
2. 引文以 意譯／譯文／今譯 開頭、或出處自承意譯、**或卡片自己標 `quoteHeading: '意譯'`** → `paraphrase`
3. 其餘送 `wikisource.py --verify-batch` 逐字比對 `vendor/wikisource/`：
   `ok` → `original`（已核對）；`suspect` → 出處點名了已快取之卷卻找不到，**引文有誤，不合格**；
   `unchecked` → 該書未快取，無法核對（不算錯，但也不會變合格）
不合格 = paraphrase + missing + suspect。清洗與比對邏輯只留在 `wikisource.py` 一份，
TS 端只呼叫，避免兩邊規則走樣。

**改閘門之前先發現快取根本不可重現**：`fetch()` 在剝掉 `ja:` 前綴之後才寫進
`reports/wikisource-pages.txt`，所以 `--warm` 會拿日文書名去抓**中文**維基文庫，
28 頁裡 12 頁失敗（信長公記、川角太閤記、東照宮御実紀各卷全在內）。
已改成記原名（含前綴）並把清單修好；現在清掉快取重跑 warm 能還原 26/28
（剩兩頁是索引頁，無本文）。**快取不可重現時，任何「比對快取」的閘門都是假的。**

**閘門一上線就抓到三類真錯**：
1. **`1560-okinawaga`、`1575-nagashino` 的引文混了別版文字**。出處寫「我自刊我書」本，
   但引文裡的「急雨」「凱聲」在該版根本沒有，「敵の輔に」該版作「敵のに」。已改成該版原文。
2. **`1590-odawara`、`1600-sekigahara` 是我上一輪自己補的，補錯了層**：
   那兩段在 `{{*|…}}` 之內，是《國史大系》編者的**頭注**，不是本文；clean() 會把頭注整段刪掉，
   所以比對必然找不到。已改引卷四本文（「城中にもさすが八州に名を…」「明れば九月十五日。
   敵味方廿萬に近き大軍關原青野が原に陣取て…」）。
3. **`quoteHeading: '意譯'` 的卡片之前全被算成原文**（只看 source 欄）。
   `jp-1221-jokyu`、`jp-1615-osaka`、`jp-1637-shimabara`、`jp-1868-boshin` 四條現已老實標意譯。
   `1592-bunroku`（寫「此處不逐字引用」）也終於落入不合格。

**基準 10 → 15**：多出來的 5 條不是新壞，是舊的假合格被拆穿（4 條 quoteHeading 意譯
＋1 條 1592-bunroku）。目前全庫 420 條：原文(已核) 14、未核 261、可疑 0、意譯 13、無原文 2。
「未核 261」是誠實的答案——快取只有 13 種書，資治通鑑、後漢書、晉書、明史等根本沒進快取，
不能因為比不到就說人家錯。要讓數字往下走，只有兩條路：把書進快取，或補真的原文。

**沒快取時不會誤殺**：`vendor/wikisource` 是 gitignore，新 clone 跑 `npm run verify`
會看到 ⚠ 提示並把全部標 `unchecked`，基準照過（exit 0）。

## 1AH. 補 year 引數（1840 免原文規則之前套不上）＋ 吾妻鏡記載修正（2026-11-04）

**修正**：`日本-戰國`、`日本-戰爭` 兩組在 push 時 year 傳 `undefined`，
所以 `MODERN_CUTOFF = 1840` 那條規則對他們從來沒生效過。
`jp-1868-boshin`（戊辰戰爭，1868）因此被當成不合格。
現在 戰爭組傳 `d.year`、戰國組由 id 前綴（`1600-sekigahara`）解析西元年。
基準 15 → 14。這是修閘門的漏，不是放寬規則。

**吾妻鏡的記載我寫錯了一半**，更正：
- **中文**維基文庫有 `吾妻鏡/卷001–005、卷052`：卷001 治承四年（1180）、
  卷002 治承五年／養和元年（1181–82）、卷003 壽永三年（1184，**只到正月、
  收義仲粟津敗死**）、卷004 元暦二年（1185）。
- **日文**維基文庫只有 `/第一`（治承四年）、`/第二`（養和元年）。
- 兩邊都**跳過壽永二年（1183）**，所以 `1183-kurikara`（俱利伽羅峠）確實無本文可引。
- `1184-uji`（宇治川，元暦元年四月廿日）也不在：卷003 只到正月，元暦元年卷未收錄。
  卷003 裡那兩處「宇治」是正月廿日義經自宇治路入洛，不是四月那役，別混用。

**日本-戰爭 剩下三條意譯，查過確認補不了**：
- `jp-1221-jokyu`：`承久記` 只有索引頁，`承久記 (群書類從)` 是紅連結；
  吾妻鏡快取各卷不涵蓋承久三年（卷052 已是文永年間）。
- `jp-1615-osaka`：東照宮御実紀只到卷五（慶長八年）；附錄各卷是
  `{{:東照宮御実紀附録|…}}` 模板轉錄，沒有 wikitext 可引。
- `jp-1637-shimabara`：島原記、島原一揆記、春信記、陣中聞見録 全 404。

## 1AI. audit:ranges 警告 14 → 0（2026-11-04）

14 條全在 `civilwar` 包（1945–1949）。`NAMED_SOURCE = /《|『/`，
即出處要有書名／條約名／檔案名的括號。13 條 `source-generic` 是**只有主題標籤**
（「武漢戰事（1949年5月）」「廣西戰役」「東北行營檔案」），1 條 `note-thin`。

**做法與界線**：沒有編造檔案編號或卷頁。改法是補上**本包已經在用**的戰區對應著作，
原本的主題標籤保留在後面，資訊不丟：
- 東北、武漢、廣東、廣西、南寧 → 《中國人民解放軍第四野戰軍戰史》（包內 1948 年
  同城市快照已引此書，見「長春圍城一節」）
- 延安、西安、西寧、銀川 → 《彭德懷自述》（一野／西北戰區，包內已引）
- 杭州 → 《粟裕戰爭回憶錄》（三野／京滬杭，包內已引）
- 北平 → 《傅作義部改編協議》（1949年1月21日）（包內別處已用此書名號，只是這行沒加括號）

**仍未做的事**：這些是「戰區對應的標準著作」層級的對齊，**沒有核到卷／頁**。
要再往下，得真的翻書確認該條記載在哪一卷。commit 裡也寫明了。

`note-thin`：1945年8月快照的 note 只有 21 字，補成交代「僅示大勢、非劃定之界線、
省級色塊為上限示意」的說明，與包自述的 tag 一致。

## 1AJ. 五條日中混雜條目：desc 改繁體中文，引用欄保留日文原題（2026-11-04）

使用者決定：**只把 desc 譯成繁體中文，source 欄保留日文原題**（引用保留原始書名是標準做法）。

改了 `ymq-1715`、`prc-1952`、`prc-1982`、`prc-1995`、`prc-2012` 五條的 `desc`。
譯文只搬原文有的事實，不加判斷、不加原沒有的年份或細節。
`prc-1952` 順帶把原文裡的簡體「中華人民共和国」寫成「中華人民共和國」。

**還留著日文的欄位（本次未動，等決定）**：
- `title`：ymq-1715「正徳の貿易制限と銅（長崎—清）」、prc-1982「教科書檢定問題（近隣諸国條項の発端）」、
  prc-1995「村山談話と戦後50年の自己認識」、prc-2012「尖閣「国有化」と東海接触の常態化」
  ——這是時間軸上的顯示標籤，改它會動到 UI 與可能的跳轉引用。
- `secondary`（五條全是日文）：這是給讀者看的正文層，不是引用，照 desc 的邏輯應該要譯。
- `location`：prc-1982／1995 是「東京（検定）、北京・ソウル（抗議）」——**ソウル 是片假名**，
  繁體 UI 裡應作「首爾」。這條不是風格問題，是可讀性問題。
- `source`／`outcomeSource`：依決定保留原題（如《日本国との平和條約》第二條、外務省『日本外交文書』）。

**踩到的工具坑**：`npx tsc --noEmit` 對這五個檔的語法錯誤**沒報**，
`npm run build` 用的 `tsc -b`（project references）才報 TS1005。
以後改完資料檔要跑 `npm run verify`（裡面是 `tsc -b`），不要只跑 `tsc --noEmit`。

## 1AK. 五條條目全面中文化：title／secondary／location／university／outcome（2026-11-04）

使用者決定：三項都照 desc 的邏輯做，title 也改中文（時間軸標籤跟 UI 一致）。
`source`／`outcomeSource` 依前次決定保留原題。

**我前一次號稱「正文已全中文化」是錯的**，兩個原因：
1. 我用 regex 掃欄位，只抓單引號字串。prcPack 的 `university`／`outcome`
   是**反引號 template literal**，而且值常換行（`university:` 換行才接值），
   regex 直接漏掉。**是瀏覽器實測打臉我的**：彈窗裡還有三行假名。
2. 正確做法是**在 runtime 載入 pack 物件遞迴走一遍**（`import` 後 walk object），
   不要用 regex 猜。走一遍的結果：正文還有 9 個欄位是日文
   （`university` 五條、`outcome` 四條），不是我先前講的零。

全部譯完後再走一次：含假名的欄位 4 個，**全部是引用欄**（source／outcomeSource），
正文 0 個。瀏覽器實測 `#/china/prc@1982` 彈窗假名行數 0。

**順帶修的字體問題**：`audit:chars` 的 HARD 清單**不收 `则` 與 `与`**，
所以我自己打的簡體 `则` 它沒擋。已手動修 4 處：
ymq-1715 outcome 的 `则`→`則`、ymq-1715:559 舊的 `则`→`則`、
prc-1952 title 與 eraLink label 的 `与`→`與`。（`与` 在 SOFT 清單，只列 info 不擋。）

## 1AL. audit-chars 補字＋全專案 `渉` 清理（2026-11-04）

**閘門的洞比想像大。** 掃了一遍候選字，發現 HARD 完全沒收的有：
`则`（5 處）、`渉`（全專案 83 處）、`约`、`悬`、`证`、`决`。
`渉` 是**日本新字體**，繁體中文裡不該出現：「交渉」應作「交涉」、
「三國干渉」應作「三國干涉」。它連 SOFT 都不在，所以之前一路全綠。

已補進 HARD：`则 渉 约 悬 纪 证 评 论 许 访 诉 详 趋 宪 协 简 卖 厅 圣 决`
（後面幾個當前零出現，當預防）。補完閘門立刻報 **40 條硬傷**。

**清理做法與界線**：用**與 `audit-chars.ts` 相同的 `JP_LINE` 規則**判斷一行
是不是日文文字（含假名或日文新字），是就不動——那裡的 `渉` 是正確字形。
另先確認全專案沒有任何 `渉` 落在『』或「」內，避免改到日文書名。
結果：17 個檔案、60 行修正，閘門回到 0。

**順帶修好的條約名**：民國包 `《解决山東悬案條约》`→`《解決山東懸案條約》`、
`《九國公约》`→`《九國公約》`。這是中文條約的正式名稱，不屬於「保留原典字形」
的範圍——原典本身就是繁體。

**仍存在的洞（下一輪）**：
- `audit:chars` 預設只掃 PROSE 清單裡的目錄；`bakumatsu/data/history.ts`、
  `sengoku/data/timelineDetails.ts`、`japanEras/packs/*`、各 `timeline.json`
  都不在範圍。這次清理主動掃了全部 src，但閘門本身仍只掃一部分。
- SOFT 清單（`来 与 干 内 会` 等）只列 info。民國包引用欄裡還有
  `《六十年来中國与日本》`（應作 `六十年來中國與日本`）與 `适用`（應作 `適用`）。
  要清得逐條判斷是否古典引文，不能一鍵替換。

**`渉` 的最後 5 處是刻意留的**：全專案清完後還剩 5 處，全部在 `source:`／
`outcomeSource:` 欄，是日文文書名本身——《薩摩藩・英国交渉記録》、
《日本国との平和條約》第二條、外務省・自民党交渉記録、休戰交渉相關文書。
判斷標準一條：**那是我們寫的中文，還是別人文件的原名**。
`role:`／`label:`／`desc:`／`note:` 裡的「交渉」一律改「交涉」（改了 15 行），
`source:` 裡的日文標題不動。


**長度閘門的老實教訓**：中文比日文精簡，同內容字數變少。
譯完 `audit:ranges` 冒出 3 條 `outcome-thin`（367／389／399 < 400）。
我**沒有灌水**，只把日文原有、被我壓縮的措辭展開（例如
「貿易品目的轉換」→「銅在品目中的比重下降，長崎貿易轉向……的品目結構」），
三條都回到 400 以上。若哪天有人為了過閘門而加原文沒有的內容，就是這條規則被用錯。






