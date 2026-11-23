/**
 * Paramètres sections. Each section lives in `./settings/`; this file lists them (id, label, icon,
 * required permission) for the sub-navigation in `Catalogue.tsx`. Ids are stable: they are used in
 * `/catalogue?tab=parametres&section=<id>`.
 */
import { Building2, CalendarClock, CalendarSync, DatabaseZap, FileText, Hash, ListOrdered, Lock, ShieldCheck, Tags, UserCog, Workflow } from 'lucide-react'
import type { ComponentType } from 'react'
import type { Icon } from '../../components/ui'
import type { Account, Permission } from '../../auth/permissions'
import { CalendarConnectTab } from './CalendarConnectTab'
import { CompaniesTab } from './settings/CompaniesTab'
import { FollowUpsTab } from './settings/FollowUpsTab'
import { LeadSourcesTab } from './settings/LeadSourcesTab'
import { LogiciaTab } from './settings/LogiciaTab'
import { MessageTemplatesTab } from './settings/MessageTemplatesTab'
import { NumberingTab, PaymentSchedulesTab } from './settings/NumberingTab'
import { PrivacyTab } from './settings/PrivacyTab'
import { SecurityTab } from './settings/SecurityTab'
import { StatusesTab } from './settings/StatusesTab'
import { UsersTab } from './settings/UsersTab'

export type SettingsSectionId = 'compagnies' | 'utilisateurs' | 'agenda' | 'sources' | 'statuts' | 'numerotation' | 'suivis' | 'modeles' | 'paiements' | 'loi25' | 'logicia' | 'securite'

export interface SettingsSection {
  id: SettingsSectionId
  /** French label (translate on display). */
  label: string
  /** French one-line description. */
  hint: string
  icon: Icon
  component: ComponentType
  /** Who may open it. */
  allowed: (can: (p: Permission) => boolean, user: Account | null) => boolean
  group: 'Compte' | 'Ventes' | 'Opérations' | 'Conformité'
}

const manage = (can: (p: Permission) => boolean) => can('settings.manage')

export const SETTINGS_SECTIONS: SettingsSection[] = [
  { id: 'compagnies', label: 'Compagnies', hint: 'Identité, PDF, taxes et connexions (texto, courriel)', icon: Building2, component: CompaniesTab, allowed: manage, group: 'Compte' },
  { id: 'utilisateurs', label: 'Utilisateurs & permissions', hint: 'Invitations, rôles, compagnies et permissions', icon: UserCog, component: UsersTab, allowed: (can) => can('users.manage'), group: 'Compte' },
  { id: 'agenda', label: 'Agendas connectés', hint: 'Google Agenda et Outlook', icon: CalendarSync, component: CalendarConnectTab, allowed: () => true, group: 'Opérations' },
  { id: 'sources', label: 'Sources de leads', hint: 'Liste des sources et réception des leads', icon: Tags, component: LeadSourcesTab, allowed: manage, group: 'Ventes' },
  { id: 'statuts', label: 'Statuts', hint: 'Statuts de soumission et raisons de refus', icon: ListOrdered, component: StatusesTab, allowed: manage, group: 'Ventes' },
  { id: 'numerotation', label: 'Numérotation', hint: 'Préfixe et prochain numéro de soumission', icon: Hash, component: NumberingTab, allowed: manage, group: 'Ventes' },
  { id: 'suivis', label: 'Suivis automatiques', hint: 'Relances par courriel et texto, désabonnements', icon: Workflow, component: FollowUpsTab, allowed: manage, group: 'Ventes' },
  { id: 'modeles', label: 'Modèles de messages', hint: 'Textos et courriels avec champs de fusion', icon: FileText, component: MessageTemplatesTab, allowed: manage, group: 'Ventes' },
  { id: 'paiements', label: 'Calendriers de paiement', hint: 'Étapes de paiement par compagnie', icon: CalendarClock, component: PaymentSchedulesTab, allowed: manage, group: 'Ventes' },
  { id: 'loi25', label: 'Loi 25', hint: 'Responsable, consentements et demandes', icon: ShieldCheck, component: PrivacyTab, allowed: manage, group: 'Conformité' },
  { id: 'logicia', label: 'Import Logicia', hint: "État de l'import des données", icon: DatabaseZap, component: LogiciaTab, allowed: manage, group: 'Conformité' },
  { id: 'securite', label: 'Sécurité et journal', hint: 'Journal des modifications', icon: Lock, component: SecurityTab, allowed: (can) => can('audit.view'), group: 'Conformité' },
]

export const SETTINGS_GROUPS = ['Compte', 'Ventes', 'Opérations', 'Conformité'] as const

export { CompaniesTab, FollowUpsTab, LeadSourcesTab, LogiciaTab, MessageTemplatesTab, NumberingTab, PaymentSchedulesTab, PrivacyTab, SecurityTab, StatusesTab, UsersTab }
