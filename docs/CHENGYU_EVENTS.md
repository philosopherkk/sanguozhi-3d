# task_0020：成語→事件接駁（20 條 eraLink=year）

狀態：WIP。第一原則：「查唔到就唔好加」。本檔逐條記錄（成語→新事件 id→source）與跳過原因，
最終報告與此一致。

## 基線（開工前，origin/main = 6716da9）

| 閘門 | 基線值 |
|---|---|
| `audit:chengyu-coverage` noEventLink | 50（91 條中 45 條 kind=year） |
| `audit:event-depth` 缺口 | 255（起因 82／經過 121／結果 52），段落 791 |
| `audit:data` | fail 0｜warn 49 |
| `audit:chars` | 硬傷 0 |
| `audit:quotes` | 錯誤 2｜提醒 45 |
| `audit:chengyu` | fail 0｜warn 4 |
| `audit:detail-depth` | 詳情 44 條／缺口 0 |

## 20 條佇列與初判（kind=year，實測自 idioms.json）

| # | 成語 id | 詞語 | eraLink.year | 擬接事件（一手出處） | 初判 |
|---|---|---|---|---|---|
| 1 | cn-chengyu-duoxingbuyi | 多行不義必自斃 | -722 | 《左傳·隱公元年》鄭伯克段于鄢 | 可查證 |
| 2 | cn-chengyu-congshanruliu | 從善如流 | -583 | 《左傳·成公八年》 | 待核 |
| 3 | cn-chengyu-juangansiwei | 居安思危 | -562 | 《左傳·襄公十一年》 | 待核 |
| 4 | cn-chengyu-weidadiaobudiao | 尾大不掉 | -531 | 《左傳·昭公十一年》 | 待核 |
| 5 | cn-chengyu-danguanxiangqing | 彈冠相慶 | -48 | 《漢書·王吉傳》 | 待核 |
| 6 | cn-chengyu-qutuxixin | 曲突徙薪 | -67 | 《漢書·霍光傳》 | 待核 |
| 7 | cn-chengyu-zhongliujiyi | 中流擊楫 | 313 | 《晉書·祖逖傳》 | 待核 |
| 8 | cn-chengyu-huatingheli | 華亭鶴唳 | 303 | 《晉書·陸機傳》 | 待核 |
| 9 | cn-chengyu-yishiweijing | 以史為鏡 | 643 | 《貞觀政要》／《舊唐書·魏徵傳》 | 待核 |
| 10 | cn-chengyu-sanjiandingtianshan | 三箭定天山 | 662 | 《舊唐書·薛仁貴傳》 | 待核 |
| 11 | cn-chengyu-wanlichangcheng | 萬里長城 | 436 | 《宋書·檀道濟傳》 | 待核 |
| 12 | cn-chengyu-wudouzhewao | 不為五斗米折腰 | 405 | 《晉書·陶潛傳》 | 待核 |
| 13 | cn-chengyu-huanglongtongyin | 黃龍痛飲 | 1140 | 《宋史·岳飛傳》 | 待核 |
| 14 | cn-chengyu-huangpaojiashen | 黃袍加身 | 960 | 《宋史·太祖本紀》 | 待核 |
| 15 | cn-chengyu-huadijiaozi | 畫荻教子 | 1010 | 《歐陽修全集》附年譜／《宋史·歐陽修傳》 | 待核 |
| 16 | jp-chengyu-katashimoyohibitowosaku | 堅石も醉人を避く | 712 | 《日本書紀》 | 待核 |
| 17 | jp-chengyu-shiranugahotoke | 知らぬが仏 | 1638 | — | 待核 |
| 18 | jp-chengyu-momokurisannen | 桃栗三年柿八年 | 1674 | — | 待核 |
| 19 | jp-chengyu-ishibashi | 石橋を叩いて渡る | 1786 | — | 待核 |
| 20 | jp-chengyu-gadeninsui | 我田引水 | 1899 | — | 待核 |

## 本輪結果（2026-11-10，PR #128）

做 5 條（每條：成語 → 新事件 id → 主 source）：

| 成語 | 新事件 id | 年 | 主 source（引文已逐字比對） |
|---|---|---|---|
| 多行不義必自斃 | `keduan` | -722 | 《左傳·隱公元年》（zh.wikisource 春秋左氏傳/隱公） |
| 從善如流 | `jin-wenyang` | -583 | 《左傳·成公八年》（同上／成公） |
| 居安思危 | `jin-xiaoyu` | -562 | 《左傳·襄公十一年》（同上／襄公） |
| 尾大不掉 | `chu-chencai` | -531 | 《左傳·昭公十一年》（同上／昭公） |
| 彈冠相慶 | `zheng-gongyu` | -48 | 《漢書·王貢兩龔鮑傳》卷七十二（漢書/卷072）；年份依《資治通鑑》卷二十八 |

新檔：`src/zhou/data/chengyuBridge.ts`（掛入 `ZHOU_TIMELINE`）、
`src/qinhan/data/chengyuBridge.ts`（掛入 `QINHAN_TIMELINE`）。四條引文加註 quote
ledger（`npm run audit:quotes`：已查證 119 → 124）。

閘門（本輪末）：coverage noEventLink 50 → 45；event-depth 缺口 255 → 255
（段落 791 → 806，新增 15 段全達標）；reading-layers 0；detail-depth 0；
quotes 錯誤 2、提醒 45（皆不變）；chars 硬傷 0；data fail 0、warn 49；
wiki-links 死鏈 10、未驗 0；chengyu fail 0；wiring 0；map 0；ranges warn 179；
war-shape 291／1；`tsc -b` 通過。

## 需人工判斷清單（15 條，本輪未動，保留 kind=year）

### A. 一手出處可查，但「成語年份」與史書紀年不合（須人工定年）

| 成語 | 現 year | 問題 |
|---|---|---|
| 曲突徙薪 | -67 | 引文在《漢書》卷六十八《霍光傳》，已逐字取得；但傳文記徐福上書以「初」字追述，不給年份，「曲突徙薪」之喻出在「其後霍氏誅滅」之後（霍氏誅在地節四年，前66）。前67 無傳文明文支撐。取前66、抑或維持前67 而以霍光卒後霍氏驕奢為本事，須人工定。 |
| 三箭定天山 | 662 | 尚未逐字查證：《舊唐書·薛仁貴傳》系記其事，《資治通鑑》所繫之年是否 661（龍朔元年）而非 662，須先查通鑑該卷的紀年標題；若為 661，成語年份要改。 |
| 以史為鏡 | 643 | 尚未逐字查證：643（貞觀十七年）魏徵卒、太宗「失一鏡」之語是一事；另有「以銅為鏡」一組語見於《貞觀政要》他章（章名與年份待核）。而成語作「以史為鏡」，與傳世本文用字有異。事件主體與出文是否同年，須人工定。 |
| 畫荻教子 | 1010 | 事見歐陽修述母鄭氏（《瀧岡阡表》一系），是幼年教養之記，非可繫年之事；1010 屬推定。建議不補事件條，或改繫歐陽修生平可考之年。 |

### B. 一手出處可查，但 era pack 結構要人工決定

| 成語 | 現 year | 問題 |
|---|---|---|
| 中流擊楫 | 313 | 《晉書·祖逖傳》可用；但 313 落在 jinPack（280–316）末端，且 imperial 包的深度走 `depth.ts` 的 `ev()` helper——該 helper 把 `course` 與 `classicQuote` 都填成 `desc`，正是 `depthNarrative.ts` 要修補的舊形態。新條目要走 `ev()`＋`DEPTH_NARRATIVE`，還是直寫完整物件，屬結構決定。 |
| 華亭鶴唳 | 303 | 同上（《晉書·陸機傳》），303 在 jinPack 年內。 |
| 不為五斗米折腰 | 405 | 《晉書·陶潛傳》可用，但 405 在 jinPack（≤316）與 nanbeiPack 起年之間，掛哪一包（或擴 pack 年距）須人工定。 |
| 萬里長城 | 436 | 本事出《宋書·檀道濟傳》，而本專案紀律（`audit:data` 規則）不准《宋書》列為主 source；要改以《資治通鑑》元嘉十二年為主、《宋書》入 note 標「後代史回溯」。此替換是否可接受，須人工准。 |
| 黃袍加身 | 960 | 《宋史·太祖本紀》紀年明確、可補；同屬 B 類的 pack 結構決定（liaosongPack）。 |
| 黃龍痛飲 | 1140 | 《宋史·岳飛傳》系可用；但其語之史源（岳珂《金佗稡編》一系家族文獻與《宋史》本傳的關係）尚未核，且該役敘事的可靠性有研究爭議。要標文獻性質與爭議，是否納入須人工准。 |

### C. 諺語類日本條：年份是「詞語最早見」而非可繫年之事（本輪一律不加）

`jp-chengyu-shiranugahotoke`（1638）、`jp-chengyu-momokurisannen`（1674）、
`jp-chengyu-ishibashi`（1786）、`jp-chengyu-gadeninsui`（1899）、
`jp-chengyu-katashimoyohibitowosaku`（712）。

這五條的 eraLink.year 是詞語用例之年，不是事件之年。要接 event，只能挑同時代另有
一手出處的事件充作「時代座標」（例如 1638 → 島原・天草一揆終結、712 → 《古事記》
献上），那是牽連而非成語本事。本專案確有「以時代脈絡作 eraLink」的先例（見
`cn-chengyu-koumifujian` 之 note），但那類是史事成語，此五條是俗諺，性質不同。
是否沿用該先例，屬廣度決定，本輪未動，請主線裁可。

## 其他（不是事件、但查到的問題）

`cn-chengyu-duoxingbuyi` 的 note 寫「至是年七月『鄭伯克段于鄢』」，而《左傳》隱公元
年傳文作「五月辛丑，大叔出奔共」；「七月」或涉夏時／周正之別，未有定說，本輪未改，
留主線判斷。
