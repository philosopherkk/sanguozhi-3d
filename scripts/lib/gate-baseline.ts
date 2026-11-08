/**
 * gate-baseline.ts — 把各稽核腳本的「已知問題數」記成基準，之後只在變多時讓 CI 失敗。
 *
 * 為什麼要基準而不是直接 fail：audit:chars 有 2 處是史料原文的字形（吾妻鏡），
 * audit:quotes 有 14 條是原典沒有全文，audit:fact 的數字旗標多數是正當的跨事件引用。
 * 這些是當下可接受、但要被看見的狀態；直接讓 CI 變紅只會讓人把步驟拿掉。
 *
 * 用法（在各稽核腳本結尾）：
 *   if (enforceGate('audit:chars', hard)) process.exitCode = 1
 * 重新記基準：
 *   npx tsx scripts/audit-chars.ts --update-baseline
 *
 * Run（查看全部基準）: npx tsx scripts/lib/gate-baseline.ts
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
// 2026-11-08 改檔：本檔原先與 scripts/gate-ci.mjs 共用 reports/gate-baseline.json，
// 但兩邊格式不同——gate-ci 寫的是 {"audit:chars": {"exit":0,"hard":233}}，
// 本檔當成 {"audit:chars": 233} 來比。結果 `269 > {…}` 恆為 false，
// audit-chars 的閘門自那次改動起永遠通過（即使 999999 也不會失敗）。
// 兩條曲線各用自己的檔，並在下文強制檢查類型，杜絕同形失靈再發生。
const BASELINE = join(HERE, '..', '..', 'reports', 'audit-baselines.json')

type Baseline = Record<string, number>

function load(file: string): Baseline {
  if (!existsSync(file)) return {}
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as Baseline
  } catch {
    console.log(`（基準檔讀不到，視為空：${file}）`)
    return {}
  }
}

function save(b: Baseline, file: string) {
  writeFileSync(file, JSON.stringify({ ...b }, null, 2) + '\n', 'utf8')
  console.log(`已寫入基準：${file}`)
}

/**
 * 回傳 true 代表「比基準差」（呼叫端要讓程序失敗）。
 * 沒有基準時不失敗，只提示先記一次，避免新腳本一併入就把 CI 變紅。
 */
export function enforceGate(
  gate: string,
  count: number,
  argv: string[] = process.argv,
  baselineFile: string = BASELINE,
): boolean {
  const base = load(baselineFile)
  if (argv.includes('--update-baseline')) {
    base[gate] = count
    save(base, baselineFile)
    console.log(`基準 ${gate} = ${count}`)
    return false
  }
  const allowed = base[gate]
  // 基準值一旦不是數字（例如別支腳本把同一個 key 寫成物件），
  // count > allowed 會恆為 false，閘門就無聲變成橡皮章。寧可硬失敗。
  if (allowed != null && typeof allowed !== 'number') {
    console.error(
      `✗ ${gate}：基準值不是數字（${JSON.stringify(allowed)}）——數值比較會恆為 false，閘門等於不存在。請重記基準。`,
    )
    return true
  }
  if (allowed == null) {
    console.log(`? ${gate}：${count} 項——尚未記基準（跑一次 ${gate} --update-baseline）`)
    return false
  }
  if (count > allowed) {
    console.log(`✗ ${gate}：${count} 項，比基準 ${allowed} 項多 ${count - allowed} 項（要接受新狀態就重記基準）`)
    return true
  }
  if (count < allowed) {
    console.log(`✓ ${gate}：${count} 項，比基準 ${allowed} 項少 ${allowed - count} 項（可重記基準把成果固定下來）`)
    return false
  }
  console.log(`✓ ${gate}：${count} 項（與基準相同）`)
  return false
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const base = load()
  console.log(`基準檔：${BASELINE}`)
  for (const [k, v] of Object.entries(base)) console.log(`  ${k} = ${v}`)
  if (!Object.keys(base).length) console.log('  （空）')
}
