/**
 * Where a quote stands in its automatic follow-up sequence (settings → FOLLOW_UP_SEQUENCES:
 * day 6, 12 and 20 after sending, by email and text). Replaces the mock "Texto J+10" labels.
 */
import { CLIENTS, TODAY } from '../../data/mock'
import { FOLLOW_UP_SEQUENCES, STATUS_DEFS, isOptedOut } from '../../data/settings'
import type { QuoteRecord } from '../../data/store'
import { t } from '../../i18n'

export type FollowUpKind = 'next' | 'paused' | 'stopped' | 'draft' | 'finished' | 'disabled'

export interface FollowUpInfo {
  kind: FollowUpKind
  /** Translated label, e.g. "Courriel J+12 (auto)" or "Relances arrêtées · signée". */
  label: string
  /** The next step is sent automatically. */
  auto: boolean
  /** Planned date of the next step (ISO), when `kind === 'next'`. */
  date?: string
  /** Manual task entered on the quote (e.g. "Appel de suivi"), shown next to the sequence. */
  manual?: string
  /** Pause / resume makes sense for this quote. */
  pausable: boolean
}

const DAY = 864e5
const daysBetween = (from: string, to: string) => Math.floor((new Date(to + 'T12:00').getTime() - new Date(from + 'T12:00').getTime()) / DAY)
const addDays = (iso: string, n: number) => new Date(new Date(iso + 'T12:00').getTime() + n * DAY).toISOString().slice(0, 10)

/** Why the sequence stopped, as shown after "Relances arrêtées · ". */
function stopWhy(reason: string) {
  switch (reason) {
    case 'Signé':
      return t('signée')
    case 'Refusé':
      return t('refusée')
    case 'Payé':
      return t('payée')
    case 'Terminé':
      return t('terminée')
    case 'Client va nous rappeler':
      return t('client a répondu')
    default:
      return t(reason)
  }
}

/** Next follow-up step (or why there is none) for a quote. */
export function followUpState(q: QuoteRecord): FollowUpInfo {
  const manual = q.nextAction && !/auto/i.test(q.nextAction) ? t(q.nextAction) : undefined
  const base = { auto: false, manual, pausable: false }
  const def = STATUS_DEFS.find((s) => s.name === q.status)
  const seq = FOLLOW_UP_SEQUENCES[q.company]

  if (def?.stopsFollowUps) return { ...base, kind: 'stopped', label: t('Relances arrêtées · {why}', { why: stopWhy(q.status) }) }
  if (q.followUpStopped) return { ...base, kind: 'stopped', label: t('Relances arrêtées · {why}', { why: stopWhy(q.followUpStopped) }) }
  if (q.status === 'Client va nous rappeler' && seq?.stopOnReply) return { ...base, kind: 'stopped', label: t('Relances arrêtées · {why}', { why: stopWhy(q.status) }) }
  if (q.status === 'En cours') return { ...base, kind: 'draft', label: t('Pas encore envoyée') }
  if (!seq?.enabled) return { ...base, kind: 'disabled', label: t('Relances désactivées') }
  if (q.followUpPaused) return { ...base, kind: 'paused', label: t('Relance en pause'), pausable: true }

  const client = CLIENTS.find((c) => c.id === q.clientId)
  const noSms = isOptedOut(client?.mobile) || isOptedOut(client?.phone)
  const since = daysBetween(q.date, TODAY)
  const upcoming = seq.steps.filter((s) => s.day > since && !(noSms && s.channel === 'sms')).sort((a, b) => a.day - b.day)
  if (!upcoming.length) return { ...base, kind: 'finished', label: t('Séquence terminée'), pausable: false }

  const day = upcoming[0].day
  const channels = new Set(upcoming.filter((s) => s.day === day).map((s) => s.channel))
  const label =
    channels.size > 1 ? t('Courriel + texto J+{d} (auto)', { d: day }) : channels.has('sms') ? t('Texto J+{d} (auto)', { d: day }) : t('Courriel J+{d} (auto)', { d: day })
  return { ...base, kind: 'next', label, auto: true, date: addDays(q.date, day), pausable: true }
}
