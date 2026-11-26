/**
 * Catalogue → Items coûtants in API mode. Same layout as CostItemsTab: general categories (cost-general-categories:
 * name, « imprimer les lignes », active) → categories (cost-categories: name, target margin for admin /
 * coordination, active) → items (cost-items: name, unit, cost (admin / coordination), sell, active), the margin
 * bar (POST /companies/:id/catalogue/margin, whole catalogue or one category) and, below, the add-ons offered on
 * quotes (addon-presets).
 *
 * No API yet, kept as in mock mode (in memory, this device only): the video of an item and of a section
 * (CATEGORY_VIDEOS, keyed by the names).
 */
import { useState } from 'react'
import { ArrowDown, ArrowUp, Check, ChevronRight, ExternalLink, Gift, Package, Pencil, Percent, PlayCircle, Plus, Trash2, TriangleAlert, X } from 'lucide-react'
import * as api from '../../../api/endpoints'
import { toNum } from '../../../api/mappers'
import type { CatalogueAddonPreset, CatalogueCostCategory, CatalogueCostItem, CatalogueGeneralCategory } from '../../../api/types'
import { Badge, Card, Field } from '../../../components/ui'
import { Dropdown } from '../../../components/dropdown'
import { Notice, confirmAction } from '../../../components/states'
import { useStore } from '../../../data/store'
import { toast } from '../../../lib/toast'
import { cn, money, pct } from '../../../lib/utils'
import { t } from '../../../i18n'
import { VideoModal } from '../CostItemsTab'
import { categoryVideo, setCategoryVideo, videoEmbed } from '../data'
import { Modal, Toggle } from '../settings/shared'
import { AMOUNT_RE, PCT_RE, PRICE_RE, UNITS, bySort, cleanDecimal, decimalText, isHttpsUrl, nextSort, swapOrder, useCatalogueApi } from './shared'
import { ActiveButton, InactiveBadge } from './ui'

/** Item videos have no API yet: kept in memory for the session, like the mock catalogue. */
const ITEM_VIDEOS = new Map<string, string>()
/** Same rule as isFixedFee (mock): « Frais fixes » lines are not repriced and not flagged as sold at cost. */
const isFixedFeeName = (name: string) => /Frais fixes/.test(name)

export function ApiCostItemsTab() {
  useStore() // section videos (CATEGORY_VIDEOS) re-render through the store
  const { uuid, cat, canEdit, canDelete, showCosts, busy, run, remove, companyPicker } = useCatalogueApi()
  const generals = bySort(cat.cost_general_categories)
  const [generalId, setGeneralId] = useState<string | null>(null)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const general: CatalogueGeneralCategory | undefined = generals.find((g) => g.id === generalId) ?? generals[0]
  const categories = general ? bySort(general.categories) : []
  const category: CatalogueCostCategory | undefined = categories.find((c) => c.id === categoryId) ?? categories[0]
  const items = category ? bySort(category.items) : []

  const [marginText, setMarginText] = useState('30')
  const [marginScope, setMarginScope] = useState<'all' | 'category'>('all')
  const [videoFor, setVideoFor] = useState<CatalogueCostItem | null>(null)
  const [sectionVideo, setSectionVideo] = useState(false)
  const [itemModal, setItemModal] = useState<{ item?: CatalogueCostItem } | null>(null)
  const [newGeneral, setNewGeneral] = useState<string | null>(null)
  const [newCat, setNewCat] = useState<string | null>(null)
  const [, force] = useState(0)

  // « Cette catégorie » only while a category is selected.
  const effectiveScope = category ? marginScope : 'all'
  const allItems = generals.flatMap((g) => g.categories.flatMap((c) => c.items))
  const atCost = allItems.filter((it) => it.is_active && it.cost_price != null && toNum(it.sell_price) <= toNum(it.cost_price) && !isFixedFeeName(it.name)).length

  const applyMargin = async () => {
    const m = Number(cleanDecimal(marginText))
    if (!(m >= 1 && m <= 94)) return toast(t('Marge entre 1 et 94 %'))
    const onCategory = effectiveScope === 'category' && category
    const ok = await confirmAction({
      title: onCategory ? t('Appliquer une marge de {n} % à la catégorie « {cat} »?', { n: m, cat: category.name }) : t('Appliquer une marge de {n} % à tout le catalogue?', { n: m }),
      body: onCategory
        ? t('Les prix de vente de cette catégorie sont recalculés à partir du coûtant (sauf les items sans coûtant), et la marge devient sa marge cible. Les soumissions existantes ne changent pas.')
        : t('Tous les prix de vente sont recalculés à partir du coûtant (sauf les items sans coûtant), et la marge devient la marge cible de la compagnie. Les soumissions existantes ne changent pas.'),
    })
    if (!ok) return
    let count = 0
    const done = await run(async () => {
      count = (await api.applyCatalogueMargin(uuid, m, onCategory ? category.id : undefined)).items_updated
    })
    if (done) toast(t('Marge de {n} % appliquée à {count} items', { n: m, count }))
  }

  const addGeneral = async () => {
    const name = (newGeneral ?? '').trim()
    if (!name) return setNewGeneral(null)
    let id: string | undefined
    const ok = await run(async () => {
      id = (await api.createCatalogueRow<CatalogueGeneralCategory>('cost-general-categories', uuid, { name, print_lines_on_quote: false, sort_order: nextSort(generals) })).id
    }, t('Catégorie générale ajoutée'))
    if (ok) {
      setNewGeneral(null)
      if (id) {
        setGeneralId(id)
        setCategoryId(null)
      }
    }
  }
  const addCategory = async () => {
    const name = (newCat ?? '').trim()
    if (!name || !general) return setNewCat(null)
    let id: string | undefined
    const ok = await run(async () => {
      id = (await api.createCatalogueRow<CatalogueCostCategory>('cost-categories', general.id, { name, sort_order: nextSort(general.categories) })).id
    }, t('Catégorie ajoutée'))
    if (ok) {
      setNewCat(null)
      if (id) setCategoryId(id)
    }
  }
  const savePrice = (it: CatalogueCostItem, field: 'cost_price' | 'sell_price', value: string) => run(() => api.updateCatalogueRow('cost-items', it.id, { [field]: value }), field === 'cost_price' ? t('Coûtant enregistré') : t('Vendant enregistré'))

  const columns = [
    {
      label: 'Catégorie générale',
      rows: generals,
      val: general?.id,
      set: (id: string) => (setGeneralId(id), setCategoryId(null)),
      adding: newGeneral,
      setAdding: setNewGeneral,
      submit: addGeneral,
      placeholder: 'Nom de la catégorie générale',
      addLabel: 'Catégorie générale',
    },
    { label: 'Catégorie', rows: categories, val: category?.id, set: setCategoryId, adding: newCat, setAdding: setNewCat, submit: addCategory, placeholder: 'Nom de la catégorie', addLabel: 'Catégorie' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        {companyPicker}
        {showCosts &&
          (atCost > 0 ? (
            <span className="flex items-center gap-2 text-sm font-semibold text-tone-warn-ink pb-2.5">
              <TriangleAlert className="w-4 h-4" />
              {t('{n} items vendus au prix coûtant', { n: atCost })}
            </span>
          ) : (
            <span className="flex items-center gap-2 text-sm font-semibold text-tone-good-ink pb-2.5">
              <Check className="w-4 h-4" />
              {t('Marges configurées')}
            </span>
          ))}
        {showCosts && canEdit && (
          <div className="flex flex-wrap items-center gap-2 ml-auto pb-1">
            <label className="text-xs font-semibold text-ink-secondary flex items-center gap-1.5">
              {t('Marge cible')}
              <input inputMode="decimal" value={marginText} onChange={(e) => setMarginText(e.target.value)} className="form-input h-8 w-16 tnum" aria-label={t('Marge cible')} />%
            </label>
            <Dropdown
              className="form-input h-8 text-xs w-52"
              value={effectiveScope}
              aria-label={t('Appliquer à')}
              onChange={(e) => {
                const v = e.target.value as 'all' | 'category'
                setMarginScope(v)
                if (v === 'category' && category?.target_margin_pct != null) setMarginText(decimalText(category.target_margin_pct))
              }}
            >
              <option value="all">{t('Tout le catalogue')}</option>
              {category && <option value="category">{t('Catégorie « {cat} »', { cat: category.name })}</option>}
            </Dropdown>
            <button onClick={() => void applyMargin()} disabled={busy} className="btn btn-sm btn-dark">
              <Percent className="w-4 h-4" />
              {t('Appliquer')}
            </button>
          </div>
        )}
      </div>
      <div className="grid lg:grid-cols-[200px_200px_minmax(0,1fr)] gap-4 items-start">
        {columns.map((col, ci) => (
          <div key={col.label} className="bg-white rounded-xl shadow-card p-2">
            <p className="label-caps px-3 py-2">{t(col.label)}</p>
            {col.rows.length === 0 && <p className="px-3 py-2 text-xs text-ink-mute">{t('Aucune catégorie')}</p>}
            {col.rows.map((row) => (
              <button key={row.id} onClick={() => col.set(row.id)} className={cn('w-full flex items-center justify-between px-3 py-2 rounded-md text-sm text-left', col.val === row.id ? 'bg-primary-wash text-primary-press font-semibold' : 'text-ink-mute hover:bg-sand hover:text-ink', !row.is_active && 'opacity-60')}>
                <span className="truncate">{row.name}</span>
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            ))}
            {canEdit && (ci === 0 || general) &&
              (col.adding === null ? (
                <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-ink-mute hover:bg-sand" onClick={() => col.setAdding('')}>
                  <Plus className="w-3.5 h-3.5" />
                  {t(col.addLabel)}
                </button>
              ) : (
                <form
                  className="p-1"
                  onSubmit={(e) => {
                    e.preventDefault()
                    void col.submit()
                  }}
                >
                  <input className="form-input h-8" autoFocus maxLength={150} value={col.adding} onChange={(e) => col.setAdding(e.target.value)} onBlur={() => !col.adding && col.setAdding(null)} placeholder={t(col.placeholder)} aria-label={t(col.placeholder)} />
                </form>
              ))}
            {ci === 0 && general && <GeneralSettings key={general.id} general={general} />}
            {ci === 1 && category && <CategorySettings key={category.id} category={category} />}
          </div>
        ))}
        <Card
          title={
            category ? (
              <span className={cn('inline-flex items-center gap-2', !category.is_active && 'opacity-60')}>
                {category.name}
                {!category.is_active && <InactiveBadge />}
              </span>
            ) : (
              '—'
            )
          }
          icon={Package}
          pad={false}
          actions={
            category &&
            general && (
              <span className="flex items-center gap-1.5">
                {(canEdit || categoryVideo(general.name, category.name)) && (
                  <button className={cn('btn btn-xs', categoryVideo(general.name, category.name) ? 'btn-ghost text-primary-press' : 'btn-ghost')} onClick={() => setSectionVideo(true)} title={t('Vidéo de la section')}>
                    <PlayCircle className="w-3.5 h-3.5" />
                    {categoryVideo(general.name, category.name) ? t('Vidéo de la section') : t('Ajouter une vidéo à la section')}
                  </button>
                )}
                {canEdit && (
                  <button className="btn btn-xs btn-secondary" onClick={() => setItemModal({})}>
                    <Plus className="w-3.5 h-3.5" />
                    {t('Item')}
                  </button>
                )}
              </span>
            )
          }
        >
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-sand/60 border-b border-hairline">
                <tr>
                  {['Description', 'Unité', ...(showCosts ? ['Coûtant'] : []), 'Vendant', ...(showCosts ? ['Marge'] : []), 'Vidéo', ''].map((h, i) => (
                    <th key={h + i} className={cn('th', h !== 'Description' && h !== 'Unité' && h !== 'Vidéo' && 'text-right')}>
                      {h && t(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {items.map((it) => {
                  const cost = it.cost_price
                  const sell = toNum(it.sell_price)
                  const margin = cost != null && sell > 0 ? ((sell - toNum(cost)) / sell) * 100 : null
                  const video = ITEM_VIDEOS.get(it.id)
                  const embed = videoEmbed(video)
                  return (
                    <tr key={it.id} className={cn('hover:bg-sand/60', !it.is_active && 'opacity-60')}>
                      <td className="td font-medium text-ink">
                        <span className="inline-flex items-center gap-2">
                          {it.name}
                          {!it.is_active && <InactiveBadge />}
                        </span>
                      </td>
                      <td className="td text-ink-mute">{it.unit ? t(it.unit) : '—'}</td>
                      {showCosts && (
                        <td className="td text-right">
                          <PriceCell key={`${it.id}:${cost}`} label={t('Coûtant')} value={cost} disabled={!canEdit || busy} onSave={(v) => savePrice(it, 'cost_price', v)} />
                        </td>
                      )}
                      <td className="td text-right">
                        <PriceCell key={`${it.id}:${it.sell_price}`} label={t('Vendant')} value={it.sell_price} disabled={!canEdit || busy} onSave={(v) => savePrice(it, 'sell_price', v)} />
                      </td>
                      {showCosts && <td className="td text-right">{margin === null ? <span className="text-ink-faint">—</span> : <Badge tone={margin <= 0.5 ? 'critical' : margin < 20 ? 'warn' : 'good'}>{pct(margin)}</Badge>}</td>}
                      <td className="td">
                        {video ? (
                          <button className={cn('inline-flex items-center gap-1 text-xs font-semibold', embed ? 'text-primary-press hover:underline' : 'text-tone-warn-ink')} onClick={() => setVideoFor(it)} aria-label={t('Voir la vidéo de {name}', { name: it.name })}>
                            <PlayCircle className="w-4 h-4" />
                            {t('Voir')}
                          </button>
                        ) : canEdit ? (
                          <button className="inline-flex items-center gap-1 text-xs text-ink-mute hover:text-ink" onClick={() => setVideoFor(it)}>
                            <Plus className="w-3.5 h-3.5" />
                            {t('Lien')}
                          </button>
                        ) : (
                          <span className="text-ink-faint">—</span>
                        )}
                      </td>
                      <td className="td text-right whitespace-nowrap">
                        {canEdit && (
                          <span className="inline-flex items-center gap-0.5">
                            <button className="p-1.5 rounded-md hover:bg-stone" aria-label={t('Modifier')} onClick={() => setItemModal({ item: it })}>
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <ActiveButton active={it.is_active} disabled={busy} onClick={() => void run(() => api.updateCatalogueRow('cost-items', it.id, { is_active: !it.is_active }), it.is_active ? t('Item désactivé') : t('Item réactivé'))} />
                            {canDelete && (
                              <button
                                className="p-1.5 rounded-md hover:bg-tone-critical-soft hover:text-tone-critical-ink"
                                aria-label={t('Supprimer')}
                                disabled={busy}
                                onClick={() => void remove('cost-items', it.id, { title: t('Supprimer « {name} »?', { name: it.name }), body: t('Il sera aussi retiré des modèles de soumission. Les soumissions existantes ne changent pas.'), done: t('Item supprimé') })}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="td text-center text-ink-mute py-8">
                      {t('Aucun item dans cette catégorie')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <AddonsCard />
      {videoFor && (
        <VideoModal
          key={videoFor.id}
          name={videoFor.name}
          current={ITEM_VIDEOS.get(videoFor.id)}
          canEdit={canEdit}
          onClose={() => setVideoFor(null)}
          onSave={(url) => {
            if (url) ITEM_VIDEOS.set(videoFor.id, url)
            else ITEM_VIDEOS.delete(videoFor.id)
            force((n) => n + 1)
          }}
        />
      )}
      {sectionVideo && general && category && (
        <VideoModal
          key={general.id + category.id}
          name={category.name}
          current={categoryVideo(general.name, category.name)}
          canEdit={canEdit}
          hint={t('Vidéo de toute la section « {cat} » (par exemple notre méthode d’installation). Chaque item peut aussi avoir sa propre vidéo.', { cat: category.name })}
          onClose={() => setSectionVideo(false)}
          onSave={(url) => setCategoryVideo(general.name, category.name, url)}
        />
      )}
      {itemModal && category && (
        <ItemModal
          category={category}
          item={itemModal.item}
          onClose={() => setItemModal(null)}
          onVideo={(id, url) => {
            if (url) ITEM_VIDEOS.set(id, url)
            else ITEM_VIDEOS.delete(id)
          }}
        />
      )}
    </div>
  )
}

/** Cost or sell price edited in place: saved on blur / Enter when it changed and is valid. */
function PriceCell({ value, label, disabled, onSave }: { value: string | null | undefined; label: string; disabled: boolean; onSave: (v: string) => Promise<boolean> }) {
  const initial = decimalText(value)
  const [text, setText] = useState(initial)
  const commit = async () => {
    const v = cleanDecimal(text)
    if (v === initial || (value != null && v !== '' && Number(v) === Number(value))) return setText(initial)
    if (!PRICE_RE.test(v)) {
      toast(t('Prix invalide (ex. "12.50").'))
      return setText(initial)
    }
    if (!(await onSave(v))) setText(initial)
  }
  return (
    <input
      aria-label={label}
      inputMode="decimal"
      disabled={disabled}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => void commit()}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      className="form-input h-8 w-24 text-right tnum ml-auto"
    />
  )
}

/** Selected general category: rename, « imprimer les lignes sur la soumission », active, delete. */
function GeneralSettings({ general }: { general: CatalogueGeneralCategory }) {
  const { canEdit, canDelete, busy, run, remove } = useCatalogueApi()
  const [name, setName] = useState<string | null>(null)
  const rename = async () => {
    const v = (name ?? '').trim()
    if (v && v !== general.name && !(await run(() => api.updateCatalogueRow('cost-general-categories', general.id, { name: v }), t('Catégorie renommée')))) return
    setName(null)
  }
  return (
    <div className="mt-2 pt-2 border-t border-hairline px-1 space-y-2">
      <label className="flex items-center gap-2 px-2 text-xs text-ink-secondary">
        <Toggle on={general.print_lines_on_quote} disabled={!canEdit || busy} label={t('Imprimer les lignes sur la soumission')} onChange={(on) => void run(() => api.updateCatalogueRow('cost-general-categories', general.id, { print_lines_on_quote: on }), t('Catégorie modifiée'))} />
        {t('Imprimer les lignes sur la soumission')}
      </label>
      {canEdit && (
        <SelectedActions
          name={name}
          setName={setName}
          current={general.name}
          onRename={rename}
          active={general.is_active}
          busy={busy}
          onToggle={() => void run(() => api.updateCatalogueRow('cost-general-categories', general.id, { is_active: !general.is_active }), general.is_active ? t('Catégorie désactivée') : t('Catégorie réactivée'))}
          onDelete={
            canDelete
              ? () => void remove('cost-general-categories', general.id, { title: t('Supprimer la catégorie « {name} »?', { name: general.name }), body: t('Ses catégories et leurs items sont supprimés avec elle. Les soumissions existantes ne changent pas.'), done: t('Catégorie supprimée') })
              : undefined
          }
        />
      )}
    </div>
  )
}

/** Selected category: rename, target margin (admin / coordination), active, delete. */
function CategorySettings({ category }: { category: CatalogueCostCategory }) {
  const { canEdit, canDelete, showCosts, busy, run, remove } = useCatalogueApi()
  const [name, setName] = useState<string | null>(null)
  const initial = decimalText(category.target_margin_pct)
  const [target, setTarget] = useState(initial)
  const rename = async () => {
    const v = (name ?? '').trim()
    if (v && v !== category.name && !(await run(() => api.updateCatalogueRow('cost-categories', category.id, { name: v }), t('Catégorie renommée')))) return
    setName(null)
  }
  const saveTarget = async () => {
    const v = cleanDecimal(target)
    if (v === initial || (v !== '' && initial !== '' && Number(v) === Number(initial))) return setTarget(initial)
    if (v !== '' && !(PCT_RE.test(v) && Number(v) <= 99.99)) {
      toast(t('Marge entre 0 et 99.99 %.'))
      return setTarget(initial)
    }
    if (!(await run(() => api.updateCatalogueRow('cost-categories', category.id, { target_margin_pct: v === '' ? null : v }), t('Marge cible enregistrée')))) setTarget(initial)
  }
  return (
    <div className="mt-2 pt-2 border-t border-hairline px-1 space-y-2">
      {showCosts && (
        <label className="flex items-center gap-1.5 px-2 text-xs font-semibold text-ink-secondary">
          {t('Marge cible')}
          <input
            className="form-input h-7 w-16 tnum"
            inputMode="decimal"
            disabled={!canEdit || busy}
            value={target}
            placeholder="—"
            onChange={(e) => setTarget(e.target.value)}
            onBlur={() => void saveTarget()}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            aria-label={t('Marge cible de la catégorie')}
          />
          %
        </label>
      )}
      {canEdit && (
        <SelectedActions
          name={name}
          setName={setName}
          current={category.name}
          onRename={rename}
          active={category.is_active}
          busy={busy}
          onToggle={() => void run(() => api.updateCatalogueRow('cost-categories', category.id, { is_active: !category.is_active }), category.is_active ? t('Catégorie désactivée') : t('Catégorie réactivée'))}
          onDelete={canDelete ? () => void remove('cost-categories', category.id, { title: t('Supprimer la catégorie « {name} »?', { name: category.name }), body: t('Ses items sont supprimés avec elle. Les soumissions existantes ne changent pas.'), done: t('Catégorie supprimée') }) : undefined}
        />
      )}
    </div>
  )
}

function SelectedActions({ name, setName, current, onRename, active, busy, onToggle, onDelete }: { name: string | null; setName: (v: string | null) => void; current: string; onRename: () => void; active: boolean; busy: boolean; onToggle: () => void; onDelete?: () => void }) {
  if (name !== null)
    return (
      <form
        className="flex gap-1"
        onSubmit={(e) => {
          e.preventDefault()
          onRename()
        }}
      >
        <input className="form-input h-7 text-xs" autoFocus maxLength={150} value={name} onChange={(e) => setName(e.target.value)} aria-label={t('Nom')} />
        <button className="btn btn-xs btn-primary" aria-label={t('Enregistrer')} disabled={busy}>
          <Check className="w-3.5 h-3.5" />
        </button>
        <button type="button" className="btn btn-xs btn-ghost" aria-label={t('Annuler')} onClick={() => setName(null)}>
          <X className="w-3.5 h-3.5" />
        </button>
      </form>
    )
  return (
    <div className="flex items-center gap-0.5 px-1">
      <button className="p-1.5 rounded-md hover:bg-stone" aria-label={t('Renommer')} title={t('Renommer')} onClick={() => setName(current)}>
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <ActiveButton active={active} disabled={busy} onClick={onToggle} />
      {onDelete && (
        <button className="p-1.5 rounded-md hover:bg-tone-critical-soft hover:text-tone-critical-ink" aria-label={t('Supprimer')} title={t('Supprimer')} disabled={busy} onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

/** New item (POST /cost-categories/:id/items: name, unit, cost and sell required) or edit (PATCH: changed fields only). */
function ItemModal({ category, item, onClose, onVideo }: { category: CatalogueCostCategory; item?: CatalogueCostItem; onClose: () => void; onVideo: (id: string, url?: string) => void }) {
  const { busy, run } = useCatalogueApi()
  const [name, setName] = useState(item?.name ?? '')
  const [unit, setUnit] = useState(item ? (item.unit ?? '') : 'unité')
  const [cost, setCost] = useState(decimalText(item?.cost_price))
  const [sell, setSell] = useState(decimalText(item?.sell_price))
  const [video, setVideo] = useState(item ? (ITEM_VIDEOS.get(item.id) ?? '') : '')
  const [error, setError] = useState('')
  const units = unit && !UNITS.includes(unit) ? [...UNITS, unit] : UNITS

  const submit = async () => {
    const n = name.trim()
    const c = cleanDecimal(cost)
    const s = cleanDecimal(sell)
    const v = video.trim()
    if (!n) return setError(t('Entrez une description'))
    if (!item && (c === '' || s === '')) return setError(t('Entrez le coûtant et le vendant'))
    if ((c !== '' || !item) && !PRICE_RE.test(c)) return setError(t('Coûtant invalide (ex. "12.50", 4 décimales au plus).'))
    if (!PRICE_RE.test(s)) return setError(t('Vendant invalide (ex. "12.50", 4 décimales au plus).'))
    if (v && !/^https?:\/\//.test(v)) return setError(t('Le lien doit commencer par https://'))
    setError('')
    if (!item) {
      let id: string | undefined
      const ok = await run(async () => {
        id = (await api.createCatalogueRow<CatalogueCostItem>('cost-items', category.id, { name: n, unit: unit || null, cost_price: c, sell_price: s, sort_order: nextSort(category.items) })).id
      }, t('Item ajouté'))
      if (ok) {
        if (id && v) onVideo(id, v)
        onClose()
      }
      return
    }
    const body: Record<string, unknown> = {}
    if (n !== item.name) body.name = n
    if ((unit || null) !== item.unit) body.unit = unit || null
    if (c !== '' && (item.cost_price == null || Number(c) !== Number(item.cost_price))) body.cost_price = c
    if (Number(s) !== Number(item.sell_price)) body.sell_price = s
    onVideo(item.id, v || undefined)
    if (Object.keys(body).length === 0) return onClose()
    if (await run(() => api.updateCatalogueRow('cost-items', item.id, body), t('Item modifié'))) onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={item ? t('Modifier l’item — {cat}', { cat: category.name }) : t('Nouvel item — {cat}', { cat: category.name })}
      footer={
        <>
          <button className="btn btn-sm btn-ghost" onClick={onClose}>
            {t('Annuler')}
          </button>
          <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => void submit()}>
            {item ? t('Enregistrer') : t('Ajouter')}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label={t('Description')}>
          <input className="form-input" maxLength={200} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label={t('Unité')}>
            <Dropdown className="form-input" value={unit} onChange={(e) => setUnit(e.target.value)} aria-label={t('Unité')}>
              <option value="">—</option>
              {units.map((u) => (
                <option key={u} value={u}>
                  {t(u)}
                </option>
              ))}
            </Dropdown>
          </Field>
          <Field label={t('Coûtant')}>
            <input className="form-input tnum" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} />
          </Field>
          <Field label={t('Vendant')}>
            <input className="form-input tnum" inputMode="decimal" value={sell} onChange={(e) => setSell(e.target.value)} />
          </Field>
        </div>
        <Field label={t('Lien vidéo (facultatif)')}>
          <input className="form-input" value={video} onChange={(e) => setVideo(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" />
        </Field>
        {error && <Notice tone="critical">{error}</Notice>}
      </div>
    </Modal>
  )
}

// ── Add-ons (addon-presets) ──────────────────────────────────────────────────
/** Add-ons offered on quotes: description, default amount, option group, warranty text, video, defaults. */
function AddonsCard() {
  const { cat, canEdit, canDelete, busy, run, remove } = useCatalogueApi()
  const addons = bySort(cat.addon_presets)
  const [modal, setModal] = useState<{ addon?: CatalogueAddonPreset } | null>(null)
  const move = (a: string, b: string) => {
    const changes = swapOrder(addons, a, b)
    if (changes.length) void run(() => Promise.all(changes.map((c) => api.updateCatalogueRow('addon-presets', c.id, { sort_order: c.sort_order }))))
  }
  return (
    <Card
      title={t('Ajouts et options')}
      icon={Gift}
      pad={false}
      actions={
        canEdit && (
          <button className="btn btn-xs btn-secondary" onClick={() => setModal({})}>
            <Plus className="w-3.5 h-3.5" />
            {t('Ajout')}
          </button>
        )
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead className="bg-sand/60 border-b border-hairline">
            <tr>
              <th className="th">{t('Description')}</th>
              <th className="th">{t('Groupe d’options')}</th>
              <th className="th text-right">{t('Montant par défaut')}</th>
              <th className="th text-center">{t('Nouvelles soumissions')}</th>
              <th className="th text-center">{t('Choix du client')}</th>
              <th className="th">{t('Vidéo')}</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {addons.map((a, i) => (
              <tr key={a.id} className={cn('hover:bg-sand/60', !a.is_active && 'opacity-60')}>
                <td className="td">
                  <p className="font-medium text-ink inline-flex items-center gap-2">
                    {a.description}
                    {!a.is_active && <InactiveBadge />}
                  </p>
                  {a.warranty_text && <p className="text-xs text-ink-mute">{a.warranty_text}</p>}
                </td>
                <td className="td text-ink-mute">{a.option_group ?? '—'}</td>
                <td className="td text-right tnum">{money(toNum(a.default_amount))}</td>
                <td className="td text-center">{a.is_added_to_new_quotes ? <Check className="w-4 h-4 inline text-tone-good-ink" aria-label={t('Oui')} /> : <span className="text-ink-faint">—</span>}</td>
                <td className="td text-center">{a.is_client_selectable ? <Check className="w-4 h-4 inline text-tone-good-ink" aria-label={t('Oui')} /> : <span className="text-ink-faint">—</span>}</td>
                <td className="td">
                  {a.video_url ? (
                    <a href={a.video_url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-xs font-semibold text-primary-press hover:underline">
                      <ExternalLink className="w-3.5 h-3.5" />
                      {t('Voir')}
                    </a>
                  ) : (
                    <span className="text-ink-faint">—</span>
                  )}
                </td>
                <td className="td text-right whitespace-nowrap">
                  {canEdit && (
                    <span className="inline-flex items-center gap-0.5">
                      <button className="p-1.5 rounded-md hover:bg-stone disabled:opacity-30" aria-label={t('Monter')} disabled={busy || i === 0} onClick={() => move(a.id, addons[i - 1].id)}>
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1.5 rounded-md hover:bg-stone disabled:opacity-30" aria-label={t('Descendre')} disabled={busy || i === addons.length - 1} onClick={() => move(a.id, addons[i + 1].id)}>
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1.5 rounded-md hover:bg-stone" aria-label={t('Modifier')} onClick={() => setModal({ addon: a })}>
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <ActiveButton active={a.is_active} disabled={busy} onClick={() => void run(() => api.updateCatalogueRow('addon-presets', a.id, { is_active: !a.is_active }), a.is_active ? t('Ajout désactivé') : t('Ajout réactivé'))} />
                      {canDelete && (
                        <button
                          className="p-1.5 rounded-md hover:bg-tone-critical-soft hover:text-tone-critical-ink"
                          aria-label={t('Supprimer')}
                          disabled={busy}
                          onClick={() => void remove('addon-presets', a.id, { title: t('Supprimer « {name} »?', { name: a.description }), body: t('Il sera aussi retiré des modèles de soumission. Les soumissions existantes ne changent pas.'), done: t('Ajout supprimé') })}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {addons.length === 0 && (
              <tr>
                <td colSpan={7} className="td text-center text-ink-mute py-8">
                  {t('Aucun ajout')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {modal && <AddonModal addon={modal.addon} onClose={() => setModal(null)} />}
    </Card>
  )
}

function AddonModal({ addon, onClose }: { addon?: CatalogueAddonPreset; onClose: () => void }) {
  const { uuid, cat, busy, run } = useCatalogueApi()
  const [f, setF] = useState({
    description: addon?.description ?? '',
    amount: addon ? decimalText(addon.default_amount) : '0',
    group: addon?.option_group ?? '',
    warranty: addon?.warranty_text ?? '',
    video: addon?.video_url ?? '',
    newQuotes: addon?.is_added_to_new_quotes ?? false,
    client: addon?.is_client_selectable ?? false,
  })
  const [error, setError] = useState('')

  const submit = async () => {
    const description = f.description.trim()
    const amount = cleanDecimal(f.amount)
    const video = f.video.trim()
    if (!description) return setError(t('Entrez une description'))
    if (!AMOUNT_RE.test(amount)) return setError(t('Montant invalide (ex. "1234.56").'))
    if (video && !isHttpsUrl(video)) return setError(t('Le lien doit commencer par https://'))
    setError('')
    const values: Record<string, unknown> = {
      description,
      default_amount: amount,
      option_group: f.group.trim() || null,
      warranty_text: f.warranty.trim() || null,
      video_url: video || null,
      is_added_to_new_quotes: f.newQuotes,
      is_client_selectable: f.client,
    }
    if (!addon) {
      if (await run(() => api.createCatalogueRow('addon-presets', uuid, { ...values, sort_order: nextSort(cat.addon_presets) }), t('Ajout créé'))) onClose()
      return
    }
    const before: Record<string, unknown> = {
      description: addon.description,
      default_amount: addon.default_amount,
      option_group: addon.option_group,
      warranty_text: addon.warranty_text,
      video_url: addon.video_url,
      is_added_to_new_quotes: addon.is_added_to_new_quotes,
      is_client_selectable: addon.is_client_selectable,
    }
    const body = Object.fromEntries(Object.entries(values).filter(([k, v]) => (k === 'default_amount' ? Number(v) !== Number(before[k]) : v !== before[k])))
    if (Object.keys(body).length === 0) return onClose()
    if (await run(() => api.updateCatalogueRow('addon-presets', addon.id, body), t('Ajout modifié'))) onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={addon ? t('Modifier l’ajout') : t('Nouvel ajout')}
      footer={
        <>
          <button className="btn btn-sm btn-ghost" onClick={onClose}>
            {t('Annuler')}
          </button>
          <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => void submit()}>
            {addon ? t('Enregistrer') : t('Ajouter')}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label={t('Description')}>
          <input className="form-input" maxLength={300} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('Montant par défaut')}>
            <input className="form-input tnum" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
          </Field>
          <Field label={t('Groupe d’options (facultatif)')}>
            <input className="form-input" maxLength={60} value={f.group} onChange={(e) => setF({ ...f, group: e.target.value })} />
          </Field>
        </div>
        <Field label={t('Texte de garantie (facultatif)')}>
          <input className="form-input" maxLength={300} value={f.warranty} onChange={(e) => setF({ ...f, warranty: e.target.value })} />
        </Field>
        <Field label={t('Lien vidéo (facultatif)')}>
          <input className="form-input" maxLength={500} value={f.video} onChange={(e) => setF({ ...f, video: e.target.value })} placeholder="https://www.youtube.com/watch?v=…" />
        </Field>
        <label className="flex items-center gap-2 text-sm text-ink-secondary">
          <Toggle on={f.newQuotes} onChange={(on) => setF({ ...f, newQuotes: on })} label={t('Ajouté aux nouvelles soumissions')} />
          {t('Ajouté aux nouvelles soumissions')}
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-secondary">
          <Toggle on={f.client} onChange={(on) => setF({ ...f, client: on })} label={t('Le client peut le choisir')} />
          {t('Le client peut le choisir')}
        </label>
        {error && <Notice tone="critical">{error}</Notice>}
      </div>
    </Modal>
  )
}
