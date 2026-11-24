import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CircleCheck, LoaderCircle, MailCheck, MailX } from 'lucide-react'
import { ACCOUNTS } from '../../auth/permissions'
import { passwordIsStrong, setPassword as storePassword } from '../../auth/session'
import { Notice } from '../../components/states'
import { Field } from '../../components/ui'
import { request } from '../../data/store'
import { t } from '../../i18n'
import { AuthShell, PasswordInput, PasswordRules } from './AuthShell'
import { API_MODE } from '../../api/config'
import { getSession, requestPasswordReset, updatePassword } from '../../api/auth'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const BackToLogin = () => (
  <Link to="/connexion" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-press hover:underline">
    <ArrowLeft className="w-4 h-4" />
    {t('Retour à la connexion')}
  </Link>
)

/**
 * `/mot-de-passe` — request a reset link by email; `/mot-de-passe?token=…` sets a new password.
 * Mock: the token is the account id, and the "email" link is shown on the confirmation screen.
 */
export default function ResetPassword() {
  const [params] = useSearchParams()
  if (API_MODE) {
    // Supabase e-mail links land here (see consumeAuthRedirect): `nouveau=1` with a session, or `lien=invalide`.
    if (params.get('lien') === 'invalide') return <InvalidLink />
    if (params.get('nouveau') !== null) return <ApiSetNewPassword />
    return <RequestLink />
  }
  const token = params.get('token')
  return token !== null ? <SetNewPassword token={token} /> : <RequestLink />
}

function InvalidLink() {
  return (
    <AuthShell title={t('Lien invalide')}>
      <div className="flex flex-col items-center text-center gap-3">
        <span className="w-12 h-12 rounded-full bg-sand flex items-center justify-center">
          <MailX className="w-5 h-5 text-ink-mute" />
        </span>
        <p className="text-sm text-ink-mute">{t('Ce lien de réinitialisation est invalide ou a expiré. Demandez un nouveau lien.')}</p>
        <Link to="/mot-de-passe" className="btn btn-sm btn-primary mt-2">
          {t('Demander un nouveau lien')}
        </Link>
        <BackToLogin />
      </div>
    </AuthShell>
  )
}

/** API mode: the reset / invitation link signed the person in; they choose their password. */
function ApiSetNewPassword() {
  const navigate = useNavigate()
  const session = getSession()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  if (!session) return <InvalidLink />
  if (done)
    return (
      <AuthShell title={t('Mot de passe modifié')}>
        <div className="flex flex-col items-center text-center gap-3">
          <span className="w-12 h-12 rounded-full bg-tone-good-soft flex items-center justify-center">
            <CircleCheck className="w-5 h-5 text-tone-good" />
          </span>
          <p className="text-sm text-ink-mute">{t('Votre mot de passe a été enregistré.')}</p>
          <button className="btn btn-sm btn-primary mt-2" onClick={() => navigate('/', { replace: true })}>
            {t('Ouvrir Hillman Centrale')}
          </button>
        </div>
      </AuthShell>
    )

  const pwError = !passwordIsStrong(password) ? t('Le mot de passe ne respecte pas les règles.') : null
  const confirmError = confirm !== password ? t('Les mots de passe ne correspondent pas.') : null
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setTried(true)
    if (pwError || confirmError) return
    setBusy(true)
    setError(null)
    try {
      await updatePassword(password)
      setDone(true)
    } catch (err) {
      setError(t((err as Error).message))
    } finally {
      setBusy(false)
    }
  }
  return (
    <AuthShell title={t('Nouveau mot de passe')} subtitle={session.email ? t('Choisissez un nouveau mot de passe pour {email}.', { email: session.email }) : undefined}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="reset-password" className="label-caps">
            {t('Nouveau mot de passe')}
          </label>
          <PasswordInput id="reset-password" value={password} onChange={setPassword} autoComplete="new-password" invalid={tried && !!pwError} autoFocus />
          <div className="pt-1">
            <PasswordRules password={password} />
          </div>
        </div>
        <Field label={t('Confirmer le mot de passe')}>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" className="form-input" aria-invalid={(tried && !!confirmError) || undefined} />
          {tried && confirmError && <span className="text-xs text-tone-critical">{confirmError}</span>}
        </Field>
        {tried && pwError && <Notice tone="critical">{pwError}</Notice>}
        {error && <Notice tone="critical">{error}</Notice>}
        <button type="submit" className="btn btn-md btn-primary w-full" disabled={busy}>
          {busy && <LoaderCircle className="w-4 h-4 animate-spin" />}
          {t('Enregistrer le mot de passe')}
        </button>
      </form>
    </AuthShell>
  )
}

function RequestLink() {
  const location = useLocation()
  const [email, setEmail] = useState((location.state as { email?: string } | null)?.email ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return setError(t('Entrez votre courriel.'))
    if (!EMAIL_RE.test(email.trim())) return setError(t("Ce courriel n'est pas valide."))
    setError(null)
    setBusy(true)
    try {
      if (API_MODE) await requestPasswordReset(email)
      else await request(null, { ms: 600 })
      setSent(email.trim())
    } catch {
      setError(t("Impossible d'envoyer le lien. Réessayez dans un moment."))
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    const acc = API_MODE ? undefined : ACCOUNTS.find((a) => a.email.toLowerCase() === sent.toLowerCase() && a.status === 'actif')
    return (
      <AuthShell title={t('Vérifiez vos courriels')}>
        <div className="flex flex-col items-center text-center gap-3">
          <span className="w-12 h-12 rounded-full bg-primary-wash flex items-center justify-center">
            <MailCheck className="w-5 h-5 text-primary-press" />
          </span>
          <p className="text-sm text-ink-mute">{t('Si un compte existe pour {email}, vous recevrez un lien pour choisir un nouveau mot de passe. Le lien est valide 1 heure.', { email: sent })}</p>
          {acc && (
            <Notice tone="info" className="text-left w-full">
              {t('Démo : aucun courriel n’est envoyé.')}{' '}
              <Link to={`/mot-de-passe?token=${acc.id}`} className="font-semibold underline">
                {t('Ouvrir le lien de réinitialisation')}
              </Link>
            </Notice>
          )}
          <div className="flex flex-col items-center gap-2 mt-2">
            <button className="text-xs font-semibold text-ink-mute hover:text-ink" onClick={() => setSent(null)}>
              {t('Utiliser un autre courriel')}
            </button>
            <BackToLogin />
          </div>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell title={t('Mot de passe oublié')} subtitle={t('Entrez votre courriel. Nous vous enverrons un lien pour choisir un nouveau mot de passe.')}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label={t('Courriel')}>
          <input type="email" inputMode="email" autoComplete="username" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!error || undefined} className="form-input" />
          {error && (
            <span className="text-xs text-tone-critical" role="alert">
              {error}
            </span>
          )}
        </Field>
        <button type="submit" className="btn btn-md btn-primary w-full" disabled={busy}>
          {busy && <LoaderCircle className="w-4 h-4 animate-spin" />}
          {t('Envoyer le lien')}
        </button>
        <div className="text-center">
          <BackToLogin />
        </div>
      </form>
    </AuthShell>
  )
}

function SetNewPassword({ token }: { token: string }) {
  const navigate = useNavigate()
  const account = ACCOUNTS.find((a) => a.id === token && a.status === 'actif')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  if (!account) {
    return (
      <AuthShell title={t('Lien invalide')}>
        <div className="flex flex-col items-center text-center gap-3">
          <span className="w-12 h-12 rounded-full bg-sand flex items-center justify-center">
            <MailX className="w-5 h-5 text-ink-mute" />
          </span>
          <p className="text-sm text-ink-mute">{t('Ce lien de réinitialisation est invalide ou a expiré. Demandez un nouveau lien.')}</p>
          <Link to="/mot-de-passe" className="btn btn-sm btn-primary mt-2">
            {t('Demander un nouveau lien')}
          </Link>
          <BackToLogin />
        </div>
      </AuthShell>
    )
  }

  if (done) {
    return (
      <AuthShell title={t('Mot de passe modifié')}>
        <div className="flex flex-col items-center text-center gap-3">
          <span className="w-12 h-12 rounded-full bg-tone-good-soft flex items-center justify-center">
            <CircleCheck className="w-5 h-5 text-tone-good" />
          </span>
          <p className="text-sm text-ink-mute">{t('Votre mot de passe a été modifié. Vous pouvez maintenant vous connecter.')}</p>
          <button className="btn btn-sm btn-primary mt-2" onClick={() => navigate('/connexion', { replace: true })}>
            {t('Aller à la connexion')}
          </button>
        </div>
      </AuthShell>
    )
  }

  const pwError = !passwordIsStrong(password) ? t('Le mot de passe ne respecte pas les règles.') : null
  const confirmError = confirm !== password ? t('Les mots de passe ne correspondent pas.') : null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setTried(true)
    if (pwError || confirmError) return
    setBusy(true)
    await request(null, { ms: 500 })
    storePassword(account.id, password)
    setBusy(false)
    setDone(true)
  }

  return (
    <AuthShell title={t('Nouveau mot de passe')} subtitle={t('Choisissez un nouveau mot de passe pour {email}.', { email: account.email })}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="reset-password" className="label-caps">
            {t('Nouveau mot de passe')}
          </label>
          <PasswordInput id="reset-password" value={password} onChange={setPassword} autoComplete="new-password" invalid={tried && !!pwError} autoFocus />
          <div className="pt-1">
            <PasswordRules password={password} />
          </div>
        </div>
        <Field label={t('Confirmer le mot de passe')}>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" className="form-input" aria-invalid={(tried && !!confirmError) || undefined} />
          {tried && confirmError && <span className="text-xs text-tone-critical">{confirmError}</span>}
        </Field>
        {tried && pwError && <Notice tone="critical">{pwError}</Notice>}
        <button type="submit" className="btn btn-md btn-primary w-full" disabled={busy}>
          {busy && <LoaderCircle className="w-4 h-4 animate-spin" />}
          {t('Enregistrer le mot de passe')}
        </button>
      </form>
    </AuthShell>
  )
}
