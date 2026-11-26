/**
 * Catalogue → Expertises in API mode (expertise-items). One card per section (section_name), as in ExpertisesTab;
 * each line has its text, default status on new quotes, position, active switch. A section is the set of lines
 * sharing a section_name: adding one creates its first line, renaming it renames every line.
 */
import { useState } from 'react'
import { ArrowDown, ArrowUp, Check, Pencil, Plus, SearchCheck, Trash2, X } from 'lucide-react'
import * as api from '../../../api/endpoints'
import type { CatalogueExpertiseItem, ExpertiseStatus } from '../../../api/types'
import { Card, Empty, Field } from '../../../components/ui'
import { Dropdown } from '../../../components/dropdown'
import { toast } from '../../../lib/toast'
import { cn } from '../../../lib/utils'
import { t } from '../../../i18n'
import { AddOption } from '../CatalogueTabs'
import { bySort, nextSort, swapOrder, useCatalogueApi } from './shared'
import { ActiveButton, InactiveBadge } from './ui'

const STATUSES: [ExpertiseStatus | '', string][] = [
  ['', 'Aucun statut par défaut'],
  ['included', 'Inclus'],
  ['not_included', 'Non inclus'],
  ['to_verify', 'À vérifier'],
]

export function ApiExpertisesTab() {
  const { uuid, cat, canEdit, canDelete, busy, run, remove, companyPicker } = useCatalogueApi()
  const all = bySort(cat.expertise_items)
  // Sections in the order of their first line.
  const sections: { name: string; items: CatalogueExpertiseItem[] }[] = []
  for (const x of all) {
    const s = sections.find((g) => g.name === x.section_name)
    if (s) s.items.push(x)
    else sections.push({ name: x.section_name, items: [x] })
  }
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null)
  const [renaming, setRenaming] = useState<{ from: string; name: string } | null>(null)
  const [adding, setAdding] = useState<{ section: string; text: string } | null>(null)

  const addLine = (section: string, text: string) => run(() => api.createCatalogueRow('expertise-items', uuid, { section_name: section, text, sort_order: nextSort(all) }), t('Option ajoutée'))
  const saveEdit = async (x: CatalogueExpertiseItem) => {
    if (!editing) return
    const text = editing.text.trim()
    if (text && text !== x.text && !(await run(() => api.updateCatalogueRow('expertise-items', x.id, { text }), t('Option modifiée')))) return
    setEditing(null)
  }
  const rename = async (items: CatalogueExpertiseItem[]) => {
    if (!renaming) return
    const name = renaming.name.trim()
    if (name && name !== renaming.from && !(await run(() => Promise.all(items.map((x) => api.updateCatalogueRow('expertise-items', x.id, { section_name: name }))), t('Section renommée')))) return
    setRenaming(null)
  }
  const addSection = async () => {
    if (!adding) return
    const section = adding.section.trim()
    const text = adding.text.trim()
    if (!section || !text) return toast(t('Entrez le nom de la section et sa première option.'))
    if (await addLine(section, text)) setAdding(null)
  }
  const move = (a: string, b: string) => {
    const changes = swapOrder(all, a, b)
    if (changes.length) void run(() => Promise.all(changes.map((c) => api.updateCatalogueRow('expertise-items', c.id, { sort_order: c.sort_order }))))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        {companyPicker}
        {canEdit && adding === null && (
          <button className="btn btn-sm btn-secondary ml-auto" onClick={() => setAdding({ section: '', text: '' })}>
            <Plus className="w-4 h-4" />
            {t('Section')}
          </button>
        )}
      </div>
      {adding !== null && (
        <form
          className="bg-white rounded-xl shadow-card p-4 grid sm:grid-cols-[1fr_2fr_auto] gap-3 items-end"
          onSubmit={(e) => {
            e.preventDefault()
            void addSection()
          }}
        >
          <Field label={t('Nom de la section')}>
            <input className="form-input" autoFocus maxLength={150} value={adding.section} onChange={(e) => setAdding({ ...adding, section: e.target.value })} />
          </Field>
          <Field label={t('Première option')}>
            <input className="form-input" maxLength={5000} value={adding.text} onChange={(e) => setAdding({ ...adding, text: e.target.value })} />
          </Field>
          <span className="flex gap-2">
            <button type="button" className="btn btn-md btn-ghost" onClick={() => setAdding(null)}>
              {t('Annuler')}
            </button>
            <button className="btn btn-md btn-primary" disabled={busy}>
              {t('Ajouter')}
            </button>
          </span>
        </form>
      )}
      {sections.length === 0 ? (
        <div className="card">
          <Empty icon={SearchCheck} title={t('Aucune expertise')}>
            {canEdit ? t('Ajoutez une section pour commencer.') : undefined}
          </Empty>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {sections.map((sec) => (
            <Card
              key={sec.name}
              title={
                renaming?.from === sec.name ? (
                  <form
                    className="flex gap-1"
                    onSubmit={(e) => {
                      e.preventDefault()
                      void rename(sec.items)
                    }}
                  >
                    <input className="form-input h-8" autoFocus maxLength={150} value={renaming.name} onChange={(e) => setRenaming({ from: sec.name, name: e.target.value })} aria-label={t('Nom de la section')} />
                    <button className="btn btn-sm btn-primary" aria-label={t('Enregistrer')} disabled={busy}>
                      <Check className="w-4 h-4" />
                    </button>
                    <button type="button" className="btn btn-sm btn-ghost" aria-label={t('Annuler')} onClick={() => setRenaming(null)}>
                      <X className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  sec.name
                )
              }
              icon={SearchCheck}
              actions={
                canEdit &&
                renaming?.from !== sec.name && (
                  <span className="flex items-center gap-0.5">
                    <button className="btn btn-xs btn-ghost" aria-label={t('Renommer la section')} onClick={() => setRenaming({ from: sec.name, name: sec.name })}>
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <AddOption onAdd={(v) => void addLine(sec.name, v)} />
                  </span>
                )
              }
            >
              <ul className="space-y-1.5">
                {sec.items.map((x) => {
                  const i = sec.items.indexOf(x)
                  return (
                    <li key={x.id} className={cn('group flex items-center gap-2 text-sm text-ink-secondary', !x.is_active && 'opacity-60')}>
                      <span className="w-4 h-4 rounded border border-hairline-strong shrink-0" />
                      {editing?.id === x.id ? (
                        <form
                          className="flex-1 flex gap-1"
                          onSubmit={(e) => {
                            e.preventDefault()
                            void saveEdit(x)
                          }}
                        >
                          <input className="form-input h-7 text-xs" autoFocus maxLength={5000} value={editing.text} onChange={(e) => setEditing({ id: x.id, text: e.target.value })} aria-label={t('Option')} />
                          <button className="btn btn-xs btn-primary" aria-label={t('Enregistrer')} disabled={busy}>
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" className="btn btn-xs btn-ghost" aria-label={t('Annuler')} onClick={() => setEditing(null)}>
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      ) : (
                        <>
                          <span className="flex-1">{x.text}</span>
                          {!x.is_active && <InactiveBadge />}
                          {canEdit ? (
                            <Dropdown
                              className="form-input h-7 text-xs w-36"
                              value={x.default_status ?? ''}
                              disabled={busy}
                              title={t('Statut par défaut sur les nouvelles soumissions')}
                              aria-label={t('Statut par défaut sur les nouvelles soumissions')}
                              onChange={(e) => {
                                const v = e.target.value as ExpertiseStatus | ''
                                if (v !== (x.default_status ?? '')) void run(() => api.updateCatalogueRow('expertise-items', x.id, { default_status: v || null }), t('Statut par défaut modifié'))
                              }}
                            >
                              {STATUSES.map(([v, label]) => (
                                <option key={v} value={v}>
                                  {t(label)}
                                </option>
                              ))}
                            </Dropdown>
                          ) : (
                            x.default_status && <span className="text-2xs text-ink-mute">{t(STATUSES.find(([v]) => v === x.default_status)?.[1] ?? '')}</span>
                          )}
                          {canEdit && (
                            <span className="flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                              <button className="p-1 rounded hover:bg-stone disabled:opacity-30" aria-label={t('Monter')} disabled={busy || i === 0} onClick={() => move(x.id, sec.items[i - 1].id)}>
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button className="p-1 rounded hover:bg-stone disabled:opacity-30" aria-label={t('Descendre')} disabled={busy || i === sec.items.length - 1} onClick={() => move(x.id, sec.items[i + 1].id)}>
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button className="p-1 rounded hover:bg-stone" aria-label={t('Modifier')} onClick={() => setEditing({ id: x.id, text: x.text })}>
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <ActiveButton className="p-1" active={x.is_active} disabled={busy} onClick={() => void run(() => api.updateCatalogueRow('expertise-items', x.id, { is_active: !x.is_active }), x.is_active ? t('Option désactivée') : t('Option réactivée'))} />
                              {canDelete && (
                                <button
                                  className="p-1 rounded hover:bg-tone-critical-soft hover:text-tone-critical-ink"
                                  aria-label={t('Supprimer')}
                                  disabled={busy}
                                  onClick={() => void remove('expertise-items', x.id, { title: t('Supprimer l’option « {o} »?', { o: x.text }), done: t('Option supprimée') })}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </span>
                          )}
                        </>
                      )}
                    </li>
                  )
                })}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
