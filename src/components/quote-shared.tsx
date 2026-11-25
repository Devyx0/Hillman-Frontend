/**
 * Shared UI for the quote (soumission) screens.
 *
 * Minified → exported:
 *   r4 → StatusPicker, Za → BuilderSection, Ma → ToggleChip, bt → UnitField, Sl → PhotoTile
 */
import { useState, type ReactNode } from 'react'
import { Check, ChevronDown, Image, Star } from 'lucide-react'
import { STATUS_DEFS } from '../data/settings'
import { API_MODE } from '../api/config'
import { PICKABLE_STATUSES } from '../api/mappers'
import type { QuoteStatusRecord, StatusChange } from '../data/store'
import { t } from '../i18n'
import { cn } from '../lib/utils'
import { HoverTip, QuoteStatusBadge, statusDetail, useChangeStatus } from './quote-status'
import { Field, StatusBadge } from './ui'

/**
 * Status dropdown for list rows and the builder header (mockup: `r4`).
 *
 * Pass a store quote (`q.id`): choosing a status runs the real flow (`useChangeStatus`): "Refusé"
 * asks the reason, "Signé" asks to confirm the acceptance, "Payé" asks the payment date; then
 * `onChange(status)` is called once applied. Users without `quotes.status` (or `readOnly`) see a
 * read-only badge. Without `q.id` it only reports the choice through `onChange` (legacy).
 */
export function StatusPicker({
  q,
  onChange,
  readOnly,
  via,
  align = 'left',
}: {
  q: Partial<QuoteStatusRecord> & { status: string }
  onChange?: (status: string) => void
  readOnly?: boolean
  via?: StatusChange['via']
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const { change, dialog, canChange } = useChangeStatus({ via })
  if (readOnly || !canChange) return <QuoteStatusBadge q={q} />
  const pick = async (s: string) => {
    setOpen(false)
    if (!q.id) return onChange?.(s)
    if (await change(q.id, s)) onChange?.(s)
  }
  return (
    <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <HoverTip tip={open ? undefined : statusDetail(q)}>
        <button onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1 rounded-full hover:ring-2 hover:ring-hairline-strong" aria-label={t('Changer le statut')} aria-haspopup="menu" aria-expanded={open}>
          <StatusBadge status={q.status} />
          <ChevronDown className="w-3 h-3 text-ink-faint" />
        </button>
      </HoverTip>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div role="menu" className={cn('absolute top-full mt-1 z-50 w-60 bg-white rounded-lg border border-hairline shadow-xl py-1 menu-in', align === 'right' ? 'right-0' : 'left-0')}>
            {STATUS_DEFS.filter(({ name }) => !API_MODE || PICKABLE_STATUSES.includes(name)).map(({ name: s }) => (
              <button
                key={s}
                role="menuitem"
                onClick={() => pick(s)}
                className={cn('w-full px-3 py-1.5 text-left hover:bg-sand flex items-center justify-between gap-2', s === q.status && 'bg-primary-wash')}
              >
                <StatusBadge status={s} />
                {s === q.status && <Check className="w-3.5 h-3.5 text-primary-press" />}
              </button>
            ))}
          </div>
        </>
      )}
      {dialog}
    </div>
  )
}

/** Card wrapper for one builder section (mockup: `Za`). */
export function BuilderSection({ id, title, actions, children }: { id: string; title: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <section id={`s-${id}`} data-section={id} className="bg-white rounded-xl shadow-card scroll-mt-32 2xl:scroll-mt-24">
      <header className="px-5 pt-4 pb-1 flex flex-wrap items-center gap-3">
        <h2 className="min-w-0 flex-1 text-md font-semibold text-ink">{title}</h2>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  )
}

const CHIP_TONE = {
  ink: 'bg-ink text-white border-ink',
  good: 'bg-tone-good-soft text-tone-good-ink border-tone-good',
  critical: 'bg-tone-critical-soft text-tone-critical-ink border-tone-critical',
  primary: 'bg-primary-wash text-primary-press border-primary',
}

/** Pressable chip (mockup: `Ma`). */
export function ToggleChip({ active, onClick, children, tone = 'ink' }: { active: boolean; onClick?: () => void; children: ReactNode; tone?: keyof typeof CHIP_TONE }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn('h-8 px-3 rounded-md border text-xs font-semibold transition-colors inline-flex items-center gap-1.5', active ? CHIP_TONE[tone] : 'bg-white border-hairline-strong text-ink-mute hover:text-ink hover:border-ink/40')}
    >
      {active && <Check className="w-3.5 h-3.5" />}
      {children}
    </button>
  )
}

/** Labelled input with a unit suffix (mockup: `bt`). */
export function UnitField({ label, value, suffix, onChange, className }: { label: ReactNode; value: string | number; suffix?: ReactNode; onChange?: (v: string) => void; className?: string }) {
  return (
    <Field label={label} className={className}>
      <div className="relative">
        <input value={value} onChange={(e) => onChange?.(e.target.value)} className={cn('form-input tnum', suffix && 'pr-12')} />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-mute">{suffix}</span>}
      </div>
    </Field>
  )
}

/** Photo placeholder tile (mockup: `Sl`; its `email` prop is accepted but unused there too). */
export function PhotoTile({ label, main }: { label: ReactNode; main?: boolean; email?: boolean }) {
  return (
    <figure className="relative aspect-[4/3] rounded-lg overflow-hidden bg-stone flex flex-col justify-end">
      <div className="absolute inset-0 opacity-60" style={{ backgroundImage: 'repeating-linear-gradient(135deg, var(--color-hairline-strong) 0 2px, transparent 2px 14px)' }} />
      <Image className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 text-ink-faint" />
      <div className="absolute top-2 left-2 flex gap-1">
        {main && (
          <span className="badge bg-ink text-white">
            <Star className="w-3 h-3 mr-1" />
            {t('Principale')}
          </span>
        )}
      </div>
      <figcaption className="relative bg-white/90 px-2.5 py-1.5 text-2xs font-semibold text-ink-secondary">{label}</figcaption>
    </figure>
  )
}
