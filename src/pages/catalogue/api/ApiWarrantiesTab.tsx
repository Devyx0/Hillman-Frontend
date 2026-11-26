/**
 * Catalogue → Garanties in API mode: warranty groups (warranty-groups: name, « texte libre permis », active) and
 * their options (warranty-options: label, active), one card per group as in WarrantiesTab. Deleting a group or an
 * option that quotes use is refused by the server (409 IN_USE): it is offered to deactivate it instead.
 */
import { useState } from 'react'
import { ArrowDown, ArrowUp, Check, Pencil, Plus, ShieldCheck, Trash2, X } from 'lucide-react'
import * as api from '../../../api/endpoints'
import type { CatalogueWarrantyGroup, CatalogueWarrantyOption } from '../../../api/types'
import { Card, Empty } from '../../../components/ui'
import { toast } from '../../../lib/toast'
import { cn } from '../../../lib/utils'
import { t } from '../../../i18n'
import { AddOption } from '../CatalogueTabs'
import { Toggle } from '../settings/shared'
import { bySort, nextSort, swapOrder, useCatalogueApi } from './shared'
import { ActiveButton, InactiveBadge } from './ui'

export function ApiWarrantiesTab() {
  const { uuid, cat, canEdit, canDelete, busy, run, remove, companyPicker } = useCatalogueApi()
  const groups = bySort(cat.warranty_groups)
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null)
  const [editingOpt, setEditingOpt] = useState<{ id: string; label: string } | null>(null)
  const [newGroup, setNewGroup] = useState<string | null>(null)

  const addGroup = async () => {
    const name = (newGroup ?? '').trim()
    if (!name) return toast(t('Entrez le nom.'))
    if (await run(() => api.createCatalogueRow('warranty-groups', uuid, { name, allows_custom_text: false, sort_order: nextSort(groups) }), t('Garantie ajoutée'))) setNewGroup(null)
  }
  const renameGroup = async (g: CatalogueWarrantyGroup) => {
    if (!renaming) return
    const name = renaming.name.trim()
    if (name && name !== g.name && !(await run(() => api.updateCatalogueRow('warranty-groups', g.id, { name }), t('Garantie renommée')))) return
    setRenaming(null)
  }
  const saveOption = async (o: CatalogueWarrantyOption) => {
    if (!editingOpt) return
    const label = editingOpt.label.trim()
    if (label && label !== o.label && !(await run(() => api.updateCatalogueRow('warranty-options', o.id, { label }), t('Option modifiée')))) return
    setEditingOpt(null)
  }
  const moveGroup = (a: string, b: string) => {
    const changes = swapOrder(groups, a, b)
    if (changes.length) void run(() => Promise.all(changes.map((c) => api.updateCatalogueRow('warranty-groups', c.id, { sort_order: c.sort_order }))))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        {companyPicker}
        {canEdit &&
          (newGroup === null ? (
            <button className="btn btn-sm btn-secondary ml-auto" onClick={() => setNewGroup('')}>
              <Plus className="w-4 h-4" />
              {t('Garantie')}
            </button>
          ) : (
            <form
              className="flex gap-1 ml-auto"
              onSubmit={(e) => {
                e.preventDefault()
                void addGroup()
              }}
            >
              <input className="form-input h-8 w-64" autoFocus maxLength={150} value={newGroup} onChange={(e) => setNewGroup(e.target.value)} placeholder={t('Nom de la garantie')} aria-label={t('Nom de la garantie')} />
              <button className="btn btn-sm btn-primary" aria-label={t('Ajouter')} disabled={busy}>
                <Check className="w-4 h-4" />
              </button>
              <button type="button" className="btn btn-sm btn-ghost" aria-label={t('Annuler')} onClick={() => setNewGroup(null)}>
                <X className="w-4 h-4" />
              </button>
            </form>
          ))}
      </div>
      {groups.length === 0 ? (
        <div className="card">
          <Empty icon={ShieldCheck} title={t('Aucune garantie')} />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g, gi) => {
            const options = bySort(g.options)
            return (
              <Card
                key={g.id}
                className={cn(!g.is_active && 'opacity-60')}
                title={
                  renaming?.id === g.id ? (
                    <form
                      className="flex gap-1"
                      onSubmit={(e) => {
                        e.preventDefault()
                        void renameGroup(g)
                      }}
                    >
                      <input className="form-input h-8" autoFocus maxLength={150} value={renaming.name} onChange={(e) => setRenaming({ id: g.id, name: e.target.value })} aria-label={t('Nom de la garantie')} />
                      <button className="btn btn-sm btn-primary" aria-label={t('Enregistrer')} disabled={busy}>
                        <Check className="w-4 h-4" />
                      </button>
                      <button type="button" className="btn btn-sm btn-ghost" aria-label={t('Annuler')} onClick={() => setRenaming(null)}>
                        <X className="w-4 h-4" />
                      </button>
                    </form>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      {g.name}
                      {!g.is_active && <InactiveBadge />}
                    </span>
                  )
                }
                actions={
                  canEdit &&
                  renaming?.id !== g.id && (
                    <AddOption onAdd={(label) => void run(() => api.createCatalogueRow('warranty-options', g.id, { label, sort_order: nextSort(g.options) }), t('Option ajoutée'))} />
                  )
                }
              >
                <div className="flex flex-wrap gap-1.5">
                  {options.length === 0 && <p className="text-xs text-ink-mute">{t('Aucune option')}</p>}
                  {options.map((o) =>
                    editingOpt?.id === o.id ? (
                      <form
                        key={o.id}
                        className="flex gap-1"
                        onSubmit={(e) => {
                          e.preventDefault()
                          void saveOption(o)
                        }}
                      >
                        <input className="form-input h-7 w-40 text-xs" autoFocus maxLength={200} value={editingOpt.label} onChange={(e) => setEditingOpt({ id: o.id, label: e.target.value })} aria-label={t('Option')} />
                        <button className="btn btn-xs btn-primary" aria-label={t('Enregistrer')} disabled={busy}>
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" className="btn btn-xs btn-ghost" aria-label={t('Annuler')} onClick={() => setEditingOpt(null)}>
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    ) : (
                      <span key={o.id} className={cn('inline-flex items-center gap-1 text-xs font-medium pl-2.5 pr-1.5 py-1 rounded-md bg-sand text-ink-secondary', !o.is_active && 'opacity-60 line-through')}>
                        {o.label}
                        {canEdit && (
                          <>
                            <button className="p-0.5 rounded hover:bg-stone" aria-label={t('Modifier')} onClick={() => setEditingOpt({ id: o.id, label: o.label })}>
                              <Pencil className="w-3 h-3" />
                            </button>
                            <ActiveButton className="p-0.5" active={o.is_active} disabled={busy} onClick={() => void run(() => api.updateCatalogueRow('warranty-options', o.id, { is_active: !o.is_active }), o.is_active ? t('Option désactivée') : t('Option réactivée'))} />
                          </>
                        )}
                        {canDelete && (
                          <button className="p-0.5 rounded hover:bg-stone" aria-label={t('Supprimer')} disabled={busy} onClick={() => void remove('warranty-options', o.id, { title: t('Supprimer l’option « {o} »?', { o: o.label }), done: t('Option supprimée') })}>
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ),
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-hairline">
                  <label className="flex items-center gap-2 text-xs text-ink-secondary">
                    <Toggle
                      on={g.allows_custom_text}
                      disabled={!canEdit || busy}
                      label={t('Texte libre permis')}
                      onChange={(on) => void run(() => api.updateCatalogueRow('warranty-groups', g.id, { allows_custom_text: on }), on ? t('Texte libre permis') : t('Texte libre retiré'))}
                    />
                    {t('Texte libre permis')}
                  </label>
                  {canEdit && renaming?.id !== g.id && (
                    <span className="flex items-center gap-0.5">
                      <button className="p-1.5 rounded-md hover:bg-stone disabled:opacity-30" aria-label={t('Monter')} disabled={busy || gi === 0} onClick={() => moveGroup(g.id, groups[gi - 1].id)}>
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1.5 rounded-md hover:bg-stone disabled:opacity-30" aria-label={t('Descendre')} disabled={busy || gi === groups.length - 1} onClick={() => moveGroup(g.id, groups[gi + 1].id)}>
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1.5 rounded-md hover:bg-stone" aria-label={t('Renommer')} onClick={() => setRenaming({ id: g.id, name: g.name })}>
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <ActiveButton active={g.is_active} disabled={busy} onClick={() => void run(() => api.updateCatalogueRow('warranty-groups', g.id, { is_active: !g.is_active }), g.is_active ? t('Garantie désactivée') : t('Garantie réactivée'))} />
                      {canDelete && (
                        <button
                          className="p-1.5 rounded-md hover:bg-tone-critical-soft hover:text-tone-critical-ink"
                          aria-label={t('Supprimer')}
                          disabled={busy}
                          onClick={() => void remove('warranty-groups', g.id, { title: t('Supprimer la garantie « {name} »?', { name: g.name }), body: t('Ses options sont supprimées avec elle.'), done: t('Garantie supprimée') })}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </span>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
