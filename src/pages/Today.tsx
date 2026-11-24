import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Bot, CalendarCheck2, CalendarDays, Check, Eye, Phone, PhoneCall } from 'lucide-react'
import { MessageButton } from '../components/messaging'
import { AccentText, Card, Empty, Page, RepAvatar, Stat } from '../components/ui'
import { inScope, useApp } from '../context/AppContext'
import { useAuth } from '../auth/AuthContext'
import { useAccess } from '../auth/access'
import { firstName } from '../auth/session'
import { useStore } from '../data/store'
import { openCreate } from '../lib/create'
import { APPOINTMENTS, LEADS, ME, QUOTES, REPS, clientById, clientLang, companyById, fullName, repById } from '../data/mock'
import { API_MODE } from '../api/config'
import { scopeReps as scopeRepsOf } from '../data/reps'
import { GroupSummaryCard } from '../components/GroupSummary'
import { getLang, inLang, t, tx } from '../i18n'
import { toast } from '../lib/toast'
import { cn, formatHour, money } from '../lib/utils'

/**
 * "Aujourd'hui" dashboard (mockup: `xx`), per role:
 * - admin: unchanged (own day on Toitures / group, the reps' day on another company);
 * - team (`quotes.viewAll`, e.g. the coordinator): every rep's day in scope, rep shown on each row;
 * - rep: only their own visits, follow-ups, opened quotes and leads.
 */
export default function Today() {
  useStore()
  const { scope } = useApp()
  const { user, can } = useAuth()
  const access = useAccess()
  const [done, setDone] = useState<Set<string>>(new Set())
  const mode: 'admin' | 'team' | 'own' = !user || user.role === 'admin' ? 'admin' : can('quotes.viewAll') ? 'team' : 'own'
  const myRepId = mode === 'admin' ? ME.id : user!.repId
  const greetName = user ? firstName(user.name) : ME.first
  const mine = mode === 'own' || (mode === 'admin' && (scope === 'all' || scope === ME.company))
  const scopeReps = (API_MODE ? scopeRepsOf(scope) : REPS.filter((r) => r.company !== 'all' && inScope(scope, r.company))).map((r) => r.id)
  /** Row belongs to this dashboard (company scope, and the rep's own work in 'own' mode). */
  const mineOrTeam = (company: string, repId?: string) => inScope(scope, company) && (mode !== 'own' || repId === myRepId)
  const canSeeQuote = (q: (typeof QUOTES)[number]) => mineOrTeam(q.company, q.repId) && access.quote(q)
  const showRep = mode === 'team'

  const appointments = APPOINTMENTS.filter((a) => a.day === 2 && a.type !== 'Non dispo' && (mine ? a.repId === myRepId : scopeReps.includes(a.repId) && access.appointment(a))).sort((a, b) => a.start - b.start)

  const followUps = (() => {
    const pending = QUOTES.filter((q) => (q.status === 'À rappeler' || q.status === 'Rappel courriel envoyé') && canSeeQuote(q))
    if (mode !== 'admin') return pending.slice(0, 6)
    const first = API_MODE ? undefined : QUOTES[0]
    if (!first) return pending.slice(0, 6)
    return [first, ...pending.filter((q) => q.id !== first.id)].filter((q) => inScope(scope, q.company) && access.quote(q)).slice(0, 6)
  })()

  const opened = QUOTES.filter((q) => q.views > 0 && q.lastViewed && (q.status === 'En soumission' || q.status === 'Rappel courriel envoyé') && canSeeQuote(q))
    .sort((a, b) => (b.lastViewed ?? '').localeCompare(a.lastViewed ?? '') || b.views - a.views)
    .slice(0, 5)

  const newLeads = LEADS.filter((l) => l.status !== 'Converti' && l.status !== 'Non qualifié' && (l.channel === 'Agent IA' || ['RDV réservé', 'Qualifié par IA', 'Qualifié', 'Nouveau'].includes(l.status))).filter((l) => inScope(scope, l.company) && access.lead(l))

  const toggleDone = (id: string) =>
    setDone((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <Page>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-semibold text-ink tracking-tight">
          <AccentText text={t('Bonjour *{name}*', { name: greetName })} />
        </h1>
        <div className="flex gap-2">
          <Link to="/agenda" className="btn btn-sm btn-secondary">
            <CalendarDays className="w-4 h-4" />
            {t('Agenda')}
          </Link>
          {mode === 'admin' && !API_MODE ? (
            <Link to="/soumissions/q64320" className="btn btn-sm btn-primary">
              {t('Nouvelle soumission')}
            </Link>
          ) : (
            <button className="btn btn-sm btn-primary" onClick={() => openCreate('quote')}>
              {t('Nouvelle soumission')}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <Stat label={tx('plural', 'Rendez-vous')} value={appointments.length} icon={CalendarDays} />
        <Stat label={t('Suivis à faire')} value={followUps.length - done.size} icon={PhoneCall} />
        <Stat label={t('Ouvertes')} value={opened.length} icon={Eye} />
      </div>

      {/* Vue Groupe: admins, on the all-companies scope (GET /group/summary). */}
      {API_MODE && scope === 'all' && user?.role === 'admin' && <GroupSummaryCard />}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
        <Card
          className="lg:col-span-2"
          title={tx('plural', 'Rendez-vous')}
          icon={CalendarDays}
          pad={false}
          actions={
            <Link to="/agenda" className="text-2xs font-bold text-primary-press">
              {t('Agenda')} <ArrowRight className="inline w-3 h-3" />
            </Link>
          }
        >
          {appointments.length === 0 && <Empty icon={CalendarCheck2} title={t("Aucun rendez-vous aujourd'hui")} />}
          <ul className="divide-y divide-hairline">
            {appointments.map((a) => (
              <li key={a.id} className="px-5 py-3.5 flex items-center gap-4">
                <span className={cn('shrink-0 text-sm font-semibold text-ink tnum', getLang() === 'en' ? 'w-[4.5rem] whitespace-nowrap' : 'w-14')}>{formatHour(a.start)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink truncate">{t(a.title)}</p>
                  <p className="text-xs text-ink-mute truncate">
                    {showRep ? `${repById(a.repId)?.name} · ` : ''}
                    {a.city}
                    {a.quoteNo ? ` · ${a.quoteNo}` : ''}
                  </p>
                </div>
                {!mine && <RepAvatar id={a.repId} size="xs" />}
                {a.clientId && (
                  <MessageButton
                    kind="reminder"
                    size="xs"
                    variant="quiet"
                    label={t('Rappel')}
                    ctx={{ first: clientById(a.clientId)!.first, name: fullName(clientById(a.clientId)!), lang: clientLang(clientById(a.clientId)), date: inLang(clientLang(clientById(a.clientId)), () => t("aujourd'hui à {time}", { time: formatHour(a.start) })) }}
                  />
                )}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="lg:col-span-3" title={t('Suivis à faire')} icon={PhoneCall} pad={false}>
          {followUps.length === 0 && <Empty icon={PhoneCall} title={t('Aucun suivi en attente')} />}
          <ul className="divide-y divide-hairline">
            {followUps.map((q) => {
              const client = clientById(q.clientId)!
              const isDone = done.has(q.id)
              return (
                <li key={q.id} className={cn('px-5 py-3 flex items-center gap-3', isDone && 'opacity-50')}>
                  <button
                    aria-label={t('Marquer fait')}
                    onClick={() => toggleDone(q.id)}
                    className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0', isDone ? 'bg-tone-good border-tone-good text-white' : 'border-hairline-strong hover:border-ink')}
                  >
                    {isDone && <Check className="w-3 h-3" />}
                  </button>
                  <Link to={`/soumissions/${q.id}`} className="min-w-0 flex-1">
                    <p className={cn('text-sm font-semibold text-ink truncate', isDone && 'line-through')}>
                      {fullName(client)} <span className="font-normal text-ink-mute">· {q.no}</span>
                    </p>
                    <p className="text-xs text-ink-mute truncate">{q.id === 'q64320' ? t('Ouverte 3 fois · question sur le contreplaqué') : t(q.workType)}</p>
                  </Link>
                  {showRep && <RepAvatar id={q.repId} size="xs" />}
                  <button className="p-2 rounded-md text-ink-mute hover:bg-sand hover:text-ink" aria-label={t('Appeler')} onClick={() => toast(t('Appel vers {phone}', { phone: client.phone }))}>
                    <Phone className="w-4 h-4" />
                  </button>
                  <MessageButton kind="sms" size="xs" variant="quiet" label={t('Texto')} ctx={{ first: client.first, name: fullName(client), quoteNo: q.no, company: companyById(q.company).name, lang: clientLang(client) }} />
                </li>
              )
            })}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
        <Card className="lg:col-span-3" title={tx('today', 'Soumissions ouvertes')} icon={Eye} pad={false}>
          {opened.length === 0 && <Empty icon={Eye} title={t('Aucune soumission ouverte récemment')} />}
          <ul className="divide-y divide-hairline">
            {opened.map((q) => {
              const client = clientById(q.clientId)!
              return (
                <li key={q.id}>
                  <Link to={`/soumissions/${q.id}`} className="px-5 py-3 flex items-center gap-3 hover:bg-sand/60">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink truncate">{fullName(client)}</span>
                      <span className="block text-xs text-ink-mute">{showRep ? `${q.no} · ${repById(q.repId)?.name}` : q.no}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm text-primary-press font-semibold tnum">
                      <Eye className="w-3.5 h-3.5" />
                      {q.views}
                    </span>
                    <span className="w-24 text-right text-sm font-semibold text-ink tnum">{money(q.amount, false)}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </Card>

        <Card
          className="lg:col-span-2"
          title={t('Nouveaux leads')}
          icon={Bot}
          pad={false}
          actions={
            <Link to="/leads" className="text-2xs font-bold text-primary-press">
              {t('Leads')} <ArrowRight className="inline w-3 h-3" />
            </Link>
          }
        >
          {newLeads.length === 0 && <Empty icon={Bot} title={t('Aucun nouveau lead')} />}
          <ul className="divide-y divide-hairline">
            {newLeads.slice(0, 4).map((l) => (
              <li key={l.id}>
                <Link to={`/leads/${l.id}`} className="px-5 py-3 flex items-center gap-3 hover:bg-sand/60">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink truncate">{l.name}</span>
                    <span className="block text-xs text-ink-mute truncate">{l.booked ? t('RDV · {date}', { date: t(l.booked) }) : l.city}</span>
                  </span>
                  {showRep && l.repId && <RepAvatar id={l.repId} size="xs" />}
                  <ArrowRight className="w-4 h-4 text-ink-faint shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </Page>
  )
}
