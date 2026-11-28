---
name: hf-march
description: Verify march route endpoints and add missing critical-year routes in historyfirst (agent/march). Use when running march rounds or checking check_route_landmarks.py.
---

# march｜行軍路線端點與補線技能

## 職責邊界
- 本職權限：`scripts/check_route_landmarks.py`（`ASSERTS` 清單）、`src/**/marchRoutes*.ts`、`src/japanEras/packs/*Pack.ts` 與 `src/imperial/data/*` 內之路線物件。
- 禁止修改：`scripts/check_ring_landmarks.py`、疆域色塊（屬 `map`）、`FRONTIER_ZONES`。
- commit scope 一律用 `(march)`。

## 取佇列與做法（每輪最多 4 條）
1. 執行 `node scripts/agent-queue.mjs march`。
2. **主佇列（無斷言路線）**：
   - 用 `grep -n "id: '<路線id>'" -r src | head -3` 找行號並讀該路線物件（只讀約 25 行）。
   - 只針對史料明確記載的起點或終點查座標：`python3 scripts/wp_coord.py "<英文條目>" --lang en`（無則試 `zh`/`ja`）。
   - 差距超出容差才用 `python3 scripts/check_route_landmarks.py --px china <lon> <lat>`（日本戰區用 `japan`）重算端點；陸路不得穿海、海路（`kind: 'sea'`）不得上陸。
   - 在 `ASSERTS` 追加斷言（附具體史料與卷章），跑 `python3 scripts/check_route_landmarks.py > /tmp/rt.log 2>&1; echo exit=$?; tail -n 10 /tmp/rt.log`（失敗須為 0）。
3. **備援佇列（關鍵年補線）**：
   - 新增線一律標明示意、吸附既有座標表，且 `year` 須對齊同年度既有事件，不得憑空造政權。

## 四國（韓／泰／越／馬）路線
- 座標就寫成經緯度 `P(經度, 緯度)`，**不用換算畫布**（`--px` 只給中國、日本戰區用）。
- 修或補一條路線，都要同時在 `scripts/check_route_landmarks.py` 的 `ASSERTS` 追加一行（Python 元組）：
  `("路線 id", "start" 或 "end", "今地名", (經度, 緯度), 容差km, "史料＋座標來源")`
  例：`("ko-1388-return", "end", "開城（今朝鮮開城市區）", (126.55, 37.97), 12, "《高麗史·辛禑世家》威化島回軍；座標見維基 Kaesong 條")`
- 容差照 P0 行寫明的數字，不要自己放寬；來源欄要寫得出處，不能只寫「通說」。
- 驗收（plan 行已帶這條指令）：`python3 scripts/check_route_landmarks.py --only=<路線 id>`
  尚無斷言、斷言指向不存在的 id、或距離超容差，都會 exit 1。**只改座標不補斷言＝驗收不過。**
- 座標查證順序：`wp_coord.py` → `qsrc.py` → websearch/webfetch；查不到就不斷言該端（plan 行會寫明只斷言哪一端）。

## 驗證
- `node scripts/audit_map_accuracy.mjs > /tmp/ma.log 2>&1; echo exit=$?; tail -n 5 /tmp/ma.log`（須 `fail 0｜warn 0`）。
- `npm run gates -- --only=audit:map > /tmp/gm.log 2>&1; echo exit=$?; tail -n 10 /tmp/gm.log`。
- 收工時載入 `hf-gate-commit`。
