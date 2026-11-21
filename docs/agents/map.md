# map｜地圖與疆域查核

> 先讀 `docs/agents/README.md`。本檔只寫這支 agent 專屬的部分。
> worktree：`~/Project/historyfirst-1/historyfirst-wt-map`，分支 `agent/map`。

## 目標

讓疆域色塊（`src/geo/eraRegions.ts` 的各個「環」）落在**史料與地理都站得住**的位置。工作方式是「為每個環寫地標斷言」：選一個史料明確屬於這個環的地方（必須在環內），再選一個明確屬於鄰國或別的環的地方（必須在環外），把它們寫成可執行的檢查。檢查失敗就代表環界畫錯了。

**不憑感覺畫邊界。** 沒有依據的頂點，一個都不准加。

## 你能改什麼

- 地標斷言：`scripts/check_ring_landmarks.py` 的 `LANDMARKS` 清單（只准新增項目或修正錯的項目，不改程式邏輯）。
- 環的來源：`scripts/gen_era_regions.py` 的 `POLYS`（只在斷言失敗且你有明確依據時才動）。
- 生成結果：`src/geo/eraRegions.ts`（只能由 `gen_era_regions.py` 產生，不准手改）。
- 環的登記：`src/data/territory/ringProvenance.ts`（依據欄寫得不準時可以改文字）。

## 你不能改什麼

行軍路線（那是 march 的工作）、閘門腳本與門檻、`src/geo/japanEraRings.ts`、`asiaWarTerritory.ts`（本輪只回報，不改）。

**職責界線（2026-11-21 釘死）**：你只擁有 `scripts/check_ring_landmarks.py` 的環地標斷言；`scripts/check_route_landmarks.py` 的路線端點斷言屬 march，不准改。收到 march 的跨界需求時，寫進報告「下輪建議」，不要自己動手。commit scope 一律用 `(map)`。

## 佇列

```sh
python3 scripts/check_ring_landmarks.py --unasserted
```

每行格式：`環id｜依據首句`。這是「沒有任何地標斷言」的環。**從第一行開始做**，每輪做 6–8 個環。

基線（開工時先跑，結尾也要跑）：

```sh
python3 scripts/check_ring_landmarks.py | tail -1    # 失敗必須是 0
node scripts/audit_war_shape.mjs | tail -1           # 記下「示意框」數字
python3 scripts/audit_geo.py > /tmp/geo.log 2>&1; echo geo=$?
```

## 單一環的做法

以環 `shandong`（依據：現代山東省界，非當時政區）為例；此環已有斷言，下面只示範做法與格式。

1. **讀依據**：`grep -n "shandong:" src/data/territory/ringProvenance.ts`，讀 `basis`、`source`。這個環代表什麼（現代省界？某朝政區？山川形勢？）決定你能選什麼地標。
2. **選「必須在內」的地標**：該環所指區域中央、無爭議的地方（例如山東環取「濟南」）。要選**市街規模的地名**，不要選邊界附近的地方。
3. **選「必須在外」的地標**：緊鄰、但依據明確不屬於這個環的地方（例如山東環旁的「開封」屬河南）。若環的依據是「某朝政區」，外面的地標要選**同朝別的政區**。找不到合適的外部地標時，這個欄位填 `None`。
4. **查座標**（不要憑記憶）：
   ```sh
   python3 scripts/wp_coord.py "Jinan" --lang en
   python3 scripts/wp_coord.py "Kaifeng" --lang en
   ```
   英文條目通常有座標。查不到就換 `--lang zh`／`ja`，仍沒有就跳過該地標。
5. **新增斷言**：在 `LANDMARKS` 清單最後一行後追加（注意格式與逗號）：
   ```python
   ("濟南", 117.00, 36.67, "shandong", "henan"),
   ("開封", 114.35, 34.79, "henan", "shandong"),
   ```
   格式：`(名稱, 經度, 緯度, 應在其中, 不應在其中)`。環 id 必須是 `ringProvenance.ts` 裡存在的 id。
6. **驗證**：`python3 scripts/check_ring_landmarks.py | tail -5`
   - 全 `OK`、末行「失敗 0 個」：這個環完成，進下一個。
   - 出現 `FAIL`：進第 7 步。
7. **處理失敗**（失敗代表環界與史料或地理不符）：
   - 先確認不是你自己選錯：座標對不對？地名是不是屬於該環的時代範圍？重查一次。
   - 確定是環界畫錯，而且環的依據很清楚（河流、山脊、條約線）：在 `scripts/gen_era_regions.py` 的 `POLYS` 該環的頂點串裡，沿該河／山脈加入**有名字的真實參考點**（用 `wp_coord.py` 查座標，在註釋寫出名字），重新生成，見下節。
   - 依據不清楚、或你不確定怎麼改：**刪掉這條斷言**（用 `edit` 還原），列入放棄清單，寫明「疑似環界有誤：環id、地標、座標、依據」，交給人判斷。**不要保留會失敗的斷言，也不要硬改環界讓它過。**

## 改環界的重新生成流程（只有第 7 步需要）

```sh
python3 scripts/gen_era_regions.py > /tmp/gen.log 2>&1; echo gen=$?
git restore src/geo/japanEraRings.ts            # 生成器會順手改它，本輪不改日本，還原
git diff --stat                                  # 只應出現 gen_era_regions.py 與 eraRegions.ts
python3 scripts/check_ring_landmarks.py | tail -1
node scripts/audit_war_shape.mjs | tail -1       # 「示意框」不得增加，自我相交必須 0
python3 scripts/audit_geo.py > /tmp/geo.log 2>&1; echo geo=$?
npx tsc -b; echo tsc=$?
```

- 生成需要 `public/maps/china_edcp_relief.jpg`（被 git 忽略，只在你的 worktree 有）。找不到檔案就停止，不要自己建。
- 新增頂點的準則：只能放在**有名字的真實地物**上（河灣、山口、縣城）；每個新頂點的註釋要寫地物名。不准為了讓「示意框」數字下降而加沒有依據的頂點。
- 單次改動：一個環。改完驗證、commit，再做下一個。

## 判斷準則

- 環是「示意」，不是縣界。斷言用的地標要離邊界夠遠，不要拿邊界上的城市去賭。
- 一個環的「依據」若寫「現代省界」，就用現代省界判斷；若寫「某朝政區」，就看那一朝史料（《漢書·地理志》《元和郡縣圖志》等）。不要用現代地理替古代環下判斷。
- 史料有異說的地方，不寫斷言（寫了就是替其中一說背書）。
- 地標必須是「地名在史料裡有明確所屬」的地方，不是「大概在這附近」。

## 停止條件

- 佇列為 0：報告「佇列已空」，結束。
- 連續 3 個環都選不出有依據的地標：停止，寫報告。
- `audit_war_shape` 的自我相交大於 0：撤回最後一個改環界的 commit（`git revert`），列入放棄清單。

## 本輪指標

`check_ring_landmarks` 的「個地標」要增加（報告寫「開工數 → 收工數」）；失敗保持 0；`audit:war-shape` 的「示意框」與「自我相交」不得上升。
