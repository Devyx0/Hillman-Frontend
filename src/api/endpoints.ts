/**
 * One function per route of the Hillman Centrale API (openapi.json, Phase 1). Bodies and responses are the
 * backend's shapes (see ./types); screens go through the store / sync layer, which maps them to the UI's shapes.
 */
import { http, request } from './http'
import type {
  ApiCatalogue, ApiClient, ApiClientDetail, ApiCompany, ApiConsents, ApiDocument, ApiGroupSummary, ApiLead, ApiLeadDetail,
  ApiLeadSource, ApiQuote, ApiQuoteListItem, ApiRepresentative, ApiSavedConsent, ApiWorkType, ApiAuditEntry, AuditAction, AuditTable,
  ApiCompanyUser, ApiMyProfile, ApiCompanySettings, UpdateCompanySettingsBody, QuoteNumbering, CatalogueEntityKey, ApplyMarginResult,
  ApiQuoteTemplate, QuoteTemplateBody, ApiMessageTemplate, MessageTemplateBody, MessageChannel, MessagePurpose, ApiFollowUpStep, FollowUpStepBody, ApiIntakeKey, ApiNote, ConvertLeadBody, ConvertLeadResult, DuplicateMatch, InviteUserBody, NoteSubject, UpdateMeBody,
  ClientFields, ClientType, CreateConsentBody, CreateLeadBody, DownloadLink, ExpertiseStatus, IntakeLeadBody, LeadStage,
  ManualQuoteStatus, MeResponse, Page, QuoteStatus, RefusalReason, UpdateLeadBody, UpdateQuoteBody, Uuid,
} from './types'

const enc = encodeURIComponent

// ── Reference data ───────────────────────────────────────────────────────────
export const getMe = () => http.get<MeResponse>('/me')
export const listCompanies = () => http.get<ApiCompany[]>('/companies')
/** My profile: name, phone, agenda colour (the password goes through Supabase Auth). */
export const updateMe = (body: UpdateMeBody) => http.patch<ApiMyProfile>('/me', body)
/** includeInactive: Paramètres also lists the deactivated ones. */
export const listWorkTypes = (companyId: Uuid, includeInactive = false) =>
  http.get<ApiWorkType[]>(`/companies/${enc(companyId)}/work-types`, includeInactive ? { include_inactive: true } : undefined)
export const listRepresentatives = (companyId: Uuid) => http.get<ApiRepresentative[]>(`/companies/${enc(companyId)}/representatives`)
/** Active sources in display order; includeInactive (Paramètres) also returns the deactivated ones. */
export const listLeadSources = (includeInactive = false) => http.get<ApiLeadSource[]>('/lead-sources', includeInactive ? { include_inactive: true } : undefined)
/** includeInactive (Paramètres › Catalogue): also the deactivated rows. Every row has is_active. */
export const getCatalogue = (companyId: Uuid, includeInactive = false) =>
  http.get<ApiCatalogue>(`/companies/${enc(companyId)}/catalogue`, includeInactive ? { include_inactive: true } : undefined)

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

// ── Paramètres › Compagnie ───────────────────────────────────────────────────
/** Every column of the company and its logo (signed URL). target_margin_pct: admin and coordination only. */
export const getCompanySettings = (companyId: Uuid) => http.get<ApiCompanySettings>(`/companies/${enc(companyId)}/settings`)
/** Admin of the company. Numbers are stored in their printed form; rates are percent strings. */
export const updateCompanySettings = (companyId: Uuid, body: UpdateCompanySettingsBody) =>
  http.patch<ApiCompanySettings>(`/companies/${enc(companyId)}/settings`, body)
/** PNG, JPG or WebP, 2 MB max (no SVG). Admin of the company. */
export function uploadCompanyLogo(companyId: Uuid, file: Blob, filename?: string) {
  const form = new FormData()
  form.append('file', file, filename ?? (file instanceof File ? file.name : 'logo.png'))
  return request<ApiCompanySettings>('PUT', `/companies/${enc(companyId)}/logo`, { body: form })
}
export const removeCompanyLogo = (companyId: Uuid) => http.del<ApiCompanySettings>(`/companies/${enc(companyId)}/logo`)
/** One sequence for the group; each company prints its prefix before the number. */
export const getQuoteNumbering = () => http.get<QuoteNumbering>('/settings/quote-numbering')
/** Admin of every company; 422 when not above every number already used. */
export const setQuoteNumbering = (nextNumber: number) => http.put<QuoteNumbering>('/settings/quote-numbering', { next_number: nextNumber })

// ── Paramètres › Sources de leads (admin of every company) ───────────────────
export const createLeadSource = (body: { name: string; sort_order?: number; is_active?: boolean }) => http.post<ApiLeadSource>('/lead-sources', body)
export const updateLeadSource = (id: Uuid, body: { name?: string; sort_order?: number; is_active?: boolean }) =>
  http.patch<ApiLeadSource>(`/lead-sources/${enc(id)}`, body)
/** 409 IN_USE when leads, quotes or intake keys use it: deactivate it instead. */
export const deleteLeadSource = (id: Uuid) => http.del(`/lead-sources/${enc(id)}`)

// ── Paramètres › Catalogue (edit: admin, coordination; delete: admin) ────────
/** Parent of each child entity: POST /<parent>/:id/<path>. */
const CATALOGUE_PARENT: Partial<Record<CatalogueEntityKey, { parent: CatalogueEntityKey; path: string }>> = {
  'scope-items': { parent: 'scope-sections', path: 'items' },
  'warranty-options': { parent: 'warranty-groups', path: 'options' },
  'cost-categories': { parent: 'cost-general-categories', path: 'categories' },
  'cost-items': { parent: 'cost-categories', path: 'items' },
}
/**
 * Add a catalogue row. `ownerId` is the company (work types, scope sections, expertise items, warranty groups,
 * general categories, add-ons) or the parent row (scope items → section, options → group, categories → general
 * category, cost items → category). Returns the created row.
 */
export function createCatalogueRow<T = Record<string, unknown>>(key: CatalogueEntityKey, ownerId: Uuid, body: Record<string, unknown>) {
  const p = CATALOGUE_PARENT[key]
  return http.post<T>(p ? `/${p.parent}/${enc(ownerId)}/${p.path}` : `/companies/${enc(ownerId)}/${key}`, body)
}
/** Only the fields sent change; is_active: false hides the row from new quotes. */
export const updateCatalogueRow = <T = Record<string, unknown>>(key: CatalogueEntityKey, id: Uuid, body: Record<string, unknown>) =>
  http.patch<T>(`/${key}/${enc(id)}`, body)
/** Admin. 409 IN_USE for rows quotes still use (work types, warranties, options): deactivate them instead. */
export const deleteCatalogueRow = (key: CatalogueEntityKey, id: Uuid) => http.del(`/${key}/${enc(id)}`)
/** sell = cost / (1 − margin %). Without categoryId: whole catalogue, and it becomes the company target margin. */
export const applyCatalogueMargin = (companyId: Uuid, marginPct: number, categoryId?: Uuid) =>
  http.post<ApplyMarginResult>(`/companies/${enc(companyId)}/catalogue/margin`, categoryId ? { margin_pct: marginPct, category_id: categoryId } : { margin_pct: marginPct })

// ── Paramètres › Modèles de soumission (read with the catalogue) ─────────────
export const createQuoteTemplate = (companyId: Uuid, body: QuoteTemplateBody & { name: string }) =>
  http.post<ApiQuoteTemplate>(`/companies/${enc(companyId)}/quote-templates`, body)
/** items, when sent, replaces every line. */
export const updateQuoteTemplate = (id: Uuid, body: QuoteTemplateBody) => http.patch<ApiQuoteTemplate>(`/quote-templates/${enc(id)}`, body)
/** Default name « <nom> (copie) ». */
export const duplicateQuoteTemplate = (id: Uuid, name?: string) => http.post<ApiQuoteTemplate>(`/quote-templates/${enc(id)}/duplicate`, name ? { name } : {})
/** Admin; quotes made from it are not affected. */
export const deleteQuoteTemplate = (id: Uuid) => http.del(`/quote-templates/${enc(id)}`)

// ── Paramètres › Modèles de messages ─────────────────────────────────────────
/** The company's templates plus the shared ones (company_id null); active only unless includeInactive. */
export const listMessageTemplates = (companyId: Uuid, q: { channel?: MessageChannel; purpose?: MessagePurpose; include_inactive?: boolean } = {}) =>
  http.get<ApiMessageTemplate[]>(`/companies/${enc(companyId)}/message-templates`, q)
/** Admin of the company. E-mail: subject required; SMS: no subject. Merge fields {prénom} {représentant} {compagnie} {no} {date}. */
export const createMessageTemplate = (companyId: Uuid, body: MessageTemplateBody & { name: string; channel: MessageChannel; purpose: MessagePurpose; body: string }) =>
  http.post<ApiMessageTemplate>(`/companies/${enc(companyId)}/message-templates`, body)
/** The channel cannot change. */
export const updateMessageTemplate = (id: Uuid, body: Omit<MessageTemplateBody, 'channel'>) => http.patch<ApiMessageTemplate>(`/message-templates/${enc(id)}`, body)
/** 409 IN_USE when an automatic follow-up step uses it. */
export const deleteMessageTemplate = (id: Uuid) => http.del(`/message-templates/${enc(id)}`)

// ── Paramètres › Suivis automatiques ─────────────────────────────────────────
export const listFollowUpSteps = (companyId: Uuid) => http.get<ApiFollowUpStep[]>(`/companies/${enc(companyId)}/follow-up-steps`)
/** The whole sequence: steps left out are removed. Admin of the company. Messages are not sent yet. */
export const saveFollowUpSteps = (companyId: Uuid, steps: FollowUpStepBody[]) =>
  http.put<ApiFollowUpStep[]>(`/companies/${enc(companyId)}/follow-up-steps`, { steps })

// ── Paramètres › Réception des leads (intake keys, admins) ───────────────────
/** Keys the caller manages; the key itself is never returned here. */
export const listIntakeKeys = (companyId?: Uuid) => http.get<ApiIntakeKey[]>('/intake-keys', companyId ? { company_id: companyId } : undefined)
/** company_id null = group form (admin of every company). `key` is shown this once. */
export const createIntakeKey = (body: { name: string; source_id: Uuid; company_id: Uuid | null }) =>
  http.post<ApiIntakeKey & { key: string }>('/intake-keys', body)
/** Keys are deactivated, never deleted. */
export const updateIntakeKey = (id: Uuid, body: { name?: string; is_active?: boolean }) => http.patch<ApiIntakeKey>(`/intake-keys/${enc(id)}`, body)

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
