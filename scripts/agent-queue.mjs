#!/usr/bin/env node
/**
 * agent-queue.mjs [key] — 排程 agent 的統一佇列入口。
 *
 * 以前每支手冊各自寫「跑哪條指令、自己數」，模型常常數錯，或者佇列見底還在原地找。
 * 這支把剩下多少、下一批做什麼集中輸出；agent 只管照單做事，不需要自己設計工作。
 *
 * 2026-11-27 新增 critical：關鍵事變的缺口與未標卡（見 reports/critical-incidents.md）。
 * 2026-11-28 新增 country：四國包（韓國／泰國／越南／馬來西亞）的 country_check 與下游佇列。
 *
 * 用法：
 *   node scripts/agent-queue.mjs          印各支的剩餘量（適合人看）
 *   node scripts/agent-queue.mjs <key>    印該支的明細（agent 用）
 *   node scripts/agent-queue.mjs country --country=korea
 *                                         只跑一個國家（korea／thailand／vietnam／malaysia）
 */
import { execSync } from 'node:child_process'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const key = process.argv[2]

const run = (cmd) => {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8', timeout: 180000, stdio: ['ignore', 'pipe', 'ignore'] })
  } catch (e) {
    return `（指令失敗：${String(e.message).split('\n')[0]}）\n${e.stdout ?? ''}`
  }
}
const last = (s, pat) => s.split('\n').filter((l) => pat.test(l)).pop() ?? '（找不到總結行）'
const head = (s, n) => s.split('\n').slice(0, n).join('\n')

/** 四國（韓國／泰國／越南／馬來西亞）：`--country=<c>` 把佇列縮到一國，
 *  預設跑全部。包清單由目錄掃出來——寫死名單就會有「包已上線、佇列從未見過」。 */
const COUNTRY_ARG = process.argv.find((x) => x.startsWith('--country='))
const COUNTRY_ONLY = COUNTRY_ARG ? COUNTRY_ARG.slice('--country='.length) : null
const COUNTRIES = ['korea', 'thailand', 'vietnam', 'malaysia'].filter(
  (c) => !COUNTRY_ONLY || c === COUNTRY_ONLY,
)

const countryPacks = () => {
  const out = []
  for (const c of COUNTRIES) {
    let names = []
    try {
      names = readdirSync(join(ROOT, 'src/countries', c))
    } catch {
      continue
    }
    for (const f of names.filter((x) => x.endsWith('Pack.ts')).sort()) {
      out.push(`src/countries/${c}/${f}`)
    }
  }
  return out
}

/** 逐包跑 country_check（一包一跑、秒級），只留問題行；PASS 由末行判定。 */
const countryRuns = () =>
  countryPacks().map((file) => {
    const out = run(`node scripts/country_check.mjs ${file}`)
    const problems = out.split('\n').filter((l) => l.startsWith('\u2717'))
    const crashed = !/^(PASS|FAIL)$/m.test(out)
    return { file, pass: !crashed && !problems.length, problems, crashed, tail: last(out, /^(PASS|FAIL)$/) }
  })

const summary = {
  enrich: () => {
    run('node scripts/audit_event_depth.mjs')
    return last(run('node scripts/audit_event_depth.mjs'), /^audit:event-depth —/)
  },
  accuracy: () => {
    const d = JSON.parse(readFileSync(join(ROOT, 'scripts/quote-audit-ledger.json'), 'utf8'))
    return `已戳記 ${Object.keys(d).length} 條（另有出處具名卻無原文的條目，見 detail）`
  },
  map: () => last(run('python3 scripts/check_ring_landmarks.py --unasserted'), /無地標斷言/),
  march: () => last(run('python3 scripts/check_route_landmarks.py --unasserted'), /無斷言/),
  critical: () => last(run('node scripts/audit_critical.mjs'), /^audit:critical —/),
  plan: () => {
    const files = planFiles()
    if (!files.length) return '（docs/plans 無日期目錄）'
    return files
      .map((p) => {
        const c = planCount(p.path)
        return `${p.track} 剩 ${c.todo}／${c.todo + c.done}`
      })
      .join('、')
  },
  country: () => {
    const rows = countryRuns()
    if (!rows.length) return `（src/countries/${COUNTRY_ONLY ?? ''} 掃不到 *Pack.ts）`
    const bad = rows.filter((r) => !r.pass)
    if (!bad.length) return `${rows.length}/${rows.length} 包全過 country_check（另見 detail 的下游佇列）`
    return `${rows.length - bad.length}/${rows.length} 包通過｜未過：${bad
      .map((r) => r.file.split('/').pop())
      .join('、')}`
  },
}
const detail = {
  enrich: () => {
    run('node scripts/audit_event_depth.mjs')
    // 以前只轉發統計表（「中學生層未達標 164 條」），agent 不知道是哪幾條，
    // 每輪自己 grep 猜目標。現在直接給 檔:行｜層｜現字數 的具體清單。
    const todo = run('node scripts/audit_event_depth.mjs --todo 12')
    return [last(run('node scripts/audit_event_depth.mjs'), /^audit:event-depth —/), '', todo.trim()].join('\n')
  },
  accuracy: () => {
    const d = JSON.parse(readFileSync(join(ROOT, 'scripts/quote-audit-ledger.json'), 'utf8'))
    /**
     * 2026-11-25 修正：本欄以前只列「最舊的 12 條已戳記引文」，
     * 等於叫 accuracy 每輪去覆核自己查過的東西——332 條蓋過章的引文就這樣被轉圈查了十幾輪，
     * 而 1,690 條從未查證的引文一條都沒進佇列。待辦一律以 --todo 為準（未查證優先）。
     */
    const todo = run('node scripts/audit_quotes.mjs --todo --limit 12')
    return [
      `已戳記 ${Object.keys(d).length} 條（覆核用的舊帳本不當日佇列）`,
      '',
      todo.trim(),
    ].join('\n')
  },
  map: () => {
    const o = run('python3 scripts/check_ring_landmarks.py --unasserted')
    // 佇列見底就明講見底：之前照樣印「前十條」，agent 找不到事做就自己發明工作
    // （實測發生過憑空畫政權），寧可讓它改去做備援清單。
    return [last(o, /無地標斷言/), head(o, 12), MAP_FALLBACK].join('\n')
  },
  march: () => {
    const o = run('python3 scripts/check_route_landmarks.py --unasserted')
    return [last(o, /無斷言/), head(o, 12), MARCH_FALLBACK].join('\n')
  },
  critical: () => {
    const o = run('node scripts/audit_critical.mjs --todo 12')
    // 前面 24 行是各槽統計（給人看），代理只要待辦清單，故從 --todo 總結行起轉發
    const at = o.indexOf('audit:critical --todo')
    return [at >= 0 ? o.slice(at).trimEnd() : o, CRITICAL_NOTE].join('\n')
  },
  plan: () => {
    const files = planFiles()
    if (!files.length) return '（docs/plans 下無 <日期> 目錄，plan 軌道尚未開單）'
    if (!PLAN_TRACK) {
      return [
        `計畫目錄：${planDir().replace(ROOT + '/', '')}`,
        '',
        ...files.map((p) => {
          const c = planCount(p.path)
          return `  ${p.track.padEnd(11)} 剩 ${String(c.todo).padStart(3)} 條（已做 ${c.done}）` +
            ` 取單：node scripts/agent-queue.mjs plan --track=${p.track}`
        }),
      ].join('\n')
    }
    const hit = files.find((p) => p.track === PLAN_TRACK)
    if (!hit) {
      return `無此軌道：${PLAN_TRACK}（可用：${files.map((p) => p.track).join('、')}）`
    }
    const rows = planRows(hit.path)
    const open = rows.filter((r) => /^\s*☐/.test(r.text))
    const n = Number(PLAN_TODO) || 4
    const lines = [
      `軌道 ${hit.track}：剩 ${open.length} 條／共 ${rows.length} 條（檔 ${hit.path.replace(ROOT + '/', '')}）`,
      '',
    ]
    if (!open.length) return lines.join('\n') + `\n本軌道見底，改跑 plan 看其他軌道或回主佇列。`
    open.slice(0, n).forEach((r, i) => lines.push(`第 ${i + 1} 條（檔內第 ${r.no} 行）｜${r.text.slice(2).trim()}`))
    return [lines.join('\n'), '', `做完一項就標記（編號係上面「第 N 條」，指未做的第幾條）：`,
      `  node scripts/agent-queue.mjs plan --track=${hit.track} --done=<N>`, '', PLAN_NOTE].join('\n')
  },
  country: () => {
    const rows = countryRuns()
    const bad = rows.filter((r) => !r.pass)
    const lines = [
      `四國包 country_check：${rows.length - bad.length}/${rows.length} 通過` +
        (COUNTRY_ONLY ? `（--country=${COUNTRY_ONLY}）` : ''),
      '',
    ]
    if (bad.length) {
      lines.push('未過的包（問題行照抄，改完重跑本指令）：')
      for (const r of bad) {
        lines.push(`\n### ${r.file}`)
        lines.push(r.problems.length ? r.problems.join('\n') : `（country_check 冇印問題行，末行：${r.tail}）`)
      }
    } else {
      lines.push('16/16 全過 country_check。四國包的欄位完整性已閉幕，改做下面的下游佇列。')
    }
    lines.push('', COUNTRY_NOTE)
    // 下游三條都已經自然覆蓋 src/countries/：enrich 預設 --only src，
    // accuracy 走全 src 的引文掃描，critical 已登記四國 16 槽。這裡只列清單，不另造統計。
    // ⚠ `--only` 只認空格形（`optVal` 用 argv.indexOf），寫成 `--only=src/countries`
    // 會無聲 fallback 到整個 src——佇列就變回全庫清單，四國反而被淹死。
    const depth = run('node scripts/audit_event_depth.mjs --only src/countries --todo 8')
    const crit = run('node scripts/audit_critical.mjs --todo 8')
    const critCountry = crit
      .split('\n')
      .filter((l) => l.includes('src/countries/'))
      .slice(0, 6)
    lines.push(
      '',
      '── enrich（audit:event-depth --only=src/countries）──',
      depth.trim() || '（無輸出）',
      '',
      '── critical（audit:critical --todo 裡指向 src/countries 的項）──',
      critCountry.length ? critCountry.join('\n') : '（本批 8 項未落在 src/countries）',
    )
    return lines.join('\n')
  },
}
// 關鍵事變的界線：盤點器的「界線」年屬時代終點、或最後一個換圖年之後的政權退出，
// 屬時代界線而非缺口；未標的卡必須逐條判斷後才加旗幟（定義由 KK 定，不得放寬）。
const CRITICAL_NOTE = `
界線年（報告第一節標「界線」者）屬時代界線，不算缺口，不要為它們造卡。
「未標」的卡要逐條判斷：只有關係政權興亡或改變時代，才加 critical: true；
判斷不成立的，留在原卡並在 note 寫明理由，不得刪除既有內容。
「缺口」造新卡時：正史／六國史為據，引文用 node scripts/qsrc.py 查原文與卷次，
不得憑空創造地圖上的政權；新增行軍線一律示意並吸附既有表。`
/**
 * 四國包（hf-country）嘅下游指引。country_check 只驗「欄位齊唔齊、id 有冇對得上」，
 * 內容深淺與引文真假要靠既有三條佇列，唔使亦唔准另起一套口徑。
 */
const COUNTRY_NOTE = `
country_check 驗的是欄位與掛載（欄位齊唔齊、era id 有冇對上 TopicContext）。
內容質素改做既有佇列，唔好另起口徑：
  hf-enrich    node scripts/audit_event_depth.mjs --only src/countries --todo 12
               （注意：--only 只認空格，寫 --only=… 會靜默掃整個 src）
  hf-accuracy  node scripts/audit_quotes.mjs --todo --limit 12   （掃全 src，已含四國）
  hf-critical  node scripts/audit_critical.mjs --todo 12         （已登記四國 16 槽）
  hf-map       node scripts/audit_map_accuracy.mjs               （版圖鍵要喺亞洲戰區畫布有幾何）
改完必跑：node scripts/country_check.mjs <pack.ts>、npm run gates。
正體與引文口徑照 AGENTS.md：史料題名用《》『』，只換字形不改措辭。`
/**
 * plan 軌道：把 docs/plans/<日期>/<軌道>.md 的 `☐` 清單變成佇列。
 *
 * 2026-11-28：四國（韓國／泰國／越南／馬來西亞）上線後的執行計畫，由規劃層寫成
 * 一份份 `☐ <檔或槽 id>｜<動作>｜驗收=<指令>` 行。小模型自己設計工作會跑偏（憑空造政權、
 * 改預設圖層都發生過），所以這裡只讓它照單做事：做完把該行的 `☐` 改成 `☑` 再 commit。
 *
 *   node scripts/agent-queue.mjs plan                       各軌道剩多少
 *   node scripts/agent-queue.mjs plan --track=march         該軌道的待辦（含驗收指令）
 *   node scripts/agent-queue.mjs plan --track=march --done=3 把第 3 條標為已完成
 */
const PLAN_TRACK = (process.argv.find((x) => x.startsWith('--track=')) ?? '').slice('--track='.length)
const PLAN_DONE = (process.argv.find((x) => x.startsWith('--done=')) ?? '').slice('--done='.length)
const PLAN_TODO = (process.argv.find((x) => x.startsWith('--todo')) ?? '').split(/=/)[1] ?? '4'

const planDir = () => {
  const base = join(ROOT, 'docs', 'plans')
  let dirs = []
  try {
    dirs = readdirSync(base).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort()
  } catch {
    return null
  }
  return dirs.length ? join(base, dirs[dirs.length - 1]) : null
}
const planFiles = () => {
  const dir = planDir()
  if (!dir) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => ({ track: f.replace(/\.md$/, ''), path: join(dir, f) }))
}
/** 只認行首的 ☐／☑：plans 裡正文也會提到這兩個符號，不能誤計。 */
const planRows = (path) =>
  readFileSync(path, 'utf8')
    .split('\n')
    .map((text, i) => ({ no: i + 1, text }))
    .filter((r) => /^\s*[☐☑]/.test(r.text))
const planCount = (path) => {
  const rows = planRows(path)
  return { todo: rows.filter((r) => /^\s*☐/.test(r.text)).length, done: rows.filter((r) => /^\s*☑/.test(r.text)).length }
}

if (key === 'plan' && PLAN_DONE) {
  const hit = planFiles().find((p) => p.track === PLAN_TRACK)
  if (!hit) {
    console.error(`無此軌道：${PLAN_TRACK}（可用：${planFiles().map((p) => p.track).join('、') || 'docs/plans 系空'}）`)
    process.exit(2)
  }
  const idx = Number(PLAN_DONE)
  const open = planRows(hit.path).filter((r) => /^\s*☐/.test(r.text))
  const target = open[idx - 1]
  if (!Number.isInteger(idx) || !target) {
    console.error(`第 ${PLAN_DONE} 條唔存在（本軌道未做 ${open.length} 條）`)
    process.exit(2)
  }
  const src = readFileSync(hit.path, 'utf8').split('\n')
  src[target.no - 1] = target.text.replace('☐', '☑')
  writeFileSync(hit.path, src.join('\n'), 'utf8')
  const left = planCount(hit.path)
  console.log(`已標記 ${hit.track} 第 ${idx} 條：${target.text.slice(0, 60)}…`)
  console.log(`${hit.track} 尚餘 ${left.todo} 條（已做 ${left.done}）→ 記得連同改動一齊 commit`)
  process.exit(0)
}

const PLAN_NOTE = `
做法：一次做一項，一項只改一個檔案；照該行寫明的動作做，不要自己擴大範圍。
做完先跑該行的「驗收=」指令（要 exit 0），再把該行行首的 ☐ 改成 ☑：
  node scripts/agent-queue.mjs plan --track=<軌道> --done=<第幾條>
然後連同內容改動一齊 commit（標題用正體書面語，會被 audit:commit-msgs 查）。
計畫行寫「BLOCKED」的項目表示落在時代視窗外、UI 永遠看不到，不要硬做。`
const MAP_FALLBACK = `
主佇列若見底（剩下的都是已放棄／巨框），改做：
  npm run audit:war-shape > /tmp/ws.log 2>&1; echo exit=$?
報告裡「示意框」那一批（目前 57 個）才是可核的實地標；
或跑 node scripts/audit_critical.mjs --todo 20 補關鍵年地圖上的政權興亡。`
const MARCH_FALLBACK = `
主佇列若見底（其餘全部已載明理由地延後），改做：
  node scripts/audit_critical.mjs --cards | grep critical | head -60
挑沒有行軍線的關鍵年補線（新線一律示意、吸附既有表，不得憑空造政權）。`

if (key && !summary[key]) {
  console.error(`未知 agent：${key}（可用：${Object.keys(summary).join('、')}）`)
  process.exit(2)
}
if (key) {
  console.log(`## ${key} 佇列\n`)
  console.log(detail[key]())
} else {
  for (const [k, fn] of Object.entries(summary)) console.log(`${k.padEnd(9)} ${fn()}`)
}
