---
name: hf-enrich
description: Enrich short event segments and missing elementary reading layers in historyfirst (agent/enrich). Use when running enrich rounds or fixing audit:event-depth gaps.
---

# enrich｜內容加厚與小學層補齊技能

## 取佇列（不整檔讀報告）
1. 執行 `node scripts/agent-queue.mjs enrich`，直接取清單前 1–4 項。
2. 若缺口多為 `elementary`（小學生層），優先挑選**同一檔案**內的 2–4 條集中處理，減少讀檔次數。
3. 讀檔只讀目標事件上下約 35 行（先 `grep -n "<id>" <檔>`）。

## 寫作硬規
1. 門檻（去空白計）：`causes >= 200`、`course >= 200`、`outcome >= 400`。
2. `layers.elementary`（小學生層）：用短句與淺白詞彙講清楚起因與結果，字數必須低於 `secondary` 的一半（配合 `audit:reading-layers` 的 `1 : 1.5 : 3` 遞增門檻，避免過長或與中學生層雷同）。
3. **依據只取該事件已有的 `source`、`desc`、`secondary`、`note`、`keyFigures`**，或以 `python3 scripts/qsrc.py` 查得的原文。不從記憶補細節，不寫「影響深遠」等空話，不套用樣板句（會被判灌水）。
4. 保持原檔格式（單行字串維持單行，不亂改模板字串或並置 `+`）。
5. 禁改 `src/**/components/`、CSS、地圖幾何、`id`、`year`、`disputed` 原值。

## 單項驗證與 scope
- 跑 `node scripts/audit_event_depth.mjs > /tmp/ed.log 2>&1; echo exit=$?; tail -n 10 /tmp/ed.log`（確認該項消失、灌水嫌疑為 0）。
- 若改動 `layers`，加跑 `node scripts/audit_reading_layers.mjs > /tmp/rl.log 2>&1; echo exit=$?; tail -n 10 /tmp/rl.log`。
- 快驗：`npm run gates -- --only=audit:event-depth > /tmp/g.log 2>&1; echo exit=$?; tail -n 10 /tmp/g.log`。
- commit scope 必須為 `data(enrich):` 或 `docs(enrich):`（不得用 `data` 或其他名稱）。
- 收工時載入 `hf-gate-commit`。
