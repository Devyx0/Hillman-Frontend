/**
 * Client-portal helpers. Pricing, tiers, CAA and scope all come from the quote builder
 * (`quotePricing`, `setGutterChoice`, `quoteScope` in data/quote-builder.ts) so the portal can never
 * disagree with the builder (PDF 3.2). Only the drawn signature image is kept here, for the session.
 */
import { CAA_RATE, fillClause, getDraft, quotePricing, quoteScope, setGutterChoice, type PriceLine, type QuotePricing, type TierId } from '../../data/quote-builder'
import { PAYMENT_SCHEDULES } from '../../data/settings'
import type { QuoteRecord } from '../../data/store'
import { t } from '../../i18n'

export { CAA_RATE, type PriceLine, type TierId }
export type Pricing = Pick<QuotePricing, 'lines' | 'tiers' | 'tier' | 'caaDiscount' | 'subtotal' | 'gst' | 'qst' | 'total'>

/** Days the consumer has to cancel after signing (art. 58 LPC). */
export const CANCELLATION_DAYS = 10

/** Label of a priced line in the current language. */
export const lineLabel = (l: PriceLine) => t(l.label, { item: l.item ? t(l.item) : '', n: CAA_RATE * 100 })

/** Same breakdown as the builder (header, Prix, PDF). */
export const portalPricing = (q: QuoteRecord): Pricing => quotePricing(q)

/** The client's protection tier / CAA choice: saved on the quote's draft and its amount. */
export const choicesOf = (q: QuoteRecord) => {
  const d = getDraft(q)
  return { tier: d.tier, caa: d.caa, caaNo: d.caaNo }
}
export const setChoice = (q: QuoteRecord, patch: { tier?: TierId; caa?: boolean; caaNo?: string }) => setGutterChoice(q.id, patch)

// ── Drawn signature (session only until the backend stores it) ─────────────
const SIGNATURE_IMAGES: Record<string, string> = {}
export const signatureImage = (id: string): string | undefined => SIGNATURE_IMAGES[id]
export function saveSignatureImage(id: string, dataUrl?: string) {
  if (dataUrl) SIGNATURE_IMAGES[id] = dataUrl
}

/**
 * Scope shown to the client: the clauses the rep ticked in the builder (tokens filled in, translated),
 * grouped by section without exclusions, and the ticked exclusions.
 */
export function portalScope(q: QuoteRecord): { included: { name: string; lines: string[] }[]; exclusions: string[] } {
  const { sections, checked, values } = quoteScope(q)
  const show = (l: string) => fillClause(t(l), values)
  const included = sections
    .filter((s) => s.name !== 'Exclusions')
    .map((s) => ({ name: s.name, lines: s.lines.filter((l) => checked.has(l)).map(show) }))
    .filter((s) => s.lines.length)
  const exclusions = (sections.find((s) => s.name === 'Exclusions')?.lines ?? []).filter((l) => checked.has(l)).map(show)
  return { included, exclusions }
}

const round5 = (n: number) => Math.round(n / 5) * 5

/** Rénovations: the price split by budget category, in proportion to the builder's selling prices. */
export function renoBudget(q: QuoteRecord, subtotal: number): { cat: string; amount: number }[] {
  const byCat = new Map<string, number>()
  for (const l of getDraft(q).costs) byCat.set(l.cat, (byCat.get(l.cat) ?? 0) + l.qty * l.sell)
  const sum = [...byCat.values()].reduce((n, v) => n + v, 0) || 1
  const rows = [...byCat.entries()].filter(([, v]) => v > 0).map(([cat, v]) => ({ cat, amount: round5((v / sum) * subtotal) }))
  if (rows.length) rows[rows.length - 1].amount += subtotal - rows.reduce((n, r) => n + r.amount, 0)
  return rows
}

/** Rénovations: the project description written by the rep in the builder, if any. */
export const renoDescription = (q: QuoteRecord) => getDraft(q).description.trim()

/** Payment schedule of the quote's company, with amounts on the total. */
export const paymentSchedule = (q: QuoteRecord, total: number) => PAYMENT_SCHEDULES[q.company].map((s) => ({ ...s, amount: (total * s.pct) / 100 }))

/** Statuses meaning the quote is accepted (signed online or at the office). */
export const SIGNED_STATUSES = ['Signé', 'Payé', 'Terminé']

/** Signature record, with a fallback for quotes marked signed at the office. */
export function signatureOf(q: QuoteRecord, clientName: string) {
  return q.signature ?? { name: clientName, at: q.date + 'T12:00:00', ip: '', device: 'portal' as const }
}

/** Last moment the consumer can cancel (10 days after the signing day). */
export function cancellationDeadline(signedAt: string) {
  const d = new Date(signedAt)
  d.setDate(d.getDate() + CANCELLATION_DAYS)
  d.setHours(23, 59, 59, 999)
  return d
}

/** Whether the art. 58 cancellation is still open for this quote. */
export const canCancel = (q: QuoteRecord) => !!q.signature && q.status === 'Signé' && !q.cancellation && Date.now() <= cancellationDeadline(q.signature.at).getTime()

/** Offer validity: 30 days after the quote date. */
export function validUntil(q: QuoteRecord) {
  const d = new Date(q.date + 'T12:00')
  d.setDate(d.getDate() + 30)
  return d
}
