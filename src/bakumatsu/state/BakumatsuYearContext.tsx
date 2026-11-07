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
import { enterYear, inMonthZoom, stepTimeline } from '../../lib/monthZoom'
import {
  announceTimeline,
  onTimelineChange,
  readTimelineFromUrl,
} from '../../lib/timelineUrl'
import {
  BAKUMATSU_MONTH_FROM,
  BAKUMATSU_MONTH_TO,
  bakumatsuControlForYear,
  resolveBakumatsuTerritoryYear,
} from '../data/territory'
import type { BakumatsuFactionId } from '../types'

const YEAR_MIN = 1853
const YEAR_MAX = 1868

interface BakumatsuYearContextValue {
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
  control: Record<string, BakumatsuFactionId>
}

const BakumatsuYearContext = createContext<BakumatsuYearContextValue | null>(null)

export function BakumatsuYearProvider({ children }: { children: ReactNode }) {
  // 初始以 URL 為準（?y=／?mo=），以便分享逐月連結（例如 1868 年 12 月）。
  const [fromUrl] = useState(readTimelineFromUrl)
  const [year, setYearState] = useState(() => {
    const y = fromUrl.year
    return y !== null && y >= YEAR_MIN && y <= YEAR_MAX ? y : 1868
  })
  const [month, setMonthState] = useState<number | null>(() => {
    if (fromUrl.month !== null) return fromUrl.month
    return inMonthZoom(fromUrl.year ?? 1868, BAKUMATSU_MONTH_FROM, BAKUMATSU_MONTH_TO)
      ? 1
      : null
  })
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
          zoomFrom: BAKUMATSU_MONTH_FROM,
          zoomTo: BAKUMATSU_MONTH_TO,
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
        zoomFrom: BAKUMATSU_MONTH_FROM,
        zoomTo: BAKUMATSU_MONTH_TO,
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

  // 變更 → 寫入 URL（由 UrlBridge 統一負責）；popstate → 跟隨 URL。
  useEffect(() => {
    announceTimeline({ year, month })
  }, [year, month])
  useEffect(
    () =>
      onTimelineChange((next) => {
        if (next.year === null || (next.year === year && next.month === month)) return
        setYear(next.year)
        if (next.month !== null) setMonth(next.month)
      }),
    [year, month, setYear, setMonth],
  )

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => step(1), 400)
    return () => window.clearInterval(id)
  }, [playing, step])

  const territoryYear = resolveBakumatsuTerritoryYear(year)
  const control = useMemo(
    () => bakumatsuControlForYear(year, month),
    [year, month],
  )

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
    <BakumatsuYearContext.Provider value={value}>
      {children}
    </BakumatsuYearContext.Provider>
  )
}

export function useBakumatsuYear() {
  const ctx = useContext(BakumatsuYearContext)
  if (!ctx) {
    throw new Error('useBakumatsuYear must be used within BakumatsuYearProvider')
  }
  return ctx
}
