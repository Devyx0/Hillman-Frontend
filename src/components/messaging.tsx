import { useEffect, useState } from 'react'
import { BellRing, ChevronDown, LoaderCircle, Mail, MessageSquare, Repeat, Send, Sparkles, Zap } from 'lucide-react'
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
}

/** Mockup: `$d`. */
export const MESSAGE_KINDS: Record<MessageKind, { label: string; icon: Icon; hint: string }> = {
  sms: { label: 'Envoyer un texto', icon: MessageSquare, hint: 'Envoyé depuis le numéro de la compagnie' },
  email: { label: 'Envoyer un courriel', icon: Mail, hint: 'Avec la soumission en pièce jointe' },
  sequence: { label: 'Démarrer la relance automatique', icon: Repeat, hint: 'Texto J+2 puis courriel J+6' },
  reminder: { label: 'Rappel de rendez-vous', icon: BellRing, hint: 'Texto la veille du rendez-vous' },
}

const signature = (c: MessageCtx) => `${c.rep ?? 'Jean-Pierre'}\n${c.company ?? 'Toitures Hillman'}`

/** Mockup: `fd`. */
export const TEMPLATES: { id: string; name: string; kinds: MessageKind[]; text: (c: MessageCtx) => string }[] = [
  { id: 'suivi-sms', name: 'Suivi de soumission', kinds: ['sms'], text: (c) => `Bonjour ${c.first ?? ''}, c'est ${c.rep ?? 'Jean-Pierre'} de ${c.company ?? 'Toitures Hillman'}. Avez-vous bien reçu la soumission ${c.quoteNo ?? ''}? Je reste disponible pour vos questions.` },
  { id: 'dispo-sms', name: 'Proposer une visite', kinds: ['sms'], text: (c) => `Bonjour ${c.first ?? ''}, je peux passer revoir les travaux avec vous cette semaine. Est-ce que mardi ou jeudi vous conviendrait? ${c.rep ?? 'Jean-Pierre'}, ${c.company ?? 'Toitures Hillman'}` },
  { id: 'envoi-email', name: 'Envoi de soumission', kinds: ['email'], text: (c) => `Bonjour ${c.first ?? ''},\n\nVoici votre soumission ${c.quoteNo ?? ''}. Vous pouvez la consulter et l'accepter en ligne avec le lien ci-dessous.\n\nMerci,\n${signature(c)}` },
  { id: 'suivi-email', name: 'Suivi de soumission (courriel J+6 actuel)', kinds: ['email'], text: (c) => `Bonjour ${c.first ?? ''},\n\nNous sommes très heureux de l'intérêt que vous avez porté à notre entreprise. Nous faisons un suivi sur votre dossier et aimerions savoir si vous avez des questions ou des commentaires sur la soumission ${c.quoteNo ?? ''}.\n\nPour accepter la soumission, utilisez simplement le lien ci-dessous.\n\n${signature(c)}` },
  { id: 'rappel-rdv', name: 'Rappel de rendez-vous', kinds: ['reminder'], text: (c) => `Rappel : ${c.rep ?? 'Jean-Pierre'} de ${c.company ?? 'Toitures Hillman'} sera chez vous ${c.date ?? 'demain à 10 h'}. Répondez C pour confirmer ou R pour reporter.` },
]

/** Stand-in for the AI rewrite the backend will provide (mockup: `N3`). */
function improveWithAI(text: string) {
  return text
    .replace('Avez-vous bien reçu', "Je voulais m'assurer que vous avez bien reçu")
    .replace('Je reste disponible pour vos questions.', "Si vous avez des questions sur les matériaux ou l'échéancier, je peux passer vous voir cette semaine.")
    .replace('Nous sommes très heureux', 'Merci encore, nous sommes très heureux')
}

const SEQUENCE_STEPS: { d: string; icon: Icon; t: string; s: string }[] = [
  { d: 'J+2', icon: MessageSquare, t: 'Texto de suivi du représentant', s: 'Modèle « Suivi de soumission »' },
  { d: 'J+6', icon: Mail, t: 'Courriel de suivi', s: 'Le texte que vous envoyez déjà, avec le lien pour accepter' },
]

/** Compose drawer for texto / courriel / relance / rappel (mockup: `Pi`). */
export function ComposeDrawer({ kind, ctx, onClose }: { kind: MessageKind | null; ctx: MessageCtx; onClose: () => void }) {
  const [text, setText] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [improving, setImproving] = useState(false)
  const meta = kind ? MESSAGE_KINDS[kind] : null
  const templates = TEMPLATES.filter((t) => kind && t.kinds.includes(kind))

  useEffect(() => {
    if (!kind || kind === 'sequence') return
    const first = TEMPLATES.find((t) => t.kinds.includes(kind))
    setTemplateId(first?.id ?? '')
    setText(first?.text(ctx) ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind])

  const close = () => {
    setText('')
    onClose()
  }
  const improve = () => {
    setImproving(true)
    window.setTimeout(() => {
      setText((t) => improveWithAI(t))
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
            {meta.label}
          </span>
        ) : (
          ''
        )
      }
    >
      {kind && meta && (
        <div className="p-5 space-y-5">
          <p className="text-sm text-ink-mute">
            {meta.hint}
            {ctx.name ? (
              <>
                {' · '}
                <span className="text-ink font-semibold">{ctx.name}</span>
              </>
            ) : null}
          </p>
          {kind === 'sequence' ? (
            <div className="rounded-lg border border-hairline divide-y divide-hairline">
              {SEQUENCE_STEPS.map((s) => (
                <div key={s.d} className="flex items-start gap-3 p-3">
                  <span className="tnum text-xs font-semibold text-primary-press bg-primary-wash rounded-md px-2 py-1 shrink-0">{s.d}</span>
                  <s.icon className="w-4 h-4 text-ink-mute mt-1 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">{s.t}</span>
                    <span className="block text-xs text-ink-mute">{s.s}</span>
                  </span>
                </div>
              ))}
              <p className="p-3 text-xs text-ink-mute">La relance s'arrête dès que le client répond, signe ou que le statut change.</p>
            </div>
          ) : (
            <>
              <div className="flex items-end gap-2 flex-wrap">
                <Field label="Modèle" className="flex-1 min-w-[12rem]">
                  <select
                    value={templateId}
                    onChange={(e) => {
                      setTemplateId(e.target.value)
                      const t = TEMPLATES.find((x) => x.id === e.target.value)
                      if (t) setText(t.text(ctx))
                    }}
                    className="form-input"
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <button onClick={improve} disabled={improving} className="btn btn-sm btn-quiet">
                  <Sparkles className="w-3.5 h-3.5" />
                  Améliorer avec l'IA
                </button>
              </div>
              <Field label="Message">
                <div className="relative">
                  <textarea value={text} onChange={(e) => setText(e.target.value)} rows={kind === 'email' ? 10 : 5} className="form-input h-auto py-2.5 leading-relaxed" />
                  {improving && (
                    <div className="absolute inset-0 bg-white/70 rounded-md flex items-center justify-center gap-2 text-sm text-ink-mute">
                      <LoaderCircle className="w-4 h-4 animate-spin" />
                      Amélioration…
                    </div>
                  )}
                </div>
              </Field>
              {kind !== 'email' && <p className="text-2xs text-ink-mute tnum">{text.length} caractères · consentement texto ✓</p>}
            </>
          )}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-hairline">
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => {
                toast('Programmé pour demain 8 h 30')
                close()
              }}
            >
              Programmer
            </button>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => {
                toast(kind === 'sequence' ? 'Relance automatique démarrée' : 'Envoyé')
                close()
              }}
            >
              <Send className="w-4 h-4" />
              {kind === 'sequence' ? 'Démarrer' : 'Envoyer'}
            </button>
          </div>
        </div>
      )}
    </Drawer>
  )
}

/** "Actions" dropdown that opens the compose drawer (mockup: `A3`). */
export function ActionsMenu({ ctx, kinds = ['sms', 'email', 'sequence'], label = 'Actions', variant = 'secondary', className }: { ctx: MessageCtx; kinds?: MessageKind[]; label?: string; variant?: 'primary' | 'quiet' | 'secondary'; className?: string }) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<MessageKind | null>(null)
  return (
    <div className={cn('relative', className)}>
      <button onClick={() => setOpen((o) => !o)} className={cn('btn btn-sm', variant === 'primary' ? 'btn-primary' : variant === 'quiet' ? 'btn-quiet' : 'btn-secondary')}>
        <Zap className="w-4 h-4" />
        {label}
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
                    <span className="block text-sm font-medium text-ink">{m.label}</span>
                    <span className="block text-2xs text-ink-mute">{m.hint}</span>
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
        {label ?? m.label}
      </button>
      <ComposeDrawer kind={open} ctx={ctx} onClose={() => setOpen(null)} />
    </>
  )
}
