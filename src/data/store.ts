/**
 * Client-side data store.
 *
 * The mock collections in `./mock.ts` (CLIENTS, QUOTES, LEADS, THREADS, APPOINTMENTS, JOBS) are
 * the single source of truth for the UI. This module is the ONLY place that mutates them: every
 * write goes through a function below, which bumps a version number so any component using
 * `useStore()` re-renders.
 *
 * When the backend exists, each mutator becomes an API call (see `request()` for the async/latency
 * shape the UI already handles) and the collections become a cache of server data.
 */
import { useSyncExternalStore } from 'react'
import {
  APPOINTMENTS,
  CLIENTS,
  LEADS,
  QUOTES,
  TODAY,
  type Appointment,
  type Client,
  type CompanyId,
  type Lead,
  type Quote,
} from './mock'
import { NUMBERING } from './settings'
import { API_MODE } from '../api/config'

// ── Subscription ────────────────────────────────────────────────────────────
let version = 0
const listeners = new Set<() => void>()

/** Notify subscribers after a mutation. */
export function commit() {
  version++
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Re-render the calling component whenever the store changes. Returns the store version. */
export function useStore() {
  return useSyncExternalStore(subscribe, () => version)
}

// ── Simulated network ───────────────────────────────────────────────────────
/**
 * Stand-in for a backend call: resolves after `ms`, or rejects when `fail` is true. Use it to
 * exercise loading and error states until the real API exists.
 */
export function request<T>(value: T | (() => T), { ms = 450, fail = false }: { ms?: number; fail?: boolean } = {}): Promise<T> {
  return new Promise((resolve, reject) =>
    window.setTimeout(() => {
      if (fail) reject(new Error('network'))
      else resolve(typeof value === 'function' ? (value as () => T)() : value)
    }, ms),
  )
}

const now = () => new Date().toISOString()

// ── Clients ─────────────────────────────────────────────────────────────────
const digits = (s?: string) => (s ?? '').replace(/\D/g, '')
const norm = (s?: string) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/**
 * Possible duplicates for a new client. One client can be served by all three companies, so a
 * new record must be checked against every company's clients. Matches on phone (either number),
 * email, or same last name + street number + street.
 */
export function findDuplicateClients(c: Partial<Pick<Client, 'first' | 'last' | 'phone' | 'mobile' | 'email' | 'no' | 'street'>>): Client[] {
  const phones = [digits(c.phone), digits(c.mobile)].filter((p) => p.length >= 7)
  const email = norm(c.email)
  return CLIENTS.filter((x) => {
    const xp = [digits(x.phone), digits(x.mobile)]
    if (phones.some((p) => xp.includes(p))) return true
    if (email && norm(x.email) === email) return true
    if (c.last && c.no && c.street && norm(x.last) === norm(c.last) && x.no === c.no && norm(x.street) === norm(c.street)) return true
    return false
  })
}

let clientSeq = 66800
export function addClient(input: Omit<Client, 'id' | 'tags' | 'lifetime' | 'quotes' | 'lastActivity' | 'since'> & Partial<Client>): Client {
  const client: Client = { tags: [], lifetime: 0, quotes: 0, lastActivity: TODAY, since: TODAY.slice(0, 4), ...input, language: input.language ?? 'fr', id: input.id ?? 'c' + clientSeq++ }
  CLIENTS.unshift(client)
  commit()
  return client
}

export function updateClient(id: string, patch: Partial<Client>) {
  const c = CLIENTS.find((x) => x.id === id)
  if (c) Object.assign(c, patch)
  commit()
}

// ── Leads ───────────────────────────────────────────────────────────────────
let leadSeq = 100
export function addLead(input: Omit<Lead, 'id' | 'received' | 'ago' | 'score' | 'aiSummary'> & Partial<Lead>): Lead {
  const lead: Lead = { received: `${TODAY} 08:00`, ago: "À l'instant", score: 0, aiSummary: '', ...input, id: input.id ?? 'l' + leadSeq++ }
  LEADS.unshift(lead)
  commit()
  return lead
}

export function updateLead(id: string, patch: Partial<Lead> & { quoteId?: string; clientId?: string }) {
  const l = LEADS.find((x) => x.id === id)
  if (l) Object.assign(l, patch)
  commit()
}

// ── Quotes ──────────────────────────────────────────────────────────────────
/** Quote lifecycle fields that the mock `Quote` type doesn't carry yet. */
export interface QuoteExtra {
  /** Why the client refused (set with status "Refusé"). */
  refusalReason?: string
  /** Automatic follow-up sequence paused on this quote. */
  followUpPaused?: boolean
  /** Why follow-ups stopped (signed, refused, client replied, STOP…). */
  followUpStopped?: string
  /** Online signature record. */
  signature?: { name: string; at: string; ip: string; device: 'portal' | 'tablet' }
  /** Payments received. */
  payments?: { id: string; date: string; amount: number; method: string; note?: string }[]
  /** Cancellation request under art. 58 LPC. */
  cancellation?: { at: string; reason?: string }
  /** Version of the same project (Rénovations: V1 / V2). */
  version?: number
  /** Quote this one was duplicated from. */
  parentId?: string
  /** Lead this quote was created from. */
  leadId?: string
  /** Template applied at creation. */
  templateId?: string
  /** Gutter model (5 or 6 inches). */
  gutterSize?: 5 | 6
  /** API mode: tax-included total computed by the server. */
  total?: number
  /** API mode: margin in % (admin and coordination only). */
  marginPct?: number | null
  /** API mode: short description of the work (« Travaux »). */
  workSummary?: string
  /** API mode: label of a version (e.g. "B"). */
  variantLabel?: string
}

export type QuoteRecord = Quote & QuoteExtra

export const quoteById = (id?: string) => QUOTES.find((q) => q.id === id) as QuoteRecord | undefined
export const quoteByNo = (no?: string) => QUOTES.find((q) => q.no === no) as QuoteRecord | undefined

/** Statuses that end the automatic follow-up sequence. */
export const FINAL_STATUSES = ['Signé', 'Refusé', 'Terminé', 'Payé']

/** Next quote number for a company, following the numbering settings. */
export function nextQuoteNo(company: CompanyId) {
  const cfg = NUMBERING[company]
  const used = new Set(QUOTES.map((q) => q.no))
  let n = Math.max(cfg.next, ...QUOTES.filter((q) => q.no.startsWith(cfg.prefix)).map((q) => (Number(q.no.slice(cfg.prefix.length)) || 0) + 1))
  while (used.has(`${cfg.prefix}${n}`)) n++
  cfg.next = n + 1
  return `${cfg.prefix}${n}`
}

export function addQuote(input: Pick<Quote, 'clientId' | 'company' | 'repId' | 'workType'> & Partial<QuoteRecord>): QuoteRecord {
  const no = input.no ?? nextQuoteNo(input.company)
  const client = CLIENTS.find((c) => c.id === input.clientId)
  const q: QuoteRecord = {
    id: 'q' + no.slice(1) + (QUOTES.some((x) => x.id === 'q' + no.slice(1)) ? '-' + Date.now() : ''),
    no,
    status: 'En cours',
    date: TODAY,
    amount: 0,
    cost: 0,
    source: client?.source ?? 'Autre',
    city: client?.city ?? '',
    views: 0,
    daysInStatus: 0,
    hot: false,
    nextActionDate: TODAY,
    version: 1,
    ...input,
  }
  QUOTES.unshift(q)
  if (client) {
    client.quotes++
    client.lastActivity = TODAY
  }
  commit()
  return q
}

export function updateQuote(id: string, patch: Partial<QuoteRecord>) {
  const q = quoteById(id)
  if (q) Object.assign(q, patch)
  commit()
}

/**
 * Change a quote's status. Final statuses stop the follow-up sequence; "Refusé" keeps the reason;
 * "Signé" by the office records who/when (an online signature uses `signQuote`).
 */
export function setQuoteStatus(id: string, status: string, opts: { reason?: string } = {}) {
  const q = quoteById(id)
  if (!q) return
  q.status = status
  q.daysInStatus = 0
  if (status === 'Refusé') q.refusalReason = opts.reason
  if (FINAL_STATUSES.includes(status)) {
    q.followUpStopped = status
    q.nextAction = undefined
  }
  commit()
}

/** Online signature from the client portal or the tablet. Sets the status to "Signé". */
export function signQuote(id: string, name: string, device: 'portal' | 'tablet') {
  const q = quoteById(id)
  if (!q) return
  q.signature = { name, at: now(), ip: device === 'tablet' ? '10.0.0.24' : '24.37.182.91', device }
  setQuoteStatus(id, 'Signé')
}

export function setFollowUpPaused(id: string, paused: boolean) {
  updateQuote(id, { followUpPaused: paused })
}

export function recordPayment(id: string, p: { date: string; amount: number; method: string; note?: string }) {
  const q = quoteById(id)
  if (!q) return
  q.payments = [...(q.payments ?? []), { id: 'p' + Date.now(), ...p }]
  const paid = q.payments.reduce((n, x) => n + x.amount, 0)
  // With the backend the status is the server's ("Payé" comes with invoicing): a payment noted here does not change it.
  if (!API_MODE && paid >= q.amount * 1.14975 - 1) setQuoteStatus(id, 'Payé')
  else commit()
}

/** Duplicate a quote as a new version (V2) of the same project. */
export function duplicateQuote(id: string): QuoteRecord | undefined {
  const src = quoteById(id)
  if (!src) return
  const versions = QUOTES.filter((q) => (q as QuoteRecord).parentId === id || q.id === id).length
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, no: _no, signature: _sig, payments: _pay, lastViewed: _lv, ...rest } = src
  return addQuote({ ...rest, status: 'En cours', views: 0, parentId: id, version: versions + 1 })
}

// ── Appointments ────────────────────────────────────────────────────────────
export function addAppointment(a: Omit<Appointment, 'id'>): Appointment {
  const appt = { ...a, id: 'n' + Date.now() }
  APPOINTMENTS.push(appt)
  commit()
  return appt
}

export function updateAppointment(id: string, patch: Partial<Appointment>) {
  const a = APPOINTMENTS.find((x) => x.id === id)
  if (a) Object.assign(a, patch)
  commit()
}

export function removeAppointment(id: string) {
  const i = APPOINTMENTS.findIndex((x) => x.id === id)
  if (i >= 0) APPOINTMENTS.splice(i, 1)
  commit()
}

// ── Quote list & pipeline (status changes at the office) ────────────────────
/** One manual status change, kept on the quote for its history. */
export interface StatusChange {
  status: string
  from: string
  at: string
  /** Account name of who made the change. */
  by?: string
  /** Refusal reason (status "Refusé"). */
  reason?: string
  comment?: string
  /** Payment date (status "Payé"). */
  paidAt?: string
  /** Where the change was made. */
  via?: 'liste' | 'pipeline' | 'soumission' | string
}

export type QuoteStatusRecord = QuoteRecord & {
  statusLog?: StatusChange[]
  /** Comment entered with the refusal reason. */
  refusalComment?: string
  /** Date the quote was marked paid by hand. */
  paidAt?: string
  /** Accepted by the client outside the portal (phone, in person), recorded at the office. */
  officeAcceptance?: { at: string; by?: string; comment?: string }
}

/**
 * Status change made by a user (list, pipeline, builder header). Wraps `setQuoteStatus` and keeps
 * the details: refusal reason + comment, payment date, acceptance by phone, history entry.
 * Leaving a final status (e.g. "Signé" back to "En soumission") pauses follow-ups instead of
 * silently restarting them.
 */
export function changeQuoteStatus(
  id: string,
  status: string,
  d: { reason?: string; comment?: string; paidAt?: string; by?: string; via?: StatusChange['via'] } = {},
) {
  const q = quoteById(id) as QuoteStatusRecord | undefined
  if (!q || q.status === status) return
  const from = q.status
  const wasFinal = FINAL_STATUSES.includes(from)
  setQuoteStatus(id, status, { reason: d.reason })
  if (status === 'Refusé') q.refusalComment = d.comment || undefined
  if (status === 'Payé') q.paidAt = d.paidAt ?? TODAY
  if (status === 'Signé' && !q.signature) q.officeAcceptance = { at: now(), by: d.by, comment: d.comment || undefined }
  if (wasFinal && !FINAL_STATUSES.includes(status)) {
    q.followUpStopped = undefined
    q.followUpPaused = true
  }
  q.statusLog = [...(q.statusLog ?? []), { status, from, at: now(), by: d.by, reason: d.reason, comment: d.comment || undefined, paidAt: status === 'Payé' ? q.paidAt : undefined, via: d.via }]
  commit()
}

/** Delete quotes (needs the `delete` permission; confirm first). */
export function removeQuotes(ids: string[]) {
  for (const id of ids) {
    const i = QUOTES.findIndex((q) => q.id === id)
    if (i < 0) continue
    const c = CLIENTS.find((x) => x.id === QUOTES[i].clientId)
    if (c) c.quotes = Math.max(0, c.quotes - 1)
    QUOTES.splice(i, 1)
  }
  commit()
}
