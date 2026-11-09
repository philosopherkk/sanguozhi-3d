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
 *  1) zh API 會把回應標題做簡繁轉換（劉備→刘备），因此只能用「有冇 missing」
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

/** 批量查存在性；回傳 { dead, unvalidated }。網路失敗保守計為未驗，唔當死鏈。 */
export function findDead(links) {
  const dead = []
  let unvalidated = 0
  const byHost = {}
  for (const l of links) (byHost[l.host] ||= []).push(l)
  for (const [host, list] of Object.entries(byHost)) {
    for (let i = 0; i < list.length; i += 50) {
      const chunk = list.slice(i, i + 50)
      const api = `https://${host}/w/api.php?action=query&format=json&redirects=1&titles=` +
        encodeURIComponent(chunk.map((l) => l.title).join('|'))
      let data
      let lastSnippet = ''
      // 短暫停之後先做較長退避：實測連續全量掃描會觸發 Wikimedia 限速，
      // 重試不夠就會 unvalidated 飆升、gates 變紅（寧可紅不可假綠，但紅要係真問題）
      try { execFileSync('sleep', ['1.5']) } catch { /* 忽略 */ }
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const out = execFileSync('curl', ['-s', '--max-time', '25', '-A', UA, api],
            { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 })
          data = JSON.parse(out)
          break
        } catch (e) {
          lastSnippet = String(e instanceof Error ? (e.stdout ?? e.message) : e).slice(0, 70)
          try { execFileSync('sleep', [String(3 + attempt * 5)]) } catch { /* 忽略 */ }
          data = undefined
        }
      }
      if (!data) {
        console.log(`  ! ${host} 批次 ${Math.floor(i / 50) + 1} 重試 4 次仍失敗（${chunk.length} 條計為未驗）：${lastSnippet}`)
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
      execFileSync('sleep', ['1.2'])
    }
  }
  return { dead, unvalidated }
}

function main() {
  const argv = process.argv.slice(2)

  if (argv.includes('--selftest')) {
    const mk = (host, title) => ({ host, title, file: 'selftest' })
    const probe = [
      mk('zh.wikipedia.org', '織田信長'),
      mk('zh.wikipedia.org', '此條目必定唔存在_xxx_9f3a'),
      mk('ja.wikipedia.org', '足利義政'),
      mk('ja.wikipedia.org', '某假條目名_xxx_7c2b'),
      mk('zh.wikipedia.org', '大內政弘'), // PR #95 漏網實例：原樣標題無條目
    ]
    const { dead } = findDead(probe)
    const deadTitles = new Set(dead.map((d) => d.title))
    let bad = 0
    const chk = (name, cond) => { console.log(`  ${cond ? '✓' : '✗'} ${name}`); if (!cond) bad++ }
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
