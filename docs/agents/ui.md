# ui｜介面可用性與手機排版（已停用）

> **2026-11-22 起 `agent/ui` 排程已停用**，介面工作改由使用者與助理按需處理。本檔保留為參考：下方「手機整頁捲動規範」與「全時代實測」仍然有效，任何會動到版面的人（含 enrich／map／march／accuracy 的收工檢查）都必須遵守。

> 本輪只讀 `docs/agents/QUICK.md` 就開工；本檔是參考，只在 QUICK 不夠時讀上面「速查」段（最多 30 行）。
> worktree：`~/Project/historyfirst-1/historyfirst-wt-ui`，分支 `agent/ui`。

## 速查（只看這段就夠）

- **工作單（2026-11-28 起取代舊佇列）**：`node scripts/agent-queue.mjs plan --track=ui --todo=2`，領 `docs/plans/2026-11-28/ui.md`「時光機」簡易版行；舊 `ui_queue.mjs` 佇列停用。
- 一輪最多 **2 行**；每行只改行首點名嗰個檔，該行 `驗收=`（`node scripts/audit_kid_ui.mjs --require=<id>`）由紅變綠先可以 `--done=N`。睇全部進度：`node scripts/audit_kid_ui.mjs --all`。
- 字串只可以由 `src/kid/strings.ts` import、圖示只可以用 `<Icon name>`；`src/` 一律正體書面語。年份一律經 `useEraYear()`（`src/lib/timelineBridge.ts`），唔准自己查 `.year-scrubber`。
- **開工與收工各跑一次手機實測**：`node scripts/mobile_probe.mjs --narrow --eras=tang,edo,kojoseon > /tmp/mp.log 2>&1; echo exit=$?; tail -n 8 /tmp/mp.log`（探針已帶 `?ui=classic`，量嘅係詳細版；需要本機 Chrome）。收工時失敗數不得比開工多。
- 手機版是「整頁捲動」設計，見下方「手機整頁捲動規範」；不要改回內部捲動。簡易版同樣唔准對 `html`／`body`／`#root` 設 `overflow:hidden`。
- 雲端層專屬、唔准改：`src/lib/timelineBridge.ts`、`src/kid/{strings.ts,icons.tsx,KidShell.tsx,uiMode.ts,stories.ts,useKidStories.ts}`、`scripts/audit_kid_ui.mjs`、`scripts/kid_probe.mjs`。缺字串／圖示就記 `blocked`。
- 快驗閘門：`npm run gates -- --only=audit:mobile`。
- 地圖標籤字級一律跳過；具體做法見下方；只在這段不夠時往下讀。



## 手機整頁捲動規範（2026-11-22 起，不得推翻）

窄屏（≤700px，或橫屏矮觸控）由**文件本身**捲動，不是 `.app-shell__main` 內部捲動。設計理由與實測在 `docs/MOBILE_PLAN.md` 最後一節。

- 頁頭、時代列、年代軸隨內容捲走；只有 `.content-dock__head` 黏頂；底欄在捲入內容時收起，「時間軸」浮鈕平滑捲回頁首。
- 地圖未放大時 `touch-action: pan-y`（一指上下滑＝捲頁），放大後（`--zoomed`）才 `none`。
- **任何新增的浮層、圖例、面板若自帶內部捲動**（`overflow-y:auto`）：必須限制高度，且 `overscroll-behavior` 不可是 `contain`（要能捲到盡頭後交還頁面）；不可蓋住地圖大半面積。
- 不要用 `display:none` 收起頁頭一類固定區塊（會造成高度突變、捲動跳位）。
- 不要在窄屏把 `html`、`body`、`#root` 設回 `overflow:hidden`，也不要給 `.app-shell` 固定高度。
- 不要動 `src/lib/scrollRoot.ts`、`src/lib/useCollapseOnScroll.ts`、`src/lib/mapViewport.tsx`：它們是捲動機制本體。要改行為就寫進報告「下輪建議」。
- 桌面（≥1025px）與平板版面維持原樣：`.app-shell` 仍是 100dvh 網格、地圖 `touch-action:none`。

### 全時代實測

`node scripts/mobile_probe.mjs`（全部）、`--narrow`（只測 390）、`--eras=tang,edo`（指定時代）。時代清單自動讀自 `src/state/TopicContext.tsx`，新增時代會自動納入。

每個時代在 390×844 觸控模擬下檢查五項：`load`（主區有內容、無未捕捉例外）、`width`（無橫向溢出）、`scroll`（一指從地圖上滑真的會捲頁）、`trap`（地圖上吞手勢的面積 ≤ 50%）、`sticky`（分頁列黏頂）；768 與 1440 查 `load`＋`width`。

遇到 ✗：

1. 先用 `--eras=<時代>` 單獨重跑確認不是偶發（網路或冷啟動）。
2. 看失敗項對應的元素：`trap` 多半是新浮層有內部捲動；`width` 多半是某個元素固定寬度；`sticky` 多半是上層加了 `overflow`。
3. 只改樣式（`src/mobile.css` 的窄屏區塊優先），改完該時代重跑到 ✓，再跑 `node scripts/audit_mobile_css.mjs`。
4. 修不好就還原，寫進報告，不要為了過關放寬 `mobile_probe.mjs` 的門檻。

## 目標

讓介面在手機（390 寬）、平板（768）、桌面（1440）都能用：文字讀得到、按鈕按得到、鍵盤操作看得到焦點、讀屏軟體念得出按鈕名稱。**只動樣式與元件排版，不動歷史內容。**

## 你能改什麼

- 樣式：`src/App.css`、`src/mobile.css`、`src/index.css`。
- 元件的排版與無障礙屬性：`src/**/components/*.tsx`（加 `aria-label`、`alt`、`type="button"`、`className`）。

## 你不能改什麼

- 任何歷史資料字串（事件、人物、成語、引文）；`src/**/data/`、`src/**/packs/`、`src/geo/`。
- 地圖上的標籤字級（`map-label`、`route-label`、`.map2d-*`、SVG 內文字）：這些字級與縮放綁在一起，**一律跳過**。
- 色彩對比的門檻與 `scripts/audit_*`。

## 佇列

```sh
node scripts/ui_queue.mjs
```

四類，依下列順序做，**一類做完才做下一類**：

1. `focus`：全站沒有 `:focus-visible`。做法見下節「第一項」。
2. `a11y`：圖示按鈕缺 `aria-label`。每項給一個**說明動作的短語**，例如「關閉」「上一年」「展開人物欄」。不要寫「按鈕」。
3. `alt`：`<img>` 缺 `alt`。有意義的圖寫簡短描述；純裝飾的圖寫 `alt=""`。
4. `font`：小於 `0.75rem` 的 `font-size`。見下節。

## 第一項：全域焦點樣式（只做一次）

在 `src/index.css` 檔尾加入下面整段（照抄，不要改選擇器）：

```css
:where(button, [role='tab'], a, input, select, summary, textarea):focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

做完之後：

```sh
grep -c "focus-visible" src/index.css       # 必須 ≥ 1
grep -rn "outline: *none\|outline:none" src --include=*.css   # 若有，逐條看：只保留「已另有 :focus-visible 補上」的
```

## font-size 的做法

1. `node scripts/ui_queue.mjs font` 取第一項，例如 `src/App.css:121｜font-size: 0.72rem;`。
2. `read` 該行上下 12 行，看這條規則屬於哪個 class。
3. **屬於地圖或 SVG 標籤**（class 含 `map`、`label`、`route`、`svg`、`legend-dot`）：跳過，進放棄清單，原因寫「地圖標籤」。
4. **屬於一般介面**（按鈕、清單、卡片、標題、頁籤、說明文字）：把小於 `0.75rem` 的值改成 `0.75rem`。
5. 一次最多改 4 條，改完驗證再 commit。若改了某條之後 `audit:mobile` 變差，把那條還原。

## 單項驗證（每次 commit 之前都要跑）

```sh
node scripts/audit_mobile_css.mjs > /tmp/mobile.log 2>&1; echo mobile=$?    # 與開工時相同或更好
node scripts/audit_contrast.mjs > /tmp/contrast.log 2>&1; echo contrast=$?  # 必須 0
npx tsc -b; echo tsc=$?                                                       # 必須 0
npm run build > /tmp/build-ui.log 2>&1; echo build=$?                         # 必須 0
```

開工時先跑一次 `audit_mobile_css.mjs` 記下結果；它有 8 項不變式（含 `map-touch-trap`），**任何一項新出現紅燈就撤回最後一批改動**。

## 瀏覽器實測

不要自己開瀏覽器或寫探針：一律用 `node scripts/mobile_probe.mjs`（見上方「全時代實測」）。它會自己啟動與關閉 vite 與 Chrome；若中途被打斷，執行 `pkill -f "remote-debugging-port=9467"` 與 `pkill -f "vite.*5197"` 清場。量到的問題與佇列無關時，只寫進報告「下輪建議」。

## 判斷準則

- 一次只改一類東西；不要一邊補焦點樣式一邊重排版面。
- 觸控目標要 ≥ 44px（`var(--tap-min)`）。只在手機斷點內（`src/mobile.css`）加，不影響桌面。
- 不要新增動畫、不新增依賴套件、不換字型。
- 改 class 名稱前先 `grep -rn "<舊名>" src` 確認所有使用處，通常不要改名。
- 看不懂某條規則的用途：跳過，進放棄清單。

## 停止條件

- 四類佇列都是 0（`font` 只剩地圖標籤），且 `mobile_probe` 全部 ✓：報告「佇列已空」，結束。
- 佇列空但 `mobile_probe` 有 ✗：照「全時代實測」流程修，修到全 ✓ 為止（仍受一輪 4 項上限）。
- 連續 3 項改完後 `audit:mobile` 或 `tsc` 變紅：停止，撤回，寫報告。
- 新增的任何 `aria-label` 或 `alt` 若不確定內容：跳過，不要寫「圖片」「按鈕」之類空話。

## 本輪指標

`ui_queue` 末行的四個數字（a11y／alt／font／focus-visible）報告寫「開工 → 收工」；`audit:mobile` 8 項不變式維持開工時的狀態；`mobile_probe --narrow` 的通過數「開工 → 收工」；`audit:contrast` 保持 0。
