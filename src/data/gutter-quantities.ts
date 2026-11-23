/**
 * Signature Gouttières quantities: pure math, no UI, no translations (French item names, translated at
 * display). The gutter form (lengths per side, downspouts, storeys…) is the ONLY input: the Quantités
 * list, the cost, the work order (builder + Agenda) all come from `gutterLines()`. The rep can
 * still override a quantity on the quote (see `qtyOverrides` in data/quote-builder.ts).
 *
 * Kept apart from data/quote-builder.ts so data/mock.ts can seed every Gouttières quote with a form
 * whose derived cost is the quote's cost (mock.ts can't import quote-builder.ts: it imports mock.ts).
 */
import type { MaterialLine } from './mock'

export interface GutterFace {
  id: string
  /** French label ("Façade avant"…) or typed by the rep. */
  label: string
  /** Gutter length, linear feet. */
  gutter: number
  /** Number of downspouts on this side. */
  downspouts: number
  /** Downspout length each, feet. */
  downLen: number
}

export interface GutterForm {
  /** Model: 5 po standard or 6 po Distinction (plan item G1). */
  size: 5 | 6
  material: 'Aluminium' | 'Acier'
  color: string
  /** Downspout colour when different from the gutters (empty = same as the gutters). */
  downspoutColor?: string
  storeys: number
  roof: string
  ladders: number
  /** Remove existing gutters (E.G.E). */
  removal: boolean
  faces: GutterFace[]
  note: string
}

/** Gouttières protection tiers (plan: "crochet standard, crochet continu, 5000, 1800"). Ids shared with the portal. */
export type TierId = 'standard' | 'continu' | 'pg5000' | 'pg1800'
export const TIER_IDS: TierId[] = ['standard', 'continu', 'pg5000', 'pg1800']

/** Optional add-ons offered next to the protection options (client can toggle them in the portal). */
export type GutterAddonId = 'fascia' | 'soffit'

/** What the job is: new gutters (with protection options), a cleaning, or soffit / fascia only. */
export type GutterKind = 'gutter' | 'clean' | 'soffit'
export const gutterKind = (workType: string): GutterKind => (/Nettoyage/i.test(workType) ? 'clean' : /Soffite/i.test(workType) ? 'soffit' : 'gutter')

/** Protection tier matching a seeded quote's work type. */
export const tierForWork = (workType: string): TierId => (/DoublePro/i.test(workType) ? 'pg1800' : /Pare-feuilles/i.test(workType) ? 'pg5000' : 'continu')

/** Price of each tier relative to "Crochet continu" (defaults; the rep can type any price). */
export const TIER_PRICE_FACTOR: Record<TierId, number> = { standard: 0, continu: 1, pg5000: 1.6, pg1800: 2.3 }

/** Suggested selling price per linear foot of the optional add-ons (quote default, editable). */
export const ADDON_RATE: Record<GutterAddonId, number> = { fascia: 7, soffit: 14 }

const n = (v: unknown) => Number(v) || 0

export const gutterTotals = (g: GutterForm) => ({
  gutter: g.faces.reduce((s, f) => s + n(f.gutter), 0),
  downspouts: g.faces.reduce((s, f) => s + n(f.downspouts), 0),
  downFeet: g.faces.reduce((s, f) => s + n(f.downspouts) * n(f.downLen), 0),
})

export const PROTECTION_LINES: Record<Exclude<TierId, 'standard'>, Omit<MaterialLine, 'qty'>> = {
  continu: { cat: 'Protège-gouttières', item: 'T-Rex XL M-5800', unit: 'pi', cost: 2.9, sell: 5 },
  pg5000: { cat: 'Protège-gouttières', item: 'Protège-gouttières 5000 (grillage aluminium)', unit: 'pi', cost: 4.4, sell: 8 },
  pg1800: { cat: 'Protège-gouttières', item: 'Protège-gouttières 1800 (microfiltrant)', unit: 'pi', cost: 6.2, sell: 11.5 },
}

export interface GutterLineOptions {
  kind?: GutterKind
  /** Protection tier (gutter jobs only). */
  tier?: TierId
  /** Optional add-ons the client chose (gutter jobs only). */
  addons?: GutterAddonId[]
}

/**
 * Quantities computed from the gutter form: linear feet of gutters, downspout length, elbows (3 per
 * downspout), gutter guard on the full length (by tier), chosen add-ons and the labour hours.
 */
export function gutterLines(g: GutterForm, opts: GutterLineOptions = {}): MaterialLine[] {
  const { gutter, downspouts, downFeet } = gutterTotals(g)
  const kind = opts.kind ?? 'gutter'
  const lines: MaterialLine[] = []
  if (!gutter) return lines
  const labour = (h: number): MaterialLine => ({ cat: "Main-d'œuvre", item: 'Ferblantiers (2)', qty: Math.max(2, Math.ceil(h)), unit: 'h', cost: 58, sell: 85 })

  if (kind === 'clean') {
    lines.push({ cat: 'Services', item: 'Nettoyage des gouttières', qty: gutter, unit: 'pi', cost: 1.1, sell: 2.5 })
    if (downspouts) lines.push({ cat: 'Services', item: 'Vidange des descentes', qty: downspouts, unit: 'unité', cost: 6, sell: 15 })
    return lines
  }
  if (kind === 'soffit') {
    lines.push(
      { cat: 'Soffite / fascia', item: 'Soffite ventilé', qty: gutter, unit: 'pi', cost: 8.6, sell: 14 },
      { cat: 'Soffite / fascia', item: 'Fascia aluminium', qty: gutter, unit: 'pi', cost: 4.2, sell: 7 },
      { cat: 'Soffite / fascia', item: 'J de soffite', qty: gutter, unit: 'pi', cost: 0.3, sell: 0.5 },
      labour(gutter / 12 + (g.storeys - 1) * 1.5),
    )
    return lines
  }

  const six = g.size === 6
  const steel = g.material === 'Acier'
  if (g.removal) lines.push({ cat: 'Services', item: 'E.G.E — Enlever gouttières existantes', qty: gutter, unit: 'pi', cost: 0.9, sell: 1.75 })
  lines.push(
    steel
      ? { cat: 'Gouttières', item: 'Gouttières acier', qty: gutter, unit: 'pi', cost: 13, sell: 20 }
      : six
        ? { cat: 'Gouttières', item: 'Modèle Distinction 6 po avec crochet', qty: gutter, unit: 'pi', cost: 8.1, sell: 12.5 }
        : { cat: 'Gouttières', item: 'Gouttières 5 po (pi lin.)', qty: gutter, unit: 'pi', cost: 6.2, sell: 10.5 },
  )
  if (downFeet) lines.push(six ? { cat: 'Descentes', item: 'Tuyaux 3 × 4 (descente)', qty: downFeet, unit: 'pi', cost: 6.4, sell: 10 } : { cat: 'Descentes', item: 'Tuyaux 2 × 3 (descente)', qty: downFeet, unit: 'pi', cost: 5.8, sell: 10 })
  if (downspouts) lines.push(six ? { cat: 'Descentes', item: 'Coude A 3 × 4', qty: downspouts * 3, unit: 'unité', cost: 5.2, sell: 10 } : { cat: 'Descentes', item: 'Coudes A75 / B75', qty: downspouts * 3, unit: 'unité', cost: 4.5, sell: 9.5 })
  if (opts.tier && opts.tier !== 'standard') lines.push({ ...PROTECTION_LINES[opts.tier], qty: gutter })
  const addons = opts.addons ?? []
  if (addons.includes('fascia')) lines.push({ cat: 'Soffite / fascia', item: 'Fascia aluminium', qty: gutter, unit: 'pi', cost: 4.2, sell: 7 })
  if (addons.includes('soffit')) lines.push({ cat: 'Soffite / fascia', item: 'Soffite ventilé', qty: gutter, unit: 'pi', cost: 8.6, sell: 14 }, { cat: 'Soffite / fascia', item: 'J de soffite', qty: gutter, unit: 'pi', cost: 0.3, sell: 0.5 })
  lines.push(labour(gutter / 16 + downspouts * 0.5 + (g.storeys - 1) * 1.5 + addons.length * (gutter / 40)))
  return lines
}

export const linesCost = (lines: MaterialLine[]) => lines.reduce((s, l) => s + l.qty * l.cost, 0)
const cents = (v: number) => Math.round(v * 100) / 100
const round5 = (v: number) => Math.round(v / 5) * 5

// ── Seeded demo quotes ──────────────────────────────────────────────────────────────
const face = (id: string, label: string, gutter: number, downspouts: number, downLen: number): GutterFace => ({ id, label, gutter, downspouts, downLen })

/** A plausible form for `feet` linear feet: front/back 30 % each, sides 20 % each, a downspout per ±35 pi. */
export function formForFeet(feet: number, storeys: number, kind: GutterKind): GutterForm {
  const split = feet < 30 ? [feet - Math.floor(feet / 2), Math.floor(feet / 2), 0, 0] : (() => {
    const a = Math.round(feet * 0.3)
    const c = Math.round(feet * 0.2)
    return [a, a, c, feet - 2 * a - c]
  })()
  const labels = ['Façade avant', 'Façade arrière', 'Côté gauche', 'Côté droit']
  const len = storeys === 1 ? 10 : 18
  const spouts = (ft: number) => (kind === 'soffit' || !ft ? 0 : Math.max(1, Math.round(ft / 35)))
  return {
    size: 5,
    material: 'Aluminium',
    color: 'Blanc',
    storeys,
    roof: 'Bardeaux',
    ladders: storeys === 1 ? 1 : 2,
    removal: kind === 'gutter',
    faces: split.map((ft, i) => face('f' + (i + 1), labels[i], ft, spouts(ft), spouts(ft) ? len : 0)),
    note: '',
  }
}

export interface GutterSeed {
  form: GutterForm
  kind: GutterKind
  /** Chosen protection tier (gutter jobs). */
  tier?: TierId
  /** Price of the chosen tier, included in the quote amount. */
  tierPrice: number
  /** Base price (without protection) — amount − tierPrice. */
  base: number
  /** Default prices of the optional add-ons (not chosen: not in the amount). */
  addonPrices: Record<GutterAddonId, number>
  /** Cost of the derived quantities = the quote's cost. */
  cost: number
}

/** Seed per Gouttières quote id, filled by data/mock.ts at load; read by the builder's first draft. */
export const GUTTER_SEEDS = new Map<string, GutterSeed>()

const hash = (s: string) => {
  let h = 0
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 9973
  return h
}

/**
 * Seed a Gouttières quote: keep its amount, pick the form (linear feet) whose derived cost is closest to
 * its cost, and return that exact cost. Deterministic (no random numbers).
 */
export function seedGutterQuote(q: { id: string; amount: number; cost: number; workType: string }): GutterSeed {
  const kind = gutterKind(q.workType)
  const storeys = 1 + (hash(q.id) % 2)
  const tier = kind === 'gutter' ? tierForWork(q.workType) : undefined
  let best = { feet: 8, cost: Infinity, diff: Infinity }
  for (let feet = 8; feet <= 900; feet++) {
    const cost = linesCost(gutterLines(formForFeet(feet, storeys, kind), { kind, tier }))
    const diff = Math.abs(cost - q.cost)
    if (diff < best.diff) best = { feet, cost, diff }
    if (cost > q.cost + 50) break
  }
  const form = formForFeet(best.feet, storeys, kind)
  const tierPrice = kind === 'gutter' ? Math.min(round5(q.amount * 0.28), Math.max(0, q.amount - 5)) : 0
  return {
    form,
    kind,
    tier,
    tierPrice,
    base: cents(q.amount - tierPrice),
    addonPrices: { fascia: round5(best.feet * ADDON_RATE.fascia), soffit: round5(best.feet * ADDON_RATE.soffit) },
    cost: cents(best.cost),
  }
}

/**
 * Cost of a Gouttières quote whose form has `feet` linear feet of gutters — used to seed demo quotes with
 * a known length (e.g. a scheduled job "T-Rex XL · 210 pi") so `seedGutterQuote` lands on that exact form.
 */
export function costForFeet(q: { id: string; workType: string }, feet: number): number {
  const kind = gutterKind(q.workType)
  const storeys = 1 + (hash(q.id) % 2)
  const tier = kind === 'gutter' ? tierForWork(q.workType) : undefined
  return cents(linesCost(gutterLines(formForFeet(feet, storeys, kind), { kind, tier })))
}
