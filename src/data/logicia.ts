/**
 * Read-only history imported from Logicia, the quoting software used before Hillman Centrale.
 * Past quotes are shown on the client record with their original PDF; nothing here can be
 * edited. Mock data: the backend will serve the imported records (and PDFs) per client.
 */
import { CLIENTS, type CompanyId } from './mock'

export interface LogiciaQuote {
  id: string
  /** Logicia's own number (kept as printed on the PDF). */
  no: string
  clientId: string
  company: CompanyId
  /** ISO date. */
  date: string
  /** Before taxes. */
  amount: number
  /** Canonical French status, as exported from Logicia. */
  status: 'Acceptée' | 'Refusée' | 'Expirée' | 'Facturée'
  workType: string
  /** File name of the archived PDF. */
  pdf: string
  /** Who prepared it in Logicia. */
  by: string
}

const WORK: Record<CompanyId, string[]> = {
  toit: ['Toit en pente · Bardeaux', 'Réparation toiture', 'Toit plat · Élastomère'],
  sg: ['Gouttières · T-Rex M-5200', 'Nettoyage de gouttières', 'Soffite / Fascia'],
  reno: ['Cuisine', 'Salle de bain', 'Revêtement extérieur'],
}
const BY: Record<CompanyId, string> = { toit: 'Jean-Pierre Hillman', sg: 'Pierre-Luc Cloutier', reno: 'Philippe Audet' }
const RANGE: Record<CompanyId, [number, number]> = { toit: [4200, 21000], sg: [240, 3900], reno: [7800, 46000] }
const STATUSES: LogiciaQuote['status'][] = ['Facturée', 'Acceptée', 'Refusée', 'Expirée', 'Facturée']
const COMPANY_ORDER: CompanyId[] = ['sg', 'toit', 'reno']

function make(clientId: string, i: number, company: CompanyId, year: number, month: number, amount: number, status: LogiciaQuote['status'], workType: string): LogiciaQuote {
  const no = `L${company === 'toit' ? 'T' : company === 'sg' ? 'G' : 'R'}-${year}-${String(((parseInt(clientId.slice(1), 10) * 37 + i * 101) % 9000) + 1000)}`
  return {
    id: `${clientId}-lg${i}`,
    no,
    clientId,
    company,
    date: `${year}-${String(month).padStart(2, '0')}-${String(((i * 11 + 3) % 27) + 1).padStart(2, '0')}`,
    amount,
    status,
    workType,
    pdf: `Logicia_${no}.pdf`,
    by: BY[company],
  }
}

/** Deterministic history: about two clients in three have 1–3 past Logicia quotes. */
function build(): LogiciaQuote[] {
  const out: LogiciaQuote[] = []
  for (const c of CLIENTS) {
    const n = parseInt(c.id.slice(1), 10)
    if (n > 66700) continue // created in Hillman Centrale: no Logicia past
    const count = n % 3 === 0 ? 0 : (n % 3) + (n % 5 === 0 ? 1 : 0)
    for (let i = 0; i < count; i++) {
      const company = COMPANY_ORDER[(n + i) % 3]
      const [min, max] = RANGE[company]
      const amount = Math.round((min + (((n * 13 + i * 29) % 100) / 100) * (max - min)) / 5) * 5
      out.push(make(c.id, i, company, 2018 + ((n + i * 2) % 7), ((n + i * 5) % 12) + 1, amount, STATUSES[(n + i) % STATUSES.length], WORK[company][(n + i) % 3]))
    }
  }
  return out
}

export const LOGICIA_QUOTES: LogiciaQuote[] = [
  // Isabelle Gagnon (demo client)
  { id: 'c66700-lg0', no: 'LG-2021-3114', clientId: 'c66700', company: 'sg', date: '2021-04-12', amount: 2500, status: 'Facturée', workType: 'Gouttières · T-Rex M-5200', pdf: 'Logicia_LG-2021-3114.pdf', by: 'Pierre-Luc Cloutier' },
  { id: 'c66700-lg1', no: 'LT-2019-0842', clientId: 'c66700', company: 'toit', date: '2019-06-03', amount: 1150, status: 'Facturée', workType: 'Réparation toiture', pdf: 'Logicia_LT-2019-0842.pdf', by: 'Jean-Pierre Hillman' },
  { id: 'c66700-lg2', no: 'LT-2018-0517', clientId: 'c66700', company: 'toit', date: '2018-09-20', amount: 14800, status: 'Refusée', workType: 'Toit en pente · Bardeaux', pdf: 'Logicia_LT-2018-0517.pdf', by: 'Jean-Pierre Hillman' },
  ...build().filter((q) => q.clientId !== 'c66700'),
]

/** Past Logicia quotes for a client, newest first. */
export const logiciaForClient = (clientId: string) => LOGICIA_QUOTES.filter((q) => q.clientId === clientId).sort((a, b) => b.date.localeCompare(a.date))

export const LOGICIA_TONE: Record<LogiciaQuote['status'], 'good' | 'critical' | 'neutral' | 'info'> = {
  Acceptée: 'info',
  Facturée: 'good',
  Refusée: 'critical',
  Expirée: 'neutral',
}
