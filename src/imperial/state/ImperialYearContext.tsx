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
import { enterYear, inMonthZoom, stepTimeline } from '../../lib/monthZoom'
import {
  announceTimeline,
  onTimelineChange,
  readTimelineFromUrl,
} from '../../lib/timelineUrl'
import type { ImperialPack, ImperialSnapshot } from '../types'

interface ImperialYearContextValue {
  pack: ImperialPack
  year: number
  /** 月份（1–12）；該 pack 不按月起快照時為 null。 */
  month: number | null
  setYear: (y: number) => void
  setMonth: (m: number) => void
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
  // 逐月範圍：pack 只要有任一快照以月起效，就全年逐月；否則維持按年。
  const zoom = useMemo(() => {
    if (!pack.snapshots.some((s) => typeof s.month === 'number')) return null
    return { from: pack.yearMin, to: pack.yearMax }
  }, [pack.snapshots, pack.yearMin, pack.yearMax])

  // 初始年與月份以 URL 為準（?y=／?mo=），使逐月連結可以直接分享。
  const [fromUrl] = useState(readTimelineFromUrl)
  const [year, setYearState] = useState(() => {
    const y = fromUrl.year
    if (y === null) return pack.initialYear
    return Math.max(pack.yearMin, Math.min(pack.yearMax, y))
  })
  const [month, setMonthState] = useState<number | null>(() => {
    if (!zoom) return null
    if (fromUrl.month !== null) return fromUrl.month
    return inMonthZoom(fromUrl.year ?? pack.initialYear, zoom.from, zoom.to) ? 1 : null
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
      const clamped = Math.max(pack.yearMin, Math.min(pack.yearMax, Math.round(y)))
      if (!zoom) {
        setYearState(clamped)
        return
      }
      apply(
        enterYear({
          year: clamped,
          zoomFrom: zoom.from,
          zoomTo: zoom.to,
          yearMin: pack.yearMin,
          yearMax: pack.yearMax,
          previousYear: cursor.current.year,
          previousMonth: cursor.current.month,
        }),
      )
    },
    [apply, pack.yearMax, pack.yearMin, zoom],
  )

  const setMonth = useCallback((m: number) => {
    setMonthState(Math.max(1, Math.min(12, Math.round(m))))
  }, [])

  const step = useCallback(
    (dir: -1 | 1) => {
      if (!zoom) {
        setYearState((y) =>
          Math.max(pack.yearMin, Math.min(pack.yearMax, y + dir)),
        )
        return
      }
      const next = stepTimeline({
        ...cursor.current,
        dir,
        zoomFrom: zoom.from,
        zoomTo: zoom.to,
        yearMin: pack.yearMin,
        yearMax: pack.yearMax,
      })
      if (next.year === cursor.current.year && next.month === cursor.current.month) {
        setPlaying(false)
        return
      }
      apply(next)
    },
    [apply, pack.yearMax, pack.yearMin, zoom],
  )

  const togglePlay = useCallback(() => setPlaying((p) => !p), [])

  useEffect(() => {
    if (!playing) return
    // 逐月播放的間隔較短：五年逐月若按年速播放會太慢
    const id = window.setInterval(() => step(1), zoom ? 300 : 500)
    return () => window.clearInterval(id)
  }, [playing, step, zoom])

  // 變更 → 寫入 URL；瀏覽器歷史導覽 → 跟返 URL（由 TopicProvider 廣播）。
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

  const snapshot = resolveImperialSnapshot(pack, year, month)

  const value = useMemo(
    () => ({
      pack,
      year,
      month,
      setYear,
      setMonth,
      step,
      playing,
      togglePlay,
      yearMin: pack.yearMin,
      yearMax: pack.yearMax,
      territoryYear: snapshot.year,
      snapshot,
      control: snapshot.control,
    }),
    [pack, year, month, setYear, setMonth, step, playing, togglePlay, snapshot],
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
