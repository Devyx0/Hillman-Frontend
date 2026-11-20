/** Small building blocks shared by the Paramètres and Catalogue tabs. */
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Copy, X } from 'lucide-react'
import { Badge } from '../../../components/ui'
import { Select } from '../../../components/filters'
import { COMPANIES, type CompanyId } from '../../../data/mock'
import type { ConnectionState } from '../../../data/settings'
import { useApp } from '../../../context/AppContext'
import { toast } from '../../../lib/toast'
import { cn } from '../../../lib/utils'
import { t } from '../../../i18n'

export function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: (on: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={cn('w-10 h-6 rounded-full relative transition-colors shrink-0 disabled:opacity-50', on ? 'bg-primary' : 'bg-stone')}
    >
      <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-card transition-all', on ? 'left-[18px]' : 'left-0.5')} />
    </button>
  )
}

/** Company picker used at the top of per-company settings. */
export function CompanySelect({ value, onChange, className }: { value: CompanyId; onChange: (c: CompanyId) => void; className?: string }) {
  return <Select<CompanyId> value={value} onChange={onChange} className={cn('w-56', className)} searchable={false} options={COMPANIES.map((c) => ({ value: c.id, label: c.name }))} />
}

/** Initial company for a per-company screen: the current scope, else Toitures. */
export function useScopeCompany(fallback: CompanyId = 'toit') {
  const { scope } = useApp()
  return useState<CompanyId>(scope === 'all' ? fallback : scope)
}

const STATE_TONE: Record<ConnectionState, 'good' | 'warn' | 'critical' | 'neutral'> = { connecte: 'good', en_attente: 'warn', erreur: 'critical', non_configure: 'neutral' }
const STATE_LABEL: Record<ConnectionState, string> = { connecte: 'Connecté', en_attente: 'En attente', erreur: 'Erreur', non_configure: 'Non configuré' }

export function ConnectionBadge({ state }: { state: ConnectionState }) {
  return (
    <Badge tone={STATE_TONE[state]} dot>
      {t(STATE_LABEL[state])}
    </Badge>
  )
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast(t('Copié dans le presse-papiers'))
  } catch {
    toast(t('Copie impossible — sélectionnez le texte et copiez-le à la main'))
  }
}

/** Read-only value with a copy button (links, DNS records, embed code). */
export function CopyField({ value, label, multiline }: { value: string; label: string; multiline?: boolean }) {
  return (
    <div className="flex items-start gap-2 min-w-0">
      {multiline ? (
        <textarea readOnly value={value} rows={4} aria-label={label} className="form-input h-auto py-2 font-mono text-xs leading-relaxed flex-1" onFocus={(e) => e.currentTarget.select()} />
      ) : (
        <input readOnly value={value} aria-label={label} className="form-input h-8 font-mono text-xs flex-1 min-w-0" onFocus={(e) => e.currentTarget.select()} />
      )}
      <button type="button" className="btn btn-sm btn-secondary shrink-0" onClick={() => copyText(value)} aria-label={t('Copier')}>
        <Copy className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{t('Copier')}</span>
      </button>
    </div>
  )
}

/** Centered modal dialog. */
export function Modal({ open, onClose, title, children, footer, width = 'max-w-lg' }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; width?: string }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className={cn('relative w-full bg-white rounded-xl shadow-float flex flex-col max-h-[90vh] menu-in', width)}>
        <header className="px-5 py-3.5 border-b border-hairline flex items-center justify-between gap-3 shrink-0">
          <h3 className="text-md font-semibold text-ink truncate">{title}</h3>
          <button onClick={onClose} aria-label={t('Fermer')} className="p-1.5 rounded-md text-ink-mute hover:bg-sand">
            <X className="w-4 h-4" />
          </button>
        </header>
        <div className="p-5 overflow-y-auto">{children}</div>
        {footer && <footer className="px-5 py-3 border-t border-hairline flex justify-end gap-2 shrink-0">{footer}</footer>}
      </div>
    </div>,
    document.body,
  )
}

/** Short intro line under a settings section title. */
export function Intro({ children }: { children: ReactNode }) {
  return <p className="text-sm text-ink-mute max-w-3xl">{children}</p>
}

/** Today's date in the mock (YYYY-MM-DD). */
export { TODAY } from '../../../data/mock'

/** Add days to a YYYY-MM-DD date. */
export function addDays(date: string, days: number) {
  const d = new Date(date + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
