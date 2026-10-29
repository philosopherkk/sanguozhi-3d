import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { SengokuFactionId, SengokuPerson } from '../types'

interface SengokuSelectionContextValue {
  selectedFaction: SengokuFactionId | null
  selectFaction: (f: SengokuFactionId | null) => void
  selectedPerson: SengokuPerson | null
  selectPerson: (p: SengokuPerson | null) => void
}

const SengokuSelectionContext =
  createContext<SengokuSelectionContextValue | null>(null)

export function SengokuSelectionProvider({
  children,
}: {
  children: ReactNode
}) {
  const [selectedFaction, setFaction] = useState<SengokuFactionId | null>(null)
  const [selectedPerson, setPerson] = useState<SengokuPerson | null>(null)

  const selectFaction = useCallback((f: SengokuFactionId | null) => {
    setFaction(f)
    if (f) setPerson(null)
  }, [])

  const selectPerson = useCallback((p: SengokuPerson | null) => {
    setPerson(p)
    if (p) setFaction(null)
  }, [])

  const value = useMemo(
    () => ({
      selectedFaction,
      selectFaction,
      selectedPerson,
      selectPerson,
    }),
    [selectedFaction, selectFaction, selectedPerson, selectPerson],
  )

  return (
    <SengokuSelectionContext.Provider value={value}>
      {children}
    </SengokuSelectionContext.Provider>
  )
}

export function useSengokuSelection() {
  const ctx = useContext(SengokuSelectionContext)
  if (!ctx) {
    throw new Error(
      'useSengokuSelection must be used within SengokuSelectionProvider',
    )
  }
  return ctx
}
