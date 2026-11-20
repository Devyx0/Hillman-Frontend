/** Paramètres → Modèles de messages: editor for MESSAGE_TEMPLATES with merge fields and live preview. */
import { useRef, useState } from 'react'
import { Copy, FileText, Mail, MessageSquare, Plus, Trash2 } from 'lucide-react'
import { Badge, Card, CompanyBadge, Empty, Field } from '../../../components/ui'
import { Select } from '../../../components/filters'
import { Notice, confirmAction } from '../../../components/states'
import { useAuth } from '../../../auth/AuthContext'
import { COMPANIES, type CompanyId } from '../../../data/mock'
import { FOLLOW_UP_SEQUENCES, MESSAGE_TEMPLATES, removeTemplate, saveTemplate, type MessageTemplate } from '../../../data/settings'
import { useStore } from '../../../data/store'
import { toast } from '../../../lib/toast'
import { cn } from '../../../lib/utils'
import { t } from '../../../i18n'
import { logChange } from './data'
import { MERGE_FIELDS, MERGE_LABELS, renderSample, smsSegments } from './merge'

/** Template as shown in the editor (texts in the current language). */
const toDraft = (m: MessageTemplate): MessageTemplate => ({ ...m, name: t(m.name), subject: m.subject !== undefined ? t(m.subject) : undefined, body: t(m.body) })

export function MessageTemplatesTab() {
  useStore()
  const { user } = useAuth()
  const me = user?.name ?? '—'
  const [selected, setSelected] = useState<string | null>(MESSAGE_TEMPLATES[0]?.id ?? null)
  const [draft, setDraft] = useState<MessageTemplate | null>(() => (MESSAGE_TEMPLATES[0] ? toDraft(MESSAGE_TEMPLATES[0]) : null))
  const [filter, setFilter] = useState<'all' | 'sms' | 'email'>('all')
  const body = useRef<HTMLTextAreaElement>(null)
  const original = MESSAGE_TEMPLATES.find((m) => m.id === selected)
  const dirty = !!draft && (!original || JSON.stringify(draft) !== JSON.stringify(toDraft(original)))
  const list = MESSAGE_TEMPLATES.filter((m) => filter === 'all' || m.channel === filter)

  const usedBy = (id: string) => COMPANIES.filter((c) => FOLLOW_UP_SEQUENCES[c.id].steps.some((s) => s.templateId === id))

  const open = async (m: MessageTemplate) => {
    if (m.id === selected) return
    if (dirty && !(await confirmAction({ title: t('Abandonner les modifications?') }))) return
    setSelected(m.id)
    setDraft(toDraft(m))
  }
  const create = async (base?: MessageTemplate) => {
    if (dirty && !(await confirmAction({ title: t('Abandonner les modifications?') }))) return
    const id = 'tpl' + Date.now().toString(36)
    const m: MessageTemplate = base ? { ...toDraft(base), id, name: t('{name} (copie)', { name: t(base.name) }) } : { id, name: t('Nouveau modèle'), channel: 'sms', company: 'all', body: t('Bonjour {prénom}, ') }
    setSelected(null)
    setDraft(m)
  }
  const save = () => {
    if (!draft) return
    if (!draft.name.trim()) return toast(t('Donnez un nom au modèle'))
    if (!draft.body.trim()) return toast(t('Le message est vide'))
    if (draft.channel === 'email' && !draft.subject?.trim()) return toast(t("L'objet du courriel est requis"))
    const unknown = [...draft.body.matchAll(/\{([^}]+)\}/g)].map((x) => x[1]).filter((k) => !(MERGE_FIELDS as readonly string[]).includes(k))
    if (unknown.length) return toast(t('Champ inconnu : {f}', { f: `{${unknown[0]}}` }))
    const clean = { ...draft, subject: draft.channel === 'email' ? draft.subject : undefined }
    saveTemplate(clean)
    setSelected(clean.id)
    setDraft(toDraft(clean))
    logChange(me, 'parametres', original ? 'A modifié le modèle « {name} »' : 'A créé le modèle « {name} »', { name: clean.name })
    toast(t('Modèle enregistré'))
  }
  const remove = async () => {
    if (!original) return setDraft(null)
    const users = usedBy(original.id)
    if (users.length) return toast(t('Utilisé par les suivis automatiques de {list} : remplacez-le avant de le supprimer', { list: users.map((c) => c.name).join(', ') }))
    if (!(await confirmAction({ title: t('Supprimer le modèle « {name} »?', { name: t(original.name) }), body: t('Cette action est définitive.'), confirmLabel: t('Supprimer'), danger: true }))) return
    removeTemplate(original.id)
    logChange(me, 'parametres', 'A supprimé le modèle « {name} »', { name: original.name })
    const first = MESSAGE_TEMPLATES[0]
    setSelected(first?.id ?? null)
    setDraft(first ? toDraft(first) : null)
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

  const preview = draft ? renderSample(draft.body, draft.company, t('mercredi 21 octobre à 10 h')) : ''
  const sms = draft?.channel === 'sms' ? smsSegments(preview) : null

  return (
    <div className="grid lg:grid-cols-[280px_minmax(0,1fr)] gap-4 items-start">
      <Card
        title={t('Modèles')}
        icon={FileText}
        pad={false}
        actions={
          <button className="btn btn-xs btn-primary" onClick={() => create()}>
            <Plus className="w-3.5 h-3.5" />
            {t('Nouveau')}
          </button>
        }
      >
        <div className="flex gap-1 p-2 border-b border-hairline">
          {(['all', 'sms', 'email'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={cn('flex-1 h-7 rounded-md text-xs font-semibold', filter === f ? 'bg-ink text-white' : 'text-ink-mute hover:bg-sand')}>
              {f === 'all' ? t('Tous') : f === 'sms' ? t('Textos') : t('Courriels')}
            </button>
          ))}
        </div>
        {list.length === 0 ? (
          <Empty icon={FileText} title={t('Aucun modèle')} />
        ) : (
          <ul className="p-1.5 space-y-0.5 max-h-[60vh] overflow-y-auto">
            {list.map((m) => (
              <li key={m.id}>
                <button onClick={() => open(m)} className={cn('w-full text-left px-3 py-2 rounded-md flex items-start gap-2', selected === m.id ? 'bg-primary-wash text-primary-press' : 'hover:bg-sand')}>
                  {m.channel === 'sms' ? <MessageSquare className="w-4 h-4 mt-0.5 shrink-0" /> : <Mail className="w-4 h-4 mt-0.5 shrink-0" />}
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold truncate">{t(m.name)}</span>
                    <span className="block text-2xs text-ink-mute">{m.company === 'all' ? t('Toutes les compagnies') : COMPANIES.find((c) => c.id === m.company)?.name}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {!draft ? (
        <Card>
          <Empty icon={FileText} title={t('Choisissez un modèle')}>
            {t('Ou créez-en un nouveau.')}
          </Empty>
        </Card>
      ) : (
        <div className="grid xl:grid-cols-[minmax(0,1fr)_340px] gap-4 items-start">
          <Card
            title={original ? t('Modifier le modèle') : t('Nouveau modèle')}
            actions={
              original && (
                <button className="btn btn-xs btn-ghost" onClick={() => create(original)}>
                  <Copy className="w-3.5 h-3.5" />
                  {t('Dupliquer')}
                </button>
              )
            }
          >
            <div className="space-y-3">
              <Field label={t('Nom')}>
                <input className="form-input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </Field>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label={t('Canal')}>
                  <Select<MessageTemplate['channel']>
                    value={draft.channel}
                    searchable={false}
                    disabled={!!original && usedBy(original.id).length > 0}
                    onChange={(channel) => setDraft({ ...draft, channel, subject: channel === 'email' ? draft.subject ?? '' : undefined })}
                    options={[
                      { value: 'sms', label: t('Texto') },
                      { value: 'email', label: t('Courriel') },
                    ]}
                  />
                </Field>
                <Field label={t('Compagnie')}>
                  <Select<CompanyId | 'all'> value={draft.company} searchable={false} onChange={(company) => setDraft({ ...draft, company })} options={[{ value: 'all', label: t('Toutes les compagnies') }, ...COMPANIES.map((c) => ({ value: c.id, label: c.name }))]} />
                </Field>
              </div>
              {draft.channel === 'email' && (
                <Field label={t('Objet')}>
                  <input className="form-input" value={draft.subject ?? ''} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
                </Field>
              )}
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
              <Field label={t('Message')}>
                <textarea ref={body} rows={draft.channel === 'sms' ? 5 : 12} className="form-input h-auto py-2.5 leading-relaxed" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
              </Field>
              {sms && (
                <p className={cn('text-xs tnum', sms.segments > 2 ? 'text-tone-warn-ink font-semibold' : 'text-ink-mute')}>
                  {t('{n} caractères · {s} texto(s)', { n: sms.len, s: sms.segments })}
                  {sms.unicode && ` · ${t('accents spéciaux : 70 caractères par texto')}`}
                </p>
              )}
              {draft.channel === 'sms' && !/STOP/i.test(draft.body) && <Notice>{t('Ajoutez « Répondez STOP pour ne plus recevoir de textos » aux textos automatiques (exigence CRTC).')}</Notice>}
              {original && usedBy(original.id).length > 0 && (
                <p className="text-xs text-ink-mute flex flex-wrap items-center gap-1">
                  {t('Utilisé par les suivis automatiques :')}
                  {usedBy(original.id).map((c) => (
                    <CompanyBadge key={c.id} id={c.id} />
                  ))}
                </p>
              )}
              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <button className="btn btn-sm btn-ghost text-tone-critical-ink mr-auto" onClick={remove}>
                  <Trash2 className="w-4 h-4" />
                  {original ? t('Supprimer') : t('Abandonner')}
                </button>
                <button className="btn btn-sm btn-ghost" disabled={!dirty || !original} onClick={() => original && setDraft(toDraft(original))}>
                  {t('Annuler')}
                </button>
                <button className="btn btn-sm btn-primary" disabled={!dirty} onClick={save}>
                  {t('Enregistrer')}
                </button>
              </div>
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
                  <span className="font-semibold text-ink">{renderSample(draft.subject ?? '', draft.company, '') || '—'}</span>
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
