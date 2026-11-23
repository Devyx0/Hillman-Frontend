/**
 * Record-level access ("their own"). Screens never check roles: they ask `useAccess()` whether the
 * signed-in user may see or act on a record, and the answer comes from the permission table
 * (`ROLE_PERMISSIONS`, editable in Settings → Users) plus record ownership.
 *
 * A user's own records:
 * - quotes and leads assigned to them (`repId`), or leads they created;
 * - appointments in their calendar; threads assigned to them;
 * - work days (jobs) of their own quotes;
 * - clients with at least one of their quotes or leads, or that they created.
 * Everything is also limited to the companies the user works for.
 */
import { useMemo } from 'react'
import { useAuth } from './AuthContext'
import type { Permission } from './permissions'
import { CLIENTS, LEADS, QUOTES, type Appointment, type Client, type CompanyId, type Lead, type Quote, type Thread } from '../data/mock'
import { useStore } from '../data/store'
import { DEFAULT_LEAD_REP } from '../data/leads'

/** Rep in charge of a lead (unassigned leads fall to the company's default rep, as shown on screen). */
export const leadRepId = (l: Pick<Lead, 'repId' | 'company'>) => l.repId ?? DEFAULT_LEAD_REP[l.company]

/** Clients a rep works with: one of their quotes or leads, or created by them. */
export function ownClientIds(repId: string): Set<string> {
  const ids = new Set<string>()
  for (const q of QUOTES) if (q.repId === repId) ids.add(q.clientId)
  for (const l of LEADS as (Lead & { clientId?: string })[]) if (l.clientId && (leadRepId(l) === repId || l.createdBy === repId)) ids.add(l.clientId)
  for (const c of CLIENTS) if (c.createdBy === repId) ids.add(c.id)
  return ids
}

export interface Access {
  can: (p: Permission) => boolean
  /** The user's rep id ('' when signed out). */
  repId: string
  /** The user works for this company. */
  company: (c: string) => boolean
  quote: (q: Pick<Quote, 'repId' | 'company'>) => boolean
  lead: (l: Pick<Lead, 'repId' | 'company' | 'createdBy'>) => boolean
  client: (c: Pick<Client, 'id'>) => boolean
  thread: (t: Pick<Thread, 'assigned' | 'company'>) => boolean
  /** Appointment shows in the user's calendar. */
  appointment: (a: Pick<Appointment, 'repId'>) => boolean
  /** May move / edit / cancel the appointment. */
  moveAppointment: (a: Pick<Appointment, 'repId'>) => boolean
  /** May book in this rep's calendar. */
  bookFor: (repId: string) => boolean
  /** Work day (job) of a quote number the user may see. */
  job: (j: { quoteNo: string; company: string }) => boolean
  /** May delete anything (quotes, clients, notes, templates, catalogue lines…). */
  canDelete: boolean
  /** "All" lists vs "Vos …" lists, for wording. */
  seesAll: { quotes: boolean; leads: boolean; clients: boolean; conversations: boolean; calendar: boolean }
}

/** Access checks for the signed-in user. Re-computes when the store changes. */
export function useAccess(): Access {
  const { user, can } = useAuth()
  const version = useStore()
  const repId = user?.repId ?? ''
  const companies = user?.companies
  const allClients = can('clients.viewAll')
  const ownClients = useMemo(() => (allClients || !repId ? new Set<string>() : ownClientIds(repId)), [allClients, repId, version]) // eslint-disable-line react-hooks/exhaustive-deps

  const company = (c: string) => !companies || companies.includes(c as CompanyId)
  const quotesAll = can('quotes.viewAll')
  const quote = (q: Pick<Quote, 'repId' | 'company'>) => company(q.company) && (quotesAll || q.repId === repId)
  const quoteByNumber = (no: string) => QUOTES.find((q) => q.no === no)
  return {
    can,
    repId,
    company,
    quote,
    lead: (l) => company(l.company) && (can('leads.viewAll') || leadRepId(l) === repId || (!!l.createdBy && l.createdBy === repId)),
    client: (c) => allClients || ownClients.has(c.id),
    thread: (t) => company(t.company) && (can('conversations.viewAll') || t.assigned === repId),
    appointment: (a) => can('calendar.allReps') || a.repId === repId,
    moveAppointment: (a) => a.repId === repId || can('calendar.moveOthers'),
    bookFor: (r) => r === repId || can('calendar.allReps'),
    job: (j) => {
      if (!company(j.company)) return false
      if (can('jobs.schedule') || quotesAll) return true
      const q = quoteByNumber(j.quoteNo)
      return !!q && q.repId === repId
    },
    canDelete: can('delete'),
    seesAll: { quotes: quotesAll, leads: can('leads.viewAll'), clients: allClients, conversations: can('conversations.viewAll'), calendar: can('calendar.allReps') },
  }
}
