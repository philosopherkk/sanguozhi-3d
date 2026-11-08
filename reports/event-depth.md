# 事件三段深度審計

範圍 `src`｜事件段落 782 筆｜未達標 **578 段**（其中空段落 0 段）

| 段 | 筆數 | 中位字數 | 平均字數 | 門檻 | 未達標 |
|---|---|---|---|---|---|
| 起因 | 204 | 34 | 36 | ≥200 | 204 |
| 經過 | 248 | 63 | 65 | ≥200 | 245 |
| 結果 | 330 | 420 | 300 | ≥400 | 129 |

## 按模組（未達標段數）

| 模組 | 段數 | 未達標 | 起因 | 經過 | 結果 |
|---|---|---|---|---|---|
| `src/zhou/data` | 243 | **181** | 81 | 79 | 21 |
| `src/japanEras/packs` | 111 | **111** | 37 | 37 | 37 |
| `src/data` | 84 | **83** | 28 | 27 | 28 |
| `src/imperial/data` | 170 | **48** | 0 | 44 | 4 |
| `src/bakumatsu/data` | 45 | **45** | 15 | 15 | 15 |
| `src/qinhan/data` | 63 | **44** | 21 | 21 | 2 |
| `src/sengoku/data` | 39 | **39** | 13 | 13 | 13 |
| `src/heian/data` | 27 | **27** | 9 | 9 | 9 |

## 最短 15 段

| 段 | 現長 | 檔 | 事件 id | 行 |
|---|---|---|---|---|
| 起因 | 14 | `src/sengoku/data/timelineDetails.ts` | (未識別 id) | 143 |
| 起因 | 16 | `src/data/timelineDetails.ts` | (未識別 id) | 540 |
| 結果 | 16 | `src/heian/data/history.ts` | (未識別 id) | 432 |
| 結果 | 17 | `src/sengoku/data/timelineDetails.ts` | (未識別 id) | 165 |
| 起因 | 17 | `src/zhou/data/timeline.ts` | mie-wei | 711 |
| 結果 | 18 | `src/data/timelineDetails.ts` | (未識別 id) | 571 |
| 起因 | 18 | `src/sengoku/data/timelineDetails.ts` | (未識別 id) | 115 |
| 起因 | 18 | `src/zhou/data/studentEvents.ts` | jiagu | 340 |
| 結果 | 18 | `src/zhou/data/timeline.ts` | mie-yan | 688 |
| 起因 | 19 | `src/bakumatsu/data/history.ts` | 1869-hakodate | 392 |
| 結果 | 19 | `src/bakumatsu/data/history.ts` | 1869-hakodate | 407 |
| 結果 | 19 | `src/bakumatsu/data/history.ts` | (未識別 id) | 465 |
| 結果 | 19 | `src/bakumatsu/data/history.ts` | (未識別 id) | 476 |
| 起因 | 19 | `src/heian/data/history.ts` | (未識別 id) | 391 |
| 起因 | 19 | `src/sengoku/data/timelineDetails.ts` | (未識別 id) | 171 |

## 三層意譯（小學生／中學生／大學生）

| 層 | 筆數 | 中位字數 | 門檻 | 未達標 |
|---|---|---|---|---|
| 小學生 | 180 | 61 | ≥60 | 86 |
| 中學生 | 338 | 55 | ≥120 | 319 |
| 大學生 | 338 | 178 | ≥300 | 304 |

以大學層筆數（338）為基準：**完全缺小學生層 158 個**、缺中學生層 0 個。

## 「大學生程度」的實質要求（不是湊字數）

- 起因分兩層：結構性原因（制度、財政、正統性、地緣等慢變數）＋直接觸發（哪一件事令它在此年發生）。
- 經過要有順序與轉折：誰做了什麼決定、哪個環節改變結果；不可把 `desc` 換句話說充數。
- 兩段都要有史料意識：數字標明口徑；有爭議寫明爭議與文獻性質（例如軍記文學成書較晚、敘事有加工）。
- 不可編造出處：只可沿用該模組別處已引、且確實涵蓋同時代同地域的具名著作；不可憑空寫卷頁。
- 分歧數字一律 `disputed: true` 並在 `note` 說明分歧，不寫定數。
