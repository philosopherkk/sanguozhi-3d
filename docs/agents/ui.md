# ui｜介面可用性與手機排版

> 先讀 `docs/agents/README.md`。本檔只寫這支 agent 專屬的部分。
> worktree：`~/Project/historyfirst-1/historyfirst-wt-ui`，分支 `agent/ui`。

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
5. 一次最多改 6 條，改完驗證再 commit。若改了某條之後 `audit:mobile` 變差，把那條還原。

## 單項驗證（每次 commit 之前都要跑）

```sh
node scripts/audit_mobile_css.mjs > /tmp/mobile.log 2>&1; echo mobile=$?    # 與開工時相同或更好
node scripts/audit_contrast.mjs > /tmp/contrast.log 2>&1; echo contrast=$?  # 必須 0
npx tsc -b; echo tsc=$?                                                       # 必須 0
npm run build > /tmp/build-ui.log 2>&1; echo build=$?                         # 必須 0
```

開工時先跑一次 `audit_mobile_css.mjs` 記下結果；它有 7 項不變式，**任何一項新出現紅燈就撤回最後一批改動**。

## 瀏覽器實測（選做，只有有瀏覽器工具時才做）

沒有瀏覽器工具就整段跳過，不要嘗試安裝。有的話：

1. `npm run dev -- --port 5182 --strictPort` 背景啟動。
2. 在頁面用同源 iframe 量三個寬度，檢查有沒有橫向捲動：
   ```js
   (() => {
     const out = []
     for (const w of [390, 768, 1440]) {
       const f = document.createElement('iframe')
       f.style.cssText = `position:fixed;left:0;top:0;width:${w}px;height:800px;opacity:0;pointer-events:none`
       f.src = location.pathname
       document.body.appendChild(f)
       out.push({ w, el: f })
     }
     return out.length
   })()
   ```
   載入後讀 `iframe.contentDocument.documentElement.scrollWidth` 與 `clientWidth`：`scrollWidth > clientWidth` 就是橫向溢出。
3. 結束時一定要關閉：`pkill -f "vite.*5182"`，並關掉開啟的分頁。
4. 瀏覽器量到的問題與上面佇列無關時，只寫進報告「下輪建議」，本輪不處理。

## 判斷準則

- 一次只改一類東西；不要一邊補焦點樣式一邊重排版面。
- 觸控目標要 ≥ 44px（`var(--tap-min)`）。只在手機斷點內（`src/mobile.css`）加，不影響桌面。
- 不要新增動畫、不新增依賴套件、不換字型。
- 改 class 名稱前先 `grep -rn "<舊名>" src` 確認所有使用處，通常不要改名。
- 看不懂某條規則的用途：跳過，進放棄清單。

## 停止條件

- 四類佇列都是 0（`font` 只剩地圖標籤）：報告「佇列已空」，結束。
- 連續 3 項改完後 `audit:mobile` 或 `tsc` 變紅：停止，撤回，寫報告。
- 新增的任何 `aria-label` 或 `alt` 若不確定內容：跳過，不要寫「圖片」「按鈕」之類空話。

## 本輪指標

`ui_queue` 末行的四個數字（a11y／alt／font／focus-visible）報告寫「開工 → 收工」；`audit:mobile` 7 項不變式維持開工時的狀態；`audit:contrast` 保持 0。
