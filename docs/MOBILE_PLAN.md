# 流動版計畫與量測基準

使用者要求「使網站適用手機」。本檔記錄**量測方法、已修項目、尚未處理項目**，
以便後續輪次能接上，而不是每次重新猜。

## 量測方法（可重現）

用 `agent-browser` 以 393×852（iPhone 14 Pro 視口）開 `vite preview`，再以
`eval` 讀取 `getBoundingClientRect()` 與 `getComputedStyle()`。所有下面列出的
數字都是這樣量出來的，不是推測。

注意：無頭環境無法模擬 `(pointer: coarse)`（`matchMedia` 回傳 false、
`ontouchstart` 不存在）。因此凡是需要在 CI 里驗證的規則，一律放在**寬度斷點**，
不把關鍵行為綁在 `pointer` 查詢上。

## 改動前（基線）

| 區塊 | 高度 | 佔螢幕 |
|---|---|---|
| 頁頭 `app-header` | 192px | 23% |
| 朝代列 `era-bar`（18 按鈕換行） | 256px | 30% |
| 年份滑桿 `year-scrubber` | 144px | 17% |
| 地圖＋側欄 `app-shell__main` | **230px** | **27%** |
| 頁尾 | 30px | 4% |

另外三項客觀缺陷：

1. **內容比視口寬 28px 且被剪掉**。`.app-shell` 寬 393px，但其單一隱式
   欄位解析為 `420.812px`——grid item 的 `min-width` 預設為 `auto`
   （即 min-content），被不可斷行內容撐開，再由 `overflow: hidden` 剪掉右側。
   後果：頁頭、朝代列、年份滑桿最右一列永遠不可見。
2. **全 repo 零個 `env(safe-area-inset-*)`**，且 `viewport` 無 `viewport-fit=cover`。
3. **29 個控件低於 44px**（`year-scrubber__tick` 13 個 25×22、`app-header__step`
   35×36、`map-2d__zoom-btn` 32×30 等），`body` 的 `touch-action` 為 `auto`。

## 已修（本輪）

| 项目 | 做法 | 實測結果 |
|---|---|---|
| 爆框剪切 | `.app-shell > * { min-width: 0 }` | 欄位 420.8→393px；排除橫向捲動容器後**溢出元素歸零** |
| 朝代列 | 改單行橫向卷軸（`scroll-snap`、右緣淡出提示仍有內容） | 256→**56px**；18 個時代全部仍可達（內容寬 1624px 可滑） |
| 主區欄位 | 同時對 `.app-shell__main` 與 `--map-side` 改單欄 | 側欄 147px→393px |
| 地圖高度 | 行高比改 `1.4fr / 1fr` | `app-shell__main` 230→**465px**（27%→55%） |
| 頁頭 | 窄屏收起標語（與時代切換器內容重複） | 192→155px |
| 圖例 | 由底部改置頂、限高可滑、`overscroll-behavior: contain` | 不再與圖層列重疊 |
| 安全區 | 頁頭 `padding-top`、頁尾與圖層列 `bottom` 加 `env(safe-area-inset-*)`；`viewport-fit=cover` | — |
| 按擊區 | 主要控件 `min-height: var(--tap-min)`＝2.75rem | 寬度斷點下可驗證 |
| 觸控 | `touch-action: manipulation`、取消 tap highlight、介面文字不可選（內容區仍可複製） | — |

設計取向：沿用既有線裝書／墨色語彙（Noto Serif TC、`--accent:#c4a574`、朱印紅），
不引入新字型或通用膠囊控件。可用空間以「卷軸式橫滑」換取，不以隱藏內容換取。

## 結構閘門 `npm run audit:mobile`

五條不變量，每條對應一個真實發生過、肉眼看不出的缺陷：
`blowout`、`mapside-stack`、`safe-area`、`bare-vh`、`tap-min`。
附 `--teeth` 自我測試：把缺陷逐一注入記憶體中的 CSS，確認每條都會報紅。
本輪 `--teeth` 曾抓出自己兩個問題——第一版解析器找不到規則（五條全紅），
第二版 `tap-min` 的注入樣板改錯目標；兩者都是靠自我測試才現形。

## 尚未處理

- **B 地圖手勢**：`App.css` 有 4 處 `touch-action: none`（地圖縮放層），
  即瀏覽器手勢被停用，改由 JS 手勢接管。**是否實作雙指縮放未經證實**；
  164 個 pointer handler、0 個 touch handler。下一輪須先驗證 pinch，
  沒有就要補，並把浮層改為可收合抽屜。
- **C 側欄抽屜化**：大事／人物／成語目前佔 465px 中的 1fr，改為可拉出的底部抽屜
  可再釋放地圖高度；三層意譯分頁與深連結分享選單尚未針對窄屏處理。
- **D 視覺回歸**：本閘門是靜態結構檢查，不是視覺測試。真正的多尺寸驗證
  需要瀏覽器自動化依賴，目前刻意不引入。
- 地圖在較高的帶內按寬度適配，垂直方向留有空白（viewBox 比例所致），非過剩留白缺陷。
