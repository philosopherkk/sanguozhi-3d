/**
 * audit-event-depth-jp.ts — 平安／幕末／戰國／日本戰爭 四模組的事件三段深度。
 * 這四個模組用同一套 ClassicDetailModal（causes/course/outcome），
 * 但 `audit-event-depth.ts` 只掃十個帝國包＋六個時代包，掃不到它們。
 * 門檻與主閘門一致：起因≥200／經過≥200／結果≥400 字。
 */
import { HEIAN_EVENTS, heianDetailFor } from '../src/heian/data/history'
import { BAKUMATSU_EVENTS, bakumatsuDetailFor } from '../src/bakumatsu/data/history'
import { SENGOKU_TIMELINE_DETAILS } from '../src/sengoku/data/timelineDetails'
import { JAPAN_WAR_DETAILS } from '../src/japanHistory/data/warDetails'
import { enforceGate } from './lib/gate-baseline.ts'

const MIN_CAUSES = 200, MIN_COURSE = 200, MIN_OUTCOME = 400
const L = (v?: string) => (v ?? '').trim().length
const groups: { name: string; items: { id: string; causes?: string; course?: string; outcome?: string }[] }[] = [
  { name: '平安', items: (HEIAN_EVENTS as any[]).map((e) => ({ id: e.id, ...(heianDetailFor(e.id) ?? {}) })) },
  { name: '幕末', items: (BAKUMATSU_EVENTS as any[]).map((e) => ({ id: e.id, ...(bakumatsuDetailFor(e.id) ?? {}) })) },
  { name: '日本戰爭', items: Object.entries(JAPAN_WAR_DETAILS as any).map(([id, d]) => ({ id, ...(d ?? {}) })) },
  { name: '戰國', items: Object.entries(SENGOKU_TIMELINE_DETAILS as any).map(([id, d]) => ({ id, ...(d ?? {}) })) },
]
let bad = 0, total = 0
console.log('audit:event-depth-jp — 平安／幕末／戰國／日本戰爭（起因≥200／經過≥200／結果≥400 字）\n')
console.log('群組\t條數\t起因不足\t經過不足\t結果不足\t無深度解讀')
for (const g of groups) {
  let c = 0, k = 0, o = 0, none = 0
  for (const d of g.items) {
    if (!d.causes) none++
    if (L(d.causes) < MIN_CAUSES) c++
    if (L(d.course) < MIN_COURSE) k++
    if (L(d.outcome) < MIN_OUTCOME) o++
  }
  bad += c; total += g.items.length
  console.log(`${g.name}\t${g.items.length}\t${c}\t${k}\t${o}\t${none}`)
}
console.log(`\n合計 ${total} 條：起因不足 ${bad} 條`)
if (enforceGate('audit:event-depth-jp', bad, process.argv.slice(2))) process.exitCode = 1
