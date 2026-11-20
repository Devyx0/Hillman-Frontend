import { createContext, useContext, useState, type ReactNode } from 'react'
import { useStore } from '../data/store'
import type { CompanyId } from '../data/mock'
import { ACCOUNTS, DEMO_PASSWORD, ROLE_PERMISSIONS, type Account, type Permission } from './permissions'

const SESSION_KEY = 'hillman.session'

interface AuthState {
  user: Account | null
  /** Resolves on success, rejects with an Error whose message is a French UI string. */
  login: (email: string, password: string) => Promise<Account>
  logout: () => void
  /** Switch user without a password (demo "view as" for admins). */
  impersonate: (accountId: string) => void
  can: (p: Permission) => boolean
  /** Companies the user may see. */
  companies: CompanyId[]
}

const AuthContext = createContext<AuthState>({
  user: null,
  login: () => Promise.reject(new Error('')),
  logout: () => {},
  impersonate: () => {},
  can: () => false,
  companies: [],
})

function readSession(): Account | null {
  try {
    const id = localStorage.getItem(SESSION_KEY)
    return ACCOUNTS.find((a) => a.id === id && a.status === 'actif') ?? null
  } catch {
    return null
  }
}

function writeSession(id: string | null) {
  try {
    if (id) localStorage.setItem(SESSION_KEY, id)
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    /* storage unavailable */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  useStore() // permission-table edits re-render consumers
  const [user, setUser] = useState<Account | null>(readSession)

  const login = (email: string, password: string) =>
    new Promise<Account>((resolve, reject) =>
      window.setTimeout(() => {
        const acc = ACCOUNTS.find((a) => a.email.toLowerCase() === email.trim().toLowerCase())
        if (!acc || password !== DEMO_PASSWORD) return reject(new Error('Courriel ou mot de passe incorrect.'))
        if (acc.status === 'invite') return reject(new Error("Ce compte n'est pas encore activé. Utilisez le lien reçu par courriel."))
        if (acc.status === 'desactive') return reject(new Error('Ce compte est désactivé. Contactez un administrateur.'))
        writeSession(acc.id)
        setUser(acc)
        resolve(acc)
      }, 500),
    )

  const logout = () => {
    writeSession(null)
    setUser(null)
  }

  const impersonate = (accountId: string) => {
    const acc = ACCOUNTS.find((a) => a.id === accountId)
    if (!acc) return
    writeSession(acc.id)
    setUser(acc)
  }

  const can = (p: Permission) => !!user && ROLE_PERMISSIONS[user.role].has(p)
  const companies = user?.companies ?? []

  return <AuthContext.Provider value={{ user, login, logout, impersonate, can, companies }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
