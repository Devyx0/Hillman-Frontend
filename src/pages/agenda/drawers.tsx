/**
 * Agenda appointment drawers: details (edit / move / cancel) and the booking form
 * (create or edit, pre-filled from a quote with `?nouveau=<quote>`).
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Ban, Bell, BellOff, CalendarClock, CalendarPlus, Clock, FilePenLine, Info, MapPin, Navigation, Pencil, Phone, Sparkles, UserRound } from 'lucide-react'
import { MessageButton, type MessageCtx } from '../../components/messaging'
import { Drawer, Field, RepAvatar } from '../../components/ui'
import { ComingSoon, Notice, confirmAction } from '../../components/states'
import { CLIENTS, QUOTES, clientById, clientLang, companyById, fullName, repById, type Quote, type Rep } from '../../data/mock'
import { addAppointment, removeAppointment, updateAppointment } from '../../data/store'
import { dayDate, dayFromIso, hourFromIso, isoAt, repConflicts, type AppointmentRecord } from '../../data/calendar'
import { useAuth } from '../../auth/AuthContext'
import { toast } from '../../lib/toast'
import { cn, formatHour, money } from '../../lib/utils'
import { DAY_END, DAY_NAMES, DAY_START, TODAY_INDEX, capitalize, type CalEvent } from './calendar'
import { Select } from '../../components/filters'
import { inLang, locale, t } from '../../i18n'

/** "Mardi 20 octobre" for a day index. */
export const longDay = (day: number) => capitalize(dayDate(day).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' }))

/** Can the signed-in user edit this rep's calendar? */
export function useCanBookFor() {
  const { user, can } = useAuth()
  return (repId: string) => can('calendar.allReps') || user?.repId === repId
}

export function AppointmentDrawer({ a, onClose, onEdit }: { a: CalEvent | null; onClose: () => void; onEdit: (a: AppointmentRecord) => void }) {
  const canBookFor = useCanBookFor()
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
  const isNew = !!a.notes // booked in the app: show what was typed instead of guessing a client
  const client = a.clientId ? clientById(a.clientId) : quote ? clientById(quote.clientId) : isAiLead || isNew ? undefined : (CLIENTS.find((c) => c.city === a.city) ?? CLIENTS[(a.id.charCodeAt(1) * 7) % CLIENTS.length])
  const name = client ? fullName(client) : isAiLead ? 'Catherine Drolet' : (a.notes?.split('\n')[0] ?? '—')
  const canEdit = canBookFor(a.repId)
  const ctx: MessageCtx = {
    name,
    first: name.split(' ')[0],
    company: companyById(rep.company === 'all' ? 'toit' : rep.company).name,
    rep: rep.first,
    quoteNo: quote?.no,
    lang: clientLang(client),
    date: inLang(clientLang(client), () => t('{day} {d} oct. à {time}', { day: t(DAY_NAMES[dayDate(a.day).getDay()]), d: dayDate(a.day).getDate(), time: formatHour(a.start) })),
  }
  const cancel = async () => {
    const ok = await confirmAction({
      title: t('Annuler ce rendez-vous?'),
      body: t('{city} · {day} à {time}. Le client sera avisé par texto.', { city: a.city || t(a.title), day: longDay(a.day), time: formatHour(a.start) }),
      confirmLabel: t('Annuler le rendez-vous'),
      danger: true,
    })
    if (!ok) return
    removeAppointment(a.id)
    toast(t('Rendez-vous annulé'))
    onClose()
  }
  const reminderOn = a.reminder !== false
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
            {longDay(a.day)} · {formatHour(a.start)} – {formatHour(a.end)}
          </p>
        </div>
        {a.aiBooked && (
          <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-secondary">
            <Sparkles className="w-3.5 h-3.5" />
            {t("Réservé par l'agent IA")}
            <ComingSoon />
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="label-caps mb-1">{t('Représentant')}</p>
            <p className="flex items-center gap-2 font-semibold text-ink">
              <RepAvatar id={rep.id} />
              <span className="truncate">{rep.name}</span>
            </p>
          </div>
          <div>
            <p className="label-caps mb-1">{t('Client')}</p>
            <p className="font-semibold text-ink truncate">{name}</p>
          </div>
          {(client || !isNew) && (
            <div className="col-span-2">
              <p className="label-caps mb-1">{t('Adresse')}</p>
              <p className="text-ink-secondary flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-ink-mute shrink-0" />
                {client ? `${client.no}, ${client.street}, ${client.city} ${client.postal}` : `${a.city}, QC`}
              </p>
            </div>
          )}
          {client && (
            <div className="col-span-2">
              <p className="label-caps mb-1">{t('Téléphone')}</p>
              <a href={`tel:${client.mobile ?? client.phone}`} className="text-ink-secondary flex items-center gap-1.5 hover:text-primary">
                <Phone className="w-4 h-4 text-ink-mute" />
                {[client.phone, client.mobile].filter(Boolean).join(' · ')}
              </a>
            </div>
          )}
        </div>
        {a.notes && (
          <div>
            <p className="label-caps mb-1">{t('Notes')}</p>
            <p className="text-sm text-ink-secondary whitespace-pre-line rounded-lg bg-sand/60 p-3">{a.notes}</p>
          </div>
        )}
        {quote && (
          <Link to={`/soumissions/${quote.id}`} className="flex items-center gap-3 rounded-lg border border-hairline p-3 hover:border-primary">
            <FilePenLine className="w-5 h-5 text-ink-mute" />
            <p className="min-w-0 flex-1 text-sm font-semibold text-ink truncate">
              {quote.no} · {t(quote.workType)}
            </p>
            <span className="text-sm font-semibold tnum">{money(quote.amount, false)}</span>
          </Link>
        )}
        <p className={cn('text-xs flex items-center gap-1.5', reminderOn ? 'text-tone-good-ink' : 'text-ink-mute')}>
          {reminderOn ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
          {reminderOn ? t('Rappel envoyé au client la veille (texto + courriel)') : t('Aucun rappel automatique')}
        </p>
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
        {canEdit && (
          <div className="flex gap-2 pt-3 border-t border-hairline">
            <button className="btn btn-sm btn-secondary flex-1" onClick={() => onEdit(a)}>
              <CalendarClock className="w-4 h-4" />
              {t('Modifier / déplacer')}
            </button>
            <button className="btn btn-sm btn-ghost flex-1 hover:text-tone-critical-ink" onClick={cancel}>
              <Ban className="w-4 h-4" />
              {t('Annuler')}
            </button>
          </div>
        )}
      </div>
    </Drawer>
  )
}

/* ── Booking form ──────────────────────────────────────────────────────── */

export interface AppointmentPrefill {
  repId: string
  quoteId: string
  subject: string
  start: string
  end: string
  description: string
  slotNote: string
}

export const APPOINTMENT_TYPES = ['Estimation', 'Inspection', 'Revoir le client', 'Signature', 'Autre']

/** "Ville, type de travaux" */
function appointmentSubject(q: Quote) {
  const parts = q.workType.split('·').map((p) => p.trim())
  const work = q.company === 'toit' ? (parts[1] ?? parts[0]) : parts[0]
  return `${q.city}, ${t(work)}`
}

const isFree = (repId: string, day: number, h: number) => {
  const c = repConflicts(repId, day, h, h + 1)
  return !c.appointments.length && !c.absences.length && !c.busy.length && !c.unavailable.length
}

/** First free one-hour slot for a rep from tomorrow (Mon–Fri), skipping appointments, absences and busy blocks. */
function nextFreeSlot(repId: string) {
  for (let day = TODAY_INDEX + 1; day <= TODAY_INDEX + 21; day++) {
    if (dayDate(day).getDay() % 6 === 0) continue
    for (let h = 8; h <= 16; h++) if (isFree(repId, day, h)) return { day, h }
  }
  return { day: TODAY_INDEX + 1, h: 8 }
}

/** Builds the "create appointment" form defaults from a quote (`?nouveau=<quote>`). */
export function prefillFromQuote(q: Quote, repId = q.repId): AppointmentPrefill {
  const c = clientById(q.clientId)!
  const { day, h } = nextFreeSlot(repId)
  const phones = [c.phone, c.mobile].filter(Boolean).join(t(' · cell. '))
  return {
    repId,
    quoteId: q.id,
    subject: appointmentSubject(q),
    start: isoAt(day, h),
    end: isoAt(day, h + 1),
    description: `${fullName(c)}${c.company ? ` (${c.company})` : ''}\n${c.no}, ${c.street}, ${c.city} ${c.postal}\n${phones}`,
    slotNote: t('Prochaine plage libre : {day} {d} oct., {time}', { day: t(DAY_NAMES[dayDate(day).getDay()]), d: dayDate(day).getDate(), time: formatHour(h) }),
  }
}

/** Create (or edit, with `editing`) an appointment. */
export function AppointmentForm({
  open,
  onClose,
  onSaved,
  prefill,
  editing,
  reps,
}: {
  open: boolean
  onClose: () => void
  onSaved: (a: AppointmentRecord) => void
  prefill: AppointmentPrefill | null
  editing?: AppointmentRecord | null
  reps: Rep[]
}) {
  const editQuote = editing?.quoteNo ? QUOTES.find((q) => q.no === editing.quoteNo) : undefined
  const defaultSlot = nextFreeSlot(prefill?.repId ?? reps[0]?.id ?? 'jph')
  const [repId, setRepId] = useState(editing?.repId ?? prefill?.repId ?? reps[0]?.id ?? '')
  const [quoteId, setQuoteId] = useState(editQuote?.id ?? prefill?.quoteId ?? '')
  const [type, setType] = useState(editing?.type ?? 'Estimation')
  const [subject, setSubject] = useState(editing ? [editing.city, editing.title].filter(Boolean).join(', ') : (prefill?.subject ?? ''))
  const [start, setStart] = useState(editing ? isoAt(editing.day, editing.start) : (prefill?.start ?? isoAt(defaultSlot.day, defaultSlot.h)))
  const [end, setEnd] = useState(editing ? isoAt(editing.day, editing.end) : (prefill?.end ?? isoAt(defaultSlot.day, defaultSlot.h + 1)))
  const [description, setDescription] = useState(editing?.notes ?? prefill?.description ?? '')
  const [reminder, setReminder] = useState(editing ? editing.reminder !== false : true)
  const [error, setError] = useState('')

  const repQuotes = QUOTES.filter((q) => reps.some((r) => r.id === q.repId))
  const fromQuote = prefill ? QUOTES.find((q) => q.id === prefill.quoteId) : editQuote
  const quoteOptions = [
    { value: '', label: t('Aucune') },
    ...[...(fromQuote ? [fromQuote] : []), ...repQuotes.filter((q) => q.id !== fromQuote?.id).slice(0, 30)].map((q) => ({ value: q.id, label: `${q.no} · ${fullName(clientById(q.clientId)!)}` })),
  ]

  const day = start ? dayFromIso(start) : 0
  const s = start ? hourFromIso(start) : 0
  const e = end ? hourFromIso(end) : 0
  const sameDay = !!end && dayFromIso(end) === day
  const c = start && end ? repConflicts(repId, day, s, sameDay ? e : DAY_END, editing?.id) : null
  const warnings = c
    ? [
        ...c.absences.map((x) => t('Absence : {reason}', { reason: t(x.reason) })),
        ...c.unavailable.map(() => t('Plage marquée non disponible')),
        ...c.busy.map((b) => t('Occupé dans son agenda externe ({from} – {to})', { from: formatHour(b.start), to: formatHour(b.end) })),
        ...c.appointments.map((x) => t('Déjà un rendez-vous : {what} à {time}', { what: x.city || t(x.title), time: formatHour(x.start) })),
      ]
    : []

  const save = () => {
    const [city, ...rest] = subject.split(',')
    if (!city.trim()) return setError(t('Indiquez la ville et le type de travaux.'))
    if (!start || !end) return setError(t('Indiquez la date et l’heure.'))
    if (sameDay && e <= s) return setError(t('L’heure de fin doit être après l’heure de début.'))
    if (s < DAY_START - 1 || s >= DAY_END) return setError(t('Choisissez une heure entre {from} et {to}.', { from: formatHour(DAY_START), to: formatHour(DAY_END) }))
    const quote = QUOTES.find((q) => q.id === quoteId)
    const fields: Omit<AppointmentRecord, 'id'> = {
      repId,
      day,
      start: s,
      end: sameDay ? e : s + 1,
      title: rest.join(',').trim() || t(type),
      city: city.trim(),
      type,
      quoteNo: quote?.no,
      clientId: quote?.clientId,
      reminder,
      notes: description.trim() || undefined,
      aiBooked: editing?.aiBooked,
    }
    if (editing) {
      const moved = editing.day !== day || editing.start !== s || editing.repId !== repId
      updateAppointment(editing.id, fields)
      toast(moved ? t('Rendez-vous déplacé — client avisé') : t('Rendez-vous mis à jour'))
      onSaved({ ...editing, ...fields })
    } else {
      const created = addAppointment(fields) as AppointmentRecord
      toast(reminder ? t('Rendez-vous créé · confirmation envoyée au client') : t('Rendez-vous créé'))
      onSaved(created)
    }
    onClose()
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          {editing ? <Pencil className="w-4 h-4" /> : <CalendarPlus className="w-4 h-4" />}
          {editing ? t('Modifier le rendez-vous') : t('Créer un rendez-vous')}
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
          <input id="rdv-sujet" className="form-input" value={subject} placeholder={t('Ville, type de travaux')} onChange={(ev) => setSubject(ev.target.value)} />
        </Field>
        <Field label={t('Type')}>
          <Select value={type} onChange={setType} options={APPOINTMENT_TYPES.map((x) => ({ value: x, label: t(x) }))} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t('Date début')}>
            <input
              id="rdv-debut"
              type="datetime-local"
              className="form-input"
              value={start}
              onChange={(ev) => {
                const v = ev.target.value
                // keep the same duration when the start moves
                if (v && start && end && dayFromIso(end) === dayFromIso(start)) {
                  const len = hourFromIso(end) - hourFromIso(start)
                  setEnd(isoAt(dayFromIso(v), Math.min(23.5, hourFromIso(v) + Math.max(0.5, len))))
                }
                setStart(v)
              }}
            />
          </Field>
          <Field label={t('Date fin')}>
            <input id="rdv-fin" type="datetime-local" className="form-input" value={end} onChange={(ev) => setEnd(ev.target.value)} />
          </Field>
        </div>
        <Field label={t('Soumission')}>
          <Select
            value={quoteId}
            onChange={(id) => {
              setQuoteId(id)
              const q = QUOTES.find((x) => x.id === id)
              if (q && !editing) {
                // "Ville, Type" + name, address, phone from the linked quote
                const p = prefillFromQuote(q, repId)
                setSubject(p.subject)
                setDescription(p.description)
              }
            }}
            options={quoteOptions}
          />
        </Field>
        <Field label={t('Représentant')}>
          <Select value={repId} onChange={setRepId} options={reps.map((r) => ({ value: r.id, label: r.name, icon: <RepAvatar id={r.id} size="xs" /> }))} disabled={reps.length < 2} />
        </Field>
        {prefill && !editing && repId === prefill.repId && (
          <p className="text-xs text-ink-mute flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            {prefill.slotNote}
          </p>
        )}
        {warnings.length > 0 && (
          <Notice>
            <p className="font-semibold">{t('{name} n’est pas disponible à ce moment :', { name: repById(repId)?.first ?? '' })}</p>
            <ul className="list-disc pl-4 mt-1 space-y-0.5">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </Notice>
        )}
        <Field label={t('Description')}>
          <textarea id="rdv-description" rows={4} className="form-input h-auto py-2.5" value={description} placeholder={t('Nom du client, adresse, téléphone')} onChange={(ev) => setDescription(ev.target.value)} />
        </Field>
        <label className="flex items-start gap-2 text-sm text-ink-secondary">
          <input id="rdv-rappel" type="checkbox" checked={reminder} onChange={(ev) => setReminder(ev.target.checked)} className="accent-[var(--color-primary)] mt-1" />
          <span>
            {t('Confirmation + rappel la veille')}
            <span className="block text-xs text-ink-mute">{t('Texto et courriel au client, la veille à 17 h')}</span>
          </span>
        </label>
        {error && <Notice tone="critical">{error}</Notice>}
        <button className="btn btn-md btn-primary w-full" onClick={save} disabled={!repId}>
          <CalendarPlus className="w-4 h-4" />
          {warnings.length ? t('Réserver quand même') : t('Enregistrer')}
        </button>
      </div>
    </Drawer>
  )
}
