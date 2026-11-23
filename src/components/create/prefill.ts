/** Prefill helpers for the create flows (kept apart from the components for fast refresh). */
import { LEAD_PROFILES, type LeadRecord } from '../../data/leads'
import type { CreatePrefill } from '../../lib/create'

/** "Isabelle Gagnon" → { first: 'Isabelle', last: 'Gagnon' }. */
export function splitName(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return { first: parts[0] ?? '', last: '' }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

/** Prefill for a new client: the create-bus fields plus the street address and client type. */
export interface ClientPrefill extends CreatePrefill {
  no?: string
  street?: string
  postal?: string
  /** 'Résidentiel' | 'Commercial' | 'Entrepreneur' */
  type?: string
  /** Business name for a commercial / contractor client. */
  companyName?: string
}

const POSTAL_IN_TEXT = /\b([A-Za-z]\d[A-Za-z])[ -]?(\d[A-Za-z]\d)\s*$/

/**
 * "1142, avenue Royale, Beauport G1E 1X5" → { no: '1142', street: 'avenue Royale', city: 'Beauport', postal: 'G1E 1X5' }.
 * Anything that does not look like an address ("Limoilou (adresse à confirmer)") returns {}.
 */
export function parseAddress(address = ''): { no?: string; street?: string; city?: string; postal?: string } {
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length < 2 || !/^\d+[A-Za-z]?(-\d+)?$/.test(parts[0])) return {}
  const no = parts[0]
  let street: string
  let tail: string
  if (parts.length >= 3) {
    street = parts.slice(1, -1).join(', ')
    tail = parts[parts.length - 1]
  } else {
    street = parts[1]
    tail = ''
  }
  let postal: string | undefined
  const m = POSTAL_IN_TEXT.exec(tail)
  if (m) {
    postal = `${m[1]} ${m[2]}`.toUpperCase()
    tail = tail.slice(0, m.index).trim()
  }
  return { no, street, city: tail || undefined, postal }
}

/** Everything a lead knows about the person, ready for the new-client form. */
export function leadClientPrefill(lead: LeadRecord | undefined, prefill: CreatePrefill = {}): ClientPrefill {
  const profile = lead ? LEAD_PROFILES[lead.id] : undefined
  const addr = parseAddress(profile?.address)
  const name = prefill.name ?? lead?.name
  const type = profile?.type ?? 'Résidentiel'
  return {
    ...prefill,
    name,
    phone: prefill.phone ?? lead?.phone,
    email: prefill.email ?? lead?.email,
    city: addr.city ?? prefill.city ?? lead?.city,
    source: prefill.source ?? lead?.channel,
    company: prefill.company ?? lead?.company,
    no: addr.no,
    street: addr.street,
    postal: addr.postal,
    type,
    companyName: type !== 'Résidentiel' ? name : undefined,
  }
}
