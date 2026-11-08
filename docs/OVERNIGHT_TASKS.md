# 夜間工作單（實測核對版）

本檔取代 `OVERNIGHT_AGENT_TASKS.md`（2026-11-08 01:55 HKT 那份係睇 production bundle 寫嘅）。
以下每條都喺**本 repo 逐行核實**，並註明已修／未修／需 KK 決定。

## 一、已修（本輪 merged）

| 項目 | 核實結果 | 處理 | PR |
|---|---|---|---|
| 208 關中=曹魏 | 屬實 | 改「馬超／韓遂」（〈武帝紀〉建安十六年反於潼關；〈馬騰傳〉初平中據涼州） | #56 |
| 冇 211 快照 | 屬實（key 只有 184/190/200/208/215/219/222/234/249/263/265/280） | 新增 211：關中入曹、涼州仍在諸將 | #56 |
| 208 荊州南=劉表 | 屬實（劉表卒於 208 年七月） | 改「其他」＋註明年底四郡在劉備、國號在後 | #56 |
| 人物 蜀漢 from 184 | 屬實，而且**四家都錯**（曹操從未稱帝卻標曹魏自 184） | 23 人對齐 registry `activeFrom`，補「東漢」前置段 | #56 |
| 曹丕「篡漢」標題 | 屬實（`timeline.json:229`） | 改「受禪代漢」；大學層保留「篡係立場詞」嘅論述 | #56 |
| 夷陵「報仇」 | 屬實（desc＋小學生層＋detail） | 改荊州失陷與名分（〈陸遜傳〉〈先主傳〉）；大學層對該說法嘅批評保留 | #56 |

驗證方式：預覽瀏覽器讀圖例（`?y=208` → 馬超／韓遂 · 關中、涼州；`?y=211` → 曹魏 · …關中 ＋ 馬超／韓遂 · 涼州），並喺重新建置後嘅 bundle grep 兩句措辭。

## 二、需 KK 決定（我冇自己決定）

1. **加唔加「劉備」個人勢力標籤**。registry 得 15 個勢力，冇「劉備／曹操／孫權」個人標籤；所以 208 荊南只能用「其他」。夜間清單嘅 HF-03／HF-18 建議改用個人標籤，方向正確，但新增勢力要喺 `factionSituation.ts` 補人口／戰力／糧食出處——**我唔會編數字**。批准后先做。
2. **208 赤壁事件 chips** 目前是 `['曹魏','孫吳','蜀漢']`：蜀漢喺 208 屬年號誤置；冇個人標籤之前我唔想改成得兩方（會令劉備喺呢場消失）。跟 1 一齊決定。
3. **`ChinaHistoryApp`**：佢由始至终**冇喺本 repo 被刪過**（`audit-wiring.ts` 註釋寫「2026-11-01 已刪」屬文件漂移／另一個 repo），而且 **#31 曾往 `src/chinaHistory/data` 加 110 行**使用者永遠睇唔到嘅 timeline／people。17 個中國時代槽都已有自己嘅 app，故建議刪除（資料留檔 `docs/reference/`），而唔係掛路由。

## 三、未做（照約定次序）

- 幕末搬入共用殼層（仲要將 22 個舊國嘅藩級圖層一併搬入先唔會降質）
- 第 8 項：入侵／反擊路線喺新 territory 基底上嘅核對（已列為地圖排程常駐任務）
- 審計閘入 CI：`audit:quotes` 57 error／`audit:wiring` 8 fail／`audit:ranges` 19 fail／`audit:chengyu` 18 fail — 刻意等排程 agent 收斂後以 `--fail-on-gap` 一次收緊

## 四、四條排程 agent（全部已指向本 repo）

| Agent | 工作區（branch） | 閘門起點 |
|---|---|---|
| 事件三段深度加厚 | 主 checkout（content/event-depth） | `audit:event-depth` 782 段／578 缺口 |
| 引文可核性 | `3kingdoms-wt-quotes` | `audit:quotes` 錯誤 57／未查證 166 |
| 地圖精度 | `3kingdoms-wt-map` | `audit:map` 0 fail／`audit:ranges` 19 fail |
| 中日成語 | `3kingdoms-wt-chengyu` | `audit:chengyu` 44 條／18 fail |

檔案擁有權已分開（敘事文字／出處字串／幾何與路線／成語各自一檔區），每個 agent 都有「`git status` 唔乾淨就停止」防呆，node_modules 已改實體 hardlink，唔再共用 vite 快取。

**舊有兩條指向离線 repo（`/Documents/my-project`，0 remote）嘅排程保持停用**：佢哋叫 agent 行 `npm run verify`、讀 `docs/PROGRESS.md`／`TONIGHT.md`——呢啲喺本 repo 全部唔存在，所以就算 enable 都只会喺第 2 步失敗。

## 簡體字偵測表合併（機械性但範圍廣，適合排程 agent）

全 repo 有 5 份簡體字／日本新字偵測表的複製，內容已漂移：

| 檔案 | 位置 | 形態 |
|---|---|---|
| `scripts/audit-chars.ts` | `SIMPLIFIED_MAP` | 字→正字對應表（最完整） |
| `scripts/audit-data.ts` | 第 51 行 | 字元集 regex |
| `scripts/audit_chengyu.mjs` | 第 26 行 | 字元集 regex（**缺 `战/观/舰`**） |
| `scripts/audit_quotes.mjs` | 同上 | 字元集 regex |
| `scripts/audit_entries.mjs` | 第 225 行 `HAN_SRC` | 字元串 |

已確認漂移：`audit_chengyu.mjs` 那份缺少後來補進 `audit-data` 的 `战/观/舰`，
也就是成語閘門抓不到簡體「战」。這是同一邏輯多份實作的必然結果。

**做法**：新增 `scripts/lib/simplified-chars.mjs`，以 `audit-chars.ts` 的字→正字
對應表為唯一來源，另外匯出由鍵推導的正規式與字元串；其餘 4 檔改為匯入。
**驗證要求**（缺一即算未完成）：
1. 合併前後對同一組固定樣本（至少含 `战/观/舰/条/関/実/徳` 各一）逐檔比對
   命中結果，必須只允許「原本漏抓、現在抓到」的方向，不得出現原本抓到而遺失。
2. `npm run gates` 全部指標不得上升。
3. 合併後把 `audit-chars.ts` 的預設掃描範圍擴大為 `['src','scripts']`，
   並把豁免清單收斂到只剩該表模組一檔；`scripts/` 內的註釋錯字必須修掉
   （本輪已知 `audit_entries.mjs:16 每个`、`:76 括号`、`gate-ci.mjs` 舊有「本轮」已修）。

---

## 2026-11-08 主線交辦（所有內容 agent 適讀）

### 一、Exa 語意搜尋已經可用（查證用，唔使自己 curl）

金鑰原本只在 `~/.zshrc` 第 17 行（只有互動式 zsh 才會 source），而排程 agent 與
本機腳本都跑在 `/bin/bash -c` 這種非互動 shell，所以 `process.env.EXA_API_KEY`
一直是空——`node scripts/exa.mjs` 因此回報「找不到 EXA_API_KEY」。
現已在 repo 根建立 `.env`（已被 `.gitignore` 第 54 行排除，**絕不可提交**），
腳本會自動讀取，實測可正常搜尋。

用法（在本機跑，腳本在任何情況下都不印出金鑰）：

    node scripts/exa.mjs search "文治の勅許 吾妻鏡 守護地頭" --num 5
    node scripts/exa.mjs search "關原 石田三成 兵力 爭議" --category "research paper"
    node scripts/exa.mjs contents <上一步回傳的 id>
    node scripts/exa.mjs similar <某個可靠頁面的 URL>

使用紀律（用錯會反害自己）：
- Exa 回傳的是**二手網頁**，不是第一手史料。它的價值在於「一手引文在哪裡」與
  「學界哪裡有爭議」；引文仍要回到原典或 `scripts/qsrc.py` 逐字核對才能標「已查證」。
- 實測一例：查「文治元年 守護 地頭」可直接取到《吾妻鏡》文治元年十一月廿八日條的
  逐字原文（「廿八日丁未、諸国平均に守護地頭を補任し、権門勢家の庄公を論ぜず、
  兵粮米段別五升を宛て課すべきの由、今夜、北条殿、藤中納言経房卿に謁し申すと云々」），
  同時取到石母田正「一國地頭職」說與川合康的反對意見——正是規則要求的「有爭議寫爭議」。
- `scripts/check_bundle_secrets.mjs` 會掃建置產物的金鑰外形，已納入 CI。
  **絕對不要**使用 `VITE_` 前綴或在 `src/` 任何位置引用金鑰，那是公開洩漏。

### 二、海陸判定只有一個來源：`ASIA_LAND`（在 `src/geo/asiaWarBase.ts`）

主線已合併 PR #75：`scripts/audit_map_accuracy.mjs` 的海陸判定改用地理參考的
`ASIA_LAND`（Natural Earth 1:50m 海岸線），遼東灣 5 條路線的假陽性因此消除。

**不准再手動修改 `src/geo/landMask.ts` 的海岸線來遷就閘門。** 原因：
`landMask.ts` 是**執行時**檔案，被 `src/geo/elevation.ts` 與
`src/lib/mergeFactionPolygons.ts` 使用；改動它等於改變地圖上勢力多邊形被裁剪的
結果，是把示意遮罩當地理資料用。

已發現一處此類未提交的改動（工作區 `3kingdoms-wt-map`，9 個檔案、+247/−39），
整份已存成 `/tmp/map-agent-salvage.patch`（524 行），不會遺失。其中**真正有價值的是
新增的東北亞錨點群**（渤海海峽、遼東灣中央、大遼河口外、鴨綠江口外、朝鮮灣口、
黃海北部、日本海束草外海、珍島海峽外，以及對應的陸側點）——錨點越多，閘門越難被
蒙混過關，這是要保留的方向。正確的回收步驟：

1. **只取錨點**，加入 `scripts/audit_map_accuracy.mjs` 的 `ANCHORS`；
2. `ANCHORS` 一律由 `ASIA_LAND` 判海陸，**不要**動 `landMask.ts`；
3. 提交前跑 `npm run audit:geo` 與 `npm run audit:map`，確認新錨點在 `ASIA_LAND`
   下全部通過，回報時貼出前後數字。

### 三、簡體字偵測表合併（規格見本檔上一節）

這件事做完之前，不要試圖把 `audit-chars.ts` 的預設掃描範圍擴大到 `scripts/`——
那需要按名字豁免 5 個自帶偵測表的檔案，等於把洞偽裝成閘門。
在此期間 `scripts/` 內的註釋錯字無人擋得住：本輪主線自己就寫錯過 5 次簡體字形
（見本輪 commit 紀錄與 PR #76 說明），全部靠臨時把掃描範圍擴充到 `.css` 與 `.mjs` 才抓到。

