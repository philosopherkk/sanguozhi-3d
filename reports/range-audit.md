# 疆域快照出處稽核（range-audit）

由 `npm run audit:ranges` 產生。範圍：九個帝國包、周、秦漢的**疆域快照**（不含事件與人物）。
只讀稽核，**沒有改動任何座標或幾何**。

**產生時間：** 2026-11-07T12:10:25.756Z

## 摘要

| 級別 | 數量 |
|------|------|
| fail | 19 |
| warn | 224 |
| info | 33 |

快照總數：89（12 個包）

### fail 按 code

- `geometry-reuse-undeclared`: 19

### warn 按 code

- `anachronism`: 4
- `faction-undeclared`: 1
- `jp-event-note-missing`: 12
- `note-thin`: 13
- `source-format`: 10
- `source-generic`: 168
- `source-wiki-only`: 14
- `university-thin`: 2

## 規則

1. 每張快照要有非空 `source`（含《書名》）與 `note`；`disputed: true` 要有 `note`。
2. 色塊引用的環編號要存在於 `src/geo/eraRegions.ts`；找不到環要報 `empty-range`。
3. 快照年份要在該包 `yearMin–yearMax` 之內，並按年升序（`resolveImperialSnapshot` 靠升序提前中斷）。
4. 政權不得早於其建立年著色（`ANACHRONISM` 表）。
5. 都護府、羈縻州、朝貢國、草原與青藏等非編戶地帶（`NON_DIRECT_IDS`）不得塗成正統王朝的直轄色塊，除非該快照標 `disputed` 並在 `note` 講明限度。
6. 兩張相鄰快照的幾何完全相同時，後一張要有 `geometryFrom`，說明沿用邊一年。
11. 秦漢逐月（`src/qinhan/data/monthAxis.ts`）：每條要有 `source`（含《書名》）與 `note`；月份要在該年的歷書順序內（秦及漢初以十月為歲首）；`territoryFrom` 只能引用 `territoryControl.ts` 已有的快照年 —— 月份不能新畫邊界。
12. 閏月要有史書稱法的出處（秦漢曆作「後九月」）。沒有專條的月份一律顯示「本月無專條」。
13. 日本外周時間窗（`src/geo/japanFringeWindows.ts`）：每窗要有出處（《》或『』）與 note、環要存在、`from ≤ to`；附庸／外來施政必須虛線，行政直轄必須實色；同一環的窗不得重疊。
14. 敘事深度（`src/imperial/data/depthNarrative.ts`）：每條 `DEPTH_EVENTS` 事件要有獨立的 `course`／`outcome`／意譯，三者不得與 `desc` 相同（否則詳情窗重複同一句）；大學層少於 150 字要報 `university-thin`。
15. 日本年表（`src/japanHistory/data/timeline.json`）：每條要有 `source`（書名、條約名、制書名或通說）與 `desc`；1603 年以後的條目另要有 `note`，寫明年份與史源的限度。
16. 出處要點名：各包的快照、事件、派系簡介（讀 `politics.source` 等子欄）、逐年人物、行軍路線，`source` 要含《》或『』裡的書名、條約名、制書名或檔案名。只有「××通說」報 `source-generic`；只有百科全書（維基／Wikipedia）報 `source-wiki-only`。通說可以並列，不能是唯一出處。覆蓋：帝國 11 包＋japanEras 6 包。
17. 幾何出處登記：色塊引用的每一條環編號都要在 `src/data/territory/ringProvenance.ts`（由 `scripts/gen_ring_provenance.py` 產生）有登記：實際代表什麼（basis）、點名依據（source）、所假定的政區制度（institution）、等級（kind：modern-province-proxy／text-derived／schematic-box／plate-traced／gis-import）。找不到登記報 `ring-unregistered`。
18. 環依據要點名：登記裡的 source 若是「未登記」，報 `ring-source-generic`。
19. 制度時代檢查：環若假定某一政區制度（縣、郡、州、道、路、省、羈縻），該快照年份不得早於該制度最早可考的年份（縣 前688《史記·秦本紀》；郡 前400；州 前106《漢書·武帝紀》；道 627《舊唐書·地理志》；路 983《宋史·職官志》；省 1260《元史·百官志》；羈縻 630）。違反報 `institution-anachronism`。
20. 座標校正與環體檢另由 `python3 scripts/audit_geo.py`（`npm run audit:geo`）跑：20 個海岸／內陸錨點要落在正確的海陸上；印出底圖可畫範圍；ERA_RINGS 每條環的形心必須在陸地上（落在海裡代表多邊形吃進海裡）。
7. 色塊裡的勢力要在該包 `factions` 有顏色。

## 各包快照覆蓋

| 包 | 年份範圍 | 自帶快照 | 需沿用的年份 | 覆蓋率 |
|----|----------|----------|--------------|--------|
| jin | 280–316 | 4 | 33 | 10.8% |
| nanbei | 304–589 | 7 | 279 | 2.4% |
| sui | 581–618 | 3 | 35 | 7.9% |
| tang | 618–907 | 6 | 284 | 2.1% |
| wudai | 907–960 | 5 | 49 | 9.3% |
| liaosong | 960–1279 | 5 | 315 | 1.6% |
| yuanmingqing | 1271–1911 | 9 | 632 | 1.4% |
| minguo | 1912–1949 | 6 | 32 | 15.8% |
| civilwar | 1945–1949 | 14 | -9 | 280.0% |
| prc | 1949–2026 | 7 | 71 | 9.0% |
| zhou | -2070–-221 | 15 | 1835 | 0.8% |
| qinhan | -221–183 | 8 | 397 | 2.0% |

「需沿用的年份」是滑桿上會顯示「本年無新的疆域記載，沿用……」的年數。
介面提示由 `src/lib/snapshotCarryOver.ts` 產生，接在秦漢、周、帝國包的年份滑桿下面。

## fail 明細

- **geometry-reuse-undeclared** · `jin[3] 316「西晉亡」` — 與 311 年快照幾何完全相同，卻沒有標 geometryFrom: 311（或更早、幾何相同的一年）；要縮小範圍，或註明沿用
- **geometry-reuse-undeclared** · `liaosong[3] 1141「紹興和議後」` — 與 1127 年快照幾何完全相同，卻沒有標 geometryFrom: 1127（或更早、幾何相同的一年）；要縮小範圍，或註明沿用
- **geometry-reuse-undeclared** · `yuanmingqing[6] 1750「清盛」` — 與 1668 年快照幾何完全相同，卻沒有標 geometryFrom: 1668（或更早、幾何相同的一年）；要縮小範圍，或註明沿用
- **geometry-reuse-undeclared** · `yuanmingqing[7] 1860「第二次鴉片戰爭後」` — 與 1750 年快照幾何完全相同，卻沒有標 geometryFrom: 1750（或更早、幾何相同的一年）；要縮小範圍，或註明沿用
- **geometry-reuse-undeclared** · `yuanmingqing[8] 1911「辛亥革命」` — 與 1860 年快照幾何完全相同，卻沒有標 geometryFrom: 1860（或更早、幾何相同的一年）；要縮小範圍，或註明沿用
- **geometry-reuse-undeclared** · `prc[1] 1951「西藏與海南」` — 與 1949 年快照幾何完全相同，卻沒有標 geometryFrom: 1949（或更早、幾何相同的一年）；要縮小範圍，或註明沿用
- **geometry-reuse-undeclared** · `prc[2] 1962「中印邊境戰爭」` — 與 1951 年快照幾何完全相同，卻沒有標 geometryFrom: 1951（或更早、幾何相同的一年）；要縮小範圍，或註明沿用
- **geometry-reuse-undeclared** · `prc[3] 1978「改革開放起點」` — 與 1962 年快照幾何完全相同，卻沒有標 geometryFrom: 1962（或更早、幾何相同的一年）；要縮小範圍，或註明沿用
- **geometry-reuse-undeclared** · `prc[4] 1979「中越戰爭」` — 與 1978 年快照幾何完全相同，卻沒有標 geometryFrom: 1978（或更早、幾何相同的一年）；要縮小範圍，或註明沿用
- **geometry-reuse-undeclared** · `prc[5] 1997「香港回歸」` — 與 1979 年快照幾何完全相同，卻沒有標 geometryFrom: 1979（或更早、幾何相同的一年）；要縮小範圍，或註明沿用
- **geometry-reuse-undeclared** · `prc[6] 2026「當代」` — 與 1997 年快照幾何完全相同，卻沒有標 geometryFrom: 1997（或更早、幾何相同的一年）；要縮小範圍，或註明沿用
- **geometry-reuse-undeclared** · `zhou[8] -333「楚取故吳」` — 與 -386 年快照幾何完全相同，卻沒有標 geometryFrom: -386（或更早、幾何相同的一年）；要縮小範圍，或註明沿用
- **geometry-reuse-undeclared** · `zhou[9] -316「秦滅巴蜀」` — 與 -333 年快照幾何完全相同，卻沒有標 geometryFrom: -333（或更早、幾何相同的一年）；要縮小範圍，或註明沿用
- **geometry-reuse-undeclared** · `zhou[10] -312「秦取漢中」` — 與 -316 年快照幾何完全相同，卻沒有標 geometryFrom: -316（或更早、幾何相同的一年）；要縮小範圍，或註明沿用
- **geometry-reuse-undeclared** · `zhou[11] -278「拔郢」` — 與 -312 年快照幾何完全相同，卻沒有標 geometryFrom: -312（或更早、幾何相同的一年）；要縮小範圍，或註明沿用
- **geometry-reuse-undeclared** · `zhou[12] -260「長平」` — 與 -278 年快照幾何完全相同，卻沒有標 geometryFrom: -278（或更早、幾何相同的一年）；要縮小範圍，或註明沿用
- **geometry-reuse-undeclared** · `qinhan[1] -214「略取嶺南」` — 與 -221 年快照幾何完全相同，卻沒有標 geometryFrom: -221（或更早、幾何相同的一年）；要縮小範圍，或註明沿用
- **geometry-reuse-undeclared** · `qinhan[4] -111「西漢盛時」` — 與 -202 年快照幾何完全相同，卻沒有標 geometryFrom: -202（或更早、幾何相同的一年）；要縮小範圍，或註明沿用
- **geometry-reuse-undeclared** · `qinhan[7] 36「東漢定隴蜀」` — 與 25 年快照幾何完全相同，卻沒有標 geometryFrom: 25（或更早、幾何相同的一年）；要縮小範圍，或註明沿用


## warn 明細

- **anachronism** · `nanbei[1] 317「東晉、後趙」 · 後趙` — 317 年尚未有「後趙」這個政權號（最早 319 年）
- **anachronism** · `nanbei[5] 534「東西魏、梁」 · 西魏` — 534 年尚未有「西魏」這個政權號（最早 535 年）
- **note-thin** · `sui[0] 581「楊堅代周」` — note 少於 40 字，未能交代範圍與出處的限度（37 字）
- **note-thin** · `sui[1] 589「滅陳一統」` — note 少於 40 字，未能交代範圍與出處的限度（38 字）
- **anachronism** · `liaosong[0] 960「北宋初」 · 西夏` — 960 年尚未有「西夏」這個政權號（最早 1038 年）
- **anachronism** · `liaosong[1] 1004「澶淵前後」 · 西夏` — 1004 年尚未有「西夏」這個政權號（最早 1038 年）
- **faction-undeclared** · `yuanmingqing[0] 1271「元朝」 · 宋` — 該勢力不在 pack.factions，圖例與顏色會缺漏
- **source-format** · `yuanmingqing[6] 1750「清盛」` — source 未含《書名》：清史通說
- **source-format** · `yuanmingqing[7] 1860「第二次鴉片戰爭後」` — source 未含《書名》：近代史通說
- **source-format** · `yuanmingqing[8] 1911「辛亥革命」` — source 未含《書名》：近代史通說
- **note-thin** · `civilwar[0] 1945-08「1945年8月」` — note 少於 40 字，未能交代範圍與出處的限度（21 字）
- **source-format** · `prc[0] 1949「成立」` — source 未含《書名》：當代史通說
- **source-format** · `prc[1] 1951「西藏與海南」` — source 未含《書名》：當代史通說
- **source-format** · `prc[2] 1962「中印邊境戰爭」` — source 未含《書名》：當代史通說
- **source-format** · `prc[3] 1978「改革開放起點」` — source 未含《書名》：當代史通說
- **source-format** · `prc[4] 1979「中越戰爭」` — source 未含《書名》：當代史通說
- **source-format** · `prc[5] 1997「香港回歸」` — source 未含《書名》：當代史通說
- **source-format** · `prc[6] 2026「當代」` — source 未含《書名》：時間線下界
- **note-thin** · `zhou[5] -473「越滅吳」` — note 少於 40 字，未能交代範圍與出處的限度（37 字）
- **note-thin** · `zhou[7] -386「田齊」` — note 少於 40 字，未能交代範圍與出處的限度（31 字）
- **note-thin** · `zhou[9] -316「秦滅巴蜀」` — note 少於 40 字，未能交代範圍與出處的限度（26 字）
- **note-thin** · `zhou[10] -312「秦取漢中」` — note 少於 40 字，未能交代範圍與出處的限度（34 字）
- **note-thin** · `zhou[11] -278「拔郢」` — note 少於 40 字，未能交代範圍與出處的限度（29 字）
- **note-thin** · `zhou[12] -260「長平」` — note 少於 40 字，未能交代範圍與出處的限度（34 字）
- **note-thin** · `zhou[13] -249「秦滅東周」` — note 少於 40 字，未能交代範圍與出處的限度（33 字）
- **note-thin** · `zhou[14] -221「秦統一」` — note 少於 40 字，未能交代範圍與出處的限度（36 字）
- **note-thin** · `qinhan[3] -202「西漢初」` — note 少於 40 字，未能交代範圍與出處的限度（36 字）
- **note-thin** · `qinhan[5] 9「新莽」` — note 少於 40 字，未能交代範圍與出處的限度（36 字）
- **university-thin** · `tang/tang-756-luoyang（756 安史陷洛陽）` — 大學層只有 31 字，未交代史源與地圖限度
- **university-thin** · `tang/tang-759-luoyang（759 史思明再陷洛陽）` — 大學層只有 23 字，未交代史源與地圖限度
- **jp-event-note-missing** · `japan/jp-1603-edo（1603 德川家康開幕府）` — 德川江戶以後的條目缺少 note（年份與史源的限度）
- **jp-event-note-missing** · `japan/jp-1615-osaka（1615 大坂之陣）` — 德川江戶以後的條目缺少 note（年份與史源的限度）
- **jp-event-note-missing** · `japan/jp-1789-kunashiri-menashi（1789 クナシリ・メナシの戦い）` — 德川江戶以後的條目缺少 note（年份與史源的限度）
- **jp-event-note-missing** · `japan/jp-1853-kurofune（1853 培理來航）` — 德川江戶以後的條目缺少 note（年份與史源的限度）
- **jp-event-note-missing** · `japan/jp-1895-shimonoseki（1895 甲午戰爭結束）` — 德川江戶以後的條目缺少 note（年份與史源的限度）
- **jp-event-note-missing** · `japan/jp-1905-portsmouth（1905 日俄戰爭結束）` — 德川江戶以後的條目缺少 note（年份與史源的限度）
- **jp-event-note-missing** · `japan/jp-1941-pacific（1941 太平洋戰爭爆發）` — 德川江戶以後的條目缺少 note（年份與史源的限度）
- **jp-event-note-missing** · `japan/jp-1947-kenpo（1947 日本國憲法施行）` — 德川江戶以後的條目缺少 note（年份與史源的限度）
- **jp-event-note-missing** · `japan/jp-1949-bound（1949 本專題下界）` — 德川江戶以後的條目缺少 note（年份與史源的限度）
- **jp-event-note-missing** · `japan/jp-1972-okinawa（1972 沖繩施政權歸還）` — 德川江戶以後的條目缺少 note（年份與史源的限度）
- **jp-event-note-missing** · `japan/jp-1989-heisei（1989 平成改元）` — 德川江戶以後的條目缺少 note（年份與史源的限度）
- **jp-event-note-missing** · `japan/jp-2019-reiwa（2019 令和改元）` — 德川江戶以後的條目缺少 note（年份與史源的限度）
- **source-generic** · `yuanmingqing 快照 1750` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：清史通說
- **source-generic** · `yuanmingqing 快照 1860` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `yuanmingqing 快照 1911` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `yuanmingqing 派系簡介 清` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：清史通說
- **source-generic** · `yuanmingqing 派系簡介 農民軍` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：明史通說
- **source-generic** · `yuanmingqing 派系簡介 列強` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `yuanmingqing 人物 1644 福臨` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：清史通說
- **source-generic** · `yuanmingqing 人物 1644 李自成` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：明史通說
- **source-generic** · `yuanmingqing 人物 1840 旻寧` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：清史通說
- **source-generic** · `yuanmingqing 人物 1911 溥儀` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo/mg-1936（1936 西安事變）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說；西安事變研究通說
- **source-generic** · `minguo/mg-1934（1934 中央紅軍長征）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說；長征研究通說
- **source-generic** · `minguo/mg-1927（1927 國共分裂，南昌起義）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說；國共關係研究通說
- **source-generic** · `minguo/mg-1941（1941 對日英美正式宣戰）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說；抗日戰爭研究通說
- **source-generic** · `minguo/mg-1949-taiwan（1949 國民政府遷台，海峽分離格局成形）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說；兩岸關係研究通說
- **source-generic** · `minguo/mg-1949-crossing（1949 渡江戰役，南京易手）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說；內戰史研究通說
- **source-generic** · `minguo/mg-1949-pingjin（1949 平津戰役與北平易手）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說；內戰史研究通說
- **source-generic** · `minguo/mg-1948-huaihai（1948 淮海戰役）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說；內戰史研究通說
- **source-generic** · `minguo/mg-1948-liaoshen（1948 遼瀋戰役）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說；內戰史研究通說
- **source-generic** · `minguo/mg-1946（1946 內戰全面爆發）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說；內戰史研究通說
- **source-generic** · `minguo/mg-1945-talks（1945 重慶談判與雙十協定）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說；國共關係研究通說
- **source-generic** · `minguo 派系簡介 北洋` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 派系簡介 皖系` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 派系簡介 直系` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 派系簡介 奉系` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 派系簡介 晉系` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 派系簡介 西北軍` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 派系簡介 桂系` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 派系簡介 滇系` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 派系簡介 粵系` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 派系簡介 川系` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 派系簡介 新疆地方` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 派系簡介 國民黨` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 派系簡介 日軍` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 派系簡介 日本` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 派系簡介 盛世才` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 派系簡介 噶厦` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 派系簡介 共產黨` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 人物 1912 袁世凱` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 人物 1912 閻錫山` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 人物 1912 蔡鍔` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 人物 1912 胡漢民` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 人物 1916 段祺瑞` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 人物 1916 馮國璋` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 人物 1916 張作霖` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 人物 1916 唐繼堯` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 人物 1916 陸榮廷` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 人物 1922 吳佩孚` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 人物 1922 張作霖` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 人物 1922 盧永祥` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 人物 1922 閻錫山` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 人物 1922 孫中山` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 人物 1928 蔣介石` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 人物 1928 馮玉祥` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 人物 1928 閻錫山` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 人物 1928 李宗仁` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 人物 1928 張學良` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 人物 1937 蔣介石` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 人物 1937 毛澤東` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 人物 1937 閻錫山` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 人物 1937 李宗仁` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 人物 1937 龍雲` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 人物 1937 劉湘` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 人物 1937 盛世才` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `minguo 人物 1937 噶厦` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：近代史通說
- **source-generic** · `civilwar/cw-1948-09（1948 濟南戰役與遼沈戰役開始）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：濟南戰役、遼沈戰役戰史；殲敵數有異說
- **source-generic** · `civilwar/cw-1948-11b（1948 平津戰役開始）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：平津戰役戰史；傅作義部改編協議（1949年1月）
- **source-generic** · `civilwar/cw-1949-12（1949 西南戰役結束：重慶、成都、雲南）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：西南戰役戰史；盧漢起義通電（1949年12月9日）
- **source-generic** · `civilwar/cw-c-zjkg-194508（1945 張家口易手）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：朱德1945年8月命令
- **source-generic** · `civilwar/cw-c-sy-194603（1946 瀋陽易手）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：東北行營檔案
- **source-generic** · `civilwar/cw-c-jz-194603（1946 錦州易手）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：東北行營檔案
- **source-generic** · `civilwar/cw-c-heb-194604（1946 哈爾濱易手）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：東北戰事（1946年4月）
- **source-generic** · `civilwar/cw-c-cc-194605（1946 長春易手）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：東北戰事（1946年5月）
- **source-generic** · `civilwar/cw-c-yanan-194703（1947 延安易手）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：胡宗南部戰報（1947年3月）
- **source-generic** · `civilwar/cw-c-jn-194809（1948 濟南易手）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：濟南戰役戰史
- **source-generic** · `civilwar/cw-c-cc-194810（1948 長春易手）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：長春圍城戰（1948年5–10月）
- **source-generic** · `civilwar/cw-c-jz-194810（1948 錦州易手）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：遼沈戰役戰史
- **source-generic** · `civilwar/cw-c-kf-194810（1948 開封易手）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：豫東戰役、開封戰役
- **source-generic** · `civilwar/cw-c-zjkg-194812（1948 張家口易手）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：平津戰役戰史
- **source-generic** · `civilwar/cw-c-xz-194901（1949 徐州易手）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：淮海戰役戰史
- **source-generic** · `civilwar/cw-c-tj-194901（1949 天津易手）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：平津戰役戰史
- **source-generic** · `civilwar/cw-c-bp-194901（1949 北平易手）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：傅作義部改編協議（1949年1月21日）
- **source-generic** · `civilwar/cw-c-ty-194904（1949 太原易手）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：太原戰役戰史
- **source-generic** · `civilwar/cw-c-hz-194905（1949 杭州易手）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：京滬杭戰役
- **source-generic** · `civilwar/cw-c-wh-194905（1949 武漢易手）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：武漢戰事（1949年5月）
- **source-generic** · `civilwar/cw-c-xa-194905（1949 西安易手）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：第一野戰軍西進
- **source-generic** · `civilwar/cw-c-lz-194908（1949 蘭州易手）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：蘭州戰役戰史
- **source-generic** · `civilwar/cw-c-fz-194908（1949 福州易手）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：閩贛戰役
- **source-generic** · `civilwar/cw-c-xg-194909（1949 西寧易手）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：青海戰事
- **source-generic** · `civilwar/cw-c-yc-194909（1949 銀川易手）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：寧夏戰役
- **source-generic** · `civilwar/cw-c-dh-194909（1949 迪化（烏魯木齊）易手）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：陶峙岳、包爾漢通電（1949年9月）
- **source-generic** · `civilwar/cw-c-gz-194910（1949 廣州易手）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：廣東戰事
- **source-generic** · `civilwar/cw-c-xm-194910（1949 廈門易手）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：閩南戰事；古寧頭戰役
- **source-generic** · `civilwar/cw-c-gy-194911（1949 貴陽易手）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：西南戰役
- **source-generic** · `civilwar/cw-c-cq-194911（1949 重慶易手）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：西南戰役
- **source-generic** · `civilwar/cw-c-nn-194912（1949 南寧易手）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：廣西戰役
- **source-generic** · `civilwar/cw-c-km-194912（1949 昆明易手）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：盧漢起義通電
- **source-generic** · `civilwar/cw-c-cd-194912（1949 成都易手）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：西南戰役
- **source-generic** · `civilwar/cw-r-f-pingjin（1948 平津戰役（張家口・新保安・天津・北平））` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：平津戰役戰史；傅作義部改編協議（1949年1月）
- **source-generic** · `civilwar/cw-r-f-nanxia（1949 衡寶・廣東・廣西（追殲白崇禧集團））` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：衡寶戰役、廣西戰役戰史
- **source-generic** · `civilwar/cw-r-f-yunnan（1949 雲南和平（盧漢起義））` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：盧漢起義通電（1949年12月9日）
- **source-generic** · `prc 快照 1949` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：當代史通說
- **source-generic** · `prc 快照 1951` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：當代史通說
- **source-generic** · `prc 快照 1962` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：當代史通說
- **source-generic** · `prc 快照 1978` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：當代史通說
- **source-generic** · `prc 快照 1979` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：當代史通說
- **source-generic** · `prc 快照 1997` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：當代史通說
- **source-generic** · `prc 快照 2026` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：時間線下界
- **source-generic** · `prc 派系簡介 中華人民共和國` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：當代史通說
- **source-generic** · `prc 派系簡介 中華民國` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：當代史通說
- **source-generic** · `prc 人物 1949 毛澤東` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：當代史通說
- **source-generic** · `prc 人物 1978 鄧小平` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：當代史通說
- **source-generic** · `kofun/kf-250（250 古墳時代前期示意起點）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本古代史研究通說
- **source-generic** · `kofun/kf-350（350 大型古墳文化東擴）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本古代史通說
- **source-generic** · `kofun/kf-400（400 瀬戶內與九州交流）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本古代史通說
- **source-generic** · `kofun/kf-500（500 王權趨向集中）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本古代史通說
- **source-generic** · `kofun 人物 ヤマト大王（總稱）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本古代史通說
- **source-generic** · `kofun 派系簡介 ヤマト` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本古代史通說
- **source-generic** · `kofun 派系簡介 九州勢力` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本古代史通說
- **source-generic** · `kofun 派系簡介 出雲系` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本古代史通說
- **source-generic** · `kofun 派系簡介 關東古墳群` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本古代史通說
- **source-generic** · `kofun 人物 250 畿內王權` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本古代史通說
- **source-generic** · `kofun 人物 350 ヤマト大王` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本古代史通說
- **source-generic** · `kofun 人物 500 ヤマト大王` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本古代史通說
- **source-generic** · `kofun 行軍路線 kofun-kinki-west` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本古代史通說。瀬戶內方向交流示意，非精確行軍日誌
- **source-generic** · `asuka 派系簡介 地方豪族` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：地圖圖例
- **source-generic** · `nara 派系簡介 藤原` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本古代史通說
- **source-generic** · `nara 派系簡介 蝦夷` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：地圖圖例
- **source-generic** · `kamakura/km-1281（1281 弘安之役）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本中世史通說
- **source-generic** · `kamakura/km-1333（1333 鎌倉幕府滅亡）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本中世史通說
- **source-generic** · `kamakura 人物 北條泰時` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本中世史通說
- **source-generic** · `kamakura 派系簡介 朝廷` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本中世史通說
- **source-generic** · `kamakura 派系簡介 西國` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本中世史通說
- **source-generic** · `kamakura 派系簡介 元軍` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本中世史通說
- **source-generic** · `kamakura 人物 1274 北條時宗` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本中世史通說
- **source-generic** · `kamakura 人物 1333 後醍醐天皇` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本中世史通說
- **source-generic** · `kamakura 行軍路線 kam-koan` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本中世史通說。再攻九州；幕府動員御家人防禦
- **source-generic** · `kamakura 行軍路線 kam-fall` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本中世史通說。新田義貞等攻鎌倉，幕府滅
- **source-generic** · `muromachi/mu-1336（1336 足利尊氏開幕府）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本中世史通說
- **source-generic** · `muromachi/mu-1350（1350 觀應擾亂）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本中世史通說
- **source-generic** · `muromachi/mu-1392（1392 南北朝合一）` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本中世史通說
- **source-generic** · `muromachi 人物 足利尊氏` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本中世史通說
- **source-generic** · `muromachi 人物 足利義滿` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本中世史通說
- **source-generic** · `muromachi 人物 後醍醐天皇` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本中世史通說
- **source-generic** · `muromachi 派系簡介 足利幕府` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本中世史通說
- **source-generic** · `muromachi 派系簡介 南朝` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本中世史通說
- **source-generic** · `muromachi 派系簡介 北朝` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本中世史通說
- **source-generic** · `muromachi 派系簡介 守護大名` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：地圖圖例
- **source-generic** · `muromachi 人物 1336 足利尊氏` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本中世史通說
- **source-generic** · `muromachi 人物 1336 後醍醐天皇` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本中世史通說
- **source-generic** · `muromachi 人物 1350 足利尊氏` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本中世史通說
- **source-generic** · `muromachi 人物 1392 足利義滿` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本中世史通說
- **source-generic** · `muromachi 人物 1467 足利義政` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本中世史通說
- **source-generic** · `muromachi 行軍路線 muro-takauji-kyo` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本中世史通說。足利尊氏自鎌倉／西國再入京都，開室町幕府
- **source-generic** · `muromachi 行軍路線 muro-go-daigo` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本中世史通說。建武政權崩潰，後醍醐天皇入吉野，南朝開始
- **source-generic** · `muromachi 行軍路線 muro-kannou` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本中世史通說。尊氏・直義對立，畿內戰線示意，非單一戰役日誌
- **source-generic** · `muromachi 行軍路線 muro-meitoku` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本中世史通說。南北朝合一前後，幕府對南朝殘部／畿內調動示意
- **source-wiki-only** · `azuchi/az-1573（1573 放逐足利義昭）` — 出處只有百科全書，未點名原典或研究書：中文維基「足利義昭」；日本戰國通說
- **source-wiki-only** · `azuchi/az-1582（1582 本能寺之變）` — 出處只有百科全書，未點名原典或研究書：中文維基「本能寺之變」
- **source-wiki-only** · `azuchi/az-1590（1590 小田原征伐）` — 出處只有百科全書，未點名原典或研究書：中文維基「小田原征伐」
- **source-wiki-only** · `azuchi/az-1600（1600 關原之戰）` — 出處只有百科全書，未點名原典或研究書：中文維基「關原之戰」
- **source-generic** · `azuchi 人物 織田信長` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本戰國通說
- **source-generic** · `azuchi 人物 豐臣秀吉` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本戰國通說
- **source-generic** · `azuchi 人物 德川家康` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本戰國通說
- **source-wiki-only** · `azuchi 派系簡介 織田` — 出處只有百科全書，未點名原典或研究書：中文維基「本能寺之變」
- **source-wiki-only** · `azuchi 派系簡介 豐臣` — 出處只有百科全書，未點名原典或研究書：中文維基「豐臣秀吉」
- **source-wiki-only** · `azuchi 派系簡介 德川` — 出處只有百科全書，未點名原典或研究書：中文維基「關原之戰」
- **source-wiki-only** · `azuchi 派系簡介 武田` — 出處只有百科全書，未點名原典或研究書：中文維基「武田勝賴」
- **source-wiki-only** · `azuchi 派系簡介 上杉` — 出處只有百科全書，未點名原典或研究書：中文維基「上杉氏」
- **source-wiki-only** · `azuchi 派系簡介 今川` — 出處只有百科全書，未點名原典或研究書：中文維基「桶狹間之戰」
- **source-wiki-only** · `azuchi 派系簡介 北條` — 出處只有百科全書，未點名原典或研究書：中文維基「小田原征伐」
- **source-wiki-only** · `azuchi 派系簡介 毛利` — 出處只有百科全書，未點名原典或研究書：中文維基「毛利氏」
- **source-wiki-only** · `azuchi 派系簡介 島津` — 出處只有百科全書，未點名原典或研究書：中文維基「島津氏」
- **source-wiki-only** · `azuchi 派系簡介 足利` — 出處只有百科全書，未點名原典或研究書：中文維基「足利義昭」
- **source-generic** · `azuchi 派系簡介 其他` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：地圖圖例
- **source-generic** · `azuchi 人物 1573 織田信長` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本戰國通說
- **source-generic** · `azuchi 人物 1573 德川家康` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本戰國通說
- **source-generic** · `azuchi 人物 1582 羽柴秀吉` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本戰國通說
- **source-generic** · `azuchi 人物 1590 豐臣秀吉` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本戰國通說
- **source-generic** · `azuchi 人物 1590 德川家康` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本戰國通說
- **source-generic** · `azuchi 人物 1600 德川家康` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本戰國通說
- **source-generic** · `azuchi 人物 1615 德川家康` — 出處只寫通說，未點名書名、條約名、制書名或檔案名：日本戰國通說


## info（覆蓋率）

- **coverage** · `jin（280–316）` — 4 張快照蓋 37 年，另外 33 年要靠沿用
- **coverage** · `nanbei（304–589）` — 7 張快照蓋 286 年，另外 279 年要靠沿用
- **coverage** · `sui（581–618）` — 3 張快照蓋 38 年，另外 35 年要靠沿用
- **coverage** · `tang（618–907）` — 6 張快照蓋 290 年，另外 284 年要靠沿用
- **coverage** · `wudai（907–960）` — 5 張快照蓋 54 年，另外 49 年要靠沿用
- **coverage** · `liaosong（960–1279）` — 5 張快照蓋 320 年，另外 315 年要靠沿用（覆蓋極疏，宜補快照）
- **coverage** · `yuanmingqing（1271–1911）` — 9 張快照蓋 641 年，另外 632 年要靠沿用（覆蓋極疏，宜補快照）
- **coverage** · `minguo（1912–1949）` — 6 張快照蓋 38 年，另外 32 年要靠沿用
- **coverage** · `civilwar（1945–1949）` — 14 張快照蓋 5 年，另外 -9 年要靠沿用
- **coverage** · `prc（1949–2026）` — 7 張快照蓋 78 年，另外 71 年要靠沿用
- **coverage** · `zhou（-2070–-221）` — 15 張快照蓋 1850 年，另外 1835 年要靠沿用（覆蓋極疏，宜補快照）
- **coverage** · `qinhan（-221–183）` — 8 張快照蓋 405 年，另外 397 年要靠沿用（覆蓋極疏，宜補快照）
- **month-territory-later-year** · `qinhan monthAxis 8:1「王莽即真，改元始建國」` — 幾何取自較晚的 9 年快照（後出邊界），介面要講明
- **month-coverage** · `qinhan（前221–183）` — 50 條有月份的條目，蓋 4861 個月；其餘一律「本月無專條」，色塊沿用
- **fringe-ring-codh** · `jp fringe ezo-east-baku（1799–1806，東蝦夷地（幕府直轄））` — 環「ezo_east」取自 CODH 旧國合成（190 頂點）
- **fringe-ring-codh** · `jp fringe ezo-all-baku（1807–1820，蝦夷地全般（幕府直轄・松前奉行））` — 環「hokkaido_all」取自 CODH 旧國合成（212 頂點）
- **fringe-ring-codh** · `jp fringe matsumae-return（1821–1855，蝦夷地（還給松前氏））` — 環「hokkaido_all」取自 CODH 旧國合成（212 頂點）
- **fringe-ring-codh** · `jp fringe ezo-re-chokatsu（1856–1868，蝦夷地・和人地北部（幕府直轄・箱館奉行再置））` — 環「hokkaido_all」取自 CODH 旧國合成（212 頂點）
- **fringe-ring-codh** · `jp fringe hokkaido-kaitakushi（1869–1881，北海道（開拓使））` — 環「hokkaido_all」取自 CODH 旧國合成（212 頂點）
- **fringe-ring-codh** · `jp fringe ken-hakodate（1882–1885，函館県）` — 環「ken_hakodate」取自 CODH 旧國合成（26 頂點）
- **fringe-ring-codh** · `jp fringe ken-sapporo（1882–1885，札幌県）` — 環「ken_sapporo」取自 CODH 旧國合成（117 頂點）
- **fringe-ring-codh** · `jp fringe ken-nemuro（1882–1885，根室県）` — 環「ken_nemuro」取自 CODH 旧國合成（133 頂點）
- **fringe-ring-codh** · `jp fringe hokkaido-cho（1886–2026，北海道庁）` — 環「hokkaido_all」取自 CODH 旧國合成（212 頂點）
- **fringe-coverage** · `japan（1604–2026）` — 14 個外周窗：松前交易領、琉球附庸、開拓使、沖繩縣、美治、歸還
- **narrative-coverage** · `imperial（晉至共和國）` — 44 條事件全部有獨立的 course／outcome／意譯，無重複句
- **jp-timeline-coverage** · `japan（1603–2026）` — 23 條江戶以後條目全部有 source 與 note
- **source-naming** · `imperial（11 包）＋japanEras（6 包）` — 322 條出處點名了書名／條約名／制書名／檔案名；未點名 182 條
- **outcome-depth** · `周（夏商周、春秋、戰國）` — 81 條之中 61 條已補依據並達標；平均 482 字，約 1.9 分鐘
- **outcome-depth** · `秦漢` — 21 條之中 20 條已補依據並達標；平均 447 字，約 1.8 分鐘
- **outcome-depth** · `帝國包（晉至共和國）` — 44 條之中 44 條已補依據並達標；平均 473 字，約 1.9 分鐘
- **outcome-depth** · `帝國包（各包自帶事件）` — 158 條之中 82 條已補依據並達標；平均 451 字，約 1.8 分鐘
- **outcome-backlog** · `各包「結果與影響」（已達標／總數）` — 尚未補 outcomeSource：三國 0/28；周（夏商周、春秋、戰國） 61/81；秦漢 20/21；戰國（日本） 0/13；幕末 0/15；平安 0/9；帝國包（各包自帶事件） 82/158
- **ring-provenance** · `疆域幾何出處登記` — 被引用的環 38 條：以現代／民國行政界代替當時政區 37 條、依文獻地望手繪 1 條、朝代大勢框 0 條、圖幅矢量化 0 條、GIS 匯入 0 條。目標是把 proxy 逐條換成 plate-traced／gis-import（見 src/data/territory/README.md）


---

稽核腳本：`scripts/audit-ranges.ts`（`node --experimental-strip-types`，經 Vite SSR 載入 `src/`）。
