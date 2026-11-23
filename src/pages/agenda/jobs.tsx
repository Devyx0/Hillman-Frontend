/**
 * Agenda production pieces: job drawer (jour de travaux), "Planifier" drawer (work days linked to a
 * signed quote), rep absences, the "À planifier" and absences panels, and the Gouttières work order
 * (bon de travail).
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Ban, CalendarCheck2, CalendarRange, CalendarX2, ClipboardList, CloudRain, FilePenLine, ImageIcon, MapPin, Package, Pencil, Phone, Printer, Trash2 } from 'lucide-react'
import { Badge, Card, CompanyBadge, Drawer, Empty, Field, RepAvatar } from '../../components/ui'
import { NoAccess, Notice, confirmAction } from '../../components/states'
import { Select } from '../../components/filters'
import { inScope, useApp } from '../../context/AppContext'
import { useAuth } from '../../auth/AuthContext'
import { APPOINTMENTS, clientById, companyById, fullName, repById, type Quote, type Tone } from '../../data/mock'
import { quoteById, quoteByNo, useStore } from '../../data/store'
import { colourLine, getDraft } from '../../data/quote-builder'
import { AnnotatedPhoto, orderPhotos } from '../../components/AnnotatedPhoto'
import {
  jobHasDeposit,
  ABSENCES,
  ABSENCE_REASONS,
  MATERIAL_STATUSES,
  addAbsence,
  dayDate,
  dayFromIso,
  dayIso,
  jobQuote,
  removeAbsence,
  scheduleJob,
  unscheduleJob,
  unscheduledWork,
  updateAbsence,
  type Absence,
  type JobRecord,
  type UnscheduledItem,
} from '../../data/calendar'
import { toast } from '../../lib/toast'
import { cn, formatHour, money } from '../../lib/utils'
import { locale, t } from '../../i18n'
import { AGENDA_REPS, TODAY_INDEX } from './calendar'

/** "lun. 21 oct." */
export const shortDay = (day: number) => dayDate(day).toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'short' })
/** "lun. 21 oct. → mar. 22 oct. · 2 jours" */
export const dayRange = (start: number, days: number) => (days > 1 ? `${shortDay(start)} → ${shortDay(start + days - 1)} · ${t('{n} jours', { n: days })}` : shortDay(start))

const STAGE_TONE: Record<string, Tone> = { 'À planifier': 'warn', Planifié: 'info', 'En cours': 'accent', Terminé: 'good', Facturé: 'neutral', Payé: 'good' }
const MATERIAL_TONE: Record<string, Tone> = { 'À commander': 'critical', Commandés: 'warn', Livrés: 'good' }

/* ── Job drawer ────────────────────────────────────────────────────────── */

export function JobDrawer({ job, onClose, onSchedule, onWorkOrder }: { job: JobRecord | null; onClose: () => void; onSchedule: (j: JobRecord) => void; onWorkOrder: (j: JobRecord) => void }) {
  const { can } = useAuth()
  useStore()
  if (!job) return null
  const quote = jobQuote(job)
  const remove = async () => {
    const ok = await confirmAction({ title: t('Retirer ce travail du calendrier?'), body: t('{client} · {no} retourne dans « À planifier ».', { client: job.client, no: job.quoteNo }), confirmLabel: t('Retirer'), danger: true })
    if (!ok) return
    unscheduleJob(job.id)
    toast(t('Travail retiré du calendrier'))
    onClose()
  }
  return (
    <Drawer
      open
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <CalendarRange className="w-4 h-4" />
          {t('Jour de travaux')}
        </span>
      }
    >
      <div className="p-5 space-y-5">
        <div className={cn('rounded-xl p-4 border-l-4', companyById(job.company).tone)}>
          <p className="text-lg font-semibold">
            {job.client} · {job.quoteNo}
          </p>
          <p className="text-sm mt-1">{t(job.work)}</p>
          {job.startDay !== undefined && (
            <p className="text-sm mt-1 flex items-center gap-1.5">
              <CalendarRange className="w-4 h-4" />
              {dayRange(job.startDay, job.days)}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <CompanyBadge id={job.company} />
          <Badge tone={STAGE_TONE[job.stage] ?? 'neutral'} dot>
            {t(job.stage)}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="label-caps mb-1">{t('Ville')}</p>
            <p className="font-semibold text-ink flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-ink-mute" />
              {job.city}
            </p>
          </div>
          <div>
            <p className="label-caps mb-1">{t('Matériaux')}</p>
            <Badge tone={MATERIAL_TONE[job.materials] ?? 'neutral'}>{t(job.materials)}</Badge>
          </div>
          {jobHasDeposit(job) && (
            <div>
              <p className="label-caps mb-1">{t('Dépôt')}</p>
              <Badge tone={job.deposit ? 'good' : 'warn'}>{job.deposit ? t('Reçu') : t('Non reçu')}</Badge>
            </div>
          )}
          {job.weather && (
            <div className="col-span-2">
              <p className="label-caps mb-1">{t('Météo')}</p>
              <p className="text-ink-secondary flex items-center gap-1.5">
                <CloudRain className="w-4 h-4 text-ink-mute" />
                {t(job.weather)}
              </p>
            </div>
          )}
          {job.notes && (
            <div className="col-span-2">
              <p className="label-caps mb-1">{t('Notes')}</p>
              <p className="text-ink-secondary whitespace-pre-line">{job.notes}</p>
            </div>
          )}
        </div>
        {quote ? (
          <Link to={`/soumissions/${quote.id}`} className="flex items-center gap-3 rounded-lg border border-hairline p-3 hover:border-primary">
            <FilePenLine className="w-5 h-5 text-ink-mute" />
            <p className="min-w-0 flex-1 text-sm font-semibold text-ink truncate">
              {t('Ouvrir la soumission')} {quote.no}
            </p>
            <span className="text-sm font-semibold tnum">{money(quote.amount, false)}</span>
          </Link>
        ) : (
          <p className="text-xs text-ink-mute">{t('Soumission {no} (historique, non disponible dans la démo)', { no: job.quoteNo })}</p>
        )}
        <div className="flex flex-wrap gap-2 pt-3 border-t border-hairline">
          {job.company === 'sg' && (
            <button className="btn btn-sm btn-secondary" onClick={() => onWorkOrder(job)}>
              <ClipboardList className="w-4 h-4" />
              {t('Bon de travail')}
            </button>
          )}
          {can('jobs.schedule') && (
            <>
              <button className="btn btn-sm btn-secondary" onClick={() => onSchedule(job)}>
                <Pencil className="w-4 h-4" />
                {t('Modifier la planification')}
              </button>
              <button className="btn btn-sm btn-ghost hover:text-tone-critical-ink" onClick={remove}>
                <CalendarX2 className="w-4 h-4" />
                {t('Retirer du calendrier')}
              </button>
            </>
          )}
        </div>
      </div>
    </Drawer>
  )
}

/* ── Schedule drawer ───────────────────────────────────────────────────── */

export type ScheduleTarget = { job?: JobRecord; quote?: Quote }

const defaultDays = (company: string) => (company === 'toit' ? 2 : company === 'reno' ? 5 : 1)

export function ScheduleDrawer({ target, onClose, onSaved }: { target: ScheduleTarget | null; onClose: () => void; onSaved: (j: JobRecord) => void }) {
  if (!target) return null
  return <ScheduleForm target={target} onClose={onClose} onSaved={onSaved} />
}

function ScheduleForm({ target, onClose, onSaved }: { target: ScheduleTarget; onClose: () => void; onSaved: (j: JobRecord) => void }) {
  const { can } = useAuth()
  const { job, quote } = target
  const company = job?.company ?? quote!.company
  const [days, setDays] = useState(job?.days ?? defaultDays(company))
  const [start, setStart] = useState(dayIso(job?.startDay ?? TODAY_INDEX + 1))
  const [weather, setWeather] = useState(job?.weather ?? '')
  const [materials, setMaterials] = useState(job?.materials ?? 'À commander')
  const [deposit, setDeposit] = useState(job?.deposit ?? false)
  const [notes, setNotes] = useState(job?.notes ?? '')
  const title = job ? `${job.client} · ${job.quoteNo}` : `${fullName(clientById(quote!.clientId)!)} · ${quote!.no}`
  const startDay = start ? dayFromIso(start) : TODAY_INDEX

  const save = () => {
    const saved = scheduleJob({ jobId: job?.id, quoteId: quote?.id, startDay, days, weather, materials, deposit, notes })
    if (!saved) return
    toast(t('{client} planifié · {when}', { client: saved.client, when: shortDay(startDay) }))
    onSaved(saved)
    onClose()
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <CalendarCheck2 className="w-4 h-4" />
          {job?.startDay !== undefined ? t('Modifier la planification') : t('Planifier les travaux')}
        </span>
      }
    >
      {!can('jobs.schedule') ? (
        <NoAccess>{t('Seuls les administrateurs et la coordonnatrice peuvent planifier les travaux.')}</NoAccess>
      ) : (
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <CompanyBadge id={company} />
            <p className="text-sm font-semibold text-ink">{title}</p>
          </div>
          <p className="text-xs text-ink-mute -mt-2">{t(job?.work ?? quote!.workType)}</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('Début')}>
              <input type="date" className="form-input" value={start} onChange={(e) => setStart(e.target.value)} />
            </Field>
            <Field label={t('Nombre de jours')}>
              <input type="number" min={1} max={30} className="form-input tnum" value={days} onChange={(e) => setDays(Math.max(1, Math.min(30, Number(e.target.value) || 1)))} />
            </Field>
          </div>
          {start && <p className="text-xs text-ink-mute -mt-2">{dayRange(startDay, days)}</p>}
          <Field label={t('Météo')}>
            <input className="form-input" value={weather} placeholder={t('Ex. : Pluie 60 % jeudi — prévoir bâches')} onChange={(e) => setWeather(e.target.value)} />
          </Field>
          <Field label={t('Matériaux')}>
            <Select value={materials} onChange={setMaterials} options={MATERIAL_STATUSES.map((m) => ({ value: m, label: t(m) }))} />
          </Field>
          {/* Gutters: 100 % at the end of the work, no deposit to track. */}
          {jobHasDeposit({ quoteNo: job?.quoteNo ?? quote!.no, company }) && (
            <>
              <label className="flex items-center gap-2 text-sm text-ink-secondary">
                <input type="checkbox" checked={deposit} onChange={(e) => setDeposit(e.target.checked)} className="accent-[var(--color-primary)]" />
                {t('Dépôt reçu')}
              </label>
              {!deposit && <p className="text-xs text-tone-warn-ink -mt-2">{t('Le dépôt n’est pas encore reçu.')}</p>}
            </>
          )}
          <Field label={t('Notes de planification')}>
            <textarea rows={3} className="form-input h-auto py-2.5" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('Accès, stationnement, chien, code de porte…')} />
            <span className="text-xs text-ink-mute">{t('Imprimées sur le bon de travail.')}</span>
          </Field>
          <button className="btn btn-md btn-primary w-full" disabled={!start} onClick={save}>
            <CalendarCheck2 className="w-4 h-4" />
            {t('Planifier')}
          </button>
        </div>
      )}
    </Drawer>
  )
}

/* ── Absences ──────────────────────────────────────────────────────────── */

const hhmm = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`
const fromHhmm = (s: string) => {
  const [h, m] = s.split(':').map(Number)
  return h + (m || 0) / 60
}

const absenceRepName = (a: Pick<Absence, 'repId'>) => repById(a.repId)?.name ?? a.repId

/** Create or edit an absence. `editing === 'new'` opens an empty form. */
export function AbsenceDrawer({ editing, onClose }: { editing: Absence | 'new' | null; onClose: () => void }) {
  if (!editing) return null
  return <AbsenceForm key={editing === 'new' ? 'new' : editing.id} editing={editing === 'new' ? undefined : editing} onClose={onClose} />
}

function AbsenceForm({ editing, onClose }: { editing?: Absence; onClose: () => void }) {
  const { user, can } = useAuth()
  const { scope } = useApp()
  const manager = can('jobs.schedule') || can('calendar.allReps')
  const repOptions = AGENDA_REPS.filter((r) => (manager ? r.company === 'all' || inScope(scope, r.company) || r.id === editing?.repId : r.id === user?.repId))
  const [repId, setRepId] = useState(editing?.repId ?? (repOptions.find((r) => r.id === user?.repId) ?? repOptions[0])?.id ?? '')
  const [reason, setReason] = useState(editing?.reason ?? 'Congé')
  const [start, setStart] = useState(dayIso(editing?.day ?? TODAY_INDEX + 1))
  const [days, setDays] = useState(editing?.days ?? 1)
  const [partial, setPartial] = useState(editing?.start !== undefined)
  const [from, setFrom] = useState(hhmm(editing?.start ?? 8))
  const [to, setTo] = useState(hhmm(editing?.end ?? 12))
  const [note, setNote] = useState(editing?.note ?? '')
  const canEdit = !editing || manager || editing.repId === user?.repId

  const day = start ? dayFromIso(start) : TODAY_INDEX
  const len = partial ? 1 : days
  const affected = APPOINTMENTS.filter((a) => a.repId === repId && a.type !== 'Non dispo' && a.day >= day && a.day < day + len && (!partial || (a.start < fromHhmm(to) && a.end > fromHhmm(from))))

  const save = () => {
    const fields = { repId, reason, day, days: len, start: partial ? fromHhmm(from) : undefined, end: partial ? fromHhmm(to) : undefined, note: note.trim() || undefined }
    if (editing) updateAbsence(editing.id, fields)
    else addAbsence(fields)
    toast(editing ? t('Absence mise à jour') : t('Absence ajoutée · {name}', { name: absenceRepName(fields) }))
    onClose()
  }
  const remove = async () => {
    if (!editing) return
    if (!(await confirmAction({ title: t('Supprimer cette absence?'), body: `${absenceRepName(editing)} · ${dayRange(editing.day, editing.days)}`, confirmLabel: t('Supprimer'), danger: true }))) return
    removeAbsence(editing.id)
    toast(t('Absence supprimée'))
    onClose()
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <Ban className="w-4 h-4" />
          {editing ? t('Absence') : t('Ajouter une absence')}
        </span>
      }
    >
      <div className="p-5 space-y-4">
        <Field label={t('Représentant')}>
          <Select value={repId} onChange={setRepId} disabled={!canEdit || repOptions.length < 2} options={repOptions.map((r) => ({ value: r.id, label: r.name, icon: <RepAvatar id={r.id} size="xs" /> }))} />
        </Field>
        <Field label={t('Motif')}>
          <Select value={reason} onChange={setReason} disabled={!canEdit} options={ABSENCE_REASONS.map((r) => ({ value: r, label: t(r) }))} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('Date')}>
            <input type="date" className="form-input" value={start} disabled={!canEdit} onChange={(e) => setStart(e.target.value)} />
          </Field>
          {!partial && (
            <Field label={t('Nombre de jours')}>
              <input type="number" min={1} max={60} className="form-input tnum" value={days} disabled={!canEdit} onChange={(e) => setDays(Math.max(1, Math.min(60, Number(e.target.value) || 1)))} />
            </Field>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-secondary">
          <input type="checkbox" checked={partial} disabled={!canEdit} onChange={(e) => setPartial(e.target.checked)} className="accent-[var(--color-primary)]" />
          {t('Journée partielle')}
        </label>
        {partial && (
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('De')}>
              <input type="time" step={900} className="form-input" value={from} disabled={!canEdit} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label={t('À')}>
              <input type="time" step={900} className="form-input" value={to} disabled={!canEdit} onChange={(e) => setTo(e.target.value)} />
            </Field>
          </div>
        )}
        <Field label={t('Note')}>
          <input className="form-input" value={note} disabled={!canEdit} onChange={(e) => setNote(e.target.value)} placeholder={t('Facultatif')} />
        </Field>
        <Notice tone="info">{t('Affiché comme « Non dispo » dans le calendrier : aucune réservation possible sans avertissement.')}</Notice>
        {affected.length > 0 && (
          <Notice>
            {t('{n} rendez-vous déjà prévus pendant cette absence — à déplacer :', { n: affected.length })}
            <ul className="list-disc pl-4 mt-1">
              {affected.map((a) => (
                <li key={a.id}>
                  {shortDay(a.day)} {formatHour(a.start)} · {a.city || t(a.title)}
                </li>
              ))}
            </ul>
          </Notice>
        )}
        {partial && fromHhmm(to) <= fromHhmm(from) && <Notice tone="critical">{t('L’heure de fin doit être après l’heure de début.')}</Notice>}
        {canEdit && (
          <div className="flex gap-2">
            <button className="btn btn-md btn-primary flex-1" disabled={!repId || !start || (partial && fromHhmm(to) <= fromHhmm(from))} onClick={save}>
              <Ban className="w-4 h-4" />
              {t('Enregistrer')}
            </button>
            {editing && (
              <button className="btn btn-md btn-ghost hover:text-tone-critical-ink" onClick={remove}>
                <Trash2 className="w-4 h-4" />
                {t('Supprimer')}
              </button>
            )}
          </div>
        )}
      </div>
    </Drawer>
  )
}

/* ── Panels under the calendar ─────────────────────────────────────────── */

export function UnscheduledPanel({ onPlan }: { onPlan: (target: ScheduleTarget) => void }) {
  useStore()
  const { scope } = useApp()
  const [all, setAll] = useState(false)
  const items = unscheduledWork((c) => inScope(scope, c))
  const shown = all ? items : items.slice(0, 6)
  const plan = (i: UnscheduledItem) => onPlan(i.job ? { job: i.job } : { quote: quoteById(i.quote!.id) })
  return (
    <Card title={t('À planifier')} icon={CalendarCheck2} pad={false} actions={<span className="text-xs text-ink-mute tnum">{items.length}</span>}>
      {items.length === 0 ? (
        <Empty icon={CalendarCheck2} title={t('Tout est planifié')}>
          {t('Les soumissions signées apparaîtront ici pour être planifiées au calendrier.')}
        </Empty>
      ) : (
        <ul className="divide-y divide-hairline">
          {shown.map((i) => (
            <li key={i.key} className="px-4 py-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink truncate flex items-center gap-2">
                  <CompanyBadge id={i.company} />
                  <span className="truncate">
                    {i.client} · {i.quoteNo}
                  </span>
                </p>
                <p className="text-xs text-ink-mute truncate mt-0.5">
                  {i.city} · {t(i.work)} · <span className="tnum">{money(i.amount, false)}</span>
                  {i.quote && <> · {t('Signé')}</>}
                </p>
              </div>
              <button className="btn btn-xs btn-secondary shrink-0" onClick={() => plan(i)}>
                {t('Planifier')}
              </button>
            </li>
          ))}
        </ul>
      )}
      {items.length > 6 && (
        <button className="w-full py-2.5 text-xs font-semibold text-primary-press border-t border-hairline hover:bg-sand/60" onClick={() => setAll((v) => !v)}>
          {all ? t('Voir moins') : t('Voir les {n} travaux', { n: items.length })}
        </button>
      )}
    </Card>
  )
}

/** Rep absences in the displayed range (Hélène's overview). */
export function AbsencesPanel({ from, to, repIds, onOpen, onAdd }: { from: number; to: number; repIds: string[]; onOpen: (a: Absence) => void; onAdd: () => void }) {
  useStore()
  const list = ABSENCES.filter((a) => a.day <= to && a.day + a.days - 1 >= from && repIds.includes(a.repId)).sort((a, b) => a.day - b.day)
  return (
    <Card
      title={t('Absences')}
      icon={Ban}
      pad={false}
      actions={
        <button className="btn btn-xs btn-quiet" onClick={onAdd}>
          {t('Ajouter')}
        </button>
      }
    >
      {list.length === 0 ? (
        <Empty icon={Ban} title={t('Aucune absence pour cette période')} />
      ) : (
        <ul className="divide-y divide-hairline">
          {list.map((a) => {
            return (
              <li key={a.id}>
                <button className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-sand/60" onClick={() => onOpen(a)}>
                  {repById(a.repId) ? <RepAvatar id={a.repId} /> : <span className="w-6 h-6 rounded-full bg-sand shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink truncate">{absenceRepName(a)}</p>
                    <p className="text-xs text-ink-mute truncate">
                      {t(a.reason)} · {dayRange(a.day, a.days)}
                      {a.start !== undefined && ` · ${formatHour(a.start)} – ${formatHour(a.end ?? a.start)}`}
                    </p>
                    {a.note && <p className="text-xs text-ink-mute truncate">{a.note}</p>}
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

/* ── Gouttières work order ─────────────────────────────────────────────── */

/**
 * Quantities for the work order (no prices). For a job linked to a quote: the builder's quantities list
 * (`getDraft(q).costs`, the same list as the Quantités tab and the builder's Bon de travail,
 * computed live from the gutter form by `gutterLines()`). Jobs without a quote fall back to an estimate
 * parsed from the job description.
 */
function workOrderLines(job: JobRecord) {
  const q = quoteByNo(job.quoteNo)
  if (q) {
    // Same list as the builder's Quantités / Bon de travail: derived from the gutter form (+ tier, chosen
    // add-ons, the rep's overrides) by withGutterCosts() in data/quote-builder.ts.
    const costs = getDraft(q).costs
    if (costs.length) return costs.map((l) => ({ item: t(l.item), qty: l.qty, unit: t(l.unit) }))
  }
  if (job.company !== 'sg') return []
  const size = q?.gutterSize ?? 5
  const feet = Number(/(\d+)\s*pi/.exec(job.work)?.[1]) || Math.max(40, Math.round(job.amount / 22 / 5) * 5)
  const guard = /T-Rex|DoublePro|Pare-feuilles|5300/i.exec(job.work)?.[0]
  const cleaning = /Nettoyage/i.test(job.work)
  if (cleaning) return [{ item: t('Nettoyage des gouttières'), qty: feet, unit: t('pi lin.') }, { item: t('Vidange des descentes'), qty: Math.max(2, Math.round(feet / 35)), unit: t('unités') }]
  const lines = [
    { item: t('Gouttières aluminium {n} po sans joint', { n: size }), qty: feet, unit: t('pi lin.') },
    { item: t('Tuyaux de descente 2 × 3'), qty: Math.round(feet * 0.34), unit: t('pi lin.') },
    { item: t('Coudes A / B'), qty: Math.max(4, Math.round(feet / 12)), unit: t('unités') },
    { item: t('Bouchons et sorties'), qty: Math.max(2, Math.round(feet / 35)), unit: t('unités') },
    { item: t('Crochets vissés aux 24 po'), qty: Math.ceil(feet / 2), unit: t('unités') },
  ]
  if (guard) lines.push({ item: t('Protège-gouttières {model}', { model: job.work.split('·')[0].trim() }), qty: feet, unit: t('pi lin.') })
  return lines
}

export function WorkOrderDrawer({ job, onClose }: { job: JobRecord | null; onClose: () => void }) {
  useStore()
  if (!job) return null
  const company = companyById(job.company)
  const quote = jobQuote(job)
  const client = quote ? clientById(quote.clientId) : undefined
  const rep = quote ? repById(quote.repId) : undefined
  const lines = workOrderLines(job)
  const draft = quote ? getDraft(quoteById(quote.id)!) : undefined
  return (
    <Drawer
      open
      onClose={onClose}
      width="max-w-3xl"
      title={
        <span className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4" />
          {t('Bon de travail')}
        </span>
      }
    >
      <style>{`@media print { body * { visibility: hidden !important; } #work-order, #work-order * { visibility: visible !important; } #work-order { position: absolute; inset: 0 auto auto 0; width: 100%; padding: 24px; } .no-print { display: none !important; } }`}</style>
      <div className="no-print px-5 py-3 border-b border-hairline flex flex-wrap gap-2 items-center">
        <button className="btn btn-sm btn-primary" onClick={() => window.print()}>
          <Printer className="w-4 h-4" />
          {t('Imprimer / PDF')}
        </button>
      </div>
      <div id="work-order" className="p-5 sm:p-8 space-y-6 text-sm text-ink">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline pb-4">
          <div>
            <p className="text-lg font-bold">{company.name}</p>
            <p className="text-xs text-ink-mute">
              {company.phone} · RBQ {company.rbq}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">{t('Bon de travail')}</p>
            <p className="text-xs text-ink-mute tnum">
              BT-{job.quoteNo} · {t('Soumission {no}', { no: job.quoteNo })}
            </p>
          </div>
        </header>
        <section className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="label-caps mb-1">{t('Client')}</p>
            <p className="font-semibold">{client ? (client.company ?? fullName(client)) : job.client}</p>
            {client?.company && <p className="text-ink-secondary">{t('Contact sur place : {name}', { name: fullName(client) })}</p>}
            <p className="flex items-center gap-1.5 text-ink-secondary">
              <MapPin className="w-3.5 h-3.5 text-ink-mute" />
              {client ? `${client.no}, ${client.street}, ${client.city} ${client.postal}` : `${job.city}, QC`}
            </p>
            {client && (
              <p className="flex items-center gap-1.5 text-ink-secondary">
                <Phone className="w-3.5 h-3.5 text-ink-mute" />
                {[client.phone, client.mobile].filter(Boolean).join(' · ')}
              </p>
            )}
            {rep && <p className="text-xs text-ink-mute mt-1">{t('Estimateur : {name}', { name: rep.name })}</p>}
          </div>
          <div>
            <p className="label-caps mb-1">{t('Date des travaux')}</p>
            <p className="font-semibold flex items-center gap-1.5">
              <CalendarRange className="w-3.5 h-3.5 text-ink-mute" />
              {job.startDay !== undefined ? dayRange(job.startDay, job.days) : t('Date à confirmer')}
            </p>
          </div>
        </section>
        <section>
          <p className="label-caps mb-2">{t('Travaux')}</p>
          <p className="font-semibold mb-1">{t(job.work)}</p>
          {job.company === 'sg' && draft && <p className="font-semibold text-ink mb-2">{colourLine(draft.gutter, t)}</p>}
          <table className="w-full text-sm border border-hairline rounded-lg overflow-hidden">
            <thead className="bg-sand text-left">
              <tr>
                <th className="px-3 py-2 label-caps">{t('Article')}</th>
                <th className="px-3 py-2 label-caps text-right w-24">{t('Quantité')}</th>
                <th className="px-3 py-2 label-caps w-24">{t('Unité')}</th>
                <th className="px-3 py-2 label-caps w-16 text-center">✓</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {lines.map((l, i) => (
                <tr key={i}>
                  <td className="px-3 py-2">{l.item}</td>
                  <td className="px-3 py-2 text-right tnum font-semibold">{l.qty}</td>
                  <td className="px-3 py-2 text-ink-mute">{l.unit}</td>
                  <td className="px-3 py-2 text-center">
                    <span className="inline-block w-4 h-4 border border-hairline-strong rounded-sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-ink-mute mt-1.5">{t('Aucun prix sur ce document. Quantités à valider sur place.')}</p>
        </section>
        <section className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="label-caps mb-1">{t('Matériaux')}</p>
            <p className="flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-ink-mute" />
              {t(job.materials)}
            </p>
            {job.weather && (
              <p className="flex items-center gap-1.5 mt-1">
                <CloudRain className="w-3.5 h-3.5 text-ink-mute" />
                {t(job.weather)}
              </p>
            )}
          </div>
          <div>
            <p className="label-caps mb-1">{t('Note pour le bon de travail')}</p>
            {/* Only the quote's work order note and the office's scheduling note: internal sales notes never go on the work order. */}
            <p className="whitespace-pre-line text-ink-secondary">{draft?.workOrderNote ? t(draft.workOrderNote) : t("Aucune note de l'estimateur pour ce chantier.")}</p>
            {job.notes && <p className="whitespace-pre-line text-ink-secondary mt-1.5">{t(job.notes)}</p>}
          </div>
        </section>
        <section>
          <p className="label-caps mb-2">{t('Photos annotées')}</p>
          {(() => {
            const shots = draft ? orderPhotos(draft.photos.filter((p) => p.annotated || p.src)) : []
            return shots.length ? (
              <div className="grid grid-cols-3 gap-3">
                {shots.slice(0, 6).map((p) => (
                  <figure key={p.id}>
                    <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-stone">
                      <AnnotatedPhoto photo={p} />
                    </div>
                    <figcaption className="text-2xs text-ink-mute mt-0.5 truncate">
                      {t(p.label)}
                      {p.main ? ` · ${t('Photo principale')}` : ''}
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="aspect-[4/3] rounded-lg border border-dashed border-hairline-strong bg-sand/50 flex flex-col items-center justify-center gap-1 text-xs text-ink-mute">
                    <ImageIcon className="w-5 h-5" />
                    {t('Photo {n}', { n })}
                  </div>
                ))}
              </div>
            )
          })()}
        </section>
        <section className="grid sm:grid-cols-2 gap-6 pt-6">
          <div className="border-t border-ink pt-1.5 text-xs text-ink-mute">{t('Travaux complétés — signature')}</div>
          <div className="border-t border-ink pt-1.5 text-xs text-ink-mute">{t('Date')}</div>
        </section>
      </div>
    </Drawer>
  )
}
