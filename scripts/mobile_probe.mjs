#!/usr/bin/env node
/**
 * mobile_probe.mjs — 全時代手機實測（無頭 Chrome 觸控模擬，需要本機有 Chrome）。
 *
 *   node scripts/mobile_probe.mjs                 29 個時代 × 三種寬度（390／768／1440）＋斷點回歸
 *   node scripts/mobile_probe.mjs --eras=tang,edo 只測指定時代
 *   node scripts/mobile_probe.mjs --narrow        只測 390 寬（快）
 *   node scripts/mobile_probe.mjs --breakpoints   只測斷點回歸（400／768／1024／1440）
 *
 * 390×844 每個時代檢查：
 *   load     主區有內容、頁面沒有未捕捉例外
 *   width    scrollWidth ≤ 390（無橫向溢出）
 *   scroll   頁面比視窗長，且一指從地圖上「沒被浮層吃掉」的位置上滑，整頁真的會捲
 *   trap     地圖面積中「會吞掉上下滑」的比例（內部捲動區、touch-action:none）≤ 50%
 *   sticky   捲入內容後分頁列黏在頂部
 * 768／1440 只查 load 與 width（桌面與平板必須維持原樣）。
 *
 * --breakpoints（400×760／768×1024／1024×768／1440×900）檢查批次 5 與斷點回歸：
 *   400×760  清除 localStorage 後首次載入：圖層預設收起（Map2D／EraMapView）、
 *            EraBar 作用中按鈕置中可見、底欄／圖層按鈕達 --tap-min（44×44）
 *   768×1024 載入、無例外、無橫向溢出、EraBar 作用中按鈕可見
 *   1024×768 清除 localStorage 後首次載入：無橫向溢出、勢力圖層預設開啟
 *   1440×900 載入、無例外、無橫向溢出
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
const breakpointsOnly = process.argv.includes('--breakpoints')
const pick = arg('eras')?.split(',')
const VITE_PORT = 5197
const CDP_PORT = 9467
const TAP_MIN_PX = 44 // src/mobile.css --tap-min: 2.75rem (44px)
const BREAKPOINT_DEFAULT_ERAS = ['sanguo', 'tang', 'azuchi', 'modern', 'sengoku']
const RESPONSIVE_LAYER_ERAS = new Set([
  'sanguo',
  'kofun',
  'asuka',
  'nara',
  'heian',
  'kamakura',
  'muromachi',
  'azuchi',
  'edo',
  'bakumatsu',
  'modern',
])
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

async function clearStorage() {
  await ev(`(()=>{try{if(location.origin.startsWith('http'))localStorage.clear()}catch{}})()`)
  await send('Storage.clearDataForOrigin', {
    origin: `http://[::1]:${VITE_PORT}`,
    storageTypes: 'local_storage',
  })
}

async function loadFresh(era, c) {
  await clearStorage()
  await send('Page.navigate', { url: 'about:blank' })
  await sleep(50)
  return load(era, c)
}

const ERA_BAR_SCAN = `(()=>{
  const bar=document.querySelector('.era-bar')
  const btn=document.querySelector('.era-bar button.is-active')
  if(!bar||!btn) return {ok:false,reason:'找不到時代列或作用中按鈕'}
  const b=bar.getBoundingClientRect(), r=btn.getBoundingClientRect()
  const ok=r.left>=b.left-2&&r.right<=b.right+2
  return {
    ok,
    left:Math.round(r.left),
    right:Math.round(r.right),
    barLeft:Math.round(b.left),
    barRight:Math.round(b.right),
  }
})()`

const BOTTOM_TAP_SCAN = `(()=>{
  const btns=[...document.querySelectorAll('.bottom-bar button')].filter(b=>{
    const cs=getComputedStyle(b), r=b.getBoundingClientRect()
    return cs.display!=='none'&&cs.visibility!=='hidden'&&r.width>0&&r.height>0
  })
  const bad=btns.map(b=>{
    const r=b.getBoundingClientRect()
    return {
      text:(b.innerText||b.getAttribute('aria-label')||'').trim(),
      w:Math.round(r.width),
      h:Math.round(r.height),
    }
  }).filter(x=>x.w<${TAP_MIN_PX}||x.h<${TAP_MIN_PX})
  return {count:btns.length,bad}
})()`

const ROUTE_LEGEND_SCAN = `(()=>{
  const els=[...document.querySelectorAll('aside.route-legend')]
  const uncollapsed=els.filter(el=>!el.classList.contains('route-legend--collapsed')).length
  return {count:els.length,uncollapsed}
})()`

async function inspectLayerBar() {
  const hasFold = await ev(`!!document.querySelector('.map-layer-bar__fold')`)
  if (!hasFold) return { present: false, pressed: [], tapBad: [] }
  const expanded = await ev(
    `document.querySelector('.map-layer-bar__fold')?.getAttribute('aria-expanded') === 'true'`,
  )
  if (!expanded) {
    await ev(`document.querySelector('.map-layer-bar__fold')?.click()`)
    await sleep(120)
  }
  return ev(`(()=>{
    const btns=[...document.querySelectorAll('.map-layer-bar button')].filter(b=>{
      const cs=getComputedStyle(b), r=b.getBoundingClientRect()
      return cs.display!=='none'&&cs.visibility!=='hidden'&&r.width>0&&r.height>0
    })
    const tapBad=btns.map(b=>{
      const r=b.getBoundingClientRect()
      return {text:(b.innerText||'').trim(),w:Math.round(r.width),h:Math.round(r.height)}
    }).filter(x=>x.w<${TAP_MIN_PX}||x.h<${TAP_MIN_PX})
    const pressed=[...document.querySelectorAll('.map-layer-bar__tabs button[aria-pressed]')].map(b=>({
      text:(b.innerText||'').trim(),
      pressed:b.getAttribute('aria-pressed'),
    }))
    return {present:true,pressed,tapBad}
  })()`)
}

async function runBreakpointSuite(bpEras) {
  const bpResults = []
  console.log('\n── 斷點與批次 5 回歸（400／768／1024／1440） ──')
  for (const [era, c] of bpEras) {
    const fails = []
    const isResponsiveLayerEra = RESPONSIVE_LAYER_ERAS.has(era)

    // 400×760：首次訪客（清 localStorage）≤640px 預設狀態與觸控下限
    await setViewport(400, 760)
    const t400 = await loadFresh(era, c)
    if (!(t400 > 100)) fails.push('400:主區無內容')
    if (exceptions) fails.push(`400:${exceptions} 個未捕捉例外`)
    const sw400 = await ev('document.documentElement.scrollWidth')
    if (sw400 > 400) fails.push(`400:橫向溢出 ${sw400}`)

    const eb400 = await ev(ERA_BAR_SCAN)
    if (!eb400?.ok) {
      fails.push(
        `400:時代列作用中鈕未置中可見（${eb400?.left}..${eb400?.right} vs ${eb400?.barLeft}..${eb400?.barRight}）`,
      )
    }

    const bot400 = await ev(BOTTOM_TAP_SCAN)
    if (!bot400?.count) fails.push('400:找不到底欄按鈕')
    else if (bot400.bad.length) {
      fails.push(
        `400:底欄按鈕小於 ${TAP_MIN_PX}px（${bot400.bad.map((x) => `${x.text}:${x.w}x${x.h}`).join('、')}）`,
      )
    }

    const lb400 = await inspectLayerBar()
    if (lb400?.present && lb400.tapBad.length) {
      fails.push(
        `400:圖層按鈕小於 ${TAP_MIN_PX}px（${lb400.tapBad.map((x) => `${x.text}:${x.w}x${x.h}`).join('、')}）`,
      )
    }
    if (isResponsiveLayerEra) {
      const terr = lb400?.pressed.find((p) => p.text === '勢力')
      const routes = lb400?.pressed.find((p) => p.text === '行軍')
      if (!terr || terr.pressed !== 'false') {
        fails.push(`400:勢力圖層首次應預設關閉（實為 ${terr?.pressed ?? '無'}）`)
      }
      if (!routes || routes.pressed !== 'false') {
        fails.push(`400:行軍圖層首次應預設關閉（實為 ${routes?.pressed ?? '無'}）`)
      }
    }
    const rl400 = await ev(ROUTE_LEGEND_SCAN)
    if (rl400?.uncollapsed) {
      fails.push(`400:行軍說明盒首次未收起（${rl400.uncollapsed}/${rl400.count}）`)
    }

    // 768×1024：平板載入、無橫向溢出與 EraBar 可見
    await setViewport(768, 1024)
    const t768 = await load(era, c)
    if (!(t768 > 100)) fails.push('768:主區無內容')
    if (exceptions) fails.push(`768:${exceptions} 個未捕捉例外`)
    const sw768 = await ev('document.documentElement.scrollWidth')
    if (sw768 > 768) fails.push(`768:橫向溢出 ${sw768}`)
    const eb768 = await ev(ERA_BAR_SCAN)
    if (!eb768?.ok) {
      fails.push(
        `768:時代列作用中鈕未置中可見（${eb768?.left}..${eb768?.right} vs ${eb768?.barLeft}..${eb768?.barRight}）`,
      )
    }

    // 1024×768：首次訪客（清 localStorage）>640px 勢力圖層預設開啟
    await setViewport(1024, 768)
    const t1024 = await loadFresh(era, c)
    if (!(t1024 > 100)) fails.push('1024:主區無內容')
    if (exceptions) fails.push(`1024:${exceptions} 個未捕捉例外`)
    const sw1024 = await ev('document.documentElement.scrollWidth')
    if (sw1024 > 1024) fails.push(`1024:橫向溢出 ${sw1024}`)
    if (isResponsiveLayerEra) {
      const lb1024 = await inspectLayerBar()
      const terr = lb1024?.pressed.find((p) => p.text === '勢力')
      if (!terr || terr.pressed !== 'true') {
        fails.push(`1024:勢力圖層首次應預設開啟（實為 ${terr?.pressed ?? '無'}）`)
      }
    }

    // 1440×900：寬桌面載入與無橫向溢出
    await setViewport(1440, 900)
    const t1440 = await load(era, c)
    if (!(t1440 > 100)) fails.push('1440:主區無內容')
    if (exceptions) fails.push(`1440:${exceptions} 個未捕捉例外`)
    const sw1440 = await ev('document.documentElement.scrollWidth')
    if (sw1440 > 1440) fails.push(`1440:橫向溢出 ${sw1440}`)

    bpResults.push({ era, fails })
    console.log(
      `${fails.length ? '✗' : '✓'} ${era.padEnd(13)} 400/768/1024/1440${fails.length ? '  ' + fails.join('；') : ' ok'}`,
    )
  }
  return bpResults
}

const results = []
const eras = eraList().filter(([e]) => !pick || pick.includes(e))
if (!eras.length) {
  console.log('mobile_probe — 沒有符合的時代')
  process.exit(1)
}

if (!breakpointsOnly) {
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
}

let bpResults = []
if (breakpointsOnly || !narrowOnly) {
  const bpEras = pick
    ? eras
    : eraList().filter(([e]) => BREAKPOINT_DEFAULT_ERAS.includes(e))
  bpResults = await runBreakpointSuite(bpEras)
}

const allResults = [...results, ...bpResults]
const bad = allResults.filter((r) => r.fails.length)
console.log(
  `\nmobile_probe — ${allResults.length - bad.length}/${allResults.length} 項檢查通過${bad.length ? `；失敗：${bad.map((r) => r.era).join('、')}` : ''}`,
)
ws.close()
process.exit(bad.length ? 1 : 0)
