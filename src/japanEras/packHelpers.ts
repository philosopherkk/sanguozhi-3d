import type { FactionProfile } from '../lib/factionYearView'
import type { EraDetail, EraReading } from './types'

export function fact(text: string, source: string, disputed?: boolean) {
  return disputed
    ? { text, source, disputed: true as const }
    : { text, source }
}

export function profile(parts: {
  population: ReturnType<typeof fact>
  military: ReturnType<typeof fact>
  grain: ReturnType<typeof fact>
  politics: ReturnType<typeof fact>
  economy: ReturnType<typeof fact>
}): FactionProfile {
  return parts
}

export function noDetail(_id: string): EraDetail | undefined {
  return undefined
}

export function noReading(_id: string): EraReading | undefined {
  return undefined
}
