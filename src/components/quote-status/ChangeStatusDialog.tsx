/**
 * Manual status change at the office (PDF item 5): accepted by phone, refused with a reason, paid.
 *
 *   const { change, dialog, canChange } = useChangeStatus({ via: 'liste' })
 *   await change(quote.id, 'Refusé')   // opens the reason dialog; resolves false if cancelled
 *   …
 *   return <>{…}{dialog}</>
 *
 * Statuses "Refusé", "Signé" and "Payé" open `ChangeStatusDialog`; the others apply right away.
 * Every change goes through `changeQuoteStatus` (store) so lists, pipeline and KPIs update.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CalendarCheck, CircleCheck, CircleX, X } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { TODAY } from '../../data/mock'
import { REFUSAL_REASONS, STATUS_DEFS } from '../../data/settings'
import { changeQuoteStatus, quoteById, type StatusChange } from '../../data/store'
import { t } from '../../i18n'
import { toast } from '../../lib/toast'
import { cn } from '../../lib/utils'
import { Notice } from '../states'
import { StatusBadge } from '../ui'

/** Statuses that need details before they are applied. */
export const STATUSES_WITH_DIALOG = ['Refusé', 'Signé', 'Payé']

export interface StatusDetails {
  reason?: string
  comment?: string
  paidAt?: string
}

/** Dialog asking for the details of a manual status change. Strings are translated inside. */
export function ChangeStatusDialog({ ids, status, onConfirm, onCancel }: { ids: string[]; status: string; onConfirm: (d: StatusDetails) => void; onCancel: () => void }) {
  const [reason, setReason] = useState('')
  const [comment, setComment] = useState('')
  const [paidAt, setPaidAt] = useState(TODAY)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  const nos = ids.map((id) => quoteById(id)?.no).filter(Boolean) as string[]
  const which = nos.length > 3 ? t('{list} et {n} autres', { list: nos.slice(0, 3).join(', '), n: nos.length - 3 }) : nos.join(', ')
  const many = ids.length > 1
  const stops = STATUS_DEFS.find((s) => s.name === status)?.stopsFollowUps ?? ['Refusé', 'Signé', 'Payé'].includes(status)

  let title: string
  let icon: ReactNode
  let body: ReactNode = null
  let valid = true
  if (status === 'Refusé') {
    title = many ? t('Marquer {n} soumissions comme refusées', { n: ids.length }) : t('Marquer comme refusée')
    icon = <CircleX className="w-5 h-5 text-tone-critical" />
    valid = !!reason && (reason !== 'Autre' || !!comment.trim())
    body = (
      <>
        <fieldset>
          <legend className="label-caps mb-1.5">{t('Raison du refus')}</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {REFUSAL_REASONS.map((r) => (
              <label key={r} className={cn('flex items-center gap-2 px-2.5 py-2 rounded-md border text-sm cursor-pointer', reason === r ? 'border-primary bg-primary-wash text-ink' : 'border-hairline-strong text-ink-secondary hover:bg-sand')}>
                <input type="radio" name="refusal-reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="accent-[var(--color-primary)]" />
                {t(r)}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex flex-col gap-1 mt-3">
          <span className="label-caps">{reason === 'Autre' ? t('Commentaire') : t('Commentaire (facultatif)')}</span>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} className="form-input py-2 h-auto" placeholder={t('ex. prix du concurrent, date reportée…')} />
        </label>
      </>
    )
  } else if (status === 'Signé') {
    title = many ? t('Marquer {n} soumissions comme acceptées', { n: ids.length }) : t('Marquer comme acceptée')
    icon = <CircleCheck className="w-5 h-5 text-tone-good" />
    body = (
      <>
        <p className="text-sm text-ink-secondary">{t("Le client a accepté par téléphone ou en personne? La soumission sera marquée signée aujourd'hui, sans signature en ligne.")}</p>
        <label className="flex flex-col gap-1 mt-3">
          <span className="label-caps">{t('Note (facultatif)')}</span>
          <input value={comment} onChange={(e) => setComment(e.target.value)} className="form-input" placeholder={t('ex. accepté par téléphone')} />
        </label>
      </>
    )
  } else if (status === 'Payé') {
    title = many ? t('Marquer {n} soumissions comme payées', { n: ids.length }) : t('Marquer comme payée')
    icon = <CalendarCheck className="w-5 h-5 text-tone-good" />
    valid = !!paidAt
    body = (
      <label className="flex flex-col gap-1">
        <span className="label-caps">{t('Date du paiement')}</span>
        <input type="date" value={paidAt} max={TODAY} onChange={(e) => setPaidAt(e.target.value)} className="form-input" required />
      </label>
    )
  } else {
    title = t('Changer le statut')
    icon = null
  }

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="status-dialog-title" onClick={(e) => e.stopPropagation()}>
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <form
        className="relative w-full sm:max-w-md bg-white rounded-t-xl sm:rounded-xl shadow-float p-5 menu-in max-h-[92vh] overflow-y-auto"
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) onConfirm({ reason: reason || undefined, comment: comment.trim() || undefined, paidAt: status === 'Payé' ? paidAt : undefined })
        }}
      >
        <header className="flex items-start gap-3">
          {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
          <div className="min-w-0 flex-1">
            <h3 id="status-dialog-title" className="text-md font-semibold text-ink">
              {title}
            </h3>
            <p className="text-xs text-ink-mute mt-0.5 flex flex-wrap items-center gap-1.5">
              <span className="tnum">{which}</span>
              <span aria-hidden>→</span>
              <StatusBadge status={status} />
            </p>
          </div>
          <button type="button" onClick={onCancel} aria-label={t('Fermer')} className="p-1 -mr-1 rounded-md text-ink-mute hover:bg-sand">
            <X className="w-4 h-4" />
          </button>
        </header>
        <div className="mt-4">{body}</div>
        {stops && (
          <Notice tone="info" className="mt-4">
            {t('Les relances automatiques (courriel et texto) seront arrêtées.')}
          </Notice>
        )}
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" className="btn btn-sm btn-ghost" onClick={onCancel}>
            {t('Annuler')}
          </button>
          <button type="submit" disabled={!valid} className={cn('btn btn-sm', status === 'Refusé' ? 'bg-tone-critical text-white hover:opacity-90' : 'btn-primary', !valid && 'opacity-50 cursor-not-allowed')}>
            {status === 'Refusé' ? t('Marquer refusée') : status === 'Signé' ? t('Confirmer l’acceptation') : status === 'Payé' ? t('Marquer payée') : t('Confirmer')}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}

/**
 * Status-change flow for any screen. `change()` resolves `true` once the status is applied,
 * `false` when cancelled, not allowed, or nothing to change. Render `dialog` somewhere in the tree.
 */
export function useChangeStatus({ via, silent }: { via?: StatusChange['via']; silent?: boolean } = {}) {
  const { user, can } = useAuth()
  const canChange = can('quotes.status')
  const [pending, setPending] = useState<{ ids: string[]; status: string; resolve: (ok: boolean) => void } | null>(null)

  const apply = (ids: string[], status: string, d: StatusDetails) => {
    ids.forEach((id) => changeQuoteStatus(id, status, { ...d, by: user?.name, via }))
    if (silent) return
    const stops = STATUS_DEFS.find((s) => s.name === status)?.stopsFollowUps
    const what = ids.length > 1 ? t('{n} soumissions → {status}', { n: ids.length, status: t(status) }) : t('{no} → {status}', { no: quoteById(ids[0])?.no ?? '', status: t(status) })
    toast(stops ? t('{what} · relances arrêtées', { what }) : what)
  }

  const change = (idOrIds: string | string[], status: string) =>
    new Promise<boolean>((resolve) => {
      if (!canChange) {
        toast(t("Votre rôle ne permet pas de changer le statut d'une soumission."))
        return resolve(false)
      }
      const ids = (Array.isArray(idOrIds) ? idOrIds : [idOrIds]).filter((id) => {
        const q = quoteById(id)
        return q && q.status !== status
      })
      if (!ids.length) return resolve(false)
      if (STATUSES_WITH_DIALOG.includes(status)) setPending({ ids, status, resolve })
      else {
        apply(ids, status, {})
        resolve(true)
      }
    })

  const dialog = pending ? (
    <ChangeStatusDialog
      key={pending.ids.join(',') + pending.status}
      ids={pending.ids}
      status={pending.status}
      onConfirm={(d) => {
        apply(pending.ids, pending.status, d)
        pending.resolve(true)
        setPending(null)
      }}
      onCancel={() => {
        pending.resolve(false)
        setPending(null)
      }}
    />
  ) : null

  return { change, dialog, canChange, pending: !!pending }
}
