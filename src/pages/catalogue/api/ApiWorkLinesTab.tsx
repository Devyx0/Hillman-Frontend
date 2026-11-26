/**
 * Catalogue → Travaux in API mode: scope sections and their clauses (scope-sections / scope-items: add, rename,
 * reorder, deactivate, delete; « cochée par défaut ») and the company's work types (work-types: name, obligation
 * form, active). Same layout as WorkLinesTab; the {token} chips and the « Aperçu avec des mesures » preview are kept.
 */
import { useState } from 'react'
import { ArrowDown, ArrowUp, Check, ListChecks, Pencil, Plus, Trash2, Wrench, X } from 'lucide-react'
import * as api from '../../../api/endpoints'
import type { ApiWorkType, CatalogueScopeItem, CatalogueScopeSection, ObligationForm } from '../../../api/types'
import { Card, Empty } from '../../../components/ui'
import { Dropdown } from '../../../components/dropdown'
import { toast } from '../../../lib/toast'
import { cn } from '../../../lib/utils'
import { t } from '../../../i18n'
import { ClauseText } from '../CatalogueTabs'
import { GUTTER_TOKENS } from '../data'
import { OBLIGATION_FORMS, bySort, nextSort, swapOrder, useCatalogueApi } from './shared'
import { ActiveButton, InactiveBadge } from './ui'

export function ApiWorkLinesTab() {
  const { slug, uuid, cat, canEdit, canDelete, busy, run, remove, companyPicker } = useCatalogueApi()
  const sections = bySort(cat.scope_sections)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null)
  const [newSection, setNewSection] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [filled, setFilled] = useState(false)
  const section: CatalogueScopeSection | undefined = sections.find((s) => s.id === activeId) ?? sections[0]
  const lines = section ? bySort(section.items) : []
  const hasTokens = slug === 'sg'
  const total = sections.reduce((n, s) => n + s.items.length, 0)

  const add = async () => {
    const text = draft.trim()
    if (!section || !text) return
    if (await run(() => api.createCatalogueRow('scope-items', section.id, { text, sort_order: nextSort(section.items) }), t('Ligne ajoutée au catalogue'))) setDraft('')
  }
  const saveEdit = async () => {
    if (!editing) return
    const text = editing.text.trim()
    const before = lines.find((l) => l.id === editing.id)?.text
    if (text && text !== before && !(await run(() => api.updateCatalogueRow('scope-items', editing.id, { text }), t('Clause modifiée')))) return
    setEditing(null)
  }
  const move = (all: { id: string; sort_order: number }[], key: 'scope-items' | 'scope-sections', a: string, b: string) => {
    const changes = swapOrder(all, a, b)
    if (changes.length) void run(() => Promise.all(changes.map((c) => api.updateCatalogueRow(key, c.id, { sort_order: c.sort_order }))))
  }
  const toggleLine = (l: CatalogueScopeItem) => run(() => api.updateCatalogueRow('scope-items', l.id, { is_active: !l.is_active }), l.is_active ? t('Clause désactivée') : t('Clause réactivée'))
  const removeLine = (l: CatalogueScopeItem) =>
    remove('scope-items', l.id, { title: t('Supprimer cette clause?'), body: <span className="italic">{l.text}</span>, done: t('Clause supprimée') })

  const addSection = async () => {
    const name = (newSection ?? '').trim()
    if (!name) return setNewSection(null)
    let created: CatalogueScopeSection | undefined
    const ok = await run(async () => {
      created = await api.createCatalogueRow<CatalogueScopeSection>('scope-sections', uuid, { name, sort_order: nextSort(sections) })
    }, t('Section ajoutée'))
    if (ok) {
      setNewSection(null)
      if (created) setActiveId(created.id)
    }
  }
  const renameSection = async () => {
    if (!section || renaming === null) return
    const name = renaming.trim()
    if (name && name !== section.name && !(await run(() => api.updateCatalogueRow('scope-sections', section.id, { name }), t('Section renommée')))) return
    setRenaming(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        {companyPicker}
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
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => (setActiveId(s.id), setEditing(null), setRenaming(null))}
              className={cn('flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm text-left whitespace-nowrap lg:whitespace-normal', section?.id === s.id ? 'bg-primary-wash text-primary-press font-semibold' : 'text-ink-mute hover:bg-sand hover:text-ink', !s.is_active && 'opacity-60')}
            >
              <span className="lg:line-clamp-2">{s.name}</span>
              <span className="tnum text-2xs">{s.items.length}</span>
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
                  void addSection()
                }}
              >
                <input className="form-input h-8" autoFocus maxLength={150} value={newSection} onChange={(e) => setNewSection(e.target.value)} placeholder={t('Nom de la section')} aria-label={t('Nom de la section')} />
                <button className="btn btn-sm btn-secondary" aria-label={t('Ajouter')} disabled={busy}>
                  <Check className="w-4 h-4" />
                </button>
              </form>
            ))}
        </nav>
        <Card
          title={
            section ? (
              renaming !== null ? (
                <form
                  className="flex gap-1"
                  onSubmit={(e) => {
                    e.preventDefault()
                    void renameSection()
                  }}
                >
                  <input className="form-input h-8" autoFocus maxLength={150} value={renaming} onChange={(e) => setRenaming(e.target.value)} aria-label={t('Nom de la section')} />
                  <button className="btn btn-sm btn-primary" aria-label={t('Enregistrer')} disabled={busy}>
                    <Check className="w-4 h-4" />
                  </button>
                  <button type="button" className="btn btn-sm btn-ghost" aria-label={t('Annuler')} onClick={() => setRenaming(null)}>
                    <X className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <span className={cn('inline-flex items-center gap-2', !section.is_active && 'opacity-60')}>
                  {section.name}
                  {!section.is_active && <InactiveBadge />}
                </span>
              )
            ) : undefined
          }
          icon={ListChecks}
          pad={false}
          actions={
            canEdit && section && renaming === null ? (
              <span className="flex items-center gap-0.5">
                <button aria-label={t('Monter la section')} disabled={busy || sections[0]?.id === section.id} onClick={() => move(sections, 'scope-sections', section.id, sections[sections.indexOf(section) - 1].id)} className="p-1.5 rounded-md hover:bg-stone disabled:opacity-30">
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button aria-label={t('Descendre la section')} disabled={busy || sections[sections.length - 1]?.id === section.id} onClick={() => move(sections, 'scope-sections', section.id, sections[sections.indexOf(section) + 1].id)} className="p-1.5 rounded-md hover:bg-stone disabled:opacity-30">
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button aria-label={t('Renommer la section')} disabled={busy} onClick={() => setRenaming(section.name)} className="p-1.5 rounded-md hover:bg-stone">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <ActiveButton
                  active={section.is_active}
                  disabled={busy}
                  onClick={() => void run(() => api.updateCatalogueRow('scope-sections', section.id, { is_active: !section.is_active }), section.is_active ? t('Section désactivée') : t('Section réactivée'))}
                />
                {canDelete && (
                  <button
                    aria-label={t('Supprimer la section')}
                    disabled={busy}
                    onClick={() =>
                      void remove('scope-sections', section.id, {
                        title: t('Supprimer la section « {s} »?', { s: section.name }),
                        body: t('Ses {n} clauses sont supprimées avec elle. Les soumissions existantes gardent leur texte.', { n: section.items.length }),
                        done: t('Section supprimée'),
                      })
                    }
                    className="p-1.5 rounded-md hover:bg-tone-critical-soft hover:text-tone-critical-ink"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </span>
            ) : undefined
          }
        >
          {!section || lines.length === 0 ? (
            <Empty icon={ListChecks} title={sections.length === 0 ? t('Aucune section') : t('Aucune clause dans cette section')}>
              {canEdit ? (sections.length === 0 ? t('Ajoutez une section pour commencer.') : t('Ajoutez la première ci-dessous.')) : undefined}
            </Empty>
          ) : (
            <ul className="divide-y divide-hairline">
              {lines.map((line, i) => (
                <li key={line.id} className={cn('group flex items-center gap-2 px-4 py-2.5 hover:bg-sand/60', !line.is_active && 'opacity-60')}>
                  {editing?.id === line.id ? (
                    <form
                      className="flex-1 flex gap-2"
                      onSubmit={(e) => {
                        e.preventDefault()
                        void saveEdit()
                      }}
                    >
                      <input className="form-input h-8" autoFocus maxLength={5000} value={editing.text} onChange={(e) => setEditing({ id: line.id, text: e.target.value })} aria-label={t('Clause')} />
                      <button className="btn btn-sm btn-primary" aria-label={t('Enregistrer')} disabled={busy}>
                        <Check className="w-4 h-4" />
                      </button>
                      <button type="button" className="btn btn-sm btn-ghost" aria-label={t('Annuler')} onClick={() => setEditing(null)}>
                        <X className="w-4 h-4" />
                      </button>
                    </form>
                  ) : (
                    <>
                      <input
                        type="checkbox"
                        checked={line.is_checked_by_default}
                        disabled={!canEdit || busy}
                        title={t('Cochée par défaut sur les nouvelles soumissions')}
                        aria-label={t('Cochée par défaut sur les nouvelles soumissions')}
                        onChange={() => void run(() => api.updateCatalogueRow('scope-items', line.id, { is_checked_by_default: !line.is_checked_by_default }), line.is_checked_by_default ? t('Clause décochée par défaut') : t('Clause cochée par défaut'))}
                      />
                      <span className="flex-1 text-sm text-ink-secondary">
                        <ClauseText text={line.text} filled={filled} />
                      </span>
                      {!line.is_active && <InactiveBadge />}
                      {canEdit && (
                        <span className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100">
                          <button aria-label={t('Monter')} disabled={busy || i === 0} onClick={() => move(lines, 'scope-items', line.id, lines[i - 1].id)} className="p-1.5 rounded-md hover:bg-stone disabled:opacity-30">
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button aria-label={t('Descendre')} disabled={busy || i === lines.length - 1} onClick={() => move(lines, 'scope-items', line.id, lines[i + 1].id)} className="p-1.5 rounded-md hover:bg-stone disabled:opacity-30">
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button aria-label={t('Modifier')} onClick={() => setEditing({ id: line.id, text: line.text })} className="p-1.5 rounded-md hover:bg-stone">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <ActiveButton active={line.is_active} disabled={busy} onClick={() => void toggleLine(line)} />
                          {canDelete && (
                            <button aria-label={t('Supprimer')} disabled={busy} onClick={() => void removeLine(line)} className="p-1.5 rounded-md hover:bg-tone-critical-soft hover:text-tone-critical-ink">
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
                void add()
              }}
            >
              <input value={draft} maxLength={5000} onChange={(e) => setDraft(e.target.value)} placeholder={hasTokens ? t('Nouvelle clause… ex. {nb_descentes} descentes') : t('Nouvelle ligne de travaux…')} className="form-input" aria-label={t('Nouvelle ligne')} />
              <button className="btn btn-md btn-secondary" disabled={!draft.trim() || busy}>
                <Plus className="w-4 h-4" />
                {t('Ajouter')}
              </button>
            </form>
          )}
        </Card>
      </div>
      <WorkTypesCard />
    </div>
  )
}

/** Types de travaux of the company: name, obligation form (which obligations sheet the quote uses), active. */
function WorkTypesCard() {
  const { uuid, workTypes, canEdit, canDelete, busy, run, remove } = useCatalogueApi()
  const types = bySort(workTypes)
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null)
  const [draft, setDraft] = useState<{ name: string; form: ObligationForm }>({ name: '', form: 'pitched_roof' })
  const formLabel = (f: ObligationForm) => t(OBLIGATION_FORMS.find(([v]) => v === f)?.[1] ?? f)

  const rename = async (w: ApiWorkType) => {
    if (!renaming) return
    const name = renaming.name.trim()
    if (name && name !== w.name && !(await run(() => api.updateCatalogueRow('work-types', w.id, { name }), t('Type de travaux renommé'), { workTypes: true }))) return
    setRenaming(null)
  }
  const add = async () => {
    const name = draft.name.trim()
    if (!name) return toast(t('Entrez le nom.'))
    if (await run(() => api.createCatalogueRow('work-types', uuid, { name, obligation_form: draft.form, sort_order: nextSort(workTypes) }), t('Type de travaux ajouté'), { workTypes: true })) setDraft({ name: '', form: draft.form })
  }

  return (
    <Card title={t('Types de travaux')} icon={Wrench} pad={false}>
      {types.length === 0 ? (
        <Empty icon={Wrench} title={t('Aucun type de travaux')} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead className="bg-sand/60 border-b border-hairline">
              <tr>
                <th className="th">{t('Nom')}</th>
                <th className="th">{t('Fiche d’obligations')}</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {types.map((w) => (
                <tr key={w.id} className={cn('hover:bg-sand/60', !w.is_active && 'opacity-60')}>
                  <td className="td font-medium text-ink">
                    {renaming?.id === w.id ? (
                      <form
                        className="flex gap-1"
                        onSubmit={(e) => {
                          e.preventDefault()
                          void rename(w)
                        }}
                      >
                        <input className="form-input h-8" autoFocus maxLength={80} value={renaming.name} onChange={(e) => setRenaming({ id: w.id, name: e.target.value })} aria-label={t('Nom')} />
                        <button className="btn btn-sm btn-primary" aria-label={t('Enregistrer')} disabled={busy}>
                          <Check className="w-4 h-4" />
                        </button>
                        <button type="button" className="btn btn-sm btn-ghost" aria-label={t('Annuler')} onClick={() => setRenaming(null)}>
                          <X className="w-4 h-4" />
                        </button>
                      </form>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        {w.name}
                        {!w.is_active && <InactiveBadge />}
                      </span>
                    )}
                  </td>
                  <td className="td">
                    {canEdit ? (
                      <Dropdown
                        className="form-input h-8 text-xs w-44"
                        value={w.obligation_form}
                        disabled={busy}
                        aria-label={t('Fiche d’obligations')}
                        onChange={(e) => {
                          const obligation_form = e.target.value as ObligationForm
                          if (obligation_form !== w.obligation_form) void run(() => api.updateCatalogueRow('work-types', w.id, { obligation_form }), t('Type de travaux modifié'), { workTypes: true })
                        }}
                      >
                        {OBLIGATION_FORMS.map(([v, label]) => (
                          <option key={v} value={v}>
                            {t(label)}
                          </option>
                        ))}
                      </Dropdown>
                    ) : (
                      <span className="text-ink-mute">{formLabel(w.obligation_form)}</span>
                    )}
                  </td>
                  <td className="td text-right">
                    {canEdit && (
                      <span className="inline-flex items-center gap-0.5">
                        <button aria-label={t('Renommer')} disabled={busy} onClick={() => setRenaming({ id: w.id, name: w.name })} className="p-1.5 rounded-md hover:bg-stone">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <ActiveButton active={w.is_active} disabled={busy} onClick={() => void run(() => api.updateCatalogueRow('work-types', w.id, { is_active: !w.is_active }), w.is_active ? t('Type de travaux désactivé') : t('Type de travaux réactivé'), { workTypes: true })} />
                        {canDelete && (
                          <button
                            aria-label={t('Supprimer')}
                            disabled={busy}
                            onClick={() => void remove('work-types', w.id, { title: t('Supprimer le type « {name} »?', { name: w.name }), done: t('Type de travaux supprimé'), workTypes: true })}
                            className="p-1.5 rounded-md hover:bg-tone-critical-soft hover:text-tone-critical-ink"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {canEdit && (
        <form
          className="flex flex-wrap gap-2 p-3 border-t border-hairline bg-sand/40"
          onSubmit={(e) => {
            e.preventDefault()
            void add()
          }}
        >
          <input value={draft.name} maxLength={80} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder={t('Nouveau type de travaux…')} className="form-input flex-1 min-w-[12rem]" aria-label={t('Nouveau type de travaux')} />
          <Dropdown className="form-input w-44" value={draft.form} onChange={(e) => setDraft({ ...draft, form: e.target.value as ObligationForm })} aria-label={t('Fiche d’obligations')}>
            {OBLIGATION_FORMS.map(([v, label]) => (
              <option key={v} value={v}>
                {t(label)}
              </option>
            ))}
          </Dropdown>
          <button className="btn btn-md btn-secondary" disabled={!draft.name.trim() || busy}>
            <Plus className="w-4 h-4" />
            {t('Ajouter')}
          </button>
        </form>
      )}
    </Card>
  )
}
