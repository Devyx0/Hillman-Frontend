/**
 * Shared UI for the quote (soumission) screens.
 *
 * Minified → exported:
 *   r4 → StatusPicker, Za → BuilderSection, Ma → ToggleChip, bt → UnitField, Sl → PhotoTile
 */
import { useState, type ReactNode } from 'react'
import { Check, ChevronDown, Image, Star } from 'lucide-react'
import { QUOTE_STATUSES } from '../data/mock'
import { t } from '../i18n'
import { cn } from '../lib/utils'
import { Field, StatusBadge } from './ui'

/** Inline status dropdown shown in list rows (mockup: `r4`). */
export function StatusPicker({ q, onChange }: { q: { status: string }; onChange: (status: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1 rounded-full hover:ring-2 hover:ring-hairline-strong" aria-label={t('Changer le statut')}>
        <StatusBadge status={q.status} />
        <ChevronDown className="w-3 h-3 text-ink-faint" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 w-60 bg-white rounded-lg border border-hairline shadow-xl py-1 menu-in">
            {QUOTE_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => {
                  onChange(s)
                  setOpen(false)
                }}
                className={cn('w-full px-3 py-1.5 text-left hover:bg-sand flex items-center', s === q.status && 'bg-primary-wash')}
              >
                <StatusBadge status={s} />
              </button>
            ))}
          </div>
        </>
      )}
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
