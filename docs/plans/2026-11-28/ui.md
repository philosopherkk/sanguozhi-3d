# 介面大改：「時光機」簡易版（幼稚園小朋友都識用）

> ⛔ **草案，暫不排程**：要等（1）使用者拍板下面「待裁定」四條，（2）雲端層交付「第 0 期」工具與骨架，
> `ui` 排程先會重開並領取本檔。第 0 期未交付前，本檔所有 `☐` 行嘅驗收工具都未存在，領咗只會全部 blocked。

## 目標一句

一個唔識字或者啱啱識字嘅小朋友，**唔使人教**，喺手機或電腦上做到以下五件事，每件 **≤ 3 下點擊**：

| # | 任務 | 上限 |
|---|---|---|
| T1 | 由首頁去到「唐朝」 | 2 下（中國 → 唐） |
| T2 | 睇下一年發生乜嘢 | 1 下（▶ 大箭咀） |
| T3 | 叫網站讀故事俾佢聽 | 1 下（🔊） |
| T4 | 睇呢個時代有咩人物、撳一個睇大頭像 | 2 下 |
| T5 | 迷路之後返到首頁 | 1 下（🏠，任何畫面都喺同一位置） |

成人同研究用途唔損失：舊介面完整保留為「詳細版」，一撳切換、會記住。

## 現況診斷（2026-11-28 實讀程式碼）

- **一屏塞太多**：頁頭（標題＋副題＋六國切換＋年份 − ＋ 播放）、時代列（中國 18 格）、年份滑桿（刻度＋月份滑桿）、地圖圖層列、側欄三分頁、底欄（字級／深淺／程度／搜尋／書籤）——首屏同時有 40 個以上可點目標。
- **同一件事有 11 套實作**：`app-header__year-block` 喺 11 個檔各寫一次（Imperial／DeepDive／三國／秦漢／周…），任何介面改動都要改 11 次——小模型必然漏。
- **靠讀字**：所有按鈕都係純文字（「紀事 · 人物 · 成語」「拖曳或點刻度跳年」），冇圖示；年份係唯一嘅「位置感」。
- **滑桿細**：`input[type=range]` 嘅拇指對小朋友手指太細；刻度按鈕係 1 個字咁大。
- **已有可以直接用嘅資產**：352 張人物頭像、每條事件已有「小學生層」(`elementary`) 文字、`readingPrefs` 已有程度／字級／深淺三個設定、`announceTimeline` 年份廣播已證實可以跨 11 套實作推年份（`BottomBar` 書籤用緊）。

## 設計（新外殼「時光機」，舊介面唔拆）

### 七條原則（每條都有對應機器檢查，見第 0 期 `audit_kid_ui.mjs`）

1. **一屏一件事**：首頁只揀國家、第二屏只揀時代、第三屏先係地圖＋故事。
2. **圖先過字**：每個按鈕＝大圖示＋最多 4 個字。國家卡、時代卡用該時代代表人物頭像（現成 352 張）。
3. **手指夠大**：所有可點目標 ≥ 64×64 px（手機）／≥ 56 px（桌面滑鼠）；主要文字 ≥ 22 px，年份數字 ≥ 40 px。
4. **永遠有路返**：🏠（回首頁）同 ◀（返回上一屏）固定喺左上角，每一屏同一位置。
5. **唔使打字、唔使拖**：搜尋同書籤喺簡易版收埋；年份用 ◀ ▶ 大箭咀同 ▶ 播放，滑桿只係輔助。
6. **會讀出嚟**：🔊 用瀏覽器內建語音（Web Speech API，`speechSynthesis`）讀「小學生層」；冇語音就唔顯示個掣（唔可以出一個撳咗冇反應嘅掣）。
7. **唔會嚇親**：冇彈窗、冇會消失嘅提示；動畫跟 `prefers-reduced-motion`；對比度過 `audit:contrast`。

### 三屏流程

```
① 揀國家（6 張大卡）  →  ② 揀時代（時間河：一粒粒踏腳石）  →  ③ 時光機（地圖＋故事）
       🏠 永遠喺左上                ◀ 返回                          ◀ 返回 ／ 🏠
```

**① 揀國家**：手機 2 欄 × 3 行、桌面 3 × 2；每張卡＝國家名（大字）＋一張代表人物頭像＋底色。唔用國旗 emoji（Windows 顯示成兩個英文字母）。

**② 時間河**：一條由左到右（手機由上到下）嘅河，每個時代一粒踏腳石＝頭像＋時代名；舊→新排。中國 18 粒都放得落：手機直向捲、桌面橫向 snap 捲。目前所在時代發光。

**③ 時光機主畫面**

- 手機（≤ 700px）：上半地圖、下半一張「故事卡」；底部固定一條**時光列**：`◀  [ 618 年 ]  ▶   ▶播放`，再下面三個大分頁 `📜 故事｜👤 人物｜🗺️ 地圖`（揀「地圖」＝地圖放大到全屏）。
- 桌面（≥ 1025px）：左地圖、右故事卡；時光列喺底部置中。三個分頁變成右欄頂部大按鈕。
- 平板：跟手機版。
- **故事卡**：一次只顯示一件事——大標題、頭像（如有）、小學生層文字、🔊、`◀ 上一個故事｜下一個故事 ▶`。呢一年冇事件時寫「這一年沒有故事」＋大掣「看下一個故事 ▶」（直接跳去下一個有事件嘅年份，唔係淨係 +1 年）。
- **人物**：大頭像格（手機 3 欄），撳一下放大＝頭像＋名＋一句簡介＋🔊。
- **地圖**：撳色塊出一個大氣泡（勢力名＋顏色），冇圖層列。

**⚙️ 設定**（右上角，唯一一個二級畫面）：`字的大小`（三級：A A A）、`白天／晚上`、`難易`（簡單／普通／深入＝`elementary/secondary/university`）、`切換到詳細版`。

### 技術方向（點樣先唔會改 11 次）

- **新外殼包住舊程式，唔改 11 個時代 App**：簡易版係 `<html data-ui="kid">`＋`src/kid/` 一套新元件；舊頁頭／時代列／滑桿用 CSS **視覺隱藏但保留喺 DOM**（年份橋要寫佢個滑桿；`display:none` 會令 `mobile_probe` 同捲動機制出事）。
- **年份橋**：把 `BottomBar.tsx` 入面已經證實有效嘅 `useYearPush`／`useTimelineYear` 抽出成 `src/lib/timelineBridge.ts`，畀時光列用。
- **故事資料轉接**：Imperial pack（中國晉→共和國 10 個時代）同 DeepDive pack（日本 azuchi／edo 等＋四國 16 個時代）兩個家族用同一個 `useKidStories()` 轉接器；其餘自訂時代（三國、秦漢、周、平安、戰國、幕末、近代）第一版先用**舊側欄套簡易版皮**（大字、大頭像），第二版再逐個接轉接器。
- **模式狀態**：`?ui=kid|classic`＋`localStorage`；`mobile_probe`、`audit:mobile` 一律用 `?ui=classic` 跑（保護現有閘門口徑），簡易版有自己嘅探針。

## 待裁定（使用者）

1. **預設邊個版？** 建議：新訪客預設「簡易版」，⚙️ 入面一撳轉詳細版並記住；舊連結帶 `?e=`／`?y=` 嘅照舊入詳細版（唔打亂已分享嘅連結）。
2. **🔊 讀乜話？** 建議：跟系統有咩聲用咩，優先 `zh-HK`（粵語），冇就 `zh-TW`，再冇就唔顯示掣。文字照舊正體書面語。
3. **圖示用 emoji 定自繪 SVG？** 建議 emoji（零資產、小模型識寫），國家卡例外用頭像。
4. **`ui` 排程重開時段**：建議 `10 2,14`（HKT，夾喺 enrich 00:10／12:10 同 accuracy 04:10／16:10 之間；鎖 HARD90 唔會撞）。要改 registry＋重貼＋你 `sudo` 一次。

## 第 0 期：雲端層先交付（非 `☐` 行，代理唔領）

- [ ] `scripts/audit_kid_ui.mjs`：`--require=<檢查 id>` 逐條斷言（唯讀、未做＝exit 1、做好＝exit 0、未知 id＝exit 2），下面每條 `☐` 行一個 id；連 `--teeth`（每個 id 注入一種破壞要咬到）同 `--list`。靜態讀 `src/kid/*.tsx`＋`src/kid/kid.css`（沿用 `audit_mobile_css.mjs` 嘅 CSS 解析與 `var()` 展開），CI 冇 Chrome 都跑得。
- [ ] `scripts/kid_probe.mjs`：真瀏覽器（390／768／1440）跑 T1–T5 數點擊次數、量每個目標實際 px、橫向溢出；**冇 Chrome 時 exit 3（唔准 SKIP 當綠）**；唔入 `驗收=`（CI 冇 Chrome），只做雲端合併前覆核。
- [ ] `src/lib/timelineBridge.ts`：由 `BottomBar.tsx` 抽出 `useYearPush`／`useTimelineYear`，加 `useEraRange()`（讀當前滑桿 min/max）；`BottomBar` 改用佢，行為不變。
- [ ] `src/kid/uiMode.ts`（模式讀寫＋`data-ui` 屬性）、`src/kid/strings.ts`（全部簡易版字串，下面行入面嘅字照抄）、`src/kid/kid.css`（設計 token：`--kid-tap:64px`、`--kid-font:22px`、`--kid-year:40px`、間距、圓角）、`src/kid/KidShell.tsx`（三屏路由骨架，每屏一個空插槽）。
- [ ] `src/kid/useKidStories.ts`：Imperial＋DeepDive 兩家族轉接器，回傳 `{year, title, text(按程度), portrait?, id}[]`；附自測。
- [ ] `docs/agents/ui.md` 改「速查」：先領本檔（`plan --track=ui`），舊 `ui_queue` 佇列停用；重建 `historyfirst-wt-ui` worktree；`mobile_probe` 開工收工照跑（`?ui=classic`）。
- [ ] 本檔每條行嘅驗收先喺骨架上跑一次證明係**紅**，再解除上面 ⛔。

## 第 1 期：三屏骨架（代理）

每行只改一個檔；字串一律由 `src/kid/strings.ts` import，**唔准喺元件內寫死中文**（`strings` 行除外）。

☐ src/kid/KidHome.tsx｜第①屏「揀國家」：`TOPIC_META.map` 出 6 張卡（`<button data-kid="topic" data-topic={t.id}>`），卡內 `<PersonPortrait size="lg">`（用 `strings.ts` 嘅 `TOPIC_FACE[t.id]` 檔名）＋國家名；撳卡＝`setTopic(t.id)` 並轉去第②屏；標題用 `S.pickCountry`｜驗收=node scripts/audit_kid_ui.mjs --require=home
☐ src/kid/kid.css｜`[data-kid=topic]` 卡：`min-height`／`min-width` 用 `var(--kid-tap)` 以上、字級 `var(--kid-font)` 以上；手機 `grid-template-columns: repeat(2, 1fr)`、`≥1025px` 用 3 欄｜驗收=node scripts/audit_kid_ui.mjs --require=home-size
☐ src/kid/EraRiver.tsx｜第②屏「時間河」：`eraSlotsForTopic(topic).map` 出踏腳石（`<button data-kid="era" data-era={slot.id}>`，頭像用 `ERA_FACE[slot.id]`，冇就用時代名第一個字做大字圓章）；目前時代加 `aria-current="true"`；撳＝`setEraForTopic` 並轉去第③屏；載入時 `scrollIntoView({block:'center', inline:'center'})` 目前時代｜驗收=node scripts/audit_kid_ui.mjs --require=era-river
☐ src/kid/kid.css｜`[data-kid=era]` 踏腳石尺寸 ≥ `var(--kid-tap)`；手機直向 `flex-direction: column`、桌面橫向並 `scroll-snap-type: x mandatory`；`[aria-current=true]` 有外框光暈（唔可以只靠顏色：外框闊 ≥ 3px）｜驗收=node scripts/audit_kid_ui.mjs --require=era-river-size
☐ src/kid/TimeDock.tsx｜時光列：`◀`（`aria-label={S.prevYear}`）、年份大字（`aria-live="polite"`，前 N 年寫 `前N`）、`▶`（`S.nextYear`）、播放／停（`S.play`／`S.stop`）；全部經 `timelineBridge`，到頭到尾 `disabled`｜驗收=node scripts/audit_kid_ui.mjs --require=time-dock
☐ src/kid/kid.css｜`.kid-dock`：手機 `position: fixed; bottom: 0`＋`padding-bottom: env(safe-area-inset-bottom)`；按鈕 ≥ `var(--kid-tap)`；年份字級 ≥ `var(--kid-year)`；桌面置中、`max-width: 720px`｜驗收=node scripts/audit_kid_ui.mjs --require=time-dock-size
☐ src/kid/KidTabs.tsx｜三個大分頁 `📜 故事｜👤 人物｜🗺️ 地圖`（`role="tablist"`，每個 `role="tab"`＋`aria-selected`），字串 `S.tabStory／S.tabPeople／S.tabMap`；揀「地圖」時加 `data-kid-map-full`｜驗收=node scripts/audit_kid_ui.mjs --require=tabs
☐ src/kid/NavCorner.tsx｜左上角固定 🏠（`S.home`，返第①屏）＋ ◀（`S.back`，返上一屏；第①屏時唔顯示 ◀ 但 🏠 位置不變）｜驗收=node scripts/audit_kid_ui.mjs --require=nav-escape
☐ src/App.tsx｜`isKidMode()` 為真時喺 `<TopicProvider>` 內渲染 `<KidShell>`，舊時代 App 照樣渲染喺 `KidShell` 嘅地圖插槽（唔好拆走，年份橋要用佢）｜驗收=node scripts/audit_kid_ui.mjs --require=wiring
☐ src/kid/kid.css｜`[data-ui=kid]` 下視覺隱藏舊 chrome：`.app-header`、`.era-bar`、`.year-scrubber`、`.bottom-bar`、`.map-layer-bar` 用 `position:absolute; width:1px; height:1px; overflow:hidden; clip-path: inset(50%)`，**唔准 `display:none`**｜驗收=node scripts/audit_kid_ui.mjs --require=chrome-hidden

## 第 2 期：故事、人物、聲音（代理）

☐ src/kid/StoryCard.tsx｜一次一件事：`useKidStories()` 取當年事件，顯示標題、頭像、按程度嘅文字；`◀ S.prevStory｜S.nextStory ▶` 喺全時代事件之間跳（跳年份經 `timelineBridge`）｜驗收=node scripts/audit_kid_ui.mjs --require=story-card
☐ src/kid/StoryCard.tsx｜空年：當年冇事件時顯示 `S.noStory`＋大掣 `S.nextStory`，撳＝跳去下一個有事件嘅年份（唔係 +1）｜驗收=node scripts/audit_kid_ui.mjs --require=empty-state
☐ src/kid/ReadAloud.tsx｜🔊 掣（`S.readAloud`）：`speechSynthesis` 讀傳入文字；聲音揀法 `zh-HK`→`zh-TW`→`zh`，三樣都冇就 `return null`；再撳＝停；元件卸載時 `cancel()`｜驗收=node scripts/audit_kid_ui.mjs --require=read-aloud
☐ src/kid/StoryCard.tsx｜卡尾放 `<ReadAloud text={...}>`，讀「標題＋文字」｜驗收=node scripts/audit_kid_ui.mjs --require=story-voice
☐ src/kid/PeopleGrid.tsx｜人物大頭像格：手機 3 欄、桌面 5 欄；撳一個＝展開大頭像＋名＋一句（`brief` 或小學生層第一句）＋`<ReadAloud>`；再撳／`S.close` 收起｜驗收=node scripts/audit_kid_ui.mjs --require=people-grid
☐ src/kid/kid.css｜`.kid-story`／`.kid-people` 文字 ≥ `var(--kid-font)`、行高 ≥ 1.6、段落 `max-width: 32em`；頭像 ≥ 96px｜驗收=node scripts/audit_kid_ui.mjs --require=story-size
☐ src/kid/kid.css｜未接轉接器嘅時代（三國／秦漢／周／平安／戰國／幕末／近代）：`[data-ui=kid] .timeline-item`、`.person-card`、`.people-card` 套大字大頭像皮｜驗收=node scripts/audit_kid_ui.mjs --require=legacy-skin

## 第 3 期：設定、引導、鍵盤（代理）

☐ src/kid/KidSettings.tsx｜⚙️（右上角，`S.settings`）：`S.fontSize` 三級（對應 `FONT_STEPS` 第 1／3／4 級）、`S.dayNight`、`S.level`（`S.levelEasy／S.levelMid／S.levelDeep`＝`elementary/secondary/university`，全部經 `readingPrefs` 現有 setter）、`S.toClassic`（`setUiMode('classic')`）｜驗收=node scripts/audit_kid_ui.mjs --require=settings
☐ src/components/BottomBar.tsx｜詳細版底欄加一粒 `切換到簡易版`（`setUiMode('kid')`），其他唔郁｜驗收=node scripts/audit_kid_ui.mjs --require=to-kid
☐ src/kid/Breadcrumb.tsx｜頂部三粒點（國家 → 時代 → 時光機），已到嘅點填色＋`aria-label` 寫目前係第幾步｜驗收=node scripts/audit_kid_ui.mjs --require=breadcrumb
☐ src/kid/FirstVisit.tsx｜第一次入嚟喺第①屏頂顯示一句 `S.hintPick`＋大手指 👆 指住第一張卡，撳任何卡即消失、`localStorage` 記住；唔准用彈窗遮住畫面｜驗收=node scripts/audit_kid_ui.mjs --require=onboarding
☐ src/kid/TimeDock.tsx｜桌面鍵盤：`←`／`→` 換年、空白鍵播放／停；焦點喺輸入框時唔攔截｜驗收=node scripts/audit_kid_ui.mjs --require=keys
☐ src/kid/kid.css｜`@media (prefers-reduced-motion: reduce)` 下所有 `.kid-*` `transition`／`animation` 關閉｜驗收=node scripts/audit_kid_ui.mjs --require=motion

## 收口（雲端層覆核，唔係代理行）

- `node scripts/kid_probe.mjs`：45 個時代 × 390／768／1440 全綠；T1–T5 點擊數都 ≤ 上限；所有目標實測 ≥ 64px（手機）。
- `node scripts/mobile_probe.mjs`（`?ui=classic`）失敗數唔多過開工；`npm run gates` 無惡化（`audit:mobile`、`audit:contrast`、`audit:chars` 尤其）。
- 真人測試：搵一個 4–6 歲小朋友做 T1–T5，錄低卡喺邊（呢個機器量唔到）。
- 通過後先決定：預設版本要唔要跟住改、`audit_kid_ui.mjs` 入唔入 `gate-ci`（零值進場）。

## 代理須知（`ui` 軌道）

1. 每輪 `node scripts/agent-queue.mjs plan --track=ui --todo=2`，**最多做 2 行**（介面行比內容行難，寧少勿錯）。
2. 只改行首點名嗰個檔；要多一個檔＝唔屬於你，記 `blocked`。
3. 字串只可以由 `src/kid/strings.ts` import；`src/` 入面一律正體書面語（唔准「嘅、唔、咗」），commit 前跑 `node scripts/agent-selfcheck.mjs --branch`。
4. 收工必跑：該行驗收、`npm run gates -- --only=audit:mobile`、`node scripts/mobile_probe.mjs --narrow --eras=tang,edo,kojoseon`（失敗數唔准增加）。
5. 唔准動：`src/lib/scrollRoot.ts`、`src/lib/useCollapseOnScroll.ts`、`src/lib/mapViewport.tsx`、`src/lib/timelineBridge.ts`（雲端層嘅）、任何 `*Pack.ts` 資料檔。
