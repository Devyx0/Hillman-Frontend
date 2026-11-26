/**
 * Response and request shapes of the Hillman Centrale API (Phase 1), as returned by the backend services.
 * Money, quantities, rates and other Postgres numerics are decimal strings ("1234.56"). Timestamps are ISO strings,
 * dates are YYYY-MM-DD. Phones are E.164 ("+15145551234").
 */

export type Uuid = string
export type Decimal = string

export type MembershipRole = 'admin' | 'coordination' | 'representative'
export type ClientType = 'residential' | 'commercial' | 'contractor'
export type LeadStage = 'new' | 'contacted' | 'qualified' | 'appointment_booked' | 'converted' | 'disqualified'
export type ManualLeadStage = Exclude<LeadStage, 'converted'>
export type QuoteStatus =
  | 'none' | 'in_quote' | 'in_progress' | 'to_call_back' | 'to_call_back_next_year' | 'client_will_call_back'
  | 'reminder_email_sent' | 'signed' | 'reminder_email_error' | 'completed' | 'paid' | 'refused'
/** Statuses a user may set with PATCH /quotes/:id/status. */
export type ManualQuoteStatus = 'in_quote' | 'in_progress' | 'to_call_back' | 'to_call_back_next_year' | 'client_will_call_back' | 'completed'
export type RefusalReason = 'price_too_high' | 'timeline_too_long' | 'chose_other_contractor' | 'project_postponed' | 'other' | 'other_variant_chosen'
export type ObligationForm = 'pitched_roof' | 'flat_roof' | 'metal_roof' | 'gutter' | 'renovation'
export type ExpertiseStatus = 'included' | 'not_included' | 'to_verify'
export type DocumentKind = 'client_quote' | 'quantity_list' | 'signed_contract' | 'work_order'
export type ConsentChannel = 'email' | 'sms'
export type ManualConsentSource = 'verbal' | 'written' | 'web_form' | 'email' | 'sms' | 'portal'
export type AuditTable = 'quotes' | 'quote_addons' | 'quote_cost_lines' | 'clients'
export type AuditAction = 'create' | 'update' | 'delete' | 'status_change' | 'price_change' | 'send' | 'sign' | 'merge' | 'export'

export interface Page<T> {
  items: T[]
  next_cursor: string | null
}

// ── Reference data ───────────────────────────────────────────────────────────
export interface MeResponse {
  user: { id: Uuid; email: string | null; first_name: string; last_name: string; phone: string | null; calendar_color: string | null }
  memberships: { company_id: Uuid; company_name: string; slug: string; role: MembershipRole }[]
}

export interface ApiCompany {
  id: Uuid
  slug: string
  name: string
  legal_name: string
  quote_prefix: string | null
  payment_terms: string | null
  phone: string | null
  website: string | null
  civic_number: string | null
  street: string | null
  city: string | null
  postal_code: string | null
  province_code: string
  rbq_number: string | null
  neq: string | null
  gst_number: string | null
  qst_number: string | null
  /** Percent, e.g. "5.000". */
  gst_rate: Decimal
  /** Percent, e.g. "9.975". */
  qst_rate: Decimal
  brand_color: string | null
  logo_file_id: Uuid | null
}

export interface ApiWorkType {
  id: Uuid
  name: string
  obligation_form: ObligationForm
  sort_order: number
  is_active: boolean
}

export interface ApiRepresentative {
  id: Uuid
  first_name: string
  last_name: string
  calendar_color: string | null
  role: MembershipRole
}

export interface ApiLeadSource {
  id: Uuid
  name: string
  sort_order: number
  is_active: boolean
}

export interface CatalogueScopeItem { id: Uuid; section_id: Uuid; text: string; is_checked_by_default: boolean; sort_order: number; is_active: boolean }
export interface CatalogueScopeSection { id: Uuid; name: string; sort_order: number; is_active: boolean; items: CatalogueScopeItem[] }
export interface CatalogueExpertiseItem { id: Uuid; section_name: string; text: string; default_status: ExpertiseStatus | null; sort_order: number; is_active: boolean }
export interface CatalogueWarrantyOption { id: Uuid; group_id: Uuid; label: string; sort_order: number; is_active: boolean }
export interface CatalogueWarrantyGroup { id: Uuid; name: string; allows_custom_text: boolean; sort_order: number; is_active: boolean; options: CatalogueWarrantyOption[] }
export interface CatalogueCostItem {
  id: Uuid
  category_id: Uuid
  name: string
  unit: string | null
  sell_price: Decimal
  sort_order: number
  is_active: boolean
  /** Admin and coordination only (key absent for representatives). */
  cost_price?: Decimal | null
}
export interface CatalogueCostCategory {
  id: Uuid
  general_category_id: Uuid
  name: string
  sort_order: number
  is_active: boolean
  /** Admin and coordination only (key absent for representatives). */
  target_margin_pct?: Decimal | null
  items: CatalogueCostItem[]
}
export interface CatalogueGeneralCategory { id: Uuid; name: string; print_lines_on_quote: boolean; sort_order: number; is_active: boolean; categories: CatalogueCostCategory[] }
export interface CatalogueAddonPreset {
  id: Uuid
  description: string
  default_amount: Decimal
  option_group: string | null
  warranty_text: string | null
  video_url: string | null
  is_added_to_new_quotes: boolean
  is_client_selectable: boolean
  sort_order: number
  is_active: boolean
}
export interface CatalogueTemplateItem {
  id: Uuid
  template_id: Uuid
  scope_item_id: Uuid | null
  cost_item_id: Uuid | null
  addon_preset_id: Uuid | null
  quantity: Decimal | null
  is_included: boolean
}
export interface CatalogueTemplate { id: Uuid; name: string; work_type_id: Uuid | null; sort_order: number; is_active: boolean; items: CatalogueTemplateItem[] }

export interface ApiCatalogue {
  scope_sections: CatalogueScopeSection[]
  expertise_items: CatalogueExpertiseItem[]
  warranty_groups: CatalogueWarrantyGroup[]
  cost_general_categories: CatalogueGeneralCategory[]
  addon_presets: CatalogueAddonPreset[]
  quote_templates: CatalogueTemplate[]
}

// ── Clients ──────────────────────────────────────────────────────────────────
export interface ClientFields {
  client_type?: ClientType
  organization_name?: string | null
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  alternate_phone?: string | null
  email?: string | null
  civic_number?: string | null
  street?: string | null
  city?: string | null
  postal_code?: string | null
  province_code?: string
  country_code?: string
}

export interface ApiClient {
  id: Uuid
  company_id: Uuid
  client_type: ClientType
  organization_name: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  alternate_phone: string | null
  email: string | null
  civic_number: string | null
  street: string | null
  city: string | null
  postal_code: string | null
  province_code: string
  country_code: string
  merged_into_client_id: Uuid | null
  created_at: string
  updated_at: string
  quotes_count: number
  lifetime_value: Decimal
  last_activity_at: string
  sms_consent: boolean
}

export interface ApiClientQuote {
  id: Uuid
  number: string
  company_id: Uuid
  status: QuoteStatus
  quote_date: string
  work_summary: string | null
  assigned_user_id: Uuid | null
  total_amount: Decimal
  quote_prefix: string | null
  company_name: string
  display_number: string
}

export interface ApiClientDetail extends ApiClient {
  quotes_by_company: { company_id: Uuid; company_name: string; quotes: ApiClientQuote[] }[]
}

export interface DuplicateMatch {
  id: Uuid
  first_name: string | null
  last_name: string | null
  organization_name: string | null
  phone: string | null
  alternate_phone: string | null
  email: string | null
  city: string | null
}

// ── Leads ────────────────────────────────────────────────────────────────────
export interface ApiLead {
  id: Uuid
  company_id: Uuid
  client_id: Uuid | null
  source_id: Uuid
  source_detail: string | null
  external_reference: string | null
  first_name: string | null
  last_name: string | null
  organization_name: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  work_type_id: Uuid | null
  request_message: string | null
  ai_summary: string | null
  stage: LeadStage
  assigned_user_id: Uuid | null
  created_by_user_id: Uuid | null
  created_at: string
  updated_at: string
  company_name: string
  source_name: string
  work_type_name: string | null
  rep_first_name: string | null
  rep_last_name: string | null
}

export interface ApiLeadDetail extends ApiLead {
  client: { id: Uuid; first_name: string | null; last_name: string | null; organization_name: string | null; phone: string | null; email: string | null; city: string | null } | null
  quotes: { id: Uuid; number: string; status: QuoteStatus; quote_date: string; total_amount: Decimal; display_number: string }[]
}

export interface CreateLeadBody {
  company_id?: Uuid
  source_id: Uuid
  assigned_user_id?: Uuid | null
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  email?: string | null
  city?: string | null
  request_message?: string | null
}

export interface UpdateLeadBody {
  source_id?: Uuid
  assigned_user_id?: Uuid | null
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  email?: string | null
  city?: string | null
  request_message?: string | null
  address?: string | null
  stage?: ManualLeadStage
}

export interface IntakeLeadBody {
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  email?: string | null
  city?: string | null
  request_message?: string | null
  company?: string
  external_reference?: string | null
  source_detail?: string | null
  website?: string
}

// ── Quotes ───────────────────────────────────────────────────────────────────
export interface ApiQuoteListItem {
  id: Uuid
  number: string
  quote_prefix: string | null
  company_id: Uuid
  company_name: string
  client_id: Uuid
  client_first_name: string | null
  client_last_name: string | null
  client_organization: string | null
  status: QuoteStatus
  quote_date: string
  work_summary: string | null
  site_city: string | null
  assigned_user_id: Uuid | null
  rep_first_name: string | null
  rep_last_name: string | null
  total_amount: Decimal
  view_count: number
  source_name: string
  work_type_name: string | null
  last_viewed_at: string | null
  first_sent_at: string | null
  refusal_reason: RefusalReason | null
  follow_ups_stopped_at: string | null
  variant_of_quote_id: Uuid | null
  variant_label: string | null
  display_number: string
  /** Admin and coordination of the quote's company only. */
  estimated_cost_amount?: Decimal
  margin_pct?: Decimal | null
}

export interface RoofObligations {
  quote_id?: Uuid
  area_sqft: Decimal | null
  base_area_sqft: Decimal | null
  upturn_area_sqft: Decimal | null
  slope_count: number | null
  storey_count: number | null
  drain_count: number | null
  estimated_days: Decimal | null
  pitch_rise: Decimal | null
  note: string | null
}

export interface GutterObligations {
  quote_id?: Uuid
  material: 'aluminum' | 'steel' | null
  gutter_size_in: number | null
  gutter_color: string | null
  downspout_color: string | null
  has_supreme_screw_hook: boolean
  gutter_length_ft: Decimal | null
  downspout_length_ft: Decimal | null
  ladders: string | null
  storeys: string | null
  roof_pitch: string | null
  leaning: string | null
  drip: string | null
  note: string | null
}

export interface RenovationObligations {
  quote_id?: Uuid
  other_work_title: string | null
  description: string | null
  area_sqft: Decimal | null
  estimated_days: Decimal | null
  note: string | null
}

export type AnyObligations = RoofObligations | GutterObligations | RenovationObligations

export interface QuoteScopeItem { id: Uuid; quote_id: Uuid; scope_item_id: Uuid | null; section_title: string; text: string; sort_order: number }
export interface QuoteExpertiseItem { id: Uuid; quote_id: Uuid; expertise_item_id: Uuid | null; section_name: string; text: string; status: ExpertiseStatus; note: string | null; sort_order: number }
export interface QuoteWarranty { id: Uuid; warranty_group_id: Uuid; group_name: string; warranty_option_id: Uuid | null; option_label: string | null; custom_text: string | null }
export interface QuoteCostLine {
  id: Uuid
  quote_id: Uuid
  cost_item_id: Uuid | null
  category_label: string
  description: string
  unit: string | null
  quantity: Decimal
  unit_price: Decimal
  print_on_quote: boolean
  sort_order: number
  /** Admin and coordination only. */
  unit_cost?: Decimal | null
}
export interface QuoteAddon {
  id: Uuid
  quote_id: Uuid
  addon_preset_id: Uuid | null
  description: string
  amount: Decimal
  /** « Inclus dans le prix »: counted in the taxed subtotal. */
  is_included: boolean
  option_group: string | null
  is_client_selectable: boolean
  warranty_text: string | null
  video_url: string | null
  sort_order: number
}
export interface QuotePhoto {
  id: Uuid
  title: string | null
  note: string | null
  is_primary: boolean
  sort_order: number
  file_id: Uuid
  mime_type: string
  annotation_data: unknown
  /** Short-lived signed URL (null when it could not be created). */
  url: string | null
}

export interface ApiQuote {
  id: Uuid
  number: string
  company_id: Uuid
  company_name: string
  client_id: Uuid
  lead_id: Uuid | null
  source_id: Uuid
  work_type_id: Uuid | null
  assigned_user_id: Uuid | null
  status: QuoteStatus
  quote_date: string
  work_summary: string | null
  site_civic_number: string | null
  site_street: string | null
  site_city: string | null
  site_postal_code: string | null
  site_province_code: string | null
  site_country_code: string | null
  site_note: string | null
  base_price: Decimal | null
  discount_amount: Decimal
  price_comments: string | null
  gst_rate: Decimal
  qst_rate: Decimal
  subtotal_amount: Decimal
  gst_amount: Decimal
  qst_amount: Decimal
  total_amount: Decimal
  payment_terms: string | null
  notes_html: string | null
  warranty_note: string | null
  first_sent_at: string | null
  view_count: number
  last_viewed_at: string | null
  accepted_at: string | null
  accepted_via: 'client_portal' | 'office' | null
  refused_at: string | null
  refusal_reason: RefusalReason | null
  refusal_comment: string | null
  follow_ups_stopped_at: string | null
  follow_up_stop_reason: string | null
  variant_of_quote_id: Uuid | null
  variant_label: string | null
  created_by_user_id: Uuid | null
  created_at: string
  updated_at: string
  display_number: string
  work_type: { id: Uuid; name: string; obligation_form: ObligationForm } | null
  obligations: AnyObligations | null
  scope_items: QuoteScopeItem[]
  expertise_items: QuoteExpertiseItem[]
  warranties: QuoteWarranty[]
  cost_lines: QuoteCostLine[]
  addons: QuoteAddon[]
  photos: QuotePhoto[]
  totals: { subtotal: Decimal; gst: Decimal; qst: Decimal; total: Decimal }
  /** Admin and coordination only (null for representatives). */
  costs: { estimated_cost_amount: Decimal; margin_amount: Decimal; margin_pct: Decimal | null } | null
}

export interface UpdateQuoteBody {
  assigned_user_id?: Uuid
  source_id?: Uuid
  quote_date?: string
  work_summary?: string | null
  site_civic_number?: string | null
  site_street?: string | null
  site_city?: string | null
  site_postal_code?: string | null
  site_province_code?: string
  site_country_code?: string
  site_note?: string | null
  base_price?: Decimal | null
  discount_amount?: Decimal
  price_comments?: string | null
  payment_terms?: string | null
  notes_html?: string | null
  warranty_note?: string | null
}

export interface ApiDocument {
  id: Uuid
  quote_id: Uuid
  kind: DocumentKind
  include_costs: boolean
  include_work_prices: boolean
  created_by_user_id: Uuid | null
  created_at: string
}

export interface DownloadLink {
  url: string
  expires_in_seconds: number
}

// ── Consents ─────────────────────────────────────────────────────────────────
export interface ApiConsentRow {
  id: string
  company_id: Uuid
  company_name: string
  channel: ConsentChannel
  is_granted: boolean
  captured_at: string
  expires_at: string | null
  source: string
  evidence: string | null
  recorded_by_user_id: Uuid | null
  recorded_by_name: string | null
}
export type ApiCurrentConsent = Omit<ApiConsentRow, 'evidence' | 'recorded_by_name'> & { is_current: boolean }
export type ApiSavedConsent = Omit<ApiConsentRow, 'recorded_by_name'> & { is_current: boolean }

export interface ApiConsents {
  client_id: Uuid
  current: ApiCurrentConsent[]
  history: ApiConsentRow[]
}

export interface CreateConsentBody {
  channel: ConsentChannel
  is_granted: boolean
  source: ManualConsentSource
  evidence?: string | null
  captured_at?: string
}

// ── Audit log ────────────────────────────────────────────────────────────────
export interface ApiAuditEntry {
  id: string
  occurred_at: string
  company_id: Uuid | null
  company_name: string | null
  actor_type: string
  actor_user_id: Uuid | null
  actor_name: string | null
  action: AuditAction | string
  table_name: AuditTable | string
  record_id: Uuid
  summary: string | null
  /** Changed fields (update rows); null for inserts and deletes. */
  changes: { field: string; old: unknown; new: unknown }[] | null
  old_values?: Record<string, unknown> | null
  new_values?: Record<string, unknown> | null
}

// ── Group view ───────────────────────────────────────────────────────────────
export interface GroupBucket {
  quotes_count: number
  total_amount: Decimal
  open_count: number
  open_amount: Decimal
  won_count: number
  won_amount: Decimal
  refused_count: number
  refused_amount: Decimal
  win_rate_pct: number | null
  by_status: { status: QuoteStatus; count: number; amount: Decimal }[]
}

export interface ApiGroupSummary {
  period: { from: string | null; to: string | null }
  group: GroupBucket
  companies: (GroupBucket & { company_id: Uuid; slug: string; name: string; quote_prefix: string | null; brand_color: string | null })[]
}

// ── Lead conversion ──────────────────────────────────────────────────────────
/** POST /leads/:id/convert: exactly one of client_id (existing client of the lead's company) or client (new). */
export interface ConvertLeadBody {
  client_id?: Uuid
  client?: ClientFields & { force?: boolean }
  work_type_id: Uuid
  /** Default: the caller if a representative, else the lead's representative (400 when neither). */
  assigned_user_id?: Uuid
  template_id?: Uuid
  work_summary?: string | null
}

export interface ConvertLeadResult {
  lead: ApiLeadDetail
  quote: ApiQuote
}

// ── Notes ────────────────────────────────────────────────────────────────────
export type NoteSubject = 'client' | 'lead' | 'quote'

export interface ApiNote {
  id: Uuid
  client_id: Uuid | null
  lead_id: Uuid | null
  quote_id: Uuid | null
  author_user_id: Uuid | null
  author_first_name: string | null
  author_last_name: string | null
  body: string
  created_at: string
  updated_at: string
}

// ── Users ────────────────────────────────────────────────────────────────────
export interface ApiMyProfile {
  id: Uuid
  email: string | null
  first_name: string
  last_name: string
  phone: string | null
  calendar_color: string | null
}

export interface UpdateMeBody {
  first_name?: string
  last_name?: string
  phone?: string | null
  /** #RRGGBB */
  calendar_color?: string
}

export interface ApiCompanyUser {
  user_id: Uuid
  email: string | null
  first_name: string
  last_name: string
  phone: string | null
  role: MembershipRole
  is_active: boolean
  /** false for staff without a Supabase login */
  has_login: boolean
  invited_at: string | null
  /** null = invited but never signed in */
  last_sign_in_at: string | null
  member_since: string
}

export interface InviteUserBody {
  email: string
  first_name: string
  last_name: string
  role: MembershipRole
}

// ── Paramètres (settings) ────────────────────────────────────────────────────
/** GET /companies/:id/settings: every column of the company, plus the logo. */
export interface ApiCompanySettings extends ApiCompany {
  is_active: boolean
  country_code: string
  /** Shown here, set with the sending setup. */
  twilio_phone: string | null
  email_from: string | null
  reply_to_email: string | null
  terms_and_conditions: string | null
  /** Admin and coordination only (key absent for representatives). */
  target_margin_pct?: Decimal | null
  logo: { file_id: Uuid; mime_type: string | null; url: string | null } | null
  created_at: string
  updated_at: string
}
/** PATCH /companies/:id/settings: only the fields sent change. Rates are percent strings ("5", "9.975"). */
export type UpdateCompanySettingsBody = Partial<{
  name: string
  legal_name: string
  quote_prefix: string | null
  phone: string | null
  website: string | null
  civic_number: string | null
  street: string | null
  city: string | null
  postal_code: string | null
  province_code: string
  rbq_number: string | null
  neq: string | null
  gst_number: string | null
  qst_number: string | null
  gst_rate: string
  qst_rate: string
  brand_color: string | null
  terms_and_conditions: string | null
  payment_terms: string | null
  target_margin_pct: string | null
}>
export interface QuoteNumbering { next_number: number; highest_used: number | null }

export type CatalogueEntityKey =
  | 'work-types' | 'scope-sections' | 'scope-items' | 'expertise-items' | 'warranty-groups' | 'warranty-options'
  | 'cost-general-categories' | 'cost-categories' | 'cost-items' | 'addon-presets'
export interface ApplyMarginResult { margin_pct: number; category_id: Uuid | null; items_updated: number }

/** A quote template line: exactly one target. */
export type TemplateItemBody =
  | { scope_item_id: Uuid }
  | { cost_item_id: Uuid; quantity?: string | null }
  | { addon_preset_id: Uuid; is_included?: boolean }
export interface ApiQuoteTemplate {
  id: Uuid
  company_id: Uuid
  name: string
  work_type_id: Uuid | null
  sort_order: number
  is_active: boolean
  items: Omit<CatalogueTemplateItem, 'template_id'>[]
}
export interface QuoteTemplateBody {
  name?: string
  work_type_id?: Uuid | null
  sort_order?: number
  is_active?: boolean
  items?: TemplateItemBody[]
}

export type MessageChannel = 'email' | 'sms'
export type MessagePurpose = 'quote_delivery' | 'follow_up' | 'appointment_reminder' | 'general'
export interface ApiMessageTemplate {
  id: Uuid
  /** null = shared by every company. */
  company_id: Uuid | null
  name: string
  channel: MessageChannel
  purpose: MessagePurpose
  subject: string | null
  body: string
  is_active: boolean
  updated_at: string
}
export interface MessageTemplateBody {
  name?: string
  channel?: MessageChannel
  purpose?: MessagePurpose
  subject?: string | null
  body?: string
  is_active?: boolean
}

export type FollowUpTrigger = 'quote_sent' | 'appointment'
export interface FollowUpStepBody {
  trigger: FollowUpTrigger
  /** quote_sent: 1…90 days after the first send; appointment: −30…0 days from the appointment. */
  offset_days: number
  /** HH:MM */
  send_time?: string
  channel: MessageChannel
  template_id: Uuid
  set_quote_status?: 'reminder_email_sent' | 'to_call_back' | null
  is_active?: boolean
}
export interface ApiFollowUpStep extends Required<Omit<FollowUpStepBody, 'set_quote_status'>> {
  id: Uuid
  template_name: string
  set_quote_status: 'reminder_email_sent' | 'to_call_back' | null
}

export interface ApiIntakeKey {
  id: Uuid
  name: string
  /** null = group form (each request names the company). */
  company_id: Uuid | null
  company_name: string | null
  source_id: Uuid
  source_name: string
  is_active: boolean
  created_at: string
}
