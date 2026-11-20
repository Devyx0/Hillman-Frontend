/**
 * Company-level settings that several screens read and the Settings screens edit:
 * lead sources, quote statuses, quote numbering, payment schedules, follow-up sequences,
 * connections (texting number, sending email domain), message templates, Loi 25 wording.
 *
 * Values are French (canonical); display them with `t()`. Mutate only through the functions
 * here (they call `commit()` so `useStore()` subscribers re-render).
 */
import { commit } from './store'
import { QUOTE_STATUSES, SOURCES, type CompanyId } from './mock'

// ── Lead sources (editable list) ────────────────────────────────────────────
export interface LeadSource {
  id: string
  name: string
  active: boolean
  /** Where the lead comes from technically. */
  kind: 'manuel' | 'formulaire' | 'google' | 'telephone' | 'ia'
}

const KIND: Record<string, LeadSource['kind']> = { 'Site web': 'formulaire', Google: 'google', 'Appel entrant': 'telephone', 'Agent IA': 'ia' }
/** Facebook intake is phase 2: the source stays for historical leads but is inactive. */
const PHASE_2_SOURCES = ['Facebook']
export const LEAD_SOURCES: LeadSource[] = SOURCES.map((name, i) => ({ id: 's' + i, name, active: !PHASE_2_SOURCES.includes(name), kind: KIND[name] ?? 'manuel' }))

export function saveLeadSource(s: LeadSource) {
  const i = LEAD_SOURCES.findIndex((x) => x.id === s.id)
  if (i >= 0) LEAD_SOURCES[i] = s
  else LEAD_SOURCES.push(s)
  commit()
}
export function removeLeadSource(id: string) {
  const i = LEAD_SOURCES.findIndex((x) => x.id === id)
  if (i >= 0) LEAD_SOURCES.splice(i, 1)
  commit()
}
export const activeSources = () => LEAD_SOURCES.filter((s) => s.active).map((s) => s.name)

// ── Quote statuses ──────────────────────────────────────────────────────────
export interface StatusDef {
  name: string
  /** Badge tone. */
  tone: 'info' | 'accent' | 'warn' | 'neutral' | 'good' | 'critical'
  /** Ends the automatic follow-up sequence. */
  stopsFollowUps: boolean
  /** Built-in statuses can be renamed in the UI but not deleted. */
  system: boolean
}
const TONES: Record<string, StatusDef['tone']> = { 'En soumission': 'info', 'En cours': 'accent', 'À rappeler': 'warn', 'Rappel courriel envoyé': 'warn', Signé: 'good', Terminé: 'good', Payé: 'good', Refusé: 'critical', 'Erreur du rappel courriel': 'critical' }
export const STATUS_DEFS: StatusDef[] = QUOTE_STATUSES.map((name) => ({ name, tone: TONES[name] ?? 'neutral', stopsFollowUps: ['Signé', 'Refusé', 'Terminé', 'Payé'].includes(name), system: true }))

export function saveStatuses(list: StatusDef[]) {
  STATUS_DEFS.splice(0, STATUS_DEFS.length, ...list)
  commit()
}

/** Reasons offered when a quote is marked refused. */
export const REFUSAL_REASONS = ['Prix trop élevé', 'A choisi un concurrent', 'Projet reporté', 'Projet annulé', 'Pas de réponse du client', 'Autre']

// ── Quote numbering ─────────────────────────────────────────────────────────
export const NUMBERING: Record<CompanyId, { prefix: string; next: number }> = {
  toit: { prefix: 'H', next: 64321 },
  sg: { prefix: 'G', next: 64321 },
  reno: { prefix: 'R', next: 64321 },
}
export function saveNumbering(company: CompanyId, v: { prefix: string; next: number }) {
  NUMBERING[company] = v
  commit()
}

// ── Payment schedules (per company) ─────────────────────────────────────────
export interface PaymentStep {
  label: string
  pct: number
}
export const PAYMENT_SCHEDULES: Record<CompanyId, PaymentStep[]> = {
  toit: [
    { label: 'Dépôt à la signature', pct: 15 },
    { label: 'Livraison des matériaux', pct: 35 },
    { label: 'Mi-travaux', pct: 35 },
    { label: 'Fin des travaux', pct: 15 },
  ],
  sg: [
    { label: 'Dépôt à la signature', pct: 30 },
    { label: 'Fin des travaux', pct: 70 },
  ],
  reno: [
    { label: 'Dépôt à la signature', pct: 10 },
    { label: 'Fondation et charpente', pct: 30 },
    { label: 'Fermeture du bâtiment', pct: 30 },
    { label: 'Finition intérieure', pct: 20 },
    { label: 'Fin des travaux', pct: 10 },
  ],
}
export function savePaymentSchedule(company: CompanyId, steps: PaymentStep[]) {
  PAYMENT_SCHEDULES[company] = steps
  commit()
}

// ── Follow-up sequences (per company) ───────────────────────────────────────
export interface FollowUpStep {
  id: string
  /** Days after the quote is sent. */
  day: number
  channel: 'sms' | 'email'
  /** Message template id (see MESSAGE_TEMPLATES). */
  templateId: string
}
export interface FollowUpSequence {
  enabled: boolean
  steps: FollowUpStep[]
  /** Stop rules. */
  stopOnReply: boolean
  stopOnSign: boolean
  stopOnRefuse: boolean
  /** Only send between these hours (local time). */
  sendWindow: [number, number]
}
/** Client decision: day 6, 12 and 20, by email and text. */
const DEFAULT_SEQUENCE = (): FollowUpSequence => ({
  enabled: true,
  steps: [
    { id: 'f1', day: 6, channel: 'email', templateId: 'suivi-email' },
    { id: 'f2', day: 6, channel: 'sms', templateId: 'suivi-sms' },
    { id: 'f3', day: 12, channel: 'email', templateId: 'suivi-email' },
    { id: 'f4', day: 12, channel: 'sms', templateId: 'suivi-sms' },
    { id: 'f5', day: 20, channel: 'email', templateId: 'suivi-email' },
    { id: 'f6', day: 20, channel: 'sms', templateId: 'suivi-sms' },
  ],
  stopOnReply: true,
  stopOnSign: true,
  stopOnRefuse: true,
  sendWindow: [9, 19],
})
export const FOLLOW_UP_SEQUENCES: Record<CompanyId, FollowUpSequence> = { toit: DEFAULT_SEQUENCE(), sg: DEFAULT_SEQUENCE(), reno: DEFAULT_SEQUENCE() }
export function saveFollowUpSequence(company: CompanyId, seq: FollowUpSequence) {
  FOLLOW_UP_SEQUENCES[company] = seq
  commit()
}

/** Next follow-up step label for a quote sent on `sentDate` ("Courriel J+12" …). */
export function nextFollowUp(company: CompanyId, daysSinceSent: number) {
  const seq = FOLLOW_UP_SEQUENCES[company]
  if (!seq.enabled) return undefined
  return seq.steps.filter((s) => s.day > daysSinceSent).sort((a, b) => a.day - b.day)[0]
}

/** Phone numbers that replied STOP: no more texts (Loi 25 / CRTC). */
export const SMS_OPT_OUTS = new Set<string>()
export function optOut(phone: string) {
  SMS_OPT_OUTS.add(phone.replace(/\D/g, ''))
  commit()
}
export const isOptedOut = (phone?: string) => !!phone && SMS_OPT_OUTS.has(phone.replace(/\D/g, ''))

// ── Message templates (editable) ────────────────────────────────────────────
export interface MessageTemplate {
  id: string
  name: string
  channel: 'sms' | 'email'
  subject?: string
  body: string
  company: CompanyId | 'all'
}
export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  { id: 'suivi-sms', name: 'Suivi de soumission', channel: 'sms', company: 'all', body: "Bonjour {prénom}, c'est {représentant} de {compagnie}. Avez-vous bien reçu votre soumission {no}? Je peux répondre à vos questions ou passer vous voir. Répondez STOP pour ne plus recevoir de textos." },
  { id: 'suivi-email', name: 'Suivi de soumission', channel: 'email', company: 'all', subject: 'Votre soumission {no}', body: "Bonjour {prénom},\n\nNous faisons un suivi sur votre soumission {no}. Avez-vous des questions ou des commentaires?\n\nPour accepter la soumission, utilisez simplement le lien ci-dessous.\n\n{représentant}\n{compagnie}" },
  { id: 'envoi-email', name: 'Envoi de soumission', channel: 'email', company: 'all', subject: 'Soumission {no} — {compagnie}', body: "Bonjour {prénom},\n\nVoici votre soumission {no}. Vous pouvez la consulter et l'accepter en ligne avec le lien ci-dessous.\n\nMerci,\n{représentant}\n{compagnie}" },
  { id: 'rappel-rdv', name: 'Rappel de rendez-vous', channel: 'sms', company: 'all', body: 'Rappel : {représentant} de {compagnie} sera chez vous {date}. Répondez C pour confirmer ou R pour reporter.' },
  { id: 'signature-ok', name: 'Confirmation de signature', channel: 'email', company: 'all', subject: 'Copie signée de votre soumission {no}', body: "Bonjour {prénom},\n\nMerci de votre confiance! Vous trouverez ci-joint la copie signée de votre soumission {no}, ainsi que le formulaire de résolution (art. 58 LPC).\n\n{représentant}\n{compagnie}" },
]
export function saveTemplate(tpl: MessageTemplate) {
  const i = MESSAGE_TEMPLATES.findIndex((x) => x.id === tpl.id)
  if (i >= 0) MESSAGE_TEMPLATES[i] = tpl
  else MESSAGE_TEMPLATES.push(tpl)
  commit()
}
export function removeTemplate(id: string) {
  const i = MESSAGE_TEMPLATES.findIndex((x) => x.id === id)
  if (i >= 0) MESSAGE_TEMPLATES.splice(i, 1)
  commit()
}

// ── Connections (per company) ───────────────────────────────────────────────
export type ConnectionState = 'connecte' | 'en_attente' | 'erreur' | 'non_configure'
export interface CompanyConnections {
  sms: { number: string; state: ConnectionState; detail?: string }
  email: { domain: string; from: string; state: ConnectionState; detail?: string }
  websiteForm: { url: string; state: ConnectionState }
  google: { account: string; state: ConnectionState }
  // Facebook Lead Ads: phase 2
}
export const CONNECTIONS: Record<CompanyId, CompanyConnections> = {
  toit: {
    sms: { number: '418 576-1993', state: 'connecte' },
    email: { domain: 'toitureshillman.com', from: 'soumissions@toitureshillman.com', state: 'connecte' },
    websiteForm: { url: 'toitureshillman.com/soumission', state: 'connecte' },
    google: { account: 'Toitures Hillman · Google Ads', state: 'connecte' },
  },
  sg: {
    sms: { number: '418 915-3443', state: 'connecte' },
    email: { domain: 'signaturegouttieres.com', from: 'info@signaturegouttieres.com', state: 'en_attente', detail: 'Enregistrements DKIM à ajouter' },
    websiteForm: { url: 'signaturegouttieres.com/soumission', state: 'connecte' },
    google: { account: 'Signature Gouttières · Google Ads', state: 'connecte' },
  },
  reno: {
    sms: { number: '418 576-1993', state: 'en_attente', detail: 'Numéro partagé avec Toitures' },
    email: { domain: 'renovationshillman.com', from: '', state: 'non_configure' },
    websiteForm: { url: '', state: 'non_configure' },
    google: { account: '', state: 'non_configure' },
  },
}
export function saveConnections(company: CompanyId, c: CompanyConnections) {
  CONNECTIONS[company] = c
  commit()
}

// ── Loi 25 ──────────────────────────────────────────────────────────────────
export const PRIVACY = {
  officer: 'Jean-Pierre Hillman',
  officerEmail: 'confidentialite@groupehillman.com',
  smsConsentText:
    "J'accepte de recevoir des textos de {compagnie} au sujet de ma soumission. Je peux me désabonner en tout temps en répondant STOP.",
  formConsentText:
    'En soumettant ce formulaire, vous consentez à ce que {compagnie} utilise vos coordonnées pour vous transmettre une soumission. Voir notre politique de confidentialité.',
  retentionYears: 7,
}
export interface DataRequest {
  id: string
  client: string
  kind: 'acces' | 'rectification' | 'suppression'
  received: string
  due: string
  status: 'nouvelle' | 'en_cours' | 'traitee'
}
export const DATA_REQUESTS: DataRequest[] = [
  { id: 'dr1', client: 'Steve Fournier', kind: 'acces', received: '2026-10-14', due: '2026-11-13', status: 'en_cours' },
  { id: 'dr2', client: 'Annie Poirier', kind: 'suppression', received: '2026-09-28', due: '2026-10-28', status: 'traitee' },
]
export function savePrivacy(p: typeof PRIVACY) {
  Object.assign(PRIVACY, p)
  commit()
}
export function updateDataRequest(id: string, patch: Partial<DataRequest>) {
  const r = DATA_REQUESTS.find((x) => x.id === id)
  if (r) Object.assign(r, patch)
  commit()
}

/** Feature flag: the AI agent is outside the 200 h plan and ships in January. */
export const AI_AGENT_LIVE = false

// ── Settings & Catalogue area: extra mutators ───────────────────────────────
/** Remove a number from the STOP list (only after new written consent). */
export function unOptOut(phone: string) {
  SMS_OPT_OUTS.delete(phone.replace(/\D/g, ''))
  commit()
}
/** Add a refusal reason, keeping "Autre" last. Returns false when it already exists. */
export function addRefusalReason(name: string) {
  const r = name.trim()
  if (!r || REFUSAL_REASONS.some((x) => x.toLowerCase() === r.toLowerCase())) return false
  const other = REFUSAL_REASONS.indexOf('Autre')
  REFUSAL_REASONS.splice(other >= 0 ? other : REFUSAL_REASONS.length, 0, r)
  commit()
  return true
}
export function removeRefusalReason(name: string) {
  const i = REFUSAL_REASONS.indexOf(name)
  if (i >= 0) REFUSAL_REASONS.splice(i, 1)
  commit()
}
/** Log a Loi 25 request. The due date is 30 days after reception when not given. */
export function addDataRequest(r: Omit<DataRequest, 'id' | 'due' | 'status'> & Partial<Pick<DataRequest, 'due' | 'status'>>): DataRequest {
  const d = new Date(r.received + 'T12:00:00')
  d.setDate(d.getDate() + 30)
  const req: DataRequest = { status: 'nouvelle', due: d.toISOString().slice(0, 10), ...r, id: 'dr' + Date.now() }
  DATA_REQUESTS.push(req)
  commit()
  return req
}
