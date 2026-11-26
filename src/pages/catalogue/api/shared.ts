/**
 * Catalogue in API mode: one company's catalogue (GET /companies/:id/catalogue?include_inactive=true and
 * GET /companies/:id/work-types?include_inactive=true), shared by every tab through CatalogueApiContext, plus the
 * helpers the tabs use to write it (create / PATCH / DELETE rows, then re-read).
 *
 * Rights (same as the server): edit = admin or coordination of the company (and `catalogue.edit`), delete = admin;
 * cost prices and target margins only reach admin and coordination (the keys are absent otherwise).
 */
import { createContext, useContext, type ReactNode } from 'react'
import type { ApiCatalogue, ApiWorkType, CatalogueEntityKey, ObligationForm, Uuid } from '../../../api/types'
import type { CompanyId } from '../../../data/mock'

export interface CatalogueApi {
  slug: CompanyId
  uuid: Uuid
  cat: ApiCatalogue
  /** Work types of the company, deactivated ones included. */
  workTypes: ApiWorkType[]
  /** Admin or coordination of this company, with `catalogue.edit`. */
  canEdit: boolean
  /** Admin of this company (and canEdit). */
  canDelete: boolean
  /** Admin or coordination: cost prices and target margins are in the data. */
  showCosts: boolean
  /** A write is in progress. */
  busy: boolean
  /** Runs a write, toasts `done` (or the error), then re-reads the catalogue (and the work types). True when it worked. */
  run: (work: () => Promise<unknown>, done?: string, opts?: { workTypes?: boolean }) => Promise<boolean>
  /** Confirms, deletes a catalogue row; on 409 IN_USE offers to deactivate it instead. */
  remove: (key: CatalogueEntityKey, id: Uuid, o: { title: string; body?: ReactNode; done: string; workTypes?: boolean }) => Promise<boolean>
  /** Forget the cached catalogue (quote screens) and re-read this one. */
  refresh: (opts?: { workTypes?: boolean }) => Promise<void>
  /** Company picker (« Compagnie ») to place in the tab's toolbar. */
  companyPicker: ReactNode
}

export const CatalogueApiContext = createContext<CatalogueApi | null>(null)
export function useCatalogueApi(): CatalogueApi {
  const c = useContext(CatalogueApiContext)
  if (!c) throw new Error('useCatalogueApi outside ApiCatalogueTabs')
  return c
}

// ── Ordering ─────────────────────────────────────────────────────────────────
type Sorted = { id: string; sort_order: number }

/** Rows by sort_order (stable: equal positions keep the server order). */
export const bySort = <T extends Sorted>(rows: readonly T[]): T[] => [...rows].sort((a, b) => a.sort_order - b.sort_order)

/** Position for a new row: after the last one. */
export const nextSort = (rows: readonly Sorted[]) => (rows.length ? Math.max(...rows.map((r) => r.sort_order)) + 1 : 0)

/**
 * Swaps two rows of an ordered list and numbers the list 0, 1, 2…; returns only the rows whose sort_order changes
 * (each one is a PATCH { sort_order }).
 */
export function swapOrder(all: readonly Sorted[], aId: string, bId: string): Sorted[] {
  const list = [...all]
  const a = list.findIndex((r) => r.id === aId)
  const b = list.findIndex((r) => r.id === bId)
  if (a < 0 || b < 0 || a === b) return []
  ;[list[a], list[b]] = [list[b], list[a]]
  return list.flatMap((r, i) => (r.sort_order === i ? [] : [{ id: r.id, sort_order: i }]))
}

// ── Values the server accepts ────────────────────────────────────────────────
/** Catalogue cost / sell price: up to 8 digits and 4 decimals. */
export const PRICE_RE = /^\d{1,8}(\.\d{1,4})?$/
/** Money (add-on default amount): up to 10 digits and 2 decimals. */
export const AMOUNT_RE = /^\d{1,10}(\.\d{1,2})?$/
/** Quantity: up to 9 digits and 3 decimals. */
export const QTY_RE = /^\d{1,9}(\.\d{1,3})?$/
/** Category target margin: percent string, ≤ 99.99. */
export const PCT_RE = /^\d{1,2}(\.\d{1,3})?$/

/** "12,50 $" → "12.50" (spaces, $ and % removed, decimal comma accepted). */
export const cleanDecimal = (s: string) => s.replace(/[\s $%]/g, '').replace(',', '.')

/** Decimal string → the text of an input ("12.5000" → "12.5"). */
export const decimalText = (d: string | null | undefined) => (d === null || d === undefined || d === '' ? '' : String(Number(d)))

/** https link of at most 500 characters (the server's rule for video_url). */
export function isHttpsUrl(s: string) {
  if (s.length > 500 || !s.startsWith('https://')) return false
  try {
    new URL(s)
    return true
  } catch {
    return false
  }
}

/** Obligation sheet of a work type (French labels, as in the quote editor). */
export const OBLIGATION_FORMS: [ObligationForm, string][] = [
  ['pitched_roof', 'Toit en pente'],
  ['flat_roof', 'Toit plat'],
  ['metal_roof', 'Toit en métal'],
  ['gutter', 'Gouttières'],
  ['renovation', 'Rénovation'],
]

/** Units offered for a cost item (same list as the mock CostItemsTab; any other unit already saved is kept). */
export const UNITS = ['paq.', 'rlx', 'unité', 'boîte', 'jour', 'h', 'pi', 'pi²', 'lot', 'panneau', 'forfait']
