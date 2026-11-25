/**
 * API mode: loads the backend's data into the UI's collections (CLIENTS, QUOTES, LEADS, REPS, COMPANIES,
 * WORK_TYPES, LEAD_SOURCES…) and keeps them in step after each change. The collections stay the single source
 * the screens read; here they become a cache of the server.
 *
 * Collections are mutated in place (splice / Object.assign) because modules hold references to them.
 */
import * as api from '../api/endpoints'
import { STATUS_FR, REFUSAL_FR, REFUSAL_CHOICES, STAGE_FR, CLIENT_TYPE_FR, formatPhone, localDate, localDateTime, subtotalFromTotal, toNum } from '../api/mappers'
import type { ApiCatalogue, ApiClient, ApiCompany, ApiLead, ApiLeadSource, ApiQuote, ApiQuoteListItem, ApiRepresentative, ApiWorkType, MeResponse, Uuid } from '../api/types'
import { APPOINTMENTS, CLIENTS, COMPANIES, JOBS, LEADS, ME, QUOTES, REPS, THREADS, TODAY, WORK_TYPES, type Client, type CompanyId, type Lead, type Rep } from './mock'
import { LEAD_SOURCES, NUMBERING, REFUSAL_REASONS } from './settings'
import { commit, type QuoteRecord } from './store'
import { getLang, locale } from '../i18n'

const KNOWN_SLUGS: CompanyId[] = ['toit', 'sg', 'reno']

/** Reference data of the signed-in user, as the API returned it. */
export const REF = {
  me: null as MeResponse | null,
  companies: [] as ApiCompany[],
  /** CompanyId (slug) ↔ company uuid. */
  uuidBySlug: new Map<CompanyId, Uuid>(),
  slugByUuid: new Map<Uuid, CompanyId>(),
  workTypes: new Map<CompanyId, ApiWorkType[]>(),
  reps: new Map<CompanyId, ApiRepresentative[]>(),
  sources: [] as ApiLeadSource[],
  /** Some lists stopped at their cap: more rows exist on the server. */
  truncated: { clients: false, quotes: false, leads: false },
}

export const companyUuid = (slug: CompanyId | string | undefined): Uuid | undefined => (slug ? REF.uuidBySlug.get(slug as CompanyId) : undefined)
export const companySlug = (uuid: Uuid | null | undefined): CompanyId | undefined => (uuid ? REF.slugByUuid.get(uuid) : undefined)
export const companyRates = (slug: CompanyId) => {
  const c = REF.companies.find((x) => x.slug === slug)
  // The database stores the rates as percents (5, 9.975).
  return { gst: toNum(c?.gst_rate ?? '5') / 100, qst: toNum(c?.qst_rate ?? '9.975') / 100 }
}
export const workTypeByName = (slug: CompanyId, name: string) => REF.workTypes.get(slug)?.find((w) => w.name === name)
export const workTypeById = (slug: CompanyId, id: Uuid | null | undefined) => (id ? REF.workTypes.get(slug)?.find((w) => w.id === id) : undefined)
export const sourceByName = (name: string | undefined) => REF.sources.find((s) => s.name === name)
export const sourceById = (id: Uuid | null | undefined) => REF.sources.find((s) => s.id === id)
/** Sales reps of a company (the « Représentant » pickers). Same objects as in REPS. */
export function repsOf(slug: CompanyId | undefined): Rep[] {
  if (!slug) return []
  const ids = new Set((REF.reps.get(slug) ?? []).map((r) => r.id))
  return REPS.filter((r) => ids.has(r.id))
}

/** Role of the signed-in user in a company. */
export const roleIn = (slug: CompanyId | string) => REF.me?.memberships.find((m) => m.slug === slug)?.role
/** Admin or coordination of the company: sees costs and margins (the API sends them only to these roles). */
export const isCostViewer = (slug: CompanyId | string) => ['admin', 'coordination'].includes(roleIn(slug) ?? '')

// ── Reps ─────────────────────────────────────────────────────────────────────
const ROLE_FR: Record<string, string> = { admin: 'Administrateur', coordination: 'Coordonnatrice', representative: 'Représentant' }

/** Stable avatar colour token (data-1 … data-10) from an id. */
function colorFor(id: string) {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 10
  return `data-${h + 1}`
}

/** Add (or update) a person in REPS so every screen can show their name; unknown people get a minimal entry. */
export function ensureRep(id: Uuid | null | undefined, first?: string | null, last?: string | null, company?: CompanyId | 'all') {
  if (!id) return
  const name = `${first ?? ''} ${last ?? ''}`.trim()
  const existing = REPS.find((r) => r.id === id)
  if (existing) {
    if (name && existing.name === '—') Object.assign(existing, { name, first: first ?? existing.first })
    if (company && existing.company !== company && existing.company !== 'all') existing.company = 'all'
    return
  }
  REPS.push({ id, name: name || '—', first: first || name || '—', company: company ?? 'all', role: '', phone: '', color: colorFor(id), territory: '' })
}

// ── Mapping: API → UI ────────────────────────────────────────────────────────
const fullNameOf = (first: string | null, last: string | null) => `${first ?? ''} ${last ?? ''}`.trim()

export function mapClient(c: ApiClient): Client {
  return {
    id: c.id,
    first: c.first_name ?? '',
    last: c.last_name ?? '',
    company: c.organization_name ?? undefined,
    phone: formatPhone(c.phone),
    mobile: c.alternate_phone ? formatPhone(c.alternate_phone) : undefined,
    email: c.email ?? '',
    no: c.civic_number ?? '',
    street: c.street ?? '',
    city: c.city ?? '',
    postal: c.postal_code ?? '',
    since: (c.created_at ?? '').slice(0, 4),
    tags: [],
    source: '',
    lifetime: toNum(c.lifetime_value),
    quotes: c.quotes_count,
    lastActivity: localDate(c.last_activity_at) || TODAY,
    consentSms: c.sms_consent,
    type: CLIENT_TYPE_FR[c.client_type] ?? 'Résidentiel',
    language: 'fr',
    companyId: companySlug(c.company_id),
  }
}

/** Days between a date (YYYY-MM-DD) and today. */
const daysSince = (iso: string) => Math.max(0, Math.round((new Date(TODAY + 'T12:00').getTime() - new Date(iso + 'T12:00').getTime()) / 864e5))

export function mapQuote(q: ApiQuoteListItem): QuoteRecord {
  const company = companySlug(q.company_id) ?? 'toit'
  const rates = companyRates(company)
  const total = toNum(q.total_amount)
  ensureRep(q.assigned_user_id, q.rep_first_name, q.rep_last_name, company)
  return {
    id: q.id,
    no: q.display_number,
    clientId: q.client_id,
    company,
    repId: q.assigned_user_id ?? '',
    status: STATUS_FR[q.status] ?? q.status,
    date: q.quote_date,
    amount: subtotalFromTotal(total, rates.gst, rates.qst),
    total,
    cost: toNum(q.estimated_cost_amount),
    marginPct: q.margin_pct === undefined ? undefined : q.margin_pct === null ? null : toNum(q.margin_pct),
    source: q.source_name,
    workType: q.work_type_name ?? '',
    workSummary: q.work_summary ?? undefined,
    city: q.site_city ?? '',
    views: q.view_count,
    lastViewed: q.last_viewed_at ? localDate(q.last_viewed_at) : undefined,
    daysInStatus: daysSince(q.quote_date),
    hot: false,
    nextActionDate: TODAY,
    refusalReason: q.refusal_reason ? REFUSAL_FR[q.refusal_reason] : undefined,
    followUpStopped: q.follow_ups_stopped_at ? (STATUS_FR[q.status] ?? 'Arrêtées') : undefined,
    parentId: q.variant_of_quote_id ?? undefined,
    variantLabel: q.variant_label ?? undefined,
  }
}

/** A full quote (GET /quotes/:id and every quote mutation) as a list row. Keeps the client / rep names already known. */
export function mapQuoteDetail(q: ApiQuote): QuoteRecord {
  const prev = QUOTES.find((x) => x.id === q.id) as QuoteRecord | undefined
  const company = companySlug(q.company_id) ?? 'toit'
  const client = CLIENTS.find((c) => c.id === q.client_id)
  return {
    ...(prev ?? {}),
    id: q.id,
    no: q.display_number,
    clientId: q.client_id,
    company,
    repId: q.assigned_user_id ?? '',
    status: STATUS_FR[q.status] ?? q.status,
    date: q.quote_date,
    amount: toNum(q.subtotal_amount),
    total: toNum(q.total_amount),
    cost: q.costs ? toNum(q.costs.estimated_cost_amount) : (prev?.cost ?? 0),
    marginPct: q.costs ? (q.costs.margin_pct === null ? null : toNum(q.costs.margin_pct)) : prev?.marginPct,
    source: sourceById(q.source_id)?.name ?? prev?.source ?? '',
    workType: q.work_type?.name ?? '',
    workSummary: q.work_summary ?? undefined,
    city: q.site_city ?? client?.city ?? '',
    views: q.view_count,
    lastViewed: q.last_viewed_at ? localDate(q.last_viewed_at) : undefined,
    daysInStatus: daysSince(q.quote_date),
    hot: false,
    nextActionDate: prev?.nextActionDate ?? TODAY,
    refusalReason: q.refusal_reason ? REFUSAL_FR[q.refusal_reason] : undefined,
    followUpStopped: q.follow_ups_stopped_at ? (STATUS_FR[q.status] ?? 'Arrêtées') : undefined,
    parentId: q.variant_of_quote_id ?? undefined,
    variantLabel: q.variant_label ?? undefined,
    leadId: q.lead_id ?? undefined,
  } as QuoteRecord
}

/** "il y a 5 min", "hier 18 h 22", "mar. 9 h 05"… in the UI language, computed when displayed. */
export function agoLabel(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const en = getLang() === 'en'
  const mins = Math.floor((Date.now() - d.getTime()) / 60000)
  const time = d.toLocaleTimeString(locale(), { hour: 'numeric', minute: '2-digit' }).replace(':', en ? ':' : ' h ')
  if (mins < 1) return en ? 'Just now' : "À l'instant"
  if (mins < 60) return en ? `${mins} min ago` : `il y a ${mins} min`
  const day = localDate(d)
  const yesterday = localDate(new Date(Date.now() - 864e5))
  if (day === TODAY) return en ? `${Math.floor(mins / 60)} h ago` : `il y a ${Math.floor(mins / 60)} h`
  if (day === yesterday) return en ? `yesterday ${time}` : `hier ${time}`
  if (mins < 7 * 1440) return `${d.toLocaleDateString(locale(), { weekday: 'short' })} ${time}`
  return d.toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' })
}

export function mapLead(l: ApiLead): Lead & { clientId?: string } {
  const company = companySlug(l.company_id) ?? 'toit'
  ensureRep(l.assigned_user_id, l.rep_first_name, l.rep_last_name, company)
  const lead = {
    id: l.id,
    name: l.organization_name || fullNameOf(l.first_name, l.last_name) || '—',
    phone: formatPhone(l.phone),
    email: l.email ?? undefined,
    city: l.city ?? '',
    company,
    channel: l.source_name,
    sourceId: l.source_id,
    received: localDateTime(l.created_at),
    receivedAt: l.created_at,
    ago: '',
    message: l.request_message ?? '',
    aiSummary: l.ai_summary ?? '',
    score: 0,
    status: STAGE_FR[l.stage] ?? 'Nouveau',
    repId: l.assigned_user_id ?? undefined,
    createdBy: l.created_by_user_id ?? undefined,
    clientId: l.client_id ?? undefined,
    address: l.address ?? undefined,
  }
  // Relative time follows the clock and the UI language: computed on read.
  Object.defineProperty(lead, 'ago', { get: () => agoLabel(l.created_at), enumerable: true, configurable: true })
  return lead
}

// ── Cache updates ────────────────────────────────────────────────────────────
function upsert<T extends { id: string }>(list: T[], item: T, atStart = true) {
  const i = list.findIndex((x) => x.id === item.id)
  if (i >= 0) list[i] = item
  else if (atStart) list.unshift(item)
  else list.push(item)
}

export function cacheClient(c: ApiClient): Client {
  const mapped = mapClient(c)
  upsert(CLIENTS, mapped)
  commit()
  return mapped
}

export function cacheQuote(q: ApiQuote): QuoteRecord {
  // Every quote row needs its client in CLIENTS (screens read the name): add a stub until the record is loaded.
  if (!CLIENTS.some((c) => c.id === q.client_id)) {
    CLIENTS.push({ id: q.client_id, first: '', last: '—', phone: '', email: '', no: q.site_civic_number ?? '', street: q.site_street ?? '', city: q.site_city ?? '', postal: q.site_postal_code ?? '', since: '', tags: [], source: '', lifetime: 0, quotes: 0, lastActivity: q.quote_date, consentSms: false, type: 'Résidentiel', language: 'fr', companyId: companySlug(q.company_id), partial: true })
    void api.getClient(q.client_id).then(cacheClient, () => undefined)
  }
  const mapped = mapQuoteDetail(q)
  upsert(QUOTES as QuoteRecord[], mapped)
  commit()
  return mapped
}

export function cacheLead(l: ApiLead): Lead {
  const mapped = mapLead(l)
  upsert(LEADS, mapped)
  commit()
  return mapped
}

export function uncache(kind: 'client' | 'quote' | 'lead', id: string) {
  if (kind === 'client') {
    // A deleted client's quotes are kept (soft delete); they leave the lists with it, so no row points at nothing.
    for (let i = QUOTES.length - 1; i >= 0; i--) if (QUOTES[i].clientId === id) QUOTES.splice(i, 1)
  }
  const list: { id: string }[] = kind === 'client' ? CLIENTS : kind === 'quote' ? QUOTES : LEADS
  const i = list.findIndex((x) => x.id === id)
  if (i >= 0) list.splice(i, 1)
  commit()
}

/** Client stub from a quote row, so lists show the name before the full record is loaded. */
function stubClient(q: ApiQuoteListItem): Client {
  return {
    id: q.client_id,
    first: q.client_first_name ?? '',
    last: q.client_last_name ?? '',
    company: q.client_organization ?? undefined,
    phone: '',
    email: '',
    no: '',
    street: '',
    city: q.site_city ?? '',
    postal: '',
    since: '',
    tags: [],
    source: '',
    lifetime: 0,
    quotes: 0,
    lastActivity: q.quote_date,
    consentSms: false,
    type: 'Résidentiel',
    language: 'fr',
    companyId: companySlug(q.company_id),
    partial: true,
  }
}

// ── Catalogues (per company, loaded on demand) ───────────────────────────────
const catalogues = new Map<CompanyId, Promise<ApiCatalogue>>()
/** The company's catalogue (scope clauses, expertises, warranties, cost items, add-ons, templates). */
export function loadCatalogue(slug: CompanyId): Promise<ApiCatalogue> {
  const uuid = companyUuid(slug)
  if (!uuid) return Promise.reject(new Error('Compagnie inconnue.'))
  let p = catalogues.get(slug)
  if (!p) {
    p = api.getCatalogue(uuid)
    p.catch(() => catalogues.delete(slug))
    catalogues.set(slug, p)
  }
  return p
}

// ── Hydration ────────────────────────────────────────────────────────────────
/** Caps of the initial load; lists then search the server for more. */
const CAP = { clients: 2000, quotes: 5000, leads: 3000 }

const ROW_LIMIT = 200

/** Load the reference data and the lists for the signed-in user, replacing the demo data. */
export async function hydrate(me: MeResponse) {
  REF.me = me
  const [companies, sources] = await Promise.all([api.listCompanies(), api.listLeadSources()])
  REF.companies = companies.filter((c) => KNOWN_SLUGS.includes(c.slug as CompanyId))
  REF.uuidBySlug.clear()
  REF.slugByUuid.clear()
  for (const c of REF.companies) {
    REF.uuidBySlug.set(c.slug as CompanyId, c.id)
    REF.slugByUuid.set(c.id, c.slug as CompanyId)
  }
  REF.sources = sources

  // Companies: names, phone, licence and quote prefix from the database (colours stay the UI's).
  for (const c of REF.companies) {
    const ui = COMPANIES.find((x) => x.id === c.slug)
    if (ui) Object.assign(ui, { name: c.name, phone: formatPhone(c.phone) || c.phone || '', rbq: c.rbq_number ?? '', code: c.quote_prefix ?? '' })
    NUMBERING[c.slug as CompanyId].prefix = c.quote_prefix ?? ''
  }

  // Work types and sales reps of each of the user's companies.
  const mine = REF.companies.filter((c) => me.memberships.some((m) => m.company_id === c.id))
  const perCompany = await Promise.all(mine.map(async (c) => ({ slug: c.slug as CompanyId, types: await api.listWorkTypes(c.id), reps: await api.listRepresentatives(c.id) })))
  REF.workTypes.clear()
  REF.reps.clear()
  REPS.splice(0, REPS.length)
  for (const { slug, types, reps } of perCompany) {
    REF.workTypes.set(slug, types)
    REF.reps.set(slug, reps)
    WORK_TYPES[slug] = types.map((w) => w.name)
    for (const r of reps) {
      ensureRep(r.id, r.first_name, r.last_name, slug)
      const rep = REPS.find((x) => x.id === r.id)!
      rep.role = ROLE_FR[r.role] ?? ''
    }
  }
  for (const slug of KNOWN_SLUGS) if (!REF.workTypes.has(slug)) WORK_TYPES[slug] = []

  // The signed-in user (ME): greeting, "my" rows, notes and messages authored by them.
  const u = me.user
  ensureRep(u.id, u.first_name, u.last_name, me.memberships.length === 1 ? (me.memberships[0].slug as CompanyId) : 'all')
  const meRep = REPS.find((r) => r.id === u.id) as Rep
  meRep.phone = formatPhone(u.phone)
  Object.assign(ME, { ...meRep })

  // Lead sources, refusal reasons and statuses follow the API.
  LEAD_SOURCES.splice(0, LEAD_SOURCES.length, ...sources.map((s) => ({ id: s.id, name: s.name, active: true, kind: 'manuel' as const })))
  REFUSAL_REASONS.splice(0, REFUSAL_REASONS.length, ...REFUSAL_CHOICES)

  // Lists.
  const [clients, quotes, leads] = await Promise.all([
    api.fetchAll((cursor) => api.listClients({ cursor, limit: ROW_LIMIT }), CAP.clients),
    api.fetchAll((cursor) => api.listQuotes({ cursor, limit: ROW_LIMIT }), CAP.quotes),
    api.fetchAll((cursor) => api.listLeads({ cursor, limit: ROW_LIMIT }), CAP.leads),
  ])
  REF.truncated = { clients: clients.length >= CAP.clients, quotes: quotes.length >= CAP.quotes, leads: leads.length >= CAP.leads }

  CLIENTS.splice(0, CLIENTS.length, ...clients.map(mapClient))
  const known = new Set(CLIENTS.map((c) => c.id))
  const mappedQuotes = quotes.map(mapQuote)
  for (const q of quotes) {
    if (!known.has(q.client_id)) {
      CLIENTS.push(stubClient(q))
      known.add(q.client_id)
    }
  }
  QUOTES.splice(0, QUOTES.length, ...mappedQuotes)
  LEADS.splice(0, LEADS.length, ...leads.map(mapLead))

  // No backend yet for conversations, the agenda and work days: start them empty rather than show demo people.
  THREADS.splice(0, THREADS.length)
  APPOINTMENTS.splice(0, APPOINTMENTS.length)
  JOBS.splice(0, JOBS.length)
  catalogues.clear()
  commit()
}

/** Sign-out: forget everything loaded for the previous user. */
export function resetData() {
  REF.me = null
  CLIENTS.splice(0, CLIENTS.length)
  QUOTES.splice(0, QUOTES.length)
  LEADS.splice(0, LEADS.length)
  THREADS.splice(0, THREADS.length)
  APPOINTMENTS.splice(0, APPOINTMENTS.length)
  JOBS.splice(0, JOBS.length)
  catalogues.clear()
  commit()
}

/** Re-read a company's representatives (after an invitation or a role change in Paramètres → Utilisateurs). */
export async function refreshReps(slug: CompanyId) {
  const uuid = companyUuid(slug)
  if (!uuid) return
  const reps = await api.listRepresentatives(uuid)
  REF.reps.set(slug, reps)
  for (const r of reps) {
    ensureRep(r.id, r.first_name, r.last_name, slug)
    const rep = REPS.find((x) => x.id === r.id)!
    rep.role = ROLE_FR[r.role] ?? ''
  }
  commit()
}

/** Re-read one client (record + its quotes) from the server. */
export async function refreshClient(id: Uuid) {
  const c = await api.getClient(id)
  cacheClient(c)
  return c
}

/** Re-read one quote from the server and update the list row. */
export async function refreshQuote(id: Uuid) {
  const q = await api.getQuote(id)
  return { quote: q, record: cacheQuote(q) }
}

/** Search the server for clients (lists show the cached ones; this finds the others). */
export async function searchClients(search: string, opts: { company?: CompanyId } = {}) {
  const page = await api.listClients({ search, company: companyUuid(opts.company), limit: 50 })
  const mapped = page.items.map(mapClient)
  for (const c of mapped) upsert(CLIENTS, c, false)
  commit()
  return mapped
}
