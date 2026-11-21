# march｜行軍路線查核

> 先讀 `docs/agents/README.md`。本檔只寫這支 agent 專屬的部分。
> worktree：`~/Project/historyfirst-1/historyfirst-wt-march`，分支 `agent/march`。

## 目標

讓每條行軍／進軍／海戰路線的**起點、終點、年份、出處**對得上史實。工作方式是「為每條路線寫一條可執行的端點斷言」：把「這條線的起訖點應落在某個今地名」寫成程式能檢查的資料，失敗就修路線。

## 你能改什麼

- 路線資料：`src/data/marchRoutes.ts`（只動 `CHINA_MARCH_ROUTES` 裡的路線物件，不動 `FRONTIER_ZONES` 與型別）、`src/**/marchRoutes*.ts`、各 `src/japanEras/packs/*Pack.ts` 與 `src/imperial/data/*` 內的路線物件。
- 斷言表：`scripts/check_route_landmarks.py` 的 `ASSERTS` 清單（只准**新增**項目或修正錯的項目，不改程式邏輯）。
- 路線繪製：`src/components/map/RouteOverlay.tsx`、`MapRouteLegend.tsx`（本輪預期不需要）。

## 你不能改什麼

疆域色塊幾何（`src/geo/`，那是 map 的工作）、閘門腳本、`FRONTIER_ZONES`。

**職責界線（2026-11-21 釘死）**：你只擁有 `scripts/check_route_landmarks.py` 的路線端點斷言與路線資料；`scripts/check_ring_landmarks.py` 的環地標斷言屬 map，即使你發現某個路線端點同時是疆域地標，也**不准改 map 的檔**——把需求寫進報告的「下輪建議」，讓 map 自己處理。commit 的 scope 一律用 `(march)`，不准寫 `(map)`（以前有幾輪借了 scope，讓人誤以為你改了 map 的檔）。

## 佇列

```sh
python3 scripts/check_route_landmarks.py --unasserted
```

每行格式：`路線id｜名稱｜年份｜（海）｜起 經度E,緯度N｜訖 經度E,緯度N`。這是「還沒有任何端點斷言」的路線（開工時的數量以輸出末行為準）。**從第一行開始做**，每輪做 6–10 條。

先確認基線：

```sh
python3 scripts/check_route_landmarks.py | tail -1    # 失敗必須是 0
node scripts/audit_map_accuracy.mjs | tail -1         # fail 0｜warn 0
```

## 單一路線的做法

1. **讀路線**：`grep -n "id: '<路線id>'" -r src | head -3`，讀該物件：`name`、`year`、`faction`、`kind`、`source`、`points`。
2. **判斷起訖點應該在哪**：讀 `source` 與名稱（例如「董卓遷長安」起點洛陽、終點長安）。只准取**史料明確寫出**的起訖地；史料沒寫的端點，不寫斷言。
3. **查今地名座標**：
   ```sh
   python3 scripts/wp_coord.py "Xi'an" --lang en          # 英文條目通常有座標
   python3 scripts/wp_coord.py "<日文條目名>" --lang ja
   ```
   輸出 `經度E,緯度N`。查不到座標或被限流：換語言或稍後重試；仍查不到就跳過這條，不要憑記憶估座標。
4. **比對現況**：把查到的座標與佇列中該路線的「起／訖」座標比。差距在容差內（市街 12–20 km，廣域戰場 25–30 km；地名有異說的才放寬到 40 km，並在依據裡寫明）就直接進第 6 步。
5. **差太多＝路線畫偏了**，修正端點：
   ```sh
   python3 scripts/check_route_landmarks.py --px china 108.94 34.34     # 日本戰區用 japan
   ```
   取輸出的 `[x, y]`，把該路線 `points` 的第一個（或最後一個）座標換成它。只動端點，不動中間點，除非端點移動後第一段明顯穿過海或山脈外的地方。陸路不得穿海，海路不得上陸。
6. **新增斷言**：在 `ASSERTS` 清單末尾（`]` 之前）追加一行，格式：
   ```python
   ("路線id", "start", "地名（簡短說明）", (經度, 緯度), 容差km,
    "依據：史料名與卷章＋為何取這個座標"),
   ```
   起點與終點各一條。`"依據"` 一定要寫具體史料（例如《後漢書·董卓傳》），不能只寫「維基」。
7. **單項驗證**（三個都要過）：
   ```sh
   python3 scripts/check_route_landmarks.py | tail -3
   node scripts/audit_map_accuracy.mjs | tail -1
   npx tsc -b; echo tsc=$?
   ```
   第一個要印「失敗 0 條」，第二個要「fail 0｜warn 0」。

## 路線本身的檢查（斷言之外）

每條處理過的路線，順便確認三件事（不符就改，改不了就列入放棄清單）：

- **年份**：`year` 要與 `source` 所述事件年份一致。有異說就設 `disputed: true`，並在 `note` 寫各說。
- **出處**：`source` 要指向一手史料或戰報，不得用小說（《三國演義》一類）。軍記文學要標「文學作品，非史實記錄」。
- **海陸**：`kind: 'sea'` 的路線不得上陸、陸路不得過海。`audit:map` 會抓，但你改了端點就要重跑。

## 判斷準則

- 路線畫的是「大方向」，不是逐條山谷。端點才是斷言對象；中間點不要為了「更準」而重畫。
- 史料沒有寫起點或終點，就不要斷言那個端點。寧可少一條斷言，也不要寫一條沒有依據的。
- 地名有多個候選位置（例如合浦、白村江）：容差放寬，並在依據裡寫出各說。
- 同一條路線被兩個地名同時宣稱時，選史料原文用的那一個。

## 停止條件

- 佇列為 0：寫報告「佇列已空」，結束。
- 連續 3 條都查不到座標：很可能是網路或限流，停止，寫報告。
- `check_route_landmarks` 的失敗數大於 0 而你修不好：把該路線的新斷言刪掉（`git checkout` 禁止，請用 `edit` 還原），改列放棄清單。**不要保留一條會失敗的斷言**。

## 本輪指標

`check_route_landmarks` 的「條端點斷言」要增加（報告寫「開工數 → 收工數」）；失敗保持 0；`audit:map` 保持 `fail 0｜warn 0`。
