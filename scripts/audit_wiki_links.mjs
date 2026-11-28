#!/usr/bin/env node
/**
 * audit_wiki_links.mjs — 維基連結存在性閘門。
 *
 * 為什麼要新增（2026-11-09 覆核 PR #95 時發現）：
 * `https://zh.wikipedia.org/zh-tw/<標題>` 對**不存在**的條目同樣回 HTTP 200
 * （落到「創建該條目」頁），所以「HTTP 狀態碼是 200 就當連結有效」係錯誤方法。
 * 實例：「大內政弘」「種子島時堯」以原樣標題在 zh／ja 皆無條目，卻全部「200 通過」。
 *
 * 正確方法：MediaWiki API `action=query&format=json&redirects=1&titles=A|B|C`，
 * 只有回應中明確帶 `missing` 的才算無條目。注意兩個陷阱：
 *  1) zh API 會把回應標題做簡繁轉換（`劉備`→`刘备`），因此只能用「有冇 missing」
 *     判斷，不可把請求字面與回應標題做字面比對；
 *  2) API 會把標題中的底線正規化成空格，比對前兩側都要統一成底線形式。
 * 傳輸層用 curl（實測 node 原生 fetch 的 UA 會被 Wikimedia 擋）。
 *
 * 用法：
 *   node scripts/audit_wiki_links.mjs            # 掃描並匯報
 *   node scripts/audit_wiki_links.mjs --fail-on-gap
 *   node scripts/audit_wiki_links.mjs --selftest # 確認閘門有牙
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const UA = 'sanguozhi3d-wiki-link-audit/1.0 (repo CI)'

/** 傳輸層：用 curl（node 原生 fetch 的 UA 實測會被 Wikimedia 擋）。抽出來先可以喺 selftest 注入失敗。 */
function curlFetch(api) {
  return execFileSync('curl', ['-s', '--max-time', '25', '-A', UA, api], {
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  })
}

function defaultNap(seconds) {
  try { execFileSync('sleep', [String(seconds)]) } catch { /* 忽略 */ }
}

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    if (f === 'node_modules' || f === 'dist' || f === '.git' || f === 'vendor') continue
    const p = join(dir, f)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(ts|tsx|json)$/.test(p)) out.push(p)
  }
  return out
}

/** 抽出所有維基連結 → { host, title, file }；動態拼接的模板跳過 */
export function collectLinks(files) {
  const links = []
  for (const p of files) {
    const s = readFileSync(p, 'utf8')
    for (const m of s.matchAll(
      /https?:\/\/((?:zh|ja)\.wikipedia\.org)\/(?:(?:wiki|zh-(?:tw|cn|hant|us)|ja-jp)\/)+([^\s'"`\\<>\u3001、」]+)/g,
    )) {
      let title = m[2]
      try { title = decodeURIComponent(title) } catch { /* 保持原樣 */ }
      if (!title || title === 'wiki') continue
      // 以模板動態拼接的 URL（fetchArticle 等）無法靜態驗證，跳過
      if (title.includes('${') || title.includes('encodeURIComponent')) continue
      links.push({ host: m[1], title, file: p.slice(ROOT.length + 1) })
    }
    // 盲點修正（2026-11-09）：packs 多用 helper 構造 URL（WIKI('x')→zh、
    // WIKI_JA('x')→ja），只掃 raw URL 會漏死鏈（edoPack「鎖國令」漏網實證）。
    for (const m of s.matchAll(/\bWIKI_JA\(\s*'([^']+)'/g)) {
      links.push({ host: 'ja.wikipedia.org', title: m[1], file: p.slice(ROOT.length + 1) })
    }
    for (const m of s.matchAll(/\bWIKI\(\s*'([^']+)'/g)) {
      links.push({ host: 'zh.wikipedia.org', title: m[1], file: p.slice(ROOT.length + 1) })
    }
  }
  const seen = new Map()
  for (const l of links) {
    const k = l.host + ' ' + l.title
    if (!seen.has(k)) seen.set(k, l)
  }
  return [...seen.values()]
}

/**
 * 一組標題問一次 API；連輸三次就**二分重試**，只有細到單一標題仍失敗才回 null。
 *
 * 為什麼要拆：CI 實測（PR #221，2026-11-28）整批 32 條因限速／逾時失敗，
 * 直接把 32 條全計為未驗 → `audit:wiki-links.unvalidated 0 → 32` 假紅，
 * 拖住一個同 wikilink 完全無關的 PR。限速通常是短促的，拆細重試就能補回來；
 * 真死鏈不受影響（拆細後 API 正常回應、仍會回 `missing`）。
 */
function resolveChunk(host, titles, fetchImpl, nap = defaultNap) {
  let last = ''
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const api = `https://${host}/w/api.php?action=query&format=json&redirects=1&titles=` +
        encodeURIComponent(titles.join('|'))
      return JSON.parse(fetchImpl(api))
    } catch (e) {
      last = String(e instanceof Error ? e.message : e).slice(0, 70)
      nap(2 + attempt * 4)
    }
  }
  if (titles.length === 1) {
    console.log(`  ! ${host} 單條「${titles[0]}」三次仍失敗：${last}`)
    return null
  }
  const mid = Math.ceil(titles.length / 2)
  console.log(`  · ${host} 批次 ${titles.length} 條失敗，改二分重試（${last}）`)
  const left = resolveChunk(host, titles.slice(0, mid), fetchImpl, nap)
  const right = resolveChunk(host, titles.slice(mid), fetchImpl, nap)
  if (!left || !right) return null
  return {
    query: {
      pages: { ...(left.query?.pages ?? {}), ...(right.query?.pages ?? {}) },
      normalized: [...(left.query?.normalized ?? []), ...(right.query?.normalized ?? [])],
      redirects: [...(left.query?.redirects ?? []), ...(right.query?.redirects ?? [])],
    },
  }
}

/** 批量查存在性；回傳 { dead, unvalidated }。網路失敗保守計為未驗，唔當死鏈。 */
export function findDead(links, fetchImpl = curlFetch, nap = defaultNap) {
  const dead = []
  let unvalidated = 0
  const byHost = {}
  for (const l of links) (byHost[l.host] ||= []).push(l)
  for (const [host, list] of Object.entries(byHost)) {
    for (let i = 0; i < list.length; i += 50) {
      const chunk = list.slice(i, i + 50)
      // 短暫停之後先做較長退避：實測連續全量掃描會觸發 Wikimedia 限速，
      // 重試不夠就會 unvalidated 飆升、gates 變紅（寧可紅不可假綠，但紅要係真問題）
      nap(1.5)
      const data = resolveChunk(host, chunk.map((l) => l.title), fetchImpl, nap)
      if (!data) {
        console.log(`  ! ${host} 批次 ${Math.floor(i / 50) + 1} 拆到單條仍失敗（${chunk.length} 條計為未驗）`)
        unvalidated += chunk.length
        continue
      }
      const pages = data?.query?.pages ?? {}
      // 只有明確 missing 的才判死；兩側標題統一轉底線形式（API 會把 _ 正規化成空格）
      const missingTitles = new Set()
      for (const node of Object.values(pages)) {
        if ('missing' in node) missingTitles.add(node.title.replace(/ /g, '_'))
      }
      for (const n of data?.query?.normalized ?? []) {
        if (missingTitles.has(n.from.replace(/ /g, '_'))) missingTitles.add(n.to.replace(/ /g, '_'))
      }
      for (const l of chunk) {
        if (missingTitles.has(l.title.replace(/ /g, '_'))) dead.push(l)
      }
      nap(1.2)
    }
  }
  return { dead, unvalidated }
}

function main() {
  const argv = process.argv.slice(2)

  if (argv.includes('--selftest')) {
    const mk = (host, title) => ({ host, title, file: 'selftest' })
    let bad = 0
    const chk = (name, cond) => { console.log(`  ${cond ? '✓' : '✗'} ${name}`); if (!cond) bad++ }

    // 先做離線模擬（唔使網絡）：證明「限速時會拆細重試」呢條邏輯真有牙。
    // 假裝 Wikimedia 只對多標題請求限速：`titles` 有幾條就唔郁，單條先回資料。
    const offline = [
      mk('zh.wikipedia.org', '織田信長'),
      mk('zh.wikipedia.org', '此條目必定唔存在_xxx_9f3a'),
      mk('zh.wikipedia.org', '足利義政'),
      mk('zh.wikipedia.org', '大內政弘'),
    ]
    const fakeFetch = (api) => {
      const titles = decodeURIComponent(api.slice(api.indexOf('titles=') + 7)).split('|')
      if (titles.length > 1) throw new Error('模擬限速：多標題請求俾人拒')
      const pages = {}
      for (const title of titles) {
        // 用標題雜湖做 pageid，令每次呼叫嘅 key 唔會撞（真 API 都係唯一 id；
        // 若用序號，拆細重試後合併會靜靜覆蓋，測試就假綠）
        const pageid = String([...title].reduce((a, c) => a + c.charCodeAt(0), 0))
        pages[pageid] = title.includes('唔存在') || title === '大內政弘'
          ? { title, missing: '' }
          : { title, pageid: 1 }
      }
      return JSON.stringify({ query: { pages } })
    }
    const noNap = () => {}
    const sim = findDead(offline, fakeFetch, noNap)
    chk('限速拆細後無一條被當未驗（四條全部補回）', sim.unvalidated === 0)
    chk('限速拆細後真死鏈照樣偵測到',
      sim.dead.length === 2 &&
      sim.dead.every((d) => d.title === '此條目必定唔存在_xxx_9f3a' || d.title === '大內政弘'))
    // 真·斷網（連單條都失敗）must 仍保守計為未驗，唔好扮綠
    const allFail = findDead(offline, () => { throw new Error('模擬斷網') }, noNap)
    chk('全部失敗時要保守計為未驗（4 條），唔准當通過', allFail.unvalidated === 4)

    const probe = [
      mk('zh.wikipedia.org', '織田信長'),
      mk('zh.wikipedia.org', '此條目必定唔存在_xxx_9f3a'),
      mk('ja.wikipedia.org', '足利義政'),
      mk('ja.wikipedia.org', '某假條目名_xxx_7c2b'),
      mk('zh.wikipedia.org', '大內政弘'), // PR #95 漏網實例：原樣標題無條目
    ]
    const { dead } = findDead(probe)
    const deadTitles = new Set(dead.map((d) => d.title))
    chk('存在的條目不誤報（織田信長／足利義政）', !deadTitles.has('織田信長') && !deadTitles.has('足利義政'))
    chk('不存在的假條目要有牙', deadTitles.has('此條目必定唔存在_xxx_9f3a') && deadTitles.has('某假條目名_xxx_7c2b'))
    chk('PR #95 漏網實例「大內政弘」要被偵測', deadTitles.has('大內政弘'))
    console.log(bad ? `✗ selftest ${bad} 項失敗` : '✓ 存在性偵測有牙')
    process.exit(bad ? 1 : 0)
  }

  const files = walk(join(ROOT, 'src'))
  const links = collectLinks(files)
  console.log('=== 維基連結存在性（API 判定，不靠 HTTP 狀態碼）===')
  console.log(`  檔案 ${files.length}｜去重後連結 ${links.length} 條`)
  const { dead, unvalidated } = findDead(links)
  if (unvalidated > 0) {
    console.log(`  ⚠ 本輪只有 ${links.length - unvalidated} 條完成驗證，${unvalidated} 條因網路／限流未驗——死鏈數字不完整，不可當通過`)
  }
  console.log(`  死鏈（API 確認無條目）${dead.length} 條`)
  for (const d of dead.slice(0, 30)) console.log(`    ✗ ${d.host}/wiki/${d.title}  ← ${d.file}`)
  console.log(`\naudit:wiki-links — 連結 ${links.length}｜死鏈 ${dead.length}｜未驗 ${unvalidated}`)
  if (argv.includes('--fail-on-gap') && dead.length > 0) process.exit(1)
}

if (process.argv[1] && process.argv[1].endsWith('audit_wiki_links.mjs')) main()
