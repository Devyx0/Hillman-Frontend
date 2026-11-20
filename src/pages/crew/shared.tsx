/**
 * Field crew view (role `crew`) — shared helpers. Everything here is price-free: no amounts,
 * costs, margins or profit are ever read for display.
 */
import { Link } from 'react-router-dom'
import { CalendarRange, ChevronRight, MapPin, Navigation, Phone } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { Badge } from '../../components/ui'
import { crewById, isScheduled, type Crew, type JobRecord } from '../../data/crews'
import { JOBS, clientById, fullName, type Client, type Tone } from '../../data/mock'
import { quoteByNo } from '../../data/store'
import { getDraft } from '../../data/quote-builder'
import { crewJobQuote } from '../../data/crew-jobs'
import { t } from '../../i18n'
import { cn } from '../../lib/utils'
import { TODAY_INDEX } from '../agenda/calendar'
import { dayRange, workOrderLines } from '../agenda/crews'

export const TODAY = TODAY_INDEX

/** The signed-in crew account's crew. */
export function useMyCrew(): Crew | undefined {
  const { user } = useAuth()
  return crewById(user?.crewId)
}

/** Scheduled jobs of a crew, in date order. */
export const crewJobs = (crewId: string) =>
  (JOBS as JobRecord[]).filter((j) => j.crewId === crewId && isScheduled(j)).sort((a, b) => a.startDay! - b.startDay!)

export const jobEnd = (j: JobRecord) => j.startDay! + j.days - 1

export const STAGE_TONE: Record<string, Tone> = { 'À planifier': 'warn', Planifié: 'info', 'En cours': 'accent', Terminé: 'good', Facturé: 'neutral', Payé: 'good' }
export const MATERIAL_TONE: Record<string, Tone> = { 'À commander': 'critical', Commandés: 'warn', Livrés: 'good' }

/**
 * Stage shown to the crew. "Facturé" / "Payé" are office (billing) stages: the crew only sees
 * that the work is done.
 */
export const crewStage = (stage: string) => (stage === 'Facturé' || stage === 'Payé' ? 'Terminé' : stage)

/** Job site: client, address, phones and the Google Maps directions link. */
export interface JobSite {
  client?: Client
  name: string
  address: string
  phones: string[]
  maps: string
  /** Commercial client: the person to call on site (name and role), instead of a homeowner. */
  contact?: { name: string; role?: string }
}

export function jobSite(job: JobRecord): JobSite {
  const quote = quoteByNo(job.quoteNo)
  const client = quote ? clientById(quote.clientId) : undefined
  const address = client ? `${client.no}, ${client.street}, ${client.city} ${client.postal}` : `${job.city}, QC`
  const role = crewJobQuote(job.quoteNo)?.client.contactRole
  return {
    client,
    name: client ? (client.company ?? fullName(client)) : job.client,
    address,
    phones: client ? [client.mobile, client.phone].filter((p): p is string => !!p) : [],
    maps: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`,
    contact: client?.company ? { name: fullName(client), role } : undefined,
  }
}

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`

/** Photos of the job, from the quote's builder (visit photos + photos added by the crew). */
export function jobPhotos(job: JobRecord) {
  const q = quoteByNo(job.quoteNo)
  return q ? getDraft(q).photos : []
}

/** Work order quantities (no prices): the agenda's `workOrderLines` (form-derived, same as the quote builder). */
export { workOrderLines }

/** Big tap-friendly buttons: directions and call. */
export function SiteActions({ site, className }: { site: JobSite; className?: string }) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      <a href={site.maps} target="_blank" rel="noreferrer" className="btn btn-md btn-primary flex-1 min-w-[9rem] justify-center">
        <Navigation className="w-4 h-4" />
        {t('Itinéraire')}
      </a>
      {site.phones[0] ? (
        <a href={telHref(site.phones[0])} className="btn btn-md btn-secondary flex-1 min-w-[9rem] justify-center">
          <Phone className="w-4 h-4" />
          {site.contact ? t('Appeler le contact') : t('Appeler le client')}
        </a>
      ) : (
        <p className="text-xs text-ink-mute self-center">{t('Aucun téléphone au dossier : appelez le bureau.')}</p>
      )}
    </div>
  )
}

/** One job in a list: client, address, work, dates, stage. Links to the job page. */
export function JobCard({ job, highlight }: { job: JobRecord; highlight?: boolean }) {
  const site = jobSite(job)
  return (
    <Link
      to={`/equipe/chantier/${job.id}`}
      className={cn('block bg-white rounded-xl shadow-card p-4 transition-colors hover:bg-sand/60 active:bg-sand', highlight && 'ring-2 ring-primary/40')}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-md font-semibold text-ink truncate">{site.name}</p>
            <Badge tone={STAGE_TONE[crewStage(job.stage)] ?? 'neutral'} dot>
              {t(crewStage(job.stage))}
            </Badge>
          </div>
          <p className="text-sm text-ink-secondary">{t(job.work)}</p>
          <p className="flex items-center gap-1.5 text-xs text-ink-mute">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{site.address}</span>
          </p>
          <p className="flex items-center gap-1.5 text-xs text-ink-mute">
            <CalendarRange className="w-3.5 h-3.5 shrink-0" />
            {dayRange(job.startDay!, job.days)}
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-ink-faint shrink-0 mt-1" />
      </div>
    </Link>
  )
}
