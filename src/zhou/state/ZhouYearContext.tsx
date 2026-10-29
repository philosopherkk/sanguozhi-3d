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
  firstStageInYear,
  LATE_FROM,
  LATE_STAGES,
  LATE_TO,
  lateStageAt,
  shiftLateStage,
  type LateStage,
} from '../data/lateStages'
import {
  zhouFactionsPresent,
  zhouSnapshotForYear,
  type ZhouControl,
  type ZhouSnapshot,
} from '../data/territoryControl'
import type { ZhouFactionId } from '../types'

interface ZhouYearContextValue {
  year: number
  month: number | null
  setYear: (y: number) => void
  setLateStage: (index: number) => void
  step: (dir: -1 | 1) => void
  playing: boolean
  togglePlay: () => void
  pause: () => void
  yearMin: number
  yearMax: number
  title: string
  territoryYear: number
  snapshot: ZhouSnapshot
  lateStage: LateStage | null
  control: ZhouControl
  activeFactions: ZhouFactionId[]
}

const ZhouYearContext = createContext<ZhouYearContextValue | null>(null)

export function ZhouYearProvider({
  children,
  yearMin = -770,
  yearMax = -221,
  initialYear = -632,
  title = '春秋戰國',
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
  const [month, setMonthState] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const cursor = useRef({ year, month })
  cursor.current = { year, month }

  useEffect(() => {
    setYearState(initialYear)
    setMonthState(null)
    setPlaying(false)
  }, [initialYear, yearMin, yearMax])

  const apply = useCallback((next: { year: number; month: number | null }) => {
    setYearState(next.year)
    setMonthState(next.month)
  }, [])

  const setYear = useCallback(
    (y: number) => {
      const { yearMin: lo, yearMax: hi } = bounds.current
      const yearNext = Math.max(lo, Math.min(hi, Math.round(y)))
      const stage = firstStageInYear(yearNext)
      if (stage) {
        apply({ year: yearNext, month: stage.month })
        return
      }
      apply({ year: yearNext, month: null })
    },
    [apply],
  )

  const setLateStage = useCallback(
    (index: number) => {
      const stage = LATE_STAGES[index]
      if (!stage) return
      apply({ year: stage.year, month: stage.month })
    },
    [apply],
  )

  const step = useCallback(
    (dir: -1 | 1) => {
      const { year: y, month: m } = cursor.current
      const { yearMin: lo, yearMax: hi } = bounds.current
      const inLate = y >= LATE_FROM && y <= LATE_TO && hi >= LATE_FROM
      const entering =
        dir > 0 && hi >= LATE_FROM && y < LATE_FROM && y + 1 >= LATE_FROM && y + 1 <= hi
      if (entering) {
        apply({ year: LATE_STAGES[0].year, month: LATE_STAGES[0].month })
        return
      }
      if (inLate) {
        if (dir < 0 && y === LATE_STAGES[0].year && m === LATE_STAGES[0].month) {
          apply({ year: LATE_FROM - 1, month: null })
          return
        }
        const shifted = shiftLateStage(y, m, dir)
        if (!shifted) {
          if (dir > 0) setPlaying(false)
          return
        }
        apply(shifted)
        return
      }
      const yearNext = Math.max(lo, Math.min(hi, y + dir))
      apply({ year: yearNext, month: null })
      if (dir > 0 && yearNext >= hi) setPlaying(false)
    },
    [apply],
  )

  const pause = useCallback(() => setPlaying(false), [])
  const togglePlay = useCallback(() => setPlaying((p) => !p), [])

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      const { year: y } = cursor.current
      if (y >= bounds.current.yearMax) {
        setPlaying(false)
        return
      }
      step(1)
    }, 700)
    return () => window.clearInterval(id)
  }, [playing, step])

  const lateStage = lateStageAt(year, month)
  const annual = zhouSnapshotForYear(year)
  const snapshot: ZhouSnapshot = lateStage
    ? {
        ...annual,
        year: lateStage.year,
        label: lateStage.label,
        source: lateStage.source,
        note: lateStage.note,
        disputed: lateStage.monthDisputed || annual.disputed,
        control: {},
        ranges: lateStage.ranges,
      }
    : annual
  const control = snapshot.control
  const activeFactions = useMemo(
    () => zhouFactionsPresent(snapshot.ranges),
    [snapshot],
  )

  const value = useMemo(
    () => ({
      year,
      month,
      setYear,
      setLateStage,
      step,
      playing,
      togglePlay,
      pause,
      yearMin,
      yearMax,
      title,
      territoryYear: snapshot.year,
      snapshot,
      lateStage,
      control,
      activeFactions,
    }),
    [
      year,
      month,
      setYear,
      setLateStage,
      step,
      playing,
      togglePlay,
      pause,
      yearMin,
      yearMax,
      title,
      snapshot,
      lateStage,
      control,
      activeFactions,
    ],
  )

  return (
    <ZhouYearContext.Provider value={value}>{children}</ZhouYearContext.Provider>
  )
}

export function useZhouYear() {
  const ctx = useContext(ZhouYearContext)
  if (!ctx) throw new Error('useZhouYear must be used within ZhouYearProvider')
  return ctx
}
