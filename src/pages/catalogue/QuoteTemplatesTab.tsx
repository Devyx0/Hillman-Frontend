/** Catalogue → Modèles: quote-template editor (name, company, work type, pre-checked scope, cost lines, warranty, notes). */
import { useMemo, useState } from 'react'
import { Copy, LayoutTemplate, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { CompanyBadge, Drawer, Empty, Field } from '../../components/ui'
import { Select } from '../../components/filters'
import { Notice, confirmAction } from '../../components/states'
import { useAuth } from '../../auth/AuthContext'
import { COMPANIES, type CompanyId } from '../../data/mock'
import { useStore } from '../../data/store'
import { toast } from '../../lib/toast'
import { cn, money, normalize, num, pct } from '../../lib/utils'
import { t } from '../../i18n'
import { COST_GROUPS, COST_ITEMS, QUOTE_TEMPLATES, WARRANTIES, WORK_KINDS, costItemById, defaultChecked, removeQuoteTemplate, saveQuoteTemplate, scopeFor, templateTotals, type QuoteTemplate } from './data'
import { ClauseText } from './CatalogueTabs'
import { useCanEditCatalogue } from './context'
import { logChange } from './settings/data'

/** Warranty groups relevant to each company. */
const WARRANTY_GROUPS: Record<CompanyId, string[]> = {
  toit: ['Garantie du manufacturier — Bardeaux', 'Garantie du manufacturier — Membranes', "Main-d'œuvre — Toitures", "Durée de l'offre"],
  sg: ['Protège-gouttières (Signature)', "Durée de l'offre"],
  reno: ["Main-d'œuvre — Rénovations", "Durée de l'offre"],
}

const blank = (company: CompanyId): QuoteTemplate => ({ id: '', name: '', company, workType: WORK_KINDS[company][0], checked: defaultChecked(company), costs: [], warranties: { "Durée de l'offre": '30 jours' }, notes: '', used: 0, win: 0, co: company, lines: 0, items: 0, avg: 0, margin: 0 })

export function TemplatesTab() {
  useStore()
  const canEdit = useCanEditCatalogue()
  const { user, can } = useAuth()
  const me = user?.name ?? '—'
  const [company, setCompany] = useState<'all' | CompanyId>('all')
  const [editing, setEditing] = useState<QuoteTemplate | null>(null)
  const list = QUOTE_TEMPLATES.filter((x) => company === 'all' || x.company === company)

  const duplicate = (tpl: QuoteTemplate) => {
    const copy = { ...structuredClone(tpl), id: 'tpl' + Date.now().toString(36), name: t('{name} (copie)', { name: t(tpl.name) }), used: 0, win: 0 }
    saveQuoteTemplate(copy)
    logChange(me, 'catalogue', 'A dupliqué le modèle « {name} »', { name: tpl.name })
    toast(t('Modèle dupliqué'))
    setEditing(QUOTE_TEMPLATES.find((x) => x.id === copy.id) ?? null)
  }
  const remove = async (tpl: QuoteTemplate) => {
    if (!(await confirmAction({ title: t('Supprimer le modèle « {name} »?', { name: t(tpl.name) }), body: t('Les soumissions déjà créées avec ce modèle ne changent pas. Cette action est définitive.'), confirmLabel: t('Supprimer'), danger: true }))) return
    removeQuoteTemplate(tpl.id)
    logChange(me, 'catalogue', 'A supprimé le modèle « {name} »', { name: tpl.name })
    toast(t('Modèle supprimé'))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label={t('Compagnie')}>
          <Select<'all' | CompanyId> value={company} onChange={setCompany} searchable={false} className="w-56" options={[{ value: 'all', label: t('Toutes les compagnies') }, ...COMPANIES.map((c) => ({ value: c.id, label: c.name }))]} />
        </Field>
        {canEdit && (
          <button className="btn btn-sm btn-primary ml-auto" onClick={() => setEditing(blank(company === 'all' ? 'toit' : company))}>
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
          {list.map((tpl) => (
            <div key={tpl.id} className="bg-white rounded-xl shadow-card p-5 flex flex-col gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <CompanyBadge id={tpl.company} />
                  <span className="text-2xs text-ink-mute">{t(tpl.workType)}</span>
                </div>
                <p className="text-md font-semibold truncate">{t(tpl.name)}</p>
                <p className="text-xs text-ink-mute mt-0.5 tnum">{t('{lines} lignes · {items} items', { lines: tpl.lines, items: tpl.items })}</p>
              </div>
              <dl className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <dt className="text-ink-mute">{t('Moyenne')}</dt>
                  <dd className="font-semibold tnum">{money(tpl.avg, false)}</dd>
                </div>
                {can('quotes.costs') && (
                  <div>
                    <dt className="text-ink-mute">{t('Marge')}</dt>
                    <dd className="font-semibold tnum">{pct(tpl.margin)}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-ink-mute">{t('Utilisé')}</dt>
                  <dd className="font-semibold tnum">{t('{n} fois', { n: num(tpl.used) })}</dd>
                </div>
              </dl>
              <div className="flex items-center gap-1 mt-auto pt-1">
                <button className="btn btn-xs btn-secondary" onClick={() => setEditing(tpl)}>
                  <Pencil className="w-3.5 h-3.5" />
                  {canEdit ? t('Modifier') : t('Voir')}
                </button>
                {canEdit && (
                  <>
                    <button className="btn btn-xs btn-ghost" onClick={() => duplicate(tpl)}>
                      <Copy className="w-3.5 h-3.5" />
                      {t('Dupliquer')}
                    </button>
                    {can('delete') && (
                      <button className="p-1.5 rounded-md hover:bg-tone-critical-soft hover:text-tone-critical-ink ml-auto" aria-label={t('Supprimer')} onClick={() => remove(tpl)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && <TemplateEditor key={editing.id || 'new'} initial={editing} readOnly={!canEdit} onClose={() => setEditing(null)} me={me} showCosts={can('quotes.costs')} />}
    </div>
  )
}

function TemplateEditor({ initial, readOnly, onClose, me, showCosts }: { initial: QuoteTemplate; readOnly: boolean; onClose: () => void; me: string; showCosts: boolean }) {
  const isNew = !initial.id
  const [tpl, setTpl] = useState<QuoteTemplate>(() => ({ ...structuredClone(initial), name: initial.name ? t(initial.name) : '', notes: initial.notes ? t(initial.notes) : '' }))
  const [query, setQuery] = useState('')
  const [addItem, setAddItem] = useState('')
  const [error, setError] = useState('')
  const checked = new Set(tpl.checked)
  const sections = scopeFor(tpl.company)
  const totals = templateTotals(tpl.costs)
  const itemOptions = useMemo(
    () =>
      COST_GROUPS[tpl.company].flatMap((g) =>
        Object.entries(COST_ITEMS[g] ?? {}).flatMap(([cat, items]) => items.filter((it) => !tpl.costs.some((c) => c.itemId === it.id)).map((it) => ({ value: it.id, label: `${t(cat)} · ${t(it.name)}` }))),
      ),
    [tpl.company, tpl.costs],
  )

  const setCompany = async (company: CompanyId) => {
    if (company === tpl.company) return
    if ((tpl.costs.length || tpl.checked.length) && !(await confirmAction({ title: t('Changer de compagnie?'), body: t('Les lignes cochées et les items coûtants seront remplacés par ceux de la nouvelle compagnie.') }))) return
    setTpl({ ...tpl, company, workType: WORK_KINDS[company][0], checked: defaultChecked(company), costs: [], warranties: { "Durée de l'offre": tpl.warranties["Durée de l'offre"] ?? '30 jours' } })
  }
  const toggle = (line: string) => setTpl({ ...tpl, checked: checked.has(line) ? tpl.checked.filter((l) => l !== line) : [...tpl.checked, line] })
  const toggleSection = (lines: string[], on: boolean) => setTpl({ ...tpl, checked: on ? [...new Set([...tpl.checked, ...lines])] : tpl.checked.filter((l) => !lines.includes(l)) })

  const save = () => {
    const name = tpl.name.trim()
    if (!name) return setError(t('Donnez un nom au modèle'))
    if (QUOTE_TEMPLATES.some((x) => x.id !== tpl.id && x.company === tpl.company && t(x.name).toLowerCase() === name.toLowerCase())) return setError(t('Un modèle de cette compagnie porte déjà ce nom'))
    if (tpl.costs.some((c) => !(c.qty > 0))) return setError(t('Chaque item doit avoir une quantité supérieure à 0'))
    if (tpl.checked.length === 0) return setError(t('Cochez au moins une ligne de travaux'))
    const out = { ...tpl, name, notes: tpl.notes.trim(), id: tpl.id || 'tpl' + Date.now().toString(36) }
    saveQuoteTemplate(out)
    logChange(me, 'catalogue', isNew ? 'A créé le modèle « {name} »' : 'A modifié le modèle « {name} »', { name })
    toast(t('Modèle enregistré'))
    onClose()
  }

  const q = normalize(query.trim())

  return (
    <Drawer open onClose={onClose} width="max-w-3xl" title={readOnly ? t(initial.name) : isNew ? t('Nouveau modèle de soumission') : t('Modifier le modèle')}>
      <fieldset disabled={readOnly} className="p-5 space-y-6 min-w-0">
        <section className="grid sm:grid-cols-3 gap-3">
          <Field label={t('Nom du modèle')} className="sm:col-span-3">
            <input className="form-input" value={tpl.name} onChange={(e) => setTpl({ ...tpl, name: e.target.value })} placeholder={t('ex. Bardeaux · bungalow')} autoFocus={!readOnly} />
          </Field>
          <Field label={t('Compagnie')}>
            <Select<CompanyId> value={tpl.company} onChange={setCompany} disabled={readOnly} searchable={false} options={COMPANIES.map((c) => ({ value: c.id, label: c.name }))} />
          </Field>
          <Field label={t('Type de travaux')}>
            <Select value={tpl.workType} onChange={(workType) => setTpl({ ...tpl, workType })} disabled={readOnly} searchable={false} options={WORK_KINDS[tpl.company].map((k) => ({ value: k, label: t(k) }))} />
          </Field>
        </section>

        <section>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h4 className="text-sm font-semibold text-ink flex-1">{t('Lignes de travaux cochées ({n})', { n: tpl.checked.length })}</h4>
            <label className="relative w-full sm:w-56">
              <Search className="w-4 h-4 text-ink-faint absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input className="form-input h-8 pl-8" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Filtrer les clauses')} aria-label={t('Filtrer les clauses')} />
            </label>
          </div>
          <div className="rounded-lg border border-hairline divide-y divide-hairline max-h-[50vh] overflow-y-auto">
            {sections.map((s) => {
              const lines = s.lines.filter((l) => !q || normalize(t(l)).includes(q))
              if (lines.length === 0) return null
              const all = lines.every((l) => checked.has(l))
              return (
                <div key={s.name} className="px-3 py-2">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="label-caps">{t(s.name)}</p>
                    {!readOnly && (
                      <button type="button" className="text-2xs font-semibold text-primary-press hover:underline" onClick={() => toggleSection(lines, !all)}>
                        {all ? t('Tout décocher') : t('Tout cocher')}
                      </button>
                    )}
                  </div>
                  <ul className="space-y-1">
                    {lines.map((l) => (
                      <li key={l}>
                        <label className="flex items-start gap-2 text-sm text-ink-secondary cursor-pointer">
                          <input type="checkbox" className="mt-1" checked={checked.has(l)} onChange={() => toggle(l)} />
                          <span>
                            <ClauseText text={l} />
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
          {tpl.costs.length === 0 ? (
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
                  {tpl.costs.map((c, i) => {
                    const it = costItemById(c.itemId)
                    return (
                      <tr key={c.itemId}>
                        <td className="td">{it ? t(it.name) : <span className="text-tone-critical-ink">{t('Item supprimé du catalogue')}</span>}</td>
                        <td className="td text-right">
                          <span className="inline-flex items-center gap-1">
                            <input className="form-input h-8 w-20 text-right tnum" inputMode="decimal" value={c.qty} onChange={(e) => setTpl({ ...tpl, costs: tpl.costs.map((x, k) => (k === i ? { ...x, qty: Number(e.target.value.replace(',', '.')) || 0 } : x)) })} aria-label={t('Quantité')} />
                            <span className="text-xs text-ink-mute w-10 text-left">{it ? t(it.unit) : ''}</span>
                          </span>
                        </td>
                        <td className="td text-right tnum">{it ? money(it.sell * c.qty) : '—'}</td>
                        <td className="td text-right">
                          {!readOnly && (
                            <button type="button" className="p-1.5 rounded-md hover:bg-tone-critical-soft hover:text-tone-critical-ink" aria-label={t('Retirer')} onClick={() => setTpl({ ...tpl, costs: tpl.costs.filter((_, k) => k !== i) })}>
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
          {!readOnly && itemOptions.length > 0 && (
            <div className="flex gap-2 mt-2">
              <Select value={addItem} onChange={setAddItem} className="flex-1" options={[{ value: '', label: t('Choisir un item du catalogue…') }, ...itemOptions]} />
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                disabled={!addItem}
                onClick={() => {
                  setTpl({ ...tpl, costs: [...tpl.costs, { itemId: addItem, qty: 1 }] })
                  setAddItem('')
                }}
              >
                <Plus className="w-4 h-4" />
                {t('Ajouter')}
              </button>
            </div>
          )}
          {tpl.costs.length > 0 && (
            <p className="text-sm text-ink-secondary mt-2 tnum">
              {t('Total au prix de vente : {n}', { n: money(totals.sell, false) })}
              {showCosts && ` · ${t('marge {n}', { n: pct(totals.margin) })}`}
            </p>
          )}
        </section>

        <section>
          <h4 className="text-sm font-semibold text-ink mb-2">{t('Garanties par défaut')}</h4>
          <div className="space-y-3">
            {WARRANTY_GROUPS[tpl.company].map((g) => {
              const opts = WARRANTIES.find((w) => w.group === g)?.opts ?? []
              return (
                <div key={g}>
                  <p className="label-caps mb-1">{t(g)}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {opts.map((o) => {
                      const on = tpl.warranties[g] === o
                      return (
                        <button
                          type="button"
                          key={o}
                          aria-pressed={on}
                          onClick={() => {
                            const w = { ...tpl.warranties }
                            if (on) delete w[g]
                            else w[g] = o
                            setTpl({ ...tpl, warranties: w })
                          }}
                          className={cn('px-2.5 py-1 rounded-md text-xs font-medium border', on ? 'bg-primary-wash border-primary text-primary-press' : 'border-hairline text-ink-secondary hover:border-hairline-strong')}
                        >
                          {t(o)}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <Field label={t('Notes par défaut (imprimées sur la soumission)')}>
          <textarea rows={3} className="form-input h-auto py-2 text-sm" value={tpl.notes} onChange={(e) => setTpl({ ...tpl, notes: e.target.value })} />
        </Field>

        {error && <Notice tone="critical">{error}</Notice>}
      </fieldset>
      <div className="sticky bottom-0 bg-white border-t border-hairline px-5 py-3 flex justify-end gap-2">
        <button className="btn btn-sm btn-ghost" onClick={onClose}>
          {readOnly ? t('Fermer') : t('Annuler')}
        </button>
        {!readOnly && (
          <button className="btn btn-sm btn-primary" onClick={save}>
            {t('Enregistrer')}
          </button>
        )}
      </div>
    </Drawer>
  )
}
