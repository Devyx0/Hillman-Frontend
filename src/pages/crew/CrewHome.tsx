/** `/equipe` — "Mes chantiers", home of a field crew account: today's, upcoming and recent jobs. */
import { Link } from 'react-router-dom'
import { CalendarDays, HardHat, History, Phone, Sun } from 'lucide-react'
import { Empty, Page } from '../../components/ui'
import { NoAccess } from '../../components/states'
import { useAuth } from '../../auth/AuthContext'
import { firstName } from '../../auth/session'
import { absencesOn } from '../../data/crews'
import { useStore } from '../../data/store'
import { t } from '../../i18n'
import { capitalize } from '../agenda/calendar'
import { shortDay } from '../agenda/crews'
import { JobCard, SiteActions, TODAY, crewJobs, jobEnd, jobSite, telHref, useMyCrew } from './shared'
import type { ReactNode } from 'react'
import type { Icon } from '../../components/ui'

function Section({ title, icon: IconC, count, children }: { title: string; icon: Icon; count: number; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="label-caps flex items-center gap-1.5 px-1">
        <IconC className="w-3.5 h-3.5" />
        {title}
        <span className="tnum text-ink-faint">· {count}</span>
      </h2>
      {children}
    </section>
  )
}

export default function CrewHome() {
  useStore()
  const { user } = useAuth()
  const crew = useMyCrew()
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
  const today = jobs.filter((j) => j.startDay! <= TODAY && jobEnd(j) >= TODAY)
  const upcoming = jobs.filter((j) => j.startDay! > TODAY)
  const recent = jobs.filter((j) => jobEnd(j) < TODAY).reverse().slice(0, 5)
  const off = absencesOn(TODAY, { kind: 'crew', id: crew.id })[0]
  const first = today[0]

  return (
    <Page className="max-w-3xl space-y-5">
      <header className="space-y-1">
        <p className="eyebrow text-ink-mute">{capitalize(shortDay(TODAY))}</p>
        <h1 className="text-2xl md:text-3xl font-semibold text-ink tracking-tight">{t('Bonjour {name}', { name: firstName(user?.name ?? '') })}</h1>
        <p className="text-sm text-ink-mute flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="inline-flex items-center gap-1.5 font-semibold text-ink-secondary">
            <HardHat className="w-4 h-4" />
            {t(crew.name)}
          </span>
          <span>· {crew.members.join(', ')}</span>
        </p>
      </header>

      {off && (
        <div className="rounded-xl bg-tone-warn-soft text-tone-warn-ink text-sm px-4 py-3">
          {t('Équipe absente aujourd’hui : {reason}', { reason: t(off.reason) })}
          {off.note ? ` — ${off.note}` : ''}
        </div>
      )}

      {first && (
        <div className="rounded-xl bg-ink text-white p-4 space-y-3">
          <div>
            <p className="label-caps text-white/70">{t('Chantier du jour')}</p>
            <p className="text-lg font-semibold mt-0.5">{jobSite(first).name}</p>
            <p className="text-sm text-white/80">{jobSite(first).address}</p>
          </div>
          <SiteActions site={jobSite(first)} />
        </div>
      )}

      <Section title={t("Aujourd'hui")} icon={Sun} count={today.length}>
        {today.length ? (
          <div className="space-y-2">
            {today.map((j) => (
              <JobCard key={j.id} job={j} highlight />
            ))}
          </div>
        ) : (
          <div className="card">
            <Empty icon={Sun} title={t('Aucun chantier aujourd’hui')}>
              {t('Consultez les prochains chantiers ci-dessous ou le calendrier de votre équipe.')}
            </Empty>
          </div>
        )}
      </Section>

      <Section title={t('À venir')} icon={CalendarDays} count={upcoming.length}>
        {upcoming.length ? (
          <div className="space-y-2">
            {upcoming.map((j) => (
              <JobCard key={j.id} job={j} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-mute px-1">{t('Aucun chantier planifié pour le moment.')}</p>
        )}
        <Link to="/equipe/calendrier" className="btn btn-md btn-secondary w-full justify-center">
          <CalendarDays className="w-4 h-4" />
          {t('Voir le calendrier de l’équipe')}
        </Link>
      </Section>

      {recent.length > 0 && (
        <Section title={t('Récents')} icon={History} count={recent.length}>
          <div className="space-y-2">
            {recent.map((j) => (
              <JobCard key={j.id} job={j} />
            ))}
          </div>
        </Section>
      )}

      {crew.phone && (
        <p className="text-xs text-ink-mute px-1 flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5" />
          {t('Cellulaire de l’équipe :')}
          <a href={telHref(crew.phone)} className="font-semibold text-ink-secondary underline underline-offset-2">
            {crew.phone}
          </a>
        </p>
      )}
    </Page>
  )
}
