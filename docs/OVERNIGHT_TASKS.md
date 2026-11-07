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
