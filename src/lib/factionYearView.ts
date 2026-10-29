/** 勢力詳情。數字只在史書有登記時寫出，其餘用紀傳能支持的概況。 */

export interface Fact {
  text: string
  source: string
  disputed?: boolean
}

export interface FactionProfile {
  population: Fact
  military: Fact
  grain: Fact
  politics: Fact
  economy: Fact
  years?: Partial<Record<number, { politics?: Fact; economy?: Fact }>>
}

export interface YearNote {
  title: string
  desc: string
  source: string
}

export interface FactionYearView {
  population: Fact
  military: Fact
  grain: Fact
  politics: Fact
  economy: Fact
  eraIntro?: Fact
}

const ECONOMY = /糧|屯|戶|賦|租|錢|鹽|鐵|市|倉|田|絹|綿|商/

function yearFact(
  profile: FactionProfile,
  year: number,
  field: 'politics' | 'economy',
): Fact | undefined {
  return profile.years?.[year]?.[field]
}

export function composeFactionYear(
  profile: FactionProfile,
  year: number,
  notes: YearNote[],
): FactionYearView {
  const politicsHit = yearFact(profile, year, 'politics')
  const economyHit = yearFact(profile, year, 'economy')
  const economyNotes = notes.filter((note) => ECONOMY.test(`${note.title}${note.desc}`))
  const politicsText = notes
    .map((note) => `${note.title}：${note.desc}`)
    .join(' ')

  const politics: Fact = politicsHit
    ? politicsHit
    : notes.length > 0
      ? {
          text: politicsText,
          source: notes.map((note) => note.source).join('；'),
        }
      : {
          text: `本年紀傳無另立政治專條。${profile.politics.text}`,
          source: profile.politics.source,
          disputed: profile.politics.disputed,
        }

  const economy: Fact = economyHit
    ? economyHit
    : economyNotes.length > 0
      ? {
          text: economyNotes
            .map((note) => `${note.title}：${note.desc}`)
            .join(' '),
          source: economyNotes.map((note) => note.source).join('；'),
        }
      : {
          text: `本年紀傳無另立經濟專條。${profile.economy.text}`,
          source: profile.economy.source,
          disputed: profile.economy.disputed,
        }

  return {
    population: profile.population,
    military: profile.military,
    grain: profile.grain,
    politics,
    economy,
  }
}
