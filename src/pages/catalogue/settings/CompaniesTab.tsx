/** Paramètres → Compagnies: identity printed on the PDF + texting / email connections. */
import { useRef, useState } from 'react'
import { Building2, Check, Globe, LoaderCircle, Mail, MessageSquare, Percent, PlugZap, RotateCcw, Send, ShieldCheck, Trash2, Upload } from 'lucide-react'
import { Card, CompanyLogo, Field } from '../../../components/ui'
import { Notice, confirmAction } from '../../../components/states'
import { useAuth } from '../../../auth/AuthContext'
import { COMPANIES, type CompanyId } from '../../../data/mock'
import { CONNECTIONS, saveConnections, type ConnectionState } from '../../../data/settings'
import { request, useStore } from '../../../data/store'
import { toast } from '../../../lib/toast'
import { cn, pct } from '../../../lib/utils'
import { t } from '../../../i18n'
import { DEFAULT_TERMS, PDF_COLORS } from '../data'
import { COMPANY_IDENTITY, logChange, saveIdentity, type CompanyIdentity } from './data'
import { ConnectionBadge, CopyField, useScopeCompany } from './shared'

const MAX_IMAGE = 2 * 1024 * 1024

export function CompaniesTab() {
  useStore()
  const { user } = useAuth()
  const [id, setId] = useScopeCompany()
  const company = COMPANIES.find((c) => c.id === id)!
  // Draft of the selected company's identity; reset when switching company.
  const [draft, setDraft] = useState<CompanyIdentity>(() => ({ ...COMPANY_IDENTITY[id] }))
  const [errors, setErrors] = useState<Partial<Record<keyof CompanyIdentity, string>>>({})
  const [saving, setSaving] = useState(false)
  const logoInput = useRef<HTMLInputElement>(null)
  const footerInput = useRef<HTMLInputElement>(null)
  const dirty = JSON.stringify(draft) !== JSON.stringify(COMPANY_IDENTITY[id])

  const switchTo = async (c: CompanyId) => {
    if (c === id) return
    if (dirty && !(await confirmAction({ title: t('Abandonner les modifications?'), body: t("Les changements non enregistrés de cette compagnie seront perdus.") }))) return
    setId(c)
    setDraft({ ...COMPANY_IDENTITY[c] })
    setErrors({})
  }
  const set = <K extends keyof CompanyIdentity>(k: K, v: CompanyIdentity[K]) => setDraft((d) => ({ ...d, [k]: v }))

  const readImage = (file: File | undefined, key: 'logo' | 'footer') => {
    if (!file) return
    if (!/^image\/(png|jpe?g|svg\+xml|webp)$/.test(file.type)) return toast(t('Format non pris en charge (PNG, JPG, SVG ou WebP)'))
    if (file.size > MAX_IMAGE) return toast(t('Image trop lourde (2 Mo maximum)'))
    const reader = new FileReader()
    reader.onload = () => set(key, String(reader.result))
    reader.readAsDataURL(file)
  }

  const validate = () => {
    const e: typeof errors = {}
    if (!/^\d{4}-\d{4}-\d{2}$/.test(draft.rbq.trim())) e.rbq = t('Format attendu : 0000-0000-00')
    if (draft.neq.replace(/\D/g, '').length !== 10) e.neq = t('Le NEQ compte 10 chiffres')
    if (!/RT\d{4}$/.test(draft.tps.replace(/\s/g, ''))) e.tps = t('Format attendu : 000 000 000 RT0001')
    if (!/TQ\d{4}$/.test(draft.tvq.replace(/\s/g, ''))) e.tvq = t('Format attendu : 0000 000 000 TQ0001')
    if (!draft.address.trim()) e.address = t('Adresse requise')
    if (draft.mail && !/^\S+@\S+\.\S+$/.test(draft.mail)) e.mail = t('Courriel invalide')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const save = async () => {
    if (!validate()) return toast(t('Corrigez les champs en rouge'))
    setSaving(true)
    try {
      await request(null)
      saveIdentity(id, draft)
      logChange(user?.name ?? '—', 'parametres', 'A modifié la fiche de {name}', { name: company.name })
      toast(t('Fiche {name} enregistrée', { name: company.name }))
    } catch {
      toast(t("L'enregistrement a échoué. Réessayez."))
    } finally {
      setSaving(false)
    }
  }

  const input = (k: 'rbq' | 'neq' | 'phone' | 'fax' | 'mail' | 'site' | 'tps' | 'tvq' | 'address', label: string, tnum = true) => (
    <Field label={label}>
      <input className={cn('form-input', tnum && 'tnum', errors[k] && 'border-tone-critical')} value={draft[k]} onChange={(e) => set(k, e.target.value)} aria-invalid={!!errors[k]} />
      {errors[k] && <span className="text-2xs text-tone-critical-ink font-medium">{errors[k]}</span>}
    </Field>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {COMPANIES.map((c) => (
          <button key={c.id} onClick={() => switchTo(c.id)} aria-pressed={id === c.id} className={cn('h-14 px-3 rounded-lg border bg-white flex items-center gap-2 transition-colors', id === c.id ? 'border-primary ring-2 ring-ring' : 'border-hairline hover:border-hairline-strong')}>
            {COMPANY_IDENTITY[c.id].logo ? <img src={COMPANY_IDENTITY[c.id].logo} alt={c.name} className="h-8 w-28 object-contain" /> : <CompanyLogo id={c.id} className="h-8 w-28 object-center" />}
            {id === c.id && <Check className="w-4 h-4 text-primary-press" />}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 items-start">
        <Card title={t('Identité — {name}', { name: company.name })} icon={Building2}>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="label-caps">{t("Logo / image d'en-tête (PDF)")}</p>
                <div className="h-24 rounded-lg border border-hairline bg-white flex items-center justify-center p-3">
                  {draft.logo ? <img src={draft.logo} alt="" className="max-h-16 w-full object-contain" /> : <CompanyLogo id={id} className="max-h-16 w-full object-center" />}
                </div>
                <input ref={logoInput} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={(e) => readImage(e.target.files?.[0], 'logo')} />
                <div className="flex gap-3">
                  <button className="text-xs font-semibold text-primary-press hover:underline" onClick={() => logoInput.current?.click()}>
                    <Upload className="w-3 h-3 inline mr-1" />
                    {t('Remplacer')}
                  </button>
                  {draft.logo && (
                    <button className="text-xs font-semibold text-ink-mute hover:underline" onClick={() => set('logo', undefined)}>
                      <RotateCcw className="w-3 h-3 inline mr-1" />
                      {t("Logo d'origine")}
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <p className="label-caps">{t('Image de pied de page (PDF)')}</p>
                <input ref={footerInput} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={(e) => readImage(e.target.files?.[0], 'footer')} />
                {draft.footer ? (
                  <>
                    <div className="h-24 rounded-lg border border-hairline bg-white flex items-center justify-center p-3">
                      <img src={draft.footer} alt="" className="max-h-16 w-full object-contain" />
                    </div>
                    <button className="text-xs font-semibold text-tone-critical-ink hover:underline" onClick={() => set('footer', undefined)}>
                      <Trash2 className="w-3 h-3 inline mr-1" />
                      {t('Retirer')}
                    </button>
                  </>
                ) : (
                  <button onClick={() => footerInput.current?.click()} className="w-full h-24 rounded-lg border border-dashed border-hairline-strong flex flex-col items-center justify-center gap-1 text-xs text-ink-mute hover:border-primary hover:text-primary-press">
                    <Upload className="w-4 h-4" />
                    {t('Téléverser')}
                  </button>
                )}
              </div>
            </div>
            <p className="text-2xs text-ink-mute">{t('PNG, JPG, SVG ou WebP, 2 Mo maximum.')}</p>
            <div>
              <p className="label-caps mb-1.5">{t('Couleur des sections du PDF')}</p>
              <div className="flex flex-wrap items-center gap-2">
                {PDF_COLORS.map((color) => (
                  <button key={color} aria-label={t('Couleur {color}', { color })} aria-pressed={draft.color === color} onClick={() => set('color', color)} className={cn('w-8 h-8 rounded-md border-2', draft.color === color ? 'border-ink' : 'border-transparent')} style={{ background: color }} />
                ))}
                <span className="ml-2 h-7 px-3 rounded text-2xs font-bold uppercase tracking-eyebrow text-white flex items-center" style={{ background: draft.color }}>
                  {t('Travaux')}
                </span>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {input('rbq', t('Licence RBQ'))}
              {input('neq', t('NEQ'))}
              {input('phone', t('Téléphone'))}
              {input('fax', t('Télécopieur'))}
            </div>
            {input('address', t('Adresse'), false)}
            <div className="grid sm:grid-cols-2 gap-3">
              {input('mail', t('Courriel affiché'), false)}
              {input('site', t('Site web'), false)}
            </div>
          </div>
        </Card>
        <div className="space-y-4 min-w-0">
          <Card title={t('Taxes')} icon={Percent}>
            <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-3">
              {input('tps', t('No TPS'))}
              <Field label={t('Taux TPS')}>
                <input className="form-input tnum" value={pct(5)} readOnly />
              </Field>
              {input('tvq', t('No TVQ'))}
              <Field label={t('Taux TVQ')}>
                <input className="form-input tnum" value={pct(9.975, 3)} readOnly />
              </Field>
            </div>
          </Card>
          <Card
            title={t('Termes et conditions (imprimés sur le PDF)')}
            icon={ShieldCheck}
            actions={
              draft.terms !== undefined && (
                <button className="btn btn-xs btn-ghost" onClick={() => set('terms', undefined)}>
                  <RotateCcw className="w-3.5 h-3.5" />
                  {t('Texte par défaut')}
                </button>
              )
            }
          >
            <textarea aria-label={t('Termes et conditions')} rows={11} className="form-input h-auto py-2.5 leading-relaxed text-sm" value={draft.terms ?? t(DEFAULT_TERMS)} onChange={(e) => set('terms', e.target.value)} />
          </Card>
          <div className="flex items-center justify-end gap-2">
            {dirty && <span className="text-xs text-tone-warn-ink font-medium mr-auto">{t('Modifications non enregistrées')}</span>}
            <button className="btn btn-sm btn-ghost" disabled={!dirty || saving} onClick={() => (setDraft({ ...COMPANY_IDENTITY[id] }), setErrors({}))}>
              {t('Annuler')}
            </button>
            <button className="btn btn-sm btn-primary" disabled={saving} onClick={save}>
              {saving && <LoaderCircle className="w-4 h-4 animate-spin" />}
              {t('Enregistrer')}
            </button>
          </div>
        </div>
      </div>
      <ConnectionsCard key={id} company={id} />
    </div>
  )
}

// ── Connexions: texting number + sending email domain ───────────────────────
function dnsRecords(domain: string) {
  return [
    { type: 'TXT', host: domain, value: 'v=spf1 include:mail.hillmancentrale.ca ~all' },
    { type: 'CNAME', host: `hc1._domainkey.${domain}`, value: 'hc1.dkim.hillmancentrale.ca' },
    { type: 'CNAME', host: `hc2._domainkey.${domain}`, value: 'hc2.dkim.hillmancentrale.ca' },
    { type: 'TXT', host: `_dmarc.${domain}`, value: 'v=DMARC1; p=none; rua=mailto:dmarc@hillmancentrale.ca' },
  ]
}

function ConnectionsCard({ company }: { company: CompanyId }) {
  useStore()
  const { user } = useAuth()
  const conn = CONNECTIONS[company]
  const [testing, setTesting] = useState<'sms' | 'email' | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [result, setResult] = useState<Record<string, { ok: boolean; at: string } | undefined>>({})
  const [testTo, setTestTo] = useState({ sms: '', email: user?.email ?? '' })
  const [smsNumber, setSmsNumber] = useState(conn.sms.number)
  const [domain, setDomain] = useState(conn.email.domain)
  const [from, setFrom] = useState(conn.email.from)

  const test = async (kind: 'sms' | 'email') => {
    const state: ConnectionState = conn[kind].state
    const to = testTo[kind].trim()
    if (!to) return toast(kind === 'sms' ? t('Entrez un numéro pour le test') : t('Entrez un courriel pour le test'))
    setTesting(kind)
    try {
      await request(null, { ms: 900, fail: state !== 'connecte' })
      setResult((r) => ({ ...r, [kind]: { ok: true, at: new Date().toLocaleTimeString() } }))
      toast(kind === 'sms' ? t('Texto test envoyé à {to}', { to }) : t('Courriel test envoyé à {to}', { to }))
    } catch {
      setResult((r) => ({ ...r, [kind]: { ok: false, at: new Date().toLocaleTimeString() } }))
      toast(t("Échec de l'envoi test"))
    } finally {
      setTesting(null)
    }
  }

  const verifyDns = async () => {
    setVerifying(true)
    try {
      await request(null, { ms: 1100 })
      saveConnections(company, { ...conn, email: { ...conn.email, state: 'connecte', detail: undefined } })
      logChange(user?.name ?? '—', 'parametres', "A vérifié le domaine d'envoi {domain}", { domain: conn.email.domain })
      toast(t('Domaine vérifié : les courriels partent maintenant de {domain}', { domain: conn.email.domain }))
    } catch {
      toast(t('Enregistrements DNS introuvables. Réessayez dans quelques minutes.'))
    } finally {
      setVerifying(false)
    }
  }

  const saveSms = () => {
    if (smsNumber.replace(/\D/g, '').length !== 10) return toast(t('Numéro invalide (10 chiffres)'))
    saveConnections(company, { ...conn, sms: { number: smsNumber, state: 'en_attente', detail: 'Activation du numéro en cours' } })
    logChange(user?.name ?? '—', 'parametres', 'A changé le numéro texto ({n})', { n: smsNumber })
    toast(t('Numéro enregistré — activation en cours'))
  }
  const saveDomain = () => {
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(domain.trim())) return toast(t('Domaine invalide'))
    if (from && !from.trim().toLowerCase().endsWith('@' + domain.trim().toLowerCase())) return toast(t("L'adresse d'envoi doit utiliser le domaine {domain}", { domain }))
    saveConnections(company, { ...conn, email: { domain: domain.trim(), from: from.trim(), state: 'en_attente', detail: 'Enregistrements DNS à ajouter' } })
    logChange(user?.name ?? '—', 'parametres', "A configuré le domaine d'envoi {domain}", { domain })
    toast(t('Domaine enregistré — ajoutez les enregistrements DNS'))
  }

  const renderResult = (k: string) => {
    const r = result[k]
    if (!r) return null
    return <span className={cn('text-xs font-medium', r.ok ? 'text-tone-good-ink' : 'text-tone-critical-ink')}>{r.ok ? t('Test réussi à {at}', { at: r.at }) : t('Test échoué à {at}', { at: r.at })}</span>
  }

  return (
    <Card title={t('Connexions')} icon={PlugZap}>
      <div className="grid lg:grid-cols-2 gap-6">
        <section className="space-y-3 min-w-0">
          <header className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-ink flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-ink-mute" />
              {t('Numéro texto')}
            </h4>
            <ConnectionBadge state={conn.sms.state} />
          </header>
          {conn.sms.detail && <Notice tone={conn.sms.state === 'erreur' ? 'critical' : 'warn'}>{t(conn.sms.detail)}</Notice>}
          <div className="flex gap-2">
            <input className="form-input tnum" value={smsNumber} onChange={(e) => setSmsNumber(e.target.value)} aria-label={t('Numéro texto')} placeholder="418 000-0000" />
            <button className="btn btn-sm btn-secondary shrink-0" disabled={smsNumber === conn.sms.number} onClick={saveSms}>
              {t('Enregistrer')}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input className="form-input h-8 tnum flex-1 min-w-[10rem]" placeholder={t('Numéro pour le test')} value={testTo.sms} onChange={(e) => setTestTo((v) => ({ ...v, sms: e.target.value }))} aria-label={t('Numéro pour le test')} />
            <button className="btn btn-sm btn-secondary" disabled={testing !== null} onClick={() => test('sms')}>
              {testing === 'sms' ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {t('Tester')}
            </button>
          </div>
          {renderResult('sms')}
        </section>
        <section className="space-y-3 min-w-0">
          <header className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-ink flex items-center gap-2">
              <Mail className="w-4 h-4 text-ink-mute" />
              {t("Domaine d'envoi des courriels")}
            </h4>
            <ConnectionBadge state={conn.email.state} />
          </header>
          {conn.email.state === 'non_configure' && <Notice tone="info">{t("Sans domaine vérifié, les courriels partent d'une adresse Hillman Centrale générique et risquent d'aboutir dans les indésirables.")}</Notice>}
          <div className="grid sm:grid-cols-2 gap-2">
            <Field label={t('Domaine')}>
              <input className="form-input" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="exemple.com" />
            </Field>
            <Field label={t("Adresse d'envoi")}>
              <input className="form-input" value={from} onChange={(e) => setFrom(e.target.value)} placeholder={'soumissions@' + (domain || 'exemple.com')} />
            </Field>
          </div>
          {(domain !== conn.email.domain || from !== conn.email.from) && (
            <div className="flex justify-end">
              <button className="btn btn-sm btn-secondary" onClick={saveDomain}>
                {t('Enregistrer le domaine')}
              </button>
            </div>
          )}
          {(conn.email.state === 'en_attente' || conn.email.state === 'erreur') && (
            <div className="space-y-2 rounded-lg border border-hairline p-3">
              <p className="text-xs font-semibold text-ink flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                {t('Enregistrements DNS à ajouter chez votre registraire')}
              </p>
              {conn.email.detail && <p className="text-xs text-ink-mute">{t(conn.email.detail)}</p>}
              <div className="space-y-2">
                {dnsRecords(conn.email.domain).map((r) => (
                  <div key={r.host} className="space-y-1">
                    <p className="text-2xs text-ink-mute">
                      <b className="text-ink-secondary">{r.type}</b> · <span className="font-mono">{r.host}</span>
                    </p>
                    <CopyField value={r.value} label={r.host} />
                  </div>
                ))}
              </div>
              <button className="btn btn-sm btn-primary" disabled={verifying} onClick={verifyDns}>
                {verifying && <LoaderCircle className="w-4 h-4 animate-spin" />}
                {t('Vérifier les enregistrements')}
              </button>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <input className="form-input h-8 flex-1 min-w-[10rem]" placeholder={t('Courriel pour le test')} value={testTo.email} onChange={(e) => setTestTo((v) => ({ ...v, email: e.target.value }))} aria-label={t('Courriel pour le test')} />
            <button className="btn btn-sm btn-secondary" disabled={testing !== null} onClick={() => test('email')}>
              {testing === 'email' ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {t('Tester')}
            </button>
          </div>
          {renderResult('email')}
        </section>
      </div>
    </Card>
  )
}
