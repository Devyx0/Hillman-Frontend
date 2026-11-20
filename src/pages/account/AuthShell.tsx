import { useState, type ReactNode } from 'react'
import { Check, Eye, EyeOff, X } from 'lucide-react'
import { Wordmark } from '../../components/ui'
import { passwordChecks } from '../../auth/session'
import { t } from '../../i18n'
import { LanguageSwitch } from '../../i18n/LanguageProvider'
import { cn } from '../../lib/utils'

/** Full-screen frame for the signed-out pages (sign-in, invitation, password reset). */
export function AuthShell({ title, subtitle, children, aside }: { title: ReactNode; subtitle?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="min-h-screen bg-sand font-sans flex flex-col">
      <header className="h-16 px-4 md:px-8 flex items-center justify-between">
        <Wordmark />
        <LanguageSwitch />
      </header>
      <main className="flex-1 flex flex-col items-center px-4 pt-6 pb-12 md:pt-14">
        <div className="w-full max-w-md space-y-4">
          <div className="card p-6 md:p-8">
            <h1 className="text-xl md:text-2xl font-semibold text-ink tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-ink-mute mt-1.5">{subtitle}</p>}
            <div className="mt-6">{children}</div>
          </div>
          {aside}
        </div>
      </main>
      <footer className="px-6 py-4 text-2xs text-ink-faint text-center">{t('Toitures Hillman · Signature Gouttières · Rénovations Hillman')}</footer>
    </div>
  )
}

/** Password input with a show/hide toggle. */
export function PasswordInput({ value, onChange, autoComplete = 'current-password', invalid, id, autoFocus }: { value: string; onChange: (v: string) => void; autoComplete?: string; invalid?: boolean; id?: string; autoFocus?: boolean }) {
  const [shown, setShown] = useState(false)
  return (
    <span className="relative block">
      <input
        id={id}
        type={shown ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
        autoFocus={autoFocus}
        className="form-input pr-10"
      />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        className="absolute right-1 top-1/2 -translate-y-1/2 p-2 rounded-md text-ink-mute hover:text-ink hover:bg-sand"
        aria-label={shown ? t('Masquer le mot de passe') : t('Afficher le mot de passe')}
      >
        {shown ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </span>
  )
}

/** Live checklist of the password strength rules. */
export function PasswordRules({ password }: { password: string }) {
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
      {passwordChecks(password).map((c) => (
        <li key={c.label} className={cn('flex items-center gap-1.5 text-xs', c.ok ? 'text-tone-good' : 'text-ink-mute')}>
          {c.ok ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0 text-ink-faint" />}
          {t(c.label)}
        </li>
      ))}
    </ul>
  )
}
