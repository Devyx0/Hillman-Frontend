/** Catalogue tabs (mockup: Z4→WorkLinesTab, J4→ExpertisesTab, $4→CostItemsTab, F4→TemplatesTab, K4→WarrantiesTab). */
import { useState } from 'react'
import { ArrowDown, ArrowUp, Check, ChevronRight, GripVertical, ListChecks, Package, Pencil, Percent, Plus, SearchCheck, Trash2, TriangleAlert } from 'lucide-react'
import { Badge, Card, Field } from '../../components/ui'
import { COMPANIES, SCOPE_SECTIONS, type CompanyId, type ScopeSection } from '../../data/mock'
import { toast } from '../../lib/toast'
import { cn, pct } from '../../lib/utils'
import { t } from '../../i18n'
import { Select } from '../../components/filters'
import { COST_ITEMS, EXPERTISES, GUTTER_SCOPE, QUOTE_TEMPLATES, RENO_SCOPE, WARRANTIES, WORK_KINDS, type CostCatalogue } from './data'

export function WorkLinesTab() {
  const [company, setCompany] = useState<CompanyId>('toit')
  const [kind, setKind] = useState('Toit en pente')
  const [byCompany, setByCompany] = useState<Record<CompanyId, ScopeSection[]>>(() => ({
    toit: SCOPE_SECTIONS.map((s) => ({ ...s, lines: [...s.lines] })),
    sg: GUTTER_SCOPE,
    reno: RENO_SCOPE,
  }))
  const [active, setActive] = useState(0)
  const [draft, setDraft] = useState('')
  const sections = byCompany[company]

  const move = (section: number, index: number, dir: number) =>
    setByCompany((prev) => {
      const next = { ...prev, [company]: prev[company].map((s) => ({ ...s, lines: [...s.lines] })) }
      const lines = next[company][section].lines
      const target = index + dir
      if (target < 0 || target >= lines.length) return prev
      ;[lines[index], lines[target]] = [lines[target], lines[index]]
      return next
    })
  const remove = (section: number, index: number) => setByCompany((prev) => ({ ...prev, [company]: prev[company].map((s, i) => (i === section ? { ...s, lines: s.lines.filter((_, k) => k !== index) } : s)) }))
  const add = (section: number) => {
    if (!draft.trim()) return
    setByCompany((prev) => ({ ...prev, [company]: prev[company].map((s, i) => (i === section ? { ...s, lines: [...s.lines, draft.trim()] } : s)) }))
    setDraft('')
    toast(t('Ligne ajoutée au catalogue'))
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
            }}
            className="w-52"
            options={COMPANIES.map((c) => ({ value: c.id, label: c.name }))}
          />
        </Field>
        <Field label={t('Type de travaux')}>
          <Select value={kind} onChange={setKind} className="w-44" options={WORK_KINDS[company].map((k) => ({ value: k, label: t(k) }))} />
        </Field>
      </div>
      <div className="grid lg:grid-cols-[240px_minmax(0,1fr)] gap-4 items-start">
        <nav className="bg-white rounded-xl shadow-card p-2 lg:sticky lg:top-20 flex lg:flex-col gap-0.5 overflow-x-auto" aria-label={t('Sections')}>
          {sections.map((s, i) => (
            <button key={s.name} onClick={() => setActive(i)} className={cn('flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm text-left whitespace-nowrap', active === i ? 'bg-primary-wash text-primary-press font-semibold' : 'text-ink-mute hover:bg-sand hover:text-ink')}>
              <span className="truncate">{t(s.name)}</span>
              <span className="tnum text-2xs">{s.lines.length}</span>
            </button>
          ))}
          <button className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-ink-mute hover:bg-sand whitespace-nowrap" onClick={() => toast(t('Nouvelle section'))}>
            <Plus className="w-3.5 h-3.5" />
            {t('Section')}
          </button>
        </nav>
        <Card title={sections[active] ? t(sections[active].name) : undefined} icon={ListChecks} pad={false}>
          <ul className="divide-y divide-hairline">
            {sections[active]?.lines.map((line, i) => (
              <li key={line + i} className="group flex items-center gap-2 px-4 py-2.5 hover:bg-sand/60">
                <GripVertical className="w-4 h-4 text-ink-faint shrink-0 cursor-grab" />
                <span className="flex-1 text-sm text-ink-secondary">{t(line)}</span>
                <span className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100">
                  <button aria-label={t('Monter')} onClick={() => move(active, i, -1)} className="p-1.5 rounded-md hover:bg-stone">
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button aria-label={t('Descendre')} onClick={() => move(active, i, 1)} className="p-1.5 rounded-md hover:bg-stone">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button aria-label={t('Modifier')} onClick={() => toast(t('Édition en ligne'))} className="p-1.5 rounded-md hover:bg-stone">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button aria-label={t('Supprimer')} onClick={() => remove(active, i)} className="p-1.5 rounded-md hover:bg-tone-critical-soft hover:text-tone-critical-ink">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <form
            className="flex gap-2 p-3 border-t border-hairline bg-sand/40"
            onSubmit={(e) => {
              e.preventDefault()
              add(active)
            }}
          >
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t('Nouvelle ligne de travaux…')} className="form-input" aria-label={t('Nouvelle ligne')} />
            <button className="btn btn-md btn-secondary">
              <Plus className="w-4 h-4" />
              {t('Ajouter')}
            </button>
          </form>
        </Card>
      </div>
    </div>
  )
}

export function ExpertisesTab() {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {EXPERTISES.map((x) => (
        <Card
          key={x.name}
          title={t(x.name)}
          icon={SearchCheck}
          actions={
            <button className="btn btn-xs btn-ghost" onClick={() => toast(t('Option ajoutée'))}>
              <Plus className="w-3.5 h-3.5" />
            </button>
          }
        >
          <ul className="space-y-1.5">
            {x.opts.map((opt, i) => {
              const last = i === x.opts.length - 1
              return (
                <li key={opt} className="flex items-center gap-2 text-sm text-ink-secondary">
                  <span className={cn('w-4 h-4 rounded border flex items-center justify-center shrink-0', last ? 'bg-primary border-primary text-white' : 'border-hairline-strong')}>{last && <Check className="w-3 h-3" />}</span>
                  {t(opt)}
                </li>
              )
            })}
          </ul>
        </Card>
      ))}
    </div>
  )
}

const clone = (c: CostCatalogue): CostCatalogue => JSON.parse(JSON.stringify(c))

export function CostItemsTab() {
  const [general, setGeneral] = useState('Toit en pente')
  const [category, setCategory] = useState('Bardeaux')
  const [catalogue, setCatalogue] = useState<CostCatalogue>(() => clone(COST_ITEMS))
  const [targetMargin, setTargetMargin] = useState(30)
  const categories = Object.keys(catalogue[general] ?? {})
  const items = catalogue[general]?.[category] ?? []
  const atCost = Object.values(catalogue)
    .flatMap((g) => Object.values(g).flat())
    .filter((it) => it.sell <= it.cost && !/Frais fixes/.test(it.name)).length

  const update = (id: string, key: 'cost' | 'sell', value: number) =>
    setCatalogue((prev) => {
      const next = clone(prev)
      const item = next[general][category].find((it) => it.id === id)!
      item[key] = value
      return next
    })
  const applyMargin = () => {
    setCatalogue((prev) => {
      const next = clone(prev)
      for (const g of Object.values(next)) for (const list of Object.values(g)) for (const it of list) if (!/Frais fixes/.test(it.name)) it.sell = Math.ceil((it.cost / (1 - targetMargin / 100)) * 2) / 2
      return next
    })
    toast(t('Marge de {n} % appliquée', { n: targetMargin }))
  }

  const columns = [
    {
      label: 'Catégorie générale',
      opts: Object.keys(catalogue),
      val: general,
      set: (g: string) => {
        setGeneral(g)
        setCategory(Object.keys(catalogue[g])[0] ?? '')
      },
    },
    { label: 'Catégorie', opts: categories, val: category, set: setCategory },
  ]

  return (
    <div className="space-y-4">
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
      </div>
      <div className="grid lg:grid-cols-[220px_220px_minmax(0,1fr)] gap-4 items-start">
        {columns.map((col) => (
          <div key={col.label} className="bg-white rounded-xl shadow-card p-2">
            <p className="label-caps px-3 py-2">{t(col.label)}</p>
            {col.opts.length === 0 && <p className="px-3 py-2 text-xs text-ink-mute">{t('Aucune catégorie')}</p>}
            {col.opts.map((opt) => (
              <button key={opt} onClick={() => col.set(opt)} className={cn('w-full flex items-center justify-between px-3 py-2 rounded-md text-sm text-left', col.val === opt ? 'bg-primary-wash text-primary-press font-semibold' : 'text-ink-mute hover:bg-sand hover:text-ink')}>
                <span className="truncate">{t(opt)}</span>
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            ))}
          </div>
        ))}
        <Card
          title={category ? t(category) : '—'}
          icon={Package}
          pad={false}
          actions={
            <button className="btn btn-xs btn-secondary" onClick={() => toast(t('Nouvel item'))}>
              <Plus className="w-3.5 h-3.5" />
              {t('Item')}
            </button>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead className="bg-sand/60 border-b border-hairline">
                <tr>
                  {['Description', 'Unité', 'Coûtant', 'Vendant', 'Marge'].map((h, i) => (
                    <th key={h} className={cn('th', i > 1 && 'text-right')}>
                      {t(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {items.map((it) => {
                  const margin = it.sell > 0 ? ((it.sell - it.cost) / it.sell) * 100 : 0
                  return (
                    <tr key={it.id} className="hover:bg-sand/60">
                      <td className="td font-medium text-ink">{t(it.name)}</td>
                      <td className="td text-ink-mute">{t(it.unit)}</td>
                      <td className="td text-right">
                        <input aria-label={t('Coûtant')} type="number" step="0.5" value={it.cost} onChange={(e) => update(it.id, 'cost', Number(e.target.value))} className="form-input h-8 w-24 text-right tnum ml-auto" />
                      </td>
                      <td className="td text-right">
                        <input aria-label={t('Vendant')} type="number" step="0.5" value={it.sell} onChange={(e) => update(it.id, 'sell', Number(e.target.value))} className="form-input h-8 w-24 text-right tnum ml-auto" />
                      </td>
                      <td className="td text-right">
                        <Badge tone={margin <= 0.5 ? 'critical' : margin < 20 ? 'warn' : 'good'}>{pct(margin)}</Badge>
                      </td>
                    </tr>
                  )
                })}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="td text-center text-ink-mute py-8">
                      {t('Aucun item dans cette catégorie')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}

export function TemplatesTab() {
  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {QUOTE_TEMPLATES.map((tpl) => (
        <div key={tpl.name} className="bg-white rounded-xl shadow-card p-5 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-md font-semibold truncate">{t(tpl.name)}</p>
            <p className="text-xs text-ink-mute mt-0.5 tnum">
              {t('{lines} lignes · {items} items', { lines: tpl.lines, items: tpl.items })}
            </p>
          </div>
          <button className="btn btn-xs btn-secondary" onClick={() => toast(t('Modèle ouvert'))}>
            {t('Modifier')}
          </button>
        </div>
      ))}
    </div>
  )
}

export function WarrantiesTab() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {WARRANTIES.map((w) => (
        <Card
          key={w.group}
          title={t(w.group)}
          actions={
            <button className="btn btn-xs btn-ghost" aria-label={t('Ajouter')} onClick={() => toast(t('Option ajoutée'))}>
              <Plus className="w-3.5 h-3.5" />
            </button>
          }
        >
          <div className="flex flex-wrap gap-1.5">
            {w.opts.map((o) => (
              <span key={o} className="text-xs font-medium px-2.5 py-1 rounded-md bg-sand text-ink-secondary">
                {t(o)}
              </span>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}
