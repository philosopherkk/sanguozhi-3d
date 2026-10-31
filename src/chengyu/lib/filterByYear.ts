import type { ChengyuEntry, ChengyuLocale } from '../types'

export type { ChengyuLocale }

const NEARBY_RADIUS = 80

function linkYear(entry: ChengyuEntry): number | undefined {
  return entry.eraLink.year
}

export function filterChengyuForPanel(
  entries: ChengyuEntry[],
  locales: ChengyuLocale[],
  year: number,
  yearMin: number,
  yearMax: number,
): { yearMatches: ChengyuEntry[]; nearby: ChengyuEntry[] } {
  const scoped = entries.filter(
    (e) =>
      locales.includes(e.locale) &&
      (e.locale !== 'shared' || locales.includes('shared')),
  )

  const inRange = scoped.filter((e) => {
    const y = linkYear(e)
    if (y === undefined) return true
    return y >= yearMin && y <= yearMax
  })

  const yearMatches = inRange.filter((e) => linkYear(e) === year)

  const nearby = inRange
    .filter((e) => {
      const y = linkYear(e)
      if (y === undefined || y === year) return false
      return Math.abs(y - year) <= NEARBY_RADIUS
    })
    .map((e) => ({ e, dist: Math.abs((linkYear(e) ?? year) - year) }))
    .sort((a, b) => a.dist - b.dist || a.e.lemma.localeCompare(b.e.lemma, 'zh-Hant'))
    .slice(0, 12)
    .map(({ e }) => e)

  return { yearMatches, nearby }
}

export function localesForChinaTrack(): ChengyuLocale[] {
  return ['zh', 'shared']
}

export function localesForJapanTrack(): ChengyuLocale[] {
  return ['jp', 'shared']
}
