# 史料查證報告（source-audit）

> 本檔由查證 agent 每輪**附加**，不覆蓋。查證不等於創作：凡查唔到者一律寫查唔到，並列入需人工判斷清單。

---

## 2026-11-09 08:32 HKT 輪（查證人：verify/source-audit）

基準 commit：`origin/main` = `ff75c8a`（#74）。工作區：`/Users/ka-kinpoon/Projects/3kingdoms-wt-verify`，開工前 `git status` 乾淨。

### 本輪範圍

最近 3 小時有 2 個內容 commit，逐個抽查其引文、出處、年份、人物、數字：

| commit | 時間 | 內容檔案 |
|---|---|---|
| `ff75c8a` #74 | 07:33 | `src/japanEras/packs/kamakuraPack.ts`、`azuchiPack.ts`（READINGS 9 條）、`territoryControl.ts` |
| `bbc5d3f` #89 | 06:39 | `src/heian/data/history.ts`（1156-hogen／1159-heiji／1180-ishibashi／1180-fuji） |

抽查條目 **13 條**（heian 4、km 5、az 4）＋9 條 zhwikiUrl＋4 條中文維基具名引用。

### 一、逐字引文查證（命令：`python3 scripts/qsrc.py --host ja.wikisource.org "吾妻鏡/第一" "<片段>"`）

| 條目 id | 原本寫法 | 查證命令（節錄） | 結果 | 本輪動作 |
|---|---|---|---|---|
| 1159-heiji | 「歎而送二十年春秋」，並註治承四年四月廿七日條、永曆元年三月十一日配流 | `qsrc.py --host ja.wikisource.org "吾妻鏡/第一" "歎而送二十年春秋"` | **可查證**：治承四年四月小廿七日壬申條「去永暦元年三月十一日。配当国之後。歎而送二十年春秋」，日子與卷次皆合 | 不動 |
| 1159-heiji | 「幽閉皇院，流罪公臣」「奪官授職，無功許賞」（以仁王令旨） | `… "幽閉"`／`… "奪官授職"` | **可查證**：同條令旨原文作「幽閉皇院。流罪公臣。…奪官授職。無功許賞。」原註已聲明「。」改中文逗號 | 不動 |
| 1180-ishibashi | 「入夜甚雨如沃」 | `… "甚雨如沃"` | **可查證**：治承四年八月小廿三日癸卯條「今日寅剋。武衛相率…三百騎。陣于相模国石橋山」，正文之三百騎同見 | 不動 |
| 1180-ishibashi | 「期明日者，三浦眾馳加，定難喪敗歟」 | `… "馳加"` | **可查證**（異文只係轉錄處理）：原文「期明日者。三浦衆馳加。定難喪敗歟之由」，眾／眾、句讀改動已在原註聲明 | 不動 |
| 1180-ishibashi | 「武衛始入御鎌倉御亭」（十月十五日入鎌倉） | `… "始入御"` | **可查證**：治承四年十月小十五日甲午條「武衛始入御鎌倉御亭。此間為景義奉行所令修理也」 | 不動 |
| 1180-fuji | 「不待天曙」（上總介忠清主張還洛後） | `… "不待天曙"` | **可查證**：「爰次将上総介忠清等相談云…速令帰洛…羽林已下任其詞。不待天曙。俄以帰洛畢」，順序與正文所述一致 | 不動 |
| 1180-fuji | 「引率二十萬騎精兵」（並注明係威勢之數） | `… "万騎"` | **可查證**：治承四年十月小十八日丁酉條「前武衛引率二十万騎精兵。越足柄給」 | 不動 |
| km-1185 | 「文治元年十一月廿八日丁未、補任諸國平均守護地頭…可宛課兵**糧**米…」，source 寫「zh.wikisource 吾妻鏡/卷005，已逐字核對」 | `python3 scripts/qsrc.py --host zh.wikisource.org 吾妻鏡/卷005 "守護地頭"`；`… "廿八日"` | **有異文（查得到的原文，但唔係逐字原樣）**：該卷作「文治元年(1185)十一月**大**廿八日丁未。補任諸國平均守護地頭。…可宛課兵**粮**米段別五升之由。」——本條省西曆括注、省月大小字「大」、粮→糧、「。」→「、」。文字本身確實存在，非虛構 | **降調＋加註**：source 改寫為「對轉錄本核對，非原卷字樣」並逐項列明改動 |

逐字引文小結：9 條宣稱 → **8 條完全對得上**、1 條（km-1185）文字屬實但有四處未聲明的轉錄整理。無一條係查唔到或編造。

### 二、日期、人物、數字斷言

| 條目 id | 原本寫法 | 查證命令 | 結果 | 動作 |
|---|---|---|---|---|
| 1180-fuji | 十月十六日條記維盛「率數萬騎已於十三日抵駿河國手越駅」 | `… "手越"` | **可查證**：「平氏大将軍小松少将惟盛朝臣率数万騎。去十三日到着于駿河国手越駅」 | 不動 |
| 1180-fuji | 九月廿二日條按「嘉承二年平正盛奉宣旨追討源義親」舊例賜御馬 | `… "嘉承"` | **可查證**：九月大廿二日辛未條全文相符（嘉承二年十二月十九日、因幡守正盛、追討対島守源義親、依件古例） | 不動 |
| 1180-fuji | 治承四年五月十六日條見池中納言賴盛為入道相國之使率精兵入八條御所 | `… "池中納言"` | **可查證**：五月大十六日丁卯條相符 | 不動 |
| km-1221 | 大學生層「順德上皇配土佐、後鳥羽上皇配隱岐、土御門上皇配土佐」 | `curl …api.php?action=query&prop=extracts&titles=順德天皇`；`…titles=土御門天皇` | **查證不通過**：中文維基「順德天皇」條作配**佐渡**；配土佐（後改阿波）者係土御門上皇；後鳥羽配隱岐則合 | **加註**（note 標明待人工改正文）；正文改寫屬創作範圍，本輪唔改 |
| az-1573 | 大學生層斷代三說「一五七三／一五八八／**一五九六**年義昭之死」 | `curl …prop=extracts&titles=足利義昭`；`curl ja.wiki?action=raw&title=足利義昭 \| grep 1597` | **查證不通過**：中文維基作 1597年10月9日、日本維基作慶長2年8月28日（同頁並記 1596 年尚出席伏見城惣礼）→ 1596 係錯年 | **修錯年**：一五九六 → 一五九七（該段有重複抄本，兩處一齊改，見第五節） |
| az-1573 | 「元龜四年七月」之紀年口徑 | `curl …titles=元龜`；`…titles=天正`；`ja.wiki?action=raw&title=元亀` | **部分可查證**：元龜「指1570年到1573年」、天正「1573年起、元亀之後」→ 同年改元可證；改元之**日**未查到可引用來源 | 加註只寫「是年改元天正，元龜四年即天正元年」，唔寫具體日子 |
### 三、負面聲稱（「查唔到」本身都要查）

| 條目 id | 原本寫法（聲稱查唔到） | 查證命令 | 結果 | 動作 |
|---|---|---|---|---|
| 1156-hogen | 《台記》《山槐記》《愚管抄》在 ja.wikisource 無可擷取之正文 | `qsrc.py --host ja.wikisource.org "台記" …`／`"山槐記"`／`"愚管抄"` | **屬實**：三頁皆「搵唔到頁」 | 不動（此即本輪要求嘅「寫明查唔到原因」之模範寫法） |
| 1156-hogen | 《吾妻鏡》不載保元本年 | `… "吾妻鏡/第一" "保元"` | **屬實**：第一卷只有兩處追溯性提及（「永保元年」與「去保元三年春之比」），無保元元年編年條文 | 不動 |
| km-1221 | 《吾妻鏡》承久三年條未取得可逐字比對之正文 | `curl "ja.wikisource.org/w/index.php?action=raw&title=吾妻鏡/第卅六(卅七、卅九、第四十二)"` | **屬實**：ja 站目錄雖列第卅六以后卷次，實際逐頁取 wikitext 全部 404（只有索引，無正文） | 不動 |
| km-1185 | 「現行『吾妻鏡』該日（文治元年十二月廿八日）條文缺載」 | `qsrc.py --host zh.wikisource.org 吾妻鏡/卷005 "廿八日"`；`… "一郡"` | **查證不通過**：該卷有「十二月大廿八日丁丑」條，但所記為甘繩邊土民事；補任諸國守護・地頭見「十一月大廿八日丁未」條；全卷無「一郡」二字 | **降調＋改正**：改為「該日所記為他事、『一國一郡』之語不出是卷」 |

### 四、連結與具名引用（命令：`curl -s -o /dev/null -w "%{http_code}"` ＋ Wikipedia API 覆核）

`src/heian/data/history.ts` 共 9 條 zhwikiUrl：保元之亂、平治之亂、石橋山之戰、富士川之戰、俱利伽羅峠之戰、宇治川之戰、一之谷之戰、屋島之戰、壇之浦之戰。
結果：**9/9 活**。其中「屋島之戰」「壇之浦之戰」首輪 curl 回 429（限流，非死鏈），改用 `action=query&prop=info` 覆核得 pageid 305224／305227 → 條目存在。

`azuchiPack.ts` 四條 event 的具名引用「中文維基『足利義昭』『本能寺之變』『小田原征伐』『關原之戰』」：API 查得 pageid 100101／107567／935744／100107，**四條都存在**，無死引用。

### 五、本輪修改清單（共 8 個條目、10 次編輯；全部屬允許嘅三類）

| # | 條目 | 類型 | 內容 |
|---|---|---|---|
| 1 | km-1185 | (b) 降調 | source 由「已逐字核對」改寫為「對轉錄本核對，非原卷字樣」，並列明省括注、省「大」、粮→糧、「。」→「、」四項整理 |
| 2 | km-1185 | (c)/(b) 改正 | 大學生層「該日條文缺載」→ 依卷005 實況改正（含十一月廿八日條出處與「全卷無一郡二字」） |
| 3 | km-1221 | (b) 加 disputed＋note | 十萬騎／三千餘町／地頭三千人不取定數；另記順德配地待覆核與承久改元口徑 |
| 4 | km-1274 | (b) 加 disputed＋note | 兵力、船數、返程損失三源相差數倍；《八幡愚童訓》屬軍記不作戰況記錄 |
| 5 | km-1281 | (b) 加 disputed＋note | 兩路兵力、溺死數、風災時日不取定數 |
| 6 | km-1333 | (b) 加 disputed＋note | 元弘／正慶／建武三口徑；《得宗專制》屬後世史學建構；死狀據軍記 |
| 7 | az-1573 | (c) 修錯年 | 一五九六 → 一五九七（該段有重複抄本，兩處同步改，避免自相矛盾） |
| 8 | az-1573 | (b) 加 disputed＋note | 斷代三說＋元龜／天正同年改元口徑 |
| 9 | az-1582 | (b) 加 disputed＋note | 動機四說並列、死狀與遺體無確證、六月二日／6月21日曆算口徑 |
| 10 | az-1600 | (b) 加 disputed＋note | 兵力、死傷、倒戈時刻不取定數；《關原軍記大成》《德川實紀》性質 |

加 disputed 嘅直接理由：呢 6 條嘅大學生層自己寫「本條不取定數，一律標 disputed」「故本條一律標 disputed」「本條因此標 disputed」，但 `EraEvent` 層面無 `disputed: true`（`EraReading` 型別根本無呢個欄位），即正文宣稱與資料欄位不一致。`EraEvent` 有 `disputed?: boolean` 與 `note?: string`，故補喺 event 層。
修連結數：**0**（無死鏈）。擴寫敘事：0。新增條目／成語：0。改地圖：0。改閘門門檻：0。`--update-baseline`：無跑。

## 六、查唔到／需人工判斷清單（本輪冇自己改，全部列出）

1. **`src/japanEras/packs/azuchiPack.ts:136`（az-1573 大學生層）整段重複**：同一段（「《室町幕府終焉》的年份本身就是史學爭點…理由就是其餘地區仍在原有的守護支配之下。」）喺同一欄出現**兩次**（字元 3387 與 3635，行 136），第二次只多插一句「另需放在更長的脈絡裡看…」。呢個由 `ff75c8a` 帶入。屬抄貼瑕疵，刪重複段屬創作範圍，故只記錄，俾人工刪除。可重現：`python3 - <<'PY' … print(s.count('一五九七年義昭之死')) PY` 或 `grep -o "《室町幕府終焉》的年份本身就是史學爭點" src/japanEras/packs/azuchiPack.ts | wc -l` → 2。注意 `audit:event-depth` 嘅灌水偵測只報咗 `src/imperial/data` 一條，**冇抓到呢段**。
2. **`kamakuraPack.ts:112`「順德上皇配土佐」應作配佐渡**（見第二節）。已喺 km-1221 加 note，正文未改。
3. **簡體／新字形逃過 `audit:chars`**——本體：`JP_LINE = /[\u3041-\u309f\u30a1-\u30ff]/`（`scripts/audit-chars.ts:93`）把「・」(U+30FB KATAKANA MIDDLE DOT) 當假名，只要一行有「・」就**整行跳過**。因此以下行入面嘅簡體字全部無被報（行號依 `ff75c8a` 落地後）：
   - `kamakuraPack.ts:100`：置諸**国**一郡、日本中世**开**始（本輪已改呢一句）、文書**传**世、幕藩制**体**、司法**这**条線、**从**此由鎌倉裁決
   - `kamakuraPack.ts:136`：**镰**倉末期、分進合**击**、**补**给期限
   - `azuchiPack.ts:148`：《與幕府**残**黨連動說》、**谁**能先控制近江、**继**承人
   - 既有（非本輪範圍）：`heian/data/history.ts:65`「摂**関****体**制前史」、`:150`「《陸**奥**話記》」
   另外 `开/传/继/残/万/争/镰/补` 亦唔喺 `audit-chars.ts` 嘅 `HARD` 表（`audit_quotes.mjs` 嘅 `SIMPLIFIED` 表亦只收咗 众、击 等少數）。可重現：`python3 /tmp/scan_skipped.py <檔案>`（腳本喺報告附錄）。改門檻／補字表屬閘門改動，本輪依照邊界**冇改**。
4. **azuchi 四條 event 只掛「中文維基『⋯』」作 source**：四條維基條目都存在（唔係死鏈），但把通史事件嘅唯一出處係維基，屬來源層級問題。呢個係全 repo 慣例（`中文維基「⋯」` 出現 55 次，例如 `sengoku/data/factionSituation.ts`），唔係本 commit 嘅個別缺失，本輪**冇逐條改**，交人工定方針。
5. **術語用《》而唔係書名**：pack 三層文大量用《守護》《地頭》《兩重權力》《神風》《天下静謐》等，《》喺本 repo 其他地方係書名號，容易俾讀者誤會係書名（例如「《文治元年十二月廿八日，置諸国一郡守護・地頭》」睇落似書名）。屬風格統一問題，未改。
6. `audit:quotes` 嘅「未查證 77」條目本輪未處理（範圍係最近 3 小時 commit，未輪到隨機抽樣）。

---

## 七、閘門前後對照（本輪全部唔准惡化 → 全部達標）

| 閘門 | 本輪前 | 本輪後 | 判定 |
|---|---|---|---|
| `audit:quotes` | 條目 1834｜有引文 273｜**錯誤 2**｜提醒 45｜已查證 115／未查證 77／意譯 78／引文已改 1 | 完全相同（錯誤 2，冇升） | ✓ |
| `audit:chars` | 硬傷 0（待判 258） | 硬傷 0（待判 258） | ✓ |
| `audit:detail-depth` | 詳情 41 條／缺口 0 | 41 條／缺口 0 | ✓ 冇回升 |
| `audit:event-depth` | 段落 782／缺口 274（起因 88／經過 127／結果 59）／日本三層未達 145／灌水嫌疑 1 段 | 相同 | ✓ 冇回升 |
| `npm run test` | — | test — 全部通過 | ✓ |
| `npm run build` | — | ✓ built（僅 chunk 大小警告） | ✓ |
| `npm run gates` | 基線 | 「gates — 無惡化（與基線一致或更好）」；`audit:chars hard=0(=)`、`quotes errors=2(=) warns=45(=)`、`event-depth gap=274(↓92) padding=1(=) jpGap=145(新)` | ✓ |

本輪抽查小計：抽查條目 **13**｜逐字引文完全可查證 **8**｜引文屬實但需降調 **1**｜斷言查證不通過 **2**（義昭卒年、順德配地）｜負面聲稱屬實 **3**｜降調／加註條目 **8**｜修連結 **0**（無死鏈）。

---

## 八、附錄：本輪用過嘅可重現命令

```sh
# 0) 工作區
git -C /Users/ka-kinpoon/Projects/3kingdoms/sanguozhi-3d worktree add -B verify/source-audit \
    /Users/ka-kinpoon/Projects/3kingdoms-wt-verify origin/main
cp -al /Users/ka-kinpoon/Projects/3kingdoms/sanguozhi-3d/node_modules /Users/ka-kinpoon/Projects/3kingdoms-wt-verify/

# 1) 範圍
git -C ... log --since="3 hours ago" --name-only --pretty=format:'%h|%ad|%s' --date=iso origin/main

# 2) 逐字引文（日本用 ja.wikisource）
python3 scripts/qsrc.py --host ja.wikisource.org "吾妻鏡/第一" "歎而送二十年春秋" -C 900
python3 scripts/qsrc.py --host ja.wikisource.org "吾妻鏡/第一" "幽閉" / "奪官授職" / "甚雨如沃" /
    "馳加" / "始入御" / "不待天曙" / "万騎" / "手越" / "嘉承" / "池中納言" / "保元"
python3 scripts/qsrc.py --host zh.wikisource.org 吾妻鏡/卷005 "守護地頭" -C 160
python3 scripts/qsrc.py --host zh.wikisource.org 吾妻鏡/卷005 "廿八日" -C 40
python3 scripts/qsrc.py --host zh.wikisource.org 吾妻鏡/卷005 "一郡"

# 3) 負面聲稱（無正文／只有索引）
python3 scripts/qsrc.py --host ja.wikisource.org "台記" "藤原"      # 搵唔到頁
python3 scripts/qsrc.py --host ja.wikisource.org "山槐記" "雨"      # 搵唔到頁
python3 scripts/qsrc.py --host ja.wikisource.org "愚管抄" "神皇"    # 搵唔到頁
for t in 吾妻鏡/第卅六 吾妻鏡/第卅七 吾妻鏡/第卅九 吾妻鏡/第四十二; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    "https://ja.wikisource.org/w/index.php?action=raw&title=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$t")"
done                                              # 全部 404

# 4) 連結
grep -o "zhwikiUrl: '[^']*'" src/heian/data/history.ts | sed "s/.*'\(.*\)'/\1/" | while read u; do
  curl -sL -o /dev/null -w "%{http_code} $u\n" "$u"; done            # 2 條 429，改用 API 覆核
curl -s "https://zh.wikipedia.org/w/api.php?action=query&prop=info&format=json&titles=屋島之戰"

# 5) 年份交叉核對
curl -s "https://zh.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&format=json&titles=足利義昭"
curl -s "https://ja.wikipedia.org/w/index.php?action=raw&title=足利義昭" | grep -o "159[0-9]年[^ ]*"
curl -s "https://zh.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&format=json&titles=順德天皇"
curl -s "https://zh.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&format=json&titles=土御門天皇"
curl -s "https://zh.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&format=json&titles=元龜"

# 6) 閘門靜默失靈掃描（報告第六節；只讀唔改）
python3 /tmp/scan_skipped.py src/japanEras/packs/kamakuraPack.ts src/japanEras/packs/azuchiPack.ts
```

`/tmp/scan_skipped.py`（13 行，下次直接貼返落 /tmp 即可用；佢用閘門自己嘅 `HARD` 表做基準，再執 `JP_LINE` 跳過嘅行）：

```python
import re
ROOT = '/Users/ka-kinpoon/Projects/3kingdoms-wt-verify'
h = open(ROOT + '/scripts/audit-chars.ts', encoding='utf-8').read()
blk = h.split('const HARD: Record<string, string> = {', 1)[1].split('\n}', 1)[0]
HARD = set(re.findall(r"([^\s,\'\":]+)\s*:", blk))
JP = re.compile(r'[\u3041-\u309f\u30a1-\u30ff]')      # 同 audit-chars.ts:93
EXTRA = set('开传继残万争镰补击')                      # 肉眼判定、唔喺 HARD 表
import sys
for path in sys.argv[1:]:
    for i, line in enumerate(open(ROOT + '/' + path, encoding='utf-8'), 1):
        if not JP.search(line):
            continue
        hits = sorted({c for c in line if c in HARD | EXTRA})
        if hits:
            print('%s:%d  JP_LINE 跳過，逃過 audit:chars：%s' % (path, i, ' '.join(hits)))
```

下次開工請先 `git -C /Users/ka-kinpoon/Projects/3kingdoms-wt-verify fetch origin && git checkout -B verify/source-audit origin/main`。

---



---

# 2026-11-09 輪次（查證對象：origin/main 最近 3 小時內容 commit）

## 0) 工作區與範圍

- `git -C .../sanguozhi-3d worktree add -B verify/source-audit /Users/.../3kingdoms-wt-verify origin/main` → HEAD `df41066`，`git status` 乾淨。
- 範圍（`git log --since="3 hours ago" --name-only origin/main`）：
  - `df41066` refactor(edo): 江戶包三層意譯分層重寫 → 改 `src/japanEras/packs/edoPack.ts`（36+/36-）＝本輪查證主體。
  - `e772eed` feat(audit): 新增 `audit:chengyu-coverage`／`audit:war-shape` 兩支閘門，無內容引文，只核對其未改既有門檻（`gates` 與基線一致，見下）。
- 抽檢單位：edoPack 12 組三層 + 同檔 DETAILS／timeline／persons 中被本輪判定需要查證的欄位，共 **18 條**（含人物欄）。本輪實際修改 **10 條**（上限 15）。

## 1) 基線（改前，供前後對比）

| 閘門 | 改前 | 改後 |
|---|---|---|
| `audit:quotes` | 條目 1834／引文 273／**錯誤 2**／提醒 45；已查證 115／未查證 77／意譯 78／引文已改 1 | 條目 1834／引文 273／**錯誤 2**／提醒 45（同前） |
| `audit:chars` | 硬傷 **0**（與基準相同）、待判 253 | 硬傷 **0**（與基準相同） |
| `audit:detail-depth` | 詳情 41／缺口 0 | 0（未回升） |
| `audit:event-depth` | 段落 782／缺口 274／jpGap 111／灌水 1 | 全同（未回升） |
| `audit:reading-layers` | 198 組／不合格 134 | 134（未回升） |
| `test`／`build`／`gates` | 通過 | 通過，`gates — 無惡化（與基線一致或更好）` |

> 過程記錄（不可隱瞞）：本輪中途引入 5 處日式字形（`録`→`錄`、`徳`→`德`）與 `锁/海关` 簡體，令 `audit:chars` 一度 0→5、`audit:quotes` 錯誤一度 2→3；已全部改返，最終 chars 0／quotes 錯誤 2，與基線一致。教訓：喺正體檔入面寫註解都要過 HARD 表。

## 2) 逐條查證（條目 id｜原本寫法｜查證命令｜結果｜本輪動作）

命令均在 `/Users/ka-kinpoon/Projects/3kingdoms-wt-verify` 執行；`curl` 用 `curl -g -s -o /dev/null -w "%{http_code}" <url>`。

| 條目 id | 原本寫法 | 查證命令 | 結果 | 動作 |
|---|---|---|---|---|
| `edo-1739-eshi` | `zhwikiUrl: WIKI_JA('元文の蝦夷崩れ')`；outcome 與 timeline note 均寫「可查日本維基『元文の蝦夷崩れ』」 | `curl "https://ja.wikipedia.org/wiki/元文の蝦夷崩れ"` → **404**；ja 站全文搜尋 `action=query&list=search&srsearch=元文の蝦夷崩れ` → 只回「北海道／日本の歴史」等，無本役條目；松前町官方 PDF（town.matsumae.hokkaido.jp）以元文4年『北海随筆』記「キイタップ事件」 | **連結死＋名稱查唔到** | 修連結→ `zh 蝦夷地`(200)；改寫 note：中日文維基皆無此役條目（附 404），名稱屬後世整理 |
| `edo-1739-eshi` 引題 | `quote: '元文の蝦夷崩れ：場所經營與處刑'` | 同上 ja 站搜尋；`qsrc.py --host ja.wikisource.org 新羅之記録 "蝦夷"` → 搵唔到頁 | **查唔到**（該日語通稱無可核出處） | 降調：引題改「元文年間：場所經營與處刑」，source 記明改題原因 |
| `edo-1739-eshi` 人物 | `松前邦広（元文期藩政）` | `curl ja.wikipedia.org/wiki/松前邦広` → 200；條目世系表「松前邦広 1721-1743」 | **可查證**（1721–1743 在任，涵蓋1739） | 不動 |
| `edo-1799-ezo-east` | 「1792年又有俄方使人抵達蝦夷、**並至長崎轉送要求通商的書信**」（causes＋中學生層兩處） | `fetch ja.wikipedia.org/wiki/アダム・ラクスマン`：1792-10-20 根室到着；幕府不受理ピール信書、1793 松前交涉後發給長崎入港信牌；「長崎へは向かわずオホーツクに帰港」；「1804年に長崎に来航したニコライ・レザノフは、ラクスマンに交付された入港許可証により入港」 | **有錯**（把1792與長崎呈書混為一談；到長崎呈書者係1804） | 加註＋修正：改為「1792 根室送還漂流民、國書未受理、僅發信牌；到長崎呈書者為1804俄使」 |
| `edo-1799-ezo-east` 史料 | 「松前藩方面另有**《新羅東志》**一類藩修文書」 | Exa 精確查 `"新羅東志"` → 僅福建龍岩一間2024年成立嘅商贸公司；查 `新羅之記録` → kotobank《日本歴史地名大系》、ja.wiki、文化遺産オンライン（寛永20年／正保3年、松前景広） | **查唔到（疑虛構書名）** | 降調＋加註：刪《新羅東志》，改記《新羅之記録》並註明其成書遠早於1799、只能校立場 |
| `edo-1799-ezo-east` 人物 | `伊勢徳三郎（択捉・國後方面調査者）`；timeline desc 亦有「最上德内、伊勢德三郎等」 | Exa 精確查 `"伊勢徳三郎"` → 僅見天保期阿波國質屋名簿（德島村民），與蝦夷無關；ja.wiki「最上徳内」條同行者為青島俊蔵、近藤重蔵、山口鉄五郎；內閣府北方対策本部頁列 最上徳内・近藤重蔵 | **查唔到（無此人為調査者之記載）** | 降調＋替換：人物欄改「近藤重蔵（寛政10年與最上德内同渡択捉、建『大日本恵登呂府』標柱）」；desc 改「最上德内等，其後近藤重蔵亦探查択捉」 |
| `edo-1804-kunashir` | `zhwikiUrl: WIKI_JA('國後事件')`；note 寫「見日本維基『國後事件』」 | `curl ja.wikipedia.org/wiki/國後事件` → **404**；opensearch `国後事件` → 無結果 | **連結死** | 修連結→ `zh 蝦夷地`(200)；note 改記「中日文維基均無此事件條目（附 404）」 |
| `edo-1804-kunashir` 人物/desc | 「松前藩商人**佐屋九兵衛**等在國後與阿伊努發生衝突」（keyFigure＋timeline desc） | Exa 查文化元年國後事件／飛騨屋：ja.wiki「クナシリ・メナシの戦い」、世界大百科「飛驒屋久兵衛」、領土主権展示館、道立図書館資料均記該地場所請負人為**飛騨屋久兵衛**；查 `佐屋九兵衛` → 無任何記載 | **查唔到（人名無記載）** | 降調：人名改為「國後場所經營者／場所經營者」，並註「本名無可核之同時期記載」 |
| `edo-1807-ezo-all` | 「**文化5年**（1807）」共 8 處（comment×2、causes、brief、quote、secondary、1789 outcome、timeline desc） | `curl ja.wikipedia.org/wiki/松前藩`：「文化4年（1807年）2月22日に西蝦夷地も取り上げられ…転封」；ja.wiki「クナシリ・メナシの戦い」：「1807年（文化4年）には松前・西蝦夷地も上知され」；山川日本史小辞典（kotobank 最上徳内）「1807年(文化4)箱館奉行支配調役となる」 | **錯年號**（文化5年＝1808） | 修錯年：8 處全數改「文化4年」（年號與西曆對齊，附上述三處依據） |
| `edo-1807-ezo-all` 史料 | 「藩側的《新羅東志》與家世類文書」（DETAILS＋大學層） | 同 `新羅東志` 查證 | **查唔到** | 降調＋加註：刪書名，註明查無與《新羅之記録》年代不合 |
| `edo-1635-sankin` | `quote: '大名ハ隔年エドニ参ハルヘシ'`；source 只寫「寬永令條文未能取得可逐字比對之原文」 | EE-Arts 史料庫《武家諸法度（元和令、寛永令、天和令）》漢文本寛永令2條：「大名小名在江戸の交替相定むる所也。毎歳夏四月中、参勤致すべし」；埼玉縣《武家諸法度を読む》：元和令13條／寛永12年令19條、500石以上大船建造禁止；世界大百科「武家諸法度」「大船建造の禁」 | **有異文**：今見條文作「毎歳」，「隔年」係後世語譯；13/19條與大船禁令＝可查證 | 加註：source 補條文原文、「隔年」屬語譯、13/19條不可混引（並保留「非逐字引文」） |
| `edo-1637-shimabara` | `zhwikiUrl: WIKI('島原天草起義')` | `curl zh.wikipedia.org/wiki/島原天草起義` → **404**；`opensearch 島原之亂` → 命中；`fetch zh.wikipedia.org/wiki/島原之亂` → 200，條目即1637-12-11〜1638-04-12 島原・天草一揆，別名「島原教案／島原天草一揆／島原天草之亂」 | **連結死** | 修連結→ `zh 島原之亂`(200) |
| `edo-1639-sakoku` | 「1635年把中國船限定於長崎靠岸」；`quote: '唐船ハ長崎ニ限ル'` | ja.wiki「鎖国」：1616 元和2年「明朝以外の船の入港を長崎・平戸に限定」；財務省海关年表：1635 第3次鎖國令＝渡航・帰国禁止＋貿易長崎限定，另記 1639 第5次令後「平戸をオランダ船の、長崎を唐船の貿易港とした」 | **有異文**（唐船限定長崎之年代各說不一） | 加註：source 記三說並声明「不以任何一年為定說」；引題標為後世語譯式概括 |
| `edo-1669-shakushain` 人物 | `狭山丹尼（阿伊努方領袖）`；大學層並聲稱「本條人物欄另記漢字表記，兩者指同一人」 | `fetch ja.wikipedia.org/wiki/シャクシャイン`：漢字表記「**沙牟奢允**」，寛文9年10月23日（1669-11-16）死於ピポク松前藩陣營；Exa 精確查 `"狭山丹尼"` → **零命中**（只回沖繩知事「玉城丹尼」等無關詞） | **查唔到（疑虛構漢字表記）** | 降調＋替換：人物欄改「沙牟奢允」（並註漢字表記屬日方記錄轉寫） |
| `ed-p-shakushain`（人物卡） | `death: 1672`；summary「1671年和談後被殺」；source「《新羅東志》等松前藩史料」 | 同上 ja.wiki（1669-11-16 暗殺／ピポク）＋ kotobank 世界大百科「國後・目梨の戦」條「1669年−1671年のシャクシャインの戦」＝戰爭延續至1671，非其死期 | **錯年**（死年1669；1671/72 屬戰事終結） | 修錯年：`death: 1669`、summary 補寛文9年10月23日與戰事延續之別、note 記改前寫法；source 刪《新羅東志》 |
| `edo-1789-menashi` | 「是松前藩設場所以來**範圍最大**的一次」 | kotobank 世界大百科「クナシリメナシの戦」：「アイヌ民族の松前藩に対する**近世最後**の武力闘争」；同書「國後・目梨の戦」：參加130名（クナシリ41／メナシ89）、和人死者71、處刑37；アイヌ学年表記1669年蜂起殺害和人「二百七十人余」 | **查唔到（「最大」無依據，且與通說相左）** | 降調：改為「地域最廣的一次，規模是否超過1669年之役無從比定，故不取『最大』之說」 |
| `edo-1789-menashi` | 「幕府於是**委託**最上德内等人探查」「其後**受松前藩委托**探查樺太」 | kotobank（日本大百科／山川小辞典）最上徳内：天明5年隨**幕府**蝦夷地調査、寛政2年幕府普請役、寛政4年**受命**探查樺太；ja.wiki：1787 潛入松前藩菩提寺被逐，「松前藩には危険人物として警戒された」 | **有錯（幕命誤作藩委托）** | 加註＋修正：改「出於幕命，非松前藩所雇」，keyFigure role 同步 |
| `edo-1789-menashi` | `zhwikiUrl: WIKI_JA('メナシ・クナシルの戰い')` | `curl` → **404**（詞序＋「戰」字皆誤）；`ja opensearch クナシル` → 命中「クナシリ・メナシの戦い」，`curl` → 200；`curl zh.wikipedia.org/wiki/國後目梨之戰` → **200** | **連結死** | 修連結→ `zh 國後目梨之戰`(200，同役中文條目) |

## 3) 本輪動作統計

- 抽查 **18** 條（含引文、出處、年份、人物、連結）；**可查證 6**／**查唔到 6**／**有異文 2**／**連結死 4**／**錯年 2（含1處年號錯位）**／**人名書名疑虛構 3**。
- 修改 **10 條**（未達 15 上限）：加註出處 6、降調 7、修死連結 4、修錯年 9 處（年號）、替換查無根據之人名/書名 5 處。
- 新增敘事：**無**。改地圖幾何：**無**。改 `scripts/audit-*` 門檻：**無**。`--update-baseline`：**無**。

## 4) 需要人工判斷（查唔到／未改）

1. `src/geo/japanFringeWindows.ts:74 ryukyu-vassal`：`audit:quotes` 報「簡體字：国」——**本輪前已有**，屬字形修正，唔喺本輪三類可改範圍，留人工。
2. `edo-1789-menashi` quote「`国後・目梨ニ番屋焼カレリ`」：`audit:quotes` 報「簡體字：国」——同上，引文行字形，留人工（本輪只改連結與內容，未動引文行字形）。
3. 《新羅東志》一詞在本檔 8 處已全數清除，但**其他 pack 是否同樣掛此書名未查**（本輪範圍限 edoPack）。
4. `edo-1804-kunashir` 之「幕府介入處分」細節（何人處分、處分內容）無同時期文書可核，現為通說；如需引一手文書，要再查《德川實紀》文化期條。
5. `edo-1739-eshi` 目前連結只能指「蝦夷地」總條目——若日後建立本役條目（中/日文），應改指該條目。
## 5) 本輪收尾與 rebase 記錄（與最終 push 狀態一致）

- 本輪 push 後 `origin/main` 又進了一條 `34571d7`（#95 戰國關鍵人物維基連結，改 `scripts/audit-chars.ts` 與 `src/sengoku/data/timelineDetails.ts`，**未觸及 edoPack**）。因 #95 改咗字符閘門本身，為免門檻口徑唔一致，已 `git rebase origin/main` 後用 `git push --force-with-lease`（無用裸 `--force`）。
- rebase 後 HEAD `e8d0ced`，`git ls-remote --heads origin verify/source-audit` 與 `git rev-parse HEAD` 相同。
- rebase 後重跑（基線已含 #95）：`audit:quotes` 錯誤 **2**（＝基線）、`audit:chars` 硬傷 **0**（待判 254，254 而非 253 係 #95 新增行所致，非本輪造成）、`detail-depth` 缺口 **0**、`event-depth` 缺口 **274／jpGap 111**、`reading-layers` **134**、`test` 全部通過、`build` 通過、`gates — 無惡化`。
- PR：https://github.com/philosopherkk/sanguozhi-3d/pull/96 （`state=OPEN`, `mergeable=MERGEABLE`；檔案只有 `src/japanEras/packs/edoPack.ts` 與 `reports/source-audit.md`）。
