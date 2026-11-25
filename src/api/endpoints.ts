/**
 * One function per route of the Hillman Centrale API (openapi.json, Phase 1). Bodies and responses are the
 * backend's shapes (see ./types); screens go through the store / sync layer, which maps them to the UI's shapes.
 */
import { http, request } from './http'
import type {
  ApiCatalogue, ApiClient, ApiClientDetail, ApiCompany, ApiConsents, ApiDocument, ApiGroupSummary, ApiLead, ApiLeadDetail,
  ApiLeadSource, ApiQuote, ApiQuoteListItem, ApiRepresentative, ApiSavedConsent, ApiWorkType, ApiAuditEntry, AuditAction, AuditTable,
  ApiCompanyUser, ApiMyProfile, ApiNote, ConvertLeadBody, ConvertLeadResult, DuplicateMatch, InviteUserBody, NoteSubject, UpdateMeBody,
  ClientFields, ClientType, CreateConsentBody, CreateLeadBody, DownloadLink, ExpertiseStatus, IntakeLeadBody, LeadStage,
  ManualQuoteStatus, MeResponse, Page, QuoteStatus, RefusalReason, UpdateLeadBody, UpdateQuoteBody, Uuid,
} from './types'

const enc = encodeURIComponent

// ── Reference data ───────────────────────────────────────────────────────────
export const getMe = () => http.get<MeResponse>('/me')
export const listCompanies = () => http.get<ApiCompany[]>('/companies')
/** My profile: name, phone, agenda colour (the password goes through Supabase Auth). */
export const updateMe = (body: UpdateMeBody) => http.patch<ApiMyProfile>('/me', body)
export const listWorkTypes = (companyId: Uuid) => http.get<ApiWorkType[]>(`/companies/${enc(companyId)}/work-types`)
export const listRepresentatives = (companyId: Uuid) => http.get<ApiRepresentative[]>(`/companies/${enc(companyId)}/representatives`)
export const listLeadSources = () => http.get<ApiLeadSource[]>('/lead-sources')
export const getCatalogue = (companyId: Uuid) => http.get<ApiCatalogue>(`/companies/${enc(companyId)}/catalogue`)

// ── Clients ──────────────────────────────────────────────────────────────────
export const createClient = (body: ClientFields & { company_id?: Uuid; force?: boolean }) => http.post<ApiClient>('/clients', body)
export const listClients = (q: { company?: Uuid; type?: ClientType; search?: string; cursor?: string; limit?: number } = {}) =>
  http.get<Page<ApiClient>>('/clients', q)
export const getClient = (id: Uuid) => http.get<ApiClientDetail>(`/clients/${enc(id)}`)
export const updateClient = (id: Uuid, body: ClientFields) => http.patch<ApiClient>(`/clients/${enc(id)}`, body)
export const deleteClient = (id: Uuid) => http.del(`/clients/${enc(id)}`)

// ── Leads ────────────────────────────────────────────────────────────────────
export const createLead = (body: CreateLeadBody) => http.post<ApiLead>('/leads', body)
export const listLeads = (
  q: { company?: Uuid; stage?: LeadStage; source?: Uuid; rep?: Uuid; unassigned?: boolean; search?: string; cursor?: string; limit?: number } = {},
) => http.get<Page<ApiLead>>('/leads', q)
export const getLead = (id: Uuid) => http.get<ApiLeadDetail>(`/leads/${enc(id)}`)
export const updateLead = (id: Uuid, body: UpdateLeadBody) => http.patch<ApiLead>(`/leads/${enc(id)}`, body)
export const deleteLead = (id: Uuid) => http.del(`/leads/${enc(id)}`)
/** « Clients existants qui correspondent au lead »: same phone or e-mail, in the lead's company. */
export const leadClientMatches = (id: Uuid) => http.get<DuplicateMatch[]>(`/leads/${enc(id)}/client-matches`)
/** « Créer la soumission » from a lead: client (existing or new), quote, template and lead → converted, in one transaction. */
export const convertLead = (id: Uuid, body: ConvertLeadBody) => http.post<ConvertLeadResult>(`/leads/${enc(id)}/convert`, body)

/**
 * Automatic intake (websites, ad platforms, phone agent). No user token: the `X-Intake-Key` decides company and
 * source. Always answers 202 `{ received: true }` (also for duplicates and spam). Not used by staff screens.
 */
export const intakeLead = (intakeKey: string, body: IntakeLeadBody) =>
  request<{ received: true }>('POST', '/intake/leads', { body, anonymous: true, headers: { 'X-Intake-Key': intakeKey } })

// ── Quotes ───────────────────────────────────────────────────────────────────
export const createQuote = (body: { company_id: Uuid; client_id: Uuid; work_type_id: Uuid; source_id: Uuid; assigned_user_id?: Uuid; work_summary?: string | null }) =>
  http.post<ApiQuote>('/quotes', body)
export const listQuotes = (
  q: { company?: Uuid; status?: QuoteStatus; rep?: Uuid; search?: string; from?: string; to?: string; opened?: boolean; cursor?: string; limit?: number } = {},
) => http.get<Page<ApiQuoteListItem>>('/quotes', q)
export const getQuote = (id: Uuid) => http.get<ApiQuote>(`/quotes/${enc(id)}`)
export const updateQuote = (id: Uuid, body: UpdateQuoteBody) => http.patch<ApiQuote>(`/quotes/${enc(id)}`, body)
export const deleteQuote = (id: Uuid) => http.del(`/quotes/${enc(id)}`)
export const changeQuoteStatus = (id: Uuid, status: ManualQuoteStatus) => http.patch<ApiQuote>(`/quotes/${enc(id)}/status`, { status })
export const acceptQuote = (id: Uuid) => http.post<ApiQuote>(`/quotes/${enc(id)}/accept`)
export const refuseQuote = (id: Uuid, body: { reason: Exclude<RefusalReason, 'other_variant_chosen'>; comment?: string | null }) =>
  http.post<ApiQuote>(`/quotes/${enc(id)}/refuse`, body)
export const duplicateQuote = (id: Uuid, body: { as_version?: boolean; variant_label?: string | null } = {}) =>
  http.post<ApiQuote>(`/quotes/${enc(id)}/duplicate`, body)
export const priceFromTotal = (id: Uuid, total: string) => http.post<ApiQuote>(`/quotes/${enc(id)}/price-from-total`, { total })
export const applyTemplate = (id: Uuid, templateId: Uuid) => http.post<ApiQuote>(`/quotes/${enc(id)}/apply-template`, { template_id: templateId })

// ── Quote tabs ───────────────────────────────────────────────────────────────
export const setObligations = (id: Uuid, body: Record<string, unknown>) => http.put<ApiQuote>(`/quotes/${enc(id)}/obligations`, body)

export const addScopeItem = (id: Uuid, body: { scope_item_id: Uuid } | { section_title: string; text: string }) =>
  http.post<ApiQuote>(`/quotes/${enc(id)}/scope-items`, body)
export const editScopeItem = (id: Uuid, itemId: Uuid, body: { section_title?: string; text?: string }) =>
  http.patch<ApiQuote>(`/quotes/${enc(id)}/scope-items/${enc(itemId)}`, body)
export const removeScopeItem = (id: Uuid, itemId: Uuid) => http.del<ApiQuote>(`/quotes/${enc(id)}/scope-items/${enc(itemId)}`)
export const reorderScopeItems = (id: Uuid, ids: Uuid[]) => http.put<ApiQuote>(`/quotes/${enc(id)}/scope-items/order`, { ids })

export const setExpertise = (id: Uuid, expertiseItemId: Uuid, body: { status: ExpertiseStatus; note?: string | null }) =>
  http.put<ApiQuote>(`/quotes/${enc(id)}/expertise-items/${enc(expertiseItemId)}`, body)
export const removeExpertise = (id: Uuid, expertiseItemId: Uuid) => http.del<ApiQuote>(`/quotes/${enc(id)}/expertise-items/${enc(expertiseItemId)}`)

export const setWarranty = (id: Uuid, groupId: Uuid, body: { warranty_option_id: Uuid } | { custom_text: string }) =>
  http.put<ApiQuote>(`/quotes/${enc(id)}/warranties/${enc(groupId)}`, body)
export const clearWarranty = (id: Uuid, groupId: Uuid) => http.del<ApiQuote>(`/quotes/${enc(id)}/warranties/${enc(groupId)}`)

export const addCostLine = (id: Uuid, body: { cost_item_id: Uuid; quantity: string }) => http.post<ApiQuote>(`/quotes/${enc(id)}/cost-lines`, body)
export const editCostLine = (id: Uuid, lineId: Uuid, quantity: string) => http.patch<ApiQuote>(`/quotes/${enc(id)}/cost-lines/${enc(lineId)}`, { quantity })
export const removeCostLine = (id: Uuid, lineId: Uuid) => http.del<ApiQuote>(`/quotes/${enc(id)}/cost-lines/${enc(lineId)}`)

export const addAddon = (id: Uuid, body: { addon_preset_id: Uuid; is_included?: boolean } | { description: string; amount: string; is_included?: boolean }) =>
  http.post<ApiQuote>(`/quotes/${enc(id)}/addons`, body)
export const editAddon = (id: Uuid, addonId: Uuid, body: { description?: string; amount?: string; is_included?: boolean }) =>
  http.patch<ApiQuote>(`/quotes/${enc(id)}/addons/${enc(addonId)}`, body)
export const removeAddon = (id: Uuid, addonId: Uuid) => http.del<ApiQuote>(`/quotes/${enc(id)}/addons/${enc(addonId)}`)

// ── Photos ───────────────────────────────────────────────────────────────────
/** Multipart upload: JPEG, PNG, WebP or HEIC, 15 MB max. */
export function uploadPhoto(id: Uuid, file: Blob, opts: { filename?: string; title?: string | null; note?: string | null } = {}) {
  const form = new FormData()
  // Text fields before the file: the server reads the fields that precede the file part.
  if (opts.title) form.append('title', opts.title)
  if (opts.note) form.append('note', opts.note)
  form.append('file', file, opts.filename ?? (file instanceof File ? file.name : 'photo.jpg'))
  return request<ApiQuote>('POST', `/quotes/${enc(id)}/photos`, { body: form })
}
export const updatePhoto = (id: Uuid, photoId: Uuid, body: { title?: string | null; note?: string | null; is_primary?: boolean; annotation_data?: unknown }) =>
  http.patch<ApiQuote>(`/quotes/${enc(id)}/photos/${enc(photoId)}`, body)
export const removePhoto = (id: Uuid, photoId: Uuid) => http.del<ApiQuote>(`/quotes/${enc(id)}/photos/${enc(photoId)}`)

// ── Documents (PDF) ──────────────────────────────────────────────────────────
export const generateDocument = (id: Uuid, body: { kind: 'client_quote' | 'quantity_list'; include_costs?: boolean; include_work_prices?: boolean }) =>
  http.post<{ document: ApiDocument } & DownloadLink>(`/quotes/${enc(id)}/documents`, body)
export const listDocuments = (id: Uuid) => http.get<ApiDocument[]>(`/quotes/${enc(id)}/documents`)
export const downloadDocument = (documentId: Uuid) => http.get<DownloadLink>(`/documents/${enc(documentId)}/download`)

// ── Consents (Loi 25 / CASL) ─────────────────────────────────────────────────
export const listConsents = (clientId: Uuid) => http.get<ApiConsents>(`/clients/${enc(clientId)}/consents`)
export const recordConsent = (clientId: Uuid, body: CreateConsentBody) => http.post<ApiSavedConsent>(`/clients/${enc(clientId)}/consents`, body)

// ── Audit log (admin) ────────────────────────────────────────────────────────
export const listAuditLog = (
  q: { company?: Uuid; table?: AuditTable; record_id?: Uuid; action?: AuditAction; actor?: Uuid; from?: string; to?: string; include_values?: boolean; cursor?: string; limit?: number } = {},
) => http.get<Page<ApiAuditEntry>>('/audit-log', q)
export const quoteHistory = (id: Uuid, includeValues = false) =>
  http.get<{ quote_id: Uuid; items: ApiAuditEntry[] }>(`/quotes/${enc(id)}/history`, { include_values: includeValues })

// ── Group view (admin) ───────────────────────────────────────────────────────
export const groupSummary = (q: { from?: string; to?: string } = {}) => http.get<ApiGroupSummary>('/group/summary', q)

// ── Notes (clients, leads, quotes) ───────────────────────────────────────────
const NOTE_PATH: Record<NoteSubject, string> = { client: 'clients', lead: 'leads', quote: 'quotes' }
/** Newest first, with the author's name. */
export const listNotes = (subject: NoteSubject, id: Uuid) => http.get<ApiNote[]>(`/${NOTE_PATH[subject]}/${enc(id)}/notes`)
export const createNote = (subject: NoteSubject, id: Uuid, body: string) => http.post<ApiNote>(`/${NOTE_PATH[subject]}/${enc(id)}/notes`, { body })
/** Author, or admin of the subject's company. */
export const updateNote = (noteId: Uuid, body: string) => http.patch<ApiNote>(`/notes/${enc(noteId)}`, { body })
/** Soft delete; author, or admin of the subject's company. */
export const deleteNote = (noteId: Uuid) => http.del(`/notes/${enc(noteId)}`)

// ── Users of a company (admin) ───────────────────────────────────────────────
export const listCompanyUsers = (companyId: Uuid) => http.get<ApiCompanyUser[]>(`/companies/${enc(companyId)}/users`)
/** Known e-mail: membership added without e-mail (invited=false). New e-mail: Supabase invitation (invited=true). */
export const inviteUser = (companyId: Uuid, body: InviteUserBody) =>
  http.post<ApiCompanyUser & { invited: boolean }>(`/companies/${enc(companyId)}/users/invite`, body)
/** Role or active state. The company keeps an active admin; an admin cannot demote or deactivate themselves (422). */
export const updateMembership = (companyId: Uuid, userId: Uuid, body: { role?: ApiCompanyUser['role']; is_active?: boolean }) =>
  http.patch<ApiCompanyUser>(`/companies/${enc(companyId)}/users/${enc(userId)}`, body)

/** Every page of a cursor-paginated list (200 rows per request). */
export async function fetchAll<T>(load: (cursor?: string) => Promise<Page<T>>, max = 5000): Promise<T[]> {
  const out: T[] = []
  let cursor: string | undefined
  do {
    const page = await load(cursor)
    out.push(...page.items)
    cursor = page.next_cursor ?? undefined
  } while (cursor && out.length < max)
  return out
}
