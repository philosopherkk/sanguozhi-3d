# 介面大改：「時光機」簡易版（幼稚園小朋友都識用）

> ⛔ **暫不排程**：四條裁定已於 2026-11-28 定案（見「裁定」）；第 0 期工具與骨架已交付（下面全部「已交付」，25 條 `☐` 行逐條證明係紅）。
> 等 `ui` 排程（`10 2,14` HKT）重開先領取本檔；重開由雲端層改 registry＋重貼，唔係代理自己開。

## 目標一句

一個唔識字或者啱啱識字嘅小朋友，**唔使人教**，喺手機或電腦上做到以下五件事，每件 **≤ 3 下點擊**：

| # | 任務 | 上限 |
|---|---|---|
| T1 | 由首頁去到「唐朝」 | 2 下（中國 → 唐） |
| T2 | 睇下一年發生乜嘢 | 1 下（▶ 大箭咀） |
| T3 | 把地圖放到全屏睇 | 1 下（地圖分頁） |
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

### 六條原則（每條都有對應機器檢查，見第 0 期 `audit_kid_ui.mjs`）

1. **一屏一件事**：首頁只揀國家、第二屏只揀時代、第三屏先係地圖＋故事。
2. **圖先過字**：每個按鈕＝大圖示（自繪 SVG，`src/kid/icons.tsx`）＋最多 4 個字。國家卡、時代卡用該時代代表人物頭像（現成 352 張）。
3. **手指夠大**：所有可點目標 ≥ 64×64 px（手機）／≥ 56 px（桌面滑鼠）；主要文字 ≥ 22 px，年份數字 ≥ 40 px。
4. **永遠有路返**：🏠（回首頁）同 ◀（返回上一屏）固定喺左上角，每一屏同一位置。
5. **唔使打字、唔使拖**：搜尋同書籤喺簡易版收埋；年份用 ◀ ▶ 大箭咀同 ▶ 播放，滑桿只係輔助。
6. **唔會嚇親**：冇彈窗、冇會消失嘅提示；動畫跟 `prefers-reduced-motion`；對比度過 `audit:contrast`。

### 三屏流程

> 本節示意圖嘅 🏠 ◀ 📜 等符號只係排版速記；實作一律用 `src/kid/icons.tsx` 嘅 `<Icon name>`，`src/kid/` 唔准出現 emoji（第 0 期 `audit_kid_ui.mjs` 會咬）。

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
- **故事卡**：一次只顯示一件事——大標題、頭像（如有）、小學生層文字、`◀ 上一個故事｜下一個故事 ▶`。呢一年冇事件時寫「這一年沒有故事」＋大掣「看下一個故事 ▶」（直接跳去下一個有事件嘅年份，唔係淨係 +1 年）。
- **人物**：大頭像格（手機 3 欄），撳一下放大＝頭像＋名＋一句簡介。
- **地圖**：撳色塊出一個大氣泡（勢力名＋顏色），冇圖層列。

**⚙️ 設定**（右上角，唯一一個二級畫面）：`字的大小`（三級：A A A）、`白天／晚上`、`難易`（簡單／普通／深入＝`elementary/secondary/university`）、`切換到詳細版`。

### 技術方向（點樣先唔會改 11 次）

- **新外殼包住舊程式，唔改 11 個時代 App**：簡易版係 `<html data-ui="kid">`＋`src/kid/` 一套新元件；舊頁頭／時代列／滑桿用 CSS **視覺隱藏但保留喺 DOM**（年份橋要寫佢個滑桿；`display:none` 會令 `mobile_probe` 同捲動機制出事）。
- **年份橋**：把 `BottomBar.tsx` 入面已經證實有效嘅 `useYearPush`／`useTimelineYear` 抽出成 `src/lib/timelineBridge.ts`，畀時光列用。
- **故事資料轉接**：Imperial pack（中國晉→共和國 10 個時代）同 DeepDive pack（日本 azuchi／edo 等＋四國 16 個時代）兩個家族用同一個 `useKidStories()` 轉接器；其餘自訂時代（三國、秦漢、周、平安、戰國、幕末、近代）第一版先用**舊側欄套簡易版皮**（大字、大頭像），第二版再逐個接轉接器。
- **模式狀態**：`?ui=kid|classic`＋`localStorage`；`mobile_probe`、`audit:mobile` 一律用 `?ui=classic` 跑（保護現有閘門口徑），簡易版有自己嘅探針。

## 裁定（使用者 2026-11-28）

1. **預設簡易版**：新訪客見時光機；⚙️ 一撳轉詳細版並記住；帶 `?e=`／`?y=` 嘅舊分享連結照舊入詳細版。
2. **唔做朗讀**：冇 🔊、冇 `speechSynthesis`。原則、行、驗收 id 都已刪走；之後要加要重新裁定。
3. **自繪 SVG 圖示**：唔用 emoji。圖示集由雲端層第 0 期畫好（`src/kid/icons.tsx`），代理只准 `<Icon name="…">` 引用，唔准自己畫 path。
4. **`ui` 排程 `10 2,14` HKT**：第 0 期交付後先改 registry＋重貼，再請使用者 `sudo` 一次。

## 第 0 期：雲端層先交付（非 `☐` 行，代理唔領）

- 已交付：`scripts/audit_kid_ui.mjs`：`--require=<檢查 id>` 逐條斷言（唯讀、未做＝exit 1、做好＝exit 0、未知 id＝exit 2），下面每條 `☐` 行一個 id；連 `--teeth`（每個 id 注入一種破壞要咬到）同 `--list`。靜態讀 `src/kid/*.tsx`＋`src/kid/kid.css`（沿用 `audit_mobile_css.mjs` 嘅 CSS 解析與 `var()` 展開），CI 冇 Chrome 都跑得。
- 已交付：`scripts/kid_probe.mjs`：真瀏覽器（390／768／1440）跑 T1–T5 數點擊次數、量每個目標實際 px、橫向溢出；**冇 Chrome 時 exit 3（唔准 SKIP 當綠）**；唔入工作單驗收欄（CI 冇 Chrome），只做雲端合併前覆核。
- 已交付：`src/lib/timelineBridge.ts`：由 `BottomBar.tsx` 抽出 `useYearPush`／`useTimelineYear`，加 `useEraRange()`（讀當前滑桿 min/max）；`BottomBar` 改用佢，行為不變。
- 已交付：`src/kid/icons.tsx`：自繪 SVG 圖示集（`home` `back` `prev` `next` `play` `stop` `story` `people` `map` `settings` `sun` `moon` `text-size` `hand`），統一 24×24 viewBox、`currentColor`、`stroke-width` 2.5、圓角端點；`<Icon name size>` 一個出口，`aria-hidden`（文字標籤另外寫）；`--list` 自測每個名都畫到。
- 已交付：`src/kid/uiMode.ts`（模式讀寫＋`data-ui` 屬性；預設 kid，URL 帶 `e`／`y` 而未存過偏好＝classic）、`src/kid/strings.ts`（全部簡易版字串，下面行入面嘅字照抄）、`src/kid/kid.css`（設計 token：`--kid-tap:64px`、`--kid-font:22px`、`--kid-year:40px`、間距、圓角）、`src/kid/KidShell.tsx`（三屏路由骨架，每屏一個空插槽）。
- 已交付：`src/kid/useKidStories.ts`：Imperial＋DeepDive 兩家族轉接器，回傳 `{year, title, text(按程度), portrait?, id}[]`；附自測。
- 已交付：`docs/agents/ui.md` 改「速查」：先領本檔（`plan --track=ui`），舊 `ui_queue` 佇列停用；重建 `historyfirst-wt-ui` worktree；`mobile_probe` 開工收工照跑（`?ui=classic`）。
- 已交付：本檔每條行嘅驗收先喺骨架上跑一次證明係**紅**，再解除上面 ⛔。（2026-11-28：25 條全部 exit 1；`--teeth` 25 條 352 次破壞全咬，已入 gate-ci `audit:kid-ui:teeth`。）

第 0 期交付時嘅兩個偏差（雲端層決定，記低免得代理照舊文做）：

- `uiMode.ts` 加咗 `KID_IS_DEFAULT = false`：裁定 1「預設簡易版」**收口覆核通過先開**，未完成之前新訪客仍見詳細版，只有 `?ui=kid` 或「切換到簡易版」先入簡易版——半成品唔可以直接見讀者。
- 故事資料拆成 `src/kid/stories.ts`（純函式：`storiesFrom`／`peopleFrom`／`storiesAt`／`prevStoryYear`／`nextStoryYear`）＋`src/kid/useKidStories.ts`（按時代動態載入 pack）；未接轉接器嘅時代 `status: 'unsupported'`，由 `KidShell` 設 `data-kid-legacy` 保留舊側欄。

## 第 1 期：三屏骨架（代理）

每行只改一個檔；字串一律由 `src/kid/strings.ts` import，**唔准喺元件內寫死中文**（`strings` 行除外）。

☑ src/kid/KidHome.tsx｜第①屏「選國家」：標題 `<h1 className="kid-title">{S.pickCountry}</h1>`；`<div className="kid-home__grid">` 內 `TOPIC_META.map` 出 6 張卡 `<button type="button" data-kid="topic" data-topic={t.id}>`，卡內 `<PersonPortrait size="lg" src={TOPIC_FACE[t.id]} name={t.label} />`＋`<span>{t.label}</span>`；點卡＝`setTopic(t.id)` 再 `props.onPick()`｜驗收=node scripts/audit_kid_ui.mjs --require=home
☑ src/kid/kid.css｜`[data-kid=topic]` 卡：`min-height`／`min-width` 用 `var(--kid-tap)`、`font-size: var(--kid-font)`；`.kid-home__grid` 用 `display: grid`＋`grid-template-columns: repeat(2, 1fr)`，`@media (min-width: 1025px)` 改 `repeat(3, 1fr)`｜驗收=node scripts/audit_kid_ui.mjs --require=home-size
☐ src/kid/EraRiver.tsx｜第②屏「時間河」：標題 `<h1 className="kid-title">{S.pickEra}</h1>`；`<div className="kid-river">` 內 `eraSlotsForTopic(topic).map` 出 `<button type="button" data-kid="era" data-era={slot.id} aria-current={slot.id === activeEra ? 'true' : undefined}>`；有 `ERA_FACE[slot.id]` 就 `<PersonPortrait size="lg">`，冇就 `<span className="kid-river__stamp">{Array.from(slot.label)[0]}</span>`；再 `<span className="kid-river__name">{slot.label}</span>`；點＝`setEraForTopic(topic, slot.id)` 再 `props.onPick()`；目前時代用 ref＋`scrollIntoView({ block: 'center', inline: 'center' })`｜驗收=node scripts/audit_kid_ui.mjs --require=era-river
☐ src/kid/kid.css｜`[data-kid=era]` `min-height`／`min-width` 用 `var(--kid-tap)`；`.kid-river` `display: flex; flex-direction: column`，`@media (min-width: 1025px)` 改 `flex-direction: row; overflow-x: auto; scroll-snap-type: x mandatory`；`[data-kid=era][aria-current=true]` `outline: 4px solid var(--accent)`（外框闊 ≥ 3px，唔可以只靠顏色）｜驗收=node scripts/audit_kid_ui.mjs --require=era-river-size
☐ src/kid/TimeDock.tsx｜時光列 `<nav className="kid-dock">`：`const { year, min, max, step, playing, play, stop } = useEraYear()`（由 `../lib/timelineBridge` import）；上一年 `<button aria-label={S.prevYear} disabled={…} onClick={() => step(-1)}><Icon name="prev" /></button>`；年份 `<output className="kid-dock__year" aria-live="polite">{S.yearNumber(year)}<small>{S.yearUnit}</small></output>`；下一年同款（`S.nextYear`、`<Icon name="next">`、`step(1)`）；兩粒箭咀到頭到尾都要 `disabled`；播放掣 `playing ? stop : play`，圖示 `stop`／`play`＋字 `S.stop`／`S.play`｜驗收=node scripts/audit_kid_ui.mjs --require=time-dock
☐ src/kid/kid.css｜`.kid-dock` `position: fixed; bottom: 0; padding-bottom: env(safe-area-inset-bottom)`；`.kid-dock button` `min-height`／`min-width` 用 `var(--kid-tap)`；`.kid-dock__year` `font-size: var(--kid-year)`；`@media (min-width: 1025px)` 下 `.kid-dock` `max-width: 720px`（置中）｜驗收=node scripts/audit_kid_ui.mjs --require=time-dock-size
☐ src/kid/KidTabs.tsx｜`<div className="kid-tabs" role="tablist">`；`const TABS = [{ id: 'story', label: S.tabStory }, { id: 'people', label: S.tabPeople }, { id: 'map', label: S.tabMap }] as const`；每個 `<button type="button" role="tab" aria-selected={props.value === t.id} onClick={() => props.onChange(t.id)}><Icon name={t.id} /><span>{t.label}</span></button>`（地圖全屏由 `KidShell` 處理，本檔唔使理）｜驗收=node scripts/audit_kid_ui.mjs --require=tabs
☐ src/kid/kid.css｜`.kid-tabs` `display: grid`（或 flex）；`.kid-tabs [role="tab"]` `min-height: var(--kid-tap)`、`font-size: var(--kid-font)`｜驗收=node scripts/audit_kid_ui.mjs --require=tabs-size
☐ src/kid/NavCorner.tsx｜`<nav className="kid-nav">`：回首頁 `<button type="button" onClick={props.onHome}><Icon name="home" /><span>{S.home}</span></button>`；`{props.showBack ? (<button … onClick={props.onBack}><Icon name="back" /><span>{S.back}</span></button>) : null}`（回首頁永遠排第一，位置不變）｜驗收=node scripts/audit_kid_ui.mjs --require=nav-escape
☐ src/kid/kid.css｜`.kid-nav` `display: flex`；`.kid-nav button` `min-height`／`min-width` 用 `var(--kid-tap)`｜驗收=node scripts/audit_kid_ui.mjs --require=nav-size
☐ src/App.tsx｜`App()` 加 `import { KidShell } from './kid/KidShell'`、`import { useUiMode } from './kid/uiMode'`；`const mode = useUiMode()`，把 `<TopicRoot />` 改成 `{mode === 'kid' ? <KidShell><TopicRoot /></KidShell> : <TopicRoot />}`，其餘（`UrlBridge`、`PortraitGallery`、`BottomBar`）不動｜驗收=node scripts/audit_kid_ui.mjs --require=wiring
☐ src/kid/kid.css｜簡易版下視覺隱藏舊介面：`[data-ui="kid"] .app-header`、`.era-bar`、`.year-scrubber`、`.bottom-bar`、`.map-layer-bar` 每個都要 `position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%)`，**唔准 `display: none`**｜驗收=node scripts/audit_kid_ui.mjs --require=chrome-hidden

## 第 2 期：故事與人物（代理）

☐ src/kid/StoryCard.tsx｜`<article className="kid-story">`：`const { stories } = useKidStories()`、`const { year, setYear } = useEraYear()`、`storiesAt(stories, year)` 取當年第一件；顯示 `<h2>{story.title}</h2>`、有 `story.portrait` 就 `<PersonPortrait size="lg">`、`<p>{story.text}</p>`；底部 `prevStoryYear(stories, year)`／`nextStoryYear(stories, year)` 兩粒掣（`<Icon name="prev" />{S.prevStory}`、`{S.nextStory}<Icon name="next" />`），點＝`setYear(…)`｜驗收=node scripts/audit_kid_ui.mjs --require=story-card
☐ src/kid/StoryCard.tsx｜空年：當年冇事件時改顯示 `<div className="kid-story__empty"><p>{S.noStory}</p>`＋大掣 `{S.nextStory}`，點＝`setYear(nextStoryYear(stories, year))`（跳去下一個有事件嘅年份，唔係 +1；冇下一個就 `disabled`）｜驗收=node scripts/audit_kid_ui.mjs --require=empty-state
☐ src/kid/PeopleGrid.tsx｜`<section className="kid-people">`：`const { people } = useKidStories()`；冇人時 `<p>{S.noPeople}</p>`；`<div className="kid-people__grid">` 內每人一粒 `<button type="button" aria-expanded={open === p.id}>`＋`<PersonPortrait size="lg" src={p.portrait} name={p.name} />`＋`<span>{p.name}</span>`；展開時多一句 `<p>{p.line}</p>`；再點收起（按鈕讀屏字用 `S.close`）｜驗收=node scripts/audit_kid_ui.mjs --require=people-grid
☐ src/kid/kid.css｜`.kid-story` `font-size: var(--kid-font); line-height: 1.6`；`.kid-story p` `max-width: 32em`；`.kid-story button` `min-height: var(--kid-tap)`；`.kid-story .person-portrait` `width`／`height` ≥ 96px｜驗收=node scripts/audit_kid_ui.mjs --require=story-size
☐ src/kid/kid.css｜`.kid-people__grid` `display: grid; grid-template-columns: repeat(3, 1fr)`，`@media (min-width: 1025px)` 改 `repeat(5, 1fr)`；`.kid-people button` `min-height: var(--kid-tap); font-size: var(--kid-font)`；`.kid-people .person-portrait` `width`／`height` ≥ 96px｜驗收=node scripts/audit_kid_ui.mjs --require=people-size
☐ src/kid/kid.css｜未接轉接器嘅時代（三國／秦漢／周／平安／戰國／幕末／近代）：`[data-ui="kid"] .timeline-item`、`[data-ui="kid"] .person-card`、`[data-ui="kid"] .people-card` 各自 `font-size: var(--kid-font)`｜驗收=node scripts/audit_kid_ui.mjs --require=legacy-skin

## 第 3 期：設定、引導、鍵盤（代理）

☐ src/kid/KidSettings.tsx｜`<div className="kid-settings">`：開合掣 `<button type="button" aria-expanded={open}><Icon name="settings" /><span>{S.settings}</span></button>`；展開後：`S.fontSize` 三粒（`setFontStep` 對應 `FONT_STEPS` 第 1／3／4 級，`<Icon name="text-size" />`＋`S.fontSmall／S.fontMid／S.fontBig`）、`S.dayNight` 兩粒（`setTheme`，`<Icon name="sun" />{S.day}`／`<Icon name="moon" />{S.night}`）、`S.level` 三粒（`setLevel('elementary'／'secondary'／'university')`＝`S.levelEasy／S.levelMid／S.levelDeep`）；目前選項 `aria-pressed`；最後 `setUiMode('classic')`＝`{S.toClassic}`；setter 全部用 `readingPrefs` 現有嘅｜驗收=node scripts/audit_kid_ui.mjs --require=settings
☐ src/kid/kid.css｜`.kid-settings button` `min-height`／`min-width` 用 `var(--kid-tap)`、`font-size: var(--kid-font)`；`.kid-settings [aria-pressed="true"]` `outline: 4px solid var(--accent)`｜驗收=node scripts/audit_kid_ui.mjs --require=settings-size
☐ src/components/BottomBar.tsx｜詳細版底欄加一粒 `切換到簡易版`：`import { setUiMode } from '../kid/uiMode'`，`onClick={() => setUiMode('kid')}`，其他唔郁｜驗收=node scripts/audit_kid_ui.mjs --require=to-kid
☐ src/kid/Breadcrumb.tsx｜`<ol className="kid-crumbs" aria-label={S.stepOf(props.step, S.steps.length)}>`；`S.steps.map((label, i) => <li aria-current={i + 1 === props.step ? 'step' : undefined} data-done={i + 1 <= props.step ? '' : undefined}>{label}</li>)`｜驗收=node scripts/audit_kid_ui.mjs --require=breadcrumb
☐ src/kid/FirstVisit.tsx｜第一次入站：`localStorage.getItem('hf.kid.seen')` 讀；`props.dismissed` 變真時 `localStorage.setItem('hf.kid.seen', '1')` 並收起；未見過就顯示 `<p className="kid-hint"><Icon name="hand" size={48} />{S.hintPick}</p>`；唔准彈窗（`role="dialog"`／`<dialog>`／`aria-modal` 都唔准）｜驗收=node scripts/audit_kid_ui.mjs --require=onboarding
☐ src/kid/TimeDock.tsx｜桌面鍵盤：`useEffect` 內 `window.addEventListener('keydown', onKey)`、清理時 `removeEventListener('keydown', onKey)`；`'ArrowLeft'`＝`step(-1)`、`'ArrowRight'`＝`step(1)`、`' '`＝播放／停，三個都 `e.preventDefault()`；焦點喺 `input, textarea, select` 或 `isContentEditable` 時直接 return｜驗收=node scripts/audit_kid_ui.mjs --require=keys
☐ src/kid/kid.css｜`@media (prefers-reduced-motion: reduce)` 內 `.kid-shell * { transition: none; animation: none; scroll-behavior: auto }`｜驗收=node scripts/audit_kid_ui.mjs --require=motion

## 收口（雲端層覆核，唔係代理行）

- `node scripts/kid_probe.mjs`：45 個時代 × 390／768／1440 全綠；T1–T5 點擊數都 ≤ 上限；所有目標實測 ≥ 64px（手機）。
- `node scripts/mobile_probe.mjs`（`?ui=classic`）失敗數唔多過開工；`npm run gates` 無惡化（`audit:mobile`、`audit:contrast`、`audit:chars` 尤其）。
- 真人測試：搵一個 4–6 歲小朋友做 T1–T5，錄低卡喺邊（呢個機器量唔到）。
- 通過後先決定：預設版本要唔要跟住改、`audit_kid_ui.mjs` 入唔入 `gate-ci`（零值進場）。

## 代理須知（`ui` 軌道）

1. 每輪 `node scripts/agent-queue.mjs plan --track=ui --todo=2`，**最多做 2 行**（介面行比內容行難，寧少勿錯）。
2. 只改行首點名嗰個檔；要多一個檔＝唔屬於你，記 `blocked`。
3. 字串只可以由 `src/kid/strings.ts` import、圖示只可以用 `<Icon name>`（唔准寫 `<svg>`／`<path>`、唔准用 emoji）；`src/` 入面一律正體書面語（唔准「嘅、唔、咗」），commit 前跑 `node scripts/agent-selfcheck.mjs --branch`。
4. 收工必跑：該行驗收、`npm run gates -- --only=audit:mobile`、`node scripts/mobile_probe.mjs --narrow --eras=tang,edo,kojoseon`（失敗數唔准增加）。
5. 唔准動：`src/lib/scrollRoot.ts`、`src/lib/useCollapseOnScroll.ts`、`src/lib/mapViewport.tsx`、`src/lib/timelineBridge.ts`（雲端層嘅）、任何 `*Pack.ts` 資料檔。
