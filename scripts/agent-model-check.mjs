#!/usr/bin/env node
/**
 * agent-model-check.mjs — 驗證本 worktree 的模型鎖定檔內容與權威 registry 一致。
 *
 * 舊手冊只跑 `test -f .opencode/opencode.json`，檔案存在就過；就算鎖被換成雲端模型
 * 也照樣印 MODEL_LOCK_OK。這支改為比對內容，模型切換時不用改手冊。
 *
 * 用法（在 agent worktree 內）：node scripts/agent-model-check.mjs
 * 結束碼：0＝一致；1＝不一致或讀不到。
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

const REG = '/Library/Application Support/historyfirst/schedule-registry.json'
const FALLBACK = join(
  homedir(), 'Documents', 'my-project', '.agent-runtime', 'v2', 'schedule-registry.json',
)
let expected = ''
for (const p of [REG, FALLBACK]) {
  try {
    expected = JSON.parse(readFileSync(p, 'utf8')).model
    if (expected) break
  } catch {
    /* 讀不到就試下一個來源 */
  }
}
if (!expected) {
  console.log('MODEL_LOCK_MISSING：讀不到權威 registry，無法核對模型')
  process.exit(1)
}
const lock = join(process.cwd(), '.opencode', 'opencode.json')
if (!existsSync(lock)) {
  console.log(`MODEL_LOCK_MISSING：沒有 ${lock}`)
  process.exit(1)
}
let text = ''
try {
  text = readFileSync(lock, 'utf8')
} catch {
  console.log('MODEL_LOCK_MISSING：鎖定檔讀不到（權限？）')
  process.exit(1)
}
if (!text.includes(expected)) {
  console.log(`MODEL_LOCK_MISSING：鎖定檔不含 ${expected}（本輪停止，不准換模型）`)
  process.exit(1)
}
console.log(`MODEL_LOCK_OK：${expected}`)
