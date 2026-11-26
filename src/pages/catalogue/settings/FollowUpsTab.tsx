/** Paramètres → Suivis automatiques (PDF item 4): per-company follow-up sequence editor. */
import { useState } from 'react'
import { API_MODE } from '../../../api/config'
import { ApiFollowUpsTab } from './ApiFollowUpsTab'
import { ArrowDown, ArrowUp, Ban, Check, Clock, Mail, MessageSquare, Plus, RotateCcw, Send, ShieldOff, Trash2, Workflow } from 'lucide-react'
import { Card, Empty, Field } from '../../../components/ui'
import { Select } from '../../../components/filters'
import { Notice, confirmAction } from '../../../components/states'
import { useAuth } from '../../../auth/AuthContext'
import { CLIENTS, type CompanyId } from '../../../data/mock'
import { FOLLOW_UP_SEQUENCES, MESSAGE_TEMPLATES, SMS_OPT_OUTS, optOut, saveFollowUpSequence, unOptOut, type FollowUpSequence, type FollowUpStep } from '../../../data/settings'
import { useStore } from '../../../data/store'
import { toast } from '../../../lib/toast'
import { cn, formatHour } from '../../../lib/utils'
import { t } from '../../../i18n'
import { logChange } from './data'
import { renderSample } from './merge'
import { CompanySelect, Toggle, useScopeCompany } from './shared'

const clone = (s: FollowUpSequence): FollowUpSequence => ({ ...s, steps: s.steps.map((x) => ({ ...x })), sendWindow: [...s.sendWindow] as [number, number] })
const defaultSteps = (): FollowUpStep[] =>
  [6, 12, 20].flatMap((day, i) => [
    { id: `d${i}e`, day, channel: 'email' as const, templateId: 'suivi-email' },
    { id: `d${i}s`, day, channel: 'sms' as const, templateId: 'suivi-sms' },
  ])
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7) // 7 h → 21 h

const formatPhone = (d: string) => (d.length === 10 ? `${d.slice(0, 3)} ${d.slice(3, 6)}-${d.slice(6)}` : d)

export function FollowUpsTab() {
  // With the backend: the company's follow-up steps from the server (the STOP list stays local).
  if (API_MODE) return <ApiFollowUpsTab />
  return <MockFollowUpsTab />
}

function MockFollowUpsTab() {
  useStore()
  const { user } = useAuth()
  const [company, setCompany] = useScopeCompany('sg')
  const [seq, setSeq] = useState<FollowUpSequence>(() => clone(FOLLOW_UP_SEQUENCES[company]))
  const [open, setOpen] = useState<string | null>(null)
  const dirty = JSON.stringify(seq) !== JSON.stringify(FOLLOW_UP_SEQUENCES[company])

  const templatesFor = (channel: FollowUpStep['channel']) => MESSAGE_TEMPLATES.filter((m) => m.channel === channel && (m.company === 'all' || m.company === company))
  const patchStep = (id: string, p: Partial<FollowUpStep>) => setSeq((s) => ({ ...s, steps: s.steps.map((x) => (x.id === id ? { ...x, ...p } : x)) }))
  const move = (i: number, dir: number) =>
    setSeq((s) => {
      const j = i + dir
      if (j < 0 || j >= s.steps.length) return s
      const steps = [...s.steps]
      ;[steps[i], steps[j]] = [steps[j], steps[i]]
      return { ...s, steps }
    })
  const addStep = () => {
    const last = seq.steps.reduce((m, x) => Math.max(m, x.day), 0)
    const tpl = templatesFor('email')[0]
    setSeq((s) => ({ ...s, steps: [...s.steps, { id: 'f' + Date.now(), day: last + 7, channel: 'email', templateId: tpl?.id ?? '' }] }))
  }
  const removeStep = async (st: FollowUpStep) => {
    if (!(await confirmAction({ title: t('Retirer cette relance?'), body: t('{channel} au jour {n}', { channel: st.channel === 'sms' ? t('Texto') : t('Courriel'), n: st.day }), confirmLabel: t('Retirer'), danger: true }))) return
    setSeq((s) => ({ ...s, steps: s.steps.filter((x) => x.id !== st.id) }))
  }

  const switchTo = async (c: CompanyId) => {
    if (dirty && !(await confirmAction({ title: t('Abandonner les modifications?') }))) return
    setCompany(c)
    setSeq(clone(FOLLOW_UP_SEQUENCES[c]))
  }

  const errors: string[] = []
  if (seq.enabled && seq.steps.length === 0) errors.push(t('Ajoutez au moins une relance ou désactivez la séquence.'))
  if (seq.steps.some((s) => !(s.day >= 1 && s.day <= 90))) errors.push(t('Les jours doivent être entre 1 et 90.'))
  if (seq.steps.some((s) => !MESSAGE_TEMPLATES.some((m) => m.id === s.templateId && m.channel === s.channel))) errors.push(t('Chaque relance doit avoir un modèle du bon canal.'))
  if (seq.sendWindow[0] >= seq.sendWindow[1]) errors.push(t("L'heure de fin doit suivre l'heure de début."))

  const save = () => {
    if (errors.length) return toast(errors[0])
    const sorted = { ...seq, steps: [...seq.steps].sort((a, b) => a.day - b.day || (a.channel === 'email' ? -1 : 1)) }
    saveFollowUpSequence(company, sorted)
    setSeq(clone(sorted))
    logChange(user?.name ?? '—', 'parametres', 'A modifié les suivis automatiques', {})
    toast(t('Suivis automatiques enregistrés'))
  }

  const timeline = [...seq.steps].sort((a, b) => a.day - b.day)
  const days = [...new Set(timeline.map((s) => s.day))]

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-4 items-start">
      <div className="space-y-4 min-w-0">
        <div className="flex flex-wrap items-end gap-3">
          <Field label={t('Compagnie')}>
            <CompanySelect value={company} onChange={switchTo} />
          </Field>
          <label className="flex items-center gap-2 text-sm font-semibold text-ink h-10">
            <Toggle on={seq.enabled} onChange={(enabled) => setSeq((s) => ({ ...s, enabled }))} label={t('Activer les suivis automatiques')} />
            {seq.enabled ? t('Séquence active') : t('Séquence désactivée')}
          </label>
        </div>
        <Card
          title={t('Relances après l’envoi de la soumission')}
          icon={Workflow}
          pad={false}
          actions={
            <button className="btn btn-xs btn-ghost" onClick={() => setSeq((s) => ({ ...s, steps: defaultSteps() }))} title={t('Jours 6, 12 et 20 par courriel et texto')}>
              <RotateCcw className="w-3.5 h-3.5" />
              {t('Par défaut (6 / 12 / 20)')}
            </button>
          }
        >
          <div className={cn(!seq.enabled && 'opacity-50')}>
            {seq.steps.length === 0 ? (
              <Empty icon={Workflow} title={t('Aucune relance')}>
                {t('Ajoutez une étape ou revenez à la séquence par défaut.')}
              </Empty>
            ) : (
              <ul className="divide-y divide-hairline">
                {seq.steps.map((st, i) => {
                  const tpl = MESSAGE_TEMPLATES.find((m) => m.id === st.templateId)
                  return (
                    <li key={st.id} className="px-4 py-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex flex-col">
                          <button aria-label={t('Monter')} disabled={i === 0} onClick={() => move(i, -1)} className="p-0.5 rounded hover:bg-stone disabled:opacity-30">
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button aria-label={t('Descendre')} disabled={i === seq.steps.length - 1} onClick={() => move(i, 1)} className="p-0.5 rounded hover:bg-stone disabled:opacity-30">
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </span>
                        <label className="flex items-center gap-1.5 text-sm text-ink-secondary">
                          {t('Jour')}
                          <input className="form-input h-8 w-16 text-right tnum" inputMode="numeric" value={st.day} onChange={(e) => patchStep(st.id, { day: Number(e.target.value.replace(/\D/g, '')) || 0 })} aria-label={t('Jour')} />
                        </label>
                        <Select<FollowUpStep['channel']>
                          value={st.channel}
                          searchable={false}
                          className="w-32"
                          onChange={(channel) => patchStep(st.id, { channel, templateId: templatesFor(channel)[0]?.id ?? '' })}
                          options={[
                            { value: 'email', label: t('Courriel') },
                            { value: 'sms', label: t('Texto') },
                          ]}
                        />
                        <Select value={st.templateId} className="flex-1 min-w-[12rem]" onChange={(templateId) => patchStep(st.id, { templateId })} options={templatesFor(st.channel).map((m) => ({ value: m.id, label: t(m.name) }))} />
                        <button className="btn btn-xs btn-ghost" onClick={() => setOpen(open === st.id ? null : st.id)} aria-expanded={open === st.id}>
                          {t('Aperçu')}
                        </button>
                        <button className="p-1.5 rounded-md hover:bg-tone-critical-soft hover:text-tone-critical-ink" aria-label={t('Retirer')} onClick={() => removeStep(st)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {open === st.id && tpl && (
                        <div className="mt-2 ml-7 rounded-lg bg-sand/70 p-3 text-sm text-ink-secondary whitespace-pre-line">
                          {tpl.subject && <p className="font-semibold text-ink mb-1">{renderSample(t(tpl.subject), company, '')}</p>}
                          {renderSample(t(tpl.body), company, t('mercredi 10 h'))}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
            <div className="p-3 border-t border-hairline bg-sand/40">
              <button className="btn btn-sm btn-secondary" onClick={addStep}>
                <Plus className="w-4 h-4" />
                {t('Ajouter une relance')}
              </button>
            </div>
          </div>
        </Card>
        <div className="grid md:grid-cols-2 gap-4">
          <Card title={t("Règles d'arrêt")} icon={Ban}>
            <ul className="space-y-3 text-sm text-ink-secondary">
              {(
                [
                  ['stopOnReply', 'Le client répond (texto ou courriel)'],
                  ['stopOnSign', 'La soumission est signée'],
                  ['stopOnRefuse', 'La soumission est refusée'],
                ] as const
              ).map(([k, label]) => (
                <li key={k} className="flex items-center justify-between gap-3">
                  {t(label)}
                  <Toggle on={seq[k]} onChange={(v) => setSeq((s) => ({ ...s, [k]: v }))} label={t(label)} />
                </li>
              ))}
              <li className="flex items-center justify-between gap-3 text-ink-mute">
                {t('Le client répond STOP (textos)')}
                <span className="text-2xs font-semibold uppercase">{t('Toujours')}</span>
              </li>
            </ul>
            <p className="text-2xs text-ink-mute mt-3">{t('Un représentant peut aussi mettre les relances en pause sur une soumission.')}</p>
          </Card>
          <Card title={t("Plage d'envoi")} icon={Clock}>
            <div className="flex items-end gap-2">
              <Field label={t('De')}>
                <Select value={String(seq.sendWindow[0])} searchable={false} className="w-28" onChange={(v) => setSeq((s) => ({ ...s, sendWindow: [Number(v), s.sendWindow[1]] }))} options={HOURS.map((h) => ({ value: String(h), label: formatHour(h) }))} />
              </Field>
              <Field label={t('À')}>
                <Select value={String(seq.sendWindow[1])} searchable={false} className="w-28" onChange={(v) => setSeq((s) => ({ ...s, sendWindow: [s.sendWindow[0], Number(v)] }))} options={HOURS.map((h) => ({ value: String(h), label: formatHour(h) }))} />
              </Field>
            </div>
            <p className="text-xs text-ink-mute mt-3">{t('Une relance prévue hors de la plage part au début de la plage suivante. Aucun envoi le dimanche.')}</p>
          </Card>
        </div>
        {errors.length > 0 && (
          <Notice tone="critical">
            {errors.map((e) => (
              <p key={e}>{e}</p>
            ))}
          </Notice>
        )}
        <div className="flex justify-end gap-2">
          <button className="btn btn-sm btn-ghost" disabled={!dirty} onClick={() => setSeq(clone(FOLLOW_UP_SEQUENCES[company]))}>
            {t('Annuler')}
          </button>
          <button className="btn btn-sm btn-primary" disabled={!dirty} onClick={save}>
            <Check className="w-4 h-4" />
            {t('Enregistrer')}
          </button>
        </div>
        <OptOutsCard />
      </div>
      <div className="space-y-4 min-w-0 xl:sticky xl:top-20">
        <Card title={t('Déroulement')} icon={Workflow}>
          <ol className={cn('space-y-3', !seq.enabled && 'opacity-40')}>
            <li className="flex items-center gap-3 text-sm">
              <span className="w-8 h-8 rounded-full bg-ink text-white flex items-center justify-center shrink-0">
                <Send className="w-3.5 h-3.5" />
              </span>
              <span>
                <b className="text-ink">{t('Jour 0')}</b> · {t('Soumission envoyée')}
              </span>
            </li>
            {days.map((d) => {
              const at = timeline.filter((s) => s.day === d)
              return (
                <li key={d} className="flex items-center gap-3 text-sm">
                  <span className="w-8 h-8 rounded-full bg-primary-wash text-primary-press flex items-center justify-center shrink-0 gap-0.5">
                    {at.some((s) => s.channel === 'email') && <Mail className="w-3 h-3" />}
                    {at.some((s) => s.channel === 'sms') && <MessageSquare className="w-3 h-3" />}
                  </span>
                  <span className="min-w-0">
                    <b className="text-ink">{t('Jour {n}', { n: d })}</b> · {at.map((s) => (s.channel === 'sms' ? t('Texto') : t('Courriel'))).join(' + ')}
                    <span className="block text-2xs text-ink-mute">{t('entre {a} et {b}', { a: formatHour(seq.sendWindow[0]), b: formatHour(seq.sendWindow[1]) })}</span>
                  </span>
                </li>
              )
            })}
            <li className="flex items-start gap-3 text-sm text-ink-mute">
              <span className="w-8 h-8 rounded-full bg-sand flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5" />
              </span>
              <span>
                {t('Arrêt automatique si :')}{' '}
                {[seq.stopOnReply && t('réponse'), seq.stopOnSign && t('signature'), seq.stopOnRefuse && t('refus'), t('STOP')].filter(Boolean).join(', ')}
              </span>
            </li>
          </ol>
          {!seq.enabled && <p className="text-xs text-tone-warn-ink font-medium mt-3">{t('Aucune relance ne partira pour cette compagnie.')}</p>}
        </Card>
      </div>
    </div>
  )
}

// ── STOP / opt-out ──────────────────────────────────────────────────────────
export function OptOutsCard() {
  useStore()
  const { user } = useAuth()
  const [phone, setPhone] = useState('')
  const list = [...SMS_OPT_OUTS]
  const who = (d: string) => CLIENTS.find((c) => [c.phone, c.mobile].some((p) => (p ?? '').replace(/\D/g, '') === d))
  const add = () => {
    const d = phone.replace(/\D/g, '')
    if (d.length !== 10) return toast(t('Numéro invalide (10 chiffres)'))
    optOut(d)
    logChange(user?.name ?? '—', 'parametres', 'A ajouté {n} à la liste STOP', { n: formatPhone(d) })
    setPhone('')
  }
  const remove = async (d: string) => {
    const ok = await confirmAction({
      title: t('Réabonner le {n}?', { n: formatPhone(d) }),
      body: t('Faites-le seulement si le client a redonné son consentement par écrit (ex. il a répondu START). Sinon, lui écrire contrevient à la Loi 25 et aux règles du CRTC.'),
      confirmLabel: t('Réabonner'),
      danger: true,
    })
    if (!ok) return
    unOptOut(d)
    logChange(user?.name ?? '—', 'parametres', 'A retiré {n} de la liste STOP', { n: formatPhone(d) })
  }
  return (
    <Card title={t('Désabonnements (STOP)')} icon={ShieldOff} pad={false}>
      <div className="px-5 py-3 text-xs text-ink-mute space-y-1">
        <p>{t('Chaque texto se termine par « Répondez STOP pour ne plus recevoir de textos ». Quand un client répond STOP (ou ARRÊT), son numéro est ajouté ici et plus aucun texto automatique ou manuel ne lui est envoyé, pour toutes les compagnies. Les courriels continuent, avec un lien de désabonnement.')}</p>
      </div>
      {list.length === 0 ? (
        <Empty icon={ShieldOff} title={t('Aucun numéro désabonné')} />
      ) : (
        <ul className="divide-y divide-hairline border-t border-hairline">
          {list.map((d) => {
            const c = who(d)
            return (
              <li key={d} className="flex items-center gap-3 px-4 py-2 text-sm">
                <span className="tnum font-semibold text-ink">{formatPhone(d)}</span>
                <span className="text-ink-mute flex-1 truncate">{c ? `${c.first} ${c.last}` : t('Numéro inconnu')}</span>
                <button className="btn btn-xs btn-ghost" onClick={() => remove(d)}>
                  {t('Réabonner')}
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <form
        className="flex gap-2 p-3 border-t border-hairline bg-sand/40"
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
      >
        <input className="form-input tnum" placeholder={t('Ajouter un numéro à la main')} value={phone} onChange={(e) => setPhone(e.target.value)} aria-label={t('Numéro à désabonner')} />
        <button className="btn btn-md btn-secondary" disabled={!phone.trim()}>
          <Plus className="w-4 h-4" />
          {t('Ajouter')}
        </button>
      </form>
    </Card>
  )
}
