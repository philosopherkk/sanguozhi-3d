import { personRank } from '../data/personProfiles'
import { factionsPresent, type ProvinceControl } from '../data/territoryControl'
import type { FactionId, Person } from '../types/data'

/** Alive (if dates known) and holding a faction tenure that covers `year`. */
export function isPersonActiveInYear(person: Person, year: number): boolean {
  if (person.birth != null && person.birth > year) return false
  if (person.death != null && person.death < year) return false
  return person.faction_by_year.some(
    (t) => t.from <= year && (t.to == null || t.to >= year),
  )
}

export function factionOfPersonInYear(
  person: Person,
  year: number,
): FactionId | null {
  const tenure = person.faction_by_year.find(
    (t) => t.from <= year && (t.to == null || t.to >= year),
  )
  return tenure?.faction ?? null
}

export function peopleActiveInYear(people: Person[], year: number): Person[] {
  return people.filter((p) => isPersonActiveInYear(p, year))
}

/** Major factions on the map this year (exclude「其他」unless它是唯一選擇). */
export function majorFactionsForYear(control: ProvinceControl): FactionId[] {
  return factionsPresent(control).filter((f) => f !== '其他')
}

/**
 * People to show in the rail:
 * - If factionFilter set → that faction only, ranked
 * - Else → only major map factions, ranked (leaders first); peripherals hidden until「更多」
 */
export function peopleForDisplay(opts: {
  people: Person[]
  year: number
  control: ProvinceControl
  factionFilter: FactionId | '全部' | null
  includePeripheral: boolean
}): Person[] {
  const { people, year, control, factionFilter, includePeripheral } = opts
  const active = peopleActiveInYear(people, year)
  const majors = new Set(majorFactionsForYear(control))

  let list = active.filter((p) => {
    const fac = factionOfPersonInYear(p, year)
    if (!fac) return false
    if (factionFilter && factionFilter !== '全部') return fac === factionFilter
    if (!includePeripheral && !majors.has(fac)) return false
    // Without faction filter: require major faction OR high rank
    if ((!factionFilter || factionFilter === '全部') && !includePeripheral) {
      return majors.has(fac) && personRank(p.id) >= 68
    }
    return true
  })

  list = [...list].sort((a, b) => {
    const ra = personRank(a.id)
    const rb = personRank(b.id)
    if (rb !== ra) return rb - ra
    return a.name.localeCompare(b.name, 'zh-Hant')
  })

  return list
}
