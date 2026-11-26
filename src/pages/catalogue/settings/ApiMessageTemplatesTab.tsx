/**
 * Paramètres → Modèles de messages with the backend: GET /companies/:id/message-templates (the company's and the
 * shared ones, inactive included), POST /companies/:id/message-templates, PATCH and DELETE /message-templates/:id.
 * Same look as the local editor. The company's admin edits its templates; a shared one (company_id null) needs an
 * admin of every company; everyone else reads. The channel is chosen at creation only. Deleting a template used by
 * the automatic follow-ups is refused by the server (409 IN_USE) and its message is shown.
 */
import { useEffect, useRef, useState } from 'react'
import { Copy, FileText, LoaderCircle, Mail, MessageSquare, Plus, Trash2 } from 'lucide-react'
import * as api from '../../../api/endpoints'
import { ApiError, errorMessage } from '../../../api/http'
import type { ApiMessageTemplate, MessageChannel, MessagePurpose } from '../../../api/types'
import { Badge, Card, Empty, Field } from '../../../components/ui'
import { Dropdown } from '../../../components/dropdown'
import { ErrorState, Notice, SkeletonRows, confirmAction } from '../../../components/states'
import { REF, companyUuid, roleIn } from '../../../data/api-sync'
import { COMPANIES, type CompanyId } from '../../../data/mock'
import { toast } from '../../../lib/toast'
import { cn } from '../../../lib/utils'
import { t } from '../../../i18n'
import { MERGE_FIELDS, MERGE_LABELS, renderSample, smsSegments } from './merge'
import { Toggle, useScopeCompany } from './shared'

const PURPOSES: [MessagePurpose, string][] = [
  ['quote_delivery', 'Envoi de soumission'],
  ['follow_up', 'Suivi de soumission'],
  ['appointment_reminder', 'Rappel de rendez-vous'],
  ['general', 'Général'],
]
const purposeLabel = (p: MessagePurpose) => t(PURPOSES.find(([k]) => k === p)?.[1] ?? p)

/** Same limits as the API (message-templates/schema.ts). */
const MAX_NAME = 120
const MAX_SUBJECT = 300
const MAX_BODY = 5000
/** What the API reads as a merge field: one word of lowercase letters (accents included) or underscores. */
const FIELD_RE = /\{([\p{Ll}_]+)\}/gu

/** First merge field the API would refuse, as « {x} »; undefined when all are known. */
function unknownMergeField(...texts: (string | null | undefined)[]) {
  for (const text of texts) {
    for (const m of (text ?? '').matchAll(FIELD_RE)) {
      if (!(MERGE_FIELDS as readonly string[]).includes(m[1])) return `{${m[1]}}`
    }
  }
  return undefined
}

/** The API's « Champ inconnu : {x} » carries the field: translate it with the field kept. */
function templateError(e: unknown) {
  if (e instanceof ApiError) {
    const m = /^Champ inconnu : (.+)$/.exec(e.message)
    if (m) return t('Champ inconnu : {f}', { f: m[1] })
  }
  return errorMessage(e)
}

/** Admin of every company of the group: may edit the shared templates. */
const isGroupAdmin = () => REF.companies.length > 0 && REF.companies.every((c) => roleIn(c.slug) === 'admin')

interface Draft {
  /** null = not saved yet. */
  id: string | null
  name: string
  channel: MessageChannel
  purpose: MessagePurpose
  subject: string
  body: string
  is_active: boolean
}

const toDraft = (m: ApiMessageTemplate): Draft => ({ id: m.id, name: m.name, channel: m.channel, purpose: m.purpose, subject: m.subject ?? '', body: m.body, is_active: m.is_active })

export function ApiMessageTemplatesTab() {
  const companies = COMPANIES.filter((c) => roleIn(c.id))
  const [scope, setScope] = useScopeCompany(companies[0]?.id ?? 'toit')
  const company: CompanyId | undefined = companies.some((c) => c.id === scope) ? scope : companies[0]?.id
  const [state, setState] = useState<{ key: string; status: 'ready' | 'error'; items: ApiMessageTemplate[]; error?: string }>({ key: '', status: 'ready', items: [] })
  const [attempt, setAttempt] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [filter, setFilter] = useState<'all' | 'sms' | 'email'>('all')
  const [busy, setBusy] = useState(false)
  const body = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const uuid = companyUuid(company)
    if (!uuid) return
    let live = true
    const key = `${company}/${attempt}`
    api.listMessageTemplates(uuid, { include_inactive: true }).then(
      (items) => {
        if (!live) return
        setState({ key, status: 'ready', items })
        setSelected(items[0]?.id ?? null)
        setDraft(items[0] ? toDraft(items[0]) : null)
      },
      (e) => live && setState({ key, status: 'error', items: [], error: errorMessage(e) }),
    )
    return () => {
      live = false
    }
  }, [company, attempt])

  if (!company) return <Notice tone="info">{t('Aucune compagnie accessible.')}</Notice>

  // Until the list of the current company (and attempt) arrives, the screen shows it loading.
  const status = state.key === `${company}/${attempt}` ? state.status : 'loading'
  const isAdmin = roleIn(company) === 'admin'
  const original = state.items.find((m) => m.id === selected)
  const canEdit = (m: ApiMessageTemplate | undefined) => (m ? (m.company_id === null ? isGroupAdmin() : isAdmin) : isAdmin)
  const editable = canEdit(original)
  const dirty = !!draft && (!original || JSON.stringify(draft) !== JSON.stringify(toDraft(original)))
  const list = state.items.filter((m) => filter === 'all' || m.channel === filter)
  const companyName = COMPANIES.find((c) => c.id === company)?.name ?? ''

  const discard = async () => !dirty || (await confirmAction({ title: t('Abandonner les modifications?') }))

  const switchTo = async (c: CompanyId) => {
    if (c === company || !(await discard())) return
    setScope(c)
  }
  const open = async (m: ApiMessageTemplate) => {
    if (m.id === selected || !(await discard())) return
    setSelected(m.id)
    setDraft(toDraft(m))
  }
  const create = async (base?: ApiMessageTemplate) => {
    if (!(await discard())) return
    const d: Draft = base
      ? { ...toDraft(base), id: null, name: t('{name} (copie)', { name: base.name }).slice(0, MAX_NAME) }
      : { id: null, name: t('Nouveau modèle'), channel: 'sms', purpose: 'general', subject: '', body: t('Bonjour {prénom}, '), is_active: true }
    setSelected(null)
    setDraft(d)
  }

  /** Same checks as the API, so the user gets the message before the round trip. */
  const check = (d: Draft): string | null => {
    const name = d.name.trim()
    const subject = d.subject.trim()
    const text = d.body.trim()
    if (!name) return t('Donnez un nom au modèle')
    if (name.length > MAX_NAME) return t('Le nom : maximum {n} caractères.', { n: MAX_NAME })
    if (!text) return t('Le message est vide')
    if (text.length > MAX_BODY) return t('Le message : maximum {n} caractères.', { n: MAX_BODY })
    if (d.channel === 'email') {
      if (!subject) return t("L'objet du courriel est requis")
      if (subject.length > MAX_SUBJECT) return t('L’objet : maximum {n} caractères.', { n: MAX_SUBJECT })
    }
    const unknown = unknownMergeField(d.body, d.channel === 'email' ? d.subject : null)
    if (unknown) return t('Champ inconnu : {f}', { f: unknown })
    return null
  }

  const save = async () => {
    if (!draft || busy) return
    const error = check(draft)
    if (error) return toast(error)
    const content = {
      name: draft.name.trim(),
      purpose: draft.purpose,
      subject: draft.channel === 'email' ? draft.subject.trim() : null,
      body: draft.body.trim(),
      is_active: draft.is_active,
    }
    setBusy(true)
    try {
      const saved = draft.id ? await api.updateMessageTemplate(draft.id, content) : await api.createMessageTemplate(companyUuid(company)!, { ...content, channel: draft.channel })
      setState((s) => ({ ...s, items: s.items.some((x) => x.id === saved.id) ? s.items.map((x) => (x.id === saved.id ? saved : x)) : [...s.items, saved] }))
      setSelected(saved.id)
      setDraft(toDraft(saved))
      toast(t('Modèle enregistré'))
    } catch (e) {
      toast(templateError(e))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!original) {
      // Unsaved draft: just drop it.
      const first = state.items[0]
      setSelected(first?.id ?? null)
      setDraft(first ? toDraft(first) : null)
      return
    }
    if (!(await confirmAction({ title: t('Supprimer le modèle « {name} »?', { name: original.name }), body: t('Cette action est définitive.'), confirmLabel: t('Supprimer'), danger: true }))) return
    setBusy(true)
    try {
      await api.deleteMessageTemplate(original.id)
      const rest = state.items.filter((x) => x.id !== original.id)
      setState((s) => ({ ...s, items: rest }))
      setSelected(rest[0]?.id ?? null)
      setDraft(rest[0] ? toDraft(rest[0]) : null)
      toast(t('Modèle supprimé'))
    } catch (e) {
      toast(templateError(e))
    } finally {
      setBusy(false)
    }
  }

  const insert = (field: string) => {
    if (!draft) return
    const el = body.current
    const token = `{${field}}`
    const start = el?.selectionStart ?? draft.body.length
    const end = el?.selectionEnd ?? draft.body.length
    const next = draft.body.slice(0, start) + token + draft.body.slice(end)
    setDraft({ ...draft, body: next })
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + token.length, start + token.length)
    })
  }

  const preview = draft ? renderSample(draft.body, company, t('mercredi 21 octobre à 10 h')) : ''
  const sms = draft?.channel === 'sms' ? smsSegments(preview) : null
  const shared = !!original && original.company_id === null

  return (
    <div className="grid lg:grid-cols-[280px_minmax(0,1fr)] gap-4 items-start">
      <Card
        title={t('Modèles')}
        icon={FileText}
        pad={false}
        actions={
          isAdmin && (
            <button className="btn btn-xs btn-primary" onClick={() => create()} disabled={status !== 'ready'}>
              <Plus className="w-3.5 h-3.5" />
              {t('Nouveau')}
            </button>
          )
        }
      >
        {companies.length > 1 && (
          <div className="p-2 border-b border-hairline">
            <Dropdown className="form-input h-8 text-xs" value={company} onChange={(e) => void switchTo(e.target.value as CompanyId)} aria-label={t('Compagnie')}>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Dropdown>
          </div>
        )}
        <div className="flex gap-1 p-2 border-b border-hairline">
          {(['all', 'sms', 'email'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={cn('flex-1 h-7 rounded-md text-xs font-semibold', filter === f ? 'bg-ink text-white' : 'text-ink-mute hover:bg-sand')}>
              {f === 'all' ? t('Tous') : f === 'sms' ? t('Textos') : t('Courriels')}
            </button>
          ))}
        </div>
        {status === 'loading' && <SkeletonRows rows={4} />}
        {status === 'error' && <ErrorState onRetry={() => setAttempt((n) => n + 1)}>{state.error}</ErrorState>}
        {status === 'ready' &&
          (list.length === 0 ? (
            <Empty icon={FileText} title={t('Aucun modèle')} />
          ) : (
            <ul className="p-1.5 space-y-0.5 max-h-[60vh] overflow-y-auto">
              {list.map((m) => (
                <li key={m.id}>
                  <button onClick={() => open(m)} className={cn('w-full text-left px-3 py-2 rounded-md flex items-start gap-2', selected === m.id ? 'bg-primary-wash text-primary-press' : 'hover:bg-sand', !m.is_active && 'opacity-60')}>
                    {m.channel === 'sms' ? <MessageSquare className="w-4 h-4 mt-0.5 shrink-0" /> : <Mail className="w-4 h-4 mt-0.5 shrink-0" />}
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold truncate">{m.name}</span>
                      <span className="block text-2xs text-ink-mute">
                        {purposeLabel(m.purpose)}
                        {!m.is_active && ` · ${t('Inactif')}`}
                      </span>
                    </span>
                    {m.company_id === null && (
                      <Badge tone="neutral" className="shrink-0">
                        {t('Partagé')}
                      </Badge>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ))}
      </Card>
      {status !== 'ready' ? null : !draft ? (
        <Card>
          <Empty icon={FileText} title={t('Choisissez un modèle')}>
            {isAdmin ? t('Ou créez-en un nouveau.') : null}
          </Empty>
        </Card>
      ) : (
        <div className="grid xl:grid-cols-[minmax(0,1fr)_340px] gap-4 items-start">
          <Card
            title={!original ? t('Nouveau modèle') : editable ? t('Modifier le modèle') : t('Modèle')}
            actions={
              original &&
              isAdmin && (
                <button className="btn btn-xs btn-ghost" onClick={() => create(original)} title={t('Copie pour {company}', { company: companyName })}>
                  <Copy className="w-3.5 h-3.5" />
                  {t('Dupliquer')}
                </button>
              )
            }
          >
            <div className="space-y-3">
              {!editable && (
                <Notice tone="info">
                  {shared ? t('Ce modèle est partagé par les compagnies : réservé aux administrateurs de toutes les compagnies.') : t('Seul un administrateur de la compagnie peut modifier les modèles de messages.')}
                </Notice>
              )}
              <Field label={t('Nom')}>
                <input className="form-input" value={draft.name} maxLength={MAX_NAME} disabled={!editable} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </Field>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label={t('Canal')}>
                  <Dropdown
                    className="form-input"
                    value={draft.channel}
                    disabled={!!draft.id || !editable}
                    title={draft.id ? t('Le canal ne peut pas changer : créez un autre modèle.') : undefined}
                    onChange={(e) => setDraft({ ...draft, channel: e.target.value as MessageChannel })}
                  >
                    <option value="sms">{t('Texto')}</option>
                    <option value="email">{t('Courriel')}</option>
                  </Dropdown>
                </Field>
                <Field label={t('Utilisation')}>
                  <Dropdown className="form-input" value={draft.purpose} disabled={!editable} onChange={(e) => setDraft({ ...draft, purpose: e.target.value as MessagePurpose })}>
                    {PURPOSES.map(([p, label]) => (
                      <option key={p} value={p}>
                        {t(label)}
                      </option>
                    ))}
                  </Dropdown>
                </Field>
              </div>
              <p className="text-xs text-ink-mute flex flex-wrap items-center gap-1.5">
                {t('Compagnie')} :
                {shared ? <Badge tone="neutral">{t('Partagé par toutes les compagnies')}</Badge> : <span className="font-semibold text-ink">{companyName}</span>}
              </p>
              {draft.channel === 'email' && (
                <Field label={t('Objet')}>
                  <input className="form-input" value={draft.subject} maxLength={MAX_SUBJECT} disabled={!editable} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
                </Field>
              )}
              {editable && (
                <div>
                  <p className="label-caps mb-1">{t('Insérer un champ')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {MERGE_FIELDS.map((f) => (
                      <button key={f} type="button" onClick={() => insert(f)} title={t(MERGE_LABELS[f])} className="px-2 py-1 rounded-md bg-sand text-xs font-mono text-ink-secondary hover:bg-primary-wash hover:text-primary-press">
                        {`{${f}}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <Field label={t('Message')}>
                <textarea ref={body} rows={draft.channel === 'sms' ? 5 : 12} maxLength={MAX_BODY} readOnly={!editable} className="form-input h-auto py-2.5 leading-relaxed" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
              </Field>
              {sms && (
                <p className={cn('text-xs tnum', sms.segments > 2 ? 'text-tone-warn-ink font-semibold' : 'text-ink-mute')}>
                  {t('{n} caractères · {s} texto(s)', { n: sms.len, s: sms.segments })}
                  {sms.unicode && ` · ${t('accents spéciaux : 70 caractères par texto')}`}
                </p>
              )}
              {draft.channel === 'sms' && !/STOP/i.test(draft.body) && <Notice>{t('Ajoutez « Répondez STOP pour ne plus recevoir de textos » aux textos automatiques (exigence CRTC).')}</Notice>}
              <label className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Toggle on={draft.is_active} disabled={!editable} onChange={(is_active) => setDraft({ ...draft, is_active })} label={t('Modèle actif')} />
                {draft.is_active ? t('Modèle actif') : t('Modèle inactif (non proposé à l’envoi)')}
              </label>
              {editable && (
                <div className="flex flex-wrap justify-end gap-2 pt-1">
                  <button className="btn btn-sm btn-ghost text-tone-critical-ink mr-auto" onClick={() => void remove()} disabled={busy}>
                    <Trash2 className="w-4 h-4" />
                    {original ? t('Supprimer') : t('Abandonner')}
                  </button>
                  <button className="btn btn-sm btn-ghost" disabled={!dirty || !original || busy} onClick={() => original && setDraft(toDraft(original))}>
                    {t('Annuler')}
                  </button>
                  <button className="btn btn-sm btn-primary" disabled={!dirty || busy} onClick={() => void save()}>
                    {busy && <LoaderCircle className="w-4 h-4 animate-spin" />}
                    {t('Enregistrer')}
                  </button>
                </div>
              )}
            </div>
          </Card>
          <Card title={t('Aperçu')} className="xl:sticky xl:top-20">
            {draft.channel === 'sms' ? (
              <div className="bg-sand/70 rounded-xl p-3">
                <div className="ml-auto max-w-[90%] bg-primary text-white rounded-2xl rounded-br-sm px-3 py-2 text-sm whitespace-pre-line break-words">{preview || '—'}</div>
              </div>
            ) : (
              <div className="rounded-lg border border-hairline overflow-hidden">
                <div className="px-3 py-2 border-b border-hairline bg-sand/50 text-xs">
                  <Badge className="mr-1.5">{t('Objet')}</Badge>
                  <span className="font-semibold text-ink">{renderSample(draft.subject, company, '') || '—'}</span>
                </div>
                <div className="p-3 text-sm text-ink-secondary whitespace-pre-line break-words">{preview || '—'}</div>
              </div>
            )}
            <p className="text-2xs text-ink-mute mt-2">{t('Exemple avec des données fictives.')}</p>
          </Card>
        </div>
      )}
    </div>
  )
}
