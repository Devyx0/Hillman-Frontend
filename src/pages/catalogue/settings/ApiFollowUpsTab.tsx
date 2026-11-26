/**
 * Paramètres → Suivis automatiques with the backend: GET /companies/:id/follow-up-steps and PUT of the WHOLE
 * sequence (steps left out are deleted). A step = trigger (after the quote is sent / before an appointment),
 * offset in days, send time, channel, template of that channel (the company's or shared), quote status to set and
 * on/off. The master switch turns every step on or off (the API has no separate switch). The backend only stores
 * the configuration: messages are not sent yet. Same look as the local editor; the parts with no API (stop rules,
 * sending window, STOP list) stay exactly as they are, on local data.
 */
import { useEffect, useState } from 'react'
import { Ban, BellRing, Check, Clock, LoaderCircle, Mail, MessageSquare, Plus, RotateCcw, Send, Trash2, Workflow } from 'lucide-react'
import * as api from '../../../api/endpoints'
import { errorMessage } from '../../../api/http'
import { STATUS_FR } from '../../../api/mappers'
import type { ApiFollowUpStep, ApiMessageTemplate, FollowUpStepBody, FollowUpTrigger, MessageChannel } from '../../../api/types'
import { Card, Empty, Field } from '../../../components/ui'
import { Dropdown } from '../../../components/dropdown'
import { Select } from '../../../components/filters'
import { ErrorState, Notice, SkeletonRows, confirmAction } from '../../../components/states'
import { useAuth } from '../../../auth/AuthContext'
import { companyUuid, roleIn } from '../../../data/api-sync'
import { COMPANIES, type CompanyId } from '../../../data/mock'
import { FOLLOW_UP_SEQUENCES, saveFollowUpSequence, type FollowUpSequence } from '../../../data/settings'
import { useStore } from '../../../data/store'
import { toast } from '../../../lib/toast'
import { cn, formatHour } from '../../../lib/utils'
import { t } from '../../../i18n'
import { logChange } from './data'
import { renderSample } from './merge'
import { OptOutsCard } from './FollowUpsTab'
import { Toggle, useScopeCompany } from './shared'

type QuoteStatusSet = NonNullable<FollowUpStepBody['set_quote_status']>

/** A step being edited. `key` only identifies the row on screen (the API identifies a step by trigger/offset/channel). */
interface Row {
  key: string
  trigger: FollowUpTrigger
  offset_days: number
  send_time: string
  channel: MessageChannel
  template_id: string
  set_quote_status: QuoteStatusSet | null
  is_active: boolean
}

/** Parts of the local sequence with no API (stop rules, sending window): kept as they are, saved locally. */
type LocalPart = Pick<FollowUpSequence, 'stopOnReply' | 'stopOnSign' | 'stopOnRefuse' | 'sendWindow'>

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7) // 7 h → 21 h
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const MAX_STEPS = 50
const STATUSES: QuoteStatusSet[] = ['reminder_email_sent', 'to_call_back']

let seq = 0
const newKey = () => `n${Date.now().toString(36)}${seq++}`

/** The API returns the time as HH:MM:SS (Postgres time); it takes HH:MM. */
const hhmm = (s: string) => s.slice(0, 5)
const toRow = (s: ApiFollowUpStep): Row => ({
  key: s.id,
  trigger: s.trigger,
  offset_days: s.offset_days,
  send_time: hhmm(s.send_time),
  channel: s.channel,
  template_id: s.template_id,
  set_quote_status: s.set_quote_status,
  is_active: s.is_active,
})
const toBody = (r: Row): FollowUpStepBody => ({
  trigger: r.trigger,
  offset_days: r.offset_days,
  send_time: r.send_time,
  channel: r.channel,
  template_id: r.template_id,
  set_quote_status: r.set_quote_status,
  is_active: r.is_active,
})
/** Comparable form of a sequence (order and screen keys do not matter to the API). */
const signature = (rows: Row[]) =>
  JSON.stringify(
    rows
      .map(toBody)
      .sort((a, b) => a.trigger.localeCompare(b.trigger) || a.offset_days - b.offset_days || a.channel.localeCompare(b.channel)),
  )
const localPart = (s: FollowUpSequence): LocalPart => ({ stopOnReply: s.stopOnReply, stopOnSign: s.stopOnSign, stopOnRefuse: s.stopOnRefuse, sendWindow: [...s.sendWindow] as [number, number] })
const timeLabel = (hm: string) => (TIME_RE.test(hm) ? formatHour(Number(hm.slice(0, 2)) + Number(hm.slice(3, 5)) / 60) : hm)
const channelLabel = (c: MessageChannel) => (c === 'sms' ? t('Texto') : t('Courriel'))
const appointmentLabel = (offset: number) => (offset === 0 ? t('Le jour du rendez-vous') : offset === -1 ? t('La veille du rendez-vous') : t('{n} jours avant le rendez-vous', { n: -offset }))

export function ApiFollowUpsTab() {
  useStore()
  const { user } = useAuth()
  const companies = COMPANIES.filter((c) => roleIn(c.id))
  const [scope, setScope] = useScopeCompany(companies[0]?.id ?? 'sg')
  const company: CompanyId | undefined = companies.some((c) => c.id === scope) ? scope : companies[0]?.id
  const [state, setState] = useState<{ key: string; status: 'ready' | 'error'; saved: Row[]; templates: ApiMessageTemplate[]; error?: string }>({ key: '', status: 'ready', saved: [], templates: [] })
  const [rows, setRows] = useState<Row[]>([])
  const [local, setLocal] = useState<LocalPart | null>(() => (company ? localPart(FOLLOW_UP_SEQUENCES[company]) : null))
  const [attempt, setAttempt] = useState(0)
  const [open, setOpen] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const uuid = companyUuid(company)
    if (!uuid || !company) return
    let live = true
    const key = `${company}/${attempt}`
    // Inactive templates too: a step may still point to one (it is shown, but not offered for new choices).
    Promise.all([api.listFollowUpSteps(uuid), api.listMessageTemplates(uuid, { include_inactive: true })]).then(
      ([steps, templates]) => {
        if (!live) return
        const saved = steps.map(toRow)
        setState({ key, status: 'ready', saved, templates })
        setRows(saved)
      },
      (e) => live && setState({ key, status: 'error', saved: [], templates: [], error: errorMessage(e) }),
    )
    return () => {
      live = false
    }
  }, [company, attempt])

  if (!company || !local) return company ? null : <Notice tone="info">{t('Aucune compagnie accessible.')}</Notice>

  // Until the steps of the current company (and attempt) arrive, the screen shows them loading.
  const status = state.key === `${company}/${attempt}` ? state.status : 'loading'
  const isAdmin = roleIn(company) === 'admin'
  const ready = status === 'ready'
  const stepsDirty = ready && signature(rows) !== signature(state.saved)
  const localDirty = JSON.stringify(local) !== JSON.stringify(localPart(FOLLOW_UP_SEQUENCES[company]))
  const dirty = stepsDirty || localDirty
  const enabled = rows.some((r) => r.is_active)

  const templateOf = (id: string) => state.templates.find((m) => m.id === id)
  /** Templates a step may pick: active ones of its channel, plus the one it already uses. */
  const templatesFor = (channel: MessageChannel, current?: string) => state.templates.filter((m) => m.channel === channel && (m.is_active || m.id === current))
  /** Best default template for a new step: an active follow-up (or reminder) template of the channel. */
  const defaultTemplate = (channel: MessageChannel, trigger: FollowUpTrigger) => {
    const list = templatesFor(channel)
    return (list.find((m) => m.purpose === (trigger === 'appointment' ? 'appointment_reminder' : 'follow_up')) ?? list[0])?.id ?? ''
  }

  const patch = (key: string, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)))
  const addStep = (trigger: FollowUpTrigger) => {
    const same = rows.filter((r) => r.trigger === trigger)
    const offset_days = trigger === 'quote_sent' ? Math.min(90, same.reduce((m, r) => Math.max(m, r.offset_days), 0) + 7) : -1
    const channel: MessageChannel = trigger === 'quote_sent' ? 'email' : 'sms'
    setRows((rs) => [...rs, { key: newKey(), trigger, offset_days, send_time: '08:30', channel, template_id: defaultTemplate(channel, trigger), set_quote_status: null, is_active: true }])
  }
  const removeStep = async (r: Row) => {
    const when = r.trigger === 'quote_sent' ? t('{channel} au jour {n}', { channel: channelLabel(r.channel), n: r.offset_days }) : `${channelLabel(r.channel)} · ${appointmentLabel(r.offset_days)}`
    if (!(await confirmAction({ title: t('Retirer cette relance?'), body: when, confirmLabel: t('Retirer'), danger: true }))) return
    setRows((rs) => rs.filter((x) => x.key !== r.key))
  }
  const resetDefault = () =>
    setRows((rs) => [
      ...[6, 12, 20].flatMap((day) =>
        (['email', 'sms'] as const).map((channel): Row => ({ key: newKey(), trigger: 'quote_sent', offset_days: day, send_time: '08:30', channel, template_id: defaultTemplate(channel, 'quote_sent'), set_quote_status: null, is_active: true })),
      ),
      ...rs.filter((r) => r.trigger === 'appointment'),
    ])
  const setAll = (on: boolean) => {
    if (on && rows.length === 0) return toast(t('Ajoutez au moins une relance ou désactivez la séquence.'))
    setRows((rs) => rs.map((r) => ({ ...r, is_active: on })))
  }

  const switchTo = async (c: CompanyId) => {
    if (c === company) return
    if (dirty && !(await confirmAction({ title: t('Abandonner les modifications?') }))) return
    setLocal(localPart(FOLLOW_UP_SEQUENCES[c]))
    setScope(c)
  }

  // Same rules as the API (follow-ups/schema.ts and service.ts), checked before the round trip.
  const errors: string[] = []
  if (rows.length > MAX_STEPS) errors.push(t('Maximum {n} relances.', { n: MAX_STEPS }))
  if (rows.some((r) => r.trigger === 'quote_sent' && !(Number.isInteger(r.offset_days) && r.offset_days >= 1 && r.offset_days <= 90))) errors.push(t('Les jours doivent être entre 1 et 90.'))
  if (rows.some((r) => r.trigger === 'appointment' && !(Number.isInteger(r.offset_days) && r.offset_days >= -30 && r.offset_days <= 0))) errors.push(t('Un rappel de rendez-vous part entre 30 jours avant et le jour même.'))
  if (rows.some((r) => !TIME_RE.test(r.send_time))) errors.push(t('Heure attendue au format HH:MM.'))
  if (rows.some((r) => !r.template_id)) errors.push(t('Choisissez un modèle pour chaque relance.'))
  else if (rows.some((r) => templateOf(r.template_id)?.channel !== r.channel)) errors.push(t('Chaque relance doit avoir un modèle du bon canal.'))
  const keys = rows.map((r) => `${r.trigger}/${r.offset_days}/${r.channel}`)
  if (new Set(keys).size !== keys.length) errors.push(t('Deux relances partent le même jour par le même canal.'))
  if (local.sendWindow[0] >= local.sendWindow[1]) errors.push(t("L'heure de fin doit suivre l'heure de début."))

  const save = async () => {
    if (errors.length) return toast(errors[0])
    if (busy) return
    setBusy(true)
    try {
      if (stepsDirty) {
        const saved = (await api.saveFollowUpSteps(companyUuid(company)!, rows.map(toBody))).map(toRow)
        setState((s) => ({ ...s, saved }))
        setRows(saved)
      }
      if (localDirty) {
        // Stop rules and sending window have no API: saved locally, as before.
        saveFollowUpSequence(company, { ...FOLLOW_UP_SEQUENCES[company], ...local, sendWindow: [...local.sendWindow] as [number, number] })
        logChange(user?.name ?? '—', 'parametres', 'A modifié les suivis automatiques', {})
      }
      toast(t('Suivis automatiques enregistrés'))
    } catch (e) {
      toast(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  const cancel = () => {
    setRows(state.saved)
    setLocal(localPart(FOLLOW_UP_SEQUENCES[company]))
  }

  const stepList = (trigger: FollowUpTrigger) => {
    const list = rows.filter((r) => r.trigger === trigger).sort((a, b) => a.offset_days - b.offset_days || (a.channel === 'email' ? -1 : 1))
    if (list.length === 0)
      return (
        <Empty icon={trigger === 'quote_sent' ? Workflow : BellRing} title={trigger === 'quote_sent' ? t('Aucune relance') : t('Aucun rappel')}>
          {trigger === 'quote_sent' ? t('Ajoutez une étape ou revenez à la séquence par défaut.') : t('Ajoutez un rappel avant le rendez-vous.')}
        </Empty>
      )
    return (
      <ul className="divide-y divide-hairline">
        {list.map((r) => {
          const tpl = templateOf(r.template_id)
          const options = templatesFor(r.channel, r.template_id)
          return (
            <li key={r.key} className={cn('px-4 py-2.5', !r.is_active && 'opacity-60')}>
              <div className="flex flex-wrap items-center gap-2">
                {trigger === 'quote_sent' ? (
                  <label className="flex items-center gap-1.5 text-sm text-ink-secondary">
                    {t('Jour')}
                    <input className="form-input h-8 w-16 text-right tnum" inputMode="numeric" disabled={!isAdmin} value={r.offset_days} onChange={(e) => patch(r.key, { offset_days: Number(e.target.value.replace(/\D/g, '')) || 0 })} aria-label={t('Jour')} />
                  </label>
                ) : (
                  <label className="flex items-center gap-1.5 text-sm text-ink-secondary">
                    <input className="form-input h-8 w-14 text-right tnum" inputMode="numeric" disabled={!isAdmin} value={-r.offset_days} onChange={(e) => patch(r.key, { offset_days: -(Number(e.target.value.replace(/\D/g, '')) || 0) })} aria-label={t('Jours avant le rendez-vous')} />
                    {t('jour(s) avant')}
                  </label>
                )}
                <label className="flex items-center gap-1.5 text-sm text-ink-secondary">
                  {t('à')}
                  <input type="time" className="form-input h-8 w-28 tnum" disabled={!isAdmin} value={r.send_time} onChange={(e) => patch(r.key, { send_time: e.target.value.slice(0, 5) })} aria-label={t('Heure d’envoi')} />
                </label>
                <Dropdown
                  className="form-input h-8 w-32"
                  value={r.channel}
                  disabled={!isAdmin}
                  onChange={(e) => {
                    const channel = e.target.value as MessageChannel
                    patch(r.key, { channel, template_id: defaultTemplate(channel, trigger) })
                  }}
                  aria-label={t('Canal')}
                >
                  <option value="email">{t('Courriel')}</option>
                  <option value="sms">{t('Texto')}</option>
                </Dropdown>
                <span className="flex-1 min-w-[12rem]">
                  <Dropdown className="form-input h-8" value={r.template_id} disabled={!isAdmin} placeholder={t('Choisir un modèle')} onChange={(e) => patch(r.key, { template_id: e.target.value })} aria-label={t('Modèle')} aria-invalid={!tpl}>
                    {options.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.is_active ? m.name : `${m.name} (${t('inactif')})`}
                      </option>
                    ))}
                  </Dropdown>
                </span>
                <button className="btn btn-xs btn-ghost" onClick={() => setOpen(open === r.key ? null : r.key)} aria-expanded={open === r.key}>
                  {t('Aperçu')}
                </button>
                {isAdmin && (
                  <button className="p-1.5 rounded-md hover:bg-tone-critical-soft hover:text-tone-critical-ink" aria-label={t('Retirer')} onClick={() => void removeStep(r)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="mt-2 ml-1 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-secondary">
                <label className="flex items-center gap-1.5">
                  {t('Statut de la soumission après l’envoi')}
                  <Dropdown className="form-input h-8 w-56" value={r.set_quote_status ?? ''} disabled={!isAdmin} onChange={(e) => patch(r.key, { set_quote_status: (e.target.value || null) as QuoteStatusSet | null })} aria-label={t('Statut de la soumission après l’envoi')}>
                    <option value="">{t('Ne pas changer')}</option>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {t(STATUS_FR[s])}
                      </option>
                    ))}
                  </Dropdown>
                </label>
                <label className="flex items-center gap-2">
                  <Toggle on={r.is_active} disabled={!isAdmin} onChange={(is_active) => patch(r.key, { is_active })} label={t('Relance active')} />
                  {r.is_active ? t('Active') : t('Désactivée')}
                </label>
              </div>
              {open === r.key && tpl && (
                <div className="mt-2 ml-7 rounded-lg bg-sand/70 p-3 text-sm text-ink-secondary whitespace-pre-line">
                  {tpl.subject && <p className="font-semibold text-ink mb-1">{renderSample(tpl.subject, company, '')}</p>}
                  {renderSample(tpl.body, company, t('mercredi 10 h'))}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    )
  }

  const timeline = rows.filter((r) => r.trigger === 'quote_sent' && r.is_active).sort((a, b) => a.offset_days - b.offset_days)
  const days = [...new Set(timeline.map((r) => r.offset_days))]
  const reminders = rows.filter((r) => r.trigger === 'appointment' && r.is_active).sort((a, b) => a.offset_days - b.offset_days)

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-4 items-start">
      <div className="space-y-4 min-w-0">
        <div className="flex flex-wrap items-end gap-3">
          <Field label={t('Compagnie')}>
            <Dropdown className="form-input w-56" value={company} onChange={(e) => void switchTo(e.target.value as CompanyId)} aria-label={t('Compagnie')}>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Dropdown>
          </Field>
          <label className="flex items-center gap-2 text-sm font-semibold text-ink h-10">
            <Toggle on={enabled} disabled={!ready || !isAdmin} onChange={setAll} label={t('Activer les suivis automatiques')} />
            {enabled ? t('Séquence active') : t('Séquence désactivée')}
          </label>
        </div>
        <Notice tone="info">{t('Les messages ne partent pas encore : la séquence est enregistrée, l’envoi automatique sera branché plus tard.')}</Notice>
        {ready && !isAdmin && <Notice tone="info">{t('Seul un administrateur de la compagnie peut modifier les suivis automatiques.')}</Notice>}
        {status === 'loading' && (
          <Card title={t('Relances après l’envoi de la soumission')} icon={Workflow} pad={false}>
            <SkeletonRows rows={4} />
          </Card>
        )}
        {status === 'error' && (
          <Card title={t('Relances après l’envoi de la soumission')} icon={Workflow} pad={false}>
            <ErrorState onRetry={() => setAttempt((n) => n + 1)}>{state.error}</ErrorState>
          </Card>
        )}
        {ready && (
          <>
            <Card
              title={t('Relances après l’envoi de la soumission')}
              icon={Workflow}
              pad={false}
              actions={
                isAdmin && (
                  <button className="btn btn-xs btn-ghost" onClick={resetDefault} title={t('Jours 6, 12 et 20 par courriel et texto')}>
                    <RotateCcw className="w-3.5 h-3.5" />
                    {t('Par défaut (6 / 12 / 20)')}
                  </button>
                )
              }
            >
              <div className={cn(!enabled && 'opacity-50')}>
                {stepList('quote_sent')}
                {isAdmin && (
                  <div className="p-3 border-t border-hairline bg-sand/40">
                    <button className="btn btn-sm btn-secondary" onClick={() => addStep('quote_sent')}>
                      <Plus className="w-4 h-4" />
                      {t('Ajouter une relance')}
                    </button>
                  </div>
                )}
              </div>
            </Card>
            <Card title={t('Rappels de rendez-vous')} icon={BellRing} pad={false}>
              <div className={cn(!enabled && 'opacity-50')}>
                {stepList('appointment')}
                {isAdmin && (
                  <div className="p-3 border-t border-hairline bg-sand/40">
                    <button className="btn btn-sm btn-secondary" onClick={() => addStep('appointment')}>
                      <Plus className="w-4 h-4" />
                      {t('Ajouter un rappel')}
                    </button>
                  </div>
                )}
              </div>
            </Card>
          </>
        )}
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
                  <Toggle on={local[k]} onChange={(v) => setLocal((s) => (s ? { ...s, [k]: v } : s))} label={t(label)} />
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
                <Select value={String(local.sendWindow[0])} searchable={false} className="w-28" onChange={(v) => setLocal((s) => (s ? { ...s, sendWindow: [Number(v), s.sendWindow[1]] } : s))} options={HOURS.map((h) => ({ value: String(h), label: formatHour(h) }))} />
              </Field>
              <Field label={t('À')}>
                <Select value={String(local.sendWindow[1])} searchable={false} className="w-28" onChange={(v) => setLocal((s) => (s ? { ...s, sendWindow: [s.sendWindow[0], Number(v)] } : s))} options={HOURS.map((h) => ({ value: String(h), label: formatHour(h) }))} />
              </Field>
            </div>
            <p className="text-xs text-ink-mute mt-3">{t('Une relance prévue hors de la plage part au début de la plage suivante. Aucun envoi le dimanche.')}</p>
          </Card>
        </div>
        {ready && errors.length > 0 && (
          <Notice tone="critical">
            {errors.map((e) => (
              <p key={e}>{e}</p>
            ))}
          </Notice>
        )}
        <div className="flex justify-end gap-2">
          <button className="btn btn-sm btn-ghost" disabled={!dirty || busy} onClick={cancel}>
            {t('Annuler')}
          </button>
          <button className="btn btn-sm btn-primary" disabled={!dirty || busy || (stepsDirty && !isAdmin)} onClick={() => void save()}>
            {busy ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {t('Enregistrer')}
          </button>
        </div>
        <OptOutsCard />
      </div>
      <div className="space-y-4 min-w-0 xl:sticky xl:top-20">
        <Card title={t('Déroulement')} icon={Workflow}>
          <ol className={cn('space-y-3', !enabled && 'opacity-40')}>
            <li className="flex items-center gap-3 text-sm">
              <span className="w-8 h-8 rounded-full bg-ink text-white flex items-center justify-center shrink-0">
                <Send className="w-3.5 h-3.5" />
              </span>
              <span>
                <b className="text-ink">{t('Jour 0')}</b> · {t('Soumission envoyée')}
              </span>
            </li>
            {days.map((d) => {
              const at = timeline.filter((r) => r.offset_days === d)
              return (
                <li key={d} className="flex items-center gap-3 text-sm">
                  <span className="w-8 h-8 rounded-full bg-primary-wash text-primary-press flex items-center justify-center shrink-0 gap-0.5">
                    {at.some((r) => r.channel === 'email') && <Mail className="w-3 h-3" />}
                    {at.some((r) => r.channel === 'sms') && <MessageSquare className="w-3 h-3" />}
                  </span>
                  <span className="min-w-0">
                    <b className="text-ink">{t('Jour {n}', { n: d })}</b> · {at.map((r) => channelLabel(r.channel)).join(' + ')}
                    <span className="block text-2xs text-ink-mute">{[...new Set(at.map((r) => timeLabel(r.send_time)))].join(', ')}</span>
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
                {[local.stopOnReply && t('réponse'), local.stopOnSign && t('signature'), local.stopOnRefuse && t('refus'), t('STOP')].filter(Boolean).join(', ')}
              </span>
            </li>
            {reminders.map((r) => (
              <li key={r.key} className="flex items-center gap-3 text-sm">
                <span className="w-8 h-8 rounded-full bg-primary-wash text-primary-press flex items-center justify-center shrink-0">
                  <BellRing className="w-3.5 h-3.5" />
                </span>
                <span className="min-w-0">
                  <b className="text-ink">{appointmentLabel(r.offset_days)}</b> · {channelLabel(r.channel)}
                  <span className="block text-2xs text-ink-mute">{timeLabel(r.send_time)}</span>
                </span>
              </li>
            ))}
          </ol>
          {ready && !enabled && <p className="text-xs text-tone-warn-ink font-medium mt-3">{t('Aucune relance ne partira pour cette compagnie.')}</p>}
        </Card>
      </div>
    </div>
  )
}
