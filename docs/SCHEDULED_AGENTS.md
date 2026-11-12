# 排程 Agent 規章（2026-11-11 立，OpenCode 原生排程）

> 本檔為五支排程 agent 的共同鐵律。各 agent 每輪開工前必讀本檔與 `AGENTS.md`。
> 執行環境：OpenCode 背景服務（桌面 app），本機模型 `strata/unsloth-ud-iq4_xs-v31`。
> 併發上限：**任何時刻最多兩支** agent 同時執行（本機模型資源所限）。

## 0. 真確性鐵律（最高優先，違反即本輪作廢）

1. **一字不虛**：任何事件、人物、年份、數字、疆域、路線，必須有一手史料或等同級公文書支撐。
   能在 Wikisource 逐字比對者方可逐字引用；取不到逐字原文，一律於 `source` 標
   「通說整理，非逐字引文」，並於 `note` 說明原因。
2. **有疑即標**：凡年份、數字、歸屬、名分有異說或爭議，必設 `"disputed": true`，
   並於 `note` 寫明分歧各說與出處，**絕不自行取定數**。寧可標爭議，不可編造確數。
3. **純正體中文**：全站（UI、資料欄位 name/note/source、程式註解）一律繁體中文書面語。
   禁簡體字、禁日本新字混入中文、禁粵語口語虛詞（嘅、唔、咗、咩、佢等）。
   寫完中文即跑 `node --experimental-strip-types scripts/audit-chars.ts`，硬傷必須為 0。
4. **史料分級**（詳見 `AGENTS.md`）：中國用《三國志》裴注／《後漢書》／《資治通鑑》／《晉書》等正史；
   日本用《日本書紀》《古事記》『吾妻鏡』《徳川実紀》法令與條約原文及防衛省戰史叢書等；
   軍記文學（《平家物語》等）可引但 `source` 須標「文學作品，非史實記錄」；**絕不用《三國演義》式二次創作**。
5. 近現代（中國 1912 起／日本 1868 起）用現代中文簡述＋三層意譯＋四段結構，出處用條約／法令／白書／公文書；
   分歧數字（南京事件、沖繩戰、英帕爾等）一律 `disputed`。

## 0.5 模型鐵律（與真確性同級）

**本專案所有排程 agent 只准由本機模型 `strata/unsloth-ud-iq4_xs-v31`（Unsloth UD IQ4 XS v31）執行。**
不得改用、回退或借用任何雲端模型（poe／xai／openai／anthropic 等一律禁止）。理由：內容查證屬本機
資料，且本機模型可 24 小時輪值。

機制（已生效，實測過）：
- 每個排程 worktree 根目錄有 `.opencode/opencode.json`（已列入 `.gitignore`，各 worktree 一份），內容為
  1. `model` 與 `agents.build/plan/general/explore/title/summary/compaction` 全部 pin 在
     `strata/unsloth-ud-iq4_xs-v31`；**尤其 `explore`／`general` 等 subagent 與 `title`／`summary`／
     `compaction` 等輔助 agent 不會自動繼承工作階段的模型**，未 pin 就會偷偷用雲端模型（實測過會漏）。
  2. `policies`：先 `provider.use * deny`，再 `provider.use strata allow`——其他 provider 從目錄中消失，
     選了會直接報 `Model unavailable`，不是提示而是硬擋。
- 排程工作階段（session）本身亦已存 `model=strata/unsloth-ud-iq4_xs-v31`。
- 該鎖定檔由 **root 擁有、444、並設 `schg`（系統不可變旗標）**：連檔案擁有者都無法修改或刪除
  （`chmod`／`rm`／`git clean` 對它會報 `Operation not permitted`）。有一支 root LaunchDaemon
  （`com.historyfirst.model-watchdog`，每 15 分鐘）負責驗證內容、把被改動的排程與會話模型改回來，
  並在無法自動修復時發 macOS 通知。所以：
  - 看到 `Operation not permitted` 之類錯誤，**不要設法解除旗標**（你也解不了），照 §0.5 self-check
    的規定停止並報告即可。
  - **不要嘗試以 `git clean -fdx`、`git reset --hard` 之類動作動它**：兩者都不會動到它。

每輪開工 self-check（缺檔即停止本輪並在報告說明，**絕不可自行刪除或改寫此檔以繞過限制**）：

```bash
test -f .opencode/opencode.json \
  && grep -q '"action": "provider.use", "resource": "\*", "effect": "deny"' .opencode/opencode.json \
  && grep -q '"resource": "strata", "effect": "allow"' .opencode/opencode.json \
  && echo MODEL_LOCK_OK || echo MODEL_LOCK_MISSING
```

兩條都要核（只查 strata 存在，擋不住「留 allow、抽走 deny-all」的改動）。
該檔權限為 `444`（唯讀）。若遭破壞，由使用者或協調者跑
`sh ~/Documents/my-project/.agent-runtime/ensure-model-lock.sh` 復原；**agent 不准自行復原或改寫**。

若任何工具回報 `Model unavailable` 或 `Blocked by configuration policy`：**即視為本輪失敗**，
於報告貼出訊息原文；不准改用其他模型續跑，不准嘗試解除鎖定。

## 1. 工作區與交付紀律（每支 agent 相同）

- 各 agent 有專屬 git worktree 與 branch（見下表），**絕不 `cd` 去別人的 worktree 或主 checkout**。
- 開工序：
  1. `git status` → 若工作區有非本 agent 的改動（且非本輪自己產出）→ **停止本輪並於報告說明**。
  2. `git fetch origin`；`git switch <本branch>`；`git rebase origin/main`（有衝突先解或 abort 後報告）。
  3. 做事（見各自任務）。**每一批 2–4 條就 commit 一次**（runner 曾多次做完未落盤）。
  4. push 到自己的 branch，**核實落地**：`git ls-remote --heads origin <branch>` 的 SHA
     必須等於 `git rev-parse HEAD`；不等＝本輪失敗，報告貼出 push 完整輸出。
     禁 `--force`；rebase 後只准 `--force-with-lease`。
  5. 無 OPEN PR 就 `gh pr create --base main --head <branch>`；回報貼 PR URL 與
     `gh pr view <n> --json state,mergeable` 實際輸出。
- **每輪須是有界批次**（bounded batch），控制在約 30–60 分鐘內完成並落盤，不可無限展開。
- 禁改：`reports/gate-baseline.json`、`scripts/audit-*`、`scripts/gate-ci.mjs` 的門檻、
  `AGENTS.md`、`.cursorrules`、`.opencode/opencode.json`（模型鎖定，見 §0.5）（除非使用者明令）。禁跑任何 `--update-baseline`。

## 2. 閘門（每輪收尾必跑，記前後數字，只准降不准升）

```
npm run gates          # 總閘門（與 reports/gate-baseline.json 比較，惡化即失敗）
npm run build          # 必須 exit 0
npm run lint           # 0 error
```

個別閘門：`audit:event-depth`、`audit:detail-depth`、`audit:reading-layers`、`audit:chars`、
`audit:quotes`、`audit:wiki-links`、`audit:chengyu-coverage`、`audit:map`、`audit:war-shape`、
`audit:ranges`、`audit:geo`。**本輪負責的指標要往下走，其餘指標不得上升。**

## 3. 查證工具

- `python3 scripts/qsrc.py 後漢書/卷71 '大賢良師'`（中文逐字核對 Wikisource）
- `python3 scripts/qsrc.py --host ja.wikisource.org --search <詞>`（日本史料）
- `node scripts/exa.mjs search "<查詢>" --num 5`（語意搜尋，金鑰自 `~/.exa_api_key` 三層查找；
  **Exa 回傳為二手網頁，只用來找「一手引文在哪」與「學界爭議在哪」，引文仍要回到原典逐字核對**）。
- 維基連結死活：只信 MediaWiki API `action=query&redirects=1&titles=` 的 `missing` 欄；
  **HTTP 200 不等於條目存在**。

## 4. 五支 agent、職責與檔案擁有權

| Agent (branch) | 任務 | 主要負責檔案 | 主閘門 |
|---|---|---|---|
| `agent/ui` | 介面與體驗，尤重手機／平板 | `src/App.css`、`src/mobile.css`、`src/index.css`、各 `components/**.tsx`（版面與觸控，不動資料） | `audit:mobile`（結構不變量） |
| `agent/enrich` | 內容加厚（敘事三段、三層意譯、詳情、人物維基連結、成語覆蓋） | 各 `*/data/timeline*.ts`、`readingLayers`、`detail`/`details`、`studentEvents`、`src/chengyu/data/idioms.json`、人物 `wiki` 欄 | `audit:event-depth`、`audit:detail-depth`、`audit:reading-layers`、`audit:chengyu-coverage` |
| `agent/map` | 疆域／版圖精度（示意邊界、era rings、勢力控制幾何、底圖） | `src/geo/**`、`src/data/territory/**`、`src/data/{provinces,basemapProvinces,territoryControl,historicalBasemaps}.ts`、imperial `realmRanges/outerRings/tangRings/yananRing/liaoWest/warlordRanges/modernChina.ts`、sengoku `regions/tracedDomains/codhKokugunMeshes`、bakumatsu 藩域 mesh、`jpDomains.ts` | `audit:war-shape`、`audit:geo`、`audit:ranges` |
| `agent/march` | 行軍／進軍路線（陸海路徑、箭頭座標、路線年份與事件對齊） | `src/data/marchRoutes.ts`（僅 `CHINA_MARCH_ROUTES` 與型別）、各 `*/data/marchRoutes*.ts`、imperial `routesSuitang/routesNanbei/line/waypoints.ts`、`src/components/map/RouteOverlay.tsx`、`MapRouteLegend.tsx` | `audit:map`（路線海陸與年份一致性） |
| `agent/accuracy` | 內容正確性查證（引文可核性、出處、年份、數字口徑、死鏈） | 任何資料檔的 `source`／`note`／年份欄與維基連結；**只准三類修改：加出處、降調措辭、修死鏈**；不新增敘事 | `audit:quotes`、`audit:wiki-links` |

### 檔案衝突帶（map 與 march、accuracy 與 enrich 共用檔的協調）
- `src/data/marchRoutes.ts` 同時含路線（march）與 `FRONTIER_ZONES` 疆域（map）：**march 只動路線與型別、map 只動 `FRONTIER_ZONES`**。
- imperial 各 pack 與 japan deep-dive 各 pack 同檔含 `routes:`（march）與 `snapshots/control/domains`（map）：**各改各欄，勿動對方欄位**。
- 地圖類 `.tsx`（Map2D、各 Map/Stage/Docks）同時渲染疆域與路線：改動前先 `git fetch`＋rebase，盡量只改自己那段；無法避免時於 PR 說明。
- `accuracy` 與 `enrich` 可能動到同一資料檔的不同欄位（accuracy 改 source/note/年份、enrich 改敘事）：各在自己 branch，靠 rebase 解衝突。

## 5. 併發時鐘（OpenCode 排程，Asia/Hong_Kong，皆於整點 :10 觸發）

設計使**任一時刻最多兩支**同時執行：各 agent 佔不同鐘點、彼此至少相隔 1 小時起跑；
單輪控制在 ~60 分鐘內，故最壞情況只有「前一支尾段」與「後一支開頭」重疊＝2 支，永不達 3。

| Agent | cron | 每日次數 |
|---|---|---|
| `agent/accuracy` | `10 0,4,8,12,16,20 * * *` | 6 |
| `agent/enrich` | `10 2,6,10,14,18,22 * * *` | 6 |
| `agent/map` | `10 1,9,17 * * *` | 3 |
| `agent/march` | `10 3,11,19 * * *` | 3 |
| `agent/ui` | `10 5,13,21 * * *` | 3 |

（`07,15,23` 時段刻意留空作緩衝。）如需調整頻率，改各 schedule 的 cron 即可，但**務必維持「同一鐘點至多一支起跑、彼此相隔 ≥1 小時」**以守住併發 ≤2。

## 6. 教訓（每條都付過學費）

1. 做完未 commit／push＝零交付：每 2–4 條落盤。
2. 開放式跨模組任務易零產出：收窄成「單檔＋明確佇列＋一輪做得完」。
3. 簡體字 IME 殘留反覆出現：寫完即跑 `audit:chars`。
4. 判「死鏈」前先證明自己的方法沒錯（用批量 `titles=` API）。
5. `.env` 在 worktree 不存在：金鑰走絕對路徑 `~/.exa_api_key`。
6. fixed 元素自成 stacking context（UI 層級見 `App.css` z-index 階：內容 ≤9｜分頁條 41｜詳情窗 50）。
7. 疆域是示意，禁引入譚其驤《中國歷史地圖集》幾何；`landMask.ts` 是執行時檔案，地理判斷用 `ASIA_LAND`。
