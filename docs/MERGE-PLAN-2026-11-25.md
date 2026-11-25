# 合併與衝突審計（2026-11-25）

方法：全程 `git merge-tree --write-tree` ＋ `git commit-tree`（plumbing），沒有移動任何 worktree、
沒有 push、沒有改任何排程 agent 的分支。衝突數字是量出來的，不是猜的。

## 一、目前的三個位置

| 位置 | commit | 說明 |
|---|---|---|
| `origin/main` | `2f201804` | 排程 agent rebase 的依據 |
| 本地 `main`（KK 的 checkout） | `a4a4f893` | 領先 4 條，從未推上 GitHub，所以 agent 一併看不到 |
| 本分支 `kk/agent-guardrails` | `d5aa1173` | 護欄修正 6 條，未 push |

本地 main 那 4 條：`ef921d3f` 戰國時間軸修正、`4898d12b` 咸鏡道戰區、
`51bef535` 人物圖角標、`a4a4f893` 批次 4 文案。它們只碰 22 個檔，與四支 PR 的交集是
`src/qinhan/data/timeline.ts`（準確度）與 `src/japanEras/packs/edoPack.ts`（行軍），
實測行區重疊 0 處，可放心同場。

## 二、四支排程 PR：合併本身乾淨

| 分支 | 領先 commit | 淨檔數 | 併入 origin/main | 再併入本地 main |
|---|---|---|---|---|
| `agent/accuracy`（#195） | 25 | 11 | 乾淨 | 乾淨 |
| `agent/enrich`（#196） | 40 | 7 | 乾淨 | 乾淨 |
| `agent/map`（#197） | 21 | 5 | 乾淨 | 乾淨 |
| `agent/march`（#198） | 11 | 4 | 乾淨 | 乾淨 |
| `kk/agent-guardrails` | 6 | 6 | 乾淨 | — |

commit 數遠大於淨檔數，是因為它們大多數內容早已被 main 收走，分支只是還沒 rebase 掉。

跨支重疊只有 3 個檔，全部是準確度 × 加深同時改同一份 pack：
`jinPack.ts`、`tangPack.ts`、`wudaiPack.ts`。逐一比對 hunk 行區：**重疊 0 處**
（例：tangPack 準確度改 242 行，加深改 244–245 行，相鄰而不同行）。
自動合併結果逐一目視過一處，語意沒有互相蓋掉的跡象。

## 三、護欄一合併，四支 PR 立刻變紅（本審計的重點）

把「四支 PR ＋ 護欄」合成一棵樹跑 `npm run gates`：**exit=1**，兩項惡化：

| 閘門 | 基線 | 合併樹 | 來源 |
|---|---|---|---|
| `audit:chars.hard` | 0 | **2** | `scripts/check_route_landmarks.py:196,198`，「抽查」被打成日本新字形（U+67FB）；該檔是 #198 帶進來的，main 目前沒有 |
| `audit:commit-msgs.hard` | 0 | **5** | `agent/march` 4 個 commit 標題（同一支字 ＋ U+518C）、`agent/map` 1 個（日本新字形 U+5869） |

其餘指標全部持平或改善（`audit:data.warn` 49→20、`event-depth.gap` 118→0、
`war-shape.schematic` 101→57、`chengyu.shortage` 15→3）。

**為什麼 GitHub 的 CI 現在是綠的**：main 的 `audit:commit-msgs` 叫的是舊 selfcheck，
它自帶一份手抄字表、已與 HARD 漂移 702 字，所以查的其實是過時副本。護欄把字表統一之後，
同一批 commit 就露出來了。這不是護欄造出來的錯，是把一直存在的錯照亮。

新 selfcheck 在四支分支上新增命中（舊版全為 0）：

| 分支 | 檔內新增行 | commit 標題 | 粵語虛詞提示（不計失敗） |
|---|---|---|---|
| `agent/accuracy` | 1（`reports/source-audit.md:3332`） | 0 | 17 行 |
| `agent/enrich` | 0 | 0 | 0 |
| `agent/map` | 0 | 1 | 10 行 |
| `agent/march` | 11（`reports/march-route-handcheck.md` 9 處 ＋ 上面那個 py 檔 2 處） | 4 | 41 行 |

要收掉有兩條路，得 KK 選（見第六節）：改檔 ＋ 重寫那 5 個 commit 標題（要 force-push，
而 cron 可能再推同一分支蓋掉，必須緊貼在合併前做）；或是接受一次性放寬基線。

## 四、舊內容分支（#182 ＃183 ＋ Wave A/B 整合樹）要重切，不要在舊樹上解衝突

先講實況：`public/portraits/manifest.json`（350 筆）與 `src/components/PersonPortrait.tsx`
**main 已經有了**；#182 自己剩下的工作是 11 檔 +687 行（把圖掛回人物記錄 ＋ `audit:portraits` 閘門）。
`scripts/audit_critical.mjs` 與 `reports/critical-incidents.md` main **尚無**，只有 b2 與 #183 有，
而且兩支各寫了一份（add/add 衝突的來源）。

順序模擬（✓ 乾淨、✗ 後面是衝突檔）：

- **順序甲**（先收四支 PR，再收舊內容）：4 支全 ✓ → #183 ✗ 1（`scripts/audit-data.ts`）
  → #182 ✗ 2（`reports/gate-baseline.json`、`src/App.tsx`）
  → `kk/integration-b2` ✗ **16**（圖譜 manifest、`critical-incidents.md`、`audit_critical.mjs`、
  `PersonPortrait.tsx`、`people.json`、`suiPack`/`tangPack`/`wudaiPack`、四個 `types.ts` 等）
- **順序乙**（先收 b2）：b2 ✗ 3（`audit-data.ts`、`PersonPortrait.tsx`、`SengokuMap.tsx`）
  → #183 ✗ 12 → #182 ✗ 2 → 四支 PR 全 ✓

兩種順序都要解 17–19 處衝突，而且 b2 的 16 處大半是它與 #183 各自實作了同一件事
（關鍵事變盤點器、圖譜掛載）造成的 add/add。**結論：b2、#183、#182 不應照原樣輪流併。**
按既有教訓的做法，是把它們在三點 diff 上的淨變更（b2 407 檔、#183 42 檔、#182 11 檔）
以現行 origin/main 為底重切成一棵整合樹、跑綠閘門、出一個 commit 的 PR。

## 五、建議落地順序

1. KK 在 Review 面板驗 :5198（Wave A）與 :5199（BATCH 1）——這一步還沒做，其餘都卡它。
2. 先併四支排程 PR（#195–#198）。它們的 CI 現在綠、delta 小、互不重疊；越晚併越會漂移。
   合併前先決定第三節那 5 個 commit 標題怎麼處理（合併後 `origin/main..HEAD` 變空，
   該閘門對 main 自動失效，所以「先併再修字表」會讓錯字永久隱形）。
3. 再併本分支 `kk/agent-guardrails`（護欄）。順序 2 在前，就不會有「PR 突然變紅」的空窗。
4. 最後把 b2 ＋ #183 ＋ #182 重切成單一 PR（不是照原樣輪流併），並重記基線：
   `data.warn` 49→20、`event-depth.gap` 118→0、`war-shape` 101→57、`chengyu.shortage` 15→3。
   注意 `reports/gate-baseline.json` 是三方的共同衝突點，以重記後的現值為準。

## 六、要 KK 裁定

1. 那 5 個 commit 標題與 `check_route_landmarks.py` 的 2 處錯字：改檔 ＋ force-push 重寫，
   還是一次性放寬基線？
2. 本地 main 領先的 4 條要推上去嗎？不推，agent 每輪都看不見它們（文案與出處修正會重複做）。
3. 非 `src/` 的粵語虛詞要不要升級成閘門？現在 41 行（march 的 reports）只提示不計失敗。
4. b2 ＋ #183 ＋ #182 是否同意重切成單一 PR（我可以在 KK 驗完 :5198/:5199 之後做）。
