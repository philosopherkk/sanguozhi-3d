# 四國包史料出處與逐字引文執行計畫

> 範圍：`src/countries/{korea,thailand,vietnam,malaysia}/*Pack.ts`（共 16 個時代包），對口 `accuracy` 佇列與 `scripts/audit_quotes.mjs`。

## 現況數字

- **全庫 `audit:quotes` 基線**（`package.json` `audit:quotes` → `scripts/audit_quotes.mjs`）：合計 2,906 條｜有引文 506｜錯誤 0｜提醒 44（`理由散見內文` 42＋`引文過短` 2）；帳本 `scripts/quote-audit-ledger.json` 共 397 筆（已查證 309｜未查證 2，均在 `src/zhou/data/timelineMore.ts`｜意譯 193｜引文已改 0）。
  - `error` vs `warn`：`error` 含無出處、空出處、引《演義》、有引文但 `source` 缺《》且無合法標記、`disputed` 無理由、簡體字；`warn` 為理由散見內文、引文不足 6 字。
  - `--todo --limit=N`：按「引文已改 → 未查證 → 有提醒」排序（預設 40 條）；另以 `QUOTELESS_SKIP = /通說|意譯|非逐字|查無此書/` 過濾「出處具《》卻無引文」條目。
  - `--mark '<檔案>#<key>' --page <頁名>`：全倉有 15+ 組同名 key，裸 key 會拒絕寫入（防止蓋錯檔）。
- **`src/countries/` 總量與四國明細**：
  - `audit_quotes` 共掃出 **704 筆**（0 錯誤、0 提醒、**0 筆入帳本**；`info: 意譯出處` 528 筆）：

| 國家（4 包） | `events` 數 | `events` 含《》 | 無書名／純泛稱 | `READINGS`（有 `quote`） | `audit_quotes` 總筆數 | 問題摘要 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| 韓國 `korea` | 16 | 16 | 0（*） | 16（全標意譯） | 151（50 筆具名無原文） | `komodernPack:415` 用 `『朝鮮中央年鑑』`；`fact()` 4 筆無《》；`ko-372` 誤作「順權」「立太學」 |
| 泰國 `thailand` | 16 | 16 | 0（*） | 16（全標意譯） | 153（51 筆具名無原文） | 逾半《》為泛稱擬書名（《王室之紀錄》《當時之報章》《暹羅官方文書》《曼谷朝廷之編年》） |
| 越南 `vietnam` | 16 | 16 | 0（*） | 16（全標意譯） | 239（75 筆具名無原文） | `vndynastyPack` 篇目錯置（`vn-1010` 誤前編、`vn-1789` 誤本紀）；現代包多泛稱《》 |
| 馬來西亞 `malaysia` | 16 | 16 | 0（*） | 16（全標意譯） | 161（0 筆入 `--todo`） | `mymodernPack` 含擬書名《宏願業以路為綱》《總理演說》《分合文告與兩國約》 |

  - （*）註：四國 64 條 `events` 與 64 條 `READINGS` 雖全數帶《》且寫「通說整理，非逐字引文」，但前者部分《》屬泛稱／擬書名，後者 64 條 `quote` 皆為改寫格言而全數繞過 `audit_quotes --todo`；另 `leadersByYear` 合計 176 筆（韓 50／泰 51／越 75）未寫「通說」，目前反常擠入 `--todo` 具名無原文清單。另 `situation` 之 `fact()` 共 575 筆不入 `audit_quotes`（僅韓現代包缺 4 筆《》）。

## 逐字可核 vs 通說整理（口徑表）

以下逐項皆已透過 `?action=raw` 或 `scripts/qsrc.py` 實測（2026-11-28）；未通過者明確標示原因與降級口徑：

| 國家 | 史料名稱 | 實測目標與狀態（`?action=raw` / `qsrc.py`） | 口徑判定 |
| --- | --- | --- | --- |
| 韓／中 | 《史記·朝鮮列傳》《漢書·地理志》 | `zh.wikisource` `史記/卷115`（1,432 字）、`漢書/卷028`（18,603 字）200 有全文 | 逐字可核（zh wikisource） |
| 韓／中 | 《三國志·魏書·東夷傳》《舊唐書》《新唐書》《元史》《明史·朝鮮傳》 | `三國志/卷30`、`舊唐書/卷67,83,199上`、`新唐書/卷219,220`、`元史/卷208`、`明史/卷320` 全數 200 有全文 | 逐字可核（zh wikisource） |
| 韓國 | 《三國史記》（高句麗／新羅本紀、百濟前段、列傳） | `三國史記/卷05,18,22,27,41` 200 有全文（卷 18 實文為「浮屠順道」「立大學」） | 逐字可核（zh wikisource） |
| 韓國 | 《三國史記》卷 28（百濟本紀第六・660 年） | `三國史記/卷28` 實測為 **268 字空殼頁** | 通說整理，非逐字引文（改以《舊唐書·蘇定方傳》卷 83 核原文） |
| 韓國 | 《三國遺事》 | `zh.wikisource` 首頁 2.3 KB 序跋目錄、`卷第一` 5.5 KB；其餘分卷未完備 | 通說整理，非逐字引文（若引用須先實測該卷子頁） |
| 韓國 | 《高麗史》《高麗史節要》《東國通鑑》 | `高麗史/卷一,二,二十三`、`高麗史節要/卷一`、`東國通鑒/卷一` 200 有全文（維基文庫用「鑒」） | 逐字可核（zh wikisource） |
| 韓國 | 《朝鮮王朝實錄》《訓民正音》 | `朝鮮王朝實錄/太祖實錄/元年`（34 KB）、`世宗實錄/二十八年`（141 KB）、`宣祖實錄/二十五年`（211 KB）、`仁祖實錄/十四年`（87 KB）、`訓民正音`（8 KB）200 有全文；高宗／純宗總頁僅 1 KB 殼、世宗本註有缺漏 | 逐字可核（zh wikisource；須直指 `/<王名實錄>/<年次>`，`qsrc --cite` 不會自動拼年次） |
| 韓國 | 《亂中日記》《三峯集》／《獨立新聞》《朝鮮停戰協定》等近代文獻 | `亂中日記` 368 B、`三峯集` 354 B 皆殘殼；`en.wikisource:Korean War Armistice Agreement` 200 有 52 KB 全文但為英文；`Japan–Korea Treaty of 1910` 兩試名皆 404 | 通說整理，非逐字引文（韓／英檔案待多語工具） |
| 韓／越／馬 | 《明實錄》（太祖／太宗／神宗） | `明實錄/神宗顯皇帝實錄/卷一` 僅 277 字後斷尾；`大明文皇帝實錄/卷070` 等多卷 404 | 通說整理，非逐字引文（改以《明史》卷 320,324,325 補逐字） |
| 越南 | 《史記·南越列傳》《後漢書·馬援傳》《新五代史·南漢世家》《元史·安南傳》《清史稿·孫士毅傳》 | `史記/卷113`、`後漢書/卷24`、`新五代史/卷65`、`元史/卷209`、`清史稿/卷330` 全數 200 有全文 | 逐字可核（zh wikisource） |
| 越南 | 《大越史記全書》《欽定越史通鑑綱目》《平吳大誥》《遷都詔》 | `外紀卷之三,五`、`本紀卷之二,五,十`、`續編卷之五`、`綱目/前編/卷之一`、`綱目/正編/卷之二,四十七`、`平吳大誥`、`遷都詔` 全數 200 有全文 | 逐字可核（zh wikisource） |
| 越南 | 《大南實錄》（維基文庫作《大南寔錄》）、《嶺外代答》 | `大南寔錄/大南寔錄正編第一紀/卷01`（6.9 KB）、`嶺外代答/卷02`（6.1 KB）200 有全文；第一紀用 `卷01`、第二紀用 `卷001`，部分卷 404 | 部分可核（zh wikisource；須先驗該卷存在，404 則標通說整理） |
| 越南 | 《越南民主共和國建國文書》及 1954–86 年現代檔案 | `en.wikisource:Vietnamese Declaration of Independence` 200（6.4 KB 英文）；`vi.wikisource` 越文獨立宣言 404、`Geneva Accords (1954)` 404 | 通說整理，非逐字引文 |
| 泰國 | 《明史·暹羅傳》《瀛涯勝覽》 | `明史/卷324`（13.2 KB）、`瀛涯勝覽`（20.9 KB）200 有全文 | 逐字可核（zh wikisource） |
| 泰國 | 《滇略》（提示所問「欽定滇略?」） | `zh.wikisource` 查無《滇略》（404），且實為明謝肇淛私撰，非「欽定」 | **剔除**（確認不存在，不可引用） |
| 泰國 | 《蘭甘亨碑銘》《鮑林條約》《1909 英暹條約》《阿瑜陀耶編年》《清邁編年史》 | `th.wikisource:จารึกพ่อขุนรามคำแหง` 僅書目；`en.wikisource:Ram Khamhaeng Inscription` 與 `Bowring Treaty` 含 `<pages/>` 嵌頁標籤（`raw` 無正文）；《阿瑜陀耶編年》404；《1909 英暹條約》404 | 通說整理，非逐字引文（`th-1351` 可補引《明史·暹羅傳》） |
| 馬來西亞 | 《明史·滿剌加傳》《瀛涯勝覽》 | `明史/卷325`（12.8 KB）、`瀛涯勝覽` 200 有全文 | 逐字可核（zh wikisource） |
| 馬來西亞 | 《馬來紀年》（Sulalatus Salatin） | `ms.wikisource:Karya:Sulalatus Salatin` 僅 PDF 索引殼；`en.wikisource:Malay Annals/Chapter 1` 僅 342 B `<pages/>` 標籤；`zh.wikisource:馬來紀年` 404 | 通說整理，非逐字引文 |
| 馬來西亞 | 《英荷條約》（1824）、《1963 年馬來西亞協定》、《邦咯條約》（1874）、《戰史叢書》 | `en.wikisource:Anglo-Dutch Treaty of 1824`（10.6 KB）及 `Agreement relating to Malaysia...`（4.9 KB ＋ `:mul:` 馬來文版）200 有全文，但非漢文；`Pangkor Engagement`／`Proclamation of Malaysia` 404 | 通說整理，非逐字引文（待多語工具） |

## P0 佇列（本機代理今天可做，<=12 條）

☑ `src/countries/korea/koancientPack.ts:ko-m108`｜將 READINGS `quote` 改為《史記·朝鮮列傳》（`史記/卷115`）「以故遂定朝鮮，為四郡」逐字引文，移去「通說整理」並記帳本｜驗收=`python3 scripts/qsrc.py '史記/卷115' '為四郡' && node scripts/audit_quotes.mjs --mark 'src/countries/korea/koancientPack.ts#ko-m108' --page '史記/卷115' && node scripts/country_check.mjs src/countries/korea/koancientPack.ts`
☐ `src/countries/korea/koancientPack.ts:ko-372`｜將 READINGS `quote` 改為《三國史記·高句麗本紀》（`三國史記/卷18`）「秦王苻堅，遣使及浮屠順道，送佛像、經文……立大學」逐字引文，並修正 DETAILS／events／READINGS 誤寫之「順權→順道」｜驗收=`python3 scripts/qsrc.py '三國史記/卷18' '浮屠順道' && node scripts/audit_quotes.mjs --mark 'src/countries/korea/koancientPack.ts#ko-372' --page '三國史記/卷18' && node scripts/country_check.mjs src/countries/korea/koancientPack.ts`
☐ `src/countries/korea/koancientPack.ts:ko-660`｜將 READINGS `quote` 改為《舊唐書·蘇定方傳》（`舊唐書/卷83`）「定方自城山濟海，至熊津江口」逐字引文，並註明《三國史記/卷28》維基文庫缺頁｜驗收=`python3 scripts/qsrc.py '舊唐書/卷83' '熊津江口' && node scripts/audit_quotes.mjs --mark 'src/countries/korea/koancientPack.ts#ko-660' --page '舊唐書/卷83' && node scripts/country_check.mjs src/countries/korea/koancientPack.ts`
☐ `src/countries/korea/koancientPack.ts:ko-668`｜將 READINGS `quote` 改為《舊唐書·高麗傳》（`舊唐書/卷199上`）或《舊唐書·李勣傳》（`舊唐書/卷67`）平壤陷落逐字引文並記帳本｜驗收=`python3 scripts/qsrc.py '舊唐書/卷199上' '平壤' && node scripts/audit_quotes.mjs --mark 'src/countries/korea/koancientPack.ts#ko-668' --page '舊唐書/卷199上' && node scripts/country_check.mjs src/countries/korea/koancientPack.ts`
☐ `src/countries/korea/kojoseonPack.ts:ko-1392`｜將 READINGS `quote` 改為《朝鮮王朝實錄·太祖實錄》（`朝鮮王朝實錄/太祖實錄/元年`）「太祖卽位于壽昌宮」逐字引文並記帳本｜驗收=`python3 scripts/qsrc.py '朝鮮王朝實錄/太祖實錄/元年' '卽位于壽昌宮' && node scripts/audit_quotes.mjs --mark 'src/countries/korea/kojoseonPack.ts#ko-1392' --page '朝鮮王朝實錄/太祖實錄/元年' && node scripts/country_check.mjs src/countries/korea/kojoseonPack.ts`
☐ `src/countries/korea/komodernPack.ts:415`｜將 `leadersByYear` 第 415 行與 `fact()` 第 397 行之 `『朝鮮中央年鑑』` 統一改為《朝鮮中央年鑑》，並補齊 396/398/400 行之正式書名或機關名稱｜驗收=`node scripts/audit_quotes.mjs --stats && node scripts/country_check.mjs src/countries/korea/komodernPack.ts`
☐ `src/countries/vietnam/vnnorthPack.ts:vn-m111`｜將 READINGS `quote` 改為《史記·南越列傳》（`史記/卷113`）「衛尉路博德為伏波將軍，出桂陽」逐字引文並記帳本｜驗收=`python3 scripts/qsrc.py '史記/卷113' '路博德為伏波將軍' && node scripts/audit_quotes.mjs --mark 'src/countries/vietnam/vnnorthPack.ts#vn-m111' --page '史記/卷113' && node scripts/country_check.mjs src/countries/vietnam/vnnorthPack.ts`
☐ `src/countries/vietnam/vnnorthPack.ts:vn-40`｜將 READINGS `quote` 改為《後漢書·馬援列傳》（`後漢書/卷24`）「交阯女子徵側及女弟徵貳反」逐字引文並記帳本｜驗收=`python3 scripts/qsrc.py '後漢書/卷24' '徵側及女弟徵貳反' && node scripts/audit_quotes.mjs --mark 'src/countries/vietnam/vnnorthPack.ts#vn-40' --page '後漢書/卷24' && node scripts/country_check.mjs src/countries/vietnam/vnnorthPack.ts`
☐ `src/countries/vietnam/vnnorthPack.ts:vn-938`｜將 READINGS `quote` 改為《新五代史·南漢世家》（`新五代史/卷65`）「逆戰海口，植鐵橛海中」或《大越史記全書》外紀卷之五逐字引文並記帳本｜驗收=`python3 scripts/qsrc.py '新五代史/卷65' '植鐵橛海中' && node scripts/audit_quotes.mjs --mark 'src/countries/vietnam/vnnorthPack.ts#vn-938' --page '新五代史/卷65' && node scripts/country_check.mjs src/countries/vietnam/vnnorthPack.ts`
☐ `src/countries/vietnam/vndynastyPack.ts:vn-1010`｜修正 `events` 出處《欽定越史通鑑綱目》「前編」誤寫為「正編卷之二」，並將 READINGS `quote` 改為《遷都詔》或《欽定越史通鑑綱目》正編卷之二逐字引文｜驗收=`python3 scripts/qsrc.py '欽定越史通鑑綱目/正編/卷之二' '徙都昇龍城' && node scripts/audit_quotes.mjs --mark 'src/countries/vietnam/vndynastyPack.ts#vn-1010' --page '欽定越史通鑑綱目/正編/卷之二' && node scripts/country_check.mjs src/countries/vietnam/vndynastyPack.ts`
☐ `src/countries/vietnam/vndynastyPack.ts:vn-1789`｜修正 `events`/`READINGS` 出處《大越史記全書》「本紀」誤寫（全書本紀止於 1675 年），改標《大越史記全書》續編卷之五／《欽定越史通鑑綱目》正編卷之四十七／《清史稿·孫士毅傳》並補逐字引文｜驗收=`python3 scripts/qsrc.py '清史稿/卷330' '安南阮惠攻黎城' && node scripts/audit_quotes.mjs --mark 'src/countries/vietnam/vndynastyPack.ts#vn-1789' --page '清史稿/卷330' && node scripts/country_check.mjs src/countries/vietnam/vndynastyPack.ts`
☐ `src/countries/malaysia/mymalaccaPack.ts:my-1409`｜將 READINGS `quote` 改為《明史·滿剌加傳》（`明史/卷325`）「封為滿剌加國王，賜誥印」逐字引文（《明太宗實錄》維持通說參考）並記帳本｜驗收=`python3 scripts/qsrc.py '明史/卷325' '封為滿剌加國王' && node scripts/audit_quotes.mjs --mark 'src/countries/malaysia/mymalaccaPack.ts#my-1409' --page '明史/卷325' && node scripts/country_check.mjs src/countries/malaysia/mymalaccaPack.ts`

## P1 批次

每批 2–4 條，依檔案分組，對應本地小模型單輪上限：

- **韓國 `kogoryeoPack.ts`**（批 1，4 條）：`ko-676` 補《三國史記/卷07》或《新唐書/卷220》逐字引文；`ko-918` 補《高麗史/卷一》太祖即位句；`ko-1231` 補《高麗史/卷23》撒禮塔圍城句或《元史/卷208》；`ko-1388` 補《明史/卷320》李成桂回軍句。
- **韓國 `kojoseonPack.ts`**（批 2，3 條）：`ko-1446` 補《朝鮮王朝實錄/世宗實錄/二十八年》或《訓民正音》御製序；`ko-1592` 補《朝鮮王朝實錄/宣祖實錄/二十五年》壬辰四月句；`ko-1636` 補《朝鮮王朝實錄/仁祖實錄/十四年》南漢山城／丙子句。
- **越南 `vnnorthPack.ts`＋`vndynastyPack.ts`**（批 3，3 條）：`vnnorthPack:vn-968` 核《大越史記全書/本紀卷之一》丁先皇建號；`vndynastyPack:vn-1288` 核《大越史記全書/本紀卷之五》或《元史/卷209》；`vndynastyPack:vn-1428` 補《平吳大誥》首段逐字引文。
- **越南 `vnnguyenPack.ts`＋`vnmodernPack.ts`**（批 4，4 條）：`vnnguyenPack:vn-1802` 查《大南寔錄/大南寔錄正編第一紀/卷17,18` 存在性，可核則補引文、缺卷則明確維持通說；`vnnguyenPack`（`vn-1858,1884`）與 `vnmodernPack`（`vn-1954,1968,1975,1986`）清除「越南戰史」「越方第六次代表大會報告」等泛稱式《》，改實名文獻或去《》加註「檔案／官報」。
- **泰國 `thsukhothaiPack.ts`＋`thayutthayaPack.ts`＋`thchakriPack.ts`＋`thmodernPack.ts`**（批 5，每輪 3–4 條）：`thsukhothaiPack:th-1351` 補《明史/卷324》暹羅朝貢或正名記載為逐字引文；其餘三包逐一將《王室之紀錄》《暹羅官方文書》《當時之報章》《曼谷朝廷之編年》等泛稱式《》改為具體文獻名或去《》保留「通說整理，非逐字引文」。
- **馬來西亞 `mymalaccaPack.ts`＋`mycolonialPack.ts`＋`mymerdekaPack.ts`＋`mymodernPack.ts`**（批 6，每輪 3–4 條）：`mymalaccaPack:my-1400` 視情況補《明史/卷325》拜里米蘇剌句；`mymodernPack` 移除擬書名《宏願業以路為綱》並將《總理演說》《選舉委員會報告》改實名或去《》；`mymerdekaPack:my-1965` 修正「馬來亞聯邦議會紀錄」時代誤植為「馬來西亞國會紀錄」。
- **全四國 `leadersByYear`（176 筆）與 `koancientPack` 簡體清理**（批 7，分國 4 輪）：先檢查 `koancientPack:120,125` 疑似簡體「换来」「来」（若誤用即轉正體並驗 `audit:chars`）；另將 176 筆缺「通說」之 `leadersByYear` 依規則補「通說整理」或由 `audit_quotes` 分流，避免淹沒 `--todo`。

## 工具缺口（要雲端那層我來建）

1. **多語種 Wikisource 抓取與正規化輔助器（對等 `scripts/qsrc.py`）**
   - **輸入**：`--host <en|ko|vi|th|ms|wikisource.org>`、頁名或 URL、比對文字（支援英／越／馬／泰／韓及 `<pages/>` ProofreadPage 嵌頁）。
   - **輸出**：JSON `{status: 'ok'|'mismatch'|'absent'|'unresolved', page, matched, excerpt}`，並寫入獨立快取。當 `?action=raw` 僅回 `<pages .../>` 時，自動改抓 `action=parse&prop=text` 抽取正文，並依語系做空白／大小寫／變音符號正規化（突破 `qsrc.py` 目前 `[^一-鿿]` 只認漢字及 `朝鮮王朝實錄` 年次路徑不認的限制）。
   - **通過／失敗判準**：實測對 `en.wikisource`《英荷條約 1824》《馬來西亞協定 1963》《Korean War Armistice Agreement》及 `<pages/>` 頁《Bowring Treaty》能回傳非空正文並正確命中句段即通過；若遇 404／無正文頁必回 `absent`/`unresolved` 不靜默誤判。
2. **四國事件與資料欄位《》書名實名閘門（延伸 `scripts/audit_quotes.mjs`）**
   - **輸入**：`src/**/*.ts` 掃描列（含 `events`、`people`、`leadersByYear` 與 `fact()`，不限於有 `quote` 者）。
   - **輸出**：違規清單（缺《》且無「通說」標記者、誤用 `『』` 標書名者、以及命中《當時報章》《官方文書》《王室之紀錄》《宏願業以路為綱》等泛稱黑名單之條目）。
   - **通過／失敗判準**：`error === 0` 且黑名單命中為 0 始通過；僅泛稱出現在 `source` 而不包《》者列 `info` 或放行。
3. **「通說整理，非逐字引文」口徑與偽意譯檢查器**
   - **輸入**：`src/countries/**/*Pack.ts` 之 `READINGS`、`events` 及可核對典籍白名單（`zh.wikisource` 已驗證清單）。
   - **輸出**：兩類清單——(A) 無逐字原文卻未標「通說整理，非逐字引文」或留有引號偽原文者；(B) 雖標「通說整理」但 `source` 所引即在可核白名單內（如《史記》《後漢書》《三國史記》非卷 28、《大越史記全書》《明史》）之應升級逐字清單。
   - **通過／失敗判準**：(A) 須嚴格為 0；(B) 作為 `accuracy` 四國追蹤進度條（逐輪遞減至 0）。

## 禁止事項

- **禁止編造引文或虛構頁名**：未實測成功之《滇略》、空殼 `三國史記/卷28`、《明實錄》缺卷及 404 外文條約，一律不得假稱「可逐字查證」。
- **禁止留存無聲明之假引文**：凡未經 `scripts/qsrc.py`（或日後多語工具）回傳「匹配 ≥ 1 處」者，`quote` 與 `source` 必須保留／標明「通說整理，非逐字引文」。
- **史料題名一律用《》**：禁止以『』代《》（如 `『朝鮮中央年鑑』`），亦禁止將「當時報章」「官方文書」「戰史」等泛稱包入《》。
- **禁止簡體字**：改寫任何欄位後必核對 `audit:chars` 與 `audit:quotes` 皆 0 錯誤（漏網的簡體異體一律以 `audit:chars` 為準，不要靠自己記憶判形）
- **禁止改動中國／日本既有帳本**：不得手改 `scripts/quote-audit-ledger.json` 或重蓋既有中國／日本條目；記帳一律用 `node scripts/audit_quotes.mjs --mark '<檔案>#<key>' --page=<頁名>`。
