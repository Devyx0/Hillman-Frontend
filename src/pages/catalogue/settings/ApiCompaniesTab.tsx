/**
 * Paramètres → Compagnies with the backend: GET /companies/:id/settings (members), PATCH …/settings (admin of the
 * company; only the changed fields are sent, cleared optional fields as null), PUT / DELETE …/logo (PNG, JPG or WebP,
 * 2 MB max, no SVG). Same layout as the demo screen. What the API does not store (fax, displayed e-mail, footer image)
 * keeps its local behaviour; the texting / e-mail connections card (no API) is rendered by the caller, unchanged.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Building2, Check, LoaderCircle, Percent, RotateCcw, ShieldCheck, Target, Trash2, Upload, Wallet } from 'lucide-react'
import * as api from '../../../api/endpoints'
import { ApiError, errorMessage } from '../../../api/http'
import type { ApiCompanySettings, UpdateCompanySettingsBody } from '../../../api/types'
import { useAuth } from '../../../auth/AuthContext'
import { Card, CompanyLogo, Field } from '../../../components/ui'
import { ErrorState, Loading, Notice, confirmAction } from '../../../components/states'
import { applyCompanySettings, companyUuid, isCostViewer, roleIn } from '../../../data/api-sync'
import { COMPANIES, type CompanyId } from '../../../data/mock'
import { useStore } from '../../../data/store'
import { toast } from '../../../lib/toast'
import { cn } from '../../../lib/utils'
import { t } from '../../../i18n'
import { DEFAULT_TERMS, PDF_COLORS } from '../data'
import { COMPANY_IDENTITY, logChange, saveIdentity } from './data'
import { useScopeCompany } from './shared'

const MAX_IMAGE = 2 * 1024 * 1024
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp']

/** The editable columns, as typed in the form (strings; '' = empty). */
type FormKey =
  | 'name' | 'legal_name' | 'phone' | 'website' | 'civic_number' | 'street' | 'city' | 'postal_code' | 'province_code'
  | 'rbq_number' | 'neq' | 'gst_number' | 'qst_number' | 'gst_rate' | 'qst_rate' | 'brand_color'
  | 'terms_and_conditions' | 'payment_terms' | 'target_margin_pct'
type Form = Record<FormKey, string>
const FORM_KEYS: FormKey[] = [
  'name', 'legal_name', 'phone', 'website', 'civic_number', 'street', 'city', 'postal_code', 'province_code',
  'rbq_number', 'neq', 'gst_number', 'qst_number', 'gst_rate', 'qst_rate', 'brand_color',
  'terms_and_conditions', 'payment_terms', 'target_margin_pct',
]
/** Kept on this device only (no API column): same behaviour as the demo screen. */
interface LocalFields { fax: string; mail: string; footer?: string }
type Errors = Partial<Record<FormKey | 'mail', string>>

/** "5.000" → "5", "9.975" → "9.975" (the API returns numeric columns as strings with their scale). */
const decimal = (v: string | null | undefined) => (v === null || v === undefined || v === '' ? '' : Number.isFinite(Number(v)) ? String(Number(v)) : v)

function toForm(s: ApiCompanySettings): Form {
  return {
    name: s.name ?? '',
    legal_name: s.legal_name ?? '',
    phone: s.phone ?? '',
    website: s.website ?? '',
    civic_number: s.civic_number ?? '',
    street: s.street ?? '',
    city: s.city ?? '',
    postal_code: s.postal_code ?? '',
    province_code: s.province_code ?? '',
    rbq_number: s.rbq_number ?? '',
    neq: s.neq ?? '',
    gst_number: s.gst_number ?? '',
    qst_number: s.qst_number ?? '',
    gst_rate: decimal(s.gst_rate),
    qst_rate: decimal(s.qst_rate),
    brand_color: s.brand_color ?? '',
    terms_and_conditions: s.terms_and_conditions ?? '',
    payment_terms: s.payment_terms ?? '',
    target_margin_pct: decimal(s.target_margin_pct),
  }
}
const localOf = (c: CompanyId): LocalFields => ({ fax: COMPANY_IDENTITY[c].fax, mail: COMPANY_IDENTITY[c].mail, footer: COMPANY_IDENTITY[c].footer })

// ── Same rules as the API (Hillman-Backend settings/schema.ts) ──────────────
/** Formatted numbers: spaces and dashes ignored, upper case, stored in their printed form. */
const formatted = (v: string, re: RegExp, out: (m: RegExpMatchArray) => string) => {
  const m = v.trim().replace(/[\s-]/g, '').toUpperCase().match(re)
  return m ? out(m) : undefined
}
/** value: what to send (undefined = invalid); error: French message (source of t), n: its {n}. */
type Checked = { value?: string | null; error?: string; n?: number }
const PERCENT_RE = /^\d{1,2}(\.\d{1,3})?$/
/** Percent string ("5", "9.975"); a decimal comma is accepted and sent as a point. */
function percent(v: string, max: number, rangeMessage: string): Checked {
  const s = v.trim().replace(',', '.')
  if (!PERCENT_RE.test(s)) return { error: 'Pourcentage invalide (ex. "35" ou "9.975").' }
  if (Number(s) > max) return { error: rangeMessage }
  return { value: s }
}
/** Optional text: '' → null; else trimmed and at most `max` characters. */
function optionalText(v: string, max: number): Checked {
  const s = v.trim()
  if (!s) return { value: null }
  if (s.length > max) return { error: 'Maximum {n} caractères.', n: max }
  return { value: s }
}

/**
 * Validates one changed field and gives the value to send. Messages are the API's (French source, translated by t).
 * Only fields the user changed are checked: a stored value the API wrote earlier is never blocked.
 */
function check(k: FormKey, raw: string): Checked {
  const v = raw.trim()
  switch (k) {
    case 'name':
      if (!v) return { error: 'Entrez le nom de la compagnie.' }
      return v.length > 120 ? { error: 'Maximum {n} caractères.', n: 120 } : { value: v }
    case 'legal_name':
      if (!v) return { error: 'Entrez la raison sociale.' }
      return v.length > 200 ? { error: 'Maximum {n} caractères.', n: 200 } : { value: v }
    case 'phone':
      return optionalText(v, 30)
    case 'website': {
      if (!v) return { value: null }
      // The API wants a full link; « hillman.ca » is sent as « https://hillman.ca ».
      const url = /^[a-z][a-z\d+.-]*:/i.test(v) ? v : `https://${v}`
      if (url.length > 200) return { error: 'Maximum {n} caractères.', n: 200 }
      try {
        new URL(url)
      } catch {
        return { error: 'Lien invalide.' }
      }
      return { value: url }
    }
    case 'civic_number':
      return optionalText(v, 20)
    case 'street':
      return optionalText(v, 200)
    case 'city':
      return optionalText(v, 120)
    case 'postal_code':
      if (!v) return { value: null }
      return { value: formatted(v, /^([A-Z]\d[A-Z])(\d[A-Z]\d)$/, (m) => `${m[1]} ${m[2]}`), error: 'Code postal invalide (ex. G1K 3A1).' }
    case 'province_code':
      return /^[A-Z]{2}$/.test(v.toUpperCase()) ? { value: v.toUpperCase() } : { error: 'Province : 2 lettres (QC).' }
    case 'rbq_number':
      if (!v) return { value: null }
      return { value: formatted(v, /^(\d{4})(\d{4})(\d{2})$/, (m) => `${m[1]}-${m[2]}-${m[3]}`), error: 'Format attendu : 0000-0000-00' }
    case 'neq':
      if (!v) return { value: null }
      return { value: formatted(v, /^(\d{10})$/, (m) => m[1]), error: 'Le NEQ compte 10 chiffres' }
    case 'gst_number':
      if (!v) return { value: null }
      return { value: formatted(v, /^(\d{3})(\d{3})(\d{3})RT(\d{4})$/, (m) => `${m[1]} ${m[2]} ${m[3]} RT${m[4]}`), error: 'Format attendu : 000 000 000 RT0001' }
    case 'qst_number':
      if (!v) return { value: null }
      return { value: formatted(v, /^(\d{4})(\d{3})(\d{3})TQ(\d{4})$/, (m) => `${m[1]} ${m[2]} ${m[3]} TQ${m[4]}`), error: 'Format attendu : 0000 000 000 TQ0001' }
    case 'gst_rate':
    case 'qst_rate':
      return percent(v, 99.999, 'Taux entre 0 et 99.999 %.')
    case 'brand_color':
      if (!v) return { value: null }
      return /^#[0-9a-fA-F]{6}$/.test(v) ? { value: v.toLowerCase() } : { error: 'Couleur attendue au format #RRGGBB.' }
    case 'terms_and_conditions':
      return optionalText(v, 20000)
    case 'payment_terms':
      return optionalText(v, 2000)
    case 'target_margin_pct':
      return v ? percent(v, 99.99, 'Marge entre 0 et 99.99 %.') : { value: null }
  }
}
/** `check` with the error left out when a value was produced (formatted() returns undefined on no match). */
function validateField(k: FormKey, raw: string): { ok: true; value: string | null } | { ok: false; error: string } {
  const r = check(k, raw)
  if (r.value !== undefined) return { ok: true, value: r.value }
  return { ok: false, error: t(r.error ?? 'Valeur invalide.', r.n === undefined ? undefined : { n: r.n }) }
}

/** Field of a server validation error (path « /gst_number » or « gst_number »). */
function serverFieldErrors(e: unknown): Errors {
  if (!(e instanceof ApiError) || e.code !== 'VALIDATION' || !Array.isArray(e.details)) return {}
  const out: Errors = {}
  for (const d of e.details as { path?: unknown; message?: unknown }[]) {
    const key = typeof d?.path === 'string' ? d.path.split(/[/.]/).filter(Boolean).pop() : undefined
    if (key && (FORM_KEYS as string[]).includes(key) && typeof d.message === 'string') out[key as FormKey] ??= t(d.message)
  }
  return out
}

type Load = { status: 'loading' } | { status: 'error'; error: string } | { status: 'ready'; settings: ApiCompanySettings }

export function ApiCompaniesTab({ connections }: { connections: (company: CompanyId) => ReactNode }) {
  useStore()
  const { user } = useAuth()
  // Only the user's companies can be read (members); the others are not offered.
  const mine = COMPANIES.filter((c) => roleIn(c.id) && companyUuid(c.id))
  const [scope, setScope] = useScopeCompany()
  const id: CompanyId | undefined = mine.some((c) => c.id === scope) ? scope : mine[0]?.id
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [original, setOriginal] = useState<Form | null>(null)
  const [draft, setDraft] = useState<Form | null>(null)
  const [local, setLocal] = useState<LocalFields>(() => (id ? localOf(id) : { fax: '', mail: '' }))
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)
  const [logoBusy, setLogoBusy] = useState(false)
  const logoInput = useRef<HTMLInputElement>(null)
  const footerInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const uuid = companyUuid(id)
    if (!uuid) return
    let live = true
    // The loading state is set by what triggers a new load (company switch, retry).
    api.getCompanySettings(uuid).then(
      (s) => {
        if (!live) return
        const f = toForm(s)
        setLoad({ status: 'ready', settings: s })
        setOriginal(f)
        setDraft(f)
      },
      (e) => live && setLoad({ status: 'error', error: errorMessage(e) }),
    )
    return () => {
      live = false
    }
  }, [id, attempt])

  if (!id) return <Notice tone="info">{t('Aucune compagnie accessible.')}</Notice>
  const company = COMPANIES.find((c) => c.id === id)!
  const canEdit = roleIn(id) === 'admin'
  const showMargin = isCostViewer(id) && load.status === 'ready' && 'target_margin_pct' in load.settings
  const localDirty = JSON.stringify(local) !== JSON.stringify(localOf(id))
  const changed = draft && original ? FORM_KEYS.filter((k) => draft[k] !== original[k]) : []
  const dirty = changed.length > 0 || localDirty

  const switchTo = async (c: CompanyId) => {
    if (c === id) return
    if (dirty && !(await confirmAction({ title: t('Abandonner les modifications?'), body: t("Les changements non enregistrés de cette compagnie seront perdus.") }))) return
    setScope(c)
    setLoad({ status: 'loading' })
    setOriginal(null)
    setDraft(null)
    setLocal(localOf(c))
    setErrors({})
  }
  const set = (k: FormKey, v: string) => setDraft((d) => (d ? { ...d, [k]: v } : d))
  const reset = () => {
    setDraft(original)
    setLocal(localOf(id))
    setErrors({})
  }

  const readFooter = (file: File | undefined) => {
    if (!file) return
    if (!/^image\/(png|jpe?g|svg\+xml|webp)$/.test(file.type)) return toast(t('Format non pris en charge (PNG, JPG, SVG ou WebP)'))
    if (file.size > MAX_IMAGE) return toast(t('Image trop lourde (2 Mo maximum)'))
    const reader = new FileReader()
    reader.onload = () => setLocal((l) => ({ ...l, footer: String(reader.result) }))
    reader.readAsDataURL(file)
  }

  /** The logo is saved at once (its own endpoint), independently of the form. */
  const applyServer = (s: ApiCompanySettings) => {
    applyCompanySettings(s)
    setLoad({ status: 'ready', settings: s })
  }
  const uploadLogo = async (file: File | undefined) => {
    if (!file) return
    if (!LOGO_TYPES.includes(file.type)) return toast(t('Format non pris en charge (PNG, JPG, WebP).'))
    if (file.size > MAX_IMAGE) return toast(t('Image trop lourde (2 Mo maximum).'))
    setLogoBusy(true)
    try {
      applyServer(await api.uploadCompanyLogo(companyUuid(id)!, file, file.name))
      toast(t('Logo enregistré'))
    } catch (e) {
      toast(errorMessage(e))
    } finally {
      setLogoBusy(false)
    }
  }
  const removeLogo = async () => {
    if (!(await confirmAction({ title: t('Retirer le logo?'), body: t('Les prochains PDF de {name} seront imprimés sans logo. Les soumissions déjà imprimées gardent le leur.', { name: company.name }), confirmLabel: t('Retirer'), danger: true }))) return
    setLogoBusy(true)
    try {
      applyServer(await api.removeCompanyLogo(companyUuid(id)!))
      toast(t('Logo retiré'))
    } catch (e) {
      toast(errorMessage(e))
    } finally {
      setLogoBusy(false)
    }
  }

  const save = async () => {
    if (!draft || !canEdit) return
    const e: Errors = {}
    const body: Record<string, string | null> = {}
    for (const k of changed) {
      const r = validateField(k, draft[k])
      if (r.ok) body[k] = r.value
      else e[k] = r.error
    }
    if (local.mail && !/^\S+@\S+\.\S+$/.test(local.mail)) e.mail = t('Courriel invalide')
    setErrors(e)
    if (Object.keys(e).length) return toast(t('Corrigez les champs en rouge'))
    setSaving(true)
    try {
      if (Object.keys(body).length) {
        const s = await api.updateCompanySettings(companyUuid(id)!, body as UpdateCompanySettingsBody)
        applyServer(s)
        const f = toForm(s)
        setOriginal(f)
        setDraft(f)
      }
      if (localDirty) {
        saveIdentity(id, { ...COMPANY_IDENTITY[id], fax: local.fax, mail: local.mail, footer: local.footer })
        logChange(user?.name ?? '—', 'parametres', 'A modifié la fiche de {name}', { name: company.name })
      }
      toast(t('Fiche {name} enregistrée', { name: company.name }))
    } catch (err) {
      const fieldErrors = serverFieldErrors(err)
      if (Object.keys(fieldErrors).length) {
        setErrors(fieldErrors)
        toast(t('Corrigez les champs en rouge'))
      } else toast(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const input = (k: FormKey, label: string, opts: { tnum?: boolean; placeholder?: string; upper?: boolean; inputMode?: 'decimal' | 'numeric' | 'tel' | 'url' } = {}) => (
    <Field label={label}>
      <input
        className={cn('form-input', opts.tnum !== false && 'tnum', opts.upper && 'uppercase', errors[k] && 'border-tone-critical')}
        value={draft?.[k] ?? ''}
        onChange={(e) => set(k, e.target.value)}
        aria-invalid={!!errors[k]}
        disabled={!canEdit}
        placeholder={opts.placeholder}
        inputMode={opts.inputMode}
      />
      {errors[k] && <span className="text-2xs text-tone-critical-ink font-medium">{errors[k]}</span>}
    </Field>
  )
  const localInput = (k: 'fax' | 'mail', label: string, tnum: boolean) => (
    <Field label={label}>
      <input className={cn('form-input', tnum && 'tnum', k === 'mail' && errors.mail && 'border-tone-critical')} value={local[k]} onChange={(e) => setLocal((l) => ({ ...l, [k]: e.target.value }))} aria-invalid={k === 'mail' && !!errors.mail} disabled={!canEdit} />
      {k === 'mail' && errors.mail && <span className="text-2xs text-tone-critical-ink font-medium">{errors.mail}</span>}
    </Field>
  )

  const settings = load.status === 'ready' ? load.settings : null
  const color = draft?.brand_color ?? ''
  const validColor = /^#[0-9a-fA-F]{6}$/.test(color)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {mine.map((c) => (
          <button key={c.id} onClick={() => void switchTo(c.id)} aria-pressed={id === c.id} className={cn('h-14 px-3 rounded-lg border bg-white flex items-center gap-2 transition-colors', id === c.id ? 'border-primary ring-2 ring-ring' : 'border-hairline hover:border-hairline-strong')}>
            <CompanyLogo id={c.id} className="h-8 w-28 object-center" />
            {id === c.id && <Check className="w-4 h-4 text-primary-press" />}
          </button>
        ))}
      </div>
      {load.status === 'loading' && <Loading />}
      {load.status === 'error' && <ErrorState onRetry={() => (setLoad({ status: 'loading' }), setAttempt((n) => n + 1))}>{load.error}</ErrorState>}
      {settings && draft && (
        <>
          {!canEdit && <Notice tone="info">{t('Lecture seule : seul un administrateur de la compagnie peut modifier ses paramètres.')}</Notice>}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 items-start">
            <Card title={t('Identité — {name}', { name: settings.name })} icon={Building2}>
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="label-caps">{t("Logo / image d'en-tête (PDF)")}</p>
                    <div className="h-24 rounded-lg border border-hairline bg-white flex items-center justify-center p-3">
                      {logoBusy ? (
                        <LoaderCircle className="w-5 h-5 animate-spin text-ink-mute" />
                      ) : settings.logo?.url ? (
                        <img src={settings.logo.url} alt="" className="max-h-16 w-full object-contain" />
                      ) : (
                        <span className="text-xs text-ink-mute text-center">{settings.logo ? t('Logo introuvable : remplacez-le ou retirez-le.') : t('Aucun logo sur le PDF')}</span>
                      )}
                    </div>
                    <input ref={logoInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0]
                        // Cleared so the same file can be chosen again after an error.
                        e.target.value = ''
                        void uploadLogo(file)
                      }} />
                    {canEdit && (
                      <div className="flex gap-3">
                        <button className="text-xs font-semibold text-primary-press hover:underline disabled:opacity-50" disabled={logoBusy} onClick={() => logoInput.current?.click()}>
                          <Upload className="w-3 h-3 inline mr-1" />
                          {settings.logo ? t('Remplacer') : t('Téléverser')}
                        </button>
                        {settings.logo && (
                          <button className="text-xs font-semibold text-tone-critical-ink hover:underline disabled:opacity-50" disabled={logoBusy} onClick={() => void removeLogo()}>
                            <Trash2 className="w-3 h-3 inline mr-1" />
                            {t('Retirer')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="label-caps">{t('Image de pied de page (PDF)')}</p>
                    <input ref={footerInput} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={(e) => readFooter(e.target.files?.[0])} />
                    {local.footer ? (
                      <>
                        <div className="h-24 rounded-lg border border-hairline bg-white flex items-center justify-center p-3">
                          <img src={local.footer} alt="" className="max-h-16 w-full object-contain" />
                        </div>
                        {canEdit && (
                          <button className="text-xs font-semibold text-tone-critical-ink hover:underline" onClick={() => setLocal((l) => ({ ...l, footer: undefined }))}>
                            <Trash2 className="w-3 h-3 inline mr-1" />
                            {t('Retirer')}
                          </button>
                        )}
                      </>
                    ) : (
                      <button disabled={!canEdit} onClick={() => footerInput.current?.click()} className="w-full h-24 rounded-lg border border-dashed border-hairline-strong flex flex-col items-center justify-center gap-1 text-xs text-ink-mute hover:border-primary hover:text-primary-press disabled:opacity-50 disabled:pointer-events-none">
                        <Upload className="w-4 h-4" />
                        {t('Téléverser')}
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-2xs text-ink-mute">{t('Logo : PNG, JPG ou WebP, 2 Mo maximum (enregistré dès le téléversement). Pied de page : PNG, JPG, SVG ou WebP, 2 Mo maximum.')}</p>
                <div>
                  <p className="label-caps mb-1.5">{t('Couleur des sections du PDF')}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {PDF_COLORS.map((c) => (
                      <button key={c} disabled={!canEdit} aria-label={t('Couleur {color}', { color: c })} aria-pressed={color.toLowerCase() === c} onClick={() => set('brand_color', c)} className={cn('w-8 h-8 rounded-md border-2 disabled:cursor-default', color.toLowerCase() === c ? 'border-ink' : 'border-transparent')} style={{ background: c }} />
                    ))}
                    <input
                      className={cn('form-input h-8 w-28 font-mono text-xs', errors.brand_color && 'border-tone-critical')}
                      value={color}
                      onChange={(e) => set('brand_color', e.target.value)}
                      placeholder="#RRGGBB"
                      maxLength={7}
                      aria-label={t('Couleur des sections du PDF')}
                      aria-invalid={!!errors.brand_color}
                      disabled={!canEdit}
                    />
                    <span className={cn('ml-2 h-7 px-3 rounded text-2xs font-bold uppercase tracking-eyebrow flex items-center', validColor ? 'text-white' : 'text-ink-mute border border-dashed border-hairline-strong')} style={validColor ? { background: color } : undefined}>
                      {t('Travaux')}
                    </span>
                  </div>
                  {errors.brand_color && <span className="text-2xs text-tone-critical-ink font-medium">{errors.brand_color}</span>}
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {input('name', t('Nom de la compagnie'), { tnum: false })}
                  {input('legal_name', t('Raison sociale'), { tnum: false })}
                  {input('rbq_number', t('Licence RBQ'), { placeholder: '0000-0000-00' })}
                  {input('neq', t('NEQ'), { inputMode: 'numeric' })}
                  {input('phone', t('Téléphone'), { inputMode: 'tel' })}
                  {localInput('fax', t('Télécopieur'), true)}
                </div>
                <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3">
                  {input('civic_number', t('No civique'))}
                  {input('street', t('Rue'), { tnum: false })}
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_110px_72px] gap-3">
                  {input('city', t('Ville'), { tnum: false })}
                  {input('postal_code', t('Code postal'), { placeholder: 'G1K 3A1', upper: true })}
                  {input('province_code', t('Province'), { placeholder: 'QC', upper: true })}
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {localInput('mail', t('Courriel affiché'), false)}
                  {input('website', t('Site web'), { tnum: false, inputMode: 'url' })}
                </div>
                <p className="text-2xs text-ink-mute">{t('Télécopieur, courriel affiché et image de pied de page : conservés sur cet appareil seulement.')}</p>
              </div>
            </Card>
            <div className="space-y-4 min-w-0">
              <Card title={t('Taxes')} icon={Percent}>
                <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-3">
                  {input('gst_number', t('No TPS'), { placeholder: '000 000 000 RT0001', upper: true })}
                  {input('gst_rate', t('Taux TPS'), { inputMode: 'decimal' })}
                  {input('qst_number', t('No TVQ'), { placeholder: '0000 000 000 TQ0001', upper: true })}
                  {input('qst_rate', t('Taux TVQ'), { inputMode: 'decimal' })}
                </div>
                <p className="text-2xs text-ink-mute mt-2">{t('Taux en pourcentage (ex. 5 ou 9.975).')}</p>
              </Card>
              <Card
                title={t('Termes et conditions (imprimés sur le PDF)')}
                icon={ShieldCheck}
                actions={
                  canEdit &&
                  draft.terms_and_conditions !== DEFAULT_TERMS && (
                    <button className="btn btn-xs btn-ghost" onClick={() => set('terms_and_conditions', DEFAULT_TERMS)}>
                      <RotateCcw className="w-3.5 h-3.5" />
                      {t('Texte par défaut')}
                    </button>
                  )
                }
              >
                <textarea aria-label={t('Termes et conditions')} rows={11} className={cn('form-input h-auto py-2.5 leading-relaxed text-sm', errors.terms_and_conditions && 'border-tone-critical')} value={draft.terms_and_conditions} onChange={(e) => set('terms_and_conditions', e.target.value)} disabled={!canEdit} />
                {errors.terms_and_conditions && <span className="text-2xs text-tone-critical-ink font-medium">{errors.terms_and_conditions}</span>}
                {!draft.terms_and_conditions.trim() && <p className="text-2xs text-ink-mute mt-1">{t('Vide : aucun terme imprimé sur le PDF.')}</p>}
              </Card>
              <Card title={t('Modalités de paiement par défaut')} icon={Wallet}>
                <textarea aria-label={t('Modalités de paiement par défaut')} rows={3} className={cn('form-input h-auto py-2.5 leading-relaxed text-sm', errors.payment_terms && 'border-tone-critical')} value={draft.payment_terms} onChange={(e) => set('payment_terms', e.target.value)} disabled={!canEdit} />
                {errors.payment_terms && <span className="text-2xs text-tone-critical-ink font-medium">{errors.payment_terms}</span>}
                <p className="text-2xs text-ink-mute mt-1">{t('Copiées dans les nouvelles soumissions.')}</p>
              </Card>
              {showMargin && (
                <Card title={t('Marge cible')} icon={Target}>
                  <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 items-end">
                    {input('target_margin_pct', t('Marge cible (%)'), { inputMode: 'decimal' })}
                    <p className="text-2xs text-ink-mute pb-2">{t('Vide : aucune marge cible. Visible par l’administration et la coordination seulement.')}</p>
                  </div>
                </Card>
              )}
              {canEdit && (
                <div className="flex items-center justify-end gap-2">
                  {dirty && <span className="text-xs text-tone-warn-ink font-medium mr-auto">{t('Modifications non enregistrées')}</span>}
                  <button className="btn btn-sm btn-ghost" disabled={!dirty || saving} onClick={reset}>
                    {t('Annuler')}
                  </button>
                  <button className="btn btn-sm btn-primary" disabled={saving || !dirty} onClick={() => void save()}>
                    {saving && <LoaderCircle className="w-4 h-4 animate-spin" />}
                    {t('Enregistrer')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      {connections(id)}
    </div>
  )
}
