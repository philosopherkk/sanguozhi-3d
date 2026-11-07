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
import {
  announceTimeline,
  onTimelineChange,
  readTimelineFromUrl,
} from '../lib/timelineUrl'

interface DeepDiveYearContextValue {
  year: number
  setYear: (y: number) => void
  step: (dir: -1 | 1) => void
  playing: boolean
  togglePlay: () => void
  yearMin: number
  yearMax: number
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
  // 初始年以 URL 為準（?y=），使「?e=modern&y=1942」等分享連結直落該年。
  const [year, setYearState] = useState(() => {
    const y = readTimelineFromUrl().year
    if (y === null) return pack.initialYear
    return Math.max(pack.yearMin, Math.min(pack.yearMax, y))
  })
  const [playing, setPlaying] = useState(false)

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

  // 變更 → 寫入 URL；popstate／同文件切換 → 跟返 URL。
  useEffect(() => {
    announceTimeline({ year, month: null })
  }, [year])
  useEffect(
    () =>
      onTimelineChange((next) => {
        if (next.year === null || next.year === year) return
        setYear(next.year)
      }),
    [year, setYear],
  )

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      setYearState((y) => {
        if (y >= pack.yearMax) {
          setPlaying(false)
          return y
        }
        return y + 1
      })
    }, 900)
    return () => window.clearInterval(id)
  }, [playing, pack.yearMax])

  const territoryYear = resolveKeyYear(year, pack.keyYears)
  const control = pack.territoryByYear[territoryYear] ?? {}
  const shadeNote =
    pack.shadeNotes[territoryYear] ?? '色塊為示意，大於實控。'

  const value = useMemo(
    () => ({
      year,
      setYear,
      step,
      playing,
      togglePlay,
      yearMin: pack.yearMin,
      yearMax: pack.yearMax,
      territoryYear,
      control,
      shadeNote,
      pack,
    }),
    [
      year,
      setYear,
      step,
      playing,
      togglePlay,
      pack,
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
