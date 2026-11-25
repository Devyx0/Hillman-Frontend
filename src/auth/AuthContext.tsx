import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useStore } from '../data/store'
import type { CompanyId } from '../data/mock'
import { API_MODE } from '../api/config'
import { getMe } from '../api/endpoints'
import { getSession, onSessionChange, signInWithPassword, signOut } from '../api/auth'
import { ApiError, errorMessage } from '../api/http'
import type { MeResponse } from '../api/types'
import { hydrate, resetData } from '../data/api-sync'
import { ACCOUNTS, DEMO_PASSWORD, ROLE_PERMISSIONS, applyApiPermissions, type Account, type Permission, type Role } from './permissions'

const SESSION_KEY = 'hillman.session'

interface AuthState {
  user: Account | null
  /** API mode: 'loading' while the session is checked and the data loaded; 'error' when that failed. */
  status: 'ready' | 'loading' | 'error'
  /** French message when `status === 'error'`. */
  error: string | null
  /** Retry loading the signed-in user's data (after `status === 'error'`). */
  retry: () => void
  /** Resolves on success, rejects with an Error whose message is a French UI string. */
  login: (email: string, password: string) => Promise<Account>
  logout: () => void
  /** Switch user without a password (demo "view as" for admins; not available with the backend). */
  impersonate: (accountId: string) => void
  can: (p: Permission) => boolean
  /** Companies the user may see. */
  companies: CompanyId[]
}

const AuthContext = createContext<AuthState>({
  user: null,
  status: 'ready',
  error: null,
  retry: () => {},
  login: () => Promise.reject(new Error('')),
  logout: () => {},
  impersonate: () => {},
  can: () => false,
  companies: [],
})

function readSession(): Account | null {
  if (API_MODE) return null
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

const RANK: Record<string, number> = { representative: 1, coordination: 2, admin: 3 }
const ROLE_OF: Record<string, Role> = { representative: 'rep', coordination: 'coordinator', admin: 'admin' }
const KNOWN: CompanyId[] = ['toit', 'sg', 'reno']

/** The signed-in API user as the UI's Account. The UI has one role per user: the highest of their memberships. */
function accountFromMe(me: MeResponse): Account {
  const top = me.memberships.reduce((best, m) => (RANK[m.role] > RANK[best] ? m.role : best), me.memberships[0]?.role ?? 'representative')
  return {
    id: me.user.id,
    repId: me.user.id,
    name: `${me.user.first_name} ${me.user.last_name}`.trim() || me.user.email || '—',
    email: me.user.email ?? getSession()?.email ?? '',
    role: ROLE_OF[top] ?? 'rep',
    companies: me.memberships.map((m) => m.slug as CompanyId).filter((s, i, all) => KNOWN.includes(s) && all.indexOf(s) === i),
    status: 'actif',
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  useStore() // permission-table edits re-render consumers
  const [user, setUser] = useState<Account | null>(readSession)
  const [status, setStatus] = useState<AuthState['status']>(API_MODE && getSession() ? 'loading' : 'ready')
  const [error, setError] = useState<string | null>(null)
  /** Incremented on every sign-in / sign-out so a slow load for a previous session is ignored. */
  const generation = useRef(0)

  /** API mode: who is signed in, then their data. Rejects with the French message. */
  const loadUser = useCallback(async (): Promise<Account> => {
    const gen = ++generation.current
    const me = await getMe()
    await hydrate(me)
    if (gen !== generation.current) throw new Error('stale')
    const acc = accountFromMe(me)
    applyApiPermissions()
    setUser(acc)
    setStatus('ready')
    setError(null)
    return acc
  }, [])

  const boot = useCallback(() => {
    if (!API_MODE || !getSession()) return
    setStatus('loading')
    setError(null)
    loadUser().catch((e) => {
      if ((e as Error).message === 'stale') return
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        // Token rejected, or no active account for this login: back to the sign-in page.
        void signOut()
        resetData()
        setUser(null)
        setStatus('ready')
        if (e.status === 403) setError(e.message)
        return
      }
      setStatus('error')
      setError(errorMessage(e))
    })
  }, [loadUser])

  useEffect(() => {
    if (!API_MODE) return
    boot()
    // Session gone (sign-out in another tab, refresh token rejected, API said 401): sign out here too.
    return onSessionChange((s) => {
      if (!s) {
        generation.current++
        resetData()
        setUser(null)
        setStatus('ready')
      }
    })
  }, [boot])

  const login = async (email: string, password: string): Promise<Account> => {
    if (API_MODE) {
      await signInWithPassword(email, password)
      setStatus('loading')
      try {
        return await loadUser()
      } catch (e) {
        await signOut()
        resetData()
        setStatus('ready')
        throw new Error(errorMessage(e))
      }
    }
    return new Promise<Account>((resolve, reject) =>
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
  }

  const logout = () => {
    if (API_MODE) {
      generation.current++
      resetData()
      setUser(null)
      setStatus('ready')
      // Reload once signed out so nothing of this user stays in memory (screens keep some state per session).
      void signOut().finally(() => {
        window.location.replace(`${window.location.pathname}${window.location.search}#/connexion`)
        window.location.reload()
      })
      return
    }
    writeSession(null)
    setUser(null)
  }

  const impersonate = (accountId: string) => {
    if (API_MODE) return
    const acc = ACCOUNTS.find((a) => a.id === accountId)
    if (!acc) return
    writeSession(acc.id)
    setUser(acc)
  }

  const can = (p: Permission) => !!user && ROLE_PERMISSIONS[user.role].has(p)
  const companies = user?.companies ?? []

  return <AuthContext.Provider value={{ user, status, error, retry: boot, login, logout, impersonate, can, companies }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
