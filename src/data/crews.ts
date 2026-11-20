/**
 * Calendar-area data: crews (équipes), job scheduling, absences, appointment extras and the
 * connection of each user's Google / Outlook calendar (mock). Every write calls `commit()` from
 * the store so screens using `useStore()` re-render.
 *
 * Day numbers are absolute day indexes from Sunday 18 October 2026 (0 = dim. 18 oct., 2 = today,
 * 7 = dim. 25 oct.), the same convention as `Appointment.day` and `Job.startDay` in mock.ts.
 */
import { APPOINTMENTS, CLIENTS, JOBS, QUOTES, type Appointment, type CompanyId, type Job, type Quote } from './mock'
import { commit, quoteByNo } from './store'
import { depositStep, quoteSchedule } from './quote-builder'

// ── Dates ───────────────────────────────────────────────────────────────────
/** Day 0 of the mock calendar (Sunday 18 October 2026). */
const BASE = { y: 2026, m: 9, d: 18 }
const pad2 = (n: number) => String(n).padStart(2, '0')

/** Calendar date for a day index. */
export const dayDate = (day: number) => new Date(BASE.y, BASE.m, BASE.d + day, 12)
/** "2026-10-21" for a day index. */
export const dayIso = (day: number) => {
  const d = dayDate(day)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}
/** Day index for "2026-10-21" (or a datetime-local "2026-10-21T09:30"). */
export const dayFromIso = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return Math.round((new Date(y, m - 1, d, 12).getTime() - dayDate(0).getTime()) / 86400000)
}
/** Hour as a decimal from a datetime-local value ("…T13:30" → 13.5). */
export const hourFromIso = (iso: string) => {
  const [h, min] = (iso.split('T')[1] ?? '0:0').split(':').map(Number)
  return h + (min || 0) / 60
}
/** datetime-local value for a day index and decimal hour. */
export const isoAt = (day: number, hour: number) => `${dayIso(day)}T${pad2(Math.floor(hour))}:${pad2(Math.round((hour % 1) * 60))}`

// ── Crews ───────────────────────────────────────────────────────────────────
export interface Crew {
  id: string
  name: string
  /** Two-letter code shown in the calendar band (TA, F1…). */
  code: string
  company: CompanyId
  lead: string
  members: string[]
  /** Palette token: data-1 … data-10. */
  color: string
  phone?: string
  active: boolean
}

export const CREWS: Crew[] = [
  { id: 'ta', name: 'Toitures — équipe A', code: 'TA', company: 'toit', lead: 'Marc-André Roy', members: ['Marc-André Roy', 'Kevin Bédard', 'Samuel Tremblay', 'Jonathan Côté'], color: 'data-5', phone: '418 555-0141', active: true },
  { id: 'tb', name: 'Toitures — équipe B', code: 'TB', company: 'toit', lead: 'Steve Gauthier', members: ['Steve Gauthier', 'Maxime Pelletier', 'Alexis Morin'], color: 'data-10', phone: '418 555-0187', active: true },
  { id: 'f1', name: 'Gouttières F1', code: 'F1', company: 'sg', lead: 'Mathieu Lessard', members: ['Mathieu Lessard', 'Olivier Gingras'], color: 'data-6', phone: '418 555-0122', active: true },
  { id: 'f2', name: 'Gouttières F2', code: 'F2', company: 'sg', lead: 'Yannick Poulin', members: ['Yannick Poulin', 'Félix Bouchard'], color: 'data-1', phone: '418 555-0164', active: true },
  { id: 'm1', name: 'Rénovations M1', code: 'M1', company: 'reno', lead: 'Éric Dufour', members: ['Éric Dufour', 'Luc Fortin', 'Gabriel Vachon', 'Patrick Giroux'], color: 'data-7', phone: '418 555-0199', active: true },
]

export const crewById = (id?: string) => CREWS.find((c) => c.id === id)

export function addCrew(input: Omit<Crew, 'id'>): Crew {
  const crew = { ...input, id: 'cr' + Date.now() }
  CREWS.push(crew)
  commit()
  return crew
}

export function updateCrew(id: string, patch: Partial<Crew>) {
  const c = crewById(id)
  if (c) Object.assign(c, patch)
  commit()
}

/** Deletes a crew. Crews with scheduled jobs should be deactivated instead (`updateCrew(id, { active: false })`). */
export function removeCrew(id: string) {
  const i = CREWS.findIndex((c) => c.id === id)
  if (i >= 0) CREWS.splice(i, 1)
  commit()
}

// ── Jobs (jours de travaux) ─────────────────────────────────────────────────
/** Job + fields the mock `Job` type doesn't carry yet. */
export type JobRecord = Job & {
  /** Quote id when the job was created from a signed quote. */
  quoteId?: string
  notes?: string
  /** When the Gouttières work order was sent to the crew. */
  workOrderSentAt?: string
}

export const MATERIAL_STATUSES = ['À commander', 'Commandés', 'Livrés']
/** Stages of a job; "À planifier" means signed but not on the calendar yet. */
export const JOB_STAGES = ['À planifier', 'Planifié', 'En cours', 'Terminé', 'Facturé', 'Payé']

export const jobById = (id?: string) => JOBS.find((j) => j.id === id) as JobRecord | undefined
export const jobQuote = (j: Job): Quote | undefined => QUOTES.find((q) => q.no === j.quoteNo)
export const isScheduled = (j: Job) => j.startDay !== undefined && !!j.crewId
/** True if the job occupies `day`. */
export const jobOn = (j: Job, day: number) => isScheduled(j) && day >= j.startDay! && day < j.startDay! + j.days

/** "F. Paradis" from a client, like the JOBS seed. */
const shortClient = (clientId: string) => {
  const c = CLIENTS.find((x) => x.id === clientId)
  return c ? (c.company ?? `${c.first[0]}. ${c.last}`) : '—'
}

export interface UnscheduledItem {
  key: string
  job?: JobRecord
  quote?: Quote
  company: CompanyId
  client: string
  city: string
  quoteNo: string
  work: string
  amount: number
}

/** Signed work not on the calendar: JOBS "À planifier" + signed quotes without any job. */
export function unscheduledWork(inScope: (company: CompanyId) => boolean): UnscheduledItem[] {
  const jobs = (JOBS as JobRecord[])
    .filter((j) => !isScheduled(j) && j.stage === 'À planifier' && inScope(j.company))
    .map((j) => ({ key: j.id, job: j, company: j.company, client: j.client, city: j.city, quoteNo: j.quoteNo, work: j.work, amount: j.amount }))
  const withJob = new Set(JOBS.map((j) => j.quoteNo))
  const quotes = QUOTES.filter((q) => q.status === 'Signé' && !withJob.has(q.no) && inScope(q.company)).map((q) => ({
    key: q.id,
    quote: q,
    company: q.company,
    client: shortClient(q.clientId),
    city: q.city,
    quoteNo: q.no,
    work: q.workType,
    amount: q.amount,
  }))
  return [...jobs, ...quotes]
}

export interface ScheduleInput {
  jobId?: string
  quoteId?: string
  crewId: string
  startDay: number
  days: number
  weather?: string
  materials: string
  deposit: boolean
  notes?: string
}

/** Puts a job on a crew's calendar. Updates the job, or creates it from a signed quote. */
export function scheduleJob(input: ScheduleInput): JobRecord | undefined {
  const patch = {
    crewId: input.crewId,
    startDay: input.startDay,
    days: Math.max(1, input.days),
    weather: input.weather || undefined,
    materials: input.materials,
    deposit: input.deposit,
    notes: input.notes || undefined,
  }
  let job = jobById(input.jobId)
  if (job) {
    Object.assign(job, patch, job.stage === 'À planifier' ? { stage: 'Planifié' } : {})
  } else {
    const q = QUOTES.find((x) => x.id === input.quoteId)
    if (!q) return
    job = { id: 'j' + Date.now(), quoteId: q.id, quoteNo: q.no, client: shortClient(q.clientId), city: q.city, company: q.company, amount: q.amount, stage: 'Planifié', work: q.workType, ...patch }
    JOBS.push(job)
  }
  commit()
  return job
}

export function updateJob(id: string, patch: Partial<JobRecord>) {
  const j = jobById(id)
  if (j) Object.assign(j, patch)
  commit()
}

/** Takes a job off the calendar; it goes back to "À planifier". */
export function unscheduleJob(id: string) {
  const j = jobById(id)
  if (!j) return
  j.crewId = undefined
  j.startDay = undefined
  j.stage = 'À planifier'
  commit()
}

// ── Absences ────────────────────────────────────────────────────────────────
export const ABSENCE_REASONS = ['Congé', 'Vacances', 'Maladie', 'Formation', 'Autre']

export interface Absence {
  id: string
  target: 'rep' | 'crew'
  /** Rep id or crew id. */
  targetId: string
  day: number
  /** Number of consecutive days. */
  days: number
  /** Partial day: hours (decimal). Omitted = full day. */
  start?: number
  end?: number
  reason: string
  note?: string
}

export const ABSENCES: Absence[] = [
  { id: 'ab1', target: 'crew', targetId: 'tb', day: 5, days: 1, reason: 'Formation', note: 'Formation SST travail en hauteur' },
  { id: 'ab2', target: 'rep', targetId: 'dps', day: 4, days: 1, reason: 'Congé' },
  { id: 'ab3', target: 'rep', targetId: 'pau', day: 3, days: 1, start: 13, end: 17, reason: 'Autre', note: 'Rendez-vous médical' },
  { id: 'ab4', target: 'crew', targetId: 'f2', day: 8, days: 5, reason: 'Vacances' },
  { id: 'ab5', target: 'rep', targetId: 'plc', day: 9, days: 3, reason: 'Vacances' },
]

export const absenceOn = (a: Absence, day: number) => day >= a.day && day < a.day + a.days
/** Absences touching a day (optionally for one rep or crew). */
export const absencesOn = (day: number, target?: { kind: 'rep' | 'crew'; id: string }) =>
  ABSENCES.filter((a) => absenceOn(a, day) && (!target || (a.target === target.kind && a.targetId === target.id)))

export function addAbsence(input: Omit<Absence, 'id'>): Absence {
  const a = { ...input, id: 'ab' + Date.now() }
  ABSENCES.push(a)
  commit()
  return a
}

export function updateAbsence(id: string, patch: Partial<Absence>) {
  const a = ABSENCES.find((x) => x.id === id)
  if (a) Object.assign(a, patch)
  commit()
}

export function removeAbsence(id: string) {
  const i = ABSENCES.findIndex((x) => x.id === id)
  if (i >= 0) ABSENCES.splice(i, 1)
  commit()
}

// ── Appointments ────────────────────────────────────────────────────────────
/** Appointment + booking details the mock type doesn't carry yet. */
export type AppointmentRecord = Appointment & {
  /** "Confirmation + rappel la veille" (default on). */
  reminder?: boolean
  /** Name, address, phone… typed in the booking form. */
  notes?: string
}

// ── External calendars (Google / Outlook) ───────────────────────────────────
export type CalendarProvider = 'google' | 'outlook'
export const PROVIDER_LABEL: Record<CalendarProvider, string> = { google: 'Google Agenda', outlook: 'Outlook' }

export interface CalendarLink {
  /** Rep id of the user (Account.repId). */
  repId: string
  provider: CalendarProvider
  email: string
  status: 'connecte' | 'erreur'
  /** Local datetime "2026-10-20T07:45". */
  lastSync: string
  error?: string
}

export const CALENDAR_LINKS: CalendarLink[] = [
  { repId: 'jph', provider: 'google', email: 'jp@groupehillman.com', status: 'connecte', lastSync: '2026-10-20T07:45' },
  { repId: 'plc', provider: 'outlook', email: 'pierre-luc@signaturegouttieres.com', status: 'connecte', lastSync: '2026-10-20T06:58' },
  { repId: 'dps', provider: 'google', email: 'dominic.plourde@gmail.com', status: 'erreur', lastSync: '2026-10-14T18:20', error: "L'autorisation a expiré. Reconnectez le compte." },
]

/** Busy time imported from a connected external calendar (titles stay private). */
export interface BusyBlock {
  id: string
  repId: string
  day: number
  start: number
  end: number
}

export const BUSY_BLOCKS: BusyBlock[] = [
  { id: 'bb1', repId: 'jph', day: 3, start: 14, end: 15.5 },
  { id: 'bb2', repId: 'jph', day: 5, start: 8, end: 12 },
  { id: 'bb3', repId: 'plc', day: 4, start: 15, end: 17 },
  { id: 'bb4', repId: 'plc', day: 1, start: 12, end: 13 },
  { id: 'bb5', repId: 'dps', day: 2, start: 15, end: 16 },
]

export const calendarLink = (repId?: string) => CALENDAR_LINKS.find((l) => l.repId === repId)
/** Busy blocks shown/used only while the rep's calendar is connected. */
export const busyBlocksFor = (repId: string) => (calendarLink(repId)?.status === 'connecte' ? BUSY_BLOCKS.filter((b) => b.repId === repId) : [])

const nowLocal = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

export function connectCalendar(repId: string, provider: CalendarProvider, email: string) {
  const existing = calendarLink(repId)
  const link: CalendarLink = { repId, provider, email, status: 'connecte', lastSync: nowLocal() }
  if (existing) Object.assign(existing, link, { error: undefined })
  else CALENDAR_LINKS.push(link)
  if (!BUSY_BLOCKS.some((b) => b.repId === repId)) {
    // Mock import: a couple of busy blocks from the external calendar.
    BUSY_BLOCKS.push({ id: 'bb' + Date.now(), repId, day: 3, start: 15, end: 16.5 }, { id: 'bb' + (Date.now() + 1), repId, day: 4, start: 8, end: 9.5 })
  }
  commit()
}

export function syncCalendar(repId: string) {
  const l = calendarLink(repId)
  if (l) Object.assign(l, { lastSync: nowLocal(), status: 'connecte', error: undefined })
  commit()
}

export function disconnectCalendar(repId: string) {
  const i = CALENDAR_LINKS.findIndex((l) => l.repId === repId)
  if (i >= 0) CALENDAR_LINKS.splice(i, 1)
  commit()
}

// ── Conflicts ───────────────────────────────────────────────────────────────
const overlaps = (s1: number, e1: number, s2: number, e2: number) => s1 < e2 && s2 < e1

/** What already occupies a rep between `start` and `end` on `day`. */
export function repConflicts(repId: string, day: number, start: number, end: number, excludeId?: string) {
  return {
    appointments: (APPOINTMENTS as AppointmentRecord[]).filter((a) => a.repId === repId && a.id !== excludeId && a.day === day && a.type !== 'Non dispo' && overlaps(a.start, a.end, start, end)),
    unavailable: (APPOINTMENTS as AppointmentRecord[]).filter((a) => a.repId === repId && a.id !== excludeId && a.day === day && a.type === 'Non dispo' && overlaps(a.start, a.end, start, end)),
    absences: ABSENCES.filter((a) => a.target === 'rep' && a.targetId === repId && absenceOn(a, day) && overlaps(a.start ?? 0, a.end ?? 24, start, end)),
    busy: busyBlocksFor(repId).filter((b) => b.day === day && overlaps(b.start, b.end, start, end)),
  }
}

/** Jobs and absences of a crew overlapping `days` days from `startDay`. */
export function crewConflicts(crewId: string, startDay: number, days: number, excludeJobId?: string) {
  const end = startDay + Math.max(1, days)
  return {
    jobs: (JOBS as JobRecord[]).filter((j) => j.crewId === crewId && j.id !== excludeJobId && isScheduled(j) && j.startDay! < end && j.startDay! + j.days > startDay),
    absences: ABSENCES.filter((a) => a.target === 'crew' && a.targetId === crewId && a.day < end && a.day + a.days > startDay),
  }
}

/** First day from `from` on which the crew is free for `days` days. */
export function firstFreeDay(crewId: string, days: number, from: number, excludeJobId?: string) {
  for (let d = from; d < from + 60; d++) {
    const c = crewConflicts(crewId, d, days, excludeJobId)
    if (!c.jobs.length && !c.absences.length) return d
  }
  return from
}

// ── Start status shown to the crew (no amounts, ever) ─────────────────────────────────
/**
 * Whether the job's quote uses a payment schedule with a deposit. Gutters (100 % at end of work) has none,
 * so the crew and the work order never show a deposit state for it.
 */
export function jobHasDeposit(job: { quoteNo: string; company: string }): boolean {
  const q = quoteByNo(job.quoteNo)
  if (!q) return job.company !== 'sg'
  return !!depositStep(quoteSchedule(q))
}

/**
 * "Don't start" signal for the crew: only for jobs whose schedule has a deposit (Roofs 15 %, Reno 10 %),
 * shown as a status — "Feu vert du bureau" / "En attente du feu vert du bureau" — never as an amount.
 * `undefined` = nothing to show (Gutters, or no deposit on the schedule).
 */
export function crewStartStatus(job: { quoteNo: string; company: string; deposit: boolean }): 'go' | 'wait' | undefined {
  if (!CREW_SEES_START_STATUS || !jobHasDeposit(job)) return undefined
  return job.deposit ? 'go' : 'wait'
}

/** Open question for the client (Abeel): should crews see a start status at all? Flip to hide it everywhere. */
export const CREW_SEES_START_STATUS = true
