/**
 * 引用分診表：把「全庫只用過一次的具名引用」連同它支撐的那句話一起拉出來，
 * 依可核性分層，讓人一批一批判，而不是從 217 條裡盲讀。
 *
 * 為什麼需要：事件三段加厚把具名引用從數百放大到 3,300+ 次。
 * 現有閘門只檢查「模組裡有沒有出處」，不檢查「這個出處是否支持它旁邊那句主張」。
 * 引用面擴大，編造的暴露面也擴大——這一輪是收斂，不是新增。
 *
 * 用法：npm run audit:citations            印統計與前 20 條
 *       npm run audit:citations -- --write  寫出 docs/CITATION-TRIAGE.md
 */
import * as fs from 'fs'
import { execSync } from 'child_process'
import { lookupCoverage, type Coverage } from './sourceCoverage'
import { resolveSource } from './lib/citationRules.ts'

const files = execSync('git ls-files "src/**/*.ts"', { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter((f) => !f.includes('/vendor/') && !f.endsWith('.test.ts'))

interface Hit {
  file: string
  line: number
  entry: string
  year: number | null
  yearLine: number
  field: string
  source: string
  claim: string
}

const BOOK = /《([^》]{2,30})》/g
// 現代學者：只認「人名＋（著作）」或人名單獨出現，著作欄缺的要標出來
const SCHOLAR =
  /(錢穆|陳寅恪|內藤湖南|宮崎市定|網野善彦|笠井幸代|佐藤進一|黑田俊雄|近藤二郎|閻若璩|顧頡剛|王國維|董作賓|郭沫若|胡厚宣|方詩銘|王秀琳|傅斯年|翦伯賛|呂思勉|錢大昕|趙翼|王念孫|段玉裁|余嘉錫|田餘慶|祝總斌|馬尾|川本芳昭|利光晴子|五來重俊|重澤康邦|山尾幸久)/g

const hits: Hit[] = []
const tally = new Map<string, number>()

for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split('\n')
  let entry = ''
  let year: number | null = null
  let yearLine = -999 // 年份是哪一行設的：離太遠就不認
  let field = ''
  let fieldLine = -999 // 欄位也要離得近才算：否則上一條的 source 會套到下一條的敘述
  lines.forEach((l, i) => {
    // 條目邊界要清掉年份：不清的話上一條的年份會套到下一條，
    // 造出一整批「年代不涵蓋」的假錯引（本腳本第一版就這樣報了 140 條）。
    // 三國／各模組的條目有三種寫法：map key '208-chibi':、id: '208-chibi'、year: 208。
    const keyM = l.match(/^\s{2}'?(-?\d{1,4})-[A-Za-z0-9_-]+'?\s*:/)
    const idM = l.match(/^\s*(?:id|eventId):\s*'([^']+)'/)
    const yM = l.match(/^\s*year:\s*(-?\d+)/)
    if (keyM) {
      entry = l.trim().replace(/:$/, '')
      year = Number(keyM[1]); yearLine = i
    } else if (idM) {
      entry = idM[1]
      const m = idM[1].match(/(-?\d{3,4})/)
      year = m ? Number(m[1]) : null; yearLine = i
    } else if (yM) {
      year = Number(yM[1]); yearLine = i
    }
    const fM = l.match(/^\s*(causes|course|outcome|desc|note|source|outcomeSource|causeSource|courseSource|readings|analysis):\s*/)
    if (fM) {
      field = fM[1]
      fieldLine = i
    }
    const bare = l.replace(/\/\/.*$/, '')
    for (const m of bare.matchAll(BOOK)) {
      const key = '《' + m[1] + '》'
      tally.set(key, (tally.get(key) || 0) + 1)
      const from = Math.max(0, m.index - 70)
      hits.push({
        file: f,
        line: i + 1,
        entry,
        year,
        yearLine,
        field: i - fieldLine <= 12 ? field : '',
        source: key,
        claim: bare.slice(from, m.index + m[0].length + 90).replace(/\s+/g, ' ').trim(),
      })
    }
    for (const m of bare.matchAll(SCHOLAR)) {
      tally.set(m[1], (tally.get(m[1]) || 0) + 1)
      const from = Math.max(0, m.index - 70)
      hits.push({
        file: f,
        line: i + 1,
        entry,
        year,
        field: i - fieldLine <= 12 ? field : '',
        source: m[1],
        claim: bare.slice(from, m.index + m[0].length + 90).replace(/\s+/g, ' ').trim(),
      })
    }
  })
}

type Tier = 'A' | 'B' | 'C' | 'D' | 'E'
interface Row extends Hit {
  tier: Tier
  why: string
}

const rows: Row[] = []
for (const h of hits) {
  const count = tally.get(h.source) ?? 0
  if (count > 1) continue // 只用過一次的才進分診
  // 《魏書·武帝紀》在三國模組是《三國志·魏書》的簡稱，不是北魏的《魏書》。
  // 不處理這個歧義，分診表會憑空捏出上百條「年代不涵蓋」的假缺陷——
  // 一份報假警的表比沒有表更糟：它讓人以為判過了。
  const resolved = resolveSource(h.source, h.file)
  const cov: Coverage | undefined = lookupCoverage(resolved)
  // 志／序／表／考是通貫性記述（《隋書·經籍志》序追述東漢文獻亡佚），
  // 拿成書跨度去比事件年份會誤判，交人工。
  const survey = /[·](經籍|食貨|天文|地理|百官|禮|樂|刑|五行|律曆|兵|藝文)?(志|序|表|考)》$/.test(resolved)
  if (cov && survey) {
    rows.push({ ...h, tier: 'C', why: '志／序類為通貫性記述，年代比對不適用' })
    continue
  }
  if (!cov) {
    // 只有篇名、沒有主書：《高祖紀》可能是《漢書》也可能是《魏書》。
    // 要在「查不到主書」之後才判這條，否則《三國志》《金史》這種書名
    // 會被自己的規則誤當成篇名（第一版就踩到了）。
    if (/^《[^·》]{2,9}(傳|紀|世家|載記|志|表)》$/.test(resolved) && !/^(《三國志》|《金史》|《晉書》|《遼史》|《元史》|《宋史》|《魏書》|《周書》|《梁書》|《陳書》|《隋書》)$/.test(resolved)) {
      const inCiteField = /Source$|^source$/.test(h.field)
      rows.push({
        ...h,
        tier: inCiteField ? 'E' : 'B',
        why: inCiteField
          ? '出處欄只有篇名、沒有主書：讀者無從查核（《高祖紀》可能是《漢書》也可能是《魏書》）'
          : '敘述文裡的簡稱交叉指引（同一條的出處欄通常已標全名），不是查核問題',
      })
    } else {
      rows.push({ ...h, tier: 'C', why: '無年代表：不知道這本書涵蓋哪個年代，需人工判' })
    }
    continue
  }
  if (cov.modern) {
    rows.push({ ...h, tier: 'C', why: '近現代學者：要判的是「他是否真的這樣主張」，不是年代' })
    continue
  }
  if (cov.caveat) {
    rows.push({ ...h, tier: 'B', why: `年代可判但該書性質特殊：${cov.caveat}` })
    continue
  }
  if (cov.layer) {
    rows.push({ ...h, tier: 'D', why: `不是著作而是史料層標籤（${cov.layer}）：要用它支撐具體記載時得另找具名來源` })
    continue
  }
  // 沒有條目年份就**不做年代判定**。之前拿模組跨度的起點充數（/imperial/ 是
  // 220–2026），等於用「220 年」去比《明史》，憑空造出一批假錯引。
  // 不知道年份就老實說不知道，這比假裝判過重要。
  const y = h.yearLine >= 0 && h.line - h.yearLine <= 25 ? h.year : null
  if (y === null) {
    rows.push({ ...h, tier: 'B', why: `年代無法自動判（該條沒有可認的年份），出處涵蓋 ${cov.from}–${cov.to}` })
  } else if (y < cov.from - 20 || y > cov.to + 20) {
    rows.push({
      ...h,
      tier: 'A',
      why: `年代不涵蓋：該條約 ${y} 年，但 ${h.source} 涵蓋 ${cov.from}–${cov.to}。` +
        `要判的是哪一種：**錯引**，還是**追述**（用後代史書說明前代制度源流，合法但要標明是追述）`,
    })
    continue
  }
  rows.push({ ...h, tier: 'B', why: `年代對得上（${cov.from}–${cov.to}），但全庫只這一次引用，沒有第二處可對讀` })
}

const order: Tier[] = ['A', 'D', 'E', 'C', 'B']
const byTier = (t: Tier) => rows.filter((r) => r.tier === t)


// ── --ask：把我判不了的條目印成「可直接丟給前沿模型」的提問區塊 ──
// 格式與 docs/FACT-ESCALATION.md 一致：一實體一問題，五個欄位，答案有固定結構。
if (process.argv.includes('--ask')) {
  const LOST = /(^《(趙書|魏略|英雄記|山陽公載記|漢晉春秋|世本|則天實錄|則天皇后實錄|東觀漢記|華陽國志|兼卿記)》)|輯本|已佚/
  const DOC = /條約|協約|公約|專條|專約|協議|宣言|通電|白書|法》|詔|憲法|章程|約章/
  type Archetype = 'A' | 'B' | 'C' | 'D' | 'E'
  const ARCH: Record<Archetype, { label: string; q: string }> = {
    A: { label: '存在性與字形', q: '這本書是否存在？正式書名（繁體）與常見異體／日文原形為何？原書存世、已佚、僅見於他書轉引，還是僅存輯本？' },
    B: { label: '論點歸屬', q: '這位學者是否真的主張下面這句話？若主張，出自哪一部著作的哪一部分？若不主張，正確的主張者是誰？' },
    C: { label: '引用層別', q: '這個記載屬於哪一層：原書／輯本／他書注引／類書轉引／後世合成？我們的出處應該標到哪一層才算核過？' },
    D: { label: '條約與法令', q: '正式名稱（繁體全名）、簽署或公布日期、當事方、生效時間各為何？常見簡稱與全名的對應關係？' },
    E: { label: '歧義歸屬', q: '這個只有篇名的引用指的是哪一部書的哪一篇？若同名的篇見於多部書，依上下文（事件年代與主題）應屬哪一部？' },
  }
  const pick = (r: Row): Archetype => {
    if (r.tier === 'E') return 'E'
    const cov = lookupCoverage(r.source)
    if (cov?.modern) return 'B'
    if (DOC.test(r.source)) return 'D'
    if (LOST.test(r.source) || /佚|輯/.test(cov?.layer ?? '')) return 'C'
    return 'A'
  }
  const todo = [...byTier('C'), ...byTier('E')]
  console.log('# 待查提問（生成：npm run audit:citations -- --ask）\n')
  console.log('這是**提問**不是結論。每塊只問一個對象。')
  console.log('回答請照 answer_form；不知道就回答 unknown。\n')
  for (const a of ['A', 'B', 'C', 'D', 'E'] as Archetype[]) {
    const rs = todo.filter((r) => pick(r) === a)
    if (!rs.length) continue
    console.log(`\n## ${a} ${ARCH[a].label}（${rs.length} 條）\n`)
    const seen = new Set<string>()
    for (const r of rs) {
      if (seen.has(r.source)) continue
      seen.add(r.source)
      if (seen.size > 25) { console.log(`（其餘 ${rs.length - seen.size + 1} 條同型，見 docs/CITATION-TRIAGE.md）`); break }
      console.log('```')
      console.log(`【entity】     ${r.source}`)
      console.log(`【where_used】 ${r.file}:${r.line}${r.entry ? ` · ${r.entry}` : ''}${r.year !== null ? ` · ${r.year}年` : ''} · 欄位 ${r.field || '?'}`)
      console.log(`【claim】      ${r.claim}`)
      console.log(`【question】   ${ARCH[a].q}`)
      console.log('【answer_form】 1) verdict: supported / unsupported / unknown')
      console.log('              2) standard_title: 繁體正式名 + 常見異體/日文原形')
      console.log('              3) survives?: 存 / 佚 / 僅轉引 / 僅輯本（哪家輯本）')
      console.log('              4) layer: 實錄層 / 軍記層 / 類書轉引 / 注引 / 後世合成')
      console.log('              5) primary_source: 書名＋卷或篇（不許編卷頁；無法指出就寫「卷頁：未核」）')
      console.log('              6) search_terms: 3–6 個可自查的檢索字串')
      console.log('              7) confidence: high/medium/low ＋ 理由')
      console.log('【防呆】 不知道就回答 unknown，不要用看似合理的書名填補。')
      console.log('        若本提問的前提有錯（對象無關、關係不成立），先指出前提錯誤再回答。')
      console.log('```\n')
    }
  }
}

if (process.argv.includes('--write')) {
  const out: string[] = []
  out.push('# 引用分診表（只用過一次的具名引用）')
  out.push('')
  out.push('生成：`npm run audit:citations -- --write`。這表**不是缺陷清單**，是待判清單。')
  out.push('每一條都要人回答一個問題：**這個出處是否真的支持它旁邊那句主張？**')
  out.push('')
  out.push('| 層 | 意思 | 條數 |')
  out.push('|---|---|---|')
  out.push(`| A | 出處年代**不涵蓋**該事件：可能是錯引，也可能是合法**追述**——人要判哪一種 | ${byTier('A').length} |`)
  out.push(`| D | 出處是**史料層標籤**而非著作——支撐具體記載時要另找具名來源 | ${byTier('D').length} |`)
  out.push(`| E | 只有**篇名沒有主書**——不是編造，但讀者查不到，可直接修 | ${byTier('E').length} |`)
  out.push(`| C | 沒有年代表，無法自動判 | ${byTier('C').length} |`)
  out.push(`| B | 年代對得上，但全庫只引用這一次，無第二處可對讀 | ${byTier('B').length} |`)
  out.push('')
  out.push('判完的處理只有三種，**沒有第四種**：')
  out.push('1. 確認支持 → 不動，必要時在該條補第二處對讀來源。')
  out.push('2. 不支持但知道正確來源 → 換掉。')
  out.push('3. 不支持也不知道正確來源 → **把主張降格為明示的不確定**（「本條未載」「一說」），')
  out.push('   或刪掉那句。把出處留著不管是最壞的選擇。')
  out.push('')
  for (const t of order) {
    const rs = byTier(t)
    if (!rs.length) continue
    out.push(`## 層 ${t}（${rs.length} 條）`)
    out.push('')
    for (const r of rs) {
      out.push(`- **${r.source}** — ${r.file}:${r.line}${r.entry ? ` \`${r.entry}\`` : ''}${r.year !== null ? ` (${r.year}年)` : ''}，欄位 \`${r.field || '?'}\``)
      out.push(`  - 判點：${r.why}`)
      out.push(`  - 原文：${r.claim}`)
    }
    out.push('')
  }
  fs.writeFileSync('docs/CITATION-TRIAGE.md', out.join('\n'))
  console.log(`已寫出 docs/CITATION-TRIAGE.md（${rows.length} 條待判）`)
}

console.log(`具名引用總數 ${tally.size} 種；只用過一次的 ${rows.length} 條`)
for (const t of order) console.log(`  層 ${t}: ${byTier(t).length}`)
console.log('\n--- 層 A（年代不涵蓋，最可能是錯引）---')
for (const r of byTier('A').slice(0, 20)) {
  console.log(`${r.file}:${r.line} ${r.source}  ${r.why}`)
  console.log(`   ${r.claim.slice(0, 150)}`)
}
