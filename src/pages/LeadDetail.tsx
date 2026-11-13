import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Bot, CalendarCheck, CalendarClock, Check, FilePenLine, Flame, House, Inbox, Mail, MapPin, MessageSquare, Phone, Tag, UserRound, Wallet, Wrench } from 'lucide-react'
import { LeadStageBadge } from '../components/leads'
import { MessageButton, type MessageCtx } from '../components/messaging'
import { InfoGroups, Notes, RecordHeader, RecordLayout, SideCard, StageBar, ThreadPanel, Timeline, type TimelineItem } from '../components/record'
import { CompanyBadge, Drawer, Page, RepAvatar, Tabs } from '../components/ui'
import { ALL_LEADS, LEAD_PROFILES, LEAD_STAGES, channelStyle, leadStage, threadForLead } from '../data/leads'
import { REPS, companyById, repById, type Lead } from '../data/mock'
import { toast } from '../lib/toast'
import { cn } from '../lib/utils'

/** Bookable estimate slots (mockup: `T3`). */
const SLOTS = [
  { day: 'Mer. 21 oct.', times: ['13 h 30', '15 h 00'] },
  { day: 'Jeu. 22 oct.', times: ['11 h 00', '14 h 00'] },
  { day: 'Ven. 23 oct.', times: ['8 h 30', '10 h 00', '13 h 00'] },
]

/** Stage index → lead status (mockup: `R3`). */
const STAGE_STATUS = ['Nouveau', 'À contacter', 'Qualifié par IA', 'RDV réservé']

type Tab = 'conversation' | 'activite' | 'notes'

/** Lead record (mockup: `z3`). */
export default function LeadDetail() {
  const { id = 'l1' } = useParams()
  const navigate = useNavigate()
  const source = ALL_LEADS.find((l) => l.id === id) ?? ALL_LEADS[0]
  const [lead, setLead] = useState<Lead>(source)
  const [tab, setTab] = useState<Tab>('conversation')
  const [booking, setBooking] = useState(false)
  const [slot, setSlot] = useState<string | null>(null)
  const [changingRep, setChangingRep] = useState(false)
  if (lead.id !== source.id) setLead(source)

  const profile = LEAD_PROFILES[lead.id]
  const rep = repById(lead.repId ?? 'jph')!
  const company = companyById(lead.company)
  const thread = useMemo(() => threadForLead(lead), [lead])
  const stage = leadStage(lead)
  const channel = channelStyle(lead.channel)
  const ctx: MessageCtx = { name: lead.name, first: lead.name.split(' ')[0], company: company.name, rep: rep.first }

  const activity: TimelineItem[] = [
    { icon: channel.icon, title: `Demande reçue · ${lead.channel}`, at: lead.ago },
    { icon: Bot, title: "Réponse de l'agent IA", at: lead.ago, meta: 'en 38 s' },
    ...(lead.booked ? [{ icon: CalendarCheck, title: 'Estimation réservée', at: lead.ago, meta: `${lead.booked} · ${rep.first}`, tone: 'primary' as const }] : []),
    { icon: UserRound, title: `Assigné à ${rep.name}`, at: lead.ago },
  ]

  const createQuote = () => {
    toast('Soumission créée à partir du lead')
    navigate('/soumissions/q64320')
  }

  return (
    <Page>
      <RecordHeader
        back={{ to: '/leads', label: 'Leads' }}
        name={lead.name}
        chips={
          <>
            <LeadStageBadge lead={lead} />
            <CompanyBadge id={lead.company} />
            {profile && <span className="text-xs text-ink-mute">{profile.type}</span>}
          </>
        }
        actions={
          <>
            <button onClick={() => toast(`Appel vers ${lead.phone}…`)} className="btn btn-sm btn-secondary">
              <Phone className="w-4 h-4" />
              Appeler
            </button>
            <MessageButton kind="sms" ctx={ctx} label="Texto" />
            <MessageButton kind="email" ctx={ctx} label="Courriel" />
            <button onClick={createQuote} className="btn btn-sm btn-primary">
              <FilePenLine className="w-4 h-4" />
              Créer la soumission
            </button>
          </>
        }
      />

      {stage >= 0 && (
        <StageBar
          stages={LEAD_STAGES}
          current={stage}
          onPick={(i) => {
            if (i === 4) {
              createQuote()
              return
            }
            if (i === 3 && !lead.booked) {
              setBooking(true)
              return
            }
            setLead((l) => ({ ...l, status: STAGE_STATUS[i] }))
            toast(`Étape : ${LEAD_STAGES[i]}`)
          }}
        />
      )}

      <RecordLayout
        left={
          <InfoGroups
            groups={[
              {
                title: 'Coordonnées',
                rows: [
                  { icon: Phone, label: 'Téléphone', value: lead.phone, copy: lead.phone },
                  ...(lead.email
                    ? [
                        {
                          icon: Mail,
                          label: 'Courriel',
                          value: (
                            <span className="block truncate" title={lead.email}>
                              {lead.email}
                            </span>
                          ),
                          copy: lead.email,
                        },
                      ]
                    : []),
                  { icon: MapPin, label: 'Adresse', value: profile?.address ?? lead.city, copy: profile?.address },
                ],
              },
              {
                title: 'Demande',
                rows: [
                  { icon: Wrench, label: 'Travaux', value: profile?.work ?? '—' },
                  { icon: Flame, label: 'Urgence', value: profile?.urgency ?? '—' },
                  { icon: Wallet, label: 'Budget', value: profile?.budget ?? '—' },
                  { icon: CalendarClock, label: 'Échéance', value: profile?.timeline ?? '—' },
                  { icon: House, label: 'Propriété', value: profile?.property ?? '—' },
                ],
              },
              {
                title: 'Détails',
                rows: [
                  {
                    icon: Inbox,
                    label: 'Source',
                    value: (
                      <span className="inline-flex items-center gap-1.5">
                        <span className={cn('w-5 h-5 rounded flex items-center justify-center', channel.tone)}>
                          <channel.icon className="w-3 h-3" />
                        </span>
                        {lead.channel}
                      </span>
                    ),
                  },
                  {
                    icon: Tag,
                    label: 'Étiquettes',
                    value: (
                      <span className="flex flex-wrap gap-1 pt-0.5">
                        {(profile?.tags ?? []).map((t) => (
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
            <Tabs<Tab>
              value={tab}
              onChange={setTab}
              tabs={[
                { value: 'conversation', label: 'Conversation', icon: MessageSquare },
                { value: 'activite', label: 'Activité' },
                { value: 'notes', label: 'Notes' },
              ]}
            />
            {tab === 'conversation' && <ThreadPanel thread={thread} />}
            {tab === 'activite' && <Timeline items={activity} />}
            {tab === 'notes' && <Notes initial={lead.id === 'l3' ? [{ at: 'Hier', by: 'Hélène Petitpas', text: 'Le CA se réunit jeudi. Demander les plans des toits.' }] : []} />}
          </>
        }
        right={
          <>
            <SideCard title="Prochaine étape">
              {lead.booked ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-lg bg-tone-good-soft text-tone-good-ink flex items-center justify-center">
                      <CalendarCheck className="w-5 h-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{lead.booked}</p>
                      <p className="text-xs text-ink-mute">Estimation · {rep.first}</p>
                    </div>
                  </div>
                  <MessageButton kind="reminder" ctx={{ ...ctx, date: lead.booked }} label="Envoyer le rappel" variant="secondary" className="w-full" />
                </div>
              ) : (
                <button onClick={() => setBooking(true)} className="btn btn-sm btn-primary w-full">
                  <CalendarCheck className="w-4 h-4" />
                  Réserver une estimation
                </button>
              )}
            </SideCard>
            <SideCard title="Résumé de l'agent IA">
              <p className="text-sm text-ink-secondary">{lead.aiSummary}</p>
            </SideCard>
            <SideCard
              title="Responsable"
              action={
                <button onClick={() => setChangingRep((o) => !o)} className="text-xs font-semibold text-primary-press">
                  Changer
                </button>
              }
            >
              <div className="flex items-center gap-3">
                <RepAvatar id={rep.id} size="md" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{rep.name}</p>
                  <p className="text-xs text-ink-mute">{rep.phone}</p>
                </div>
              </div>
              {changingRep && (
                <ul className="mt-3 border-t border-hairline pt-2">
                  {REPS.filter((r) => r.company === lead.company || r.company === 'all').map((r) => (
                    <li key={r.id}>
                      <button
                        onClick={() => {
                          setLead((l) => ({ ...l, repId: r.id }))
                          setChangingRep(false)
                          toast(`Assigné à ${r.name}`)
                        }}
                        className="w-full flex items-center gap-2 px-1 py-1.5 text-sm rounded hover:bg-sand"
                      >
                        <RepAvatar id={r.id} size="xs" />
                        <span className="flex-1 text-left truncate">{r.name}</span>
                        {r.id === rep.id && <Check className="w-3.5 h-3.5 text-primary-press" />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </SideCard>
            {stage >= 0 && (
              <button
                onClick={() => {
                  setLead((l) => ({ ...l, status: 'Non qualifié' }))
                  toast('Marqué non qualifié')
                }}
                className="btn btn-sm btn-ghost w-full text-ink-mute"
              >
                Marquer non qualifié
              </button>
            )}
          </>
        }
      />

      <Drawer
        open={booking}
        onClose={() => {
          setBooking(false)
          setSlot(null)
        }}
        title="Réserver une estimation"
      >
        <div className="p-5 space-y-5">
          <div className="flex items-center gap-3">
            <RepAvatar id={rep.id} size="md" />
            <p className="text-sm font-semibold">{rep.name}</p>
          </div>
          {SLOTS.map((d) => (
            <div key={d.day}>
              <p className="label-caps mb-2">{d.day}</p>
              <div className="flex flex-wrap gap-2">
                {d.times.map((t) => {
                  const key = `${d.day} · ${t}`
                  return (
                    <button key={key} onClick={() => setSlot(key)} className={cn('h-9 px-3 rounded-md text-sm font-semibold border', slot === key ? 'bg-primary text-white border-primary' : 'border-hairline-strong text-ink-secondary hover:border-primary')}>
                      {t}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          <button
            disabled={!slot}
            className="btn btn-md btn-primary w-full"
            onClick={() => {
              setLead((l) => ({ ...l, status: 'RDV réservé', booked: slot! }))
              setBooking(false)
              setSlot(null)
              toast(`Estimation réservée · ${slot}`)
            }}
          >
            <CalendarCheck className="w-4 h-4" />
            Confirmer
          </button>
        </div>
      </Drawer>
    </Page>
  )
}
