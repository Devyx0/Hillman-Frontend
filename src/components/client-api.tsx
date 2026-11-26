/**
 * Client record pieces that exist only with the backend: Loi 25 / CASL consents (GET / POST
 * /clients/:id/consents), editing the record (PATCH /clients/:id) and the quote PDFs of the client's quotes
 * (GET /quotes/:id/documents, GET /documents/:id/download).
 */
import { useEffect, useState, type FormEvent } from 'react'
import { Download, FileText, LoaderCircle, Plus, ShieldCheck } from 'lucide-react'
import * as api from '../api/endpoints'
import { errorMessage } from '../api/http'
import { isValidPhone } from '../api/mappers'
import type { ApiConsents, ApiDocument, ConsentChannel, ManualConsentSource } from '../api/types'
import { recordConsent, updateClient } from '../data/actions'
import type { Client, Quote } from '../data/mock'
import { locale, t } from '../i18n'
import { toast } from '../lib/toast'
import { cn } from '../lib/utils'
import { SideCard } from './record'
import { ErrorState, SkeletonRows } from './states'
import { Badge, Drawer, Empty, Field } from './ui'
import { Dropdown } from './dropdown'

const when = (iso: string) => new Date(iso).toLocaleString(locale(), { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })

const CHANNEL_LABEL: Record<ConsentChannel, string> = { sms: 'Textos', email: 'Courriels' }
const SOURCE_LABEL: Record<string, string> = {
  verbal: 'Verbal',
  written: 'Écrit',
  web_form: 'Formulaire web',
  email: 'Courriel',
  sms: 'Texto',
  portal: 'Portail client',
  sms_stop: 'Réponse STOP',
  import_implied: 'Importé (implicite)',
}
const MANUAL_SOURCES: ManualConsentSource[] = ['verbal', 'written', 'web_form', 'email', 'sms', 'portal']

// ── Consents ─────────────────────────────────────────────────────────────────
export function ConsentsCard({ client }: { client: Client }) {
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; data?: ApiConsents }>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [adding, setAdding] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    let live = true
    setState({ status: 'loading' })
    api.listConsents(client.id).then(
      (data) => live && setState({ status: 'ready', data }),
      () => live && setState({ status: 'error' }),
    )
    return () => {
      live = false
    }
  }, [client.id, attempt])

  const current = (channel: ConsentChannel) => state.data?.current.find((c) => c.channel === channel)

  return (
    <SideCard
      title={t('Consentements (Loi 25)')}
      action={
        <button onClick={() => setAdding(true)} className="text-xs font-semibold text-primary-press inline-flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" />
          {t('Enregistrer')}
        </button>
      }
    >
      {state.status === 'loading' && <SkeletonRows rows={2} />}
      {state.status === 'error' && <ErrorState onRetry={() => setAttempt((n) => n + 1)} />}
      {state.status === 'ready' && state.data && (
        <div className="space-y-3">
          {(['sms', 'email'] as ConsentChannel[]).map((ch) => {
            const c = current(ch)
            return (
              <div key={ch} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{t(CHANNEL_LABEL[ch])}</p>
                  <p className="text-2xs text-ink-mute">
                    {c ? `${t(SOURCE_LABEL[c.source] ?? c.source)} · ${when(c.captured_at)}` : t('Aucun consentement enregistré')}
                    {c?.expires_at ? ` · ${t('expire le {date}', { date: new Date(c.expires_at).toLocaleDateString(locale()) })}` : ''}
                  </p>
                </div>
                {c?.is_current ? (
                  <Badge tone="good" dot>
                    {t('Consenti')}
                  </Badge>
                ) : c && !c.is_granted ? (
                  <Badge tone="critical" dot>
                    {t('Retiré')}
                  </Badge>
                ) : c ? (
                  <Badge tone="warn" dot>
                    {t('Expiré')}
                  </Badge>
                ) : (
                  <Badge tone="neutral">{t('Non')}</Badge>
                )}
              </div>
            )
          })}
          {state.data.history.length > 0 && (
            <div className="border-t border-hairline pt-2">
              <button onClick={() => setShowHistory((o) => !o)} className="text-xs font-semibold text-ink-mute hover:text-ink">
                {showHistory ? t('Masquer l’historique') : t('Historique ({n})', { n: state.data.history.length })}
              </button>
              {showHistory && (
                <ul className="mt-2 space-y-2">
                  {state.data.history.map((h) => (
                    <li key={h.id} className="text-2xs text-ink-secondary">
                      <span className={cn('font-semibold', h.is_granted ? 'text-tone-good-ink' : 'text-tone-critical-ink')}>
                        {t(CHANNEL_LABEL[h.channel])} · {h.is_granted ? t('Consenti') : t('Retiré')}
                      </span>{' '}
                      · {t(SOURCE_LABEL[h.source] ?? h.source)} · {when(h.captured_at)}
                      {h.recorded_by_name ? ` · ${h.recorded_by_name}` : ''}
                      {h.evidence ? <span className="block text-ink-mute">« {h.evidence} »</span> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
      {adding && (
        <ConsentDrawer
          client={client}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false)
            setAttempt((n) => n + 1)
          }}
        />
      )}
    </SideCard>
  )
}

function ConsentDrawer({ client, onClose, onSaved }: { client: Client; onClose: () => void; onSaved: () => void }) {
  const [channel, setChannel] = useState<ConsentChannel>('sms')
  const [granted, setGranted] = useState(true)
  const [source, setSource] = useState<ManualConsentSource>('verbal')
  const [evidence, setEvidence] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await recordConsent(client.id, { channel, is_granted: granted, source, evidence: evidence.trim() || null })
      toast(granted ? t('Consentement enregistré') : t('Retrait du consentement enregistré'))
      onSaved()
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Drawer open onClose={onClose} title={t('Enregistrer un consentement')}>
      <form onSubmit={submit} className="p-5 space-y-4">
        <p className="text-xs text-ink-mute">{t('Chaque changement est conservé (registre Loi 25) : un retrait s’ajoute à l’historique, il n’efface rien.')}</p>
        <Field label={t('Canal')}>
          <Dropdown className="form-input" value={channel} onChange={(e) => setChannel(e.target.value as ConsentChannel)}>
            <option value="sms">{t('Textos')}</option>
            <option value="email">{t('Courriels')}</option>
          </Dropdown>
        </Field>
        <fieldset className="flex gap-2">
          {[true, false].map((g) => (
            <label key={String(g)} className={cn('h-9 px-3 rounded-md border inline-flex items-center gap-2 text-sm cursor-pointer', granted === g ? 'border-primary bg-primary-wash text-ink font-semibold' : 'border-hairline-input text-ink-secondary hover:bg-sand')}>
              <input type="radio" name="consent-granted" checked={granted === g} onChange={() => setGranted(g)} className="accent-[var(--color-primary)]" />
              {g ? t('Consent') : t('Retire son consentement')}
            </label>
          ))}
        </fieldset>
        <Field label={t('Source')}>
          <Dropdown className="form-input" value={source} onChange={(e) => setSource(e.target.value as ManualConsentSource)}>
            {MANUAL_SOURCES.map((s) => (
              <option key={s} value={s}>
                {t(SOURCE_LABEL[s])}
              </option>
            ))}
          </Dropdown>
        </Field>
        <Field label={t('Preuve (facultatif)')}>
          <textarea className="form-input py-2 min-h-20" rows={3} value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder={t('ex. accepté au téléphone le 12 nov., formulaire signé…')} />
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
            {busy ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {t('Enregistrer')}
          </button>
        </div>
      </form>
    </Drawer>
  )
}

// ── Edit the client record ───────────────────────────────────────────────────
const TYPES = ['Résidentiel', 'Commercial', 'Entrepreneur']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const POSTAL_RE = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/

export function EditClientDrawer({ client, onClose }: { client: Client; onClose: () => void }) {
  const [f, setF] = useState({
    first: client.first,
    last: client.last,
    company: client.company ?? '',
    type: TYPES.includes(client.type) ? client.type : 'Résidentiel',
    phone: client.phone,
    mobile: client.mobile ?? '',
    email: client.email,
    no: client.no,
    street: client.street,
    city: client.city,
    postal: client.postal,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const problem =
      !f.first.trim() && !f.last.trim() && !f.company.trim()
        ? t('Entrez au moins un prénom ou un nom.')
        : (f.phone.trim() && !isValidPhone(f.phone)) || (f.mobile.trim() && !isValidPhone(f.mobile))
          ? t('Numéro de téléphone invalide (10 chiffres attendus).')
          : f.email.trim() && !EMAIL_RE.test(f.email.trim())
            ? t('Courriel invalide.')
            : f.postal.trim() && !POSTAL_RE.test(f.postal.trim())
              ? t('Code postal invalide (ex. G1H 3K7).')
              : f.type !== 'Résidentiel' && !f.company.trim()
                ? t("Entrez le nom de l'entreprise.")
                : null
    if (problem) return setError(problem)
    setBusy(true)
    setError(null)
    try {
      await updateClient(client.id, f)
      toast(t('Fiche client enregistrée'))
      onClose()
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Drawer open onClose={onClose} title={t('Modifier la fiche client')}>
      <form onSubmit={submit} noValidate className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t('Prénom')}>
            <input className="form-input" value={f.first} onChange={(e) => set('first', e.target.value)} autoFocus />
          </Field>
          <Field label={t('Nom')}>
            <input className="form-input" value={f.last} onChange={(e) => set('last', e.target.value)} />
          </Field>
          <Field label={t('Type de client')}>
            <Dropdown className="form-input" value={f.type} onChange={(e) => set('type', e.target.value)}>
              {TYPES.map((ty) => (
                <option key={ty} value={ty}>
                  {t(ty)}
                </option>
              ))}
            </Dropdown>
          </Field>
          <Field label={t("Nom de l'entreprise")}>
            <input className="form-input" value={f.company} onChange={(e) => set('company', e.target.value)} />
          </Field>
          <Field label={t('Téléphone')}>
            <input className="form-input tnum" type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
          </Field>
          <Field label={t('Cellulaire')}>
            <input className="form-input tnum" type="tel" value={f.mobile} onChange={(e) => set('mobile', e.target.value)} />
          </Field>
          <Field label={t('Courriel')} className="sm:col-span-2">
            <input className="form-input" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} />
          </Field>
          <div className="sm:col-span-2 grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3">
            <Field label={t('No civique')}>
              <input className="form-input tnum" value={f.no} onChange={(e) => set('no', e.target.value)} />
            </Field>
            <Field label={t('Rue')}>
              <input className="form-input" value={f.street} onChange={(e) => set('street', e.target.value)} />
            </Field>
          </div>
          <Field label={t('Ville')}>
            <input className="form-input" value={f.city} onChange={(e) => set('city', e.target.value)} />
          </Field>
          <Field label={t('Code postal')}>
            <input className="form-input uppercase" value={f.postal} onChange={(e) => set('postal', e.target.value)} />
          </Field>
        </div>
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
            {busy && <LoaderCircle className="w-4 h-4 animate-spin" />}
            {t('Enregistrer')}
          </button>
        </div>
      </form>
    </Drawer>
  )
}

// ── PDFs of the client's quotes ──────────────────────────────────────────────
const KIND_LABEL: Record<string, string> = { client_quote: 'Soumission', quantity_list: 'Bon de quantités', signed_contract: 'Contrat signé', work_order: 'Bon de travail' }

/** Open a generated PDF (short-lived signed URL). */
export async function openDocument(documentId: string) {
  // Open the tab first (pop-up blockers allow it only during the click), then point it at the signed URL.
  const win = window.open('', '_blank')
  try {
    const { url } = await api.downloadDocument(documentId)
    if (win) win.location.href = url
    else window.location.href = url
  } catch (e) {
    win?.close()
    toast(errorMessage(e))
  }
}

export function ClientDocuments({ quotes }: { quotes: Quote[] }) {
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; rows: (ApiDocument & { no: string })[] }>({ status: 'loading', rows: [] })
  const [attempt, setAttempt] = useState(0)
  const key = quotes.map((q) => q.id).join(',')
  useEffect(() => {
    let live = true
    setState({ status: 'loading', rows: [] })
    // The 10 most recent quotes: one request each.
    const recent = quotes.slice(0, 10)
    Promise.all(recent.map((q) => api.listDocuments(q.id).then((docs) => docs.map((d) => ({ ...d, no: q.no })))))
      .then((lists) => live && setState({ status: 'ready', rows: lists.flat().sort((a, b) => b.created_at.localeCompare(a.created_at)) }))
      .catch(() => live && setState({ status: 'error', rows: [] }))
    return () => {
      live = false
    }
  }, [key, attempt]) // eslint-disable-line react-hooks/exhaustive-deps

  if (state.status === 'loading')
    return (
      <div className="bg-white rounded-xl shadow-card">
        <SkeletonRows rows={3} />
      </div>
    )
  if (state.status === 'error')
    return (
      <div className="bg-white rounded-xl shadow-card">
        <ErrorState onRetry={() => setAttempt((n) => n + 1)} />
      </div>
    )
  if (!state.rows.length)
    return (
      <div className="bg-white rounded-xl shadow-card">
        <Empty icon={FileText} title={t('Aucun fichier')}>
          {t('Les PDF générés depuis les soumissions apparaissent ici.')}
        </Empty>
      </div>
    )
  return (
    <ul className="bg-white rounded-xl shadow-card divide-y divide-hairline">
      {state.rows.map((d) => (
        <li key={d.id} className="flex items-center gap-3 px-5 py-3">
          <FileText className="w-4 h-4 text-ink-mute" />
          <span className="flex-1 min-w-0 text-sm font-semibold truncate">
            {t(KIND_LABEL[d.kind] ?? d.kind)} {d.no}
            {d.include_costs && <span className="ml-2 text-2xs text-ink-mute font-normal">{t('avec coûtants')}</span>}
          </span>
          <span className="text-xs text-ink-mute">{when(d.created_at)}</span>
          <button onClick={() => void openDocument(d.id)} className="p-1.5 rounded hover:bg-sand" aria-label={t('Télécharger')}>
            <Download className="w-4 h-4 text-ink-mute" />
          </button>
        </li>
      ))}
    </ul>
  )
}
