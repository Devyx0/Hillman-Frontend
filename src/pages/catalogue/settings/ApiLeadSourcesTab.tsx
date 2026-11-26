/**
 * Paramètres → Sources de leads with the backend.
 *
 * - Sources (one list for the group): GET /lead-sources?include_inactive=true, POST, PATCH (rename, sort_order,
 *   is_active), DELETE (409 IN_USE when leads, quotes or intake keys use it: deactivate instead). Writes: admin of
 *   every company; everyone else reads.
 * - Réception des leads: intake keys (GET/POST/PATCH /intake-keys). A key is shown once, at creation; it is sent as
 *   the X-Intake-Key header of POST /intake/leads. Company key: admin of that company; group key (company_id null):
 *   admin of every company. Keys are deactivated, never deleted.
 * - The website form, Google and phone forwarding cards have no API: they are the unchanged mock-mode cards.
 */
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, Check, KeyRound, LoaderCircle, Pencil, Plus, Search, Tags, Trash2, X } from 'lucide-react'
import * as api from '../../../api/endpoints'
import { API_URL } from '../../../api/config'
import { ApiError, errorMessage } from '../../../api/http'
import type { ApiIntakeKey, ApiLeadSource, Uuid } from '../../../api/types'
import { Badge, Card, Empty, Field } from '../../../components/ui'
import { Dropdown } from '../../../components/dropdown'
import { ErrorState, Notice, SkeletonRows, confirmAction } from '../../../components/states'
import { REF, companyUuid, refreshLeadSources, roleIn } from '../../../data/api-sync'
import { COMPANIES, type CompanyId } from '../../../data/mock'
import { locale, t } from '../../../i18n'
import { toast } from '../../../lib/toast'
import { cn, normalize } from '../../../lib/utils'
import { GoogleCard, PhoneCard, WebsiteFormCard } from './LeadSourcesTab'
import { CopyField, Intro, Modal, Toggle, copyText, useScopeCompany } from './shared'

/** Backend limits (lead-sources/schema.ts, intake-keys/schema.ts). */
const SOURCE_NAME_MAX = 80
const KEY_NAME_MAX = 120
const INTAKE_URL = `${API_URL}/intake/leads`
const INTAKE_HEADER = 'X-Intake-Key'
const GROUP = 'group'

/** Admin of every company (app.is_group_admin): edits the shared source list and the group intake keys. */
const isGroupAdmin = () => REF.companies.length > 0 && REF.companies.every((c) => roleIn(c.slug) === 'admin')
const day = (iso: string) => new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' })

type Load<T> = { status: 'loading' | 'ready' | 'error'; rows: T[]; error?: string }

export function ApiLeadSourcesTab() {
  const [company, setCompany] = useScopeCompany()
  const [sources, setSources] = useState<Load<ApiLeadSource>>({ status: 'loading', rows: [] })
  const [attempt, setAttempt] = useState(0)
  // Bumped after each source write so the keys card re-reads the source names.
  const [version, setVersion] = useState(0)
  const groupAdmin = isGroupAdmin()

  useEffect(() => {
    let live = true
    api.listLeadSources(true).then(
      (rows) => live && setSources({ status: 'ready', rows }),
      (e) => live && setSources({ status: 'error', rows: [], error: errorMessage(e) }),
    )
    return () => {
      live = false
    }
  }, [attempt])

  /** Re-read the list without the loading state; the app-wide pickers are refreshed too. */
  const reload = useCallback(async () => {
    try {
      const rows = await api.listLeadSources(true)
      setSources({ status: 'ready', rows })
    } catch (e) {
      toast(errorMessage(e))
    }
    setVersion((v) => v + 1)
    void refreshLeadSources().catch(() => undefined)
  }, [])

  return (
    <div className="space-y-4">
      <ApiSourcesCard
        state={sources}
        onRetry={() => {
          setSources({ status: 'loading', rows: [] })
          setAttempt((n) => n + 1)
        }}
        reload={reload}
        editable={groupAdmin}
      />
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <h3 className="text-md font-semibold text-ink">{t('Réception des leads')}</h3>
        <div className="flex gap-1 p-1 bg-white rounded-lg shadow-card" role="tablist" aria-label={t('Compagnie')}>
          {COMPANIES.map((c) => (
            <button key={c.id} role="tab" aria-selected={company === c.id} onClick={() => setCompany(c.id)} className={cn('px-3 h-8 rounded-md text-sm font-semibold whitespace-nowrap', company === c.id ? 'bg-ink text-white' : 'text-ink-mute hover:text-ink hover:bg-sand')}>
              {t(c.short)}
            </button>
          ))}
        </div>
      </div>
      <Intro>{t('Chaque lead reçu par ces canaux arrive dans la liste des leads, avec la compagnie et la source déjà remplies.')}</Intro>
      <div className="grid lg:grid-cols-2 gap-4 items-start" key={company}>
        <ApiIntakeKeysCard company={company} sources={sources.rows.filter((s) => s.is_active)} groupAdmin={groupAdmin} version={version} />
        <WebsiteFormCard company={company} />
        <GoogleCard company={company} />
        <PhoneCard company={company} />
      </div>
      <p className="text-xs text-ink-mute">{t('Phase 2 : Facebook Lead Ads, avis Google, rapports.')}</p>
    </div>
  )
}

// ── Source list ─────────────────────────────────────────────────────────────
function ApiSourcesCard({ state, onRetry, reload, editable }: { state: Load<ApiLeadSource>; onRetry: () => void; reload: () => Promise<void>; editable: boolean }) {
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState<{ id: Uuid; name: string } | null>(null)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const all = state.rows
  const q = normalize(query.trim())
  const rows = all.filter((s) => !q || normalize(s.name).includes(q))

  /** Runs one write; the list is re-read afterwards (also after a failure, e.g. a half-done reorder). */
  const write = async (id: string, work: () => Promise<unknown>, done?: string) => {
    setBusy(id)
    let ok = false
    try {
      await work()
      ok = true
      if (done) toast(done)
    } catch (e) {
      toast(e instanceof ApiError && e.code === 'DUPLICATE' ? t('Cette source existe déjà') : errorMessage(e))
    }
    await reload()
    setBusy(null)
    return ok
  }

  const add = async () => {
    const name = draft.trim()
    if (!name || busy) return
    if (all.some((s) => s.name === name)) return toast(t('Cette source existe déjà'))
    if (await write('add', () => api.createLeadSource({ name }), t('Source ajoutée'))) setDraft('')
  }

  const rename = async () => {
    if (!editing || busy) return
    const name = editing.name.trim()
    const s = all.find((x) => x.id === editing.id)
    if (!s || !name || name === s.name) return setEditing(null)
    if (all.some((x) => x.id !== s.id && x.name === name)) return toast(t('Cette source existe déjà'))
    if (await write(s.id, () => api.updateLeadSource(s.id, { name }), t('Source renommée'))) setEditing(null)
  }

  const setActive = (s: ApiLeadSource, is_active: boolean) =>
    write(s.id, () => api.updateLeadSource(s.id, { is_active }), is_active ? t('Source réactivée') : t('Source désactivée'))

  const remove = async (s: ApiLeadSource) => {
    const ok = await confirmAction({
      title: t('Supprimer la source « {name} »?', { name: s.name }),
      body: t('Une source déjà utilisée par des leads, des soumissions ou une clé de réception ne peut pas être supprimée : désactivez-la plutôt. Sinon, cette action est définitive.'),
      confirmLabel: t('Supprimer'),
      danger: true,
    })
    if (ok) await write(s.id, () => api.deleteLeadSource(s.id), t('Source supprimée'))
  }

  /**
   * Swap with the neighbour, then number the whole list 0, 1, 2… (sort_order) and save only the rows whose
   * number changed: after the first move, that is the two swapped rows.
   */
  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= all.length) return
    const order = [...all]
    ;[order[index], order[target]] = [order[target], order[index]]
    const changes = order.map((s, i) => ({ s, i })).filter(({ s, i }) => s.sort_order !== i)
    return write('order', async () => {
      for (const { s, i } of changes) await api.updateLeadSource(s.id, { sort_order: i })
    })
  }

  const reorderable = editable && !q

  return (
    <Card title={t('Sources de leads')} icon={Tags} pad={false}>
      <div className="px-4 py-3 border-b border-hairline flex flex-wrap gap-2 items-center">
        <p className="text-xs text-ink-mute flex-1 min-w-[14rem]">
          {t('Proposées dans les fiches lead et client. Une source désactivée reste sur les anciens leads.')}
          {!editable && <span className="block mt-0.5">{t('Les sources sont partagées par les compagnies : seuls les administrateurs de toutes les compagnies les modifient.')}</span>}
        </p>
        <label className="relative w-full sm:w-56">
          <Search className="w-4 h-4 text-ink-faint absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input className="form-input h-8 pl-8" placeholder={t('Rechercher')} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={t('Rechercher une source')} />
        </label>
      </div>
      {state.status === 'loading' && <SkeletonRows rows={4} />}
      {state.status === 'error' && <ErrorState onRetry={onRetry}>{state.error}</ErrorState>}
      {state.status === 'ready' && rows.length === 0 && <Empty icon={Tags} title={t('Aucune source')} />}
      {state.status === 'ready' && rows.length > 0 && (
        <ul className="divide-y divide-hairline">
          {rows.map((s) => {
            const index = all.indexOf(s)
            const rowBusy = busy === s.id
            return (
              <li key={s.id} className={cn('flex flex-wrap items-center gap-3 px-4 py-2.5', !s.is_active && 'opacity-60')}>
                {editing?.id === s.id ? (
                  <form
                    className="flex-1 flex gap-2 min-w-[12rem]"
                    onSubmit={(e) => {
                      e.preventDefault()
                      void rename()
                    }}
                  >
                    <input className="form-input h-8" value={editing.name} maxLength={SOURCE_NAME_MAX} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus aria-label={t('Nom de la source')} />
                    <button className="btn btn-sm btn-primary" aria-label={t('Enregistrer')} disabled={!!busy || !editing.name.trim()}>
                      {rowBusy ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </button>
                    <button type="button" className="btn btn-sm btn-ghost" aria-label={t('Annuler')} onClick={() => setEditing(null)}>
                      <X className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <span className="flex-1 min-w-[10rem] text-sm font-semibold text-ink">{s.name}</span>
                )}
                {!s.is_active && <Badge>{t('Désactivée')}</Badge>}
                {rowBusy && editing?.id !== s.id && <LoaderCircle className="w-4 h-4 animate-spin text-ink-mute" />}
                <Toggle on={s.is_active} label={t('Source active')} disabled={!editable || !!busy} onChange={(active) => void setActive(s, active)} />
                {reorderable && (
                  <span className="flex">
                    <button className="p-1.5 rounded-md hover:bg-stone disabled:opacity-30" aria-label={t('Monter')} disabled={!!busy || index <= 0} onClick={() => void move(index, -1)}>
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1.5 rounded-md hover:bg-stone disabled:opacity-30" aria-label={t('Descendre')} disabled={!!busy || index >= all.length - 1} onClick={() => void move(index, 1)}>
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </span>
                )}
                {editable && (
                  <>
                    <button className="p-1.5 rounded-md hover:bg-stone" aria-label={t('Renommer')} disabled={!!busy} onClick={() => setEditing({ id: s.id, name: s.name })}>
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1.5 rounded-md hover:bg-tone-critical-soft hover:text-tone-critical-ink" aria-label={t('Supprimer')} disabled={!!busy} onClick={() => void remove(s)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {editable && (
        <form
          className="flex gap-2 p-3 border-t border-hairline bg-sand/40"
          onSubmit={(e) => {
            e.preventDefault()
            void add()
          }}
        >
          <input value={draft} maxLength={SOURCE_NAME_MAX} onChange={(e) => setDraft(e.target.value)} placeholder={t('Nouvelle source (ex. Salon de l’habitation)')} className="form-input" aria-label={t('Nouvelle source')} />
          <button className="btn btn-md btn-secondary" disabled={!draft.trim() || !!busy}>
            {busy === 'add' ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {t('Ajouter')}
          </button>
        </form>
      )}
    </Card>
  )
}

// ── Intake keys (website forms, ad platforms) ───────────────────────────────
function ApiIntakeKeysCard({ company, sources, groupAdmin, version }: { company: CompanyId; sources: ApiLeadSource[]; groupAdmin: boolean; version: number }) {
  const uuid = companyUuid(company)
  const canManage = roleIn(company) === 'admin' || groupAdmin
  const [state, setState] = useState<Load<ApiIntakeKey>>({ status: 'loading', rows: [] })
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState<Uuid | null>(null)
  const [editing, setEditing] = useState<{ id: Uuid; name: string } | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!canManage) return
    let live = true
    // Every key the caller manages (company keys and, for an admin of every company, group keys); this tab shows
    // the selected company's keys and the group keys.
    api.listIntakeKeys().then(
      (rows) => live && setState({ status: 'ready', rows }),
      (e) => live && setState({ status: 'error', rows: [], error: errorMessage(e) }),
    )
    return () => {
      live = false
    }
  }, [canManage, attempt, version])

  const replace = (k: ApiIntakeKey) => setState((s) => ({ ...s, rows: s.rows.map((x) => (x.id === k.id ? k : x)) }))

  const update = async (k: ApiIntakeKey, body: { name?: string; is_active?: boolean }, done: string) => {
    setBusy(k.id)
    try {
      replace(await api.updateIntakeKey(k.id, body))
      toast(done)
      return true
    } catch (e) {
      toast(errorMessage(e))
      return false
    } finally {
      setBusy(null)
    }
  }

  const rename = async () => {
    if (!editing || busy) return
    const k = state.rows.find((x) => x.id === editing.id)
    const name = editing.name.trim()
    if (!k || !name || name === k.name) return setEditing(null)
    if (await update(k, { name }, t('Clé renommée'))) setEditing(null)
  }

  const setActive = async (k: ApiIntakeKey, is_active: boolean) => {
    if (!is_active) {
      const ok = await confirmAction({
        title: t('Désactiver la clé « {name} »?', { name: k.name }),
        body: t('Les leads envoyés avec cette clé seront refusés. Vous pourrez la réactiver.'),
        confirmLabel: t('Désactiver'),
        danger: true,
      })
      if (!ok) return
    }
    await update(k, { is_active }, is_active ? t('Clé réactivée') : t('Clé désactivée'))
  }

  const rows = state.rows.filter((k) => k.company_id === null || k.company_id === uuid)

  return (
    <Card
      title={t('Clés de réception')}
      icon={KeyRound}
      className="lg:col-span-2"
      pad={false}
      actions={
        canManage && (
          <button className="btn btn-xs btn-primary" onClick={() => setCreating(true)}>
            <Plus className="w-3.5 h-3.5" />
            {t('Nouvelle clé')}
          </button>
        )
      }
    >
      <div className="px-4 py-3 border-b border-hairline space-y-3">
        <p className="text-xs text-ink-mute">
          {t('Une clé par point d’entrée (formulaire du site, plateforme publicitaire). La clé décide de la source et, pour une clé de compagnie, de la compagnie.')}
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label={t('Adresse de réception (POST)')}>
            <CopyField value={INTAKE_URL} label={t('Adresse de réception (POST)')} />
          </Field>
          <Field label={t('En-tête de la clé')}>
            <CopyField value={INTAKE_HEADER} label={t('En-tête de la clé')} />
          </Field>
        </div>
        <p className="text-xs text-ink-mute">{t('Une clé « Tout le groupe » exige aussi le champ company dans chaque envoi (toit, sg ou reno).')}</p>
      </div>
      {!canManage ? (
        <div className="p-4">
          <Notice tone="info">{t('Seul un administrateur de la compagnie peut gérer la réception des leads.')}</Notice>
        </div>
      ) : (
        <>
          {state.status === 'loading' && <SkeletonRows rows={3} />}
          {state.status === 'error' && (
            <ErrorState
              onRetry={() => {
                setState({ status: 'loading', rows: [] })
                setAttempt((n) => n + 1)
              }}
            >
              {state.error}
            </ErrorState>
          )}
          {state.status === 'ready' && rows.length === 0 && <Empty icon={KeyRound} title={t('Aucune clé')} />}
          {state.status === 'ready' && rows.length > 0 && (
            <ul className="divide-y divide-hairline">
              {rows.map((k) => {
                const rowBusy = busy === k.id
                return (
                  <li key={k.id} className={cn('flex flex-wrap items-center gap-3 px-4 py-2.5', !k.is_active && 'opacity-60')}>
                    {editing?.id === k.id ? (
                      <form
                        className="flex-1 flex gap-2 min-w-[12rem]"
                        onSubmit={(e) => {
                          e.preventDefault()
                          void rename()
                        }}
                      >
                        <input className="form-input h-8" value={editing.name} maxLength={KEY_NAME_MAX} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus aria-label={t('Nom de la clé')} />
                        <button className="btn btn-sm btn-primary" aria-label={t('Enregistrer')} disabled={!!busy || !editing.name.trim()}>
                          {rowBusy ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button type="button" className="btn btn-sm btn-ghost" aria-label={t('Annuler')} onClick={() => setEditing(null)}>
                          <X className="w-4 h-4" />
                        </button>
                      </form>
                    ) : (
                      <span className="flex-1 min-w-[12rem]">
                        <span className="text-sm font-semibold text-ink">{k.name}</span>
                        <span className="block text-xs text-ink-mute">
                          {k.source_name} · {k.company_id === null ? t('Tout le groupe') : (k.company_name ?? '—')} · {t('Créée le {date}', { date: day(k.created_at) })}
                        </span>
                      </span>
                    )}
                    {k.company_id === null && <Badge tone="info">{t('Tout le groupe')}</Badge>}
                    {!k.is_active && <Badge>{t('Désactivée')}</Badge>}
                    {rowBusy && editing?.id !== k.id && <LoaderCircle className="w-4 h-4 animate-spin text-ink-mute" />}
                    <Toggle on={k.is_active} label={t('Clé active')} disabled={!!busy} onChange={(active) => void setActive(k, active)} />
                    <button className="p-1.5 rounded-md hover:bg-stone" aria-label={t('Renommer')} disabled={!!busy} onClick={() => setEditing({ id: k.id, name: k.name })}>
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
      {creating && (
        <CreateKeyModal
          company={company}
          sources={sources}
          groupAdmin={groupAdmin}
          onClose={() => setCreating(false)}
          onCreated={(k) => setState((s) => ({ status: 'ready', rows: [...s.rows.filter((x) => x.id !== k.id), k] }))}
        />
      )}
    </Card>
  )
}

function CreateKeyModal({ company, sources, groupAdmin, onClose, onCreated }: { company: CompanyId; sources: ApiLeadSource[]; groupAdmin: boolean; onClose: () => void; onCreated: (k: ApiIntakeKey) => void }) {
  // Companies where the caller is admin, plus « Tout le groupe » for an admin of every company.
  const adminCompanies = COMPANIES.filter((c) => roleIn(c.id) === 'admin' && companyUuid(c.id))
  const initial = adminCompanies.some((c) => c.id === company) ? company : groupAdmin ? GROUP : (adminCompanies[0]?.id ?? '')
  const [f, setF] = useState({ name: '', source: '', company: initial as string })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ name: string; key: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const closing = useRef(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const name = f.name.trim()
    if (!name) return setError(t('Entrez un nom (ex. « Site web Signature Gouttières »).'))
    if (!sources.some((s) => s.id === f.source)) return setError(t('Choisissez une source de leads active.'))
    const companyId = f.company === GROUP ? null : companyUuid(f.company)
    if (companyId === undefined) return setError(t('Choisissez une compagnie.'))
    setBusy(true)
    setError(null)
    try {
      const { key, ...row } = await api.createIntakeKey({ name, source_id: f.source, company_id: companyId })
      onCreated(row)
      setCreated({ name: row.name, key })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const close = async () => {
    if (closing.current) return
    if (created && !copied) {
      closing.current = true
      const ok = await confirmAction({
        title: t('Fermer sans copier la clé?'),
        body: t('Elle ne pourra plus jamais être affichée. Il faudrait créer une nouvelle clé.'),
        confirmLabel: t('Fermer'),
        danger: true,
      })
      closing.current = false
      if (!ok) return
    }
    onClose()
  }

  const copyKey = async () => {
    if (!created) return
    await copyText(created.key)
    setCopied(true)
  }

  if (created) {
    return (
      <Modal
        open
        onClose={() => void close()}
        title={t('Clé « {name} » créée', { name: created.name })}
        footer={
          <button className="btn btn-sm btn-primary" onClick={() => void close()}>
            {t('Terminé')}
          </button>
        }
      >
        <div className="space-y-4">
          <Notice>{t('Copiez cette clé maintenant : elle ne sera plus jamais affichée. Seule son empreinte est conservée.')}</Notice>
          <Field label={t('Clé de réception')}>
            <div className="flex items-start gap-2 min-w-0">
              <input readOnly value={created.key} aria-label={t('Clé de réception')} className="form-input h-8 font-mono text-xs flex-1 min-w-0" onFocus={(e) => e.currentTarget.select()} autoFocus />
              <button type="button" className="btn btn-sm btn-secondary shrink-0" onClick={() => void copyKey()}>
                {copied ? <Check className="w-3.5 h-3.5" /> : <KeyRound className="w-3.5 h-3.5" />}
                {t('Copier')}
              </button>
            </div>
          </Field>
          <p className="text-xs text-ink-mute">{t('Envoyez chaque lead en POST à {url}, avec la clé dans l’en-tête {header}.', { url: INTAKE_URL, header: INTAKE_HEADER })}</p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open onClose={() => void close()} title={t('Nouvelle clé de réception')}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label={t('Nom')}>
          <input className="form-input" value={f.name} maxLength={KEY_NAME_MAX} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder={t('ex. Site web Signature Gouttières')} autoFocus />
        </Field>
        <Field label={t('Source attribuée')}>
          <Dropdown className="form-input" value={f.source} placeholder={t('Choisir une source')} onChange={(e) => setF({ ...f, source: e.target.value })} aria-label={t('Source attribuée')}>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Dropdown>
        </Field>
        <Field label={t('Compagnie')}>
          <Dropdown className="form-input" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} aria-label={t('Compagnie')}>
            {adminCompanies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            {groupAdmin && <option value={GROUP}>{t('Tout le groupe')}</option>}
          </Dropdown>
        </Field>
        {f.company === GROUP && <p className="text-xs text-ink-mute">{t('Une clé « Tout le groupe » exige aussi le champ company dans chaque envoi (toit, sg ou reno).')}</p>}
        {error && (
          <p role="alert" className="text-xs font-semibold text-tone-critical-ink">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => void close()}>
            {t('Annuler')}
          </button>
          <button type="submit" className="btn btn-sm btn-primary" disabled={busy}>
            {busy ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            {t('Créer la clé')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
