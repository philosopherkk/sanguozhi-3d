---
name: hf-country
description: Create or expand non-China/Japan country era packs (korea, thailand, vietnam, malaysia) on top of DeepDiveApp + JapanDeepDivePack + asiaWarBase.ts with minimal token usage. Use when adding a new country pack or growing an existing one.
---

# hf-country｜非中日國家時代包（korea／thailand／vietnam／malaysia）技能

本技能建立在 `DeepDiveApp` + `JapanDeepDivePack` + `src/geo/asiaWarBase.ts` 之上，
新增或擴展 `korea`、`thailand`、`vietnam`、`malaysia` 四國時代包。
核心原則是「省 token」：只讀需要的行、單檔快驗、絕不整檔讀。

## 一、省 token 硬規
1. 絕不整檔讀 pack。定位一律先 `grep -n "<id>" <檔>`，只讀目標前後約 35 行。
2. 參考欄位名稱時只讀 `.agents/skills/hf-enrich/SKILL.md` 前 35 行、`src/japanEras/packs/asukaPack.ts` 前 60 行，不要讀更多。
3. 長日誌一律導向 `/tmp/*.log`，只看結尾：`... > /tmp/x.log 2>&1; echo exit=$?; tail -n 15 /tmp/x.log`。
4. 迭代期間不要用 `npm run gates`（太慢、輸出太長）。改用單檔快驗：`node scripts/country_check.mjs <packFile>`，一次跑完字級、對比、深度、三層、路由與領域名檢查，輸出不超過 15 行。交付前才由 `hf-gate-commit` 跑完整閘門。

## 二、識別碼（era id）
1. era id 只准小寫字母 `[a-z]+`，不得底線或數字（`audit-wiring.ts` 以 `/[a-z]+/` 匹配，混入其他字元即斷線）。例：`korea`、`thailand`、`vietnam`、`malaysia`。
2. `domains` 與 `territoryByYear` 內的領域名 id 必須全包唯一，以「國名＋時代」為前綴，例：`ko_goguryeo`、`th_ayutthaya`、`vn_daiViet`、`my_melaka`。跨包重複會串色。

## 三、底圖與地圖
1. 底圖由 `../../geo/asiaWarBase` 匯入 `asiaPx, ASIA_LAND, ASIA_GRATICULE`。
2. 定義投影助手 `const P = (lo, la) => asiaPx(lo, la)`，行軍點與領域名座標一律經 `P`，不得手填畫布像素。
3. `mapBase` 須含 `view: { x, y, w, h }`（框住該國與周邊）與 `title`；陸塊用 `ASIA_LAND`、經緯線用 `ASIA_GRATICULE`。

## 四、色塊對比（淺色面板 #fefbf4）
1. 安全色盤（對 `#fefbf4` 皆 >= 3.2:1）：
   `#8b2635`（緋紅）、`#1e4d7b`（寶藍）、`#2f6b4f`（翠綠）、`#8a6d12`（赭金）、
   `#6b3a6a`（紫）、`#a14d28`（鏽橙）、`#2c7d73`（青）、`#5a4030`（赭褐）、
   `#4a5a8a`（靛藍）、`#7d4e2d`（古銅）。
2. 禁用淺色，例：`#c9a227`、`#C4A574`、`#b7c4d4`（在白面板上對比不足，淺色模式看不清）。
3. 每個 `color: '#xxxxxx'` 都要 >= 3.0:1；快驗腳本會逐個算。

## 五、深度與三層意譯（去空白計字）
1. `details[id]`：`causes >= 210`、`course >= 210`、`outcome >= 410`，三者各自附 `source`。
2. `readings[id]`：`elementary` 約 70–90 字、`secondary` 約 135–175 字（>= 1.5× elementary）、`university` 約 240–300 字（>= 3.0× elementary）；三層字串彼此不得重複（零重複）。
3. 三層用 `1 : 1.5 : 3` 遞進，小學層用短句淺白詞，不得與中學層雷同，不寫「影響深遠」等空話。
4. **這六個欄位一律單一字串字面量，絕不用 `'…' + '…'` 串接**：`causes`、`course`、`outcome`、`elementary`、`secondary`、`university` 各自必須是一整段不中斷的 `'…'`（照 `src/japanEras/packs/asukaPack.ts` 的寫法，一行寫完）。原因：`audit_event_depth.mjs` 與 `audit_reading_layers.mjs` 只讀第一個字串字面量，一旦串接，第二片之後全部不入閘門計數，深度與三層比例會被當缺失報 `缺口`／`分層不合格`。`source` 欄不受此限，仍可串接。

## 六、史源與準確
1. 全文一律正體中文書面語；不得簡體字、不得粵語口語虛詞（口語助詞一律不用，以 `scripts/audit-chars.ts` 的 CANTONESE 表為準）。
2. 只有在 `scripts/qsrc.py`（中文 `zh.wikisource.org`、日本 `ja.wikisource.org`）查到可逐字比對的原文，才准逐字引用。查不到時，`source` 一律寫 `'通說整理，非逐字引文'`，或「一手編年名＋（通說整理，非逐字引文）」，並在 `note` 解釋原因。**絕不偽造逐字引文**。
3. 涉及政權更迭或領土變更之事件標 `critical: true`；數字有分歧者標 `disputed: true` 並在 `note` 說明，不寫定數。

## 七、路由與領域名
1. 每條 `route` 的 `year` 必須對應同包內某個 `events` 的 `year`（否則報 `route-year-no-event`）。
2. `territoryByYear` 每個領域名 key 必須在 `domains` 的 id 之列（腳本只核對字面 id；匯入的 `*_DOMAINS` 自動略過）。

## 八、單檔快驗與交付
1. 每次編輯後跑：`node scripts/country_check.mjs <packFile> > /tmp/cc.log 2>&1; echo exit=$?; tail -n 15 /tmp/cc.log`。exit 0 才續做。
2. 六項全過再載入 `hf-gate-commit`，逐檔 `git add`（不得 `git add -A`），跑完整 `npm run gates` 全綠後才推播。

## 九、與現有排程技能銜接
`hf-country` 只管「包的存在與欄位齊全」；內容深淺、引文真假、地圖幾何一律交給既有排程佇列，
**不要另起一套口徑**。統一入口是佇列腳本，一條指令就拿到四國的待辦：

```
node scripts/agent-queue.mjs country > /tmp/aq.log 2>&1; echo exit=$?; tail -n 40 /tmp/aq.log
node scripts/agent-queue.mjs country --country=vietnam   # 只做一國
```

16 包全過 `country_check` 時，本技能的工作即屬閉幕，改做下表；未過時先修問題行再回佇列。

| 做什麼 | 載入 | 省 token 的快驗（只跑相關閘門） |
| --- | --- | --- |
| 補關鍵事變缺口／未標卡 | `hf-critical` | `node scripts/audit_critical.mjs`，再 `npm run gates -- --only=audit:event-depth` |
| 補三層意譯與起因／經過／結果 | `hf-enrich` | `npm run gates -- --only=audit:event-depth` |
| 引文、年份、維基連結查證 | `hf-accuracy` | `npm run gates -- --only=audit:quotes` |
| 版圖鍵幾何與色塊（亞洲戰區畫布） | `hf-map` | `npm run gates -- --only=audit:map` |
| 行軍線端點與關鍵年路線 | `hf-march` | `npm run gates -- --only=audit:map` |
| 收工（逐檔 add＋全量閘門＋推播） | `hf-gate-commit` | 全量 `npm run gates`（不可 `--only`） |

⚠ `--only=` 只認 `gate-ci.mjs` 裡真實存在的閘門名：`audit:critical` **不是**閘門，
盤點器要直接跑 `node scripts/audit_critical.mjs`（寫 `--only=audit:critical` 只會得到「找不到符合」。

四國已被這四條佇列自然覆蓋，不必新寫統計腳本：`audit:critical` 已登記四國 16 槽；
`audit:event-depth` 可用 `--only src/countries` 縮小掃描（注意 `--only` 只認空格，
寫 `--only=src/countries` 會靜默掃整個 `src`）；`audit:quotes` 與 `audit:ranges` 走全 `src`／
目錄掃描，新增 `*Pack.ts` 自動入閘；`audit:map` 已把 `src/countries/**` 當亞洲戰區畫布，
版圖鍵缺幾何即報 `territory-id-off-canvas`。

順序即省 token 的順序：`country_check`（秒級、≤15 行）→ 對應的單項 `--only=` 閘門 →
最後才由 `hf-gate-commit` 跑全量。迭代期間不跑全量 `npm run gates`。

