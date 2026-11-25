#!/usr/bin/env node
/**
 * agent-selfcheck.mjs — 排程 agent 收工前的「新增行」自檢。
 *
 * 只看本輪新增的行（git diff <base>，含已 commit 與未 commit 的追蹤檔），查小模型最常犯的四種錯：
 *   1. 簡體字／日本新字（字表只有一份來源：scripts/audit-chars.ts 的 HARD，見下方載入器）
 *   2. 粵語虛詞（新增行一律不准，不分 src/ 與 agent 產物；見下方 2026-11-25 裁定）
 *   3. 拉丁亂碼夾在中文前（[A-Za-z]{4,} 後面緊接中日文字）與工具呼叫殘骸
 *   4. 新出現的漢字：列出「base 版本沒有出現過的字」，逐個人工核對碼位
 *      （將／隊／潰／擱／無 常被打成相近的錯字，錯字也是合法 Unicode，只能靠這一步看出來）
 *
 * 用法：node scripts/agent-selfcheck.mjs [base] [--branch]
 *   base 預設 origin/main；--branch 把 base 換算成共同祖先（閘門用，見下方說明）。
 * 結束碼：1＝第 1–3 項有命中（必須修）；0＝無命中（第 4 項仍要自己看）。
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')

const args = process.argv.slice(2)
const commitsOnly = args.includes('--commits')
let base = args.find((a) => !a.startsWith('--')) || 'origin/main'
const git = (...a) =>
  execFileSync('git', a, {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'],
  })
/**
 * `--branch`：只為本支自己的行負責（gate-ci 的 audit:selfcheck 用）。
 * 預設的 `git diff origin/main` 是兩點式：主線領先時，主線已經改好的行會在差異裡
 * 變成「本支新增的行」，代理會為別人在主線的修正挨咬（實測發生在四支 agent 分支的
 * public/robots.txt:4）。這裡把 base 換算成共同祖先，語義等於 `base...HEAD`。
 * 代理本地收工時不帶這個旗標，仍把工作區未 commit 的改動一起掃。
 */
if (args.includes('--branch')) {
  try {
    base = git('merge-base', base, 'HEAD').trim()
  } catch {
    console.error('--branch：查不到共同祖先（淺克隆？），退回兩點式比對')
  }
}

// chars-block-start 簡體／日本新字偵測表：以下這段（載入器註解＋NOT_YET_IN_HARD）
// 含本檔要抓的目標字形，把它們正體化會令自檢永遠失靈；同 audit-chars.ts 的 HARD 表同一待遇
// ── 簡體／日本新字表：只有一份來源，就是 scripts/audit-chars.ts 的 HARD ──────
// 2026-11-25 教訓：本檔以前自己維護一份手抄表（約 700 字），和 audit-chars 的
// 1,336 字表已經漂移了 702 字——`改动`、`抽査`（查的日本新字形 U+67FB）這類錯字
// 兩邊都不咬。而 gate-ci 的 audit:commit-msgs 就是叫本檔 `--commits`，所以
// commit 標題與 reports/ 一路全綠：閘門看起來有人查，查的其實是過時副本。
// 現在直接解析 HARD 的鍵，副本消失，漂移在結構上不可能再發生。
function loadHardKeys() {
  let src = ''
  try {
    src = readFileSync(join(ROOT, 'scripts', 'audit-chars.ts'), 'utf8')
  } catch (e) {
    console.error(`讀唔到 scripts/audit-chars.ts（${e.message.split('\n')[0]}）`)
    console.error('字表不能退化成空表——本輪自檢拒絕執行，請先修好路徑')
    process.exit(2)
  }
  const start = src.indexOf('const HARD: Record<string, string> = {')
  if (start < 0) {
    console.error('讀唔到 HARD 表（改咗名定搬咗檔？）——自檢拒絕執行')
    process.exit(2)
  }
  const block = src.slice(start, src.indexOf('\n}', start))
  // 註解行先拿掉：本專案記過兩次同一個坑——表內註解寫成「某字: 某詞」會被解析器
  // 當成一條規則（audit-chars.ts 第十四輪的註解亦已寫明這條限制）。
  const table = block
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l))
    .join('\n')
  const keys = new Set([...table.matchAll(/(?:^|[{,\s])(\p{Script=Han})\s*:\s*'/gum)].map((m) => m[1]))
  // fail-closed：解析出一張小表比解析失敗更危險（它會安靜地全綠）。
  if (keys.size < 500) {
    console.error(`HARD 只解析出 ${keys.size} 支字（應有 1,300 上下）——解析器壞了，自檢拒絕執行`)
    process.exit(2)
  }
  return keys
}
const SIMPLIFIED = loadHardKeys()
// HARD 還沒收、但本檔老表已在查的簡體字（逐支查過：正體一律用右邊的字形，
// 沒有兩用義）。刻意不收 HARD 明言排除的兩用字——来 会 没 党 却 尔 愿 着 猪
// （audit-chars.ts 把它們留在 SOFT 或註明「進表會誤殺引文」）：自檢和閘門標準
// 不一致時，小模型會去「修」一個本來正確的字，那比漏報更糟。
// 這些字終究該合併進 HARD；在合併之前先留在這裡，免得今天的 coverage 退回昨天。
const NOT_YET_IN_HARD = new Set(
  ('匀吗哑啸嘘妆妈姗娱帘擞攒昙枫洒湾灿炉烁爷狮猫珐琐疯痴砖窍笋纫纺肠肾舱' +
    '苹茧萝蔼蚁蜡袄裆觅谎赚轿酝酱钢闷饱饼').split(''),
)
for (const c of NOT_YET_IN_HARD) SIMPLIFIED.add(c)
// chars-block-end

// ── 與 audit-chars.ts 同步的豁免（不對齊就會「selfcheck 紅、gates 綠」）──────
// 閘門判的是「我們的敘述」；史料原題、引文、維基條目標題、label 都是機器識別符或原文，
// 依 §1AJ 要照原典字形。本檔以前不做這層剝離，所以對齊 HARD 之後會大量誤報。
const JP_LINE = /[\u3041-\u309f\u30a1-\u30fa\u30fc]/
const SKIP_LINE = /"name":|^\s*(id|name|label|code):\s*['"]|^\s*\{\s*(id|label|code):\s*['"]/
// 偵測表所在的檔案：檔內那一長串目標字形是它要抓的東西，不是寫錯的正文。
// 名稱需與 audit-chars.ts 的 SKIP_FILE 保持一致（兩邊都寫明憑什麼＝豁免範圍要看得見）。
const DETECTOR_TABLES =
  /audit-chars|audit-data|audit_chengyu|audit_quotes|audit_entries|fetchArticle|agent-selfcheck|verify_chars_opencc|qsrc\.py|docs\/legacy\/|scripts\/legacy\/|HANDOVER|OVERNIGHT_TASKS|ENRICH_MERGE_/
// chars-block 標記豁免（同 audit-chars）：有些檔的職責就是列錯字，正體化會令偵測永遠失靈。
const BLOCK_START = /^\s*(?:\/\/|#|\*)\s*chars-block-start\b(.*)$/
const BLOCK_END = /^\s*(?:\/\/|#|\*)\s*chars-block-end\b/
function blockRanges(lines) {
  const covered = new Set()
  let open = -1
  lines.forEach((l, i) => {
    if (BLOCK_START.test(l)) {
      if (open < 0) open = i
      return
    }
    if (BLOCK_END.test(l) && open >= 0) {
      for (let k = open; k <= i; k++) covered.add(k)
      open = -1
    }
  })
  return covered
}
// 引文／書名／機器識別符先拿掉（逐條對應 audit-chars.ts 掃描前的剝離步驟）。
function stripQuoted(text) {
  return text
    .replace(/『[^』]*』/g, '')
    .replace(/「[^」]*」/g, '')
    .replace(/《[^》\n]{1,40}》/g, '')
    .replace(/https?:\/\/(?:zh|ja)\.wikipedia\.org\/\S+/g, '')
    .replace(/WIKI(?:_JA)?\(\s*'[^']*'\s*\)/g, '')
    // 反引號短區段照 audit-chars 同一準則豁免：單行、且中日韓字少於 12 才算
    // 「程式碼」或「正在討論的那個字本身」（本倉文件慣例：引用錯字要包反引號）。
    // 跨行或長段是敘事內容，照掃——否則加厚過的敘事對閘門徹底失明。
    .replace(/`[^`]*`/g, (span) => {
      const cjk = (span.match(/[\u3400-\u4dbf\u4e00-\u9fff\u3040-\u30ff]/g) ?? []).length
      if (span.includes('\n') || cjk >= 12) return span
      // 用空格填而不是刪掉：保留行數與行內偏移，行號和報錯片段才不會錯位
      return span.replace(/[^\n]/g, ' ')
    })
}
// 含假名的行不再整行放過，改成遮蔽假名鄰字（同 audit-chars 的 maskNearKana）。
function maskNearKana(s) {
  const kana = []
  for (let i = 0; i < s.length; i++) if (JP_LINE.test(s[i])) kana.push(i)
  if (!kana.length) return s
  return [...s].map((c, i) => (kana.some((k) => Math.abs(k - i) < 4) ? '\u0000' : c)).join('')
}
// 已核准的史料原字形（reports/chars-allowlist.json）：只有「檔＋字＋錨喺同一行」才豁免。
function loadAllowlist() {
  try {
    return JSON.parse(readFileSync(join(ROOT, 'reports', 'chars-allowlist.json'), 'utf8'))
  } catch {
    return [] // 檔唔見咗 → 豁免失效 → 寧可多報（fail-closed，同 audit-chars 一樣）
  }
}
const ALLOW = loadAllowlist()
function allowedFor(file, ch, rawLine) {
  return ALLOW.some(
    (a) =>
      file.endsWith(a.file) &&
      a.char === ch &&
      typeof a.context === 'string' &&
      a.context.trim().length >= 4 &&
      rawLine.includes(a.context.trim()),
  )
}
// 一行該不該查簡體字：回傳要掃的字串（空字串＝這行豁免）。
function simplifiableText(file, rawLine) {
  if (DETECTOR_TABLES.test(file)) return ''
  if (SKIP_LINE.test(rawLine)) return ''
  let s = stripQuoted(rawLine)
  if (JP_LINE.test(s)) s = maskNearKana(s)
  return s
}

const CANTONESE = /[嘅咗唔冇喺啲嘢睇哋佢咁嚟啱諗]/
const LATIN_BEFORE_CJK = /[A-Za-z]{4,}(?=[\u4e00-\u9fff])/
const TOOL_ECHO = /<tool_call>|<function=|<parameter=|<\/function>/
const HAN = /[\u4e00-\u9fff]/

// --commits：只掃本輪 commit 訊息。小模型會把簡體字寫進 commit 標題，
// 而原本的自檢只掃檔案，所以 commit 訊息一路沒人查。給 gates 用同一支字表。
if (commitsOnly) {
  let log = ''
  try {
    log = git('log', `${base}..HEAD`, '--format=%B%x00')
  } catch (e) {
    console.error(`git log ${base}..HEAD 失敗：${e.message.split('\n')[0]}`)
    process.exit(2)
  }
  const commitHits = []
  let n = 0
  for (const msg of log.split('\0')) {
    const line = msg.trim()
    if (!line) continue
    n++
    // commit 訊息同樣要走豁免：本倉的修正 commit 慣用「」引用被修的那支字
    // （例：fix(chars): 派系敘述「噶廈」正體化），日文史料題名則走《》與假名鄰字遮蔽。
    // 對齊 HARD 之後多查 700 支字（一批只在日文出現的字形也在表內），
    // 不剝這層就會把自己的修正 commit 報成錯字。
    const msgText = maskNearKana(stripQuoted(line))
    for (const c of msgText) {
      if (SIMPLIFIED.has(c)) commitHits.push([`commit #${n}`, `簡體字／日本新字「${c}」`, line.split('\n')[0]])
    }
    if (TOOL_ECHO.test(line)) commitHits.push([`commit #${n}`, '工具呼叫殘骸', line.split('\n')[0]])
    if (/^(<<<<<<<|=======$|>>>>>>>)/m.test(line)) commitHits.push([`commit #${n}`, '衝突標記', line.split('\n')[0]])
  }
  const seenC = new Set()
  for (const [where, why, text] of commitHits) {
    const k = `${where}|${why}`
    if (seenC.has(k)) continue
    seenC.add(k)
    console.log(`✗ ${where}｜${why}\n    ${text.slice(0, 110)}`)
  }
  console.log(`\nagent-selfcheck --commits — 命中 ${seenC.size} 處／${n} 個 commit`)
  process.exit(seenC.size ? 1 : 0)
}

// 未納入版本控制的新檔也要查：agent 常見「寫了檔忘記 commit」，
// 只掃 git diff 的話，一整份新檔（正是簡體字最愛的地方）會完全進不了自檢。
const untracked = (() => {
  try {
    return git('ls-files', '--others', '--exclude-standard').split('\n').filter(Boolean)
  } catch {
    return []
  }
})()

const added = []
let files = []
try {
  files = git('diff', '--name-only', base).split('\n').filter(Boolean)
} catch (e) {
  console.error(`git diff ${base} 失敗：${e.message.split('\n')[0]}`)
  process.exit(2)
}
for (const f of files) {
  // 偵測表／交接紀錄整檔跳過：那些檔的職責就是列出錯字與被拒的理由，
  // 把它們「正體化」會讓偵測永遠失靈（同 audit-chars.ts 的 SKIP_FILE 同一組理由）。
  if (DETECTOR_TABLES.test(f)) continue
  if (/\.(png|jpe?g|webp|gif|ico|woff2?|pdf|lock)$/i.test(f)) continue
  if (/(^|\/)package-lock\.json$/.test(f)) continue
  // chars-block 標記豁免要用工作區的檔案內容來算行號（diff 只有新增行）
  let covered = new Set()
  try {
    covered = blockRanges(readFileSync(join(ROOT, f), 'utf8').split('\n'))
  } catch {
    /* 新增檔讀不到就用空集合：寧可多報 */
  }
  let diff = ''
  try {
    diff = git('diff', '-U0', base, '--', f)
  } catch {
    continue
  }
  let ln = 0
  for (const line of diff.split('\n')) {
    const h = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)/)
    if (h) {
      ln = Number(h[1])
      continue
    }
    if (line.startsWith('+') && !line.startsWith('+++')) {
      added.push({ f, ln, text: line.slice(1), blocked: covered.has(ln - 1) })
      ln++
    }
  }
}
// 未追蹤的新檔：整檔都算新增行（git diff 看不到它們）。
for (const f of untracked) {
  if (DETECTOR_TABLES.test(f)) continue
  if (/\.(png|jpe?g|webp|gif|ico|woff2?|pdf|lock)$/i.test(f)) continue
  if (/(^|\/)package-lock\.json$/.test(f)) continue
  let text = ''
  try {
    text = readFileSync(join(ROOT, f), 'utf8')
  } catch {
    continue // 死鏈或權限問題：跳過而非中止，其他檔還要查
  }
  const lines = text.split('\n')
  const covered = blockRanges(lines)
  lines.forEach((line, i) => added.push({ f, ln: i + 1, text: line, blocked: covered.has(i) }))
}
files = [...new Set([...files, ...untracked])]

const hits = []
/**
 * 粵語虛詞的邊界（2026-11-25 使用者裁定收緊）：以前只咬 src/，對 docs/、scripts/、
 * reports/ 刻意豁免（11-13 的政策），結果 agent 每輪往 reports/ 寫進幾十行口語，
 * 覆核時要把「實測如此」與「代理自述」分開讀，等於把成本轉嫁給人。現在新增行一律要書面語。
 * 只量新增行是刻意的：既有語料（reports/ 561 行、docs/ scripts/ 約 1,000 行）是代理
 * 的工作語言，一次改寫會引入大量錯碼位風險，改由 gate-ci 的 `audit:selfcheck`
 * 對分支淨差異做零容忍，存量只能減不能增。
 */
let colloqLines = 0
const newHan = new Map()
const baseChars = new Map()
const baseHan = (f) => {
  if (baseChars.has(f)) return baseChars.get(f)
  let s = new Set()
  try {
    for (const c of git('show', `${base}:${f}`)) if (HAN.test(c)) s.add(c)
  } catch {
    s = new Set()
  }
  baseChars.set(f, s)
  return s
}
// 全站已出現的字：用整個 base 的 src/ 與 docs/ 太慢，改用同檔＋同目錄既有字集
const siteHan = new Set()
try {
  const dirs = [...new Set(files.map((f) => f.split('/').slice(0, -1).join('/')))]
  for (const d of dirs) {
    if (!d) continue
    for (const g of git('ls-tree', '-r', '--name-only', base, '--', d)
      .split('\n')
      .filter(Boolean)
      .slice(0, 40)) {
      if (/\.(ts|tsx|css|md|mjs|json)$/.test(g)) {
        for (const c of baseHan(g)) siteHan.add(c)
      }
    }
  }
} catch {
  /* 缺 base 檔只代表新檔案，略過 */
}

for (const { f, ln, text, blocked } of added) {
  const inSrc = f.startsWith('src/')
  const where = `${f}:${ln}`
  // 簡體／日本新字：用與閘門相同的豁免（偵測表／引文／書名／label／假名鄰字／allowlist 錨）。
  const scanned = blocked ? '' : simplifiableText(f, text)
  if (scanned) {
    for (const c of scanned) {
      if (SIMPLIFIED.has(c) && !allowedFor(f, c, text)) hits.push([where, `簡體字／日本新字「${c}」`, text.trim()])
    }
  }
  for (const c of text) {
    if (HAN.test(c) && !baseHan(f).has(c) && !siteHan.has(c)) {
      if (!newHan.has(c)) newHan.set(c, where)
    }
  }
  // 用遮蔽後的 scanned 判，與閘門一致：逐字引文裡本來就可能出現「嘅」「唔」，
  // 引文／書名／code／偵測表都已被 simplifiableText 遮蔽成空字串，不該誤殺。
  if (CANTONESE.test(scanned)) {
    colloqLines += 1
    hits.push([where, `粵語虛詞（${inSrc ? '網站文字' : '新增行'}須書面語）`, text.trim()])
  }
  const lm = text.match(LATIN_BEFORE_CJK)
  if (lm) hits.push([where, `拉丁亂碼「${lm[0]}」`, text.trim()])
  if (TOOL_ECHO.test(text)) hits.push([where, '工具呼叫殘骸', text.trim()])
  if (/^(<<<<<<<|=======$|>>>>>>>)/.test(text)) {
    hits.push([where, '衝突標記', text.trim()])
  }
}

const seen = new Set()
for (const [where, why, text] of hits) {
  const k = `${where}|${why}`
  if (seen.has(k)) continue
  seen.add(k)
  console.log(`✗ ${where}｜${why}\n    ${text.slice(0, 110)}`)
}
if (newHan.size) {
  console.log(
    `\n新出現的漢字（同目錄既有檔未出現）共 ${newHan.size} 個，請逐個核對碼位：`,
  )
  console.log('  ' + [...newHan.keys()].join(''))
  console.log('  （例：看到「将堤潫搁沥」就是錯碼位，應為「將隊潰擱無」）')
}
console.log(
  `\nagent-selfcheck — 新增 ${added.length} 行／${files.length} 檔｜命中 ${seen.size} 處｜新漢字 ${newHan.size}` +
    (colloqLines ? `｜其中粵語虛詞 ${colloqLines} 行` : ''),
)
process.exit(seen.size ? 1 : 0)
