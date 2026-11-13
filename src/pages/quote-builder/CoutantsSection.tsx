import { ChevronDown, LayoutList, List, Plus, RefreshCw, Scale, Search, Trash2, TrendingUp } from 'lucide-react'
import { Field } from '../../components/ui'
import type { MaterialLine } from '../../data/mock'
import { toast } from '../../lib/toast'
import { cn, money, pct } from '../../lib/utils'
import { TARGET_MARGIN } from '../../data/quote-builder'
import { BuilderSection } from '../../components/quote-shared'
import type { Builder } from './useQuoteBuilder'

const NUM_INPUT = 'h-8 px-2 rounded-md border border-hairline-input text-right tnum text-sm focus:outline-none focus:border-primary'

/** Catalogue picker: every item of the company, quantities typed in place. */
function ListMode({ b }: { b: Builder }) {
  const { listDraft, listFilter } = b
  const update = (index: number, key: keyof MaterialLine, value: number) => b.setListDraft((prev) => prev.map((l, i) => (i === index ? { ...l, [key]: value } : l)))
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex-1" />
        <div className="relative w-full sm:w-56">
          <Search className="w-3.5 h-3.5 text-ink-mute absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input value={listFilter} onChange={(e) => b.setListFilter(e.target.value)} placeholder="Filtrer…" className="form-input h-8 pl-8 text-sm" aria-label="Filtrer les items du catalogue" />
        </div>
      </div>
      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-hairline">
              <th className="th pl-0">Item</th>
              <th className="th text-right">Qté</th>
              <th className="th text-right">Vendant</th>
              <th className="th text-right">Coûtant</th>
              <th className="th text-right pr-0">Total</th>
            </tr>
          </thead>
          {[...new Set(listDraft.map((l) => l.cat))].map((cat) => {
            const rows = listDraft.map((l, i) => ({ l, i })).filter((r) => r.l.cat === cat && (!listFilter || r.l.item.toLowerCase().includes(listFilter.toLowerCase())))
            if (!rows.length) return null
            return (
              <tbody key={cat} className="border-b border-hairline">
                <tr>
                  <td colSpan={5} className="pt-3 pb-0.5 label-caps">
                    {cat}
                  </td>
                </tr>
                {rows.map(({ l, i }) => (
                  <tr key={l.item} className={cn('hover:bg-sand/50', l.qty > 0 ? 'text-ink' : 'text-ink-mute')}>
                    <td className="py-1 pr-2">
                      {l.item} <span className="text-2xs text-ink-faint">/ {l.unit}</span>
                    </td>
                    <td className="py-1 text-right">
                      <input type="number" min={0} value={l.qty || ''} placeholder="0" onChange={(e) => update(i, 'qty', Number(e.target.value))} className={cn('w-16 h-8 px-2 rounded-md border text-right tnum text-sm focus:outline-none focus:border-primary', l.qty > 0 ? 'border-primary bg-primary-wash' : 'border-hairline-input')} aria-label={`Quantité ${l.item}`} />
                    </td>
                    <td className="py-1 text-right">
                      <input type="number" min={0} step="0.01" value={l.sell} onChange={(e) => update(i, 'sell', Number(e.target.value))} className={cn('w-20', NUM_INPUT)} aria-label={`Vendant ${l.item}`} />
                    </td>
                    <td className="py-1 text-right">
                      <input type="number" min={0} step="0.01" value={l.cost} onChange={(e) => update(i, 'cost', Number(e.target.value))} className="w-20 h-8 px-2 rounded-md border border-hairline-input text-right tnum text-sm text-ink-mute focus:outline-none focus:border-primary" aria-label={`Coûtant ${l.item}`} />
                    </td>
                    <td className="py-1 text-right tnum font-semibold">{l.qty > 0 ? money(l.qty * l.sell, false) : <span className="text-ink-faint">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            )
          })}
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <p className="text-xs text-ink-mute tnum">
          {listDraft.filter((l) => l.qty > 0).length} items · {money(listDraft.reduce((n, l) => n + l.qty * l.sell, 0), false)}
        </p>
        <div className="flex gap-2">
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => {
              b.setCostMode('std')
              b.setListFilter('')
            }}
          >
            Annuler
          </button>
          <button className="btn btn-sm btn-primary" onClick={b.applyList}>
            <RefreshCw className="w-4 h-4" />
            Mettre à jour
          </button>
        </div>
      </div>
    </div>
  )
}

/** Lines currently in the quote, grouped by category, with margin per line. */
function StandardMode({ b }: { b: Builder }) {
  const { costs } = b
  return (
    <>
      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-hairline">
              <th className="th pl-0">Item</th>
              <th className="th text-right">Qté</th>
              <th className="th text-right">Coûtant</th>
              <th className="th text-right">Vendant</th>
              <th className="th text-right">Total</th>
              <th className="th text-right pr-0">Marge</th>
            </tr>
          </thead>
          {b.costCats.map((cat) => {
            const rows = costs.map((l, i) => ({ l, i })).filter((r) => r.l.cat === cat)
            const catTotal = rows.reduce((n, r) => n + r.l.qty * r.l.sell, 0)
            return (
              <tbody key={cat} className="border-b border-hairline">
                <tr>
                  <td colSpan={6} className="pt-3 pb-0.5 label-caps">
                    {cat}
                  </td>
                </tr>
                {rows.map(({ l, i }) => {
                  const margin = l.sell ? ((l.sell - l.cost) / l.sell) * 100 : 0
                  return (
                    <tr key={i} className="hover:bg-sand/50">
                      <td className="py-1 pr-2 text-ink-secondary">{l.item}</td>
                      <td className="py-1.5 text-right">
                        <span className="inline-flex items-center gap-1.5">
                          <input type="number" value={l.qty} min={0} onChange={(e) => b.setCosts((prev) => prev.map((x, k) => (k === i ? { ...x, qty: Number(e.target.value) } : x)))} className={cn('w-16', NUM_INPUT)} aria-label={`Quantité ${l.item}`} />
                          <span className="text-2xs text-ink-mute w-10 text-left">{l.unit}</span>
                        </span>
                      </td>
                      <td className="py-1.5 text-right tnum text-ink-mute">{money(l.cost)}</td>
                      <td className="py-1.5 text-right tnum">{money(l.sell)}</td>
                      <td className="py-1.5 text-right tnum font-semibold text-ink">{money(l.qty * l.sell, false)}</td>
                      <td className="py-1.5 text-right tnum">
                        <span className={cn('text-xs font-semibold', margin >= TARGET_MARGIN ? 'text-tone-good-ink' : margin > 0 ? 'text-tone-warn-ink' : 'text-ink-faint')}>{margin > 0 ? pct(margin) : '—'}</span>
                      </td>
                    </tr>
                  )
                })}
                {rows.length > 1 && (
                  <tr>
                    <td colSpan={4} />
                    <td className="pb-2 text-right tnum text-xs font-semibold text-ink-mute border-t border-hairline pt-1">{money(catTotal, false)}</td>
                    <td />
                  </tr>
                )}
              </tbody>
            )
          })}
        </table>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button className="btn btn-sm btn-quiet" onClick={() => toast('Item ajouté depuis le catalogue')}>
          <Plus className="w-4 h-4" />
          Ajouter un item
        </button>
        <div className="grid grid-cols-3 gap-3 flex-1 min-w-[280px] max-w-xl">
          <div className="rounded-lg bg-sand p-3">
            <p className="label-caps">Coûtant</p>
            <p className="text-md font-semibold tnum">{money(b.costTotal, false)}</p>
          </div>
          <div className="rounded-lg bg-sand p-3">
            <p className="label-caps">Vendant</p>
            <p className="text-md font-semibold tnum">{money(costs.reduce((n, l) => n + l.qty * l.sell, 0), false)}</p>
          </div>
          <div className="rounded-lg bg-ink text-white p-3">
            <p className="label-caps text-white/70">Profit estimé</p>
            <p className="text-md font-semibold tnum">{money(b.profit, false)}</p>
          </div>
        </div>
      </div>
    </>
  )
}

const ACTUAL_FIELDS: ['conteneurs' | 'salaires' | 'frais', string][] = [
  ['conteneurs', 'Conteneurs'],
  ['salaires', 'Salaires'],
  ['frais', 'Frais fixes'],
]

/** Post-job actual costs vs estimate (roofing only). */
function ActualProfit({ b }: { b: Builder }) {
  const { actuals, setActuals } = b
  return (
    <div className="mt-6 rounded-xl border border-hairline">
      <button onClick={() => b.setActualsOpen((o) => !o)} className="w-full px-4 py-3 flex flex-wrap items-center gap-2 text-left" aria-expanded={b.actualsOpen}>
        <Scale className="w-4 h-4 text-ink-mute" />
        <span className="text-sm font-semibold text-ink">Profit réel</span>
        <ChevronDown className={cn('w-4 h-4 text-ink-mute ml-auto transition-transform', b.actualsOpen && 'rotate-180')} />
      </button>
      {b.actualsOpen && (
        <div className="px-4 pb-4 grid lg:grid-cols-[minmax(0,1fr)_260px] gap-5 border-t border-hairline pt-4">
          <div className="space-y-3 min-w-0">
            <Field label="Montant final">
              <div className="relative">
                <input type="number" value={actuals.final || ''} placeholder={String(Math.round(b.subtotal))} onChange={(e) => setActuals({ ...actuals, final: Number(e.target.value) })} className="form-input pr-8 tnum" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-mute">$</span>
              </div>
            </Field>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="label-caps">Factures fournisseurs</p>
                <button className="btn btn-xs btn-ghost" onClick={() => setActuals({ ...actuals, invoices: [...actuals.invoices, { id: 'f' + (actuals.invoices.length + 1) + Date.now(), label: `Facture ${actuals.invoices.length + 1}`, amount: 0 }] })}>
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter
                </button>
              </div>
              <div className="rounded-lg border border-hairline divide-y divide-hairline">
                {actuals.invoices.map((inv, i) => (
                  <div key={inv.id} className="flex items-center gap-2 px-3 py-1.5">
                    <input value={inv.label} onChange={(e) => setActuals({ ...actuals, invoices: actuals.invoices.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)) })} className="flex-1 min-w-0 h-8 px-2 text-sm rounded-md border border-transparent hover:border-hairline-input focus:border-primary focus:outline-none" aria-label={`Libellé facture ${i + 1}`} />
                    <span className="text-xs text-tone-critical-ink">−</span>
                    <input type="number" value={inv.amount || ''} onChange={(e) => setActuals({ ...actuals, invoices: actuals.invoices.map((x, k) => (k === i ? { ...x, amount: Number(e.target.value) } : x)) })} className={cn('w-24', NUM_INPUT)} aria-label={`Montant facture ${i + 1}`} />
                    <button onClick={() => setActuals({ ...actuals, invoices: actuals.invoices.filter((_, k) => k !== i) })} className="p-1.5 rounded-md text-ink-faint hover:text-tone-critical-ink hover:bg-tone-critical-soft" aria-label="Retirer la facture">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {ACTUAL_FIELDS.map(([key, label]) => (
                <Field key={key} label={label}>
                  <div className="relative">
                    <input type="number" value={actuals[key] || ''} onChange={(e) => setActuals({ ...actuals, [key]: Number(e.target.value) })} className="form-input pr-7 tnum" />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-mute">$</span>
                  </div>
                </Field>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="rounded-lg bg-sand p-3 space-y-1 text-sm tnum">
              <div className="flex justify-between">
                <span className="text-ink-mute">Montant final</span>
                <span>{money(b.finalAmount, false)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-mute">Coûts réels</span>
                <span className="text-tone-critical-ink">− {money(b.actualCosts, false)}</span>
              </div>
            </div>
            <div className="rounded-lg bg-ink text-white p-3">
              <p className="label-caps text-white/70">Profit réel</p>
              <p className="text-2xl font-semibold tnum">{money(b.actualProfit, false)}</p>
              <p className="text-xs text-white/70 tnum">Marge réelle {pct(b.actualMargin, 1)}</p>
            </div>
            <div className="rounded-lg border border-hairline p-3 text-xs space-y-1 tnum">
              <div className="flex justify-between">
                <span className="text-ink-mute">Écart vs estimé</span>
                <span className={cn('font-semibold inline-flex items-center gap-1', b.actualProfit >= b.profit ? 'text-tone-good-ink' : 'text-tone-critical-ink')}>
                  <TrendingUp className={cn('w-3.5 h-3.5', b.actualProfit < b.profit && 'rotate-180')} />
                  {b.actualProfit >= b.profit ? '+' : '−'} {money(Math.abs(b.actualProfit - b.profit), false)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function CoutantsSection({ b }: { b: Builder }) {
  const { costMode } = b
  const modeBtn = (on: boolean) => cn('h-7 px-2.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5', on ? 'bg-white text-ink shadow-card' : 'text-ink-mute hover:text-ink')
  return (
    <BuilderSection
      id="coutants"
      title="Coûtants"
      actions={
        <div className="inline-flex p-0.5 bg-sand rounded-lg" role="radiogroup" aria-label="Mode des coûtants">
          <button role="radio" aria-checked={costMode === 'std'} onClick={() => b.setCostMode('std')} className={modeBtn(costMode === 'std')}>
            <LayoutList className="w-3.5 h-3.5" />
            Standard
          </button>
          <button role="radio" aria-checked={costMode === 'liste'} onClick={() => (costMode === 'liste' ? null : b.openList())} className={modeBtn(costMode === 'liste')}>
            <List className="w-3.5 h-3.5" />
            Liste
          </button>
        </div>
      }
    >
      {costMode === 'liste' ? <ListMode b={b} /> : <StandardMode b={b} />}
      {b.quote.company === 'toit' && <ActualProfit b={b} />}
    </BuilderSection>
  )
}
