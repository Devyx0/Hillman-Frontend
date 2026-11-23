/**
 * Agenda calendar pieces: week / day / month views, rep columns and the
 * "Jours de travaux" band (scheduled work days of signed jobs, each linked to its quote).
 * Day numbers are absolute indexes from dim. 18 oct. 2026 (see data/calendar.ts).
 */
import type { CSSProperties } from 'react'
import { Ban, CalendarOff, CalendarRange, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { RepAvatar } from '../../components/ui'
import { inScope, useApp } from '../../context/AppContext'
import { useAccess } from '../../auth/access'
import { APPOINTMENTS, JOBS, REPS, companyById, repById } from '../../data/mock'
import { ABSENCES, PROVIDER_LABEL, busyBlocksFor, calendarLink, dayDate, isScheduled, type AppointmentRecord, type JobRecord } from '../../data/calendar'
import { cn, formatHour } from '../../lib/utils'
import { getLang, t } from '../../i18n'

export const DAY_ABBR = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']
export const DAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Day index of "today" (mardi 20 oct.). */
export const TODAY_INDEX = 2
export const DAY_START = 7
export const DAY_END = 18
const HOUR_HEIGHT = 56
const NOW_HOUR = 9.1

/** Reps who have a calendar (everyone but the coordinator). */
export const AGENDA_REPS = REPS.filter((r) => r.id !== 'hpe')

/** Something drawn in a rep column: an appointment, an absence or a busy block from Google/Outlook. */
export type CalEvent = AppointmentRecord & { kind?: 'appt' | 'absence' | 'busy'; label?: string; absenceId?: string }

/** Appointments + rep absences + imported busy blocks for the given reps. */
export function calendarEvents(repIds: string[]): CalEvent[] {
  const appts: CalEvent[] = (APPOINTMENTS as AppointmentRecord[]).filter((a) => repIds.includes(a.repId)).map((a) => ({ ...a, kind: 'appt' }))
  const absences: CalEvent[] = ABSENCES.filter((a) => repIds.includes(a.repId)).flatMap((a) =>
    Array.from({ length: a.days }, (_, i) => ({
      id: `abs-${a.id}-${i}`,
      repId: a.repId,
      day: a.day + i,
      start: a.start ?? DAY_START,
      end: a.end ?? DAY_END,
      title: a.reason,
      city: '',
      type: 'Non dispo',
      kind: 'absence' as const,
      label: t(a.reason),
      absenceId: a.id,
    })),
  )
  const busy: CalEvent[] = repIds.flatMap((id) =>
    busyBlocksFor(id).map((b) => ({ id: `busy-${b.id}`, repId: id, day: b.day, start: b.start, end: b.end, title: 'Occupé', city: '', type: 'Non dispo', kind: 'busy' as const, label: t('Occupé · {p}', { p: PROVIDER_LABEL[calendarLink(id)!.provider] }) })),
  )
  return [...appts, ...absences, ...busy]
}

function EventChip({ a, onClick, style, compact }: { a: CalEvent; onClick: () => void; style: CSSProperties; compact?: boolean }) {
  const rep = repById(a.repId)!
  if (a.type === 'Non dispo') {
    const Icon = a.kind === 'busy' ? CalendarOff : Ban
    const text = a.label ? `${a.label} · ${rep.first}` : t('Non dispo · {name}', { name: rep.first })
    const cls = cn(
      'absolute text-left rounded-md border text-2xs text-ink-mute p-1.5 overflow-hidden bg-[repeating-linear-gradient(135deg,var(--color-sand)_0_6px,var(--color-stone)_6px_12px)]',
      a.kind === 'busy' ? 'border-dashed border-hairline-strong' : 'border-hairline-strong',
    )
    if (a.kind === 'absence')
      return (
        <button style={style} onClick={onClick} className={cn(cls, 'hover:shadow-elevated hover:z-20')} title={text}>
          <Icon className="w-3 h-3 inline mr-1" />
          {text}
        </button>
      )
    return (
      <div style={style} className={cls} title={text}>
        <Icon className="w-3 h-3 inline mr-1" />
        {text}
      </div>
    )
  }
  return (
    <button
      onClick={onClick}
      style={style}
      className={cn('absolute text-left rounded-md border-l-[3px] px-1.5 py-1 overflow-hidden hover:shadow-elevated hover:z-20 transition-shadow', `bg-${rep.color} text-${rep.color}-ink border-${rep.color}-ink`)}
    >
      <p className="text-2xs font-bold leading-tight truncate flex items-center gap-1">
        {a.aiBooked && <Sparkles className="w-2.5 h-2.5 shrink-0" aria-label={t("Réservé par l'agent IA")} />}
        {a.city || t(a.title)}
      </p>
      {!compact && <p className="text-2xs leading-tight truncate opacity-90">{t(a.title)}</p>}
      {!compact && <p className="text-[10px] leading-tight opacity-75 tnum">{formatHour(a.start)}</p>}
    </button>
  )
}

/** Packs overlapping appointments into side-by-side lanes. */
function layoutLanes(evts: CalEvent[]) {
  const sorted = [...evts].sort((a, b) => a.start - b.start)
  const out: { a: CalEvent; lane: number; of: number }[] = []
  let group: { a: CalEvent; lane: number }[] = []
  let groupEnd = -1
  const flush = () => {
    const of = Math.max(1, ...group.map((g) => g.lane + 1))
    group.forEach((g) => out.push({ ...g, of }))
    group = []
  }
  for (const a of sorted) {
    if (a.start >= groupEnd && group.length) flush()
    const taken = new Set(group.filter((g) => g.a.end > a.start).map((g) => g.lane))
    let lane = 0
    while (taken.has(lane)) lane++
    group.push({ a, lane })
    groupEnd = Math.max(groupEnd, a.end)
  }
  flush()
  return out
}

function HourGutter() {
  return (
    <div className="w-12 shrink-0">
      {Array.from({ length: DAY_END - DAY_START }, (_, i) => (
        <div key={i} style={{ height: HOUR_HEIGHT }} className="text-2xs text-ink-mute tnum text-right pr-2 -mt-1.5">
          {getLang() === 'en' ? `${(DAY_START + i) % 12 || 12} ${DAY_START + i < 12 ? 'AM' : 'PM'}` : `${DAY_START + i} h`}
        </div>
      ))}
    </div>
  )
}

function DayColumn({ evts, onOpen, today, dot = true }: { evts: CalEvent[]; onOpen: (a: CalEvent) => void; today?: boolean; dot?: boolean }) {
  return (
    <div className={cn('relative flex-1 min-w-0 border-l border-hairline grid-bg', today && 'bg-primary-wash/50')} style={{ height: (DAY_END - DAY_START) * HOUR_HEIGHT, backgroundSize: `100% ${HOUR_HEIGHT}px` }}>
      {layoutLanes(evts).map(({ a, lane, of }) => {
        const start = Math.max(DAY_START, a.start)
        const end = Math.min(DAY_END, a.end)
        return (
          <EventChip
            key={a.id}
            a={a}
            onClick={() => onOpen(a)}
            compact={end - start < 1}
            style={{ top: (start - DAY_START) * HOUR_HEIGHT + 1, height: Math.max(18, (end - start) * HOUR_HEIGHT - 3), left: `calc(${(lane / of) * 100}% + 2px)`, width: `calc(${100 / of}% - 4px)` }}
          />
        )
      })}
      {today && (
        <div className="absolute left-0 right-0 z-10 flex items-center" style={{ top: (NOW_HOUR - DAY_START) * HOUR_HEIGHT }}>
          {dot && <span className="w-2 h-2 rounded-full bg-tone-critical -ml-1" />}
          <span className="flex-1 h-px bg-tone-critical" />
        </div>
      )}
    </div>
  )
}

/* ── Jours de travaux band ─────────────────────────────────────────────── */

/** Scheduled jobs in the current company scope overlapping the given days (a rep: only their own quotes' work days). */
function useScopedJobs(first: number, last: number): JobRecord[] {
  const { scope } = useApp()
  const access = useAccess()
  return (JOBS as JobRecord[]).filter((j) => inScope(scope, j.company) && access.job(j) && isScheduled(j) && j.startDay! <= last && j.startDay! + j.days - 1 >= first)
}

/**
 * Scheduled work days over the given days: one bar per job (click → job drawer), packed into as few
 * rows as possible, coloured by company.
 */
export function JobsBand({ days, onOpenJob }: { days: number[]; onOpenJob: (j: JobRecord) => void }) {
  const first = days[0]
  const last = days[days.length - 1]
  const jobs = useScopedJobs(first, last).sort((a, b) => a.startDay! - b.startDay! || b.days - a.days)
  // Pack bars into rows: a job goes into the first row whose last job has ended.
  const rows: JobRecord[][] = []
  for (const j of jobs) {
    const row = rows.find((r) => r[r.length - 1].startDay! + r[r.length - 1].days <= j.startDay!)
    if (row) row.push(j)
    else rows.push([j])
  }
  const grid = { display: 'grid', gridTemplateColumns: `repeat(${days.length}, minmax(0,1fr))`, gridAutoRows: '24px', rowGap: 3 } as const
  const span = (start: number, len: number) => {
    const from = Math.max(first, start)
    const to = Math.min(last, start + len - 1)
    return { gridColumn: `${from - first + 1} / span ${to - from + 1}`, cutLeft: start < first, cutRight: start + len - 1 > last }
  }
  return (
    <div className="border-b border-hairline bg-sand/60">
      <div className="flex items-center gap-1.5 px-2 pt-1.5 text-2xs font-semibold text-ink-mute">
        <CalendarRange className="w-3.5 h-3.5" />
        {t('Jours de travaux')}
      </div>
      {rows.length === 0 && <p className="px-14 py-2 text-2xs text-ink-mute">{t('Aucun travail planifié pour cette période.')}</p>}
      {rows.length > 0 && (
        <div className="flex py-1">
          <div className="w-12 shrink-0" />
          <div className="flex-1 min-w-0" style={grid}>
            {rows.flatMap((row, r) =>
              row.map((j) => {
                const s = span(j.startDay!, j.days)
                const company = companyById(j.company)
                return (
                  <button
                    key={j.id}
                    onClick={() => onOpenJob(j)}
                    style={{ gridColumn: s.gridColumn, gridRow: r + 1 }}
                    className={cn('mx-0.5 rounded px-1.5 text-2xs font-semibold truncate flex items-center gap-1 border text-left hover:shadow-elevated', company.tone)}
                    title={`${t(company.short)} · ${j.client} · ${j.quoteNo} · ${t(j.work)}`}
                  >
                    {s.cutLeft && <ChevronLeft className="w-3 h-3 shrink-0 -ml-1" />}
                    <span className="truncate flex-1">
                      {j.client} · {j.quoteNo}
                    </span>
                    {s.cutRight && <ChevronRight className="w-3 h-3 shrink-0 -mr-1" />}
                  </button>
                )
              }),
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Views ─────────────────────────────────────────────────────────────── */

interface ViewProps {
  evts: CalEvent[]
  onOpen: (a: CalEvent) => void
  showJobs: boolean
  onOpenJob: (j: JobRecord) => void
}

export function WeekView({ weekStart, evts, onOpen, showJobs, onOpenJob }: ViewProps & { weekStart: number }) {
  const days = Array.from({ length: 7 }, (_, i) => weekStart + i)
  const inWeek = evts.filter((e) => days.includes(e.day))
  const noAppointments = !inWeek.some((e) => e.type !== 'Non dispo')
  return (
    <div className="relative overflow-x-auto">
      <div className="min-w-[760px]">
        <div className="flex border-b border-hairline">
          <div className="w-12 shrink-0" />
          {days.map((d) => {
            const date = dayDate(d)
            return (
              <div key={d} className={cn('flex-1 py-2.5 text-center border-l border-hairline', d === TODAY_INDEX && 'bg-primary-wash/50')}>
                <p className="label-caps">{t(DAY_ABBR[date.getDay()])}</p>
                <p className={cn('text-lg font-semibold tnum mx-auto w-8 h-8 rounded-full flex items-center justify-center', d === TODAY_INDEX ? 'bg-primary text-white' : 'text-ink')}>{date.getDate()}</p>
              </div>
            )
          })}
        </div>
        {showJobs && <JobsBand days={days} onOpenJob={onOpenJob} />}
        <div className="relative flex pt-2 max-h-[620px] overflow-y-auto">
          <HourGutter />
          {days.map((d) => (
            <DayColumn key={d} today={d === TODAY_INDEX} evts={inWeek.filter((e) => e.day === d)} onOpen={onOpen} />
          ))}
          {noAppointments && (
            <p className="absolute left-1/2 top-24 -translate-x-1/2 z-10 rounded-full bg-white shadow-card px-3 py-1.5 text-xs text-ink-mute whitespace-nowrap">{t('Aucun rendez-vous cette semaine')}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export function DayView({ day, evts, reps, onOpen, showJobs, onOpenJob }: ViewProps & { day: number; reps: string[] }) {
  const today = day === TODAY_INDEX
  return (
    <div className="relative overflow-x-auto">
      <div className={cn(reps.length > 2 && 'min-w-[760px]')}>
        <div className="flex border-b border-hairline">
          <div className="w-12 shrink-0" />
          {reps.map((id) => (
            <div key={id} className="flex-1 py-2.5 px-2 border-l border-hairline flex items-center justify-center gap-2 min-w-0">
              <RepAvatar id={id} size="sm" />
              <span className="text-xs font-semibold text-ink truncate">{repById(id)!.first}</span>
              <span className="text-2xs text-ink-mute tnum">{evts.filter((e) => e.repId === id && e.day === day && e.type !== 'Non dispo').length}</span>
            </div>
          ))}
        </div>
        {showJobs && <JobsBand days={[day]} onOpenJob={onOpenJob} />}
        <div className="flex pt-2 max-h-[620px] overflow-y-auto">
          <HourGutter />
          {reps.map((id, i) => (
            <DayColumn key={id} today={today} dot={i === 0} evts={evts.filter((e) => e.repId === id && e.day === day)} onOpen={onOpen} />
          ))}
        </div>
      </div>
    </div>
  )
}

/** October 2026. Days with data use the real appointments; other days show the mockup's sample density. */
export function MonthView({ evts, onPickDay }: { evts: CalEvent[]; onPickDay: (day: number) => void }) {
  const cells = Array.from({ length: 35 }, (_, i) => i - 4 + 1)
  const weekend = (d: number) => new Date(2026, 9, d).getDay() % 6 === 0
  const realDays = new Set(evts.filter((e) => e.kind === 'appt').map((e) => e.day))
  const countFor = (d: number) => {
    const idx = d - 18
    if ((d >= 18 && d <= 24) || realDays.has(idx)) return evts.filter((e) => e.day === idx && e.type !== 'Non dispo').length
    if (d < 1 || d > 31) return 0
    return d > 24 ? Math.max(0, ((d * 7) % 9) - (weekend(d) ? 9 : 0)) : ((d * 5) % 11) + (weekend(d) ? -8 : 2)
  }
  return (
    <div className="p-4">
      <div className="grid grid-cols-7 gap-px bg-hairline rounded-lg overflow-hidden">
        {DAY_ABBR.map((d) => (
          <div key={d} className="bg-sand label-caps text-center py-2">
            {t(d)}
          </div>
        ))}
        {cells.map((d, i) => {
          const inMonth = d >= 1 && d <= 31
          const count = Math.max(0, countFor(d))
          const off = evts.some((e) => e.day === d - 18 && e.kind === 'absence')
          return (
            <button key={i} onClick={() => onPickDay(d - 18)} disabled={!inMonth} className={cn('bg-white min-h-[64px] sm:min-h-[84px] p-1.5 sm:p-2 text-left flex flex-col gap-1 hover:bg-primary-wash/40 disabled:bg-sand/40 disabled:hover:bg-sand/40', d === 20 && 'ring-2 ring-inset ring-primary')}>
              <span className={cn('text-sm font-semibold tnum flex items-center gap-1', inMonth ? (d === 20 ? 'text-primary-press' : 'text-ink') : 'text-ink-faint')}>
                {inMonth ? d : ''}
                {inMonth && off && <Ban className="w-3 h-3 text-ink-mute" aria-label={t('Non dispo')} />}
              </span>
              {inMonth && count > 0 && (
                <>
                  <div className="flex flex-wrap gap-0.5">
                    {Array.from({ length: Math.min(count, 12) }, (_, k) => (
                      <span key={k} className={cn('w-1.5 h-1.5 rounded-full', `bg-${AGENDA_REPS[k % AGENDA_REPS.length].color}-ink`)} />
                    ))}
                  </div>
                  <span className="text-2xs text-ink-mute mt-auto tnum">{count}</span>
                </>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
