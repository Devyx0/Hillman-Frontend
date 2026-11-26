import { useState } from 'react'
import { Ban, Check, CircleDollarSign, Clock, Mail, MessageSquare, Pause, PenLine, Play, Workflow } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { Badge, Field } from '../../components/ui'
import { BuilderSection, StatusPicker } from '../../components/quote-shared'
import { followUpState } from '../../components/quote-status'
import { TODAY } from '../../data/mock'
import { FOLLOW_UP_SEQUENCES, isOptedOut } from '../../data/settings'
import { recordPayment, setFollowUpPaused, type QuoteStatusRecord } from '../../data/store'
import { locale, t } from '../../i18n'
import { toast } from '../../lib/toast'
import { cn, money } from '../../lib/utils'
import { ActualProfit } from './CoutantsSection'
import type { Builder } from './useQuoteBuilder'
import { Dropdown } from '../../components/dropdown'

const DAY = 864e5
const addDays = (iso: string, n: number) => new Date(new Date(iso + 'T12:00').getTime() + n * DAY).toISOString().slice(0, 10)
const daysBetween = (from: string, to: string) => Math.floor((new Date(to + 'T12:00').getTime() - new Date(from + 'T12:00').getTime()) / DAY)
const fmtDate = (iso: string) => new Date(iso.length === 10 ? iso + 'T12:00' : iso).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' })
const fmtDateTime = (iso: string) => new Date(iso).toLocaleString(locale(), { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const METHODS = ['Virement Interac', 'Chèque', 'Carte de crédit', 'Comptant', 'Financement']

/** Status, signature record and status history (PDF items 5 and 6 — office side). */
function Decision({ b }: { b: Builder }) {
  const q = b.quote as QuoteStatusRecord
  return (
    <div className="rounded-xl border border-hairline p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-semibold text-ink flex items-center gap-2 mr-auto">
          <PenLine className="w-4 h-4" />
          {t('Décision du client')}
        </p>
        <StatusPicker q={q} via="soumission" align="right" />
      </div>
      {q.signature ? (
        <div className="rounded-lg bg-tone-good-soft text-tone-good-ink px-3 py-2 text-xs space-y-0.5">
          <p className="font-semibold">{t('Signée par {name}', { name: q.signature.name })}</p>
          <p className="tnum">
            {t('{when} · {device} · IP {ip}', { when: fmtDateTime(q.signature.at), device: q.signature.device === 'tablet' ? t('sur la tablette') : t('dans le portail'), ip: q.signature.ip })}
          </p>
          {q.cancellation && <p className="font-semibold text-tone-critical-ink">{t('Résolution demandée le {date} (art. 58 LPC)', { date: fmtDateTime(q.cancellation.at) })}</p>}
        </div>
      ) : q.officeAcceptance ? (
        <div className="rounded-lg bg-tone-good-soft text-tone-good-ink px-3 py-2 text-xs">
          <p className="font-semibold">{t('Acceptée au bureau (téléphone ou en personne)')}</p>
          <p className="tnum">
            {fmtDateTime(q.officeAcceptance.at)}
            {q.officeAcceptance.by ? ` · ${q.officeAcceptance.by}` : ''}
            {q.officeAcceptance.comment ? ` · ${q.officeAcceptance.comment}` : ''}
          </p>
        </div>
      ) : null}
      {q.status === 'Refusé' && (
        <div className="rounded-lg bg-tone-critical-soft text-tone-critical-ink px-3 py-2 text-xs">
          <p className="font-semibold">{t('Refusée · {reason}', { reason: q.refusalReason ? t(q.refusalReason) : t('raison non précisée') })}</p>
          {q.refusalComment && <p>{q.refusalComment}</p>}
        </div>
      )}
      {q.statusLog && q.statusLog.length > 0 && (
        <div>
          <p className="label-caps mb-1">{t('Historique')}</p>
          <ol className="space-y-1 text-xs text-ink-secondary">
            {[...q.statusLog].reverse().map((c, i) => (
              <li key={i} className="flex flex-wrap gap-x-2">
                <span className="tnum text-ink-mute">{fmtDateTime(c.at)}</span>
                <span>
                  {t(c.from)} → <b className="text-ink">{t(c.status)}</b>
                </span>
                {c.reason && <span>· {t(c.reason)}</span>}
                {c.by && <span className="text-ink-mute">· {c.by}</span>}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

/** Automatic follow-up of this quote: the company sequence, sent / next steps, pause / resume, stop state. */
function FollowUps({ b }: { b: Builder }) {
  const { can } = useAuth()
  const q = b.quote
  const info = followUpState(q)
  const seq = FOLLOW_UP_SEQUENCES[q.company]
  const noSms = isOptedOut(b.client.mobile) || isOptedOut(b.client.phone)
  const since = daysBetween(q.date, TODAY)
  const steps = [...seq.steps].sort((x, y) => x.day - y.day)
  const nextDay = steps.find((s) => s.day > since && !(noSms && s.channel === 'sms'))?.day
  const tone = info.kind === 'next' ? 'info' : info.kind === 'paused' ? 'warn' : info.kind === 'stopped' ? 'neutral' : 'neutral'
  return (
    <div className="rounded-xl border border-hairline p-4">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <p className="text-sm font-semibold text-ink flex items-center gap-2 mr-auto">
          <Workflow className="w-4 h-4" />
          {t('Relance auto')}
        </p>
        <Badge tone={tone}>{info.label}</Badge>
        {info.pausable && can('quotes.edit') && (
          <button
            className="btn btn-xs btn-secondary"
            onClick={() => {
              setFollowUpPaused(q.id, info.kind !== 'paused')
              toast(info.kind === 'paused' ? t('Relances reprises') : t('Relances en pause pour {no}', { no: q.no }))
            }}
          >
            {info.kind === 'paused' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            {info.kind === 'paused' ? t('Reprendre') : t('Pause')}
          </button>
        )}
      </div>
      <ol className="space-y-1.5">
        {steps.map((s) => {
          const blocked = noSms && s.channel === 'sms'
          const sent = info.kind !== 'draft' && s.day <= since && !blocked
          const isNext = info.kind === 'next' && s.day === nextDay && !blocked
          const state = blocked
            ? t('Bloqué (STOP)')
            : sent
              ? t('Envoyé {date}', { date: fmtDate(addDays(q.date, s.day)) })
              : info.kind === 'stopped' || info.kind === 'finished'
                ? t('Annulé')
                : info.kind === 'paused'
                  ? t('En pause')
                  : info.kind === 'draft'
                    ? t("J+{d} après l'envoi", { d: s.day })
                    : isNext
                      ? t('Prochain · {date}', { date: fmtDate(addDays(q.date, s.day)) })
                      : t('Prévu {date}', { date: fmtDate(addDays(q.date, s.day)) })
          return (
            <li key={s.id} className="flex items-center gap-3 text-sm">
              <span className={cn('w-10 shrink-0 text-center text-2xs font-bold rounded px-1 py-0.5 tnum', sent ? 'bg-tone-good-soft text-tone-good-ink' : isNext ? 'bg-primary-wash text-primary-press' : 'bg-sand text-ink-mute')}>J+{s.day}</span>
              {s.channel === 'sms' ? <MessageSquare className="w-3.5 h-3.5 text-ink-mute" /> : <Mail className="w-3.5 h-3.5 text-ink-mute" />}
              <span className={cn('flex-1', sent || isNext ? 'text-ink' : 'text-ink-mute', blocked && 'line-through')}>{s.channel === 'sms' ? t('Texto de suivi') : t('Courriel de suivi')}</span>
              <span className={cn('text-xs', isNext ? 'text-primary-press font-semibold' : 'text-ink-mute')}>{state}</span>
            </li>
          )
        })}
      </ol>
      <p className="text-2xs text-ink-mute mt-2">
        {t('La séquence s’arrête quand le client répond, signe, refuse ou texte STOP.')}
        {noSms && <span className="text-tone-warn-ink"> {t('Ce client a répondu STOP : aucun texto.')}</span>}
      </p>
    </div>
  )
}

/** Payments received, balance and the company's payment schedule (PDF item 13). */
function Payments({ b }: { b: Builder }) {
  const { can } = useAuth()
  const q = b.quote
  const payments = q.payments ?? []
  const paid = payments.reduce((n, p) => n + p.amount, 0)
  const balance = Math.max(0, b.total - paid)
  const steps = b.schedule.map((s, i) => {
    const amount = (b.total * s.pct) / 100
    const upTo = (b.total * b.schedule.slice(0, i + 1).reduce((n, x) => n + x.pct, 0)) / 100
    return { ...s, amount, done: paid >= upTo - 1 }
  })
  const nextStep = steps.find((s) => !s.done)
  const [form, setForm] = useState({ date: TODAY, amount: '', method: METHODS[0] })
  const submit = () => {
    const amount = Number(String(form.amount || nextStep?.amount || balance).replace(/\s/g, '').replace(',', '.'))
    if (!amount || amount <= 0) return toast(t('Entrez un montant'))
    recordPayment(q.id, { date: form.date, amount: Math.round(amount * 100) / 100, method: form.method })
    toast(paid + amount >= b.total - 1 ? t('Paiement enregistré — soumission payée en totalité') : t('Paiement de {amount} enregistré', { amount: money(amount) }))
    setForm({ ...form, amount: '' })
  }
  return (
    <div className="rounded-xl border border-hairline p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-ink flex items-center gap-2 mr-auto">
          <CircleDollarSign className="w-4 h-4" />
          {t('Paiements')}
        </p>
        <span className="text-xs text-ink-mute tnum">
          {t('Reçu {paid} · solde {balance}', { paid: money(paid, false), balance: money(balance, false) })}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {steps.map((s, i) => (
          <div key={i} className={cn('rounded-lg border p-2.5', s.done ? 'border-tone-good bg-tone-good-soft' : 'border-hairline')}>
            <p className="text-2xs text-ink-mute flex items-center gap-1">
              {s.done ? <Check className="w-3 h-3 text-tone-good" /> : <Clock className="w-3 h-3" />}
              {t(s.label)}
            </p>
            <p className="text-sm font-semibold tnum">{money(s.amount, false)}</p>
            <p className="text-2xs text-ink-mute tnum">{s.pct} %</p>
          </div>
        ))}
      </div>
      {payments.length > 0 && (
        <ul className="divide-y divide-hairline rounded-lg border border-hairline text-sm">
          {payments.map((p) => (
            <li key={p.id} className="px-3 py-2 flex flex-wrap items-center gap-x-3">
              <span className="tnum text-ink-mute">{fmtDate(p.date)}</span>
              <span className="text-ink-secondary flex-1">{t(p.method)}</span>
              <span className="tnum font-semibold">{money(p.amount)}</span>
            </li>
          ))}
        </ul>
      )}
      {can('payments.record') ? (
        q.status === 'Payé' && balance < 1 ? (
          <p className="text-xs text-tone-good-ink font-semibold">{t('Payée en totalité.')}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-[140px_1fr_1fr_auto] gap-2 items-end">
            <Field label={t('Date')}>
              <input type="date" className="form-input tnum" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label={t('Montant')}>
              <input inputMode="decimal" className="form-input tnum" value={form.amount} placeholder={String(Math.round((nextStep?.amount ?? balance) * 100) / 100)} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </Field>
            <Field label={t('Mode')} className="col-span-2 sm:col-span-1">
              <Dropdown className="form-input" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {t(m)}
                  </option>
                ))}
              </Dropdown>
            </Field>
            <button className="btn btn-sm btn-primary h-10 col-span-2 sm:col-span-1" onClick={submit}>
              {t('Enregistrer un paiement')}
            </button>
          </div>
        )
      ) : (
        <p className="text-2xs text-ink-mute flex items-center gap-1.5">
          <Ban className="w-3.5 h-3.5" />
          {t('Votre rôle ne permet pas d’enregistrer des paiements.')}
        </p>
      )}
    </div>
  )
}

/** Decision, follow-ups, payments and real profit — everything after the quote is sent. */
export function SuiviSection({ b }: { b: Builder }) {
  return (
    <BuilderSection id="suivi" title={t('Suivi et paiements')}>
      <div className="grid lg:grid-cols-2 gap-4 [&>*]:min-w-0">
        <Decision b={b} />
        <FollowUps b={b} />
        <div className="lg:col-span-2">
          <Payments b={b} />
        </div>
      </div>
      {b.canProfit && <ActualProfit b={b} />}
    </BuilderSection>
  )
}
