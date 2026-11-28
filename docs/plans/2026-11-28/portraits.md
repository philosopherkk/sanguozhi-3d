# 四國人物想像圖規劃（韓國／泰國／越南／馬來西亞）

## 現況數字

- **既有圖庫規模（`public/portraits/manifest.json`）**：僅涵蓋中國與日本，共 `350` 筆（`count: 350`，25 個時代），`node scripts/audit-portraits.mjs` 現況為 `fail 0, linked 350/350, files 350`。
  - 中國 13 槽共 `251` 筆：`sanguozhi` 70、`zhou` 68、`qinhan` 18、`imperial-civilwar` 14、`imperial-yuanmingqing` 12、`imperial-nanbei` 11、`imperial-minguo` 11、`imperial-liaosong` 9、`imperial-tang` 9、`imperial-jin` 8、`imperial-sui` 8、`imperial-wudai` 7、`imperial-prc` 3。
  - 日本 12 槽共 `99` 筆：`japan-history` 26、`heian` 14、`sengoku` 12、`japan-imjin` 11、`japan-modern` 10、`japan-edo` 8、`bakumatsu` 7、`japan-asuka` 3、`japan-azuchi` 3、`japan-kamakura` 3、`japan-muromachi` 3、`japan-nara` 2。
- **四國 16 包現況（`src/countries/{korea,thailand,vietnam,malaysia}/*Pack.ts`）**：合計宣告 `107` 位人物，目前掛入 `portrait` 欄位者皆為 `0`：
  - 韓國（`12` 人）：`koancientPack.ts` 3、`kogoryeoPack.ts` 3、`kojoseonPack.ts` 3、`komodernPack.ts` 3。
  - 泰國（`23` 人）：`thsukhothaiPack.ts` 4、`thayutthayaPack.ts` 6、`thchakriPack.ts` 6、`thmodernPack.ts` 7（人名欄 `th-p-phibun` 原為簡體形，2026-11-28 已修，見下表 ☑）。
  - 越南（`52` 人）：`vnnorthPack.ts` 10、`vndynastyPack.ts` 13、`vnnguyenPack.ts` 12、`vnmodernPack.ts` 17。
  - 馬來西亞（`20` 人）：`mymalaccaPack.ts` 5、`mycolonialPack.ts` 5、`mymerdekaPack.ts` 5、`mymodernPack.ts` 5。
  - 既有可複用跨國同人 `2` 筆：`kojoseonPack.ts` `ko-p-sunsin`（李舜臣＝`japan-imjin/az-yisunsin.jpg`）、`mymerdekaPack.ts` `myp3-yamashita`（山下奉文＝`japan-modern/mj-p-yamashita.jpg`）；四國跨槽同人 `4` 組：李成桂（`ko-p-iclee`/`ko-p-taejo`）、胡志明（`vnp3-hochiminh`/`vnp4-hochiminh`）、武元甲（`vnp3-vonguyengiap`/`vnp4-vonguyenvap`）、東姑阿都拉曼（`myp3-tunku`/`myp4-tunku`）。註：`imperial-wudai/p-wangjian` 為前蜀王建，不可誤給高麗王建。
- **`audit:portraits` 稽核規則（`scripts/audit-portraits.mjs`）**：
  - 強制：`manifest.count === rows.length`、`file` 不重複、路徑前綴符合 `<era>/` 且檔尾為 `/<id>.jpg`、檔案存在且 JPEG 實測尺寸必為 `1024x1024`；對照 `ERA_FILES`／`DEPTH_SECTION` 確認 `/portraits/<file>` 出現在對應資料檔，並用 `tsIdentity()`（掃描 `portrait` 行前 22 行至後 3 行）核對 `id` 與 `name.includes(row.name)`。
  - **缺口**：`ERA_FILES` 尚未收錄四國 16 包；未檢查 `basis` 是否非空、未檢查 `_thumb/` 縮圖是否存在、亦不檢查「資料已掛圖但漏入 manifest」之反向缺口。
- **`withBase()` 路徑規則（`src/components/PersonPortrait.tsx`、`PortraitGallery.tsx`）**：
  - `vite.config.ts` 生產建置 `base` 為 `/sanguozhi-3d/`（非 Vercel 部署）。所有資料檔 `portrait` 必寫 `/portraits/<era>/<id>.jpg`，由 `PersonPortrait` 與 `PortraitGallery` 經 `withBase()` 前綴 `import.meta.env.BASE_URL` 解析；`PortraitGallery.tsx` 的 `ERA_LABELS` 亦尚未收錄四國 16 個鍵。
- **`_style` 與 `_thumb` 產製**：
  - `public/portraits/_style/style-anchor.jpg`（1024×1024 JPEG，414KB）為全站唯一風格參考母稿（均勻墨線、石青朱紅赭石松綠平塗、暖紙底、三分面、無文字）。
  - `public/portraits/_thumb/` 現有 `702` 檔（350 張人物圖 + 1 張風格稿各自產出 `80px`、`192px` 寬 JPEG，品質 80），由 `scripts/gen_portrait_thumbs.mjs` 執行 `npm i --no-save sharp && node scripts/gen_portrait_thumbs.mjs` 一次生成並提交入庫。

> ⛔ **本軌道暫不排程**：没有領取 `plan --track=portraits` 的 cron 代理，現有 6 條 `☐`
> 是待辦而非今日工作。現行裁定為「四個新國家暫不放頭像」，理由見同目錄 README.md。

## P0 佇列（本機代理今天可做，<=12 條）

☑ `scripts/audit-portraits.mjs`｜於 `ERA_FILES` 註冊四國 16 個時代槽位鍵（`koancient`、`kogoryeo`、`kojoseon`、`komodern`、`thsukhothai`、`thayutthaya`、`thchakri`、`thmodern`、`vnnorth`、`vndynasty`、`vnnguyen`、`vnmodern`、`mymalacca`、`mycolonial`、`mymerdeka`、`mymodern`）指向對應 `*Pack.ts`｜2026-11-28 由雲端那層完成｜驗收=`node scripts/audit-portraits.mjs && node scripts/audit-portraits.mjs --teeth`
☑ `src/components/PortraitGallery.tsx`｜於 `ERA_LABELS` 補齊上述 16 個四國時代中文名稱（對照 `src/state/TopicContext.tsx` 各 `*_ERA_SLOTS` 之 `label`）｜2026-11-28 由雲端那層完成｜驗收=`node -e "const s=require('fs').readFileSync('src/components/PortraitGallery.tsx','utf8');for(const k of ['koancient','thsukhothai','vnnorth','mymalacca'])if(!s.includes(k))process.exit(1)"`
☑ `src/countries/thailand/thmodernPack.ts`｜修正 `th-p-phibun` 之 `name` 欄位簡體錯字（U+9218 → 正體「鑾」U+943E；2026-11-28 由雲端那層完成，同檔共 5 處一併改，並把 U+9218 補入 `scripts/audit-chars.ts` 黑名單）｜驗收=`node scripts/country_check.mjs src/countries/thailand/thmodernPack.ts`
☐ `kojoseon`（李舜臣 `ko-p-sunsin`，1545–1598）｜複製 `public/portraits/japan-imjin/az-yisunsin.jpg` 至 `public/portraits/kojoseon/ko-p-sunsin.jpg` 與對應 `_thumb` 兩級檔，於 `kojoseonPack.ts` `ko-p-sunsin` 之 `name` 後加 `portrait` 與 `portrait_note`，並增補 `manifest.json`（`count`→351）｜驗收=`node scripts/audit-portraits.mjs`
☐ `mymerdeka`（山下奉文 `myp3-yamashita`，1885–1946）｜複製 `public/portraits/japan-modern/mj-p-yamashita.jpg` 至 `public/portraits/mymerdeka/myp3-yamashita.jpg` 與對應 `_thumb` 兩級檔，於 `mymerdekaPack.ts` `myp3-yamashita` 之 `name` 後加 `portrait` 與 `portrait_note`，並增補 `manifest.json`（`count`→352）｜驗收=`node scripts/audit-portraits.mjs`
☐ `korea`（PD 圖源盤點）｜以 Wikimedia Commons API 查詢 `Category:Portraits of Joseon kings`、`Category:Goryeo Dynasty`、`Category:Independence activists of Korea`，篩選 `Public domain`/`CC0` 檔案寫入 `reports/portraits-pd-korea.json`（含檔名、授權、作者/館藏、`basis` 草稿）｜驗收=`node -e "const d=JSON.parse(require('fs').readFileSync('reports/portraits-pd-korea.json','utf8'));if(!d.length||d.some(x=>!x.license||!x.commonsFile))process.exit(1)"`
☐ `thailand`（PD 圖源盤點）｜以 Wikimedia Commons API 查詢 `Category:Rama IV`、`Category:Rama V`、`Category:Rama VII`、`Category:Pridi Banomyong`、`Category:John Bowring`，篩選 `Public domain`/`CC0` 寫入 `reports/portraits-pd-thailand.json`｜驗收=`node -e "const d=JSON.parse(require('fs').readFileSync('reports/portraits-pd-thailand.json','utf8'));if(!d.length||d.some(x=>!x.license||!x.commonsFile))process.exit(1)"`
☐ `vietnam`（PD 圖源盤點）｜以 Wikimedia Commons API 查詢 `Category:Ho Chi Minh`、`Category:Vo Nguyen Giap`、`Category:Bao Dai`、`Category:Phan Boi Chau`、`Category:Emperors of the Nguyen Dynasty`，篩選 `Public domain`/`CC0` 寫入 `reports/portraits-pd-vietnam.json`｜驗收=`node -e "const d=JSON.parse(require('fs').readFileSync('reports/portraits-pd-vietnam.json','utf8'));if(!d.length||d.some(x=>!x.license||!x.commonsFile))process.exit(1)"`
☐ `malaysia`（PD 圖源盤點）｜以 Wikimedia Commons API 查詢 `Category:Stamford Raffles`、`Category:Afonso de Albuquerque`、`Category:Tunku Abdul Rahman`、`Category:Lee Kuan Yew`、`Category:Tan Kah Kee`，排除在世人物後寫入 `reports/portraits-pd-malaysia.json`｜驗收=`node -e "const d=JSON.parse(require('fs').readFileSync('reports/portraits-pd-malaysia.json','utf8'));if(!d.length||d.some(x=>!x.license||!x.commonsFile))process.exit(1)"`

### 公開領域圖源管線與無圖處置決策

- **標準管線（Commons → 轉繪 → 縮圖 → 掛載）**：
  1. 以 Commons API 取 `extmetadata.LicenseShortName` 與 `Credit`/`Artist` 驗證確屬 `Public domain` 或 `CC0`：`curl -s "https://commons.wikimedia.org/w/api.php?action=query&titles=File:<檔名>&prop=imageinfo&iiprop=url|extmetadata&format=json"`。
  2. 將 `public/portraits/_style/style-anchor.jpg` 作為風格基準圖、PD 原圖作為肖像參考圖，由雲端 `generate_image` 統一轉繪成 1024×1024 暖紙底胸像至 `public/portraits/<era>/<id>.jpg`。
  3. 執行 `npm i --no-save sharp && node scripts/gen_portrait_thumbs.mjs` 產生 `_thumb/<era>/<id>-{80,192}.jpg`。
  4. 寫入 `*Pack.ts`（緊貼 `id`/`name` 後加 `portrait` 與 `portrait_note`）與 `manifest.json`（更新 `count`）。
- **無公有領域圖時之處置：一律「跳過不設 `portrait`」，不做風格化佔位圖**。理由：（1）`PersonPortrait.tsx` 原生支援無 `portrait` 時自動退回姓名首字徽章（`person-portrait__initial`）且列高不變；（2）複合／無個人肖像條目（如 `myp2-albuquerque-posterity`、`myp2-brooke`、`myp1-lastsultan`、`myp1-tun-perak`、`th-p-kawila`）與在世或版權未釋出者（如 `myp4-mahathir`、`myp4-anwar`、`myp4-hadi`）若強行生圖，既違背不捏造相貌之原則，亦可能觸及肖像與版權風險。

## P1 批次

說明：每一批次僅修改**單一 `*Pack.ts` 檔**（搭配該批已產出之 `.jpg`／`_thumb/` 與 `manifest.json` 登記），每次 2–4 人，待雲端生圖產出 1024×1024 原圖後由本機代理按批掛載。

- **韓國 4 批（共 11 人待補；`ko-p-sunsin` 已於 P0 完成）**：
  - 批 K1（`komodernPack.ts`，優先）：`ko-p-kimku`、`ko-p-synghman`、`ko-p-djkim`（3 人，皆有近代公開檔案館／美國國會圖書館公有領域照）。
  - 批 K2（`kogoryeoPack.ts`）：`ko-p-wanggeon`（依開城顯陵銅像／高麗傳像系統）、`ko-p-chouigui`（依史傳服制不造異相或無圖跳過）、`ko-p-iclee`（依全州慶基殿太祖御真）。
  - 批 K3（`kojoseonPack.ts`）：`ko-p-taejo`（複用 `kogoryeo/ko-p-iclee.jpg` 存為 `kojoseon/ko-p-taejo.jpg`）、`ko-p-sejong`（依世宗御真通說復原像／銅像；註明非寫生）。
  - 批 K4（`koancientPack.ts`）：`ko-p-jumong`、`ko-p-uisaja`、`ko-p-kimyumisin`（無當時寫生，若有現代公有領域標準影幀／祀像則改畫並明註依據，否則跳過）。
- **泰國 6 批（先處理近代與王室公開檔案，共 23 人，無圖者跳過）**：
  - 批 T1（`thchakriPack.ts`，優先 4 人）：`th-p-phutthayotfa`、`th-p-mongkut`、`th-p-chulalongkorn`、`th-p-bowring`（皆有皇家檔案／英國國家肖像館公有領域像）。
  - 批 T2（`thchakriPack.ts`，餘 2 人）：`th-p-lemire`（查法國外交檔案館 PD 像，無則跳過）；`th-p-kawila`（無定名個人像，跳過）。
  - 批 T3（`thmodernPack.ts`，4 人）：`th-p-rama7`、`th-p-phahon`、`th-p-pridi`、`th-p-phibun`（皆有泰國政府／國會公開檔案館早期公有領域照）。
  - 批 T4（`thmodernPack.ts`，餘 3 人）：`th-p-seni`、`th-p-thanom`、`th-p-rama9`（逐一核驗泰國版權年期與 PD 資格，未確認者跳過）。
  - 批 T5（`thayutthayaPack.ts`，分兩輪各 3 人）：輪一 `th-p-naresuan`、`th-p-bayinnaung`、`th-p-taksin`；輪二 `th-p-alongphaya`、`th-p-sinbyushin`（可考銅像／紀念像改畫並註明非寫生）、`th-p-ekathat`（無傳像跳過）。
  - 批 T6（`thsukhothaiPack.ts`，4 人）：`th-p-sriindraditya`、`th-p-ramkhamhaeng`、`th-p-mengrai`、`th-p-uthong`（依泰國／清邁官方紀念銅像公有領域照改畫並註明非當時寫生）。
- **越南 13 批（優先近代與阮朝法屬檔案，無傳像之古代人物跳過）**：
  - 批 V1–V3（`vnnguyenPack.ts`，12 人分 3 批各 4 人）：批一 `vnp3-nguyenphucanh`、`vnp3-minhmang`、`vnp3-tuduc`、`vnp3-hamnghi`（法越檔案館阮朝帝像／照）；批二 `vnp3-levanduyet`、`vnp3-nguyencu-trinh`、`vnp3-tonthatthuyet`、`vnp3-luu-yongfu`；批三 `vnp3-phanboichau`、`vnp3-hochiminh`、`vnp3-baodai`、`vnp3-vonguyengiap`。
  - 批 V4–V8（`vnmodernPack.ts`，17 人分 5 批每批 3–4 人）：批一複用 `vnnguyen` 之 `vnp4-hochiminh`、`vnp4-vonguyenvap`、`vnp4-baodai` 並補 `vnp4-phamvandong`；批二 `vnp4-lesductho`、`vnp4-navarre`、`vnp4-ngodinhdiem`、`vnp4-nguyenvananson`；批三 `vnp4-duongvominh`、`vnp4-westmoreland`、`vnp4-nguyenvanloi`、`vnp4-tranvandon`；批四 `vnp4-vanthientinh`、`vnp4-nguyenvanan`、`vnp4-hoangvanthai`；批五 `vnp4-trantrongthiep`、`vnp4-vochi`（嚴格核驗 PD 照，無則跳過）。
  - 批 V9–V11（`vnnorthPack.ts`，10 人分 3 批各 3–4 人）：優先 `vnp-trung-trac`、`vnp-trung-nhi`、`vnp-mayuan`、`vnp-shixie` 等有漢越古籍／祀像系統者，其餘無傳像者跳過。
  - 批 V12–V15（`vndynastyPack.ts`，13 人分 4 批各 3–4 人）：依《大越史記全書》及越南祠廟公有領域塑像／銅像轉繪（如 `vnp2-tranhungdao`、`vnp2-leloi`、`vnp2-nguyentra`、`vnp2-nguyenhue`），無像者跳過。
- **馬來西亞 4 批（共 19 人待補；`myp3-yamashita` 已於 P0 完成）**：
  - 批 M1（`mycolonialPack.ts`，3 人）：`myp2-light`、`myp2-raffles`、`myp2-clark`（大英／國家肖像館公有領域油畫／照）；`myp2-albuquerque-posterity` 與 `myp2-brooke` 為複合稱謂，**跳過**。
  - 批 M2（`mymerdekaPack.ts`，4 人）：`myp3-tunku`、`myp3-lee`、`myp3-soekarno`、`myp3-tan`（皆有星馬／印尼公開檔案館公有領域照）。
  - 批 M3（`mymodernPack.ts`，2 人）：`myp4-tunku`（複用 `mymerdeka/myp3-tunku.jpg`）、`myp4-abdulrazak`；`myp4-mahathir`、`myp4-anwar`、`myp4-hadi` **跳過**（在世或版權未入公有領域）。
  - 批 M4（`mymalaccaPack.ts`，1 人 + 4 跳過）：`myp1-albuquerque`（依里斯本國立古代美術館公有領域肖像改畫）；`myp1-parameswara`、`myp1-muzaffar`、`myp1-tun-perak`、`myp1-lastsultan` 無可靠傳像且多為群體／佚名，**跳過**。

## 工具缺口（要雲端那層我來建）

1. **`scripts/gen_country_portraits.mjs`（PD 取圖＋風格轉繪＋縮圖管線）**
   - 輸入：經人工或 P0 驗證之 JSON 清單（`[{era, id, name, commonsFile, basis}]`）＋ `public/portraits/_style/style-anchor.jpg`。
   - 輸出：呼叫 Commons API 下載驗證為 `Public domain`/`CC0` 之來源圖至暫存區，呼多模態生圖工具以雙參考圖產出 `1024x1024` 風格一致 JPEG 至 `public/portraits/<era>/<id>.jpg`，並生成 `80/192px` 縮圖與 `manifest` 草稿。
   - 通過／失敗判準：Commons `LicenseShortName` 非 PD/CC0 即拒絕；輸出檔實測 JPEG 尺寸 `1024x1024` 且對應 `_thumb` 兩檔存在。
   - 為何本機小模型無法即興替代：30B 文字模型無 `generate_image` 視覺生圖與風格比對能力，且無法自行驗證圖片像素尺寸與真實授權。
2. **擴充 `scripts/audit-portraits.mjs`（雙向掛載＋縮圖＋出處閘門）**
   - 輸入：`public/portraits/manifest.json`、`public/portraits/_thumb/**`、25 個既有時代與 16 個四國 `*Pack.ts`。
   - 輸出：新增三項檢查——（a）`_thumb/<era>/<id>-{80,192}.jpg` 必存在；（b）`row.basis` 不得為空字串或少於 6 字；（c）反向掃描所有資料檔的 `portrait:` 路徑，若出現於資料檔卻未登錄於 `manifest.json` 即 fail。
   - 通過／失敗判準：`fail 0`，並同步更新 `reports/gate-baseline.json` 中 `audit:portraits` 之 `atLeast`（`linked`、`files`）。
   - 為何本機小模型無法即興替代：小模型單輪只改單檔，常忘記更新 `manifest.json` 或重跑 `gen_portrait_thumbs.mjs`；現行單向掃描無法攔截「資料已掛圖但漏寫 manifest」。
3. **`scripts/register_portrait.mjs`（單張入庫原子幫手）**
   - 輸入：`--era <era> --id <id> --pack <Pack.ts> --basis <出處>`。
   - 輸出：驗證 `public/portraits/<era>/<id>.jpg` 為 `1024x1024`、僅對該張產生 `_thumb`（避免重寫全庫 702 檔）、在 `<Pack.ts>` 對應人物 `id:` 後 5 行內插入 `portrait` 與 `portrait_note`、插入 `manifest.json`（按 `era`+`id` 排序）並重算 `count`。
   - 通過／失敗判準：腳本結束前自動跑 `audit:portraits` 與 `country_check.mjs`，任一失敗即回滾檔案。
   - 為何本機小模型無法即興替代：手改 400+ 行 TS 與 1,800+ 行 `manifest.json` 易把 `portrait:` 放錯行（跌出 `tsIdentity()` 22 行視窗）、算錯 `count` 或引入簡體字。

## 禁止事項

- **嚴禁簡體字與粵語口語**：所有 `name`、`portrait_note`、`basis`、`manifest.json` 與註釋只許用正體書面語（不可把「鑾」寫成簡體形 U+9218，不可寫入口語虛詞）。
- **嚴禁編造逐字引文**：人物簡介與考據筆記未於中／日文維基文庫逐字核對者，不得加引號充作史料原文，一律須標明「通說整理，非逐字引文」。
- **嚴禁杜撰 `basis` 或使用非公有領域圖**：每筆 `basis` 須指明實際來源（Commons 檔名、博物館公有領域藏本或「依公開照片改畫，服裝隨該照」）；在世人物與版權未釋出照片一律跳過不掛圖。
- **嚴禁繞過 `withBase()` 的路徑寫法**：資料欄位 `portrait` 一律寫 `/portraits/<era>/<id>.jpg`，不得寫死 `/sanguozhi-3d/` 或相對路徑；前端載圖與讀 `manifest.json` 一律經 `PersonPortrait.tsx` 的 `withBase()`。
- **嚴禁無考杜撰或原照直出**：無公有領域可參考像者一律留空不設 `portrait`（由 UI 自動退回首字徽章），不得自創異相服飾，亦不得將未經 `_style/style-anchor.jpg` 統一轉繪的真實照片直接放進 `public/portraits/`。
- **嚴禁把 `portrait:` 放遠離 `id:`**：必須置於物件開頭 `id:`／`name:` 緊鄰處（22 行視窗內），確保 `audit-portraits.mjs` 的 `tsIdentity()` 可正確配對。
