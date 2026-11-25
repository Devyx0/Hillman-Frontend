import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ErrorState, Loading, NoAccess } from '../components/states'
import { t } from '../i18n'
import { Page } from '../components/ui'
import { useAuth } from './AuthContext'
import type { Permission } from './permissions'

/** Sends signed-out visitors to /connexion, remembering where they were going. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, status, error, retry, logout } = useAuth()
  const location = useLocation()
  // API mode: the session is being checked and the user's data loaded.
  if (status === 'loading') return <Loading className="min-h-screen" />
  if (status === 'error')
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card max-w-md w-full">
          <ErrorState onRetry={retry}>{error ?? undefined}</ErrorState>
          <div className="px-5 pb-5 text-center">
            <button className="text-xs font-semibold text-ink-mute hover:text-ink" onClick={logout}>
              {t('Se déconnecter')}
            </button>
          </div>
        </div>
      </div>
    )
  if (!user) return <Navigate to="/connexion" replace state={{ from: location.pathname + location.search }} />
  return <>{children}</>
}

/**
 * Renders `NoAccess` unless the user has the permission (or, with an array, at least one of them).
 *   <RequirePermission perm={['settings.manage', 'users.manage']}>…</RequirePermission>
 */
export function RequirePermission({ perm, children, fallback }: { perm: Permission | Permission[]; children: ReactNode; fallback?: ReactNode }) {
  const { can } = useAuth()
  const ok = Array.isArray(perm) ? perm.some(can) : can(perm)
  if (ok) return <>{children}</>
  return fallback ?? <NoAccessPage />
}

/** Full-page "Accès non autorisé" — e.g. another rep's record opened by URL. */
export function NoAccessPage({ children }: { children?: ReactNode }) {
  return (
    <Page>
      <div className="card">
        <NoAccess>{children}</NoAccess>
      </div>
    </Page>
  )
}

/** Renders children only when the user has the permission (no fallback) — for buttons, columns… */
export function IfCan({ perm, children }: { perm: Permission | Permission[]; children: ReactNode }) {
  const { can } = useAuth()
  const ok = Array.isArray(perm) ? perm.some(can) : can(perm)
  return ok ? <>{children}</> : null
}
