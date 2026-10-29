import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

interface ImperialSelectionContextValue {
  selectedFaction: string | null
  selectFaction: (id: string | null) => void
}

const ImperialSelectionContext =
  createContext<ImperialSelectionContextValue | null>(null)

export function ImperialSelectionProvider({
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
    <ImperialSelectionContext.Provider value={value}>
      {children}
    </ImperialSelectionContext.Provider>
  )
}

export function useImperialSelection() {
  const ctx = useContext(ImperialSelectionContext)
  if (!ctx) throw new Error('useImperialSelection must be used within provider')
  return ctx
}
