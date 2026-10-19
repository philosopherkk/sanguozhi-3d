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
import {
  controlForYear,
  factionsPresent,
  resolveTerritoryYear,
  type ProvinceControl,
} from '../data/territoryControl'
import type { FactionId } from '../types/data'

const YEAR_MIN = 184
const YEAR_MAX = 280

interface YearContextValue {
  year: number
  setYear: (y: number) => void
  playing: boolean
  togglePlay: () => void
  pause: () => void
  yearMin: number
  yearMax: number
  territoryYear: number
  control: ProvinceControl
  activeFactions: FactionId[]
}

const YearContext = createContext<YearContextValue | null>(null)

export function YearProvider({ children }: { children: ReactNode }) {
  const [year, setYearState] = useState(208)
  const [playing, setPlaying] = useState(false)
  const yearRef = useRef(year)
  yearRef.current = year

  const setYear = useCallback((y: number) => {
    setYearState(Math.max(YEAR_MIN, Math.min(YEAR_MAX, Math.round(y))))
  }, [])

  const pause = useCallback(() => setPlaying(false), [])
  const togglePlay = useCallback(() => setPlaying((p) => !p), [])

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      const next = yearRef.current + 1
      if (next > YEAR_MAX) {
        setPlaying(false)
        return
      }
      setYearState(next)
    }, 420)
    return () => window.clearInterval(id)
  }, [playing])

  const territoryYear = resolveTerritoryYear(year)
  const control = useMemo(() => controlForYear(year), [year])
  const activeFactions = useMemo(() => factionsPresent(control), [control])

  const value = useMemo(
    () => ({
      year,
      setYear,
      playing,
      togglePlay,
      pause,
      yearMin: YEAR_MIN,
      yearMax: YEAR_MAX,
      territoryYear,
      control,
      activeFactions,
    }),
    [year, setYear, playing, togglePlay, pause, territoryYear, control, activeFactions],
  )

  return <YearContext.Provider value={value}>{children}</YearContext.Provider>
}

export function useYear() {
  const ctx = useContext(YearContext)
  if (!ctx) throw new Error('useYear must be used within YearProvider')
  return ctx
}
