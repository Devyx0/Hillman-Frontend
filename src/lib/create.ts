/**
 * Global "create" bus. Any screen can open the create flows (mounted once in the layout by
 * `<CreateHost/>` from `src/components/create/`):
 *
 *   openCreate('quote', { clientId, leadId })
 *   openCreate('client')
 *   openCreate('lead', { company: 'sg' })
 */
import type { CompanyId } from '../data/mock'

export type CreateKind = 'quote' | 'client' | 'lead'

export interface CreatePrefill {
  company?: CompanyId
  clientId?: string
  leadId?: string
  /** For a new client created from a lead or the quote flow. */
  name?: string
  phone?: string
  email?: string
  city?: string
  source?: string
}

let listener: ((kind: CreateKind, prefill: CreatePrefill) => void) | null = null

export function onCreate(fn: typeof listener) {
  listener = fn
}

export function openCreate(kind: CreateKind, prefill: CreatePrefill = {}) {
  listener?.(kind, prefill)
}
