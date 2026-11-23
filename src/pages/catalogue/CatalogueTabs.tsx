/** Catalogue tabs (mockup: Z4→WorkLinesTab, J4→ExpertisesTab, $4→CostItemsTab, F4→TemplatesTab, K4→WarrantiesTab). */
import { Fragment, useState } from 'react'
import { ArrowDown, ArrowUp, Check, ListChecks, Pencil, Plus, SearchCheck, Trash2, X } from 'lucide-react'
import { Card, Empty, Field } from '../../components/ui'
import { confirmAction } from '../../components/states'
import { useAuth } from '../../auth/AuthContext'
import { COMPANIES, type CompanyId } from '../../data/mock'
import { useStore } from '../../data/store'
import { toast } from '../../lib/toast'
import { cn } from '../../lib/utils'
import { t } from '../../i18n'
import { Select } from '../../components/filters'
import { EXPERTISES, GUTTER_TOKENS, WARRANTIES, WORK_KINDS, addScopeLine, addScopeSection, editScopeLine, moveScopeLine, removeScopeLine, scopeFor } from './data'
import { logChange } from './settings/data'
import { useScopeCompany } from './settings/shared'

export { CostItemsTab } from './CostItemsTab'
export { TemplatesTab } from './QuoteTemplatesTab'

import { useCanEditCatalogue } from './context'
export { CatalogueEditContext, useCanEditCatalogue } from './context'

/** Renders a clause, showing `{token}` placeholders as chips (or filled with sample values). */
export function ClauseText({ text, filled }: { text: string; filled?: boolean }) {
  const parts = t(text).split(/(\{\w+\})/g)
  return (
    <>
      {parts.map((p, i) => {
        const m = /^\{(\w+)\}$/.exec(p)
        if (!m) return <Fragment key={i}>{p}</Fragment>
        const tok = GUTTER_TOKENS[m[1]]
        if (filled && tok) return <b key={i} className="text-ink">{tok.sample}</b>
        return (
          <span key={i} title={tok ? t(tok.label) : undefined} className="inline-flex items-center px-1.5 mx-0.5 rounded bg-primary-wash text-primary-press font-mono text-xs">
            {p}
          </span>
        )
      })}
    </>
  )
}

export function WorkLinesTab() {
  useStore()
  const canEdit = useCanEditCatalogue()
  const { user, can } = useAuth()
  const canDelete = can('delete')
  const me = user?.name ?? '—'
  const [company, setCompany] = useScopeCompany()
  const [kind, setKind] = useState(WORK_KINDS[company][0])
  const [active, setActive] = useState(0)
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState<{ index: number; text: string } | null>(null)
  const [newSection, setNewSection] = useState<string | null>(null)
  const [filled, setFilled] = useState(false)
  const sections = scopeFor(company)
  const section = sections[active]
  const hasTokens = company === 'sg'
  const total = sections.reduce((n, s) => n + s.lines.length, 0)

  const add = () => {
    if (!draft.trim()) return
    addScopeLine(company, active, draft.trim())
    logChange(me, 'catalogue', 'A ajouté une clause dans « {s} »', { s: section.name })
    setDraft('')
    toast(t('Ligne ajoutée au catalogue'))
  }
  const saveEdit = () => {
    if (!editing) return
    if (editing.text.trim()) {
      editScopeLine(company, active, editing.index, editing.text.trim())
      logChange(me, 'catalogue', 'A modifié une clause dans « {s} »', { s: section.name })
    }
    setEditing(null)
  }
  const remove = async (i: number) => {
    if (!(await confirmAction({ title: t('Supprimer cette clause?'), body: <span className="italic">{t(section.lines[i])}</span>, confirmLabel: t('Supprimer'), danger: true }))) return
    removeScopeLine(company, active, i)
    logChange(me, 'catalogue', 'A supprimé une clause dans « {s} »', { s: section.name })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label={t('Compagnie')}>
          <Select<CompanyId>
            value={company}
            onChange={(c) => {
              setCompany(c)
              setKind(WORK_KINDS[c][0])
              setActive(0)
              setEditing(null)
            }}
            className="w-52"
            options={COMPANIES.map((c) => ({ value: c.id, label: c.name }))}
          />
        </Field>
        <Field label={t('Type de travaux')}>
          <Select value={kind} onChange={setKind} className="w-44" options={WORK_KINDS[company].map((k) => ({ value: k, label: t(k) }))} />
        </Field>
        <p className="text-xs text-ink-mute pb-2.5 tnum">{t('{n} clauses dans {s} sections', { n: total, s: sections.length })}</p>
        {hasTokens && (
          <label className="flex items-center gap-2 text-xs font-semibold text-ink-secondary pb-2.5 ml-auto">
            <input type="checkbox" checked={filled} onChange={(e) => setFilled(e.target.checked)} />
            {t('Aperçu avec des mesures')}
          </label>
        )}
      </div>
      {hasTokens && (
        <div className="rounded-lg bg-white shadow-card px-4 py-3 text-xs text-ink-mute">
          <p className="mb-1.5">{t('Les champs entre accolades se remplissent seuls avec les mesures de la soumission :')}</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(GUTTER_TOKENS).map(([k, v]) => (
              <span key={k} className="inline-flex items-center gap-1">
                <span className="px-1.5 rounded bg-primary-wash text-primary-press font-mono">{`{${k}}`}</span>
                <span>{t(v.label)}</span>
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="grid lg:grid-cols-[260px_minmax(0,1fr)] gap-4 items-start">
        <nav className="bg-white rounded-xl shadow-card p-2 lg:sticky lg:top-20 flex lg:flex-col gap-0.5 overflow-x-auto lg:max-h-[75vh] lg:overflow-y-auto" aria-label={t('Sections')}>
          {sections.map((s, i) => (
            <button key={s.name + i} onClick={() => (setActive(i), setEditing(null))} className={cn('flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm text-left whitespace-nowrap lg:whitespace-normal', active === i ? 'bg-primary-wash text-primary-press font-semibold' : 'text-ink-mute hover:bg-sand hover:text-ink')}>
              <span className="lg:line-clamp-2">{t(s.name)}</span>
              <span className="tnum text-2xs">{s.lines.length}</span>
            </button>
          ))}
          {canEdit &&
            (newSection === null ? (
              <button className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-ink-mute hover:bg-sand whitespace-nowrap" onClick={() => setNewSection('')}>
                <Plus className="w-3.5 h-3.5" />
                {t('Section')}
              </button>
            ) : (
              <form
                className="flex gap-1 p-1 min-w-[14rem]"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!newSection.trim()) return setNewSection(null)
                  addScopeSection(company, newSection.trim())
                  logChange(me, 'catalogue', 'A ajouté la section « {s} »', { s: newSection.trim() })
                  setActive(sections.length)
                  setNewSection(null)
                }}
              >
                <input className="form-input h-8" autoFocus value={newSection} onChange={(e) => setNewSection(e.target.value)} placeholder={t('Nom de la section')} aria-label={t('Nom de la section')} />
                <button className="btn btn-sm btn-secondary" aria-label={t('Ajouter')}>
                  <Check className="w-4 h-4" />
                </button>
              </form>
            ))}
        </nav>
        <Card title={section ? t(section.name) : undefined} icon={ListChecks} pad={false}>
          {!section || section.lines.length === 0 ? (
            <Empty icon={ListChecks} title={t('Aucune clause dans cette section')}>
              {canEdit ? t('Ajoutez la première ci-dessous.') : undefined}
            </Empty>
          ) : (
            <ul className="divide-y divide-hairline">
              {section.lines.map((line, i) => (
                <li key={line + i} className="group flex items-center gap-2 px-4 py-2.5 hover:bg-sand/60">
                  {editing?.index === i ? (
                    <form
                      className="flex-1 flex gap-2"
                      onSubmit={(e) => {
                        e.preventDefault()
                        saveEdit()
                      }}
                    >
                      <input className="form-input h-8" autoFocus value={editing.text} onChange={(e) => setEditing({ index: i, text: e.target.value })} aria-label={t('Clause')} />
                      <button className="btn btn-sm btn-primary" aria-label={t('Enregistrer')}>
                        <Check className="w-4 h-4" />
                      </button>
                      <button type="button" className="btn btn-sm btn-ghost" aria-label={t('Annuler')} onClick={() => setEditing(null)}>
                        <X className="w-4 h-4" />
                      </button>
                    </form>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-ink-secondary">
                        <ClauseText text={line} filled={filled} />
                      </span>
                      {canEdit && (
                        <span className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100">
                          <button aria-label={t('Monter')} disabled={i === 0} onClick={() => moveScopeLine(company, active, i, -1)} className="p-1.5 rounded-md hover:bg-stone disabled:opacity-30">
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button aria-label={t('Descendre')} disabled={i === section.lines.length - 1} onClick={() => moveScopeLine(company, active, i, 1)} className="p-1.5 rounded-md hover:bg-stone disabled:opacity-30">
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button aria-label={t('Modifier')} onClick={() => setEditing({ index: i, text: line })} className="p-1.5 rounded-md hover:bg-stone">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {canDelete && (
                            <button aria-label={t('Supprimer')} onClick={() => remove(i)} className="p-1.5 rounded-md hover:bg-tone-critical-soft hover:text-tone-critical-ink">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </span>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
          {canEdit && section && (
            <form
              className="flex gap-2 p-3 border-t border-hairline bg-sand/40"
              onSubmit={(e) => {
                e.preventDefault()
                add()
              }}
            >
              <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={hasTokens ? t('Nouvelle clause… ex. {nb_descentes} descentes') : t('Nouvelle ligne de travaux…')} className="form-input" aria-label={t('Nouvelle ligne')} />
              <button className="btn btn-md btn-secondary" disabled={!draft.trim()}>
                <Plus className="w-4 h-4" />
                {t('Ajouter')}
              </button>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}

/** Small inline "add an option" form used by Expertises and Garanties. */
function AddOption({ onAdd }: { onAdd: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [v, setV] = useState('')
  if (!open)
    return (
      <button className="btn btn-xs btn-ghost" aria-label={t('Ajouter une option')} onClick={() => setOpen(true)}>
        <Plus className="w-3.5 h-3.5" />
      </button>
    )
  return (
    <form
      className="flex gap-1"
      onSubmit={(e) => {
        e.preventDefault()
        if (v.trim()) onAdd(v.trim())
        setV('')
        setOpen(false)
      }}
    >
      <input className="form-input h-7 w-40 text-xs" autoFocus value={v} onChange={(e) => setV(e.target.value)} onBlur={() => !v && setOpen(false)} placeholder={t('Nouvelle option')} aria-label={t('Nouvelle option')} />
    </form>
  )
}

export function ExpertisesTab() {
  useStore()
  const canEdit = useCanEditCatalogue()
  const canDelete = useAuth().can('delete')
  const [, force] = useState(0)
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {EXPERTISES.map((x) => (
        <Card
          key={x.name}
          title={t(x.name)}
          icon={SearchCheck}
          actions={
            canEdit && (
              <AddOption
                onAdd={(v) => {
                  x.opts.push(v)
                  force((n) => n + 1)
                  toast(t('Option ajoutée'))
                }}
              />
            )
          }
        >
          <ul className="space-y-1.5">
            {x.opts.map((opt, i) => (
              <li key={opt + i} className="group flex items-center gap-2 text-sm text-ink-secondary">
                <span className="w-4 h-4 rounded border border-hairline-strong shrink-0" />
                <span className="flex-1">{t(opt)}</span>
                {canEdit && canDelete && (
                  <button
                    className="p-1 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-tone-critical-soft hover:text-tone-critical-ink"
                    aria-label={t('Supprimer')}
                    onClick={async () => {
                      if (!(await confirmAction({ title: t('Supprimer l’option « {o} »?', { o: t(opt) }), confirmLabel: t('Supprimer'), danger: true }))) return
                      x.opts.splice(i, 1)
                      force((n) => n + 1)
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  )
}

export function WarrantiesTab() {
  useStore()
  const canEdit = useCanEditCatalogue()
  const canDelete = useAuth().can('delete')
  const [, force] = useState(0)
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {WARRANTIES.map((w) => (
        <Card
          key={w.group}
          title={t(w.group)}
          actions={
            canEdit && (
              <AddOption
                onAdd={(v) => {
                  w.opts.push(v)
                  force((n) => n + 1)
                  toast(t('Option ajoutée'))
                }}
              />
            )
          }
        >
          <div className="flex flex-wrap gap-1.5">
            {w.opts.map((o, i) => (
              <span key={o + i} className="inline-flex items-center gap-1 text-xs font-medium pl-2.5 pr-1.5 py-1 rounded-md bg-sand text-ink-secondary">
                {t(o)}
                {canEdit && canDelete && (
                  <button
                    className="p-0.5 rounded hover:bg-stone"
                    aria-label={t('Supprimer')}
                    onClick={async () => {
                      if (!(await confirmAction({ title: t('Supprimer l’option « {o} »?', { o: t(o) }), confirmLabel: t('Supprimer'), danger: true }))) return
                      w.opts.splice(i, 1)
                      force((n) => n + 1)
                    }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}
