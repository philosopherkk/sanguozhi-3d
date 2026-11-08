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
import { enterYear, inMonthZoom, stepTimeline } from '../lib/monthZoom'
import {
  announceTimeline,
  onTimelineChange,
  readTimelineFromUrl,
} from '../lib/timelineUrl'

interface DeepDiveYearContextValue {
  year: number
  /** 月份（1–12）；pack 未宣告 monthZoom 或該年不在區間內時為 null */
  month: number | null
  setYear: (y: number) => void
  setMonth: (m: number) => void
  step: (dir: -1 | 1) => void
  playing: boolean
  togglePlay: () => void
  yearMin: number
  yearMax: number
  monthZoom: { from: number; to: number } | null
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
  const zoom = pack.monthZoom ?? null
  // 初始年／月以 URL 為準（?y=、?mo=），使「?e=modern&y=1942」等分享連結直落該時點。
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

  /** 年＋月一起算，避免滑桿拖動時把月份重置回 1 月。 */
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
          previousYear: year,
          previousMonth: month,
        }),
      )
    },
    [apply, month, pack.yearMax, pack.yearMin, year, zoom],
  )

  const setMonth = useCallback((m: number) => {
    setMonthState(Math.max(1, Math.min(12, Math.round(m))))
  }, [])

  const step = useCallback(
    (dir: -1 | 1) => {
      if (!zoom) {
        setYearState((y) => Math.max(pack.yearMin, Math.min(pack.yearMax, y + dir)))
        return
      }
      const next = stepTimeline({
        year,
        month,
        dir,
        zoomFrom: zoom.from,
        zoomTo: zoom.to,
        yearMin: pack.yearMin,
        yearMax: pack.yearMax,
      })
      apply(next)
    },
    [apply, month, pack.yearMax, pack.yearMin, year, zoom],
  )

  const togglePlay = useCallback(() => setPlaying((p) => !p), [])

  // 變更 → 寫入 URL；popstate／同文件切換 → 跟隨 URL。
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
    [month, setMonth, setYear, year],
  )

  useEffect(() => {
    if (!playing) return
    // 逐月播放間隔較短：月級時代若以年速播放會過於緩慢
    const id = window.setInterval(() => {
      step(1)
      if (year >= pack.yearMax && (month === null || month >= 12)) setPlaying(false)
    }, zoom ? 300 : 900)
    return () => window.clearInterval(id)
  }, [playing, step, zoom, year, month, pack.yearMax])

  const territoryYear = resolveKeyYear(year, pack.keyYears)
  const monthKey = month === null ? null : `${year}-${String(month).padStart(2, '0')}`
  const control =
    (monthKey ? pack.territoryByMonth?.[monthKey] : undefined) ??
    pack.territoryByYear[territoryYear] ??
    {}
  const shadeNote =
    (monthKey ? pack.shadeNotesByMonth?.[monthKey] : undefined) ??
    pack.shadeNotes[territoryYear] ??
    '色塊為示意，大於實控。'

  const value = useMemo(
    () => ({
      year,
      month,
      setYear,
      setMonth,
      step,
      playing,
      togglePlay,
      yearMin: pack.yearMin,
      yearMax: pack.yearMax,
      monthZoom: zoom,
      territoryYear,
      control,
      shadeNote,
      pack,
    }),
    [
      year,
      month,
      setYear,
      setMonth,
      step,
      playing,
      togglePlay,
      pack,
      zoom,
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
