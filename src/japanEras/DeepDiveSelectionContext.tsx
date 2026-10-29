import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

interface DeepDiveSelectionContextValue {
  selectedFaction: string | null
  selectFaction: (id: string | null) => void
}

const DeepDiveSelectionContext =
  createContext<DeepDiveSelectionContextValue | null>(null)

export function DeepDiveSelectionProvider({
  children,
}: {
  children: ReactNode
}) {
  const [selectedFaction, setSelectedFaction] = useState<string | null>(null)
  const selectFaction = useCallback((id: string | null) => {
    setSelectedFaction(id)
  }, [])
  const value = useMemo(
    () => ({ selectedFaction, selectFaction }),
    [selectedFaction, selectFaction],
  )
  return (
    <DeepDiveSelectionContext.Provider value={value}>
      {children}
    </DeepDiveSelectionContext.Provider>
  )
}

export function useDeepDiveSelection() {
  const ctx = useContext(DeepDiveSelectionContext)
  if (!ctx) throw new Error('useDeepDiveSelection must be used within provider')
  return ctx
}
