/**
 * Supabase Auth (GoTrue REST) for API mode: password sign-in, token refresh, sign-out, password reset and
 * password change. The backend verifies the Supabase access token on every request (Bearer).
 *
 * The session (access + refresh token) is kept in localStorage so a reload stays signed in; the access token is
 * refreshed shortly before it expires, and once more when the API answers 401.
 */
import { SUPABASE_KEY, SUPABASE_URL } from './config'

const STORAGE_KEY = 'hillman.apiSession'
/** Refresh this many seconds before the access token expires. */
const REFRESH_MARGIN_S = 60

export interface Session {
  accessToken: string
  refreshToken: string
  /** Unix time (seconds) when the access token expires. */
  expiresAt: number
  email: string
}

/** Auth error with a French UI message (translated where displayed). */
export class AuthError extends Error {
  readonly status: number
  readonly code?: string
  constructor(message: string, status: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

let session: Session | null = readStored()
const listeners = new Set<(s: Session | null) => void>()

function readStored(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as Session
    return s && s.accessToken && s.refreshToken ? s : null
  } catch {
    return null
  }
}

function store(next: Session | null) {
  session = next
  try {
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* storage unavailable: the session lives in memory only */
  }
  listeners.forEach((l) => l(next))
}

export const getSession = () => session

/** Called when the session changes (sign-in, refresh, sign-out, expiry). Returns the unsubscribe function. */
export function onSessionChange(fn: (s: Session | null) => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at?: number
  user?: { email?: string }
}

async function gotrue<T>(path: string, init: { method: string; body?: unknown; token?: string }): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${SUPABASE_URL}/auth/v1${path}`, {
      method: init.method,
      headers: {
        apikey: SUPABASE_KEY,
        'Content-Type': 'application/json',
        ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    })
  } catch {
    throw new AuthError('Impossible de joindre le serveur. Vérifiez votre connexion.', 0, 'network')
  }
  const text = await res.text()
  let data: Record<string, unknown> = {}
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : {}
  } catch {
    /* not JSON (e.g. a proxy error page) */
  }
  if (!res.ok) {
    const code = String(data.error_code ?? data.error ?? data.code ?? '')
    throw new AuthError(authMessage(res.status, code), res.status, code)
  }
  return data as T
}

/** French UI message for a GoTrue error. */
function authMessage(status: number, code: string): string {
  if (code === 'invalid_credentials' || code === 'invalid_grant') return 'Courriel ou mot de passe incorrect.'
  if (code === 'email_not_confirmed') return "Ce compte n'est pas encore activé. Utilisez le lien reçu par courriel."
  if (code === 'user_banned') return 'Ce compte est désactivé. Contactez un administrateur.'
  if (code === 'same_password') return 'Le nouveau mot de passe doit être différent de l’ancien.'
  if (code === 'weak_password') return 'Le mot de passe ne respecte pas les règles.'
  if (code === 'over_email_send_rate_limit' || status === 429) return 'Trop de tentatives. Réessayez dans quelques minutes.'
  if (status === 401 || status === 403) return 'Votre session a expiré. Reconnectez-vous.'
  return 'Une erreur est survenue. Réessayez dans un moment.'
}

function toSession(r: TokenResponse, email: string): Session {
  return {
    accessToken: r.access_token,
    refreshToken: r.refresh_token,
    expiresAt: r.expires_at ?? Math.floor(Date.now() / 1000) + r.expires_in,
    email: r.user?.email ?? email,
  }
}

/** Sign in with email + password. Rejects with an AuthError (French message). */
export async function signInWithPassword(email: string, password: string): Promise<Session> {
  const r = await gotrue<TokenResponse>('/token?grant_type=password', { method: 'POST', body: { email: email.trim(), password } })
  const s = toSession(r, email.trim())
  store(s)
  return s
}

let refreshing: Promise<Session | null> | null = null

/** Exchange the refresh token for a new access token. Signs out (resolves null) when the refresh token is no longer valid. */
export function refreshSession(): Promise<Session | null> {
  if (refreshing) return refreshing
  const current = session
  if (!current) return Promise.resolve(null)
  refreshing = gotrue<TokenResponse>('/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: current.refreshToken } })
    .then((r) => {
      const s = toSession(r, current.email)
      store(s)
      return s
    })
    .catch((e: AuthError) => {
      // Only a refresh token the server rejects (400 / 401 / 403) ends the session. Network trouble, rate limits
      // and server errors keep it: the caller fails this time and a later call retries.
      const rejected = e.status >= 400 && e.status < 500 && e.status !== 429
      if (rejected) store(null)
      return rejected ? null : current
    })
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

/** A valid access token, refreshed first when it is about to expire. Null when signed out. */
export async function accessToken(): Promise<string | null> {
  if (!session) return null
  if (session.expiresAt - REFRESH_MARGIN_S <= Date.now() / 1000) {
    const s = await refreshSession()
    return s?.accessToken ?? null
  }
  return session.accessToken
}

/** Sign out on this device (the refresh token is revoked server side; failures are ignored). */
export async function signOut() {
  const token = session?.accessToken
  store(null)
  if (token) await gotrue('/logout?scope=local', { method: 'POST', token }).catch(() => undefined)
}

/** Drop the session without calling the server (e.g. the API said the token is no longer valid). */
export const clearSession = () => store(null)

/** Send the "choose a new password" email. The link comes back to this app (see `consumeAuthRedirect`). */
export async function requestPasswordReset(email: string) {
  const redirect = `${window.location.origin}${window.location.pathname}`
  await gotrue(`/recover?redirect_to=${encodeURIComponent(redirect)}`, { method: 'POST', body: { email: email.trim() } })
}

/** Set a new password for the signed-in user (reset link, invitation link or profile). */
export async function updatePassword(password: string) {
  const token = await accessToken()
  if (!token) throw new AuthError('Votre session a expiré. Reconnectez-vous.', 401)
  await gotrue('/user', { method: 'PUT', token, body: { password } })
}

/** Check the current password (profile → change password) by signing in again with it. */
export async function verifyPassword(password: string): Promise<boolean> {
  if (!session) return false
  try {
    await signInWithPassword(session.email, password)
    return true
  } catch (e) {
    if ((e as AuthError).code === 'invalid_credentials' || (e as AuthError).code === 'invalid_grant') return false
    throw e
  }
}

/**
 * Supabase e-mail links (password reset, invitation) return to the app with the tokens in the URL fragment:
 * `#access_token=…&refresh_token=…&expires_in=…&type=recovery`. The app uses hash routing, so this must run
 * before the router reads the hash. Stores the session and returns the link type, or null when the URL holds no
 * tokens. An error link (`#error=…`) returns 'error'.
 */
export function consumeAuthRedirect(): 'recovery' | 'invite' | 'signup' | 'magiclink' | 'error' | null {
  const hash = window.location.hash.replace(/^#\/?/, '')
  if (!/(^|&)(access_token|error)=/.test(hash)) return null
  const p = new URLSearchParams(hash)
  const clearUrl = (route: string) => window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${route}`)
  if (p.get('error')) {
    clearUrl('/mot-de-passe?lien=invalide')
    return 'error'
  }
  const access = p.get('access_token')
  const refresh = p.get('refresh_token')
  if (!access || !refresh) return null
  const expiresIn = Number(p.get('expires_in') ?? 3600)
  store({
    accessToken: access,
    refreshToken: refresh,
    expiresAt: Number(p.get('expires_at') ?? 0) || Math.floor(Date.now() / 1000) + expiresIn,
    email: emailFromToken(access),
  })
  const type = (p.get('type') ?? 'magiclink') as 'recovery' | 'invite' | 'signup' | 'magiclink'
  clearUrl(type === 'invite' ? '/mot-de-passe?nouveau=invitation' : type === 'recovery' ? '/mot-de-passe?nouveau=1' : '/')
  return type
}

/** The e-mail claim of a Supabase access token (display only; the server verifies the token). */
function emailFromToken(token: string): string {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { email?: string }
    return payload.email ?? ''
  } catch {
    return ''
  }
}
