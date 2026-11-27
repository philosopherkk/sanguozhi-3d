---
name: hf-map
description: Verify territory ring landmarks and schematic war-shape borders in historyfirst (agent/map). Use when running map rounds, adding ring landmarks, or fixing audit:war-shape issues.
---

# map｜疆域環地標與邊界查核技能

## 職責邊界
- 本職權限：`scripts/check_ring_landmarks.py`（`LANDMARKS` 清單）、`scripts/gen_era_regions.py`（`POLYS`）、`src/geo/eraRegions.ts`（僅由腳本生成）、`src/data/territory/ringProvenance.ts`。
- 禁止修改：`scripts/check_route_landmarks.py`、行軍路線（屬 `march`）、`src/geo/japanEraRings.ts`、`src/geo/asiaWarTerritory.ts`。
- commit scope 一律用 `(map)`。

## 取佇列與做法（每輪最多 4 項）
1. 執行 `node scripts/agent-queue.mjs map`。
2. **主佇列（無地標斷言的環）**：
   - 用 `grep -n "<環id>:" src/data/territory/ringProvenance.ts` 查該環依據。
   - 選一個史料明確屬於該環的市街級內部地標，以及一個緊鄰外部地標（無適合外部地標則填 `None`）。
   - 用 `python3 scripts/wp_coord.py "<條目名>" --lang en`（可改 `--lang zh`/`ja`）查座標，不靠記憶估計。
   - 在 `scripts/check_ring_landmarks.py` 末尾追加斷言，跑 `python3 scripts/check_ring_landmarks.py > /tmp/rlm.log 2>&1; echo exit=$?; tail -n 10 /tmp/rlm.log`。
   - 若斷言 `FAIL` 且依河道、山脈或條約線確知環界偏誤，才於 `gen_era_regions.py` 加入有名字的真實地物頂點並重生成（記得 `git restore src/geo/japanEraRings.ts`）；不確定則刪除該斷言並列入放棄清單。
3. **備援佇列（主佇列見底時）**：
   - 依 `agent-queue.mjs map` 指示跑 `npm run audit:war-shape`，只修有史料或自然地物依據的示意框，不為降數字而加無依據頂點。

## 驗證
- `python3 scripts/check_ring_landmarks.py > /tmp/rlm.log 2>&1; echo exit=$?; tail -n 5 /tmp/rlm.log`（失敗須為 0）。
- `npm run gates -- --only=audit:war-shape > /tmp/ws.log 2>&1; echo exit=$?; tail -n 10 /tmp/ws.log`。
- 收工時載入 `hf-gate-commit`。
