/**
 * Catalogue → Modèles in API mode: the company's quote templates (read with the catalogue) and their editor.
 * A template is a name, an optional work type, an active switch and lines, each aiming at one catalogue row:
 * a clause checked (scope_item_id), a cost item with its default quantity (cost_item_id + quantity, empty = entered
 * on the quote) or an add-on (addon_preset_id + is_included). POST /companies/:id/quote-templates,
 * PATCH /quote-templates/:id (items replaces every line), POST …/duplicate, DELETE (admin).
 *
 * No API yet, kept as in mock mode (in memory, this device only): the default warranties and notes of a template.
 */
import { useMemo, useState } from 'react'
import { Copy, Eye, LayoutTemplate, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import * as api from '../../../api/endpoints'
import { errorMessage } from '../../../api/http'
import { toNum } from '../../../api/mappers'
import type { ApiQuoteTemplate, CatalogueCostItem, CatalogueTemplateItem, TemplateItemBody, Uuid } from '../../../api/types'
import { CompanyBadge, Drawer, Empty, Field } from '../../../components/ui'
import { Dropdown } from '../../../components/dropdown'
import { Notice, confirmAction } from '../../../components/states'
import { COMPANIES } from '../../../data/mock'
import { toast } from '../../../lib/toast'
import { cn, money, normalize, pct } from '../../../lib/utils'
import { t } from '../../../i18n'
import { ClauseText } from '../CatalogueTabs'
import { Toggle } from '../settings/shared'
import { QTY_RE, bySort, cleanDecimal, decimalText, useCatalogueApi, type CatalogueApi } from './shared'
import { InactiveBadge, Spinner } from './ui'

type Line = Omit<CatalogueTemplateItem, 'template_id'>
interface Tpl {
  id: Uuid
  name: string
  work_type_id: Uuid | null
  is_active: boolean
  items: Line[]
}

/** Default warranties (group id → option id) and notes of a template: no API yet, kept for the session. */
const TEMPLATE_LOCAL = new Map<string, { warranties: Record<string, string>; notes: string }>()
/** The server accepts at most 500 lines per template. */
const MAX_LINES = 500

const blank: Tpl = { id: '', name: '', work_type_id: null, is_active: true, items: [] }

/** Catalogue lookups by id (cost items with their category name). */
function useIndex(cat: CatalogueApi['cat']) {
  return useMemo(() => {
    const costs = new Map<string, CatalogueCostItem & { categoryName: string; usable: boolean }>()
    for (const g of cat.cost_general_categories)
      for (const c of g.categories) for (const it of c.items) costs.set(it.id, { ...it, categoryName: c.name, usable: g.is_active && c.is_active && it.is_active })
    return {
      costs,
      addons: new Map(cat.addon_presets.map((a) => [a.id, a])),
    }
  }, [cat])
}

/** Sell total (cost lines with a quantity × catalogue sell price) and margin when costs are known. */
function totalsOf(items: { cost_item_id: string | null; quantity: string | null }[], costs: ReturnType<typeof useIndex>['costs']) {
  let sell = 0
  let cost = 0
  let costKnown = true
  for (const l of items) {
    if (!l.cost_item_id || l.quantity == null) continue
    const it = costs.get(l.cost_item_id)
    if (!it) continue
    const q = toNum(l.quantity)
    sell += toNum(it.sell_price) * q
    if (it.cost_price == null) costKnown = false
    else cost += toNum(it.cost_price) * q
  }
  return { sell, margin: costKnown && sell > 0 ? ((sell - cost) / sell) * 100 : null }
}

export function ApiTemplatesTab() {
  const { slug, cat, workTypes, canEdit, canDelete, showCosts, busy, run, companyPicker } = useCatalogueApi()
  const index = useIndex(cat)
  const list = bySort(cat.quote_templates)
  const [editing, setEditing] = useState<Tpl | null>(null)

  const duplicate = async (tpl: Tpl) => {
    let copy: ApiQuoteTemplate | undefined
    const ok = await run(async () => {
      copy = await api.duplicateQuoteTemplate(tpl.id)
    }, t('Modèle dupliqué'))
    if (!ok || !copy) return
    const local = TEMPLATE_LOCAL.get(tpl.id)
    if (local) TEMPLATE_LOCAL.set(copy.id, structuredClone(local))
    setEditing(copy)
  }
  const remove = async (tpl: Tpl) => {
    if (!(await confirmAction({ title: t('Supprimer le modèle « {name} »?', { name: tpl.name }), body: t('Les soumissions déjà créées avec ce modèle ne changent pas. Cette action est définitive.'), confirmLabel: t('Supprimer'), danger: true }))) return
    if (await run(() => api.deleteQuoteTemplate(tpl.id), t('Modèle supprimé'))) TEMPLATE_LOCAL.delete(tpl.id)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        {companyPicker}
        {canEdit && (
          <button className="btn btn-sm btn-primary ml-auto" onClick={() => setEditing(blank)}>
            <Plus className="w-4 h-4" />
            {t('Nouveau modèle')}
          </button>
        )}
      </div>
      {list.length === 0 ? (
        <div className="card">
          <Empty icon={LayoutTemplate} title={t('Aucun modèle')}>
            {canEdit ? t('Créez un modèle pour pré-remplir les soumissions courantes.') : undefined}
          </Empty>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((tpl) => {
            const clauses = tpl.items.filter((i) => i.scope_item_id).length
            const costLines = tpl.items.filter((i) => i.cost_item_id).length
            const addons = tpl.items.filter((i) => i.addon_preset_id).length
            const totals = totalsOf(tpl.items, index.costs)
            const wt = workTypes.find((w) => w.id === tpl.work_type_id)
            return (
              <div key={tpl.id} className={cn('bg-white rounded-xl shadow-card p-5 flex flex-col gap-3', !tpl.is_active && 'opacity-60')}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <CompanyBadge id={slug} />
                    <span className="text-2xs text-ink-mute">{wt ? wt.name : t('Tous les types de travaux')}</span>
                    {!tpl.is_active && <InactiveBadge />}
                  </div>
                  <p className="text-md font-semibold truncate">{tpl.name}</p>
                  <p className="text-xs text-ink-mute mt-0.5 tnum">{t('{lines} lignes · {items} items', { lines: clauses, items: costLines })}</p>
                </div>
                <dl className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <dt className="text-ink-mute">{t('Vendant estimé')}</dt>
                    <dd className="font-semibold tnum">{money(totals.sell, false)}</dd>
                  </div>
                  {showCosts && (
                    <div>
                      <dt className="text-ink-mute">{t('Marge')}</dt>
                      <dd className="font-semibold tnum">{totals.margin === null ? '—' : pct(totals.margin)}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-ink-mute">{t('Ajouts')}</dt>
                    <dd className="font-semibold tnum">{addons}</dd>
                  </div>
                </dl>
                <div className="flex items-center gap-1 mt-auto pt-1">
                  <button className="btn btn-xs btn-secondary" onClick={() => setEditing(tpl)}>
                    {canEdit ? <Pencil className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {canEdit ? t('Modifier') : t('Voir')}
                  </button>
                  {canEdit && (
                    <>
                      <button className="btn btn-xs btn-ghost" disabled={busy} onClick={() => void duplicate(tpl)}>
                        <Copy className="w-3.5 h-3.5" />
                        {t('Dupliquer')}
                      </button>
                      {!tpl.is_active && (
                        <button className="btn btn-xs btn-ghost text-primary-press" disabled={busy} onClick={() => void run(() => api.updateQuoteTemplate(tpl.id, { is_active: true }), t('Modèle réactivé'))}>
                          {t('Réactiver')}
                        </button>
                      )}
                      {canDelete && (
                        <button className="p-1.5 rounded-md hover:bg-tone-critical-soft hover:text-tone-critical-ink ml-auto" aria-label={t('Supprimer')} disabled={busy} onClick={() => void remove(tpl)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
      {editing && <TemplateEditor key={editing.id || 'new'} initial={editing} readOnly={!canEdit} onClose={() => setEditing(null)} />}
    </div>
  )
}

function TemplateEditor({ initial, readOnly, onClose }: { initial: Tpl; readOnly: boolean; onClose: () => void }) {
  const { slug, uuid, cat, workTypes, showCosts, refresh } = useCatalogueApi()
  const index = useIndex(cat)
  const isNew = !initial.id
  const local = TEMPLATE_LOCAL.get(initial.id)
  const [name, setName] = useState(initial.name)
  const [workTypeId, setWorkTypeId] = useState(initial.work_type_id ?? '')
  const [active, setActive] = useState(initial.is_active)
  const [checked, setChecked] = useState<Set<string>>(() => new Set(initial.items.flatMap((i) => (i.scope_item_id ? [i.scope_item_id] : []))))
  const [costs, setCosts] = useState<{ id: string; qty: string }[]>(() => initial.items.flatMap((i) => (i.cost_item_id ? [{ id: i.cost_item_id, qty: decimalText(i.quantity) }] : [])))
  const [addons, setAddons] = useState<{ id: string; included: boolean }[]>(() => initial.items.flatMap((i) => (i.addon_preset_id ? [{ id: i.addon_preset_id, included: i.is_included }] : [])))
  const [warranties, setWarranties] = useState<Record<string, string>>(() => ({ ...(local?.warranties ?? {}) }))
  const [notes, setNotes] = useState(local?.notes ?? '')
  const [query, setQuery] = useState('')
  const [addItem, setAddItem] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const companyName = COMPANIES.find((c) => c.id === slug)?.name ?? ''

  const q = normalize(query.trim())
  const sections = bySort(cat.scope_sections)
  const totals = totalsOf(
    costs.map((c) => {
      const v = cleanDecimal(c.qty)
      return { cost_item_id: c.id, quantity: QTY_RE.test(v) ? v : null }
    }),
    index.costs,
  )
  const toggle = (id: string) =>
    setChecked((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  const toggleSection = (ids: string[], on: boolean) =>
    setChecked((s) => {
      const n = new Set(s)
      for (const id of ids) {
        if (on) n.add(id)
        else n.delete(id)
      }
      return n
    })

  const save = async () => {
    const n = name.trim()
    if (!n) return setError(t('Donnez un nom au modèle'))
    const lines: TemplateItemBody[] = []
    for (const s of sections) for (const i of bySort(s.items)) if (checked.has(i.id)) lines.push({ scope_item_id: i.id })
    for (const c of costs) {
      const v = cleanDecimal(c.qty)
      if (v !== '' && !(QTY_RE.test(v) && Number(v) > 0)) return setError(t('Chaque item doit avoir une quantité supérieure à 0'))
      lines.push({ cost_item_id: c.id, quantity: v === '' ? null : v })
    }
    for (const a of addons) lines.push({ addon_preset_id: a.id, is_included: a.included })
    if (lines.length > MAX_LINES) return setError(t('Un modèle compte au plus {n} lignes.', { n: MAX_LINES }))
    setError('')
    setSaving(true)
    try {
      const body = { name: n, work_type_id: workTypeId || null, is_active: active, items: lines }
      const saved = isNew ? await api.createQuoteTemplate(uuid, body) : await api.updateQuoteTemplate(initial.id, body)
      TEMPLATE_LOCAL.set(saved.id, { warranties, notes: notes.trim() })
      toast(t('Modèle enregistré'))
      await refresh()
      onClose()
    } catch (e) {
      setError(errorMessage(e))
      setSaving(false)
    }
  }

  const costGroups = cat.cost_general_categories
    .filter((g) => g.is_active)
    .map((g) => ({
      label: g.name,
      options: g.categories.filter((c) => c.is_active).flatMap((c) => c.items.filter((it) => it.is_active && !costs.some((x) => x.id === it.id)).map((it) => ({ value: it.id, label: `${c.name} · ${it.name}` }))),
    }))
    .filter((g) => g.options.length > 0)
  const addonRows = bySort(cat.addon_presets).filter((a) => a.is_active || addons.some((x) => x.id === a.id))
  const warrantyGroups = bySort(cat.warranty_groups).filter((g) => g.is_active)

  return (
    <Drawer open onClose={onClose} width="max-w-3xl" title={readOnly ? initial.name : isNew ? t('Nouveau modèle de soumission') : t('Modifier le modèle')}>
      <fieldset disabled={readOnly || saving} className="p-5 space-y-6 min-w-0">
        <section className="grid sm:grid-cols-3 gap-3">
          <Field label={t('Nom du modèle')} className="sm:col-span-3">
            <input className="form-input" maxLength={150} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('ex. Bardeaux · bungalow')} autoFocus={!readOnly} />
          </Field>
          <Field label={t('Compagnie')}>
            <input className="form-input" value={companyName} disabled readOnly aria-label={t('Compagnie')} />
          </Field>
          <Field label={t('Type de travaux')}>
            <Dropdown className="form-input" value={workTypeId} disabled={readOnly || saving} onChange={(e) => setWorkTypeId(e.target.value)} aria-label={t('Type de travaux')}>
              <option value="">{t('Tous les types de travaux')}</option>
              {bySort(workTypes)
                .filter((w) => w.is_active || w.id === workTypeId)
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.is_active ? w.name : `${w.name} (${t('inactif')})`}
                  </option>
                ))}
            </Dropdown>
          </Field>
          <Field label={t('Actif')}>
            <span className="flex items-center gap-2 h-10 text-sm text-ink-secondary">
              <Toggle on={active} onChange={setActive} disabled={readOnly || saving} label={t('Modèle actif')} />
              {active ? t('Proposé sur les nouvelles soumissions') : t('Masqué des nouvelles soumissions')}
            </span>
          </Field>
        </section>

        <section>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h4 className="text-sm font-semibold text-ink flex-1">{t('Lignes de travaux cochées ({n})', { n: checked.size })}</h4>
            <label className="relative w-full sm:w-56">
              <Search className="w-4 h-4 text-ink-faint absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input className="form-input h-8 pl-8" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Filtrer les clauses')} aria-label={t('Filtrer les clauses')} />
            </label>
          </div>
          <div className="rounded-lg border border-hairline divide-y divide-hairline max-h-[50vh] overflow-y-auto">
            {sections.map((s) => {
              const lines = bySort(s.items).filter((l) => ((s.is_active && l.is_active) || checked.has(l.id)) && (!q || normalize(l.text).includes(q)))
              if (lines.length === 0) return null
              const all = lines.every((l) => checked.has(l.id))
              return (
                <div key={s.id} className="px-3 py-2">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="label-caps">{s.name}</p>
                    {!readOnly && (
                      <button
                        type="button"
                        className="text-2xs font-semibold text-primary-press hover:underline"
                        onClick={() =>
                          toggleSection(
                            lines.map((l) => l.id),
                            !all,
                          )
                        }
                      >
                        {all ? t('Tout décocher') : t('Tout cocher')}
                      </button>
                    )}
                  </div>
                  <ul className="space-y-1">
                    {lines.map((l) => (
                      <li key={l.id} className={cn(!(s.is_active && l.is_active) && 'opacity-60')}>
                        <label className="flex items-start gap-2 text-sm text-ink-secondary cursor-pointer">
                          <input type="checkbox" className="mt-1" checked={checked.has(l.id)} onChange={() => toggle(l.id)} />
                          <span>
                            <ClauseText text={l.text} />
                            {!(s.is_active && l.is_active) && <InactiveBadge />}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </section>

        <section>
          <h4 className="text-sm font-semibold text-ink mb-2">{t('Items coûtants')}</h4>
          {costs.length === 0 ? (
            <p className="text-sm text-ink-mute">{t('Aucun item : les quantités seront saisies sur la soumission.')}</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-hairline">
              <table className="w-full text-sm min-w-[480px]">
                <thead className="bg-sand/60 border-b border-hairline">
                  <tr>
                    <th className="th">{t('Item')}</th>
                    <th className="th text-right">{t('Quantité')}</th>
                    <th className="th text-right">{t('Vendant')}</th>
                    <th className="th" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {costs.map((c, i) => {
                    const it = index.costs.get(c.id)
                    const v = cleanDecimal(c.qty)
                    return (
                      <tr key={c.id} className={cn(it && !it.usable && 'opacity-60')}>
                        <td className="td">
                          {it ? (
                            <span className="inline-flex items-center gap-2">
                              {it.name}
                              {!it.usable && <InactiveBadge />}
                            </span>
                          ) : (
                            <span className="text-tone-critical-ink">{t('Item supprimé du catalogue')}</span>
                          )}
                        </td>
                        <td className="td text-right">
                          <span className="inline-flex items-center gap-1">
                            <input className="form-input h-8 w-20 text-right tnum" inputMode="decimal" value={c.qty} placeholder="—" title={t('Vide : la quantité est saisie sur la soumission')} onChange={(e) => setCosts(costs.map((x, k) => (k === i ? { ...x, qty: e.target.value } : x)))} aria-label={t('Quantité')} />
                            <span className="text-xs text-ink-mute w-10 text-left">{it?.unit ? t(it.unit) : ''}</span>
                          </span>
                        </td>
                        <td className="td text-right tnum">{it && v !== '' && QTY_RE.test(v) ? money(toNum(it.sell_price) * Number(v)) : '—'}</td>
                        <td className="td text-right">
                          {!readOnly && (
                            <button type="button" className="p-1.5 rounded-md hover:bg-tone-critical-soft hover:text-tone-critical-ink" aria-label={t('Retirer')} onClick={() => setCosts(costs.filter((_, k) => k !== i))}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {!readOnly && costGroups.length > 0 && (
            <div className="flex gap-2 mt-2">
              <Dropdown className="form-input flex-1" value={addItem} onChange={(e) => setAddItem(e.target.value)} aria-label={t('Choisir un item du catalogue…')}>
                <option value="">{t('Choisir un item du catalogue…')}</option>
                {costGroups.map((g) => (
                  <optgroup key={g.label} label={g.label}>
                    {g.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Dropdown>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                disabled={!addItem}
                onClick={() => {
                  setCosts([...costs, { id: addItem, qty: '1' }])
                  setAddItem('')
                }}
              >
                <Plus className="w-4 h-4" />
                {t('Ajouter')}
              </button>
            </div>
          )}
          {costs.length > 0 && (
            <p className="text-sm text-ink-secondary mt-2 tnum">
              {t('Total au prix de vente : {n}', { n: money(totals.sell, false) })}
              {showCosts && totals.margin !== null && ` · ${t('marge {n}', { n: pct(totals.margin) })}`}
            </p>
          )}
        </section>

        <section>
          <h4 className="text-sm font-semibold text-ink mb-2">{t('Ajouts et options')}</h4>
          {addonRows.length === 0 ? (
            <p className="text-sm text-ink-mute">{t('Aucun ajout dans le catalogue.')}</p>
          ) : (
            <ul className="rounded-lg border border-hairline divide-y divide-hairline">
              {addonRows.map((a) => {
                const sel = addons.find((x) => x.id === a.id)
                return (
                  <li key={a.id} className={cn('flex flex-wrap items-center gap-3 px-3 py-2 text-sm', !a.is_active && 'opacity-60')}>
                    <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer text-ink-secondary">
                      <input type="checkbox" checked={!!sel} onChange={() => setAddons(sel ? addons.filter((x) => x.id !== a.id) : [...addons, { id: a.id, included: false }])} />
                      <span className="truncate">{a.description}</span>
                      {a.option_group && <span className="text-2xs text-ink-mute">({a.option_group})</span>}
                      {!a.is_active && <InactiveBadge />}
                    </label>
                    <span className="tnum text-xs text-ink-mute">{money(toNum(a.default_amount))}</span>
                    {sel && (
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-ink-secondary">
                        <input type="checkbox" checked={sel.included} onChange={(e) => setAddons(addons.map((x) => (x.id === a.id ? { ...x, included: e.target.checked } : x)))} />
                        {t('Inclus dans le prix')}
                      </label>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section>
          <h4 className="text-sm font-semibold text-ink mb-2">{t('Garanties par défaut')}</h4>
          <div className="space-y-3">
            {warrantyGroups.map((g) => (
              <div key={g.id}>
                <p className="label-caps mb-1">{g.name}</p>
                <div className="flex flex-wrap gap-1.5">
                  {bySort(g.options)
                    .filter((o) => o.is_active)
                    .map((o) => {
                      const on = warranties[g.id] === o.id
                      return (
                        <button
                          type="button"
                          key={o.id}
                          aria-pressed={on}
                          onClick={() => {
                            const w = { ...warranties }
                            if (on) delete w[g.id]
                            else w[g.id] = o.id
                            setWarranties(w)
                          }}
                          className={cn('px-2.5 py-1 rounded-md text-xs font-medium border', on ? 'bg-primary-wash border-primary text-primary-press' : 'border-hairline text-ink-secondary hover:border-hairline-strong')}
                        >
                          {o.label}
                        </button>
                      )
                    })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <Field label={t('Notes par défaut (imprimées sur la soumission)')}>
          <textarea rows={3} className="form-input h-auto py-2 text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <p className="text-2xs text-ink-mute -mt-4">{t('Les garanties et les notes par défaut restent sur cet appareil pour l’instant : elles ne sont pas encore enregistrées sur le serveur.')}</p>

        {error && <Notice tone="critical">{error}</Notice>}
      </fieldset>
      <div className="sticky bottom-0 bg-white border-t border-hairline px-5 py-3 flex justify-end gap-2">
        <button className="btn btn-sm btn-ghost" onClick={onClose}>
          {readOnly ? t('Fermer') : t('Annuler')}
        </button>
        {!readOnly && (
          <button className="btn btn-sm btn-primary" disabled={saving} onClick={() => void save()}>
            {saving && <Spinner className="text-white" />}
            {t('Enregistrer')}
          </button>
        )}
      </div>
    </Drawer>
  )
}
