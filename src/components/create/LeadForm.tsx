/** New lead entered by hand (phone call, walk-in, trade show…). */
import { useState, type FormEvent } from 'react'
import { Inbox, LoaderCircle, TriangleAlert } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { useApp } from '../../context/AppContext'
import { DEFAULT_LEAD_REP } from '../../data/leads'
import { COMPANIES, REPS, fullName, type CompanyId, type Lead } from '../../data/mock'
import { activeSources } from '../../data/settings'
import { addLead, findDuplicateClients, useStore } from '../../data/store'
import { API_MODE } from '../../api/config'
import { errorMessage } from '../../api/http'
import { isValidPhone } from '../../api/mappers'
import { createLead } from '../../data/actions'
import { companyReps } from '../../data/reps'
import { t } from '../../i18n'
import type { CreatePrefill } from '../../lib/create'
import { toast } from '../../lib/toast'
import { Field } from '../ui'
import { DrawerFooter, MissingNotice } from './shared'
import { Dropdown } from '../dropdown'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function LeadForm({ prefill = {}, onCreated, onCancel }: { prefill?: CreatePrefill; onCreated: (l: Lead) => void; onCancel: () => void }) {
  useStore()
  const { user, companies, can } = useAuth()
  const sources = activeSources()
  // The company chosen in the left panel is the lead's company: no field, no change. Only the all-companies view
  // (Groupe) asks for it.
  const { scope } = useApp()
  const scoped = scope !== 'all' && companies.includes(scope) ? scope : undefined
  const [picked, setPicked] = useState<CompanyId>(prefill.company && companies.includes(prefill.company) ? prefill.company : (companies[0] ?? 'toit'))
  const company: CompanyId = scoped ?? picked
  const repsFor = (c: CompanyId) => (API_MODE ? companyReps(c) : REPS.filter((r) => r.company === c))
  // API mode: the signed-in user when they are one of the company's reps, else unassigned ('' — « Leads à qualifier »).
  const defaultRep = (c: CompanyId) => (user && repsFor(c).some((r) => r.id === user.repId) ? user.repId : API_MODE ? '' : DEFAULT_LEAD_REP[c])
  const [repChoice, setRepId] = useState(() => defaultRep(company) ?? repsFor(company)[0]?.id ?? '')
  // If the company changes while the form is open (left panel), a rep of the other company is not kept.
  const repId = repChoice === '' || repsFor(company).some((r) => r.id === repChoice) ? repChoice : (defaultRep(company) ?? repsFor(company)[0]?.id ?? '')
  const [busy, setBusy] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [f, setF] = useState({ name: prefill.name ?? '', phone: prefill.phone ?? '', email: prefill.email ?? '', city: prefill.city ?? '', source: prefill.source ?? sources[0] ?? 'Autre', message: '' })
  const [tried, setTried] = useState(false)
  const set = <K extends keyof typeof f>(k: K, v: string) => setF((prev) => ({ ...prev, [k]: v }))

  const errors = {
    name: !f.name.trim() ? t('Entrez le nom du contact.') : '',
    contact: !f.phone.trim() && !f.email.trim() ? t('Entrez un téléphone ou un courriel.') : '',
    email: f.email.trim() && !EMAIL_RE.test(f.email.trim()) ? t('Courriel invalide.') : '',
    phone: API_MODE && f.phone.trim() && !isValidPhone(f.phone) ? t('Numéro de téléphone invalide (10 chiffres attendus).') : '',
  }
  const invalid = Object.values(errors).some(Boolean)
  const known = findDuplicateClients({ phone: f.phone, email: f.email }).filter((c) => !API_MODE || c.companyId === company)

  const submitApi = async () => {
    setBusy(true)
    setServerError(null)
    try {
      const lead = await createLead({ name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim(), city: f.city.trim(), company, channel: f.source, message: f.message.trim(), repId })
      toast(t('Lead ajouté : {name}', { name: lead.name }))
      onCreated(lead)
    } catch (err) {
      setServerError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTried(true)
    if (invalid || busy) return
    if (API_MODE) {
      void submitApi()
      return
    }
    const lead = addLead({
      name: f.name.trim(),
      phone: f.phone.trim(),
      email: f.email.trim() || undefined,
      city: f.city.trim(),
      company,
      channel: f.source,
      message: f.message.trim(),
      status: 'Nouveau',
      repId,
      createdBy: user?.repId,
    })
    toast(t('Lead ajouté : {name}', { name: lead.name }))
    onCreated(lead)
  }
  const err = (msg: string) => (tried && msg ? <span className="text-2xs font-semibold text-tone-critical-ink">{msg}</span> : null)

  return (
    <form onSubmit={submit} noValidate className="flex flex-col min-h-full">
      <div className="p-5 space-y-4 flex-1">
        <Field label={t('Nom du contact')}>
          <input className="form-input" value={f.name} onChange={(e) => set('name', e.target.value)} aria-invalid={tried && !!errors.name} autoFocus />
          {err(errors.name)}
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t('Téléphone')}>
            <input className="form-input tnum" type="tel" inputMode="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="418 555-0123" aria-invalid={tried && !!errors.contact} />
          </Field>
          <Field label={t('Courriel')}>
            <input className="form-input" type="email" inputMode="email" value={f.email} onChange={(e) => set('email', e.target.value)} aria-invalid={tried && !!(errors.email || errors.contact)} />
          </Field>
          {(err(errors.contact) || err(errors.email) || err(errors.phone)) && <div className="sm:col-span-2 -mt-1">{err(errors.contact) ?? err(errors.email) ?? err(errors.phone)}</div>}
          <Field label={t('Ville')}>
            <input className="form-input" value={f.city} onChange={(e) => set('city', e.target.value)} />
          </Field>
          <Field label={t('Source')}>
            <Dropdown className="form-input" value={f.source} onChange={(e) => set('source', e.target.value)}>
              {!sources.includes(f.source) && <option value={f.source}>{t(f.source)}</option>}
              {sources.map((s) => (
                <option key={s} value={s}>
                  {t(s)}
                </option>
              ))}
            </Dropdown>
          </Field>
          {!scoped && companies.length > 1 && (
            <Field label={t('Compagnie')}>
              <Dropdown
                className="form-input"
                value={company}
                onChange={(e) => {
                  const c = e.target.value as CompanyId
                  setPicked(c)
                  setRepId(defaultRep(c) ?? repsFor(c)[0]?.id ?? '')
                }}
              >
                {COMPANIES.filter((c) => companies.includes(c.id)).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Dropdown>
            </Field>
          )}
          <Field label={t('Responsable')}>
            <Dropdown className="form-input" value={repId} onChange={(e) => setRepId(e.target.value)} disabled={!can('leads.assign')} title={can('leads.assign') ? undefined : t('Seuls les administrateurs et la coordination assignent les leads')}>
              {API_MODE && (can('leads.assign') || !repId) && <option value="">{t('Non assigné')}</option>}
              {repsFor(company).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Dropdown>
          </Field>
        </div>
        <Field label={t('Demande du client')}>
          <textarea className="form-input min-h-24 py-2" rows={4} value={f.message} onChange={(e) => set('message', e.target.value)} placeholder={t('Travaux souhaités, urgence, disponibilités…')} />
        </Field>
        {known.length > 0 && (
          <div className="rounded-lg bg-tone-warn-soft text-tone-warn-ink px-3 py-2.5 text-xs font-medium flex items-start gap-2">
            <TriangleAlert className="w-4 h-4 shrink-0 mt-px" />
            <span>
              {t('Ce contact est déjà client : {names}. Le lead sera relié à sa fiche lors de la création de la soumission.', { names: known.slice(0, 2).map(fullName).join(', ') })}
            </span>
          </div>
        )}
      </div>
      <DrawerFooter>
        {tried && invalid && <MissingNotice messages={Object.values(errors)} />}
        {serverError && <MissingNotice messages={[serverError]} />}
        <button type="button" onClick={onCancel} className="btn btn-sm btn-ghost">
          {t('Annuler')}
        </button>
        <button type="submit" className="btn btn-sm btn-primary" disabled={busy}>
          {busy ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Inbox className="w-4 h-4" />}
          {t('Ajouter le lead')}
        </button>
      </DrawerFooter>
    </form>
  )
}
