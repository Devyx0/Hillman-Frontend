/** Settings → Agendas connectés (calendar area): each user connects Google Calendar or Outlook (mock OAuth). */
import { useState } from 'react'
import { CalendarCheck2, CalendarOff, CalendarSync, LoaderCircle, Plug, RefreshCw, TriangleAlert, Unplug } from 'lucide-react'
import { Badge, Card, RepAvatar } from '../../components/ui'
import { Notice, confirmAction } from '../../components/states'
import { useAuth } from '../../auth/AuthContext'
import { ACCOUNTS } from '../../auth/permissions'
import { REPS, repById } from '../../data/mock'
import { request, useStore } from '../../data/store'
import { BUSY_BLOCKS, CALENDAR_LINKS, PROVIDER_LABEL, calendarLink, connectCalendar, disconnectCalendar, syncCalendar, type CalendarProvider } from '../../data/crews'
import { toast } from '../../lib/toast'
import { cn, formatHour } from '../../lib/utils'
import { locale, t } from '../../i18n'
import { shortDay } from '../agenda/crews'

const syncLabel = (iso: string) => new Date(iso).toLocaleString(locale(), { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

function ProviderLogo({ p, className }: { p: CalendarProvider; className?: string }) {
  return (
    <span className={cn('w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-white shrink-0', p === 'google' ? 'bg-[#1a73e8]' : 'bg-[#0f6cbd]', className)} aria-hidden="true">
      {p === 'google' ? 'G' : 'O'}
    </span>
  )
}

export function CalendarConnectTab() {
  useStore()
  const { user, can } = useAuth()
  const repId = user?.repId ?? ''
  const email = user?.email ?? ''
  const link = calendarLink(repId)
  const [busy, setBusy] = useState<'connect-google' | 'connect-outlook' | 'sync' | null>(null)
  const [failed, setFailed] = useState(false)

  const connect = (p: CalendarProvider, fail = false) => {
    setBusy(p === 'google' ? 'connect-google' : 'connect-outlook')
    setFailed(false)
    request(true, { ms: 1400, fail })
      .then(() => {
        connectCalendar(repId, p, email)
        toast(t('{p} connecté · {email}', { p: PROVIDER_LABEL[p], email }))
      })
      .catch(() => setFailed(true))
      .finally(() => setBusy(null))
  }
  const sync = () => {
    setBusy('sync')
    request(true, { ms: 900 })
      .then(() => {
        syncCalendar(repId)
        toast(t('Agenda synchronisé'))
      })
      .finally(() => setBusy(null))
  }
  const disconnect = async () => {
    if (!link) return
    const ok = await confirmAction({
      title: t('Déconnecter {p}?', { p: PROVIDER_LABEL[link.provider] }),
      body: t('Les plages occupées de cet agenda ne bloqueront plus la réservation de vos visites.'),
      confirmLabel: t('Déconnecter'),
      danger: true,
    })
    if (!ok) return
    disconnectCalendar(repId)
    toast(t('Agenda déconnecté'))
  }

  const myBlocks = link?.status === 'connecte' ? BUSY_BLOCKS.filter((b) => b.repId === repId).sort((a, b) => a.day - b.day || a.start - b.start) : []

  return (
    <div className="space-y-4">
      <Card title={t('Mon agenda externe')} icon={CalendarSync}>
        <div className="space-y-4">
          <Notice tone="info">
            {t('Connectez votre Google Agenda ou Outlook : les plages occupées (congés, rendez-vous personnels) bloquent la réservation de visites dans Hillman Centrale. Seule la disponibilité est importée, jamais le titre ni le détail de vos événements.')}
          </Notice>
          {!user ? null : link ? (
            <div className="rounded-xl border border-hairline p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <ProviderLogo p={link.provider} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink flex flex-wrap items-center gap-2">
                    {PROVIDER_LABEL[link.provider]}
                    {link.status === 'connecte' ? (
                      <Badge tone="good" dot>
                        {t('Connecté')}
                      </Badge>
                    ) : (
                      <Badge tone="critical" dot>
                        {t('Erreur de synchronisation')}
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-ink-mute truncate">{t('Connecté en tant que {email}', { email: link.email })}</p>
                  <p className="text-xs text-ink-mute">{t('Dernière synchronisation : {when}', { when: syncLabel(link.lastSync) })}</p>
                </div>
              </div>
              {link.status === 'erreur' && (
                <Notice tone="critical">
                  {t(link.error ?? 'La synchronisation a échoué.')} {t('Vos plages occupées ne sont plus importées.')}
                </Notice>
              )}
              <div className="flex flex-wrap gap-2">
                {link.status === 'erreur' ? (
                  <button className="btn btn-sm btn-primary" disabled={!!busy} onClick={() => connect(link.provider)}>
                    {busy?.startsWith('connect') ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />}
                    {t('Reconnecter')}
                  </button>
                ) : (
                  <button className="btn btn-sm btn-secondary" disabled={!!busy} onClick={sync}>
                    <RefreshCw className={cn('w-4 h-4', busy === 'sync' && 'animate-spin')} />
                    {busy === 'sync' ? t('Synchronisation…') : t('Synchroniser maintenant')}
                  </button>
                )}
                <button className="btn btn-sm btn-ghost hover:text-tone-critical-ink" disabled={!!busy} onClick={disconnect}>
                  <Unplug className="w-4 h-4" />
                  {t('Déconnecter')}
                </button>
              </div>
              {link.status === 'connecte' && (
                <div>
                  <p className="label-caps mb-1.5">{t('Plages occupées importées')}</p>
                  {myBlocks.length === 0 ? (
                    <p className="text-xs text-ink-mute">{t('Aucune plage occupée dans les 30 prochains jours.')}</p>
                  ) : (
                    <ul className="text-xs text-ink-secondary space-y-1">
                      {myBlocks.map((b) => (
                        <li key={b.id} className="flex items-center gap-2">
                          <CalendarOff className="w-3.5 h-3.5 text-ink-mute" />
                          <span className="tnum">
                            {shortDay(b.day)} · {formatHour(b.start)} – {formatHour(b.end)}
                          </span>
                          <span className="text-ink-mute">{t('Occupé')}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                {(['google', 'outlook'] as const).map((p) => {
                  const connecting = busy === `connect-${p}`
                  return (
                    <button key={p} disabled={!!busy} onClick={() => connect(p)} className="rounded-xl border border-hairline p-4 flex items-center gap-3 text-left hover:border-primary disabled:opacity-70">
                      <ProviderLogo p={p} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-ink">{PROVIDER_LABEL[p]}</span>
                        <span className="block text-xs text-ink-mute">{connecting ? t('Redirection vers {p}…', { p: p === 'google' ? 'Google' : 'Microsoft' }) : t('Connecter')}</span>
                      </span>
                      {connecting ? <LoaderCircle className="w-4 h-4 animate-spin text-ink-mute" /> : <Plug className="w-4 h-4 text-ink-mute" />}
                    </button>
                  )
                })}
              </div>
              {failed && (
                <Notice tone="critical">
                  {t('La connexion a échoué ou a été annulée. Réessayez; si le problème persiste, vérifiez que votre compte autorise l’accès aux agendas.')}
                </Notice>
              )}
              <button className="text-xs text-ink-mute underline" disabled={!!busy} onClick={() => connect('google', true)}>
                {t('Démo : simuler un échec de connexion')}
              </button>
            </div>
          )}
        </div>
      </Card>

      {can('calendar.allReps') && (
        <Card title={t('Agendas de l’équipe')} icon={CalendarCheck2} pad={false}>
          <ul className="divide-y divide-hairline">
            {ACCOUNTS.filter((a) => a.status !== 'desactive' && repById(a.repId)).map((a) => {
              const l = CALENDAR_LINKS.find((x) => x.repId === a.repId)
              return (
                <li key={a.id} className="px-5 py-3 flex flex-wrap items-center gap-3">
                  <RepAvatar id={a.repId} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink truncate">{a.name}</p>
                    <p className="text-xs text-ink-mute truncate">{l ? `${PROVIDER_LABEL[l.provider]} · ${l.email} · ${t('synchro {when}', { when: syncLabel(l.lastSync) })}` : t(REPS.find((r) => r.id === a.repId)?.role ?? '')}</p>
                  </div>
                  {!l ? (
                    <Badge>{t('Non connecté')}</Badge>
                  ) : l.status === 'connecte' ? (
                    <Badge tone="good" dot>
                      {t('Connecté')}
                    </Badge>
                  ) : (
                    <Badge tone="critical">
                      <TriangleAlert className="w-3 h-3" />
                      {t('À reconnecter')}
                    </Badge>
                  )}
                  {l?.status === 'erreur' && (
                    <button className="btn btn-xs btn-quiet" onClick={() => toast(t('Rappel envoyé à {name} pour reconnecter son agenda', { name: a.name.split(' ')[0] }))}>
                      {t('Relancer')}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}
