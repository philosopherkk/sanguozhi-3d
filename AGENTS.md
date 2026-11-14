# 中日歷史回顧（repo: sanguozhi-3d）— Agent rules

- All UI text is in Traditional Chinese (zh-Hant). No Simplified characters.
- **正體化原則（改字時一律遵守）**：全站文字（UI、資料欄位、程式註解、`docs/`、`scripts/`）
  一律正體中文；簡體字與日文新字（例：`戸`→戶、`関`→關、`図`→圖、`来`→來）同視為錯字。
  但**只換字形、不改用字與語序**：措辭、詞序、語氣照原貌，不得順手潤飾、改寫或換詞。
  以下照原形保留，不得「正體化」：可逐字比對之引文（「…」『…』《…》內文字、`quote`／`source` 欄）、
  原典與史料題名（例：《徳川実紀》『戦史叢書』）、日文專名與機構原名、資料 `id` 欄、
  維基百科條目標題（含資料中的 `label:`）、短程式碼片段（`` `代碼` ``）與 URL。
  判準一句：屬於原文或可追蹤識別碼者不動；屬我方撰寫之敘述者一律正體。
- History must come from primary sources: 陳壽《三國志》with 裴松之注, 范曄《後漢書》,
  司馬光《資治通鑑》, and 《晉書》. Never use 《三國演義》.
- **日本史料（同等級要求）**：一手用《日本書紀》、《古事記》、『吾妻鏡』、
  《徳川実紀》、法令原文（《武家諸法度》《禁中並公家諸法度》《松前島郷帳》條文）、條約文、
  公文書（防衛省『防衛白書』、內閣決定、『日本外交文書』、防衛研究所『戦史叢書』）。
  軍記文學（《平家物語》《治戰記》《保元物語》《平治物語》等）可以引用，但必須喺 `source`
  標明「文學作品，非史實記錄」。絕不用二次創作（《三國演義》式）文獻當史料。
- **唔准扮作原文**：只有可以喺 Wikisource（zh 用 `zh.wikisource.org`、日本用 `ja.wikisource.org`；
  工具 `scripts/qsrc.py --host ja.wikisource.org --search <詞>`）攞到**可逐字比對**嘅文字，
  先可以逐字引用。攞唔到（例如 ja.wikisource 嘅 ProofRead 掃描頁、正文喺 `Page:` 空間抽唔到）就
  一律喺 `source` 寫明「通說整理，非逐字引文」，並喺 `note` 解釋點解。引用前用
  `npm run audit:quotes -- --live --mark-verified`（中文）或 `qsrc.py --host ja.wikisource.org`（日本）查證。
- **近現代（中國 1912 年起／日本 1868 年起）**：唔使文言原文；用現代中文簡述（`desc`）＋三層意譯＋四段。
  出處用條約、法令、白書、公文書。凡遇各方分歧嘅數字（南京事件、沖繩戰、英帕爾、
  戰時動員人數等），一律 `disputed: true`、喺 `note` 講明分歧，**唔寫定數**。
- **人物連結**：維基連結以中文條目優先；如果無中文條目（例：シャクシャイン、メナシ・クナシルの戦い），
  可用日本維基，並喺 `note` 或 `brief` 講明「中文維基無條目」。
- Every data entry (event, person, number) needs a `source` field, e.g. "《三國志·魏書·武帝紀》".
- If a fact is uncertain or disputed, set `"disputed": true` and explain why in `note`.
- Map borders are approximate schematics on modern relief (in-app:
  「州界為示意……幾何非譚第三冊圖幅追蹤」, `TK_TERRITORY_NOTE_ZH`). They are NOT a
  digitization of 譚其驤《中國歷史地圖集》第三冊 — never import or trace 譚圖 geometry;
  use ownership KEYS + sourced notes only.
  日本時代用歷史的藩域／郡界示意（`src/geo/japanEraRings`、`jpDomains`）；
  戰爭時代（明治至當代、二次大戰）先用寬域亞洲底圖（Natural Earth 1:50m 海岸線，
  `scripts/gen_asia_war_*.mjs` 產生），非戰爭時代返回日本地圖。
- Structure for every deep-dive entry: 原文（或現代簡述）→ 三層意譯（小學生／中學生／大學生）→
  起因 → 經過 → 關鍵人物（連維基）→ 結果及影響。用 `node scripts/audit_entries.mjs` 篩缺項。

- Commit after each phase. Use Conventional Commits.
- Agent chat replies to the user may use Cantonese (粵語口語).
- **粵語／正體嘅邊界（2026-11-13 使用者裁定：「agents.md 可以講粵語，但網站輸出要正式正體」）**：
  - **可以用粵語口語**：本檔、`docs/`、`scripts/`（註解與報告都係 agent 嘅工作產物），同埋同使用者嘅對話。
  - **必須正體中文書面語**：網站上睇到嘅一切——UI 文案、資料欄位（`name`／`note`／`source`／`desc`／`brief`）、
    以及 `src/` 入面嘅程式註解。口語虛詞（例：嘅、唔、咗、咩、佢、喺、冇、嗰、啲）唔准出現喺 `src/`。
  - **粵語豁免唔包括簡體字**：簡體字同日文新字喺 `docs/`、`scripts/` 照樣係錯字（`audit:chars` 預設掃
    `src`、`scripts`、`docs`）。換句話講：語氣可以粵語，字形一律正體。
  - 機器把關：`scripts/audit-chars.ts` 嘅 `CANTONESE` 表——非 agent 產物嘅路徑出現口語虛詞即算硬傷；
    豁免邊界同呢條規則本身都由 `npm run audit:chars -- --teeth` 驗證（兩邊都釘死，防止誤關或退化）。
- **`reports/chars-allowlist.json` 每條豁免要有錨**：除 `file`／`char`／`reason` 之外必須寫 `context`
  （豁免生效嘅行必須出現嘅上下文字串，不短於 4 字），豁免只喺含錨嘅行生效——只有「檔名＋字形」
  等於話「呢支檔嘅呢支字永遠合法」，同一支檔其他地方寫錯字都照樣過。無 `context` 或錨過短，
  一律當豁免檔配置錯並計入硬傷（閘門唔會靜靜接受）。一支字為幾個唔同專名豁免就要幾條，逐組給錨。
