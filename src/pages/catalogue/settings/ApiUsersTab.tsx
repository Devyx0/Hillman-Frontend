/**
 * Paramètres → Utilisateurs with the backend (admin): GET /companies/:id/users, POST .../users/invite and
 * PATCH .../users/:userId (role, active). An e-mail that already has an account gets the membership without an
 * e-mail; a new one gets a Supabase invitation. The server keeps an active admin per company and refuses that an
 * admin demotes or deactivates themselves (its message is shown).
 */
import { useEffect, useState, type FormEvent } from 'react'
import { LoaderCircle, Search, UserPlus, Users } from 'lucide-react'
import * as api from '../../../api/endpoints'
import { errorMessage } from '../../../api/http'
import { formatPhone } from '../../../api/mappers'
import type { ApiCompanyUser, MembershipRole } from '../../../api/types'
import { useAuth } from '../../../auth/AuthContext'
import { Badge, Card, Drawer, Empty, Field } from '../../../components/ui'
import { ErrorState, Notice, SkeletonRows, confirmAction } from '../../../components/states'
import { REF, companyUuid, refreshReps } from '../../../data/api-sync'
import { COMPANIES, type CompanyId } from '../../../data/mock'
import { locale, t } from '../../../i18n'
import { toast } from '../../../lib/toast'
import { normalize } from '../../../lib/utils'

const ROLES: [MembershipRole, string][] = [
  ['representative', 'Représentant'],
  ['coordination', 'Coordonnatrice'],
  ['admin', 'Administrateur'],
]
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const day = (iso: string) => new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' })

export function ApiUsersTab() {
  const { user } = useAuth()
  // Only the companies where the signed-in user is admin can be managed.
  const adminCompanies = COMPANIES.filter((c) => REF.me?.memberships.some((m) => m.slug === c.id && m.role === 'admin'))
  const [company, setCompany] = useState<CompanyId | undefined>(adminCompanies[0]?.id)
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; users: ApiCompanyUser[]; error?: string }>({ status: 'loading', users: [] })
  const [attempt, setAttempt] = useState(0)
  const [query, setQuery] = useState('')
  const [inviting, setInviting] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    const uuid = companyUuid(company)
    if (!uuid) return
    let live = true
    setState({ status: 'loading', users: [] })
    api.listCompanyUsers(uuid).then(
      (users) => live && setState({ status: 'ready', users }),
      (e) => live && setState({ status: 'error', users: [], error: errorMessage(e) }),
    )
    return () => {
      live = false
    }
  }, [company, attempt])

  if (!adminCompanies.length || !company) return <Notice tone="info">{t('Seuls les administrateurs gèrent les utilisateurs.')}</Notice>

  const replace = (u: ApiCompanyUser) => setState((s) => ({ ...s, users: s.users.map((x) => (x.user_id === u.user_id ? u : x)) }))

  const change = async (u: ApiCompanyUser, body: { role?: MembershipRole; is_active?: boolean }, message: string) => {
    setBusyId(u.user_id)
    try {
      replace(await api.updateMembership(companyUuid(company)!, u.user_id, body))
      toast(message)
      // Who appears in the « Représentant » pickers may have changed.
      void refreshReps(company).catch(() => undefined)
    } catch (e) {
      toast(errorMessage(e))
    } finally {
      setBusyId(null)
    }
  }

  const toggleActive = async (u: ApiCompanyUser) => {
    const name = `${u.first_name} ${u.last_name}`.trim()
    if (u.is_active) {
      const ok = await confirmAction({
        title: t('Désactiver {name}?', { name }),
        body: t('Cette personne n’aura plus accès à cette compagnie. Ses soumissions, clients et leads sont conservés.'),
        confirmLabel: t('Désactiver'),
        danger: true,
      })
      if (!ok) return
    }
    await change(u, { is_active: !u.is_active }, u.is_active ? t('{name} est désactivé', { name }) : t('{name} est réactivé', { name }))
  }

  const q = normalize(query.trim())
  const rows = state.users.filter((u) => !q || normalize(`${u.first_name} ${u.last_name} ${u.email ?? ''}`).includes(q))

  return (
    <div className="space-y-4">
      <Card
        title={t('Utilisateurs')}
        icon={Users}
        pad={false}
        actions={
          <button className="btn btn-xs btn-primary" onClick={() => setInviting(true)}>
            <UserPlus className="w-3.5 h-3.5" />
            {t('Inviter')}
          </button>
        }
      >
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-hairline">
          {adminCompanies.length > 1 && (
            <select className="form-input h-8 text-xs w-auto" value={company} onChange={(e) => setCompany(e.target.value as CompanyId)} aria-label={t('Compagnie')}>
              {adminCompanies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <label className="relative flex-1 min-w-[10rem]">
            <Search className="w-4 h-4 text-ink-faint absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input className="form-input h-8 pl-8" placeholder={t('Rechercher (nom ou courriel)')} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={t('Rechercher un utilisateur')} />
          </label>
        </div>
        {state.status === 'loading' && <SkeletonRows rows={4} />}
        {state.status === 'error' && <ErrorState onRetry={() => setAttempt((n) => n + 1)}>{state.error}</ErrorState>}
        {state.status === 'ready' && rows.length === 0 && <Empty icon={Users} title={t('Aucun utilisateur')} />}
        {state.status === 'ready' && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm [&_td]:px-4 [&_th]:px-4">
              <thead className="border-b border-hairline">
                <tr>
                  <th className="th">{t('Utilisateur')}</th>
                  <th className="th">{t('Rôle')}</th>
                  <th className="th">{t('Connexion')}</th>
                  <th className="th text-right">{t('Accès')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {rows.map((u) => {
                  const self = u.user_id === user?.id
                  const busy = busyId === u.user_id
                  return (
                    <tr key={u.user_id} className={u.is_active ? '' : 'opacity-60'}>
                      <td className="td">
                        <p className="font-semibold text-ink">
                          {`${u.first_name} ${u.last_name}`.trim()}
                          {self && <span className="ml-2 text-2xs font-normal text-ink-mute">{t('(vous)')}</span>}
                        </p>
                        <p className="text-xs text-ink-mute">
                          {u.email ?? '—'}
                          {u.phone ? ` · ${formatPhone(u.phone)}` : ''}
                        </p>
                      </td>
                      <td className="td">
                        <select
                          className="form-input h-8 text-xs w-auto"
                          value={u.role}
                          disabled={busy || self}
                          title={self ? t('Vous ne pouvez pas changer votre propre rôle.') : undefined}
                          onChange={(e) => {
                            const role = e.target.value as MembershipRole
                            void change(u, { role }, t('Rôle de {name} : {role}', { name: `${u.first_name} ${u.last_name}`.trim(), role: t(ROLES.find(([r]) => r === role)![1]) }))
                          }}
                          aria-label={t('Rôle')}
                        >
                          {ROLES.map(([r, label]) => (
                            <option key={r} value={r}>
                              {t(label)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="td text-xs text-ink-mute">
                        {!u.has_login ? (
                          <Badge tone="neutral">{t('Sans connexion')}</Badge>
                        ) : u.last_sign_in_at ? (
                          t('Dernière connexion le {date}', { date: day(u.last_sign_in_at) })
                        ) : (
                          <Badge tone="warn">{u.invited_at ? t('Invité le {date}', { date: day(u.invited_at) }) : t('Invité')}</Badge>
                        )}
                      </td>
                      <td className="td text-right">
                        {busy ? (
                          <LoaderCircle className="w-4 h-4 animate-spin inline text-ink-mute" />
                        ) : (
                          <button className="btn btn-xs btn-ghost" disabled={self} onClick={() => void toggleActive(u)} title={self ? t('Vous ne pouvez pas désactiver votre propre compte') : undefined}>
                            {u.is_active ? t('Désactiver') : t('Réactiver')}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Notice tone="info">{t('Les représentants sont les vendeurs : seuls eux peuvent être responsables d’un lead ou d’une soumission. Administrateurs et coordination ne vendent pas.')}</Notice>
      {inviting && (
        <InviteDrawer
          company={company}
          onClose={() => setInviting(false)}
          onInvited={(u) => {
            setState((s) => ({ ...s, users: [...s.users.filter((x) => x.user_id !== u.user_id), u].sort((a, b) => a.last_name.localeCompare(b.last_name)) }))
            setInviting(false)
            void refreshReps(company).catch(() => undefined)
          }}
        />
      )}
    </div>
  )
}

function InviteDrawer({ company, onClose, onInvited }: { company: CompanyId; onClose: () => void; onInvited: (u: ApiCompanyUser) => void }) {
  const [f, setF] = useState({ email: '', first: '', last: '', role: 'representative' as MembershipRole })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const companyName = COMPANIES.find((c) => c.id === company)?.name ?? ''

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!EMAIL_RE.test(f.email.trim())) return setError(t("Ce courriel n'est pas valide."))
    if (!f.first.trim() || !f.last.trim()) return setError(t('Entrez le prénom et le nom.'))
    setBusy(true)
    setError(null)
    try {
      const u = await api.inviteUser(companyUuid(company)!, { email: f.email.trim(), first_name: f.first.trim(), last_name: f.last.trim(), role: f.role })
      toast(u.invited ? t('Invitation envoyée à {email}', { email: f.email.trim() }) : t('{name} a maintenant accès à {company} (compte existant, aucun courriel envoyé)', { name: `${u.first_name} ${u.last_name}`.trim(), company: companyName }))
      onInvited(u)
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Drawer open onClose={onClose} title={t('Inviter un utilisateur')}>
      <form onSubmit={submit} noValidate className="p-5 space-y-4">
        <p className="text-xs text-ink-mute">{t('Compagnie : {company}. Une personne qui a déjà un compte reçoit l’accès sans courriel; sinon elle reçoit une invitation par courriel.', { company: companyName })}</p>
        <Field label={t('Courriel')}>
          <input className="form-input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('Prénom')}>
            <input className="form-input" value={f.first} maxLength={100} onChange={(e) => setF({ ...f, first: e.target.value })} />
          </Field>
          <Field label={t('Nom')}>
            <input className="form-input" value={f.last} maxLength={100} onChange={(e) => setF({ ...f, last: e.target.value })} />
          </Field>
        </div>
        <Field label={t('Rôle')}>
          <select className="form-input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as MembershipRole })}>
            {ROLES.map(([r, label]) => (
              <option key={r} value={r}>
                {t(label)}
              </option>
            ))}
          </select>
        </Field>
        {error && (
          <p role="alert" className="text-xs font-semibold text-tone-critical-ink">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>
            {t('Annuler')}
          </button>
          <button type="submit" className="btn btn-sm btn-primary" disabled={busy}>
            {busy ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            {t('Inviter')}
          </button>
        </div>
      </form>
    </Drawer>
  )
}
