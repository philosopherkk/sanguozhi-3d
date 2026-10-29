import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { ZhouFactionId, ZhouPerson } from '../types'

interface ZhouSelectionContextValue {
  selectedFaction: ZhouFactionId | null
  selectFaction: (f: ZhouFactionId | null) => void
  selectedPerson: ZhouPerson | null
  selectPerson: (p: ZhouPerson | null) => void
}

const ZhouSelectionContext = createContext<ZhouSelectionContextValue | null>(
  null,
)

export function ZhouSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedFaction, setFaction] = useState<ZhouFactionId | null>(null)
  const [selectedPerson, setPerson] = useState<ZhouPerson | null>(null)

  const selectFaction = useCallback((f: ZhouFactionId | null) => {
    setFaction(f)
    if (f) setPerson(null)
  }, [])

  const selectPerson = useCallback((p: ZhouPerson | null) => {
    setPerson(p)
    if (p) setFaction(null)
  }, [])

  const value = useMemo(
    () => ({ selectedFaction, selectFaction, selectedPerson, selectPerson }),
    [selectedFaction, selectFaction, selectedPerson, selectPerson],
  )

  return (
    <ZhouSelectionContext.Provider value={value}>
      {children}
    </ZhouSelectionContext.Provider>
  )
}

export function useZhouSelection() {
  const ctx = useContext(ZhouSelectionContext)
  if (!ctx) {
    throw new Error('useZhouSelection must be used within ZhouSelectionProvider')
  }
  return ctx
}
