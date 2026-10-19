import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export interface MapViewApi {
  /** Orbit around target: positive = counterclockwise from above */
  yaw: (radians: number) => void
  /** Tilt camera elevation: positive = look more from above (decrease polar) */
  pitch: (radians: number) => void
  reset: () => void
}

interface MapViewContextValue {
  api: MapViewApi | null
  register: (api: MapViewApi | null) => void
}

const MapViewContext = createContext<MapViewContextValue | null>(null)

export function MapViewProvider({ children }: { children: ReactNode }) {
  const [api, setApi] = useState<MapViewApi | null>(null)
  const register = useCallback((next: MapViewApi | null) => setApi(next), [])
  const value = useMemo(() => ({ api, register }), [api, register])
  return (
    <MapViewContext.Provider value={value}>{children}</MapViewContext.Provider>
  )
}

export function useMapView() {
  const ctx = useContext(MapViewContext)
  if (!ctx) throw new Error('useMapView must be used within MapViewProvider')
  return ctx
}

/** Hold-to-repeat helper for view buttons */
export function useHoldRepeat(action: () => void, ms = 50) {
  const timer = useRef<number | null>(null)
  const start = useCallback(() => {
    action()
    timer.current = window.setInterval(action, ms)
  }, [action, ms])
  const stop = useCallback(() => {
    if (timer.current != null) {
      window.clearInterval(timer.current)
      timer.current = null
    }
  }, [])
  return { start, stop }
}
