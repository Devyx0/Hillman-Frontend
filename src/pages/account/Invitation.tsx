import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { LoaderCircle, MailX } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { ACCOUNTS, ROLE_LABELS, saveAccount } from '../../auth/permissions'
import { passwordIsStrong, setPassword as storePassword } from '../../auth/session'
import { Notice } from '../../components/states'
import { CompanyLogo, Field } from '../../components/ui'
import { useStore } from '../../data/store'
import { t } from '../../i18n'
import { toast } from '../../lib/toast'
import { AuthShell, PasswordInput, PasswordRules } from './AuthShell'

/**
 * `/invitation/:token` — an invited user picks their name and password, which activates the
 * account and signs them in. Mock: the token is the account id (e.g. `/invitation/u8`).
 */
export default function Invitation() {
  useStore()
  const { token } = useParams()
  const { impersonate } = useAuth()
  const navigate = useNavigate()
  const account = ACCOUNTS.find((a) => a.id === token)

  const [name, setName] = useState(account?.name ?? '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!account || account.status !== 'invite') {
    const used = account?.status === 'actif'
    return (
      <AuthShell title={used ? t('Invitation déjà utilisée') : t('Invitation invalide')}>
        <div className="flex flex-col items-center text-center gap-3">
          <span className="w-12 h-12 rounded-full bg-sand flex items-center justify-center">
            <MailX className="w-5 h-5 text-ink-mute" />
          </span>
          <p className="text-sm text-ink-mute">
            {used
              ? t('Ce compte est déjà activé. Connectez-vous avec votre courriel et votre mot de passe.')
              : account?.status === 'desactive'
                ? t('Ce compte est désactivé. Contactez un administrateur.')
                : t("Ce lien d'invitation est invalide ou a expiré. Demandez à un administrateur de vous renvoyer une invitation.")}
          </p>
          <Link to="/connexion" className="btn btn-sm btn-primary mt-2">
            {t('Aller à la connexion')}
          </Link>
        </div>
      </AuthShell>
    )
  }

  const nameError = !name.trim() ? t('Entrez votre nom.') : null
  const pwError = !passwordIsStrong(password) ? t('Le mot de passe ne respecte pas les règles.') : null
  const confirmError = confirm !== password ? t('Les mots de passe ne correspondent pas.') : null

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTried(true)
    if (nameError || pwError || confirmError) return
    setBusy(true)
    window.setTimeout(() => {
      saveAccount({ ...account, name: name.trim(), status: 'actif', lastLogin: new Date().toISOString().slice(0, 16).replace('T', ' ') })
      storePassword(account.id, password)
      impersonate(account.id)
      toast(t('Compte activé. Bienvenue, {name}!', { name: name.trim().split(/\s+/)[0] }))
      navigate('/', { replace: true })
    }, 500)
  }

  return (
    <AuthShell title={t('Activer votre compte')} subtitle={t('Vous avez été invité à rejoindre Hillman Centrale. Choisissez votre mot de passe pour commencer.')}>
      <div className="flex items-center gap-3 rounded-lg bg-sand px-3 py-2.5 mb-5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink truncate">{account.email}</p>
          <p className="text-2xs text-ink-mute">{t(ROLE_LABELS[account.role])}</p>
        </div>
        <span className="flex items-center gap-1.5 shrink-0">
          {account.companies.map((c) => (
            <CompanyLogo key={c} id={c} className="h-6 max-w-[72px]" />
          ))}
        </span>
      </div>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label={t('Nom complet')}>
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="form-input" aria-invalid={(tried && !!nameError) || undefined} />
          {tried && nameError && <span className="text-xs text-tone-critical">{nameError}</span>}
        </Field>
        <div className="flex flex-col gap-1">
          <label htmlFor="inv-password" className="label-caps">
            {t('Mot de passe')}
          </label>
          <PasswordInput id="inv-password" value={password} onChange={setPassword} autoComplete="new-password" invalid={tried && !!pwError} />
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
          {t('Activer mon compte')}
        </button>
      </form>
    </AuthShell>
  )
}
