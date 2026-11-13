import { createContext, useContext, useState, type ReactNode } from 'react'
import type { CompanyId } from '../data/mock'

export type Scope = CompanyId | 'all'

interface AppState {
  /** Active company account, or 'all' for the Groupe Hillman overview. */
  scope: Scope
  setScope: (s: Scope) => void
  paletteOpen: boolean
  setPaletteOpen: (open: boolean) => void
}

const AppContext = createContext<AppState>({
  scope: 'all',
  setScope: () => {},
  paletteOpen: false,
  setPaletteOpen: () => {},
})

export function AppProvider({ children }: { children: ReactNode }) {
  const [scope, setScope] = useState<Scope>('toit')
  const [paletteOpen, setPaletteOpen] = useState(false)
  return <AppContext.Provider value={{ scope, setScope, paletteOpen, setPaletteOpen }}>{children}</AppContext.Provider>
}

/** Mockup: `Ht()`. */
export const useApp = () => useContext(AppContext)

/** Mockup: `va(scope, company)`. */
export const inScope = (scope: Scope, company: string) => scope === 'all' || scope === company
