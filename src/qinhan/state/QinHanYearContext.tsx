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
  qinHanFactionsPresent,
  qinHanSnapshotForYear,
  type QinHanControl,
  type QinHanSnapshot,
} from '../data/territoryControl'
import type { QinHanFactionId } from '../types'

interface QinHanYearContextValue {
  year: number
  setYear: (y: number) => void
  playing: boolean
  togglePlay: () => void
  pause: () => void
  yearMin: number
  yearMax: number
  title: string
  territoryYear: number
  snapshot: QinHanSnapshot
  control: QinHanControl
  activeFactions: QinHanFactionId[]
}

const QinHanYearContext = createContext<QinHanYearContextValue | null>(null)

export function QinHanYearProvider({
  children,
  yearMin = -221,
  yearMax = 183,
  initialYear = -221,
  title = '秦漢',
}: {
  children: ReactNode
  yearMin?: number
  yearMax?: number
  initialYear?: number
  title?: string
}) {
  const bounds = useRef({ yearMin, yearMax })
  bounds.current = { yearMin, yearMax }
  const [year, setYearState] = useState(initialYear)
  const [playing, setPlaying] = useState(false)
  const yearRef = useRef(year)
  yearRef.current = year

  useEffect(() => {
    setYearState(initialYear)
    setPlaying(false)
  }, [initialYear, yearMin, yearMax])

  const setYear = useCallback((y: number) => {
    const { yearMin: lo, yearMax: hi } = bounds.current
    setYearState(Math.max(lo, Math.min(hi, Math.round(y))))
  }, [])

  const pause = useCallback(() => setPlaying(false), [])
  const togglePlay = useCallback(() => setPlaying((p) => !p), [])

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      const next = yearRef.current + 1
      if (next > bounds.current.yearMax) {
        setPlaying(false)
        return
      }
      setYearState(next)
    }, 360)
    return () => window.clearInterval(id)
  }, [playing])

  const snapshot = qinHanSnapshotForYear(year)
  const control = snapshot.control
  const activeFactions = useMemo(
    () => qinHanFactionsPresent(snapshot.ranges),
    [snapshot],
  )

  const value = useMemo(
    () => ({
      year,
      setYear,
      playing,
      togglePlay,
      pause,
      yearMin,
      yearMax,
      title,
      territoryYear: snapshot.year,
      snapshot,
      control,
      activeFactions,
    }),
    [
      year,
      setYear,
      playing,
      togglePlay,
      pause,
      yearMin,
      yearMax,
      title,
      snapshot,
      control,
      activeFactions,
    ],
  )

  return (
    <QinHanYearContext.Provider value={value}>
      {children}
    </QinHanYearContext.Provider>
  )
}

export function useQinHanYear() {
  const ctx = useContext(QinHanYearContext)
  if (!ctx) throw new Error('useQinHanYear must be used within QinHanYearProvider')
  return ctx
}
