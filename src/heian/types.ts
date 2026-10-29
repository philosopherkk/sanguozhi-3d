export type HeianFactionId = '平氏' | '源氏' | '朝廷'

export const HEIAN_FACTIONS: {
  id: HeianFactionId
  name: string
  color: string
  activeFrom: number
  activeTo: number
  source: string
}[] = [
  {
    id: '平氏',
    name: '平氏',
    color: '#C2410C',
    activeFrom: 1150,
    activeTo: 1185,
    source: '日本中世史通說：伊勢平氏在保元、平治後掌握朝廷軍權，壇之浦後滅亡',
  },
  {
    id: '源氏',
    name: '源氏',
    color: '#1D4ED8',
    activeFrom: 1150,
    activeTo: 1185,
    source: '日本中世史通說：河內源氏。賴朝自1180年據關東，1185年平氏滅',
  },
  {
    id: '朝廷',
    name: '朝廷',
    color: '#CA8A04',
    activeFrom: 1150,
    activeTo: 1185,
    source: '日本中世史通說：院與天皇仍在京都。色塊是名義核心，不是令制國界',
  },
]
