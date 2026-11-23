/**
 * New quote: company → client (existing, across all companies, or new with duplicate check) →
 * job type → template → rep. Creates the quote in the store and opens it in the builder.
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, FilePlus2, FileText, Search, UserPlus, Users } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { useAccess } from '../../auth/access'
import { useApp } from '../../context/AppContext'
import { LEAD_PROFILES, leadById } from '../../data/leads'
import { CLIENTS, COMPANIES, QUOTES, REPS, WORK_TYPES, clientById, companyById, fullName, type Client, type CompanyId } from '../../data/mock'
import { addQuote, findDuplicateClients, updateLead, useStore } from '../../data/store'
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
    const wanted = prefill.company ?? lead?.company ?? (scope !== 'all' ? scope : undefined)
    if (wanted && companies.includes(wanted)) return wanted
    return companies.length === 1 ? companies[0] : undefined
  }
  const passedClient = clientById(prefill.clientId ?? lead?.clientId)?.id
  const [company, setCompany] = useState<CompanyId | undefined>(initialCompany)
  // A lead whose contact matches exactly one existing client starts with that client selected.
  const [autoMatchId] = useState<string | undefined>(() => {
    if (passedClient || !lead) return undefined
    const m = findMatches()
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

  const client = clientById(clientId)
  const companyReps = company ? REPS.filter((r) => r.company === company) : []
  const workTypes = company ? [...new Set(WORK_TYPES[company])] : []

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
  const templates = company ? QUOTE_TEMPLATES.filter((tp) => tp.company === company).sort((a, b) => Number(matchesWork(b.workType)) - Number(matchesWork(a.workType))) : []
  const suggestedTemplate = templates.find((tp) => matchesWork(tp.workType))?.id ?? NO_TEMPLATE
  const templateId = templateChoice !== null && (templateChoice === NO_TEMPLATE || templates.some((tp) => tp.id === templateChoice)) ? templateChoice : suggestedTemplate

  // Without `quotes.viewAll` a rep creates quotes only for themselves.
  const repLocked = !can('quotes.viewAll') && !!user && companyReps.some((r) => r.id === user.repId)
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
    // duplicate check of the new-client form ("Utiliser ce client").
    return CLIENTS.filter((c) => {
      if (!access.client(c)) return false
      const hay = normalize(`${fullName(c)} ${c.company ?? ''} ${c.email} ${c.no} ${c.street} ${c.city}`)
      const phones = `${c.phone}${c.mobile ?? ''}`.replace(/\D/g, '')
      return hay.includes(q) || (digits.length >= 3 && phones.includes(digits))
    }).slice(0, 8)
  }, [query, access])

  if (!can('quotes.edit')) return <NoAccess>{t('Votre rôle ne permet pas de créer des soumissions.')}</NoAccess>
  if (allowed.length === 0) return <NoAccess>{t("Votre compte n'est associé à aucune compagnie.")}</NoAccess>

  const steps = [t('Compagnie'), t('Client'), t('Travaux'), t('Modèle'), t('Représentant')]
  /** What still blocks a step, as a message (empty when the step is complete). */
  const missingAt = (i: number): string => {
    if (i >= 0 && !company) return t('Choisissez une compagnie pour continuer.')
    if (i >= 1 && !client) return t('Choisissez un client existant ou créez une nouvelle fiche pour continuer.')
    if (i >= 2 && !workType) return t('Choisissez le type de travaux pour continuer.')
    if (i >= 4 && !repId) return companyReps.length ? t('Choisissez un représentant pour continuer.') : t('Aucun représentant pour cette compagnie.')
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
    setClientMode('search')
    go(2)
  }

  const create = () => {
    const blocker = missingAt(4)
    if (blocker || !company || !client) {
      setNudge(true)
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
        <ClientForm prefill={{ ...contact, company }} company={company} existingLabel={t('Utiliser ce client')} onUseExisting={pickClient} onCreated={pickClient} onCancel={() => setClientMode('search')} cancelLabel={t('Retour')} />
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
                onClick={() => {
                  if (company !== c.id) {
                    setWorkChoice(null)
                    setTemplateChoice(null)
                    setRepChoice(null)
                  }
                  setCompany(c.id)
                  setNudge(false)
                }}
                className={cn('w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors', company === c.id ? 'border-primary bg-primary-wash' : 'border-hairline hover:border-primary')}
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
                <p className="label-caps">{clientId === autoMatchId ? t('Client existant qui correspond au lead') : t('Client sélectionné')}</p>
                <ClientCard c={client} selected onClick={() => go(2)} />
              </div>
            )}
            {contactMatches.length > 0 && !client && (
              <div className="space-y-2">
                <p className="label-caps">{t('Clients existants qui correspondent au lead')}</p>
                {contactMatches.slice(0, 4).map((c) => (
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
              <p className="label-caps">{t('Rechercher un client (toutes les compagnies)')}</p>
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
            {templates.length === 0 && <p className="text-xs text-ink-mute px-1">{t("Aucun modèle pour cette compagnie. Créez-en dans Catalogue → Modèles.")}</p>}
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
              <dd className="text-ink">{templateById(templateId) ? t(templateById(templateId)!.name) : t('Aucun')}</dd>
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
        {step < 4 ? (
          <button onClick={next} aria-disabled={!!missing} className={cn('btn btn-sm btn-primary', missing && 'opacity-60')}>
            {t('Continuer')}
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={create} aria-disabled={!!missing} className={cn('btn btn-sm btn-primary', missing && 'opacity-60')}>
            <FilePlus2 className="w-4 h-4" />
            {t('Créer la soumission')}
          </button>
        )}
      </DrawerFooter>
    </div>
  )
}
