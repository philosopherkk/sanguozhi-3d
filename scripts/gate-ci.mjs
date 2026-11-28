#!/usr/bin/env node
/**
 * 閘門護欄：跑齊各審計，與已提交基線比較，**只在惡化時失敗**。
 *
 * 為什麼要基線：目前多條閘門仍有既存缺口（引文、接線、年份口徑、成語…）。
 * 直接把它們設為硬性通過門檻，會讓每個 PR 都變紅，結果是所有人都學會忽略它們；
 * 護欄式比較可以在「不惡化」的前提下逐輪收緊，數字下降時更新基線即可。
 *
 * 用法：
 *   npm run gates                       比較基線（CI 用）
 *   npm run gates -- --only=audit:chars 只跑一條（agent 改完單項時用，收工仍要跑全量）
 *   npm run gates -- --update-baseline  記錄新基線（只應在數字改善後執行）
 */
import { execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const BASELINE = join(ROOT, 'reports', 'gate-baseline.json')
const BASELINE_REL = join('reports', 'gate-baseline.json')

/** 每條閘門：指令 + 從輸出抽幾個數字（名字要穩定，基線靠它對照）。 */
const GATES = [
  {
    name: 'audit:data',
    cmd: 'npm run audit:data',
    metrics: { fail: /audit:data — fail (\d+)/, warn: /audit:data — fail \d+, warn (\d+)/ },
  },
  // 2026-11-23 補：audit:data 嘅簡體字表曾混入繁簡同形嘅「西」，30 處假 warn
  // 逼到其他 agent 刪正文避閘（commit 2bddae2d）。成對探針（要偵到／唔准誤報）
  // 入閘，牙口由 audit:teeth-mutations 嘅 data 組驗證。
  {
    name: 'audit:data:teeth',
    cmd: 'npm run audit:data:teeth',
    metrics: { fail: /audit:data --teeth — 失敗 (\d+) 項/ },
  },
  { name: 'audit:wiring', cmd: 'npm run audit:wiring', metrics: { fail: /audit:wiring — fail (\d+)/ } },
  // 人物想像圖：檔案、manifest 與資料 id／name 三邊對照。少了這條，錯人頭像或
  // 整批圖全家長時間不上線都不會被任何其他閘門察覺（build 只查型別，不查配對）。
  {
    name: 'audit:portraits',
    cmd: 'npm run audit:portraits',
    metrics: { fail: /audit:portraits — fail (\d+)/, linked: /linked (\d+)\//, files: /files (\d+)/ },
    // linked／files 是覆蓋存量而非錯誤數：350/350 才是合格狀態，按「新指標須以零值
    // 進場」會把合格的閘門永遠擋在門外。這類指標以現值進場，之後只許升不許跌——
    // 下跌即代表有頭像失聯或檔案失蹤，正是這條閘門要防的事。
    atLeast: ['linked', 'files'],
  },
  {
    name: 'audit:portraits:teeth',
    cmd: 'npm run audit:portraits -- --teeth',
    metrics: { fail: /audit:portraits --teeth — 失敗 (\d+) 項/ },
  },
  // 簡易版逐條驗收工具本身有冇牙（每條斷言拆一項要紅）。內容（--all）未入閘：
  // 由 ui 工作單逐行補，收口覆核後先以零值進場。
  {
    name: 'audit:kid-ui:teeth',
    cmd: 'npm run audit:kid-ui -- --teeth',
    metrics: { fail: /audit_kid_ui --teeth — .*失敗 (\d+) 項/ },
  },
  {
    name: 'audit:ranges',
    cmd: 'npm run audit:ranges',
    metrics: { fail: /audit:ranges — fail (\d+)/, warn: /audit:ranges — fail \d+, warn (\d+)/ },
  },
  // 注意：audit:quotes 每檔都會印「錯誤 N｜提醒 N」，錨定要落在「合計」行，
  // 否則量到嘅係第一個檔案嘅數字（呢個 bug 曾令護欄一直睇錯引文缺口）。
  { name: 'audit:quotes', cmd: 'npm run audit:quotes', metrics: { errors: /合計：[^\n]*錯誤 (\d+)/, warns: /合計：[^\n]*提醒 (\d+)/ } },
  // --check 嘅判定要有牙：佢係 audit:plans 驗收「已逐字查證」嘅唯一憑證，
  // 判定一旦退化（未記帳都算 verified），工作單就可以把未核過嘅引文洗白。
  { name: 'audit:credits', cmd: 'npm run audit:credits', metrics: {} },
  { name: 'audit:credits:selftest', cmd: 'npm run audit:credits:selftest', metrics: {} },
  { name: 'audit:quotes:selftest', cmd: 'npm run audit:quotes:selftest', metrics: {} },
  // 2026-11-29 補：計畫檔 `docs/plans/<date>/*.md` 由本機小模型逐條執行，`☑` 是它自己勾的。
  // 這條閘門不量內容，量「已勾的東西現在還驗不驗得過」：plan_verify 逐條讀取每個 `☑` 行尾的
  // 「驗收=」指令並重跑一次；任何一條不過 = 那條成果已壞（被改回原狀、指令本身寫錯、
  // 或當初根本是假綠）→ 紅。以零失敗進場（今日 11 條全過、1 條會寫帳本故跳過）；
  // 日後新增 `☑` 自動納入，不必修改本閘門。
  {
    name: 'audit:plans',
    cmd: 'npm run audit:plans',
    metrics: { fail: /=== 通過 \d+｜失敗 (\d+)/ },
  },
  {
    name: 'audit:chengyu',
    cmd: 'npm run audit:chengyu',
    metrics: { fail: /audit:chengyu — 條目 \d+｜fail (\d+)/, warn: /｜fail \d+｜warn (\d+)/ },
  },
  {
    name: 'audit:map',
    cmd: 'npm run audit:map',
    metrics: { fail: /audit:map —[^\n]*fail (\d+)/, warn: /｜fail \d+｜warn (\d+)/ },
  },
  // 2026-11-13 補：audit:map 連續報「fail 0」而朝鮮之役窗口整批喺閘門以外——
  // `territoryByYear: CONTROL`（識別碼引用）、產生器產物嘅雙引號 id、`im_x: F.jp`
  // （常數值）三種寫法全部俾正則漏走，寫錯嘅版圖鍵冇人咬，該區塊永遠不上色。
  // 同 audit:chars:teeth 一樣，呢條唔量內容，量「規則有冇牙」：把壞 id 注入暫存根
  // 用同一支掃描邏輯掃一次，並跑控制樣本（有效 id、metadata 鍵、中文值、非戰區 pack）
  // 證明唔會誤殺，豁免方向同註冊表逐來源代表 id 都有斷言。
  {
    name: 'audit:map:teeth',
    cmd: 'npm run audit:map -- --teeth',
    metrics: { fail: /audit:map --teeth — 失敗 (\d+) 項/ },
  },
  { name: 'audit:chars', cmd: 'npm run audit:chars', metrics: { hard: /硬傷 (\d+)/ } },
  // 2026-11-27 批次 6 補：覆核工具嘅「詞典覆蓋率」一直只係口頭規矩（未分類必須 0）。
  // 未分類＝冇人判過嘅詞，唔係「opencc 誤報」嘅證明；同 audit:chars 一樣要數字入閘，
  // 否則新出現嘅簡體式寫法只會靜靜留喺「未分類」。工具只量呢一個數字（--strict-coverage），
  // 唔會因為 opencc 對正字嘅建議而失敗。CI 需 python3 + opencc-python-reimplemented。
  {
    name: 'verify:chars-coverage',
    cmd: 'npm run verify:chars-coverage',
    metrics: { unclassified: /未分類 (\d+)/ },
  },
  // 2026-11-21 補：自檢本來只掃檔案，小模型把簡體字寫入 commit 標題無人察覺
  // （幾個含簡體字的標題都進了 main）。用同一支字表掃 origin/main..HEAD。
  {
    name: 'audit:commit-msgs',
    cmd: 'node scripts/agent-selfcheck.mjs --commits origin/main',
    metrics: { hard: /agent-selfcheck --commits — 命中 (\d+) 處/ },
  },
  // 2026-11-25 補：自檢本來要 agent「自己記得跑」才生效，而且對非 src/ 的新增行只提示
  // 不計失敗，所以 agents 往 reports/ 寫入口語、寫入錯字都得靠人工覆核才發現。
  // 現在由 gate-ci 直接對分支淨差異跑一次，數字有兩欄：
  //   hard＝新增行的簡體字／日本新字形／殘骸／衝突標記，零容忍；
  //   warn＝粵語虛詞，棘輪（只能減不能增）。
  // 分成兩欄是實測逼出來的：四支 agent 分支＋護欄的合併樹 hard 一度變 68，全部是
  // 代理寫報告的工作語言，而真簡體字 0 處被淹在裡面——一欄報表等於把紅變成噪音。
  // 只掃 diff、不改寫存量也出於同一考慮：reports/ 五百多行、docs/ 與 scripts/ 近千行，
  // 一次改寫會引入錯碼位風險（小模型把「將」寫成「将」就是這樣來的）。
  {
    name: 'audit:selfcheck',
    // --branch 一定要給：預設的 `git diff origin/main` 是兩點式，主線領先時會把
    // 「主線已經改好的行」當成本支新增的行來咬（實測：主線 a4a4f893 把 robots.txt
    // 第四行的粵語虛詞與簡體形改回書面語之後，四支 agent 分支各被冤枉兩處）。
    // --branch 讓自檢自己換算成共同祖先，等價於三點式，代理只為自己的行負責。
    cmd: 'node scripts/agent-selfcheck.mjs origin/main --branch',
    metrics: {
      // 用 [^\n]* 串起來，不要把全形「／」寫死進比對式：上一次寫成半形 `/`
      // 就直接抽不到數字，gate-ci 的「抽不到即報錯」把它抓回來了。
      hard: /agent-selfcheck —[^\n]*命中 (\d+) 處/,
      warn: /粵語虛詞 (\d+) 行/,
    },
    // absolute 欄位＝唔同基線比較（見下方比較迴圈）。warn 量嘅係「呢輪 diff 帶咗幾多
    // 工作語言行」，唔係倉庫狀態：同一條閘門喺 main 上跑 = 0（diff 空嘅恆真式），
    // 喺正常 PR 上跑 = 69~74。若記進基線就等於要求每一支 PR 的報告零粵語虛詞，
    // 而消紅最省力嘅做法係刪掉代理嘅覆核記錄——正正係 11-16 記低嘅失效模式。
    // 數值照樣印喺報告（warn=74(abs)），只係唔做棘輪；hard 仍然以零值進場。
    absolute: ['warn'],
  },
  // 2026-11-13 補：audit:chars 連續多輪報「硬傷 0」，實則 `对` `传` `开` `学` `经` `张`
  // `赵` `户` `阳` `铁` 這些最常見的簡體字一個都不在字表裡——277 字是「看到哪個錯字就補
  // 哪個」長出來的，覆蓋率從沒被量過，數字綠是因為沒有人在查。這條閘門不量內容，量的是
  // 「字表有沒有牙」：把壞字注入暫存檔再掃一遍，抓不到就算惡化。有數字才不會無聲消失。
  // 寫這條註解時被自己咬了一次（說明文字裡直接寫了錯字），故記下慣例：
  // 文件要引用「正在討論的那個字」就用反引號包住——短 code 區段是豁免的，敘述不豁免。
  {
    name: 'audit:chars:teeth',
    cmd: 'npm run audit:chars -- --teeth',
    metrics: { fail: /audit:chars --teeth — 失敗 (\d+) 項/ },
  },
  // 2026-11-14 補：上面兩條 teeth 都係「注入壞樣本 → 必須報紅」，但判斷用嘅係同一支閘門。
  // 所以有人把規則改弱（正則收細、豁免放大、字表抽走一個字、註冊表來源檔名打錯），teeth
  // 會跟住變橡皮章而照樣全綠——本專案五次同一根因，全部係「數字綠因為冇人在查」。呢條唔量
  // 內容，量「teeth 本身有冇牙」：主動破壞規則本身 25 項，每項都要睇到 teeth 報紅。
  // 突變全部喺 mkdtemp 副本上做，並用 git status 前後對照硬性禁止改 tracked 檔。
  {
    name: 'audit:teeth-mutations',
    cmd: 'npm run audit:teeth-mutations',
    metrics: { fail: /audit:teeth-mutations — 失敗 (\d+) 項/ },
  },
  // 2026-11-15 第十二輪補：audit:mobile 的六條結構不變量（每條都對應 393px／640px
  // 上真實發生過、肉眼睇唔見的缺陷）長期唔喺護欄內——跑唔跑全靠人手習慣，改壞
  // mobile.css 的單欄堆疊或按擊區，gates 照樣全綠。補兩條：主閘門只查 exit code
  // （不變量只有成立與否，冇可以量化嘅既存缺口）；teeth 閘門防規則變橡皮章，
  // 指標行與 map／chars 同一口徑。牙口本身由 audit:teeth-mutations 的 mobile 組驗證。
  { name: 'audit:mobile', cmd: 'npm run audit:mobile', metrics: {} },
  {
    name: 'audit:mobile:teeth',
    cmd: 'npm run audit:mobile -- --teeth',
    metrics: { fail: /audit:mobile --teeth — 失敗 (\d+) 項/ },
  },
  // 2026-11-17 補：淺色主題的字看不清已修過一次，但沒有護欄會擋住下一次
  // 色值退化（調淺一號在開發畫面裡看不出）。主閘門查 16 組「文字色／底色」
  // 對比度是否全部達 4.5:1（只查 exit code）；teeth 閘門把 --ink-muted 疊成
  // --bg，確認規則仍會報紅，防止變成永遠綠的橡皮章。
  { name: 'audit:contrast', cmd: 'npm run audit:contrast', metrics: {} },
  {
    name: 'audit:contrast:teeth',
    cmd: 'npm run audit:contrast -- --teeth',
    metrics: { fail: /audit:contrast --teeth — 失敗 (\d+) 項/ },
  },
  // 2026-11-08 補：使用者隨機抽查應仁之亂即見內容極薄，追查發現既有 event-depth
  // 從未讀取事件詳情檔案（timelineDetails 字串比對 0 次）。41 條受測、27 條缺口。
  // 分開一支閘門是為了不打斷其他 agent 已有的 event-depth 基線。
  // 2026-11-09 補：三層意譯「有冇分層」閘門。既有 event-depth 只查有冇三層，
  // 所以 198 組全過；實測中位數比只有 1:1.3:3.6，146 組其實冇分層。
  // 2026-11-09 補：成語覆蓋率與疆域幾何品質。兩者都係「既有閘門報綠但使用者
  // 一眼就見到問題」的類型——格式合格不等於覆蓋夠、海陸一致不等於形状真。
  // 2026-11-09 補：維基連結存在性。實證 HTTP 狀態碼會呃人——/zh-tw/<不存在標題>
  // 照回 200（PR #95 漏網兩條死鏈）。只用 MediaWiki API 的 missing 判定。
  {
    name: 'audit:wiki-links',
    cmd: 'npm run audit:wiki-links',
    metrics: { dead: /死鏈 (\d+)/, unvalidated: /未驗 (\d+)/ },
  },
  {
    name: 'audit:chengyu-coverage',
    cmd: 'npm run audit:chengyu-coverage',
    metrics: {
      missingCentury: /空白世紀 (\d+)/,
      shortage: /缺口總數 (\d+)/,
      noEventLink: /無 event 連結 (\d+)/,
    },
  },
  {
    name: 'audit:war-shape',
    cmd: 'npm run audit:war-shape',
    metrics: { schematic: /示意框 (\d+)/, selfInt: /自我相交 (\d+)/ },
  },
  {
    name: 'audit:reading-layers',
    cmd: 'npm run audit:reading-layers',
    metrics: { gap: /分層不合格 (\d+)/ },
  },
  {
    name: 'audit:detail-depth',
    cmd: 'npm run audit:detail-depth',
    metrics: { gap: /缺口 (\d+)/ },
  },
  {
    name: 'audit:event-depth',
    cmd: 'npm run audit:event-depth',
    metrics: { gap: /缺口 (\d+)/, padding: /灌水嫌疑 (\d+) 段/, jpGap: /日本三層未達 (\d+)/ },
  },
  // audit:critical（關鍵事變盤點）唔喺度：佢係 WAVE A 嘅閘門，而家量到
  // gap 23／未標 146／界線 26。主人 2026-11-27 裁定「先補缺口再上閘門」，
  // 而 gate-ci 嘅規矩係硬性新指標必須以零值進場，所以本支只帶資料與腳本
  // （scripts/audit_critical.mjs、reports/critical-incidents.md），閘門由
  // WAVE A 補齊嗰 23 個缺口之後自己帶入。
]

/** audit:geo 需要 Python + numpy；CI runner 未必裝好，缺就跳過而非誤判失敗。 */
function hasNumpy() {
  try {
    execSync('python3 -c "import numpy"', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}
if (hasNumpy()) {
  GATES.push({ name: 'audit:geo', cmd: 'npm run audit:geo', metrics: {} })
} else if (process.env.CI) {
  // 跳過只准喺本地發生：本地冇裝 numpy 係開發者嘅選擇，CI 冇裝就係閘門靜靜消失。
  // 真實教訓：runner 鏡像把系統 python 換做 3.14（冇預裝 numpy）之後，audit:geo 喺 CI
  // 消失咗好耐，日誌淨係一行提示，護欄照樣印「無惡化」——呢種失效模式要即刻紅。
  console.error(
    'gates — CI 偵測唔到 python3+numpy，audit:geo 唔准喺 CI 跳過。\n' +
      '  請喺 .github/workflows/audit.yml 嘅「安裝 Python 閘門依賴」步驟補齊 numpy／pillow。'
  )
  process.exit(1)
} else {
  console.log('提示：偵測不到 python3+numpy，本輪跳過 audit:geo（裝好後自動納入）')
}

function run(cmd) {
  try {
    return { code: 0, out: execSync(cmd, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64e6 }) }
  } catch (err) {
    return { code: err.status ?? 1, out: `${err.stdout ?? ''}${err.stderr ?? ''}` }
  }
}

function measure(gateList = GATES) {
  const got = {}
  for (const g of gateList) {
    const { code, out } = run(g.cmd)
    const m = { exit: code }
    for (const [key, re] of Object.entries(g.metrics)) {
      const hit = out.match(re)
      if (hit) m[key] = Number(hit[1])
      // 抽唔到數字一定係壞事：輸出格式改咗之後，護欄會以為「冇呢個指標」
      // 而永遠跳過該項比較——即係無聲消失。必須當失敗，唔可以靜落。
      else m[`__miss_${key}`] = 1
    }
    got[g.name] = m
  }
  return got
}

const UPDATE = process.argv.includes('--update-baseline')
const ONLY = process.argv.find((a) => a.startsWith('--only='))?.slice('--only='.length)
if (ONLY && UPDATE) {
  console.error('gates — --only 不能與 --update-baseline 同時用（會把局部結果寫成全量基線）')
  process.exit(2)
}
const gateList = ONLY
  ? GATES.filter((g) => g.name.includes(ONLY))
  : GATES
if (ONLY && !gateList.length) {
  console.error(`gates — 找不到符合 --only=${ONLY} 的閘門`)
  process.exit(2)
}
const current = measure(gateList)

const missing = []
for (const [name, m] of Object.entries(current)) {
  for (const k of Object.keys(m)) {
    if (k.startsWith('__miss_')) missing.push(`${name}.${k.slice(7)}`)
  }
}
if (missing.length) {
  console.error(
    '\ngates — 以下指標喺閘門輸出抽唔到，護欄等於冇檢查，請修正比對式或輸出格式：\n  ' + missing.join('\n  '),
  )
  process.exit(1)
}

/** 標了 absolute 嘅欄位唔同人基線比（佢哋量 diff 體量／當下狀態，唔係倉庫存量）。 */
const gAbsolute = Object.fromEntries(GATES.map((g) => [g.name, g.absolute ?? []]))
/** atLeast 欄位＝覆蓋存量（例：已配對頭像數）：新閘門以現值進場，之後下跌即惡化。 */
const gAtLeast = Object.fromEntries(GATES.map((g) => [g.name, g.atLeast ?? []]))

if (UPDATE || !existsSync(BASELINE)) {
  // absolute 欄位唔寫進基線：儲一個永遠唔會被人比較嘅數字，只會令下次睇基線嘅人
  // 誤會佢係棘輪目標（audit:selfcheck.warn 喺 main 上記錄必定係 0，就係例子）。
  const stored = Object.fromEntries(
    Object.entries(current).map(([name, m]) => [
      name,
      Object.fromEntries(
        Object.entries(m).filter(([k]) => !(gAbsolute[name] ?? []).includes(k)),
      ),
    ]),
  )
  writeFileSync(BASELINE, JSON.stringify(stored, null, 2) + '\n')
  console.log(`gates — 已記錄基線（${Object.keys(current).length} 條閘門）→ reports/gate-baseline.json`)
  process.exit(0)
}

// 基準檔完整性：棘輪的價值全繫於基準可信。實測曾有分支把未提交的「放寬」留在工作區，
// 再宣稱「閘門全綠、零退化」收貨（案例：把 audit:wiki-links 的 rate-limit 假紅 0→18 寫進基準），
// 而 `agent-selfcheck --branch` 只看已提交的 diff，看不見工作區改動，所以不會報警。
// 兩條線：(1) 基準檔有未提交改動即紅；(2) 已提交但相對 origin/main 放寬了 hard 上限、
// 或下調了 atLeast 下限，亦紅（確屬上游變動時，須在 PR 內寫明理由並以 GATE_BASELINE_ALLOW=1 明示）。
function guardBaseline() {
  let dirty = ''
  try {
    dirty = execSync(`git -C ${JSON.stringify(ROOT)} status --porcelain -- ${JSON.stringify(BASELINE_REL)}`, {
      encoding: 'utf8',
    }).trim()
  } catch {
    return // 非 git 環境（部分 CI checkout）略過
  }
  if (dirty) {
    console.error(`\n✗ 基準檔 ${BASELINE_REL} 有未提交改動：\n  ${dirty}`)
    console.error('  基準只能經 PR 修改；要重記請跑 npm run gates:record 後在 PR 內提交')
    process.exit(1)
  }
  let upstream = ''
  try {
    upstream = execSync(`git -C ${JSON.stringify(ROOT)} show origin/main:${BASELINE_REL}`, { encoding: 'utf8' })
  } catch {
    return // origin/main 無此檔（首次進場）無可比較
  }
  const ubase = JSON.parse(upstream)
  const cur = JSON.parse(readFileSync(BASELINE, 'utf8'))
  const floors = new Set(GATES.flatMap((g) => (g.atLeast ?? []).map((k) => `${g.name}.${k}`)))
  const loosened = []
  for (const [name, m] of Object.entries(cur)) {
    const old = ubase[name]
    if (!old) continue // 以現值進場：該閘門尚未在 origin/main 基線內
    for (const [key, cap] of Object.entries(m)) {
      const prev = old[key]
      if (typeof cap !== 'number' || typeof prev !== 'number') continue
      if (floors.has(`${name}.${key}`) ? cap < prev : cap > prev) loosened.push(`${name}.${key} ${prev} → ${cap}`)
    }
  }
  if (!loosened.length) return
  if (!process.env.GATE_BASELINE_ALLOW) {
    console.error(`\n✗ ${BASELINE_REL} 相對 origin/main 放寬了基準（棘輪只許收緊）：`)
    for (const line of loosened) console.error(`  ${line}`)
    console.error('  若確屬上游指標變動，請在 PR 內寫明理由，並以 GATE_BASELINE_ALLOW=1 跑一次作為明示確認')
    process.exit(1)
  }
  console.log(`⚠ 已放寬 ${loosened.length} 項基準（GATE_BASELINE_ALLOW=1）：${loosened.join('、')}`)
}

guardBaseline()

const base = JSON.parse(readFileSync(BASELINE, 'utf8'))
/** 每條閘門有沒有「可追蹤的數字指標」，決定 exit 要不要計入失敗。 */
const gMetrics = Object.fromEntries(GATES.map((g) => [g.name, g.metrics]))
const worse = []
const better = []
const lines = []
for (const [name, cur] of Object.entries(current)) {
  const old = base[name] ?? {}
  const parts = []
  for (const [key, val] of Object.entries(cur)) {
    if (key === 'exit') continue
    if ((gAbsolute[name] ?? []).includes(key)) {
      parts.push(`${key}=${val}(abs)`)
      continue
    }
    const b = old[key]
    const floor = (gAtLeast[name] ?? []).includes(key)
    const tag = b === undefined ? '新' : val < b ? `↓${b - val}` : val > b ? `↑${val - b}` : '='
    parts.push(`${key}=${val}(${tag})`)
    if (b === undefined) {
      // 基線只能人手更新（--update-baseline），所以新閘門若帶非零值入場而不計惡化，
      // 就可以「先進場、等人補基線」把紅永久合法化——新加的 audit:selfcheck 正好
      // 踩到這條縫。硬性指標因此必須以零值進場。
      //
      // warn 例外，語義是棘輪而非零容忍：它量的多是存量（例如非 src/ 的粵語虛詞 68 行，
      // 全是代理報告的工作語言）。要求新 warn 也歸零，等於逼一次幾百行的倉促改寫，
      // 而小模型改寫正是錯碼位的來源（11-21 教訓）。warn 以現值進場、人工記一次基線，
      // 之後只能減不能增；進場值會印在報告裡，不會無聲通過。
      const kind = Object.keys(gMetrics[name] ?? {}).find((k) => k === key)
      if (floor) {
        console.log(
          `  ‼ ${name}.${key} 新指標 ${val}：覆蓋存量以現值進場，記錄基線後只能升不能跌`
        )
      } else if (val > 0 && kind !== 'warn') {
        worse.push(`${name}.${key} 新指標 ${val}（硬性新閘門要以零值進場，先修再入 gate-ci）`)
      } else if (val > 0) {
        console.log(`  ‼ ${name}.${key} 新指標 ${val}：warn 以現值進場，人工記錄基線後只能下降`)
      }
    } else if (floor) {
      // 覆蓋存量：下跌才算惡化（有頭像失聯或檔案失蹤），上升則是改善。
      if (val < b) worse.push(`${name}.${key} ${b} → ${val}（覆蓋存量下跌）`)
      else if (val > b) better.push(`${name}.${key} ${b} → ${val}`)
    } else if (val > b) worse.push(`${name}.${key} ${b} → ${val}`)
    else if (val < b) better.push(`${name}.${key} ${b} → ${val}`)
  }
  // 有數字指標的閘門以指標為準：audit:wiring 等目前就有既存 fail，
  // 把 exit≠0 當成惡化會讓護欄永遠紅，最後所有人都忽略它——這正是要避免的失效模式。
  const tracked = Object.keys(gMetrics[name] ?? {})
  if (cur.exit !== 0 && tracked.length === 0 && (old.exit ?? 0) === 0) {
    worse.push(`${name} 指令失敗（exit ${cur.exit}）`)
  }
  if (cur.exit !== 0 && tracked.length > 0) parts.push(`exit=${cur.exit}(既有缺口)`)
  lines.push(`${name.padEnd(20)} ${parts.join(' ') || '僅查 exit code'}`)
}

console.log(lines.join('\n'))
if (better.length) console.log('\n改善：\n  ' + better.join('\n  '))
if (worse.length) {
  console.error('\ngates — 惡化，請修回或（確屬口徑調整時）由人工更新基線：\n  ' + worse.join('\n  '))
  process.exit(1)
}
console.log('\ngates — 無惡化（與基線一致或更好）')
