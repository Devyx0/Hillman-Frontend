import { Globe, Megaphone, MessageCircle, PhoneIncoming, Search, Bot, Users } from 'lucide-react'
import { createElement } from 'react'
import type { Icon } from '../components/ui'
import { LEADS, THREADS, type Lead, type Message, type Thread } from './mock'

/** Brand icon (lucide-react no longer ships brand icons). */
const FacebookIcon: Icon = ({ className }) =>
  createElement(
    'svg',
    { xmlns: 'http://www.w3.org/2000/svg', width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', className, 'aria-hidden': true },
    createElement('path', { d: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z' }),
  )

/** Extra leads shown only in the Leads module (mockup: `w3`). */
const EXTRA_LEADS: Lead[] = [
  { id: 'l8', name: 'Geneviève Morin', phone: '418 659-2210', email: 'gen.morin@outlook.com', city: 'Sillery', company: 'sg', channel: 'Google', received: '2026-10-18 14:12', ago: 'dim. 14 h 12', message: 'Mes gouttières débordent à chaque grosse pluie, coin arrière gauche.', aiSummary: 'Débordement localisé · descente probablement obstruée ou sous-dimensionnée · 3x4 à proposer.', score: 66, status: 'Qualifié par IA', repId: 'bto' },
  { id: 'l9', name: 'Habitations Mistral', phone: '418 878-4001', email: 'achats@mistral.ca', city: 'Saint-Augustin', company: 'sg', channel: 'Référence', received: '2026-10-17 10:30', ago: 'sam. 10 h 30', message: 'Projet de 14 maisons neuves, gouttières et soffites à soumissionner pour mars.', aiSummary: 'Entrepreneur · 14 unités neuves · ≈ 52 k$ · contrat récurrent possible.', score: 90, status: 'À contacter', repId: 'ofo' },
  { id: 'l10', name: 'Raymond Tremblay', phone: '418 524-8890', city: 'Limoilou', company: 'reno', channel: 'Salon expo habitat', received: '2026-10-16 19:05', ago: 'ven. 19 h 05', message: 'Rencontré au salon. Salle de bain complète au 2e étage.', aiSummary: 'Salle de bain complète · duplex · ≈ 28 k$ · contact chaud du salon.', score: 71, status: 'Nouveau', repId: 'pau' },
  { id: 'l11', name: 'Marie-Ève Fortin', phone: '418 841-3302', email: 'me.fortin@videotron.ca', city: 'Charlesbourg', company: 'toit', channel: 'Site web', received: '2026-10-20 06:31', ago: 'il y a 1 h', message: 'Nos bardeaux ont 22 ans et on voit des granules dans les gouttières. Soumission svp.', aiSummary: "Bardeaux en fin de vie · 2 étages · aucune infiltration · planifier au printemps ou avant l'hiver.", score: 78, status: 'Nouveau', repId: 'jph' },
  { id: 'l12', name: 'Denis Caron', phone: '581 702-4418', city: 'Beauport', company: 'toit', channel: 'Facebook', received: '2026-10-19 18:22', ago: 'hier 18 h 22', message: "Fuite autour de l'évent de plomberie, besoin d'une réparation rapide.", aiSummary: "Réparation ponctuelle · solin d'évent · petit mandat, rapide à céduler.", score: 69, status: 'Qualifié par IA', repId: 'jph' },
  { id: 'l13', name: 'Josée Lapointe', phone: '418 688-1290', email: 'josee.lapointe@gmail.com', city: 'Sillery', company: 'toit', channel: 'Google', received: '2026-10-19 09:05', ago: 'hier 9 h 05', message: 'Intéressée par un toit en métal pour remplacer nos bardeaux.', aiSummary: 'Conversion bardeaux → métal · ≈ 1 600 pi² · budget plus élevé, client informé.', score: 81, status: 'À contacter', repId: 'jph' },
  { id: 'l14', name: 'Patrick Bélanger', phone: '418 931-5520', city: 'Lebourgneuf', company: 'toit', channel: 'Référence', received: '2026-10-18 11:40', ago: 'dim. 11 h 40', message: 'Référé par mon voisin (M. Simard). Toit en pente à refaire.', aiSummary: "Référence d'un client 2026 · toit en pente · même rue que le chantier H64026.", score: 85, status: 'RDV réservé', booked: 'Jeu. 22 oct. · 9 h 00', repId: 'jph' },
]

/** All leads (mockup: `Md`). */
export const ALL_LEADS: Lead[] = [...LEADS, ...EXTRA_LEADS]

interface LeadProfile {
  address: string
  work: string
  urgency: string
  budget: string
  timeline: string
  property: string
  tags: string[]
  type: string
}

/** Qualification details per lead (mockup: `Ro`). */
export const LEAD_PROFILES: Record<string, LeadProfile> = {
  l1: { address: '38, chemin du Godendard, Lac-Beauport G3B 0K4', work: 'Réfection toiture · bardeaux', urgency: 'Élevée · infiltration active', budget: '15 – 20 k$', timeline: 'Dès que possible', property: "Maison 1998 · bardeaux d'origine · ≈ 1 900 pi²", tags: ['Infiltration', 'Urgence'], type: 'Résidentiel' },
  l2: { address: '1142, avenue Royale, Beauport G1E 1X5', work: 'Gouttières 5 po + protège-gouttières', urgency: "Moyenne · avant l'hiver", budget: '2 – 3 k$', timeline: 'Novembre', property: 'Bungalow · arbres matures', tags: ['Lead web', 'Protège-gouttières'], type: 'Résidentiel' },
  l3: { address: '2400, rue des Jardins, Sainte-Foy G1W 4V2', work: 'Toits plats · élastomère × 3', urgency: 'Planifiée · printemps 2027', budget: '90 – 140 k$', timeline: 'Mai 2027 · budget voté', property: '3 bâtiments · 36 unités · toits plats', tags: ['Commercial', "Conseil d'administration"], type: 'Commercial' },
  l4: { address: '890, rue du Golf, Cap-Rouge G1Y 2R3', work: 'Nettoyage de gouttières', urgency: "Moyenne · avant l'hiver", budget: '250 – 400 $', timeline: 'Avant le 15 novembre', property: '2 étages · gouttières Signature 2021', tags: ['Client existant', 'Nettoyage annuel'], type: 'Résidentiel' },
  l5: { address: '41, rue Saint-Omer, Lévis G6V 3Z1', work: 'Agrandissement 12 × 16', urgency: 'Basse · printemps 2027', budget: '≈ 85 k$', timeline: 'Printemps 2027 · plans à faire', property: 'Cottage 2005', tags: ['Agrandissement'], type: 'Résidentiel' },
  l6: { address: '17, chemin des Trembles, Stoneham G3C 0S8', work: 'Soffite / fascia', urgency: 'Moyenne', budget: '3 – 5 k$', timeline: 'Cet automne', property: 'Maison 2003', tags: ['Référence'], type: 'Résidentiel' },
  l7: { address: 'Limoilou (adresse à confirmer)', work: 'Bardeaux (à préciser)', urgency: 'Inconnue', budget: 'Inconnu', timeline: 'Inconnu', property: 'Locataire? À valider', tags: ['À valider'], type: 'Résidentiel' },
  l8: { address: '1880, chemin Saint-Louis, Sillery G1T 1P4', work: 'Descente 3x4 · réparation', urgency: 'Moyenne', budget: '400 – 900 $', timeline: 'Ce mois-ci', property: 'Maison de ville', tags: ['Réparation'], type: 'Résidentiel' },
  l9: { address: "300, rue de l'Hétrière, Saint-Augustin G3A 0G2", work: 'Gouttières + soffites · 14 unités', urgency: 'Planifiée · mars', budget: '≈ 52 k$', timeline: 'Mars 2027', property: 'Projet résidentiel neuf · 14 unités', tags: ['Entrepreneur', 'Récurrent'], type: 'Entrepreneur' },
  l10: { address: '512, 4e Avenue, Limoilou G1J 3A2', work: 'Salle de bain complète', urgency: 'Moyenne', budget: '≈ 28 k$', timeline: 'Janvier 2027', property: 'Duplex · 2e étage', tags: ['Salon expo habitat'], type: 'Résidentiel' },
  l11: { address: '765, rue des Trembles, Charlesbourg G1G 2K9', work: 'Toit en pente · bardeaux', urgency: 'Moyenne', budget: '14 – 18 k$', timeline: 'Printemps 2027', property: 'Maison 2004 · 2 étages', tags: ['Lead web'], type: 'Résidentiel' },
  l12: { address: '3320, avenue Royale, Beauport G1E 1V2', work: "Réparation · solin d'évent", urgency: 'Élevée · fuite', budget: '400 – 800 $', timeline: 'Cette semaine', property: 'Bungalow', tags: ['Réparation'], type: 'Résidentiel' },
  l13: { address: '1501, avenue Maguire, Sillery G1T 1Z9', work: 'Toit en métal', urgency: 'Basse', budget: '28 – 35 k$', timeline: 'Été 2027', property: 'Maison 1985 · ≈ 1 600 pi²', tags: ['Métal'], type: 'Résidentiel' },
  l14: { address: '10992, rue Roland, Neufchâtel G2A 1Z1', work: 'Toit en pente · bardeaux', urgency: 'Moyenne', budget: '12 – 16 k$', timeline: "Avant l'hiver", property: 'Bungalow 1979', tags: ['Référence'], type: 'Résidentiel' },
}

/** Lead funnel stages (mockup: `Ed`). */
export const LEAD_STAGES = ['Nouveau', 'Contacté', 'Qualifié', 'RDV réservé', 'Soumission']

/** Stage index of a lead, -1 when disqualified (mockup: `Ui`). */
export function leadStage(lead: Lead): number {
  switch (lead.status) {
    case 'Nouveau':
      return 0
    case 'À contacter':
      return 1
    case 'Qualifié par IA':
      return 2
    case 'RDV réservé':
      return 3
    default:
      return -1
  }
}

export type LeadBucket = 'new' | 'qualified' | 'booked' | 'lost'

/** Mockup: `bx`. */
export const leadBucket = (lead: Lead): LeadBucket => {
  const s = leadStage(lead)
  return s < 0 ? 'lost' : s === 3 ? 'booked' : s === 2 ? 'qualified' : 'new'
}

const CHANNEL_STYLES: Record<string, { icon: Icon; tone: string }> = {
  'Site web': { icon: Globe, tone: 'bg-data-2 text-data-2-ink' },
  Facebook: { icon: FacebookIcon, tone: 'bg-data-10 text-data-10-ink' },
  Google: { icon: Search, tone: 'bg-data-1 text-data-1-ink' },
  'Appel entrant': { icon: PhoneIncoming, tone: 'bg-data-3 text-data-3-ink' },
  'Agent IA': { icon: Bot, tone: 'bg-ink text-white' },
  Référence: { icon: Users, tone: 'bg-data-7 text-data-7-ink' },
  'Salon expo habitat': { icon: Megaphone, tone: 'bg-data-9 text-data-9-ink' },
}

/** Icon + colour of a lead source (mockup: `L0`). */
export const channelStyle = (channel: string) => CHANNEL_STYLES[channel] ?? { icon: MessageCircle, tone: 'bg-sand text-ink-mute' }

const LEAD_THREAD: Record<string, string> = { l1: 't2', l2: 't3', l4: 't5' }

/** Conversation for a lead: the real thread if one exists, otherwise a synthesised one (mockup: `k3`). */
export function threadForLead(lead: Lead): Thread {
  const existing = LEAD_THREAD[lead.id] && THREADS.find((t) => t.id === LEAD_THREAD[lead.id])
  if (existing) return existing
  const first = lead.name.split(' ')[0]
  const at = lead.received.slice(11).replace(':', ' h ')
  const messages: Message[] = [
    {
      id: lead.id + 'a',
      dir: 'in',
      channel: 'note',
      at: `${lead.ago}`,
      text: lead.channel === 'Appel entrant' ? `Appel entrant transcrit : « ${lead.message} »` : `« ${lead.message} »`,
      meta: lead.channel === 'Site web' ? 'Formulaire du site web' : lead.channel === 'Appel entrant' ? 'Appel entrant · 4 min 12 s' : lead.channel,
    },
  ]
  if (lead.status !== 'Non qualifié')
    messages.push({ id: lead.id + 'b', dir: 'out', channel: 'ai', at, by: 'Agent IA Hillman', text: `Bonjour ${first}, merci pour votre demande! Un estimateur peut passer voir les travaux sans frais. Préférez-vous un rendez-vous en semaine ou le samedi matin?` })
  if (lead.status === 'Qualifié par IA' || lead.status === 'À contacter') messages.push({ id: lead.id + 'c', dir: 'in', channel: 'sms', at, text: 'En semaine, idéalement en après-midi. Merci!' })
  if (lead.status === 'Non qualifié')
    messages.push({ id: lead.id + 'd', dir: 'out', channel: 'ai', at, by: 'Agent IA Hillman', text: `Bonjour ${first}! Êtes-vous propriétaire de l'immeuble? Nos estimations se font avec le propriétaire.` })
  return { id: 'lt-' + lead.id, name: lead.name, company: lead.company, channel: 'sms', unread: 0, last: messages[messages.length - 1].text, at, assigned: lead.repId ?? 'jph', aiHandled: true, messages }
}
