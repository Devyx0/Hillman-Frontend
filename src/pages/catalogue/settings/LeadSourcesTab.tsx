/** Paramètres → Sources de leads: editable list + intake connections (PDF item 3). */
import { useState } from 'react'
import { API_MODE } from '../../../api/config'
import { Check, Code2, Globe, LoaderCircle, Pencil, PhoneForwarded, Plus, Search, Send, Tags, Trash2, X } from 'lucide-react'
import { Badge, Card, Empty, Field } from '../../../components/ui'
import { Select } from '../../../components/filters'
import { Notice, confirmAction } from '../../../components/states'
import { useAuth } from '../../../auth/AuthContext'
import { COMPANIES, LEADS, type CompanyId } from '../../../data/mock'
import { CONNECTIONS, LEAD_SOURCES, removeLeadSource, saveConnections, saveLeadSource, type LeadSource } from '../../../data/settings'
import { addLead, request, useStore } from '../../../data/store'
import { toast } from '../../../lib/toast'
import { cn } from '../../../lib/utils'
import { t } from '../../../i18n'
import { GOOGLE_BUSINESS, INTAKE_MAPPING, PHONE_FORWARDING, logChange, saveGoogleBusiness, saveIntakeMapping, savePhoneForwarding } from './data'
import { ConnectionBadge, CopyField, Intro, Toggle, useScopeCompany } from './shared'
import { ApiLeadSourcesTab } from './ApiLeadSourcesTab'

const KIND_LABEL: Record<LeadSource['kind'], string> = { manuel: 'Saisie manuelle', formulaire: 'Formulaire web', google: 'Google', telephone: 'Téléphone', ia: 'Agent IA' }

export function LeadSourcesTab() {
  // With the backend: the shared source list and the intake keys from the server; the other reception cards are unchanged.
  if (API_MODE) return <ApiLeadSourcesTab />
  return <MockLeadSourcesTab />
}

function MockLeadSourcesTab() {
  const [company, setCompany] = useScopeCompany()
  return (
    <div className="space-y-4">
      <SourcesCard />
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
        <WebsiteFormCard company={company} />
        <GoogleCard company={company} />
        <PhoneCard company={company} />
      </div>
      <p className="text-xs text-ink-mute">{t('Phase 2 : Facebook Lead Ads, avis Google, rapports.')}</p>
    </div>
  )
}

// ── Editable source list ────────────────────────────────────────────────────
function SourcesCard() {
  useStore()
  const { user, can } = useAuth()
  const me = user?.name ?? '—'
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null)
  const [query, setQuery] = useState('')
  const rows = LEAD_SOURCES.filter((s) => !query.trim() || s.name.toLowerCase().includes(query.trim().toLowerCase()))
  const used = (name: string) => LEADS.filter((l) => l.channel === name).length

  const add = () => {
    const name = draft.trim()
    if (!name) return
    if (LEAD_SOURCES.some((s) => s.name.toLowerCase() === name.toLowerCase())) return toast(t('Cette source existe déjà'))
    saveLeadSource({ id: 's' + Date.now(), name, active: true, kind: 'manuel' })
    logChange(me, 'parametres', 'A ajouté la source « {name} »', { name })
    setDraft('')
    toast(t('Source ajoutée'))
  }
  const rename = () => {
    if (!editing) return
    const name = editing.name.trim()
    const s = LEAD_SOURCES.find((x) => x.id === editing.id)
    if (!s || !name) return setEditing(null)
    if (LEAD_SOURCES.some((x) => x.id !== s.id && x.name.toLowerCase() === name.toLowerCase())) return toast(t('Cette source existe déjà'))
    saveLeadSource({ ...s, name })
    logChange(me, 'parametres', 'A renommé la source « {from} » en « {to} »', { from: s.name, to: name })
    setEditing(null)
  }
  const remove = async (s: LeadSource) => {
    const n = used(s.name)
    const ok = await confirmAction({
      title: t('Supprimer la source « {name} »?', { name: t(s.name) }),
      body: n > 0 ? t('{n} leads utilisent cette source. Ils la gardent, mais elle ne sera plus proposée. Pensez plutôt à la désactiver.', { n }) : t('Cette action est définitive.'),
      confirmLabel: t('Supprimer'),
      danger: true,
    })
    if (!ok) return
    removeLeadSource(s.id)
    logChange(me, 'parametres', 'A supprimé la source « {name} »', { name: s.name })
    toast(t('Source supprimée'))
  }

  return (
    <Card title={t('Sources de leads')} icon={Tags} pad={false}>
      <div className="px-4 py-3 border-b border-hairline flex flex-wrap gap-2 items-center">
        <p className="text-xs text-ink-mute flex-1 min-w-[14rem]">{t('Proposées dans les fiches lead et client. Une source désactivée reste sur les anciens leads.')}</p>
        <label className="relative w-full sm:w-56">
          <Search className="w-4 h-4 text-ink-faint absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input className="form-input h-8 pl-8" placeholder={t('Rechercher')} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={t('Rechercher une source')} />
        </label>
      </div>
      {rows.length === 0 ? (
        <Empty icon={Tags} title={t('Aucune source')} />
      ) : (
        <ul className="divide-y divide-hairline">
          {rows.map((s) => (
            <li key={s.id} className={cn('flex flex-wrap items-center gap-3 px-4 py-2.5', !s.active && 'opacity-60')}>
              {editing?.id === s.id ? (
                <form
                  className="flex-1 flex gap-2 min-w-[12rem]"
                  onSubmit={(e) => {
                    e.preventDefault()
                    rename()
                  }}
                >
                  <input className="form-input h-8" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus aria-label={t('Nom de la source')} />
                  <button className="btn btn-sm btn-primary" aria-label={t('Enregistrer')}>
                    <Check className="w-4 h-4" />
                  </button>
                  <button type="button" className="btn btn-sm btn-ghost" aria-label={t('Annuler')} onClick={() => setEditing(null)}>
                    <X className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <span className="flex-1 min-w-[10rem]">
                  <span className="text-sm font-semibold text-ink">{t(s.name)}</span>
                  <span className="block text-xs text-ink-mute">
                    {t(KIND_LABEL[s.kind])} · {t('{n} leads', { n: used(s.name) })}
                  </span>
                </span>
              )}
              {!s.active && <Badge>{t('Désactivée')}</Badge>}
              <Toggle
                on={s.active}
                label={t('Source active')}
                onChange={(active) => {
                  saveLeadSource({ ...s, active })
                  logChange(me, 'parametres', active ? 'A réactivé la source « {name} »' : 'A désactivé la source « {name} »', { name: s.name })
                }}
              />
              <button className="p-1.5 rounded-md hover:bg-stone" aria-label={t('Renommer')} onClick={() => setEditing({ id: s.id, name: s.name })}>
                <Pencil className="w-3.5 h-3.5" />
              </button>
              {can('delete') && (
                <button className="p-1.5 rounded-md hover:bg-tone-critical-soft hover:text-tone-critical-ink" aria-label={t('Supprimer')} onClick={() => remove(s)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex gap-2 p-3 border-t border-hairline bg-sand/40"
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
      >
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t('Nouvelle source (ex. Salon de l’habitation)')} className="form-input" aria-label={t('Nouvelle source')} />
        <button className="btn btn-md btn-secondary" disabled={!draft.trim()}>
          <Plus className="w-4 h-4" />
          {t('Ajouter')}
        </button>
      </form>
    </Card>
  )
}

function SourceSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <Select value={value} onChange={onChange} options={LEAD_SOURCES.filter((s) => s.active || s.name === value).map((s) => ({ value: s.name, label: t(s.name) }))} />
}

// ── Website form ────────────────────────────────────────────────────────────
export function WebsiteFormCard({ company }: { company: CompanyId }) {
  useStore()
  const { user } = useAuth()
  const conn = CONNECTIONS[company]
  const mapping = INTAKE_MAPPING[company]
  const [url, setUrl] = useState(conn.websiteForm.url)
  const [sending, setSending] = useState(false)
  const snippet = `<script src="https://formulaire.hillmancentrale.ca/v1.js" data-compagnie="${company}" data-source="${mapping.websiteSource}" async></script>\n<div id="hillman-soumission"></div>`

  const save = () => {
    saveConnections(company, { ...conn, websiteForm: { url: url.trim(), state: url.trim() ? 'en_attente' : 'non_configure' } })
    logChange(user?.name ?? '—', 'parametres', 'A configuré le formulaire web ({url})', { url: url.trim() })
    toast(t('Formulaire enregistré — envoyez une soumission test pour le valider'))
  }
  const testSubmission = async () => {
    setSending(true)
    try {
      await request(null, { ms: 900, fail: conn.websiteForm.state === 'non_configure' })
      addLead({ company, name: 'Test — ' + t('Formulaire web'), phone: '418 555-0100', email: 'test@exemple.com', city: 'Québec', channel: mapping.websiteSource, message: t('Soumission test du formulaire web'), status: 'Nouveau' })
      if (conn.websiteForm.state !== 'connecte') saveConnections(company, { ...conn, websiteForm: { ...conn.websiteForm, state: 'connecte' } })
      toast(t('Soumission test reçue : un lead « Test » a été créé'))
    } catch {
      toast(t("Aucune réponse du formulaire. Vérifiez que le code est installé sur la page."))
    } finally {
      setSending(false)
    }
  }

  return (
    <Card title={t('Formulaire du site web')} icon={Globe} actions={<ConnectionBadge state={conn.websiteForm.state} />}>
      <div className="space-y-3">
        <Field label={t('Page du formulaire')}>
          <div className="flex gap-2">
            <input className="form-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="exemple.com/soumission" />
            <button className="btn btn-sm btn-secondary shrink-0" disabled={url === conn.websiteForm.url} onClick={save}>
              {t('Enregistrer')}
            </button>
          </div>
        </Field>
        <Field label={t('Source attribuée')}>
          <SourceSelect value={mapping.websiteSource} onChange={(v) => saveIntakeMapping(company, { ...mapping, websiteSource: v })} />
        </Field>
        <div>
          <p className="label-caps mb-1 flex items-center gap-1.5">
            <Code2 className="w-3.5 h-3.5" />
            {t('Code à coller dans la page')}
          </p>
          <CopyField value={snippet} label={t('Code à coller dans la page')} multiline />
        </div>
        <button className="btn btn-sm btn-secondary" disabled={sending} onClick={testSubmission}>
          {sending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {t('Envoyer une soumission test')}
        </button>
      </div>
    </Card>
  )
}

// ── Google Ads lead forms + Business Profile ────────────────────────────────
export function GoogleCard({ company }: { company: CompanyId }) {
  useStore()
  const { user } = useAuth()
  const conn = CONNECTIONS[company]
  const gbp = GOOGLE_BUSINESS[company]
  const mapping = INTAKE_MAPPING[company]
  const [busy, setBusy] = useState<'ads' | 'gbp' | null>(null)
  const name = COMPANIES.find((c) => c.id === company)!.name

  const connect = async (what: 'ads' | 'gbp') => {
    setBusy(what)
    try {
      await request(null, { ms: 1000 })
      if (what === 'ads') saveConnections(company, { ...conn, google: { account: `${name} · Google Ads`, state: 'connecte' } })
      else saveGoogleBusiness(company, { profile: name, state: 'connecte' })
      logChange(user?.name ?? '—', 'parametres', what === 'ads' ? 'A connecté Google Ads' : 'A connecté la fiche Google Business', {})
      toast(t('Compte Google connecté'))
    } catch {
      toast(t('La connexion à Google a échoué'))
    } finally {
      setBusy(null)
    }
  }
  const disconnect = async (what: 'ads' | 'gbp') => {
    if (!(await confirmAction({ title: t('Déconnecter Google?'), body: t('Les nouveaux leads Google ne seront plus reçus automatiquement.'), confirmLabel: t('Déconnecter'), danger: true }))) return
    if (what === 'ads') saveConnections(company, { ...conn, google: { account: '', state: 'non_configure' } })
    else saveGoogleBusiness(company, { profile: '', state: 'non_configure' })
    toast(t('Google déconnecté'))
  }

  const row = ({ what, title, account, state, hint }: { what: 'ads' | 'gbp'; title: string; account: string; state: typeof gbp.state; hint: string }) => (
    <div key={what} className="rounded-lg border border-hairline p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <ConnectionBadge state={state} />
      </div>
      <p className="text-xs text-ink-mute">{account || hint}</p>
      {state === 'en_attente' && <Notice>{t('Validation de la fiche par Google en attente.')}</Notice>}
      <div className="flex gap-2">
        {state === 'connecte' ? (
          <button className="btn btn-xs btn-ghost" onClick={() => disconnect(what)}>
            {t('Déconnecter')}
          </button>
        ) : (
          <button className="btn btn-xs btn-secondary" disabled={busy !== null} onClick={() => connect(what)}>
            {busy === what && <LoaderCircle className="w-3.5 h-3.5 animate-spin" />}
            {state === 'non_configure' ? t('Connecter avec Google') : t('Reconnecter')}
          </button>
        )}
      </div>
    </div>
  )

  return (
    <Card title={t('Google')} icon={Search}>
      <div className="space-y-3">
        {row({ what: 'ads', title: t('Formulaires de leads Google Ads'), account: conn.google.account, state: conn.google.state, hint: t('Reçoit les leads des formulaires intégrés à vos annonces.') })}
        {row({ what: 'gbp', title: t('Fiche Google Business Profile'), account: gbp.profile, state: gbp.state, hint: t('Reçoit les demandes de soumission et les messages de la fiche.') })}
        <Field label={t('Source attribuée')}>
          <SourceSelect value={mapping.googleSource} onChange={(v) => saveIntakeMapping(company, { ...mapping, googleSource: v })} />
        </Field>
      </div>
    </Card>
  )
}

// ── Phone number forwarding ─────────────────────────────────────────────────
export function PhoneCard({ company }: { company: CompanyId }) {
  useStore()
  const { user } = useAuth()
  const fwd = PHONE_FORWARDING[company]
  const [number, setNumber] = useState(fwd.number)
  const [to, setTo] = useState(fwd.forwardTo)
  const [testing, setTesting] = useState(false)
  const dirty = number !== fwd.number || to !== fwd.forwardTo

  const save = () => {
    if (to.replace(/\D/g, '').length !== 10) return toast(t('Numéro de renvoi invalide (10 chiffres)'))
    if (number && number.replace(/\D/g, '').length !== 10) return toast(t('Numéro invalide (10 chiffres)'))
    savePhoneForwarding(company, { ...fwd, number, forwardTo: to, state: number ? 'en_attente' : 'non_configure' })
    logChange(user?.name ?? '—', 'parametres', 'A modifié le renvoi d’appels ({n} → {to})', { n: number || '—', to })
    toast(t('Renvoi enregistré — activation en cours'))
  }
  const test = async () => {
    setTesting(true)
    try {
      await request(null, { ms: 1200, fail: fwd.state === 'non_configure' })
      if (fwd.state !== 'connecte') savePhoneForwarding(company, { ...fwd, state: 'connecte' })
      toast(t('Appel test reçu au {to}', { to: fwd.forwardTo }))
    } catch {
      toast(t("L'appel test n'a pas abouti"))
    } finally {
      setTesting(false)
    }
  }

  return (
    <Card title={t('Renvoi d’appels')} icon={PhoneForwarded} actions={<ConnectionBadge state={fwd.state} />}>
      <div className="space-y-3">
        <p className="text-xs text-ink-mute">{t('Le numéro publié dans vos annonces renvoie les appels vers votre bureau. Chaque nouvel appelant peut créer un lead « Appel entrant ».')}</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label={t('Numéro publié')}>
            <input className="form-input tnum" value={number} onChange={(e) => setNumber(e.target.value)} placeholder={t('À commander')} />
          </Field>
          <Field label={t('Renvoyer vers')}>
            <input className="form-input tnum" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
        <label className="flex items-center justify-between gap-3 text-sm text-ink-secondary">
          {t('Créer un lead pour chaque nouvel appelant')}
          <Toggle on={fwd.createLead} label={t('Créer un lead pour chaque nouvel appelant')} onChange={(createLead) => savePhoneForwarding(company, { ...fwd, createLead })} />
        </label>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-sm btn-secondary" disabled={!dirty} onClick={save}>
            {t('Enregistrer')}
          </button>
          <button className="btn btn-sm btn-secondary" disabled={testing || !fwd.number} onClick={test}>
            {testing ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <PhoneForwarded className="w-4 h-4" />}
            {t('Faire un appel test')}
          </button>
        </div>
      </div>
    </Card>
  )
}
