import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CalendarDays, Download, Eye, FilePenLine, FileText, House, Inbox, Mail, MapPin, MessageSquare, Phone, PhoneCall, Plus, ShieldCheck, Smartphone, Tag } from 'lucide-react'
import { MessageButton, type MessageCtx } from '../components/messaging'
import { InfoGroups, Notes, RecordHeader, RecordLayout, SideCard, ThreadPanel, Timeline, type TimelineItem } from '../components/record'
import { Badge, CompanyBadge, Page, RepName, StatusBadge, Tabs } from '../components/ui'
import { useApp } from '../context/AppContext'
import { CLIENTS, QUOTES, REPS, THREADS, clientById, companyById, fullName, repById, type Quote, type Thread } from '../data/mock'
import { toast } from '../lib/toast'
import { money } from '../lib/utils'

/** Statuses that count as an open quote (mockup: `x4`). */
const OPEN_STATUSES = ['En soumission', 'À rappeler', 'Rappel courriel envoyé', 'Client va nous rappeler']

type TabId = 'conversation' | 'activite' | 'soumissions' | 'notes' | 'fichiers'

export default function ClientDetail() {
  const { id = 'c66700' } = useParams()
  const navigate = useNavigate()
  const { scope } = useApp()
  const client = clientById(id) ?? CLIENTS[0]
  const isDemo = client.id === 'c66700'
  const [tab, setTab] = useState<TabId>('conversation')

  const quotes = useMemo<Quote[]>(
    () =>
      isDemo
        ? [
            QUOTES[0],
            { ...QUOTES[0], id: 'qx1', no: 'G58114', company: 'sg', repId: 'bto', status: 'Payé', date: '2025-08-28', amount: 200, workType: 'Nettoyage de gouttières', views: 0 },
            { ...QUOTES[0], id: 'qx2', no: 'G31877', company: 'sg', repId: 'plc', status: 'Payé', date: '2021-04-30', amount: 2500, workType: 'Gouttières · T-Rex M-5200', views: 0 },
          ]
        : QUOTES.filter((q) => q.clientId === client.id),
    [client.id, isDemo],
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
              text: `Bonjour ${client.first}, voici votre soumission ${q.no}. Vous pouvez la consulter et la signer en ligne.`,
              meta: `Soumission ${q.no}${q.views ? ` · Ouverte ${q.views} fois` : ''}`,
            },
          ]
        : [],
    }
  }, [client, quotes])

  const activity: TimelineItem[] = isDemo
    ? [
        { icon: MessageSquare, title: 'Texto reçu', at: "Aujourd'hui 8 h 41" },
        { icon: Eye, title: 'A ouvert H64320 (3e fois)', at: "Aujourd'hui 8 h 30", tone: 'primary' },
        { icon: MessageSquare, title: 'Texto de suivi J+2 (automatique)', at: 'Dim. 18 oct.' },
        { icon: Mail, title: 'Soumission H64320 envoyée', at: 'Ven. 16 oct.' },
        { icon: CalendarDays, title: 'Estimation à domicile', at: 'Jeu. 15 oct.' },
        { icon: PhoneCall, title: 'Appel entrant · 3 min 24 s', at: 'Mar. 13 oct.' },
        { icon: FilePenLine, title: 'G58114 · Payé · Signature Gouttières', at: '28 août 2025' },
        { icon: FilePenLine, title: 'G31877 · Payé · Signature Gouttières', at: '30 avr. 2021' },
      ]
    : quotes.slice(0, 5).map((q) => ({ icon: FilePenLine, title: `${q.no} · ${q.status}`, at: q.date }))
  const nextStep = isDemo ? { when: 'Mar. 20 oct. · 15 h 00', what: 'Revoir le client' } : null
  const address = `${client.no}, ${client.street}, ${client.city} ${client.postal}`

  return (
    <Page>
      <RecordHeader
        back={{ to: '/clients', label: 'Clients' }}
        name={fullName(client)}
        chips={
          <>
            <Badge tone="good" dot>
              Client
            </Badge>
            {companies.map((c) => (
              <CompanyBadge key={c} id={c} />
            ))}
            <span className="text-xs text-ink-mute">{client.type}</span>
          </>
        }
        actions={
          <>
            <button onClick={() => toast(`Appel vers ${client.mobile ?? client.phone}…`)} className="btn btn-sm btn-secondary">
              <Phone className="w-4 h-4" />
              Appeler
            </button>
            <MessageButton kind="sms" ctx={ctx} label="Texto" />
            <MessageButton kind="email" ctx={ctx} label="Courriel" />
            <button
              onClick={() => {
                toast('Nouvelle soumission · coordonnées copiées')
                navigate('/soumissions/q64320')
              }}
              className="btn btn-sm btn-primary"
            >
              <Plus className="w-4 h-4" />
              Nouvelle soumission
            </button>
          </>
        }
      />
      <div className="grid grid-cols-3 rounded-lg overflow-hidden bg-white shadow-card divide-x divide-hairline">
        {(
          [
            ['Valeur à vie', money(lifetime, false)],
            ['Soumissions ouvertes', open.length ? money(open.reduce((n, q) => n + q.amount, 0), false) : '—'],
            ['Client depuis', client.since],
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
                title: 'Coordonnées',
                rows: [
                  { icon: Phone, label: 'Téléphone', value: client.phone, copy: client.phone },
                  ...(client.mobile ? [{ icon: Smartphone, label: 'Cellulaire', value: client.mobile, copy: client.mobile }] : []),
                  {
                    icon: Mail,
                    label: 'Courriel',
                    value: (
                      <span className="block truncate" title={client.email}>
                        {client.email}
                      </span>
                    ),
                    copy: client.email,
                  },
                  { icon: MapPin, label: 'Adresse', value: address, copy: address },
                ],
              },
              {
                title: 'Détails',
                rows: [
                  { icon: Inbox, label: 'Source', value: client.source },
                  { icon: House, label: 'Propriété', value: isDemo ? 'Maison 1998 · 2 étages' : client.type },
                  { icon: ShieldCheck, label: 'Consentement texto', value: client.consentSms ? 'Oui' : 'Non' },
                  {
                    icon: Tag,
                    label: 'Étiquettes',
                    value: (
                      <span className="flex flex-wrap gap-1 pt-0.5">
                        {(isDemo ? ['Bardeaux', 'Décision en couple'] : [client.type]).map((t) => (
                          <span key={t} className="badge bg-sand text-ink-secondary">
                            {t}
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
                { value: 'conversation', label: 'Conversation', icon: MessageSquare },
                { value: 'activite', label: 'Activité' },
                { value: 'soumissions', label: 'Soumissions', count: quotes.length },
                { value: 'notes', label: 'Notes' },
                { value: 'fichiers', label: 'Fichiers' },
              ]}
            />
            {tab === 'conversation' && <ThreadPanel thread={thread} />}
            {tab === 'activite' && <Timeline items={activity} />}
            {tab === 'soumissions' && (
              <div className="bg-white rounded-xl shadow-card overflow-x-auto">
                <table className="w-full min-w-[560px]">
                  <thead className="border-b border-hairline">
                    <tr>
                      <th className="th">No</th>
                      <th className="th">Travaux</th>
                      <th className="th">Représentant</th>
                      <th className="th">Statut</th>
                      <th className="th text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {quotes.map((q) => (
                      <tr key={q.id} onClick={() => (q.id.startsWith('qx') ? toast('Soumission archivée') : navigate(`/soumissions/${q.id}`))} className="hover:bg-sand/60 cursor-pointer">
                        <td className="td font-semibold text-ink tnum">{q.no}</td>
                        <td className="td">{q.workType}</td>
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
            {tab === 'notes' && <Notes initial={isDemo ? [{ at: '16 oct.', by: 'Jean-Pierre Hillman', text: 'Décide avec son conjoint. Préfère les textos après 17 h.' }] : []} />}
            {tab === 'fichiers' && (
              <ul className="bg-white rounded-xl shadow-card divide-y divide-hairline">
                {quotes.slice(0, 4).map((q) => (
                  <li key={q.id} className="flex items-center gap-3 px-5 py-3">
                    <FileText className="w-4 h-4 text-ink-mute" />
                    <span className="flex-1 text-sm font-semibold">Soumission {q.no}.pdf</span>
                    <span className="text-xs text-ink-mute">{q.date}</span>
                    <button onClick={() => toast('Téléchargé')} className="p-1.5 rounded hover:bg-sand" aria-label="Télécharger">
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
            <SideCard title="Prochaine étape">
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
                  <MessageButton kind="reminder" ctx={{ ...ctx, date: nextStep.when }} label="Envoyer le rappel" variant="secondary" className="w-full" />
                </div>
              ) : (
                <button onClick={() => navigate(`/agenda?nouveau=${open[0]?.id ?? 'q64320'}`)} className="btn btn-sm btn-secondary w-full">
                  <CalendarDays className="w-4 h-4" />
                  Planifier un rendez-vous
                </button>
              )}
            </SideCard>
            {open[0] && (
              <SideCard title="Soumission ouverte">
                <Link to={`/soumissions/${open[0].id}`} className="block group">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold group-hover:text-primary-press">{open[0].no}</p>
                    <StatusBadge status={open[0].status} />
                  </div>
                  <p className="text-xs text-ink-mute mt-0.5 truncate">{open[0].workType}</p>
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
            <SideCard title="Responsable">
              <RepName id={owner.id} size="md" />
            </SideCard>
          </>
        }
      />
    </Page>
  )
}
