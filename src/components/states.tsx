import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CircleAlert, Lock, LoaderCircle, RefreshCw, TriangleAlert } from 'lucide-react'
import { t } from '../i18n'
import { cn } from '../lib/utils'

/** Inline loading state. */
export function Loading({ label, className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex items-center justify-center gap-2 py-12 text-sm text-ink-mute', className)} role="status">
      <LoaderCircle className="w-4 h-4 animate-spin" />
      {label ?? t('Chargement…')}
    </div>
  )
}

/** Skeleton rows for lists/tables while loading. */
export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-hairline" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="px-5 py-3.5 flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-sand animate-pulse" />
          <span className="flex-1 space-y-1.5">
            <span className="block h-3 w-1/3 rounded bg-sand animate-pulse" />
            <span className="block h-2.5 w-1/2 rounded bg-sand animate-pulse" />
          </span>
        </div>
      ))}
    </div>
  )
}

/** Error state with retry. */
export function ErrorState({ title, children, onRetry }: { title?: ReactNode; children?: ReactNode; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 gap-2" role="alert">
      <TriangleAlert className="w-8 h-8 text-tone-critical" />
      <p className="text-sm font-semibold text-ink">{title ?? t('Impossible de charger les données')}</p>
      <p className="text-xs text-ink-mute max-w-xs">{children ?? t('Vérifiez votre connexion et réessayez.')}</p>
      {onRetry && (
        <button className="btn btn-xs btn-secondary mt-2" onClick={onRetry}>
          <RefreshCw className="w-3.5 h-3.5" />
          {t('Réessayer')}
        </button>
      )}
    </div>
  )
}

/** Shown when the current user lacks a permission. */
export function NoAccess({ children }: { children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 gap-2">
      <span className="w-12 h-12 rounded-full bg-sand flex items-center justify-center">
        <Lock className="w-5 h-5 text-ink-mute" />
      </span>
      <p className="text-md font-semibold text-ink mt-1">{t('Accès non autorisé')}</p>
      <p className="text-sm text-ink-mute max-w-sm">{children ?? t("Votre rôle ne donne pas accès à cette section. Demandez l'accès à un administrateur.")}</p>
    </div>
  )
}

/** Small inline notice (warning / error / info). */
export function Notice({ tone = 'warn', children, className }: { tone?: 'warn' | 'critical' | 'info'; children: ReactNode; className?: string }) {
  const cls = tone === 'critical' ? 'bg-tone-critical-soft text-tone-critical-ink' : tone === 'info' ? 'bg-primary-wash text-primary-press' : 'bg-tone-warn-soft text-tone-warn-ink'
  return (
    <div className={cn('flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs font-medium', cls, className)}>
      <CircleAlert className="w-4 h-4 shrink-0 mt-px" />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

// ── Confirm dialog ──────────────────────────────────────────────────────────
interface ConfirmOptions {
  title: string
  body?: ReactNode
  confirmLabel?: string
  danger?: boolean
}
let openConfirm: ((o: ConfirmOptions, done: (ok: boolean) => void) => void) | null = null

/**
 * Ask the user to confirm (e.g. before deleting). Strings must already be translated.
 *   if (await confirmAction({ title: t('Supprimer ce modèle?'), danger: true })) …
 */
export function confirmAction(o: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => (openConfirm ? openConfirm(o, resolve) : resolve(window.confirm(o.title))))
}

/** Mounted once in the app layout. */
export function ConfirmHost() {
  const [state, setState] = useState<{ o: ConfirmOptions; done: (ok: boolean) => void } | null>(null)
  useEffect(() => {
    openConfirm = (o, done) => setState({ o, done })
    return () => {
      openConfirm = null
    }
  }, [])
  if (!state) return null
  const close = (ok: boolean) => {
    state.done(ok)
    setState(null)
  }
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/30" onClick={() => close(false)} />
      <div className="relative w-full max-w-sm bg-white rounded-xl shadow-float p-5 menu-in">
        <h3 className="text-md font-semibold text-ink">{state.o.title}</h3>
        {state.o.body && <div className="text-sm text-ink-mute mt-1.5">{state.o.body}</div>}
        <div className="flex justify-end gap-2 mt-5">
          <button className="btn btn-sm btn-ghost" onClick={() => close(false)} autoFocus>
            {t('Annuler')}
          </button>
          <button className={cn('btn btn-sm', state.o.danger ? 'bg-tone-critical text-white hover:opacity-90' : 'btn-primary')} onClick={() => close(true)}>
            {state.o.confirmLabel ?? t('Confirmer')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/** "Coming in January" label for AI-agent features (outside the 200 h plan). */
export function ComingSoon({ className }: { className?: string }) {
  return <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded-full text-2xs font-semibold bg-tone-warn-soft text-tone-warn-ink whitespace-nowrap', className)}>{t('Janvier 2027')}</span>
}
