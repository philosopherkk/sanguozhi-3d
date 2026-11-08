#!/usr/bin/env node
/**
 * check_bundle_secrets.mjs — 確認打包產物不含金鑰。
 *
 * 存在理由：本專案是純靜態 SPA。只要有人寫 import.meta.env.VITE_ANY_KEY，
 * Vite 就會把值常駐进 dist 的 JS，等於公開洩漏；.gitignore 擋不住這種
 * 「已建置進產物」的洩漏，因此需要針對 dist 的檢查。
 *
 * 跑法：npm run build && node scripts/check_bundle_secrets.mjs
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'

const DIST = join(import.meta.dirname, '..', 'dist')

/** 各家服務常見的密鑰外形。宁可多報（誤報可由人確認後收緊），不可漏報。 */
const PATTERNS = [
  { name: 'Exa 金鑰', re: /\bexa-[A-Za-z0-9_-]{16,}/g },
  { name: 'OpenAI 金鑰', re: /\bsk-[A-Za-z0-9_-]{20,}/g },
  { name: 'AWS Access Key ID', re: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: 'GitHub token', re: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g },
  { name: 'Google API key', re: /\bAIza[0-9A-Za-z_-]{30,}\b/g },
  { name: 'PEM 私鑰', re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { name: 'VITE_ 命名的 key/secret/token', re: /\bVITE_[A-Z0-9_]*(?:KEY|SECRET|TOKEN)[A-Z0-9_]*\b/g },
]

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (['.js', '.mjs', '.css', '.html', '.json'].includes(extname(p))) out.push(p)
  }
  return out
}

if (!existsSync(DIST)) {
  console.error('找不到 dist/——請先 npm run build 再檢查。')
  process.exit(1)
}

const files = walk(DIST)
const hits = []
for (const f of files) {
  const text = readFileSync(f, 'utf8')
  for (const { name, re } of PATTERNS) {
    const m = text.match(re)
    if (m) hits.push({ file: f.replace(DIST + '/', 'dist/'), name, sample: m[0].slice(0, 12) + '…' })
  }
}

if (hits.length) {
  console.error('✗ 打包產物發現疑似金鑰（這會公開洩漏，必須立刻撤銷該金鑰）：')
  for (const h of hits) console.error(`  ${h.file}  ${h.name}  ${h.sample}`)
  process.exit(1)
}
console.log(`✓ check:bundle-secrets — 掃描 ${files.length} 個產物檔，未發現金鑰外形`)
