import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { JapanDeepDivePack } from './deepDiveTypes'
import { resolveKeyYear } from './jpDomains'

interface DeepDiveYearContextValue {
  year: number
  setYear: (y: number) => void
  step: (dir: -1 | 1) => void
  playing: boolean
  togglePlay: () => void
  yearMin: number
  yearMax: number
  territoryYear: number
  control: Record<string, string>
  shadeNote: string
  pack: JapanDeepDivePack
}

const DeepDiveYearContext = createContext<DeepDiveYearContextValue | null>(null)

export function DeepDiveYearProvider({
  pack,
  children,
}: {
  pack: JapanDeepDivePack
  children: ReactNode
}) {
  const [year, setYearState] = useState(pack.initialYear)
  const [playing, setPlaying] = useState(false)

  const setYear = useCallback(
    (y: number) => {
      setYearState(Math.max(pack.yearMin, Math.min(pack.yearMax, Math.round(y))))
    },
    [pack.yearMax, pack.yearMin],
  )

  const step = useCallback(
    (dir: -1 | 1) => {
      setYearState((y) =>
        Math.max(pack.yearMin, Math.min(pack.yearMax, y + dir)),
      )
    },
    [pack.yearMax, pack.yearMin],
  )

  const togglePlay = useCallback(() => setPlaying((p) => !p), [])

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      setYearState((y) => {
        if (y >= pack.yearMax) {
          setPlaying(false)
          return y
        }
        return y + 1
      })
    }, 900)
    return () => window.clearInterval(id)
  }, [playing, pack.yearMax])

  const territoryYear = resolveKeyYear(year, pack.keyYears)
  const control = pack.territoryByYear[territoryYear] ?? {}
  const shadeNote =
    pack.shadeNotes[territoryYear] ?? '色塊為示意，大於實控。'

  const value = useMemo(
    () => ({
      year,
      setYear,
      step,
      playing,
      togglePlay,
      yearMin: pack.yearMin,
      yearMax: pack.yearMax,
      territoryYear,
      control,
      shadeNote,
      pack,
    }),
    [
      year,
      setYear,
      step,
      playing,
      togglePlay,
      pack,
      territoryYear,
      control,
      shadeNote,
    ],
  )

  return (
    <DeepDiveYearContext.Provider value={value}>
      {children}
    </DeepDiveYearContext.Provider>
  )
}

export function useDeepDiveYear() {
  const ctx = useContext(DeepDiveYearContext)
  if (!ctx) throw new Error('useDeepDiveYear must be used within provider')
  return ctx
}
