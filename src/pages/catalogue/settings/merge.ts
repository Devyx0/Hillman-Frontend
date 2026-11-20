/** Merge fields available in message templates, and a sample renderer for previews. */
import { COMPANIES, type CompanyId } from '../../../data/mock'
import { NUMBERING } from '../../../data/settings'

/** Canonical (French) merge-field names, as written in templates. */
export const MERGE_FIELDS = ['prénom', 'représentant', 'compagnie', 'no', 'date'] as const

export const MERGE_LABELS: Record<(typeof MERGE_FIELDS)[number], string> = {
  prénom: 'Prénom du client',
  représentant: 'Nom du représentant',
  compagnie: 'Nom de la compagnie',
  no: 'No de soumission',
  date: 'Date du rendez-vous',
}

/** Fill a template with sample values for a preview. */
export function renderSample(body: string, company: CompanyId | 'all', sampleDate: string) {
  const c = COMPANIES.find((x) => x.id === (company === 'all' ? 'toit' : company))!
  const n = NUMBERING[c.id]
  const values: Record<string, string> = { prénom: 'Catherine', représentant: 'Jean-Pierre Hillman', compagnie: c.name, no: `${n.prefix}${n.next}`, date: sampleDate }
  return body.replace(/\{([^}]+)\}/g, (m, k: string) => values[k] ?? m)
}

/** SMS segments: 160 GSM characters, or 70 when the text has characters outside GSM-7 (emoji…). */
export function smsSegments(text: string) {
  const gsm = /^[\n\r -~£¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ¤¡ÄÖÑÜ§¿äöñüà€^{}\\[\]~|]*$/.test(text)
  const single = gsm ? 160 : 70
  const multi = gsm ? 153 : 67
  const len = text.length
  return { len, unicode: !gsm, segments: len <= single ? 1 : Math.ceil(len / multi) }
}
