#!/usr/bin/env node
/**
 * exa.mjs — Exa 語意搜尋的本機入口（內容研究用）。
 *
 * 為什麼要有這個腳本，而不是在 src/ 裡直接呼叫：
 * 本專案是純靜態 SPA，任何 import.meta.env.VITE_* 都會被打進公開的
 * JS bundle，等於把金鑰公開。因此金鑰只從 process.env / .env 讀取，
 * 且本腳本位於 scripts/，絕不被打包。
 *
 * 用法：
 *   node scripts/exa.mjs search "日本書紀 應神紀 百濟" [--num 5] [--text]
 *   node scripts/exa.mjs search "關原之戰 石田三成 兵力" --category "research paper"
 *   node scripts/exa.mjs contents <resultId> [<id2> ...]
 *   node scripts/exa.mjs similar <url>
 *   加 --json 輸出原始 JSON；--max-chars N 限制每頁正文長度（預設 1200）
 *
 * 注意：本腳本任何情況下都不印出金鑰。
 */

import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

const API = 'https://api.exa.ai'

/** 只用於除錯顯示：exa-sk_live_abc… → exa-sk_l…（長短洩漏同樣是洩漏） */
function mask(key) {
  return key.slice(0, 6) + '…（長度 ' + key.length + '）'
}

function loadKey() {
  if (process.env.EXA_API_KEY) return { key: process.env.EXA_API_KEY, from: 'process.env' }
  // 退回讀 repo 根的 .env（不引入 dotenv 依賴）
  const envPath = resolve(import.meta.dirname, '..', '.env')
  try {
    const raw = readFileSync(envPath, 'utf8')
    for (const line of raw.split('\n')) {
      const m = /^\s*(?:export\s+)?EXA_API_KEY\s*=\s*(.+?)\s*$/.exec(line)
      if (m) return { key: m[1].replace(/^["']|["']$/g, ''), from: '.env' }
    }
  } catch {
    /* .env 不存在 */
  }
  // 2026-11-11 第三層：使用者層金鑰檔。實測教訓：排程 agent 全部喺自己嘅
  // git worktree 工作，而 .env 係 gitignore 嘅本檔——worktree 永遠冇，
  // 所以「many occasions that the exa search cannot be done」。
  // ~/.exa_api_key（單一行、chmod 600）係絕對路徑，任何 worktree 都讀到。
  try {
    const home = readFileSync(join(homedir(), '.exa_api_key'), 'utf8').trim()
    if (home) return { key: home, from: '~/.exa_api_key' }
  } catch {
    /* 未配置 */
  }
  return null
}

function parseArgs(argv) {
  const args = { _: [], num: 5, maxChars: 1200, text: false, json: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--num') args.num = Number(argv[++i])
    else if (a === '--max-chars') args.maxChars = Number(argv[++i])
    else if (a === '--category') args.category = argv[++i]
    else if (a === '--domain') args.domain = argv[++i]
    else if (a === '--text') args.text = true
    else if (a === '--json') args.json = true
    else args._.push(a)
  }
  return args
}

async function call(path, key, body) {
  const res = await fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) {
    // 只回傳服务端訊息與狀態碼；不重複送 request 內容以免金鑰外流
    throw new Error(`${path} → HTTP ${res.status}：${text.slice(0, 400)}`)
  }
  return JSON.parse(text)
}

function clip(s, n) {
  if (!s) return ''
  const t = s.replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n) + '…' : t
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2)
  const args = parseArgs(rest)
  const found = loadKey()
  if (!found) {
    console.error(
      '找不到 EXA_API_KEY。\n' +
        '做法（三選一）：(1) 寫入 ~/.exa_api_key（單一行金鑰，chmod 600，任何 worktree 都讀到，排程 agent 請用呢個）；' +
        '(2) repo 根 .env（已被 .gitignore 排除）：EXA_API_KEY=你的金鑰；' +
        '(3) 暫用：EXA_API_KEY=… node scripts/exa.mjs search "…"\n' +
        '切勿使用 VITE_ 前綴——那會把金鑰打进公開 bundle。',
    )
    process.exit(2)
  }
  const { key, from } = found

  if (cmd === 'search') {
    const query = args._.join(' ')
    if (!query) throw new Error('search 需要查詢字串')
    const body = { query, numResults: args.num, type: 'auto' }
    if (args.category) body.category = args.category
    if (args.text) body.text = { maxCharacters: args.maxChars }
    const data = await call('/search', key, body)
    if (args.json) return console.log(JSON.stringify(data, null, 2))
    const hits = data.results ?? []
    console.log(`Exa search：${query}（金鑰來源 ${from}，${mask(key)}）`)
    hits.forEach((r, i) => {
      console.log(`\n[${i + 1}] ${r.title ?? '(無標題)'}\n    ${r.url}`)
      if (r.publishedDate) console.log(`    日期 ${r.publishedDate}`)
      if (r.text) console.log(`    ${clip(r.text, args.maxChars)}`)
    })
    if (!hits.length) console.log('（無結果）')
    return
  }

  if (cmd === 'contents') {
    if (!args._.length) throw new Error('contents 需要至少一個 id')
    const data = await call('/contents', key, {
      ids: args._,
      text: true,
      maxCharacters: args.maxChars,
    })
    if (args.json) return console.log(JSON.stringify(data, null, 2))
    for (const r of data.results ?? []) {
      console.log(`\n### ${r.title ?? r.id}\n${r.url}\n${clip(r.text, args.maxChars)}`)
    }
    return
  }

  if (cmd === 'similar') {
    const url = args._[0]
    if (!url) throw new Error('similar 需要一個 URL')
    const data = await call('/findSimilar', key, { url, numResults: args.num })
    if (args.json) return console.log(JSON.stringify(data, null, 2))
    for (const r of data.results ?? []) console.log(`- ${r.title ?? ''}\n  ${r.url}`)
    return
  }

  console.error('指令未認識。可用：search / contents / similar')
  process.exit(2)
}

main().catch((e) => {
  console.error('exa 失敗：' + e.message)
  process.exit(1)
})
