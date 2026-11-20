/**
 * Mock data layer. Everything here is deterministic (seeded PRNG) so the UI is
 * identical on every load. When the backend repo exists, replace these exports
 * with API calls behind the same shapes.
 *
 * NOTE: the order of PRNG calls matters — do not reorder generators.
 */
import { GUTTER_SEEDS, seedGutterQuote } from './gutter-quantities'

export type CompanyId = 'toit' | 'sg' | 'reno'

export interface Company {
  id: CompanyId
  name: string
  short: string
  code: string
  phone: string
  rbq: string
  tone: string
  dot: string
}

export const TODAY = '2026-10-20'

export const COMPANY_NAMES: Record<CompanyId, string> = {
  toit: 'Toitures Hillman',
  sg: 'Signature Gouttières',
  reno: 'Rénovations Hillman',
}

export const COMPANIES: Company[] = [
  { id: 'toit', name: 'Toitures Hillman', short: 'Toitures', code: 'H', phone: '418 576-1993', rbq: '5648-0858-01', tone: 'bg-data-5 text-data-5-ink border-data-5-edge', dot: 'bg-data-5-ink' },
  { id: 'sg', name: 'Signature Gouttières', short: 'Gouttières', code: 'G', phone: '418 915-3443', rbq: '5701-4706-01', tone: 'bg-data-6 text-data-6-ink border-data-6-edge', dot: 'bg-data-6-ink' },
  { id: 'reno', name: 'Rénovations Hillman', short: 'Rénovations', code: 'R', phone: '418 576-1993', rbq: '5648-0858-01', tone: 'bg-data-7 text-data-7-ink border-data-7-edge', dot: 'bg-data-7-ink' },
]

export const companyById = (id: string): Company => COMPANIES.find((c) => c.id === id)!

export interface Rep {
  id: string
  name: string
  first: string
  company: CompanyId | 'all'
  role: string
  phone: string
  color: string
  territory: string
}

export const REPS: Rep[] = [
  { id: 'jph', name: 'Jean-Pierre Hillman', first: 'Jean-Pierre', company: 'toit', role: 'Président · Estimateur toitures', phone: '581 888-7993', color: 'data-10', territory: 'Québec Nord' },
  { id: 'plc', name: 'Pierre-Luc Cloutier', first: 'Pierre-Luc', company: 'sg', role: 'Estimateur gouttières', phone: '418 399-9684', color: 'data-8', territory: 'Rive-Nord' },
  { id: 'dps', name: 'Dominic Plourde', first: 'Dominic', company: 'sg', role: 'Estimateur gouttières', phone: '418 575-3486', color: 'data-1', territory: 'Rive-Sud' },
  { id: 'ofo', name: 'Olivier Fontaine', first: 'Olivier', company: 'sg', role: 'Directeur des ventes', phone: '418 915-3443', color: 'data-9', territory: 'Québec Centre' },
  { id: 'pau', name: 'Philippe Audet', first: 'Philippe', company: 'reno', role: 'Estimateur rénovations', phone: '418 576-1993', color: 'data-3', territory: 'Grand Québec' },
  { id: 'dpe', name: 'Dany Pelletier', first: 'Dany', company: 'sg', role: 'Estimateur gouttières', phone: '418 915-3443', color: 'data-4', territory: 'Beauport · Côte-de-Beaupré' },
  { id: 'bto', name: 'Benoit Tondreau', first: 'Benoit', company: 'sg', role: 'Estimateur gouttières', phone: '418 265-3641', color: 'data-2', territory: 'Ste-Foy · Sillery' },
  { id: 'hpe', name: 'Hélène Petitpas', first: 'Hélène', company: 'all', role: 'Coordonnatrice · Planification', phone: '418 576-1993', color: 'data-7', territory: '—' },
]

export const repById = (id?: string): Rep | undefined => REPS.find((r) => r.id === id)
export const ME: Rep = repById('jph')!

export const QUOTE_STATUSES = [
  'En soumission',
  'En cours',
  'À rappeler',
  'À rappeler (année prochaine)',
  'Client va nous rappeler',
  'Rappel courriel envoyé',
  'Signé',
  'Erreur du rappel courriel',
  'Terminé',
  'Payé',
  'Refusé',
] as const
export type QuoteStatus = (typeof QUOTE_STATUSES)[number]

export type Tone = 'info' | 'accent' | 'warn' | 'neutral' | 'good' | 'critical'

export const STATUS_TONE: Record<string, Tone> = {
  'En soumission': 'info',
  'En cours': 'accent',
  'À rappeler': 'warn',
  'À rappeler (année prochaine)': 'neutral',
  'Client va nous rappeler': 'neutral',
  'Rappel courriel envoyé': 'warn',
  Signé: 'good',
  'Erreur du rappel courriel': 'critical',
  Terminé: 'good',
  Payé: 'good',
  Refusé: 'critical',
}

export const SOURCES = [
  'Site web', 'Google', 'Facebook', 'Agent IA', 'Appel entrant', 'Référence', 'Bouche à oreille',
  'Salon expo habitat', 'Maxgo', 'Équipement roulant', 'Rénos à rabais', 'Pancarte de chantier', 'Autre',
]

// ── Seeded PRNG ─────────────────────────────────────────────────────────────
let seed = 20261020
export const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296), seed / 4294967296)
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]
const between = (min: number, max: number) => min + rand() * (max - min)
const isoDate = (d: Date) => d.toISOString().slice(0, 10)
export const daysAgo = (n: number) => {
  const d = new Date(2026, 9, 20)
  d.setDate(d.getDate() - n)
  return isoDate(d)
}

const FIRST_NAMES = ['Isabelle', 'Martin', 'Sophie', 'Mathieu', 'Julie', 'François', 'Catherine', 'Patrick', 'Nathalie', 'Sébastien', 'Mélanie', 'Alexandre', 'Geneviève', 'Simon', 'Karine', 'Jonathan', 'Valérie', 'Éric', 'Annie', 'Maxime', 'Chantal', 'Guillaume', 'Marie-Ève', 'Louis', 'Caroline', 'Steve', 'Émilie', 'Yves', 'Josée', 'Marc-André', 'Lucie', 'Denis', 'Andrée', 'Olivier', 'Sylvie', 'Raymond']
const LAST_NAMES = ['Gagnon', 'Roy', 'Côté', 'Bouchard', 'Gauthier', 'Morin', 'Lavoie', 'Fortin', 'Gagné', 'Ouellet', 'Pelletier', 'Bélanger', 'Lévesque', 'Bergeron', 'Leblanc', 'Paquette', 'Girard', 'Simard', 'Boucher', 'Caron', 'Beaulieu', 'Cloutier', 'Dubé', 'Poirier', 'Fournier', 'Lapointe', 'Leclerc', 'Lefebvre', 'Poulin', 'Thibault', 'Tremblay', 'Drolet', 'Vachon', 'Labbé']
const STREETS = ['rue des Érables', 'avenue Royale', 'boulevard Louis-XIV', 'rue du Golf', 'chemin Sainte-Foy', 'rue de la Faune', 'avenue Maguire', 'rue Seigneuriale', 'boulevard Raymond', 'rue des Bouleaux', 'chemin du Lac', 'rue Saint-Louis', 'avenue des Pins', 'rue Jacques-Bédard', 'boulevard Henri-Bourassa', "rue de l'Espinay", 'chemin des Quatre-Bourgeois', 'rue Racine']
const CITIES = ['Charlesbourg', 'Beauport', 'Sainte-Foy', 'Sillery', 'Lac-Beauport', 'Stoneham', 'Cap-Rouge', 'Loretteville', 'Lévis', 'Saint-Nicolas', 'Boischatel', 'Château-Richer', "L'Ancienne-Lorette", 'Limoilou', 'Lebourgneuf', 'Neufchâtel', 'Saint-Augustin', 'Sainte-Brigitte-de-Laval']
const POSTAL_PREFIX: Record<string, string> = { Charlesbourg: 'G1H', Beauport: 'G1E', 'Sainte-Foy': 'G1V', Sillery: 'G1S', 'Lac-Beauport': 'G3B', Stoneham: 'G3C', 'Cap-Rouge': 'G1Y', Loretteville: 'G2A', Lévis: 'G6V', 'Saint-Nicolas': 'G7A', Boischatel: 'G0A', 'Château-Richer': 'G0A', "L'Ancienne-Lorette": 'G2E', Limoilou: 'G1L', Lebourgneuf: 'G2K', Neufchâtel: 'G2B', 'Saint-Augustin': 'G3A', 'Sainte-Brigitte-de-Laval': 'G0A' }

// ── Clients ─────────────────────────────────────────────────────────────────
export interface Client {
  id: string
  first: string
  last: string
  company?: string
  phone: string
  mobile?: string
  email: string
  no: string
  street: string
  city: string
  postal: string
  since: string
  tags: string[]
  source: string
  lifetime: number
  quotes: number
  lastActivity: string
  consentSms: boolean
  type: string
  /** Language for everything sent to this client (portal, PDF, emails, texts). Default French. */
  language?: 'fr' | 'en'
}

/** The client's communication language (French unless set). */
export const clientLang = (c?: { language?: 'fr' | 'en' }): 'fr' | 'en' => c?.language ?? 'fr'

const strip = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export const CLIENTS: Client[] = []
for (let i = 0; i < 64; i++) {
  const first = FIRST_NAMES[i % FIRST_NAMES.length]
  const last = LAST_NAMES[(i * 7 + 3) % LAST_NAMES.length]
  const city = CITIES[(i * 5) % CITIES.length]
  const biz = i % 9 === 4
  CLIENTS.push({
    id: 'c' + (66700 - i),
    first,
    last,
    company: biz ? pick(['Gestion immobilière Laurentia', 'Construction Bérubé', 'Habitations Mistral', 'Syndicat Copro Les Jardins', 'Immeubles Cartier']) : undefined,
    phone: `418 ${Math.floor(between(200, 999))}-${String(Math.floor(between(1000, 9999)))}`,
    mobile: rand() > 0.4 ? `581 ${Math.floor(between(200, 999))}-${String(Math.floor(between(1000, 9999)))}` : undefined,
    email: `${strip(first).replace(/[^a-z]/g, '')}.${strip(last)}@${pick(['gmail.com', 'videotron.ca', 'hotmail.com', 'outlook.com', 'live.ca'])}`,
    no: String(Math.floor(between(12, 4900))),
    street: pick(STREETS),
    city,
    postal: `${POSTAL_PREFIX[city]} ${Math.floor(between(1, 9))}${pick(['A', 'B', 'C', 'K', 'L', 'R'])}${Math.floor(between(1, 9))}`,
    since: String(Math.floor(between(2015, 2026.9))),
    tags: [],
    source: pick(SOURCES),
    lifetime: 0,
    quotes: 0,
    lastActivity: daysAgo(Math.floor(between(0, 40))),
    consentSms: rand() > 0.15,
    type: biz ? (i % 2 ? 'Commercial' : 'Entrepreneur') : 'Résidentiel',
  })
}
Object.assign(CLIENTS[0], {
  first: 'Isabelle', last: 'Gagnon', phone: '418 627-4410', mobile: '581 309-2287',
  email: 'isabelle.gagnon@videotron.ca', no: '1245', street: 'rue des Érables', city: 'Charlesbourg',
  postal: 'G1H 3K7', since: '2019', source: 'Google', type: 'Résidentiel', consentSms: true,
})

// A few English-speaking clients, so client-language drafts, portal and PDF can be demoed.
for (const i of [3, 11, 20]) CLIENTS[i].language = 'en'

export const fullName = (c: { first: string; last: string }) => `${c.first} ${c.last}`
export const clientById = (id?: string): Client | undefined => CLIENTS.find((c) => c.id === id)

// ── Quotes (soumissions) ────────────────────────────────────────────────────
export interface Quote {
  id: string
  no: string
  clientId: string
  company: CompanyId
  repId: string
  status: string
  date: string
  amount: number
  cost: number
  source: string
  workType: string
  city: string
  views: number
  lastViewed?: string
  daysInStatus: number
  hot: boolean
  nextAction?: string
  nextActionDate: string
}

export const WORK_TYPES: Record<CompanyId, string[]> = {
  toit: ['Toit en pente · Bardeaux', 'Toit plat · Élastomère', 'Toit en pente · Bardeaux', 'Toit en métal', 'Réparation toiture', 'Toit plat · EPDM'],
  sg: ['Gouttières · T-Rex M-5200', 'Gouttières · T-Rex XL M-5800', 'Gouttières · DoublePro D-11500', 'Nettoyage de gouttières', 'Soffite / Fascia', 'Pare-feuilles'],
  reno: ['Agrandissement', 'Cuisine', 'Salle de bain', 'Garage', 'Revêtement extérieur', 'Fenestration'],
}
const AMOUNT_RANGE: Record<CompanyId, [number, number]> = { toit: [6500, 34000], sg: [350, 5200], reno: [9000, 92000] }
const COMPANY_REPS: Record<CompanyId, string[]> = { toit: ['jph', 'jph', 'jph'], sg: ['plc', 'plc', 'dps', 'ofo', 'dpe', 'bto'], reno: ['pau'] }
const STATUS_POOL = ['En soumission', 'En soumission', 'En soumission', 'À rappeler', 'À rappeler', 'Rappel courriel envoyé', 'Rappel courriel envoyé', 'Signé', 'Signé', 'Signé', 'Refusé', 'Client va nous rappeler', 'À rappeler (année prochaine)', 'En cours', 'Payé']

export const QUOTES: Quote[] = []
for (let i = 0; i < 96; i++) {
  const company: CompanyId = i % 10 < 6 ? 'sg' : i % 10 < 9 ? 'toit' : 'reno'
  const client = CLIENTS[(i * 3 + 1) % CLIENTS.length]
  const [min, max] = AMOUNT_RANGE[company]
  const amount = Math.round(between(min, max) / 5) * 5
  const margin = between(company === 'sg' ? 0.38 : 0.24, company === 'sg' ? 0.55 : 0.36)
  const status = i < 6 ? 'En soumission' : pick(STATUS_POOL)
  const age = Math.floor(between(0, 45))
  QUOTES.push({
    id: 'q' + (64320 - i),
    no: `${companyById(company).code}${64320 - i}`,
    clientId: client.id,
    company,
    repId: pick(COMPANY_REPS[company]),
    status,
    date: daysAgo(age),
    amount,
    cost: Math.round(amount * (1 - margin)),
    source: client.source,
    workType: pick(WORK_TYPES[company]),
    city: client.city,
    views: status === 'En cours' ? 0 : Math.floor(between(0, 5)),
    lastViewed: rand() > 0.5 ? daysAgo(Math.floor(between(0, 4))) : undefined,
    daysInStatus: Math.min(age, Math.floor(between(0, 20))),
    hot: rand() > 0.82,
    nextAction: status === 'À rappeler' ? 'Appel de suivi' : status === 'Rappel courriel envoyé' ? 'Courriel + texto J+12 (auto)' : status === 'En soumission' ? 'Courriel + texto J+6 (auto)' : undefined,
    nextActionDate: daysAgo(-Math.floor(between(0, 6))),
  })
}
Object.assign(QUOTES[0], {
  id: 'q64320', no: 'H64320', clientId: CLIENTS[0].id, company: 'toit', repId: 'jph', status: 'En soumission',
  date: '2026-10-16', amount: 18450, cost: 12382, source: 'Google', workType: 'Toit en pente · Bardeaux',
  city: 'Charlesbourg', views: 3, lastViewed: '2026-10-20', hot: true, daysInStatus: 4,
  nextAction: 'Appeler — a ouvert 3 fois', nextActionDate: TODAY,
})
// Gouttières: every quote gets a gutter form whose derived quantities cost exactly `q.cost` (amounts unchanged),
// so the list, the builder (Formulaire → Quantités), the PDF, the portal and the work order agree.
for (const q of QUOTES) {
  if (q.company !== 'sg') continue
  const seed = seedGutterQuote(q)
  q.cost = seed.cost
  GUTTER_SEEDS.set(q.id, seed)
}
for (const q of QUOTES) {
  const c = clientById(q.clientId)!
  c.quotes++
  if (q.status === 'Signé' || q.status === 'Payé' || q.status === 'Terminé') c.lifetime += q.amount
}
Object.assign(CLIENTS[0], { lifetime: 2730, lastActivity: TODAY })

// ── Leads ───────────────────────────────────────────────────────────────────
export interface Lead {
  id: string
  name: string
  phone: string
  email?: string
  city: string
  company: CompanyId
  channel: string
  received: string
  ago: string
  message: string
  aiSummary: string
  score: number
  status: string
  booked?: string
  repId?: string
}

export const LEADS: Lead[] = [
  { id: 'l1', name: 'Catherine Drolet', phone: '418 802-5531', email: 'cath.drolet@gmail.com', city: 'Lac-Beauport', company: 'toit', channel: 'Agent IA', received: '2026-10-20 07:42', ago: 'il y a 12 min', message: "Bonjour, mon toit coule près de la cheminée depuis la pluie de dimanche. Maison de 1998, bardeaux d'origine.", aiSummary: 'Infiltration près de la cheminée · bardeaux de 28 ans · urgence moyenne. Remplacement complet probable (≈ 1 900 pi²).', score: 92, status: 'RDV réservé', booked: 'Mer. 21 oct. · 10 h 00', repId: 'jph' },
  { id: 'l2', name: 'Martin Vachon', phone: '581 307-1184', city: 'Beauport', company: 'sg', channel: 'Site web', received: '2026-10-20 07:15', ago: 'il y a 39 min', message: 'Soumission pour gouttières 5 po + protège-gouttières, bungalow.', aiSummary: "Bungalow · ≈ 140 pi lin. · intéressé par T-Rex. Vit près d'arbres matures → proposer DoublePro.", score: 84, status: 'Qualifié par IA', repId: 'dpe' },
  { id: 'l3', name: 'Syndicat Copro Les Jardins', phone: '418 663-2009', email: 'ca@lesjardins-copro.ca', city: 'Sainte-Foy', company: 'toit', channel: 'Appel entrant', received: '2026-10-20 06:58', ago: 'il y a 56 min', message: 'Appel de 4 min 12 s — réfection de toit plat, 3 bâtiments, budget voté au printemps.', aiSummary: 'Commercial · 3 toits plats · élastomère · décision par CA. Gros potentiel (≈ 90–140 k$).', score: 88, status: 'À contacter', repId: 'jph' },
  { id: 'l4', name: 'Julie Thibault', phone: '418 931-4470', city: 'Cap-Rouge', company: 'sg', channel: 'Facebook', received: '2026-10-19 21:30', ago: 'hier 21 h 30', message: "Nettoyage de gouttières avant l'hiver svp", aiSummary: 'Nettoyage simple · 2 étages · cliente existante (gouttières posées en 2021).', score: 61, status: 'RDV réservé', booked: 'Jeu. 22 oct. · 13 h 00', repId: 'bto' },
  { id: 'l5', name: 'Éric Labbé', phone: '418 455-0912', city: 'Lévis', company: 'reno', channel: 'Google', received: '2026-10-19 16:05', ago: 'hier 16 h 05', message: 'Agrandissement arrière 12x16 avec salle familiale.', aiSummary: 'Agrandissement 192 pi² · plans non faits · budget ≈ 85 k$ · échéance printemps 2027.', score: 74, status: 'Nouveau', repId: 'pau' },
  { id: 'l6', name: 'Annie Poirier', phone: '581 222-8871', city: 'Stoneham', company: 'sg', channel: 'Référence', received: '2026-10-19 11:20', ago: 'hier 11 h 20', message: 'Référée par Sophie Côté. Soffites et fascias à changer.', aiSummary: 'Référence de cliente 2024 · soffite/fascia · cross-sell gouttières possible.', score: 70, status: 'À contacter', repId: 'plc' },
  { id: 'l7', name: 'Steve Fournier', phone: '418 570-3321', city: 'Limoilou', company: 'toit', channel: 'Site web', received: '2026-10-18 09:44', ago: 'dim. 9 h 44', message: 'Prix pour bardeaux, juste curieux', aiSummary: 'Demande de prix vague · locataire? À valider avant déplacement.', score: 32, status: 'Non qualifié' },
]

// ── Conversations ───────────────────────────────────────────────────────────
export type Channel = 'sms' | 'email' | 'call' | 'ai' | 'note'

export interface Message {
  id: string
  dir: 'in' | 'out'
  channel: Channel
  at: string
  by?: string
  text: string
  meta?: string
}

export interface Thread {
  id: string
  clientId?: string
  name: string
  company: CompanyId
  channel: Channel
  unread: number
  last: string
  at: string
  quoteNo?: string
  assigned: string
  aiHandled?: boolean
  messages: Message[]
}

export const THREADS: Thread[] = [
  {
    id: 't1', clientId: CLIENTS[0].id, name: 'Isabelle Gagnon', company: 'toit', channel: 'sms', unread: 2,
    last: 'Est-ce que le prix inclut le contreplaqué si on en trouve de pourri?', at: '8 h 41', quoteNo: 'H64320', assigned: 'jph',
    messages: [
      { id: 'm1', dir: 'out', channel: 'email', at: 'ven. 16 oct. · 15 h 12', by: 'Jean-Pierre Hillman', text: 'Bonjour Mme Gagnon, voici votre soumission H64320 pour la réfection complète de votre toiture. Vous pouvez la consulter, choisir votre option et la signer en ligne.', meta: 'Soumission H64320 jointe · Ouvert 3 fois' },
      { id: 'm2', dir: 'in', channel: 'note', at: 'sam. 17 oct. · 10 h 03', text: 'Isabelle a consulté la soumission (2 min 40 s) — section Garanties.', meta: 'Activité portail' },
      { id: 'm3', dir: 'out', channel: 'sms', at: 'dim. 18 oct. · 10 h 00', by: 'Jean-Pierre Hillman', text: "Bonjour Isabelle, c'est Jean-Pierre de Toitures Hillman. Avez-vous des questions sur votre soumission? Je peux passer vous voir cette semaine. Répondez à ce texto au besoin 🙂" },
      { id: 'm4', dir: 'in', channel: 'sms', at: '8 h 39', text: 'Bonjour! Oui on regarde ça avec mon conjoint.' },
      { id: 'm5', dir: 'in', channel: 'sms', at: '8 h 41', text: 'Est-ce que le prix inclut le contreplaqué si on en trouve de pourri?' },
    ],
  },
  {
    id: 't2', name: 'Catherine Drolet', company: 'toit', channel: 'ai', unread: 0,
    last: 'Parfait, Jean-Pierre sera chez vous demain à 10 h. Vous recevrez un rappel la veille.', at: '7 h 46', assigned: 'jph', aiHandled: true,
    messages: [
      { id: 'n1', dir: 'in', channel: 'sms', at: '7 h 42', text: "Bonjour, mon toit coule près de la cheminée depuis la pluie de dimanche. Maison de 1998, bardeaux d'origine." },
      { id: 'n2', dir: 'out', channel: 'ai', at: '7 h 42', by: 'Agent IA Hillman', text: "Bonjour Catherine! Désolé pour l'infiltration. Pour bien préparer la visite : est-ce que l'eau entre à l'intérieur (plafond taché) ou seulement dans l'entretoit?" },
      { id: 'n3', dir: 'in', channel: 'sms', at: '7 h 44', text: "Dans l'entretoit, mais on voit une tache au plafond de la chambre." },
      { id: 'n4', dir: 'out', channel: 'ai', at: '7 h 44', by: 'Agent IA Hillman', text: 'Merci. Je peux vous proposer une visite gratuite de notre estimateur : demain 10 h ou jeudi 15 h. Laquelle vous convient?' },
      { id: 'n5', dir: 'in', channel: 'sms', at: '7 h 45', text: 'Demain 10h svp' },
      { id: 'n6', dir: 'out', channel: 'ai', at: '7 h 46', by: 'Agent IA Hillman', text: 'Parfait, Jean-Pierre sera chez vous demain à 10 h. Vous recevrez un rappel la veille.', meta: 'Rendez-vous créé · Lead qualifié (92/100)' },
    ],
  },
  {
    id: 't3', name: 'Martin Vachon', company: 'sg', channel: 'sms', unread: 1, last: "Combien de temps pour l'installation?", at: '8 h 02', assigned: 'dpe',
    messages: [
      { id: 'o1', dir: 'in', channel: 'note', at: '7 h 15', text: 'Formulaire Site web — Gouttières 5 po + protège-gouttières, bungalow.', meta: 'signaturegouttieres.com/soumission' },
      { id: 'o2', dir: 'out', channel: 'ai', at: '7 h 16', by: 'Agent IA Hillman', text: 'Bonjour Martin, merci pour votre demande! Un estimateur de Signature Gouttières peut passer prendre les mesures cette semaine. Préférez-vous jeudi ou vendredi?' },
      { id: 'o3', dir: 'in', channel: 'sms', at: '8 h 02', text: "Combien de temps pour l'installation?" },
    ],
  },
  {
    id: 't4', name: 'Gestion immobilière Laurentia', company: 'toit', channel: 'email', unread: 0,
    last: "Pouvez-vous nous envoyer l'attestation RBQ et l'assurance responsabilité?", at: 'Hier', quoteNo: 'H64301', assigned: 'jph',
    messages: [
      { id: 'p1', dir: 'in', channel: 'email', at: 'Hier · 14 h 20', text: "Bonjour, pouvez-vous nous envoyer l'attestation RBQ et l'assurance responsabilité? Le CA se réunit jeudi." },
    ],
  },
  {
    id: 't5', name: 'Julie Thibault', company: 'sg', channel: 'call', unread: 0, last: 'Appel sortant · 2 min 18 s · RDV confirmé jeudi 13 h', at: 'Hier', assigned: 'bto',
    messages: [
      { id: 'r1', dir: 'out', channel: 'call', at: 'Hier · 16 h 40', by: 'Benoit Tondreau', text: 'Appel sortant · 2 min 18 s', meta: "Résumé IA : nettoyage avant l'hiver, 2 étages, confirme jeudi 13 h. Mentionner protège-gouttières." },
    ],
  },
  {
    id: 't6', name: 'Louis Bergeron', company: 'reno', channel: 'email', unread: 0, last: 'Merci, on signe la soumission ce soir.', at: 'Lun.', quoteNo: 'R64288', assigned: 'pau',
    messages: [{ id: 's1', dir: 'in', channel: 'email', at: 'Lun. · 19 h 02', text: 'Merci, on signe la soumission ce soir.' }],
  },
  {
    id: 't7', name: 'Nathalie Lévesque', company: 'sg', channel: 'sms', unread: 0, last: 'Merci beaucoup, très beau travail! ⭐⭐⭐⭐⭐', at: 'Lun.', assigned: 'plc',
    messages: [
      { id: 'u1', dir: 'out', channel: 'sms', at: 'Lun. · 17 h 00', by: 'Automatisation · Avis Google', text: "Merci d'avoir choisi Signature Gouttières! Si vous êtes satisfaite, un avis Google nous aiderait énormément : g.page/signature-gouttieres" },
      { id: 'u2', dir: 'in', channel: 'sms', at: 'Lun. · 18 h 12', text: 'Merci beaucoup, très beau travail! ⭐⭐⭐⭐⭐' },
    ],
  },
]

// ── Agenda ──────────────────────────────────────────────────────────────────
export interface Appointment {
  id: string
  repId: string
  day: number
  start: number
  end: number
  title: string
  city: string
  type: string
  quoteNo?: string
  clientId?: string
  aiBooked?: boolean
}

export const APPOINTMENTS: Appointment[] = [
  { id: 'a1', repId: 'jph', day: 1, start: 9, end: 10, title: 'Bardeaux', city: 'Charlesbourg', type: 'Estimation' },
  { id: 'a2', repId: 'jph', day: 1, start: 13.5, end: 14.5, title: 'Toit plat', city: 'Lebourgneuf', type: 'Estimation' },
  { id: 'a3', repId: 'jph', day: 2, start: 8, end: 9, title: 'Bardeaux · infiltration', city: 'Neufchâtel', type: 'Inspection' },
  { id: 'a4', repId: 'jph', day: 2, start: 11, end: 12, title: 'Signature H64301', city: 'Sainte-Foy', type: 'Signature', quoteNo: 'H64301' },
  { id: 'a5', repId: 'jph', day: 2, start: 15, end: 16, title: 'Revoir Mme Gagnon', city: 'Charlesbourg', type: 'Revoir le client', quoteNo: 'H64320', clientId: 'c66700' },
  { id: 'a6', repId: 'jph', day: 3, start: 10, end: 11, title: 'Infiltration cheminée', city: 'Lac-Beauport', type: 'Estimation', aiBooked: true },
  { id: 'a7', repId: 'jph', day: 4, start: 9, end: 10.5, title: 'Copro Les Jardins · 3 toits', city: 'Sainte-Foy', type: 'Estimation' },
  { id: 'b1', repId: 'plc', day: 1, start: 8, end: 9, title: 'Gouttières', city: 'Cap-Rouge', type: 'Estimation' },
  { id: 'b2', repId: 'plc', day: 1, start: 10, end: 11, title: 'Gouttières', city: 'Québec', type: 'Estimation' },
  { id: 'b3', repId: 'plc', day: 2, start: 8, end: 9, title: 'Gouttières', city: 'Loretteville', type: 'Estimation' },
  { id: 'b4', repId: 'plc', day: 2, start: 9.5, end: 10.5, title: 'Réparations', city: 'Lac-Beauport', type: 'Estimation' },
  { id: 'b5', repId: 'plc', day: 2, start: 13, end: 14, title: 'Soffites', city: 'Beauport', type: 'Estimation' },
  { id: 'b6', repId: 'plc', day: 3, start: 8, end: 9, title: 'Neufs', city: 'Beauport', type: 'Estimation' },
  { id: 'b7', repId: 'plc', day: 3, start: 10, end: 11, title: 'Gouttières', city: 'Sainte-Anne-de-Beaupré', type: 'Estimation' },
  { id: 'b8', repId: 'plc', day: 4, start: 8, end: 9, title: 'Gouttières', city: 'Cap-Rouge', type: 'Estimation' },
  { id: 'b9', repId: 'plc', day: 5, start: 9, end: 10, title: 'Revoir le client', city: 'Lac-Beauport', type: 'Revoir le client' },
  { id: 'c1', repId: 'dpe', day: 1, start: 9, end: 10, title: 'Gouttières', city: 'Château-Richer', type: 'Estimation' },
  { id: 'c2', repId: 'dpe', day: 2, start: 10, end: 11, title: 'Gouttières', city: 'Boischatel', type: 'Estimation' },
  { id: 'c3', repId: 'dpe', day: 4, start: 14, end: 15, title: 'Gouttières 5 po', city: 'Beauport', type: 'Estimation', aiBooked: true },
  { id: 'c4', repId: 'dpe', day: 3, start: 13, end: 14, title: 'Inspection', city: 'Boischatel', type: 'Inspection' },
  { id: 'd1', repId: 'bto', day: 1, start: 11, end: 12, title: 'Réparations', city: 'Sillery', type: 'Estimation' },
  { id: 'd2', repId: 'bto', day: 2, start: 12, end: 13, title: 'Réparations', city: 'Sillery', type: 'Estimation' },
  { id: 'd3', repId: 'bto', day: 4, start: 13, end: 14, title: 'Nettoyage', city: 'Cap-Rouge', type: 'Estimation', aiBooked: true },
  { id: 'd4', repId: 'bto', day: 5, start: 8, end: 12, title: 'Non dispo', city: '', type: 'Non dispo' },
  { id: 'e1', repId: 'dps', day: 1, start: 13, end: 14, title: 'Gouttières', city: 'Lévis', type: 'Estimation' },
  { id: 'e2', repId: 'dps', day: 1, start: 14.5, end: 15.5, title: 'Entre 2', city: 'Saint-Romuald', type: 'Estimation' },
  { id: 'e3', repId: 'dps', day: 3, start: 9, end: 10, title: 'Gouttières', city: 'Saint-Nicolas', type: 'Estimation' },
  { id: 'e4', repId: 'dps', day: 5, start: 13, end: 14, title: 'Gouttières', city: 'Saint-Nicolas', type: 'Estimation' },
  { id: 'f1', repId: 'pau', day: 2, start: 9, end: 10.5, title: 'Agrandissement', city: 'Lévis', type: 'Estimation' },
  { id: 'f2', repId: 'pau', day: 4, start: 15, end: 16, title: 'Signature R64288', city: 'Sillery', type: 'Signature', quoteNo: 'R64288' },
]

export interface Job {
  id: string
  quoteNo: string
  client: string
  city: string
  company: CompanyId
  crewId?: string
  startDay?: number
  days: number
  amount: number
  stage: string
  work: string
  materials: string
  deposit: boolean
  weather?: string
}

export const JOBS: Job[] = [
  { id: 'j1', quoteNo: 'H63907', client: 'R. Croteau', city: 'Charlesbourg', company: 'toit', crewId: 'ta', startDay: 0, days: 2, amount: 14000, stage: 'Terminé', work: 'Bardeaux · 22 carrés', materials: 'Livrés', deposit: true },
  { id: 'j2', quoteNo: 'H64026', client: 'P. Simard', city: 'Neufchâtel', company: 'toit', crewId: 'ta', startDay: 3, days: 2, amount: 14889, stage: 'Planifié', work: 'Timberline Charbon · OSB ½', materials: 'Livrés', deposit: true, weather: 'Pluie 60 % jeu.' },
  { id: 'j3', quoteNo: 'H64272', client: 'H. Paré', city: 'Lac-Beauport', company: 'toit', crewId: 'tb', startDay: 2, days: 3, amount: 14000, stage: 'Planifié', work: 'Élastomère 2 couches', materials: 'Commandés', deposit: true },
  { id: 'j4', quoteNo: 'H63771', client: 'C. Grenier', city: 'Sillery', company: 'toit', crewId: 'tb', startDay: 6, days: 2, amount: 6500, stage: 'Planifié', work: 'Élastomère · réfection', materials: 'À commander', deposit: false },
  { id: 'j5', quoteNo: 'H63759', client: 'V. Beaudoin', city: 'Beauport', company: 'toit', crewId: 'ta', startDay: 7, days: 2, amount: 6000, stage: 'Planifié', work: 'Bardeaux · 9 carrés', materials: 'Commandés', deposit: true },
  { id: 'j6', quoteNo: 'G64298', client: 'R. Blouin', city: 'Stoneham', company: 'sg', crewId: 'f1', startDay: 1, days: 1, amount: 402, stage: 'En cours', work: 'Nettoyage + vidange', materials: 'Livrés', deposit: false },
  { id: 'j7', quoteNo: 'G64251', client: 'Habitations Mica', city: 'Lebourgneuf', company: 'sg', crewId: 'f1', startDay: 2, days: 2, amount: 4870, stage: 'Planifié', work: 'T-Rex XL M-5800 · 210 pi', materials: 'Livrés', deposit: true },
  { id: 'j8', quoteNo: 'G64219', client: 'D. Duchesne', city: 'Beauport', company: 'sg', crewId: 'f2', startDay: 1, days: 1, amount: 2140, stage: 'En cours', work: 'T-Rex M-5200 · 120 pi', materials: 'Livrés', deposit: true },
  { id: 'j9', quoteNo: 'G64196', client: 'A. Dumas', city: 'Lévis', company: 'sg', crewId: 'f2', startDay: 3, days: 1, amount: 1890, stage: 'Planifié', work: 'Gouttières 5" + coudes', materials: 'Livrés', deposit: true },
  { id: 'j10', quoteNo: 'G64157', client: 'M. Michaud', city: 'Cap-Rouge', company: 'sg', crewId: 'f2', startDay: 4, days: 1, amount: 3260, stage: 'Planifié', work: 'DoublePro D-11500', materials: 'Commandés', deposit: true },
  { id: 'j11', quoteNo: 'R63978', client: 'M. Lavoie', city: 'Sillery', company: 'reno', crewId: 'm1', startDay: 0, days: 10, amount: 48200, stage: 'En cours', work: 'Garage + revêtement', materials: 'Livrés', deposit: true },
  { id: 'j12', quoteNo: 'G64312', client: 'F. Paradis', city: 'Charlesbourg', company: 'sg', days: 1, amount: 1540, stage: 'À planifier', work: 'T-Rex M-5200 · 90 pi', materials: 'À commander', deposit: false },
  { id: 'j13', quoteNo: 'H64305', client: 'A. Larouche', city: 'Lebourgneuf', company: 'toit', days: 2, amount: 16300, stage: 'À planifier', work: 'Bardeaux · 24 carrés', materials: 'À commander', deposit: true },
  { id: 'j14', quoteNo: 'G64306', client: 'S. Corriveau', city: 'Limoilou', company: 'sg', days: 1, amount: 980, stage: 'À planifier', work: 'Pare-feuilles 5300 zip', materials: 'Livrés', deposit: false },
  { id: 'j15', quoteNo: 'G64187', client: 'L. Caron', city: 'Sainte-Foy', company: 'sg', crewId: 'f1', startDay: -3, days: 1, amount: 2380, stage: 'Facturé', work: 'T-Rex 5800', materials: 'Livrés', deposit: true },
  { id: 'j16', quoteNo: 'H63840', client: 'G. Leclerc', city: 'Beauport', company: 'toit', crewId: 'tb', startDay: -4, days: 2, amount: 12750, stage: 'Payé', work: 'Bardeaux', materials: 'Livrés', deposit: true },
]

// ── Quote builder: scope of work + materials ────────────────────────────────
export interface ScopeSection {
  name: string
  lines: string[]
}

export const SCOPE_SECTIONS: ScopeSection[] = [
  { name: 'Préparation de chantier', lines: ['Ancrages et harnais de sécurité conformes aux normes de la SST', "Montage et démontage d'une chute à déchets", 'Installation de garde-corps conformes aux exigences de la SST', "Montage et démontage d'échafaudage au besoin selon les normes de la SST", 'Service de nacelle inclus'] },
  { name: 'Conteneur', lines: ["Fourniture d'un conteneur pour disposer des rebuts"] },
  { name: 'Protection de chantier', lines: ["Installation de toiles pour protéger l'aménagement paysager et le bâtiment", "Installation de madriers sous le conteneur de façon à protéger l'entrée", 'Installation de toiles sur la piscine', "Installation d'un périmètre de sécurité au besoin", "Protection des fils haute tension faite par le client auprès d'Hydro-Québec"] },
  { name: 'Démantèlement', lines: ["Démantèlement de la toiture existante (bardeaux) jusqu'au pontage de bois (une couche)", "Démantèlement de la toiture existante (membrane élastomère) jusqu'au pontage de bois", 'Démantèlement des gouttières et des descentes', 'Démantèlement des soffites', 'Démantèlement des fascias'] },
  { name: 'Pontage', lines: ['Fourniture de 64 pi² de contreplaqué ½ po pour réparation du pontage au besoin', "Fourniture et installation d'un contreplaqué ½ po standard en épinette sur la totalité de la toiture", "Fourniture et installation d'un panneau OSB 15/32 (Super Roof) avec H-clips"] },
  { name: 'Solins de toiture', lines: ["Fourniture et installation de solins d'aluminium 3 po de couleur agencée", "Fourniture et installation de solins d'acier 3 po de couleur agencée", 'Conserver les solins existants'] },
  { name: 'Membrane et sous-couche', lines: ['Membrane pare-glace Stormguard de GAF aux abords périphériques (6 pi)', 'Sous-couche synthétique Feltbuster de GAF à la grandeur', 'Membrane autocollante dans les noues sur 36 po (Stormguard de GAF)', 'Membrane autocollante à la grandeur'] },
  { name: 'Mode de fixation', lines: ['Système fixé mécaniquement', 'Système thermosoudé'] },
  { name: "Ventilation de l'entretoit", lines: ['Ventilateur de faîte Cobra Snowcountry', 'Ventilateurs statiques Maximum (2)', 'Évaluation de la ventilation existante'] },
  { name: "Sorties d'évent", lines: ["Solin d'évent en aluminium de type Évent 2000", 'Remplacement des chapeaux de sortie de sécheuse'] },
  { name: "Bardeaux d'asphalte", lines: ["Bardeau d'asphalte GAF Timberline HDZ (armature en fibre de verre)", "Bardeau d'asphalte IKO Dynasty", 'Pose de faîtières (chapeau) Seal-A-Ridge de GAF', 'Bande de départ Pro-Start de GAF'] },
  { name: 'Inclus généraux', lines: ['Gestion de projet', 'Quincaillerie', 'Manutention matériaux et outillage', 'Passer le balai magnétique pendant et à la fin des travaux', 'Disposer des déchets et garder les lieux propres quotidiennement', 'Expertise de la toiture lors des travaux', 'Nettoyage des gouttières à la fin des travaux', 'Scellant Flextra de couleur agencée à chaque sortie de toit'] },
  { name: 'Exclusions', lines: ['Travaux de ventilation', 'Travaux de menuiserie', "Travaux d'isolation", 'Permis de construction', 'Plans de construction', 'Travaux électriques', 'Déneigement, déglaçage et travaux hivernaux'] },
]

export const DEFAULT_SCOPE = new Set<string>([
  'Ancrages et harnais de sécurité conformes aux normes de la SST',
  "Montage et démontage d'échafaudage au besoin selon les normes de la SST",
  'Service de nacelle inclus',
  "Fourniture d'un conteneur pour disposer des rebuts",
  "Installation de toiles pour protéger l'aménagement paysager et le bâtiment",
  "Installation de madriers sous le conteneur de façon à protéger l'entrée",
  "Installation d'un périmètre de sécurité au besoin",
  "Démantèlement de la toiture existante (bardeaux) jusqu'au pontage de bois (une couche)",
  'Fourniture de 64 pi² de contreplaqué ½ po pour réparation du pontage au besoin',
  "Fourniture et installation de solins d'aluminium 3 po de couleur agencée",
  'Membrane pare-glace Stormguard de GAF aux abords périphériques (6 pi)',
  'Sous-couche synthétique Feltbuster de GAF à la grandeur',
  'Membrane autocollante dans les noues sur 36 po (Stormguard de GAF)',
  'Système fixé mécaniquement',
  'Ventilateur de faîte Cobra Snowcountry',
  "Solin d'évent en aluminium de type Évent 2000",
  "Bardeau d'asphalte GAF Timberline HDZ (armature en fibre de verre)",
  'Pose de faîtières (chapeau) Seal-A-Ridge de GAF',
  'Bande de départ Pro-Start de GAF',
  'Gestion de projet',
  'Quincaillerie',
  'Manutention matériaux et outillage',
  'Passer le balai magnétique pendant et à la fin des travaux',
  'Disposer des déchets et garder les lieux propres quotidiennement',
  'Expertise de la toiture lors des travaux',
  'Nettoyage des gouttières à la fin des travaux',
  'Scellant Flextra de couleur agencée à chaque sortie de toit',
  'Travaux de ventilation',
  'Travaux de menuiserie',
  "Travaux d'isolation",
  'Permis de construction',
  'Plans de construction',
  'Travaux électriques',
  'Déneigement, déglaçage et travaux hivernaux',
])

export interface MaterialLine {
  cat: string
  item: string
  qty: number
  unit: string
  cost: number
  sell: number
}

export const MATERIAL_LINES: MaterialLine[] = [
  { cat: 'Bardeaux', item: 'Timberline HDZ GAF (paquet 33,3 pi²)', qty: 66, unit: 'paq.', cost: 48, sell: 62 },
  { cat: 'Bardeaux', item: 'Chapeau Seal-A-Ridge GAF', qty: 4, unit: 'paq.', cost: 63, sell: 82 },
  { cat: 'Bardeaux', item: 'Départ Pro-Start GAF', qty: 3, unit: 'paq.', cost: 55, sell: 71 },
  { cat: 'Membrane', item: 'Stormguard GAF 3 × 65', qty: 6, unit: 'rlx', cost: 110, sell: 139 },
  { cat: 'Sous-couche', item: 'Feltbuster GAF 10 carrés', qty: 3, unit: 'rlx', cost: 162, sell: 205 },
  { cat: 'Ventilation', item: 'Cobra Snowcountry 4 pi', qty: 6, unit: 'unité', cost: 38, sell: 52 },
  { cat: 'Pontage', item: 'Contreplaqué ½ po (réserve 64 pi²)', qty: 2, unit: 'feuille', cost: 42, sell: 58 },
  { cat: 'Clous et scellant', item: 'Clou toiture 1¼ po', qty: 4, unit: 'boîte', cost: 45, sell: 58 },
  { cat: 'Clous et scellant', item: 'Flextra noir', qty: 3, unit: 'tube', cost: 10, sell: 14 },
  { cat: 'Conteneur', item: 'Conteneur 18 vg', qty: 1, unit: 'unité', cost: 500, sell: 575 },
  { cat: "Main-d'œuvre", item: "Main-d'œuvre couvreurs (CCQ)", qty: 64, unit: 'h', cost: 72, sell: 105 },
  { cat: "Frais d'entreprise", item: 'Frais fixes par jour', qty: 2, unit: 'jour', cost: 800, sell: 800 },
  { cat: 'Livraison', item: 'Camion · livraison sur toit', qty: 1, unit: 'unité', cost: 75, sell: 95 },
]
