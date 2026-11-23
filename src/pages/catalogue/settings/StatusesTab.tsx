/** Paramètres → Statuts: quote statuses (rename, colour, stops follow-ups, order) + refusal reasons. */
import { useState } from 'react'
import { ArrowDown, ArrowUp, Check, CircleSlash, ListOrdered, Lock, Plus, Trash2 } from 'lucide-react'
import { Badge, Card, Empty } from '../../../components/ui'
import { Select } from '../../../components/filters'
import { confirmAction } from '../../../components/states'
import { useAuth } from '../../../auth/AuthContext'
import { QUOTES } from '../../../data/mock'
import { REFUSAL_REASONS, STATUS_DEFS, addRefusalReason, removeRefusalReason, saveStatuses, type StatusDef } from '../../../data/settings'
import { updateQuote, useStore } from '../../../data/store'
import { toast } from '../../../lib/toast'
import { cn } from '../../../lib/utils'
import { t } from '../../../i18n'
import { logChange } from './data'
import { Toggle } from './shared'

const TONES: { value: StatusDef['tone']; label: string }[] = [
  { value: 'info', label: 'Bleu' },
  { value: 'accent', label: 'Noir' },
  { value: 'warn', label: 'Orange' },
  { value: 'good', label: 'Vert' },
  { value: 'critical', label: 'Rouge' },
  { value: 'neutral', label: 'Gris' },
]

export function StatusesTab() {
  useStore()
  const { user, can } = useAuth()
  const me = user?.name ?? '—'
  // Draft list: `from` keeps the original name so renames can be applied to existing quotes.
  const [list, setList] = useState(() => STATUS_DEFS.map((s) => ({ ...s, from: s.name })))
  const [draft, setDraft] = useState('')
  const dirty = JSON.stringify(list.map(({ from: _f, ...s }) => s)) !== JSON.stringify(STATUS_DEFS)

  const patch = (i: number, p: Partial<StatusDef>) => setList((l) => l.map((s, k) => (k === i ? { ...s, ...p } : s)))
  const move = (i: number, dir: number) =>
    setList((l) => {
      const j = i + dir
      if (j < 0 || j >= l.length) return l
      const next = [...l]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  const add = () => {
    const name = draft.trim()
    if (!name) return
    if (list.some((s) => s.name.toLowerCase() === name.toLowerCase())) return toast(t('Ce statut existe déjà'))
    setList((l) => [...l, { name, tone: 'neutral', stopsFollowUps: false, system: false, from: '' }])
    setDraft('')
  }
  const remove = async (i: number) => {
    const s = list[i]
    const n = QUOTES.filter((q) => q.status === s.from).length
    if (n > 0) return toast(t('{n} soumissions ont ce statut : changez-les avant de le supprimer', { n }))
    if (!(await confirmAction({ title: t('Supprimer le statut « {name} »?', { name: s.name }), confirmLabel: t('Supprimer'), danger: true }))) return
    setList((l) => l.filter((_, k) => k !== i))
  }
  const save = () => {
    if (list.some((s) => !s.name.trim())) return toast(t('Chaque statut doit avoir un nom'))
    const names = list.map((s) => s.name.trim().toLowerCase())
    if (new Set(names).size !== names.length) return toast(t('Deux statuts portent le même nom'))
    // Apply renames to existing quotes so lists stay consistent.
    for (const s of list) if (s.from && s.from !== s.name) for (const q of QUOTES) if (q.status === s.from) updateQuote(q.id, { status: s.name.trim() })
    saveStatuses(list.map(({ from: _f, ...s }) => ({ ...s, name: s.name.trim() })))
    setList(STATUS_DEFS.map((s) => ({ ...s, from: s.name })))
    logChange(me, 'parametres', 'A modifié les statuts de soumission', {})
    toast(t('Statuts enregistrés'))
  }

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
      <Card title={t('Statuts de soumission')} icon={ListOrdered} pad={false}>
        <p className="px-5 pt-3 text-xs text-ink-mute">{t("L'ordre est celui du pipeline et des filtres. Les statuts du système peuvent être renommés mais pas supprimés.")}</p>
        <ul className="divide-y divide-hairline mt-2">
          {list.map((s, i) => (
            <li key={s.from || 'new' + i} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
              <span className="flex flex-col">
                <button aria-label={t('Monter')} onClick={() => move(i, -1)} disabled={i === 0} className="p-0.5 rounded hover:bg-stone disabled:opacity-30">
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button aria-label={t('Descendre')} onClick={() => move(i, 1)} disabled={i === list.length - 1} className="p-0.5 rounded hover:bg-stone disabled:opacity-30">
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </span>
              <input className="form-input h-8 flex-1 min-w-[9rem]" value={s.name} onChange={(e) => patch(i, { name: e.target.value })} aria-label={t('Nom du statut')} />
              <Select<StatusDef['tone']> value={s.tone} onChange={(tone) => patch(i, { tone })} searchable={false} className="w-28" options={TONES.map((x) => ({ value: x.value, label: t(x.label) }))} />
              <Badge tone={s.tone} dot className="hidden sm:inline-flex">
                {s.name ? t(s.name) : '—'}
              </Badge>
              <label className="flex items-center gap-2 text-xs text-ink-mute ml-auto" title={t('Arrête les relances automatiques')}>
                <span className="hidden md:inline">{t('Arrête les relances')}</span>
                <Toggle on={s.stopsFollowUps} onChange={(v) => patch(i, { stopsFollowUps: v })} label={t('Arrête les relances automatiques')} />
              </label>
              {s.system ? (
                <span className="p-1.5 text-ink-faint" title={t('Statut du système')}>
                  <Lock className="w-3.5 h-3.5" />
                </span>
              ) : can('delete') ? (
                <button className="p-1.5 rounded-md hover:bg-tone-critical-soft hover:text-tone-critical-ink" aria-label={t('Supprimer')} onClick={() => remove(i)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        <form
          className="flex gap-2 p-3 border-t border-hairline bg-sand/40"
          onSubmit={(e) => {
            e.preventDefault()
            add()
          }}
        >
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t('Nouveau statut personnalisé…')} className="form-input" aria-label={t('Nouveau statut')} />
          <button className="btn btn-md btn-secondary" disabled={!draft.trim()}>
            <Plus className="w-4 h-4" />
            {t('Ajouter')}
          </button>
        </form>
        <div className="flex justify-end gap-2 p-3 border-t border-hairline">
          <button className="btn btn-sm btn-ghost" disabled={!dirty} onClick={() => setList(STATUS_DEFS.map((s) => ({ ...s, from: s.name })))}>
            {t('Annuler')}
          </button>
          <button className="btn btn-sm btn-primary" disabled={!dirty} onClick={save}>
            <Check className="w-4 h-4" />
            {t('Enregistrer')}
          </button>
        </div>
      </Card>
      <RefusalReasonsCard me={me} />
    </div>
  )
}

function RefusalReasonsCard({ me }: { me: string }) {
  useStore()
  const canDelete = useAuth().can('delete')
  const [draft, setDraft] = useState('')
  const add = () => {
    const r = draft.trim()
    if (!r) return
    if (!addRefusalReason(r)) return toast(t('Cette raison existe déjà'))
    logChange(me, 'parametres', 'A ajouté la raison de refus « {r} »', { r })
    setDraft('')
  }
  const remove = async (r: string) => {
    if (!(await confirmAction({ title: t('Supprimer la raison « {r} »?', { r: t(r) }), body: t('Les soumissions déjà refusées gardent leur raison.'), confirmLabel: t('Supprimer'), danger: true }))) return
    removeRefusalReason(r)
    logChange(me, 'parametres', 'A supprimé la raison de refus « {r} »', { r })
  }
  return (
    <Card title={t('Raisons de refus')} icon={CircleSlash} pad={false}>
      <p className="px-5 pt-3 text-xs text-ink-mute">{t('Demandées quand une soumission passe à « Refusé ». Elles alimentent les rapports.')}</p>
      {REFUSAL_REASONS.length === 0 ? (
        <Empty icon={CircleSlash} title={t('Aucune raison')} />
      ) : (
        <ul className="divide-y divide-hairline mt-2">
          {REFUSAL_REASONS.map((r) => (
            <li key={r} className="flex items-center gap-2 px-4 py-2 text-sm text-ink-secondary">
              <span className="flex-1">{t(r)}</span>
              <button className={cn('p-1.5 rounded-md hover:bg-tone-critical-soft hover:text-tone-critical-ink', (r === 'Autre' || !canDelete) && 'invisible')} aria-label={t('Supprimer')} onClick={() => remove(r)}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex gap-2 p-3 border-t border-hairline bg-sand/40"
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
      >
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t('Nouvelle raison…')} className="form-input" aria-label={t('Nouvelle raison de refus')} />
        <button className="btn btn-md btn-secondary" disabled={!draft.trim()} aria-label={t('Ajouter')}>
          <Plus className="w-4 h-4" />
        </button>
      </form>
    </Card>
  )
}
