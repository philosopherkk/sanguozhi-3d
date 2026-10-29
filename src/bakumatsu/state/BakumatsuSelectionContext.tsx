import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { BakumatsuFactionId } from '../types'

interface BakumatsuSelectionContextValue {
  selectedFaction: BakumatsuFactionId | null
  selectFaction: (f: BakumatsuFactionId | null) => void
}

const BakumatsuSelectionContext =
  createContext<BakumatsuSelectionContextValue | null>(null)

export function BakumatsuSelectionProvider({
  children,
}: {
  children: ReactNode
}) {
  const [selectedFaction, setFaction] = useState<BakumatsuFactionId | null>(null)
  const selectFaction = useCallback((f: BakumatsuFactionId | null) => {
    setFaction(f)
  }, [])
  const value = useMemo(
    () => ({ selectedFaction, selectFaction }),
    [selectedFaction, selectFaction],
  )
  return (
    <BakumatsuSelectionContext.Provider value={value}>
      {children}
    </BakumatsuSelectionContext.Provider>
  )
}

export function useBakumatsuSelection() {
  const ctx = useContext(BakumatsuSelectionContext)
  if (!ctx) {
    throw new Error(
      'useBakumatsuSelection must be used within BakumatsuSelectionProvider',
    )
  }
  return ctx
}
