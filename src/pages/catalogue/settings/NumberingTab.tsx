/** Paramètres → Numérotation (quote number prefix / next number) and Calendriers de paiement. */
import { useState } from 'react'
import { API_MODE } from '../../../api/config'
import { ApiNumberingTab } from './ApiNumberingTab'
import { ArrowDown, ArrowUp, CalendarClock, Hash, Plus, Star, Trash2 } from 'lucide-react'
import { Card, CompanyBadge, Field } from '../../../components/ui'
import { Notice, confirmAction } from '../../../components/states'
import { useAuth } from '../../../auth/AuthContext'
import { COMPANIES, QUOTES, type CompanyId } from '../../../data/mock'
import { DEFAULT_PAYMENT_SCHEDULE, NUMBERING, PAYMENT_SCHEDULE_OPTIONS, saveNumbering, savePaymentSchedules, type PaymentSchedule, type PaymentStep } from '../../../data/settings'
import { useStore } from '../../../data/store'
import { toast } from '../../../lib/toast'
import { cn, money, pct } from '../../../lib/utils'
import { t } from '../../../i18n'
import { logChange } from './data'
import { CompanySelect, Intro, useScopeCompany } from './shared'

export function NumberingTab() {
  // With the backend: one sequence for the group, a prefix per company.
  if (API_MODE) return <ApiNumberingTab />
  return <MockNumberingTab />
}

function MockNumberingTab() {
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
const cloneList = (c: CompanyId) => PAYMENT_SCHEDULE_OPTIONS[c].map((x) => ({ ...x, steps: x.steps.map((st) => ({ ...st })) }))

/**
 * Paramètres → Calendriers de paiement: each company has one or more named schedules and one default
 * (used by new quotes; the rep can pick another one on the quote, Prix tab).
 */
export function PaymentSchedulesTab() {
  useStore()
  const { user, can } = useAuth()
  const [company, setCompany] = useScopeCompany()
  const [list, setList] = useState<PaymentSchedule[]>(() => cloneList(company))
  const [defaultId, setDefaultId] = useState(DEFAULT_PAYMENT_SCHEDULE[company])
  const [selId, setSelId] = useState(DEFAULT_PAYMENT_SCHEDULE[company])
  const sel = list.find((x) => x.id === selId) ?? list[0]
  const steps = sel.steps
  const total = steps.reduce((n, s) => n + (Number(s.pct) || 0), 0)
  const stepsValid = (st: PaymentStep[]) => Math.abs(st.reduce((n, s) => n + (Number(s.pct) || 0), 0) - 100) < 0.001 && st.every((s) => s.label.trim() && s.pct > 0)
  const valid = list.every((x) => x.name.trim() && stepsValid(x.steps))
  const dirty = JSON.stringify(list) !== JSON.stringify(PAYMENT_SCHEDULE_OPTIONS[company]) || defaultId !== DEFAULT_PAYMENT_SCHEDULE[company]
  const example = 20000

  const reset = (c: CompanyId) => {
    setList(cloneList(c))
    setDefaultId(DEFAULT_PAYMENT_SCHEDULE[c])
    setSelId(DEFAULT_PAYMENT_SCHEDULE[c])
  }
  const switchTo = async (c: CompanyId) => {
    if (dirty && !(await confirmAction({ title: t('Abandonner les modifications?') }))) return
    setCompany(c)
    reset(c)
  }
  const setSteps = (fn: (l: PaymentStep[]) => PaymentStep[]) => setList((all) => all.map((x) => (x.id === sel.id ? { ...x, steps: fn(x.steps) } : x)))
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
  const addSchedule = () => {
    const id = `${company}-${Date.now()}`
    setList((all) => [...all, { id, name: t('Nouveau calendrier'), steps: [{ label: t('Fin des travaux'), pct: 100 }] }])
    setSelId(id)
  }
  const removeSchedule = async () => {
    if (sel.id === defaultId || list.length <= 1) return
    if (!(await confirmAction({ title: t('Supprimer le calendrier « {name} »?', { name: t(sel.name) }), body: t('Les soumissions qui l’utilisent reprendront le calendrier par défaut.'), confirmLabel: t('Supprimer'), danger: true }))) return
    setList((all) => all.filter((x) => x.id !== sel.id))
    setSelId(defaultId)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label={t('Compagnie')}>
          <CompanySelect value={company} onChange={switchTo} />
        </Field>
        <Intro>{t('Calendriers offerts sur les soumissions de la compagnie. Celui par défaut s’applique aux nouvelles soumissions; le représentant peut en choisir un autre sur la soumission (onglet Prix).')}</Intro>
      </div>
      <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label={t('Calendriers de paiement')}>
        {list.map((x) => (
          <button key={x.id} role="tab" aria-selected={x.id === sel.id} onClick={() => setSelId(x.id)} className={cn('h-8 px-3 rounded-full text-xs font-semibold border inline-flex items-center gap-1.5', x.id === sel.id ? 'bg-ink text-white border-ink' : 'bg-white border-hairline-strong text-ink-secondary hover:bg-sand')}>
            {x.id === defaultId && <Star className="w-3 h-3 fill-current" />}
            {t(x.name) || '—'}
          </button>
        ))}
        <button className="btn btn-xs btn-ghost" onClick={addSchedule}>
          <Plus className="w-3.5 h-3.5" />
          {t('Calendrier')}
        </button>
      </div>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-4 items-start">
        <Card title={t('Étapes de paiement')} icon={CalendarClock} pad={false}>
          <div className="flex flex-wrap items-end gap-3 px-4 py-3 border-b border-hairline">
            <Field label={t('Nom du calendrier')} className="flex-1 min-w-[200px]">
              <input className="form-input h-9" value={t(sel.name)} onChange={(e) => setList((all) => all.map((x) => (x.id === sel.id ? { ...x, name: e.target.value } : x)))} />
            </Field>
            <label className="flex items-center gap-2 text-sm h-9">
              <input type="radio" name="default-schedule" checked={sel.id === defaultId} onChange={() => setDefaultId(sel.id)} className="w-4 h-4 accent-[var(--color-primary)]" />
              {t('Par défaut pour les nouvelles soumissions')}
            </label>
            {can('delete') && <button className="btn btn-sm btn-ghost" disabled={sel.id === defaultId || list.length <= 1} onClick={removeSchedule} title={sel.id === defaultId ? t('Le calendrier par défaut ne peut pas être supprimé') : undefined}>
              <Trash2 className="w-4 h-4" />
              {t('Supprimer')}
            </button>}
          </div>
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
            <span className={cn('ml-auto text-sm font-semibold tnum', stepsValid(steps) ? 'text-tone-good-ink' : 'text-tone-critical-ink')}>{t('Total : {n}', { n: pct(total, 1) })}</span>
          </div>
          {!valid && (
            <div className="px-4 pb-3 bg-sand/40">
              <Notice tone="critical">{!stepsValid(steps) && Math.abs(total - 100) >= 0.001 ? t('Le total doit faire 100 % (actuellement {n}).', { n: pct(total, 1) }) : t('Chaque calendrier doit avoir un nom, et chaque étape un nom et un pourcentage, pour un total de 100 %.')}</Notice>
            </div>
          )}
          <div className="flex justify-end gap-2 p-3 border-t border-hairline">
            <button className="btn btn-sm btn-ghost" disabled={!dirty} onClick={() => reset(company)}>
              {t('Annuler')}
            </button>
            <button
              className="btn btn-sm btn-primary"
              disabled={!dirty || !valid}
              onClick={() => {
                savePaymentSchedules(company, list, defaultId)
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
