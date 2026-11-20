import { LEADS, QUOTES, clientById, fullName, type CompanyId } from './mock'
import type { QuoteRecord } from './store'

export type PipelineColumnId = 'lead' | 'visite' | 'soumission' | 'suivi' | 'signe' | 'annee' | 'refuse'

interface PipelineColumn {
  id: PipelineColumnId
  label: string
  hint: string
  prob: number
}

/** Kanban columns (mockup: `zo`). */
export const PIPELINE_COLUMNS: PipelineColumn[] = [
  { id: 'lead', label: 'Nouveau lead', hint: 'Leads à qualifier', prob: 10 },
  { id: 'visite', label: 'Visite planifiée', hint: 'Estimation au calendrier', prob: 25 },
  { id: 'soumission', label: 'En soumission', hint: 'Envoyée au client', prob: 40 },
  { id: 'suivi', label: 'Suivi', hint: 'À rappeler · Rappel envoyé', prob: 35 },
  { id: 'signe', label: 'Signé', hint: 'Prêt pour la planification', prob: 100 },
  { id: 'annee', label: 'Année prochaine', hint: 'Réactivation au printemps', prob: 15 },
  { id: 'refuse', label: 'Refusé', hint: 'Avec raison du refus', prob: 0 },
]

/** Quote status → column (mockup: `q3`). */
const STATUS_COLUMN: Record<string, PipelineColumnId> = {
  'En soumission': 'soumission',
  'En cours': 'soumission',
  'À rappeler': 'suivi',
  'Rappel courriel envoyé': 'suivi',
  'Client va nous rappeler': 'suivi',
  'Erreur du rappel courriel': 'suivi',
  Signé: 'signe',
  'À rappeler (année prochaine)': 'annee',
  Refusé: 'refuse',
}

/** Column a quote status belongs to (undefined: not on the board, e.g. Payé, Terminé). */
export const columnForStatus = (status: string): PipelineColumnId | undefined => STATUS_COLUMN[status]

/** Columns a quote card can be dropped in (lead / visit columns are for leads only). */
export const QUOTE_COLUMNS: PipelineColumnId[] = ['soumission', 'suivi', 'signe', 'annee', 'refuse']

/** Column → status label applied when a card is moved there (mockup: `O3`). */
export const COLUMN_STATUS: Record<PipelineColumnId, string> = {
  lead: 'Nouveau lead',
  visite: 'Visite planifiée',
  soumission: 'En soumission',
  suivi: 'À rappeler',
  signe: 'Signé',
  annee: 'À rappeler (année prochaine)',
  refuse: 'Refusé',
}

/** Default rep per company (mockup: `_3`). */
const DEFAULT_REP: Record<CompanyId, string> = { toit: 'jph', sg: 'plc', reno: 'pau' }
/** Estimated deal size for a lead per company (mockup: `B3`). */
const LEAD_ESTIMATE: Record<CompanyId, number> = { toit: 16500, sg: 2100, reno: 45000 }

export interface Deal {
  id: string
  quoteId?: string
  no: string
  name: string
  company: CompanyId
  amount: number
  repId: string
  days: number
  views: number
  prob: number
  col: PipelineColumnId
  work: string
  ai?: boolean
  statusLabel: string
  month: number
  /** Refusal reason (refused quotes). */
  reason?: string
  /** Automatic follow-ups paused on this quote. */
  paused?: boolean
}

/** Builds pipeline cards from leads + quotes (mockup: `L3`). Call it on every store change (`useStore`). */
export function buildDeals(): Deal[] {
  const deals: Deal[] = []
  LEADS.filter((l) => l.status !== 'Non qualifié' && l.status !== 'Converti').forEach((l, i) =>
    deals.push({
      id: l.id,
      no: 'Lead',
      name: l.name,
      company: l.company,
      amount: LEAD_ESTIMATE[l.company],
      repId: l.repId ?? DEFAULT_REP[l.company],
      days: i < 4 ? 0 : 1 + (i % 3),
      views: 0,
      prob: Math.round(l.score / 6),
      col: l.status === 'RDV réservé' ? 'visite' : 'lead',
      work: l.aiSummary.split('·')[0].trim(),
      ai: l.channel === 'Agent IA' || l.status === 'RDV réservé',
      statusLabel: l.status,
      month: 10,
    }),
  )
  QUOTES.forEach((q, i) => {
    const col = STATUS_COLUMN[q.status]
    if (!col) return
    const base = PIPELINE_COLUMNS.find((c) => c.id === col)!.prob
    const prob = col === 'signe' ? 100 : col === 'refuse' ? 0 : Math.min(94, base + q.views * 9 + (q.hot ? 12 : 0) - Math.floor(q.daysInStatus / 4) * 3)
    deals.push({
      id: q.id,
      quoteId: q.id,
      no: q.no,
      name: fullName(clientById(q.clientId)!),
      company: q.company,
      amount: q.amount,
      repId: q.repId,
      days: q.daysInStatus,
      views: q.views,
      prob: Math.max(4, prob),
      col,
      work: q.workType,
      statusLabel: q.status,
      month: 10 + (i % 3),
      reason: (q as QuoteRecord).refusalReason,
      paused: (q as QuoteRecord).followUpPaused,
    })
  })
  return deals
}

export type AmountRange = 'all' | 'lt2' | '2-10' | '10-25' | 'gt25'

/** Amount filter options (mockup: `H3`). */
export const AMOUNT_RANGES: { value: AmountRange; label: string }[] = [
  { value: 'all', label: 'Tous les montants' },
  { value: 'lt2', label: 'Moins de 2 000 $' },
  { value: '2-10', label: '2 000 – 10 000 $' },
  { value: '10-25', label: '10 000 – 25 000 $' },
  { value: 'gt25', label: 'Plus de 25 000 $' },
]

/** Mockup: `G3`. */
export const inAmountRange = (amount: number, range: AmountRange) =>
  range === 'all' || (range === 'lt2' && amount < 2000) || (range === '2-10' && amount >= 2000 && amount < 10000) || (range === '10-25' && amount >= 10000 && amount < 25000) || (range === 'gt25' && amount >= 25000)

/** Colour of the "days in stage" chip (mockup: `U3`). */
export function ageTone(days: number) {
  return days <= 3 ? 'text-tone-good-ink bg-tone-good-soft' : days <= 10 ? 'text-tone-warn-ink bg-tone-warn-soft' : 'text-tone-critical-ink bg-tone-critical-soft'
}
