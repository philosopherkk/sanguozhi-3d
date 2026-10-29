import type { SengokuFactionId, SengokuPerson } from '../types'

export function sengokuPeopleActiveInYear(
  people: SengokuPerson[],
  year: number,
): SengokuPerson[] {
  return people.filter((p) => {
    if (p.birth != null && year < p.birth) return false
    if (p.death != null && year > p.death) return false
    return p.faction_by_year.some(
      (t) => year >= t.from && (t.to == null || year <= t.to),
    )
  })
}

export function sengokuFactionAtYear(
  person: SengokuPerson,
  year: number,
): SengokuFactionId | null {
  const hit = person.faction_by_year.find(
    (t) => year >= t.from && (t.to == null || year <= t.to),
  )
  return hit?.faction ?? null
}

export function filterSengokuPeople(
  people: SengokuPerson[],
  year: number,
  faction: SengokuFactionId | null,
  query: string,
): SengokuPerson[] {
  let list = sengokuPeopleActiveInYear(people, year)
  if (faction) {
    list = list.filter((p) => sengokuFactionAtYear(p, year) === faction)
  }
  const q = query.trim()
  if (q) {
    list = list.filter(
      (p) => p.name.includes(q) || (p.aka != null && p.aka.includes(q)),
    )
  }
  return list
}
