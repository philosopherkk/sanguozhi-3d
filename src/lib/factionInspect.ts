import populationData from '../data/population.json'
import type { EventType, FactionId, PopulationEntry } from '../types/data'
import type { FactionProfile } from './factionYearView'

const censuses = populationData as PopulationEntry[]

const ECONOMY = /糧|屯|戶|賦|租|錢|鹽|鐵|市|倉|田|絹|綿|商|錦/

export interface InspectStat {
  label: '人口' | '戰力'
  headline: string
  detail: string
  source: string
  disputed?: boolean
  badge: string
}

export type ChangeKind = '政治' | '經濟' | '軍事'

export interface InspectChange {
  kind: ChangeKind
  title: string
  text: string
  source: string
  /** 本年紀傳或專條。false 表示沿用該勢力常制。 */
  thisYear: boolean
  disputed?: boolean
}

export interface FactionInspectView {
  population: InspectStat
  military: InspectStat
  changes: InspectChange[]
}

export interface InspectNote {
  title: string
  desc: string
  source: string
  type: EventType
}

function formatCount(n: number): string {
  return n.toLocaleString('zh-Hant')
}

function censusAt(faction: FactionId, year: number): PopulationEntry | undefined {
  return censuses.find((row) => row.faction === faction && row.year === year)
}

function splitLead(text: string): { lead: string; rest: string } {
  const cut = text.indexOf('。')
  if (cut <= 0 || cut > 42) return { lead: text, rest: '' }
  return { lead: text.slice(0, cut), rest: text.slice(cut + 1).trim() }
}

function kindOf(note: InspectNote): ChangeKind {
  if (ECONOMY.test(`${note.title}${note.desc}`)) return '經濟'
  if (note.type === 'war') return '軍事'
  return '政治'
}

function standingChange(
  kind: '政治' | '經濟',
  fact: FactionProfile['politics'],
): InspectChange {
  return {
    kind,
    title: '無本年專條',
    text: fact.text,
    source: fact.source,
    thisYear: false,
    disputed: fact.disputed,
  }
}

export function composeFactionInspect(
  faction: FactionId,
  profile: FactionProfile,
  year: number,
  notes: InspectNote[],
): FactionInspectView {
  const census = censusAt(faction, year)
  const countsThisYear = Boolean(census && !census.disputed)
  const populationLead = splitLead(profile.population.text)
  const militaryLead = splitLead(profile.military.text)

  const population: InspectStat =
    census?.population != null
      ? {
          label: '人口',
          headline: [
            census.households != null ? `戶 ${formatCount(census.households)}` : '',
            `口 ${formatCount(census.population)}`,
          ]
            .filter(Boolean)
            .join(' · '),
          detail: census.note ?? profile.population.text,
          source: census.source,
          disputed: census.disputed,
          badge: countsThisYear ? '本年登記' : '非本年清點',
        }
      : {
          label: '人口',
          headline: '本年無清點',
          detail: populationLead.rest
            ? `${populationLead.lead}。${populationLead.rest}`
            : populationLead.lead,
          source: profile.population.source,
          disputed: profile.population.disputed,
          badge: profile.population.disputed ? '約數' : '紀傳概況',
        }

  const military: InspectStat =
    census?.soldiers != null && countsThisYear
      ? {
          label: '戰力',
          headline: `兵 ${formatCount(census.soldiers)}`,
          detail: profile.military.text,
          source: census.source,
          badge: '本年登記',
        }
      : {
          label: '戰力',
          headline: militaryLead.lead,
          detail: militaryLead.rest,
          source: profile.military.source,
          disputed: profile.military.disputed,
          badge: profile.military.disputed ? '約數' : '紀傳概況',
        }

  const yearFacts = profile.years?.[year]
  const changes: InspectChange[] = []

  if (yearFacts?.politics) {
    changes.push({
      kind: '政治',
      title: '本年政治',
      text: yearFacts.politics.text,
      source: yearFacts.politics.source,
      thisYear: true,
      disputed: yearFacts.politics.disputed,
    })
  }
  if (yearFacts?.economy) {
    changes.push({
      kind: '經濟',
      title: '本年經濟',
      text: yearFacts.economy.text,
      source: yearFacts.economy.source,
      thisYear: true,
      disputed: yearFacts.economy.disputed,
    })
  }

  for (const note of notes) {
    const kind = kindOf(note)
    if (kind === '政治' && yearFacts?.politics) continue
    if (kind === '經濟' && yearFacts?.economy) continue
    changes.push({
      kind,
      title: note.title,
      text: note.desc,
      source: note.source,
      thisYear: true,
    })
  }

  if (!changes.some((item) => item.kind === '政治')) {
    changes.push(standingChange('政治', profile.politics))
  }
  if (!changes.some((item) => item.kind === '經濟')) {
    changes.push(standingChange('經濟', profile.economy))
  }

  return { population, military, changes }
}
