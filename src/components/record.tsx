/**
 * Building blocks shared by "record" pages (lead detail, client detail) and
 * the conversation views: header, stage bar, info groups, message thread,
 * composer, timeline and notes.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Ban, Bot, Check, Clock, Copy, Eye, FileText, Languages, LoaderCircle, Mail, MessageSquare, Paperclip, PhoneIncoming, PhoneOutgoing, Play, RefreshCw, Send, ShieldCheck, Sparkles, StickyNote, Trash2, TriangleAlert } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { ME, companyById, type Message, type Thread } from '../data/mock'
import { isOptedOut, optOut } from '../data/settings'
import { request, useStore } from '../data/store'
import { langName, t, tIn, type Lang } from '../i18n'
import { toast } from '../lib/toast'
import { cn } from '../lib/utils'
import { ComingSoon, Notice, confirmAction } from './states'
import { Avatar, Badge, CHANNEL_ICONS, Empty, type Icon } from './ui'

// ── Delivery state, STOP handling ───────────────────────────────────────────

/** A message plus its delivery state (outgoing texts and emails can fail). */
export type ChatMessage = Message & {
  /** `sending` while the provider has not confirmed; `failed` when it refused. */
  state?: 'sending' | 'failed'
  /** Provider error shown under a failed message (French, translated at display). */
  error?: string
}

/** Opt-out keywords a client can text back (CRTC / Loi 25). */
export const isStopReply = (text: string) => /^\s*(stop|arr[eê]t|arreter|arrêter|désabonner|desabonner|unsubscribe)\s*[.!]?\s*$/i.test(text)

/**
 * Applies STOP replies found in a thread: the phone number is opted out of texts (Settings keeps
 * the list). Returns true when the number is (now) opted out.
 */
export function applyStopReplies(messages: Message[], phone?: string) {
  if (!phone) return false
  if (!isOptedOut(phone) && messages.some((m) => m.dir === 'in' && m.channel === 'sms' && isStopReply(m.text))) optOut(phone)
  return isOptedOut(phone)
}

/**
 * Simulated provider delivery for an outgoing message: resolves as delivered, or fails for a
 * number that cannot receive texts. `patch` updates the message in the caller's state.
 */
export function deliver(m: ChatMessage, phone: string | undefined, patch: (id: string, p: Partial<ChatMessage>) => void) {
  if (m.dir !== 'out' || m.channel === 'note') return
  const badNumber = m.channel === 'sms' && (phone ?? '').replace(/\D/g, '').length < 10
  patch(m.id, { state: 'sending', error: undefined })
  request(true, { ms: 700, fail: badNumber }).then(
    () => patch(m.id, { state: undefined, error: undefined }),
    () => patch(m.id, { state: 'failed', error: 'Numéro invalide ou injoignable' }),
  )
}

/** Canned AI reply suggestions per thread (mockup: `hd`). */
const AI_SUGGESTIONS: Record<string, string> = {
  t1: "Bonjour Isabelle! Oui : la soumission inclut 64 pi² de contreplaqué ½ po pour remplacer les sections abîmées. Au-delà, c'est 3,25 $/pi² posé, et on vous montre les photos avant de remplacer quoi que ce soit. Voulez-vous que je passe jeudi pour en jaser avec votre conjoint?",
  t3: "Bonjour Martin! L'installation se fait en une seule journée pour un bungalow (environ 5 à 6 heures). Nous pouvons passer prendre les mesures jeudi 14 h — ça vous convient?",
  t4: "Bonjour, voici notre attestation RBQ (5648-0858-01) et notre certificat d'assurance responsabilité de 2 M$. N'hésitez pas si le CA a d'autres questions avant jeudi.",
}

/** Quick reply templates in the composer (mockup: `M3`). */
const QUICK_REPLIES = [
  { name: 'Confirmation de rendez-vous', text: 'Bonjour, je vous confirme notre rendez-vous. Je vous texterai en route. Merci!' },
  { name: 'Soumission envoyée', text: 'Bonjour, votre soumission vient de vous être envoyée par courriel. Vous pouvez la signer en ligne en quelques minutes.' },
  { name: 'Suivi de soumission', text: 'Bonjour, je fais un suivi sur la soumission que nous vous avons envoyée. Avez-vous des questions? Je peux passer vous voir au besoin.' },
  { name: 'Soumission acceptée — merci', text: 'Merci pour votre confiance! Nous vous appelons sous peu pour planifier les travaux.' },
]

/** Delivery line under an outgoing message: sending / failed + retry / delivered. */
function DeliveryState({ m, onRetry }: { m: ChatMessage; onRetry?: (m: ChatMessage) => void }) {
  if (m.state === 'sending')
    return (
      <span className="inline-flex items-center gap-1">
        <LoaderCircle className="w-3 h-3 animate-spin" />
        {t('Envoi…')}
      </span>
    )
  if (m.state === 'failed')
    return (
      <span className="inline-flex items-center gap-1.5 text-tone-critical-ink font-semibold">
        <TriangleAlert className="w-3 h-3" />
        {t("Échec de l'envoi")}
        {m.error && <span className="font-normal">· {t(m.error)}</span>}
        {onRetry && (
          <button onClick={() => onRetry(m)} className="inline-flex items-center gap-1 underline underline-offset-2 hover:no-underline">
            <RefreshCw className="w-3 h-3" />
            {t('Réessayer')}
          </button>
        )}
      </span>
    )
  return <>{t('Livré')}</>
}

/** One message in a thread (mockup: `H0`). */
export function MessageBubble({ m, thread, onRetry }: { m: ChatMessage; thread: Thread; onRetry?: (m: ChatMessage) => void }) {
  const ChannelIcon = CHANNEL_ICONS[m.channel]
  if (m.channel === 'note')
    return (
      <div className="flex justify-center">
        <div className="max-w-md text-center text-xs text-ink-mute bg-white/70 border border-hairline rounded-lg px-3 py-2">
          <span className="inline-flex items-center gap-1.5 font-semibold text-ink-secondary">
            <Eye className="w-3.5 h-3.5" />
            {m.meta ? t(m.meta) : t('Activité')}
          </span>
          <p className="mt-0.5">{t(m.text)}</p>
          <p className="text-2xs mt-1 text-ink-faint">{t(m.at)}</p>
        </div>
      </div>
    )
  if (m.channel === 'call')
    return (
      <div className="flex justify-end">
        <div className="w-full max-w-lg bg-white rounded-xl shadow-card overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-3 border-b border-hairline">
            <span className="w-9 h-9 rounded-full bg-sand flex items-center justify-center">{m.dir === 'out' ? <PhoneOutgoing className="w-4 h-4" /> : <PhoneIncoming className="w-4 h-4" />}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink">{t(m.text)}</p>
              <p className="text-2xs text-ink-mute">
                {m.by ?? thread.name} · {t(m.at)}
              </p>
            </div>
            <button onClick={() => toast(t("Lecture de l'enregistrement…"))} className="btn btn-xs btn-quiet">
              <Play className="w-3.5 h-3.5" />
              {t('Écouter')}
            </button>
          </div>
        </div>
      </div>
    )
  if (m.channel === 'email')
    return (
      <div className={cn('flex', m.dir === 'out' ? 'justify-end' : 'justify-start')}>
        <div className="w-full max-w-lg bg-white rounded-xl shadow-card">
          <div className="px-4 py-2.5 border-b border-hairline flex items-center gap-2 text-xs text-ink-mute">
            <Mail className="w-3.5 h-3.5" />
            <span className="font-semibold text-ink-secondary">{m.dir === 'out' ? m.by : thread.name}</span>
            <span className="ml-auto">{t(m.at)}</span>
          </div>
          <p className="px-4 py-3 text-sm text-ink-secondary whitespace-pre-line">{t(m.text)}</p>
          {m.dir === 'out' && m.state && (
            <p className={cn('px-4 pb-3 text-2xs', m.state === 'failed' ? '' : 'text-ink-faint')}>
              <DeliveryState m={m} onRetry={onRetry} />
            </p>
          )}
          {m.meta && (
            <div className="mx-4 mb-3 flex items-center gap-2 rounded-lg bg-sand px-3 py-2 text-xs">
              <FileText className="w-4 h-4 text-ink-mute" />
              <span className="font-semibold text-ink">{t(m.meta.split(' · ')[0])}</span>
              {m.meta.includes('·') && (
                <Badge tone="info" className="ml-auto">
                  <Eye className="w-3 h-3" />
                  {t(m.meta.split(' · ')[1])}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    )
  const out = m.dir === 'out'
  const ai = m.channel === 'ai'
  const auto = m.by?.startsWith('Automatisation')
  const failed = m.state === 'failed'
  const stop = !out && m.channel === 'sms' && isStopReply(m.text)
  return (
    <div className={cn('flex gap-2', out ? 'justify-end' : 'justify-start')}>
      {!out && <Avatar name={thread.name} size="sm" className="mt-auto" />}
      <div className={cn('max-w-[78%] md:max-w-md')}>
        {(ai || auto) && (
          <p className={cn('text-2xs font-semibold mb-1 flex items-center gap-1', out ? 'justify-end text-ink-mute' : '')}>
            {ai ? (
              <>
                <Bot className="w-3 h-3" />
                {t('Agent IA Hillman')}
                <ComingSoon />
              </>
            ) : (
              <>
                <Clock className="w-3 h-3" />
                {t(m.by?.replace('Automatisation · ', 'Suivi automatique · ') ?? '')}
              </>
            )}
          </p>
        )}
        <div
          className={cn(
            'px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed',
            failed ? 'bg-tone-critical-soft text-tone-critical-ink border border-tone-critical rounded-br-md' : out ? (ai ? 'bg-lavender text-ink rounded-br-md' : 'bg-primary text-white rounded-br-md') : 'bg-white text-ink shadow-card rounded-bl-md',
            m.state === 'sending' && 'opacity-70',
          )}
        >
          {t(m.text)}
        </div>
        <p className={cn('text-2xs text-ink-faint mt-1 flex flex-wrap items-center gap-1', out && 'justify-end')}>
          <ChannelIcon className="w-3 h-3" />
          {t(m.at)}
          {out && !ai && !auto && m.by ? ` · ${m.by}` : ''}
          {out && (
            <>
              {' · '}
              <DeliveryState m={m} onRetry={onRetry} />
            </>
          )}
        </p>
        {stop && (
          <p className="text-2xs mt-1 flex items-center gap-1 text-tone-critical-ink font-semibold">
            <Ban className="w-3 h-3" />
            {t('Désabonné des textos (STOP) — plus aucun texto ne sera envoyé')}
          </p>
        )}
        {m.meta && ai && (
          <p className="text-2xs mt-1 flex items-center gap-1 justify-end text-tone-good-ink font-semibold">
            <ShieldCheck className="w-3 h-3" />
            {t(m.meta)}
          </p>
        )}
      </div>
    </div>
  )
}

type ComposerMode = 'sms' | 'email' | 'note'

const COMPOSER_MODES: { v: ComposerMode; l: string; i: Icon }[] = [
  { v: 'sms', l: 'Texto', i: MessageSquare },
  { v: 'email', l: 'Courriel', i: Mail },
  { v: 'note', l: 'Note interne', i: StickyNote },
]

/**
 * Reply composer with AI suggestion, templates and internal notes (mockup: `G0`). `phone` is the
 * contact's texting number: texts are blocked when it replied STOP. `lang` is the client's language
 * (`clientLang(client)`, French by default): quick replies and AI drafts are written in it, while
 * the composer's own labels follow the rep's UI language. Internal notes are not client-facing.
 */
export function Composer({ thread, onSend, suggestion, phone, lang = 'fr' }: { thread: Thread; onSend: (m: ChatMessage) => void; suggestion?: string; phone?: string; lang?: Lang }) {
  useStore() // opt-out list changes
  const { user } = useAuth()
  const optedOut = isOptedOut(phone)
  const [mode, setMode] = useState<ComposerMode>(thread.channel === 'email' || (optedOut && thread.channel === 'sms') ? 'email' : 'sms')
  const smsBlocked = mode === 'sms' && optedOut
  const [text, setText] = useState('')
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [drafting, setDrafting] = useState(false)
  const hint = suggestion ?? (AI_SUGGESTIONS[thread.id] ? tIn(lang, AI_SUGGESTIONS[thread.id]) : undefined)

  const draft = () => {
    setDrafting(true)
    window.setTimeout(() => {
      setText(hint ?? tIn(lang, 'Bonjour {name}, merci pour votre message! Je vous reviens dans la journée avec les détails.', { name: thread.name.split(' ')[0] }))
      setDrafting(false)
    }, 700)
  }
  const send = () => {
    if (!text.trim() || smsBlocked) return
    onSend({ id: 'x' + Date.now(), dir: 'out', channel: mode === 'note' ? 'note' : mode, at: "À l'instant", by: user?.name ?? ME.name, text, meta: mode === 'note' ? 'Note interne' : undefined })
    setText('')
    if (mode === 'note') toast(t('Note ajoutée'))
  }

  return (
    <div className="border-t border-hairline bg-white p-3 md:p-4 shrink-0">
      <div className="flex items-center gap-1 mb-2 flex-wrap">
        {COMPOSER_MODES.map((o) => (
          <button key={o.v} onClick={() => setMode(o.v)} className={cn('h-7 px-2.5 rounded-md text-xs font-semibold flex items-center gap-1.5', mode === o.v ? (o.v === 'note' ? 'bg-tone-warn-soft text-tone-warn-ink' : 'bg-ink text-white') : 'text-ink-mute hover:bg-sand')}>
            <o.i className="w-3.5 h-3.5" />
            {t(o.l)}
          </button>
        ))}
        <span className="ml-auto text-2xs text-ink-mute hidden sm:inline-flex items-center gap-1" data-client-lang={lang}>
          {t('De : {company} · {phone}', { company: companyById(thread.company).name, phone: companyById(thread.company).phone })}
          {mode !== 'note' && (
            <>
              {' · '}
              <Languages className="w-3 h-3" />
              {t('Langue du client : {lang}', { lang: langName(lang) })}
            </>
          )}
        </span>
      </div>
      {smsBlocked && (
        <Notice tone="critical" className="mb-2">
          {t('Ce client a répondu STOP : les textos sont bloqués pour ce numéro. Écrivez-lui par courriel ou appelez-le.')}
        </Notice>
      )}
      {!text && !drafting && !smsBlocked && (
        <button onClick={draft} className="mb-2 w-full text-left rounded-lg border border-lavender bg-lavender-soft px-3 py-2 text-sm text-ink-secondary hover:bg-lavender/40 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-ink mt-0.5 shrink-0" />
          <span className="line-clamp-2 md:line-clamp-none">
            <span className="font-semibold text-ink">{t('Suggestion IA')}</span> <ComingSoon />
            {' · '}
            {hint ? hint.slice(0, 92) + '…' : t('Générer une réponse à partir du dossier client')}
          </span>
        </button>
      )}
      <div className={cn('rounded-lg border focus-within:ring-2 focus-within:ring-ring focus-within:border-primary', mode === 'note' ? 'border-tone-warn bg-tone-warn-soft/40' : 'border-hairline-input')}>
        <textarea
          value={drafting ? t("L'IA rédige une réponse à partir de la soumission et de l'historique…") : text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          disabled={drafting || smsBlocked}
          placeholder={mode === 'note' ? t("Note visible seulement par l'équipe… @mention") : t('Écrire à {name}…', { name: thread.name })}
          className="w-full resize-none bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-ink-faint disabled:text-ink-mute"
          aria-label={t('Message')}
        />
        <div className="flex items-center gap-1 px-2 pb-2 flex-wrap">
          <div className="relative">
            <button onClick={() => setTemplatesOpen((o) => !o)} className="btn btn-xs btn-ghost">
              <FileText className="w-3.5 h-3.5" />
              {t('Modèles')}
            </button>
            {templatesOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setTemplatesOpen(false)} />
                <div className="absolute bottom-full mb-1 left-0 z-50 w-72 bg-white rounded-lg border border-hairline shadow-xl py-1 menu-in">
                  {QUICK_REPLIES.map((qr) => (
                    <button
                      key={qr.name}
                      onClick={() => {
                        setText(mode === 'note' ? t(qr.text) : tIn(lang, qr.text))
                        setTemplatesOpen(false)
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-sand"
                    >
                      <span className="block text-sm font-medium text-ink">{t(qr.name)}</span>
                      <span className="block text-2xs text-ink-mute truncate">{mode === 'note' ? t(qr.text) : tIn(lang, qr.text)}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button onClick={() => toast(t('Soumission jointe en lien sécurisé'))} className="btn btn-xs btn-ghost">
            <Paperclip className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('Joindre la soumission')}</span>
          </button>
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => {
                if (text && !smsBlocked) {
                  toast(t('Programmé demain 8 h 30'))
                  setText('')
                }
              }}
              className="btn btn-xs btn-quiet"
              aria-label={t("Programmer l'envoi")}
            >
              <Clock className="w-3.5 h-3.5" />
            </button>
            <button onClick={send} disabled={smsBlocked || !text.trim()} className="btn btn-xs btn-primary">
              <Send className="w-3.5 h-3.5" />
              {mode === 'note' ? t('Ajouter') : t('Envoyer')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Back link + avatar + name + chips + actions (mockup: `U0`). */
export function RecordHeader({ back, name, chips, actions }: { back: { to: string; label: string }; name: string; chips?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="space-y-4">
      <Link to={back.to} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-mute hover:text-ink">
        <ArrowLeft className="w-4 h-4" />
        {back.label}
      </Link>
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <Avatar name={name} size="xl" />
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight truncate">{name}</h1>
            {chips && <div className="mt-1.5 flex flex-wrap items-center gap-1.5">{chips}</div>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  )
}

/** Clickable stage progress bar (mockup: `E3`). */
export function StageBar({ stages, current, onPick }: { stages: string[]; current: number; onPick?: (index: number) => void }) {
  return (
    <div className="flex rounded-lg overflow-hidden bg-white shadow-card" role="list">
      {stages.map((s, i) => {
        const past = current >= 0 && i < current
        const active = i === current
        return (
          <button
            key={s}
            role="listitem"
            onClick={() => onPick?.(i)}
            aria-current={active ? 'step' : undefined}
            className={cn(
              active ? 'flex-[3] sm:flex-1' : 'flex-1',
              'min-w-0 h-10 px-2 text-xs font-semibold flex items-center justify-center gap-1.5 border-r border-white last:border-0 transition-colors',
              active ? 'bg-primary text-white' : past ? 'bg-primary-wash text-primary-press' : 'bg-white text-ink-mute hover:bg-sand',
            )}
          >
            {past && <Check className="w-3.5 h-3.5 shrink-0" />}
            {!past && !active && <span className="sm:hidden tnum">{i + 1}</span>}
            <span className={cn('truncate', !active && 'hidden sm:inline')}>{t(s)}</span>
          </button>
        )
      })}
    </div>
  )
}

interface InfoRow {
  icon?: Icon
  label: string
  value: ReactNode
  copy?: string
}

/** Grouped definition lists with copy buttons (mockup: `V0`). */
export function InfoGroups({ groups }: { groups: { title: string; rows: InfoRow[] }[] }) {
  return (
    <section className="bg-white rounded-xl shadow-card divide-y divide-hairline">
      {groups.map((g) => (
        <div key={g.title} className="p-4">
          <p className="label-caps mb-3">{g.title}</p>
          <dl className="space-y-3">
            {g.rows.map((r) => (
              <div key={r.label} className="group flex items-start gap-2.5 min-w-0">
                {r.icon && <r.icon className="w-4 h-4 text-ink-faint mt-0.5 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <dt className="text-2xs text-ink-mute">{r.label}</dt>
                  <dd className="text-sm text-ink break-words">{r.value}</dd>
                </div>
                {r.copy && (
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(r.copy!).catch(() => {})
                      toast(t('Copié'))
                    }}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-sand"
                    aria-label={t('Copier {label}', { label: r.label })}
                  >
                    <Copy className="w-3.5 h-3.5 text-ink-mute" />
                  </button>
                )}
              </div>
            ))}
          </dl>
        </div>
      ))}
    </section>
  )
}

/** Small titled side card (mockup: `El`). */
export function SideCard({ title, action, children }: { title: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="bg-white rounded-xl shadow-card">
      <header className="px-4 pt-4 pb-2 flex items-center justify-between gap-2">
        <p className="label-caps">{title}</p>
        {action}
      </header>
      <div className="px-4 pb-4">{children}</div>
    </section>
  )
}

/**
 * Scrollable thread + composer (mockup: `Q0`). `phone` enables STOP handling and failed-text states;
 * `lang` is the client's language for drafts (French by default).
 */
export function ThreadPanel({ thread, suggestion, phone, lang }: { thread: Thread; suggestion?: string; phone?: string; lang?: Lang }) {
  const [messages, setMessages] = useState<ChatMessage[]>(thread.messages)
  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => {
    setMessages(thread.messages)
    applyStopReplies(thread.messages, phone)
  }, [thread, phone])
  const patch = (id: string, p: Partial<ChatMessage>) => setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...p } : m)))
  const send = (m: ChatMessage) => {
    setMessages((prev) => [...prev, m])
    deliver(m, phone, patch)
  }
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight
  }, [messages.length])
  return (
    <div className="bg-white rounded-xl shadow-card overflow-hidden flex flex-col">
      <div ref={scroller} className="bg-sand/60 px-4 py-5 space-y-4 h-[28rem] overflow-y-auto">
        {messages.length === 0 && (
          <Empty icon={MessageSquare} title={t('Aucun message')}>
            {t('Les textos, courriels et appels avec ce contact apparaîtront ici.')}
          </Empty>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} m={m} thread={thread} onRetry={(x) => deliver(x, phone, patch)} />
        ))}
      </div>
      <Composer thread={thread} suggestion={suggestion} phone={phone} lang={lang} onSend={send} />
    </div>
  )
}

export interface TimelineItem {
  icon: Icon
  title: ReactNode
  at: ReactNode
  meta?: ReactNode
  tone?: 'primary'
}

/** Vertical activity timeline (mockup: `Y0`). */
export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="bg-white rounded-xl shadow-card p-5">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3.5 relative pb-5 last:pb-0">
          {i < items.length - 1 && <span className="absolute left-[15px] top-9 bottom-0 w-px bg-hairline" />}
          <span className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0 relative', it.tone === 'primary' ? 'bg-primary text-white' : 'bg-sand text-ink')}>
            <it.icon className="w-3.5 h-3.5" />
          </span>
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <p className="text-sm font-semibold text-ink">{it.title}</p>
              <span className="text-2xs text-ink-mute ml-auto">{it.at}</span>
            </div>
            {it.meta && <p className="text-xs text-ink-mute mt-0.5">{it.meta}</p>}
          </div>
        </li>
      ))}
    </ol>
  )
}

interface Note {
  at: string
  by: string
  text: string
}

/** Internal notes list with add box (mockup: `X0`). */
export function Notes({ initial }: { initial: Note[] }) {
  const { user } = useAuth()
  const [notes, setNotes] = useState(initial)
  const [draft, setDraft] = useState('')
  const add = () => {
    if (!draft.trim()) return
    setNotes((n) => [{ at: t("Aujourd'hui"), by: user?.name ?? ME.name, text: draft.trim() }, ...n])
    setDraft('')
  }
  const remove = async (i: number) => {
    if (await confirmAction({ title: t('Supprimer cette note?'), body: t('La note sera retirée pour toute l’équipe.'), confirmLabel: t('Supprimer'), danger: true })) setNotes((n) => n.filter((_, j) => j !== i))
  }
  return (
    <div className="bg-white rounded-xl shadow-card p-5 space-y-4">
      <div className="flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder={t('Ajouter une note…')} className="form-input" aria-label={t('Nouvelle note')} />
        <button onClick={add} disabled={!draft.trim()} className="btn btn-md btn-primary">
          {t('Ajouter')}
        </button>
      </div>
      <ul className="space-y-3">
        {notes.map((n, i) => (
          <li key={i} className="group rounded-lg bg-sand px-3.5 py-3">
            <p className="text-2xs text-ink-mute mb-1 flex items-center gap-1">
              <span className="font-semibold text-ink-secondary">{n.by}</span> · {n.at}
              <button onClick={() => remove(i)} className="ml-auto p-1 rounded sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 hover:bg-white" aria-label={t('Supprimer la note')}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </p>
            <p className="text-sm text-ink-secondary">{n.text}</p>
          </li>
        ))}
        {notes.length === 0 && <li className="text-sm text-ink-mute">{t('Aucune note')}</li>}
      </ul>
    </div>
  )
}

/** Three-column record layout (mockup: `Z0`). */
export function RecordLayout({ left, center, right }: { left: ReactNode; center: ReactNode; right: ReactNode }) {
  return (
    <div className="grid gap-5 items-start lg:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)_19rem]">
      <aside className="space-y-5 min-w-0">{left}</aside>
      <div className="space-y-4 min-w-0">{center}</div>
      <aside className="space-y-5 min-w-0 lg:col-start-2 xl:col-start-auto">{right}</aside>
    </div>
  )
}
