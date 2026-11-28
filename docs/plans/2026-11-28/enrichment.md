# 內容加厚與關鍵事變執行計畫（四國優先、本機 30B 每輪 ≤4 項）

## 現況數字

- `agent-queue` 各線總覽：
  - `enrich`：`audit:event-depth` — 段落 1326／缺口 0（起因 0／經過 0／結果 0）｜三層意譯：小學生 401・中學生 624・大學 624（缺小學生層 223）｜日本三層未達 0（筆數 188/188/188）｜灌水嫌疑 0 段
  - `accuracy`：已戳記 397 條（另有出處具名卻無原文條目，見 `--todo`）
  - `map`：`check_ring_landmarks --unasserted` — 共 110 環，無地標斷言 2 環
  - `march`：`check_route_landmarks --unasserted` — 在冊 137 條，無斷言 8 條
  - `critical`：`audit:critical` — 40 槽｜關鍵年 402｜有卡 242｜缺口 141｜未標 150｜界線 45
  - `country`：16/16 包全過 `country_check`；`audit:detail-depth` — 47 條／缺口 0；`audit:reading-layers` — 339 組／不合格 0（中位比 1 : 2.4 : 4.6）
- 四國分項統計（`src/countries` 16 包；三段 192 筆缺口 0、灌水 0；三層 64 組中僅大學生層 19 筆未達 300 字，小／中學生皆 0 缺口且已符合 `u >= 3*e`）：
  - **韓國**（4 槽）：大學層缺口 14（`koancient` 4、`kogoryeo` 4、`kojoseon` 4、`komodern` 2）｜critical 關鍵年 50／有卡 16／缺口 30／未標 0／界線 5（668, 1392, 1644, 1897, 2026）
  - **泰國**（4 槽）：大學層缺口 3（`thsukhothai` 2、`thayutthaya` 1）｜critical 關鍵年 27／有卡 16／缺口 11／未標 1／界線 4（1351, 1767, 1909, 1997）
  - **越南**（4 槽）：大學層缺口 2（`vndynasty` 1、`vnnguyen` 1）｜critical 關鍵年 69／有卡 16／缺口 48／未標 1／界線 6（971, 1000, 1009, 1802, 1945, 1990）
  - **馬來西亞**（4 槽）：大學層缺口 0｜critical 關鍵年 47／有卡 16／缺口 29／未標 2／界線 4（1511, 1941, 1965, 2026）
- 中日遺留（排於四國之後）：
  - `enrich`：全庫三層未達標 359 條（中學生 169／大學生 190，扣四國 19 餘中國 340 條；缺小學生層 223 條，全屬中國槽如 `civilWarPack`、`nanbeiPack`、`tangPack`、`suiPack`、`minguoPack`）。
  - `critical`：中國 13 槽（關鍵年 119／有卡 102／缺口 16／未標 79／界線 13）；日本 11 槽（關鍵年 90／有卡 76／缺口 7／未標 67／界線 13）。
- **40 槽中 0 張 `critical: true` 卡的槽（2 個）**：`國共內戰`（64 卡／0 critical）與 `新中國`（20 卡／0 critical）。

## P0 佇列（本機代理今天可做，<=12 條）

☑ src/imperial/data/prcPack.ts:105｜`critical`｜為1949「中華人民共和國成立」補 `critical: true`（新中國槽零張關鍵卡），保留既有 outcome 並於 note 簡述建政改變東亞版圖之由｜驗收=`node scripts/audit_critical.mjs --era 新中國 --year 1949`
☑ src/imperial/data/civilWarPack.ts:896｜`critical`｜為1946「中原突圍：全面內戰爆發」補 `critical: true`（國共內戰槽零張關鍵卡），補齊三段/小學層免降級，避開重複「1946年6月26日是階段的分界」｜驗收=`node scripts/audit_critical.mjs --era 國共內戰 --year 1946`
☑ src/countries/korea/koancientPack.ts:101｜大學生層｜補大學生層至305+字（現272缺28；已過3×小學213），就樂浪實物與《漢書》郡治戶口差距補史源辨析，避開重複「走向早期國家」與「界線細節應以考古材料為準」｜驗收=node scripts/country_check.mjs src/countries/korea/koancientPack.ts
☑ src/countries/korea/koancientPack.ts:115｜大學生層｜補大學生層至305+字（現273缺27；已過3×小學210），就小獸林王律令與太學/佛教並置補制度互文，避開重複「共築塔寺」與「不宜據以描繪完備制度」｜驗收=node scripts/country_check.mjs src/countries/korea/koancientPack.ts
☑ src/countries/korea/koancientPack.ts:READINGS#ko-660｜大學生層｜補大學生層至305+字（現276缺29；已過3×小學228），就唐羅熊津都督府與白村江前百濟復國軍補充地緣張力，避開重複「促成了佛教藝術與技術的北傳與南播」｜驗收=node scripts/country_check.mjs src/countries/korea/koancientPack.ts && node scripts/audit_reading_layers.mjs --require="src/countries/korea/koancientPack.ts:READINGS#ko-660:university:305"
☑ src/countries/korea/kojoseonPack.ts:READINGS#ko-1392｜大學生層｜補大學生層至305+字（現258缺47；已過3×小學252），補漢陽遷都風水/宗廟制度與士林興起之長程影響，避開重複「崇儒抑佛」與「制度推行因地遲速」｜驗收=node scripts/country_check.mjs src/countries/korea/kojoseonPack.ts && node scripts/audit_reading_layers.mjs --require="src/countries/korea/kojoseonPack.ts:READINGS#ko-1392:university:305"
☐ src/countries/korea/kojoseonPack.ts:READINGS#ko-1446｜大學生層｜補大學生層至305+字（現265缺40；已過3×小學234），補《解例本》聲韻分類與吏讀轉換意義，避開重複「漢文為正書」與「本包取1446之通說紀年」｜驗收=node scripts/country_check.mjs src/countries/korea/kojoseonPack.ts && node scripts/audit_reading_layers.mjs --require="src/countries/korea/kojoseonPack.ts:READINGS#ko-1446:university:305"
☐ src/countries/korea/kojoseonPack.ts:READINGS#ko-1636｜大學生層｜補大學生層至305+字（現266缺39；已過3×小學249），補瀋陽質子政治與對清朝貢使行之物質交換，避開重複「小中華之論」與「三百年之國是遂定於城下一跪」｜驗收=node scripts/country_check.mjs src/countries/korea/kojoseonPack.ts && node scripts/audit_reading_layers.mjs --require="src/countries/korea/kojoseonPack.ts:READINGS#ko-1636:university:305"
☐ src/countries/korea/komodernPack.ts:READINGS#ko-1950｜大學生層｜補大學生層至305+字（現276缺29；已過3×小學255），補《韓美共同防禦條約》與戰後韓日關係正常化脈絡，避開重複「確立文官統帥之例」與「半島無核化之迴圈」｜驗收=node scripts/country_check.mjs src/countries/korea/komodernPack.ts && node scripts/audit_reading_layers.mjs --require="src/countries/korea/komodernPack.ts:READINGS#ko-1950:university:305"
☐ src/countries/thailand/thsukhothaiPack.ts:READINGS#th-1238｜大學生層｜補大學生層至305+字（現272缺33；已過3×小學243），補父城/子城與周邊孟（Mueang）網路之差別，避開重複「效忠關係的轉移」與「華瓷鐵器入於河谷」｜驗收=node scripts/country_check.mjs src/countries/thailand/thsukhothaiPack.ts && node scripts/audit_reading_layers.mjs --require="src/countries/thailand/thsukhothaiPack.ts:READINGS#th-1238:university:305"
☐ src/countries/thailand/thsukhothaiPack.ts:READINGS#th-1351｜大學生層｜補大學生層至305+字（現274缺31；已過3×小學201），補阿瑜陀耶薩克迪納（食邑等級）雛形與水利稻作關係，避開重複「上游之米」與「1351年之義，在重心南移而已」｜驗收=node scripts/country_check.mjs src/countries/thailand/thsukhothaiPack.ts && node scripts/audit_reading_layers.mjs --require="src/countries/thailand/thsukhothaiPack.ts:READINGS#th-1351:university:305"
☐ src/countries/korea/kogoryeoPack.ts:READINGS#ko-676｜大學生層｜補大學生層至305+字（現263缺42；已過3×小學210），補骨品制下六頭品士人出路與新羅末豪族離心，避開重複「各得其所的一半」與「崔致遠其人也」｜驗收=node scripts/country_check.mjs src/countries/korea/kogoryeoPack.ts && node scripts/audit_reading_layers.mjs --require="src/countries/korea/kogoryeoPack.ts:READINGS#ko-676:university:305"

## P1 批次（按檔分組，每批 2–4 項同檔）

1. **高麗大學生層餘項（`src/countries/korea/kogoryeoPack.ts`，3 項）**：L117（`ko-918` 254→305+，缺 46）、L131（`ko-1231` 232→305+，缺 68）、L145（`ko-1388` 247→305+，缺 53）。單檔收口 `country_check.mjs`。
2. **四國大學生層超低缺口（4 檔各 1 項，可分開或同國 2 檔）**：`koancientPack.ts:143`（`ko-668` 缺 19）、`kojoseonPack.ts:130`（`ko-1592` 缺 2）、`komodernPack.ts:117`（`ko-1910` 缺 9）；`thayutthayaPack.ts:128`（`th-1593` 缺 4）；`vndynastyPack.ts:118`（`vn-1288` 缺 7）＋`vnnguyenPack.ts:101`（`vn-1802` 缺 9）。
3. **四國既有卡未標 `critical` 覆核（3 檔 4 項）**：
   - `vnnorthPack.ts:323`（40 年`vn-40`「徵氏姊妹起兵」：徵氏政權短暫出現→標 `critical: true` 或依史實於 `note` 論證）
   - `thsukhothaiPack.ts:291`（1292 年`th-1292`「蘭甘亨碑銘」：不改朝換代，依定義於 `note` 明記不設 `critical` 之由）
   - `mymalaccaPack.ts:284,303`（1409「鄭和寶船」、1446「穆扎法爾沙政制」：於 `note` 裁定或僅保留屬政權格局轉折者標 `critical: true`）
4. **中日關鍵年 0 卡槽清尾（2 檔，各取 3–4 項）**：
   - `civilWarPack.ts`：1945（L865 日本投降）、1947（L906 國軍入延安／L916 躍進大別山）、1948（L926 遼沈／L938 淮海／L950 平津）標 `critical: true`。
   - `prcPack.ts`：1951（L124 十七條協議）、1962（L232 中印邊境戰爭）、1978（L272 改革開放）、1979（L291 中越戰爭）、1997（L424 香港回歸）逐條判定並標 `critical: true`。
5. **中國槽三層意譯缺口（四國與兩 0-critical 槽清完後再啟動）**：按 `audit_event_depth.mjs --todo 12` 順序，每輪單檔 3–4 項處理 `civilWarPack.ts`（大學生層 34–37 字佔位段）、`nanbeiPack.ts`、`suiPack.ts`、`minguoPack.ts`、`tangPack.ts`，以及缺小學生層 223 條；其後再處理 `遼宋`（9 缺口）、`三國`（4 缺口）、`戰國`（3 缺口）、`唐`（2 缺口）、`安土桃山`（2 缺口）。

## 關鍵事變補卡清單

> 說明：`DeepDiveYearContext` 會將 `?y=` 硬性鉗位至 `[yearMin, yearMax]`，超出視窗的提案在 UI 不可見，一律標 **BLOCKED**；跨包接縫 `yearMin`（前一包 `yearMax` 已有卡者）標「接縫已覆蓋，免重複建卡」；域外政權（如漢、明、清、高棉、中華人民共和國）在域外之起訖年非當地政權更迭，建議於工具豁免，僅為當地實質政權出現／消失／時代轉折補卡。

### 韓國（4 槽）
- **`koancientPack.ts` 視窗 `[-108, 668]`**｜**BLOCKED**：`-202`（漢立）、`907`（唐亡）皆出視窗。域外 `8`（漢亡）、`618`（唐立）屬域外起訖。建議補卡：
  - `-57`：《朴赫居世立斯盧，新羅建國》
  - `-37`：《朱蒙立高句麗於卒本》
  - `-18`：《溫祚南下漢江，百濟立國》
  - `42`：《金首露立金官伽倻，伽倻聯盟興起》
  - `313`：《高句麗併樂浪郡，漢四郡終結》（兼覆 `300` 三韓轉為三國）
  - `562`：《新羅滅大伽倻，洛東江流域併入新羅》
- **`kogoryeoPack.ts` 視窗 `[668, 1392]`**｜接縫 `668` 已由 `koancient` 覆蓋、`1392` 屬界線已由 `kojoseon` 覆蓋。域外 `907`（遼）、`1115`（金）、`1125`（遼亡）、`1206`（蒙古）、`1234`（金亡）、`1271`（元立）、`1368`（明立）。建議補卡：
  - `698`：《大祚榮建震國，渤海與新羅南北並立》
  - `892`：《甄萱據完山州稱王，後百濟立國》（`901` 弓裔立泰封可併作：《弓裔建泰封，後三國鼎立》）
  - `926`：《契丹滅渤海，遺眾南奔高麗》
  - `935`：《新羅敬順王納土降高麗》（接續 `936`《高麗平後百濟，後三國一統》）
- **`kojoseonPack.ts` 視窗 `[1392, 1897]`**｜`1644`（明亡）、`1897`（界線，已入 `komodern`）豁免。域外 `1616`（努爾哈齊立後金，可記《後金興起與朝鮮光海君中立外交》）。建議補卡：
  - `1598`：《露梁海戰與倭軍撤離，壬辰之役終》
- **`komodernPack.ts` 視窗 `[1897, 2026]`**｜`2026` 屬界線。域外 `1912`（清亡）、`1949`（中華人民共和國成立，已有中國槽）。建議補卡：
  - `1945`：《日本投降與三八線分區受降，總督府終結》
  - `1948`：《大韓民國與朝鮮民主主義人民共和國分立》
  - `1953`：《板門店停戰協定簽署，半島分治固化》

### 泰國（4 槽）
- **`thsukhothaiPack.ts` 視窗 `[1238, 1351]`**｜**BLOCKED**：`802`（吳哥立）、`1200`（耀國底／洛坤）、`1431`（吳哥亡）、`1438`（素可泰除）、`1558`（蘭納亡）、`1767`（大城亡）皆出視窗。缺口 0，僅 `1292` 未標（建議於 `note` 說明非政權更迭不標 `critical`）。
- **`thayutthayaPack.ts` 視窗 `[1438, 1767]`**｜**BLOCKED**：`802`、`1238`、`1296`、`1351`、`1782`、`1885` 皆出視窗。`1500`（高棉）／`1510`（東吁立）／`1599`（東吁衰）／`1752`（貢榜立）多為緬／柬變動。建議本地政權實質變動補卡：
  - `1558`：《東吁攻陷清邁，蘭納附庸於緬甸》
- **`thchakriPack.ts` 視窗 `[1782, 1909]`**｜**BLOCKED**：`1400`、`1752`、`1932`（曼谷王朝君主專制終結，已屬 `thmodern` 1932）皆出視窗。`1885`（英滅貢榜）為緬史。建議補卡：
  - `1856`：《法暹通商條約簽訂，法國勢力入湄南河》
  - `1868`：《朱拉隆功即位，五世王改革始動》
  - `1907`：《法暹新約割讓馬德望與暹粒，東界定型》
- **`thmodernPack.ts` 視窗 `[1932, 1997]`**｜`1997` 界線已有卡。建議補卡：
  - `1945`：《自由泰宣告日泰條約無效，文官政府復位》
  - `1947`：《鑾披汶發動政變，立憲文官政體終止》

### 越南（4 槽）
- **`vnnorthPack.ts` 視窗 `[-111, 1009]`**｜`971`（南漢亡）、`1000`（占城／真臘退出）、`1009`（界線）已豁免。建議優先補本地政權建廢：
  - `43`：《馬援南征破浪泊，徵氏政權覆亡》（並覆核 `40` `vn-40` 標 `critical`）
  - `192`：《區連據象林建林邑，占城政權之始》（外加 `550`《真臘代扶南而興，下湄公易主》）
  - `220`：《漢末交州改屬東吳，北屬權力移轉》（`420`/`594`/`603` 分屬南朝與隋復置郡縣，可優先補 `544` 李賁萬春或 `602`《隋破李佛子，交州復入郡縣》）
  - `905`：《曲承裕為靜海節度使，交州地方自主之始》
  - `939`：《吳權稱王都古螺，吳朝正式建立》及 `965`《吳朝終結與十二使君之亂起》
  - `980`：《黎桓代丁稱帝，前黎朝建立》
- **`vndynastyPack.ts` 視窗 `[1010, 1802]`**｜`1802` 界線已由 `vnnguyen` 覆蓋。建議核心政權更迭補卡：
  - `1225`：《陳守度促李昭皇禪讓，陳朝代李》
  - `1400`：《胡季犛廢陳立大虞，陳朝終結》與 `1407`《明軍滅胡氏置交趾布政使司》及 `1427`《柳昇敗歿，明軍撤出交趾》
  - `1527`：《莫登庸受禪建莫朝，南北朝之端》與 `1592`《鄭松克昇龍，莫朝北遁高平》
  - `1545`：《阮淦遇害，鄭檢執政開鄭主之局》與 `1620`《阮福源拒納稅於鄭，鄭阮分立始》
  - `1650`：《鄭阮對峙固化，清化以南成長期分治》（對應既有 tick/keyYear）
  - `1697`：《阮氏設平順府，占城故地正式入籍》與 `1760`《阮主兼併南圻，真臘退出湄公三角洲》
  - `1778`：《阮岳稱帝建西山朝》與 `1786`《阮惠北伐破昇龍，鄭主覆亡》（`1788` 清軍入越可併入 `1789` 前奏）
- **`vnnguyenPack.ts` 視窗 `[1802, 1945]`**｜建議補卡：
  - `1862`：《第一次西貢條約割讓東三省，西班牙退場》與 `1867`《法軍佔領南圻西三省》
  - `1873`：《安鄴攻河內與劉永福黑旗軍助越抗法》與 `1885`《咸宜帝發動勤王詔，各地抗法義軍起》（`1896` 潘廷逢歿，勤王終結）
  - `1940`：《日軍進駐法屬印度支那，法日共管始》與 `1941`《胡志明於高平組建越南獨立同盟》
- **`vnmodernPack.ts` 視窗 `[1945, 1990]`**｜接縫 `1945` 已由 `vnnguyen` 覆蓋；`1990` 界線。域外 `1950`（中華人民共和國）。建議補卡：
  - `1946`：《河內巷戰與第一次印度支那戰爭全面爆發》
  - `1949`：《法越愛麗舍協定與越南國成立》
  - `1955`：《吳廷琰廢保大帝建越南共和國，南北對立定型》
  - `1960`：《越南南方民族解放陣線成立》與 `1965`《美軍於峴港登陸，直接參戰》（`1961` 美顧問增兵可併）
  - `1973`：《巴黎和平協定簽署，美軍撤出越南》
  - `1976`：《南北統一改國號越南社會主義共和國》與 `1979`：《柬越邊境戰起與中越邊境衝突》

### 馬來西亞（4 槽）
- **`mymalaccaPack.ts` 視窗 `[1400, 1511]`**｜`1511` 已有卡。`1403`/`1420`/`1459`/`1489` 為明朝使節／法典演變，未必須改政權；優先處理 `1409`、`1446` 未標覆核。
- **`mycolonialPack.ts` 視窗 `[1511, 1941]`**｜接縫 `1511` 已由 `mymalacca` 覆蓋、`1941` 已由 `mymerdeka` 覆蓋。建議補卡：
  - `1819`：《萊佛士於新加坡設埠，海峽貿易重心重組》
  - `1826`：《海峽殖民地合併成立，檳城、馬六甲與新加坡合治》
  - `1841`：《布魯克獲封砂拉越拉惹，白人拉惹政權始》
  - `1867`：《海峽殖民地改隸英國殖民部直轄》
  - `1881`：《北婆羅洲特許公司取得沙巴治權》（`1888` 英設北婆羅洲與汶萊保護國）
  - `1909`：《曼谷條約：暹羅將北馬四邦宗主權讓予英國》
- **`mymerdekaPack.ts` 視窗 `[1941, 1965]`**｜建議補卡：
  - `1942`：《日軍陷新加坡，英屬馬來亞全面淪陷》
  - `1945`：《日軍投降，英國軍政府重返與馬抗日軍解散》
  - `1946`：《反對馬來亞聯邦方案，巫統（UMNO）成立》
  - `1948`：《馬來亞聯合邦成立與緊急狀態頒布》
- **`mymodernPack.ts` 視窗 `[1965, 2026]`**｜接縫 `1965` 已由 `mymerdeka` 覆蓋；`2026` 界線。建議補卡：
  - `1966`：《民主行動黨成立與砂拉越憲政危機》
  - `1975`：《澳紐英駐軍（ANZUK）撤編，區域防衛重組》
  - `1981`：《馬哈迪就任首相，國陣威權現代化體制轉折》
  - `1998`：《安華被革職引發烈火莫熄改革運動》（併覆 `1999` 公正黨成立）

## 工具缺口（要雲端那層我來建）

> **已完成（2026-11-28 雲端層）**：`audit_critical.mjs` 新增 `--era <關鍵字>`（只盤點該槽；時代名
> 打錯即 exit 2，不會默默不驗）與 `--year <年>`（驗收「該年有卡且已標 `critical: true`」，未達標
> exit 1；年分不在該槽關鍵年清單即 exit 2）。`--era` 與 `--md` 互斥。上下都已偽造驗證。
> **本檔 `critical` 行的驗收一律寫成 `--era <槽> --year <年>`**；只有 `--era` 是空的（未補也 exit 0）。

1. **`scripts/audit_detail_depth.mjs` 補齊 `src/countries/`（與 `japanEras`）覆蓋**
   - 輸入：掃描 `src/countries/**` 與 `src/japanEras/packs/**` 內之 `DETAILS`（支援 `causes/course/outcome` 單一字面量）。
   - 輸出：按國別與檔案列出條目數、缺口數、最短欄位字數，並支援 `--only`、`--json`、`--fail-on-gap`、`--selftest`。
   - 通過／失敗判準：`causes >= 200`、`course >= 200`、`outcome >= 400`（去空白計）；任一欄位缺漏或低於門檻即 FAIL（exit 1），全達標 PASS（exit 0）。
2. **`scripts/audit_critical.mjs` 修復四國 `F.xxx` 解析與跨槽邊界語意**
   - 輸入：讀取各 pack `const F = { ... }` 映射表、相鄰槽 `[yearMin, yearMax]` 串接關係與域外勢力名單。
   - 輸出：把 `政權出現:F`／`政權退出:F` 還原為真實政權名；區分「跨槽接縫 `yearMin`（前一槽 `yearMax` 已有卡）」與「真缺口」；對 `activeFrom/To` 超出 `[yearMin, yearMax]` 者另列 `out-of-window` 提示（例如 `thchakriPack` 的 `1932`）。
   - 通過／失敗判準：四國輸出不得再出現 `政權出現:F`／`政權退出:F`；跨槽接縫年不誤列為缺口；`--strict` 下真缺口為 0 方 exit 0。
3. **單檔快速深度＋分層＋灌水檢查（`scripts/depth_check_file.mjs <file>` 或併入 `country_check.mjs`）**
   - 輸入：任意單一資料檔路徑（支援 `src/countries/**` 與中日 Pack／`timelineDetails.ts`）。
   - 輸出：≤15 行摘要，逐項回報三段字數（200/200/400）、三層比例（`s >= 1.5*e`、`u >= 3*e`、`u >= 300`）、同事件重複句、`boilerplate` 風險句與 `desc-echo` 分數。
   - 通過／失敗判準：三段達標、三層達標且零重複、灌水風險 0 項即 PASS（exit 0），否則列出具體 `id@行號` 並 exit 1。

## 禁止事項

- 嚴禁灌水：不得把 `desc` 換句話說充當 `causes`/`course`，不得在三層重述同一句話，不得在同模組 ≥3 個事件使用相同 ≥12 字樣板句，不得寫「影響深遠」「具有重要意義」等空話。
- 嚴禁編造史實、年份、人數或卷頁；分歧年份與數字一律標 `disputed: true` 並在 `note` 說明異說，不寫定數。
- 非逐字史源（凡經 `scripts/qsrc.py` 查無逐字原文者）一律標註「通說整理，非逐字引文」，嚴禁偽造逐字引文。
- 嚴禁任何簡體字、日本新字形及粵語口語虛詞（寫入檔案前必過 `audit-chars.ts` 與 `agent-selfcheck.mjs --branch`）。
- **驗收只准驗本行那一項，唔准掛全倉檢查**：`--branch` 式自檢睇嘅係成條分支嘅 diff，掛喺某一行上面會令該行同自己無關嘅錯字都變「呢條 ☑ 失敗」；而 PR 併咗之後 `origin/main..HEAD` 變空，嗰類驗收反而永遠綠（CI 假綠已實錄過一次）。全倉字形由 `audit:selfcheck` 閘門負責，行內唔准重複掛。
- 嚴禁跨檔混改與字串串接：每輪僅改一個檔案、最多 4 項；`causes`/`course`/`outcome`/`elementary`/`secondary`/`university` 必為單一字面量，不得使用 `'…' + '…'` 串接。
