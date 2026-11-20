import { useState } from 'react'
import { AnnotatedPhoto } from '../../components/AnnotatedPhoto'
import { CrewNoteField } from './CrewNoteField'
import { ClipboardList, Plus, Printer, RotateCcw, Send, Trash2 } from 'lucide-react'
import { CompanyLogo, Drawer, Field } from '../../components/ui'
import { BuilderSection, ToggleChip } from '../../components/quote-shared'
import { fullName } from '../../data/mock'
import { colourLine, fillClause, gutterClauses, gutterTotals, type GutterFace, type GutterForm } from '../../data/quote-builder'
import { t } from '../../i18n'
import { toast } from '../../lib/toast'
import { cn, money, num } from '../../lib/utils'
import type { Builder } from './useQuoteBuilder'

const COLORS = ['Blanc', 'Noir', 'Brun commercial', 'Gris ardoise', 'Kaki', 'Ivoire', 'Bleu nuit']
const ROOFS = ['Bardeaux', 'Tôle', 'Membrane']
const NUM = 'w-full h-9 px-2 rounded-md border border-hairline-input text-right tnum text-sm focus:outline-none focus:border-primary'

/** Gouttières: gutter form — model 5"/6" (plan item G1), lengths per side, downspouts, storeys. */
export function FormulaireSection({ b }: { b: Builder }) {
  const g = b.gutter
  const set = (patch: Partial<GutterForm>) => b.setGutter({ ...g, ...patch })
  const setFace = (i: number, patch: Partial<GutterFace>) => set({ faces: g.faces.map((f, k) => (k === i ? { ...f, ...patch } : f)) })
  const tot = gutterTotals(g)
  const clauses = gutterClauses(b.draft, b.tiered)
  return (
    <BuilderSection id="formulaire" title={t('Formulaire gouttières')}>
      <div className="space-y-5">
        <div>
          <p className="label-caps mb-1.5">{t('Modèle')}</p>
          <div className="grid grid-cols-2 gap-2 max-w-md" role="radiogroup" aria-label={t('Modèle')}>
            {([5, 6] as const).map((size) => (
              <button
                key={size}
                role="radio"
                aria-checked={g.size === size}
                onClick={() => set({ size })}
                className={cn('rounded-lg border p-3 text-left transition-colors', g.size === size ? 'border-primary bg-primary-wash' : 'border-hairline-strong hover:border-ink/40')}
              >
                <span className="block text-lg font-semibold tnum text-ink">{size} po</span>
                <span className="block text-xs text-ink-mute">{size === 5 ? t('Standard · descentes 2 × 3') : t('Distinction · descentes 3 × 4')}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label={t('Matériau')}>
            <div className="flex flex-wrap gap-1.5">
              {(['Aluminium', 'Acier'] as const).map((m) => (
                <ToggleChip key={m} active={g.material === m} onClick={() => set({ material: m })}>
                  {t(m)}
                </ToggleChip>
              ))}
            </div>
          </Field>
          <Field label={t('Étages')}>
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3].map((n) => (
                <ToggleChip key={n} active={g.storeys === n} onClick={() => set({ storeys: n })}>
                  {n}
                </ToggleChip>
              ))}
            </div>
          </Field>
          <Field label={t('Couleur des gouttières')}>
            <select className="form-input" value={g.color} onChange={(e) => set({ color: e.target.value })}>
              {COLORS.map((c) => (
                <option key={c} value={c}>
                  {t(c)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('Couleur des descentes')}>
            <select className="form-input" value={g.downspoutColor ?? ''} onChange={(e) => set({ downspoutColor: e.target.value || undefined })}>
              <option value="">{t('Même couleur que les gouttières')}</option>
              {COLORS.map((c) => (
                <option key={c} value={c}>
                  {t(c)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('Toit')}>
            <div className="flex flex-wrap gap-1.5">
              {ROOFS.map((r) => (
                <ToggleChip key={r} active={g.roof === r} onClick={() => set({ roof: r })}>
                  {t(r)}
                </ToggleChip>
              ))}
            </div>
          </Field>
          <Field label={t('Échelles')}>
            <input type="number" min={0} className="form-input tnum max-w-[120px]" value={g.ladders} onChange={(e) => set({ ladders: Number(e.target.value) })} />
          </Field>
          <Field label={t('Gouttières existantes')}>
            <label className="flex items-center gap-2 text-sm text-ink-secondary h-9">
              <input type="checkbox" checked={g.removal} onChange={() => set({ removal: !g.removal })} className="w-4 h-4 accent-[var(--color-primary)]" />
              {t('Enlever et disposer (E.G.E)')}
            </label>
          </Field>
        </div>

        <div>
          <p className="label-caps mb-1.5">{t('Longueurs par côté')}</p>
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-hairline">
                  <th className="th pl-0">{t('Côté')}</th>
                  <th className="th text-right">{t('Gouttières (pi lin.)')}</th>
                  <th className="th text-right">{t('Descentes')}</th>
                  <th className="th text-right">{t('Long. descente (pi)')}</th>
                  <th className="th pr-0" />
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {g.faces.map((f, i) => (
                  <tr key={f.id}>
                    <td className="py-1.5 pr-2">
                      <input className="form-input h-9" value={t(f.label)} onChange={(e) => setFace(i, { label: e.target.value })} aria-label={t('Nom du côté')} />
                    </td>
                    <td className="py-1.5 px-1 w-28">
                      <input type="number" min={0} inputMode="numeric" className={NUM} value={f.gutter || ''} placeholder="0" onChange={(e) => setFace(i, { gutter: Number(e.target.value) })} aria-label={t('Gouttières {side}', { side: t(f.label) })} />
                    </td>
                    <td className="py-1.5 px-1 w-24">
                      <input type="number" min={0} inputMode="numeric" className={NUM} value={f.downspouts || ''} placeholder="0" onChange={(e) => setFace(i, { downspouts: Number(e.target.value) })} aria-label={t('Descentes {side}', { side: t(f.label) })} />
                    </td>
                    <td className="py-1.5 px-1 w-28">
                      <input type="number" min={0} inputMode="numeric" className={NUM} value={f.downLen || ''} placeholder="0" onChange={(e) => setFace(i, { downLen: Number(e.target.value) })} aria-label={t('Longueur des descentes {side}', { side: t(f.label) })} />
                    </td>
                    <td className="py-1.5 pl-1 w-9">
                      <button onClick={() => set({ faces: g.faces.filter((_, k) => k !== i) })} className="p-1.5 rounded-md text-ink-faint hover:text-tone-critical-ink hover:bg-tone-critical-soft" aria-label={t('Retirer ce côté')}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                <tr className="font-semibold text-ink">
                  <td className="py-2">
                    <button className="btn btn-xs btn-ghost" onClick={() => set({ faces: [...g.faces, { id: 'f' + Date.now(), label: t('Autre côté'), gutter: 0, downspouts: 0, downLen: 0 }] })}>
                      <Plus className="w-3.5 h-3.5" />
                      {t('Ajouter un côté')}
                    </button>
                  </td>
                  <td className="py-2 text-right tnum">{num(tot.gutter)}</td>
                  <td className="py-2 text-right tnum">{num(tot.downspouts)}</td>
                  <td className="py-2 text-right tnum">{t('{n} pi', { n: num(tot.downFeet) })}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <CrewNoteField b={b} />

        <Field label={t('Note interne (représentant et bureau)')}>
          <textarea className="form-input h-auto py-2" rows={2} value={g.note} onChange={(e) => set({ note: e.target.value })} />
        </Field>

        {clauses.length > 0 && (
          <div className="rounded-lg bg-sand/60 p-3">
            <p className="label-caps mb-1.5">{t('Clauses de la soumission (remplies automatiquement)')}</p>
            <ul className="space-y-1 text-sm text-ink-secondary">
              {clauses.map((c) => (
                <li key={c}>• {fillClause(t(c), b.values)}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </BuilderSection>
  )
}

/** Printable work order for the crew: quantities, form and photos — no prices (user story step 11). */
function WorkOrder({ b, open, onClose }: { b: Builder; open: boolean; onClose: () => void }) {
  const { quote, client, gutter } = b
  const tot = gutterTotals(gutter)
  const tier = b.tiers.find((x) => x.id === b.tier)
  const photos = b.photos.filter((p) => p.annotated || p.src)
  return (
    <Drawer open={open} onClose={onClose} title={t('Bon de travail · {no}', { no: quote.no })} width="max-w-2xl">
      <div className="space-y-5 text-sm">
        <div className="flex items-start justify-between gap-3 pb-3 border-b-2 border-ink">
          <CompanyLogo id={quote.company} className="h-9 max-w-[170px]" />
          <div className="text-right">
            <p className="font-semibold text-ink">{t('Bon de travail')}</p>
            <p className="text-ink-mute tnum">{quote.no}</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <p className="label-caps">{t('Client')}</p>
            <p className="font-semibold text-ink">{fullName(client)}</p>
            <p className="text-ink-secondary">
              {client.no} {client.street}, {client.city}
            </p>
            <p className="text-ink-secondary tnum">{client.mobile || client.phone}</p>
          </div>
          <div>
            <p className="label-caps">{t('Travaux')}</p>
            <p className="text-ink-secondary">{t('Gouttières {size} po · {material}', { size: gutter.size, material: t(gutter.material) })}</p>
            <p className="font-semibold text-ink">{colourLine(gutter, t)}</p>
            <p className="text-ink-secondary">
              {t('{n} étages · {l} échelles · toit : {roof}', { n: gutter.storeys, l: gutter.ladders, roof: t(gutter.roof) })}
            </p>
            {tier && b.tiered && <p className="text-ink-secondary">{t('Protection : {tier}', { tier: t(tier.label) })}</p>}
          </div>
        </div>
        <div>
          <p className="label-caps mb-1">{t('Par côté')}</p>
          <ul className="divide-y divide-hairline rounded-lg border border-hairline">
            {gutter.faces
              .filter((f) => f.gutter || f.downspouts)
              .map((f) => (
                <li key={f.id} className="px-3 py-1.5 flex justify-between gap-3">
                  <span>{t(f.label)}</span>
                  <span className="tnum text-ink-secondary">{t('{g} pi lin. · {d} descentes × {l} pi', { g: f.gutter, d: f.downspouts, l: f.downLen })}</span>
                </li>
              ))}
            <li className="px-3 py-1.5 flex justify-between gap-3 font-semibold">
              <span>{t('Total')}</span>
              <span className="tnum">{t('{g} pi lin. · {d} descentes', { g: tot.gutter, d: tot.downspouts })}</span>
            </li>
          </ul>
        </div>
        <div>
          <p className="label-caps mb-1">{t('Matériel')}</p>
          <ul className="divide-y divide-hairline rounded-lg border border-hairline">
            {b.costs.map((l, i) => (
              <li key={i} className="px-3 py-1.5 flex justify-between gap-3">
                <span>{t(l.item)}</span>
                <span className="tnum font-semibold">
                  {num(l.qty)} {t(l.unit)}
                </span>
              </li>
            ))}
          </ul>
        </div>
        {b.crewNote && (
          <div>
            <p className="label-caps mb-1">{t("Note pour l'équipe")}</p>
            <p className="text-ink-secondary whitespace-pre-line">{t(b.crewNote)}</p>
          </div>
        )}
        {photos.length > 0 && (
          <div>
            <p className="label-caps mb-1">{t('Photos annotées')}</p>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((p) => (
                <figure key={p.id}>
                  <div className="relative rounded-md aspect-[4/3] overflow-hidden bg-stone">
                    <AnnotatedPhoto photo={p} />
                  </div>
                  <figcaption className="text-2xs text-ink-mute mt-0.5 truncate">{t(p.label)}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2 pt-2">
          <button className="btn btn-sm btn-secondary" onClick={() => window.print()}>
            <Printer className="w-4 h-4" />
            {t('Imprimer')}
          </button>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => {
              toast(t("Bon de travail {no} envoyé à l'équipe", { no: quote.no }))
              onClose()
            }}
          >
            <Send className="w-4 h-4" />
            {t("Envoyer à l'équipe")}
          </button>
        </div>
      </div>
    </Drawer>
  )
}

/**
 * Gouttières: quantities computed live from the form, the chosen tier and add-ons (no manual
 * recalculation). The rep can still type over a quantity; overridden rows are flagged and
 * "Rétablir les valeurs du formulaire" drops the overrides. It is the crew's work order, so it carries
 * no selling prices; costs show only with the `quotes.costs` permission.
 */
export function QuantitesSection({ b }: { b: Builder }) {
  const [orderOpen, setOrderOpen] = useState(false)
  const { costs, canCosts } = b
  const overridden = Object.keys(b.qtyOverrides ?? {}).filter((k) => costs.some((l) => l.item === k))
  const formQty = (item: string) => b.formLines.find((l) => l.item === item)?.qty
  return (
    <BuilderSection
      id="quantites"
      title={t('Quantités')}
      actions={
        <>
          {overridden.length > 0 && (
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => {
                b.resetQuantities()
                toast(t('Quantités rétablies selon le formulaire'))
              }}
            >
              <RotateCcw className="w-4 h-4" />
              {t('Rétablir les valeurs du formulaire')}
            </button>
          )}
          <button className="btn btn-sm btn-secondary" onClick={() => setOrderOpen(true)}>
            <ClipboardList className="w-4 h-4" />
            {t('Bon de travail')}
          </button>
        </>
      }
    >
      {costs.length === 0 ? (
        <p className="text-sm text-ink-mute">{t('Entrez les longueurs dans le formulaire : les quantités se calculent seules.')}</p>
      ) : (
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full min-w-[440px] text-sm">
            <thead>
              <tr className="border-b border-hairline">
                <th className="th pl-0">{t('Item')}</th>
                <th className="th text-right">{t('Qté')}</th>
                {canCosts && <th className="th text-right">{t('Coûtant')}</th>}
                {canCosts && <th className="th text-right pr-0">{t('Total coûtant')}</th>}
                <th className="th w-8 pr-0" />
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {costs.map((l) => {
                const manual = l.item in (b.qtyOverrides ?? {})
                const fromForm = formQty(l.item)
                return (
                  <tr key={l.item} className={cn(manual && 'bg-tone-warn-soft/40')}>
                    <td className="py-1.5 pr-2 text-ink-secondary">
                      {t(l.item)} <span className="text-2xs text-ink-faint">· {t(l.cat)}</span>
                      {manual && (
                        <span className="block text-2xs text-tone-warn-ink">
                          {t('Modifié à la main · formulaire : {n} {unit}', { n: num(fromForm ?? 0), unit: t(l.unit) })}
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 text-right">
                      <span className="inline-flex items-center gap-1.5">
                        <input type="number" min={0} value={l.qty} onChange={(e) => b.setQty(l.item, Number(e.target.value))} className={cn('w-20 h-8 px-2 rounded-md border text-right tnum text-sm focus:outline-none focus:border-primary', manual ? 'border-tone-warn' : 'border-hairline-input')} aria-label={t('Quantité {item}', { item: t(l.item) })} />
                        <span className="text-2xs text-ink-mute w-10 text-left">{t(l.unit)}</span>
                      </span>
                    </td>
                    {canCosts && <td className="py-1.5 text-right tnum text-ink-mute">{money(l.cost)}</td>}
                    {canCosts && <td className="py-1.5 text-right tnum font-semibold">{money(l.qty * l.cost, false)}</td>}
                    <td className="py-1.5 pl-1 text-right">
                      <button onClick={() => b.setQty(l.item, 0)} disabled={l.qty === 0} className="p-1.5 rounded-md text-ink-faint hover:text-tone-critical-ink hover:bg-tone-critical-soft disabled:opacity-30" aria-label={t('Retirer {item}', { item: t(l.item) })} title={t('Mettre à 0')}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-ink-mute mt-3">
        {t('Calculées automatiquement depuis le formulaire, l’option de protection et les ajouts choisis. Cette liste devient le bon de travail de l’équipe — sans prix.')}
      </p>
      <WorkOrder b={b} open={orderOpen} onClose={() => setOrderOpen(false)} />
    </BuilderSection>
  )
}
