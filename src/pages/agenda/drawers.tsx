/**
 * Agenda drawers. Private copies of mockup helpers:
 *   q4→AppointmentDrawer  O4→appointmentSubject  Sx→localDateTime
 *   _4→nextFreeSlot  B4→prefillFromQuote  L4→NewAppointmentDrawer
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Ban, CalendarClock, CalendarPlus, Clock, FilePenLine, Info, MapPin, Navigation, Sparkles, UserRound } from 'lucide-react'
import { MessageButton, type MessageCtx } from '../../components/messaging'
import { Drawer, Field, RepAvatar } from '../../components/ui'
import { CLIENTS, QUOTES, clientById, companyById, fullName, repById, type Appointment, type Quote, type Rep } from '../../data/mock'
import { toast } from '../../lib/toast'
import { cn, formatHour, money } from '../../lib/utils'
import { DAY_NAMES, TODAY_INDEX, capitalize } from './calendar'
import { Select } from '../../components/filters'
import { t } from '../../i18n'

export function AppointmentDrawer({ a, onClose }: { a: Appointment | null; onClose: () => void }) {
  if (!a) {
    return (
      <Drawer open={false} onClose={onClose} title="">
        {null}
      </Drawer>
    )
  }
  const rep = repById(a.repId)!
  const quote = a.quoteNo ? QUOTES.find((q) => q.no === a.quoteNo) : a.clientId ? QUOTES.find((q) => q.clientId === a.clientId) : undefined
  const isAiLead = a.id === 'a6'
  const client = a.clientId ? clientById(a.clientId) : quote ? clientById(quote.clientId) : isAiLead ? undefined : (CLIENTS.find((c) => c.city === a.city) ?? CLIENTS[(a.id.charCodeAt(1) * 7) % CLIENTS.length])
  const name = client ? fullName(client) : 'Catherine Drolet'
  const ctx: MessageCtx = {
    name,
    first: name.split(' ')[0],
    company: companyById(rep.company === 'all' ? 'toit' : rep.company).name,
    rep: rep.first,
    quoteNo: quote?.no,
    date: t('{day} {d} oct. à {time}', { day: t(DAY_NAMES[a.day]), d: 18 + a.day, time: formatHour(a.start) }),
  }
  return (
    <Drawer
      open
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          {t(a.type)}
          {a.aiBooked && <Sparkles className="w-4 h-4 text-ink-mute" aria-label={t("Réservé par l'agent IA")} />}
        </span>
      }
    >
      <div className="p-5 space-y-5">
        <div className={cn('rounded-xl p-4 border-l-4', `bg-${rep.color} text-${rep.color}-ink border-${rep.color}-ink`)}>
          <p className="text-lg font-semibold">
            {a.city}
            {a.title ? ` · ${t(a.title)}` : ''}
          </p>
          <p className="text-sm mt-1 flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {t('{day} {d} octobre', { day: capitalize(t(DAY_NAMES[a.day])), d: 18 + a.day })} · {formatHour(a.start)} – {formatHour(a.end)}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="label-caps mb-1">{t('Représentant')}</p>
            <p className="flex items-center gap-2 font-semibold text-ink">
              <RepAvatar id={rep.id} />
              {rep.name}
            </p>
          </div>
          <div>
            <p className="label-caps mb-1">{t('Client')}</p>
            <p className="font-semibold text-ink truncate">{name}</p>
          </div>
          <div className="col-span-2">
            <p className="label-caps mb-1">{t('Adresse')}</p>
            <p className="text-ink-secondary flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-ink-mute" />
              {client ? `${client.no}, ${client.street}, ${client.city} ${client.postal}` : `${a.city}, QC`}
            </p>
          </div>
        </div>
        {quote && (
          <Link to={`/soumissions/${quote.id}`} className="flex items-center gap-3 rounded-lg border border-hairline p-3 hover:border-primary">
            <FilePenLine className="w-5 h-5 text-ink-mute" />
            <p className="min-w-0 flex-1 text-sm font-semibold text-ink truncate">
              {quote.no} · {t(quote.workType)}
            </p>
            <span className="text-sm font-semibold tnum">{money(quote.amount, false)}</span>
          </Link>
        )}
        <div className="flex flex-wrap gap-2">
          <MessageButton kind="reminder" ctx={ctx} label={t('Rappel')} />
          <MessageButton kind="sms" ctx={ctx} label={t('Texto')} />
          <button className="btn btn-sm btn-secondary" onClick={() => toast(t('Itinéraire ouvert dans Google Maps'))}>
            <Navigation className="w-3.5 h-3.5" />
            {t('Itinéraire')}
          </button>
          {client && (
            <Link to={`/clients/${client.id}`} className="btn btn-sm btn-ghost">
              <UserRound className="w-3.5 h-3.5" />
              {t('Fiche client')}
            </Link>
          )}
        </div>
        <div className="flex gap-2 pt-3 border-t border-hairline">
          <button
            className="btn btn-sm btn-secondary flex-1"
            onClick={() => {
              toast(t('Rendez-vous déplacé — client avisé'))
              onClose()
            }}
          >
            <CalendarClock className="w-4 h-4" />
            {t('Déplacer')}
          </button>
          <button
            className="btn btn-sm btn-ghost flex-1 hover:text-tone-critical-ink"
            onClick={() => {
              toast(t('Rendez-vous annulé'))
              onClose()
            }}
          >
            <Ban className="w-4 h-4" />
            {t('Annuler')}
          </button>
        </div>
      </div>
    </Drawer>
  )
}

/* ── New appointment ───────────────────────────────────────────────────── */

export interface AppointmentPrefill {
  repId: string
  quoteId: string
  subject: string
  start: string
  end: string
  description: string
  slotNote: string
}

/** "Ville, Type de travaux" */
function appointmentSubject(q: Quote) {
  const parts = q.workType.split('·').map((p) => p.trim())
  const work = q.company === 'toit' ? (parts[1] ?? parts[0]) : parts[0]
  return `${q.city}, ${t(work)}`
}

const pad2 = (n: number) => String(n).padStart(2, '0')
const localDateTime = (day: number, hour: number) => `2026-10-${pad2(18 + day)}T${pad2(Math.floor(hour))}:${pad2(Math.round((hour % 1) * 60))}`

/** First free one-hour slot for a rep later this week. */
function nextFreeSlot(repId: string, evts: Appointment[]) {
  for (let day = TODAY_INDEX + 1; day <= 5; day++) for (let h = 8; h <= 16; h++) if (!evts.some((e) => e.repId === repId && e.day === day && e.start < h + 1 && e.end > h)) return { day, h }
  return { day: TODAY_INDEX + 1, h: 8 }
}

/** Builds the "create appointment" form defaults from a quote (`?nouveau=<quote>`). */
export function prefillFromQuote(q: Quote, evts: Appointment[]): AppointmentPrefill {
  const c = clientById(q.clientId)!
  const { day, h } = nextFreeSlot(q.repId, evts)
  const phones = [c.phone, c.mobile].filter(Boolean).join(t(' · cell. '))
  return {
    repId: q.repId,
    quoteId: q.id,
    subject: appointmentSubject(q),
    start: localDateTime(day, h),
    end: localDateTime(day, h + 1),
    description: `${fullName(c)}${c.company ? ` (${c.company})` : ''}\n${c.no}, ${c.street}, ${c.city} ${c.postal}\n${phones}`,
    slotNote: t('Prochaine plage libre : {day} {d} oct., {time}', { day: t(DAY_NAMES[day]), d: 18 + day, time: formatHour(h) }),
  }
}

export function NewAppointmentDrawer({ open, onClose, onCreate, prefill, reps }: { open: boolean; onClose: () => void; onCreate: (a: Appointment) => void; prefill: AppointmentPrefill | null; reps: Rep[] }) {
  const [repId, setRepId] = useState(prefill?.repId ?? reps[0]?.id ?? 'plc')
  const [quoteId, setQuoteId] = useState(prefill?.quoteId ?? '')
  const [subject, setSubject] = useState(prefill?.subject ?? '')
  const [start, setStart] = useState(prefill?.start ?? '2026-10-21T11:30')
  const [end, setEnd] = useState(prefill?.end ?? '2026-10-21T12:30')
  const [description, setDescription] = useState(prefill?.description ?? '')
  const repQuotes = QUOTES.filter((q) => reps.some((r) => r.id === q.repId))
  const fromQuote = prefill ? QUOTES.find((q) => q.id === prefill.quoteId) : undefined
  const quoteOptions = [
    { value: '', label: t('Aucune') },
    ...[...(fromQuote ? [fromQuote] : []), ...repQuotes.filter((q) => q.id !== fromQuote?.id).slice(0, 30)].map((q) => ({ value: q.id, label: `${q.no} · ${fullName(clientById(q.clientId)!)}` })),
  ]
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <CalendarPlus className="w-4 h-4" />
          {t('Créer un rendez-vous')}
        </span>
      }
    >
      <div className="p-5 space-y-4">
        {fromQuote && (
          <p className="text-xs font-semibold text-primary-press flex items-center gap-1.5">
            <FilePenLine className="w-3.5 h-3.5" />
            {t('Depuis {no}', { no: fromQuote.no })}
          </p>
        )}
        <Field label={t('Sujet')}>
          <input id="rdv-sujet" className="form-input" value={subject} placeholder={t('Ville, Type de travaux')} onChange={(e) => setSubject(e.target.value)} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t('Date début')}>
            <input id="rdv-debut" type="datetime-local" className="form-input" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label={t('Date fin')}>
            <input id="rdv-fin" type="datetime-local" className="form-input" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        <Field label={t('Soumission')}>
          <Select value={quoteId} onChange={setQuoteId} options={quoteOptions} />
        </Field>
        <Field label={t('Représentant')}>
          <Select value={repId} onChange={setRepId} options={reps.map((r) => ({ value: r.id, label: r.name, icon: <RepAvatar id={r.id} size="xs" /> }))} />
        </Field>
        {prefill && repId === prefill.repId && (
          <p className="text-xs text-ink-mute flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            {prefill.slotNote}
          </p>
        )}
        <Field label={t('Description')}>
          <textarea id="rdv-description" rows={4} className="form-input h-auto py-2.5" value={description} placeholder={t('Nom du client, adresse, téléphone')} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-ink-secondary">
          <input id="rdv-rappel" type="checkbox" defaultChecked className="accent-[var(--color-primary)]" />
          {t('Confirmation + rappel la veille')}
        </label>
        <button
          className="btn btn-md btn-primary w-full"
          onClick={() => {
            const s = new Date(start)
            const e = new Date(end)
            const day = Math.max(0, Math.min(6, s.getDate() - 18))
            const quote = QUOTES.find((q) => q.id === quoteId)
            onCreate({
              id: 'new' + Date.now(),
              repId,
              day,
              start: s.getHours() + s.getMinutes() / 60,
              end: Math.max(e.getHours() + e.getMinutes() / 60, s.getHours() + 0.5),
              title: subject.split(',').slice(1).join(',').trim() || subject,
              city: subject.split(',')[0].trim(),
              type: 'Estimation',
              quoteNo: quote?.no,
              clientId: quote?.clientId,
            })
            toast(t('Rendez-vous créé · confirmation envoyée au client'))
            onClose()
          }}
        >
          <CalendarPlus className="w-4 h-4" />
          {t('Enregistrer')}
        </button>
      </div>
    </Drawer>
  )
}
