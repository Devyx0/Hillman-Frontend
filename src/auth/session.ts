/**
 * Session helpers layered on top of AuthContext (mock only — the backend replaces this):
 * passwords chosen through the invitation / reset / profile flows, the admin "view as" origin,
 * per-user profile extras and the default company scope.
 */
import { commit } from '../data/store'
import { repById, type CompanyId } from '../data/mock'
import { ACCOUNTS, DEMO_PASSWORD, type Account } from './permissions'
import { API_MODE } from '../api/config'

// ── Passwords ───────────────────────────────────────────────────────────────
/** Passwords set during this browser session (in memory only, never persisted). */
const PASSWORDS = new Map<string, string>()

export function setPassword(accountId: string, password: string) {
  PASSWORDS.set(accountId, password)
}

/** True when `password` is the account's current password (its own one, else the demo one). */
export function checkPassword(accountId: string, password: string) {
  return password === (PASSWORDS.get(accountId) ?? DEMO_PASSWORD)
}

export const hasOwnPassword = (accountId: string) => PASSWORDS.has(accountId)

/** Password strength rules. `label` is a French UI string — translate where displayed. */
export function passwordChecks(pw: string): { label: string; ok: boolean }[] {
  return [
    { label: 'Au moins 8 caractères', ok: pw.length >= 8 },
    { label: 'Une lettre majuscule', ok: /\p{Lu}/u.test(pw) },
    { label: 'Une lettre minuscule', ok: /\p{Ll}/u.test(pw) },
    { label: 'Un chiffre', ok: /\d/.test(pw) },
  ]
}
export const passwordIsStrong = (pw: string) => passwordChecks(pw).every((c) => c.ok)

/**
 * Sign in with email + password. Accounts that set their own password in this session use it;
 * the others go through `login()` with the demo password. Rejects with a French UI message.
 */
export function signIn(email: string, password: string, auth: { login: (e: string, p: string) => Promise<Account>; impersonate: (id: string) => void }): Promise<Account> {
  if (API_MODE) return auth.login(email, password)
  const acc = ACCOUNTS.find((a) => a.email.toLowerCase() === email.trim().toLowerCase())
  if (!acc || !hasOwnPassword(acc.id)) return auth.login(email, password)
  return new Promise((resolve, reject) =>
    window.setTimeout(() => {
      if (!checkPassword(acc.id, password)) return reject(new Error('Courriel ou mot de passe incorrect.'))
      if (acc.status === 'desactive') return reject(new Error('Ce compte est désactivé. Contactez un administrateur.'))
      if (acc.status === 'invite') return reject(new Error("Ce compte n'est pas encore activé. Utilisez le lien reçu par courriel."))
      auth.impersonate(acc.id)
      resolve(acc)
    }, 500),
  )
}

// ── "Voir comme…" (admin impersonation) ─────────────────────────────────────
const VIEW_AS_KEY = 'hillman.viewAs'

/** Id of the admin who started "view as", or null when not impersonating. */
export function viewAsOrigin(): string | null {
  try {
    return localStorage.getItem(VIEW_AS_KEY)
  } catch {
    return null
  }
}

export function setViewAsOrigin(id: string | null) {
  try {
    if (id) localStorage.setItem(VIEW_AS_KEY, id)
    else localStorage.removeItem(VIEW_AS_KEY)
  } catch {
    /* storage unavailable */
  }
}

// ── Profile extras (fields Account does not carry) ──────────────────────────
export type NotificationEvent = 'quoteOpened' | 'quoteSigned' | 'leadAssigned' | 'appointmentReminder' | 'dailySummary'
export interface ProfileExtras {
  phone: string
  notify: Record<NotificationEvent, { email: boolean; sms: boolean }>
}
const PROFILES = new Map<string, ProfileExtras>()

export function profileExtras(account: Account): ProfileExtras {
  let p = PROFILES.get(account.id)
  if (!p) {
    p = {
      phone: repById(account.repId)?.phone ?? '',
      notify: {
        quoteOpened: { email: false, sms: true },
        quoteSigned: { email: true, sms: true },
        leadAssigned: { email: true, sms: true },
        appointmentReminder: { email: false, sms: true },
        dailySummary: { email: true, sms: false },
      },
    }
    PROFILES.set(account.id, p)
  }
  return p
}

export function saveProfileExtras(accountId: string, p: ProfileExtras) {
  PROFILES.set(accountId, p)
  commit()
}

// ── Misc ────────────────────────────────────────────────────────────────────
export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name

/** Company scope a user lands on: Toitures for the admin (as before), else their first company. */
export function defaultScopeFor(user: Account | null): CompanyId {
  if (!user || user.role === 'admin') return 'toit'
  return user.companies[0] ?? 'toit'
}
