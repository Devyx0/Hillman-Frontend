/**
 * New client form with live duplicate detection. One person can be a client of all three
 * companies, so matches are searched across every company and show who already serves them.
 */
import { useMemo, useState, type FormEvent } from 'react'
import { LoaderCircle, ShieldCheck, TriangleAlert, UserPlus } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { registerClientCompany } from '../../data/clients'
import { COMPANIES, companyById, type Client, type CompanyId } from '../../data/mock'
import { PRIVACY, activeSources } from '../../data/settings'
import { addClient, findDuplicateClients, useStore } from '../../data/store'
import { API_MODE } from '../../api/config'
import { errorMessage } from '../../api/http'
import { formatPhone, isValidPhone } from '../../api/mappers'
import type { DuplicateMatch } from '../../api/types'
import { DuplicateClientError, createClient, type ClientInput } from '../../data/actions'
import { CLIENTS } from '../../data/mock'
import { langName, t, type Lang } from '../../i18n'
import { toast } from '../../lib/toast'
import { cn } from '../../lib/utils'
import { Field } from '../ui'
import { splitName, type ClientPrefill } from './prefill'
import { ClientCard, DrawerFooter, MissingNotice } from './shared'

const TYPES = ['Résidentiel', 'Commercial', 'Entrepreneur']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const POSTAL_RE = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/

interface Props {
  prefill?: ClientPrefill
  /** Company the client is created for (fixed). When absent, the form asks for it. */
  company?: CompanyId
  /** Label of the button on a duplicate match. */
  /** Button on each possible duplicate (a string, or per client). */
  existingLabel: string | ((c: Client) => string)
  onUseExisting: (c: Client) => void
  onCreated: (c: Client) => void
  /**
   * API mode, lead conversion: the client is not created here but sent with the conversion (one transaction).
   * Receives the validated fields; `force` when a likely duplicate was shown and the user creates anyway.
   */
  onDeferred?: (input: ClientInput, opts: { force: boolean; smsConsent: boolean }) => void
  onCancel: () => void
  cancelLabel?: string
}

export default function ClientForm({ prefill = {}, company: fixedCompany, existingLabel, onUseExisting, onCreated, onDeferred, onCancel, cancelLabel, serverMatches }: Props & { serverMatches?: DuplicateMatch[] }) {
  useStore()
  const { companies, user } = useAuth()
  const sources = activeSources()
  const name = splitName(prefill.name)
  const [company, setCompany] = useState<CompanyId>(fixedCompany ?? (prefill.company && companies.includes(prefill.company) ? prefill.company : undefined) ?? companies[0] ?? 'toit')
  const [f, setF] = useState({
    first: name.first,
    last: name.last,
    company: prefill.companyName ?? '',
    phone: prefill.phone ?? '',
    mobile: '',
    email: prefill.email ?? '',
    no: prefill.no ?? '',
    street: prefill.street ?? '',
    city: prefill.city ?? '',
    postal: prefill.postal ?? '',
    type: prefill.type && TYPES.includes(prefill.type) ? prefill.type : 'Résidentiel',
    source: prefill.source ?? sources[0] ?? 'Autre',
    consentSms: false,
    // Language for everything sent to the client (portal, PDF, emails, texts). French by default.
    language: 'fr' as Lang,
  })
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  /** API mode: likely duplicates reported by the server (same phone or e-mail in that company). */
  const [serverDups, setServerDups] = useState<DuplicateMatch[] | null>(serverMatches?.length ? serverMatches : null)
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setServerDups(null)
    setF((prev) => ({ ...prev, [k]: v }))
  }

  // API mode: a client belongs to one company, so only that company's clients can be duplicates.
  const localDups = useMemo(() => findDuplicateClients(f).filter((c) => !API_MODE || c.companyId === company), [f, company])
  const dups: Client[] = serverDups
    ? serverDups.map(
        (m): Client =>
          CLIENTS.find((c) => c.id === m.id) ?? {
            id: m.id, first: m.first_name ?? '', last: m.last_name ?? '', company: m.organization_name ?? undefined, phone: formatPhone(m.phone),
            mobile: m.alternate_phone ? formatPhone(m.alternate_phone) : undefined, email: m.email ?? '', no: '', street: '', city: m.city ?? '', postal: '',
            since: '', tags: [], source: '', lifetime: 0, quotes: 0, lastActivity: '', consentSms: false, type: '', companyId: company, partial: true,
          },
      )
    : localDups
  const badPhone = (v: string) => API_MODE && !!v.trim() && !isValidPhone(v)
  const errors = {
    name: !f.first.trim() && !f.last.trim() ? t('Entrez au moins un prénom ou un nom.') : '',
    contact: !f.phone.trim() && !f.mobile.trim() && !f.email.trim() ? t('Entrez un téléphone ou un courriel.') : '',
    phone: badPhone(f.phone) || badPhone(f.mobile) ? t('Numéro de téléphone invalide (10 chiffres attendus).') : '',
    email: f.email.trim() && !EMAIL_RE.test(f.email.trim()) ? t('Courriel invalide.') : '',
    postal: f.postal.trim() && !POSTAL_RE.test(f.postal.trim()) ? t('Code postal invalide (ex. G1H 3K7).') : '',
    companyName: f.type !== 'Résidentiel' && !f.company.trim() ? t("Entrez le nom de l'entreprise.") : '',
  }
  const invalid = Object.values(errors).some(Boolean)
  const companyName = companyById(company).name

  /** API mode: create through the server (it checks duplicates in that company unless forced). */
  const submitApi = async () => {
    const input: ClientInput = {
      first: f.first.trim(),
      last: f.last.trim(),
      company: f.type !== 'Résidentiel' ? f.company.trim() : '',
      phone: f.phone.trim() || f.mobile.trim(),
      mobile: f.phone.trim() ? f.mobile.trim() : '',
      email: f.email.trim(),
      no: f.no.trim(),
      street: f.street.trim(),
      city: f.city.trim(),
      postal: f.postal.trim(),
      type: f.type,
    }
    if (onDeferred) {
      onDeferred(input, { force: dups.length > 0, smsConsent: f.consentSms })
      return
    }
    setBusy(true)
    setServerError(null)
    try {
      const { client, consentError } = await createClient(
        input,
        company,
        // A duplicate already shown (locally or by the server) and confirmed with « Créer quand même ».
        { force: dups.length > 0, smsConsent: f.consentSms },
      )
      toast(t('Client créé : {name}', { name: `${client.first} ${client.last}`.trim() || (client.company ?? '') }))
      if (consentError) toast(t("Le consentement aux textos n'a pas pu être enregistré : {error}", { error: errorMessage(consentError) }))
      onCreated(client)
    } catch (err) {
      if (err instanceof DuplicateClientError) setServerDups(err.matches)
      else setServerError(errorMessage(err))
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
    const c = addClient({
      first: f.first.trim(),
      last: f.last.trim(),
      company: f.type !== 'Résidentiel' ? f.company.trim() : undefined,
      phone: f.phone.trim() || f.mobile.trim(),
      mobile: f.mobile.trim() || undefined,
      email: f.email.trim(),
      no: f.no.trim(),
      street: f.street.trim(),
      city: f.city.trim(),
      postal: f.postal.trim().toUpperCase(),
      type: f.type,
      source: f.source,
      consentSms: f.consentSms,
      language: f.language,
      createdBy: user?.repId,
    })
    registerClientCompany(c.id, company)
    toast(t('Client créé : {name}', { name: `${c.first} ${c.last}`.trim() }))
    onCreated(c)
  }

  const err = (msg: string) => tried && msg && <span className="text-2xs font-semibold text-tone-critical-ink">{msg}</span>

  return (
    <form onSubmit={submit} noValidate className="flex flex-col min-h-full">
      <div className="p-5 space-y-5 flex-1">
        {!fixedCompany && companies.length > 1 && (
          <Field label={t('Compagnie')}>
            <select className="form-input" value={company} onChange={(e) => setCompany(e.target.value as CompanyId)}>
              {COMPANIES.filter((c) => companies.includes(c.id)).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t('Prénom')}>
            <input className="form-input" value={f.first} onChange={(e) => set('first', e.target.value)} autoComplete="off" aria-invalid={tried && !!errors.name} autoFocus />
          </Field>
          <Field label={t('Nom')}>
            <input className="form-input" value={f.last} onChange={(e) => set('last', e.target.value)} autoComplete="off" aria-invalid={tried && !!errors.name} />
          </Field>
          {err(errors.name) && <div className="sm:col-span-2 -mt-1">{err(errors.name)}</div>}
          <Field label={t('Type de client')}>
            <select className="form-input" value={f.type} onChange={(e) => set('type', e.target.value)}>
              {TYPES.map((ty) => (
                <option key={ty} value={ty}>
                  {t(ty)}
                </option>
              ))}
            </select>
          </Field>
          {f.type !== 'Résidentiel' ? (
            <Field label={t("Nom de l'entreprise")}>
              <input className="form-input" value={f.company} onChange={(e) => set('company', e.target.value)} aria-invalid={tried && !!errors.companyName} />
              {err(errors.companyName)}
            </Field>
          ) : (
            <span className="hidden sm:block" />
          )}
          <Field label={t('Téléphone')}>
            <input className="form-input tnum" type="tel" inputMode="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="418 555-0123" aria-invalid={tried && !!errors.contact} />
          </Field>
          <Field label={t('Cellulaire')}>
            <input className="form-input tnum" type="tel" inputMode="tel" value={f.mobile} onChange={(e) => set('mobile', e.target.value)} placeholder="581 555-0123" />
          </Field>
          <Field label={t('Courriel')} className="sm:col-span-2">
            <input className="form-input" type="email" inputMode="email" value={f.email} onChange={(e) => set('email', e.target.value)} aria-invalid={tried && !!(errors.email || errors.contact)} />
            {err(errors.email) || err(errors.contact) || err(errors.phone)}
          </Field>
          <div className="sm:col-span-2 grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3">
            <Field label={t('No civique')}>
              <input className="form-input tnum" value={f.no} onChange={(e) => set('no', e.target.value)} inputMode="numeric" />
            </Field>
            <Field label={t('Rue')}>
              <input className="form-input" value={f.street} onChange={(e) => set('street', e.target.value)} />
            </Field>
          </div>
          <Field label={t('Ville')}>
            <input className="form-input" value={f.city} onChange={(e) => set('city', e.target.value)} />
          </Field>
          <Field label={t('Code postal')}>
            <input className="form-input uppercase" value={f.postal} onChange={(e) => set('postal', e.target.value)} placeholder="G1H 3K7" aria-invalid={tried && !!errors.postal} />
            {err(errors.postal)}
          </Field>
          {/* The backend stores neither the language nor the source of a client (the source is chosen on each quote). */}
          {!API_MODE && (
          <fieldset className="sm:col-span-2 flex flex-col gap-1 min-w-0">
            <legend className="label-caps mb-1">{t('Langue de communication')}</legend>
            <div className="flex flex-wrap gap-2">
              {(['fr', 'en'] as const).map((l) => (
                <label key={l} className={cn('h-9 px-3 rounded-md border inline-flex items-center gap-2 text-sm cursor-pointer', f.language === l ? 'border-primary bg-primary-wash text-ink font-semibold' : 'border-hairline-input text-ink-secondary hover:bg-sand')}>
                  <input type="radio" name="client-language" value={l} checked={f.language === l} onChange={() => set('language', l)} className="accent-[var(--color-primary)]" />
                  {langName(l)}
                </label>
              ))}
            </div>
            <span className="text-2xs text-ink-mute">{t('Portail, soumissions, courriels et textos seront envoyés dans cette langue.')}</span>
          </fieldset>
          )}
          {!API_MODE && (
          <Field label={t('Source')} className="sm:col-span-2">
            <select className="form-input" value={f.source} onChange={(e) => set('source', e.target.value)}>
              {!sources.includes(f.source) && <option value={f.source}>{t(f.source)}</option>}
              {sources.map((s) => (
                <option key={s} value={s}>
                  {t(s)}
                </option>
              ))}
            </select>
          </Field>
          )}
        </div>

        <label className={cn('flex items-start gap-3 rounded-lg border px-3.5 py-3 cursor-pointer', f.consentSms ? 'border-primary bg-primary-wash' : 'border-hairline')}>
          <input type="checkbox" checked={f.consentSms} onChange={(e) => set('consentSms', e.target.checked)} className="mt-0.5 accent-[var(--color-primary)]" />
          <span className="text-sm text-ink-secondary">
            <span className="flex items-center gap-1.5 font-semibold text-ink mb-0.5">
              <ShieldCheck className="w-4 h-4" />
              {t('Consentement aux textos (Loi 25)')}
            </span>
            {t(PRIVACY.smsConsentText, { compagnie: companyName })}
          </span>
        </label>

        {dups.length > 0 && (
          <section className="rounded-xl border border-tone-warn bg-tone-warn-soft/50 p-3.5 space-y-2.5" aria-live="polite">
            <p className="flex items-center gap-2 text-sm font-semibold text-tone-warn-ink">
              <TriangleAlert className="w-4 h-4" />
              {dups.length > 1 ? t('{n} clients existants correspondent', { n: dups.length }) : t('Un client existant correspond')}
            </p>
            <p className="text-xs text-ink-secondary">
              {API_MODE
                ? t('Même téléphone ou courriel dans cette compagnie : ouvrez la fiche existante plutôt que de créer un doublon.')
                : t('Même téléphone, courriel ou adresse. Un client peut être servi par les trois compagnies : ouvrez la fiche existante plutôt que de créer un doublon.')}
            </p>
            <div className="space-y-2">
              {dups.slice(0, 4).map((c) => (
                <ClientCard
                  key={c.id}
                  c={c}
                  action={
                    <button type="button" onClick={() => onUseExisting(c)} className="btn btn-xs btn-secondary">
                      {typeof existingLabel === 'function' ? existingLabel(c) : existingLabel}
                    </button>
                  }
                />
              ))}
            </div>
          </section>
        )}
      </div>
      <DrawerFooter>
        {tried && invalid && <MissingNotice messages={Object.values(errors)} />}
        {serverError && <MissingNotice messages={[serverError]} />}
        <button type="button" onClick={onCancel} className="btn btn-sm btn-ghost">
          {cancelLabel ?? t('Annuler')}
        </button>
        <button type="submit" disabled={busy} className={cn('btn btn-sm', dups.length ? 'btn-secondary' : 'btn-primary')}>
          {busy ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          {dups.length ? t('Créer quand même') : t('Créer le client')}
        </button>
      </DrawerFooter>
    </form>
  )
}
