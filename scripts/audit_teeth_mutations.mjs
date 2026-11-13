#!/usr/bin/env node
/**
 * 突變測試：證明兩支 `--teeth` 閘門本身有牙（2026-11-14 使用者裁定入庫）。
 *
 * 點解要呢支：`audit:map --teeth` 與 `audit:chars --teeth` 都係「注入壞樣本 → 必須報紅」，
 * 但判斷用嘅係**同一支閘門**。所以一旦有人把規則改弱——正則收細、豁免放大、字表抽走一個字、
 * 註冊表來源檔名打錯——teeth 會跟住變橡皮章而照樣全綠（本專案已記過五次同一根因）。
 * 唯一嘅證法係主動破壞規則本身，睇 teeth 會唔會叫。
 *
 * 安全設計（硬性要求）：**永遠唔改 tracked 檔**。所有突變都發生喺 mkdtemp 嘅副本上，
 * 跑完再用 `git status --porcelain` 前後對照，repo 一旦有變化就當本次失敗。
 *   （教訓：之前 temp 目錄嗰支 python 版係直接改 scripts/audit_map_accuracy.mjs，
 *     中途斷喺會留低半改狀態；teeth_chars.py 更係喺 src/ 落盤注入檔，會被 `git add -A` 誤收。）
 *
 * 用法：npm run audit:teeth-mutations            （兩組都跑）
 *       npm run audit:teeth-mutations -- --only=map|chars
 *
 * 口徑：末行 `audit:teeth-mutations — 失敗 N 項` 係 scripts/gate-ci.mjs 抓嘅指標，改格式要一起改。
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'

const ROOT = process.cwd()
const argv = process.argv.slice(2)
const ONLY = (argv.find((a) => a.startsWith('--only=')) ?? `--only=all`).slice('--only='.length)

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')
const write = (abs, text) => {
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, text, 'utf8')
}

/**
 * 突變一律用「檔內唯一字串」做錨點。錨點不再唯一（通常是 0 次＝規則被人改寫走咗）
 * 一律算失敗，唔可以靜靜跳過——跳過就係假綠。
 */
function mutate(src, m) {
  if (m.re) {
    const [body, flags = ''] = m.re
    const all = new RegExp(body, flags.includes('g') ? flags : `${flags}g`)
    const n = [...src.matchAll(all)].length
    if (n !== 1) return { text: src, err: `錨點出現 ${n} 次：${m.name}` }
    return { text: src.replace(new RegExp(body, flags), () => m.to), err: null }
  }
  const n = src.split(m.find).length - 1
  if (n !== 1) return { text: src, err: `錨點出現 ${n} 次：${m.name}` }
  return { text: src.replace(m.find, () => m.to), err: null }
}

/** 用閘門自己嗰行指標（同 gate-ci 一樣嘅口徑）；解析唔到一律當 -1（工具壞，唔算咬到）。 */
function failsOf(out, metric) {
  const m = out.match(metric)
  return m ? Number(m[1]) : -1
}

function gitStatus() {
  const r = spawnSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' })
  return (r.stdout || '').trim()
}

const SUITES = [
  {
    name: 'map',
    gate: 'audit:map --teeth',
    min: 18,
    metric: /失敗 (\d+) 項/,
    /** 副本唔需要任何 repo 檔：註冊表一律由 cwd（=repo 根）讀，故 spawn 時 cwd 要係 repo。 */
    stage(dir) {
      const file = join(dir, 'map', 'audit_map_accuracy.mjs')
      write(file, read('scripts/audit_map_accuracy.mjs'))
      return { file, spawn: (f) => spawnSync(process.execPath, [f, '--teeth'], { cwd: ROOT, encoding: 'utf8' }) }
    },
    mutations: [
      { name: 'ID_Q 淨單引號（產生器嘅雙引號 id 又出局）', re: [/^const ID_Q = .*$/, 'm'],
        to: String.raw`const ID_Q = /\bid:\s*'([\p{Script=Han}\w-]+)'/gu` },
      { name: 'ID_Q 淨 ASCII（中文 id 成批失明）', re: [/^const ID_Q = .*$/, 'm'],
        to: String.raw`const ID_Q = /\bid:\s*['"]([\w-]+)['"]/g` },
      { name: '唔解析識別碼引用（territoryByYear: CONTROL）',
        find: "const body = m[2] === '{' ? blockBody(t, m.index + m[0].length - 1) : namedObjectBody(t, m[2])",
        to: "const body = m[2] === '{' ? blockBody(t, m.index + m[0].length - 1) : ''" },
      { name: '唔認常數值（im_x: F.jp 呢類）', find: String.raw`(?:'[^']*'|"[^"]*"|[A-Za-z_$][\w$.]*)`,
        to: String.raw`(?:['"]([\w-]+)['"]|[A-Za-z_$][\w$.]*)` },
      { name: '抽走 territory-id-off-canvas 規則',
        find: 'const offCanvas = [...keys].filter((id) => !warGeoIds.has(id) && !localIds.has(id))',
        to: 'const offCanvas = []' },
      { name: 'WAR_THEATRE 收窄（朝鮮之役出局）',
        find: String.raw`/^src\/japanEras\/packs\/(modernJapanPack|imjinWar)\.ts$/`,
        to: String.raw`/^src\/japanEras\/packs\/(modernJapanPack)\.ts$/` },
      { name: 'WAR_THEATRE 放寬（越界食其他 pack）',
        find: String.raw`/^src\/japanEras\/packs\/(modernJapanPack|imjinWar)\.ts$/`,
        to: String.raw`/^src\/japanEras\/packs\/[\w-]+\.ts$/` },
      { name: '抽走 NON_DOMAIN_KEYS 跳過表（metadata 鍵變誤判）',
        find: 'if (NON_DOMAIN_KEYS.has(m[1])) continue', to: 'void 0' },
      { name: '環檔正則唔認引號鍵（japanEraRings 失明）',
        find: String.raw`addFrom('src/geo/japanEraRings.ts', /"([a-z_0-9]+)"\s*:\s*\[/g)`,
        to: String.raw`addFrom('src/geo/japanEraRings.ts', /\b([a-z_0-9]+):\s*\[/g)` },
      { name: 'd0–d27 來源換返 jpDomains（佢只係 id: d.id）',
        find: "addFrom('src/sengoku/data/tracedDomains.ts', ID_Q)",
        to: "addFrom('src/japanEras/jpDomains.ts', ID_Q)" },
      { name: '註冊表來源檔名打錯（安靜少一批 id）',
        find: "addFrom('src/geo/imjinTerritory.ts', ID_Q, warGeoIds)",
        to: "addFrom('src/geo/imjinTerritoryy.ts', ID_Q, warGeoIds)" },
      { name: '掃描 root 收細（大部分 pack 喺閘門外）',
        find: "const files = walk(join(SCAN_ROOT, 'src'))",
        to: "const files = walk(join(SCAN_ROOT, 'src/japanEras'))" },
      { name: 'localIds 收返寬鬆（事件／路線／勢力 id 撞名即假綠）',
        find: 'const localIds = localDomainIds(t)',
        to: String.raw`const localIds = new Set([...t.matchAll(/\bid:\s*['"]([\w-]{2,40})['"]/g)].map((m) => m[1]))` },
      { name: "controlKeys 冇 u flag（\\p{Script=Han} 變普通字元集）", find: `'gu',`, to: `'g',` },
      { name: 'provinces 由註冊表消失（中文 id 嗰批）',
        find: "addFrom('src/data/provinces.ts', ID_Q)", to: '// 突變：provinces 唔再入表' },
      { name: '抽走註冊表探針 幽州（默默減少探針）',
        find: "    幽州: 'provinces.ts（中國州郡，id 係 CJK）',", to: '' },
      { name: 'localDomainIds 永遠返空（假紅方向：誤殺真 pack）',
        find: 'function localDomainIds(text) {', to: 'function localDomainIds(text) {\n  if (text) return new Set()' },
      { name: 'localDomainIds 唔再睇幾何（變返寬鬆）',
        find: 'text.slice(open, m.index).matchAll(', to: 'text.matchAll(' },
    ],
  },
  {
    name: 'chars',
    gate: 'audit:chars --teeth',
    min: 7,
    metric: /失敗 (\d+) 項/,
    /** 副本要喺 `<tmp>/chars/` 重鋪成縮小版 repo：佢會 own import.meta.dirname 去搵
     *  `./lib/gate-baseline.ts` 與 `../reports/chars-allowlist.json`；缺一個就係假紅。 */
    stage(dir) {
      const base = join(dir, 'chars')
      const file = join(base, 'scripts', 'audit-chars.ts')
      write(file, read('scripts/audit-chars.ts'))
      write(join(base, 'scripts', 'lib', 'gate-baseline.ts'), read('scripts/lib/gate-baseline.ts'))
      write(join(base, 'reports', 'chars-allowlist.json'), read('reports/chars-allowlist.json'))
      return {
        file,
        spawn: (f) =>
          spawnSync(process.execPath, ['--experimental-strip-types', f, '--teeth'], { cwd: ROOT, encoding: 'utf8' }),
      }
    },
    mutations: [
      { name: 'maskNearKana 半徑放寬（等於返轉頭整行跳過）',
        find: 'kana.some((k) => Math.abs(k - i) < 4)', to: 'kana.some((k) => Math.abs(k - i) < 400)' },
      { name: 'maskNearKana 完全唔遮蔽（日文原字全部變錯字）',
        find: 'kana.some((k) => Math.abs(k - i) < 4)', to: 'false' },
      // 要引用閘門嘅目標錯字，一律用 \uXXXX 轉義，唔准為新檔開「按檔名豁免」——
      // 豁免範圍太大就等於失明（audit:chars 嘅五次根因）。U+5BF9 對、U+6238 日式新字。
      { name: 'HARD 抽走最常見簡體字 U+5BF9（字表覆蓋率退化）', find: "\u5bf9: '對', ", to: '' },
      { name: 'HARD 抽走日本新字 U+6238', find: "\u6238: '戶', ", to: '' },
      { name: '粵語豁免過寬（isAgentWorkspace 恒真 → 網站文字都放行）',
        find: 'function isAgentWorkspace(p: string): boolean {',
        to: 'function isAgentWorkspace(p: string): boolean {\n  return true // 突變' },
      { name: '粵語豁免過窄（恒假 → docs/scripts 一夜變紅）',
        find: 'function isAgentWorkspace(p: string): boolean {',
        to: 'function isAgentWorkspace(p: string): boolean {\n  return false // 突變' },
      { name: '預設掃描根目錄失去 docs（整輪正體化喺閘門外）',
        find: "const roots = positional.length ? positional : ['src', 'scripts', 'docs']",
        to: "const roots = positional.length ? positional : ['src', 'scripts']" },
    ],
  },
]

const dir = mkdtempSync(join(tmpdir(), 'teeth-mut-'))
let bad = 0
let ran = 0
const before = gitStatus()

try {
  for (const suite of SUITES) {
    if (ONLY !== 'all' && ONLY !== suite.name) continue
    const { file, spawn } = suite.stage(dir)
    const src = readFileSync(file, 'utf8')

    const run = (f) => {
      const r = spawn(f)
      return failsOf((r.stdout || '') + (r.stderr || ''), suite.metric)
    }
    // 控制項：未突變嘅副本必須全綠。冇呢一步，「每項突變都報紅」可能只係因為
    // 副本根本跑唔起（例如少咗一個 import 檔）——嗰種「全紅」一樣係假綠。
    const base = run(file)
    if (base !== 0) {
      bad += 1
      console.log(`  ✗ ${suite.name}：未突變嘅副本已經報 ${base}（harness 或者副本佈局壞咗）`)
      continue
    }
    console.log(`\n── ${suite.name}（副本 ${file.replace(join(dir, '/'), '<tmp>/')}）── 基準 0 項`)

    if (suite.mutations.length < suite.min) {
      bad += 1
      console.log(`  ✗ 突變淨得 ${suite.mutations.length} 項（斷言 >= ${suite.min}）：抽走突變等於抽走牙`)
    }
    for (const m of suite.mutations) {
      const { text, err } = mutate(src, m)
      if (err) {
        bad += 1
        ran += 1
        console.log(`  ✗ ${m.name}：${err}（規則被改寫走，突變跟住失效——請同步更新本 harness）`)
        continue
      }
      write(file, text)
      const n = run(file)
      ran += 1
      if (n <= 0) {
        bad += 1
        console.log(`  ✗ 假綠：${m.name} → teeth 只有 ${n} 項（規則壞到呢個地步都冇人叫）`)
      } else {
        console.log(`  ✓ ${m.name} → teeth 報 ${n} 項`)
      }
      write(file, src)
    }
  }

  const after = gitStatus()
  if (after !== before) {
    bad += 1
    console.log(`\n  ✗ harness 喺 repo 落咗盤（本支腳本硬性禁止改 tracked 檔）：\n${after}`)
  }
} finally {
  rmSync(dir, { recursive: true, force: true })
}

console.log(`\naudit:teeth-mutations — 失敗 ${bad} 項（突變 ${ran} 項）`)
console.log(bad ? '✗ 有突變冇被 teeth 咬到：閘門嘅牙唔完整' : '✓ 每一項突變都會被 teeth 咬到，副本零落盤')
process.exit(bad ? 1 : 0)
