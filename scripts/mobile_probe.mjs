#!/usr/bin/env node
/**
 * mobile_probe.mjs — 全時代手機實測（無頭 Chrome 觸控模擬，需要本機有 Chrome）。
 *
 *   node scripts/mobile_probe.mjs                 29 個時代 × 三種寬度（390／768／1440）
 *   node scripts/mobile_probe.mjs --eras=tang,edo 只測指定時代
 *   node scripts/mobile_probe.mjs --narrow        只測 390 寬（快）
 *
 * 390×844 每個時代檢查：
 *   load     主區有內容、頁面沒有未捕捉例外
 *   width    scrollWidth ≤ 390（無橫向溢出）
 *   scroll   頁面比視窗長，且一指從地圖上「沒被浮層吃掉」的位置上滑，整頁真的會捲
 *   trap     地圖面積中「會吞掉上下滑」的比例（內部捲動區、touch-action:none）≤ 50%
 *   sticky   捲入內容後分頁列黏在頂部
 * 768／1440 只查 load 與 width（桌面與平板必須維持原樣）。
 *
 * 找不到 Chrome：印 SKIP 並以 0 結束。有任何時代失敗：結束碼 1。
 * 時代清單讀自 src/state/TopicContext.tsx，新增時代會自動納入。
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(import.meta.url), '..', '..')
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1]
const narrowOnly = process.argv.includes('--narrow')
const pick = arg('eras')?.split(',')
const VITE_PORT = 5197
const CDP_PORT = 9467
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const CHROME = [
  process.env.CHROME_BIN,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((p) => p && existsSync(p))
if (!CHROME) {
  console.log('mobile_probe — SKIP（找不到 Chrome，可用 CHROME_BIN 指定）')
  process.exit(0)
}

function eraList() {
  const src = readFileSync(join(ROOT, 'src/state/TopicContext.tsx'), 'utf8')
  const grab = (name) => {
    const i = src.indexOf(`export const ${name}`)
    const j = src.indexOf('\n]', i)
    return [...src.slice(i, j).matchAll(/id: '([a-z]+)'/g)].map((m) => m[1])
  }
  return [
    ...grab('CHINA_ERA_SLOTS').map((e) => [e, 'china']),
    ...grab('JAPAN_ERA_SLOTS').map((e) => [e, 'japan']),
  ]
}

const tmp = mkdtempSync(join(tmpdir(), 'hf-probe-'))
const vite = spawn(
  'npx',
  ['vite', '--host', '::1', '--port', String(VITE_PORT), '--strictPort'],
  { cwd: ROOT, stdio: 'ignore' },
)
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
  console.log('mobile_probe — SKIP（Chrome 無法啟動）')
  process.exit(0)
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
  await send('Emulation.setDeviceMetricsOverride', {
    width: w,
    height: h,
    deviceScaleFactor: 2,
    mobile,
  })
  await send('Emulation.setTouchEmulationEnabled', { enabled: mobile })
}

async function load(era, c) {
  exceptions = 0
  await send('Page.navigate', { url: `http://[::1]:${VITE_PORT}/?e=${era}&c=${c}` })
  for (let i = 0; i < 24; i++) {
    await sleep(500)
    const n = await ev(`(document.querySelector('.app-shell__main')?.innerText||'').length`)
    if (n > 100) break
  }
  await sleep(400)
  return ev(`(document.querySelector('.app-shell__main')?.innerText||'').length`)
}

const MAP_SCAN = `(()=>{
  const mp=document.querySelector('.map-2d__basemap-wrap')||document.querySelector('.app-shell__main > :first-child')
  if(!mp) return null
  const r=mp.getBoundingClientRect()
  let bad=0,tot=0,free=null
  for(let i=1;i<=10;i++)for(let j=1;j<=8;j++){
    const x=r.left+r.width*i/11,y=r.top+r.height*j/9
    let e=document.elementFromPoint(x,y),trap=false
    while(e&&e!==document.body){
      const cs=getComputedStyle(e)
      if(((cs.overflowY==='auto'||cs.overflowY==='scroll')&&e.scrollHeight>e.clientHeight+1)||cs.touchAction==='none'){trap=true;break}
      e=e.parentElement
    }
    tot++
    if(trap)bad++
    else if(!free&&y>0&&y<innerHeight)free=[Math.round(x),Math.round(y)]
  }
  return {pct:Math.round(100*bad/tot),free}
})()`

// 刻度與底圖標題：窄屏易出現在地圖以外的兩類溢出，逐一時代都檢查。
const TICK_TITLE_SCAN = `(()=>{
  const ticks=[...document.querySelectorAll('.year-scrubber__tick')]
    .filter(b=>(b.innerText||'').trim() && +getComputedStyle(b).opacity>0.5)
    .map(b=>{const r=b.getBoundingClientRect();return [r.left,r.right]})
  let overlap=0
  for(let i=0;i<ticks.length;i++)for(let j=i+1;j<ticks.length;j++)
    if(Math.min(ticks[i][1],ticks[j][1])-Math.max(ticks[i][0],ticks[j][0])>1) overlap++
  const t=document.querySelector('.map-2d__basemap-title')
  return {overlap,titleCut:!!t && t.scrollWidth>t.clientWidth+1,
          sw:t?t.scrollWidth:0,cw:t?t.clientWidth:0}
})()`

const results = []
const eras = eraList().filter(([e]) => !pick || pick.includes(e))
if (!eras.length) {
  console.log('mobile_probe — 沒有符合的時代')
  process.exit(1)
}

for (const [era, c] of eras) {
  const fails = []
  await setViewport(390, 844)
  const text = await load(era, c)
  if (!(text > 100)) fails.push('load:主區無內容')
  if (exceptions) fails.push(`load:${exceptions} 個未捕捉例外`)
  const m = await ev(MAP_SCAN)
  const tt = await ev(TICK_TITLE_SCAN)
  if (tt?.overlap) fails.push(`ticks:刻度重疊 ${tt.overlap} 組`)
  if (tt?.titleCut) fails.push(`title:底圖標題被截斷 ${tt.sw}/${tt.cw}`)
  const sw = await ev('document.documentElement.scrollWidth')
  const docH = await ev('document.documentElement.scrollHeight')
  if (sw > 390) fails.push(`width:scrollWidth ${sw}`)
  if (docH < 844 + 50) fails.push(`scroll:頁面不比視窗長（${docH}）`)
  let dy = 0
  if (!m) fails.push('scroll:找不到地圖區')
  else {
    if (m.pct > 50) fails.push(`trap:地圖 ${m.pct}% 面積吞手勢`)
    if (!m.free) fails.push('scroll:地圖上沒有可上滑的位置')
    else {
      await send('Input.synthesizeScrollGesture', {
        x: m.free[0],
        y: m.free[1],
        yDistance: -300,
        gestureSourceType: 'touch',
        speed: 1200,
      })
      await sleep(500)
      dy = await ev('scrollY')
      if (dy < 100) fails.push(`scroll:一指上滑只捲 ${dy}px`)
    }
  }
  if (docH > 1500) {
    await ev('window.scrollTo(0,1200)')
    await sleep(400)
    const top = await ev(
      `(()=>{const h=document.querySelector('.content-dock__head');return h?Math.round(h.getBoundingClientRect().top):null})()`,
    )
    if (top === null) fails.push('sticky:找不到分頁列')
    else if (top > 1) fails.push(`sticky:分頁列離頂 ${top}px`)
  }
  let wide = ''
  if (!narrowOnly) {
    for (const [w, h] of [
      [768, 1024],
      [1440, 900],
    ]) {
      await setViewport(w, h)
      const t = await load(era, c)
      const s = await ev('document.documentElement.scrollWidth')
      if (!(t > 100)) fails.push(`${w}:主區無內容`)
      if (exceptions) fails.push(`${w}:${exceptions} 個未捕捉例外`)
      if (s > w) fails.push(`${w}:橫向溢出 ${s}`)
    }
    wide = ' 768/1440 ok'
  }
  results.push({ era, fails })
  console.log(
    `${fails.length ? '✗' : '✓'} ${era.padEnd(13)} docH=${docH} swipe=${dy} trap=${m?.pct ?? '?'}% overlap=${tt?.overlap ?? '?'} title=${tt?.titleCut ? 'CUT' : 'ok'}${fails.length ? '  ' + fails.join('；') : wide}`,
  )
}

const bad = results.filter((r) => r.fails.length)
console.log(
  `\nmobile_probe — ${results.length - bad.length}/${results.length} 個時代通過${bad.length ? `；失敗：${bad.map((r) => r.era).join('、')}` : ''}`,
)
ws.close()
process.exit(bad.length ? 1 : 0)
