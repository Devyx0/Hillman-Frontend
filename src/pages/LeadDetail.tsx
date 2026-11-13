import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Bot, CalendarCheck, CalendarClock, Check, FilePenLine, Flame, House, Inbox, Mail, MapPin, MessageSquare, Phone, Tag, UserRound, Wallet, Wrench } from 'lucide-react'
import { LeadStageBadge } from '../components/leads'
import { MessageButton, type MessageCtx } from '../components/messaging'
import { InfoGroups, Notes, RecordHeader, RecordLayout, SideCard, StageBar, ThreadPanel, Timeline, type TimelineItem } from '../components/record'
import { CompanyBadge, Drawer, Page, RepAvatar, Tabs } from '../components/ui'
import { ALL_LEADS, LEAD_PROFILES, LEAD_STAGES, channelStyle, leadStage, threadForLead } from '../data/leads'
import { REPS, companyById, repById, type Lead } from '../data/mock'
import { t } from '../i18n'
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
    { icon: channel.icon, title: t('Demande reçue · {channel}', { channel: t(lead.channel) }), at: t(lead.ago) },
    { icon: Bot, title: t("Réponse de l'agent IA"), at: t(lead.ago), meta: t('en 38 s') },
    ...(lead.booked ? [{ icon: CalendarCheck, title: t('Estimation réservée'), at: t(lead.ago), meta: `${t(lead.booked)} · ${rep.first}`, tone: 'primary' as const }] : []),
    { icon: UserRound, title: t('Assigné à {name}', { name: rep.name }), at: t(lead.ago) },
  ]

  const createQuote = () => {
    toast(t('Soumission créée à partir du lead'))
    navigate('/soumissions/q64320')
  }

  return (
    <Page>
      <RecordHeader
        back={{ to: '/leads', label: t('Leads') }}
        name={lead.name}
        chips={
          <>
            <LeadStageBadge lead={lead} />
            <CompanyBadge id={lead.company} />
            {profile && <span className="text-xs text-ink-mute">{t(profile.type)}</span>}
          </>
        }
        actions={
          <>
            <button onClick={() => toast(t('Appel vers {name}…', { name: lead.phone }))} className="btn btn-sm btn-secondary">
              <Phone className="w-4 h-4" />
              {t('Appeler')}
            </button>
            <MessageButton kind="sms" ctx={ctx} label={t('Texto')} />
            <MessageButton kind="email" ctx={ctx} label={t('Courriel')} />
            <button onClick={createQuote} className="btn btn-sm btn-primary">
              <FilePenLine className="w-4 h-4" />
              {t('Créer la soumission')}
            </button>
          </>
        }
      />

      {stage >= 0 && (
        <StageBar
          stages={LEAD_STAGES.map((s) => t(s))}
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
            toast(t('Étape : {stage}', { stage: t(LEAD_STAGES[i]) }))
          }}
        />
      )}

      <RecordLayout
        left={
          <InfoGroups
            groups={[
              {
                title: t('Coordonnées'),
                rows: [
                  { icon: Phone, label: t('Téléphone'), value: lead.phone, copy: lead.phone },
                  ...(lead.email
                    ? [
                        {
                          icon: Mail,
                          label: t('Courriel'),
                          value: (
                            <span className="block truncate" title={lead.email}>
                              {lead.email}
                            </span>
                          ),
                          copy: lead.email,
                        },
                      ]
                    : []),
                  { icon: MapPin, label: t('Adresse'), value: profile ? t(profile.address) : lead.city, copy: profile?.address },
                ],
              },
              {
                title: t('Demande'),
                rows: [
                  { icon: Wrench, label: t('Travaux'), value: profile ? t(profile.work) : '—' },
                  { icon: Flame, label: t('Urgence'), value: profile ? t(profile.urgency) : '—' },
                  { icon: Wallet, label: t('Budget'), value: profile ? t(profile.budget) : '—' },
                  { icon: CalendarClock, label: t('Échéance'), value: profile ? t(profile.timeline) : '—' },
                  { icon: House, label: t('Propriété'), value: profile ? t(profile.property) : '—' },
                ],
              },
              {
                title: t('Détails'),
                rows: [
                  {
                    icon: Inbox,
                    label: t('Source'),
                    value: (
                      <span className="inline-flex items-center gap-1.5">
                        <span className={cn('w-5 h-5 rounded flex items-center justify-center', channel.tone)}>
                          <channel.icon className="w-3 h-3" />
                        </span>
                        {t(lead.channel)}
                      </span>
                    ),
                  },
                  {
                    icon: Tag,
                    label: t('Étiquettes'),
                    value: (
                      <span className="flex flex-wrap gap-1 pt-0.5">
                        {(profile?.tags ?? []).map((tag) => (
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
            <Tabs<Tab>
              value={tab}
              onChange={setTab}
              tabs={[
                { value: 'conversation', label: t('Conversation'), icon: MessageSquare },
                { value: 'activite', label: t('Activité') },
                { value: 'notes', label: t('Notes') },
              ]}
            />
            {tab === 'conversation' && <ThreadPanel thread={thread} />}
            {tab === 'activite' && <Timeline items={activity} />}
            {tab === 'notes' && <Notes initial={lead.id === 'l3' ? [{ at: t('Hier'), by: 'Hélène Petitpas', text: t('Le CA se réunit jeudi. Demander les plans des toits.') }] : []} />}
          </>
        }
        right={
          <>
            <SideCard title={t('Prochaine étape')}>
              {lead.booked ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-lg bg-tone-good-soft text-tone-good-ink flex items-center justify-center">
                      <CalendarCheck className="w-5 h-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{t(lead.booked)}</p>
                      <p className="text-xs text-ink-mute">{t('Estimation')} · {rep.first}</p>
                    </div>
                  </div>
                  <MessageButton kind="reminder" ctx={{ ...ctx, date: t(lead.booked) }} label={t('Envoyer le rappel')} variant="secondary" className="w-full" />
                </div>
              ) : (
                <button onClick={() => setBooking(true)} className="btn btn-sm btn-primary w-full">
                  <CalendarCheck className="w-4 h-4" />
                  {t('Réserver une estimation')}
                </button>
              )}
            </SideCard>
            <SideCard title={t("Résumé de l'agent IA")}>
              <p className="text-sm text-ink-secondary">{t(lead.aiSummary)}</p>
            </SideCard>
            <SideCard
              title={t('Responsable')}
              action={
                <button onClick={() => setChangingRep((o) => !o)} className="text-xs font-semibold text-primary-press">
                  {t('Changer')}
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
                          toast(t('Assigné à {name}', { name: r.name }))
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
                  toast(t('Marqué non qualifié'))
                }}
                className="btn btn-sm btn-ghost w-full text-ink-mute"
              >
                {t('Marquer non qualifié')}
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
        title={t('Réserver une estimation')}
      >
        <div className="p-5 space-y-5">
          <div className="flex items-center gap-3">
            <RepAvatar id={rep.id} size="md" />
            <p className="text-sm font-semibold">{rep.name}</p>
          </div>
          {SLOTS.map((d) => (
            <div key={d.day}>
              <p className="label-caps mb-2">{t(d.day)}</p>
              <div className="flex flex-wrap gap-2">
                {d.times.map((time) => {
                  const key = `${d.day} · ${time}`
                  return (
                    <button key={key} onClick={() => setSlot(key)} className={cn('h-9 px-3 rounded-md text-sm font-semibold border', slot === key ? 'bg-primary text-white border-primary' : 'border-hairline-strong text-ink-secondary hover:border-primary')}>
                      {t(time)}
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
              toast(`${t('Estimation réservée')} · ${t(slot!)}`)
            }}
          >
            <CalendarCheck className="w-4 h-4" />
            {t('Confirmer')}
          </button>
        </div>
      </Drawer>
    </Page>
  )
}
