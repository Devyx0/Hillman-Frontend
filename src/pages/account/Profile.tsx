import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CalendarDays, KeyRound, Languages, LoaderCircle, LogOut, UserRound } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { ACCOUNTS, ROLE_LABELS, saveAccount } from '../../auth/permissions'
import { API_MODE } from '../../api/config'
import { updatePassword, verifyPassword } from '../../api/auth'
import { errorMessage } from '../../api/http'
import { formatPhone, isValidPhone } from '../../api/mappers'
import { updateMyProfile } from '../../data/actions'
import { REF } from '../../data/api-sync'
import { checkPassword, passwordIsStrong, profileExtras, saveProfileExtras, setPassword as storePassword, setViewAsOrigin, type NotificationEvent } from '../../auth/session'
import { Notice } from '../../components/states'
import { CalendarConnectTab } from '../catalogue/CalendarConnectTab'
import { Avatar, Card, CompanyLogo, Field, Page, PageHeader } from '../../components/ui'
import { repById } from '../../data/mock'
import { request, useStore } from '../../data/store'
import { t } from '../../i18n'
import { useLanguage } from '../../i18n/LanguageProvider'
import { toast } from '../../lib/toast'
import { cn } from '../../lib/utils'
import { PasswordInput, PasswordRules } from './AuthShell'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const EVENTS: { id: NotificationEvent; label: string; hint: string }[] = [
  { id: 'quoteOpened', label: 'Soumission ouverte par un client', hint: 'Quand un client consulte une de vos soumissions' },
  { id: 'quoteSigned', label: 'Soumission signée', hint: 'Quand un client accepte et signe en ligne' },
  { id: 'leadAssigned', label: 'Nouveau lead assigné', hint: 'Quand un lead vous est attribué' },
  { id: 'appointmentReminder', label: 'Rappel de rendez-vous', hint: '1 heure avant chaque rendez-vous' },
  { id: 'dailySummary', label: 'Résumé de la journée', hint: 'Chaque matin à 7 h' },
]

/** `/profil` — the signed-in user's own account. */
export default function Profile() {
  useStore()
  const { user, logout, impersonate } = useAuth()
  const navigate = useNavigate()
  if (!user) return null
  const rep = repById(user.repId)

  const signOut = () => {
    setViewAsOrigin(null)
    logout()
    navigate('/connexion', { replace: true })
  }

  return (
    <Page className="max-w-4xl">
      <PageHeader
        title={t('Mon profil')}
        subtitle={
          <span className="inline-flex items-center gap-2 flex-wrap">
            {t(ROLE_LABELS[user.role])}
            <span className="inline-flex items-center gap-1.5">
              {user.companies.map((c) => (
                <CompanyLogo key={c} id={c} className="h-5 max-w-[64px]" />
              ))}
            </span>
          </span>
        }
        actions={
          <button className="btn btn-sm btn-secondary" onClick={signOut}>
            <LogOut className="w-4 h-4" />
            {t('Se déconnecter')}
          </button>
        }
      />

      {API_MODE ? <ApiInfoCard /> : <InfoCard key={`info-${user.id}`} refresh={() => impersonate(user.id)} avatarColor={rep?.color} />}
      <LanguageCard />
      <PasswordCard key={`pw-${user.id}`} />
      <NotificationsCard key={`notif-${user.id}`} />

      {/* Every user connects their own Google / Outlook calendar here (no admin permission needed). */}
      <section>
        <h2 className="text-md font-semibold text-ink flex items-center gap-2 mb-3">
          <CalendarDays className="w-4 h-4 text-ink-mute" />
          {t('Agenda connecté')}
        </h2>
        <CalendarConnectTab />
      </section>

      <div className="flex justify-end md:hidden">
        <button className="btn btn-sm btn-secondary w-full" onClick={signOut}>
          <LogOut className="w-4 h-4" />
          {t('Se déconnecter')}
        </button>
      </div>
    </Page>
  )
}

function InfoCard({ refresh, avatarColor }: { refresh: () => void; avatarColor?: string }) {
  const { user } = useAuth()
  const account = user!
  const [name, setName] = useState(account.name)
  const [email, setEmail] = useState(account.email)
  const [phone, setPhone] = useState(profileExtras(account).phone)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const dirty = name !== account.name || email !== account.email || phone !== profileExtras(account).phone

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (API_MODE) return
    if (!name.trim()) return setError(t('Entrez votre nom.'))
    if (!EMAIL_RE.test(email.trim())) return setError(t("Ce courriel n'est pas valide."))
    if (ACCOUNTS.some((a) => a.id !== account.id && a.email.toLowerCase() === email.trim().toLowerCase())) return setError(t('Ce courriel est déjà utilisé par un autre compte.'))
    setError(null)
    setBusy(true)
    await request(null, { ms: 400 })
    saveAccount({ ...account, name: name.trim(), email: email.trim() })
    saveProfileExtras(account.id, { ...profileExtras(account), phone: phone.trim() })
    refresh()
    setBusy(false)
    toast(t('Profil enregistré'))
  }

  return (
    <Card title={t('Informations')} icon={UserRound}>
      <form onSubmit={save} noValidate className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar name={name || account.name} size="xl" color={avatarColor} />
          <div className="min-w-0">
            <p className="text-md font-semibold text-ink truncate">{account.name}</p>
            <p className="text-xs text-ink-mute truncate">{account.email}</p>
          </div>
        </div>
        {/* The API has no endpoint to edit one's own profile yet: shown read-only. */}
        {API_MODE && <Notice tone="info">{t('Votre nom, courriel et téléphone sont gérés par un administrateur.')}</Notice>}
        <fieldset disabled={API_MODE} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t('Nom complet')}>
            <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </Field>
          <Field label={t('Courriel')}>
            <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </Field>
          <Field label={t('Téléphone')}>
            <input className="form-input tnum" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
          </Field>
        </fieldset>
        {error && <Notice tone="critical">{error}</Notice>}
        <div className={cn('flex justify-end', API_MODE && 'hidden')}>
          <button type="submit" className="btn btn-sm btn-primary" disabled={!dirty || busy}>
            {busy && <LoaderCircle className="w-4 h-4 animate-spin" />}
            {t('Enregistrer')}
          </button>
        </div>
      </form>
    </Card>
  )
}

/** API mode: PATCH /me — first and last name, phone, agenda colour. The e-mail is the sign-in and stays as is. */
function ApiInfoCard() {
  const { user, patchUser } = useAuth()
  const account = user!
  const profile = REF.me?.user
  const initial = { first: profile?.first_name ?? '', last: profile?.last_name ?? '', phone: formatPhone(profile?.phone), color: profile?.calendar_color ?? '#3b82f6' }
  const [f, setF] = useState(initial)
  const [saved, setSaved] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const dirty = JSON.stringify(f) !== JSON.stringify(saved)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!f.first.trim() || !f.last.trim()) return setError(t('Entrez votre prénom et votre nom.'))
    if (f.phone.trim() && !isValidPhone(f.phone)) return setError(t('Numéro de téléphone invalide (10 chiffres attendus).'))
    setError(null)
    setBusy(true)
    try {
      const p = await updateMyProfile({
        first_name: f.first.trim(),
        last_name: f.last.trim(),
        phone: f.phone.trim() || null,
        // The colour input always holds #rrggbb; only sent when changed.
        ...(f.color !== saved.color ? { calendar_color: f.color } : {}),
      })
      const next = { first: p.first_name, last: p.last_name, phone: formatPhone(p.phone), color: p.calendar_color ?? f.color }
      setF(next)
      setSaved(next)
      patchUser({ name: `${p.first_name} ${p.last_name}`.trim() })
      toast(t('Profil enregistré'))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title={t('Informations')} icon={UserRound}>
      <form onSubmit={save} noValidate className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar name={`${f.first} ${f.last}`.trim() || account.name} size="xl" />
          <div className="min-w-0">
            <p className="text-md font-semibold text-ink truncate">{account.name}</p>
            <p className="text-xs text-ink-mute truncate">{account.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t('Prénom')}>
            <input className="form-input" value={f.first} onChange={(e) => setF({ ...f, first: e.target.value })} autoComplete="given-name" maxLength={100} />
          </Field>
          <Field label={t('Nom')}>
            <input className="form-input" value={f.last} onChange={(e) => setF({ ...f, last: e.target.value })} autoComplete="family-name" maxLength={100} />
          </Field>
          <Field label={t('Courriel')}>
            <input className="form-input bg-sand" value={account.email} readOnly title={t('Le courriel sert à la connexion; un administrateur peut le changer.')} />
          </Field>
          <Field label={t('Téléphone')}>
            <input className="form-input tnum" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} autoComplete="tel" />
          </Field>
          <Field label={t('Couleur dans l’agenda')}>
            <span className="flex items-center gap-2">
              <input type="color" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} className="h-10 w-14 rounded-md border border-hairline-input bg-white p-1" aria-label={t('Couleur dans l’agenda')} />
              <span className="text-xs text-ink-mute tnum uppercase">{f.color}</span>
            </span>
          </Field>
        </div>
        {error && <Notice tone="critical">{error}</Notice>}
        <div className="flex justify-end">
          <button type="submit" className="btn btn-sm btn-primary" disabled={!dirty || busy}>
            {busy && <LoaderCircle className="w-4 h-4 animate-spin" />}
            {t('Enregistrer')}
          </button>
        </div>
      </form>
    </Card>
  )
}

function LanguageCard() {
  const { lang, setLang } = useLanguage()
  const options = [
    { id: 'fr' as const, label: 'Français' },
    { id: 'en' as const, label: 'English' },
  ]
  return (
    <Card title={t('Langue')} icon={Languages}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="text-sm text-ink-mute flex-1">{t("Langue de l'application. Les messages aux clients suivent la langue de leur fiche.")}</p>
        <div className="inline-flex p-0.5 rounded-md bg-sand shrink-0 self-start" role="radiogroup" aria-label={t('Langue')}>
          {options.map((o) => (
            <button
              key={o.id}
              role="radio"
              aria-checked={lang === o.id}
              onClick={() => {
                if (lang !== o.id) setLang(o.id)
              }}
              className={cn('h-8 px-3 rounded-[8px] text-sm font-semibold', lang === o.id ? 'bg-white text-ink shadow-1' : 'text-ink-mute hover:text-ink')}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </Card>
  )
}

function PasswordCard() {
  const { user } = useAuth()
  const account = user!
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (API_MODE) {
      if (!passwordIsStrong(next)) return setError(t('Le mot de passe ne respecte pas les règles.'))
      if (next !== confirm) return setError(t('Les mots de passe ne correspondent pas.'))
      setError(null)
      setBusy(true)
      try {
        if (!(await verifyPassword(current))) {
          setBusy(false)
          return setError(t('Le mot de passe actuel est incorrect.'))
        }
        await updatePassword(next)
      } catch (err) {
        setBusy(false)
        return setError(t((err as Error).message))
      }
      setBusy(false)
      setCurrent('')
      setNext('')
      setConfirm('')
      toast(t('Mot de passe modifié'))
      return
    }
    if (!checkPassword(account.id, current)) return setError(t('Le mot de passe actuel est incorrect.'))
    if (!passwordIsStrong(next)) return setError(t('Le mot de passe ne respecte pas les règles.'))
    if (next !== confirm) return setError(t('Les mots de passe ne correspondent pas.'))
    setError(null)
    setBusy(true)
    await request(null, { ms: 400 })
    storePassword(account.id, next)
    setBusy(false)
    setCurrent('')
    setNext('')
    setConfirm('')
    toast(t('Mot de passe modifié'))
  }

  return (
    <Card title={t('Mot de passe')} icon={KeyRound}>
      <form onSubmit={save} noValidate className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label={t('Mot de passe actuel')}>
            <PasswordInput value={current} onChange={setCurrent} />
          </Field>
          <Field label={t('Nouveau mot de passe')}>
            <PasswordInput value={next} onChange={setNext} autoComplete="new-password" />
          </Field>
          <Field label={t('Confirmer le mot de passe')}>
            <PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" />
          </Field>
        </div>
        {next && <PasswordRules password={next} />}
        {error && <Notice tone="critical">{error}</Notice>}
        <div className="flex justify-end">
          <button type="submit" className="btn btn-sm btn-primary" disabled={busy || !current || !next}>
            {busy && <LoaderCircle className="w-4 h-4 animate-spin" />}
            {t('Changer le mot de passe')}
          </button>
        </div>
      </form>
    </Card>
  )
}

function NotificationsCard() {
  const { user } = useAuth()
  const account = user!
  const extras = profileExtras(account)
  const toggle = (id: NotificationEvent, channel: 'email' | 'sms') => {
    const notify = { ...extras.notify, [id]: { ...extras.notify[id], [channel]: !extras.notify[id][channel] } }
    saveProfileExtras(account.id, { ...extras, notify })
    toast(t('Préférences enregistrées'))
  }
  return (
    <Card title={t('Notifications')} icon={Bell} pad={false}>
      <div className="grid grid-cols-[1fr_auto_auto] items-center">
        <span className="px-5 py-2 label-caps">{t('Événement')}</span>
        <span className="w-20 py-2 label-caps text-center">{t('Courriel')}</span>
        <span className="w-20 py-2 pr-2 label-caps text-center">{t('Texto')}</span>
        {EVENTS.map((ev) => (
          <div key={ev.id} className="contents">
            <div className="px-5 py-3 border-t border-hairline min-w-0">
              <p className="text-sm font-semibold text-ink">{t(ev.label)}</p>
              <p className="text-xs text-ink-mute">{t(ev.hint)}</p>
            </div>
            {(['email', 'sms'] as const).map((ch) => (
              <div key={ch} className={cn('w-20 h-full flex items-center justify-center border-t border-hairline', ch === 'sms' && 'pr-2')}>
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-[var(--color-primary)]"
                  checked={extras.notify[ev.id][ch]}
                  onChange={() => toggle(ev.id, ch)}
                  aria-label={`${t(ev.label)} · ${ch === 'email' ? t('Courriel') : t('Texto')}`}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </Card>
  )
}
