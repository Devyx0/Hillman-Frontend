import { authEn } from './auth'
import { createEn } from './create'
import { quoteFlowEn } from './quoteFlow'
import { portalFlowEn } from './portalFlow'
import { calendarEn } from './calendar'
import { settingsEn } from './settings'
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

/** Strings used by shared foundation files (store, states, settings data). */
const foundation: Record<string, string> = {
  'Chargement…': 'Loading…',
  'Impossible de charger les données': "Couldn't load the data",
  'Vérifiez votre connexion et réessayez.': 'Check your connection and try again.',
  Réessayer: 'Try again',
  'Accès non autorisé': 'No access',
  "Votre rôle ne donne pas accès à cette section. Demandez l'accès à un administrateur.": "Your role doesn't give access to this section. Ask an administrator for access.",
  Annuler: 'Cancel',
  Confirmer: 'Confirm',
  'Janvier 2027': 'January 2027',
  'Courriel ou mot de passe incorrect.': 'Incorrect email or password.',
  "Ce compte n'est pas encore activé. Utilisez le lien reçu par courriel.": "This account isn't activated yet. Use the link you received by email.",
  'Ce compte est désactivé. Contactez un administrateur.': 'This account is deactivated. Contact an administrator.',
}

/** All English translations, keyed by the French source string. */
export const en: Record<string, string> = { ...shell, ...sales, ...quoteBuilder, ...clients, ...agenda, ...authEn, ...createEn, ...quoteFlowEn, ...portalFlowEn, ...calendarEn, ...settingsEn, ...foundation, ...shared }
