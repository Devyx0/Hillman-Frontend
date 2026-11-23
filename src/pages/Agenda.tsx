import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Ban, CalendarOff, CalendarPlus, CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, Empty, Page, PageHeader, RepAvatar, Tabs } from '../components/ui'
import { Loading } from '../components/states'
import { inScope, useApp } from '../context/AppContext'
import { useAuth } from '../auth/AuthContext'
import { useAccess } from '../auth/access'
import { quoteById, quoteByNo, request, useStore } from '../data/store'
import { ABSENCES, dayDate, jobById, type Absence, type AppointmentRecord, type JobRecord } from '../data/calendar'
import { cn } from '../lib/utils'
import { locale, t } from '../i18n'
import { AGENDA_REPS, DayView, MonthView, TODAY_INDEX, WeekView, calendarEvents, capitalize, type CalEvent } from './agenda/calendar'
import { AppointmentDrawer, AppointmentForm, prefillFromQuote, type AppointmentPrefill } from './agenda/drawers'
import { AbsenceDrawer, AbsencesPanel, JobDrawer, ScheduleDrawer, UnscheduledPanel, WorkOrderDrawer, type ScheduleTarget } from './agenda/jobs'

type View = 'jour' | 'semaine' | 'mois'

let loadedOnce = false

/**
 * Agenda page (mockup: `H4`). `?nouveau=<quote id|no>` opens the booking form prefilled.
 * Reps without `calendar.allReps` see and book only their own calendar.
 */
export default function Agenda() {
  useStore()
  const { scope } = useApp()
  const { user, can } = useAuth()
  const access = useAccess()
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState<View>('semaine')
  const [weekStart, setWeekStart] = useState(0)
  const [day, setDay] = useState(TODAY_INDEX)
  const [loading, setLoading] = useState(!loadedOnce)
  const [selected, setSelected] = useState<CalEvent | null>(null)
  const [form, setForm] = useState<{ prefill: AppointmentPrefill | null; editing: AppointmentRecord | null } | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [showJobs, setShowJobs] = useState(true)
  const [job, setJob] = useState<JobRecord | null>(null)
  const [schedule, setSchedule] = useState<ScheduleTarget | null>(null)
  const [workOrder, setWorkOrder] = useState<JobRecord | null>(null)
  const [absence, setAbsence] = useState<Absence | 'new' | null>(null)

  const allReps = can('calendar.allReps')
  const reps = allReps ? AGENDA_REPS.filter((r) => r.company === 'all' || inScope(scope, r.company)) : AGENDA_REPS.filter((r) => r.id === user?.repId)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const visibleRepIds = reps.filter((r) => !hidden.has(r.id)).map((r) => r.id)
  const evts = calendarEvents(visibleRepIds)
  const toggleRep = (id: string) =>
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  useEffect(() => {
    if (loadedOnce) return
    request(true, { ms: 350 }).then(() => {
      loadedOnce = true
      setLoading(false)
    })
  }, [])

  const goTo = (d: number) => {
    setDay(d)
    setWeekStart(Math.floor(d / 7) * 7)
  }

  const fromQuote = params.get('nouveau')
  useEffect(() => {
    if (!fromQuote) return
    const q = quoteById(fromQuote) ?? quoteByNo(fromQuote)
    // Only from a quote the user may open (a rep: their own).
    if (q && access.quote(q)) {
      const repId = allReps || q.repId === user?.repId ? q.repId : (user?.repId ?? q.repId)
      setForm({ prefill: prefillFromQuote(q, repId), editing: null })
      setFormKey((k) => k + 1)
    }
    params.delete('nouveau')
    setParams(params, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromQuote])

  const openNew = () => {
    setForm({ prefill: null, editing: null })
    setFormKey((k) => k + 1)
  }
  const openEvent = (e: CalEvent) => {
    if (e.kind === 'absence') return setAbsence(ABSENCES.find((a) => a.id === e.absenceId) ?? null)
    if (e.kind === 'busy') return
    setSelected(e)
  }
  const step = (dir: -1 | 1) => {
    if (view === 'semaine') setWeekStart((w) => w + 7 * dir)
    else goTo(day + dir)
  }
  const isToday = view === 'semaine' ? weekStart === 0 : view === 'jour' ? day === TODAY_INDEX : true

  const fmt = (d: number, o: Intl.DateTimeFormatOptions) => dayDate(d).toLocaleDateString(locale(), o)
  const label =
    view === 'mois'
      ? capitalize(fmt(TODAY_INDEX, { month: 'long', year: 'numeric' }))
      : view === 'semaine'
        ? `${fmt(weekStart, { day: 'numeric', month: 'short' })} – ${fmt(weekStart + 6, { day: 'numeric', month: 'short', year: 'numeric' })}`
        : capitalize(fmt(day, { weekday: 'long', day: 'numeric', month: 'long' }))

  const viewProps = { evts, onOpen: openEvent, showJobs, onOpenJob: setJob }
  const rangeFrom = view === 'jour' ? day : weekStart
  const rangeTo = view === 'jour' ? day : weekStart + 6
  const connectedHint = user && reps.some((r) => r.id === user.repId)

  return (
    <Page>
      <PageHeader
        title={allReps ? t('Agenda') : t('Votre agenda')}
        actions={
          <>
            <button className="btn btn-sm btn-secondary" onClick={() => setAbsence('new')}>
              <Ban className="w-4 h-4" />
              <span className="hidden sm:inline">{t('Absence')}</span>
            </button>
            <button className="btn btn-sm btn-primary" onClick={openNew} disabled={reps.length === 0}>
              <CalendarPlus className="w-4 h-4" />
              {t('Rendez-vous')}
            </button>
          </>
        }
      />
      <Card pad={false}>
        <div className="px-4 py-3 border-b border-hairline space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {view !== 'mois' && (
                <>
                  <button className="btn btn-xs btn-quiet" aria-label={view === 'semaine' ? t('Semaine précédente') : t('Jour précédent')} onClick={() => step(-1)}>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button className="btn btn-xs btn-secondary" disabled={isToday} onClick={() => (view === 'semaine' ? setWeekStart(0) : goTo(TODAY_INDEX))}>
                    {t("Aujourd'hui")}
                  </button>
                  <button className="btn btn-xs btn-quiet" aria-label={view === 'semaine' ? t('Semaine suivante') : t('Jour suivant')} onClick={() => step(1)}>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              <p className="text-sm font-semibold text-ink ml-1 whitespace-nowrap">{label}</p>
            </div>
            <Tabs<View>
              value={view}
              onChange={(v) => {
                if (v === 'jour') setDay(weekStart === 0 ? TODAY_INDEX : weekStart + 1)
                setView(v)
              }}
              tabs={[
                { value: 'jour', label: t('Jour') },
                { value: 'semaine', label: t('Semaine') },
                { value: 'mois', label: t('Mois') },
              ]}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {reps.length > 1 && (
              <button onClick={() => setHidden(new Set())} className={cn('h-7 px-2.5 rounded-full text-xs font-semibold border', hidden.size === 0 ? 'bg-ink text-white border-ink' : 'border-hairline text-ink-mute hover:text-ink')}>
                {t('Tous')}
              </button>
            )}
            {reps.map((r) => (
              <button
                key={r.id}
                onClick={() => toggleRep(r.id)}
                aria-pressed={!hidden.has(r.id)}
                className={cn('h-7 pl-1 pr-2.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-opacity', hidden.has(r.id) ? 'border-hairline text-ink-faint opacity-60' : `border-${r.color}-edge bg-${r.color} text-${r.color}-ink`)}
              >
                <RepAvatar id={r.id} size="xs" />
                {reps.length > 3 ? r.first : r.name}
              </button>
            ))}
            <button onClick={() => setShowJobs((s) => !s)} aria-pressed={showJobs} className={cn('h-7 px-2.5 rounded-full text-xs font-semibold border flex items-center gap-1.5', showJobs ? 'border-hairline-strong bg-sand text-ink' : 'border-hairline text-ink-faint opacity-60')}>
              <CalendarRange className="w-3.5 h-3.5" />
              {t('Jours de travaux')}
            </button>
          </div>
          {connectedHint && (
            <p className="text-2xs text-ink-mute flex items-center gap-1.5">
              <CalendarOff className="w-3 h-3" />
              {t('Les plages occupées de Google Agenda ou Outlook bloquent la réservation (Paramètres → Agendas connectés).')}
            </p>
          )}
        </div>
        {loading ? (
          <Loading label={t('Chargement de l’agenda…')} />
        ) : reps.length === 0 ? (
          <Empty icon={CalendarOff} title={t('Aucun agenda à afficher')}>
            {t('Votre compte n’a pas d’agenda de représentant. Demandez à un administrateur l’accès aux agendas de l’équipe.')}
          </Empty>
        ) : (
          <>
            {view === 'semaine' && <WeekView weekStart={weekStart} {...viewProps} />}
            {view === 'jour' && <DayView day={day} reps={visibleRepIds} {...viewProps} />}
            {view === 'mois' && (
              <MonthView
                evts={evts}
                onPickDay={(d) => {
                  goTo(d)
                  setView('semaine')
                }}
              />
            )}
          </>
        )}
      </Card>
      <div className={cn('grid gap-4 mt-4', can('jobs.schedule') && 'lg:grid-cols-2')}>
        {can('jobs.schedule') && <UnscheduledPanel onPlan={setSchedule} />}
        <AbsencesPanel from={view === 'mois' ? 0 : rangeFrom} to={view === 'mois' ? 30 : rangeTo} repIds={reps.map((r) => r.id)} onOpen={setAbsence} onAdd={() => setAbsence('new')} />
      </div>

      <AppointmentDrawer
        a={selected}
        onClose={() => setSelected(null)}
        onEdit={(a) => {
          setSelected(null)
          setForm({ prefill: null, editing: a })
          setFormKey((k) => k + 1)
        }}
      />
      {form && (
        <AppointmentForm
          key={formKey}
          open
          prefill={form.prefill}
          editing={form.editing}
          reps={reps}
          onClose={() => setForm(null)}
          onSaved={(a) => {
            if (view === 'mois') setView('semaine')
            goTo(a.day)
          }}
        />
      )}
      <JobDrawer
        job={job ? (jobById(job.id) ?? null) : null}
        onClose={() => setJob(null)}
        onSchedule={(j) => {
          setJob(null)
          setSchedule({ job: j })
        }}
        onWorkOrder={(j) => setWorkOrder(j)}
      />
      <ScheduleDrawer
        target={schedule}
        onClose={() => setSchedule(null)}
        onSaved={(j) => {
          setShowJobs(true)
          if (j.startDay !== undefined) {
            setWeekStart(Math.floor(j.startDay / 7) * 7)
            if (view === 'mois') setView('semaine')
          }
        }}
      />
      <WorkOrderDrawer job={workOrder ? (jobById(workOrder.id) ?? null) : null} onClose={() => setWorkOrder(null)} />
      <AbsenceDrawer editing={absence} onClose={() => setAbsence(null)} />
    </Page>
  )
}
