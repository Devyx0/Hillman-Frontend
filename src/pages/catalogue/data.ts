/**
 * Static catalogue / settings data (to be served by the backend later).
 * Mockup names: G4→GUTTER_SCOPE  U4→RENO_SCOPE  kx→WORK_KINDS  V4→EXPERTISES
 * Q4→COST_ITEMS  Y4→QUOTE_TEMPLATES  X4→WARRANTIES  gd→DEFAULT_TERMS
 * wo→COMPANY_PROFILES  I4→PDF_COLORS  Cx→ROLES  Mx→PERMISSIONS  W4→roleOf
 * Dd→SWATCH_CLASS  e5→SWATCHES  a5→FOLLOW_UP_EMAIL  s5→AUDIT_LOG
 */
import type { CompanyId, ScopeSection } from '../../data/mock'
import { commit } from '../../data/store'
import { ROOF_DEFAULT_SCOPE, ROOF_SCOPE_SECTIONS } from '../../data/roofing-clauses'

/**
 * Signature Gouttières clauses. `{token}` placeholders fill themselves in from the quote's
 * measurements (see GUTTER_TOKENS) when the clause is added to a quote.
 */
export const GUTTER_SCOPE: ScopeSection[] = [
  { name: 'Gouttières', lines: ['Fourniture et installation de {pi_gouttieres} pi lin. de gouttières aluminium {modele} po sans joint, formées sur place', 'Gouttières aluminium 6 po (modèles Distinction)', "Gouttières d'acier", 'Crochets vissés Suprême aux 16 po ({nb_crochets} crochets)'] },
  { name: 'Descentes et coudes', lines: ['{nb_descentes} descentes 2 × 3 po, total {pi_descentes} pi lin.', '{nb_descentes} descentes 3 × 4 po, total {pi_descentes} pi lin.', '{nb_coudes} coudes A et B selon le parcours'] },
  { name: 'Protège-gouttières', lines: ['ZONE DÉGAGÉE — T-Rex M-5200 (crochet continu) sur {pi_protege} pi lin.', 'ZONE DÉGAGÉE — T-Rex XL M-5800 (crochet continu) sur {pi_protege} pi lin.', 'ZONE AVEC DÉBRIS — DoublePro D-11500 (microfiltrant) sur {pi_protege} pi lin.', 'Pare-feuilles 5300 zip'] },
  { name: 'Soffite et fascia', lines: ['Soffite ventilé aluminium ({pi_soffite} pi lin.)', "Fascia 2 × 6 recouvert d'aluminium ({pi_fascia} pi lin.)", 'Moulure J'] },
  { name: 'Services', lines: ['Enlever les gouttières existantes (E.G.E.) — {pi_gouttieres} pi lin.', 'Nettoyage et vidange des gouttières', 'Réparation de fuites et réalignement', 'Couleur : {couleur}'] },
]

/** Tokens usable in gutter clauses: French label + sample value for previews. */
export const GUTTER_TOKENS: Record<string, { label: string; sample: string }> = {
  pi_gouttieres: { label: 'Pieds linéaires de gouttières', sample: '140' },
  modele: { label: 'Modèle (5 ou 6 po)', sample: '5' },
  nb_crochets: { label: 'Nombre de crochets', sample: '105' },
  nb_descentes: { label: 'Nombre de descentes', sample: '4' },
  pi_descentes: { label: 'Pieds linéaires de descentes', sample: '48' },
  nb_coudes: { label: 'Nombre de coudes', sample: '12' },
  pi_protege: { label: 'Pieds linéaires de protège-gouttières', sample: '140' },
  pi_soffite: { label: 'Pieds linéaires de soffite', sample: '96' },
  pi_fascia: { label: 'Pieds linéaires de fascia', sample: '140' },
  couleur: { label: 'Couleur', sample: 'Blanc' },
}

/**
 * Rénovations Hillman clauses — the single list used by the catalogue AND the quote builder
 * (`src/data/quote-builder.ts` reads it through `scopeFor('reno')`).
 */
export const RENO_SCOPE: ScopeSection[] = [
  { name: 'Préparation', lines: ['Plans et devis par un technologue', 'Demande de permis auprès de la Ville', 'Protection des aires existantes', 'Protection des aires de travail', 'Démolition sélective', 'Conteneur 20 vg'] },
  { name: 'Charpente et menuiserie', lines: ['Fondation sur pieux vissés', 'Charpente murs 2 × 6', 'Fermes de toit préfabriquées'] },
  { name: 'Enveloppe', lines: ['Isolation R-24 murs / R-60 entretoit', 'Pare-air et pare-vapeur', 'Revêtement extérieur (au choix du client)', 'Isolation R-24 murs', 'Pare-air Tyvek', 'Revêtement Canexel agencé', 'Fenêtres PVC hybride'] },
  { name: 'Finition intérieure', lines: ['Gypse, joints et peinture 2 couches', 'Plancher flottant', 'Moulures et portes intérieures', 'Gypse, tirage de joints et peinture', "Plancher de bois d'ingénierie", 'Moulures et portes'] },
  { name: 'Exclusions', lines: ["Plans d'architecte", 'Permis municipal', 'Électricité (maître électricien)'] },
]

export const WORK_KINDS: Record<CompanyId, string[]> = {
  toit: ['Toit en pente', 'Toit plat', 'Toit en métal'],
  sg: ['Gouttière'],
  reno: ['Rénovation'],
}

export const EXPERTISES: { name: string; opts: string[] }[] = [
  { name: 'Isolation', opts: ['Inclus', 'Non inclus', "Vérifier que l'isolation est conforme et adéquate"] },
  { name: 'Structure', opts: ['Inclus', 'Non inclus', 'Vérifier que la structure est en bon état'] },
  { name: 'Ventilation', opts: ['Inclus', 'Non inclus', "Vérifier que les prises d'air sont bonnes et suffisantes"] },
  { name: 'Pontage', opts: ['Inclus', 'Non inclus', 'Vérifier le pontage · 64 pi² de bois inclus pour menuiserie', 'Vérifier le pontage · 32 pi² de bois inclus pour menuiserie', 'Vérifier que le pontage est prêt à recevoir les nouveaux matériaux'] },
]

export interface CostItem {
  id: string
  name: string
  unit: string
  cost: number
  sell: number
  /** YouTube / Vimeo link shown to reps (installation, product demo). */
  video?: string
  /** Gouttières protection option this item stands for (its video is the option's default on quotes). */
  tier?: 'standard' | 'continu' | 'pg5000' | 'pg1800'
}

/** General category → category → items. */
export type CostCatalogue = Record<string, Record<string, CostItem[]>>

export const COST_ITEMS: CostCatalogue = {
  'Toit en pente': {
    Bardeaux: [
      { id: 'b1', name: 'Bardeau architectural 30 pi²', unit: 'paq.', cost: 50, sell: 50 },
      { id: 'b2', name: 'Chapeau ± 22 pi lin.', unit: 'paq.', cost: 60, sell: 60 },
      { id: 'b3', name: 'CertainTeed Shadow Ridge', unit: 'paq.', cost: 52, sell: 52 },
      { id: 'b4', name: 'Landmark Pro', unit: 'paq.', cost: 55, sell: 55 },
      { id: 'b5', name: 'Timberline GAF', unit: 'paq.', cost: 50, sell: 50 },
      { id: 'b6', name: 'Timberline UHDZ GAF', unit: 'paq.', cost: 60, sell: 60, video: 'https://www.youtube.com/watch?v=5qap5aO4i9A' },
      { id: 'b7', name: 'Chapeau Seal-A-Ridge GAF', unit: 'paq.', cost: 63, sell: 63 },
      { id: 'b8', name: 'Départ Pro-Start GAF', unit: 'paq.', cost: 55, sell: 55 },
    ],
    Membrane: [
      { id: 'm1', name: 'Membrane autocollante 3 × 60', unit: 'rlx', cost: 110, sell: 110 },
      { id: 'm2', name: 'Stormguard GAF 3 × 65', unit: 'rlx', cost: 118, sell: 118 },
    ],
    'Sous-couche': [
      { id: 's1', name: 'Papier synthétique', unit: 'rlx', cost: 162, sell: 162 },
      { id: 's2', name: 'Feltbuster GAF', unit: 'rlx', cost: 171, sell: 171 },
    ],
    Ventilateur: [
      { id: 'v1', name: 'Petit ventilateur 700 pi²', unit: 'unité', cost: 74, sell: 74 },
      { id: 'v2', name: 'Cobra Snowcountry 4 pi', unit: 'unité', cost: 38, sell: 38 },
    ],
    Clous: [{ id: 'c1', name: 'Clou toiture 1¼ po', unit: 'boîte', cost: 45, sell: 45 }],
    Conteneur: [{ id: 'k1', name: 'Conteneur 18 vg', unit: 'unité', cost: 500, sell: 500 }],
    "Frais d'entreprise": [
      { id: 'f1', name: 'Frais fixes par jour', unit: 'jour', cost: 800, sell: 800 },
      { id: 'f2', name: "Main-d'œuvre à l'heure hors CCQ", unit: 'h', cost: 150, sell: 150 },
    ],
    Livraison: [{ id: 'l1', name: 'Camion', unit: 'unité', cost: 75, sell: 75 }],
  },
  'Toit plat': {
    Membrane: [
      { id: 'p1', name: 'Sopralene Flam 180 (base)', unit: 'rlx', cost: 96, sell: 96 },
      { id: 'p2', name: 'Sopralene Flam 250 GR (finition)', unit: 'rlx', cost: 142, sell: 142 },
    ],
    Isolation: [{ id: 'p3', name: 'Polyiso 2 po R-11,4', unit: 'panneau', cost: 41, sell: 41 }],
  },
  Gouttières: {
    Gouttières: [
      { id: 'g1', name: 'Gouttières 5 po', unit: 'pi', cost: 10.5, sell: 10.5 },
      { id: 'g2', name: 'Modèles Distinction 6 po avec crochet', unit: 'pi', cost: 12.5, sell: 12.5 },
      { id: 'g3', name: 'Tuyaux 2 × 3 (descente)', unit: 'pi', cost: 10, sell: 10 },
      { id: 'g4', name: 'Coude A75', unit: 'unité', cost: 9.5, sell: 9.5 },
      { id: 'g5', name: 'T-REX 5200', unit: 'pi', cost: 4, sell: 4, video: 'https://vimeo.com/76979871' },
      { id: 'g6', name: 'T-REX 5800', unit: 'pi', cost: 5, sell: 5 },
      { id: 'g7', name: 'T-REX 11500 DL PRO', unit: 'pi', cost: 5, sell: 5 },
    ],
    // One item per protection option offered on Gouttières quotes; their videos are the quotes' defaults.
    'Options de protection': [
      { id: 'o1', name: 'Crochet standard (Suprême aux 24 po)', unit: 'pi', cost: 0.35, sell: 0.75, tier: 'standard', video: 'https://www.youtube.com/watch?v=Qm4xT7bL2pE' },
      { id: 'o2', name: 'Crochet continu T-Rex XL M-5800', unit: 'pi', cost: 2.9, sell: 5, tier: 'continu', video: 'https://www.youtube.com/watch?v=8RkWz3nYc5A' },
      { id: 'o3', name: 'Protège-gouttières 5000 (grillage aluminium)', unit: 'pi', cost: 4.4, sell: 8, tier: 'pg5000', video: 'https://vimeo.com/418273615' },
      { id: 'o4', name: 'Protège-gouttières 1800 (microfiltrant)', unit: 'pi', cost: 6.2, sell: 11.5, tier: 'pg1800', video: 'https://www.youtube.com/watch?v=Jt6vH0sFq9M' },
    ],
  },
  Rénovation: {
    Structure: [
      { id: 'r1', name: 'Bois de charpente (lot)', unit: 'lot', cost: 9800, sell: 12900 },
      { id: 'r2', name: 'Pieux vissés', unit: 'unité', cost: 310, sell: 420 },
    ],
    Enveloppe: [
      { id: 'r3', name: 'Isolation + pare-air', unit: 'lot', cost: 2400, sell: 3300 },
      { id: 'r4', name: 'Revêtement Canexel', unit: 'pi²', cost: 5.4, sell: 8.2 },
    ],
    "Main-d'œuvre": [{ id: 'r5', name: 'Menuisiers CCQ', unit: 'h', cost: 68, sell: 98 }],
  },
  Cabanon: {},
}

export interface QuoteTemplate {
  id: string
  name: string
  company: CompanyId
  workType: string
  /** Scope lines pre-checked when the template is applied. */
  checked: string[]
  /** Cost lines (catalogue item id + quantity). */
  costs: { itemId: string; qty: number }[]
  /** Warranty group → chosen option. */
  warranties: Record<string, string>
  notes: string
  /** Usage stats (read-only). */
  used: number
  win: number
  /** Derived summary fields, kept for the create-quote flow (`QuoteFlow`). Refreshed on save. */
  co: CompanyId
  lines: number
  items: number
  avg: number
  margin: number
}

const pick = (ids: [string, number][]) => ids.map(([itemId, qty]) => ({ itemId, qty }))

type TemplateSeed = Omit<QuoteTemplate, 'co' | 'lines' | 'items' | 'avg' | 'margin'> & Partial<Pick<QuoteTemplate, 'avg' | 'margin'>>
const SEEDS: TemplateSeed[] = [
  { id: 't1', name: 'Bardeaux · 1 étage standard', company: 'toit', workType: 'Toit en pente', checked: [], costs: pick([['b5', 64], ['b7', 6], ['b8', 4], ['m2', 3], ['s2', 4], ['c1', 3], ['k1', 1], ['f1', 2], ['l1', 1]]), warranties: { 'Garantie du manufacturier — Bardeaux': 'Prolongée IKO ShieldPro Plus 20 ans', "Main-d'œuvre — Toitures": '10 ans', "Durée de l'offre": '30 jours' }, notes: 'Accès au terrain par l’entrée de garage. Prévoir la protection des plates-bandes.', used: 142, win: 46, avg: 13900, margin: 31 },
  { id: 't2', name: 'Bardeaux · 2 étages + Stormguard', company: 'toit', workType: 'Toit en pente', checked: [], costs: pick([['b6', 80], ['b7', 8], ['b8', 5], ['m2', 6], ['s2', 5], ['c1', 4], ['k1', 1], ['f1', 3], ['l1', 1]]), warranties: { 'Garantie du manufacturier — Bardeaux': 'Prolongée BP 50 ans ferme', "Main-d'œuvre — Toitures": '10 ans', "Durée de l'offre": '30 jours' }, notes: '', used: 88, win: 41, avg: 19400, margin: 30 },
  { id: 't3', name: 'Toit plat · élastomère 2 couches', company: 'toit', workType: 'Toit plat', checked: [], costs: pick([['p1', 12], ['p2', 12], ['p3', 40], ['k1', 1], ['f1', 3]]), warranties: { 'Garantie du manufacturier — Membranes': 'Voir le détail du fabricant', "Main-d'œuvre — Toitures": '10 ans', "Durée de l'offre": '30 jours' }, notes: '', used: 61, win: 38, avg: 16800, margin: 29 },
  { id: 't4', name: 'Gouttières T-Rex M-5200 · bungalow', company: 'sg', workType: 'Gouttière', checked: [], costs: pick([['g1', 140], ['g3', 48], ['g4', 12], ['g5', 140]]), warranties: { 'Protège-gouttières (Signature)': 'Anti-obstruction 40 ans (T-Rex)', "Durée de l'offre": '30 jours' }, notes: '', used: 611, win: 55, avg: 1650, margin: 47 },
  { id: 't5', name: 'Gouttières + DoublePro · 2 étages', company: 'sg', workType: 'Gouttière', checked: [], costs: pick([['g1', 180], ['g3', 72], ['g4', 16], ['g7', 180]]), warranties: { 'Protège-gouttières (Signature)': 'Anti-obstruction à vie (DoublePro)', "Durée de l'offre": '30 jours' }, notes: '', used: 204, win: 49, avg: 3420, margin: 45 },
  { id: 't6', name: 'Nettoyage annuel', company: 'sg', workType: 'Gouttière', checked: [], costs: [], warranties: { "Durée de l'offre": '60 jours' }, notes: 'Nettoyage et vidange, rapport photo envoyé au client.', used: 932, win: 81, avg: 350, margin: 68 },
  { id: 't7', name: 'Agrandissement 12 × 16', company: 'reno', workType: 'Rénovation', checked: [], costs: pick([['r1', 1], ['r2', 8], ['r3', 1], ['r4', 620], ['r5', 240]]), warranties: { "Main-d'œuvre — Rénovations": '5 ans', "Durée de l'offre": '60 jours' }, notes: 'Plans et permis à la charge du client.', used: 9, win: 33, avg: 84000, margin: 26 },
]

export const WARRANTIES: { group: string; opts: string[] }[] = [
  { group: 'Garantie du manufacturier — Bardeaux', opts: ['Non applicable', 'Prolongée IKO ShieldPro Plus 20 ans', 'Prolongée BP 50 ans ferme', 'Voir le détail du fabricant'] },
  { group: 'Garantie du manufacturier — Membranes', opts: ['Non applicable', 'Voir le détail du fabricant'] },
  { group: "Main-d'œuvre — Toitures", opts: ['Non applicable', '5 ans', '10 ans'] },
  { group: "Main-d'œuvre — Rénovations", opts: ['Non applicable', '5 ans', '10 ans'] },
  { group: 'Protège-gouttières (Signature)', opts: ['Crochet à vie', 'Solidité à vie', 'Anti-obstruction à vie (DoublePro)', 'Anti-obstruction 40 ans (T-Rex)', "Main-d'œuvre 15 ans"] },
  { group: "Durée de l'offre", opts: ['24 h', '48 h', '30 jours', '60 jours'] },
]

export const DEFAULT_TERMS = `Le consommateur peut résoudre le présent contrat, sans frais ni pénalité, à sa discrétion, dans les 10 jours suivant celui où chacune des parties est en possession d'un double du contrat signé (art. 58 de la Loi sur la protection du consommateur).

Le prix soumis est valide pour la durée de l'offre indiquée. Tout travail supplémentaire non prévu à la présente soumission fera l'objet d'un avenant écrit, approuvé par le client avant exécution.

Les dates de travaux sont confirmées après réception de la mise de fond et peuvent être déplacées en raison des conditions météorologiques.

Les matériaux non utilisés demeurent la propriété de l'entrepreneur. Les garanties s'appliquent une fois le contrat payé en totalité.`

interface CompanyProfile {
  address: string
  mail: string
  sms: string
  site: string
  neq: string
  tps: string
  tvq: string
  fax: string
  color: string
}

export const COMPANY_PROFILES: Record<CompanyId, CompanyProfile> = {
  toit: { address: '20660, boul. Henri-Bourassa, Québec (Québec) G2M 1L5', mail: 'info@toitureshillman.com', sms: '418 576-1993', site: 'toitureshillman.com', neq: '1171 482 609', tps: '763 214 589 RT0001', tvq: '1219 875 403 TQ0001', fax: '418 576-1994', color: '#ff1700' },
  sg: { address: '20660, boul. Henri-Bourassa, Québec (Québec) G2M 1L5', mail: 'info@signaturegouttieres.com', sms: '418 915-3443', site: 'signaturegouttieres.com', neq: '1170 905 236', tps: '815 449 392 RT0001', tvq: '1222 395 832 TQ0001', fax: '418 915-3444', color: '#0060a0' },
  reno: { address: '20660, boul. Henri-Bourassa, Québec (Québec) G2M 1L5', mail: 'info@renovationshillman.com', sms: '418 576-1993', site: 'renovationshillman.com', neq: '1168 330 912', tps: '763 214 589 RT0002', tvq: '1219 875 403 TQ0002', fax: '418 576-1994', color: '#1a1a1a' },
}

export const PDF_COLORS = ['#ff1700', '#0060a0', '#1a1a1a', '#2457f5', '#157347', '#e38800']

export const ROLES = ['Administrateur', 'Représentant', 'Coordonnatrice']

export const PERMISSIONS: { p: string; on: boolean[] }[] = [
  { p: 'Voir les soumissions de tous les représentants', on: [true, false, true] },
  { p: 'Voir les coûtants et les marges', on: [true, false, false] },
  { p: 'Modifier le catalogue et les prix', on: [true, false, false] },
  { p: 'Supprimer un client ou une soumission', on: [true, false, false] },
  { p: "Gérer l'agenda des autres représentants", on: [true, false, true] },
  { p: 'Paramètres et utilisateurs', on: [true, false, false] },
]

export const roleOf = (repId: string) => (repId === 'jph' ? 'Administrateur' : repId === 'hpe' ? 'Coordonnatrice' : 'Représentant')

export const SWATCH_CLASS: Record<string, string> = {
  'data-1': 'bg-data-1-ink',
  'data-2': 'bg-data-2-ink',
  'data-3': 'bg-data-3-ink',
  'data-4': 'bg-data-4-ink',
  'data-5': 'bg-data-5-ink',
  'data-6': 'bg-data-6-ink',
  'data-7': 'bg-data-7-ink',
  'data-8': 'bg-data-8-ink',
  'data-9': 'bg-data-9-ink',
  'data-10': 'bg-data-10-ink',
}
export const SWATCHES = Object.keys(SWATCH_CLASS)

export const FOLLOW_UP_EMAIL = `Bonjour à vous,

Nous sommes très heureux de l'intérêt que vous avez porté à notre entreprise. Nous faisons un suivi sur votre dossier et aimerions savoir si vous avez des questions ou des commentaires sur la soumission que nous vous avons fait parvenir dernièrement. Nous aimerions également savoir si une décision a été prise dans le choix de votre entrepreneur.

Advenant un refus de notre soumission et dans l'optique de nous améliorer, nous vous invitons à nous faire part de la raison de votre refus. Les commentaires constructifs sont également appréciés.

Pour accepter ou refuser la soumission, simplement confirmer votre décision par écrit en répondant à ce courriel. Aussi, pour toutes autres questions ou commentaires, n'hésitez pas à répondre à ce courriel en tout temps ou à nous joindre au 418 915-3443, option 1, du lundi au jeudi, de 8 h 00 à 16 h 00.

*Notez que ce courriel est généré automatiquement par notre système. Si vous avez déjà donné une réponse, bien vouloir l'ignorer, votre dossier suit son cours.

Nous vous souhaitons une excellente journée et au plaisir de faire affaire avec vous !`

export const FOLLOW_UP_SMS = "Bonjour {prénom}, c'est {représentant} de {compagnie}. Avez-vous bien reçu votre soumission? Je peux répondre à vos questions ou passer vous voir. Répondez simplement à ce texto."

/** [when, who, what] */
export const AUDIT_LOG: [string, string, string][] = [
  ['8 h 52', 'Jean-Pierre Hillman', 'A modifié le prix de H64320 (17 900 $ → 18 450 $)'],
  ['8 h 31', 'Pierre-Luc Cloutier', 'A envoyé la soumission G64196'],
  ['Hier 17 h 02', 'Hélène Petitpas', 'A déplacé un rendez-vous de Dany Pelletier'],
  ['Hier 9 h 40', 'Olivier Fontaine', 'A modifié le statut de G64251 (À rappeler → Signé)'],
]

// ── Mutators (catalogue editing). Everything is in-memory until the backend exists. ──────────

/** Scope clauses per company. Toitures reads the shared roofing clause list (also used by the builder). */
export const scopeFor = (company: CompanyId): ScopeSection[] => (company === 'toit' ? ROOF_SCOPE_SECTIONS : company === 'sg' ? GUTTER_SCOPE : RENO_SCOPE)

export function addScopeLine(company: CompanyId, section: number, line: string) {
  scopeFor(company)[section]?.lines.push(line)
  commit()
}
export function editScopeLine(company: CompanyId, section: number, index: number, line: string) {
  const s = scopeFor(company)[section]
  if (!s) return
  const old = s.lines[index]
  s.lines[index] = line
  // Templates that pre-check the old wording follow the rename.
  for (const tpl of QUOTE_TEMPLATES) tpl.checked = tpl.checked.map((l) => (l === old ? line : l))
  commit()
}
export function removeScopeLine(company: CompanyId, section: number, index: number) {
  const s = scopeFor(company)[section]
  if (!s) return
  const [old] = s.lines.splice(index, 1)
  for (const tpl of QUOTE_TEMPLATES) tpl.checked = tpl.checked.filter((l) => l !== old)
  commit()
}
export function moveScopeLine(company: CompanyId, section: number, index: number, dir: number) {
  const lines = scopeFor(company)[section]?.lines
  const target = index + dir
  if (!lines || target < 0 || target >= lines.length) return
  ;[lines[index], lines[target]] = [lines[target], lines[index]]
  commit()
}
export function addScopeSection(company: CompanyId, name: string) {
  scopeFor(company).push({ name, lines: [] })
  commit()
}

export const allCostItems = () => Object.values(COST_ITEMS).flatMap((g) => Object.values(g).flat())
export const costItemById = (id: string) => allCostItems().find((it) => it.id === id)
/** Fixed company fees keep their price when a margin is applied. */
/** Catalogue video of a Gouttières protection option (default of every quote; a quote can override it). */
export const tierCatalogueVideo = (tier: string): string | undefined => allCostItems().find((it) => it.tier === tier)?.video

/**
 * Video per catalogue SECTION (general category → category), e.g. a "how we install" video for
 * Toitures → Bardeaux. Key: `${general}::${category}`. Items can still have their own video.
 */
export const CATEGORY_VIDEOS: Record<string, string> = {
  'Gouttières::Gouttières': 'https://www.youtube.com/watch?v=Zc3pN6vRk1U',
}
export const categoryVideo = (general: string, category: string): string | undefined => CATEGORY_VIDEOS[`${general}::${category}`]
export function setCategoryVideo(general: string, category: string, url?: string) {
  const key = `${general}::${category}`
  if (url) CATEGORY_VIDEOS[key] = url
  else delete CATEGORY_VIDEOS[key]
  commit()
}

/** YouTube / Vimeo URL → embeddable URL, or undefined when the link isn't one of those. */
export function videoEmbed(url?: string) {
  if (!url) return undefined
  try {
    const u = new URL(url.trim())
    const host = u.hostname.replace(/^www\.|^m\./, '')
    if (host === 'youtube.com') {
      const id = u.searchParams.get('v') ?? (/^\/(?:shorts|embed)\/([\w-]+)/.exec(u.pathname)?.[1] ?? '')
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : undefined
    }
    if (host === 'youtu.be') return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`
    if (host === 'vimeo.com') {
      const id = /^\/(\d+)/.exec(u.pathname)?.[1]
      return id ? `https://player.vimeo.com/video/${id}` : undefined
    }
    if (host === 'player.vimeo.com') return u.toString()
  } catch {
    /* not a URL */
  }
  return undefined
}

export const isFixedFee = (it: CostItem) => /Frais fixes/.test(it.name)

export function updateCostItem(id: string, patch: Partial<CostItem>) {
  const it = costItemById(id)
  if (it) Object.assign(it, patch)
  commit()
}
export function addCostItem(general: string, category: string, item: Omit<CostItem, 'id'>) {
  const list = (COST_ITEMS[general][category] ??= [])
  const created = { ...item, id: 'i' + Date.now().toString(36) }
  list.push(created)
  commit()
  return created
}
export function removeCostItem(general: string, category: string, id: string) {
  const list = COST_ITEMS[general]?.[category]
  if (!list) return
  COST_ITEMS[general][category] = list.filter((it) => it.id !== id)
  for (const tpl of QUOTE_TEMPLATES) tpl.costs = tpl.costs.filter((c) => c.itemId !== id)
  commit()
}
export function addCostCategory(general: string, category: string) {
  ;(COST_ITEMS[general] ??= {})[category] ??= []
  commit()
}
/** Set every selling price to reach `margin` % (rounded up to the half dollar). */
export function applyTargetMargin(margin: number) {
  for (const it of allCostItems()) if (!isFixedFee(it)) it.sell = Math.ceil((it.cost / (1 - margin / 100)) * 2) / 2
  commit()
}

/** Cost-catalogue general categories offered for a company's templates. */
export const COST_GROUPS: Record<CompanyId, string[]> = { toit: ['Toit en pente', 'Toit plat'], sg: ['Gouttières'], reno: ['Rénovation', 'Cabanon'] }

/** Scope lines a new quote of this company has checked by default. */
export function defaultChecked(company: CompanyId): string[] {
  if (company === 'toit') return [...ROOF_DEFAULT_SCOPE]
  return scopeFor(company).flatMap((s) => s.lines.slice(0, 1))
}


/** Sell total and margin of a template's cost lines at catalogue prices. */
export function templateTotals(costs: QuoteTemplate['costs']) {
  let cost = 0
  let sell = 0
  for (const c of costs) {
    const it = costItemById(c.itemId)
    if (!it) continue
    cost += it.cost * c.qty
    sell += it.sell * c.qty
  }
  return { cost, sell, margin: sell > 0 ? ((sell - cost) / sell) * 100 : 0 }
}

function withSummary(tpl: TemplateSeed | QuoteTemplate, recompute: boolean): QuoteTemplate {
  const totals = templateTotals(tpl.costs)
  return {
    ...tpl,
    co: tpl.company,
    lines: tpl.checked.length,
    items: tpl.costs.length,
    avg: recompute || tpl.avg === undefined ? Math.round(totals.sell) : tpl.avg,
    margin: recompute || tpl.margin === undefined ? Math.round(totals.margin) : tpl.margin,
  }
}

export const QUOTE_TEMPLATES: QuoteTemplate[] = SEEDS.map((s) => withSummary({ ...s, checked: s.checked.length ? s.checked : defaultChecked(s.company) }, false))

export function saveQuoteTemplate(input: QuoteTemplate) {
  const tpl = withSummary(input, true)
  const i = QUOTE_TEMPLATES.findIndex((x) => x.id === tpl.id)
  if (i >= 0) QUOTE_TEMPLATES[i] = tpl
  else QUOTE_TEMPLATES.push(tpl)
  commit()
}
export function removeQuoteTemplate(id: string) {
  const i = QUOTE_TEMPLATES.findIndex((x) => x.id === id)
  if (i >= 0) QUOTE_TEMPLATES.splice(i, 1)
  commit()
}
export const templateById = (id?: string) => QUOTE_TEMPLATES.find((x) => x.id === id)
