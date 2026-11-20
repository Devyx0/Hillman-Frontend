import type { ReactNode } from 'react'
import type { QuoteStatusRecord } from '../../data/store'
import { locale, t } from '../../i18n'
import { cn } from '../../lib/utils'
import { StatusBadge } from '../ui'

/** Hover details for a status: refusal reason, payment date, acceptance at the office. */
export function statusDetail(q: Partial<QuoteStatusRecord> & { status: string }): string | undefined {
  if (q.status === 'Refusé' && q.refusalReason) return t('Raison : {reason}', { reason: t(q.refusalReason) }) + (q.refusalComment ? ` — ${q.refusalComment}` : '')
  if (q.status === 'Payé' && q.paidAt) return t('Payée le {date}', { date: new Date(q.paidAt + 'T12:00').toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' }) })
  if (q.status === 'Signé' && q.officeAcceptance && !q.signature) return t('Acceptée au bureau') + (q.officeAcceptance.comment ? ` — ${q.officeAcceptance.comment}` : '')
  return undefined
}

/** Hover bubble wrapper (pure CSS; the text is also given to screen readers). */
export function HoverTip({ tip, children, className }: { tip?: string; children: ReactNode; className?: string }) {
  if (!tip) return <>{children}</>
  return (
    <span className={cn('relative inline-flex group/tip', className)}>
      {children}
      <span className="sr-only">{tip}</span>
      <span aria-hidden="true" className="pointer-events-none absolute left-0 bottom-full mb-1.5 z-50 hidden group-hover/tip:block w-max max-w-[16rem] whitespace-normal rounded-md bg-ink text-white text-2xs font-medium px-2 py-1.5 shadow-elevated">
        {tip}
      </span>
    </span>
  )
}

/** Read-only status badge with its details on hover (refusal reason, payment date…). */
export function QuoteStatusBadge({ q, className }: { q: Partial<QuoteStatusRecord> & { status: string }; className?: string }) {
  return (
    <HoverTip tip={statusDetail(q)}>
      <StatusBadge status={q.status} className={className} />
    </HoverTip>
  )
}
