import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { resolveImperialSnapshot } from '../lib/resolveSnapshot'
import type { ImperialPack, ImperialSnapshot } from '../types'

interface ImperialYearContextValue {
  pack: ImperialPack
  year: number
  setYear: (y: number) => void
  step: (dir: -1 | 1) => void
  playing: boolean
  togglePlay: () => void
  yearMin: number
  yearMax: number
  territoryYear: number
  snapshot: ImperialSnapshot
  control: ImperialSnapshot['control']
}

const ImperialYearContext = createContext<ImperialYearContextValue | null>(null)

export function ImperialYearProvider({
  pack,
  children,
}: {
  pack: ImperialPack
  children: ReactNode
}) {
  const [year, setYearState] = useState(pack.initialYear)
  const [playing, setPlaying] = useState(false)
  const yearRef = useRef(year)
  yearRef.current = year

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
      const next = yearRef.current + 1
      if (next > pack.yearMax) {
        setPlaying(false)
        return
      }
      setYearState(next)
    }, 500)
    return () => window.clearInterval(id)
  }, [playing, pack.yearMax])

  const snapshot = resolveImperialSnapshot(pack, year)

  const value = useMemo(
    () => ({
      pack,
      year,
      setYear,
      step,
      playing,
      togglePlay,
      yearMin: pack.yearMin,
      yearMax: pack.yearMax,
      territoryYear: snapshot.year,
      snapshot,
      control: snapshot.control,
    }),
    [pack, year, setYear, step, playing, togglePlay, snapshot],
  )

  return (
    <ImperialYearContext.Provider value={value}>
      {children}
    </ImperialYearContext.Provider>
  )
}

export function useImperialYear() {
  const ctx = useContext(ImperialYearContext)
  if (!ctx) throw new Error('useImperialYear must be used within provider')
  return ctx
}
