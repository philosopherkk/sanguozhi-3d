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
  resolveSengokuTerritoryYear,
  sengokuControlForYear,
  sengokuFactionsPresent,
  type SengokuRegionControl,
} from '../data/territoryControl'
import type { SengokuFactionId } from '../types'

const YEAR_MIN = 1467
/** 1573 起見「安土桃山」專題。 */
const YEAR_MAX = 1572

interface SengokuYearContextValue {
  year: number
  setYear: (y: number) => void
  monthFilter: number | null
  setMonthFilter: (m: number | null) => void
  playing: boolean
  togglePlay: () => void
  pause: () => void
  yearMin: number
  yearMax: number
  territoryYear: number
  control: SengokuRegionControl
  activeFactions: SengokuFactionId[]
}

const SengokuYearContext = createContext<SengokuYearContextValue | null>(null)

export function SengokuYearProvider({ children }: { children: ReactNode }) {
  const [year, setYearState] = useState(1573)
  const [monthFilter, setMonthFilterState] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const yearRef = useRef(year)
  yearRef.current = year

  const setYear = useCallback((y: number) => {
    setYearState(Math.max(YEAR_MIN, Math.min(YEAR_MAX, Math.round(y))))
    setMonthFilterState(null)
  }, [])

  const setMonthFilter = useCallback((m: number | null) => {
    setMonthFilterState(m == null ? null : Math.max(1, Math.min(12, Math.round(m))))
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
    }, 400)
    return () => window.clearInterval(id)
  }, [playing])

  const territoryYear = resolveSengokuTerritoryYear(year)
  const control = useMemo(() => sengokuControlForYear(year), [year])
  const activeFactions = useMemo(
    () => sengokuFactionsPresent(control),
    [control],
  )

  const value = useMemo(
    () => ({
      year,
      setYear,
      monthFilter,
      setMonthFilter,
      playing,
      togglePlay,
      pause,
      yearMin: YEAR_MIN,
      yearMax: YEAR_MAX,
      territoryYear,
      control,
      activeFactions,
    }),
    [
      year,
      setYear,
      monthFilter,
      setMonthFilter,
      playing,
      togglePlay,
      pause,
      territoryYear,
      control,
      activeFactions,
    ],
  )

  return (
    <SengokuYearContext.Provider value={value}>
      {children}
    </SengokuYearContext.Provider>
  )
}

export function useSengokuYear() {
  const ctx = useContext(SengokuYearContext)
  if (!ctx) {
    throw new Error('useSengokuYear must be used within SengokuYearProvider')
  }
  return ctx
}
