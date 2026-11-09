/**
 * audit-chars.ts — 掃簡體字／日本新字混入（本專案正文一律繁體，引文保留原典字形）。
 *
 * HARD：在我們的敘述裡一定是錯的（条約、徳川、下關、會議、奧州、體制…）。
 * SOFT ：視語境而定（来、并、于、干、内、会…），多半出現在引文或古典字形裡，列 info 不自動改。
 * 跳過：地理網格資料（*Meshes.ts、*Avatars.ts）與 `"name":` 欄——那是日本地名原字，不是我們的敘述。
 * 預設只掃文字檔（readings／history／components／docs 由參數決定）；`--all` 掃整個 src。
 *
 * Run: node --experimental-strip-types scripts/audit-chars.ts [路徑...] [--all]
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { enforceGate } from './lib/gate-baseline.ts'

// 簡體專用字（在繁體敘述裡必錯）＋日本新字（徳/関/実…，引文除外）
const HARD: Record<string, string> = {
  条: '條', 关: '關', 関: '關', 实: '實', 実: '實', 录: '錄', 録: '錄', 徳: '德',
  奥: '奧', 议: '議', 泽: '澤', 沢: '澤', 荣: '榮', 栄: '榮', 说: '說', 让: '讓',
  们: '們', 这: '這', 时: '時', 体: '體', 线: '線', 补: '補', 织: '織', 国: '國',
  图: '圖', 书: '書', 军: '軍', 将: '將', 师: '師', 众: '眾', 旧: '舊', 举: '舉',
  艺: '藝', 显: '顯', 区: '區', 杀: '殺', 属: '屬', 续: '續', 归: '歸', 乱: '亂',
  号: '號', 芦: '蘆', 单: '單', 尽: '盡', 隐: '隱', 稳: '穩', 独: '獨', 异: '異',
  战: '戰', 点: '點', 击: '擊', 统: '統', 称: '稱', 观: '觀', 认: '認', 产: '產',
  义: '義', 习: '習', 当: '當', 个: '個', 转: '轉', 办: '辦', 飞: '飛', 从: '從',
  头: '頭', 记: '記', 团: '團', 队: '隊', 长: '長', 门: '門', 间: '間', 东: '東',
  车: '車', 马: '馬', 岛: '島', 汉: '漢', 语: '語', 话: '話', 设: '設', 应: '應',
  术: '術', 阶: '階', 伤: '傷', 价: '價', 优: '優', 运: '運', 还: '還',
  // 2026-11-04 補：這些常見簡體字原本不在表裡，結果 nanbeiPack 的「写成」混進去而閘門全綠。
  写: '寫', 变: '變', 读: '讀', 误: '誤', 难: '難', 边: '邊', 类: '類',
  医: '醫', 银: '銀', 钱: '錢', 响: '響', 极: '極',
  连: '連', 进: '進', 远: '遠', 迁: '遷', 过: '過', 为: '為',
  // 2026-11-04 補二：掃資料時發現三個完全沒進表的字——「则」在兩包裡出現過
  // （我自己也打了一個）、「渉」全專案 72 處（日本新字體，應作「涉」，
  // 三國干渉→三國干涉）、「约／悬」混在民國包的條約名裡（條约→條約）。
  // 另補幾個零出現但常見簡體字當預防：纪证评论许访诉详趋宪协简卖厅圣。
  则: '則', 渉: '涉', 约: '約', 悬: '懸', 纪: '紀', 证: '證', 评: '評',
  // 2026-11-05 補三：把 JP_LINE 從「整行跳過」收緊成「只跳過假名行」之後，
  // 五十多處日式新字體露出來（《徳川実紀》《征韓録》《関原軍記大成》）。
  // 其中引用欄依 §1AJ 保留原形（走 allowlist），敘述與註解裡的則是真錯字。
  // 這幾個字之前完全不在表裡：「憑空画的」「主張対象」「米沢」都是這麼混进去的。
  宝: '寶', 盖: '蓋',
  画: '畫', 戦: '戰', 図: '圖', 対: '對', 晋: '晉', 伦: '倫', 贾: '賈',
  历: '歷', 陈: '陳', 萨: '薩', 双: '雙', 动: '動', 务: '務', 参: '參',
  论: '論', 许: '許', 访: '訪', 诉: '訴', 详: '詳', 趋: '趨', 宪: '憲',
  协: '協', 简: '簡', 卖: '賣', 厅: '廳', 圣: '聖', 决: '決', 权: '權', 谁: '誰', 无: '無',
  // 2026-11-08 補四：排程 agent 回報閘門通過但資料含有簡體字，逐字核對後確認表內缺下列各字。
  // 收錄條件：該字形只出現於簡體、繁體一律用正體者始入表：
  //   阅→閱 叹→嘆 谢→謝 叙→敘 场→場 灭→滅 层→層 践→踐 离→離 联→聯 诸→諸
  //   礼→禮 节→節 数→數 编→編 贷→貸 与→與 满→滿 渐→漸 辖→轄 桩→樁
  // 另補兩個本輪實際查到的錯字：孙（馬陵 outcomeSource）、荆（滅楚舊引文）。
  // 刻意不收：「于」（繁體本字，如「作藩于外」）、「愿」（古典有「愿，谨也」一義，恐誤殺引文，留待人工）。
  阅: '閱', 叹: '嘆', 谢: '謝', 叙: '敘', 场: '場', 灭: '滅', 层: '層', 践: '踐',
  离: '離', 联: '聯', 诸: '諸', 礼: '禮', 节: '節', 数: '數', 编: '編', 贷: '貸',
  与: '與', 满: '滿', 渐: '漸', 辖: '轄', 桩: '樁', 孙: '孫', 荆: '荊',
  // 2026-11-08 補五：修完上一批後再掃出來的兩個——
  // 「庆応3年」（慶応／慶應，簡體庆＋日本新字応同時出現）與「関速」類同形問題。
  // 注意：『』內的日文書名與「」內的日文引文照舊豁免，不受此條影響。
  庆: '慶', 応: '應', 忧: '憂', 扰: '擾', 华: '華', 领: '領', 丰: '豐',
}
// 簡繁混寫：「關于」此類寫法既非繁體（應作「關於」），亦非簡體（應作「关于」），
// 多數是把簡體文件標題直接放入繁體句子所留下的殘跡。2026-11-08 查 minguoPack 領海聲明一節時發現。
const MIXED_USAGE: Record<string, string> = {
  關于: '關於',
}
// 兩用／視語境：古典引文常合法使用（作藩于外、秦并天下），列 info 不自動改
// 着：繁體裡「著色／著陸」作動詞應寫「著」，但「看着」這類動態助詞
// 用的是「着」，所以不能進 HARD；進 SOFT 让閘門提示、不自動判錯。
const SOFT = ['来', '并', '于', '干', '内', '会', '没', '余', '与', '彦', '着']

// 裝成書名的佔位符：有書名號、但沒有具名著作。
// 2026-11-05 掃出 12 處（《京都守護職関連記録》《幕府長州征討相關記錄》等），
// 全在幕末事件檔的 source／outcomeSource 欄位。這類比簡體字更危險：
// 簡體字只是字形錯，佔位符是**看起來像出處但沒有出處**，正是編造的入口。
// 修法只有兩種：換成真的具名著作，或降格為「（未具名）」並承認沒有來源。
// 含糊「書名」偵測：《…相關記錄》《…關連記載》此類名稱既查無此書、也無法逐字核對，
// 等同把讀者引向一個不存在的出處。2026-11-08 先把「關連記錄」這一變體補進來。
const PLACEHOLDER_TITLE =
  /《[^》]{0,24}(相關|關連|関連|关联|有關|對應)[^》]{0,4}(記錄|記録|記載|文獻|檔案|文件|資料)/
const QUOTE_LINE = /(quote|classicQuote|source|title|name|id):\s*['“]/

// 生成的分診表會**照抄原文行**，包括依 §1AJ 合法保留的日文原題字形。
// 那些字形已在來源檔走 allowlist；對生成物再判一次只是重複計數，
// 而且會逼人去「修」一個不該修的產物。要查字形，查來源檔。
// fetchArticle.ts 的 HANS_MARKS 是**簡體字偵測表**：那些字是它要抓的目標，
// 不是寫錯的正文。之前它不在掃描清單只是因為 PROSE 是一條條加進來的白名單——
// 「清單缺目錄」這個盲區今天確認了十次，根因就是白名單會漏。
// 現在預設掃整個 src，改用名字排除，並在這裡寫明為什麼排除。
const SKIP_FILE = /Meshes|Avatars|\.gen\.|vendor|node_modules|\/dist\/|CITATION-TRIAGE|fetchArticle/
const SKIP_LINE = /"name":|^\s*(id|name|label|code):\s*['"]/
// 日文敘述行（含假名或日文助詞）：那裡的日本新字（徳、記録、国内）是正確的，不要「繁化」
// 日文新字（実・徳・旧・対・帰・録…）在繁體中文裡不出現，出現即代表這行是日文文字
// （書名、人名、術語），不是寫錯的繁體。把它們當成日文訊號，整行跳過。
const JP_LINE = /[\u3041-\u309f\u30a1-\u30ff]/

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (f === 'node_modules' || f === 'dist' || f === 'vendor') continue
    if (statSync(p).isDirectory()) walk(p, out)
    else if (
      (p.endsWith('.ts') ||
        p.endsWith('.tsx') ||
        p.endsWith('.md') ||
        // CSS 與 mjs 一併檢查：註釋與 content: "…" 均屬介面文案，此前未被掃描
        p.endsWith('.css') ||
        p.endsWith('.mjs')) &&
      !SKIP_FILE.test(p)
    )
      out.push(p)
  }
  return out
}

// 預設只掃「我們寫的文字」；要掃全部 src 用 --all
// 舊的白名單 PROSE 已移除：預設掃整個 src（見下方 roots）。
// 已逐條核過的硬傷（史料原文字形）：記成「哪個檔、哪個字、憑什麼」，
// 不是只把總數記成基準 2——否則修掉一個、同時闖進另一個，總數不變、閘門全綠。
type CharAllow = { file: string; char: string; reason: string }
function loadCharAllowlist(): CharAllow[] {
  const p = join(import.meta.dirname ?? '.', '..', 'reports', 'chars-allowlist.json')
  try {
    return JSON.parse(readFileSync(p, 'utf8')) as CharAllow[]
  } catch {
    return []
  }
}
const CHAR_ALLOW = loadCharAllowlist()

const args = process.argv.slice(2)
// 旗標不能當成掃描路徑（--update-baseline 會被拿去 statSync 而 crash），
// `--gate` 的數值也不是路徑，要一起吃掉。
const flags: string[] = []
const positional: string[] = []
for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (a === '--gate') {
    flags.push(`--gate=${args[++i] ?? ''}`)
    continue
  }
  if (a.startsWith('--')) {
    flags.push(a)
    continue
  }
  positional.push(a)
}
// 預設掃整個 src（不再依賴白名單）；要縮小範圍用位置參數。
// ⚠ 為什麼預設不含 scripts/：全 repo 有 5 份簡體字偵測表的複製
//   （audit-chars.ts、audit-data.ts:51、audit_chengyu.mjs:26、audit_quotes.mjs、
//   audit_entries.mjs:225 HAN_SRC）。偵測表本身必須含目標字，掃 scripts/ 就
//   就得按名字豁免這 5 檔——那等於把洞偽裝成閘門。正確做法是先合併成單一表模組
//   （見 docs/OVERNIGHT_TASKS.md「簡體字表合併」），合併後再擴大掃描範圍。
//   已確認漂移：audit_chengyu 那份缺少 audit-data 後補的 战/观/舰 三字。
const roots = positional.length ? positional : ['src']
const files = roots.flatMap((r) => (statSync(r).isDirectory() ? walk(r) : [r]))
let hard = 0
let soft = 0
let allowed = 0
let quoteHits = 0
// 「引文內的簡體／日字」預設豁免，需要清單時用 --inspect-quotes（只報告）。
const INSPECT_QUOTES = flags.includes('--inspect-quotes')
for (const f of files) {
    const full = readFileSync(f, 'utf8')
    // 反引號區段要喺成個檔案層面判：加厚後嘅敘事（起因／經過／結果／三層意譯）
    // 正正擺喺模板字面值入面。舊做法逐行 `/`[^`]*`/` 剝掉，等於簡體閘門對主要內容失明。
    // 只保留原本嘅豁免對象：短區段（程式碼，或文件裡「正在討論的那個字本身」）。
    // 判準：跨行，或含 ≥12 個中日韓字 → 敘事內容，要掃；否則照舊跳過。
    const narrative = new Set<number>()
    for (const m of full.matchAll(/`[^`]*`/gs)) {
      const span = m[0]
      const cjk = (span.match(/[\u3400-\u4dbf\u4e00-\u9fff\u3040-\u30ff]/g) ?? []).length
      if (span.includes('\n') || cjk >= 12) {
        const startLine = full.slice(0, m.index).split('\n').length
        const spanLines = span.split('\n').length
        for (let i = 0; i < spanLines; i += 1) narrative.add(startLine - 1 + i)
      }
    }
    const lines = full.split('\n')
    lines.forEach((line, i) => {
      if (SKIP_LINE.test(line) || JP_LINE.test(line)) return
      // 『…』 之內是日文書名（『徳川実紀』『島津国衆軍前軍忠次第』），
      // 実・国・録・徳在日文是正確字形，不是簡體字，掃之前先拿掉。
      // 「…」 之內是引文（古典原文可能合法使用舊字形），預設亦拿掉；
      // 需要覆核引文內的簡體／日字用 `--inspect-quotes`（只報告、不計入失敗）。
      let scanned = line.replace(/『[^』]*』/g, '').replace(/「[^」]*」/g, '')
      // 維基百科連結是機器識別符（條目標題以各維基的實際標題為準，可能正是
      // 簡體字形標題），不是介面文案。PR #95 覆核實證：/zh-tw/<標題> 對
      // 不存在標題也回 200，真正存在的條目標題改不了，故掃描前拿掉。
      scanned = scanned.replace(/https?:\/\/(?:zh|ja)\.wikipedia\.org\/\S+/g, '')
      // 同上：WIKI('條目標題')／WIKI_JA('條目標題') helper 的參數亦是機器識別符
      // （查證輪以 API 實證條目存在性後照實際標題填入，可能正是簡體字形）。
      scanned = scanned.replace(/WIKI(?:_JA)?\(\s*'[^']*'\s*\)/g, '')
      if (!narrative.has(i)) scanned = scanned.replace(/`[^`]*`/g, '')

      const isQuote = QUOTE_LINE.test(line)
      for (const [ch, fix] of Object.entries(HARD)) {
        if (scanned.includes(ch)) {
          const allow = CHAR_ALLOW.find((a) => f.endsWith(a.file) && a.char === ch)
          if (allow) {
            allowed += 1
            console.log(`ALLOWED ${f}:${i + 1} ${ch}（${allow.reason}）`)
            continue
          }
          hard += 1
          console.log(`HARD ${f}:${i + 1} ${ch}→${fix}  ${line.trim().slice(0, 60)}`)
        }
      }
      // 「…」 之內預設豁免（古典引文可能合法用舊字形、日文引文用日本字形）。
      // 但豁免不等於無問題：--inspect-quotes 把它們列出來交人工／引文 agent 逐條判，
      // 只報告、不計入硬傷，避免為了數字好看而改壞引文原形。
      if (INSPECT_QUOTES) {
        for (const sp of line.matchAll(/「[^」]*」/g)) {
          for (const [ch, fix] of Object.entries(HARD)) {
            if (sp[0].includes(ch)) {
              quoteHits += 1
              console.log(`info-quote ${f}:${i + 1} ${ch}→${fix}  ${sp[0].slice(0, 44)}`)
            }
          }
        }
      }
      const ph = scanned.match(PLACEHOLDER_TITLE)
      if (ph) {
        hard += 1
        console.log(`HARD ${f}:${i + 1} 佔位符出處  ${ph[0]}  ${line.trim().slice(0, 50)}`)
      }
      for (const [word, fix] of Object.entries(MIXED_USAGE)) {
        if (scanned.includes(word)) {
          hard += 1
          console.log(`HARD ${f}:${i + 1} 簡繁混寫 ${word}→${fix}  ${line.trim().slice(0, 50)}`)
        }
      }
      if (!isQuote) {
        for (const ch of SOFT) {
          if (line.includes(ch)) {
            soft += 1
            console.log(`info ${f}:${i + 1} ${ch}  ${line.trim().slice(0, 60)}`)
          }
        }
      }
    })
}
console.log(
  `\naudit:chars — 硬傷 ${hard} 處、已核准 ${allowed} 處、待判 ${soft} 處（引文行的視境字已跳過）`,
)
if (INSPECT_QUOTES) {
  console.log(`引文區（「…」內）待判 ${quoteHits} 處——只報告，不計入失敗；請逐條判：真錯字抑或引文原形`)
}
// 硬傷的已知數（史料原文字形）記成基準；變多就失敗。
// --gate 讓同一支腳本對不同範圍各記一條基準（src 與 docs 的既存狀態差很多）。
const gateFlag = flags.find((f) => f.startsWith('--gate='))
const gateName = gateFlag ? gateFlag.slice('--gate='.length) : 'audit:chars'
if (enforceGate(gateName, hard, flags)) process.exitCode = 1
