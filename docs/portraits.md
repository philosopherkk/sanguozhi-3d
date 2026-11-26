# 人物想像圖接線

- 來源：`public/portraits/manifest.json`（350 筆）與 25 個時代資料夾。
- 配對：只用 `id` 與時代資料夾，不用姓名；`portrait` 與 `portrait_note` 寫回各時代的人物資料。
- 顯示：`PersonPortrait` 用於人物清單（40px）、展開介紹（96px）與人物圖鑑（64px）。
- 人物圖鑑：全域懸浮按鈕開啟，直接讀取 manifest，可按時代與姓名篩選；日本通史的 26 幅圖由此入口展示。
- 核對：`npm run audit:portraits` 檢查圖檔、manifest 與人物資料的 id／name 三邊一致；`npm run audit:portraits -- --teeth` 注入四種破壞，證明規則仍有牙。兩者已納入 `npm run gates`。
- 已知限制：婦好原本只有事件記錄，已補上人物資料；所有圖均為想像圖，不是本人照片，也不是史料。
