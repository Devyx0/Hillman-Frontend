/**
 * Quote-builder reference data (per-company scope of work, cost lines, templates,
 * legal text), the builder's per-quote drafts, and small quote helpers shared by the
 * Soumissions list, the builder, the PDF and the client portal.
 *
 * ── How amounts agree (PDF 3.2) ─────────────────────────────────────────────────────
 * The quote's SELLING PRICE drives everything:
 *   - `quote.amount` (store) is the selling price before taxes, with the options currently
 *     chosen (Gouttières protection tier, CAA discount, paid add-ons, discount).
 *   - total = amount + GST + QST (`GST`, `QST` from `src/lib/utils`) — the builder header,
 *     Prix, the summary rail, the PDF preview, the portal and payments all show this same total
 *     (`quotePricing(q)` below gives the breakdown).
 *   - `quote.cost` is the sum of the cost lines (qty × cost). Costs are costs: they never
 *     set the price.
 *   - margin = (amount − cost) / amount; profit = amount − cost.
 *   - The "Vendant" column of the cost lines is the catalogue's suggested selling rate. It is a
 *     reference only; when it differs from the price, the builder shows the gap and offers
 *     "Appliquer au prix". For the seeded quotes the suggested rates are fitted so that they add
 *     up to the price (H64320: costs 12 382 $, suggested 18 450 $ = price).
 *   - The builder writes `amount` and `cost` back to the store whenever they change, so the
 *     quote list, pipeline, client page and portal follow the builder.
 *
 * Minified → exported:
 *   X3 → GUTTER_SCOPE, Z3 → GUTTER_DEFAULT_SCOPE, J3 → RENO_SCOPE, $3 → RENO_DEFAULT_SCOPE,
 *   F3 → GUTTER_COST_LINES, K3 → RENO_COST_LINES, I3 → quoteDefaults, pd → SCOPE_TEMPLATES,
 *   P3 → SAMPLE_VISIT_NOTES, W3 → SAMPLE_AI_DESCRIPTION, e4 → CATALOG_EXTRAS, t4 → actualsSeed,
 *   a4 → CONSUMER_RESOLUTION_TEXT, n4 → CONTRACT_CLAUSES, yx → INTERNAL_NOTES, Ao → internalNote,
 *   s4 → shortDate, l4 → marginPct, i4 → isAutoAction, jn → TARGET_MARGIN,
 *   jx → BUILDER_SECTIONS, c4 → BUILDER_SECTIONS_SHORT
 */
import {
  BadgeDollarSign,
  Calculator,
  Camera,
  ClipboardCheck,
  ClipboardList,
  FileText,
  GitBranch,
  History,
  ListChecks,
  MailCheck,
  NotebookPen,
  Paperclip,
  PieChart,
  Ruler,
  ShieldCheck,
  User,
} from 'lucide-react'
import type { Icon } from '../components/ui'
import { locale, t } from '../i18n'
import { GST, QST } from '../lib/utils'
import { MATERIAL_LINES, QUOTES, TODAY, type CompanyId, type MaterialLine, type Quote, type ScopeSection } from './mock'
import { ROOF_DEFAULT_SCOPE, ROOF_SCOPE_SECTIONS } from './roofing-clauses'
import { COST_ITEMS, costItemById, scopeFor, templateById as catalogueTemplateById, tierCatalogueVideo } from '../pages/catalogue/data'
import { addQuote, commit, quoteById, updateQuote, type QuoteRecord } from './store'
import { crewJobPhotos, crewJobQuote } from './crew-jobs'
import { paymentScheduleById, depositStep, type PaymentStep } from './settings'
import {
  ADDON_RATE,
  GUTTER_SEEDS,
  TIER_PRICE_FACTOR,
  gutterKind,
  gutterLines,
  gutterTotals,
  type GutterAddonId,
  type GutterFace,
  type GutterForm,
  type GutterKind,
  type TierId,
} from './gutter-quantities'

export { gutterKind, gutterLines, gutterTotals, type GutterAddonId, type GutterFace, type GutterForm, type GutterKind, type TierId }

/** Target margin, in % (mockup: `jn`). Toitures value; see `TARGET_MARGINS` for each company. */
export const TARGET_MARGIN = 32

/** Target margin per company, in % (catalogue averages: Toitures 32, Gouttières 45, Rénovations 26). */
export const TARGET_MARGINS: Record<CompanyId, number> = { toit: 32, sg: 45, reno: 26 }

export type SectionId =
  | 'infos'
  | 'obligations'
  | 'formulaire'
  | 'photos'
  | 'quantites'
  | 'description'
  | 'travaux'
  | 'expertises'
  | 'coutants'
  | 'budget'
  | 'versions'
  | 'garanties'
  | 'prix'
  | 'notes'
  | 'autres'
  | 'envoi'
  | 'suivi'

/** Every builder section (mockup: `jx`, extended per company). */
export const BUILDER_SECTIONS: { id: SectionId; label: string; icon: Icon }[] = [
  { id: 'infos', label: 'Infos', icon: User },
  { id: 'obligations', label: 'Obligations', icon: ClipboardList },
  { id: 'formulaire', label: 'Formulaire gouttières', icon: Ruler },
  { id: 'photos', label: 'Photos', icon: Camera },
  { id: 'quantites', label: 'Quantités', icon: ClipboardList },
  { id: 'description', label: 'Description', icon: NotebookPen },
  { id: 'travaux', label: 'Travaux', icon: ListChecks },
  { id: 'expertises', label: 'Expertises', icon: ClipboardCheck },
  { id: 'coutants', label: 'Coûtants', icon: Calculator },
  { id: 'budget', label: 'Budget par catégorie', icon: PieChart },
  { id: 'versions', label: 'Versions', icon: GitBranch },
  { id: 'garanties', label: 'Garanties', icon: ShieldCheck },
  { id: 'prix', label: 'Prix', icon: BadgeDollarSign },
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'autres', label: 'Autres', icon: Paperclip },
  { id: 'envoi', label: 'Envoi', icon: MailCheck },
  { id: 'suivi', label: 'Suivi et paiements', icon: History },
]

/**
 * Tabs per company (PDF item 11). Roofing warranties and roofing inspection clauses only exist on
 * Toitures. `coutants` is removed for users without the `quotes.costs` permission.
 */
export const SECTIONS_BY_COMPANY: Record<CompanyId, SectionId[]> = {
  toit: ['infos', 'obligations', 'travaux', 'expertises', 'coutants', 'garanties', 'prix', 'notes', 'autres', 'envoi', 'suivi'],
  sg: ['infos', 'formulaire', 'photos', 'quantites', 'prix', 'garanties', 'envoi', 'suivi'],
  reno: ['infos', 'description', 'travaux', 'budget', 'versions', 'garanties', 'prix', 'envoi', 'suivi'],
}

/** Reduced section list (mockup: `c4`). Kept for reference; Gouttières now uses `SECTIONS_BY_COMPANY.sg`. */
export const BUILDER_SECTIONS_SHORT: SectionId[] = ['infos', 'obligations', 'coutants', 'prix', 'notes', 'autres', 'envoi']

export const GUTTER_SCOPE: ScopeSection[] = [
  { name: 'Démantèlement', lines: ['Enlever les gouttières existantes (E.G.E)', 'Enlever les descentes existantes', 'Disposer des rebuts'] },
  { name: 'Gouttières', lines: ['Gouttières aluminium 5 po sans joint, formées sur place', 'Gouttières aluminium 6 po modèle Distinction', 'Gouttières acier', 'Crochets vissés Suprême aux 24 po'] },
  { name: 'Descentes', lines: ['Descentes 2 × 3 po', 'Descentes 3 × 4 po', 'Coudes A75 / B75', 'Rallonges de descente'] },
  { name: 'Protège-gouttières', lines: ['T-Rex M-5200 (crochet continu)', 'T-Rex XL M-5800 (crochet continu)', 'DoublePro D-11500 microfiltrant', 'Pare-feuilles 5300 zip'] },
  { name: 'Soffite / fascia', lines: ['Fascia aluminium agencé', 'Soffite ventilé', 'J de soffite'] },
  { name: 'Inclus', lines: ['Nettoyage complet du chantier', "Test d'écoulement à l'eau", "Garantie main-d'œuvre 15 ans"] },
]

export const GUTTER_DEFAULT_SCOPE = new Set<string>([
  'Enlever les gouttières existantes (E.G.E)',
  'Disposer des rebuts',
  'Gouttières aluminium 5 po sans joint, formées sur place',
  'Crochets vissés Suprême aux 24 po',
  'Descentes 2 × 3 po',
  'Coudes A75 / B75',
  'T-Rex XL M-5800 (crochet continu)',
  'Nettoyage complet du chantier',
  "Test d'écoulement à l'eau",
  "Garantie main-d'œuvre 15 ans",
])

/** Rénovations clauses: the catalogue's list (Catalogue → Travaux → Rénovations), so catalogue edits reach quotes. */
export const RENO_SCOPE: ScopeSection[] = scopeFor('reno')

export const RENO_DEFAULT_SCOPE = new Set<string>([
  'Protection des aires de travail',
  'Démolition sélective',
  'Conteneur 20 vg',
  'Charpente murs 2 × 6',
  'Isolation R-24 murs',
  'Pare-air Tyvek',
  'Revêtement Canexel agencé',
  'Gypse, tirage de joints et peinture',
  "Plans d'architecte",
  'Permis municipal',
  'Électricité (maître électricien)',
])

const GUTTER_COST_LINES: MaterialLine[] = [
  { cat: 'Gouttières', item: 'Gouttières 5 po (pi lin.)', qty: 140, unit: 'pi', cost: 6.2, sell: 10.5 },
  { cat: 'Descentes', item: 'Tuyaux 2 × 3 (descente)', qty: 48, unit: 'pi', cost: 5.8, sell: 10 },
  { cat: 'Descentes', item: 'Coudes A75 / B75', qty: 12, unit: 'unité', cost: 4.5, sell: 9.5 },
  { cat: 'Protège-gouttières', item: 'T-Rex XL M-5800', qty: 140, unit: 'pi', cost: 2.9, sell: 5 },
  { cat: "Main-d'œuvre", item: 'Ferblantiers (2)', qty: 9, unit: 'h', cost: 58, sell: 85 },
]

const RENO_COST_LINES: MaterialLine[] = [
  { cat: 'Structure', item: 'Bois de charpente (lot)', qty: 1, unit: 'lot', cost: 9800, sell: 12900 },
  { cat: 'Enveloppe', item: 'Isolation + pare-air', qty: 1, unit: 'lot', cost: 2400, sell: 3300 },
  { cat: 'Enveloppe', item: 'Revêtement Canexel', qty: 620, unit: 'pi²', cost: 5.4, sell: 8.2 },
  { cat: "Main-d'œuvre", item: 'Menuisiers CCQ', qty: 240, unit: 'h', cost: 68, sell: 98 },
  { cat: "Frais d'entreprise", item: 'Gestion de projet', qty: 1, unit: 'forfait', cost: 2200, sell: 3200 },
]

/**
 * H64320 (demo quote): cost lines that add up to the quote's cost (12 382 $) and whose suggested
 * selling rates add up to its price (17 200 $ + 1 250 $ Cobra add-on = 18 450 $). PDF 3.2.
 */
const H64320_COST_LINES: MaterialLine[] = [
  { cat: 'Bardeaux', item: 'Timberline HDZ GAF (paquet 33,3 pi²)', qty: 66, unit: 'paq.', cost: 48, sell: 69 },
  { cat: 'Bardeaux', item: 'Chapeau Seal-A-Ridge GAF', qty: 4, unit: 'paq.', cost: 63, sell: 82 },
  { cat: 'Bardeaux', item: 'Départ Pro-Start GAF', qty: 3, unit: 'paq.', cost: 55, sell: 71 },
  { cat: 'Membrane', item: 'Stormguard GAF 3 × 65', qty: 6, unit: 'rlx', cost: 110, sell: 139 },
  { cat: 'Sous-couche', item: 'Feltbuster GAF 10 carrés', qty: 3, unit: 'rlx', cost: 162, sell: 205 },
  { cat: 'Ventilation', item: 'Cobra Snowcountry 4 pi', qty: 6, unit: 'unité', cost: 38, sell: 52 },
  { cat: 'Ventilation', item: "Solin d'évent Évent 2000", qty: 3, unit: 'unité', cost: 41, sell: 55 },
  { cat: 'Pontage', item: 'Contreplaqué ½ po (réserve 64 pi²)', qty: 2, unit: 'feuille', cost: 42, sell: 58 },
  { cat: 'Solins', item: 'Solin de cheminée aluminium', qty: 1, unit: 'unité', cost: 95, sell: 140 },
  { cat: 'Solins', item: 'Solin mural acier agencé', qty: 40, unit: 'pi', cost: 3.2, sell: 5.5 },
  { cat: 'Clous et scellant', item: 'Clou toiture 1¼ po', qty: 4, unit: 'boîte', cost: 45, sell: 58 },
  { cat: 'Clous et scellant', item: 'Flextra noir', qty: 3, unit: 'tube', cost: 10, sell: 17 },
  { cat: 'Conteneur', item: 'Conteneur 18 vg', qty: 1, unit: 'unité', cost: 500, sell: 575 },
  { cat: "Main-d'œuvre", item: "Main-d'œuvre couvreurs (CCQ)", qty: 64, unit: 'h', cost: 72, sell: 125 },
  { cat: "Frais d'entreprise", item: 'Frais fixes par jour', qty: 2, unit: 'jour', cost: 800, sell: 1000 },
  { cat: 'Livraison', item: 'Camion · livraison sur toit', qty: 1, unit: 'unité', cost: 75, sell: 95 },
]

const FLAT_ROOF_COST_LINES: MaterialLine[] = [
  { cat: 'Membrane', item: 'Sopraply Base 520 (rouleau)', qty: 12, unit: 'rlx', cost: 118, sell: 152 },
  { cat: 'Membrane', item: 'Sopraply Traffic Cap 560 (rouleau)', qty: 14, unit: 'rlx', cost: 139, sell: 178 },
  { cat: 'Pontage', item: 'Sopraboard ¼ po (panneau)', qty: 40, unit: 'feuille', cost: 31, sell: 42 },
  { cat: 'Conteneur', item: 'Conteneur 18 vg', qty: 1, unit: 'unité', cost: 500, sell: 575 },
  { cat: "Main-d'œuvre", item: "Main-d'œuvre couvreurs (CCQ)", qty: 56, unit: 'h', cost: 72, sell: 115 },
  { cat: "Frais d'entreprise", item: 'Frais fixes par jour', qty: 2, unit: 'jour', cost: 800, sell: 1000 },
]

const cents = (n: number) => Math.round(n * 100) / 100
const round5 = (n: number) => Math.round(n / 5) * 5
export const lineCost = (lines: MaterialLine[]) => lines.reduce((n, l) => n + l.qty * l.cost, 0)
export const lineSell = (lines: MaterialLine[]) => lines.reduce((n, l) => n + l.qty * l.sell, 0)

/**
 * Scale catalogue lines to a quote: quantities follow `cost / base cost`, the last line absorbs the
 * rounding so the costs add up to `cost`, and the suggested rates are scaled to add up to `amount`.
 */
function fitLines(base: MaterialLine[], cost: number, amount: number): MaterialLine[] {
  if (!cost) return base.map((l) => ({ ...l }))
  const ratio = cost / (lineCost(base) || 1)
  const lines = base.map((l) => ({ ...l, qty: Math.max(1, Math.round(l.qty * ratio)) }))
  const last = lines[lines.length - 1]
  last.cost = cents(last.cost + (cost - lineCost(lines)) / last.qty)
  if (amount > 0) {
    const f = amount / (lineSell(lines) || 1)
    for (const l of lines) l.sell = cents(l.sell * f)
    last.sell = cents(last.sell + (amount - lineSell(lines)) / last.qty)
  }
  return lines
}

export interface QuoteAddon {
  id: string
  desc: string
  price: number
  /** Included at no charge (shown, not priced). */
  included: boolean
  /** Offered to the client as an option (portal toggle); priced only when `chosen`. */
  optional?: boolean
  chosen?: boolean
  /** Gouttières add-on whose quantities join the work order when chosen (fascia, soffit). */
  addonId?: GutterAddonId
}

/** Add-ons in the price: paid extras, and the client's chosen options. */
export const pricedAddons = (addons: QuoteAddon[]) => addons.filter((a) => (a.optional ? !!a.chosen : !a.included) && a.price > 0)
/** Gouttières add-ons whose quantities are in the work order. */
export const chosenGutterAddons = (addons: QuoteAddon[]): GutterAddonId[] => addons.filter((a) => a.addonId && a.optional && a.chosen).map((a) => a.addonId!)

interface QuoteDefaults {
  scope: ScopeSection[]
  checked: Set<string>
  price: number
  costs: MaterialLine[]
  addons: QuoteAddon[]
}

/**
 * Gouttières optional add-ons, next to the protection options: the client can add Fascia and Soffite in
 * the portal. ("Crochets espacés" is no longer an add-on: it is the "Crochet standard" protection option.)
 */
function gutterAddons(prices: Record<GutterAddonId, number>): QuoteAddon[] {
  return [
    { id: 'g3', desc: 'Fascia', price: prices.fascia, included: false, optional: true, chosen: false, addonId: 'fascia' },
    { id: 'g4', desc: 'Soffite', price: prices.soffit, included: false, optional: true, chosen: false, addonId: 'soffit' },
  ]
}

/**
 * Starting content of the builder for a given quote (mockup: `I3`). Its price + paid add-ons always
 * equal `q.amount`. The portal reads it too, so its shape stays stable.
 */
export function quoteDefaults(q: Quote): QuoteDefaults {
  if (q.company === 'toit') {
    const isDemo = q.id === 'q64320'
    const ratio = isDemo ? 1 : q.amount / 18450
    const addon = q.amount ? Math.round((1250 * ratio) / 5) * 5 : 0
    return {
      scope: ROOF_SCOPE_SECTIONS,
      checked: ROOF_DEFAULT_SCOPE,
      price: q.amount - addon,
      costs: isDemo ? H64320_COST_LINES : fitLines(/plat/i.test(q.workType) ? FLAT_ROOF_COST_LINES : MATERIAL_LINES, q.cost, q.amount),
      addons: [
        { id: 'a1', desc: 'Ventilateur de faîte Cobra Snowcountry (6 sections)', price: addon, included: false },
        { id: 'a2', desc: 'Nettoyage des gouttières à la fin des travaux', price: 0, included: true },
      ],
    }
  }
  if (q.company === 'sg') {
    // Seeded quotes: form, tier and add-on prices from GUTTER_SEEDS (data/mock.ts); costs derive from the form.
    const seed = GUTTER_SEEDS.get(q.id)
    const kind = gutterKind(q.workType)
    const costs = seed ? gutterLines(seed.form, { kind: seed.kind, tier: seed.tier }) : fitLines(GUTTER_COST_LINES, q.cost, q.amount)
    return {
      scope: GUTTER_SCOPE,
      checked: GUTTER_DEFAULT_SCOPE,
      costs,
      price: seed ? seed.base : q.amount,
      addons: kind === 'gutter' ? gutterAddons(seed?.addonPrices ?? { fascia: 0, soffit: 0 }) : [],
    }
  }
  return {
    scope: scopeFor('reno'),
    checked: RENO_DEFAULT_SCOPE,
    costs: fitLines(RENO_COST_LINES, q.cost, q.amount),
    price: q.amount,
    addons: [{ id: 'r1', desc: 'Gestion de projet', price: 0, included: true }],
  }
}

/** Saved scope-of-work templates (mockup: `pd`). */
export const SCOPE_TEMPLATES: Record<string, string[]> = {
  'Bardeaux standard 1 étage': [
    'Ancrages et harnais de sécurité conformes aux normes de la SST',
    "Fourniture d'un conteneur pour disposer des rebuts",
    "Démantèlement de la toiture existante (bardeaux) jusqu'au pontage de bois (une couche)",
    'Sous-couche synthétique Feltbuster de GAF à la grandeur',
    'Membrane pare-glace Stormguard de GAF aux abords périphériques (6 pi)',
    "Bardeau d'asphalte GAF Timberline HDZ (armature en fibre de verre)",
    'Pose de faîtières (chapeau) Seal-A-Ridge de GAF',
    'Bande de départ Pro-Start de GAF',
    'Gestion de projet',
    'Quincaillerie',
    'Disposer des déchets et garder les lieux propres quotidiennement',
    'Travaux électriques',
    'Permis de construction',
  ],
  'Bardeaux 2 étages + ventilation': [
    'Ancrages et harnais de sécurité conformes aux normes de la SST',
    "Montage et démontage d'échafaudage au besoin selon les normes de la SST",
    'Service de nacelle inclus',
    "Fourniture d'un conteneur pour disposer des rebuts",
    "Installation de toiles pour protéger l'aménagement paysager et le bâtiment",
    "Démantèlement de la toiture existante (bardeaux) jusqu'au pontage de bois (une couche)",
    'Fourniture de 64 pi² de contreplaqué ½ po pour réparation du pontage au besoin',
    'Sous-couche synthétique Feltbuster de GAF à la grandeur',
    'Membrane pare-glace Stormguard de GAF aux abords périphériques (6 pi)',
    'Ventilateur de faîte Cobra Snowcountry',
    "Bardeau d'asphalte GAF Timberline HDZ (armature en fibre de verre)",
    'Pose de faîtières (chapeau) Seal-A-Ridge de GAF',
    'Gestion de projet',
    'Quincaillerie',
    'Nettoyage des gouttières à la fin des travaux',
  ],
  'Élastomère toit plat': [
    'Ancrages et harnais de sécurité conformes aux normes de la SST',
    'Installation de garde-corps conformes aux exigences de la SST',
    "Fourniture d'un conteneur pour disposer des rebuts",
    "Démantèlement de la toiture existante (membrane élastomère) jusqu'au pontage de bois",
    'Membrane autocollante à la grandeur',
    'Système thermosoudé',
    'Gestion de projet',
    'Quincaillerie',
  ],
}

/** Mockup: `P3`. */
export const SAMPLE_VISIT_NOTES =
  "Toit à refaire au complet. Bardeaux d'origine 28 ans, recourbés sud et ouest. Solin cheminée fissuré (tache entretoit). Timberline HDZ, Stormguard 6 pi, Cobra. 2 jours. Conteneur dans l'entrée, toiles sur plates-bandes."

/** Mockup: `W3`. */
export const SAMPLE_AI_DESCRIPTION = `Madame Gagnon,

Votre toiture actuelle (bardeaux d'origine, environ 28 ans) présente des bardeaux recourbés sur les versants sud et ouest ainsi qu'un solin de cheminée fissuré, ce qui explique l'usure observée dans l'entretoit.

Nous proposons une réfection complète : retrait de la couche existante jusqu'au pontage, remplacement du contreplaqué endommagé au besoin (64 pi² inclus), membrane pare-glace Stormguard sur 6 pieds en périphérie et dans les noues, sous-couche synthétique Feltbuster, et pose de bardeaux GAF Timberline HDZ avec faîtières Seal-A-Ridge.

La ventilation sera améliorée par un ventilateur de faîte Cobra Snowcountry, et la cheminée recevra des solins neufs en aluminium agencé. Le chantier est réalisé en 2 jours par nos couvreurs certifiés, avec conteneur, protection de vos plates-bandes et nettoyage quotidien au balai magnétique.`

/** Extra catalogue items that can be added as cost lines (mockup: `e4`). */
export const CATALOG_EXTRAS: Record<CompanyId, MaterialLine[]> = {
  toit: [
    { cat: 'Bardeaux', item: 'Landmark Pro CertainTeed (paquet)', qty: 0, unit: 'paq.', cost: 55, sell: 71 },
    { cat: 'Bardeaux', item: 'IKO Dynasty (paquet)', qty: 0, unit: 'paq.', cost: 47, sell: 61 },
    { cat: 'Membrane', item: 'Membrane autocollante 3 × 60', qty: 0, unit: 'rlx', cost: 110, sell: 139 },
    { cat: 'Sous-couche', item: 'Papier synthétique standard', qty: 0, unit: 'rlx', cost: 120, sell: 152 },
    { cat: 'Ventilation', item: 'Ventilateur statique Maximum 700 pi²', qty: 0, unit: 'unité', cost: 74, sell: 98 },
    { cat: 'Pontage', item: 'OSB 7/16 (feuille)', qty: 0, unit: 'feuille', cost: 28, sell: 39 },
    { cat: 'Clous et scellant', item: 'Ciment plastique 20 kg', qty: 0, unit: 'seau', cost: 40, sell: 52 },
    { cat: 'Échafaudage', item: 'Location échafaudage (semaine)', qty: 0, unit: 'sem.', cost: 180, sell: 240 },
    { cat: 'Solins', item: 'Solin de cheminée aluminium', qty: 0, unit: 'unité', cost: 95, sell: 140 },
    { cat: 'Solins', item: 'Solin mural acier agencé', qty: 0, unit: 'pi', cost: 3.2, sell: 5.5 },
    { cat: 'Conteneur', item: 'Conteneur 30 vg', qty: 0, unit: 'unité', cost: 650, sell: 750 },
    { cat: 'Livraison', item: 'Livraison au sol', qty: 0, unit: 'unité', cost: 45, sell: 60 },
  ],
  sg: [
    { cat: 'Gouttières', item: 'Modèle Distinction 6 po avec crochet', qty: 0, unit: 'pi', cost: 8.1, sell: 12.5 },
    { cat: 'Gouttières', item: 'Gouttières acier', qty: 0, unit: 'pi', cost: 13, sell: 20 },
    { cat: 'Descentes', item: 'Tuyaux 3 × 4 (descente)', qty: 0, unit: 'pi', cost: 6.4, sell: 10 },
    { cat: 'Descentes', item: 'Coude A 3 × 4', qty: 0, unit: 'unité', cost: 5.2, sell: 10 },
    { cat: 'Protège-gouttières', item: 'T-Rex M-5200', qty: 0, unit: 'pi', cost: 2.3, sell: 4 },
    { cat: 'Protège-gouttières', item: 'DoublePro D-11500', qty: 0, unit: 'pi', cost: 3.1, sell: 5 },
    { cat: 'Protège-gouttières', item: 'Pare-feuilles 5300 zip', qty: 0, unit: 'pi', cost: 4.4, sell: 7.5 },
    { cat: 'Soffite / fascia', item: 'Soffite ventilé', qty: 0, unit: 'pi', cost: 8.6, sell: 14 },
    { cat: 'Soffite / fascia', item: 'Fascia aluminium', qty: 0, unit: 'pi', cost: 4.2, sell: 7 },
    { cat: 'Soffite / fascia', item: 'J de soffite', qty: 0, unit: 'pi', cost: 0.3, sell: 0.5 },
    { cat: 'Services', item: 'E.G.E — Enlever gouttières existantes', qty: 0, unit: 'pi', cost: 0.9, sell: 1.75 },
    { cat: 'Services', item: 'Nettoyage et vidange', qty: 0, unit: 'forfait', cost: 160, sell: 350 },
  ],
  reno: [
    { cat: 'Structure', item: 'Pieux vissés', qty: 0, unit: 'unité', cost: 310, sell: 420 },
    { cat: 'Structure', item: 'Fermes de toit préfabriquées', qty: 0, unit: 'unité', cost: 240, sell: 330 },
    { cat: 'Enveloppe', item: 'Fenêtre PVC hybride', qty: 0, unit: 'unité', cost: 640, sell: 890 },
    { cat: 'Finition', item: 'Gypse ½ po posé, tiré, peint', qty: 0, unit: 'pi²', cost: 3.1, sell: 4.6 },
    { cat: 'Finition', item: "Plancher bois d'ingénierie", qty: 0, unit: 'pi²', cost: 6.8, sell: 9.9 },
    { cat: 'Finition', item: 'Portes intérieures + moulures', qty: 0, unit: 'unité', cost: 210, sell: 310 },
    { cat: 'Conteneur', item: 'Conteneur 20 vg', qty: 0, unit: 'unité', cost: 575, sell: 690 },
    { cat: 'Sous-traitants', item: 'Électricien (forfait)', qty: 0, unit: 'forfait', cost: 2400, sell: 2900 },
    { cat: 'Sous-traitants', item: 'Plombier (forfait)', qty: 0, unit: 'forfait', cost: 1800, sell: 2200 },
    { cat: "Main-d'œuvre", item: 'Manœuvre', qty: 0, unit: 'h', cost: 42, sell: 65 },
    { cat: "Frais d'entreprise", item: 'Permis (démarches)', qty: 0, unit: 'forfait', cost: 150, sell: 250 },
    { cat: 'Livraison', item: 'Livraison de matériaux', qty: 0, unit: 'unité', cost: 85, sell: 110 },
  ],
}

interface ActualInvoice {
  id: string
  label: string
  amount: number | string
}

export interface Actuals {
  final: number
  invoices: ActualInvoice[]
  conteneurs: number
  salaires: number
  frais: number
}

/** Real job costs once the work is done (mockup: `t4(isDemoQuote, amount)`), scaled to the quote. */
export function actualsSeed(isDemo: boolean, amount: number, company: CompanyId = 'toit'): Omit<Actuals, 'final'> {
  const ratio = isDemo ? 1 : amount / 18450
  const scale = (n: number) => Math.round(n * ratio)
  const supplier: Record<CompanyId, string> = {
    toit: 'Facture 1 · fournisseur toiture (bardeaux, membranes)',
    sg: 'Facture 1 · fournisseur gouttières (aluminium, protège-gouttières)',
    reno: 'Facture 1 · fournisseur matériaux (bois, isolation, revêtement)',
  }
  return {
    invoices: [
      { id: 'f1', label: supplier[company], amount: scale(3866) },
      { id: 'f2', label: 'Facture 2 · quincaillerie et ventilation', amount: scale(412) },
    ],
    conteneurs: company === 'sg' ? 0 : scale(575),
    salaires: scale(6480),
    frais: scale(1600),
  }
}

/** Mockup: `a4`. */
export const CONSUMER_RESOLUTION_TEXT =
  "Le consommateur peut résoudre le présent contrat, sans frais ni pénalité, à sa discrétion, dans les 10 jours suivant celui où chacune des parties est en possession d'un double du contrat signé (article 58 de la Loi sur la protection du consommateur). Pour résoudre le contrat, le consommateur n'a qu'à remettre au commerçant ou à son représentant le formulaire de résolution joint, ou à lui faire parvenir un avis écrit à cet effet."

/** Mockup: `n4`. */
export const CONTRACT_CLAUSES = [
  'Le prix soumis est valide pour la durée indiquée à la soumission.',
  'Le calendrier des paiements fait partie intégrante du contrat.',
  "Tout travail supplémentaire non prévu fera l'objet d'un avenant signé.",
]

/** Mockup: `yx`. */
const INTERNAL_NOTES = [
  'Présence de parefeuilles, prévoir 450 $ + tx',
  'Client préfère être appelé le soir',
  'Chien dans la cour, aviser avant',
  "Conteneur dans l'entrée, toiles sur les plates-bandes",
  'Gouttière 800 + tx si on fait la toiture',
  'Cheminée à vérifier',
  'Accès difficile côté arrière',
  'Parefeuilles existants à enlever',
  'Rappeler au printemps',
  'Voisin intéressé aussi',
]

/** Deterministic internal note for a quote, translated; '' for a third of them (mockup: `Ao`). Call during render. */
export function internalNote(q: { id: string }) {
  let h = 0
  for (const ch of q.id) h = (h * 31 + ch.charCodeAt(0)) % 997
  return h % 3 === 0 ? '' : t(INTERNAL_NOTES[h % INTERNAL_NOTES.length])
}

/** "2026-10-16" → "16 oct." (mockup: `s4`). */
export const shortDate = (iso: string) => new Date(iso + 'T12:00').toLocaleDateString(locale(), { day: 'numeric', month: 'short' })

/** Gross margin in percent (mockup: `l4`). */
export const marginPct = (q: { amount: number; cost: number }) => (q.amount ? ((q.amount - q.cost) / q.amount) * 100 : 0)

/** Whether a next action is automated (mockup: `i4`). */
export const isAutoAction = (action?: string) => !!action && /auto/i.test(action)

// ═══════════════════════════════════════════════════════════════════════════════════════
// Builder drafts: everything the rep enters on a quote, kept per quote for the session
// (becomes the quote document on the backend). `getDraft(q)` builds it on first use.
// ═══════════════════════════════════════════════════════════════════════════════════════

/** Quotes that existed when the app loaded (seeded demo data); others were created in this session. */
const INITIAL_QUOTE_IDS = new Set(QUOTES.map((q) => q.id))
export const isSeededQuote = (id: string) => INITIAL_QUOTE_IDS.has(id)

export type ExpertiseValue = 'Inclus' | 'Non-inclus' | 'Vérifier'

export interface RoofDims {
  area: string
  fond: string
  rem: string
  versants: string
  etages: string
  drains: string
  jours: string
  pente: string
  /** Eaves length (drip edge), in linear feet — fills `{pi lin.}` clauses. */
  avantToits: string
}

/** Gouttières protection option on a quote (plan: "crochet standard, crochet continu, 5000, 1800"). */
export interface GutterTier {
  id: TierId
  label: string
  detail: string
  /** Price added to the base price, before taxes. */
  price: number
  /** Video link for this quote; empty = the catalogue's video for the option (`tierVideo`). */
  video?: string
}
/** Video shown for a protection option: the quote's own link, else the catalogue default. */
export const tierVideo = (tier: Pick<GutterTier, 'id' | 'video'>): string | undefined => tier.video?.trim() || tierCatalogueVideo(tier.id)

/** CAA-Québec member discount: 3 % of the price before taxes, at most 100 $ (Signature Gouttières). */
export const CAA_RATE = 0.03
export const CAA_CAP = 100
/** CAA discount on a pre-tax subtotal — the ONLY place it is computed (builder, PDF, portal, sidebar). */
export const caaDiscount = (preTax: number) => Math.min(CAA_CAP, Math.round(Math.max(0, preTax) * CAA_RATE * 100) / 100)
/** Pre-tax subtotal before the CAA discount that leaves `afterCaa` (inverse of `caaDiscount`). */
export const beforeCaa = (afterCaa: number) => (afterCaa / (1 - CAA_RATE) * CAA_RATE <= CAA_CAP ? afterCaa / (1 - CAA_RATE) : afterCaa + CAA_CAP)
/** French label of the CAA option (literal so the dictionaries carry the exact wording). */
export const CAA_LABEL = 'Membre CAA-Québec (−3 %, max 100 $)'
export const DEFAULT_TIER: TierId = 'continu'
/** Gouttières quotes that get protection options (not cleaning or soffit-only jobs). Same rule as the portal. */
export const gutterHasTiers = (q: Pick<Quote, 'company' | 'workType'>) => q.company === 'sg' && !/Nettoyage|Soffite/.test(q.workType)

export type ShapeKind = 'arrow' | 'circle' | 'text'
/** One annotation drawn over a photo; coordinates are fractions (0–1) of the image size. */
export interface Shape {
  kind: ShapeKind
  color: string
  x1: number
  y1: number
  x2: number
  y2: number
  text?: string
}

export interface QuotePhoto {
  id: string
  /** French label for required/seeded photos, or typed by the rep. */
  label: string
  required?: boolean
  /** Original photo (data URL). Seeded demo photos have none and show a placeholder. */
  src?: string
  /** Photo with the annotations burnt in (data URL) — used for the thumbnail, PDF and work order. */
  annotated?: string
  shapes?: Shape[]
  /** Seeded demo photo without an image. */
  placeholder?: boolean
  main?: boolean
  /** Who took it: the estimator during the visit (default) or the field crew on the job. */
  by?: 'estimateur' | 'equipe'
  /** When a crew photo was taken (ISO). */
  takenAt?: string
}

export interface Attachment {
  name: string
  ext: string
  email: boolean
}

export interface QuoteDraft {
  workKind: string
  dims: RoofDims
  roofNote: string
  checked: Set<string>
  expertises: Record<string, ExpertiseValue>
  costs: MaterialLine[]
  price: number
  discount: number
  addons: QuoteAddon[]
  comments: string
  /** Payment schedule picked on the quote (Paramètres → Calendriers de paiement); none = company default. */
  scheduleId?: string
  /** Gouttières: quantities the rep typed over the form-derived ones, by French item name. */
  qtyOverrides: Record<string, number>
  warranties: Record<string, string>
  /** Internal note (rep and office only). Never shown to the crew. */
  note: string
  /** Note for the crew, printed on the work order and shown in the crew view (French or as typed). */
  crewNote: string
  attachments: Attachment[]
  actuals: Actuals
  gutter: GutterForm
  tiers: GutterTier[]
  tier: TierId
  caa: boolean
  caaNo: string
  description: string
  renoArea: string
  renoDays: string
  photos: QuotePhoto[]
}

// ── Templates applied at creation (`addQuote({ templateId })`) ─────────────────────────
export interface StartTemplate {
  id: string
  company: CompanyId
  /** French name; matches the catalogue's QUOTE_TEMPLATES names. */
  name: string
  workType: string
  scope?: string[]
  costs?: MaterialLine[]
  gutter?: Partial<GutterForm>
  tier?: TierId
  /** Warranty key (see WARRANTY_GROUPS) → option. */
  warranties?: Record<string, string>
  notes?: string
}

const face = (id: string, label: string, gutter: number, downspouts: number, downLen: number): GutterFace => ({ id, label, gutter, downspouts, downLen })
const FACES_EMPTY = () => [face('f1', 'Façade avant', 0, 0, 0), face('f2', 'Façade arrière', 0, 0, 0), face('f3', 'Côté gauche', 0, 0, 0), face('f4', 'Côté droit', 0, 0, 0)]
/** Matches the mockup's gutter form: 140 pi of gutters, 4 downspouts × 12 pi, 2 storeys. */
const FACES_DEMO = () => [face('f1', 'Façade avant', 40, 1, 12), face('f2', 'Façade arrière', 40, 1, 12), face('f3', 'Côté gauche', 30, 1, 12), face('f4', 'Côté droit', 30, 1, 12)]

/** Templates offered by the new-quote flow, per company. */
export const START_TEMPLATES: StartTemplate[] = [
  { id: 'toit-1-etage', company: 'toit', name: 'Bardeaux · 1 étage standard', workType: 'Toit en pente · Bardeaux', scope: SCOPE_TEMPLATES_REF('Bardeaux standard 1 étage'), costs: MATERIAL_LINES.map((l) => ({ ...l, qty: Math.max(1, Math.round(l.qty * 0.75)) })) },
  { id: 'toit-2-etages', company: 'toit', name: 'Bardeaux · 2 étages + Stormguard', workType: 'Toit en pente · Bardeaux', scope: SCOPE_TEMPLATES_REF('Bardeaux 2 étages + ventilation'), costs: H64320_COST_LINES },
  { id: 'toit-plat', company: 'toit', name: 'Toit plat · élastomère 2 couches', workType: 'Toit plat · Élastomère', scope: [...SCOPE_TEMPLATES_REF('Élastomère toit plat'), 'Membrane élastomère deux couches sur {pi²} pi²'], costs: FLAT_ROOF_COST_LINES },
  { id: 'sg-bungalow', company: 'sg', name: 'Gouttières T-Rex M-5200 · bungalow', workType: 'Gouttières · T-Rex M-5200', gutter: { size: 5, storeys: 1, faces: FACES_DEMO() }, tier: 'continu' },
  { id: 'sg-2-etages', company: 'sg', name: 'Gouttières + DoublePro · 2 étages', workType: 'Gouttières · DoublePro D-11500', gutter: { size: 6, storeys: 2, faces: [face('f1', 'Façade avant', 50, 2, 12), face('f2', 'Façade arrière', 50, 2, 12), face('f3', 'Côté gauche', 40, 1, 12), face('f4', 'Côté droit', 40, 1, 12)] }, tier: 'pg1800' },
  { id: 'sg-nettoyage', company: 'sg', name: 'Nettoyage annuel', workType: 'Nettoyage de gouttières', costs: [{ cat: 'Services', item: 'Nettoyage et vidange', qty: 1, unit: 'forfait', cost: 160, sell: 350 }] },
  { id: 'reno-agrandissement', company: 'reno', name: 'Agrandissement 12 × 16', workType: 'Agrandissement', scope: [...RENO_DEFAULT_SCOPE], costs: RENO_COST_LINES },
]

function SCOPE_TEMPLATES_REF(name: string): string[] {
  return SCOPE_TEMPLATES[name] ?? []
}

/** Catalogue warranty group → builder warranty key. */
function warrantyKey(group: string) {
  if (/manufacturier/i.test(group)) return 'fab'
  if (/Main-d/.test(group)) return 'mo'
  if (/Durée/.test(group)) return 'offre'
  if (/Protège/.test(group)) return 'protection'
  return group
}

/**
 * Template applied to a new quote: the catalogue's QUOTE_TEMPLATES (ids `t1`…, editable in
 * Catalogue → Modèles) first, completed by the builder's own START_TEMPLATES of the same name
 * (gutter form, tier, roofing scope); also accepts a START_TEMPLATES id or a roofing scope-template name.
 */
export function templateById(id?: string): StartTemplate | undefined {
  if (!id) return
  const cat = catalogueTemplateById(id)
  if (cat) {
    const mine = START_TEMPLATES.find((x) => x.name === cat.name)
    const costs: MaterialLine[] = []
    for (const c of cat.costs) {
      const it = costItemById(c.itemId)
      if (!it || !c.qty) continue
      const category = Object.values(COST_ITEMS).flatMap((g) => Object.entries(g)).find(([, list]) => list.some((x) => x.id === it.id))?.[0] ?? ''
      costs.push({ cat: category, item: it.name, qty: c.qty, unit: it.unit, cost: it.cost, sell: it.sell })
    }
    const warranties: Record<string, string> = {}
    for (const [g, v] of Object.entries(cat.warranties)) warranties[warrantyKey(g)] = v.replace(/^Prolongée /, 'Prolongé ').replace(/^Voir le détail/, 'Voir détail')
    return {
      ...mine,
      id: cat.id,
      company: cat.company,
      name: cat.name,
      workType: mine?.workType ?? cat.workType,
      scope: cat.checked.length ? cat.checked : mine?.scope,
      costs: costs.length ? costs : mine?.costs,
      warranties,
      notes: cat.notes || undefined,
    }
  }
  const hit = START_TEMPLATES.find((x) => x.id === id || x.name === id)
  if (hit) return hit
  if (SCOPE_TEMPLATES[id]) return { id, company: 'toit', name: id, workType: 'Toit en pente · Bardeaux', scope: SCOPE_TEMPLATES[id] }
}

// ── Gutter quantities (the crew's work order) ────────────────────────────────────────
/** Quantities derived from the draft's gutter form, tier and chosen add-ons — before the rep's overrides. */
export function formGutterLines(q: Pick<Quote, 'company' | 'workType'>, d: Pick<QuoteDraft, 'gutter' | 'tier' | 'tiers' | 'addons'>): MaterialLine[] {
  const kind = gutterKind(q.workType)
  const tiered = kind === 'gutter' && d.tiers.length > 0
  return gutterLines(d.gutter, { kind, tier: tiered ? d.tier : undefined, addons: kind === 'gutter' ? chosenGutterAddons(d.addons) : [] })
}

/** Apply the rep's quantity overrides (by item) to derived lines. */
export const applyOverrides = (lines: MaterialLine[], overrides: Record<string, number>) => lines.map((l) => (l.item in overrides ? { ...l, qty: overrides[l.item] } : l))

/**
 * Gouttières: the draft with its cost lines re-derived from the form (+ overrides). Every change to the
 * form, tier, add-ons or overrides goes through this, so Quantités, cost, margin and the work order follow.
 * Other companies: unchanged.
 */
export function withGutterCosts<D extends QuoteDraft>(q: Pick<Quote, 'company' | 'workType'>, d: D): D {
  if (q.company !== 'sg') return d
  return { ...d, costs: applyOverrides(formGutterLines(q, d), d.qtyOverrides ?? {}) }
}

/** Default tiers. Seeded quotes: "Crochet continu" = the mockup's T-Rex add-on (already in the amount). */
function defaultTiers(continu: number): GutterTier[] {
  return [
    { id: 'standard', label: 'Crochet standard', detail: 'Crochets vissés Suprême aux 24 po', price: 0 },
    { id: 'continu', label: 'Crochet continu', detail: 'T-Rex XL M-5800 · résiste au poids de la neige et de la glace', price: continu },
    { id: 'pg5000', label: 'Protège-gouttières 5000', detail: 'Grillage aluminium · bloque feuilles et débris', price: round5(continu * TIER_PRICE_FACTOR.pg5000) },
    { id: 'pg1800', label: 'Protège-gouttières 1800', detail: 'Microfiltrant · bloque aussi les aiguilles de pin', price: round5(continu * TIER_PRICE_FACTOR.pg1800) },
  ]
}

/** Tiers of a seeded quote: the chosen tier at the price included in its amount, the others in proportion. */
function seededTiers(tier: TierId, price: number): GutterTier[] {
  const factor = TIER_PRICE_FACTOR[tier] || 1
  return defaultTiers(round5(price / factor)).map((x) => (x.id === tier ? { ...x, price } : x))
}

// ── Required photos per job type (PDF item 8) ────────────────────────────────────────
export function requiredPhotos(q: Pick<Quote, 'company' | 'workType'>): string[] {
  if (q.company === 'toit') return ['Façade avant', 'Façade arrière', 'Côté gauche', 'Côté droit', /plat/i.test(q.workType) ? 'Drains de toit' : 'Cheminée', 'Entretoit']
  if (q.company === 'sg') return /Nettoyage/.test(q.workType) ? ['Façade avant', 'Gouttières avant nettoyage'] : ['Façade avant', 'Façade arrière', 'Côté gauche', 'Côté droit', 'Coins et angles']
  return ['Façade avant', 'Pièce visée — avant travaux']
}

/** Required photos still missing on a draft (French labels). */
export const missingPhotos = (d: QuoteDraft) => d.photos.filter((p) => p.required && !p.src && !p.placeholder).map((p) => p.label)

function seedPhotos(q: Quote, seeded: boolean): QuotePhoto[] {
  const req = requiredPhotos(q)
  const crewJob = crewJobPhotos(q.no)
  if (crewJob.length) {
    // Quotes behind the crews' jobs: the estimator's annotated photos, then the other required ones (not taken).
    const taken = new Set(crewJob.map((p) => p.label))
    return [
      ...crewJob.map((p) => ({ ...p, required: req.includes(p.label), by: 'estimateur' as const })),
      ...req.filter((l) => !taken.has(l)).map((label, i) => ({ id: 'r' + i, label, required: true, placeholder: true })),
    ]
  }
  if (q.id === 'q64320') {
    // Demo: three façades still missing, so the send step shows the warning.
    const taken = ['Façade avant', 'Cheminée', 'Entretoit']
    return [
      ...req.map((label, i) => ({ id: 'r' + i, label, required: true, placeholder: taken.includes(label), main: label === 'Façade avant' })),
      { id: 'x1', label: 'Versant sud', placeholder: true },
      { id: 'x2', label: 'Accès conteneur', placeholder: true },
      { id: 'x3', label: 'Piscine à protéger', placeholder: true },
    ]
  }
  return req.map((label, i) => ({ id: 'r' + i, label, required: true, placeholder: seeded, main: i === 0 }))
}

const WARRANTY_DEFAULTS: Record<CompanyId, Record<string, string>> = {
  toit: { fab: 'Prolongé BP 50 ans ferme', mo: '10 ans', offre: '30 jours' },
  sg: { protection: 'Anti-obstruction 40 ans (T-Rex)', mo: "Main-d'œuvre 15 ans", offre: '30 jours' },
  reno: { mo: '5 ans', plan: 'Garantie légale (Code civil du Québec)', offre: '30 jours' },
}

/** Warranty choices per company (PDF item 11: no roofing warranties on Gouttières or Rénovations). */
export const WARRANTY_GROUPS: Record<CompanyId, [string, string, string[]][]> = {
  toit: [
    ['fab', 'Manufacturier', ['Non applicable', 'Prolongé IKO ShieldPro Plus 20 ans', 'Prolongé BP 50 ans ferme', 'GAF System Plus 50 ans', 'Voir détail du fabricant', 'Autre']],
    ['mo', "Main-d'œuvre", ['Non applicable', '5 ans', '10 ans', 'Autre']],
    ['offre', 'Validité', ['24 h', '48 h', '30 jours', '60 jours', 'Autre']],
  ],
  sg: [
    ['protection', 'Protège-gouttières', ['Non applicable', 'Crochet à vie', 'Solidité à vie', 'Anti-obstruction à vie (DoublePro)', 'Anti-obstruction 40 ans (T-Rex)']],
    ['mo', "Main-d'œuvre", ['Non applicable', '5 ans', "Main-d'œuvre 15 ans"]],
    ['offre', 'Validité', ['24 h', '48 h', '30 jours', '60 jours']],
  ],
  reno: [
    ['mo', "Main-d'œuvre", ['Non applicable', '1 an', '5 ans', '10 ans']],
    ['plan', 'Plan de garantie', ['Garantie légale (Code civil du Québec)', 'Garantie de construction résidentielle (GCR)', 'Non applicable']],
    ['offre', 'Validité', ['30 jours', '60 jours', '90 jours']],
  ],
}

const RENO_SAMPLE_DESCRIPTION =
  "** Soumission budgétaire selon les travaux\n- travaux de menuiserie et charpente\n- travaux d'isolation\n- travaux de revêtements"

const DRAFTS = new Map<string, QuoteDraft>()

/** Builder content of a quote; created from the quote, its template and the company defaults on first use. Call while rendering. */
export function getDraft(q: QuoteRecord): QuoteDraft {
  let d = DRAFTS.get(q.id)
  if (!d) {
    d = createDraft(q)
    DRAFTS.set(q.id, d)
  }
  return d
}

/** Save builder content (no re-render; amounts reach the store through `syncQuoteAmounts`). */
export function saveDraft(id: string, d: QuoteDraft) {
  DRAFTS.set(id, d)
}

/**
 * Copy a quote as a new, unsent quote with the same builder content (duplicate or new version).
 * Note: store `duplicateQuote` passes `id: undefined, no: undefined` to `addQuote`, whose spread
 * then overwrites the generated id/number — so the builder uses this instead.
 */
export function cloneQuote(src: QuoteRecord, extra: Partial<QuoteRecord> = {}): QuoteRecord {
  const keep: Partial<QuoteRecord> = { ...src }
  for (const k of ['id', 'no', 'lastViewed', 'signature', 'payments', 'refusalReason', 'followUpStopped', 'followUpPaused', 'cancellation', 'statusLog', 'paidAt', 'refusalComment', 'officeAcceptance', 'nextAction'] as const) delete (keep as Record<string, unknown>)[k]
  const next = addQuote({ ...(keep as QuoteRecord), status: 'En cours', views: 0, daysInStatus: 0, date: TODAY, ...extra })
  getDraft(src)
  copyDraft(src.id, next.id)
  return next
}

// ── Versions (Rénovations V1 / V2) ─
/** First quote of a project (V1) — versions point to it through `parentId`. */
function rootOf(q: QuoteRecord): QuoteRecord {
  let cur = q
  const seen = new Set<string>()
  while (cur.parentId && !seen.has(cur.id)) {
    seen.add(cur.id)
    const parent = quoteById(cur.parentId)
    if (!parent) break
    cur = parent
  }
  return cur
}

/** All versions of the project a quote belongs to, V1 first. */
export function projectVersions(q: QuoteRecord): QuoteRecord[] {
  const root = rootOf(q)
  return (QUOTES as QuoteRecord[]).filter((x) => x.id === root.id || rootOf(x).id === root.id).sort((x, y) => (x.version ?? 1) - (y.version ?? 1))
}

/** New version of the project, starting from `q`'s content. */
export function newVersion(q: QuoteRecord): QuoteRecord | undefined {
  const versions = projectVersions(q)
  const n = Math.max(...versions.map((v) => v.version ?? 1)) + 1
  return cloneQuote(q, { parentId: rootOf(q).id, version: n })
}

/** Copy a quote's builder content to another quote (Rénovations V2 starts from V1). */
export function copyDraft(fromId: string, toId: string) {
  const d = DRAFTS.get(fromId)
  if (!d) return
  DRAFTS.set(toId, structuredClone(d))
}

/** Opening price of a new quote: the catalogue selling rates, or the target margin when they are below it. */
function suggestedPrice(costs: MaterialLine[], company: CompanyId) {
  const sell = lineSell(costs)
  const atTarget = lineCost(costs) / (1 - TARGET_MARGINS[company] / 100)
  return round5(Math.max(sell, atTarget))
}

function createDraft(q: QuoteRecord): QuoteDraft {
  const seeded = isSeededQuote(q.id)
  const isDemo = q.id === 'q64320'
  const tpl = templateById(q.templateId)
  const d = quoteDefaults(q)
  const fresh = !seeded && !q.amount
  const tiered = gutterHasTiers(q)

  // Gutter form
  const gutter: GutterForm = {
    size: q.gutterSize ?? 5,
    material: 'Aluminium',
    color: 'Blanc',
    storeys: 2,
    roof: 'Bardeaux',
    ladders: 2,
    removal: true,
    faces: seeded ? FACES_DEMO() : FACES_EMPTY(),
    note: seeded ? t('Arbres matures côté cour : proposer protège-gouttières.') : tpl?.notes ? t(tpl.notes) : '',
    ...tpl?.gutter,
  }
  if (tpl?.gutter?.faces) gutter.faces = structuredClone(tpl.gutter.faces)

  let costs = d.costs.map((l) => ({ ...l }))
  let price = d.price
  let addons = d.addons.map((a) => ({ ...a }))
  let tiers: GutterTier[] = []
  let tier: TierId = tpl?.tier ?? DEFAULT_TIER

  if (q.company === 'sg') {
    // Quantities always derive from the gutter form (see withGutterCosts); `costs` is recomputed below.
    const seed = GUTTER_SEEDS.get(q.id)
    if (seed && !fresh) {
      Object.assign(gutter, structuredClone(seed.form), { note: gutter.note })
      const crewJob = crewJobQuote(q.no)
      if (crewJob?.color) Object.assign(gutter, { color: crewJob.color, downspoutColor: crewJob.downspoutColor })
      if (tiered && seed.tier) {
        tier = seed.tier
        tiers = seededTiers(seed.tier, seed.tierPrice)
      }
    } else if (tiered) {
      const ft = gutterTotals(gutter).gutter
      tiers = defaultTiers(round5(ft * 5))
      if (fresh) addons = gutterAddons({ fascia: round5(ft * ADDON_RATE.fascia), soffit: round5(ft * ADDON_RATE.soffit) })
    }
    costs = formGutterLines(q, { gutter, tier, tiers, addons })
    if (fresh) price = tiered ? round5(lineSell(costs.filter((l) => l.cat !== 'Protège-gouttières'))) : suggestedPrice(costs, q.company)
  } else if (fresh) {
    costs = tpl?.costs?.map((l) => ({ ...l })) ?? []
    price = suggestedPrice(costs, q.company)
    addons = addons.map((a) => ({ ...a, price: 0 }))
  }

  const actualsBase = actualsSeed(isDemo, q.amount || price, q.company)
  return {
    workKind: q.workType.includes('plat') ? 'Toit plat' : q.workType.includes('métal') ? 'Toit en métal' : 'Toit en pente',
    dims: { area: isDemo ? '1 920' : '', fond: isDemo ? '1 640' : '', rem: isDemo ? '280' : '', versants: isDemo ? '4' : '', etages: isDemo ? '2' : '', drains: isDemo ? '0' : '', jours: isDemo ? '2' : '', pente: isDemo ? '6' : '', avantToits: isDemo ? '168' : '' },
    roofNote: isDemo ? "Cheminée en brique côté nord. Accès conteneur par l'entrée asphaltée. Piscine hors-terre à protéger." : '',
    checked: new Set(tpl?.scope ?? (q.company === 'toit' ? ROOF_DEFAULT_SCOPE : d.checked)),
    expertises: { Isolation: 'Vérifier', Structure: 'Vérifier', Ventilation: 'Inclus', Pontage: 'Vérifier' },
    costs,
    price,
    discount: 0,
    addons,
    comments: '',
    scheduleId: undefined,
    qtyOverrides: {},
    warranties: { ...WARRANTY_DEFAULTS[q.company], ...tpl?.warranties },
    note: isDemo ? t(SAMPLE_VISIT_NOTES) : q.company === 'toit' && tpl?.notes ? t(tpl.notes) : '',
    attachments:
      q.company === 'toit' && seeded
        ? [
            { name: t('Garantie GAF System Plus.pdf'), ext: 'PDF', email: true },
            { name: t('Fiche technique Timberline HDZ.pdf'), ext: 'PDF', email: false },
          ]
        : [],
    actuals: { final: 0, ...actualsBase, invoices: actualsBase.invoices.map((i) => ({ ...i, label: t(i.label) })) },
    gutter,
    tiers,
    tier,
    caa: false,
    caaNo: '',
    description: seeded && q.company === 'reno' ? t(RENO_SAMPLE_DESCRIPTION) : q.company === 'reno' && tpl?.notes ? t(tpl.notes) : '',
    renoArea: seeded ? '192' : '',
    renoDays: seeded ? '18' : '',
    photos: seedPhotos(q, seeded),
    crewNote: crewJobQuote(q.no)?.crewNote ?? '',
  }
}

// ── Pricing: one function for header, Prix, PDF and portal ───────────────────────────
export interface PriceLine {
  /** French label; `{item}` is replaced by the translated `item`. */
  label: string
  item?: string
  amount: number
}

export interface QuotePricing {
  lines: PriceLine[]
  tiers?: GutterTier[]
  tier?: GutterTier
  caaDiscount: number
  /** Pre-tax subtotal before the CAA discount. */
  before: number
  /** Selling price before taxes = `quote.amount` (after the CAA discount). */
  subtotal: number
  gst: number
  qst: number
  total: number
  /** Sum of the cost lines = `quote.cost`. */
  cost: number
  profit: number
  /** In %. */
  margin: number
}

/** Price breakdown of a draft. See the amount rule at the top of this file. */
export function draftPricing(q: Pick<Quote, 'company' | 'workType'>, d: QuoteDraft): QuotePricing {
  const tiered = gutterHasTiers(q) && d.tiers.length > 0
  const tier = tiered ? d.tiers.find((x) => x.id === d.tier) : undefined
  const paid = pricedAddons(d.addons)
  const lines: PriceLine[] = [{ label: q.company === 'toit' && !q.workType.startsWith('Réparation') ? 'Réfection complète de la toiture' : '{item}', item: q.workType, amount: d.price }]
  if (tier?.price) lines.push({ label: 'Protection · {item}', item: tier.label, amount: tier.price })
  for (const a of paid) lines.push({ label: 'Ajout · {item}', item: a.desc, amount: a.price })
  if (d.discount) lines.push({ label: 'Escompte', amount: -d.discount })
  const before = Math.max(0, lines.reduce((n, l) => n + l.amount, 0))
  const caa = q.company === 'sg' && d.caa ? caaDiscount(before) : 0
  if (caa) lines.push({ label: 'Rabais membre CAA (−3 %, max 100 $)', amount: -caa })
  const subtotal = cents(before - caa)
  const gst = subtotal * GST
  const qst = subtotal * QST
  const cost = lineCost(d.costs)
  const profit = subtotal - cost
  return { lines, tiers: tiered ? d.tiers : undefined, tier, caaDiscount: caa, before, subtotal, gst, qst, total: subtotal + gst + qst, cost, profit, margin: subtotal ? (profit / subtotal) * 100 : 0 }
}

/** Pricing of a store quote (portal, PDF, lists). Call while rendering. */
export const quotePricing = (q: QuoteRecord) => draftPricing(q, getDraft(q))

/** Write the builder's selling price and cost back to the quote (only when they changed). */
export function syncQuoteAmounts(id: string) {
  const q = quoteById(id)
  const d = DRAFTS.get(id)
  if (!q || !d) return
  const p = draftPricing(q, d)
  const patch: Partial<QuoteRecord> = {}
  if (Math.abs(p.subtotal - q.amount) > 0.004) patch.amount = p.subtotal
  if (Math.abs(p.cost - q.cost) >= 0.5) patch.cost = Math.round(p.cost)
  if (Object.keys(patch).length) updateQuote(id, patch)
}

/**
 * The client's choice of protection tier / CAA membership (portal or builder). Updates the draft,
 * the work order quantities and `quote.amount`.
 */
export function setGutterChoice(id: string, choice: { tier?: TierId; caa?: boolean; caaNo?: string; addons?: Record<string, boolean> }) {
  const q = quoteById(id)
  if (!q) return
  const d = getDraft(q)
  const { addons: picks, ...rest } = choice
  const addons = picks ? d.addons.map((a) => (a.optional && a.id in picks ? { ...a, chosen: picks[a.id] } : a)) : d.addons
  DRAFTS.set(id, withGutterCosts(q, { ...d, ...rest, addons }))
  syncQuoteAmounts(id)
  commit()
}

/** The client's choice of an optional add-on (Fascia, Soffite) — portal or builder. */
export const setAddonChoice = (id: string, addonId: string, chosen: boolean) => setGutterChoice(id, { addons: { [addonId]: chosen } })

// ── Payment schedule of a quote ───────────────────────────────────────────────────────
export interface ScheduleStep extends PaymentStep {
  amount: number
}
/** Steps of the schedule picked on the draft (or the company default), with amounts on `total`. */
export function draftSchedule(company: CompanyId, d: Pick<QuoteDraft, 'scheduleId'>, total: number): ScheduleStep[] {
  return paymentScheduleById(company, d.scheduleId).steps.map((s) => ({ ...s, amount: (total * s.pct) / 100 }))
}
/** Schedule of a store quote (portal, PDF, signed copy). Call while rendering. */
export const quoteSchedule = (q: QuoteRecord, total = quotePricing(q).total) => draftSchedule(q.company, getDraft(q), total)
export { depositStep }

/** Options the client has chosen (signed summary, signed copy): protection tier and add-ons (French labels). */
export function chosenOptions(q: QuoteRecord): { label: string; price: number }[] {
  const p = quotePricing(q)
  const d = getDraft(q)
  return [...(p.tier ? [{ label: p.tier.label, price: p.tier.price }] : []), ...d.addons.filter((a) => a.optional && a.chosen).map((a) => ({ label: a.desc, price: a.price }))]
}

/** Scope lines of a quote as ticked in the builder, tokens filled in (French; translate with `t` before filling for display). */
export function quoteScope(q: QuoteRecord): { sections: ScopeSection[]; checked: Set<string>; values: Record<string, string> } {
  const d = getDraft(q)
  const sections = q.company === 'toit' ? ROOF_SCOPE_SECTIONS : q.company === 'sg' ? GUTTER_SCOPE : scopeFor('reno')
  return { sections, checked: d.checked, values: clauseValues(d) }
}

// ── Clauses that fill themselves in ──────────────────────────────────────────────────
const toNum = (s: string | number) => Number(String(s).replace(/\s/g, '').replace(',', '.')) || 0

/**
 * Values for the clauses that fill themselves in: `{pi²}`, `{carrés}`, `{pi lin.}` from the roof form
 * (Toitures), and the catalogue's gutter tokens (`{pi_gouttieres}`, `{modele}`, `{nb_descentes}`…,
 * see GUTTER_TOKENS in pages/catalogue/data.ts) from the gutter form.
 */
export function clauseValues(d: QuoteDraft): Record<string, string> {
  const area = toNum(d.dims.area)
  const g = gutterTotals(d.gutter)
  const eaves = toNum(d.dims.avantToits) || g.gutter
  const fmt = (n: number) => (n ? n.toLocaleString(locale()) : '')
  return {
    'pi²': fmt(area),
    carrés: fmt(Math.ceil(area / 100)),
    'pi lin.': fmt(eaves),
    pi_gouttieres: fmt(g.gutter),
    modele: String(d.gutter.size),
    nb_crochets: fmt(Math.ceil((g.gutter * 12) / 16)),
    nb_descentes: fmt(g.downspouts),
    pi_descentes: fmt(g.downFeet),
    nb_coudes: fmt(g.downspouts * 3),
    pi_protege: fmt(g.gutter),
    pi_soffite: chosenGutterAddons(d.addons).includes('soffit') ? fmt(g.gutter) : '',
    pi_fascia: fmt(g.gutter),
    couleur: t(d.gutter.color),
  }
}

/**
 * Gouttières: the clauses printed on the quote, picked from the catalogue's gutter clauses
 * (Catalogue → Clauses, Signature Gouttières) according to the form and the chosen tier.
 * French, with tokens — display as `fillClause(t(line), clauseValues(d))`.
 */
export function gutterClauses(d: QuoteDraft, tiered: boolean): string[] {
  const all = scopeFor('sg').flatMap((s) => s.lines)
  const find = (re: RegExp) => all.find((l) => re.test(l))
  const g = d.gutter
  const out = [
    g.removal ? find(/E\.G\.E/) : undefined,
    g.material === 'Acier' ? find(/d'acier/i) : find(/\{pi_gouttieres\}.*aluminium/),
    !tiered || d.tier === 'standard' ? find(/Crochets vissés/) : undefined,
    g.size === 6 ? find(/descentes 3 × 4/) : find(/descentes 2 × 3/),
    find(/coudes/i),
    tiered && d.tier === 'continu' ? find(/T-Rex XL M-5800/) : undefined,
    tiered && d.tier === 'pg1800' ? find(/DoublePro/) : undefined,
    tiered && d.tier === 'pg5000' ? 'Protège-gouttières 5000 (grillage aluminium) sur {pi_protege} pi lin.' : undefined,
    chosenGutterAddons(d.addons).includes('fascia') ? find(/^Fascia/) : undefined,
    chosenGutterAddons(d.addons).includes('soffit') ? find(/^Soffite/) : undefined,
    find(/^Couleur/),
  ]
  return out.filter((l): l is string => !!l)
}

/** Replace `{pi²}`-style tokens; unknown values show as "___". Translate first: `fillClause(t(line), values)`. */
export function fillClause(text: string, values: Record<string, string>) {
  return text.replace(/\{([^}]+)\}/g, (m, k: string) => (k in values ? values[k] || '___' : m))
}
export const hasTokens = (line: string) => /\{[^}]+\}/.test(line)

// ── Sent log (quote sends from the builder; Conversations → Courriels envoyés can list it) ─
export interface SentRecord {
  id: string
  quoteId: string
  quoteNo: string
  company: CompanyId
  at: string
  by: string
  /** 'email' and/or 'sms'. */
  channels: ('email' | 'sms')[]
  to: string
  subject: string
  kind: 'Soumission' | 'Relance'
}
export const SENT_LOG: SentRecord[] = []
export function logSent(r: Omit<SentRecord, 'id' | 'at'>) {
  SENT_LOG.unshift({ ...r, id: 's' + Date.now(), at: new Date().toISOString() })
  commit()
}


// ── Colour line for work orders (crew view, builder, agenda) ─────────────────────────
/**
 * "Couleur : Blanc" — or "Gouttières : Blanc · Descentes : Brun commercial" when the downspouts differ.
 * French; translate with `t()` at render (`colourLine(g, t)`).
 */
export function colourLine(g: Pick<GutterForm, 'color' | 'downspoutColor'>, tr: (s: string, v?: Record<string, string | number>) => string): string {
  if (g.downspoutColor && g.downspoutColor !== g.color) return tr('Gouttières : {g} · Descentes : {d}', { g: tr(g.color), d: tr(g.downspoutColor) })
  return tr('Couleur : {c}', { c: tr(g.color) })
}
