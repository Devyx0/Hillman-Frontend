/**
 * Roles and permissions. The permission table is editable in Settings → Users; screens check it
 * with `can(permission)` from `useAuth()`.
 */
import { commit } from '../data/store'
import type { CompanyId } from '../data/mock'

export type Role = 'admin' | 'coordinator' | 'rep' | 'crew'

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrateur',
  coordinator: 'Coordonnatrice',
  rep: 'Représentant',
  crew: 'Équipe terrain',
}

export type Permission =
  | 'quotes.viewAll' // see every rep's quotes (otherwise only one's own)
  | 'quotes.edit'
  | 'quotes.costs' // see costs, margin and profit (Coûtants, Profit réel, margin columns)
  | 'quotes.status' // change status by hand (accepted / refused / paid)
  | 'quotes.delete'
  | 'payments.record'
  | 'leads.assign'
  | 'clients.export'
  | 'calendar.allReps' // see and book in every rep's calendar
  | 'crews.schedule'
  | 'catalogue.edit'
  | 'settings.manage' // companies, connections, follow-ups, statuses, numbering
  | 'users.manage'
  | 'groupView' // Groupe Hillman view of all three companies

export const PERMISSION_LABELS: Record<Permission, string> = {
  'quotes.viewAll': 'Voir les soumissions de tous les représentants',
  'quotes.edit': 'Créer et modifier des soumissions',
  'quotes.costs': 'Voir les coûtants, la marge et le profit',
  'quotes.status': 'Changer le statut (accepté, refusé, payé)',
  'quotes.delete': 'Supprimer des soumissions',
  'payments.record': 'Enregistrer des paiements',
  'leads.assign': 'Assigner les leads',
  'clients.export': 'Exporter les clients',
  'calendar.allReps': "Voir et réserver l'agenda de tous",
  'crews.schedule': 'Planifier les équipes',
  'catalogue.edit': 'Modifier le catalogue',
  'settings.manage': 'Gérer les paramètres des compagnies',
  'users.manage': 'Gérer les utilisateurs',
  groupView: 'Vue Groupe Hillman (3 compagnies)',
}

/** Default permission table (editable by an admin). */
export const ROLE_PERMISSIONS: Record<Role, Set<Permission>> = {
  admin: new Set(Object.keys(PERMISSION_LABELS) as Permission[]),
  coordinator: new Set<Permission>(['quotes.viewAll', 'quotes.edit', 'quotes.status', 'payments.record', 'leads.assign', 'clients.export', 'calendar.allReps', 'crews.schedule', 'groupView']),
  rep: new Set<Permission>(['quotes.edit', 'quotes.status']),
  // Field crew: no permission at all. Their view (/equipe) is driven by the role and `crewId`,
  // never shows prices, costs or settings, and every permission stays locked off.
  crew: new Set<Permission>(),
}

/** Permissions that can't be turned on for a role (the field crew never sees prices, costs or settings). */
export const LOCKED_OFF: Partial<Record<Role, Set<Permission>>> = {
  crew: new Set(Object.keys(PERMISSION_LABELS) as Permission[]),
}

/** True when the permission table cell can't be changed (admin: always on; crew: always off). */
export const isPermissionLocked = (role: Role, p: Permission) => role === 'admin' || !!LOCKED_OFF[role]?.has(p)

export function setRolePermission(role: Role, p: Permission, on: boolean) {
  if (isPermissionLocked(role, p)) return // admins keep everything; crews never get price/settings access
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
  /** Field crew accounts (role `crew`): the crew they belong to (CREWS id in data/crews.ts). */
  crewId?: string
}

/** True for a field crew account (restricted, price-free view at /equipe). */
export const isCrewRole = (a?: Pick<Account, 'role'> | null) => a?.role === 'crew'

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
  // Field crews (no REPS entry): lead of Gouttières F1 and a member of Toitures — équipe A.
  { id: 'u9', repId: '', name: 'Mathieu Lessard', email: 'mathieu@signaturegouttieres.com', role: 'crew', companies: ['sg'], status: 'actif', crewId: 'f1', lastLogin: '2026-10-20 06:20' },
  { id: 'u10', repId: '', name: 'Kevin Bédard', email: 'kevin@toitureshillman.com', role: 'crew', companies: ['toit'], status: 'actif', crewId: 'ta' },
]

/** Mock-only shared password for the demo accounts. */
export const DEMO_PASSWORD = 'hillman2026'

export function saveAccount(a: Account) {
  const i = ACCOUNTS.findIndex((x) => x.id === a.id)
  if (i >= 0) ACCOUNTS[i] = a
  else ACCOUNTS.push(a)
  commit()
}
