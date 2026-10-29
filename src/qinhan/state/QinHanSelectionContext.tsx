import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { QinHanFactionId, QinHanPerson } from '../types'

interface QinHanSelectionContextValue {
  selectedFaction: QinHanFactionId | null
  selectFaction: (f: QinHanFactionId | null) => void
  selectedPerson: QinHanPerson | null
  selectPerson: (p: QinHanPerson | null) => void
}

const QinHanSelectionContext = createContext<QinHanSelectionContextValue | null>(
  null,
)

export function QinHanSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedFaction, setFaction] = useState<QinHanFactionId | null>(null)
  const [selectedPerson, setPerson] = useState<QinHanPerson | null>(null)

  const selectFaction = useCallback((f: QinHanFactionId | null) => {
    setFaction(f)
    if (f) setPerson(null)
  }, [])

  const selectPerson = useCallback((p: QinHanPerson | null) => {
    setPerson(p)
    if (p) setFaction(null)
  }, [])

  const value = useMemo(
    () => ({ selectedFaction, selectFaction, selectedPerson, selectPerson }),
    [selectedFaction, selectFaction, selectedPerson, selectPerson],
  )

  return (
    <QinHanSelectionContext.Provider value={value}>
      {children}
    </QinHanSelectionContext.Provider>
  )
}

export function useQinHanSelection() {
  const ctx = useContext(QinHanSelectionContext)
  if (!ctx) {
    throw new Error(
      'useQinHanSelection must be used within QinHanSelectionProvider',
    )
  }
  return ctx
}
