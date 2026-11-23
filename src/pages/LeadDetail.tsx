import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Bot, CalendarCheck, CalendarClock, CalendarPlus, Check, FilePenLine, FileText, Flame, House, Inbox, Mail, MapPin, MessageSquare, Phone, RotateCcw, SearchX, Tag, UserRound, Wallet, Wrench } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useAccess } from '../auth/access'
import { NoAccessPage } from '../auth/guards'
import { LeadStageBadge } from '../components/leads'
import { MessageButton, type MessageCtx } from '../components/messaging'
import { InfoGroups, Notes, RecordHeader, RecordLayout, SideCard, StageBar, ThreadPanel, Timeline, type TimelineItem } from '../components/record'
import { ComingSoon, confirmAction } from '../components/states'
import { CompanyBadge, Drawer, Empty, Page, RepAvatar, StatusBadge, Tabs } from '../components/ui'
import { DEFAULT_LEAD_REP, LEAD_LOST, LEAD_PROFILES, LEAD_STAGES, LEAD_STATUS, channelStyle, leadById, leadStage, threadForLead } from '../data/leads'
import { REPS, clientById, clientLang, companyById, fullName, repById } from '../data/mock'
import { addAppointment, quoteById, updateLead, useStore } from '../data/store'
import { t, tIn } from '../i18n'
import { openCreate } from '../lib/create'
import { toast } from '../lib/toast'
import { cn } from '../lib/utils'

/** Bookable estimate slots (mockup: `T3`). */
const SLOTS = [
  { day: 'Mer. 21 oct.', times: ['13 h 30', '15 h 00'] },
  { day: 'Jeu. 22 oct.', times: ['11 h 00', '14 h 00'] },
  { day: 'Ven. 23 oct.', times: ['8 h 30', '10 h 00', '13 h 00'] },
]

/** Slot day label → agenda day index (Mon 19 oct. = 1) and "13 h 30" → 13.5. */
const SLOT_DAY: Record<string, number> = { 'Mer. 21 oct.': 3, 'Jeu. 22 oct.': 4, 'Ven. 23 oct.': 5 }
const slotHour = (time: string) => {
  const [h, m] = time.split(' h ').map(Number)
  return h + (m || 0) / 60
}

type Tab = 'conversation' | 'activite' | 'notes'

/** Lead record (mockup: `z3`). */
export default function LeadDetail() {
  useStore()
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { can } = useAuth()
  const access = useAccess()
  const [tab, setTab] = useState<Tab>('conversation')
  const [booking, setBooking] = useState(false)
  const [slot, setSlot] = useState<string | null>(null)
  const [changingRep, setChangingRep] = useState(false)
  const found = leadById(id)
  // Rebuild the synthesized conversation only when the lead's identity or status changes.
  const thread = useMemo(() => (found ? threadForLead(found) : null), [found, found?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!found || !thread)
    return (
      <Page>
        <Empty icon={SearchX} title={t('Lead introuvable')}>
          {t('Ce lead a peut-être été supprimé ou fusionné.')}
        </Empty>
        <div className="flex justify-center">
          <Link to="/leads" className="btn btn-sm btn-secondary">
            {t('Retour aux leads')}
          </Link>
        </div>
      </Page>
    )
  // Another rep's lead opened by URL.
  if (!access.lead(found)) return <NoAccessPage>{t("Ce lead est assigné à un autre représentant.")}</NoAccessPage>
  const lead = found

  const profile = LEAD_PROFILES[lead.id]
  const rep = repById(lead.repId ?? DEFAULT_LEAD_REP[lead.company])!
  const company = companyById(lead.company)
  const stage = leadStage(lead)
  const channel = channelStyle(lead.channel)
  const quote = quoteById(lead.quoteId)
  const client = clientById(lead.clientId)
  // Drafts go out in the client's language once the lead is linked to a client; French otherwise.
  const lang = clientLang(client)
  const ctx: MessageCtx = { name: lead.name, first: lead.name.split(' ')[0], company: company.name, rep: rep.first, lang }
  const aiLead = !!profile // seeded mockup leads carry the AI-agent demo

  const activity: TimelineItem[] = [
    { icon: channel.icon, title: t('Demande reçue · {channel}', { channel: t(lead.channel) }), at: t(lead.ago) },
    ...(aiLead
      ? [
          {
            icon: Bot,
            title: (
              <>
                {t("Réponse de l'agent IA")} <ComingSoon />
              </>
            ),
            at: t(lead.ago),
            meta: t('en 38 s'),
          },
        ]
      : []),
    ...(lead.booked ? [{ icon: CalendarCheck, title: t('Estimation réservée'), at: t(lead.ago), meta: `${t(lead.booked)} · ${rep.first}`, tone: 'primary' as const }] : []),
    { icon: UserRound, title: t('Assigné à {name}', { name: rep.name }), at: t(lead.ago) },
    ...(quote ? [{ icon: FilePenLine, title: t('Converti en soumission {no}', { no: quote.no }), at: t("Aujourd'hui"), tone: 'primary' as const }] : []),
  ]

  const setStatus = (status: string, message?: string) => {
    updateLead(lead.id, { status })
    toast(message ?? t('Étape : {stage}', { stage: t(status) }))
  }

  /** Converts the lead: the quote flow finds or creates the client (duplicate check) and links the quote. */
  const createQuote = () => {
    if (quote) {
      navigate(`/soumissions/${quote.id}`)
      return
    }
    openCreate('quote', { leadId: lead.id, company: lead.company, clientId: lead.clientId, name: lead.name, phone: lead.phone, email: lead.email, city: lead.city, source: lead.channel })
  }

  /** "Ajouter" a visit: with a quote, the agenda opens prefilled from it (same as the quote screen). */
  const addVisit = () => {
    if (quote) navigate(`/agenda?nouveau=${quote.id}`)
    else setBooking(true)
  }

  const book = (key: string) => {
    const [day, time] = key.split(' · ')
    const start = slotHour(time)
    addAppointment({ repId: rep.id, day: SLOT_DAY[day] ?? 3, start, end: start + 1, title: profile?.work ?? 'Estimation', city: lead.city, type: 'Estimation', clientId: lead.clientId, quoteNo: quote?.no })
    updateLead(lead.id, { status: 'RDV réservé', booked: key })
    toast(`${t('Estimation réservée')} · ${t(key)}`)
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
              {quote ? t('Ouvrir {no}', { no: quote.no }) : t('Créer la soumission')}
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
              addVisit()
              return
            }
            if (stage === 4) return // converted: the quote now carries the status
            setStatus(LEAD_STATUS[i], t('Étape : {stage}', { stage: t(LEAD_STAGES[i]) }))
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
                  { icon: Wrench, label: t('Travaux'), value: profile ? t(profile.work) : lead.message || '—' },
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
            {tab === 'conversation' && <ThreadPanel thread={thread} phone={lead.phone} lang={lang} />}
            {tab === 'activite' && <Timeline items={activity} />}
            {tab === 'notes' && <Notes canDelete={access.canDelete} initial={lead.id === 'l3' ? [{ at: t('Hier'), by: 'Hélène Petitpas', text: t('Le CA se réunit jeudi. Demander les plans des toits.') }] : []} />}
          </>
        }
        right={
          <>
            {quote && (
              <SideCard title={t('Soumission')}>
                <Link to={`/soumissions/${quote.id}`} className="block group">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold group-hover:text-primary-press inline-flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-ink-mute" />
                      {quote.no}
                    </p>
                    <StatusBadge status={quote.status} />
                  </div>
                  <p className="text-xs text-ink-mute mt-0.5 truncate">{t(quote.workType)}</p>
                </Link>
                {client && access.client(client) && (
                  <Link to={`/clients/${client.id}`} className="mt-2 text-xs font-semibold text-primary-press inline-flex items-center gap-1">
                    <UserRound className="w-3.5 h-3.5" />
                    {t('Fiche client : {name}', { name: fullName(client) })}
                  </Link>
                )}
              </SideCard>
            )}
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
                  <MessageButton kind="reminder" ctx={{ ...ctx, date: tIn(lang, lead.booked) }} label={t('Envoyer le rappel')} variant="secondary" className="w-full" />
                  {quote && (
                    <button onClick={addVisit} className="btn btn-sm btn-ghost w-full">
                      <CalendarPlus className="w-4 h-4" />
                      {t('Ajouter une visite')}
                    </button>
                  )}
                </div>
              ) : stage < 0 ? (
                <p className="text-sm text-ink-mute">{t('Lead non qualifié : aucune action prévue.')}</p>
              ) : (
                <div className="space-y-2">
                  {stage === 0 && (
                    <button onClick={() => setStatus('Contacté', t('Marqué comme contacté'))} className="btn btn-sm btn-secondary w-full">
                      <Phone className="w-4 h-4" />
                      {t('Marquer comme contacté')}
                    </button>
                  )}
                  {stage === 1 && (
                    <button onClick={() => setStatus('Qualifié', t('Marqué comme qualifié'))} className="btn btn-sm btn-secondary w-full">
                      <Check className="w-4 h-4" />
                      {t('Marquer comme qualifié')}
                    </button>
                  )}
                  <button onClick={addVisit} className="btn btn-sm btn-primary w-full">
                    <CalendarCheck className="w-4 h-4" />
                    {quote ? t('Ajouter une visite') : t('Réserver une estimation')}
                  </button>
                </div>
              )}
            </SideCard>
            {lead.aiSummary && (
              <SideCard title={t("Résumé de l'agent IA")} action={<ComingSoon />}>
                <p className="text-sm text-ink-secondary">{t(lead.aiSummary)}</p>
                {lead.score > 0 && (
                  <p className="text-xs text-ink-mute mt-2">
                    {t('Score IA')} <span className="font-semibold text-ink tnum">{lead.score}</span>/100
                  </p>
                )}
              </SideCard>
            )}
            <SideCard
              title={t('Responsable')}
              action={
                can('leads.assign') ? (
                  <button onClick={() => setChangingRep((o) => !o)} className="text-xs font-semibold text-primary-press">
                    {t('Changer')}
                  </button>
                ) : undefined
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
                  {REPS.filter((r) => r.company === lead.company).map((r) => (
                    <li key={r.id}>
                      <button
                        onClick={() => {
                          updateLead(lead.id, { repId: r.id })
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
            {stage >= 0 && stage < 4 && (
              <button
                onClick={async () => {
                  if (await confirmAction({ title: t('Marquer ce lead non qualifié?'), body: t('Il sort de la liste de suivi. Vous pourrez le réactiver.'), confirmLabel: t('Marquer non qualifié') })) setStatus(LEAD_LOST, t('Marqué non qualifié'))
                }}
                className="btn btn-sm btn-ghost w-full text-ink-mute"
              >
                {t('Marquer non qualifié')}
              </button>
            )}
            {stage < 0 && (
              <button onClick={() => setStatus('Nouveau', t('Lead réactivé'))} className="btn btn-sm btn-secondary w-full">
                <RotateCcw className="w-4 h-4" />
                {t('Réactiver le lead')}
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
              book(slot!)
              setBooking(false)
              setSlot(null)
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
