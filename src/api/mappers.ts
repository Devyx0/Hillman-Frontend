/**
 * Conversions between the API's values and the UI's. The UI keeps its canonical French values (statuses,
 * stages, client types) and its display formats (phones "418 555-1234", amounts as numbers); the API exchanges
 * enums, E.164 phones and decimal strings.
 */
import type { ClientType, LeadStage, ManualLeadStage, ManualQuoteStatus, QuoteStatus, RefusalReason } from './types'

// ── Quote statuses ───────────────────────────────────────────────────────────
export const STATUS_FR: Record<QuoteStatus, string> = {
  none: 'En cours',
  in_quote: 'En soumission',
  in_progress: 'En cours',
  to_call_back: 'À rappeler',
  to_call_back_next_year: 'À rappeler (année prochaine)',
  client_will_call_back: 'Client va nous rappeler',
  reminder_email_sent: 'Rappel courriel envoyé',
  signed: 'Signé',
  reminder_email_error: 'Erreur du rappel courriel',
  completed: 'Terminé',
  paid: 'Payé',
  refused: 'Refusé',
}

/** UI status → API status ('none' is never chosen: "En cours" is in_progress). */
export const STATUS_API: Record<string, QuoteStatus> = {
  'En soumission': 'in_quote',
  'En cours': 'in_progress',
  'À rappeler': 'to_call_back',
  'À rappeler (année prochaine)': 'to_call_back_next_year',
  'Client va nous rappeler': 'client_will_call_back',
  'Rappel courriel envoyé': 'reminder_email_sent',
  Signé: 'signed',
  'Erreur du rappel courriel': 'reminder_email_error',
  Terminé: 'completed',
  Payé: 'paid',
  Refusé: 'refused',
}

const MANUAL: ManualQuoteStatus[] = ['in_quote', 'in_progress', 'to_call_back', 'to_call_back_next_year', 'client_will_call_back', 'completed']

/** The UI status maps to a status settable with PATCH /quotes/:id/status. */
export const manualStatusApi = (fr: string): ManualQuoteStatus | undefined => {
  const s = STATUS_API[fr]
  return MANUAL.includes(s as ManualQuoteStatus) ? (s as ManualQuoteStatus) : undefined
}

/**
 * Statuses a user can pick by hand in API mode: the manual ones, plus "Signé" (accept at the office) and
 * "Refusé" (refuse with a reason). "Payé" arrives with invoicing and the reminder statuses with the automations.
 */
export const PICKABLE_STATUSES = ['En soumission', 'En cours', 'À rappeler', 'À rappeler (année prochaine)', 'Client va nous rappeler', 'Signé', 'Refusé', 'Terminé']

/** Statuses where accept / refuse are still possible (the API answers 422 on the others). */
export const OPEN_API_STATUSES: QuoteStatus[] = ['none', 'in_quote', 'in_progress', 'to_call_back', 'to_call_back_next_year', 'client_will_call_back', 'reminder_email_sent', 'reminder_email_error']

// ── Refusal reasons ──────────────────────────────────────────────────────────
export const REFUSAL_FR: Record<RefusalReason, string> = {
  price_too_high: 'Prix trop élevé',
  timeline_too_long: 'Délai trop long',
  chose_other_contractor: 'A choisi un concurrent',
  project_postponed: 'Projet reporté',
  other: 'Autre',
  other_variant_chosen: 'Autre version choisie',
}
/** Reasons a user may pick (other_variant_chosen is set by the server when another version is signed). */
export const REFUSAL_CHOICES = ['Prix trop élevé', 'Délai trop long', 'A choisi un concurrent', 'Projet reporté', 'Autre']
export const refusalApi = (fr?: string): Exclude<RefusalReason, 'other_variant_chosen'> =>
  (Object.entries(REFUSAL_FR).find(([k, v]) => v === fr && k !== 'other_variant_chosen')?.[0] as Exclude<RefusalReason, 'other_variant_chosen'>) ?? 'other'

// ── Lead stages ──────────────────────────────────────────────────────────────
export const STAGE_FR: Record<LeadStage, string> = {
  new: 'Nouveau',
  contacted: 'Contacté',
  qualified: 'Qualifié',
  appointment_booked: 'RDV réservé',
  converted: 'Converti',
  disqualified: 'Non qualifié',
}
const STAGE_API: Record<string, ManualLeadStage> = {
  Nouveau: 'new',
  'À contacter': 'contacted',
  Contacté: 'contacted',
  'Qualifié par IA': 'qualified',
  Qualifié: 'qualified',
  'RDV réservé': 'appointment_booked',
  'Non qualifié': 'disqualified',
}
/** UI lead status → stage settable by hand (undefined for "Converti", reserved to the conversion). */
export const stageApi = (fr: string): ManualLeadStage | undefined => STAGE_API[fr]

// ── Client types ─────────────────────────────────────────────────────────────
export const CLIENT_TYPE_FR: Record<ClientType, string> = { residential: 'Résidentiel', commercial: 'Commercial', contractor: 'Entrepreneur' }
export const clientTypeApi = (fr: string): ClientType =>
  (Object.entries(CLIENT_TYPE_FR).find(([, v]) => v === fr)?.[0] as ClientType) ?? 'residential'

// ── Phones ───────────────────────────────────────────────────────────────────
/** "+14185551234" → "418 555-1234" (other formats are returned as stored). */
export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return ''
  const d = e164.replace(/\D/g, '')
  const ten = d.length === 11 && d.startsWith('1') ? d.slice(1) : d.length === 10 ? d : null
  return ten ? `${ten.slice(0, 3)} ${ten.slice(3, 6)}-${ten.slice(6)}` : e164
}

/** A phone the API accepts (10 digits, or 11 starting with 1). Empty → null. */
export function phoneOrNull(s: string | undefined): string | null {
  const v = (s ?? '').trim()
  return v ? v : null
}

/** True when the API will accept the phone (same rule as its validator). */
export function isValidPhone(s: string): boolean {
  const d = s.replace(/\D/g, '')
  return d.length === 10 || (d.length === 11 && d.startsWith('1'))
}

// ── Money ────────────────────────────────────────────────────────────────────
/** Decimal string → number (null / '' → 0). */
export const toNum = (d: string | number | null | undefined): number => (d === null || d === undefined || d === '' ? 0 : Number(d))

/** Number → decimal string with 2 decimals, for money fields ("1234.50"). Negative values are not accepted by the API. */
export const toMoney = (n: number): string => (Math.round(Math.max(0, n) * 100) / 100).toFixed(2)

/** Number → quantity string (max 3 decimals). */
export const toQty = (n: number): string => String(Math.round(Math.max(0, n) * 1000) / 1000)

/** Postgres numeric round(x, 2): half away from zero, on integer cents. */
const roundCents = (x: number) => Math.sign(x) * Math.round(Math.abs(x) + 1e-9)

/**
 * Pre-tax subtotal of a quote from its tax-included total (the list endpoint returns only the total). The
 * server computes total = subtotal + round(subtotal × GST) + round(subtotal × QST); this finds the subtotal
 * that gives back exactly that total.
 */
export function subtotalFromTotal(total: number, gstRate = 0.05, qstRate = 0.09975): number {
  const totalCents = Math.round(total * 100)
  const guess = Math.round(totalCents / (1 + gstRate + qstRate))
  for (const s of [guess, guess - 1, guess + 1, guess - 2, guess + 2]) {
    if (s + roundCents(s * gstRate) + roundCents(s * qstRate) === totalCents) return s / 100
  }
  return guess / 100
}

// ── Dates ────────────────────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0')

/** Local calendar date (YYYY-MM-DD) of a timestamp or a Date. */
export function localDate(v: string | Date | null | undefined): string {
  if (!v) return ''
  const d = typeof v === 'string' ? new Date(v) : v
  if (Number.isNaN(d.getTime())) return typeof v === 'string' ? v.slice(0, 10) : ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** "YYYY-MM-DD HH:MM" in local time. */
export function localDateTime(v: string | null | undefined): string {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return `${localDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
