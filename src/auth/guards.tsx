import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { NoAccess } from '../components/states'
import { Page } from '../components/ui'
import { useAuth } from './AuthContext'
import type { Permission } from './permissions'

/** Sends signed-out visitors to /connexion, remembering where they were going. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()
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
