import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bot, ChevronLeft, Clock, Eye, FileText, Hand, Inbox, Mail, MapPin, MessageSquare, Paperclip, Phone, Search, Send, UserRound, X } from 'lucide-react'
import { Composer, MessageBubble } from '../components/record'
import { Avatar, Badge, CHANNEL_ICONS, CompanyBadge, Empty, StatusBadge, type Icon } from '../components/ui'
import { inScope, useApp } from '../context/AppContext'
import { APPOINTMENTS, LEADS, ME, QUOTES, THREADS, clientById, companyById, repById, type CompanyId, type Message, type Thread } from '../data/mock'
import { toast } from '../lib/toast'
import { cn, money } from '../lib/utils'

type ThreadFilter = 'all' | 'unread' | 'ai' | 'mine' | 'sms' | 'email' | 'call'

/** Mockup: `b4`. */
const THREAD_FILTERS: { v: ThreadFilter; label: string; icon?: Icon }[] = [
  { v: 'all', label: 'Tous' },
  { v: 'unread', label: 'Non lus' },
  { v: 'ai', label: 'Agent IA', icon: Bot },
  { v: 'mine', label: 'À moi' },
  { v: 'sms', label: 'Textos', icon: MessageSquare },
  { v: 'email', label: 'Courriels', icon: Mail },
  { v: 'call', label: 'Appels', icon: Phone },
]

const DAY_ABBR = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']
/** 13.5 → "13 h 30", 10 → "10 h 00" (mockup: `y4`). */
const hourLabel = (h: number) => `${Math.floor(h)} h ${h % 1 ? String(Math.round((h % 1) * 60)).padStart(2, '0') : '00'}`
/** Threads that belong to a lead rather than a client (mockup: `j4`). */
const THREAD_LEAD: Record<string, string> = { t2: 'l1', t3: 'l2', t5: 'l4' }

/** Contact card shown beside a thread (mockup: `Nx`). */
function ContactPanel({ thread, onClose }: { thread: Thread; onClose?: () => void }) {
  const client = thread.clientId ? clientById(thread.clientId) : undefined
  const quote = thread.quoteNo ? QUOTES.find((q) => q.no === thread.quoteNo) : undefined
  const appt = APPOINTMENTS.find(
    (a) => (client && a.clientId === client.id) || (quote && a.quoteNo === quote.no) || (thread.id === 't2' && a.id === 'a6') || (thread.id === 't3' && a.id === 'c3') || (thread.id === 't5' && a.id === 'd3'),
  )
  const lead = LEADS.find((l) => l.name === thread.name)
  const leadId = THREAD_LEAD[thread.id]
  const phone = client?.mobile ?? client?.phone ?? lead?.phone ?? (thread.id === 't4' ? '418 681-2200' : thread.id === 't6' ? '418 655-0193' : '418 802-5531')
  const email = client?.email ?? lead?.email ?? (thread.id === 't4' ? 'gestion@laurentia.ca' : thread.id === 't6' ? 'louis.bergeron@outlook.com' : undefined)
  const address = client ? `${client.no}, ${client.street}, ${client.city}` : lead ? lead.city : thread.id === 't4' ? '2600, boul. Laurier, Sainte-Foy' : thread.id === 't6' ? 'Sillery' : undefined
  const recordHref = client ? `/clients/${client.id}` : leadId ? `/leads/${leadId}` : undefined

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center gap-3">
        <Avatar name={thread.name} size="lg" />
        <p className="flex-1 min-w-0 text-md font-semibold text-ink truncate">{thread.name}</p>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-sand xl:hidden" aria-label="Fermer">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="space-y-2 text-sm text-ink-secondary">
        <p className="flex items-center gap-2 tnum">
          <Phone className="w-4 h-4 text-ink-mute shrink-0" />
          {phone}
        </p>
        {email && (
          <p className="flex items-center gap-2 min-w-0">
            <Mail className="w-4 h-4 text-ink-mute shrink-0" />
            <span className="truncate">{email}</span>
          </p>
        )}
        {address && (
          <p className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-ink-mute shrink-0" />
            {address}
          </p>
        )}
      </div>
      {quote && (
        <Link to={`/soumissions/${quote.id}`} className="block rounded-xl border border-hairline p-4 hover:border-primary transition-colors">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink tnum">{quote.no}</p>
            <StatusBadge status={quote.status} />
          </div>
          <p className="text-xl font-semibold tnum mt-1">{money(quote.amount, false)}</p>
          {quote.views > 0 && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-primary-press font-semibold">
              <Eye className="w-3.5 h-3.5" />
              Ouverte {quote.views} fois
            </p>
          )}
        </Link>
      )}
      {appt && (
        <div className="flex items-center gap-3">
          <div className="w-11 text-center rounded-md bg-sand py-1 shrink-0">
            <p className="text-2xs text-ink-mute uppercase">{DAY_ABBR[appt.day]}</p>
            <p className="text-sm font-semibold tnum">{18 + appt.day}</p>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink truncate">{appt.title}</p>
            <p className="text-2xs text-ink-mute">
              {hourLabel(appt.start)} · {repById(appt.repId)!.name}
            </p>
          </div>
        </div>
      )}
      {recordHref && (
        <Link to={recordHref} className="btn btn-sm btn-secondary w-full">
          <UserRound className="w-4 h-4" />
          Ouvrir la fiche
        </Link>
      )}
    </div>
  )
}

/* ── Sent e-mail log ───────────────────────────────────────────────────── */

/** Mockup: `qi`. */
const AUTO_REMINDER_BODY = `Bonjour à vous,

Nous sommes très heureux de l'intérêt que vous avez porté à notre entreprise. Nous faisons un suivi sur votre dossier et aimerions savoir si vous avez des questions ou des commentaires sur la soumission que nous vous avons fait parvenir dernièrement. Nous aimerions également savoir si une décision a été prise dans le choix de votre entrepreneur.

Pour accepter ou refuser la soumission, simplement confirmer votre décision par écrit en répondant à ce courriel.

*Notez que ce courriel est généré automatiquement par notre système. Si vous avez déjà donné une réponse, bien vouloir l'ignorer, votre dossier suit son cours.`

/** Mockup: `Ax`. */
const PLC_QUOTE_BODY = `Bonjour, voici la soumission.

Merci
Pierre-Luc Cloutier
Signature Gouttières
418 931-2729`

interface SentEmail {
  id: string
  type: 'Soumission' | 'Rappel'
  date: string
  day: 'today' | 'yesterday' | 'week'
  by: string
  quoteNo: string
  quoteId?: string
  client: string
  email: string
  company: CompanyId
  subject: string
  body: string
  attach?: string
  opened?: number
}

/** Mockup: `wx`. */
const SENT_EMAILS: SentEmail[] = [
  { id: 'e1', type: 'Soumission', date: "Aujourd'hui 16 h 43", day: 'today', by: 'Pierre-Luc Cloutier', quoteNo: 'G64318', client: 'Patrick Boucher', email: 'p.boucher@videotron.ca', company: 'sg', subject: 'Soumission gouttière G64318', body: PLC_QUOTE_BODY, attach: 'Soumission G64318.pdf', opened: 1 },
  { id: 'e2', type: 'Soumission', date: "Aujourd'hui 16 h 33", day: 'today', by: 'Pierre-Luc Cloutier', quoteNo: 'G64317', client: 'Mélanie Morin', email: 'melanie.morin@gmail.com', company: 'sg', subject: 'Soumission gouttière G64317', body: PLC_QUOTE_BODY, attach: 'Soumission G64317.pdf' },
  { id: 'e3', type: 'Soumission', date: "Aujourd'hui 15 h 39", day: 'today', by: 'Hélène Petitpas', quoteNo: 'H64026', client: 'Pierre Simard', email: 'p.simard@outlook.com', company: 'toit', subject: 'Job : 2026-10-22', body: `Bonjour,\n\nConfirmation des travaux pour le jeudi 22 octobre.\nTimberline Charbon, bordure noire, ventilateur noir.\nRallonge arrière non incluse · OSB ½ à faire.\n\nHélène Petitpas\nToitures Hillman`, attach: 'Soumission H64026.pdf', opened: 2 },
  { id: 'e4', type: 'Rappel', date: "Aujourd'hui 14 h 00", day: 'today', by: 'Automatique', quoteNo: 'G64251', client: 'Habitations Mica', email: 'f.helie@habitationsmica.com', company: 'sg', subject: 'Suivi soumission #G64251', body: AUTO_REMINDER_BODY },
  { id: 'e5', type: 'Rappel', date: "Aujourd'hui 13 h 30", day: 'today', by: 'Automatique', quoteNo: 'H64263', client: 'Nathalie Morin', email: 'nathalie.morin@hotmail.com', company: 'toit', subject: 'Suivi soumission #H64263', body: AUTO_REMINDER_BODY, opened: 1 },
  { id: 'e6', type: 'Rappel', date: "Aujourd'hui 13 h 00", day: 'today', by: 'Automatique', quoteNo: 'G64219', client: 'Denis Girard', email: 'denis.girard@live.ca', company: 'sg', subject: 'Suivi soumission #G64219', body: AUTO_REMINDER_BODY },
  { id: 'e7', type: 'Soumission', date: 'Hier 17 h 12', day: 'yesterday', by: 'Jean-Pierre Hillman', quoteNo: 'H64320', quoteId: 'q64320', client: 'Isabelle Gagnon', email: 'isabelle.gagnon@videotron.ca', company: 'toit', subject: 'Soumission toiture H64320', body: `Bonjour Isabelle,\n\nVoici votre soumission. Vous pouvez la consulter et la signer en ligne avec le lien ci-dessous.\n\nJean-Pierre Hillman\nToitures Hillman · 418 576-1993`, attach: 'Soumission H64320.pdf · Garantie GAF System Plus.pdf', opened: 3 },
  { id: 'e8', type: 'Soumission', date: 'Hier 15 h 05', day: 'yesterday', by: 'Dominic Plourde', quoteNo: 'G64310', client: 'Denis Girard', email: 'denis.girard@live.ca', company: 'sg', subject: 'Soumission gouttière G64310', body: `Bonjour, voici la soumission.\n\nMerci\nDominic Plourde\nSignature Gouttières`, attach: 'Soumission G64310.pdf', opened: 4 },
  { id: 'e9', type: 'Soumission', date: 'Lun. 19 h 02', day: 'week', by: 'Philippe Audet', quoteNo: 'R64288', client: 'Louis Bergeron', email: 'louis.bergeron@outlook.com', company: 'reno', subject: 'Soumission agrandissement R64288', body: `Bonjour M. Bergeron,\n\nVoici la soumission révisée pour le garage, incluant le revêtement. Au plaisir!\n\nPhilippe Audet\nRénovations Hillman`, attach: 'Soumission R64288.pdf', opened: 2 },
  { id: 'e10', type: 'Rappel', date: 'Lun. 14 h 00', day: 'week', by: 'Automatique', quoteNo: 'H64252', client: 'Simon Leclerc', email: 'simon.leclerc@gmail.com', company: 'toit', subject: 'Suivi soumission #H64252', body: AUTO_REMINDER_BODY },
  { id: 'e11', type: 'Rappel', date: 'Lun. 13 h 30', day: 'week', by: 'Automatique', quoteNo: 'G64236', client: 'Steve Dubé', email: 'steve.dube@videotron.ca', company: 'sg', subject: 'Suivi soumission #G64236', body: AUTO_REMINDER_BODY, opened: 1 },
  { id: 'e12', type: 'Soumission', date: 'Sam. 10 h 18', day: 'week', by: 'Benoit Tondreau', quoteNo: 'G64300', client: 'Steve Dubé', email: 'steve.dube@videotron.ca', company: 'sg', subject: 'Soumission nettoyage G64300', body: `Bonjour, voici la soumission pour le nettoyage avant l'hiver.\n\nBenoit Tondreau\nSignature Gouttières`, attach: 'Soumission G64300.pdf' },
]

/** Mockup: `N4`. */
function SentList({ rows, activeId, onOpen }: { rows: SentEmail[]; activeId?: string; onOpen: (id: string) => void }) {
  if (!rows.length)
    return (
      <Empty icon={Inbox} title="Aucun courriel">
        Changez les filtres ou la compagnie.
      </Empty>
    )
  return (
    <>
      {rows.map((e) => (
        <button key={e.id} onClick={() => onOpen(e.id)} className={cn('w-full text-left px-4 py-3 border-b border-hairline flex gap-3 transition-colors', activeId === e.id ? 'bg-primary-wash' : 'hover:bg-sand')}>
          <span className={cn('w-9 h-9 rounded-full flex items-center justify-center shrink-0', e.type === 'Rappel' ? 'bg-tone-warn-soft text-tone-warn-ink' : 'bg-sand text-ink-mute')}>{e.type === 'Rappel' ? <Clock className="w-4 h-4" /> : <Mail className="w-4 h-4" />}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-ink-secondary truncate flex-1">{e.client}</p>
              <span className="text-2xs text-ink-mute shrink-0">{e.date}</span>
            </div>
            <p className="text-xs text-ink-mute truncate mt-0.5">{e.subject}</p>
            <p className="text-2xs text-ink-mute mt-1">{e.type === 'Rappel' ? 'Rappel automatique' : e.by}</p>
          </div>
        </button>
      ))}
    </>
  )
}

/** Mockup: `A4`. */
function SentEmailView({ e, onBack }: { e: SentEmail; onBack: () => void }) {
  const quoteId = e.quoteId ? e.quoteId : QUOTES.find((q) => q.no === e.quoteNo)?.id
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="h-16 bg-white border-b border-hairline px-3 md:px-5 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="md:hidden p-1.5 rounded-md hover:bg-sand" aria-label="Retour">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="w-9 h-9 rounded-full bg-sand flex items-center justify-center">
          <Mail className="w-4 h-4 text-ink-mute" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink truncate">{e.subject}</p>
          <p className="text-2xs text-ink-mute truncate">{e.date}</p>
        </div>
        {quoteId && (
          <Link to={`/soumissions/${quoteId}`} className="btn btn-xs btn-secondary">
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ouvrir {e.quoteNo}</span>
          </Link>
        )}
        <button onClick={() => toast('Courriel renvoyé à ' + e.email)} className="btn btn-xs btn-quiet">
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Renvoyer</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 md:px-6 py-5">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-card">
          <dl className="px-5 py-4 border-b border-hairline grid grid-cols-[110px_minmax(0,1fr)] gap-y-1.5 text-sm">
            {[
              ['À', e.email],
              ['Envoyé par', e.by],
              ['Soumission', e.quoteNo],
            ].map(([label, value]) => (
              <Fragment key={label}>
                <dt className="label-caps self-center">{label}</dt>
                <dd className="text-ink-secondary truncate">{value}</dd>
              </Fragment>
            ))}
          </dl>
          <p className="px-5 py-4 text-sm text-ink-secondary whitespace-pre-line leading-relaxed">{e.body}</p>
          <div className="px-5 pb-5 flex flex-wrap items-center gap-2">
            {e.attach && (
              <span className="flex items-center gap-2 rounded-lg bg-sand px-3 py-2 text-xs">
                <Paperclip className="w-3.5 h-3.5 text-ink-mute" />
                <span className="font-semibold text-ink">{e.attach}</span>
              </span>
            )}
            {e.opened ? (
              <Badge tone="info">
                <Eye className="w-3 h-3" />
                Ouvert {e.opened} fois
              </Badge>
            ) : (
              <Badge tone="neutral">Pas encore ouvert</Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Page ──────────────────────────────────────────────────────────────── */

const hasAI = (t: Thread) => t.aiHandled || t.messages.some((m) => m.channel === 'ai')

const VIEW_TABS: [view: 'threads' | 'sent', label: string, icon: Icon][] = [
  ['threads', 'Conversations', MessageSquare],
  ['sent', 'Courriels envoyés', Send],
]

export default function Conversations() {
  const { scope } = useApp()
  const [filter, setFilter] = useState<ThreadFilter>('all')
  const [query, setQuery] = useState('')
  const [threads, setThreads] = useState<Thread[]>(() => THREADS.filter((t) => t.id !== 't7'))
  const [activeId, setActiveId] = useState('t1')
  const [pane, setPane] = useState<'list' | 'thread'>('list')
  const [aiOn, setAiOn] = useState<Record<string, boolean>>({ t2: true, t3: true })
  const [contactOpen, setContactOpen] = useState(false)
  const [view, setView] = useState<'threads' | 'sent'>('threads')
  const [sentType, setSentType] = useState('all')
  const [sentBy, setSentBy] = useState('all')
  const [sentDay, setSentDay] = useState('all')
  const [sentId, setSentId] = useState('e7')

  const sentRows = useMemo(
    () =>
      SENT_EMAILS.filter((e) => inScope(scope, e.company))
        .filter((e) => sentType === 'all' || e.type === sentType)
        .filter((e) => sentBy === 'all' || e.by === sentBy)
        .filter((e) => sentDay === 'all' || e.day === sentDay)
        .filter((e) => !query || (e.client + e.subject + e.quoteNo + e.email).toLowerCase().includes(query.toLowerCase())),
    [scope, sentType, sentBy, sentDay, query],
  )
  const senders = useMemo(() => [...new Set(SENT_EMAILS.filter((e) => inScope(scope, e.company)).map((e) => e.by))], [scope])
  const sent = sentRows.find((e) => e.id === sentId) ?? sentRows[0]

  const visible = useMemo(
    () =>
      threads
        .filter((t) => inScope(scope, t.company))
        .filter((t) => (filter === 'unread' ? t.unread > 0 : filter === 'ai' ? hasAI(t) : filter === 'mine' ? t.assigned === ME.id : filter === 'sms' || filter === 'email' || filter === 'call' ? t.channel === filter : true))
        .filter((t) => !query || (t.name + t.last).toLowerCase().includes(query.toLowerCase())),
    [threads, scope, filter, query],
  )
  const active = threads.find((t) => t.id === activeId) ?? visible[0]

  const openThread = (id: string) => {
    setActiveId(id)
    setPane('thread')
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, unread: 0 } : t)))
  }
  const appendMessage = (m: Message) => setThreads((prev) => prev.map((t) => (t.id === active.id ? { ...t, messages: [...t.messages, m], last: m.text, at: "À l'instant" } : t)))
  const aiActive = active ? !!aiOn[active.id] : false

  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [active?.id, active?.messages.length, pane])

  const counts: Partial<Record<ThreadFilter, number>> = {
    unread: threads.filter((t) => t.unread).length,
    ai: threads.filter(hasAI).length,
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-sand">
      <div className={cn('w-full md:w-80 lg:w-96 bg-white border-r border-hairline flex flex-col shrink-0', pane === 'thread' && 'hidden md:flex')}>
        <div className="p-4 border-b border-hairline space-y-3">
          <h1 className="text-xl font-semibold text-ink">Conversations</h1>
          <div className="grid grid-cols-2 gap-1 p-1 bg-sand rounded-lg" role="tablist">
            {VIEW_TABS.map(([v, label, IconC]) => (
              <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={cn('h-8 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5', view === v ? 'bg-white text-ink shadow-card' : 'text-ink-mute hover:text-ink')}>
                <IconC className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={view === 'sent' ? 'Client, no de soumission, objet…' : 'Rechercher une conversation'} className="form-input pl-9 h-9 bg-sand border-transparent" />
          </div>
          {view === 'sent' ? (
            <div className="grid grid-cols-3 gap-1.5">
              <select aria-label="Type d'envoi" value={sentType} onChange={(e) => setSentType(e.target.value)} className="form-input h-8 text-xs px-2">
                <option value="all">Tous types</option>
                <option>Soumission</option>
                <option>Rappel</option>
              </select>
              <select aria-label="Envoyé par" value={sentBy} onChange={(e) => setSentBy(e.target.value)} className="form-input h-8 text-xs px-2">
                <option value="all">Tous envoyeurs</option>
                {senders.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <select aria-label="Date d'envoi" value={sentDay} onChange={(e) => setSentDay(e.target.value)} className="form-input h-8 text-xs px-2">
                <option value="all">Toutes dates</option>
                <option value="today">Aujourd'hui</option>
                <option value="yesterday">Hier</option>
                <option value="week">Cette semaine</option>
              </select>
            </div>
          ) : (
            <div className="flex gap-1 overflow-x-auto nav-scroll -mx-1 px-1 pb-1">
              {THREAD_FILTERS.map((f) => (
                <button key={f.v} onClick={() => setFilter(f.v)} className={cn('h-7 px-2.5 rounded-md text-xs font-semibold whitespace-nowrap flex items-center gap-1 shrink-0', filter === f.v ? 'bg-ink text-white' : 'bg-sand text-ink-mute hover:text-ink')}>
                  {f.icon && <f.icon className="w-3 h-3" />}
                  {f.label}
                  {counts[f.v] ? <span className="tnum opacity-70">{counts[f.v]}</span> : null}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {view === 'sent' ? (
            <SentList
              rows={sentRows}
              activeId={sent?.id}
              onOpen={(id) => {
                setSentId(id)
                setPane('thread')
              }}
            />
          ) : (
            <>
              {visible.length === 0 && (
                <Empty icon={Inbox} title="Aucune conversation">
                  Changez de filtre ou de compagnie.
                </Empty>
              )}
              {visible.map((t) => {
                const ChannelIcon = CHANNEL_ICONS[t.channel]
                const ai = hasAI(t)
                return (
                  <button key={t.id} onClick={() => openThread(t.id)} className={cn('w-full text-left px-4 py-3 border-b border-hairline flex gap-3 transition-colors', active?.id === t.id ? 'bg-primary-wash' : 'hover:bg-sand')}>
                    <div className="relative shrink-0">
                      <Avatar name={t.name} size="md" />
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white shadow-card flex items-center justify-center">
                        <ChannelIcon className="w-3 h-3 text-ink-mute" />
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={cn('text-sm truncate flex-1', t.unread ? 'font-bold text-ink' : 'font-semibold text-ink-secondary')}>{t.name}</p>
                        <span className="text-2xs text-ink-mute shrink-0">{t.at}</span>
                      </div>
                      <p className={cn('text-xs truncate mt-0.5', t.unread ? 'text-ink' : 'text-ink-mute')}>{t.last}</p>
                      {(scope === 'all' || ai || t.unread > 0) && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {scope === 'all' && <CompanyBadge id={t.company} />}
                          {ai && (
                            <span className="badge bg-lavender text-ink !text-2xs !px-1.5">
                              <Bot className="w-2.5 h-2.5 mr-0.5" />
                              IA
                            </span>
                          )}
                          {t.unread > 0 && <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-primary text-white text-2xs font-bold flex items-center justify-center tnum">{t.unread}</span>}
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </>
          )}
        </div>
      </div>

      {view === 'sent' &&
        (sent ? (
          <div className={cn('flex-1 flex min-w-0', pane === 'list' && 'hidden md:flex')}>
            <SentEmailView e={sent} onBack={() => setPane('list')} />
          </div>
        ) : (
          <div className="flex-1 hidden md:flex items-center justify-center">
            <Empty icon={Mail} title="Aucun courriel sélectionné" />
          </div>
        ))}

      {view === 'threads' && active && (
        <div className={cn('flex-1 flex flex-col min-w-0', pane === 'list' && 'hidden md:flex')}>
          <div className="h-16 bg-white border-b border-hairline px-3 md:px-5 flex items-center gap-3 shrink-0">
            <button onClick={() => setPane('list')} className="md:hidden p-1.5 rounded-md hover:bg-sand" aria-label="Retour">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <Avatar name={active.name} size="md" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink truncate">{active.name}</p>
              <p className="text-2xs text-ink-mute truncate">{repById(active.assigned)!.name}</p>
            </div>
            <button
              onClick={() => {
                setAiOn((prev) => ({ ...prev, [active.id]: !prev[active.id] }))
                toast(aiActive ? 'Vous avez pris le relais' : "Conversation confiée à l'agent IA")
              }}
              className={cn('btn btn-xs', aiActive ? 'bg-lavender text-ink hover:bg-lavender/70' : 'btn-quiet')}
            >
              {aiActive ? (
                <>
                  <Hand className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Prendre le relais</span>
                </>
              ) : (
                <>
                  <Bot className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Confier à l'agent IA</span>
                </>
              )}
            </button>
            <button onClick={() => toast('Appel lancé via le numéro de ' + companyById(active.company).short)} className="btn btn-xs btn-secondary" aria-label="Appeler">
              <Phone className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setContactOpen(true)} className="btn btn-xs btn-secondary xl:hidden" aria-label="Fiche">
              <UserRound className="w-3.5 h-3.5" />
            </button>
          </div>
          {aiActive && (
            <div className="bg-lavender-soft border-b border-lavender px-5 py-2 text-xs text-ink-secondary flex items-center gap-2">
              <Bot className="w-4 h-4 text-ink" />
              <span className="font-semibold text-ink">L'agent IA répond à ce client</span>
            </div>
          )}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 md:px-6 py-5 space-y-4">
            {active.messages.map((m) => (
              <MessageBubble key={m.id} m={m} thread={active} />
            ))}
          </div>
          <Composer key={active.id} thread={active} onSend={appendMessage} />
        </div>
      )}

      {view === 'threads' && active && (
        <aside className="hidden xl:block w-80 bg-white border-l border-hairline overflow-y-auto shrink-0">
          <ContactPanel thread={active} />
        </aside>
      )}

      {view === 'threads' && active && contactOpen && (
        <div className="fixed inset-0 z-[60] xl:hidden flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setContactOpen(false)} />
          <div className="relative w-full max-w-sm h-full bg-white overflow-y-auto menu-in">
            <ContactPanel thread={active} onClose={() => setContactOpen(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
