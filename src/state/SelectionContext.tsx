import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { FactionId, Person } from '../types/data'

export type ArticleTarget =
  | { kind: 'faction'; faction: FactionId }
  | { kind: 'person'; person: Person }

interface SelectionContextValue {
  selectedFaction: FactionId | null
  article: ArticleTarget | null
  selectFaction: (faction: FactionId) => void
  clearFaction: () => void
  openPersonArticle: (person: Person) => void
  openFactionArticle: (faction: FactionId) => void
  closeArticle: () => void
}

const SelectionContext = createContext<SelectionContextValue | null>(null)

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selectedFaction, setSelectedFaction] = useState<FactionId | null>(null)
  const [article, setArticle] = useState<ArticleTarget | null>(null)

  const selectFaction = useCallback((faction: FactionId) => {
    setSelectedFaction(faction)
    setArticle({ kind: 'faction', faction })
  }, [])

  const clearFaction = useCallback(() => {
    setSelectedFaction(null)
  }, [])

  const openPersonArticle = useCallback((person: Person) => {
    setArticle({ kind: 'person', person })
  }, [])

  const openFactionArticle = useCallback((faction: FactionId) => {
    setSelectedFaction(faction)
    setArticle({ kind: 'faction', faction })
  }, [])

  const closeArticle = useCallback(() => setArticle(null), [])

  const value = useMemo(
    () => ({
      selectedFaction,
      article,
      selectFaction,
      clearFaction,
      openPersonArticle,
      openFactionArticle,
      closeArticle,
    }),
    [
      selectedFaction,
      article,
      selectFaction,
      clearFaction,
      openPersonArticle,
      openFactionArticle,
      closeArticle,
    ],
  )

  return (
    <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>
  )
}

export function useSelection() {
  const ctx = useContext(SelectionContext)
  if (!ctx) throw new Error('useSelection must be used within SelectionProvider')
  return ctx
}
