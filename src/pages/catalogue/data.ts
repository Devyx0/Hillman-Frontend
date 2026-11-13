/**
 * Static catalogue / settings data (to be served by the backend later).
 * Mockup names: G4→GUTTER_SCOPE  U4→RENO_SCOPE  kx→WORK_KINDS  V4→EXPERTISES
 * Q4→COST_ITEMS  Y4→QUOTE_TEMPLATES  X4→WARRANTIES  gd→DEFAULT_TERMS
 * wo→COMPANY_PROFILES  I4→PDF_COLORS  Cx→ROLES  Mx→PERMISSIONS  W4→roleOf
 * Dd→SWATCH_CLASS  e5→SWATCHES  a5→FOLLOW_UP_EMAIL  s5→AUDIT_LOG
 */
import type { CompanyId, ScopeSection } from '../../data/mock'

export const GUTTER_SCOPE: ScopeSection[] = [
  { name: 'Gouttières', lines: ['Gouttières aluminium 5 po sans joint, formées sur place', 'Gouttières aluminium 6 po (modèles Distinction)', "Gouttières d'acier", 'Crochets vissés Suprême aux 16 po'] },
  { name: 'Descentes et coudes', lines: ['Tuyaux de descente 2 × 3 po', 'Tuyaux de descente 3 × 4 po', 'Coudes A et B selon le parcours'] },
  { name: 'Protège-gouttières', lines: ['ZONE DÉGAGÉE — T-Rex M-5200 (crochet continu)', 'ZONE DÉGAGÉE — T-Rex XL M-5800 (crochet continu)', 'ZONE AVEC DÉBRIS — DoublePro D-11500 (microfiltrant)', 'Pare-feuilles 5300 zip'] },
  { name: 'Soffite et fascia', lines: ['Soffite ventilé aluminium', "Fascia 2 × 6 recouvert d'aluminium", 'Moulure J'] },
  { name: 'Services', lines: ['Enlever les gouttières existantes (E.G.E.)', 'Nettoyage et vidange des gouttières', 'Réparation de fuites et réalignement'] },
]

export const RENO_SCOPE: ScopeSection[] = [
  { name: 'Préparation', lines: ['Plans et devis par un technologue', 'Demande de permis auprès de la Ville', 'Protection des aires existantes'] },
  { name: 'Charpente et menuiserie', lines: ['Fondation sur pieux vissés', 'Charpente murs 2 × 6', 'Fermes de toit préfabriquées'] },
  { name: 'Enveloppe', lines: ['Isolation R-24 murs / R-60 entretoit', 'Pare-air et pare-vapeur', 'Revêtement extérieur (au choix du client)'] },
  { name: 'Finition intérieure', lines: ['Gypse, joints et peinture 2 couches', 'Plancher flottant', 'Moulures et portes intérieures'] },
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

interface CostItem {
  id: string
  name: string
  unit: string
  cost: number
  sell: number
}

/** General category → category → items. */
export type CostCatalogue = Record<string, Record<string, CostItem[]>>

export const COST_ITEMS: CostCatalogue = {
  'Toit en pente': {
    Bardeaux: [
      { id: 'b1', name: 'Bardeau Architectural 30 pi²', unit: 'paq.', cost: 50, sell: 50 },
      { id: 'b2', name: 'Chapeau ± 22 pi lin.', unit: 'paq.', cost: 60, sell: 60 },
      { id: 'b3', name: 'CertainTeed Shadow Ridge', unit: 'paq.', cost: 52, sell: 52 },
      { id: 'b4', name: 'Landmark Pro', unit: 'paq.', cost: 55, sell: 55 },
      { id: 'b5', name: 'Timberline GAF', unit: 'paq.', cost: 50, sell: 50 },
      { id: 'b6', name: 'Timberline UHDZ GAF', unit: 'paq.', cost: 60, sell: 60 },
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
      { id: 'g5', name: 'T-REX 5200', unit: 'pi', cost: 4, sell: 4 },
      { id: 'g6', name: 'T-REX 5800', unit: 'pi', cost: 5, sell: 5 },
      { id: 'g7', name: 'T-REX 11500 DL PRO', unit: 'pi', cost: 5, sell: 5 },
    ],
  },
  Cabanon: {},
}

export const QUOTE_TEMPLATES = [
  { name: 'Bardeaux · 1 étage standard', co: 'toit', lines: 31, items: 11, avg: 13900, margin: 31, used: 142, win: 46 },
  { name: 'Bardeaux · 2 étages + Stormguard', co: 'toit', lines: 34, items: 13, avg: 19400, margin: 30, used: 88, win: 41 },
  { name: 'Toit plat · élastomère 2 couches', co: 'toit', lines: 27, items: 9, avg: 16800, margin: 29, used: 61, win: 38 },
  { name: 'Gouttières T-Rex M-5200 · bungalow', co: 'sg', lines: 8, items: 6, avg: 1650, margin: 47, used: 611, win: 55 },
  { name: 'Gouttières + DoublePro · 2 étages', co: 'sg', lines: 9, items: 7, avg: 3420, margin: 45, used: 204, win: 49 },
  { name: 'Nettoyage annuel', co: 'sg', lines: 2, items: 1, avg: 350, margin: 68, used: 932, win: 81 },
  { name: 'Agrandissement 12 × 16', co: 'reno', lines: 12, items: 22, avg: 84000, margin: 26, used: 9, win: 33 },
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
