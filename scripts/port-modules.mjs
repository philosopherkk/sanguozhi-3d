#!/usr/bin/env node
// port-modules.mjs — 由 other 工作線補入 base 缺失的模組（additive closure），
// 每次跑 tsc，遇到 TS2307「Cannot find module」就去 other 搵同名檔复制過來，重複至收斂。
// 用法：node scripts/port-modules.mjs --other <C根目錄> [--max 8]
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, copyFileSync, readFileSync, statSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'

const A = process.argv
const f = (n) => { const i = A.indexOf(n); return i >= 0 ? A[i + 1] : null }
const OTHER = f('--other')
const MAX = Number(f('--max') || 8)
if (!OTHER) { console.error('需要 --other <dir>'); process.exit(2) }

function tscErrors() {
  try {
    execSync('npx tsc -b --pretty false', { stdio: 'pipe' })
    return []
  } catch (e) {
    const out = (e.stdout ? e.stdout.toString() : '') + (e.stderr ? e.stderr.toString() : '')
    return out.split('\n').filter((l) => /error TS/.test(l))
  }
}

const copied = []
for (let round = 1; round <= MAX; round++) {
  const errs = tscErrors()
  if (!errs.length) { console.log(`第 ${round} 輪：tsc 無錯誤`); break }
  const missing = new Set()
  for (const line of errs) {
    const m = line.match(/^(.+?)\(\d+,\d+\): error TS2307: Cannot find module '([^']+)'/)
    if (m) missing.add(`${m[1]}|${m[2]}`)
  }
  if (!missing.size) {
    console.log(`第 ${round} 輪：無缺失模組；剩 ${errs.length} 個錯誤（非模組類）`)
    console.log(errs.slice(0, 12).join('\n'))
    break
  }
  let added = 0
  for (const key of missing) {
    const [fromFile, spec] = key.split('|')
    const baseDir = dirname(resolve(fromFile))
    const rel = spec.startsWith('.') ? baseDir : resolve(OTHER, 'src')
    const target0 = resolve(rel, spec.replace(/^\.\//, ''))
    for (const cand of [`${target0}.ts`, `${target0}.tsx`, `${target0}/index.ts`, `${target0}/index.tsx`]) {
      const src = cand.startsWith(OTHER) ? cand : relativeFromBase(cand)
      if (!existsSync(src) || !statSync(src).isFile()) continue
      const dest = src.replace(join(OTHER, 'src'), join('.', 'src'))
      if (existsSync(dest)) continue
      mkdirSync(dirname(dest), { recursive: true })
      copyFileSync(src, dest)
      copied.push(`${spec} → ${dest}`)
      added++
      break
    }
  }
  console.log(`第 ${round} 輪：缺失 ${missing.size}，補入 ${added}`)
  if (!added) { console.log('無法自動補入，停止。缺：\n' + [...missing].slice(0, 10).join('\n')); break }
}

function relativeFromBase(absPath) {
  // 將 base 內的 import 目標對應返 other 树內的同名相對路徑
  const baseSrc = resolve('.', 'src')
  const rel = absPath.startsWith(baseSrc) ? absPath.slice(baseSrc.length) : absPath
  return join(OTHER, 'src', rel)
}

console.log('\n補入清單：')
console.log(copied.length ? copied.join('\n') : '（無）')
