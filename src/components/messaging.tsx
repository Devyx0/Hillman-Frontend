import { useEffect, useState } from 'react'
import { BellRing, ChevronDown, Languages, LoaderCircle, Mail, MessageSquare, Repeat, Send, Sparkles, Zap } from 'lucide-react'
import { inLang, langName, t, type Lang } from '../i18n'
import { toast } from '../lib/toast'
import { cn } from '../lib/utils'
import { Drawer, Field, type Icon } from './ui'

export type MessageKind = 'sms' | 'email' | 'sequence' | 'reminder'

/** Context used to fill message templates. */
export interface MessageCtx {
  name?: string
  first?: string
  rep?: string
  company?: string
  quoteNo?: string
  date?: string
  /**
   * The client's language (`clientLang(client)`): templates, subjects and AI rewrites are drafted in
   * it, whatever the rep's UI language. Default French.
   */
  lang?: Lang
}

/** Language a draft is written in: the client's, French by default. */
const draftLang = (c: MessageCtx): Lang => c.lang ?? 'fr'

/** Mockup: `$d`. */
export const MESSAGE_KINDS: Record<MessageKind, { label: string; icon: Icon; hint: string }> = {
  sms: { label: 'Envoyer un texto', icon: MessageSquare, hint: 'Envoyé depuis le numéro de la compagnie' },
  email: { label: 'Envoyer un courriel', icon: Mail, hint: 'Avec la soumission en pièce jointe' },
  sequence: { label: 'Démarrer la relance automatique', icon: Repeat, hint: 'Courriel et texto à J+6, J+12 et J+20' },
  reminder: { label: 'Rappel de rendez-vous', icon: BellRing, hint: 'Texto la veille du rendez-vous' },
}

const signature = (c: MessageCtx) => `${c.rep ?? 'Jean-Pierre'}\n${c.company ?? 'Toitures Hillman'}`

/** Template variables (call-time only: `date` default goes through `t()`, so call inside `inLang`). */
const vars = (c: MessageCtx) => ({
  first: c.first ?? '',
  rep: c.rep ?? 'Jean-Pierre',
  company: c.company ?? 'Toitures Hillman',
  quoteNo: c.quoteNo ?? '',
  date: c.date ?? t('demain à 10 h'),
  signature: signature(c),
})

/**
 * Mockup: `fd`. `name` is shown in the rep's UI language; `text` and `subject` are drafts, written in
 * the client's language (`ctx.lang`) — use `draftText()` / `draftSubject()`.
 */
export const TEMPLATES: { id: string; name: string; kinds: MessageKind[]; text: (c: MessageCtx) => string; subject?: (c: MessageCtx) => string }[] = [
  { id: 'suivi-sms', name: 'Suivi de soumission', kinds: ['sms'], text: (c) => t("Bonjour {first}, c'est {rep} de {company}. Avez-vous bien reçu la soumission {quoteNo}? Je reste disponible pour vos questions.", vars(c)) },
  { id: 'dispo-sms', name: 'Proposer une visite', kinds: ['sms'], text: (c) => t('Bonjour {first}, je peux passer revoir les travaux avec vous cette semaine. Est-ce que mardi ou jeudi vous conviendrait? {rep}, {company}', vars(c)) },
  { id: 'envoi-email', name: 'Envoi de soumission', kinds: ['email'], subject: (c) => (c.quoteNo ? t('Soumission {quoteNo} — {company}', vars(c)) : t('Votre soumission — {company}', vars(c))), text: (c) => t("Bonjour {first},\n\nVoici votre soumission {quoteNo}. Vous pouvez la consulter et l'accepter en ligne avec le lien ci-dessous.\n\nMerci,\n{signature}", vars(c)) },
  { id: 'suivi-email', name: 'Suivi de soumission (courriel J+6, J+12, J+20)', kinds: ['email'], subject: (c) => (c.quoteNo ? t('Suivi de votre soumission {quoteNo}', vars(c)) : t('Suivi de votre soumission')), text: (c) => t("Bonjour {first},\n\nNous sommes très heureux de l'intérêt que vous avez porté à notre entreprise. Nous faisons un suivi sur votre dossier et aimerions savoir si vous avez des questions ou des commentaires sur la soumission {quoteNo}.\n\nPour accepter la soumission, utilisez simplement le lien ci-dessous.\n\n{signature}", vars(c)) },
  { id: 'rappel-rdv', name: 'Rappel de rendez-vous', kinds: ['reminder'], text: (c) => t('Rappel : {rep} de {company} sera chez vous {date}. Répondez C pour confirmer ou R pour reporter.', vars(c)) },
]

/** A template's message, in the client's language. */
export const draftText = (tpl: (typeof TEMPLATES)[number] | undefined, c: MessageCtx) => (tpl ? inLang(draftLang(c), () => tpl.text(c)) : '')
/** A template's email subject, in the client's language. */
export const draftSubject = (tpl: (typeof TEMPLATES)[number] | undefined, c: MessageCtx) => (tpl?.subject ? inLang(draftLang(c), () => tpl.subject!(c)) : '')

/** Stand-in for the AI rewrite the backend will provide (mockup: `N3`). Rewrites in the client's language. */
const improveWithAI = (text: string, lang: Lang) =>
  inLang(lang, () =>
    text
      .replace(t('Avez-vous bien reçu'), t("Je voulais m'assurer que vous avez bien reçu"))
      .replace(t('Je reste disponible pour vos questions.'), t("Si vous avez des questions sur les matériaux ou l'échéancier, je peux passer vous voir cette semaine."))
      .replace(t('Nous sommes très heureux'), t('Merci encore, nous sommes très heureux')),
  )

/** Matches the default sequence in `FOLLOW_UP_SEQUENCES` (client decision: J+6, J+12, J+20 by email and text). */
const SEQUENCE_STEPS: { d: string; icon: Icon; t: string; s: string }[] = [
  { d: 'J+6', icon: Mail, t: 'Courriel et texto de suivi', s: 'Modèles « Suivi de soumission », avec le lien pour accepter' },
  { d: 'J+12', icon: Mail, t: 'Courriel et texto de suivi', s: 'Modèles « Suivi de soumission », avec le lien pour accepter' },
  { d: 'J+20', icon: MessageSquare, t: 'Dernier courriel et texto de suivi', s: 'Modèles « Suivi de soumission », avec le lien pour accepter' },
]

/** Compose drawer for texto / courriel / relance / rappel (mockup: `Pi`). */
export function ComposeDrawer({ kind, ctx, onClose }: { kind: MessageKind | null; ctx: MessageCtx; onClose: () => void }) {
  const [text, setText] = useState('')
  const [subject, setSubject] = useState('')
  const [templateId, setTemplateId] = useState('')
  const lang = draftLang(ctx)
  const [improving, setImproving] = useState(false)
  const meta = kind ? MESSAGE_KINDS[kind] : null
  const templates = TEMPLATES.filter((t) => kind && t.kinds.includes(kind))

  useEffect(() => {
    if (!kind || kind === 'sequence') return
    const first = TEMPLATES.find((t) => t.kinds.includes(kind))
    setTemplateId(first?.id ?? '')
    setText(draftText(first, ctx))
    setSubject(draftSubject(first, ctx))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind])

  const close = () => {
    setText('')
    setSubject('')
    onClose()
  }
  const improve = () => {
    setImproving(true)
    window.setTimeout(() => {
      setText((prev) => improveWithAI(prev, lang))
      setImproving(false)
    }, 600)
  }

  return (
    <Drawer
      open={!!kind}
      onClose={close}
      title={
        meta ? (
          <span className="flex items-center gap-2">
            <meta.icon className="w-4 h-4" />
            {t(meta.label)}
          </span>
        ) : (
          ''
        )
      }
    >
      {kind && meta && (
        <div className="p-5 space-y-5">
          <p className="text-sm text-ink-mute">
            {t(meta.hint)}
            {ctx.name ? (
              <>
                {' · '}
                <span className="text-ink font-semibold">{ctx.name}</span>
              </>
            ) : null}
          </p>
          <p className="-mt-3 flex items-center gap-1.5 text-2xs text-ink-mute" data-client-lang={lang}>
            <Languages className="w-3.5 h-3.5" />
            {t('Langue du client : {lang}', { lang: langName(lang) })}
          </p>
          {kind === 'sequence' ? (
            <div className="rounded-lg border border-hairline divide-y divide-hairline">
              {SEQUENCE_STEPS.map((s) => (
                <div key={s.d} className="flex items-start gap-3 p-3">
                  <span className="tnum text-xs font-semibold text-primary-press bg-primary-wash rounded-md px-2 py-1 shrink-0">{t(s.d)}</span>
                  <s.icon className="w-4 h-4 text-ink-mute mt-1 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">{t(s.t)}</span>
                    <span className="block text-xs text-ink-mute">{t(s.s)}</span>
                  </span>
                </div>
              ))}
              <p className="p-3 text-xs text-ink-mute">{t("La relance s'arrête dès que le client répond, signe ou que le statut change.")}</p>
            </div>
          ) : (
            <>
              <div className="flex items-end gap-2 flex-wrap">
                <Field label={t('Modèle')} className="flex-1 min-w-[12rem]">
                  <select
                    value={templateId}
                    onChange={(e) => {
                      setTemplateId(e.target.value)
                      const tpl = TEMPLATES.find((x) => x.id === e.target.value)
                      if (tpl) {
                        setText(draftText(tpl, ctx))
                        setSubject(draftSubject(tpl, ctx))
                      }
                    }}
                    className="form-input"
                  >
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {t(tpl.name)}
                      </option>
                    ))}
                  </select>
                </Field>
                <button onClick={improve} disabled={improving} className="btn btn-sm btn-quiet">
                  <Sparkles className="w-3.5 h-3.5" />
                  {t("Améliorer avec l'IA")}
                </button>
              </div>
              {kind === 'email' && (
                <Field label={t('Objet')}>
                  <input value={subject} onChange={(e) => setSubject(e.target.value)} className="form-input" lang={lang === 'en' ? 'en-CA' : 'fr-CA'} />
                </Field>
              )}
              <Field label={t('Message')}>
                <div className="relative">
                  <textarea value={text} onChange={(e) => setText(e.target.value)} lang={lang === 'en' ? 'en-CA' : 'fr-CA'} rows={kind === 'email' ? 10 : 5} className="form-input h-auto py-2.5 leading-relaxed" />
                  {improving && (
                    <div className="absolute inset-0 bg-white/70 rounded-md flex items-center justify-center gap-2 text-sm text-ink-mute">
                      <LoaderCircle className="w-4 h-4 animate-spin" />
                      {t('Amélioration…')}
                    </div>
                  )}
                </div>
              </Field>
              {kind !== 'email' && <p className="text-2xs text-ink-mute tnum">{t('{n} caractères · consentement texto ✓', { n: text.length })}</p>}
            </>
          )}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-hairline">
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => {
                toast(t('Programmé pour demain 8 h 30'))
                close()
              }}
            >
              {t('Programmer')}
            </button>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => {
                toast(kind === 'sequence' ? t('Relance automatique démarrée') : t('Envoyé'))
                close()
              }}
            >
              <Send className="w-4 h-4" />
              {kind === 'sequence' ? t('Démarrer') : t('Envoyer')}
            </button>
          </div>
        </div>
      )}
    </Drawer>
  )
}

/** "Actions" dropdown that opens the compose drawer (mockup: `A3`). */
export function ActionsMenu({ ctx, kinds = ['sms', 'email', 'sequence'], label, variant = 'secondary', className }: { ctx: MessageCtx; kinds?: MessageKind[]; label?: string; variant?: 'primary' | 'quiet' | 'secondary'; className?: string }) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<MessageKind | null>(null)
  return (
    <div className={cn('relative', className)}>
      <button onClick={() => setOpen((o) => !o)} className={cn('btn btn-sm', variant === 'primary' ? 'btn-primary' : variant === 'quiet' ? 'btn-quiet' : 'btn-secondary')}>
        <Zap className="w-4 h-4" />
        {label ?? t('Actions')}
        <ChevronDown className="w-3.5 h-3.5 opacity-70" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 z-50 w-72 bg-white rounded-lg border border-hairline shadow-xl py-1 menu-in">
            {kinds.map((k) => {
              const m = MESSAGE_KINDS[k]
              return (
                <button
                  key={k}
                  onClick={() => {
                    setOpen(false)
                    setKind(k)
                  }}
                  className="w-full flex items-start gap-2.5 px-3 py-2 text-left hover:bg-sand"
                >
                  <m.icon className="w-4 h-4 text-ink-mute mt-0.5 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink">{t(m.label)}</span>
                    <span className="block text-2xs text-ink-mute">{t(m.hint)}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}
      <ComposeDrawer kind={kind} ctx={ctx} onClose={() => setKind(null)} />
    </div>
  )
}

/** Single button that opens the compose drawer for one kind (mockup: `Fa`). */
export function MessageButton({ kind, ctx, className, label, size = 'sm', variant = 'secondary' }: { kind: MessageKind; ctx: MessageCtx; className?: string; label?: string; size?: 'xs' | 'sm'; variant?: string }) {
  const [open, setOpen] = useState<MessageKind | null>(null)
  const m = MESSAGE_KINDS[kind]
  return (
    <>
      <button onClick={() => setOpen(kind)} className={cn('btn', size === 'xs' ? 'btn-xs' : 'btn-sm', `btn-${variant}`, className)}>
        <m.icon className="w-3.5 h-3.5" />
        {label ?? t(m.label)}
      </button>
      <ComposeDrawer kind={open} ctx={ctx} onClose={() => setOpen(null)} />
    </>
  )
}
