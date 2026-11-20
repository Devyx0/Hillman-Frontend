/** Small pieces shared by the create flows (quote, client, lead). */
import type { ReactNode } from 'react'
import { Check, MapPin, Phone } from 'lucide-react'
import { companiesServing } from '../../data/clients'
import { fullName, type Client } from '../../data/mock'
import { t } from '../../i18n'
import { cn } from '../../lib/utils'
import { Avatar, CompanyBadge } from '../ui'

/** "Isabelle Gagnon" → { first: 'Isabelle', last: 'Gagnon' }. */
export function splitName(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return { first: parts[0] ?? '', last: '' }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

/** Step progress for multi-step flows. Earlier steps are clickable. */
export function Steps({ steps, current, onPick }: { steps: string[]; current: number; onPick: (i: number) => void }) {
  return (
    <ol className="flex items-center gap-1.5 overflow-x-auto nav-scroll" aria-label={t('Étapes')}>
      {steps.map((s, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={s} className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              disabled={i > current}
              onClick={() => onPick(i)}
              aria-current={active ? 'step' : undefined}
              className={cn('h-7 pl-1 pr-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-colors', active ? 'bg-ink text-white' : done ? 'bg-primary-wash text-primary-press hover:bg-primary-wash/70' : 'bg-sand text-ink-mute')}
            >
              <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-2xs tnum', active ? 'bg-white/20' : done ? 'bg-primary text-white' : 'bg-white')}>{done ? <Check className="w-3 h-3" /> : i + 1}</span>
              <span className={cn(!active && 'hidden sm:inline')}>{s}</span>
            </button>
            {i < steps.length - 1 && <span className="w-3 h-px bg-hairline-strong" />}
          </li>
        )
      })}
    </ol>
  )
}

/** One existing client, with the companies that already serve them. */
export function ClientCard({ c, selected, action, onClick }: { c: Client; selected?: boolean; action?: ReactNode; onClick?: () => void }) {
  const served = companiesServing(c)
  const body = (
    <>
      <Avatar name={fullName(c)} size="md" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-ink truncate">{fullName(c)}</span>
          {c.company && <span className="text-xs text-ink-mute truncate">· {c.company}</span>}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-mute">
          <span className="inline-flex items-center gap-1 tnum">
            <Phone className="w-3 h-3" />
            {c.mobile ?? c.phone}
          </span>
          <span className="inline-flex items-center gap-1 min-w-0">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">
              {c.no}, {c.street}, {c.city}
            </span>
          </span>
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-1">
          {served.length ? (
            <>
              <span className="text-2xs text-ink-mute">{t('Déjà servi par')}</span>
              {served.map((id) => (
                <CompanyBadge key={id} id={id} />
              ))}
            </>
          ) : (
            <span className="text-2xs text-ink-mute">{t('Aucune soumission pour le moment')}</span>
          )}
        </span>
      </span>
      {selected && <Check className="w-4 h-4 text-primary-press shrink-0" />}
    </>
  )
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={cn('w-full text-left flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors', selected ? 'border-primary bg-primary-wash' : 'border-hairline hover:border-primary')}>
        {body}
      </button>
    )
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-2 rounded-lg border border-hairline bg-white px-3 py-2.5">
      <div className="flex items-start gap-3 min-w-0 flex-1">{body}</div>
      {action && <div className="shrink-0 flex flex-wrap gap-1.5 sm:pt-0.5">{action}</div>}
    </div>
  )
}

/** Footer bar of a create drawer. */
export function DrawerFooter({ children }: { children: ReactNode }) {
  return <div className="sticky bottom-0 bg-white border-t border-hairline px-5 py-3 flex flex-wrap items-center justify-end gap-2">{children}</div>
}
