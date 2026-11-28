---
name: hf-plan
description: 執行 docs/plans/2026-11-28/*.md 的計畫行（plan 軌道）——照「驗收」指令收工，做完把 ☐ 改成 ☑。
---

# 照計畫執行（plan 軌道）

取工作單：`node scripts/agent-queue.mjs plan --track=<自己的軌道> --todo=2`
印出的每一行已寫好「做什麼、改哪個檔、用哪條指令驗收」。**不要自己決定做什麼。**

## 一行的格式

```
☐ src/countries/vietnam/vnmodernPack.ts｜改 vn-1975-evacuation-sea 的 points：起點改 P(106.6, 10.8)｜驗收=node scripts/audit_map_accuracy.mjs --json
```

1. 先讀該檔，找到行裡點名的 id 或位置，再用 edit 工具改。
2. 跑「驗收」那條指令（長輸出寫進檔案只看結尾），輸出要符合驗收說明。
3. 驗收通過，才把該行開頭的 `☐` 改成 `☑`，同一次 commit 一起送（commit scope 用自己軌道的名字）。
4. 驗收不通過：**不要改 `☑`**，在該行末尾補 `｜ blocked: <實測輸出前 60 字>`，報告裡寫明，繼續下一行。

## 必守規則

- 一行只碰一個檔案。要改第二個檔＝那行不屬於你，跳過並在報告列出。
- 「驗收」是客觀指令，不是建議。沒跑過就不能寫 `☑`，也不能在報告說完成。
- 計畫行裡給的座標、年份、引文已經查過，照抄即可；**不要憑記憶改數值**。
- 行末寫「標 BLOCKED」或「先停」的，代表該項已裁定不適用：照做（通常是搬檔或不動），並記 BLOCKED 原因。
- 繁體只准正體：新增行會過 `node scripts/agent-selfcheck.mjs --branch origin/main`（簡體、粵語虛詞都算錯）。
  要打的專名如果不確定寫法，先在本檔用 grep 找出既有寫法，或沿用計畫行裡給的字。
- 引文一律照 `hf-accuracy` 的來源分級規則；計畫沒給出處的就不要自己編引文。
