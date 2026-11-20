/** Paramètres → Numérotation (quote number prefix / next number) and Calendriers de paiement. */
import { useState } from 'react'
import { ArrowDown, ArrowUp, CalendarClock, Hash, Plus, Trash2 } from 'lucide-react'
import { Card, CompanyBadge, Field } from '../../../components/ui'
import { Notice, confirmAction } from '../../../components/states'
import { useAuth } from '../../../auth/AuthContext'
import { COMPANIES, QUOTES, type CompanyId } from '../../../data/mock'
import { NUMBERING, PAYMENT_SCHEDULES, saveNumbering, savePaymentSchedule, type PaymentStep } from '../../../data/settings'
import { useStore } from '../../../data/store'
import { toast } from '../../../lib/toast'
import { cn, money, pct } from '../../../lib/utils'
import { t } from '../../../i18n'
import { logChange } from './data'
import { CompanySelect, Intro, useScopeCompany } from './shared'

export function NumberingTab() {
  useStore()
  return (
    <div className="space-y-4">
      <Intro>{t('Chaque compagnie a sa propre série. Le prochain numéro ne peut pas être inférieur à un numéro déjà utilisé.')}</Intro>
      <div className="grid md:grid-cols-3 gap-4">
        {COMPANIES.map((c) => (
          <NumberingCard key={c.id} company={c.id} />
        ))}
      </div>
    </div>
  )
}

function NumberingCard({ company }: { company: CompanyId }) {
  const { user } = useAuth()
  const cur = NUMBERING[company]
  const [prefix, setPrefix] = useState(cur.prefix)
  const [next, setNext] = useState(String(cur.next))
  const used = QUOTES.filter((q) => q.no.startsWith(prefix)).map((q) => Number(q.no.slice(prefix.length)) || 0)
  const maxUsed = used.length ? Math.max(...used) : 0
  const n = Number(next)
  const error = !/^[A-Z]{1,3}$/.test(prefix) ? t('1 à 3 lettres majuscules') : !Number.isInteger(n) || n <= 0 ? t('Nombre entier positif') : n <= maxUsed ? t('Doit être supérieur à {n} (déjà utilisé)', { n: `${prefix}${maxUsed}` }) : ''
  const dirty = prefix !== cur.prefix || n !== cur.next
  const name = COMPANIES.find((c) => c.id === company)!.name

  return (
    <Card title={name} icon={Hash}>
      <div className="space-y-3">
        <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-3">
          <Field label={t('Préfixe')}>
            <input className="form-input uppercase" maxLength={3} value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} />
          </Field>
          <Field label={t('Prochain numéro')}>
            <input className="form-input tnum" inputMode="numeric" value={next} onChange={(e) => setNext(e.target.value.replace(/\D/g, ''))} />
          </Field>
        </div>
        <div className="rounded-lg bg-sand/70 px-3 py-2.5">
          <p className="label-caps">{t('Aperçu')}</p>
          <p className="text-xl font-semibold tnum text-ink mt-0.5">{error ? '—' : `${prefix}${n}`}</p>
          <p className="text-2xs text-ink-mute">{t('Puis {a}, {b}…', { a: `${prefix}${n + 1}`, b: `${prefix}${n + 2}` })}</p>
        </div>
        {error && <Notice tone="critical">{error}</Notice>}
        <button
          className="btn btn-sm btn-primary w-full"
          disabled={!dirty || !!error}
          onClick={() => {
            saveNumbering(company, { prefix, next: n })
            logChange(user?.name ?? '—', 'parametres', 'Numérotation {name} : prochain numéro {no}', { name, no: `${prefix}${n}` })
            toast(t('Numérotation enregistrée'))
          }}
        >
          {t('Enregistrer')}
        </button>
      </div>
    </Card>
  )
}

// ── Payment schedules ───────────────────────────────────────────────────────
export function PaymentSchedulesTab() {
  useStore()
  const { user } = useAuth()
  const [company, setCompany] = useScopeCompany()
  const [steps, setSteps] = useState<PaymentStep[]>(() => PAYMENT_SCHEDULES[company].map((s) => ({ ...s })))
  const total = steps.reduce((n, s) => n + (Number(s.pct) || 0), 0)
  const valid = Math.abs(total - 100) < 0.001 && steps.every((s) => s.label.trim() && s.pct > 0)
  const dirty = JSON.stringify(steps) !== JSON.stringify(PAYMENT_SCHEDULES[company])
  const example = 20000

  const switchTo = async (c: CompanyId) => {
    if (dirty && !(await confirmAction({ title: t('Abandonner les modifications?') }))) return
    setCompany(c)
    setSteps(PAYMENT_SCHEDULES[c].map((s) => ({ ...s })))
  }
  const patch = (i: number, p: Partial<PaymentStep>) => setSteps((l) => l.map((s, k) => (k === i ? { ...s, ...p } : s)))
  const move = (i: number, dir: number) =>
    setSteps((l) => {
      const j = i + dir
      if (j < 0 || j >= l.length) return l
      const next = [...l]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  const remove = async (i: number) => {
    if (!(await confirmAction({ title: t('Retirer l’étape « {name} »?', { name: t(steps[i].label) }), confirmLabel: t('Retirer'), danger: true }))) return
    setSteps((l) => l.filter((_, k) => k !== i))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label={t('Compagnie')}>
          <CompanySelect value={company} onChange={switchTo} />
        </Field>
        <Intro>{t('Calendrier proposé par défaut sur les nouvelles soumissions. Le représentant peut l’ajuster sur une soumission.')}</Intro>
      </div>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-4 items-start">
        <Card title={t('Étapes de paiement')} icon={CalendarClock} pad={false}>
          <ul className="divide-y divide-hairline">
            {steps.map((s, i) => (
              <li key={i} className="flex items-center gap-2 px-4 py-2.5">
                <span className="flex flex-col">
                  <button aria-label={t('Monter')} disabled={i === 0} onClick={() => move(i, -1)} className="p-0.5 rounded hover:bg-stone disabled:opacity-30">
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button aria-label={t('Descendre')} disabled={i === steps.length - 1} onClick={() => move(i, 1)} className="p-0.5 rounded hover:bg-stone disabled:opacity-30">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </span>
                <input className="form-input h-8 flex-1 min-w-0" value={t(s.label)} onChange={(e) => patch(i, { label: e.target.value })} aria-label={t("Nom de l'étape")} />
                <label className="flex items-center gap-1 text-sm">
                  <input className="form-input h-8 w-16 text-right tnum" inputMode="decimal" value={s.pct} onChange={(e) => patch(i, { pct: Number(e.target.value.replace(',', '.')) || 0 })} aria-label={t('Pourcentage')} />%
                </label>
                <button className="p-1.5 rounded-md hover:bg-tone-critical-soft hover:text-tone-critical-ink" aria-label={t('Retirer')} disabled={steps.length <= 1} onClick={() => remove(i)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-2 p-3 border-t border-hairline bg-sand/40">
            <button className="btn btn-sm btn-secondary" onClick={() => setSteps((l) => [...l, { label: t('Nouvelle étape'), pct: Math.max(0, 100 - total) }])}>
              <Plus className="w-4 h-4" />
              {t('Étape')}
            </button>
            <span className={cn('ml-auto text-sm font-semibold tnum', valid ? 'text-tone-good-ink' : 'text-tone-critical-ink')}>{t('Total : {n}', { n: pct(total, 1) })}</span>
          </div>
          {!valid && (
            <div className="px-4 pb-3 bg-sand/40">
              <Notice tone="critical">{Math.abs(total - 100) >= 0.001 ? t('Le total doit faire 100 % (actuellement {n}).', { n: pct(total, 1) }) : t('Chaque étape doit avoir un nom et un pourcentage.')}</Notice>
            </div>
          )}
          <div className="flex justify-end gap-2 p-3 border-t border-hairline">
            <button className="btn btn-sm btn-ghost" disabled={!dirty} onClick={() => setSteps(PAYMENT_SCHEDULES[company].map((s) => ({ ...s })))}>
              {t('Annuler')}
            </button>
            <button
              className="btn btn-sm btn-primary"
              disabled={!dirty || !valid}
              onClick={() => {
                savePaymentSchedule(company, steps)
                logChange(user?.name ?? '—', 'parametres', 'A modifié le calendrier de paiement ({name})', { name: COMPANIES.find((c) => c.id === company)!.name })
                toast(t('Calendrier de paiement enregistré'))
              }}
            >
              {t('Enregistrer')}
            </button>
          </div>
        </Card>
        <Card title={t('Exemple sur {n}', { n: money(example, false) })}>
          <div className="space-y-2">
            <div className="flex h-3 rounded-full overflow-hidden bg-sand">
              {steps.map((s, i) => (
                <span key={i} className={cn('h-full', `bg-data-${(i % 10) + 1}-ink`)} style={{ width: `${Math.min(100, s.pct)}%` }} />
              ))}
            </div>
            <ul className="space-y-1.5 text-sm">
              {steps.map((s, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className={cn('w-2.5 h-2.5 rounded-sm shrink-0', `bg-data-${(i % 10) + 1}-ink`)} />
                  <span className="flex-1 truncate text-ink-secondary">{t(s.label)}</span>
                  <span className="tnum text-ink-mute">{pct(s.pct)}</span>
                  <span className="tnum font-semibold w-20 text-right">{money((example * s.pct) / 100, false)}</span>
                </li>
              ))}
            </ul>
            <p className="text-2xs text-ink-mute pt-1">
              <CompanyBadge id={company} /> {t('Montants avant taxes.')}
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
