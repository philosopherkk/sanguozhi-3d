#!/usr/bin/env node
/**
 * kid_stories_selftest.mjs — 簡易版故事轉接自測（經 vite runnerImport 直接載 TS，唔使建置）。
 *
 *   node scripts/kid_stories_selftest.mjs
 *
 * 由 src/kid/useKidStories.ts 嘅 LOADERS 抽出每個時代嘅 pack 路徑與匯出名，逐個：
 *   - 三種程度都出到故事，每件都有 id／title／text，按年份排好；
 *   - 程度真係有分別（至少一件 elementary 同 university 文字唔同；全部一樣即轉接漏層）；
 *   - prevStoryYear／nextStoryYear／storiesAt 喺邊界上行為正確。
 * 另外 純函式單元：firstSentence、空清單、同年多件。任何一項失敗 exit 1。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runnerImport } from 'vite'

const ROOT = join(fileURLToPath(import.meta.url), '..', '..')
const load = async (p) => (await runnerImport(p, { root: ROOT, logLevel: 'silent' })).module

const S = await load('/src/kid/stories.ts')
let bad = 0
const ok = (cond, msg) => {
  if (!cond) {
    bad++
    console.log(`  ✗ ${msg}`)
  }
}

// 純函式
ok(S.firstSentence('甲。乙。') === '甲。', 'firstSentence 取第一句')
ok(S.firstSentence('冇句號') === '冇句號', 'firstSentence 冇句號原樣')
const fake = [
  { id: 'a', year: -10, month: null, title: 'a', text: 'a' },
  { id: 'b', year: 5, month: null, title: 'b', text: 'b' },
  { id: 'c', year: 5, month: 3, title: 'c', text: 'c' },
  { id: 'd', year: 9, month: null, title: 'd', text: 'd' },
]
ok(S.nextStoryYear(fake, -100) === -10, 'nextStoryYear 由最早之前')
ok(S.nextStoryYear(fake, 5) === 9, 'nextStoryYear 嚴格大於（同年多件不停）')
ok(S.nextStoryYear(fake, 9) === null, 'nextStoryYear 最尾回 null')
ok(S.prevStoryYear(fake, 5) === -10, 'prevStoryYear 嚴格小於')
ok(S.prevStoryYear(fake, -10) === null, 'prevStoryYear 最頭回 null')
ok(S.storiesAt(fake, 5).length === 2, 'storiesAt 同年多件')
ok(S.nextStoryYear([], 0) === null && S.prevStoryYear([], 0) === null, '空清單')

// 每個時代
const src = readFileSync(join(ROOT, 'src/kid/useKidStories.ts'), 'utf8')
const loaders = [
  ...src.matchAll(/ {2}(\w+): \(\) =>\s+import\('\.\.\/([^']+)'\)\.then\(\(m\) => (imperial|deep)\(m\.(\w+)\)\)/g),
]
ok(loaders.length >= 30, `LOADERS 抽到 ${loaders.length} 個（應 ≥ 30）`)
for (const [, era, path, kind, name] of loaders) {
  const pack = (await load(`/src/${path}.ts`))[name]
  if (!pack) {
    ok(false, `${era}：${path} 冇匯出 ${name}`)
    continue
  }
  const source = { kind, pack }
  const by = Object.fromEntries(
    ['elementary', 'secondary', 'university'].map((lv) => [lv, S.storiesFrom(source, lv)]),
  )
  const list = by.elementary
  ok(list.length > 0, `${era}：冇故事`)
  ok(list.every((s) => s.id && s.title && s.text), `${era}：有故事缺 id／title／text`)
  ok(list.every((s, i) => i === 0 || list[i - 1].year <= s.year), `${era}：未按年份排`)
  ok(
    list.some((s, i) => s.text !== by.university[i].text),
    `${era}：elementary 同 university 全部一樣（漏層）`,
  )
  const people = S.peopleFrom(source)
  ok(people.every((p) => p.id && p.name), `${era}：人物缺 id／name`)
  if (list.length) {
    const first = list[0].year
    ok(S.nextStoryYear(list, first - 1) === first, `${era}：nextStoryYear(首年-1) 應回首年`)
  }
}

console.log(`kid_stories_selftest — ${loaders.length} 個時代，失敗 ${bad} 項`)
process.exit(bad ? 1 : 0)
