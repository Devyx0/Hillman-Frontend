import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Ban, Bot, ChevronLeft, Clock, Eye, FileText, Hand, Inbox, Mail, MapPin, MessageSquare, Paperclip, Phone, Search, Send, UserRound, X } from 'lucide-react'
import { Composer, MessageBubble, applyStopReplies, deliver, type ChatMessage } from '../components/record'
import { ComingSoon, SkeletonRows } from '../components/states'
import { Avatar, Badge, CHANNEL_ICONS, CompanyBadge, Empty, StatusBadge, type Icon } from '../components/ui'
import { inScope, useApp } from '../context/AppContext'
import { useAuth } from '../auth/AuthContext'
import { useAccess } from '../auth/access'
import { API_MODE } from '../api/config'
import { APPOINTMENTS, CLIENTS, LEADS, ME, QUOTES, THREADS, clientById, clientLang, companyById, fullName, repById, type CompanyId, type Thread } from '../data/mock'
import { SENT_LOG, type SentRecord } from '../data/quote-builder'
import { isOptedOut } from '../data/settings'
import { quoteById, quoteByNo, request, useStore } from '../data/store'
import { toast } from '../lib/toast'
import { cn, formatHour, money } from '../lib/utils'
import { getLang, t } from '../i18n'

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
const DAY_ABBR_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
/** 13.5 → "13 h 30", 10 → "10 h 00" (mockup: `y4`). */
const hourLabel = (h: number) => getLang() === 'en' ? formatHour(h) : `${Math.floor(h)} h ${h % 1 ? String(Math.round((h % 1) * 60)).padStart(2, '0') : '00'}`
/** Threads that belong to a lead rather than a client (mockup: `j4`). */
const THREAD_LEAD: Record<string, string> = { t2: 'l1', t3: 'l2', t5: 'l4' }

/** Thread whose messages carry a delivery state (failed texts can be retried). */
type ChatThread = Omit<Thread, 'messages'> & { messages: ChatMessage[] }

/** Texting number of a thread's contact. */
function threadPhone(thread: Thread) {
  const client = thread.clientId ? clientById(thread.clientId) : undefined
  const lead = LEADS.find((l) => l.name === thread.name)
  return client?.mobile ?? client?.phone ?? lead?.phone ?? (thread.id === 't4' ? '418 681-2200' : thread.id === 't6' ? '418 655-0193' : '418 802-5531')
}

/**
 * Demo threads for the texting edge cases: a client who replied STOP (number opted out) and a
 * follow-up text the provider could not deliver. Text stays French; it is translated when shown.
 */
// Demo only: with the backend these would put fake messages (and a STOP opt-out) on real clients.
const DEMO_THREADS: ChatThread[] = API_MODE ? [] : demoThreads()
function demoThreads(): ChatThread[] {
const STOP_CLIENT = CLIENTS[7]
const FAILED_CLIENT = CLIENTS[11]
return [
  {
    id: 'd-stop', clientId: STOP_CLIENT.id, name: fullName(STOP_CLIENT), company: 'toit', channel: 'sms', unread: 0, last: 'STOP', at: '7 h 05', assigned: 'jph',
    messages: [
      { id: 'ds1', dir: 'out', channel: 'sms', at: 'Hier · 10 h 00', by: 'Automatisation · Suivi J+6', text: "Bonjour, c'est Jean-Pierre de Toitures Hillman. Avez-vous bien reçu votre soumission? Je peux répondre à vos questions. Répondez STOP pour ne plus recevoir de textos." },
      { id: 'ds2', dir: 'in', channel: 'sms', at: '7 h 05', text: 'STOP' },
      { id: 'ds3', dir: 'in', channel: 'note', at: '7 h 05', text: 'Numéro désabonné des textos. Les suivis automatiques par texto sont arrêtés; les courriels continuent.', meta: 'Désabonnement' },
    ],
  },
  {
    id: 'd-fail', clientId: FAILED_CLIENT.id, name: fullName(FAILED_CLIENT), company: 'toit', channel: 'sms', unread: 0, last: "Échec de l'envoi", at: '9 h 00', assigned: 'jph',
    messages: [
      { id: 'df1', dir: 'out', channel: 'email', at: 'Ven. · 15 h 30', by: 'Jean-Pierre Hillman', text: 'Bonjour, voici votre soumission. Vous pouvez la consulter et la signer en ligne avec le lien ci-dessous.' },
      { id: 'df2', dir: 'out', channel: 'sms', at: '9 h 00', by: 'Jean-Pierre Hillman', text: 'Bonjour, avez-vous eu la chance de regarder la soumission? Je peux passer vous voir cette semaine.', state: 'failed', error: 'Le fournisseur de textos a refusé le message' },
    ],
  },
]
}
// Replies received before the app was opened: apply STOP to the opt-out list (Settings).
for (const th of [...THREADS, ...DEMO_THREADS]) applyStopReplies(th.messages, threadPhone(th))

/** Contact card shown beside a thread (mockup: `Nx`). */
function ContactPanel({ thread, onClose }: { thread: Thread; onClose?: () => void }) {
  useStore()
  const access = useAccess()
  const client = thread.clientId ? clientById(thread.clientId) : undefined
  const found = thread.quoteNo ? QUOTES.find((q) => q.no === thread.quoteNo) : undefined
  // Links only to records the user may open.
  const quote = found && access.quote(found) ? found : undefined
  const appt = APPOINTMENTS.find(
    (a) => (client && a.clientId === client.id) || (quote && a.quoteNo === quote.no) || (thread.id === 't2' && a.id === 'a6') || (thread.id === 't3' && a.id === 'c3') || (thread.id === 't5' && a.id === 'd3'),
  )
  const lead = LEADS.find((l) => l.name === thread.name)
  const leadId = THREAD_LEAD[thread.id]
  const phone = threadPhone(thread)
  const optedOut = isOptedOut(phone)
  const email = client?.email ?? lead?.email ?? (thread.id === 't4' ? 'gestion@laurentia.ca' : thread.id === 't6' ? 'louis.bergeron@outlook.com' : undefined)
  const address = client ? `${client.no}, ${client.street}, ${client.city}` : lead ? lead.city : thread.id === 't4' ? '2600, boul. Laurier, Sainte-Foy' : thread.id === 't6' ? 'Sillery' : undefined
  const leadRecord = leadId ? LEADS.find((l) => l.id === leadId) : undefined
  const recordHref = client ? (access.client(client) ? `/clients/${client.id}` : undefined) : leadId && (!leadRecord || access.lead(leadRecord)) ? `/leads/${leadId}` : undefined

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center gap-3">
        <Avatar name={thread.name} size="lg" />
        <p className="flex-1 min-w-0 text-md font-semibold text-ink truncate">{thread.name}</p>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-sand xl:hidden" aria-label={t('Fermer')}>
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="space-y-2 text-sm text-ink-secondary">
        <p className="flex items-center gap-2 tnum">
          <Phone className="w-4 h-4 text-ink-mute shrink-0" />
          {phone}
        </p>
        {optedOut && (
          <Badge tone="critical">
            <Ban className="w-3 h-3" />
            {t('Désabonné des textos')}
          </Badge>
        )}
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
              {t('Ouverte {n} fois', { n: quote.views })}
            </p>
          )}
        </Link>
      )}
      {appt && (
        <div className="flex items-center gap-3">
          <div className="w-11 text-center rounded-md bg-sand py-1 shrink-0">
            <p className="text-2xs text-ink-mute uppercase">{(getLang() === 'en' ? DAY_ABBR_EN : DAY_ABBR)[appt.day]}</p>
            <p className="text-sm font-semibold tnum">{18 + appt.day}</p>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink truncate">{t(appt.title)}</p>
            <p className="text-2xs text-ink-mute">
              {hourLabel(appt.start)} · {repById(appt.repId)!.name}
            </p>
          </div>
        </div>
      )}
      {recordHref && (
        <Link to={recordHref} className="btn btn-sm btn-secondary w-full">
          <UserRound className="w-4 h-4" />
          {t('Ouvrir la fiche')}
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
  { id: 'e1', type: 'Soumission', date: "Aujourd'hui 16 h 43", day: 'today', by: 'Pierre-Luc Cloutier', quoteNo: 'G64318', client: 'Patrick Boucher', email: 'p.boucher@videotron.ca', company: 'sg', subject: 'Soumission gouttières G64318', body: PLC_QUOTE_BODY, attach: 'Soumission G64318.pdf', opened: 1 },
  { id: 'e2', type: 'Soumission', date: "Aujourd'hui 16 h 33", day: 'today', by: 'Pierre-Luc Cloutier', quoteNo: 'G64317', client: 'Mélanie Morin', email: 'melanie.morin@gmail.com', company: 'sg', subject: 'Soumission gouttières G64317', body: PLC_QUOTE_BODY, attach: 'Soumission G64317.pdf' },
  { id: 'e3', type: 'Soumission', date: "Aujourd'hui 15 h 39", day: 'today', by: 'Hélène Petitpas', quoteNo: 'H64026', client: 'Pierre Simard', email: 'p.simard@outlook.com', company: 'toit', subject: 'Confirmation des travaux du 22 octobre', body: `Bonjour,\n\nConfirmation des travaux pour le jeudi 22 octobre.\nTimberline Charbon, bordure noire, ventilateur noir.\nRallonge arrière non incluse · OSB ½ à faire.\n\nHélène Petitpas\nToitures Hillman`, attach: 'Soumission H64026.pdf', opened: 2 },
  { id: 'e4', type: 'Rappel', date: "Aujourd'hui 14 h 00", day: 'today', by: 'Automatique', quoteNo: 'G64251', client: 'Habitations Mica', email: 'f.helie@habitationsmica.com', company: 'sg', subject: 'Suivi de votre soumission G64251', body: AUTO_REMINDER_BODY },
  { id: 'e5', type: 'Rappel', date: "Aujourd'hui 13 h 30", day: 'today', by: 'Automatique', quoteNo: 'H64263', client: 'Nathalie Morin', email: 'nathalie.morin@hotmail.com', company: 'toit', subject: 'Suivi de votre soumission H64263', body: AUTO_REMINDER_BODY, opened: 1 },
  { id: 'e6', type: 'Rappel', date: "Aujourd'hui 13 h 00", day: 'today', by: 'Automatique', quoteNo: 'G64219', client: 'Denis Girard', email: 'denis.girard@live.ca', company: 'sg', subject: 'Suivi de votre soumission G64219', body: AUTO_REMINDER_BODY },
  { id: 'e7', type: 'Soumission', date: 'Hier 17 h 12', day: 'yesterday', by: 'Jean-Pierre Hillman', quoteNo: 'H64320', quoteId: 'q64320', client: 'Isabelle Gagnon', email: 'isabelle.gagnon@videotron.ca', company: 'toit', subject: 'Soumission toiture H64320', body: `Bonjour Isabelle,\n\nVoici votre soumission. Vous pouvez la consulter et la signer en ligne avec le lien ci-dessous.\n\nJean-Pierre Hillman\nToitures Hillman · 418 576-1993`, attach: 'Soumission H64320.pdf · Garantie GAF System Plus.pdf', opened: 3 },
  { id: 'e8', type: 'Soumission', date: 'Hier 15 h 05', day: 'yesterday', by: 'Dominic Plourde', quoteNo: 'G64310', client: 'Denis Girard', email: 'denis.girard@live.ca', company: 'sg', subject: 'Soumission gouttières G64310', body: `Bonjour, voici la soumission.\n\nMerci\nDominic Plourde\nSignature Gouttières`, attach: 'Soumission G64310.pdf', opened: 4 },
  { id: 'e9', type: 'Soumission', date: 'Lun. 19 h 02', day: 'week', by: 'Philippe Audet', quoteNo: 'R64288', client: 'Louis Bergeron', email: 'louis.bergeron@outlook.com', company: 'reno', subject: 'Soumission agrandissement R64288', body: `Bonjour M. Bergeron,\n\nVoici la soumission révisée pour le garage, incluant le revêtement. Au plaisir!\n\nPhilippe Audet\nRénovations Hillman`, attach: 'Soumission R64288.pdf', opened: 2 },
  { id: 'e10', type: 'Rappel', date: 'Lun. 14 h 00', day: 'week', by: 'Automatique', quoteNo: 'H64252', client: 'Simon Leclerc', email: 'simon.leclerc@gmail.com', company: 'toit', subject: 'Suivi de votre soumission H64252', body: AUTO_REMINDER_BODY },
  { id: 'e11', type: 'Rappel', date: 'Lun. 13 h 30', day: 'week', by: 'Automatique', quoteNo: 'G64236', client: 'Steve Dubé', email: 'steve.dube@videotron.ca', company: 'sg', subject: 'Suivi de votre soumission G64236', body: AUTO_REMINDER_BODY, opened: 1 },
  { id: 'e12', type: 'Soumission', date: 'Sam. 10 h 18', day: 'week', by: 'Benoit Tondreau', quoteNo: 'G64300', client: 'Steve Dubé', email: 'steve.dube@videotron.ca', company: 'sg', subject: 'Soumission nettoyage G64300', body: `Bonjour, voici la soumission pour le nettoyage avant l'hiver.\n\nBenoit Tondreau\nSignature Gouttières`, attach: 'Soumission G64300.pdf' },
]

/**
 * A send logged by the quote builder (`logSent`), shown with the same layout as the mock rows.
 * Built while rendering, so its labels follow the current language.
 */
function fromSentLog(r: SentRecord): SentEmail {
  const q = quoteById(r.quoteId)
  const c = q ? clientById(q.clientId) : undefined
  const at = new Date(r.at)
  const today = at.toDateString() === new Date().toDateString()
  const time = formatHour(at.getHours() + at.getMinutes() / 60)
  const sms = r.channels.includes('sms')
  return {
    id: r.id,
    type: r.kind === 'Relance' ? 'Rappel' : 'Soumission',
    date: today ? t("Aujourd'hui {time}", { time }) : at.toLocaleDateString(getLang() === 'en' ? 'en-CA' : 'fr-CA', { day: 'numeric', month: 'short' }) + ' ' + time,
    day: today ? 'today' : 'week',
    by: r.by,
    quoteNo: r.quoteNo,
    quoteId: r.quoteId,
    client: c ? fullName(c) : r.to,
    email: r.to,
    company: r.company,
    subject: r.subject,
    body: (r.kind === 'Relance' ? t('Relance de la soumission {no} envoyée depuis la soumission.', { no: r.quoteNo }) : t('Soumission {no} envoyée depuis la soumission, avec le lien pour la consulter et la signer en ligne.', { no: r.quoteNo })) + (sms ? '\n\n' + t('Aussi envoyée par texto.') : ''),
    attach: r.channels.includes('email') ? t('Soumission {no}.pdf', { no: r.quoteNo }) : undefined,
  }
}

/** Mockup: `N4`. */
function SentList({ rows, activeId, onOpen }: { rows: SentEmail[]; activeId?: string; onOpen: (id: string) => void }) {
  if (!rows.length)
    return (
      <Empty icon={Inbox} title={t('Aucun courriel')}>
        {t('Changez les filtres ou la compagnie.')}
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
              <span className="text-2xs text-ink-mute shrink-0">{t(e.date)}</span>
            </div>
            <p className="text-xs text-ink-mute truncate mt-0.5">{t(e.subject)}</p>
            <p className="text-2xs text-ink-mute mt-1">{e.type === 'Rappel' ? t('Rappel automatique') : e.by}</p>
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
        <button onClick={onBack} className="md:hidden p-1.5 rounded-md hover:bg-sand" aria-label={t('Retour')}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="w-9 h-9 rounded-full bg-sand flex items-center justify-center">
          <Mail className="w-4 h-4 text-ink-mute" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink truncate">{t(e.subject)}</p>
          <p className="text-2xs text-ink-mute truncate">{t(e.date)}</p>
        </div>
        {quoteId && (
          <Link to={`/soumissions/${quoteId}`} className="btn btn-xs btn-secondary">
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('Ouvrir {no}', { no: e.quoteNo })}</span>
          </Link>
        )}
        <button onClick={() => toast(t('Courriel renvoyé à {email}', { email: e.email }))} className="btn btn-xs btn-quiet">
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('Renvoyer')}</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 md:px-6 py-5">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-card">
          <dl className="px-5 py-4 border-b border-hairline grid grid-cols-[110px_minmax(0,1fr)] gap-y-1.5 text-sm">
            {[
              [t('À'), e.email],
              [t('Envoyé par'), e.by === 'Automatique' ? t(e.by) : e.by],
              [t('Soumission'), e.quoteNo],
            ].map(([label, value]) => (
              <Fragment key={label}>
                <dt className="label-caps self-center">{label}</dt>
                <dd className="text-ink-secondary truncate">{value}</dd>
              </Fragment>
            ))}
          </dl>
          <p className="px-5 py-4 text-sm text-ink-secondary whitespace-pre-line leading-relaxed">{t(e.body)}</p>
          <div className="px-5 pb-5 flex flex-wrap items-center gap-2">
            {e.attach && (
              <span className="flex items-center gap-2 rounded-lg bg-sand px-3 py-2 text-xs">
                <Paperclip className="w-3.5 h-3.5 text-ink-mute" />
                <span className="font-semibold text-ink">{t(e.attach)}</span>
              </span>
            )}
            {e.opened ? (
              <Badge tone="info">
                <Eye className="w-3 h-3" />
                {t('Ouvert {n} fois', { n: e.opened })}
              </Badge>
            ) : (
              <Badge tone="neutral">{t('Pas encore ouvert')}</Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Page ──────────────────────────────────────────────────────────────── */

const hasAI = (t: Thread) => t.aiHandled || t.messages.some((m) => m.channel === 'ai')
const hasFailed = (t: ChatThread) => t.messages.some((m) => m.state === 'failed')

const VIEW_TABS: [view: 'threads' | 'sent', label: string, icon: Icon][] = [
  ['threads', 'Conversations', MessageSquare],
  ['sent', 'Courriels envoyés', Send],
]

export default function Conversations() {
  useStore() // opt-out list
  const { scope } = useApp()
  const { user } = useAuth()
  const access = useAccess()
  const [filter, setFilter] = useState<ThreadFilter>('all')
  const [query, setQuery] = useState('')
  const [threads, setThreads] = useState<ChatThread[]>(() => [...THREADS.filter((t) => t.id !== 't7'), ...DEMO_THREADS])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let live = true
    request(null, { ms: 350 }).then(() => live && setLoading(false))
    return () => {
      live = false
    }
  }, [])
  const [activeId, setActiveId] = useState('t1')
  const [pane, setPane] = useState<'list' | 'thread'>('list')
  const [aiOn, setAiOn] = useState<Record<string, boolean>>({ t2: true, t3: true })
  const [contactOpen, setContactOpen] = useState(false)
  const [view, setView] = useState<'threads' | 'sent'>('threads')
  const [sentType, setSentType] = useState('all')
  const [sentBy, setSentBy] = useState('all')
  const [sentDay, setSentDay] = useState('all')
  const [sentId, setSentId] = useState('e7')

  // Sends logged by the quote builder (newest first), then the mock history.
  // Without `conversations.viewAll`: only emails about the rep's own quotes (or sent by them).
  const ownSent = (e: SentEmail) => {
    if (access.seesAll.conversations) return true
    const q = quoteByNo(e.quoteNo)
    return q ? access.quote(q) : e.by === user?.name
  }
  // API mode: only what was sent in this session; the demo log names demo clients.
  const allSent: SentEmail[] = [...SENT_LOG.map(fromSentLog), ...(API_MODE ? [] : SENT_EMAILS)].filter((e) => access.company(e.company) && ownSent(e))
  const sentRows = allSent
    .filter((e) => inScope(scope, e.company))
    .filter((e) => sentType === 'all' || e.type === sentType)
    .filter((e) => sentBy === 'all' || e.by === sentBy)
    .filter((e) => sentDay === 'all' || e.day === sentDay)
    .filter((e) => !query || (e.client + e.subject + e.quoteNo + e.email).toLowerCase().includes(query.toLowerCase()))
  const senders = [...new Set(allSent.filter((e) => inScope(scope, e.company)).map((e) => e.by))]
  const sent = sentRows.find((e) => e.id === sentId) ?? sentRows[0]

  // Without `conversations.viewAll` a rep sees only the threads assigned to them.
  const mine = useMemo(() => threads.filter((t) => inScope(scope, t.company) && access.thread(t)), [threads, scope, access])
  const visible = useMemo(
    () =>
      mine
        .filter((t) => (filter === 'unread' ? t.unread > 0 : filter === 'ai' ? hasAI(t) : filter === 'mine' ? t.assigned === (user?.repId ?? ME.id) : filter === 'sms' || filter === 'email' || filter === 'call' ? t.channel === filter : true))
        .filter((t) => !query || (t.name + t.last).toLowerCase().includes(query.toLowerCase())),
    [mine, filter, query, user],
  )
  const active = mine.find((t) => t.id === activeId) ?? visible[0]

  const openThread = (id: string) => {
    setActiveId(id)
    setPane('thread')
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, unread: 0 } : t)))
  }
  const patchMessage = (threadId: string) => (id: string, p: Partial<ChatMessage>) =>
    setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, messages: t.messages.map((m) => (m.id === id ? { ...m, ...p } : m)) } : t)))
  const appendMessage = (m: ChatMessage) => {
    setThreads((prev) => prev.map((t) => (t.id === active.id ? { ...t, messages: [...t.messages, m], last: m.text, at: "À l'instant" } : t)))
    deliver(m, threadPhone(active), patchMessage(active.id))
  }
  const retry = (m: ChatMessage) => deliver(m, threadPhone(active), patchMessage(active.id))
  const aiActive = active ? !!aiOn[active.id] : false

  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [active?.id, active?.messages.length, pane])

  const counts: Partial<Record<ThreadFilter, number>> = {
    unread: mine.filter((t) => t.unread).length,
    ai: mine.filter(hasAI).length,
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-sand">
      <div className={cn('w-full md:w-80 lg:w-96 bg-white border-r border-hairline flex flex-col shrink-0', pane === 'thread' && 'hidden md:flex')}>
        <div className="p-4 border-b border-hairline space-y-3">
          <h1 className="text-xl font-semibold text-ink">{access.seesAll.conversations ? t('Conversations') : t('Vos conversations')}</h1>
          <div className="grid grid-cols-2 gap-1 p-1 bg-sand rounded-lg" role="tablist">
            {VIEW_TABS.map(([v, label, IconC]) => (
              <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={cn('h-8 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5', view === v ? 'bg-white text-ink shadow-card' : 'text-ink-mute hover:text-ink')}>
                <IconC className="w-3.5 h-3.5" />
                {t(label)}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={view === 'sent' ? t('Client, no de soumission, objet…') : t('Rechercher une conversation')} className="form-input pl-9 h-9 bg-sand border-transparent" />
          </div>
          {view === 'sent' ? (
            <div className="grid grid-cols-3 gap-1.5">
              <select aria-label={t("Type d'envoi")} value={sentType} onChange={(e) => setSentType(e.target.value)} className="form-input h-8 text-xs px-2">
                <option value="all">{t('Tous types')}</option>
                <option value="Soumission">{t('Soumission')}</option>
                <option value="Rappel">{t('Rappel')}</option>
              </select>
              <select aria-label={t('Envoyé par')} value={sentBy} onChange={(e) => setSentBy(e.target.value)} className="form-input h-8 text-xs px-2">
                <option value="all">{t('Tous envoyeurs')}</option>
                {senders.map((s) => (
                  <option key={s} value={s}>
                    {s === 'Automatique' ? t(s) : s}
                  </option>
                ))}
              </select>
              <select aria-label={t("Date d'envoi")} value={sentDay} onChange={(e) => setSentDay(e.target.value)} className="form-input h-8 text-xs px-2">
                <option value="all">{t('Toutes dates')}</option>
                <option value="today">{t("Aujourd'hui")}</option>
                <option value="yesterday">{t('Hier')}</option>
                <option value="week">{t('Cette semaine')}</option>
              </select>
            </div>
          ) : (
            <div className="flex gap-1 overflow-x-auto nav-scroll -mx-1 px-1 pb-1">
              {THREAD_FILTERS.filter((f) => f.v !== 'mine' || access.seesAll.conversations).map((f) => (
                <button key={f.v} onClick={() => setFilter(f.v)} className={cn('h-7 px-2.5 rounded-md text-xs font-semibold whitespace-nowrap flex items-center gap-1 shrink-0', filter === f.v ? 'bg-ink text-white' : 'bg-sand text-ink-mute hover:text-ink')}>
                  {f.icon && <f.icon className="w-3 h-3" />}
                  {t(f.label)}
                  {counts[f.v] ? <span className="tnum opacity-70">{counts[f.v]}</span> : null}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <SkeletonRows rows={7} />
          ) : view === 'sent' ? (
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
                <Empty icon={Inbox} title={t('Aucune conversation')}>
                  {t('Changez de filtre ou de compagnie.')}
                </Empty>
              )}
              {visible.map((th) => {
                const ChannelIcon = CHANNEL_ICONS[th.channel]
                const ai = hasAI(th)
                return (
                  <button key={th.id} onClick={() => openThread(th.id)} className={cn('w-full text-left px-4 py-3 border-b border-hairline flex gap-3 transition-colors', active?.id === th.id ? 'bg-primary-wash' : 'hover:bg-sand')}>
                    <div className="relative shrink-0">
                      <Avatar name={th.name} size="md" />
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white shadow-card flex items-center justify-center">
                        <ChannelIcon className="w-3 h-3 text-ink-mute" />
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={cn('text-sm truncate flex-1', th.unread ? 'font-bold text-ink' : 'font-semibold text-ink-secondary')}>{th.name}</p>
                        <span className="text-2xs text-ink-mute shrink-0">{t(th.at)}</span>
                      </div>
                      <p className={cn('text-xs truncate mt-0.5', th.unread ? 'text-ink' : 'text-ink-mute')}>{t(th.last)}</p>
                      {(scope === 'all' || ai || th.unread > 0 || hasFailed(th)) && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {scope === 'all' && <CompanyBadge id={th.company} />}
                          {ai && (
                            <span className="badge bg-lavender text-ink !text-2xs !px-1.5">
                              <Bot className="w-2.5 h-2.5 mr-0.5" />
                              {t('IA')}
                            </span>
                          )}
                          {hasFailed(th) && <span className="badge bg-tone-critical-soft text-tone-critical-ink !text-2xs !px-1.5">{t('Échec')}</span>}
                          {th.unread > 0 && <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-primary text-white text-2xs font-bold flex items-center justify-center tnum">{th.unread}</span>}
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
            <Empty icon={Mail} title={t('Aucun courriel sélectionné')} />
          </div>
        ))}

      {view === 'threads' && active && (
        <div className={cn('flex-1 flex flex-col min-w-0', pane === 'list' && 'hidden md:flex')}>
          <div className="h-16 bg-white border-b border-hairline px-3 md:px-5 flex items-center gap-3 shrink-0">
            <button onClick={() => setPane('list')} className="md:hidden p-1.5 rounded-md hover:bg-sand" aria-label={t('Retour')}>
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
                toast(aiActive ? t('Vous avez pris le relais') : t("Conversation confiée à l'agent IA (démo · janvier 2027)"))
              }}
              className={cn('btn btn-xs', aiActive ? 'bg-lavender text-ink hover:bg-lavender/70' : 'btn-quiet')}
              title={t("L'agent IA arrive en janvier 2027")}
            >
              {aiActive ? (
                <>
                  <Hand className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('Prendre le relais')}</span>
                  <ComingSoon className="hidden sm:inline-flex" />
                </>
              ) : (
                <>
                  <Bot className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t("Confier à l'agent IA")}</span>
                  <ComingSoon className="hidden sm:inline-flex" />
                </>
              )}
            </button>
            <button onClick={() => toast(t('Appel lancé via le numéro de {company}', { company: t(companyById(active.company).short) }))} className="btn btn-xs btn-secondary" aria-label={t('Appeler')}>
              <Phone className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setContactOpen(true)} className="btn btn-xs btn-secondary xl:hidden" aria-label={t('Fiche')}>
              <UserRound className="w-3.5 h-3.5" />
            </button>
          </div>
          {aiActive && (
            <div className="bg-lavender-soft border-b border-lavender px-5 py-2 text-xs text-ink-secondary flex items-center gap-2">
              <Bot className="w-4 h-4 text-ink" />
              <span className="font-semibold text-ink">{t("L'agent IA répond à ce client")}</span>
              <ComingSoon />
            </div>
          )}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 md:px-6 py-5 space-y-4">
            {active.messages.length === 0 && (
              <Empty icon={MessageSquare} title={t('Aucun message')}>
                {t('Écrivez le premier message ci-dessous.')}
              </Empty>
            )}
            {active.messages.map((m) => (
              <MessageBubble key={m.id} m={m} thread={active} onRetry={retry} />
            ))}
          </div>
          <Composer key={active.id} thread={active} phone={threadPhone(active)} lang={clientLang(active.clientId ? clientById(active.clientId) : undefined)} onSend={appendMessage} />
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
