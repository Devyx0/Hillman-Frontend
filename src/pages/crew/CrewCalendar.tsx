/** `/equipe/calendrier` — week of the crew's job days (read-only, mobile list). */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, CalendarOff, ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import { Badge, Page } from '../../components/ui'
import { NoAccess } from '../../components/states'
import { absencesOn, dayDate, jobOn } from '../../data/crews'
import { useStore } from '../../data/store'
import { locale, t } from '../../i18n'
import { cn } from '../../lib/utils'
import { capitalize } from '../agenda/calendar'
import { MATERIAL_TONE, STAGE_TONE, TODAY, crewJobs, crewStage, jobSite, useMyCrew } from './shared'

/** Monday of the week containing `day`. */
const mondayOf = (day: number) => day - ((dayDate(day).getDay() + 6) % 7)

export default function CrewCalendar() {
  useStore()
  const crew = useMyCrew()
  const [weekStart, setWeekStart] = useState(() => mondayOf(TODAY))
  if (!crew) {
    return (
      <Page className="max-w-3xl">
        <div className="card">
          <NoAccess>{t("Votre compte n'est relié à aucune équipe. Demandez à un administrateur de choisir votre équipe.")}</NoAccess>
        </div>
      </Page>
    )
  }

  const jobs = crewJobs(crew.id)
  const days = Array.from({ length: 7 }, (_, i) => weekStart + i)
  const fmt = (d: number, o: Intl.DateTimeFormatOptions) => dayDate(d).toLocaleDateString(locale(), o)
  const range = `${fmt(days[0], { day: 'numeric', month: 'short' })} – ${fmt(days[6], { day: 'numeric', month: 'short', year: 'numeric' })}`
  const thisWeek = weekStart === mondayOf(TODAY)

  return (
    <Page className="max-w-3xl space-y-4">
      <header className="space-y-1">
        <p className="eyebrow text-ink-mute">{t(crew.name)}</p>
        <h1 className="text-2xl md:text-3xl font-semibold text-ink tracking-tight">{t('Calendrier de l’équipe')}</h1>
      </header>

      <div className="sticky top-16 z-20 -mx-4 px-4 py-2 bg-sand/95 backdrop-blur flex items-center gap-2">
        <button className="btn btn-md btn-secondary px-2.5" onClick={() => setWeekStart((w) => w - 7)} aria-label={t('Semaine précédente')}>
          <ChevronLeft className="w-4 h-4" />
        </button>
        <p className="flex-1 text-center text-sm font-semibold text-ink tnum">{range}</p>
        <button className="btn btn-md btn-secondary px-2.5" onClick={() => setWeekStart((w) => w + 7)} aria-label={t('Semaine suivante')}>
          <ChevronRight className="w-4 h-4" />
        </button>
        {!thisWeek && (
          <button className="btn btn-md btn-ghost" onClick={() => setWeekStart(mondayOf(TODAY))}>
            {t("Aujourd'hui")}
          </button>
        )}
      </div>

      <ol className="space-y-2">
        {days.map((d) => {
          const dayJobs = jobs.filter((j) => jobOn(j, d))
          const absences = absencesOn(d, { kind: 'crew', id: crew.id })
          const isToday = d === TODAY
          const weekend = [0, 6].includes(dayDate(d).getDay())
          return (
            <li key={d} className={cn('bg-white rounded-xl shadow-card overflow-hidden', isToday && 'ring-2 ring-primary/40')}>
              <div className={cn('px-4 py-2 flex items-center gap-2 border-b border-hairline', weekend && 'bg-sand/60')}>
                <p className="text-sm font-semibold text-ink">{capitalize(fmt(d, { weekday: 'long', day: 'numeric', month: 'long' }))}</p>
                {isToday && <Badge tone="accent">{t("Aujourd'hui")}</Badge>}
              </div>
              {absences.map((a) => (
                <div key={a.id} className="px-4 py-2.5 flex items-center gap-2 text-sm text-tone-warn-ink bg-tone-warn-soft/60">
                  <CalendarOff className="w-4 h-4 shrink-0" />
                  {t(a.reason)}
                  {a.note ? <span className="text-xs opacity-80 truncate">· {a.note}</span> : null}
                </div>
              ))}
              {dayJobs.map((j) => {
                const site = jobSite(j)
                const n = d - j.startDay! + 1
                return (
                  <Link key={j.id} to={`/equipe/chantier/${j.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-sand/60 active:bg-sand border-t border-hairline first:border-t-0">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-ink truncate">{site.name}</p>
                        {j.days > 1 && <span className="text-2xs text-ink-mute tnum">{t('Jour {n} de {total}', { n, total: j.days })}</span>}
                      </div>
                      <p className="text-sm text-ink-secondary">{t(j.work)}</p>
                      <p className="flex items-center gap-1.5 text-xs text-ink-mute">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{site.address}</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <Badge tone={STAGE_TONE[crewStage(j.stage)] ?? 'neutral'} dot>
                          {t(crewStage(j.stage))}
                        </Badge>
                        <Badge tone={MATERIAL_TONE[j.materials] ?? 'neutral'}>{t('Matériaux : {status}', { status: t(j.materials) })}</Badge>
                        {j.weather && <Badge tone="warn">{t(j.weather)}</Badge>}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-ink-faint shrink-0 mt-0.5" />
                  </Link>
                )
              })}
              {!dayJobs.length && !absences.length && <p className="px-4 py-2.5 text-xs text-ink-faint">{weekend ? t('Fin de semaine') : t('Aucun chantier')}</p>}
            </li>
          )
        })}
      </ol>
      <p className="text-xs text-ink-mute flex items-center gap-1.5 px-1">
        <CalendarDays className="w-3.5 h-3.5" />
        {t('Le bureau planifie les chantiers. Pour un changement, appelez le bureau.')}
      </p>
    </Page>
  )
}
