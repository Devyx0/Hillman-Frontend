/** Paramètres tabs (mockup: P4→CompaniesTab, t5→UsersTab, Do→Toggle, n5→FollowUpsTab, l5→SecurityTab). */
import { useState } from 'react'
import { BellRing, Building2, Check, ChevronRight, FileClock, KeyRound, Lock, Mail, MessageSquare, Percent, Plus, Send, ShieldCheck, Upload, UserCog, Workflow } from 'lucide-react'
import { Card, CompanyLogo, Field, RepName, type Icon } from '../../components/ui'
import { useApp } from '../../context/AppContext'
import { COMPANIES, REPS, type CompanyId } from '../../data/mock'
import { toast } from '../../lib/toast'
import { cn } from '../../lib/utils'
import { Select } from '../../components/filters'
import { AUDIT_LOG, COMPANY_PROFILES, DEFAULT_TERMS, FOLLOW_UP_EMAIL, FOLLOW_UP_SMS, PDF_COLORS, PERMISSIONS, ROLES, SWATCHES, SWATCH_CLASS, roleOf } from './data'

function Toggle({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={cn('w-10 h-6 rounded-full relative transition-colors shrink-0', on ? 'bg-primary' : 'bg-stone')}>
      <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-card transition-all', on ? 'left-[18px]' : 'left-0.5')} />
    </button>
  )
}

export function CompaniesTab() {
  const { scope } = useApp()
  const [id, setId] = useState<CompanyId>(scope === 'all' ? 'toit' : scope)
  const [colors, setColors] = useState<Record<CompanyId, string>>({ toit: COMPANY_PROFILES.toit.color, sg: COMPANY_PROFILES.sg.color, reno: COMPANY_PROFILES.reno.color })
  const [terms, setTerms] = useState<Record<CompanyId, string>>({ toit: DEFAULT_TERMS, sg: DEFAULT_TERMS, reno: DEFAULT_TERMS })
  const company = COMPANIES.find((c) => c.id === id)!
  const profile = COMPANY_PROFILES[id]
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {COMPANIES.map((c) => (
          <button key={c.id} onClick={() => setId(c.id)} aria-pressed={id === c.id} className={cn('h-14 px-3 rounded-lg border bg-white flex items-center gap-2 transition-colors', id === c.id ? 'border-primary ring-2 ring-ring' : 'border-hairline hover:border-hairline-strong')}>
            <CompanyLogo id={c.id} className="h-8 w-28 object-center" />
            {id === c.id && <Check className="w-4 h-4 text-primary-press" />}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 items-start">
        <Card title={`Identité — ${company.name}`} icon={Building2}>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="label-caps">Image d'en-tête (PDF)</p>
                <div className="h-24 rounded-lg border border-hairline bg-white flex items-center justify-center p-3">
                  <CompanyLogo id={id} className="max-h-16 w-full object-center" />
                </div>
                <button className="text-xs font-semibold text-primary-press hover:underline" onClick={() => toast("Image d'en-tête remplacée")}>
                  <Upload className="w-3 h-3 inline mr-1" />
                  Remplacer
                </button>
              </div>
              <div className="space-y-1">
                <p className="label-caps">Image de pied de page (PDF)</p>
                <button onClick={() => toast('Pied de page téléversé')} className="w-full h-24 rounded-lg border border-dashed border-hairline-strong flex flex-col items-center justify-center gap-1 text-xs text-ink-mute hover:border-primary hover:text-primary-press">
                  <Upload className="w-4 h-4" />
                  Téléverser
                </button>
              </div>
            </div>
            <div>
              <p className="label-caps mb-1.5">Couleur des sections du PDF</p>
              <div className="flex items-center gap-2">
                {PDF_COLORS.map((color) => (
                  <button key={color} aria-label={`Couleur ${color}`} aria-pressed={colors[id] === color} onClick={() => setColors((prev) => ({ ...prev, [id]: color }))} className={cn('w-8 h-8 rounded-md border-2', colors[id] === color ? 'border-ink' : 'border-transparent')} style={{ background: color }} />
                ))}
                <span className="ml-2 h-7 px-3 rounded text-2xs font-bold uppercase tracking-eyebrow text-white flex items-center" style={{ background: colors[id] }}>
                  Travaux
                </span>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Licence RBQ">
                <input key={id + 'rbq'} className="form-input tnum" defaultValue={company.rbq} />
              </Field>
              <Field label="NEQ">
                <input key={id + 'neq'} className="form-input tnum" defaultValue={profile.neq} />
              </Field>
              <Field label="Téléphone">
                <input key={id + 'tel'} className="form-input tnum" defaultValue={company.phone} />
              </Field>
              <Field label="Télécopieur">
                <input key={id + 'fax'} className="form-input tnum" defaultValue={profile.fax} />
              </Field>
              <Field label="Numéro texto">
                <input key={id + 'sms'} className="form-input tnum" defaultValue={profile.sms} />
              </Field>
              <Field label="Préfixe soumission">
                <input key={id + 'pre'} className="form-input" defaultValue={company.code} />
              </Field>
            </div>
            <Field label="Adresse">
              <input key={id + 'adr'} className="form-input" defaultValue={profile.address} />
            </Field>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Courriel d'envoi">
                <input key={id + 'mail'} className="form-input" defaultValue={profile.mail} />
              </Field>
              <Field label="Site web">
                <input key={id + 'site'} className="form-input" defaultValue={profile.site} />
              </Field>
            </div>
          </div>
        </Card>
        <div className="space-y-4 min-w-0">
          <Card title="Taxes" icon={Percent}>
            <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-3">
              <Field label="No TPS">
                <input key={id + 'tps'} className="form-input tnum" defaultValue={profile.tps} />
              </Field>
              <Field label="Taux TPS">
                <input className="form-input tnum" defaultValue="5 %" />
              </Field>
              <Field label="No TVQ">
                <input key={id + 'tvq'} className="form-input tnum" defaultValue={profile.tvq} />
              </Field>
              <Field label="Taux TVQ">
                <input className="form-input tnum" defaultValue="9,975 %" />
              </Field>
            </div>
          </Card>
          <Card title="Termes et conditions" icon={ShieldCheck}>
            <div className="space-y-2">
              <textarea id={`terms-${id}`} rows={11} className="form-input h-auto py-2.5 leading-relaxed text-sm" value={terms[id]} onChange={(e) => setTerms((prev) => ({ ...prev, [id]: e.target.value }))} />
            </div>
          </Card>
          <div className="flex justify-end">
            <button className="btn btn-sm btn-primary" onClick={() => toast(`Fiche ${company.name} enregistrée`)}>
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface UserRow {
  id: string
  color: string
  cos: CompanyId[]
  active: boolean
}

export function UsersTab() {
  const [perms, setPerms] = useState(() => PERMISSIONS.map((p) => [...p.on]))
  const [users, setUsers] = useState<UserRow[]>(() => REPS.map((r) => ({ id: r.id, color: r.color, cos: r.company === 'all' ? COMPANIES.map((c) => c.id) : [r.company], active: true })))
  const [colorMenu, setColorMenu] = useState<string | null>(null)
  const patch = (id: string, fn: (u: UserRow) => UserRow) => setUsers((prev) => prev.map((u) => (u.id === id ? fn(u) : u)))
  return (
    <div className="space-y-4">
      <Card
        title="Utilisateurs"
        icon={UserCog}
        pad={false}
        actions={
          <button className="btn btn-xs btn-primary" onClick={() => toast('Invitation envoyée')}>
            <Plus className="w-3.5 h-3.5" />
            Ajouter
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead className="bg-sand/60 border-b border-hairline">
              <tr>
                {['Nom', 'Couleur', 'Rôle', 'Compagnies', 'Téléphone', 'Actif'].map((h) => (
                  <th key={h} className="th">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {users.map((u) => (
                <tr key={u.id} className={cn('hover:bg-sand/60', !u.active && 'opacity-50')}>
                  <td className="td font-semibold text-ink-secondary">
                    <RepName id={u.id} />
                  </td>
                  <td className="td">
                    <div className="relative">
                      <button onClick={() => setColorMenu((c) => (c === u.id ? null : u.id))} aria-label="Changer la couleur" className="flex items-center gap-1.5 h-7 px-2 rounded-md hover:bg-sand">
                        <span className={cn('w-4 h-4 rounded', SWATCH_CLASS[u.color])} />
                        <ChevronRight className="w-3 h-3 text-ink-faint rotate-90" />
                      </button>
                      {colorMenu === u.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setColorMenu(null)} />
                          <div className="absolute z-50 top-full mt-1 left-0 bg-white rounded-lg border border-hairline shadow-xl p-2 grid grid-cols-5 gap-1.5 w-40 menu-in">
                            {SWATCHES.map((s) => (
                              <button
                                key={s}
                                aria-label={s}
                                onClick={() => {
                                  patch(u.id, (x) => ({ ...x, color: s }))
                                  setColorMenu(null)
                                }}
                                className={cn('w-6 h-6 rounded', SWATCH_CLASS[s], u.color === s && 'ring-2 ring-offset-1 ring-ink')}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="td text-ink-secondary">{roleOf(u.id)}</td>
                  <td className="td">
                    <span className="flex gap-1">
                      {COMPANIES.map((c) => {
                        const on = u.cos.includes(c.id)
                        return (
                          <button
                            key={c.id}
                            aria-pressed={on}
                            onClick={() => patch(u.id, (x) => ({ ...x, cos: on ? x.cos.filter((k) => k !== c.id) : [...x.cos, c.id] }))}
                            className={cn('px-2 py-0.5 rounded-full text-2xs font-semibold border transition-colors', on ? c.tone : 'border-dashed border-hairline-strong text-ink-faint hover:text-ink-mute')}
                          >
                            {c.short}
                          </button>
                        )
                      })}
                    </span>
                  </td>
                  <td className="td text-ink-mute tnum whitespace-nowrap">{REPS.find((r) => r.id === u.id)!.phone}</td>
                  <td className="td">
                    <Toggle on={u.active} onChange={(active) => patch(u.id, (x) => ({ ...x, active }))} label="Représentant actif" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="Permissions" icon={KeyRound} pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead className="bg-sand/60 border-b border-hairline">
              <tr>
                <th className="th">Permission</th>
                {ROLES.map((r) => (
                  <th key={r} className="th text-center">
                    {r}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {PERMISSIONS.map((p, row) => (
                <tr key={p.p}>
                  <td className="td text-ink-secondary">{p.p}</td>
                  {ROLES.map((role, col) => (
                    <td key={role} className="td text-center">
                      <button
                        role="checkbox"
                        aria-checked={perms[row][col]}
                        aria-label={`${p.p} — ${role}`}
                        disabled={col === 0}
                        onClick={() => setPerms((prev) => prev.map((r, i) => (i === row ? r.map((v, k) => (k === col ? !v : v)) : r)))}
                        className={cn('w-5 h-5 rounded border inline-flex items-center justify-center', perms[row][col] ? 'bg-primary border-primary text-white' : 'border-hairline-strong bg-white hover:border-ink-mute', col === 0 && 'opacity-60')}
                      >
                        {perms[row][col] && <Check className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

export function FollowUpsTab() {
  const { scope } = useApp()
  const [company, setCompany] = useState<CompanyId>(scope === 'all' ? 'sg' : scope)
  const [emailOn, setEmailOn] = useState(true)
  const [delay, setDelay] = useState('6')
  const [subject, setSubject] = useState('Suivi soumission #{no}')
  const [email, setEmail] = useState(FOLLOW_UP_EMAIL)
  const [smsOn, setSmsOn] = useState(true)
  const [sms, setSms] = useState(FOLLOW_UP_SMS)
  const [reminderOn, setReminderOn] = useState(true)
  const steps: { on: boolean; icon: Icon; when: string; what: string }[] = [
    { on: smsOn, icon: MessageSquare, when: 'J+2', what: 'Texto' },
    { on: emailOn, icon: Mail, when: `J+${delay}`, what: 'Courriel' },
  ]
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4 items-start">
      <div className="space-y-4 min-w-0">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Compagnie">
            <Select<CompanyId> value={company} onChange={(c) => setCompany(c)} className="w-56" options={COMPANIES.map((c) => ({ value: c.id, label: c.name }))} searchable={false} />
          </Field>
        </div>
        <Card title="Courriel de suivi" icon={Mail} actions={<Toggle on={emailOn} onChange={setEmailOn} label="Activer le courriel de suivi" />}>
          <div className={cn('space-y-3', !emailOn && 'opacity-50 pointer-events-none')}>
            <div className="grid sm:grid-cols-[160px_minmax(0,1fr)] gap-3">
              <Field label="Délai">
                <Select value={delay} onChange={setDelay} options={['5', '6', '7', '10', '14'].map((d) => ({ value: d, label: `${d} jours` }))} searchable={false} />
              </Field>
              <Field label="Objet">
                <input id="fu-objet" className="form-input" value={subject} onChange={(e) => setSubject(e.target.value)} />
              </Field>
            </div>
            <Field label="Message">
              <textarea id="fu-message" rows={12} className="form-input h-auto py-2.5 leading-relaxed" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
          </div>
        </Card>
        <Card title="Texto de suivi · J+2" icon={MessageSquare} actions={<Toggle on={smsOn} onChange={setSmsOn} label="Activer le texto de suivi" />}>
          <div className={cn('space-y-3', !smsOn && 'opacity-50 pointer-events-none')}>
            <Field label="Message">
              <textarea id="fu-texto" rows={3} className="form-input h-auto py-2.5" value={sms} onChange={(e) => setSms(e.target.value)} />
            </Field>
          </div>
        </Card>
        <Card title="Rappel de rendez-vous · la veille" icon={BellRing} actions={<Toggle on={reminderOn} onChange={setReminderOn} label="Activer le rappel de rendez-vous" />} pad={false}>
          <span />
        </Card>
        <div className="flex justify-end gap-2">
          <button className="btn btn-sm btn-secondary" onClick={() => toast('Courriel test envoyé à ai@agentyx.ca')}>
            <Send className="w-4 h-4" />
            Envoyer un test
          </button>
          <button className="btn btn-sm btn-primary" onClick={() => toast('Suivis automatiques enregistrés')}>
            Enregistrer
          </button>
        </div>
      </div>
      <div className="space-y-4 min-w-0 lg:sticky lg:top-20">
        <Card title="Déroulement" icon={Workflow}>
          <ol className="space-y-3">
            <li className="flex items-center gap-3 text-sm">
              <span className="w-8 h-8 rounded-full bg-ink text-white flex items-center justify-center shrink-0">
                <Send className="w-3.5 h-3.5" />
              </span>
              <span>
                <b className="text-ink">J0</b> · Soumission envoyée
              </span>
            </li>
            {steps.map((s) => (
              <li key={s.when} className={cn('flex items-center gap-3 text-sm', !s.on && 'opacity-40')}>
                <span className="w-8 h-8 rounded-full bg-primary-wash text-primary-press flex items-center justify-center shrink-0">
                  <s.icon className="w-3.5 h-3.5" />
                </span>
                <span className="min-w-0">
                  <b className="text-ink">{s.when}</b> · {s.what}
                </span>
              </li>
            ))}
            <li className="flex items-center gap-3 text-sm text-ink-mute">
              <span className="w-8 h-8 rounded-full bg-sand flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5" />
              </span>
              Arrêt si le client répond
            </li>
          </ol>
        </Card>
      </div>
    </div>
  )
}

export function SecurityTab() {
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Card title="Journal des modifications" icon={FileClock} pad={false} className="lg:col-span-2">
        <div className="divide-y divide-hairline">
          {AUDIT_LOG.map(([when, who, what]) => (
            <div key={when + what} className="px-5 py-3 flex flex-col sm:flex-row sm:gap-3 text-sm">
              <span className="sm:w-24 shrink-0 text-xs text-ink-mute tnum pt-0.5">{when}</span>
              <span className="font-semibold text-ink-secondary sm:w-40 shrink-0 truncate">{who}</span>
              <span className="text-ink-mute flex-1">{what}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Sécurité" icon={Lock}>
        <ul className="space-y-2.5 text-sm text-ink-secondary">
          {['Connexion chiffrée (HTTPS)', 'Mot de passe par utilisateur', 'Sauvegardes quotidiennes', 'Consentement Loi 25'].map((item) => (
            <li key={item} className="flex gap-2">
              <Check className="w-4 h-4 text-tone-good mt-0.5 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
