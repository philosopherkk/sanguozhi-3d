# 主線最終快照（更新 2026-11-09）

## ⚠ 維基死鏈佇列（23 條，交查證輪逐輪修）
`npm run audit:wiki-links` 已入 gates（基線 dead=23 unvalidated=0）。
**方法警告**：唔准再用 HTTP 狀態碼驗維基連結——`/zh-tw/<不存在標題>` 照回 200。
只有 MediaWiki API `action=query&redirects=1&titles=` 嘅 `missing` 先可信；
且 API 會簡繁轉換回應標題、會將底線正規化成空格（閘門內已處理，手動查證都要留意）。
已知變體標題：zh《大内政弘》（不作「內」）、zh《种子岛时尧》（簡體標題，ja 作《種子島時尭》）。
修法優先序：搵變體／異名條目 → 改連結＋note；真冇條目 → 移連結＋note「中日文維基皆無條目」。
主要集中：src/bakumatsu/data/history.ts、src/qinhan/data/timeline.ts、
src/zhou/data/earlyDynasty.ts、src/data/timelineDetails.ts。

## ⚠ 三層分層重寫佇列（新閘門 audit:reading-layers，基線 gap=134）
判準：三層唔准同文、長度遞增、大學 ≥3×、中學 ≥1.5×（逐條，非平均）。
已完成：edoPack 12（#94）、sengoku/readingLayers 13（#99）、modernJapanPack 20（#100）。
剩返 101 集中：qinhan/timeline 20、zhou/timeline 19、zhou/timelineMore 18、
zhou/earlyDynasty 17、zhou/earlyDynastyMore 14、studentEvents 10、data/readingLayers 3。
派工照收窄形態：單檔＋明確組別＋一輪做得切＋禁 scratch 腳本（run_00011 教訓：
准佢自寫工具就會 45 迭代零產出；禁咗之後 51 迭代 20 組全部過閘）。

## ⚠ 成語覆蓋佇列（新閘門 audit:chengyu-coverage，基線 空白世紀 10／薄弱 12／無 event 連結 47）
空白世紀：前700s 前500s 400s 500s 600s 1200s 1300s 1400s 1700s 2000s。
47 條成語全部只連 year／person、冇一條連 event——年表顯示唔到成語卡。
紀律：新成語一樣要有史料出處；查唔到出處嘅習語來源唔准掛假書名。

## ⚠ 疆域几何佇列（新閘門 audit:war-shape，基線 示意框 291／自我相交 24）
自我相交 24 個係破圖直接來源，優先修。示意框 291 個長遠要換真邊界（admin-0），
但古代郡界無公開精确幾何，換唔切嘅要在渲染或說明文字承認「示意」。
realm_prc_1949／1951 已用真實邊界（PR #87），做範本。

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

**舊有兩條指向離線 repo（`/Documents/my-project`，0 remote）嘅排程保持停用**：佢哋叫 agent 行 `npm run verify`、讀 `docs/PROGRESS.md`／`TONIGHT.md`——呢啲喺本 repo 全部唔存在，所以就算 enable 都只会喺第 2 步失敗。

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


---

## 2026-11-08（二）戰爭時代疆域重做（使用者點名：現代中國、二戰日本與侵佔區「很_BAD」）

### 已查明的根因（不是渲染問題，是資料生成方法問題）

`src/geo/asiaWarTerritory.ts` 由 `scripts/gen_asia_war_territory.mjs` 生成，方法是：
**把通說控制範圍寫成經緯度矩形，再與 Natural Earth 1:50m 陸地求交集**。
所以色塊的邊界必然是矩形的直線邊，只要矩形畫得粗，陸地上出現的就是粗胚。

實例（在 `gen_asia_war_territory.mjs` 的 `EXTENTS`）：

    ['manshu', '滿洲國', [[118.5, 127.5, 39.6, 53.4]], …]

一個矩形從 39.6°N 一路蓋到 53.4°N、118.5°E 蓋到 127.5°E，等於把內蒙古東部、
河北東北部與西伯利亞南部一併包進去。`mengjiang`（蒙疆）矩形
`[107.5, 118.5, 37.0, 43.0]` 更把**外蒙古**整塊包進去——蒙疆實際是察南、晉北與
**內**蒙古西部，不含外蒙古，這是事實層級的錯誤，不只是難看。

現代中國（`?c=china&e=prc`，1949）在 393×852 與 1440×900 截圖檢查後確認三個缺陷：
1. **外蒙古整塊被包進紅色色塊**（PRC 於 1949 年已承認蒙古人民共和國獨立，
   不應納入控制範圍；此點必須在 note 寫明依據與年份）。
2. 西界與北界是矩形直線邊，明顯超出實際國界。
3. 華東沿海有一處**破裂的多邊形**（截圖上是一個白色 V 形輪廓），
   屬 polygon-clipping 的输出退化或自我相交，不是設計。

### 撤回本節前面兩項指控：經測算不成立（2026-11-08 主線自我更正）

本節上文寫過「1949 年 PRC 色塊包含外蒙古」「蒙疆矩形把外蒙古整塊包進去」，
**兩句都係錯的**，來源是我目測截圖與讀錯座標元組順序，未做計算。現以
點在多邊形內測試推翻，紀錄如下，避免下一輪照錯的結論去改對的資料。

測法：`src/geo/eraRegions.ts` 的 `ERA_RINGS` 是像素環（1968×1567，對齊
china_edcp_relief），用 `scripts/tighten_land_borders.china_px(lat, lon, w, h)`
**（注意：緯度在前）** 把城市投影到同畫布，再對 `realm_prc_1949` 作 ray-casting。

`realm_prc_1949` 實測：烏蘭巴托(107.0,47.9)=False、科布多(91.6,48.0)=False、
賽爾山(102.5,46.0)=False；呼和浩特、北京、喀什、哈爾濱=True；拉薩=False，
而 `realm_prc_1951` 的拉薩=True、海口=True、烏蘭巴托仍 False。
結論：**現代中國的歸屬邏輯正確**——不含外蒙古、含內蒙/新疆/東北，
西藏以 1951、海南以 1951 分階段，與介面底部說明一致。

`mengjiang` 的元組是 `[西, 東, 南, 北] = [107.5, 118.5, 37.0, 43.0]`，
北界只有 43.0°N，因此只誤切到蒙古南緣一小條，並非涵蓋外蒙古。
`manshu` 北界 53.4°N 大致沿黑龍江/額爾古納，方向合理。

### 那麼「地圖很差」真正差在哪（可測量的部分）

1. **邊界是示意框與陸地的交集，內陸邊全是直線段**：`realm_*` 與 `ASIA_EXTENTS`
   都是矩形/多邊示意塊裁陸地的結果，所以現代中國的內陸邊不是真實國界形狀。
   這是使用者覺得「很 bad」的主因，屬幾何精度問題，不是歸屬錯誤。
2. **`mengjiang` 北界 43.0°N 誤切蒙古南緣**，應收到約 42.0°N 或以真實邊界取代。
3. **死碼與無效幾何**：`src/imperial/data/modernChina.ts` 沒有任何 import
   （`PRC_XINJIANG` 等全未被引用），而且 `PRC_XINJIANG` 第一環有
   `[146,755] → [771,877] → [777,790]` 這種跨越整個畫布再折返的跳點
   （自我相交的 bowtie）。留著只會讓下一輪誤以為那是現代中國的來源。
4. 華東沿海那個 V 形破裂多邊形的**所屬來源仍未定位**（本節上方的 DOM 溯源
   已確認 1949 的色塊本身是 `realm_prc_1949`，V 形是否來自同檔需再測）。

### 因此正確的動手順序

1. 先寫 `scripts/audit_war_shape.mjs`：環閉合、頂點數、自我相交、零面積、
   以及「共線長邊比例」= 示意框直邊偵測；對 `ERA_RINGS` 全部 108 個 key 與
   `ASIA_EXTENTS` 36 條出數，先只報不擋。
2. 刪或修 `modernChina.ts` 死碼（若保留，至少要修 bowtie 並在檔頭寫明未被引用）。
3. `mengjiang` 北界收到 42.0°N。
4. 現代政區改用 Natural Earth 1:50m admin-0（`scripts/.cache/countries-50m.json`）
   投影到同一畫布，取代示意框；這一步才是使用者看見的「變好」。
5. 每步前後都要有 hit-test（烏蘭巴托/呼和浩特/拉薩/海口/喀什/北京）確保
   **歸屬不退步**——本輪就是靠這組測點才擋住我差點改錯東西。

`scripts/gen_asia_war_territory.mjs` 嘅 `EXTENTS` 得 36 條，全部是日本本土／海外領土／
1931–1945 陸海佔領區，**冇任何 `chn`、`prc`、`minguo` 條目**；`src/imperial/data/`
下面亦搜唔到 territory/shapes/polygons 之類幾何欄位（`prcPack.ts` 只有敘事）。
所以 1949 年那塊紅色並非來自本檔，**接手時第一步必須先把來源定位清楚**，
不要照本節上面那段話直接去改 `gen_asia_war_territory.mjs`。

定位方法（可行且已驗證足夠）：在瀏覽器打開 `?c=china&e=prc&y=1949`，
用 devtools 找出那個 path 元素的 class 與所屬 SVG，再回到源碼按 class 名搜索；
或直接對 `ASIA_EXTENTS`、`jpDomains`、`eraMapRings`、`historicalBasemaps`、
各時代 pack 的 `factions`/`territoryControl` 逐一比對 id。定位之後把本節
的「根因／做法／閘門」套用到真正的那個來源上。

已核實的事實仍然成立：`asiaWarTerritory.ts` 這 36 個 extent **全部是矩形與陸地
的交集**，其中 `manshu`（118.5–127.5°E／39.6–53.4°N）與 `mengjiang`
（107.5–118.5°E／37.0–43.0°N）確實把外蒙古與西伯利亞南部包進去，蒙疆不含外蒙古
是史實，屬於可立即修正的資料錯誤。華東沿海那處破裂多邊形也確實存在於截圖中，
但其所屬資料檔同樣要先定位。

### 正確做法（有真數據可用，不准再手畫）

`scripts/.cache/countries-50m.json` 是 Natural Earth **1:50m 國家級 TopoJSON**
（`objects.countries` + `arcs` + `transform`），也就是有真實國界多邊形。

1. 新增解碼函式（TopoJSON 的 arcs 需要 delta 解码 + transform 縮放），
   取得 `CHN`(156)、`MNG`(496)、`USA`、`JPN`、`PRK`、`KOR` 等 admin-0 多邊形。
2. **1868 年以後的現代政區**（尤其 `prc`、`minguo`、`civilwar`、現代日本）
   一律改用真實 admin-0 多邊形作為色塊來源；矩形×陸地的方法只保留給
   「1931–1945 日軍佔領區／勢力範圍」這類**從來就沒有行政界可畫**的範圍，
   而且必須逐區細分，不准用一個大框。
3. 滿洲國、蒙疆、華北、華中等佔領區：改成「沿海城市與交通線控制」的表達，
   或依史實收斂矩形並在 `note` 寫明依據；外蒙古必須從 `mengjiang` 排除。
4. 修正色塊自我相交／退化：生成後對每個 ring 做有效性檢查。

### 必附閘門（先有閘門再改資料，否則下次一樣爛）

新增 `scripts/audit_war_shape.mjs`，對 `ASIA_EXTENTS` 逐條檢查並回報：
- **幾何有效性**：ring 閉合、頂點數 ≥4、無自我相交、非零面積、MultiPolygon 各部件 bbox 重疊率異常要報；
- **矩形直邊偵測**：外輪廓中「共線的長邊」超過閾值即判定仍為矩形粗胚（要能抓出目前全部現況）；
- **國家歸屬檢查**：色塊面積的重心若落在 `countries-50m` 中另一個國家內部，即報
  （這條會當場抓出現況的「蒙疆含外蒙古」與「PRC 含外蒙古」）；
- 自帶 `--selftest`：把已知缺陷（外蒙古誤含、自我相交 ring）注入記憶體，確認每條會報。

閘門先以「只報不擋」進 CI，資料修妥後轉為硬閘門並下調基線。
完成標準：現代中國色塊與 admin-0 邊界重合（截圖對照）、蒙疆不含外蒙古、
華東破裂多邊形消失、`audit:war-shape` 的幾何無效數歸零。

