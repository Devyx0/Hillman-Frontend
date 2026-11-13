import { agenda } from './agenda'
import { clients } from './clients'
import { quoteBuilder } from './quoteBuilder'
import { sales } from './sales'
import { shell } from './shell'

/**
 * Keys that more than one dictionary defines with different wording. These
 * win, so the same French word reads the same everywhere. Entries of the form
 * `"<context>::<french>"` are looked up by `tx(context, french)` for strings
 * whose English depends on where they appear.
 */
const shared: Record<string, string> = {
  'Rendez-vous': 'Appointment',
  'J+2': 'Day 2',
  'J+6': 'Day 6',
  'Agent IA Hillman': 'Hillman AI agent',
  'Lun.': 'Mon.',
  'Revoir le client': 'Client follow-up visit',
  Signature: 'Signature',
  'Pare-feuilles 5300 zip': '5300 zip leaf guard',
  'Soumissions ouvertes': 'Open quotes',
  Travaux: 'Work',
  Représentant: 'Rep',
  Fiche: 'Record',
  'Courriels envoyés': 'Sent emails',
  'Équipement roulant': 'Truck signage',

  // Context-specific wording (see `tx`)
  'today::Soumissions ouvertes': 'Opened quotes',
  'plural::Rendez-vous': 'Appointments',
}

/** All English translations, keyed by the French source string. */
export const en: Record<string, string> = { ...shell, ...sales, ...quoteBuilder, ...clients, ...agenda, ...shared }
