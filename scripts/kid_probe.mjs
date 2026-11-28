#!/usr/bin/env node
/**
 * kid_probe.mjs — 簡易版「時光機」真瀏覽器實測（雲端層收口覆核用，唔入工作單 驗收=）。
 *
 *   node scripts/kid_probe.mjs                 T1–T5 × 390／768／1440，再逐個時代走一次 T1（390）
 *   node scripts/kid_probe.mjs --tasks         只跑 T1–T5 × 三種寬度（快）
 *   node scripts/kid_probe.mjs --eras=tang,edo 時代掃描只跑指定時代
 *
 * 每一下「點擊」都先做命中測試（elementFromPoint 打中目標本身或其子孫，即冇被浮層遮住），
 * 再計數；任務超過上限即紅。另外每個畫面都量：
 *   tap      簡易版內所有可見可點目標短邊 ≥ 64px（手機）／≥ 56px（≥1025 寬）
 *   width    scrollWidth ≤ 視窗寬（無橫向溢出）
 *   errors   頁面未捕捉例外 = 0
 *
 * 任務（上限見 docs/plans/2026-11-28/ui.md「目標一句」）：
 *   T1 首頁 → 中國 → 唐（2 下）      T2 下一年（1 下，年份大字 +1）
 *   T3 地圖全屏（1 下）              T4 人物分頁 → 撳第一個人物展開（2 下）
 *   T5 回首頁（1 下）
 *
 * 找不到 Chrome：exit 3（唔准當綠）。任何一項失敗：exit 1。全綠：exit 0。
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(import.meta.url), '..', '..')
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1]
const tasksOnly = process.argv.includes('--tasks')
const pick = arg('eras')?.split(',')
const VITE_PORT = 5198
const CDP_PORT = 9468
const WIDTHS = [
  [390, 844],
  [768, 1024],
  [1440, 900],
]
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const CHROME = [
  process.env.CHROME_BIN,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((p) => p && existsSync(p))
if (!CHROME) {
  console.log('kid_probe — 找不到 Chrome（可用 CHROME_BIN 指定），未量 = 未過')
  process.exit(3)
}

const STRINGS = readFileSync(join(ROOT, 'src/kid/strings.ts'), 'utf8')
const str = (key) => STRINGS.match(new RegExp(`\\b${key}: '([^']+)'`))?.[1]
const NEXT_YEAR = str('nextYear')

function eraList() {
  const src = readFileSync(join(ROOT, 'src/state/TopicContext.tsx'), 'utf8')
  const grab = (name) => {
    const i = src.indexOf(`export const ${name}`)
    const j = src.indexOf('\n]', i)
    return [...src.slice(i, j).matchAll(/id: '([a-z]+)'/g)].map((m) => m[1])
  }
  return [
    ['CHINA_ERA_SLOTS', 'china'],
    ['JAPAN_ERA_SLOTS', 'japan'],
    ['KOREA_ERA_SLOTS', 'korea'],
    ['THAILAND_ERA_SLOTS', 'thailand'],
    ['VIETNAM_ERA_SLOTS', 'vietnam'],
    ['MALAYSIA_ERA_SLOTS', 'malaysia'],
  ].flatMap(([slots, c]) => grab(slots).map((e) => [e, c]))
}

const tmp = mkdtempSync(join(tmpdir(), 'hf-kid-probe-'))
const vite = spawn('npx', ['vite', '--host', '::1', '--port', String(VITE_PORT), '--strictPort'], {
  cwd: ROOT,
  stdio: 'ignore',
})
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    '--no-first-run',
    '--disable-gpu',
    `--user-data-dir=${tmp}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
)
function cleanup() {
  vite.kill()
  chrome.kill()
  try {
    rmSync(tmp, { recursive: true, force: true })
  } catch {
    /* 暫存目錄清不掉不影響結果 */
  }
}
process.on('exit', cleanup)
process.on('SIGINT', () => process.exit(130))

let targets
for (let i = 0; i < 60; i++) {
  try {
    targets = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json`)).json()
    if (targets.length) break
  } catch {
    /* Chrome 尚未就緒 */
  }
  await sleep(250)
}
if (!targets?.length) {
  console.log('kid_probe — Chrome 無法啟動，未量 = 未過')
  process.exit(3)
}
for (let i = 0; i < 80; i++) {
  try {
    if ((await fetch(`http://[::1]:${VITE_PORT}/`)).ok) break
  } catch {
    /* vite 尚未就緒 */
  }
  await sleep(500)
}

const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let nextId = 0
const waiting = new Map()
let exceptions = 0
ws.onmessage = (m) => {
  const d = JSON.parse(m.data)
  if (d.id && waiting.has(d.id)) {
    waiting.get(d.id)(d)
    waiting.delete(d.id)
  } else if (d.method === 'Runtime.exceptionThrown') exceptions++
}
const send = (method, params = {}) =>
  new Promise((r) => {
    const id = ++nextId
    waiting.set(id, r)
    ws.send(JSON.stringify({ id, method, params }))
  })
const ev = async (expression) =>
  (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result
    ?.result?.value
await send('Page.enable')
await send('Runtime.enable')

async function setViewport(w, h) {
  const mobile = w < 701
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile })
  await send('Emulation.setTouchEmulationEnabled', { enabled: mobile })
}

async function waitFor(expr, ms = 8000) {
  for (let t = 0; t < ms; t += 200) {
    if (await ev(expr)) return true
    await sleep(200)
  }
  return false
}

/** 首次入站：清 localStorage，以 ?ui=kid 開首頁。 */
async function fresh() {
  exceptions = 0
  await send('Page.navigate', { url: `http://[::1]:${VITE_PORT}/?ui=kid` })
  await waitFor(`document.readyState==='complete'`)
  await ev(`localStorage.clear()`)
  await send('Page.navigate', { url: `http://[::1]:${VITE_PORT}/?ui=kid` })
  return waitFor(`!!document.querySelector('.kid-shell [data-kid="topic"]')`, 15000)
}

/** 命中測試後點擊；回傳失敗原因或 null。 */
async function tap(sel) {
  return ev(`(()=>{
    const el=document.querySelector(${JSON.stringify(sel)})
    if(!el) return '找不到 '+${JSON.stringify(sel)}
    el.scrollIntoView({block:'center',inline:'center'})
    const r=el.getBoundingClientRect()
    const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)
    if(!hit||!(hit===el||el.contains(hit))) return '被遮住：'+${JSON.stringify(sel)}+' ← '+(hit?hit.className||hit.tagName:'null')
    el.click()
    return null
  })()`)
}

const TAP_SCAN = (min) => `(()=>{
  const shell=document.querySelector('.kid-shell')
  if(!shell) return ['冇 .kid-shell']
  const bad=[]
  for(const el of shell.querySelectorAll('button,a[href],[role=tab],input,select')){
    if(el.closest('.kid-machine__map')) continue
    const r=el.getBoundingClientRect()
    if(!r.width||!r.height) continue
    const cs=getComputedStyle(el)
    if(cs.visibility==='hidden') continue
    const s=Math.min(r.width,r.height)
    if(s<${min}) bad.push((el.getAttribute('aria-label')||el.innerText||el.className||el.tagName).trim().slice(0,16)+' '+Math.round(s)+'px')
  }
  return bad
})()`

const failures = []
const fail = (where, msg) => {
  failures.push(`${where}：${msg}`)
  console.log(`  ✗ ${where}：${msg}`)
}

async function screenChecks(where, w) {
  const min = w >= 1025 ? 56 : 64
  const small = await ev(TAP_SCAN(min))
  if (small?.length) fail(where, `目標細過 ${min}px：${small.slice(0, 4).join('、')}${small.length > 4 ? ` 等 ${small.length} 個` : ''}`)
  const sw = await ev(`document.documentElement.scrollWidth`)
  if (sw > w) fail(where, `橫向溢出 scrollWidth=${sw}`)
  if (exceptions) fail(where, `未捕捉例外 ${exceptions} 個`)
}

/** 走一個任務：steps＝要點的選擇器（逐一點），done＝完成條件；點擊數＝steps.length。 */
async function task(where, limit, steps, done) {
  for (const sel of steps) {
    const why = await tap(sel)
    if (why) return fail(where, why)
    await sleep(350)
  }
  if (steps.length > limit) fail(where, `用咗 ${steps.length} 下（上限 ${limit}）`)
  if (!(await waitFor(done))) fail(where, `完成條件未達：${done}`)
}

const yearNow = `(document.querySelector('.kid-dock__year')?.textContent||'')`

for (const [w, h] of WIDTHS) {
  await setViewport(w, h)
  const at = (t) => `${w} ${t}`
  console.log(`— ${w}×${h}`)
  if (!(await fresh())) {
    fail(at('load'), '首頁冇六國卡')
    continue
  }
  await screenChecks(at('首頁'), w)
  await task(
    at('T1'),
    2,
    ['[data-kid="topic"][data-topic="china"]', '[data-kid="era"][data-era="tang"]'],
    `!!document.querySelector('.kid-machine') && new URL(location.href).searchParams.get('e')==='tang'`,
  )
  await waitFor(`/\\d/.test(${yearNow})`)
  await screenChecks(at('時光機'), w)
  const before = await ev(yearNow)
  await task(
    at('T2'),
    1,
    [`.kid-dock button[aria-label="${NEXT_YEAR}"]`],
    `${yearNow} !== ${JSON.stringify(before)} && /\\d/.test(${yearNow})`,
  )
  await task(at('T3'), 1, ['.kid-tabs [role="tab"]:nth-child(3)'], `!!document.querySelector('[data-kid-map-full]')`)
  await task(
    at('T4'),
    2,
    ['.kid-tabs [role="tab"]:nth-child(2)', '.kid-people__grid button'],
    `document.querySelector('.kid-people__grid button')?.getAttribute('aria-expanded')==='true'`,
  )
  await screenChecks(at('人物'), w)
  await task(at('T5'), 1, ['.kid-nav button'], `document.querySelector('.kid-shell')?.dataset.kidScreen==='home'`)
}

if (!tasksOnly) {
  await setViewport(390, 844)
  const eras = eraList().filter(([e]) => !pick || pick.includes(e))
  console.log(`— 時代掃描 390×844（${eras.length} 個）`)
  for (const [era, c] of eras) {
    if (!(await fresh())) {
      fail(era, '首頁冇六國卡')
      continue
    }
    await task(
      era,
      2,
      [`[data-kid="topic"][data-topic="${c}"]`, `[data-kid="era"][data-era="${era}"]`],
      `!!document.querySelector('.kid-machine') && new URL(location.href).searchParams.get('e')===${JSON.stringify(era)}`,
    )
    await sleep(800)
    await screenChecks(era, 390)
  }
}

console.log(`kid_probe — 失敗 ${failures.length} 項`)
process.exit(failures.length ? 1 : 0)
