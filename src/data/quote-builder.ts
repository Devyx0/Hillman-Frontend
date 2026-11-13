/**
 * Quote-builder reference data (per-company scope of work, cost lines, templates,
 * legal text) and small quote helpers shared by the Soumissions list and the builder.
 *
 * Minified → exported:
 *   X3 → GUTTER_SCOPE, Z3 → GUTTER_DEFAULT_SCOPE, J3 → RENO_SCOPE, $3 → RENO_DEFAULT_SCOPE,
 *   F3 → GUTTER_COST_LINES, K3 → RENO_COST_LINES, I3 → quoteDefaults, pd → SCOPE_TEMPLATES,
 *   P3 → SAMPLE_VISIT_NOTES, W3 → SAMPLE_AI_DESCRIPTION, e4 → CATALOG_EXTRAS, t4 → actualsSeed,
 *   a4 → CONSUMER_RESOLUTION_TEXT, n4 → CONTRACT_CLAUSES, yx → INTERNAL_NOTES, Ao → internalNote,
 *   s4 → shortDate, l4 → marginPct, i4 → isAutoAction, jn → TARGET_MARGIN,
 *   jx → BUILDER_SECTIONS, c4 → BUILDER_SECTIONS_SHORT
 */
import { BadgeDollarSign, Calculator, ClipboardCheck, ClipboardList, FileText, ListChecks, MailCheck, Paperclip, ShieldCheck, User } from 'lucide-react'
import type { Icon } from '../components/ui'
import { DEFAULT_SCOPE, MATERIAL_LINES, SCOPE_SECTIONS, type CompanyId, type MaterialLine, type Quote, type ScopeSection } from './mock'

/** Target margin, in % (mockup: `jn`). */
export const TARGET_MARGIN = 32

export type SectionId = 'infos' | 'obligations' | 'travaux' | 'expertises' | 'coutants' | 'garanties' | 'prix' | 'notes' | 'autres' | 'envoi'

/** Quote-builder sections (mockup: `jx`). */
export const BUILDER_SECTIONS: { id: SectionId; label: string; icon: Icon }[] = [
  { id: 'infos', label: 'Infos', icon: User },
  { id: 'obligations', label: 'Obligations', icon: ClipboardList },
  { id: 'travaux', label: 'Travaux', icon: ListChecks },
  { id: 'expertises', label: 'Expertises', icon: ClipboardCheck },
  { id: 'coutants', label: 'Coûtants', icon: Calculator },
  { id: 'garanties', label: 'Garanties', icon: ShieldCheck },
  { id: 'prix', label: 'Prix', icon: BadgeDollarSign },
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'autres', label: 'Autres', icon: Paperclip },
  { id: 'envoi', label: 'Envoi', icon: MailCheck },
]

/** Reduced section list (mockup: `c4`). */
export const BUILDER_SECTIONS_SHORT: SectionId[] = ['infos', 'obligations', 'coutants', 'prix', 'notes', 'autres', 'envoi']

const GUTTER_SCOPE: ScopeSection[] = [
  { name: 'Démantèlement', lines: ['Enlever les gouttières existantes (E.G.E)', 'Enlever les descentes existantes', 'Disposer des rebuts'] },
  { name: 'Gouttières', lines: ['Gouttières aluminium 5 po sans joint, formées sur place', 'Gouttières aluminium 6 po Modèle Distinction', 'Gouttières acier', 'Crochets vissés Suprême aux 24 po'] },
  { name: 'Descentes', lines: ['Descentes 2 × 3 po', 'Descentes 3 × 4 po', 'Coudes A75 / B75', 'Rallonges de descente'] },
  { name: 'Protège-gouttières', lines: ['T-Rex M-5200 (crochet continu)', 'T-Rex XL M-5800 (crochet continu)', 'DoublePro D-11500 microfiltrant', 'Pare-feuilles 5300 zip'] },
  { name: 'Soffite / fascia', lines: ['Fascia aluminium agencé', 'Soffite ventilé', 'J de soffite'] },
  { name: 'Inclus', lines: ['Nettoyage complet du chantier', "Test d'écoulement à l'eau", "Garantie main-d'œuvre 15 ans"] },
]

const GUTTER_DEFAULT_SCOPE = new Set<string>([
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

const RENO_SCOPE: ScopeSection[] = [
  { name: 'Préparation', lines: ['Protection des aires de travail', 'Démolition sélective', 'Conteneur 20 vg'] },
  { name: 'Structure et charpente', lines: ['Fondation sur pieux vissés', 'Charpente murs 2 × 6', 'Fermes de toit préfabriquées'] },
  { name: 'Enveloppe', lines: ['Isolation R-24 murs', 'Pare-air Tyvek', 'Revêtement Canexel agencé', 'Fenêtres PVC hybride'] },
  { name: 'Finition intérieure', lines: ['Gypse, tirage de joints et peinture', "Plancher de bois d'ingénierie", 'Moulures et portes'] },
  { name: 'Exclusions', lines: ["Plans d'architecte", 'Permis municipal', 'Électricité (maître électricien)'] },
]

const RENO_DEFAULT_SCOPE = new Set<string>([
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

export interface QuoteAddon {
  id: string
  desc: string
  price: number
  included: boolean
}

interface QuoteDefaults {
  scope: ScopeSection[]
  checked: Set<string>
  price: number
  costs: MaterialLine[]
  addons: QuoteAddon[]
}

/** Starting content of the builder for a given quote (mockup: `I3`). */
export function quoteDefaults(q: Quote): QuoteDefaults {
  if (q.company === 'toit') {
    const isDemo = q.id === 'q64320'
    const ratio = isDemo ? 1 : q.amount / 18450
    const addon = Math.round((1250 * ratio) / 5) * 5
    return {
      scope: SCOPE_SECTIONS,
      checked: DEFAULT_SCOPE,
      price: q.amount - addon,
      costs: isDemo ? MATERIAL_LINES : MATERIAL_LINES.map((l) => ({ ...l, qty: Math.max(1, Math.round(l.qty * ratio)) })),
      addons: [
        { id: 'a1', desc: 'Ventilateur de faîte Cobra Snowcountry (6 sections)', price: addon, included: false },
        { id: 'a2', desc: 'Nettoyage des gouttières à la fin des travaux', price: 0, included: true },
      ],
    }
  }
  if (q.company === 'sg') {
    const addon = Math.round((q.amount * 0.28) / 5) * 5
    return {
      scope: GUTTER_SCOPE,
      checked: GUTTER_DEFAULT_SCOPE,
      costs: GUTTER_COST_LINES,
      price: q.amount - addon,
      addons: [
        { id: 'g1', desc: 'Crochets espacés', price: 0, included: true },
        { id: 'g2', desc: 'ZONE DÉGAGÉE — T-Rex XL M-5800 (crochet continu)', price: addon, included: false },
        { id: 'g3', desc: 'Fascia', price: 0, included: true },
      ],
    }
  }
  return {
    scope: RENO_SCOPE,
    checked: RENO_DEFAULT_SCOPE,
    costs: RENO_COST_LINES,
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

/** Real job costs once the work is done (mockup: `t4(isDemoQuote, amount)`). */
export function actualsSeed(isDemo: boolean, amount: number): Omit<Actuals, 'final'> {
  const ratio = isDemo ? 1 : amount / 18450
  const scale = (n: number) => Math.round(n * ratio)
  return {
    invoices: [
      { id: 'f1', label: 'Facture 1 · fournisseur toiture (bardeaux, membranes)', amount: scale(3866) },
      { id: 'f2', label: 'Facture 2 · quincaillerie et ventilation', amount: scale(412) },
    ],
    conteneurs: scale(575),
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

/** Deterministic internal note for a quote; '' for a third of them (mockup: `Ao`). */
export function internalNote(q: { id: string }) {
  let h = 0
  for (const ch of q.id) h = (h * 31 + ch.charCodeAt(0)) % 997
  return h % 3 === 0 ? '' : INTERNAL_NOTES[h % INTERNAL_NOTES.length]
}

/** "2026-10-16" → "16 oct." (mockup: `s4`). */
export const shortDate = (iso: string) => new Date(iso + 'T12:00').toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })

/** Gross margin in percent (mockup: `l4`). */
export const marginPct = (q: { amount: number; cost: number }) => (q.amount ? ((q.amount - q.cost) / q.amount) * 100 : 0)

/** Whether a next action is automated (mockup: `i4`). */
export const isAutoAction = (action?: string) => !!action && /auto/i.test(action)
