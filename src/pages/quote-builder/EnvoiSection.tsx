import { useState } from 'react'
import { Check, Clock, Eye, Mail, MessageSquare, PenLine, Send, Tablet } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { Badge, CompanyLogo, Field } from '../../components/ui'
import { confirmAction, Notice } from '../../components/states'
import { clientLang, fullName, repById } from '../../data/mock'
import { CONSUMER_RESOLUTION_TEXT, CONTRACT_CLAUSES, SENT_LOG, fillClause, gutterClauses, isSeededQuote, logSent, tierVideo } from '../../data/quote-builder'
import { isOptedOut } from '../../data/settings'
import { changeQuoteStatus } from '../../data/store'
import { API_MODE } from '../../api/config'
import { inLang, langName, locale, t, tIn } from '../../i18n'
import { ClientLangProvider, useClientLang } from '../../i18n/ClientLang'
import { toast } from '../../lib/toast'
import { cn, money, pct } from '../../lib/utils'
import { BuilderSection, ToggleChip } from '../../components/quote-shared'
import type { Builder } from './useQuoteBuilder'

const longDate = (iso: string) => new Date(iso + 'T12:00').toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' })
const shortDateTime = (iso: string) => new Date(iso).toLocaleString(locale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** Lines printed in the "Travaux" block, translated and with their tokens filled in. */
function printedScope(b: Builder): string[] {
  if (b.quote.company === 'sg' && b.tiered) return gutterClauses(b.draft, b.tiered).map((l) => fillClause(t(l), b.values))
  const order = b.scope.flatMap((s) => s.lines).filter((l) => b.checked.has(l) && !b.scope.find((s) => s.name === 'Exclusions')?.lines.includes(l))
  return order.map((l) => fillClause(t(l), b.values))
}

/** Email subject of a quote, in the client's language: "Soumission gouttières G64317" / "Gutter quote G64317". */
function quoteSubject(company: 'toit' | 'sg' | 'reno', no: string) {
  return company === 'sg' ? t('Soumission gouttières {no}', { no }) : company === 'toit' ? t('Soumission toiture {no}', { no }) : t('Soumission rénovation {no}', { no })
}

/**
 * Two-page PDF preview of the quote, in the CLIENT's language (whatever the rep's UI language).
 * Totals come from the same pricing as the header and Prix.
 */
function PdfPreview({ b }: { b: Builder }) {
  const { fmt } = useClientLang()
  // Everything below is evaluated in the client's language (t, money, dates).
  // Called as a plain function (no hooks inside) so its t()/money() calls run in the client's language.
  return fmt(() => pdfPages(b))
}

function pdfPages(b: Builder) {
  const { quote, client, company, pricing } = b
  const lines = printedScope(b)
  const exclusions = b.scope.find((s) => s.name === 'Exclusions')?.lines.filter((l) => b.checked.has(l)) ?? []
  const label = (l: { label: string; item?: string }) => t(l.label, { item: l.item ? t(l.item) : '' })
  const options = b.addons.filter((a) => a.optional)
  return (
    <div className="rounded-lg bg-stone p-3">
      <div className="bg-white rounded shadow-card p-4 text-[11px] leading-snug text-ink-secondary space-y-3 aspect-[8.5/11] overflow-hidden">
        <div className="flex items-start justify-between gap-2 pb-2 border-b-2 border-ink">
          <div>
            <CompanyLogo id={quote.company} className="h-9 max-w-[170px]" />
            <p className="text-ink-mute mt-1">RBQ {company.rbq}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-ink">{company.phone}</p>
            <p className="text-ink-mute">{t('Soumission {no}', { no: quote.no })}</p>
            {(quote.version ?? 1) > 1 && <p className="text-ink-mute">{t('Version {n}', { n: quote.version ?? 1 })}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-ink-mute">{t('Client')}</p>
            <p className="font-semibold text-ink">{fullName(client)}</p>
            <p>
              {client.no}, {client.street}
            </p>
            <p>
              {client.city} {client.postal}
            </p>
          </div>
          <div>
            <p className="text-ink-mute">{t('Représentant')}</p>
            <p className="font-semibold text-ink">{b.rep.name}</p>
            <p className="text-ink-mute mt-1">{t('Date')}</p>
            <p>{longDate(quote.date)}</p>
          </div>
        </div>
        {quote.company === 'reno' && b.description && <p className="whitespace-pre-line line-clamp-4">{b.description}</p>}
        <div>
          <p className="bg-ink text-white font-bold px-2 py-0.5 uppercase">{t('Travaux')}</p>
          <ul className="mt-1 space-y-0.5">
            {lines.slice(0, 7).map((line) => (
              <li key={line} className="truncate">
                • {line}
              </li>
            ))}
            {lines.length > 7 && <li className="text-ink-mute">{t('… et {n} autres lignes', { n: lines.length - 7 })}</li>}
            {!lines.length && <li className="text-ink-mute">—</li>}
          </ul>
          {exclusions.length > 0 && <p className="mt-1 text-ink-mute truncate">{t('Exclusions : {list}', { list: exclusions.map((l) => t(l)).join(' · ') })}</p>}
        </div>
        {pricing.tiers && (
          <div>
            <p className="bg-sand font-bold px-2 py-0.5 uppercase">{t('Options de protection')}</p>
            {pricing.tiers.map((x) => {
              const video = tierVideo(x)
              return (
                <p key={x.id} className={cn('flex justify-between gap-2 mt-0.5', x.id === b.tier && 'font-bold text-ink')}>
                  <span className="truncate">
                    {x.id === b.tier ? '☑' : '☐'} {t(x.label)}
                    {video && (
                      <>
                        {' · '}
                        <a href={video} target="_blank" rel="noreferrer noopener" className="text-primary-press underline font-normal">
                          {t('Vidéo')}
                        </a>
                      </>
                    )}
                  </span>
                  <span className="tnum">{x.price ? '+ ' + money(x.price) : t('Inclus')}</span>
                </p>
              )
            })}
          </div>
        )}
        {options.length > 0 && (
          <div>
            <p className="bg-sand font-bold px-2 py-0.5 uppercase">{t('Ajouts optionnels')}</p>
            {options.map((a) => (
              <p key={a.id} className={cn('flex justify-between gap-2 mt-0.5', a.chosen && 'font-bold text-ink')}>
                <span className="truncate">
                  {a.chosen ? '☑' : '☐'} {t(a.desc)}
                </span>
                <span className="tnum">+ {money(a.price)}</span>
              </p>
            ))}
          </div>
        )}
        <div>
          <p className="bg-sand font-bold px-2 py-0.5 uppercase">{t('Prix')}</p>
          {pricing.lines.map((l, i) => (
            <p key={i} className="flex justify-between gap-2 mt-0.5">
              <span className="truncate">{label(l)}</span>
              <span className="tnum">{money(l.amount)}</span>
            </p>
          ))}
        </div>
        {b.pdfShow.coutant && b.canCosts && <p className="text-tone-critical-ink">{t('Coûtant : {amount} (usage interne)', { amount: money(b.realCost, false) })}</p>}
        <div className="ml-auto w-1/2 space-y-0.5 tnum">
          <p className="flex justify-between">
            <span>{t('Sous-total')}</span>
            <span>{money(b.subtotal)}</span>
          </p>
          <p className="flex justify-between">
            <span>{t('TPS')}</span>
            <span>{money(b.gst)}</span>
          </p>
          <p className="flex justify-between">
            <span>{t('TVQ')}</span>
            <span>{money(b.qst)}</span>
          </p>
          <p className="flex justify-between font-bold text-ink border-t border-ink pt-0.5">
            <span>{t('TOTAL')}</span>
            <span>{money(b.total)}</span>
          </p>
        </div>
        <p className="text-center text-ink-mute pt-2 border-t border-hairline">
          {t('Prix valide {offre} · RBQ {rbq} · page 1 / 2', { offre: t(b.warranties.offre ?? '30 jours'), rbq: company.rbq })}
        </p>
      </div>
      <div className="bg-white rounded shadow-card p-4 mt-3 text-[11px] leading-snug text-ink-secondary space-y-2">
        <div className="flex items-center justify-between pb-1.5 border-b-2 border-ink">
          <CompanyLogo id={quote.company} className="h-6 max-w-[120px]" />
          <span className="text-ink-mute">{t('Soumission {no} · page 2 / 2', { no: quote.no })}</span>
        </div>
        <p className="bg-ink text-white font-bold px-2 py-0.5 uppercase">{t('Calendrier des paiements')}</p>
        <ul className="space-y-0.5 tnum">
          {b.schedule.map((s, i) => (
            <li key={i} className="flex justify-between">
              <span>
                {t(s.label)} ({pct(s.pct)})
              </span>
              <span>{money(s.amount)}</span>
            </li>
          ))}
          {!b.deposit && <li className="text-ink-mute">{t('Aucun dépôt à la signature.')}</li>}
        </ul>
        <p className="bg-ink text-white font-bold px-2 py-0.5 uppercase">{t('Garanties')}</p>
        <ul className="space-y-0.5">
          {Object.entries(b.warranties)
            .filter(([k, v]) => k !== 'offre' && v && v !== 'Non applicable')
            .map(([k, v]) => (
              <li key={k}>• {t(v)}</li>
            ))}
        </ul>
        <p className="bg-ink text-white font-bold px-2 py-0.5 uppercase">{t('Termes et conditions')}</p>
        <p className="text-ink">{t(CONSUMER_RESOLUTION_TEXT)}</p>
        <ul className="space-y-0.5">
          {CONTRACT_CLAUSES.map((c) => (
            <li key={c}>• {t(c)}</li>
          ))}
        </ul>
        <div className="grid grid-cols-2 gap-4 pt-3">
          <div className="border-t border-ink pt-1 text-ink-mute">{b.quote.signature ? t('Signé par {name}', { name: b.quote.signature.name }) : t('Signature du client')}</div>
          <div className="border-t border-ink pt-1 text-ink-mute">{t('Pour {company}', { company: company.name })}</div>
        </div>
      </div>
    </div>
  )
}

/** PDF preview, send form (email + text from the company's number), client preview / tablet signing and the send log. */
export function EnvoiSection({ b }: { b: Builder }) {
  const { user } = useAuth()
  const { quote, client, company, sendVia, pdfShow } = b
  const rep = repById(quote.repId) ?? b.rep
  const lang = clientLang(client)
  const signed = !!quote.signature || ['Signé', 'Payé', 'Terminé'].includes(quote.status)
  const sent = quote.status !== 'En cours'
  const phone = client.mobile || client.phone
  const optedOut = isOptedOut(client.mobile) || isOptedOut(client.phone)
  const smsOn = sendVia.sms && !optedOut && !!phone
  const [to, setTo] = useState(client.email)
  // Drafts in the CLIENT's language (French by default), not the rep's UI language.
  const [subject, setSubject] = useState(() => inLang(lang, () => quoteSubject(quote.company, quote.no)))
  const [message, setMessage] = useState(() =>
    tIn(lang, 'Bonjour {first},\n\nVoici votre soumission. Vous pouvez la consulter et la signer en ligne avec le lien ci-dessous.\n\n{rep}\n{company} · {phone}', { first: client.first, rep: rep.name, company: company.name, phone: company.phone }),
  )
  const log = SENT_LOG.filter((r) => r.quoteId === quote.id)
  const seededRows = isSeededQuote(quote.id) && quote.views > 0

  const send = async () => {
    const channels: ('email' | 'sms')[] = [...(sendVia.email && to ? (['email'] as const) : []), ...(smsOn ? (['sms'] as const) : [])]
    if (!channels.length) return toast(t('Choisissez au moins un canal (courriel ou texto)'))
    if (b.subtotal <= 0) return toast(t('Entrez un prix avant d’envoyer la soumission'))
    if (b.missing.length) {
      const ok = await confirmAction({
        title: t('Photos obligatoires manquantes'),
        body: t('Il manque : {list}. Envoyer quand même?', { list: b.missing.map((m) => t(m)).join(', ') }),
        confirmLabel: t('Envoyer quand même'),
      })
      if (!ok) return
    }
    logSent({ quoteId: quote.id, quoteNo: quote.no, company: quote.company, by: user?.name ?? rep.name, channels, to: [channels.includes('email') ? to : '', channels.includes('sms') ? phone : ''].filter(Boolean).join(' · '), subject, kind: 'Soumission' })
    // Sending has no API yet (nothing leaves the app): with the backend the status is left as the server has it.
    if (!API_MODE && quote.status === 'En cours') changeQuoteStatus(quote.id, 'En soumission', { by: user?.name, via: 'soumission' })
    toast(t('Soumission {no} envoyée par {via}', { no: quote.no, via: channels.map((c) => (c === 'email' ? t('courriel') : t('texto'))).join(` ${t('et')} `) }))
  }

  const signatureSteps: [string, string, boolean][] = [
    [t('Envoyée'), log[log.length - 1] ? shortDateTime(log[log.length - 1].at) : sent ? longDate(quote.date) : '—', sent],
    [quote.views ? t('Consultée ({n} fois)', { n: quote.views }) : t('Consultée'), quote.lastViewed ? longDate(quote.lastViewed) : '—', quote.views > 0],
    [t('Signée par le client'), quote.signature ? shortDateTime(quote.signature.at) : signed ? t('Au bureau') : '—', signed],
  ]

  return (
    <BuilderSection id="envoi" title={t('Envoi')}>
      <div className="grid lg:grid-cols-2 gap-5 [&>*]:min-w-0">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex-1" />
            {b.canCosts && (
              <label className="flex items-center gap-1.5 text-xs text-ink-secondary">
                <input type="checkbox" checked={pdfShow.coutant} onChange={() => b.setPdfShow({ ...pdfShow, coutant: !pdfShow.coutant })} className="accent-[var(--color-primary)]" />
                {t('Avec coûtant')}
              </label>
            )}
          </div>
          <ClientLangProvider lang={lang}>
            <PdfPreview b={b} />
          </ClientLangProvider>
          <p className="text-2xs text-ink-mute">{t('PDF, courriel et texto dans la langue du client : {lang}.', { lang: langName(lang) })}</p>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <a href={`#/portail/${quote.no}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-secondary">
              <Eye className="w-4 h-4" />
              {t('Aperçu client')}
            </a>
            <a href={`#/portail/${quote.no}?mode=tablette`} target="_blank" rel="noreferrer" className={cn('btn btn-sm btn-secondary', signed && 'pointer-events-none opacity-50')} aria-disabled={signed}>
              <Tablet className="w-4 h-4" />
              {t('Signer sur la tablette')}
            </a>
          </div>
          {b.missing.length > 0 && <Notice>{t('Photos obligatoires manquantes : {list}.', { list: b.missing.map((m) => t(m)).join(', ') })}</Notice>}
          <div className="flex flex-wrap gap-1.5">
            <ToggleChip active={sendVia.email} onClick={() => b.setSendVia({ ...sendVia, email: !sendVia.email })}>
              <Mail className="w-3.5 h-3.5" />
              {t('Courriel')}
            </ToggleChip>
            <ToggleChip active={smsOn} onClick={() => !optedOut && b.setSendVia({ ...sendVia, sms: !sendVia.sms })}>
              <MessageSquare className="w-3.5 h-3.5" />
              {t('Texto')}
            </ToggleChip>
            {optedOut && <Badge tone="warn">{t('Texto bloqué : le client a répondu STOP')}</Badge>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('À')}>
              <input className="form-input" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
            <Field label={t('Texto au')}>
              <input className="form-input tnum" value={smsOn ? phone : '—'} readOnly />
            </Field>
            <Field label={t('Objet')} className="col-span-2">
              <input className="form-input" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </Field>
            <Field label={t('Message')} className="col-span-2">
              <textarea className="form-input h-auto py-2" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
            </Field>
          </div>
          <p className="text-xs text-ink-mute truncate">
            {t('Joints : PDF')}
            {b.attachments
              .filter((f) => f.email)
              .map((f) => ` · ${f.name}`)
              .join('')}
            {smsOn && ` · ${t('Texto envoyé du numéro {company}', { company: company.short })}`}
          </p>
          <div className="flex gap-2">
            <button className="btn btn-sm btn-primary flex-1" onClick={send}>
              <Send className="w-4 h-4" />
              {sent ? t('Renvoyer') : t('Envoyer')}
            </button>
            <button className="btn btn-sm btn-secondary" onClick={() => b.setComposeKind('sms')} disabled={optedOut}>
              <MessageSquare className="w-4 h-4" />
              {t('Texto perso')}
            </button>
          </div>
          <div className="rounded-xl border border-hairline p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-ink flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {t('Courriels envoyés')}
              </p>
              <span className="text-2xs text-ink-mute tnum">{log.length + (seededRows ? 1 : 0)}</span>
            </div>
            {log.length === 0 && !seededRows ? (
              <p className="text-xs text-ink-mute">{t('Aucun envoi pour le moment.')}</p>
            ) : (
              <div className="relative overflow-x-auto">
                <table className="w-full min-w-[420px] text-xs">
                  <thead>
                    <tr className="border-b border-hairline">
                      <th className="th pl-0 py-1.5">{t('Date')}</th>
                      <th className="th py-1.5">{t('Type')}</th>
                      <th className="th py-1.5">{t('Envoyé par')}</th>
                      <th className="th py-1.5 pr-0">{t('Objet')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {log.map((r) => (
                      <tr key={r.id}>
                        <td className="py-1.5 pr-2 tnum text-ink whitespace-nowrap">{shortDateTime(r.at)}</td>
                        <td className="py-1.5">
                          <Badge tone="neutral">
                            {t(r.kind)} · {r.channels.map((c) => (c === 'email' ? t('courriel') : t('texto'))).join(' + ')}
                          </Badge>
                        </td>
                        <td className="py-1.5 pr-2 text-ink-secondary whitespace-nowrap">{r.by}</td>
                        <td className="py-1.5 text-ink-secondary truncate max-w-[180px]">{r.subject}</td>
                      </tr>
                    ))}
                    {seededRows && (
                      <tr>
                        <td className="py-1.5 pr-2 tnum text-ink whitespace-nowrap">{longDate(quote.date)}</td>
                        <td className="py-1.5">
                          <Badge tone="neutral">{t('Soumission')}</Badge>
                        </td>
                        <td className="py-1.5 pr-2 text-ink-secondary whitespace-nowrap">{rep.first}</td>
                        <td className="py-1.5 text-ink-secondary truncate max-w-[180px]">{inLang(lang, () => quoteSubject(quote.company, quote.no))}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="rounded-xl border border-hairline p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-ink flex items-center gap-2">
                <PenLine className="w-4 h-4" />
                {t('Signature')}
              </p>
              <Badge tone={signed ? 'good' : 'warn'} dot>
                {signed ? t('Signée') : t('En attente')}
              </Badge>
            </div>
            <ol className="space-y-2 text-sm">
              {signatureSteps.map(([label, when, ok]) => (
                <li key={label} className="flex items-center gap-3">
                  <span className={cn('w-5 h-5 rounded-full flex items-center justify-center', ok ? 'bg-tone-good text-white' : 'bg-sand text-ink-faint')}>{ok ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}</span>
                  <span className={cn('flex-1', ok ? 'text-ink' : 'text-ink-mute')}>{label}</span>
                  <span className="text-xs text-ink-mute">{when}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </BuilderSection>
  )
}
