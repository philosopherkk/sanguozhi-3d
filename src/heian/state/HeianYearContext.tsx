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
import { enterYear, stepTimeline } from '../../lib/monthZoom'
import {
  HEIAN_MONTH_FROM,
  HEIAN_MONTH_TO,
  heianControlForYear,
  resolveHeianTerritoryYear,
} from '../data/territory'
import type { HeianFactionId } from '../types'

const YEAR_MIN = 1150
const YEAR_MAX = 1185

interface HeianYearContextValue {
  year: number
  month: number | null
  setYear: (y: number) => void
  setMonth: (m: number) => void
  step: (dir: -1 | 1) => void
  playing: boolean
  togglePlay: () => void
  yearMin: number
  yearMax: number
  territoryYear: number
  control: Record<string, HeianFactionId>
}

const HeianYearContext = createContext<HeianYearContextValue | null>(null)

export function HeianYearProvider({ children }: { children: ReactNode }) {
  const [year, setYearState] = useState(1184)
  const [month, setMonthState] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const cursor = useRef({ year, month })
  cursor.current = { year, month }

  const apply = useCallback((next: { year: number; month: number | null }) => {
    setYearState(next.year)
    setMonthState(next.month)
  }, [])

  const setYear = useCallback(
    (y: number) => {
      apply(
        enterYear({
          year: y,
          zoomFrom: HEIAN_MONTH_FROM,
          zoomTo: HEIAN_MONTH_TO,
          yearMin: YEAR_MIN,
          yearMax: YEAR_MAX,
          previousYear: cursor.current.year,
          previousMonth: cursor.current.month,
        }),
      )
    },
    [apply],
  )

  const setMonth = useCallback((m: number) => {
    setMonthState(Math.max(1, Math.min(12, Math.round(m))))
  }, [])

  const step = useCallback(
    (dir: -1 | 1) => {
      const next = stepTimeline({
        ...cursor.current,
        dir,
        zoomFrom: HEIAN_MONTH_FROM,
        zoomTo: HEIAN_MONTH_TO,
        yearMin: YEAR_MIN,
        yearMax: YEAR_MAX,
      })
      if (next.year === cursor.current.year && next.month === cursor.current.month) {
        setPlaying(false)
        return
      }
      apply(next)
    },
    [apply],
  )

  const togglePlay = useCallback(() => setPlaying((p) => !p), [])

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => step(1), 400)
    return () => window.clearInterval(id)
  }, [playing, step])

  const territoryYear = resolveHeianTerritoryYear(year)
  const control = useMemo(() => heianControlForYear(year, month), [year, month])

  const value = useMemo(
    () => ({
      year,
      month,
      setYear,
      setMonth,
      step,
      playing,
      togglePlay,
      yearMin: YEAR_MIN,
      yearMax: YEAR_MAX,
      territoryYear,
      control,
    }),
    [year, month, setYear, setMonth, step, playing, togglePlay, territoryYear, control],
  )

  return (
    <HeianYearContext.Provider value={value}>{children}</HeianYearContext.Provider>
  )
}

export function useHeianYear() {
  const ctx = useContext(HeianYearContext)
  if (!ctx) throw new Error('useHeianYear must be used within HeianYearProvider')
  return ctx
}
