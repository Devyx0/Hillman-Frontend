/** Catalogue → Items coûtants: cost / sell prices, target margin, video link per item and per section (PDF item 7). */
import { useState } from 'react'
import { Check, ChevronRight, ExternalLink, Package, Percent, PlayCircle, Plus, Trash2, TriangleAlert, Video } from 'lucide-react'
import { Badge, Card, Field } from '../../components/ui'
import { Select } from '../../components/filters'
import { confirmAction } from '../../components/states'
import { useAuth } from '../../auth/AuthContext'
import { useStore } from '../../data/store'
import { toast } from '../../lib/toast'
import { cn, pct } from '../../lib/utils'
import { t } from '../../i18n'
import { COST_ITEMS, addCostCategory, addCostItem, allCostItems, applyTargetMargin, categoryVideo, isFixedFee, removeCostItem, setCategoryVideo, updateCostItem, videoEmbed, type CostItem } from './data'
import { useCanEditCatalogue } from './context'
import { logChange } from './settings/data'
import { Modal } from './settings/shared'

const UNITS = ['paq.', 'rlx', 'unité', 'boîte', 'jour', 'h', 'pi', 'pi²', 'lot', 'panneau', 'forfait']

/** Moved to ./data (shared with the quote builder and the portal); re-exported for existing imports. */
export { videoEmbed }

export function CostItemsTab() {
  useStore()
  const canEdit = useCanEditCatalogue()
  const { user, can } = useAuth()
  const me = user?.name ?? '—'
  // Read-only users see cost and margin columns only with `quotes.costs`.
  const showCosts = can('quotes.costs') || canEdit
  const [general, setGeneral] = useState('Toit en pente')
  const [category, setCategory] = useState('Bardeaux')
  const [targetMargin, setTargetMargin] = useState(30)
  const [videoFor, setVideoFor] = useState<CostItem | null>(null)
  const [sectionVideo, setSectionVideo] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newCat, setNewCat] = useState<string | null>(null)
  const categories = Object.keys(COST_ITEMS[general] ?? {})
  const items = COST_ITEMS[general]?.[category] ?? []
  const atCost = allCostItems().filter((it) => it.sell <= it.cost && !isFixedFee(it)).length

  const applyMargin = async () => {
    if (!(targetMargin > 0 && targetMargin < 95)) return toast(t('Marge entre 1 et 94 %'))
    const ok = await confirmAction({ title: t('Appliquer une marge de {n} % à tout le catalogue?', { n: targetMargin }), body: t('Tous les prix de vente sont recalculés à partir du coûtant (sauf les frais fixes). Les soumissions existantes ne changent pas.') })
    if (!ok) return
    applyTargetMargin(targetMargin)
    logChange(me, 'catalogue', 'A appliqué une marge de {n} % au catalogue', { n: targetMargin })
    toast(t('Marge de {n} % appliquée', { n: targetMargin }))
  }
  const remove = async (it: CostItem) => {
    if (!(await confirmAction({ title: t('Supprimer « {name} »?', { name: t(it.name) }), body: t('Il sera aussi retiré des modèles de soumission. Les soumissions existantes ne changent pas.'), confirmLabel: t('Supprimer'), danger: true }))) return
    removeCostItem(general, category, it.id)
    logChange(me, 'catalogue', 'A supprimé l’item « {name} »', { name: it.name })
  }

  const columns = [
    {
      label: 'Catégorie générale',
      opts: Object.keys(COST_ITEMS),
      val: general,
      set: (g: string) => {
        setGeneral(g)
        setCategory(Object.keys(COST_ITEMS[g])[0] ?? '')
      },
    },
    { label: 'Catégorie', opts: categories, val: category, set: setCategory },
  ]

  return (
    <div className="space-y-4">
      {showCosts && (
        <div className="flex flex-wrap items-center gap-3">
          {atCost > 0 ? (
            <span className="flex items-center gap-2 text-sm font-semibold text-tone-warn-ink">
              <TriangleAlert className="w-4 h-4" />
              {t('{n} items vendus au prix coûtant', { n: atCost })}
            </span>
          ) : (
            <span className="flex items-center gap-2 text-sm font-semibold text-tone-good-ink">
              <Check className="w-4 h-4" />
              {t('Marges configurées')}
            </span>
          )}
          {canEdit && (
            <div className="flex items-center gap-2 ml-auto">
              <label className="text-xs font-semibold text-ink-secondary flex items-center gap-1.5">
                {t('Marge cible')}
                <input type="number" value={targetMargin} onChange={(e) => setTargetMargin(Number(e.target.value))} className="form-input h-8 w-16 tnum" aria-label={t('Marge cible')} />%
              </label>
              <button onClick={applyMargin} className="btn btn-sm btn-dark">
                <Percent className="w-4 h-4" />
                {t('Appliquer')}
              </button>
            </div>
          )}
        </div>
      )}
      <div className="grid lg:grid-cols-[200px_200px_minmax(0,1fr)] gap-4 items-start">
        {columns.map((col, ci) => (
          <div key={col.label} className="bg-white rounded-xl shadow-card p-2">
            <p className="label-caps px-3 py-2">{t(col.label)}</p>
            {col.opts.length === 0 && <p className="px-3 py-2 text-xs text-ink-mute">{t('Aucune catégorie')}</p>}
            {col.opts.map((opt) => (
              <button key={opt} onClick={() => col.set(opt)} className={cn('w-full flex items-center justify-between px-3 py-2 rounded-md text-sm text-left', col.val === opt ? 'bg-primary-wash text-primary-press font-semibold' : 'text-ink-mute hover:bg-sand hover:text-ink')}>
                <span className="truncate">{t(opt)}</span>
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            ))}
            {canEdit && ci === 1 &&
              (newCat === null ? (
                <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-ink-mute hover:bg-sand" onClick={() => setNewCat('')}>
                  <Plus className="w-3.5 h-3.5" />
                  {t('Catégorie')}
                </button>
              ) : (
                <form
                  className="p-1"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (newCat.trim()) {
                      addCostCategory(general, newCat.trim())
                      setCategory(newCat.trim())
                    }
                    setNewCat(null)
                  }}
                >
                  <input className="form-input h-8" autoFocus value={newCat} onChange={(e) => setNewCat(e.target.value)} onBlur={() => !newCat && setNewCat(null)} placeholder={t('Nom de la catégorie')} aria-label={t('Nom de la catégorie')} />
                </form>
              ))}
          </div>
        ))}
        <Card
          title={category ? t(category) : '—'}
          icon={Package}
          pad={false}
          actions={
            category && (
              <span className="flex items-center gap-1.5">
                {(canEdit || categoryVideo(general, category)) && (
                  <button className={cn('btn btn-xs', categoryVideo(general, category) ? 'btn-ghost text-primary-press' : 'btn-ghost')} onClick={() => setSectionVideo(true)} title={t('Vidéo de la section')}>
                    <PlayCircle className="w-3.5 h-3.5" />
                    {categoryVideo(general, category) ? t('Vidéo de la section') : t('Ajouter une vidéo à la section')}
                  </button>
                )}
                {canEdit && (
                  <button className="btn btn-xs btn-secondary" onClick={() => setAdding(true)}>
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
                  const margin = it.sell > 0 ? ((it.sell - it.cost) / it.sell) * 100 : 0
                  const embed = videoEmbed(it.video)
                  return (
                    <tr key={it.id} className="hover:bg-sand/60">
                      <td className="td font-medium text-ink">{t(it.name)}</td>
                      <td className="td text-ink-mute">{t(it.unit)}</td>
                      {showCosts && (
                        <td className="td text-right">
                          <input aria-label={t('Coûtant')} type="number" step="0.5" disabled={!canEdit} value={it.cost} onChange={(e) => updateCostItem(it.id, { cost: Number(e.target.value) })} className="form-input h-8 w-24 text-right tnum ml-auto" />
                        </td>
                      )}
                      <td className="td text-right">
                        <input aria-label={t('Vendant')} type="number" step="0.5" disabled={!canEdit} value={it.sell} onChange={(e) => updateCostItem(it.id, { sell: Number(e.target.value) })} className="form-input h-8 w-24 text-right tnum ml-auto" />
                      </td>
                      {showCosts && (
                        <td className="td text-right">
                          <Badge tone={margin <= 0.5 ? 'critical' : margin < 20 ? 'warn' : 'good'}>{pct(margin)}</Badge>
                        </td>
                      )}
                      <td className="td">
                        {it.video ? (
                          <button className={cn('inline-flex items-center gap-1 text-xs font-semibold', embed ? 'text-primary-press hover:underline' : 'text-tone-warn-ink')} onClick={() => setVideoFor(it)} aria-label={t('Voir la vidéo de {name}', { name: t(it.name) })}>
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
                      <td className="td text-right">
                        {canEdit && can('delete') && (
                          <button className="p-1.5 rounded-md hover:bg-tone-critical-soft hover:text-tone-critical-ink" aria-label={t('Supprimer')} onClick={() => remove(it)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
      {videoFor && (
        <VideoModal
          key={videoFor.id}
          name={videoFor.name}
          current={videoFor.video}
          canEdit={canEdit}
          onClose={() => setVideoFor(null)}
          onSave={(url) => {
            updateCostItem(videoFor.id, { video: url })
            logChange(me, 'catalogue', url ? 'A ajouté une vidéo à « {name} »' : 'A retiré la vidéo de « {name} »', { name: videoFor.name })
          }}
        />
      )}
      {sectionVideo && (
        <VideoModal
          key={general + category}
          name={category}
          current={categoryVideo(general, category)}
          canEdit={canEdit}
          hint={t('Vidéo de toute la section « {cat} » (par exemple notre méthode d’installation). Chaque item peut aussi avoir sa propre vidéo.', { cat: t(category) })}
          onClose={() => setSectionVideo(false)}
          onSave={(url) => {
            setCategoryVideo(general, category, url)
            logChange(me, 'catalogue', url ? 'A ajouté une vidéo à « {name} »' : 'A retiré la vidéo de « {name} »', { name: category })
          }}
        />
      )}
      {adding && <NewItemModal general={general} category={category} onClose={() => setAdding(false)} me={me} />}
    </div>
  )
}

/** Video link of an item or a section: preview + edit. */
export function VideoModal({ name, current, canEdit, onClose, onSave, hint }: { name: string; current?: string; canEdit: boolean; onClose: () => void; onSave: (url?: string) => void; hint?: string }) {
  const [url, setUrl] = useState(current ?? '')
  const embed = videoEmbed(url)
  const valid = !url.trim() || /^https?:\/\//.test(url.trim())
  const save = () => {
    if (!valid) return toast(t('Le lien doit commencer par https://'))
    onSave(url.trim() || undefined)
    toast(url.trim() ? t('Vidéo enregistrée') : t('Vidéo retirée'))
    onClose()
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={t('Vidéo — {name}', { name: t(name) })}
      width="max-w-2xl"
      footer={
        canEdit ? (
          <>
            <button className="btn btn-sm btn-ghost" onClick={onClose}>
              {t('Annuler')}
            </button>
            <button className="btn btn-sm btn-primary" disabled={url === (current ?? '')} onClick={save}>
              {t('Enregistrer')}
            </button>
          </>
        ) : undefined
      }
    >
      <div className="space-y-3">
        {hint && <p className="text-sm text-ink-mute">{hint}</p>}
        {canEdit && (
          <Field label={t('Lien YouTube ou Vimeo')}>
            <input className="form-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" autoFocus />
          </Field>
        )}
        {embed ? (
          <div className="aspect-video rounded-lg overflow-hidden bg-ink">
            <iframe src={embed} title={t(name)} className="w-full h-full" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
          </div>
        ) : url.trim() ? (
          <div className="rounded-lg bg-sand p-4 text-sm text-ink-mute flex items-center gap-2">
            <Video className="w-4 h-4 shrink-0" />
            {t("Aperçu indisponible pour ce lien. Il s'ouvrira dans un nouvel onglet.")}
          </div>
        ) : (
          <p className="text-sm text-ink-mute">{t("Collez le lien d'une vidéo d'installation ou de présentation du produit. Les représentants pourront la montrer au client.")}</p>
        )}
        {url.trim() && valid && (
          <a href={url.trim()} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-xs font-semibold text-primary-press hover:underline">
            <ExternalLink className="w-3.5 h-3.5" />
            {t('Ouvrir dans un nouvel onglet')}
          </a>
        )}
      </div>
    </Modal>
  )
}

function NewItemModal({ general, category, onClose, me }: { general: string; category: string; onClose: () => void; me: string }) {
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('unité')
  const [cost, setCost] = useState('')
  const [sell, setSell] = useState('')
  const [video, setVideo] = useState('')
  const submit = () => {
    const c = Number(cost.replace(',', '.'))
    const s = Number(sell.replace(',', '.'))
    if (!name.trim()) return toast(t('Entrez une description'))
    if (!(c >= 0) || !(s >= 0) || cost === '' || sell === '') return toast(t('Entrez le coûtant et le vendant'))
    if (video.trim() && !/^https?:\/\//.test(video.trim())) return toast(t('Le lien doit commencer par https://'))
    addCostItem(general, category, { name: name.trim(), unit, cost: c, sell: s, video: video.trim() || undefined })
    logChange(me, 'catalogue', 'A ajouté l’item « {name} »', { name: name.trim() })
    toast(t('Item ajouté'))
    onClose()
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={t('Nouvel item — {cat}', { cat: t(category) })}
      footer={
        <>
          <button className="btn btn-sm btn-ghost" onClick={onClose}>
            {t('Annuler')}
          </button>
          <button className="btn btn-sm btn-primary" onClick={submit}>
            {t('Ajouter')}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label={t('Description')}>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label={t('Unité')}>
            <Select value={unit} onChange={setUnit} options={UNITS.map((u) => ({ value: u, label: t(u) }))} />
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
      </div>
    </Modal>
  )
}
