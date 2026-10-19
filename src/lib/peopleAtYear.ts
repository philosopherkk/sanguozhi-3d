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
