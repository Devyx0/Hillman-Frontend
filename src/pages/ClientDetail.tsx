import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Archive, Ban, CalendarDays, Download, Eye, FilePenLine, FileText, History, House, Inbox, Mail, MapPin, MessageSquare, Phone, PhoneCall, Plus, ShieldCheck, Smartphone, Tag, UserX } from 'lucide-react'
import { MessageButton, type MessageCtx } from '../components/messaging'
import { InfoGroups, Notes, RecordHeader, RecordLayout, SideCard, ThreadPanel, Timeline, type TimelineItem } from '../components/record'
import { ErrorState, SkeletonRows } from '../components/states'
import { Badge, CompanyBadge, Drawer, Empty, Page, RepName, StatusBadge, Tabs } from '../components/ui'
import { useApp } from '../context/AppContext'
import { LOGICIA_TONE, logiciaForClient, type LogiciaQuote } from '../data/logicia'
import { QUOTES, REPS, THREADS, clientById, companyById, fullName, repById, type Client, type Quote, type Thread } from '../data/mock'
import { isOptedOut } from '../data/settings'
import { request, useStore } from '../data/store'
import { openCreate } from '../lib/create'
import { toast } from '../lib/toast'
import { GST, QST, money } from '../lib/utils'
import { locale, t } from '../i18n'

/** Statuses that count as an open quote (mockup: `x4`). */
const OPEN_STATUSES = ['En soumission', 'À rappeler', 'Rappel courriel envoyé', 'Client va nous rappeler']

type TabId = 'conversation' | 'activite' | 'soumissions' | 'logicia' | 'notes' | 'fichiers'

const longDate = (iso: string) => new Date(iso + 'T12:00').toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' })

/** Archived Logicia PDF, shown as a read-only page preview. */
function LogiciaPdf({ q, client, onClose }: { q: LogiciaQuote | null; client: Client; onClose: () => void }) {
  const download = (file: string) => toast(t('Téléchargement de {file}', { file }))
  return (
    <Drawer open={!!q} onClose={onClose} title={q ? q.pdf : ''} width="max-w-2xl">
      {q && (
        <div className="p-4 md:p-6 bg-sand min-h-full space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">
              <Archive className="w-3 h-3" />
              {t('Archive Logicia · lecture seule')}
            </Badge>
            <button onClick={() => download(q.pdf)} className="btn btn-xs btn-secondary ml-auto">
              <Download className="w-3.5 h-3.5" />
              {t('Télécharger')}
            </button>
          </div>
          <article className="bg-white shadow-card rounded-sm aspect-[8.5/11] p-6 md:p-10 text-ink flex flex-col gap-6 text-xs md:text-sm">
            <header className="flex items-start justify-between gap-4 border-b border-hairline pb-4">
              <div>
                <p className="text-base md:text-lg font-semibold">{companyById(q.company).name}</p>
                <p className="text-ink-mute">
                  {t('RBQ')} {companyById(q.company).rbq} · {companyById(q.company).phone}
                </p>
              </div>
              <div className="text-right">
                <p className="label-caps">{t('Soumission')}</p>
                <p className="font-semibold tnum">{q.no}</p>
                <p className="text-ink-mute">{longDate(q.date)}</p>
              </div>
            </header>
            <section>
              <p className="label-caps mb-1">{t('Client')}</p>
              <p className="font-semibold">{fullName(client)}</p>
              <p className="text-ink-mute">
                {client.no}, {client.street}, {client.city} {client.postal}
              </p>
            </section>
            <section className="flex-1">
              <p className="label-caps mb-2">{t('Description des travaux')}</p>
              <p>{t(q.workType)}</p>
              <div className="mt-3 space-y-1.5" aria-hidden="true">
                {[92, 80, 86, 64].map((w, i) => (
                  <span key={i} className="block h-2 rounded bg-sand" style={{ width: `${w}%` }} />
                ))}
              </div>
            </section>
            <section className="ml-auto w-full max-w-[16rem] space-y-1 tnum">
              {(
                [
                  [t('Sous-total'), money(q.amount)],
                  [t('TPS'), money(q.amount * GST)],
                  [t('TVQ'), money(q.amount * QST)],
                ] as const
              ).map(([l, v]) => (
                <p key={l} className="flex justify-between text-ink-mute">
                  <span>{l}</span>
                  <span>{v}</span>
                </p>
              ))}
              <p className="flex justify-between font-semibold border-t border-hairline pt-1">
                <span>{t('Total')}</span>
                <span>{money(q.amount * (1 + GST + QST))}</span>
              </p>
            </section>
            <footer className="text-2xs text-ink-faint border-t border-hairline pt-3">{t('Préparée par {name} dans Logicia · document importé dans Hillman Centrale', { name: q.by })}</footer>
          </article>
        </div>
      )}
    </Drawer>
  )
}

/** Read-only past quotes imported from Logicia (the previous software). */
function LogiciaHistory({ client }: { client: Client }) {
  const [state, setState] = useState<{ status: 'loading' | 'error' | 'ready'; rows: LogiciaQuote[] }>({ status: 'loading', rows: [] })
  const [attempt, setAttempt] = useState(0)
  const [preview, setPreview] = useState<LogiciaQuote | null>(null)
  useEffect(() => {
    let live = true
    request(() => logiciaForClient(client.id), { ms: 450 }).then(
      (rows) => live && setState({ status: 'ready', rows }),
      () => live && setState({ status: 'error', rows: [] }),
    )
    return () => {
      live = false
    }
  }, [client.id, attempt])

  const download = (file: string) => toast(t('Téléchargement de {file}', { file }))
  return (
    <section className="bg-white rounded-xl shadow-card overflow-hidden">
      <header className="px-5 py-3.5 border-b border-hairline flex items-center gap-2">
        <History className="w-4 h-4 text-ink-mute" />
        <h3 className="text-sm font-semibold text-ink">{t('Historique Logicia')}</h3>
        <span className="text-xs text-ink-mute ml-auto">{t('Lecture seule · avant Hillman Centrale')}</span>
      </header>
      {state.status === 'loading' && <SkeletonRows rows={3} />}
      {state.status === 'error' && (
        <ErrorState
          onRetry={() => {
            setState({ status: 'loading', rows: [] })
            setAttempt((n) => n + 1)
          }}
        />
      )}
      {state.status === 'ready' && state.rows.length === 0 && (
        <Empty icon={Archive} title={t('Aucune soumission dans Logicia')}>
          {t("Ce client n'a pas d'historique dans l'ancien logiciel.")}
        </Empty>
      )}
      {state.status === 'ready' && state.rows.length > 0 && (
        <ul className="divide-y divide-hairline">
          {state.rows.map((q) => (
            <li key={q.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-ink tnum">{q.no}</span>
                  <CompanyBadge id={q.company} />
                  <Badge tone={LOGICIA_TONE[q.status]} dot>
                    {t(q.status)}
                  </Badge>
                </div>
                <p className="text-xs text-ink-mute mt-0.5 truncate">
                  {longDate(q.date)} · {t(q.workType)} · {q.by}
                </p>
              </div>
              <div className="flex items-center gap-2 sm:justify-end">
                <span className="text-sm font-semibold tnum text-ink mr-auto sm:mr-2">{money(q.amount, false)}</span>
                <button onClick={() => setPreview(q)} className="btn btn-xs btn-secondary">
                  <Eye className="w-3.5 h-3.5" />
                  {t('Voir le PDF')}
                </button>
                <button onClick={() => download(q.pdf)} className="btn btn-xs btn-quiet" aria-label={t('Télécharger {file}', { file: q.pdf })}>
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <LogiciaPdf q={preview} client={client} onClose={() => setPreview(null)} />
    </section>
  )
}

export default function ClientDetail() {
  useStore()
  const { id = '' } = useParams()
  const client = clientById(id)
  if (!client)
    return (
      <Page>
        <Empty icon={UserX} title={t('Client introuvable')}>
          {t('Cette fiche a peut-être été fusionnée ou supprimée.')}
        </Empty>
        <div className="flex justify-center">
          <Link to="/clients" className="btn btn-sm btn-secondary">
            {t('Retour aux clients')}
          </Link>
        </div>
      </Page>
    )
  return <ClientRecord key={client.id} client={client} />
}

function ClientRecord({ client }: { client: Client }) {
  const version = useStore()
  const navigate = useNavigate()
  const { scope } = useApp()
  const isDemo = client.id === 'c66700'
  const [tab, setTab] = useState<TabId>('conversation')
  const textPhone = client.mobile ?? client.phone
  const optedOut = isOptedOut(client.mobile) || isOptedOut(client.phone)

  const quotes = useMemo<Quote[]>(
    () =>
      isDemo
        ? [
            ...QUOTES.filter((q) => q.clientId === client.id),
            { ...QUOTES[0], id: 'qx1', no: 'G58114', company: 'sg', repId: 'bto', status: 'Payé', date: '2025-08-28', amount: 200, workType: 'Nettoyage de gouttières', views: 0 },
            { ...QUOTES[0], id: 'qx2', no: 'G31877', company: 'sg', repId: 'plc', status: 'Payé', date: '2021-04-30', amount: 2500, workType: 'Gouttières · T-Rex M-5200', views: 0 },
          ]
        : QUOTES.filter((q) => q.clientId === client.id),
    [client.id, isDemo, version], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const companies = [...new Set(quotes.map((q) => q.company))]
  const open = quotes.filter((q) => OPEN_STATUSES.includes(q.status))
  const activeCompany = scope !== 'all' ? scope : (open[0]?.company ?? quotes[0]?.company ?? 'toit')
  const companyRep = REPS.find((r) => r.company === activeCompany)
  const owner = repById(open[0]?.repId ?? quotes[0]?.repId ?? 'jph')!
  const ctx: MessageCtx = { name: fullName(client), first: client.first, quoteNo: open[0]?.no ?? quotes[0]?.no, company: companyById(activeCompany).name, rep: companyRep?.first ?? 'Jean-Pierre' }
  const lifetime = isDemo ? 2700 : client.lifetime

  const thread = useMemo<Thread>(() => {
    const existing = THREADS.find((t) => t.clientId === client.id)
    if (existing) return existing
    const q = quotes[0]
    return {
      id: 'ct-' + client.id,
      clientId: client.id,
      name: fullName(client),
      company: q?.company ?? 'toit',
      channel: 'email',
      unread: 0,
      last: '',
      at: '',
      assigned: q?.repId ?? 'jph',
      messages: q
        ? [
            {
              id: client.id + 'm1',
              dir: 'out',
              channel: 'email',
              at: q.date,
              by: repById(q.repId)!.name,
              text: t('Bonjour {first}, voici votre soumission {no}. Vous pouvez la consulter et la signer en ligne.', { first: client.first, no: q.no }),
              meta: t('Soumission {no}', { no: q.no }) + (q.views ? ' · ' + t('Ouverte {n} fois', { n: q.views }) : ''),
            },
          ]
        : [],
    }
  }, [client, quotes])

  const activity: TimelineItem[] = isDemo
    ? [
        { icon: MessageSquare, title: t('Texto reçu'), at: t("Aujourd'hui 8 h 41") },
        { icon: Eye, title: t('A ouvert H64320 (3e fois)'), at: t("Aujourd'hui 8 h 30"), tone: 'primary' },
        { icon: MessageSquare, title: t('Texto de suivi de Jean-Pierre'), at: t('Dim. 18 oct.') },
        { icon: Mail, title: t('Soumission H64320 envoyée'), at: t('Ven. 16 oct.') },
        { icon: CalendarDays, title: t('Estimation à domicile'), at: t('Jeu. 15 oct.') },
        { icon: PhoneCall, title: t('Appel entrant · 3 min 24 s'), at: t('Mar. 13 oct.') },
        { icon: FilePenLine, title: t('G58114 · Payé · Signature Gouttières'), at: t('28 août 2025') },
        { icon: FilePenLine, title: t('G31877 · Payé · Signature Gouttières'), at: t('30 avr. 2021') },
      ]
    : quotes.slice(0, 5).map((q) => ({ icon: FilePenLine, title: `${q.no} · ${t(q.status)}`, at: q.date }))
  const nextStep = isDemo ? { when: t('Mar. 20 oct. · 15 h 00'), what: t('Revoir le client') } : null
  const address = `${client.no}, ${client.street}, ${client.city} ${client.postal}`

  return (
    <Page>
      <RecordHeader
        back={{ to: '/clients', label: t('Clients') }}
        name={fullName(client)}
        chips={
          <>
            <Badge tone="good" dot>
              {t('Client')}
            </Badge>
            {companies.map((c) => (
              <CompanyBadge key={c} id={c} />
            ))}
            <span className="text-xs text-ink-mute">{t(client.type)}</span>
            {optedOut && (
              <Badge tone="critical">
                <Ban className="w-3 h-3" />
                {t('Désabonné des textos')}
              </Badge>
            )}
          </>
        }
        actions={
          <>
            <button onClick={() => toast(t('Appel vers {phone}…', { phone: client.mobile ?? client.phone }))} className="btn btn-sm btn-secondary">
              <Phone className="w-4 h-4" />
              {t('Appeler')}
            </button>
            {optedOut ? (
              <button disabled className="btn btn-sm btn-secondary" title={t('Ce client a répondu STOP : aucun texto ne peut lui être envoyé.')}>
                <Ban className="w-4 h-4" />
                {t('Texto')}
              </button>
            ) : (
              <MessageButton kind="sms" ctx={ctx} label={t('Texto')} />
            )}
            <MessageButton kind="email" ctx={ctx} label={t('Courriel')} />
            <button onClick={() => openCreate('quote', { clientId: client.id, company: scope !== 'all' ? scope : undefined })} className="btn btn-sm btn-primary">
              <Plus className="w-4 h-4" />
              {t('Créer une soumission')}
            </button>
          </>
        }
      />
      <div className="grid grid-cols-3 rounded-lg overflow-hidden bg-white shadow-card divide-x divide-hairline">
        {(
          [
            [t('Valeur à vie'), money(lifetime, false)],
            [t('Soumissions ouvertes'), open.length ? money(open.reduce((n, q) => n + q.amount, 0), false) : '—'],
            [t('Client depuis'), client.since],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="h-10 px-3 flex items-center justify-center gap-2 min-w-0">
            <span className="text-2xs text-ink-mute truncate hidden sm:inline">{label}</span>
            <span className="text-sm font-semibold tnum truncate">{value}</span>
          </div>
        ))}
      </div>
      <RecordLayout
        left={
          <InfoGroups
            groups={[
              {
                title: t('Coordonnées'),
                rows: [
                  { icon: Phone, label: t('Téléphone'), value: client.phone, copy: client.phone },
                  ...(client.mobile ? [{ icon: Smartphone, label: t('Cellulaire'), value: client.mobile, copy: client.mobile }] : []),
                  {
                    icon: Mail,
                    label: t('Courriel'),
                    value: (
                      <span className="block truncate" title={client.email}>
                        {client.email}
                      </span>
                    ),
                    copy: client.email,
                  },
                  { icon: MapPin, label: t('Adresse'), value: address, copy: address },
                ],
              },
              {
                title: t('Détails'),
                rows: [
                  { icon: Inbox, label: t('Source'), value: t(client.source) },
                  { icon: House, label: t('Propriété'), value: isDemo ? t('Maison 1998 · 2 étages') : t(client.type) },
                  {
                    icon: ShieldCheck,
                    label: t('Consentement texto'),
                    value: optedOut ? <span className="font-semibold text-tone-critical-ink">{t('Désabonné des textos (STOP)')}</span> : client.consentSms ? t('Oui') : t('Non'),
                  },
                  {
                    icon: Tag,
                    label: t('Étiquettes'),
                    value: (
                      <span className="flex flex-wrap gap-1 pt-0.5">
                        {(isDemo ? ['Bardeaux', 'Décision en couple'] : [client.type]).map((tag) => (
                          <span key={tag} className="badge bg-sand text-ink-secondary">
                            {t(tag)}
                          </span>
                        ))}
                      </span>
                    ),
                  },
                ],
              },
            ]}
          />
        }
        center={
          <>
            <Tabs<TabId>
              value={tab}
              onChange={setTab}
              tabs={[
                { value: 'conversation', label: t('Conversation'), icon: MessageSquare },
                { value: 'activite', label: t('Activité') },
                { value: 'soumissions', label: t('Soumissions'), count: quotes.length },
                { value: 'logicia', label: t('Historique Logicia'), icon: History },
                { value: 'notes', label: t('Notes') },
                { value: 'fichiers', label: t('Fichiers') },
              ]}
            />
            {tab === 'conversation' && <ThreadPanel thread={thread} phone={textPhone} />}
            {tab === 'logicia' && <LogiciaHistory client={client} />}
            {tab === 'activite' && <Timeline items={activity} />}
            {tab === 'soumissions' && quotes.length === 0 && (
              <div className="bg-white rounded-xl shadow-card">
                <Empty icon={FileText} title={t('Aucune soumission')}>
                  {t('Créez la première soumission de ce client.')}
                </Empty>
                <div className="flex justify-center pb-6 -mt-4">
                  <button onClick={() => openCreate('quote', { clientId: client.id, company: scope !== 'all' ? scope : undefined })} className="btn btn-sm btn-primary">
                    <Plus className="w-4 h-4" />
                    {t('Créer une soumission')}
                  </button>
                </div>
              </div>
            )}
            {tab === 'soumissions' && quotes.length > 0 && (
              <div className="bg-white rounded-xl shadow-card overflow-x-auto">
                <table className="w-full min-w-[560px]">
                  <thead className="border-b border-hairline">
                    <tr>
                      <th className="th">{t('No')}</th>
                      <th className="th">{t('Travaux')}</th>
                      <th className="th">{t('Représentant')}</th>
                      <th className="th">{t('Statut')}</th>
                      <th className="th text-right">{t('Montant')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {quotes.map((q) => (
                      <tr key={q.id} onClick={() => (q.id.startsWith('qx') ? toast(t('Soumission archivée')) : navigate(`/soumissions/${q.id}`))} className="hover:bg-sand/60 cursor-pointer">
                        <td className="td font-semibold text-ink tnum">{q.no}</td>
                        <td className="td">{t(q.workType)}</td>
                        <td className="td">
                          <RepName id={q.repId} />
                        </td>
                        <td className="td">
                          <StatusBadge status={q.status} />
                        </td>
                        <td className="td text-right tnum font-semibold text-ink">{money(q.amount, false)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {tab === 'notes' && <Notes initial={isDemo ? [{ at: t('16 oct.'), by: 'Jean-Pierre Hillman', text: t('Décide avec son conjoint. Préfère les textos après 17 h.') }] : []} />}
            {tab === 'fichiers' && quotes.length === 0 && (
              <div className="bg-white rounded-xl shadow-card">
                <Empty icon={FileText} title={t('Aucun fichier')} />
              </div>
            )}
            {tab === 'fichiers' && quotes.length > 0 && (
              <ul className="bg-white rounded-xl shadow-card divide-y divide-hairline">
                {quotes.slice(0, 4).map((q) => (
                  <li key={q.id} className="flex items-center gap-3 px-5 py-3">
                    <FileText className="w-4 h-4 text-ink-mute" />
                    <span className="flex-1 text-sm font-semibold">{t('Soumission {no}.pdf', { no: q.no })}</span>
                    <span className="text-xs text-ink-mute">{q.date}</span>
                    <button onClick={() => toast(t('Téléchargé'))} className="p-1.5 rounded hover:bg-sand" aria-label={t('Télécharger')}>
                      <Download className="w-4 h-4 text-ink-mute" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        }
        right={
          <>
            <SideCard title={t('Prochaine étape')}>
              {nextStep ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-lg bg-primary-wash text-primary-press flex items-center justify-center">
                      <CalendarDays className="w-5 h-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{nextStep.when}</p>
                      <p className="text-xs text-ink-mute">
                        {nextStep.what} · {owner.first}
                      </p>
                    </div>
                  </div>
                  {optedOut ? (
                    <MessageButton kind="email" ctx={ctx} label={t('Envoyer le rappel')} variant="secondary" className="w-full" />
                  ) : (
                    <MessageButton kind="reminder" ctx={{ ...ctx, date: nextStep.when }} label={t('Envoyer le rappel')} variant="secondary" className="w-full" />
                  )}
                </div>
              ) : (
                <button onClick={() => navigate(`/agenda?nouveau=${open[0]?.id ?? 'q64320'}`)} className="btn btn-sm btn-secondary w-full">
                  <CalendarDays className="w-4 h-4" />
                  {t('Planifier un rendez-vous')}
                </button>
              )}
            </SideCard>
            {open[0] && (
              <SideCard title={t('Soumission ouverte')}>
                <Link to={`/soumissions/${open[0].id}`} className="block group">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold group-hover:text-primary-press">{open[0].no}</p>
                    <StatusBadge status={open[0].status} />
                  </div>
                  <p className="text-xs text-ink-mute mt-0.5 truncate">{t(open[0].workType)}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xl font-semibold tnum">{money(open[0].amount, false)}</p>
                    {open[0].views > 0 && (
                      <span className="text-xs font-semibold text-primary-press inline-flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        {open[0].views}×
                      </span>
                    )}
                  </div>
                </Link>
              </SideCard>
            )}
            <SideCard title={t('Responsable')}>
              <RepName id={owner.id} size="md" />
            </SideCard>
          </>
        }
      />
    </Page>
  )
}
