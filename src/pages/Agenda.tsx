import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarPlus, ChevronLeft, ChevronRight, HardHat } from 'lucide-react'
import { Card, Page, PageHeader, RepAvatar, Tabs } from '../components/ui'
import { inScope, useApp } from '../context/AppContext'
import { APPOINTMENTS, QUOTES, type Appointment } from '../data/mock'
import { cn } from '../lib/utils'
import { AGENDA_REPS, DayView, MonthView, WeekView } from './agenda/calendar'
import { AppointmentDrawer, NewAppointmentDrawer, prefillFromQuote, type AppointmentPrefill } from './agenda/drawers'

type View = 'jour' | 'semaine' | 'mois'

/** Agenda page (mockup: `H4`). `?nouveau=<quote id|no>` opens the create drawer prefilled. */
export default function Agenda() {
  const { scope } = useApp()
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState<View>('semaine')
  const [events, setEvents] = useState<Appointment[]>(APPOINTMENTS)
  const [selected, setSelected] = useState<Appointment | null>(null)
  const [creating, setCreating] = useState(false)
  const [prefill, setPrefill] = useState<AppointmentPrefill | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [showJobs, setShowJobs] = useState(true)
  const reps = AGENDA_REPS.filter((r) => r.company === 'all' || inScope(scope, r.company))
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const visibleRepIds = reps.filter((r) => !hidden.has(r.id)).map((r) => r.id)
  const visibleEvents = events.filter((e) => visibleRepIds.includes(e.repId))
  const toggleRep = (id: string) =>
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const fromQuote = params.get('nouveau')
  useEffect(() => {
    if (!fromQuote) return
    const q = QUOTES.find((x) => x.id === fromQuote || x.no === fromQuote)
    if (q) {
      setPrefill(prefillFromQuote(q, events))
      setFormKey((k) => k + 1)
      setCreating(true)
    }
    params.delete('nouveau')
    setParams(params, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromQuote])

  const openNew = () => {
    setPrefill(null)
    setFormKey((k) => k + 1)
    setCreating(true)
  }

  return (
    <Page>
      <PageHeader
        title="Agenda"
        actions={
          <button className="btn btn-sm btn-primary" onClick={openNew}>
            <CalendarPlus className="w-4 h-4" />
            Rendez-vous
          </button>
        }
      />
      <Card pad={false}>
        <div className="px-4 py-3 border-b border-hairline space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button className="btn btn-xs btn-quiet" aria-label="Semaine précédente">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button className="btn btn-xs btn-secondary">Aujourd'hui</button>
              <button className="btn btn-xs btn-quiet" aria-label="Semaine suivante">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <p className="text-sm font-semibold text-ink ml-1 whitespace-nowrap">{view === 'mois' ? 'Octobre 2026' : view === 'semaine' ? '18 – 24 oct. 2026' : 'Mardi 20 octobre'}</p>
            </div>
            <Tabs<View>
              value={view}
              onChange={setView}
              tabs={[
                { value: 'jour', label: 'Jour' },
                { value: 'semaine', label: 'Semaine' },
                { value: 'mois', label: 'Mois' },
              ]}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {reps.length > 1 && (
              <button onClick={() => setHidden(new Set())} className={cn('h-7 px-2.5 rounded-full text-xs font-semibold border', hidden.size === 0 ? 'bg-ink text-white border-ink' : 'border-hairline text-ink-mute hover:text-ink')}>
                Tous
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
              <HardHat className="w-3.5 h-3.5" />
              Jours de travaux
            </button>
          </div>
        </div>
        {view === 'semaine' && <WeekView evts={visibleEvents} onOpen={setSelected} showJobs={showJobs} />}
        {view === 'jour' && <DayView evts={visibleEvents} reps={visibleRepIds} onOpen={setSelected} />}
        {view === 'mois' && <MonthView evts={visibleEvents} onPickWeek={() => setView('semaine')} />}
      </Card>
      <AppointmentDrawer a={selected} onClose={() => setSelected(null)} />
      <NewAppointmentDrawer key={formKey} open={creating} prefill={prefill} reps={reps} onClose={() => setCreating(false)} onCreate={(a) => setEvents((prev) => [...prev, a])} />
    </Page>
  )
}
