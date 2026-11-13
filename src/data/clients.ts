import type { Scope } from '../context/AppContext'
import { QUOTES, type Client, type CompanyId } from './mock'
import { t } from '../i18n'

/** Companies that have served a client (mockup: `m4`). */
export function companiesServing(client: Client): CompanyId[] {
  const set = new Set<CompanyId>(QUOTES.filter((q) => q.clientId === client.id).map((q) => q.company))
  const n = parseInt(client.id.slice(1), 10)
  if (n % 4 === 0) set.add('sg')
  if (n % 7 === 0) set.add('toit')
  if (client.id === 'c66700') {
    set.add('sg')
    set.add('toit')
  }
  return [...set]
}

/** Relative day label (mockup: `f4`). */
export const relativeDay = (iso: string) => {
  const days = Math.round((new Date(2026, 9, 20).getTime() - new Date(iso + 'T12:00').getTime()) / 864e5)
  return days <= 0 ? t("Aujourd'hui") : days === 1 ? t('Hier') : t('Il y a {n} j', { n: days })
}

/** Total client count per account, as the real database would report (mockup: `h4`). */
export const TOTAL_CLIENTS: Record<Scope, number> = { all: 66683, toit: 21940, sg: 41210, reno: 6870 }
