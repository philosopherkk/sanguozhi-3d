import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type MapMode = '2d' | '3d'

interface MapModeContextValue {
  mode: MapMode
  setMode: (m: MapMode) => void
}

const MapModeContext = createContext<MapModeContextValue | null>(null)

export function MapModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<MapMode>('2d')
  const setMode = useCallback((m: MapMode) => setModeState(m), [])
  const value = useMemo(() => ({ mode, setMode }), [mode, setMode])
  return (
    <MapModeContext.Provider value={value}>{children}</MapModeContext.Provider>
  )
}

export function useMapMode() {
  const ctx = useContext(MapModeContext)
  if (!ctx) throw new Error('useMapMode must be used within MapModeProvider')
  return ctx
}
