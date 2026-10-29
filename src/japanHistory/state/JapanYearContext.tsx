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
import { JAPAN_KEY_YEARS, JAPAN_YEAR_MAX, JAPAN_YEAR_MIN } from '../data/eras'

interface JapanYearContextValue {
  year: number
  setYear: (y: number) => void
  yearMin: number
  yearMax: number
  playing: boolean
  togglePlay: () => void
  keyYear: number
}

const JapanYearContext = createContext<JapanYearContextValue | null>(null)

function nearestKey(year: number): number {
  let best: number = JAPAN_KEY_YEARS[0]
  let bestDist = Math.abs(year - best)
  for (const k of JAPAN_KEY_YEARS) {
    const d = Math.abs(year - k)
    if (d < bestDist) {
      best = k
      bestDist = d
    }
  }
  return best
}

export function JapanYearProvider({
  children,
  initialYear = 1467,
  yearMin = JAPAN_YEAR_MIN,
  yearMax = JAPAN_YEAR_MAX,
}: {
  children: ReactNode
  initialYear?: number
  yearMin?: number
  yearMax?: number
}) {
  const bounds = useRef({ yearMin, yearMax })
  bounds.current = { yearMin, yearMax }
  const [year, setYearState] = useState(initialYear)
  const [playing, setPlaying] = useState(false)
  const timer = useRef<number | null>(null)

  const setYear = useCallback((y: number) => {
    const { yearMin: lo, yearMax: hi } = bounds.current
    setYearState(Math.min(hi, Math.max(lo, Math.round(y))))
  }, [])

  const togglePlay = useCallback(() => setPlaying((p) => !p), [])

  useEffect(() => {
    if (!playing) {
      if (timer.current != null) window.clearInterval(timer.current)
      timer.current = null
      return
    }
    timer.current = window.setInterval(() => {
      setYearState((y) => {
        const hi = bounds.current.yearMax
        if (y >= hi) {
          setPlaying(false)
          return y
        }
        const step = y < 600 ? 20 : y < 1500 ? 10 : 2
        return Math.min(hi, y + step)
      })
    }, 400)
    return () => {
      if (timer.current != null) window.clearInterval(timer.current)
    }
  }, [playing])

  const value = useMemo(
    () => ({
      year,
      setYear,
      yearMin,
      yearMax,
      playing,
      togglePlay,
      keyYear: nearestKey(year),
    }),
    [year, setYear, yearMin, yearMax, playing, togglePlay],
  )

  return (
    <JapanYearContext.Provider value={value}>{children}</JapanYearContext.Provider>
  )
}

export function useJapanYear() {
  const ctx = useContext(JapanYearContext)
  if (!ctx) throw new Error('useJapanYear must be used within JapanYearProvider')
  return ctx
}
