/** Paramètres → Utilisateurs & permissions (admin side of PDF item 1). */
import { useState } from 'react'
import { Check, KeyRound, Link2, Lock, Mail, Pencil, Plus, RotateCcw, Search, UserCog, UserPlus, UserX } from 'lucide-react'
import { Badge, Card, CompanyBadge, Drawer, Empty, Field } from '../../../components/ui'
import { Select } from '../../../components/filters'
import { Notice, confirmAction } from '../../../components/states'
import { useAuth } from '../../../auth/AuthContext'
import { ACCOUNTS, PERMISSION_LABELS, ROLE_LABELS, ROLE_PERMISSIONS, isPermissionLocked, saveAccount, setRolePermission, type Account, type Permission, type Role } from '../../../auth/permissions'
import { CREWS, crewById } from '../../../data/crews'
import { COMPANIES, type CompanyId } from '../../../data/mock'
import { request, useStore } from '../../../data/store'
import { toast } from '../../../lib/toast'
import { cn, normalize } from '../../../lib/utils'
import { locale, t } from '../../../i18n'
import { logChange } from './data'
import { CopyField } from './shared'

const ROLES = Object.keys(ROLE_LABELS) as Role[]
const STATUS_LABEL: Record<Account['status'], string> = { actif: 'Actif', invite: 'Invité', desactive: 'Désactivé' }
const STATUS_TONE: Record<Account['status'], 'good' | 'warn' | 'neutral'> = { actif: 'good', invite: 'warn', desactive: 'neutral' }

export const invitationLink = (id: string) => `${window.location.origin}${window.location.pathname}#/invitation/${id}`

function formatLogin(s?: string) {
  if (!s) return '—'
  const d = new Date(s.replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleString(locale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function UsersTab() {
  useStore()
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | Account['status']>('all')
  const [editing, setEditing] = useState<Account | 'new' | null>(null)
  const [invited, setInvited] = useState<Account | null>(null)
  const me = user?.name ?? '—'

  const rows = ACCOUNTS.filter((a) => (status === 'all' || a.status === status) && (!query.trim() || normalize(`${a.name} ${a.email}`).includes(normalize(query.trim()))))
  const activeAdmins = ACCOUNTS.filter((a) => a.role === 'admin' && a.status === 'actif')

  const deactivate = async (a: Account) => {
    if (a.id === user?.id) return toast(t('Vous ne pouvez pas désactiver votre propre compte'))
    if (a.role === 'admin' && activeAdmins.length <= 1) return toast(t('Il doit rester au moins un administrateur actif'))
    const ok = await confirmAction({ title: t('Désactiver {name}?', { name: a.name }), body: t("Cette personne ne pourra plus se connecter. Ses soumissions, clients et rendez-vous sont conservés."), confirmLabel: t('Désactiver'), danger: true })
    if (!ok) return
    saveAccount({ ...a, status: 'desactive' })
    logChange(me, 'utilisateurs', 'A désactivé {name}', { name: a.name })
    toast(t('{name} est désactivé', { name: a.name }))
  }
  const reactivate = (a: Account) => {
    saveAccount({ ...a, status: a.lastLogin ? 'actif' : 'invite' })
    logChange(me, 'utilisateurs', 'A réactivé {name}', { name: a.name })
    toast(t('{name} est réactivé', { name: a.name }))
  }
  const resend = async (a: Account) => {
    try {
      await request(null)
      logChange(me, 'utilisateurs', "A renvoyé l'invitation de {name}", { name: a.name })
      toast(t('Invitation renvoyée à {email}', { email: a.email }))
    } catch {
      toast(t("L'invitation n'a pas pu être envoyée"))
    }
  }

  return (
    <div className="space-y-4">
      <Card
        title={t('Utilisateurs')}
        icon={UserCog}
        pad={false}
        actions={
          <button className="btn btn-xs btn-primary" onClick={() => setEditing('new')}>
            <UserPlus className="w-3.5 h-3.5" />
            {t('Inviter')}
          </button>
        }
      >
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-hairline">
          <label className="relative flex-1 min-w-[12rem]">
            <Search className="w-4 h-4 text-ink-faint absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input className="form-input h-8 pl-8" placeholder={t('Rechercher un nom ou un courriel')} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={t('Rechercher')} />
          </label>
          <Select<'all' | Account['status']>
            value={status}
            onChange={setStatus}
            searchable={false}
            className="w-40"
            options={[{ value: 'all', label: t('Tous les statuts') }, ...(['actif', 'invite', 'desactive'] as const).map((s) => ({ value: s, label: t(STATUS_LABEL[s]) }))]}
          />
        </div>
        {rows.length === 0 ? (
          <Empty icon={UserCog} title={t('Aucun utilisateur')}>
            {t('Modifiez la recherche ou invitez un nouvel utilisateur.')}
          </Empty>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead className="bg-sand/60 border-b border-hairline">
                <tr>
                  {['Nom', 'Rôle', 'Compagnies', 'Statut', 'Dernière connexion', ''].map((h, i) => (
                    <th key={i} className={cn('th', i === 5 && 'text-right')}>
                      {h && t(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {rows.map((a) => (
                  <tr key={a.id} className={cn('hover:bg-sand/60', a.status === 'desactive' && 'opacity-60')}>
                    <td className="td">
                      <p className="font-semibold text-ink-secondary">
                        {a.name}
                        {a.id === user?.id && <span className="ml-1.5 text-2xs text-ink-mute font-normal">({t('vous')})</span>}
                      </p>
                      <p className="text-xs text-ink-mute">{a.email}</p>
                    </td>
                    <td className="td text-ink-secondary">
                      {t(ROLE_LABELS[a.role])}
                      {a.role === 'crew' && crewById(a.crewId) && <span className="block text-xs text-ink-mute">{t(crewById(a.crewId)!.name)}</span>}
                    </td>
                    <td className="td">
                      <span className="flex flex-wrap gap-1">
                        {a.companies.map((c) => (
                          <CompanyBadge key={c} id={c} />
                        ))}
                      </span>
                    </td>
                    <td className="td">
                      <Badge tone={STATUS_TONE[a.status]} dot>
                        {t(STATUS_LABEL[a.status])}
                      </Badge>
                    </td>
                    <td className="td text-ink-mute tnum whitespace-nowrap">{formatLogin(a.lastLogin)}</td>
                    <td className="td">
                      <span className="flex items-center justify-end gap-0.5">
                        {a.status === 'invite' && (
                          <>
                            <button className="p-1.5 rounded-md hover:bg-stone" aria-label={t("Copier le lien d'invitation")} title={t("Lien d'invitation")} onClick={() => setInvited(a)}>
                              <Link2 className="w-3.5 h-3.5" />
                            </button>
                            <button className="p-1.5 rounded-md hover:bg-stone" aria-label={t("Renvoyer l'invitation")} title={t("Renvoyer l'invitation")} onClick={() => resend(a)}>
                              <Mail className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button className="p-1.5 rounded-md hover:bg-stone" aria-label={t('Modifier')} title={t('Modifier')} onClick={() => setEditing(a)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {a.status === 'desactive' ? (
                          <button className="p-1.5 rounded-md hover:bg-stone" aria-label={t('Réactiver')} title={t('Réactiver')} onClick={() => reactivate(a)}>
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button className="p-1.5 rounded-md hover:bg-tone-critical-soft hover:text-tone-critical-ink" aria-label={t('Désactiver')} title={t('Désactiver')} onClick={() => deactivate(a)}>
                            <UserX className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <PermissionsCard me={me} />
      <UserDrawer
        key={editing === 'new' ? 'new' : editing?.id ?? 'none'}
        account={editing}
        onClose={() => setEditing(null)}
        onInvited={(a) => {
          setEditing(null)
          setInvited(a)
        }}
        me={me}
      />
      <Drawer open={!!invited} onClose={() => setInvited(null)} title={t("Lien d'invitation")}>
        {invited && (
          <div className="p-5 space-y-4">
            <Notice tone="info">{t("Une invitation a été envoyée à {email}. Vous pouvez aussi lui transmettre ce lien : il permet de choisir son mot de passe et d'activer le compte.", { email: invited.email })}</Notice>
            <CopyField value={invitationLink(invited.id)} label={t("Lien d'invitation")} />
            <p className="text-xs text-ink-mute">{t('Le lien expire dans 7 jours. Renvoyez une invitation pour en générer un nouveau.')}</p>
          </div>
        )}
      </Drawer>
    </div>
  )
}

function UserDrawer({ account, onClose, onInvited, me }: { account: Account | 'new' | null; onClose: () => void; onInvited: (a: Account) => void; me: string }) {
  const isNew = account === 'new'
  const base = account && account !== 'new' ? account : undefined
  const [name, setName] = useState(base?.name ?? '')
  const [email, setEmail] = useState(base?.email ?? '')
  const [role, setRole] = useState<Role>(base?.role ?? 'rep')
  const [companies, setCompanies] = useState<CompanyId[]>(base?.companies ?? [])
  const [crewId, setCrewId] = useState(base?.crewId ?? '')
  const isCrew = role === 'crew'
  const crewOptions = CREWS.filter((c) => c.active || c.id === base?.crewId)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    const mail = email.trim().toLowerCase()
    if (!name.trim()) return setError(t('Entrez le nom'))
    if (!/^\S+@\S+\.\S+$/.test(mail)) return setError(t('Courriel invalide'))
    if (ACCOUNTS.some((a) => a.email.toLowerCase() === mail && a.id !== base?.id)) return setError(t('Un utilisateur utilise déjà ce courriel'))
    const crew = isCrew ? crewById(crewId) : undefined
    if (isCrew && !crew) return setError(t("Choisissez l'équipe de cette personne"))
    // A field crew account works for its crew's company only.
    const comp: CompanyId[] = crew ? [crew.company] : companies
    if (comp.length === 0) return setError(t('Choisissez au moins une compagnie'))
    if (base?.role === 'admin' && role !== 'admin' && ACCOUNTS.filter((a) => a.role === 'admin' && a.status === 'actif').length <= 1) return setError(t('Il doit rester au moins un administrateur actif'))
    setError('')
    setBusy(true)
    try {
      await request(null)
      if (isNew) {
        const id = 'u' + Date.now().toString(36)
        const acc: Account = { id, repId: '', name: name.trim(), email: mail, role, companies: comp, status: 'invite', crewId: crew?.id }
        saveAccount(acc)
        logChange(me, 'utilisateurs', 'A invité {name}', { name: acc.name })
        toast(t('Invitation envoyée à {email}', { email: mail }))
        onInvited(acc)
      } else if (base) {
        saveAccount({ ...base, name: name.trim(), email: mail, role, companies: comp, crewId: crew?.id })
        logChange(me, 'utilisateurs', 'A modifié le rôle ou les compagnies de {name}', { name: name.trim() })
        toast(t('Utilisateur enregistré'))
        onClose()
      }
    } catch {
      setError(t("L'enregistrement a échoué. Réessayez."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Drawer open={account !== null} onClose={onClose} title={isNew ? t('Inviter un utilisateur') : t('Modifier {name}', { name: base?.name ?? '' })}>
      <form
        className="p-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <Field label={t('Nom complet')}>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label={t('Courriel')}>
          <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <div>
          <p className="label-caps mb-1.5">{t('Rôle')}</p>
          <div className="grid gap-2">
            {ROLES.map((r) => (
              <label key={r} className={cn('flex items-start gap-3 p-3 rounded-lg border cursor-pointer', role === r ? 'border-primary bg-primary-wash/40' : 'border-hairline hover:border-hairline-strong')}>
                <input type="radio" name="role" className="mt-0.5" checked={role === r} onChange={() => setRole(r)} />
                <span>
                  <span className="block text-sm font-semibold text-ink">{t(ROLE_LABELS[r])}</span>
                  <span className="block text-xs text-ink-mute">{r === 'crew' ? t('Ses chantiers, le calendrier de son équipe, les bons de travail et les photos. Aucun prix.') : t('{n} permissions', { n: ROLE_PERMISSIONS[r].size })}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
        {isCrew ? (
          <Field label={t('Équipe')}>
            <Select<string>
              value={crewId}
              onChange={setCrewId}
              searchable={false}
              options={[{ value: '', label: t('Choisir une équipe') }, ...crewOptions.map((c) => ({ value: c.id, label: `${t(c.name)} · ${t(COMPANIES.find((x) => x.id === c.company)!.short)}` }))]}
            />
            <span className="text-xs text-ink-mute">{t("La personne voit seulement les chantiers et le calendrier de cette équipe, sans aucun prix. Sa compagnie suit celle de l'équipe.")}</span>
          </Field>
        ) : (
          <div>
            <p className="label-caps mb-1.5">{t('Compagnies')}</p>
            <div className="flex flex-wrap gap-2">
              {COMPANIES.map((c) => {
                const on = companies.includes(c.id)
                return (
                  <button
                    type="button"
                    key={c.id}
                    aria-pressed={on}
                    onClick={() => setCompanies((prev) => (on ? prev.filter((k) => k !== c.id) : [...prev, c.id]))}
                    className={cn('px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors flex items-center gap-1', on ? c.tone : 'border-dashed border-hairline-strong text-ink-mute hover:text-ink')}
                  >
                    {on && <Check className="w-3 h-3" />}
                    {c.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}
        {error && <Notice tone="critical">{error}</Notice>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>
            {t('Annuler')}
          </button>
          <button className="btn btn-sm btn-primary" disabled={busy}>
            {isNew ? <Plus className="w-4 h-4" /> : null}
            {isNew ? t("Envoyer l'invitation") : t('Enregistrer')}
          </button>
        </div>
      </form>
    </Drawer>
  )
}

function PermissionsCard({ me }: { me: string }) {
  useStore()
  const perms = Object.keys(PERMISSION_LABELS) as Permission[]
  return (
    <Card title={t('Permissions par rôle')} icon={KeyRound} pad={false}>
      <p className="px-5 pt-3 text-xs text-ink-mute">{t("Les changements s'appliquent immédiatement à tous les utilisateurs du rôle. Les administrateurs gardent toujours toutes les permissions.")} {t("L'équipe terrain n'a aucune de ces permissions : elle voit seulement ses chantiers, sans prix.")}</p>
      <div className="relative overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead className="border-b border-hairline">
            <tr>
              <th className="th">{t('Permission')}</th>
              {ROLES.map((r) => (
                <th key={r} className="th text-center">
                  <span className="inline-flex items-center gap-1">
                    {(r === 'admin' || r === 'crew') && <Lock className="w-3 h-3" />}
                    {t(ROLE_LABELS[r])}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {perms.map((p) => (
              <tr key={p}>
                <td className="td text-ink-secondary">{t(PERMISSION_LABELS[p])}</td>
                {ROLES.map((role) => {
                  const on = ROLE_PERMISSIONS[role].has(p)
                  const locked = isPermissionLocked(role, p)
                  return (
                    <td key={role} className="td text-center">
                      <button
                        role="checkbox"
                        aria-checked={on}
                        aria-label={`${t(PERMISSION_LABELS[p])} — ${t(ROLE_LABELS[role])}`}
                        disabled={locked}
                        title={locked && role === 'crew' ? t("L'équipe terrain ne voit jamais les prix, les coûtants ni les paramètres") : undefined}
                        onClick={() => {
                          setRolePermission(role, p, !on)
                          logChange(me, 'utilisateurs', '{role} : permission « {p} » {state}', { role: ROLE_LABELS[role], p: PERMISSION_LABELS[p], state: on ? 'retirée' : 'accordée' })
                        }}
                        className={cn('w-5 h-5 rounded border inline-flex items-center justify-center', on ? 'bg-primary border-primary text-white' : 'border-hairline-strong bg-white hover:border-ink-mute', locked && 'opacity-60 cursor-not-allowed')}
                      >
                        {on && <Check className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
