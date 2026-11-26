/**
 * API mode writes: each function calls the backend, then updates the cached collections (so every screen
 * re-renders) and returns the UI-shaped record. They reject with an ApiError (French message, see
 * `errorMessage`). In mock mode the screens keep using the synchronous mutators of `./store`.
 */
import * as api from '../api/endpoints'
import { ApiError } from '../api/http'
import { STATUS_API, clientTypeApi, manualStatusApi, refusalApi, stageApi } from '../api/mappers'
import type { ApiQuote, ClientFields, DuplicateMatch, UpdateLeadBody, UpdateQuoteBody } from '../api/types'
import { REF, cacheClient, cacheLead, cacheQuote, companyUuid, refreshClient, roleIn, sourceByName, uncache, workTypeByName } from './api-sync'
import { formatPhone } from '../api/mappers'
import { CLIENTS, ME, QUOTES, REPS, type Client, type CompanyId, type Lead } from './mock'
import { commit, quoteById, type QuoteRecord } from './store'

const nz = (s: string | undefined | null) => {
  const v = (s ?? '').trim()
  return v ? v : null
}

// ── Clients ──────────────────────────────────────────────────────────────────
export interface ClientInput {
  first: string
  last: string
  /** Organisation (commercial / contractor). */
  company?: string
  phone?: string
  mobile?: string
  email?: string
  no?: string
  street?: string
  city?: string
  postal?: string
  /** French type: Résidentiel, Commercial, Entrepreneur. */
  type?: string
  /** No API yet: kept on the cached record only. */
  language?: 'fr' | 'en'
  source?: string
}

function clientFields(c: Partial<ClientInput>): ClientFields {
  const f: ClientFields = {}
  if (c.first !== undefined) f.first_name = nz(c.first)
  if (c.last !== undefined) f.last_name = nz(c.last)
  if (c.company !== undefined) f.organization_name = nz(c.company)
  if (c.phone !== undefined) f.phone = nz(c.phone)
  if (c.mobile !== undefined) f.alternate_phone = nz(c.mobile)
  if (c.email !== undefined) f.email = nz(c.email)
  if (c.no !== undefined) f.civic_number = nz(c.no)
  if (c.street !== undefined) f.street = nz(c.street)
  if (c.city !== undefined) f.city = nz(c.city)
  if (c.postal !== undefined) f.postal_code = nz(c.postal?.toUpperCase())
  if (c.type !== undefined) f.client_type = clientTypeApi(c.type)
  return f
}

/** The API found likely duplicates (same phone or e-mail in that company). Retry with `force` to create anyway. */
export class DuplicateClientError extends Error {
  readonly matches: DuplicateMatch[]
  constructor(matches: DuplicateMatch[]) {
    super('Un client semblable existe déjà.')
    this.matches = matches
  }
}

/**
 * Create a client of one company. Rejects with DuplicateClientError on a likely duplicate unless `force`.
 * `smsConsent` records the Loi 25 SMS consent right after (append-only consent row, source « verbal »).
 */
export async function createClient(
  input: ClientInput,
  company: CompanyId,
  opts: { force?: boolean; smsConsent?: boolean } = {},
): Promise<{ client: Client; consentError?: unknown }> {
  let created
  try {
    created = await api.createClient({ ...clientFields(input), company_id: companyUuid(company), force: !!opts.force })
  } catch (e) {
    if (e instanceof ApiError && e.code === 'POSSIBLE_DUPLICATE') throw new DuplicateClientError((e.details as { matches?: DuplicateMatch[] })?.matches ?? [])
    throw e
  }
  let client = cacheClient(created)
  // Language and source have no API yet: kept on this device for the session.
  if (input.language || input.source) {
    Object.assign(client, { ...(input.language ? { language: input.language } : {}), ...(input.source ? { source: input.source } : {}) })
    commit()
  }
  if (!opts.smsConsent) return { client }
  // The client exists at this point: a failed consent is reported, not thrown.
  try {
    await api.recordConsent(created.id, { channel: 'sms', is_granted: true, source: 'verbal' })
    client = cacheClient({ ...created, sms_consent: true })
    return { client }
  } catch (consentError) {
    return { client, consentError }
  }
}

export async function updateClient(id: string, patch: Partial<ClientInput>): Promise<Client> {
  const updated = await api.updateClient(id, clientFields(patch))
  return cacheClient(updated)
}

/** Soft delete (admin of the client's company). */
export async function deleteClient(id: string) {
  await api.deleteClient(id)
  uncache('client', id)
}

/** Record an SMS / e-mail consent or withdrawal, then refresh the client's SMS flag. */
export async function recordConsent(clientId: string, body: Parameters<typeof api.recordConsent>[1]) {
  const saved = await api.recordConsent(clientId, body)
  await refreshClient(clientId).catch(() => undefined)
  return saved
}

// ── Leads ────────────────────────────────────────────────────────────────────
/** "Marie-Ève Fortin" → first "Marie-Ève", last "Fortin" (the API stores the two parts). */
export function splitFullName(name: string): { first: string | null; last: string | null } {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return { first: null, last: null }
  if (parts.length === 1) return { first: null, last: parts[0] }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

export interface LeadInput {
  name: string
  phone?: string
  email?: string
  city?: string
  /** Source name (French, as listed). */
  channel: string
  message?: string
  company: CompanyId
  /** Responsable; empty = unassigned (admin / coordination only). */
  repId?: string
}

export async function createLead(input: LeadInput): Promise<Lead> {
  const source = sourceByName(input.channel)
  if (!source) throw new ApiError(400, 'BAD_REQUEST', 'Source invalide.')
  const { first, last } = splitFullName(input.name)
  const created = await api.createLead({
    company_id: companyUuid(input.company),
    source_id: source.id,
    // A representative's lead is always theirs: leave it to the server. Admin / coordination may leave it unassigned.
    assigned_user_id: input.repId ? input.repId : roleIn(input.company) === 'representative' ? undefined : null,
    first_name: first,
    last_name: last,
    phone: nz(input.phone),
    email: nz(input.email),
    city: nz(input.city),
    request_message: nz(input.message),
  })
  return cacheLead(created)
}

export interface LeadPatch {
  name?: string
  phone?: string
  email?: string
  city?: string
  address?: string
  message?: string
  channel?: string
  /** '' = unassigned. */
  repId?: string
  /** French status: Nouveau, Contacté, Qualifié, RDV réservé, Non qualifié. */
  status?: string
}

export async function updateLead(id: string, patch: LeadPatch): Promise<Lead> {
  const body: UpdateLeadBody = {}
  if (patch.name !== undefined) Object.assign(body, (({ first, last }) => ({ first_name: first, last_name: last }))(splitFullName(patch.name)))
  if (patch.phone !== undefined) body.phone = nz(patch.phone)
  if (patch.email !== undefined) body.email = nz(patch.email)
  if (patch.city !== undefined) body.city = nz(patch.city)
  if (patch.address !== undefined) body.address = nz(patch.address)
  if (patch.message !== undefined) body.request_message = nz(patch.message)
  if (patch.channel !== undefined) {
    const s = sourceByName(patch.channel)
    if (!s) throw new ApiError(400, 'BAD_REQUEST', 'Source invalide.')
    body.source_id = s.id
  }
  if (patch.repId !== undefined) body.assigned_user_id = patch.repId || null
  if (patch.status !== undefined) {
    const stage = stageApi(patch.status)
    if (!stage) throw new ApiError(422, 'BUSINESS_RULE', 'Cette étape ne peut pas être choisie manuellement.')
    body.stage = stage
  }
  const updated = await api.updateLead(id, body)
  return cacheLead(updated)
}

/** Soft delete (admin of the lead's company). */
export async function deleteLead(id: string) {
  await api.deleteLead(id)
  uncache('lead', id)
}

// ── Quotes ───────────────────────────────────────────────────────────────────
export interface QuoteInput {
  company: CompanyId
  clientId: string
  /** Work type name, as listed for the company. */
  workType: string
  /** Source name. */
  source: string
  repId?: string
  workSummary?: string
  /** Catalogue template id to apply right after creation. */
  templateId?: string
}

/** Create a quote (number, site address, taxes and payment terms are set by the server), then apply the template. */
export async function createQuote(input: QuoteInput): Promise<QuoteRecord> {
  const work = workTypeByName(input.company, input.workType)
  if (!work) throw new ApiError(400, 'BAD_REQUEST', 'Type de travaux invalide pour cette compagnie.')
  const source = sourceByName(input.source)
  if (!source) throw new ApiError(400, 'BAD_REQUEST', 'Source invalide.')
  let quote: ApiQuote = await api.createQuote({
    company_id: companyUuid(input.company)!,
    client_id: input.clientId,
    work_type_id: work.id,
    source_id: source.id,
    assigned_user_id: input.repId || undefined,
    work_summary: nz(input.workSummary),
  })
  cacheQuote(quote)
  if (input.templateId) quote = await api.applyTemplate(quote.id, input.templateId)
  const record = cacheQuote(quote)
  bumpClientQuotes(input.clientId)
  return record
}

function bumpClientQuotes(clientId: string) {
  const c = CLIENTS.find((x) => x.id === clientId)
  if (c) {
    c.quotes++
    commit()
  }
}

/** Update the header, price inputs, terms or notes. Returns the full quote. */
export async function updateQuote(id: string, body: UpdateQuoteBody) {
  const q = await api.updateQuote(id, body)
  cacheQuote(q)
  return q
}

/**
 * Status change made by a user: "Signé" = accepted at the office, "Refusé" = refused with a reason, the manual
 * statuses through PATCH /status. "Payé" and the reminder statuses are not set by hand in this phase.
 */
export async function changeStatus(id: string, status: string, d: { reason?: string; comment?: string } = {}): Promise<QuoteRecord> {
  let q: ApiQuote
  if (status === 'Signé') q = await api.acceptQuote(id)
  else if (status === 'Refusé') q = await api.refuseQuote(id, { reason: refusalApi(d.reason), comment: nz(d.comment) })
  else {
    const s = manualStatusApi(status)
    if (!s) throw new ApiError(422, 'BUSINESS_RULE', STATUS_API[status] === 'paid' ? 'Le statut « Payé » arrive avec la facturation (phase 2).' : 'Ce statut ne peut pas être choisi manuellement.')
    q = await api.changeQuoteStatus(id, s)
  }
  const record = cacheQuote(q)
  // Accepting one version refuses the other open versions of the same quote: refresh them.
  if (status === 'Signé') await refreshVersions(q)
  return record
}

async function refreshVersions(q: ApiQuote) {
  const root = q.variant_of_quote_id ?? q.id
  const related = (QUOTES as QuoteRecord[]).filter((x) => x.id !== q.id && (x.id === root || x.parentId === root))
  await Promise.all(related.map((x) => api.getQuote(x.id).then(cacheQuote).catch(() => undefined)))
}

/** « Dupliquer » or « Nouvelle version » (as_version, optional label such as "B"). Returns the new quote. */
export async function duplicateQuote(id: string, opts: { asVersion?: boolean; label?: string } = {}): Promise<QuoteRecord> {
  const q = await api.duplicateQuote(id, { as_version: !!opts.asVersion, variant_label: opts.asVersion ? nz(opts.label) : undefined })
  const record = cacheQuote(q)
  bumpClientQuotes(q.client_id)
  return record
}

/** Soft delete (admin only). Stops at the first failure; the ones already deleted stay deleted. */
export async function deleteQuotes(ids: string[]) {
  for (const id of ids) {
    const clientId = quoteById(id)?.clientId
    await api.deleteQuote(id)
    uncache('quote', id)
    const c = CLIENTS.find((x) => x.id === clientId)
    if (c) c.quotes = Math.max(0, c.quotes - 1)
  }
  commit()
}


// ── Lead conversion ──────────────────────────────────────────────────────────
export interface ConvertLeadInput {
  company: CompanyId
  /** Existing client of the lead's company… */
  clientId?: string
  /** …or a new one, created in the same transaction (duplicate check unless `force`). */
  newClient?: ClientInput
  force?: boolean
  /** Work type name, as listed for the company. */
  workType: string
  /** Representative; empty = the server's default (the caller if a representative, else the lead's). */
  repId?: string
  templateId?: string
}

/**
 * « Créer la soumission » from a lead (POST /leads/:id/convert): client, quote (lead's company and source, linked to
 * the lead), template, and the lead becomes converted — one transaction. Rejects with DuplicateClientError when the
 * new client looks like an existing one.
 */
export async function convertLead(leadId: string, input: ConvertLeadInput): Promise<QuoteRecord> {
  const work = workTypeByName(input.company, input.workType)
  if (!work) throw new ApiError(400, 'BAD_REQUEST', 'Type de travaux invalide pour cette compagnie.')
  let result
  try {
    result = await api.convertLead(leadId, {
      client_id: input.clientId,
      client: input.newClient ? { ...clientFields(input.newClient), force: !!input.force } : undefined,
      work_type_id: work.id,
      assigned_user_id: input.repId || undefined,
      template_id: input.templateId || undefined,
    })
  } catch (e) {
    if (e instanceof ApiError && e.code === 'POSSIBLE_DUPLICATE') throw new DuplicateClientError((e.details as { matches?: DuplicateMatch[] })?.matches ?? [])
    throw e
  }
  cacheLead(result.lead)
  const record = cacheQuote(result.quote)
  bumpClientQuotes(result.quote.client_id)
  return record
}

/** « Clients existants qui correspondent au lead »: same phone or e-mail in the lead's company. */
export const leadClientMatches = (leadId: string) => api.leadClientMatches(leadId)

// ── My profile ───────────────────────────────────────────────────────────────
/** PATCH /me (name, phone, agenda colour), then the name and phone shown everywhere (REPS, ME). */
export async function updateMyProfile(body: { first_name?: string; last_name?: string; phone?: string | null; calendar_color?: string }) {
  const profile = await api.updateMe(body)
  const name = `${profile.first_name} ${profile.last_name}`.trim()
  for (const r of [...REPS.filter((x) => x.id === profile.id), ME]) {
    if (r.id !== profile.id) continue
    Object.assign(r, { name, first: profile.first_name, phone: formatPhone(profile.phone) })
  }
  if (REF.me) REF.me.user = { ...REF.me.user, ...profile }
  commit()
  return profile
}
