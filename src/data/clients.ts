import type { Scope } from '../context/AppContext'
import { QUOTES, TODAY, type Client, type CompanyId } from './mock'
import { API_MODE } from '../api/config'
import { t } from '../i18n'

/**
 * Companies a client was created for in this session (a new client has no quote yet but must
 * still show in that company's list). The backend will keep this on the client record.
 */
export const CLIENT_COMPANIES: Record<string, CompanyId[]> = {}

/** Remember which company a new client belongs to. Call right after `addClient`. */
export function registerClientCompany(clientId: string, company: CompanyId) {
  const list = (CLIENT_COMPANIES[clientId] ??= [])
  if (!list.includes(company)) list.push(company)
}

/** Seeded mock clients have ids c66637 – c66700; newer ids are created in the session. */
const isSeeded = (id: string) => parseInt(id.slice(1), 10) <= 66700

/** Companies that have served a client (mockup: `m4`). */
export function companiesServing(client: Client): CompanyId[] {
  // API mode: a client record belongs to exactly one company.
  if (API_MODE) return client.companyId ? [client.companyId] : []
  const set = new Set<CompanyId>(QUOTES.filter((q) => q.clientId === client.id).map((q) => q.company))
  for (const c of CLIENT_COMPANIES[client.id] ?? []) set.add(c)
  const n = parseInt(client.id.slice(1), 10)
  if (isSeeded(client.id) && n % 4 === 0) set.add('sg')
  if (isSeeded(client.id) && n % 7 === 0) set.add('toit')
  if (client.id === 'c66700') {
    set.add('sg')
    set.add('toit')
  }
  return [...set]
}

/** Relative day label (mockup: `f4`). */
export const relativeDay = (iso: string) => {
  const days = Math.round((new Date(TODAY + 'T12:00').getTime() - new Date(iso + 'T12:00').getTime()) / 864e5)
  return days <= 0 ? t("Aujourd'hui") : days === 1 ? t('Hier') : t('Il y a {n} j', { n: days })
}

/** Total client count per account, as the real database would report (mockup: `h4`). */
export const TOTAL_CLIENTS: Record<Scope, number> = { all: 66683, toit: 21940, sg: 41210, reno: 6870 }
