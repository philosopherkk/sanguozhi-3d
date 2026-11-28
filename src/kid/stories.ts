/**
 * 簡易版故事資料轉接（純函式，不碰 React，可單獨測試）。
 *
 * 兩個 pack 家族共用同一個輸出形狀：
 * - Imperial（中國晉至共和國）：`desc`＝小學生層、`secondary`、`university`；
 * - DeepDive（日本古墳至江戶、四國 16 個時代）：`readingFor(id).layers`，缺就用 `desc`。
 * 其餘自訂時代（三國、秦漢、周、平安、戰國、幕末、近代）尚未接上，
 * 由外殼改用舊側欄套簡易版皮。
 */
import type { ImperialPack } from '../imperial/types'
import type { JapanDeepDivePack } from '../japanEras/deepDiveTypes'
import type { ReadingLevel } from '../lib/readingPrefs'

export interface KidStory {
  id: string
  year: number
  month: number | null
  title: string
  /** 依閱讀程度選好的一段文字 */
  text: string
  /** 標題提到的人物頭像（找不到就沒有） */
  portrait?: string
}

export interface KidPerson {
  id: string
  name: string
  portrait?: string
  /** 一句簡介 */
  line: string
}

export type KidSource =
  | { kind: 'imperial'; pack: ImperialPack }
  | { kind: 'deep'; pack: JapanDeepDivePack }

interface Named {
  name: string
  portrait?: string
}

/** 取第一句（到第一個句號為止）；整段沒有句號就原樣。 */
export function firstSentence(text: string): string {
  const i = text.search(/[。！？]/)
  return i < 0 ? text.trim() : text.slice(0, i + 1).trim()
}

function portraitFor(title: string, people: Named[]): string | undefined {
  return people.find((p) => p.portrait && title.includes(p.name))?.portrait
}

function byTime(a: KidStory, b: KidStory): number {
  return a.year - b.year || (a.month ?? 0) - (b.month ?? 0)
}

export function storiesFrom(source: KidSource, level: ReadingLevel): KidStory[] {
  if (source.kind === 'imperial') {
    const { pack } = source
    const people = pack.people ?? []
    return pack.events
      .map((e) => {
        const layers = {
          elementary: e.desc,
          secondary: e.secondary || e.desc,
          university: e.university || e.secondary || e.desc,
        }
        return {
          id: e.id,
          year: e.year,
          month: e.month ?? null,
          title: e.title,
          text: layers[level],
          portrait: portraitFor(e.title, people),
        }
      })
      .sort(byTime)
  }
  const { pack } = source
  return pack.events
    .map((e) => {
      const layers = pack.readingFor(e.id)?.layers
      return {
        id: e.id,
        year: e.year,
        month: e.month ?? null,
        title: e.title,
        text: layers?.[level] || e.desc,
        portrait: portraitFor(e.title, pack.people),
      }
    })
    .sort(byTime)
}

export function peopleFrom(source: KidSource): KidPerson[] {
  const list = source.kind === 'imperial' ? (source.pack.people ?? []) : source.pack.people
  return list.map((p) => ({
    id: p.id,
    name: p.name,
    portrait: p.portrait,
    line: firstSentence(p.summary),
  }))
}

/** 當年的故事（同一年可有多件）。 */
export function storiesAt(stories: KidStory[], year: number): KidStory[] {
  return stories.filter((s) => s.year === year)
}

/** 下一個有故事的年份（嚴格大於 `year`）；沒有就 null。 */
export function nextStoryYear(stories: KidStory[], year: number): number | null {
  for (const s of stories) if (s.year > year) return s.year
  return null
}

/** 上一個有故事的年份（嚴格小於 `year`）；沒有就 null。 */
export function prevStoryYear(stories: KidStory[], year: number): number | null {
  let found: number | null = null
  for (const s of stories) {
    if (s.year >= year) break
    found = s.year
  }
  return found
}
