# 行軍線手查紀錄（地圖精度排程）

`content/map-accuracy` 每輪手查 3–5 條路線之紀錄，優先查閘門覆蓋唔到嘅日本戰區與入侵／反擊路線。
靜態閘門（`npm run audit:map`）只判海陸落點與點數是否齊全，唔會查「端點係咪號稱嗰個地名」；
呢份紀錄補嘅正係呢一步。

## 反查方法（可重現）

日本戰區畫布 `japan_px`：等距圓柱，經度 121.96–151.58、緯度 22.95–47.56，畫布 1482×1477。
邊界讀 `scripts/tighten_land_borders.py` 的 `JP_N, JP_S, JP_W, JP_E`，尺寸讀 `src/sengoku/data/regions.ts`
的 `SENGOKU_MAP_W/H`，都不另抄常數。資料檔 `points` 存畫布 px，故先反算：

    lon = 121.96 + x / 1482 * (151.58 - 121.96)
    lat = 47.56 - y / 1477 * (47.56 - 22.95)

亞洲戰區（`src/japanEras/packs/modernJapanPack.ts`）以 `route(id, …, [[經度, 緯度]])` 直寫經緯度，
經 `asiaPx` 投到 1710×1000 畫布，手查時直接比對經緯度。
海陸落點之實測用 `scripts/audit_map_accuracy.mjs` 的同一套 `ASIA_LAND` 遮罩（未改該檔，只以副本加診斷）。

## 本輪手查清單（2026-11-10）

| 路線 id | 年 | 名稱與號稱端點 | 端點實測（反算） | 判定 |
|---|---|---|---|---|
| `kam-bunnei` | 1274 | 文永之役（朝鮮半島南岸外海—對馬東口—玄界灘—壹岐水道—博多灣口） | 129.04/35.10 → 129.40/34.40 → 129.69/33.75 → 130.05/33.75 → 130.33/33.68 | 通過。末點即博多灣口海面；壹岐諸島未繪於 1:50m 底圖，故讀作「經壹岐」 |
| `kam-koan` | 1281 | 弘安之役（退至平戶—鷹島海域） | 末點 129.60/33.42 | 通過。實地海域 129.55–129.72E、33.28–33.37N，底圖把平戶—鷹島間水面填成陸地，末點取最近可繪海面，舊注已交代 |
| `asuka-hakusukinoe` | 663 | 白村江（玄界灘—壹岐—對馬西沖—巨濟外海—珍島外海—錦江河口） | 130.05/33.75 → 129.55/33.78 → 129.15/34.25 → 128.50/34.65 → 126.55/34.30 → 126.55/36.05 | 通過。各點與 note 所列順序一一對應，末點在鴨綠江以南、錦江河口外海 |
| `korea-sea`／`korea-1597`／`korea-1597-land` | 1592／1597 | 文祿·慶長渡海與釜山浦—東萊—蔚山陸上攻勢 | 釜山浦 129.04/35.10、東萊 129.06/35.22、蔚山 129.31/35.54 | 通過。與 note 之古今對照（今釜山東平館、釜山東萊區、蔚山中區約 129.32/35.55）相符；陸海已拆條 |
| `mj-1894-corea` | 1894 | 日清陸軍 漢城→平壤→義州 | 仁川外海 126.62/37.46、漢城 126.98/37.57、平壤 125.75/39.03、義州 124.40/40.02 | 通過。前兩點與今首尔、平壤重合；末點係義州城址（今新義州市區以南），新義州係1905年京義鐵道通車後始興，1894年無此市，故不取 40.10N |
| `mj-1894-navy` | 1894 | 大東溝海戰（號稱「位置在大東溝海面」） | 舊：起 126.10/37.20、終 124.60/39.20 | **不符，已改**。終點距戰報所記大東溝碇泊地（北緯39度47分／東經124度07分）約六十五公里，未抵鴨綠江口；起點在黃海中部，與出發地無干。改後：121.05/38.60 → 122.90/38.70 → 123.57/39.53 → 124.12/39.78 |
| `mj-1895-weihaiwei` | 1895 | 威海衛攻圍（榮成龍眼灣上陸→威海衛） | 122.50/37.15 → 122.25/37.45 → 122.10/37.50 | 通過。與榮成（約122.42E/37.16N）、威海衛（約122.12E/37.51N）相符 |
| `mj-1905-tsushima` | 1905 | 日本海海戰（對馬海峽→北上追擊） | 129.40/35.60 → 129.30/38.20 → 130.90/39.30 | 未改。末點北至 39.3N，是否過北，本轮未搵到可逐字引用之官方戰史坐標，列入人工清單 |
| `mj-1945-yamato` | 1945 | 大和特攻（德山灣口→坊ノ岬沖，注記沈沒點北緯30度43分／東經128度04分） | 末點 128.07/30.72 | 通過。與注記坐標相同（先輪已改過「德之島沖」舊說） |

## 大東溝海戰改線依據

- 北洋艦隊護送運兵船由旅順至大東溝，卸畢回程遭敵（1894年9月17日）；戰場在鴨綠江口外之海面。
- 當時歐美海軍刊物收錄之戰報給出碇泊位置：北緯39度47分／東經124度07分（約在鴨綠江口以西）。
- 中方地方記載記「致遠」艦沉於大鹿島西南（東經123度34分／北緯39度32分）。兩說同在鴨綠江口西側海面，
  本線取外海可繪一點為終點、取致遠沉沒點一帶為中間點。
- 改後四點經同一套 `ASIA_LAND` 遮罩實測：全部 `isLand=false`；靠岸兩點 `nearCoast=true`（灣口航道本貼岸），
  符合海路口徑，`audit:map` 維持 fail 0／warn 0。

## 未做與需人工之處

1. **azuchiPack 無任何行軍線**：朝鮮出兵之陸海線全部落在 `src/sengoku/data/marchRoutes.ts`（5 條，已核）。
   若要在「安土桃山」包另立 1592／1597 路線，該包需先有同年事件，否則 `audit:map` 嘅
   `route-year-no-event` 會由 0 變紅；事件欄屬加厚排程，需跨排程協調，本輪未動。
2. **日本海海戰（1905）末點**：需參謀編《日本海大海戰》或《明治三十七八年戰史》之可逐字引用坐標，
   本輪未獲，暫不改，亦唔以通說覆蓋。
3. **`land-route-crosses-sea` 升 fail**：屬 `scripts/audit-*` 門檻，本排程不得改。目前三戰區
   174 條加經緯度直寫 30 條全數通過，且本為首條已判路線無新反例，是否升級請门槛擁有者決定。
4. **`audit:ranges` 剩低 179 條 warn 全部唔屬本排程擁有**：實測分佈為事件 60 條、逐年人物 58 條、
   派系簡介 47 條、日本年表 note 12 條、大學層 2 條（其中 `source-wiki-only` 14 條散見上述各類）；
   落在疆域快照與行軍路線者為 **0**——即本排程擁有嘅欄位已無 source-generic。應交加厚排程處理。
5. **路線名稱「（黄海）」用字**：該字為簡體寫法，`audit:chars` 嘅掃描未涵蓋單引號字面值，故未報；
   屬字符門檻口徑問題，本輪只記錄，唔擅自改名。

## 【march｜2026-11-18】第十五輪（短輪，預算 40 分鐘）

基準：12adb6c → 本輪 HEAD：3becc18（1 個 commit）
工作區：git status --porcelain 輸出＝空
完成項目：
  1. edo-1868／ueno-1868（src/bakumatsu/data/marchRoutes.ts:119、:131）：戊辰戰爭江戶圈兩線
     補四條端點斷言（scripts/check_route_landmarks.py ASSERTS 末尾）。座標取自
     `wp_coord.py "江戸城"／"上野寛永寺" --lang ja`（139.75E,35.69N／139.77E,35.72N），
     現狀端點差距 0.0–5.2 km，在容差 12 km 內，路線本身未動。
     驗證：check_route_landmarks＝55 條斷言失敗 0；audit:map＝fail 0｜warn 0；tsc=0。
放棄清單：
  1. 佇列第一行 joraku 起（89 條無斷言路線，Sengoku／bakumatsu／明治—太平洋戰爭包）／
     原因＝本輪開工基線 gates 耗時，實際工作時間只夠一批；下輪照佇列順序由 joraku 繼續。
指標：端點斷言 51 → 55；失敗 0 → 0；audit:map 保持 fail 0｜warn 0；
     gates before exit=0、after exit=0（無惡化）；tsc=0；build=0；lint=0；chars exit=0
push：ls-remote 與 rev-parse HEAD 皆 3becc18（一致）。remote tip 13f78bd 經 range-diff
     確認係自己舊 commit 群（全部 `=`），按鐵律用 --force-with-lease。
PR：已存在 #176（OPEN）
下輪建議：由 joraku（信長上洛）起做 Sengoku 包六至十條；joraku 起點 136.85,35.22 疑非
     美並（岐阜），先查「岐阜城」座標再定是否移動端點。

## 【march｜2026-11-18 下午】第十六輪（短輪）

基準：1484fda → 本輪 HEAD：見 git log（1 個 commit）
完成：安土桃山佇列第一批四線七斷言（joraku、chugoku、chugoku-gaeshi、shizugatake）
      ／scripts/check_route_landmarks.py ASSERTS 末尾／座標全部 wp_coord ja 查得
      （名古屋城 136.90,35.19；京都御苑 135.76,35.02；広島城 132.46,34.40；
      山崎の戦い 135.69,34.91 容差 20；丸岡城 136.27,36.15；賤ヶ岳 136.19,35.51），
      現狀端點差距 0.1–11.0 km 在容差內，路線未動。
驗證：check_route_landmarks＝62 條失敗 0；audit:map fail 0｜warn 0；tsc=0；build=0；lint=0；
      chars exit=0（初跑咬出敘述錯字「相邻」「広」兩處，即改「相鄰」「廣島」後過）。
放棄：komaki／kyushu／odawara／oshu 四線（座標已查：小牧山 136.91,35.29、鹿児島城
      130.55,31.60、小田原城 139.15,35.25、江戸城 139.75,35.69）／原因＝剩 9 分鐘，
      手冊指令「剩 10 分鐘內不开新項」；下輪直接落呢四條斷言再接佇列。
指標：端點斷言 55 → 62；失敗 0；gates before/after exit=0；push 為 fast-forward。

## 【march｜2026-11-19】第十七輪（60 分鐘）

基準：f5d6c87 → 本輪 HEAD 見 git log（6 個 commit：斷言 5 個＋本報告）
背景：PR #176 嘅 commit 鏈已入 origin/main（git log origin/main..HEAD 開工時為空），
      PR 仍未 close，照手冊沿用不重開。
完成（全部只新增 scripts/check_route_landmarks.py ASSERTS，路線幾何未動）：
  1. komaki／kyushu／odawara／oshu 四斷言（座標沿第十六輪已查值）
  2. korea-1598 起訖（順天灣口 127.49,34.95 容差 40；博多灣口 130.33,33.68 同白村江條口徑）
  3. choshu-1866 起訖（京都御苑；岩國城 132.17,34.18）
  4. toba-bakufu 起訖（大阪城 135.53,34.69；伏見稻荷 135.77,34.97）、tokaido-1868 訖（江戶城）、
     hakodate-land 起（若松城 139.93,37.49）
  5. nagaoka-1868 起訖（丸岡城；長岡城 138.85,37.45）、aizu-1868 起訖（長岡城；若松城）
  6. perry-1854 起訖（下田港 138.95,34.67；浦賀 139.71,35.25）
驗證（每批）：check_route_landmarks 失敗 0；audit:map fail 0｜warn 0；selfcheck 命中 0；chars exit=0
放棄：hakodate-land 終點（津輕，端點喺海面、無字面城砦可錨）；hogen／heiji 等京都近邑線未及／
      時間所限，下輪接佇列由 perry-1854 之後（choshu 已做，續 nara-fujiwara-nakamaro 等）。
指標：端點斷言 66 → 80；失敗 0；gates before/after exit=0；tsc=0；build=0；lint=0；chars exit=0
push：remote tip d6a50be 經 range-diff 核係自己舊鏈，--force-with-lease 推 7600c4f，
      ls-remote 與 rev-parse HEAD 一致
PR：已存在 #176（OPEN、MERGEABLE）

## 【march｜2026-11-20】第十八輪（60 分鐘）

基準：944b0e6 → 本輪 HEAD 見 git log（3 個 commit：兩斷言 commit＋本報告）
完成：
  1. 幾何修正：kam-fall 終點、muro-takauji-kyo 起點原共用節點 [860.1,738.2] 實為今小田原位置
     （139.15E,35.26N），與 source 字面「攻鎌倉」「自鎌倉」矛盾；兩線端點移正至今鎌倉
     [880.1,734.6]（139.55E,35.32N，日文維基「鎌倉」條），source 補古今對照註。
     同名節點在 kawagoe／osaka-march／戊辰東海道／ishibashi 等線屬東海道過路點，未動；
     kam-yoritomo 訖點、kam-jokyu 起點 source 無字面地名，照手冊不動不斷言。
  2. 斷言六條：kam-fall 訖＝鎌倉、muro-takauji-kyo 起＝鎌倉／訖＝京都御苑、
     kam-jokyu 訖＝京都御苑（「上京」字面）、nara-fujiwara-nakamaro 起＝平城京
     （平城宮 135.80,34.69）、edo-1789 起＝松前沖（松前城 140.11,41.43）。
驗證：check_route_landmarks＝86 條失敗 0；audit:map fail 0｜warn 0；tsc=0；
      selfcheck 命中 0 新漢字 0；chars exit=0；gates before/after exit=0（無惡化）。
放棄：kam-yoritomo／kam-jokyu 起訖鎌倉側（source 無字面）、muro-meitoku／muro-onin／
      muro-kannou（無字面端點／零長線）、nara-emishi、edo-1609／1669（端點喺海面無字面地名）、
      edo-1789 終點（國後西沖，與維基島址距約百公里）、hogen／heiji／kurikara／dannoura 等未及／
      原因＝時間所限或依手冊「史料沒寫的端點不寫斷言」。
觀察（非本 agent 範圍）：edoPack.ts edo-1609 source 有簡體字形兩詞（「薩摩」「沖繩」兩詞之簡體寫作，此處不逐字複製病字），屬 origin/main 既有狀況，
      交 chars／content 輪處理。
指標：端點斷言 80 → 86；失敗 0；gates 全 exit=0；audit:map fail 0｜warn 0
push：fast-forward（944b0e6..4f00092），未用 force；ls-remote 與 rev-parse HEAD 一致
PR：已存在 #176（OPEN、沿用）

## 【march｜2026-11-20】第十九輪（60 分鐘）

基準：c17700e → 本輪 HEAD 見 git log（5 個 commit：斷言 commit 3＋報告修正 1＋本報告）
完成（全部只新增 scripts/check_route_landmarks.py ASSERTS，路線幾何未動）：
  1. 平安九線十二斷言：hogen-taira／hogen-genji／heiji-taira／kurikara／kyoto-1183 之京師端
     （京都御苑 135.76,35.02 同信長上洛口徑）；heiji-taira 起＝熊野方向（熊野本宮大社
     135.77,33.84，廣域容差四十）；kurikara 起＝信濃今長野市（138.19,36.65）；
     dannoura-land 訖＝今下關市（130.94,33.96）；dannoura-heike 起訖＝壇之浦戰場
     （「壇ノ浦の戦い」條 130.96,33.97，泊地示意容差二十）；uji-1180 起訖＝京都／今宇治市
     （135.80,34.88，短線容差十六）。
  2. 三國六線九斷言：huangjin 起＝冀州廣域（漢刺史部治鄴故城 114.40,36.27，容差四十）、
     訖＝南陽宛縣（《後漢書·朱儁傳》qsrc 逐字「時南陽黃巾張曼成起兵…屯宛下百餘日」，
     今南陽市 112.58,33.02）；dongzhuo-changan 訖＝長安今西安市區；guandong 訖＝洛陽；
     sunjian-luoyang 起訖＝南陽／洛陽；xudu 訖＝許今許昌市（qsrc 逐字「遂都許」）；
     lubu-xuzhou 訖＝徐州廣域（今徐州市 117.28,34.20，下邳治所異說已註）；guandu 起＝鄴。
  3. 三國另六線十一斷言：chibi 起＝許（source 字面「許—南陽—襄陽—江陵」，qsrc 核
     「公進軍江陵」「公至赤壁」）；hefei 起訖＝建業今南京市／合肥今合肥市區（英文條
     117.23,31.82，中文條無座標）；lvmeng 訖＝江陵今荊州市區；yiling 起訖＝成都／夷陵今宜昌；
     xiangfan 訖＝襄陽；liaodong 訖＝襄平今遼陽市；zhonghui 起＝長安；xiapi 訖＝下邳廣域
     （兩說已註）；caopi-wu 訖＝合肥一帶（source 字面「只示中路至合肥一帶」）。
  4. 第十八輪報告兩處簡體字形修正（commit b5717b7）：一處為「端點」之「端」後字誤作簡體形，
     改正體；另一處轉錄病字句改寫為不複製字形成句。
驗證（每批）：check_route_landmarks 失敗 0（98→107→118 條）；audit:map fail 0｜warn 0；
      selfcheck 命中 0；chars exit=0；gates before exit=0；after 首跑 exit=1，乃背景跑與
      報告 commit 並發之競態（audit:teeth-mutations 單跑失敗 0、突變 56 項全咬中；工作樹
      淨後重跑 gates exit=0 無惡化）。
自我修正：本輪兩度把現代市名用字心打成簡體形（「陽」「區」兩字之簡體寫作）入斷言理由，
      audit:chars 咬實（硬傷 10）後即改再推；引文座標亦因此改以中文維基正體條名為主、
      無正體座標條者取英文條並註明。
放棄／不斷言（依手冊「史料沒寫的端點不寫斷言」）：chibi 訖（赤壁戰場蒲圻／黃州兩說無座標條）、
      guandu 訖（官渡無可溯源座標條）、zhanglu 起訖（陽平關距節點約四十公里）、
      wuzhang 訖（五丈原與節點距約百公里）、wuhuan／hebei／wuhuan 側端（無字面地名）、
      wu-fall 訖（「吳」非字面建業）、liaodong 起（節點取洛陽，與「自冀幽」不符）、
      zhonghui 訖（路線抵成都，與名字面「入漢中」不符）、shu-fall／nanzhong 系列（示意線）、
      以上 liaodong 起點與 zhonghui 終點之幾何與字面不符屬觀察項，留後續輪以史料覆核。
指標：端點斷言 80 → 118；失敗 0；audit:map fail 0｜warn 0；tsc exit=0
push：fast-forward（c17700e..d96677b），未用 force；origin/agent/march 與 rev-parse HEAD 一致
PR：已存在 #176（OPEN、MERGEABLE、沿用）

## 第二十輪（2026-11-21）

路線：`agent/march`（HEAD 4002e12 起）。佇列 42 條無斷言路線，依序取三國段。

完成：
  1. 三國九線十斷言（commit 893e0c1，路線幾何未動，端點全在容差內）：
     yizhou 起＝公安（孱陵故地，今湖北公安，英文條 112.17,29.93，中文條無座標；
       縣域中心與縣治有偏移，容差二十）訖＝成都（qsrc 核《三國志》卷三十二「圍成都」）；
     hanzhong 起＝成都 訖＝漢中今漢中市區（107.02,33.07）；
     nanzhong 起＝成都（source 字面「成都沿岷江至僰道後分三路」）；
     nanzhong-west／nanzhong-east 起＝僰道今宜賓市區（104.64,28.75，
       qsrc 核《華陽國志》卷三「僰道」）；
     beifa 起＝成都；beifa-qishan 起＝漢中（qsrc 核卷三十五「祁山」十一處）；
     chencang 訖＝陳倉今寶雞市區（107.24,34.36，qsrc 核卷三十五「圍陳倉」，終點距約八公里）。
  2. wuzhang 終點移正（commit 5f88b22）：原終點節點距今陝西岐山縣五丈原鎮偏東約五十八公里；
     依《三國志·蜀書·諸葛亮傳》「屯五丈原」（qsrc 核卷三十五）與維基五丈原條
     （岐山縣縣城南約二十公里）、岐山縣條縣治座標（107.62,34.44）向南推約二十公里
     （約 107.62,34.26）設終點，刪偏東節點兩個；source 補今地一句。新增斷言釘住。
驗證（每批）：check_route_landmarks 失敗 0（118→128→129 條）；audit:map fail 0｜warn 0；
      selfcheck 命中 0（新漢字均為正體地名用字）；chars 硬傷 0；
      gates before exit=0、after exit=0（無惡化，war-shape schematic 57、event-depth gap 0）。
放棄／不斷言：zhanglu 訖（陽平故址多說，無逐字佐證與可溯源座標條，維持漢中側節點）、
      hebei／wuhuan／tongguan（無字面端點地名或古址多說）、shu-fall／wu-fall（示意線、
      端點非字面城邑）、chencang 起（散關為關隘非城邑）、wuzhang 起（斜谷同上）。
觀察項（留佇列）：liaodong 起＝洛陽與 source「自冀幽」不符（幽州治所異說，未動）；
      zhonghui 訖抵成都與名字面「入漢中」不符（覆核《資治通鑑》卷七十八後再定）；
      xiapi 訖在徐州市區側（古邳說並存）。
指標：端點斷言 118 → 129；失敗 0；無斷言路線 42 → 33；audit:map fail 0｜warn 0；tsc exit=0
push：fast-forward（4002e12..5f88b22），未用 force
PR：已存在 #176（OPEN，沿用）

## 第二十一輪（2026-11-21）

路線：`agent/march`（rebase 至 origin/main 377e6d4 後開工，HEAD edaf36b 起）。
main 新增鎖心跳語義（WAIT 排隊），本輪 start 首跑即 GO。佇列 33 條無斷言路線，依佇列取近代（mj-*）段。

完成（三批，全部只加斷言、路線幾何未動）：
  1. commit 3a89377——近代七線十斷言：
     mj-1931-manchuria 起＝瀋陽（123.43,41.80）訖＝哈爾濱（126.64,45.76）（『日本外交文書』昭和期）；
     mj-1933-rehe 起＝山海關（119.78,39.98）訖＝承德（117.96,40.95）；
     mj-1932-shanghai 起訖＝上海閘北（121.47,31.23）（防衛研究所戰史資料）；
     mj-1918-siberia 起＝海參崴（131.89,43.12）訖＝廟街即尼古拉耶夫斯克（140.73,53.13）（『日本外交文書』）；
     mj-1904-mukden 訖＝奉天今瀋陽（陸軍省『明治三十七八年戰史』）；
     mj-1944-imphal 訖＝英帕爾（93.94,24.81）（『戰史叢書』）。
  2. commit 2aa4c57——太平洋・華北方面十一斷言：
     mj-1942-guadalcanal 起＝拉包爾錨地（距聚落 13.3km，容差 20）訖＝圖拉吉（重合）；
     mj-1941-malaya 訖＝哥打巴魯（1.1km，source 字面「12月8日コタバル等處上陸」）；
     mj-1941-malaya-land 起＝哥打巴魯 訖＝新加坡（7.9km，source 字面「1942年2月15日新加坡陥落」）；
     mj-1940-indochina-land 起＝海防（3.3km）訖＝河內（3.3km）（『戰史叢書』南進作戰）；
     mj-1942-java 起＝巴力峽班外海錨地（距市中心 24.7km，source 字面「兩端取外海錨地」，容差 30）；
     mj-1944-marianas 訖＝塞班島（5.8km，source 字面「7月9日塞班島陥落」）；
     mj-1914-qingdao 起＝龍口（5.4km，source 字面「龍口上陸」）訖＝青島（重合）。
  3. commit c86d990——南方・樺太・大和四斷言：
     mj-1941-philippines 起＝高雄外海（6.7km）訖＝仁牙因灣（灣中心距節點 13.9km，容差 20，
       source 字面「仁牙因灣口（Lingayen，120.30E/16.20N）」）（『戰史叢書』比島作戰）；
     mj-1945-soviet-karafuto 訖＝真岡即今霍爾姆斯克（3.8km，維基 Kholmsk 條註「known until 1946 as Maoka」；
       『戰史叢書44 東北方面軍作戰2 千島列島・樺太・北海道防衛』）；
     mj-1945-yamato 起＝德山灣口即今山口縣周南市外海（10.6km，source 字面「德山＝今山口縣周南市」）。
近代斷言依據口徑：出處用公文書・戰史（『日本外交文書』、陸軍省『明治三十七八年戰史』、
防衛研究所藏戰史資料、『戰史叢書』系列），今地名座標一律 wp_coord 取條目座標（HTTP 429 重試）。
驗證（每批）：check_route_landmarks 失敗 0（129→139→150→154 條）；audit:map fail 0｜warn 0；
      chars 硬傷 0；selfcheck 命中 0；tsc exit=0。
      gates before exit=1（teeth-mutations fail 1、wiki-links unvalidated 25）——該次 gates 喺背景跑時
      我正編輯同一支斷言檔（第十九輪已記嘅競態假陽性口徑），同期維基有限流窗口；收工重跑
      gates after exit=0，兩項均 reset 為 0(=)，其餘全部與基線一致或改善（war-shape schematic 57、
      event-depth gap 0）。教訓補一行：gates 背景跑期間連斷言檔都唔好郁。
放棄／不斷言：mj-1942-java 訖（梅拉克今地名維基中英印尼文條均查無，無座標可取，跳過）、
      mj-1941-malaya 起（三亞僅見路線名、source 未寫）、mj-1939-nomonhan 起訖（海拉爾・諾門罕河
      僅見路線名、source 未寫）、mj-1905-tsushima 與 mj-1937-hangzhou-bay 起（海面）、
      mj-1937-hangzhou-bay 訖（金山衛查無座標條，source 已註「止於近岸海面」）、
      mj-1874-taiwan（端點無字面地名）、mj-1940-indochina 海路兩端（外海錨地去岸上地名逾四十八公里）、
      mj-1945-okinawa／mj-1944-leyte-gulf／mj-1944-marianas 起／mj-1945-yamato 訖（海面或沈沒位置無座標條）、
      mj-1942-midway 訖（中途島跨國際日期變更線，182.63E 換算口徑未定）、soviet-karafuto 起（北緯50度線非地名）。
觀察項（留佇列）：hangzhou-bay 終點與金山衛今岸可能相距約二十公里，待可溯源座標條再定是否移端；
      mj-1942-midway 起訖換算口徑；scan_v v3 覆核（第十三輪值 55 未重跑）；
      三國觀察項（liaodong 起、zhonghui 訖、xiapi 訖）照第二十輪留。
指標：端點斷言 129 → 154；失敗 0；無斷言路線 33 → 19；audit:map fail 0｜warn 0；tsc exit=0
push：rebase 至 origin/main 377e6d4 後，remote tip 仍是自己 rebase 前舊尾 774baee（已核實屬自己舊鏈），
      依鐵律用 --force-with-lease 推 c879428；推後 origin/agent/march 與 HEAD 一致
PR：已存在 #176（OPEN，沿用）
