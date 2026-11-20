/**
 * Agenda production pieces: job drawer, "Planifier" drawer (crew scheduling), absences,
 * the "À planifier" and absences panels, and the Gouttières work order (bon de travail).
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Ban, CalendarCheck2, CalendarRange, CalendarX2, ClipboardList, CloudRain, FilePenLine, HardHat, ImageIcon, MapPin, Package, Pencil, Phone, Printer, Send, Trash2, Wallet } from 'lucide-react'
import { Badge, Card, CompanyBadge, Drawer, Empty, Field, RepAvatar } from '../../components/ui'
import { NoAccess, Notice, confirmAction } from '../../components/states'
import { Select } from '../../components/filters'
import { inScope, useApp } from '../../context/AppContext'
import { useAuth } from '../../auth/AuthContext'
import { APPOINTMENTS, clientById, companyById, fullName, repById, type Quote, type Tone } from '../../data/mock'
import { quoteById, quoteByNo, useStore } from '../../data/store'
import { getDraft } from '../../data/quote-builder'
import {
  ABSENCES,
  ABSENCE_REASONS,
  CREWS,
  MATERIAL_STATUSES,
  addAbsence,
  crewById,
  crewConflicts,
  dayDate,
  dayFromIso,
  dayIso,
  firstFreeDay,
  jobQuote,
  removeAbsence,
  scheduleJob,
  unscheduleJob,
  unscheduledWork,
  updateAbsence,
  updateJob,
  type Absence,
  type JobRecord,
  type UnscheduledItem,
} from '../../data/crews'
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
  const crew = crewById(job.crewId)
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
          <HardHat className="w-4 h-4" />
          {t('Jour de travaux')}
        </span>
      }
    >
      <div className="p-5 space-y-5">
        <div className={cn('rounded-xl p-4 border-l-4', crew ? `bg-${crew.color} text-${crew.color}-ink border-${crew.color}-ink` : 'bg-sand text-ink border-hairline-strong')}>
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
          {job.workOrderSentAt && <Badge tone="good">{t('Bon de travail envoyé')}</Badge>}
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="label-caps mb-1">{t('Équipe')}</p>
            <p className="font-semibold text-ink">{crew ? t(crew.name) : '—'}</p>
            {crew && <p className="text-xs text-ink-mute">{t('Chef : {name}', { name: crew.lead })}</p>}
          </div>
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
          <div>
            <p className="label-caps mb-1">{t('Dépôt')}</p>
            <Badge tone={job.deposit ? 'good' : 'warn'}>{job.deposit ? t('Reçu') : t('Non reçu')}</Badge>
          </div>
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
          {can('crews.schedule') && (
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
  const crews = CREWS.filter((c) => c.active && c.company === company)
  const initialCrew = job?.crewId && crewById(job.crewId)?.active ? job.crewId : (crews[0]?.id ?? '')
  const initialDays = job?.days ?? defaultDays(company)
  const [crewId, setCrewId] = useState(initialCrew)
  const [days, setDays] = useState(initialDays)
  const [start, setStart] = useState(dayIso(job?.startDay ?? (initialCrew ? firstFreeDay(initialCrew, initialDays, TODAY_INDEX + 1, job?.id) : TODAY_INDEX + 1)))
  const [weather, setWeather] = useState(job?.weather ?? '')
  const [materials, setMaterials] = useState(job?.materials ?? 'À commander')
  const [deposit, setDeposit] = useState(job?.deposit ?? false)
  const [notes, setNotes] = useState(job?.notes ?? '')
  const title = job ? `${job.client} · ${job.quoteNo}` : `${fullName(clientById(quote!.clientId)!)} · ${quote!.no}`
  const startDay = start ? dayFromIso(start) : TODAY_INDEX
  const conflicts = crewId ? crewConflicts(crewId, startDay, days, job?.id) : { jobs: [], absences: [] }
  const hasConflict = conflicts.jobs.length + conflicts.absences.length > 0

  const save = () => {
    const saved = scheduleJob({ jobId: job?.id, quoteId: quote?.id, crewId, startDay, days, weather, materials, deposit, notes })
    if (!saved) return
    toast(t('{client} planifié · {crew}, {when}', { client: saved.client, crew: t(crewById(crewId)!.name), when: shortDay(startDay) }))
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
      {!can('crews.schedule') ? (
        <NoAccess>{t('Seuls les administrateurs et la coordonnatrice peuvent planifier les équipes.')}</NoAccess>
      ) : (
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <CompanyBadge id={company} />
            <p className="text-sm font-semibold text-ink">{title}</p>
          </div>
          <p className="text-xs text-ink-mute -mt-2">{t(job?.work ?? quote!.workType)}</p>
          {crews.length === 0 ? (
            <Notice>{t('Aucune équipe active pour cette compagnie. Ajoutez-en une dans Paramètres → Équipes.')}</Notice>
          ) : (
            <Field label={t('Équipe')}>
              <Select
                value={crewId}
                onChange={setCrewId}
                options={crews.map((c) => ({ value: c.id, label: `${t(c.name)} · ${c.lead}`, icon: <span className={cn('w-2.5 h-2.5 rounded-full', `bg-${c.color}-ink`)} /> }))}
              />
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('Début')}>
              <input type="date" className="form-input" value={start} onChange={(e) => setStart(e.target.value)} />
            </Field>
            <Field label={t('Nombre de jours')}>
              <input type="number" min={1} max={30} className="form-input tnum" value={days} onChange={(e) => setDays(Math.max(1, Math.min(30, Number(e.target.value) || 1)))} />
            </Field>
          </div>
          {start && <p className="text-xs text-ink-mute -mt-2">{dayRange(startDay, days)}</p>}
          {hasConflict && (
            <Notice>
              <p className="font-semibold">{t('Conflit avec l’horaire de l’équipe :')}</p>
              <ul className="list-disc pl-4 mt-1 space-y-0.5">
                {conflicts.jobs.map((j) => (
                  <li key={j.id}>
                    {j.client} · {j.quoteNo} ({dayRange(j.startDay!, j.days)})
                  </li>
                ))}
                {conflicts.absences.map((a) => (
                  <li key={a.id}>
                    {t('Non dispo')} · {t(a.reason)} ({dayRange(a.day, a.days)})
                  </li>
                ))}
              </ul>
              {crewId && (
                <button className="underline mt-1.5 font-semibold" onClick={() => setStart(dayIso(firstFreeDay(crewId, days, startDay, job?.id)))}>
                  {t('Prendre la prochaine date libre')}
                </button>
              )}
            </Notice>
          )}
          <Field label={t('Météo')}>
            <input className="form-input" value={weather} placeholder={t('Ex. : Pluie 60 % jeudi — prévoir bâches')} onChange={(e) => setWeather(e.target.value)} />
          </Field>
          <Field label={t('Matériaux')}>
            <Select value={materials} onChange={setMaterials} options={MATERIAL_STATUSES.map((m) => ({ value: m, label: t(m) }))} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-ink-secondary">
            <input type="checkbox" checked={deposit} onChange={(e) => setDeposit(e.target.checked)} className="accent-[var(--color-primary)]" />
            {t('Dépôt reçu')}
          </label>
          {!deposit && <p className="text-xs text-tone-warn-ink -mt-2">{t('Le dépôt n’est pas encore reçu.')}</p>}
          <Field label={t('Notes pour l’équipe')}>
            <textarea rows={3} className="form-input h-auto py-2.5" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('Accès, stationnement, chien, code de porte…')} />
          </Field>
          <button className="btn btn-md btn-primary w-full" disabled={!crewId || !start} onClick={save}>
            <CalendarCheck2 className="w-4 h-4" />
            {hasConflict ? t('Planifier quand même') : t('Planifier')}
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

export function absenceTargetName(a: Pick<Absence, 'target' | 'targetId'>) {
  return a.target === 'rep' ? (repById(a.targetId)?.name ?? a.targetId) : t(crewById(a.targetId)?.name ?? a.targetId)
}

/** Create or edit an absence. `editing === 'new'` opens an empty form. */
export function AbsenceDrawer({ editing, onClose }: { editing: Absence | 'new' | null; onClose: () => void }) {
  if (!editing) return null
  return <AbsenceForm key={editing === 'new' ? 'new' : editing.id} editing={editing === 'new' ? undefined : editing} onClose={onClose} />
}

function AbsenceForm({ editing, onClose }: { editing?: Absence; onClose: () => void }) {
  const { user, can } = useAuth()
  const { scope } = useApp()
  const manager = can('crews.schedule') || can('calendar.allReps')
  const repOptions = AGENDA_REPS.filter((r) => (manager ? r.company === 'all' || inScope(scope, r.company) || r.id === editing?.targetId : r.id === user?.repId))
  const crewOptions = can('crews.schedule') ? CREWS.filter((c) => c.active && (inScope(scope, c.company) || c.id === editing?.targetId)) : []
  const [target, setTarget] = useState<'rep' | 'crew'>(editing?.target ?? 'rep')
  const [targetId, setTargetId] = useState(editing?.targetId ?? (repOptions.find((r) => r.id === user?.repId) ?? repOptions[0])?.id ?? '')
  const [reason, setReason] = useState(editing?.reason ?? 'Congé')
  const [start, setStart] = useState(dayIso(editing?.day ?? TODAY_INDEX + 1))
  const [days, setDays] = useState(editing?.days ?? 1)
  const [partial, setPartial] = useState(editing?.start !== undefined)
  const [from, setFrom] = useState(hhmm(editing?.start ?? 8))
  const [to, setTo] = useState(hhmm(editing?.end ?? 12))
  const [note, setNote] = useState(editing?.note ?? '')
  const canEdit = !editing || manager || (editing.target === 'rep' && editing.targetId === user?.repId)

  const day = start ? dayFromIso(start) : TODAY_INDEX
  const len = partial ? 1 : days
  const affected =
    target === 'rep'
      ? APPOINTMENTS.filter((a) => a.repId === targetId && a.type !== 'Non dispo' && a.day >= day && a.day < day + len && (!partial || (a.start < fromHhmm(to) && a.end > fromHhmm(from))))
      : []
  const crewJobs = target === 'crew' && targetId ? crewConflicts(targetId, day, len).jobs : []

  const switchTarget = (v: 'rep' | 'crew') => {
    setTarget(v)
    setTargetId(v === 'rep' ? (repOptions[0]?.id ?? '') : (crewOptions[0]?.id ?? ''))
  }

  const save = () => {
    const fields = { target, targetId, reason, day, days: len, start: partial ? fromHhmm(from) : undefined, end: partial ? fromHhmm(to) : undefined, note: note.trim() || undefined }
    if (editing) updateAbsence(editing.id, fields)
    else addAbsence(fields)
    toast(editing ? t('Absence mise à jour') : t('Absence ajoutée · {name}', { name: absenceTargetName(fields) }))
    onClose()
  }
  const remove = async () => {
    if (!editing) return
    if (!(await confirmAction({ title: t('Supprimer cette absence?'), body: `${absenceTargetName(editing)} · ${dayRange(editing.day, editing.days)}`, confirmLabel: t('Supprimer'), danger: true }))) return
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
        {crewOptions.length > 0 && (
          <div className="inline-flex p-1 bg-sand rounded-lg">
            {(['rep', 'crew'] as const).map((v) => (
              <button key={v} disabled={!canEdit} onClick={() => switchTarget(v)} className={cn('px-3 h-8 rounded-md text-sm font-semibold', target === v ? 'bg-white shadow-card text-ink' : 'text-ink-mute')}>
                {v === 'rep' ? t('Représentant') : t('Équipe')}
              </button>
            ))}
          </div>
        )}
        <Field label={target === 'rep' ? t('Représentant') : t('Équipe')}>
          {target === 'rep' ? (
            <Select value={targetId} onChange={setTargetId} disabled={!canEdit || repOptions.length < 2} options={repOptions.map((r) => ({ value: r.id, label: r.name, icon: <RepAvatar id={r.id} size="xs" /> }))} />
          ) : (
            <Select value={targetId} onChange={setTargetId} disabled={!canEdit} options={crewOptions.map((c) => ({ value: c.id, label: t(c.name), icon: <span className={cn('w-2.5 h-2.5 rounded-full', `bg-${c.color}-ink`)} /> }))} />
          )}
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
        {crewJobs.length > 0 && (
          <Notice>
            {t('Travaux déjà planifiés pour cette équipe — à replanifier :')}
            <ul className="list-disc pl-4 mt-1">
              {crewJobs.map((j) => (
                <li key={j.id}>
                  {j.client} · {j.quoteNo} ({dayRange(j.startDay!, j.days)})
                </li>
              ))}
            </ul>
          </Notice>
        )}
        {partial && fromHhmm(to) <= fromHhmm(from) && <Notice tone="critical">{t('L’heure de fin doit être après l’heure de début.')}</Notice>}
        {canEdit && (
          <div className="flex gap-2">
            <button className="btn btn-md btn-primary flex-1" disabled={!targetId || !start || (partial && fromHhmm(to) <= fromHhmm(from))} onClick={save}>
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
          {t('Les soumissions signées apparaîtront ici pour être planifiées avec une équipe.')}
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

/** Absences in the displayed range, for the reps and crews in scope (Hélène's overview). */
export function AbsencesPanel({ from, to, repIds, onOpen, onAdd }: { from: number; to: number; repIds: string[]; onOpen: (a: Absence) => void; onAdd: () => void }) {
  useStore()
  const { scope } = useApp()
  const list = ABSENCES.filter((a) => a.day <= to && a.day + a.days - 1 >= from)
    .filter((a) => (a.target === 'rep' ? repIds.includes(a.targetId) : inScope(scope, crewById(a.targetId)?.company ?? '')))
    .sort((a, b) => a.day - b.day)
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
            const crew = a.target === 'crew' ? crewById(a.targetId) : undefined
            return (
              <li key={a.id}>
                <button className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-sand/60" onClick={() => onOpen(a)}>
                  {a.target === 'rep' && repById(a.targetId) ? (
                    <RepAvatar id={a.targetId} />
                  ) : (
                    <span className={cn('w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0', crew ? `bg-${crew.color} text-${crew.color}-ink` : 'bg-sand')}>{crew?.code ?? '?'}</span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink truncate">{absenceTargetName(a)}</p>
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
 * Quantities for the crew (no prices). For a job linked to a quote: the builder's quantities list
 * (`getDraft(q).costs`, the same list as the Quantités tab and the builder's Bon de travail,
 * computed live from the gutter form by `gutterLines()`). Jobs without a quote fall back to an estimate
 * parsed from the job description.
 */
export function workOrderLines(job: JobRecord) {
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
  const crew = crewById(job.crewId)
  const company = companyById(job.company)
  const quote = jobQuote(job)
  const client = quote ? clientById(quote.clientId) : undefined
  const rep = quote ? repById(quote.repId) : undefined
  const lines = workOrderLines(job)
  const send = () => {
    updateJob(job.id, { workOrderSentAt: new Date().toISOString() })
    toast(crew ? t('Bon de travail envoyé à {crew} ({lead})', { crew: t(crew.name), lead: crew.lead }) : t('Bon de travail envoyé à l’équipe'))
  }
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
        <button className="btn btn-sm btn-primary" onClick={send}>
          <Send className="w-4 h-4" />
          {t('Envoyer à l’équipe')}
        </button>
        <button className="btn btn-sm btn-secondary" onClick={() => window.print()}>
          <Printer className="w-4 h-4" />
          {t('Imprimer')}
        </button>
        {job.workOrderSentAt && <span className="text-xs text-tone-good-ink">{t('Envoyé le {date}', { date: new Date(job.workOrderSentAt).toLocaleString(locale(), { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) })}</span>}
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
            <p className="font-semibold">{client ? fullName(client) : job.client}</p>
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
            <p className="label-caps mb-1">{t('Équipe et date')}</p>
            <p className="font-semibold">{crew ? t(crew.name) : t('Équipe à confirmer')}</p>
            {crew && (
              <p className="text-ink-secondary">
                {t('Chef : {name}', { name: crew.lead })} · {crew.members.filter((m) => m !== crew.lead).join(', ')}
              </p>
            )}
            <p className="text-ink-secondary flex items-center gap-1.5">
              <CalendarRange className="w-3.5 h-3.5 text-ink-mute" />
              {job.startDay !== undefined ? dayRange(job.startDay, job.days) : t('Date à confirmer')}
            </p>
          </div>
        </section>
        <section>
          <p className="label-caps mb-2">{t('Travaux')}</p>
          <p className="font-semibold mb-2">{t(job.work)}</p>
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
            <p className="flex items-center gap-1.5 mt-1">
              <Wallet className="w-3.5 h-3.5 text-ink-mute" />
              {job.deposit ? t('Dépôt reçu') : t('Dépôt non reçu — ne pas commencer sans l’accord du bureau')}
            </p>
            {job.weather && (
              <p className="flex items-center gap-1.5 mt-1">
                <CloudRain className="w-3.5 h-3.5 text-ink-mute" />
                {t(job.weather)}
              </p>
            )}
          </div>
          <div>
            <p className="label-caps mb-1">{t('Notes')}</p>
            <p className="whitespace-pre-line text-ink-secondary">{job.notes || (quote && getDraft(quoteById(quote.id)!).gutter.note) || t('Protéger l’aménagement paysager. Nettoyer les lieux à la fin des travaux.')}</p>
          </div>
        </section>
        <section>
          <p className="label-caps mb-2">{t('Photos')}</p>
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="aspect-[4/3] rounded-lg border border-dashed border-hairline-strong bg-sand/50 flex flex-col items-center justify-center gap-1 text-xs text-ink-mute">
                <ImageIcon className="w-5 h-5" />
                {t('Photo {n}', { n })}
              </div>
            ))}
          </div>
          <p className="text-xs text-ink-mute mt-1.5">{t('Les photos annotées de la visite s’ajoutent ici.')}</p>
        </section>
        <section className="grid sm:grid-cols-2 gap-6 pt-6">
          <div className="border-t border-ink pt-1.5 text-xs text-ink-mute">{t('Travaux complétés — signature du chef d’équipe')}</div>
          <div className="border-t border-ink pt-1.5 text-xs text-ink-mute">{t('Date')}</div>
        </section>
      </div>
    </Drawer>
  )
}
