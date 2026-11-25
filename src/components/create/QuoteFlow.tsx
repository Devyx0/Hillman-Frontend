/**
 * New quote: company → client (existing, across all companies, or new with duplicate check) →
 * job type → template → rep. Creates the quote in the store and opens it in the builder.
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, FilePlus2, FileText, LoaderCircle, Search, UserPlus, Users } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { useAccess } from '../../auth/access'
import { useApp } from '../../context/AppContext'
import { LEAD_PROFILES, leadById } from '../../data/leads'
import { CLIENTS, COMPANIES, QUOTES, REPS, WORK_TYPES, clientById, companyById, fullName, type Client, type CompanyId } from '../../data/mock'
import { addQuote, findDuplicateClients, updateLead, useStore } from '../../data/store'
import { API_MODE } from '../../api/config'
import { errorMessage } from '../../api/http'
import type { CatalogueTemplate } from '../../api/types'
import { DuplicateClientError, convertLead, createQuote, leadClientMatches, recordConsent, type ClientInput } from '../../data/actions'
import { formatPhone } from '../../api/mappers'
import type { DuplicateMatch } from '../../api/types'
import { loadCatalogue, roleIn, searchClients, workTypeByName } from '../../data/api-sync'
import { companyReps as companyRepsOf } from '../../data/reps'
import { activeSources } from '../../data/settings'
import { Field } from '../ui'
import { t } from '../../i18n'
import type { CreatePrefill } from '../../lib/create'
import { toast } from '../../lib/toast'
import { cn, normalize } from '../../lib/utils'
import { QUOTE_TEMPLATES, templateById } from '../../pages/catalogue/data'
import { NoAccess } from '../states'
import { CompanyBadge, Empty, RepAvatar } from '../ui'
import ClientForm from './ClientForm'
import { leadClientPrefill, splitName } from './prefill'
import { ClientCard, DrawerFooter, MissingNotice, Steps } from './shared'

const NO_TEMPLATE = ''

/** Words of a work type worth matching against a lead's text ("Toit plat · Élastomère" → toit, plat, elastomere). */
const workTokens = (w: string) => normalize(w).split(/[^a-z0-9-]+/).filter((x) => x.length >= 4)

export default function QuoteFlow({ prefill, onClose }: { prefill: CreatePrefill; onClose: () => void }) {
  useStore()
  const navigate = useNavigate()
  const { scope } = useApp()
  const { user, companies, can } = useAuth()
  const access = useAccess()
  const lead = leadById(prefill.leadId)
  const allowed = COMPANIES.filter((c) => companies.includes(c.id))

  // Everything the lead (or the caller) knows about the person, for the new-client form.
  const contact = leadClientPrefill(lead, prefill)
  const contactName = splitName(contact.name)
  const findMatches = () => (contact.name || contact.phone || contact.email ? findDuplicateClients({ first: contactName.first, last: contactName.last, phone: contact.phone, email: contact.email, no: contact.no, street: contact.street }) : [])
  const contactMatches = useMemo(
    findMatches,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contact.name, contact.phone, contact.email, contact.no, contact.street],
  )

  const initialCompany = (): CompanyId | undefined => {
    // API mode: a quote is in its client's company.
    const clientCompany = API_MODE ? clientById(prefill.clientId ?? lead?.clientId)?.companyId : undefined
    // API mode, from a lead: the conversion creates the quote in the lead's company.
    const wanted = (API_MODE && lead ? lead.company : undefined) ?? clientCompany ?? prefill.company ?? lead?.company ?? (scope !== 'all' ? scope : undefined)
    if (wanted && companies.includes(wanted)) return wanted
    return companies.length === 1 ? companies[0] : undefined
  }
  /** API mode: the quote comes from a lead → POST /leads/:id/convert (one transaction), not POST /quotes. */
  const converting = API_MODE && !!lead
  const passedClient = clientById(prefill.clientId ?? lead?.clientId)?.id
  const [company, setCompany] = useState<CompanyId | undefined>(initialCompany)
  // A lead whose contact matches exactly one existing client starts with that client selected.
  const [autoMatchId] = useState<string | undefined>(() => {
    if (passedClient || !lead) return undefined
    const m = findMatches().filter((c) => !API_MODE || c.companyId === initialCompany())
    return m.length === 1 ? m[0].id : undefined
  })
  const [clientId, setClientId] = useState<string | undefined>(passedClient ?? autoMatchId)
  const [clientMode, setClientMode] = useState<'search' | 'new'>('search')
  const [query, setQuery] = useState('')
  // Explicit picks; `null` follows the suggested default.
  const [workChoice, setWorkChoice] = useState<string | null>(null)
  const [templateChoice, setTemplateChoice] = useState<string | null>(null)
  const [repChoice, setRepChoice] = useState<string | null>(null)
  const [step, setStepRaw] = useState(() => (initialCompany() ? (passedClient ? 2 : 1) : 0))
  // Set when Continuer is clicked while something is still missing on the step.
  const [nudge, setNudge] = useState(false)
  const setStep = (i: number) => {
    setNudge(false)
    setStepRaw(i)
  }

  // Conversion: a new client is sent with the conversion (created in the same transaction), not before.
  const [pendingClient, setPendingClient] = useState<{ input: ClientInput; force: boolean; smsConsent: boolean } | null>(null)
  // Conversion: the server's « clients existants qui correspondent au lead », and duplicates it reported.
  const [leadMatches, setLeadMatches] = useState<DuplicateMatch[] | null>(null)
  const [dupMatches, setDupMatches] = useState<DuplicateMatch[] | null>(null)
  const pendingAsClient: Client | undefined = pendingClient
    ? { id: '', first: pendingClient.input.first, last: pendingClient.input.last, company: pendingClient.input.company || undefined, phone: pendingClient.input.phone ?? '', mobile: pendingClient.input.mobile || undefined, email: pendingClient.input.email ?? '', no: pendingClient.input.no ?? '', street: pendingClient.input.street ?? '', city: pendingClient.input.city ?? '', postal: pendingClient.input.postal ?? '', since: '', tags: [], source: '', lifetime: 0, quotes: 0, lastActivity: '', consentSms: pendingClient.smsConsent, type: pendingClient.input.type ?? 'Résidentiel', companyId: company }
    : undefined
  const client = clientById(clientId) ?? pendingAsClient
  const matchAsClient = (m: DuplicateMatch): Client =>
    clientById(m.id) ?? { id: m.id, first: m.first_name ?? '', last: m.last_name ?? '', company: m.organization_name ?? undefined, phone: formatPhone(m.phone), mobile: m.alternate_phone ? formatPhone(m.alternate_phone) : undefined, email: m.email ?? '', no: '', street: '', city: m.city ?? '', postal: '', since: '', tags: [], source: '', lifetime: 0, quotes: 0, lastActivity: '', consentSms: false, type: '', companyId: company, partial: true }
  const companyMatches = converting ? (leadMatches ?? []).map(matchAsClient) : contactMatches.filter((c) => !API_MODE || c.companyId === company)
  useEffect(() => {
    if (!converting || !lead) return
    let live = true
    leadClientMatches(lead.id).then(
      (m) => {
        if (!live) return
        setLeadMatches(m)
        // Exactly one existing client matches: start with it selected (as for the demo data).
        setClientId((cur) => cur ?? (m.length === 1 && !passedClient ? m[0].id : cur))
      },
      () => live && setLeadMatches([]),
    )
    return () => {
      live = false
    }
  }, [converting, lead?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const companyReps = company ? (API_MODE ? companyRepsOf(company) : REPS.filter((r) => r.company === company)) : []
  const workTypes = company ? [...new Set(WORK_TYPES[company])] : []
  // API mode: the company's templates from its catalogue, and the quote's source (required by the server).
  const [apiTemplates, setApiTemplates] = useState<CatalogueTemplate[] | null>(null)
  const [templatesError, setTemplatesError] = useState<string | null>(null)
  useEffect(() => {
    if (!API_MODE || !company) return
    let live = true
    setApiTemplates(null)
    setTemplatesError(null)
    loadCatalogue(company).then(
      (c) => live && setApiTemplates(c.quote_templates),
      (e) => live && setTemplatesError(errorMessage(e)),
    )
    return () => {
      live = false
    }
  }, [company])
  const sources = activeSources()
  const [sourceChoice, setSourceChoice] = useState<string | null>(null)
  const source = sourceChoice ?? (lead?.channel && sources.includes(lead.channel) ? lead.channel : (sources[0] ?? ''))
  const [busy, setBusy] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  // API mode: clients found on the server for the search (the lists hold only part of them).
  const [remoteHits, setRemoteHits] = useState<Client[]>([])

  /** Job type: what the lead asks for (keywords), else the client's last quote with this company, else the first type. */
  const suggestedWork = (): string => {
    if (!company) return ''
    if (lead) {
      const hay = normalize([lead.message, lead.aiSummary, LEAD_PROFILES[lead.id]?.work ?? ''].join(' '))
      let best = ''
      let bestScore = 0
      for (const w of workTypes) {
        const score = workTokens(w).filter((tok) => hay.includes(tok)).length
        if (score > bestScore) {
          best = w
          bestScore = score
        }
      }
      if (best) return best
    }
    if (client) {
      const last = QUOTES.filter((q) => q.clientId === client.id && q.company === company).sort((a, b) => b.date.localeCompare(a.date))[0]
      if (last && workTypes.includes(last.workType)) return last.workType
    }
    return workTypes[0] ?? ''
  }
  const workType = workChoice && workTypes.includes(workChoice) ? workChoice : suggestedWork()

  // The company's templates; those for the chosen job type first.
  const matchesWork = (kind: string) => !!workType && normalize(workType).startsWith(normalize(kind))
  const templates = company && !API_MODE ? QUOTE_TEMPLATES.filter((tp) => tp.company === company).sort((a, b) => Number(matchesWork(b.workType)) - Number(matchesWork(a.workType))) : []
  // API mode: templates for this work type, or for any work type (no work type set on the template).
  const workTypeId = company && workType ? workTypeByName(company, workType)?.id : undefined
  const apiChoices = (apiTemplates ?? []).filter((tp) => !tp.work_type_id || tp.work_type_id === workTypeId).sort((a, b) => Number(!!b.work_type_id) - Number(!!a.work_type_id) || a.sort_order - b.sort_order)
  const suggestedTemplate = API_MODE ? (apiChoices.find((tp) => tp.work_type_id === workTypeId)?.id ?? NO_TEMPLATE) : (templates.find((tp) => matchesWork(tp.workType))?.id ?? NO_TEMPLATE)
  const templateIds = API_MODE ? apiChoices.map((tp) => tp.id) : templates.map((tp) => tp.id)
  const templateId = templateChoice !== null && (templateChoice === NO_TEMPLATE || templateIds.includes(templateChoice)) ? templateChoice : suggestedTemplate
  const templateName = API_MODE ? apiChoices.find((tp) => tp.id === templateId)?.name : templateById(templateId)?.name

  // Without `quotes.viewAll` a rep creates quotes only for themselves.
  // API mode: a representative can only assign a quote to themselves (the server enforces it).
  const repLocked = API_MODE ? !!company && roleIn(company) === 'representative' : !can('quotes.viewAll') && !!user && companyReps.some((r) => r.id === user.repId)
  const defaultRep = () => {
    if (user && companyReps.some((r) => r.id === user.repId)) return user.repId
    if (lead?.repId && companyReps.some((r) => r.id === lead.repId)) return lead.repId
    return companyReps[0]?.id ?? ''
  }
  const repId = repLocked ? user!.repId : repChoice && companyReps.some((r) => r.id === repChoice) ? repChoice : defaultRep()

  const results = useMemo(() => {
    const q = normalize(query.trim())
    const digits = query.replace(/\D/g, '')
    if (!q) return []
    // Search covers the clients the user may see; a returning client of another rep is found by the
    // duplicate check of the new-client form ("Utiliser ce client"). API mode: the quote's company only.
    const local = CLIENTS.filter((c) => {
      if (!access.client(c)) return false
      if (API_MODE && c.companyId !== company) return false
      const hay = normalize(`${fullName(c)} ${c.company ?? ''} ${c.email} ${c.no} ${c.street} ${c.city}`)
      const phones = `${c.phone}${c.mobile ?? ''}`.replace(/\D/g, '')
      return hay.includes(q) || (digits.length >= 3 && phones.includes(digits))
    })
    const seen = new Set(local.map((c) => c.id))
    return [...local, ...remoteHits.filter((c) => !seen.has(c.id) && c.companyId === company)].slice(0, 8)
  }, [query, access, company, remoteHits])

  // API mode: also ask the server (debounced), since the cached list may not hold every client.
  useEffect(() => {
    if (!API_MODE || !company || query.trim().length < 2) {
      setRemoteHits([])
      return
    }
    let live = true
    const timer = window.setTimeout(() => {
      searchClients(query.trim(), { company }).then(
        (hits) => live && setRemoteHits(hits),
        () => live && setRemoteHits([]),
      )
    }, 300)
    return () => {
      live = false
      window.clearTimeout(timer)
    }
  }, [query, company])

  if (!can('quotes.edit')) return <NoAccess>{t('Votre rôle ne permet pas de créer des soumissions.')}</NoAccess>
  if (allowed.length === 0) return <NoAccess>{t("Votre compte n'est associé à aucune compagnie.")}</NoAccess>

  const steps = [t('Compagnie'), t('Client'), t('Travaux'), t('Modèle'), t('Représentant')]
  /** What still blocks a step, as a message (empty when the step is complete). */
  const missingAt = (i: number): string => {
    if (i >= 0 && !company) return t('Choisissez une compagnie pour continuer.')
    if (i >= 1 && !client) return t('Choisissez un client existant ou créez une nouvelle fiche pour continuer.')
    if (i >= 2 && !workType) return t('Choisissez le type de travaux pour continuer.')
    if (i >= 4 && !repId && !(API_MODE && repLocked)) return companyReps.length ? t('Choisissez un représentant pour continuer.') : t('Aucun représentant pour cette compagnie.')
    if (i >= 4 && API_MODE && !converting && !source) return t('Choisissez la source pour continuer.')
    return ''
  }
  const missing = missingAt(step)

  const go = (i: number) => setStep(i)
  const next = () => {
    if (missing) {
      setNudge(true)
      return
    }
    go(step + 1)
  }
  const pickClient = (c: Client) => {
    setClientId(c.id)
    setPendingClient(null)
    setDupMatches(null)
    setClientMode('search')
    go(2)
  }

  const convertApi = async (pending = pendingClient) => {
    if (!company || !lead || (!clientId && !pending)) return
    setBusy(true)
    setServerError(null)
    try {
      const q = await convertLead(lead.id, {
        company,
        clientId: pending ? undefined : clientId,
        newClient: pending?.input,
        force: pending?.force,
        workType,
        repId: repLocked ? undefined : repId,
        templateId: templateId || undefined,
      })
      // The consent checkbox of the new-client form: recorded on the client the conversion created.
      if (pending?.smsConsent) await recordConsent(q.clientId, { channel: 'sms', is_granted: true, source: 'verbal' }).catch((e) => toast(t("Le consentement aux textos n'a pas pu être enregistré : {error}", { error: errorMessage(e) })))
      toast(t('Soumission {no} créée', { no: q.no }))
      onClose()
      navigate(`/soumissions/${q.id}`)
    } catch (err) {
      setBusy(false)
      if (err instanceof DuplicateClientError && pending) {
        // Back to the new-client form, with the server's matches: use one, or create anyway.
        setDupMatches(err.matches)
        setClientMode('new')
        go(1)
        return
      }
      setServerError(errorMessage(err))
    }
  }

  const createApi = async () => {
    if (!company || !client) return
    if (converting) return convertApi()
    setBusy(true)
    setServerError(null)
    try {
      // A rep's quote is always theirs: the server assigns it when no rep is sent.
      const q = await createQuote({ company, clientId: client.id, workType, source, repId: repLocked ? undefined : repId, templateId: templateId || undefined })
      toast(t('Soumission {no} créée', { no: q.no }))
      onClose()
      navigate(`/soumissions/${q.id}`)
    } catch (err) {
      setServerError(errorMessage(err))
      setBusy(false)
    }
  }

  const create = () => {
    const blocker = missingAt(4)
    if (blocker || !company || !client) {
      setNudge(true)
      return
    }
    if (API_MODE) {
      if (!busy) void createApi()
      return
    }
    const q = addQuote({ clientId: client.id, company, repId, workType, templateId: templateId || undefined, leadId: lead?.id, source: lead?.channel ?? client.source, city: client.city })
    if (lead) updateLead(lead.id, { status: 'Converti', quoteId: q.id, clientId: client.id })
    toast(t('Soumission {no} créée', { no: q.no }))
    onClose()
    navigate(`/soumissions/${q.id}`)
  }

  // The inline new-client form takes over the drawer body (it has its own footer).
  if (step === 1 && clientMode === 'new' && company)
    return (
      <div className="flex flex-col min-h-full">
        <div className="px-5 pt-4">
          <Steps steps={steps} current={step} onPick={go} />
          <p className="text-sm font-semibold text-ink mt-4">{t('Nouveau client')}</p>
        </div>
        <ClientForm
          key={dupMatches ? 'dups' : 'form'}
          prefill={pendingClient ? { ...contact, name: `${pendingClient.input.first} ${pendingClient.input.last}`.trim(), companyName: pendingClient.input.company, phone: pendingClient.input.phone, email: pendingClient.input.email, no: pendingClient.input.no, street: pendingClient.input.street, city: pendingClient.input.city, postal: pendingClient.input.postal, type: pendingClient.input.type, company } : { ...contact, company }}
          company={company}
          existingLabel={t('Utiliser ce client')}
          onUseExisting={pickClient}
          onCreated={pickClient}
          serverMatches={dupMatches ?? undefined}
          onDeferred={
            converting
              ? (input, o) => {
                  const pending = { input, force: o.force, smsConsent: o.smsConsent }
                  setPendingClient(pending)
                  setClientId(undefined)
                  setClientMode('search')
                  // After a duplicate warning from the conversion itself: retry right away (everything else is chosen).
                  if (dupMatches) {
                    setDupMatches(null)
                    void convertApi(pending)
                  } else go(2)
                }
              : undefined
          }
          onCancel={() => {
            setDupMatches(null)
            setClientMode('search')
          }}
          cancelLabel={t('Retour')}
        />
      </div>
    )

  return (
    <div className="flex flex-col min-h-full">
      <div className="p-5 space-y-5 flex-1">
        <Steps steps={steps} current={step} onPick={go} />
        {lead && (
          <p className="text-xs text-ink-mute">
            {t('À partir du lead {name}', { name: lead.name })} · {t(lead.channel)}
          </p>
        )}

        {step === 0 && (
          <div className="space-y-2" role="radiogroup" aria-label={t('Compagnie')}>
            {allowed.map((c) => (
              <button
                key={c.id}
                role="radio"
                aria-checked={company === c.id}
                // From a lead (API mode) the quote is in the lead's company.
                disabled={converting && c.id !== lead?.company}
                onClick={() => {
                  if (company !== c.id) {
                    setWorkChoice(null)
                    setTemplateChoice(null)
                    setRepChoice(null)
                    // API mode: the client must belong to the quote's company.
                    if (API_MODE && client && client.companyId !== c.id) setClientId(undefined)
                  }
                  setCompany(c.id)
                  setNudge(false)
                }}
                className={cn('w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors disabled:opacity-40', company === c.id ? 'border-primary bg-primary-wash' : 'border-hairline hover:border-primary')}
              >
                <span className={cn('w-2.5 h-2.5 rounded-full', c.dot)} />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-ink">{c.name}</span>
                  <span className="block text-xs text-ink-mute">{t('Numéros {code}xxxxx', { code: c.code })}</span>
                </span>
                {company === c.id && <Check className="w-4 h-4 text-primary-press" />}
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            {client && (
              <div className="space-y-1.5">
                <p className="label-caps">
                  {pendingClient ? t('Nouveau client · créé avec la soumission') : clientId === autoMatchId || (converting && leadMatches?.some((m) => m.id === clientId)) ? t('Client existant qui correspond au lead') : t('Client sélectionné')}
                </p>
                <ClientCard c={client} selected onClick={() => (pendingClient ? setClientMode('new') : go(2))} />
              </div>
            )}
            {companyMatches.length > 0 && (!client || (converting && companyMatches.some((m) => m.id !== clientId))) && (
              <div className="space-y-2">
                <p className="label-caps">{t('Clients existants qui correspondent au lead')}</p>
                {companyMatches.filter((c) => c.id !== clientId).slice(0, 4).map((c) => (
                  <ClientCard key={c.id} c={c} onClick={() => pickClient(c)} />
                ))}
              </div>
            )}
            {contact.name && (
              <button onClick={() => setClientMode('new')} className={cn('btn btn-sm w-full', client ? 'btn-secondary' : 'btn-primary')}>
                <UserPlus className="w-4 h-4" />
                {t('Créer la fiche de {name}', { name: contact.name })}
              </button>
            )}
            <div className="space-y-2">
              <p className="label-caps">{API_MODE ? t('Rechercher un client de cette compagnie') : t('Rechercher un client (toutes les compagnies)')}</p>
              <label className="relative block">
                <Search className="w-4 h-4 text-ink-mute absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Nom, téléphone, adresse, courriel…')} className="form-input pl-9" aria-label={t('Rechercher un client')} autoFocus={!contact.name} />
              </label>
              {query.trim() && results.length === 0 && (
                <Empty icon={Users} title={t('Aucun client trouvé.')}>
                  {t('Créez une nouvelle fiche client.')}
                </Empty>
              )}
              {results.map((c) => (
                <ClientCard key={c.id} c={c} selected={c.id === clientId} onClick={() => pickClient(c)} />
              ))}
            </div>
            {!contact.name && (
              <button onClick={() => setClientMode('new')} className="btn btn-sm btn-secondary w-full">
                <UserPlus className="w-4 h-4" />
                {t('Nouveau client')}
              </button>
            )}
          </div>
        )}

        {step === 2 && company && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label={t('Type de travaux')}>
            {workTypes.map((w) => (
              <button key={w} role="radio" aria-checked={workType === w} onClick={() => {
                  setWorkChoice(w)
                  setTemplateChoice(null)
                  setNudge(false)
                }} className={cn('flex items-center gap-2 rounded-lg border px-3.5 py-3 text-left text-sm font-semibold transition-colors', workType === w ? 'border-primary bg-primary-wash text-primary-press' : 'border-hairline text-ink hover:border-primary')}>
                <span className="flex-1">{t(w)}</span>
                {workType === w && <Check className="w-4 h-4 shrink-0" />}
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-2" role="radiogroup" aria-label={t('Modèle')}>
            <button role="radio" aria-checked={templateId === NO_TEMPLATE} onClick={() => setTemplateChoice(NO_TEMPLATE)} className={cn('w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left', templateId === NO_TEMPLATE ? 'border-primary bg-primary-wash' : 'border-hairline hover:border-primary')}>
              <FilePlus2 className="w-4 h-4 text-ink-mute" />
              <span className="flex-1 text-sm font-semibold text-ink">{t('Aucun modèle · soumission vierge')}</span>
              {templateId === NO_TEMPLATE && <Check className="w-4 h-4 text-primary-press" />}
            </button>
            {API_MODE && apiTemplates === null && !templatesError && <p className="text-xs text-ink-mute px-1 flex items-center gap-2"><LoaderCircle className="w-3.5 h-3.5 animate-spin" />{t('Chargement…')}</p>}
            {API_MODE && templatesError && <p className="text-xs text-tone-critical-ink px-1">{templatesError}</p>}
            {API_MODE &&
              apiChoices.map((tp) => (
                <button key={tp.id} role="radio" aria-checked={templateId === tp.id} onClick={() => setTemplateChoice(tp.id)} className={cn('w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left', templateId === tp.id ? 'border-primary bg-primary-wash' : 'border-hairline hover:border-primary')}>
                  <FileText className="w-4 h-4 text-ink-mute shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-ink">{tp.name}</span>
                    <span className="block text-xs text-ink-mute">
                      {t('{n} clauses', { n: tp.items.filter((i) => i.scope_item_id).length })} · {t('{n} lignes de coûts', { n: tp.items.filter((i) => i.cost_item_id).length })} · {t('{n} ajouts', { n: tp.items.filter((i) => i.addon_preset_id).length })}
                    </span>
                  </span>
                  {!!tp.work_type_id && tp.work_type_id === workTypeId && <span className="badge bg-tone-good-soft text-tone-good-ink !text-2xs shrink-0">{t('Suggéré')}</span>}
                  {templateId === tp.id && <Check className="w-4 h-4 text-primary-press shrink-0" />}
                </button>
              ))}
            {templates.map((tp) => (
              <button key={tp.id} role="radio" aria-checked={templateId === tp.id} onClick={() => setTemplateChoice(tp.id)} className={cn('w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left', templateId === tp.id ? 'border-primary bg-primary-wash' : 'border-hairline hover:border-primary')}>
                <FileText className="w-4 h-4 text-ink-mute shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-ink">{t(tp.name)}</span>
                  <span className="block text-xs text-ink-mute">
                    {t(tp.workType)} · {t('{n} lignes de coûts', { n: tp.costs.length })} · {t('utilisé {n} fois', { n: tp.used })}
                  </span>
                </span>
                {matchesWork(tp.workType) && <span className="badge bg-tone-good-soft text-tone-good-ink !text-2xs shrink-0">{t('Suggéré')}</span>}
                {templateId === tp.id && <Check className="w-4 h-4 text-primary-press shrink-0" />}
              </button>
            ))}
            {!API_MODE && templates.length === 0 && <p className="text-xs text-ink-mute px-1">{t("Aucun modèle pour cette compagnie. Créez-en dans Catalogue → Modèles.")}</p>}
            {API_MODE && apiTemplates !== null && apiChoices.length === 0 && <p className="text-xs text-ink-mute px-1">{t('Aucun modèle pour ce type de travaux.')}</p>}
          </div>
        )}

        {step === 4 && company && client && (
          <div className="space-y-4">
            <div className="space-y-2" role="radiogroup" aria-label={t('Représentant')}>
              {companyReps.map((r) => (
                <button key={r.id} role="radio" aria-checked={repId === r.id} disabled={repLocked && r.id !== user?.repId} onClick={() => {
                    setRepChoice(r.id)
                    setNudge(false)
                  }} className={cn('w-full flex items-center gap-3 rounded-lg border px-4 py-2.5 text-left disabled:opacity-40', repId === r.id ? 'border-primary bg-primary-wash' : 'border-hairline hover:border-primary')}>
                  <RepAvatar id={r.id} size="md" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-ink truncate">{r.name}</span>
                    <span className="block text-xs text-ink-mute truncate">{t(r.territory)}</span>
                  </span>
                  {repId === r.id && <Check className="w-4 h-4 text-primary-press" />}
                </button>
              ))}
            </div>
            {API_MODE && !converting && (
              <Field label={t('Source')}>
                <select className="form-input" value={source} onChange={(e) => setSourceChoice(e.target.value)}>
                  {sources.map((s) => (
                    <option key={s} value={s}>
                      {t(s)}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <dl className="rounded-xl bg-sand p-4 grid grid-cols-[7rem_minmax(0,1fr)] gap-y-2 text-sm">
              <dt className="text-ink-mute">{t('Compagnie')}</dt>
              <dd>
                <CompanyBadge id={company} full />
              </dd>
              <dt className="text-ink-mute">{t('Client')}</dt>
              <dd className="font-semibold text-ink truncate">{fullName(client)}</dd>
              <dt className="text-ink-mute">{t('Travaux')}</dt>
              <dd className="text-ink">{t(workType)}</dd>
              <dt className="text-ink-mute">{t('Modèle')}</dt>
              <dd className="text-ink">{templateName ? t(templateName) : t('Aucun')}</dd>
              <dt className="text-ink-mute">{t('Numéro')}</dt>
              <dd className="text-ink-mute">{t('Attribué à la création ({code}…)', { code: companyById(company).code })}</dd>
            </dl>
          </div>
        )}
      </div>
      <DrawerFooter>
        {step > 0 ? (
          <button onClick={() => go(step - 1)} className="btn btn-sm btn-ghost mr-auto">
            <ArrowLeft className="w-4 h-4" />
            {t('Retour')}
          </button>
        ) : (
          <button onClick={onClose} className="btn btn-sm btn-ghost mr-auto">
            {t('Annuler')}
          </button>
        )}
        {nudge && missing && <MissingNotice messages={[missing]} />}
        {serverError && <MissingNotice messages={[serverError]} />}
        {step < 4 ? (
          <button onClick={next} aria-disabled={!!missing} className={cn('btn btn-sm btn-primary', missing && 'opacity-60')}>
            {t('Continuer')}
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={create} aria-disabled={!!missing} disabled={busy} className={cn('btn btn-sm btn-primary', missing && 'opacity-60')}>
            {busy ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <FilePlus2 className="w-4 h-4" />}
            {t('Créer la soumission')}
          </button>
        )}
      </DrawerFooter>
    </div>
  )
}
