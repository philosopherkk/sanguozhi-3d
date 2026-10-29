import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { HeianFactionId } from '../types'

interface HeianSelectionContextValue {
  selectedFaction: HeianFactionId | null
  selectFaction: (f: HeianFactionId | null) => void
}

const HeianSelectionContext = createContext<HeianSelectionContextValue | null>(
  null,
)

export function HeianSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedFaction, setFaction] = useState<HeianFactionId | null>(null)
  const selectFaction = useCallback((f: HeianFactionId | null) => {
    setFaction(f)
  }, [])
  const value = useMemo(
    () => ({ selectedFaction, selectFaction }),
    [selectedFaction, selectFaction],
  )
  return (
    <HeianSelectionContext.Provider value={value}>
      {children}
    </HeianSelectionContext.Provider>
  )
}

export function useHeianSelection() {
  const ctx = useContext(HeianSelectionContext)
  if (!ctx) {
    throw new Error('useHeianSelection must be used within HeianSelectionProvider')
  }
  return ctx
}
