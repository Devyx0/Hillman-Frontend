/**
 * Mock state edited by the Paramètres screens that isn't in `src/data/settings.ts`:
 * company identity (printed on the PDF), phone forwarding, Google Business Profile,
 * the change log and the Logicia import. Mutate only through the functions below
 * (they call `commit()` so `useStore()` subscribers re-render).
 */
import { commit } from '../../../data/store'
import { COMPANIES, type CompanyId } from '../../../data/mock'
import type { ConnectionState } from '../../../data/settings'
import { COMPANY_PROFILES } from '../data'

// ── Company identity ────────────────────────────────────────────────────────
export interface CompanyIdentity {
  /** Uploaded header logo (data URL). Undefined = the built-in logo. */
  logo?: string
  /** Uploaded footer image (data URL). */
  footer?: string
  rbq: string
  neq: string
  tps: string
  tvq: string
  phone: string
  fax: string
  address: string
  mail: string
  site: string
  color: string
  /** Terms printed on the PDF. Undefined = the default text (translated). */
  terms?: string
}

export const COMPANY_IDENTITY: Record<CompanyId, CompanyIdentity> = Object.fromEntries(
  COMPANIES.map((c) => {
    const p = COMPANY_PROFILES[c.id]
    return [c.id, { rbq: c.rbq, neq: p.neq, tps: p.tps, tvq: p.tvq, phone: c.phone, fax: p.fax, address: p.address, mail: p.mail, site: p.site, color: p.color }]
  }),
) as Record<CompanyId, CompanyIdentity>

export function saveIdentity(company: CompanyId, v: CompanyIdentity) {
  COMPANY_IDENTITY[company] = v
  COMPANY_PROFILES[company].color = v.color
  commit()
}

// ── Phone forwarding & Google Business Profile (lead intake) ────────────────
export interface PhoneForwarding {
  /** Tracking number published in ads. */
  number: string
  /** Where calls ring. */
  forwardTo: string
  state: ConnectionState
  /** Create a lead automatically for each new caller. */
  createLead: boolean
}
export const PHONE_FORWARDING: Record<CompanyId, PhoneForwarding> = {
  toit: { number: '418 600-2210', forwardTo: '418 576-1993', state: 'connecte', createLead: true },
  sg: { number: '418 600-2211', forwardTo: '418 915-3443', state: 'connecte', createLead: true },
  reno: { number: '', forwardTo: '418 576-1993', state: 'non_configure', createLead: false },
}
export function savePhoneForwarding(company: CompanyId, v: PhoneForwarding) {
  PHONE_FORWARDING[company] = v
  commit()
}

export const GOOGLE_BUSINESS: Record<CompanyId, { profile: string; state: ConnectionState }> = {
  toit: { profile: 'Toitures Hillman — Québec', state: 'connecte' },
  sg: { profile: 'Signature Gouttières', state: 'en_attente' },
  reno: { profile: '', state: 'non_configure' },
}
export function saveGoogleBusiness(company: CompanyId, v: { profile: string; state: ConnectionState }) {
  GOOGLE_BUSINESS[company] = v
  commit()
}

/** Which company / source a website-form or Google lead lands in. */
export const INTAKE_MAPPING: Record<CompanyId, { websiteSource: string; googleSource: string; assignTo: string }> = {
  toit: { websiteSource: 'Site web', googleSource: 'Google', assignTo: 'auto' },
  sg: { websiteSource: 'Site web', googleSource: 'Google', assignTo: 'auto' },
  reno: { websiteSource: 'Site web', googleSource: 'Google', assignTo: 'auto' },
}
export function saveIntakeMapping(company: CompanyId, v: (typeof INTAKE_MAPPING)[CompanyId]) {
  INTAKE_MAPPING[company] = v
  commit()
}

// ── Change log ──────────────────────────────────────────────────────────────
export type ChangeArea = 'soumissions' | 'agenda' | 'parametres' | 'utilisateurs' | 'catalogue'
export interface ChangeEntry {
  id: string
  /** YYYY-MM-DD HH:mm */
  at: string
  who: string
  area: ChangeArea
  /** French template (translated on display) + its variables. */
  what: string
  vars?: Record<string, string | number>
}
export const CHANGE_LOG: ChangeEntry[] = [
  { id: 'a1', at: '2026-10-20 08:52', who: 'Jean-Pierre Hillman', area: 'soumissions', what: 'A modifié le prix de H64320 (17 900 $ → 18 450 $)' },
  { id: 'a2', at: '2026-10-20 08:31', who: 'Pierre-Luc Cloutier', area: 'soumissions', what: 'A envoyé la soumission G64196' },
  { id: 'a3', at: '2026-10-19 17:02', who: 'Hélène Petitpas', area: 'agenda', what: 'A déplacé un rendez-vous de Dany Pelletier' },
  { id: 'a4', at: '2026-10-19 09:40', who: 'Olivier Fontaine', area: 'soumissions', what: 'A modifié le statut de G64251 (À rappeler → Signé)' },
  { id: 'a5', at: '2026-10-18 15:12', who: 'Jean-Pierre Hillman', area: 'catalogue', what: 'A appliqué une marge de 30 % au catalogue' },
  { id: 'a6', at: '2026-10-17 10:05', who: 'Jean-Pierre Hillman', area: 'utilisateurs', what: 'A invité Benoit Tondreau' },
]

const stamp = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** Record a change made in the settings/catalogue screens. `what` is a French template. */
export function logChange(who: string, area: ChangeArea, what: string, vars?: Record<string, string | number>) {
  CHANGE_LOG.unshift({ id: 'a' + Date.now() + Math.random().toString(36).slice(2, 5), at: stamp(), who, area, what, vars })
  commit()
}

// ── Logicia import (admin) ──────────────────────────────────────────────────
export interface ImportError {
  id: string
  /** Record in Logicia (client name or quote no). */
  record: string
  kind: 'client' | 'soumission' | 'pdf'
  /** French reason. */
  reason: string
}
export interface ImportState {
  status: 'termine' | 'en_cours' | 'erreur'
  lastRun: string
  /** 0–100 while running. */
  progress: number
  counts: { clients: number; quotes: number; pdfs: number }
  totals: { clients: number; quotes: number; pdfs: number }
  errors: ImportError[]
}
export const LOGICIA_IMPORT: ImportState = {
  status: 'termine',
  lastRun: '2026-10-19 02:14',
  progress: 100,
  counts: { clients: 5824, quotes: 9311, pdfs: 9187 },
  totals: { clients: 5841, quotes: 9326, pdfs: 9326 },
  errors: [
    { id: 'e1', record: 'Gaétan Bélanger', kind: 'client', reason: 'Adresse incomplète (code postal manquant)' },
    { id: 'e2', record: 'Marie-Ève Lachance', kind: 'client', reason: 'Doublon probable (même téléphone que C-60412)' },
    { id: 'e3', record: 'H58210', kind: 'soumission', reason: 'Client introuvable dans Logicia' },
    { id: 'e4', record: 'G59934', kind: 'soumission', reason: 'Montant total illisible' },
    { id: 'e5', record: 'H57102.pdf', kind: 'pdf', reason: 'Fichier PDF corrompu' },
    { id: 'e6', record: 'G56021.pdf', kind: 'pdf', reason: 'Fichier introuvable sur le serveur Logicia' },
  ],
}

let importTimer: number | undefined
/** Re-run the import (mock): progress ticks, then fixes a couple of errors. */
export function rerunImport(onDone?: (ok: boolean) => void) {
  if (LOGICIA_IMPORT.status === 'en_cours') return
  LOGICIA_IMPORT.status = 'en_cours'
  LOGICIA_IMPORT.progress = 0
  commit()
  importTimer = window.setInterval(() => {
    LOGICIA_IMPORT.progress = Math.min(100, LOGICIA_IMPORT.progress + 7 + Math.round(Math.random() * 8))
    if (LOGICIA_IMPORT.progress >= 100) {
      window.clearInterval(importTimer)
      LOGICIA_IMPORT.status = 'termine'
      LOGICIA_IMPORT.lastRun = stamp()
      // Retried records: the two "duplicate"/"missing client" cases resolve.
      const fixed = LOGICIA_IMPORT.errors.filter((e) => e.id === 'e2' || e.id === 'e3')
      LOGICIA_IMPORT.errors = LOGICIA_IMPORT.errors.filter((e) => !fixed.includes(e))
      for (const f of fixed) {
        if (f.kind === 'client') LOGICIA_IMPORT.counts.clients++
        if (f.kind === 'soumission') LOGICIA_IMPORT.counts.quotes++
      }
      onDone?.(true)
    }
    commit()
  }, 350)
}
export function dismissImportError(id: string) {
  LOGICIA_IMPORT.errors = LOGICIA_IMPORT.errors.filter((e) => e.id !== id)
  commit()
}
