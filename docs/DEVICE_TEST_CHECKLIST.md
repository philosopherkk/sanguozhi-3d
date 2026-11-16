# 實機驗證清單（iPhone／iPadOS）——配合修 10／11／12、捏合縮放（PR #156）使用

環境只有桌面瀏覽器仿真，`pointer: coarse`、捏合、iOS 聚焦縮放呢啲全部仿真唔到，
以下每項都係「靜態推導已過閘、只欠實機畫勾」嘅項目。2026-11-15 使用者確認會安排實機。

## 開機步驟（Mac 行 preview，手機同 Wi-Fi）

```
npm run build
npx vite preview --port 4270 --strictPort --host
ipconfig getifaddr en0   # 搵 Mac 內網 IP，以下稱 <IP>
```

手機 Safari 開 `http://<IP>:4270/sanguozhi-3d/`。
每幅圖嘅代表 deep link（全部要帶得上對應版面）：

| 地圖 | URL 尾段 |
|---|---|
| Map2D（三國） | `?c=china&e=sanguo&y=208` |
| ZhouMap（西周） | `?c=china&e=xizhou` |
| QinHanMap（漢） | `?c=china&e=han&y=-100` |
| ImperialMap（元明清） | `?c=china&e=yuanmingqing&y=1644` |
| EraMapView（鎌倉） | `?c=japan&e=kamakura` |
| SengokuMap（戰國） | `?c=japan&e=sengoku` |
| JapanEraMap（德川江戶） | `?c=japan&e=edo` |
| 戰爭時代亞洲底圖 | `?c=japan&e=modern` |

## A. 捏合縮放（PR #156，七幅地圖逐個試）

1. 兩指捏合／張開 → 地圖縮放，**唔准**帶動成頁縮放（wrapper `touch-action:none`）。
2. 縮放中途手指移開／被通知打斷 → 唔會黐住喺拖曳狀態（onPointerCancel 全部接咗 onPointerUp）。
3. 雙擊／三指唔應該令縮放狀態錯亂。

## B. 按擊區（修 9／10 加碼，政策 44px／WCAG 2.5.8 底線 24px）

1. 分頁條「大事・人物・成語」三個 tab、年代尺左右箭頭、播放鍵、圖層開關、
   字級大細掣、月份 chip、側欄「先睇地圖」掣——用拇指連點，唔應該常常撳唔中。
2. 彈窗（事件詳情）關閉掣 ≥44px，拇指易中。
3. 已知豁免：年份刻度（約 26×22）靠滑桿與左右鍵承擔精準操作，實機確認滑桿拖動順手即可。

## C. iOS 聚焦縮放（修 12）

1. 人物搜尋框、任何 `<input>`／`<select>`／`<textarea>` 撳落去聚焦——
   **成頁唔准被 Safari 強制放大**（文字欄字級已設 16px 下限）。
2. 聚焦後鍵盤收起，版面唔應該甩位。

## D. 手機橫屏（修 11）

1. 手機轉橫屏（可見高約 393px，低於規則嘅 `min-height:500px` 閘）——
   唔應該進入平板／桌面窄屏規則嘅版面，亦唔應該爆框。
2. 彈窗開住轉橫屏 → 關閉掣仍然搵到、可見（44px 出口）。

## E. 捲動與彈窗（修 11、z 階 內容≤9｜分頁條41｜詳情窗50）

1. 手機直屏：上下滑應該一格一格 paging（scroll-snap y mandatory），唔會斜斜郁。
2. 年代 tab 條（era-bar）橫滑順暢。
3. 開住事件詳情窗：窗內可滾；背景唔應該跟住滾（滾動隔離）；分頁條唔可以壓住窗內文字。
4. Esc 冇鍵盤所以用唔到——實機只需要確認：關閉掣同點背景空白都關到窗。

## F. 安全區與字級

1. iPhone（瀏海／home indicator）：頭尾內容唔可以俾安全區食咗（`env(safe-area-inset-*)`）。
2. iPad（768–859px、coarse）：應該食修 10 嘅平板字級與 44px 按擊區（同仿真環境唔同，
   仿真環境冇 coarse，呢啲規則唔會喺電腦上出現——呢個唔係 bug）。

## G. 地圖說明摺疊（修 15，`<MapCredit>`）

1. 七幅地圖底部應該只見到一行「＋ 底圖與授權說明」，唔見長文——
   收起狀態地圖先食返完整高度（393px 仿真下收攏塊高 44px）。
2. 撳呢行：應展開全文（指示器變「－」），再撳收返；來返五次都應該同步，
   冇「撳咗冇反應」或者「展開後收唔返」。
3. 展開嘅全文要完整睇到（唔可以有「…」截斷），英文長檔案名唔准撐爆橫向。
4. 展開狀態下撳正文入面的維基百科／維基共享連結仍然命中（照舊開新分頁）。
5. 用鍵盤（藍牙鍵盤／VoiceOver）TAB 到呢行應該見到 focus 框，Enter／Space
   可展開收起。

## 畫勾方法

逐項寫「通過／失敗＋截圖」。任何失敗項回傳：機型、iOS 版本、URL、步驟、
截圖或影片；agent 輪再跟進。全部通過後喺本檔頂部寫「實機驗證完成（日期、機型）」。
