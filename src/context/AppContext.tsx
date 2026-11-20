import { createContext, useContext, useState, type ReactNode } from 'react'
import type { CompanyId } from '../data/mock'
import { useAuth } from '../auth/AuthContext'
import { defaultScopeFor } from '../auth/session'

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

/**
 * Holds the company scope. Must sit inside `AuthProvider`: the scope starts on the signed-in
 * user's default company, resets when the user changes (sign-in, "view as"), and can never be a
 * company the user doesn't work for (nor 'all' without the `groupView` permission).
 */
export function AppProvider({ children }: { children: ReactNode }) {
  const { user, can } = useAuth()
  const uid = user?.id ?? null
  const [picked, setPicked] = useState<{ uid: string | null; scope: Scope }>(() => ({ uid, scope: defaultScopeFor(user) }))
  const [paletteOpen, setPaletteOpen] = useState(false)

  const allowed = (s: Scope) => {
    if (!user) return true
    if (s === 'all') return can('groupView') && user.companies.length > 1
    return user.companies.includes(s)
  }
  const scope: Scope = picked.uid === uid && allowed(picked.scope) ? picked.scope : defaultScopeFor(user)
  const setScope = (s: Scope) => {
    if (allowed(s)) setPicked({ uid, scope: s })
  }

  return <AppContext.Provider value={{ scope, setScope, paletteOpen, setPaletteOpen }}>{children}</AppContext.Provider>
}

/** Mockup: `Ht()`. */
export const useApp = () => useContext(AppContext)

/** Mockup: `va(scope, company)`. */
export const inScope = (scope: Scope, company: string) => scope === 'all' || scope === company
