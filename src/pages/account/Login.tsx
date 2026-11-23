import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { LoaderCircle, LogIn } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { ACCOUNTS, DEMO_PASSWORD, ROLE_LABELS } from '../../auth/permissions'
import { signIn } from '../../auth/session'
import { Notice } from '../../components/states'
import { Avatar, Badge, Field } from '../../components/ui'
import { COMPANIES, repById } from '../../data/mock'
import { useStore } from '../../data/store'
import { t } from '../../i18n'
import { cn } from '../../lib/utils'
import { AuthShell, PasswordInput } from './AuthShell'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** `/connexion` — sign-in. Returns the user to the page they were heading to. */
export default function Login() {
  useStore()
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  const target = from && !from.startsWith('/connexion') ? from : '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [busy, setBusy] = useState(false)

  if (auth.user && !busy) return <Navigate to={target} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const errs: typeof fieldErrors = {}
    if (!email.trim()) errs.email = t('Entrez votre courriel.')
    else if (!EMAIL_RE.test(email.trim())) errs.email = t("Ce courriel n'est pas valide.")
    if (!password) errs.password = t('Entrez votre mot de passe.')
    setFieldErrors(errs)
    setError(null)
    if (errs.email || errs.password) return
    setBusy(true)
    try {
      await signIn(email, password, auth)
      navigate(target, { replace: true })
    } catch (err) {
      setError(t((err as Error).message || 'Courriel ou mot de passe incorrect.'))
      setBusy(false)
    }
  }

  const fill = (accEmail: string) => {
    setEmail(accEmail)
    setPassword(DEMO_PASSWORD)
    setError(null)
    setFieldErrors({})
  }

  const demo = (
    <div className="card p-4">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <p className="label-caps">{t('Comptes de démonstration')}</p>
        <p className="text-2xs text-ink-mute">
          {t('Mot de passe :')} <code className="font-mono text-ink-secondary">{DEMO_PASSWORD}</code>
        </p>
      </div>
      <ul className="mt-2 space-y-0.5">
        {ACCOUNTS.map((a) => {
          const rep = repById(a.repId)
          return (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => fill(a.email)}
                className={cn('w-full flex items-center gap-3 px-2 py-2 rounded-md text-left transition-colors hover:bg-sand', email === a.email && 'bg-primary-wash')}
              >
                <Avatar name={a.name} size="md" color={rep?.color} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink truncate">{a.name}</span>
                  <span className="block text-2xs text-ink-mute truncate">
                    {t(ROLE_LABELS[a.role])} · {a.companies.length === COMPANIES.length ? t('3 compagnies') : a.companies.map((c) => COMPANIES.find((x) => x.id === c)!.short).map((s) => t(s)).join(', ')}
                  </span>
                </span>
                {a.status === 'invite' && <Badge tone="warn">{t('Invité')}</Badge>}
                {a.status === 'desactive' && <Badge tone="neutral">{t('Désactivé')}</Badge>}
              </button>
            </li>
          )
        })}
      </ul>
      <p className="text-2xs text-ink-faint px-1 mt-2">{t('Cliquez sur un compte pour remplir le formulaire. Maquette seulement.')}</p>
    </div>
  )

  return (
    <AuthShell title={t('Connexion')} subtitle={t('Connectez-vous à Hillman Centrale.')} aside={demo}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {error && (
          <Notice tone="critical">
            <span role="alert">{error}</span>
          </Notice>
        )}
        <Field label={t('Courriel')}>
          <input
            type="email"
            inputMode="email"
            autoComplete="username"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!fieldErrors.email || undefined}
            className="form-input"
            placeholder={t('vous@groupehillman.com')}
          />
          {fieldErrors.email && <span className="text-xs text-tone-critical">{fieldErrors.email}</span>}
        </Field>
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor="login-password" className="label-caps">
              {t('Mot de passe')}
            </label>
            <Link to="/mot-de-passe" state={{ email }} className="text-xs font-semibold text-primary-press hover:underline">
              {t('Mot de passe oublié?')}
            </Link>
          </div>
          <PasswordInput id="login-password" value={password} onChange={setPassword} invalid={!!fieldErrors.password} />
          {fieldErrors.password && <span className="text-xs text-tone-critical">{fieldErrors.password}</span>}
        </div>
        <button type="submit" className="btn btn-md btn-primary w-full" disabled={busy}>
          {busy ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
          {busy ? t('Connexion…') : t('Se connecter')}
        </button>
      </form>
    </AuthShell>
  )
}
