/**
 * Roles and permissions. The permission table is editable in Settings → Users; screens check it
 * with `can(permission)` from `useAuth()`.
 */
import { commit } from '../data/store'
import type { CompanyId } from '../data/mock'

export type Role = 'admin' | 'coordinator' | 'rep'

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrateur',
  coordinator: 'Coordonnatrice',
  rep: 'Représentant',
}

/**
 * One permission per line of the access table (v1). Without a `*.viewAll` permission a user only
 * sees their own records (see `useAccess()` in `./access.ts`): quotes and leads assigned to them,
 * their appointments, their threads, the work days of their quotes, and the clients they work with.
 */
export type Permission =
  | 'quotes.viewAll' // every rep's quotes (otherwise only one's own)
  | 'quotes.edit' // create and edit quotes (info, scope, price, sending)
  | 'quotes.costs' // Coûtants tab, margin panel, margin columns and cost lines
  | 'quotes.profit' // Profit réel (actual profit once the work is done)
  | 'quotes.status' // change status by hand (accepted / refused / paid)
  | 'payments.record'
  | 'leads.viewAll' // every rep's leads (otherwise only those assigned to them)
  | 'leads.assign'
  | 'clients.viewAll' // every client (otherwise only those with one of their quotes or leads)
  | 'clients.export'
  | 'conversations.viewAll' // every thread (otherwise only those assigned to them)
  | 'calendar.allReps' // see and book visits in every rep's calendar
  | 'calendar.moveOthers' // move or cancel other reps' appointments
  | 'jobs.schedule' // add and edit work days (jours de travaux)
  | 'catalogue.view' // open the catalogue (read-only without catalogue.edit)
  | 'catalogue.edit'
  | 'settings.manage' // companies, connections, follow-ups, statuses, numbering, sources
  | 'users.manage'
  | 'audit.view' // change log and security
  | 'delete' // every deletion (quotes, clients, notes, templates, catalogue lines…)
  | 'groupView' // Groupe Hillman view of all three companies

export const PERMISSION_LABELS: Record<Permission, string> = {
  'quotes.viewAll': 'Voir les soumissions de tous les représentants',
  'quotes.edit': 'Créer et modifier des soumissions',
  'quotes.costs': 'Voir les coûtants et la marge',
  'quotes.profit': 'Voir le profit réel',
  'quotes.status': 'Changer le statut (accepté, refusé, payé)',
  'payments.record': 'Enregistrer des paiements',
  'leads.viewAll': 'Voir les leads de tous les représentants',
  'leads.assign': 'Assigner les leads',
  'clients.viewAll': 'Voir tous les clients',
  'clients.export': 'Exporter les clients',
  'conversations.viewAll': 'Voir toutes les conversations',
  'calendar.allReps': "Voir et réserver l'agenda de tous",
  'calendar.moveOthers': 'Déplacer les rendez-vous des autres',
  'jobs.schedule': 'Planifier les travaux au calendrier',
  'catalogue.view': 'Consulter le catalogue',
  'catalogue.edit': 'Modifier le catalogue',
  'settings.manage': 'Gérer les paramètres des compagnies',
  'users.manage': 'Gérer les utilisateurs',
  'audit.view': 'Voir le journal des modifications et la sécurité',
  delete: 'Supprimer (soumissions, clients, notes, modèles…)',
  groupView: 'Vue Groupe Hillman (3 compagnies)',
}

/** Default permission table (editable by an admin in Settings → Users). */
export const ROLE_PERMISSIONS: Record<Role, Set<Permission>> = {
  admin: new Set(Object.keys(PERMISSION_LABELS) as Permission[]),
  coordinator: new Set<Permission>([
    'quotes.viewAll',
    'quotes.edit',
    'quotes.costs',
    'quotes.profit',
    'quotes.status',
    'payments.record',
    'leads.viewAll',
    'leads.assign',
    'clients.viewAll',
    'clients.export',
    'conversations.viewAll',
    'calendar.allReps',
    'calendar.moveOthers',
    'jobs.schedule',
    'catalogue.view',
    'catalogue.edit',
    'groupView',
  ]),
  rep: new Set<Permission>(['quotes.edit', 'quotes.costs', 'quotes.status', 'catalogue.view']),
}

/**
 * API mode: the backend decides what each role reads and writes (RLS), so the table follows it.
 * - Representatives never receive costs or margins (cost columns are not granted), and see every client of
 *   their companies (clients belong to a company, not to a rep).
 * - Deleting (clients, leads, quotes), the audit log and the group summary are admin only.
 */
export function applyApiPermissions() {
  ROLE_PERMISSIONS.rep.delete('quotes.costs')
  ROLE_PERMISSIONS.rep.delete('quotes.profit')
  ROLE_PERMISSIONS.rep.add('clients.viewAll')
  for (const p of ['delete', 'audit.view', 'users.manage'] as Permission[]) {
    ROLE_PERMISSIONS.coordinator.delete(p)
    ROLE_PERMISSIONS.rep.delete(p)
  }
}

/** True when the permission table cell can't be changed (admins always keep every permission). */
export const isPermissionLocked = (role: Role) => role === 'admin'

export function setRolePermission(role: Role, p: Permission, on: boolean) {
  if (isPermissionLocked(role)) return // admins keep everything
  if (on) ROLE_PERMISSIONS[role].add(p)
  else ROLE_PERMISSIONS[role].delete(p)
  commit()
}

export interface Account {
  id: string
  /** Matches a REPS id in mock.ts. */
  repId: string
  name: string
  email: string
  role: Role
  /** Companies this user works for. */
  companies: CompanyId[]
  status: 'actif' | 'invite' | 'desactive'
  lastLogin?: string
}

/**
 * Demo accounts. Sign in with any active email and the demo password from `DEMO_PASSWORD`
 * (mock only — the backend replaces this).
 */
export const ACCOUNTS: Account[] = [
  { id: 'u1', repId: 'jph', name: 'Jean-Pierre Hillman', email: 'jp@groupehillman.com', role: 'admin', companies: ['toit', 'sg', 'reno'], status: 'actif', lastLogin: '2026-10-20 07:31' },
  { id: 'u2', repId: 'hpe', name: 'Hélène Petitpas', email: 'helene@groupehillman.com', role: 'coordinator', companies: ['toit', 'sg', 'reno'], status: 'actif', lastLogin: '2026-10-20 07:58' },
  { id: 'u3', repId: 'plc', name: 'Pierre-Luc Cloutier', email: 'pierre-luc@signaturegouttieres.com', role: 'rep', companies: ['sg'], status: 'actif', lastLogin: '2026-10-19 18:12' },
  { id: 'u4', repId: 'dps', name: 'Dominic Plourde', email: 'dominic@signaturegouttieres.com', role: 'rep', companies: ['sg'], status: 'actif', lastLogin: '2026-10-20 06:45' },
  { id: 'u5', repId: 'ofo', name: 'Olivier Fontaine', email: 'olivier@signaturegouttieres.com', role: 'rep', companies: ['sg'], status: 'actif' },
  { id: 'u6', repId: 'pau', name: 'Philippe Audet', email: 'philippe@renovationshillman.com', role: 'rep', companies: ['reno'], status: 'actif' },
  { id: 'u7', repId: 'dpe', name: 'Dany Pelletier', email: 'dany@signaturegouttieres.com', role: 'rep', companies: ['sg'], status: 'actif' },
  { id: 'u8', repId: 'bto', name: 'Benoit Tondreau', email: 'benoit@signaturegouttieres.com', role: 'rep', companies: ['sg'], status: 'invite' },
]

/** Mock-only shared password for the demo accounts. */
export const DEMO_PASSWORD = 'hillman2026'

export function saveAccount(a: Account) {
  const i = ACCOUNTS.findIndex((x) => x.id === a.id)
  if (i >= 0) ACCOUNTS[i] = a
  else ACCOUNTS.push(a)
  commit()
}
