import { useState, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowRight, BadgePercent, CalendarClock, CalendarPlus, Check, ChevronDown, Download, FileX, Hammer, Lock, Mail, MessageSquare, PenLine, Phone, Plus, Tablet, Wallet, X } from 'lucide-react'
import { RepAvatar } from '../components/ui'
import { Notice } from '../components/states'
import { companyById, fullName, repById, type Client } from '../data/mock'
import { REFUSAL_REASONS } from '../data/settings'
import { setQuoteStatus, signQuote, updateQuote, type QuoteRecord, type QuoteStatusRecord } from '../data/store'
import { toast } from '../lib/toast'
import { cn, money } from '../lib/utils'
import { locale, t } from '../i18n'
import { PortalSection, SignaturePad, TermsAccordion } from './portal/parts'
import { CAA_LABEL, tierVideo } from '../data/quote-builder'
import {
  SIGNED_STATUSES,
  chosenOptions,
  depositStep,
  setAddonChoice,
  canCancel,
  cancellationDeadline,
  paymentSchedule,
  choicesOf,
  portalPricing,
  portalScope,
  renoBudget,
  renoDescription,
  saveSignatureImage,
  setChoice,
  signatureOf,
  validUntil,
  type Pricing,
} from './portal/pricing'
import { PortalError, PortalFooter, PortalHeader, PortalNotFound, PortalSkeleton, formatSignedAt, usePortalQuote, useRestoreStaffLanguage } from './portal/shell'
import { PaymentList, PriceTable, VideoLink } from './portal/blocks'

type Step = 'handoff' | 'review' | 'sign' | 'refuse'

/** Warranties shown to the client, per company. */
const warranties = (q: QuoteRecord, rbq: string) =>
  q.company === 'toit'
    ? [t('GAF System Plus · 50 ans'), t("Main-d'œuvre · 10 ans"), t('Licence RBQ {rbq}', { rbq })]
    : q.company === 'sg'
      ? [t("Main-d'œuvre · 15 ans"), t('Gouttières sans joint formées sur place'), t('Licence RBQ {rbq}', { rbq })]
      : [t('Travaux exécutés par des menuisiers CCQ'), t('Plan de garantie des bâtiments résidentiels neufs (si applicable)'), t('Licence RBQ {rbq}', { rbq })]

/**
 * Client-facing quote portal: review, accept & sign, or decline (mockup: `f5`). Shows the real quote
 * for `:no`. `?mode=tablette` is the in-person signing mode the rep hands to the client.
 */
export default function Portal() {
  const { no } = useParams()
  const [params] = useSearchParams()
  const tablet = params.get('mode') === 'tablette'
  const { state, quote, client, retry } = usePortalQuote(no)
  if (state === 'loading') return <PortalSkeleton />
  if (state === 'error') return <PortalError onRetry={retry} />
  if (!quote || !client) return <PortalNotFound no={no} />
  return <PortalQuote key={quote.id} q={quote} client={client} tablet={tablet} />
}

function PortalQuote({ q, client, tablet }: { q: QuoteRecord; client: Client; tablet: boolean }) {
  const rep = repById(q.repId)
  const choices = choicesOf(q)
  const [step, setStep] = useState<Step>(tablet ? 'handoff' : 'review')
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([q.company === 'toit' ? "Bardeaux d'asphalte" : '']))
  const [name, setName] = useState('')
  const [signed, setSigned] = useState(false)
  const [image, setImage] = useState<string>()
  const [agreed, setAgreed] = useState(false)
  const [reason, setReason] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [justSigned, setJustSigned] = useState(false)
  const [justRefused, setJustRefused] = useState(false)

  const isSigned = SIGNED_STATUSES.includes(q.status)
  const isClosed = q.status === 'Refusé'
  const pricing = portalPricing(q)
  const { included, exclusions } = portalScope(q)
  const companyPhone = companyOf(q).phone
  const rbq = companyOf(q).rbq

  const goTo = (next: Step, anchor?: string) => {
    setStep(next)
    window.setTimeout(() => (anchor ? document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' }) : window.scrollTo({ top: 0, behavior: 'smooth' })), 30)
  }

  const sign = () => {
    // Tier / CAA choices are already on the quote (setGutterChoice keeps quote.amount in sync).
    saveSignatureImage(q.id, image)
    signQuote(q.id, name.trim(), tablet ? 'tablet' : 'portal')
    setJustSigned(true)
    window.scrollTo({ top: 0 })
  }

  const refuse = () => {
    if (!reason) return
    setQuoteStatus(q.id, 'Refusé', { reason })
    const patch: Partial<QuoteStatusRecord> = { refusalComment: comment.trim() || undefined }
    updateQuote(q.id, patch)
    setJustRefused(true)
    window.scrollTo({ top: 0 })
  }

  const big = tablet // larger type for in-person signing

  // ── Closed / signed states ──
  if (isClosed)
    return (
      <Shell q={q} tablet={tablet}>
        <ClosedPanel q={q} justRefused={justRefused} phone={companyPhone} />
      </Shell>
    )
  if (isSigned)
    return (
      <Shell q={q} tablet={tablet}>
        {tablet && justSigned ? <HandBackPanel q={q} client={client} total={pricing.total} /> : <AcceptedPanel q={q} client={client} pricing={pricing} />}
      </Shell>
    )
  if (step === 'handoff')
    return (
      <Shell q={q} tablet>
        <HandOffPanel q={q} client={client} onStart={() => goTo('review')} />
      </Shell>
    )

  const signDisabled = !name.trim() || !signed || !agreed

  return (
    <Shell q={q} tablet={tablet} padBottom={!tablet}>
      <section className="rounded-2xl bg-ink text-white p-5 md:p-8">
        <div className="grid md:grid-cols-[1fr_auto] gap-6 items-end">
          <div>
            <p className="eyebrow text-white/60 mb-2">{t('Soumission {no}', { no: q.no })}</p>
            <h1 className={cn('font-semibold tracking-tight text-white', big ? 'text-4xl md:text-5xl' : 'text-3xl md:text-4xl')}>
              {t('Bonjour {first}, voici votre', { first: client.first })} <em className="accent-serif">{t('soumission')}</em>.
            </h1>
            <p className={cn('text-white/70 mt-3', big ? 'text-lg' : 'text-md')}>
              {t(q.workType)} · {client.no}, {client.street}, {client.city}
            </p>
          </div>
          {rep && !tablet && (
            <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3 md:p-4">
              <RepAvatar id={rep.id} className="w-12 h-12 text-base" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">{rep.name}</p>
                <div className="flex gap-1.5 mt-2">
                  <a href={`tel:${rep.phone.replace(/\D/g, '')}`} className="h-8 px-2.5 rounded-md bg-white text-ink text-xs font-semibold inline-flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    {t('Appeler')}
                  </a>
                  <button onClick={() => toast(t('Message envoyé à {name}', { name: rep.first }))} className="h-8 px-2.5 rounded-md bg-white/15 text-white text-xs font-semibold inline-flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    {t('Texto')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className={cn('grid gap-5 items-start', !tablet && 'lg:grid-cols-[1fr_320px]')}>
        <div className="space-y-5 min-w-0">
          {q.company === 'reno' && <RenoDescription q={q} client={client} sections={included.map((s) => s.name)} />}

          <PortalSection title={t('Prix')}>
            <PriceTable pricing={pricing} big={big} />
          </PortalSection>

          {pricing.tiers && (
            <PortalSection title={t('Choisissez votre protection')} kicker={t('Options')}>
              <p className="text-sm text-ink-mute -mt-2 mb-4">{t('Le prix total se met à jour selon votre choix.')}</p>
              <div className="grid sm:grid-cols-2 gap-2.5" role="radiogroup" aria-label={t('Protection des gouttières')}>
                {pricing.tiers.map((tier) => {
                  const on = pricing.tier?.id === tier.id
                  return (
                    <div key={tier.id} className={cn('rounded-xl border transition-colors flex flex-col', on ? 'border-primary bg-primary-wash ring-1 ring-primary' : 'border-hairline-strong bg-white hover:bg-sand')}>
                      <button role="radio" aria-checked={on} onClick={() => setChoice(q, { tier: tier.id })} className="text-left p-3.5 pb-2 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className={cn('font-semibold', big ? 'text-md' : 'text-sm')}>{t(tier.label)}</span>
                          <span className={cn('w-5 h-5 rounded-full border flex items-center justify-center shrink-0', on ? 'bg-primary border-primary text-white' : 'border-hairline-strong')}>{on && <Check className="w-3 h-3" />}</span>
                        </span>
                        <span className="block text-xs text-ink-mute mt-1">{t(tier.detail)}</span>
                        <span className="block text-sm font-semibold tnum mt-2">{tier.price ? `+ ${money(tier.price)}` : t('Inclus')}</span>
                      </button>
                      {tierVideo(tier) && <VideoLink url={tierVideo(tier)!} title={t(tier.label)} className="px-3.5 pb-3" />}
                    </div>
                  )
                })}
              </div>
              <div className="mt-5 rounded-xl border border-hairline p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={!!choices.caa} onChange={(e) => setChoice(q, { caa: e.target.checked })} className="w-5 h-5 mt-0.5 accent-[var(--color-primary)] shrink-0" />
                  <span className="min-w-0">
                    <span className={cn('flex items-center gap-1.5 font-semibold', big ? 'text-md' : 'text-sm')}>
                      <BadgePercent className="w-4 h-4 text-tone-good" />
                      {t(CAA_LABEL)}
                    </span>
                    <span className="block text-xs text-ink-mute mt-0.5">
                      {t('Rabais de 3 % sur le prix avant taxes (maximum 100 $) pour les membres CAA-Québec. Les taxes sont calculées sur le prix réduit. La carte de membre valide sera vérifiée le jour des travaux.')}
                    </span>
                  </span>
                  {choices.caa && <span className="ml-auto text-sm font-semibold tnum text-tone-good-ink whitespace-nowrap">− {money(pricing.caaDiscount)}</span>}
                </label>
                {choices.caa && (
                  <label className="flex flex-col gap-1 mt-3 pl-8">
                    <span className="label-caps">{t('No de membre CAA (facultatif)')}</span>
                    <input value={choices.caaNo ?? ''} onChange={(e) => setChoice(q, { caaNo: e.target.value })} inputMode="numeric" className="form-input max-w-xs" />
                  </label>
                )}
              </div>
            </PortalSection>
          )}

          {choices.options.length > 0 && (
            <PortalSection title={t('Ajouts optionnels')} kicker={t('Options')}>
              <p className="text-sm text-ink-mute -mt-2 mb-4">{t('Ajoutez ou retirez ces travaux : le prix total se met à jour.')}</p>
              <div className="grid sm:grid-cols-2 gap-2.5">
                {choices.options.map((a) => (
                  <button
                    key={a.id}
                    role="switch"
                    aria-checked={!!a.chosen}
                    onClick={() => setAddonChoice(q.id, a.id, !a.chosen)}
                    className={cn('text-left rounded-xl border p-3.5 transition-colors', a.chosen ? 'border-primary bg-primary-wash ring-1 ring-primary' : 'border-hairline-strong bg-white hover:bg-sand')}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className={cn('font-semibold', big ? 'text-md' : 'text-sm')}>{t(a.desc)}</span>
                      <span className={cn('w-5 h-5 rounded-md border flex items-center justify-center shrink-0', a.chosen ? 'bg-primary border-primary text-white' : 'border-hairline-strong')}>{a.chosen ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3 text-ink-mute" />}</span>
                    </span>
                    <span className="block text-xs text-ink-mute mt-1">{t(a.addonId === 'soffit' ? 'Soffite ventilé en aluminium sur toute la longueur des gouttières' : a.addonId === 'fascia' ? 'Fascia recouvert d’aluminium agencé sur toute la longueur des gouttières' : a.desc)}</span>
                    <span className="block text-sm font-semibold tnum mt-2">
                      + {money(a.price)}
                      {a.chosen && <span className="ml-2 text-2xs font-semibold text-tone-good-ink">{t('Ajouté')}</span>}
                    </span>
                  </button>
                ))}
              </div>
            </PortalSection>
          )}

          {q.company === 'reno' && (
            <PortalSection title={t('Budget par catégorie')}>
              <BudgetBars rows={renoBudget(q, pricing.subtotal)} total={pricing.subtotal} />
              <p className="text-xs text-ink-mute mt-3">{t('Montants avant taxes. La répartition est indicative; le prix total est ferme.')}</p>
            </PortalSection>
          )}

          <PortalSection title={q.company === 'reno' ? t('Travaux prévus') : t('Ce qui est inclus')}>
            <div className="divide-y divide-hairline border-y border-hairline">
              {included.map((s) => {
                const open = expanded.has(s.name)
                return (
                  <div key={s.name}>
                    <button
                      onClick={() =>
                        setExpanded((prev) => {
                          const next = new Set(prev)
                          if (next.has(s.name)) next.delete(s.name)
                          else next.add(s.name)
                          return next
                        })
                      }
                      className="w-full flex items-center gap-3 py-3 text-left"
                      aria-expanded={open}
                    >
                      <span className="w-6 h-6 rounded-full bg-tone-good-soft text-tone-good-ink flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                      <span className={cn('flex-1 font-semibold', big ? 'text-md' : 'text-sm')}>{t(s.name)}</span>
                      <span className="text-2xs text-ink-mute tnum">{s.lines.length}</span>
                      <ChevronDown className={cn('w-4 h-4 text-ink-mute transition-transform', open && 'rotate-180')} />
                    </button>
                    {open && (
                      <ul className="pb-3 pl-9 space-y-1.5">
                        {s.lines.map((l) => (
                          <li key={l} className={cn('text-ink-secondary flex gap-2', big ? 'text-md' : 'text-sm')}>
                            <span className="w-1 h-1 rounded-full bg-ink-faint mt-2 shrink-0" />
                            {l}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
            {exclusions.length > 0 && (
              <p className="mt-4 text-xs text-ink-mute">
                <span className="font-semibold text-ink-secondary">{t('Exclus :')}</span> {exclusions.join(' · ')}
              </p>
            )}
          </PortalSection>

          <div className="grid md:grid-cols-2 gap-5">
            <PortalSection title={t('Garanties')}>
              <ul className="space-y-2.5 text-sm text-ink-secondary">
                {warranties(q, rbq).map((w) => (
                  <li key={w} className="flex gap-2">
                    <Check className="w-4 h-4 text-tone-good mt-0.5 shrink-0" />
                    {w}
                  </li>
                ))}
              </ul>
            </PortalSection>
            <PortalSection title={t('Paiements')}>
              <PaymentList q={q} total={pricing.total} />
            </PortalSection>
          </div>

          {tablet && step === 'review' && (
            <button onClick={() => goTo('sign', 'signer')} className="btn btn-lg btn-primary w-full h-14 text-lg">
              <PenLine className="w-5 h-5" />
              {t('Passer à la signature · {total}', { total: money(pricing.total) })}
            </button>
          )}

          {step === 'sign' && (
            <PortalSection id="signer" title={t('Accepter la soumission')} className="border-2 border-primary">
              <div className="space-y-4">
                <TermsAccordion />
                <label className="flex flex-col gap-1">
                  <span className="label-caps">{t('Nom complet')}</span>
                  <input id="sign-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={fullName(client)} autoComplete="name" className={cn('form-input', big && 'h-14 text-lg')} />
                </label>
                <div>
                  <span className="label-caps block mb-1">{t('Signature')}</span>
                  <SignaturePad onChange={setSigned} onImage={setImage} className={big ? 'h-72' : undefined} large={big} />
                </div>
                <label className={cn('flex items-start gap-2.5 text-ink-secondary', big ? 'text-md' : 'text-sm')}>
                  <input id="sign-agree" type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="w-5 h-5 mt-0.5 accent-[var(--color-primary)] shrink-0" />
                  {t("J'accepte la soumission {no} et les termes et conditions.", { no: q.no })}
                </label>
                <p className="text-2xs text-ink-mute flex items-center gap-1.5">
                  <Lock className="w-3 h-3" />
                  {t('Votre nom, la date, l’heure et votre adresse IP seront enregistrés avec la signature.')}
                </p>
                <button disabled={signDisabled} onClick={sign} className={cn('btn btn-lg btn-primary w-full', big && 'h-14 text-lg')}>
                  {t('Accepter et signer')} · {money(pricing.total)}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </PortalSection>
          )}

          {step === 'refuse' && !tablet && (
            <PortalSection id="refuser" title={t('Refuser la soumission')}>
              <div className="flex flex-wrap gap-2">
                {REFUSAL_REASONS.filter((r) => r !== 'Pas de réponse du client').map((r) => (
                  <button
                    key={r}
                    onClick={() => setReason(r)}
                    aria-pressed={reason === r}
                    className={cn('h-9 px-3.5 rounded-full text-sm font-semibold border transition-colors', reason === r ? 'bg-ink text-white border-ink' : 'bg-white border-hairline-strong text-ink-secondary hover:bg-sand')}
                  >
                    {t(r)}
                  </button>
                ))}
              </div>
              <label className="flex flex-col gap-1 mt-4">
                <span className="label-caps">{t('Commentaire (facultatif)')}</span>
                <textarea id="refuse-comment" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} className="form-input h-auto py-2.5" />
              </label>
              <div className="flex flex-wrap justify-end gap-2 mt-4">
                <button onClick={() => goTo('review')} className="btn btn-sm btn-ghost">
                  {t('Annuler')}
                </button>
                <button disabled={!reason} onClick={refuse} className="btn btn-sm btn-dark">
                  {t('Envoyer ma réponse')}
                </button>
              </div>
            </PortalSection>
          )}
        </div>

        {!tablet && (
          <aside className="hidden lg:block sticky top-24">
            <div className="bg-white rounded-2xl shadow-elevated p-5">
              <p className="label-caps">{t('Total')}</p>
              <p className="text-3xl font-semibold tnum tracking-tight mt-1">{money(pricing.total)}</p>
              {pricing.caaDiscount > 0 && <p className="text-xs font-semibold text-tone-good-ink tnum">{t('Rabais CAA inclus : −{amount}', { amount: money(pricing.caaDiscount) })}</p>}
              <p className="text-xs text-ink-mute">{t("taxes incluses · valide jusqu'au {date}", { date: validUntil(q).toLocaleDateString(locale(), { day: 'numeric', month: 'short' }) })}</p>
              {step !== 'sign' && (
                <button onClick={() => goTo('sign', 'signer')} className="btn btn-lg btn-primary w-full mt-5">
                  <PenLine className="w-4 h-4" />
                  {t('Accepter et signer')}
                </button>
              )}
              <button onClick={() => window.print()} className="btn btn-sm btn-ghost w-full mt-2">
                <Download className="w-4 h-4" />
                {t('Télécharger le PDF')}
              </button>
              <button onClick={() => goTo('refuse', 'refuser')} className="w-full mt-1 text-xs text-ink-mute hover:text-ink underline underline-offset-2">
                {t('Refuser la soumission')}
              </button>
            </div>
          </aside>
        )}
      </div>

      {!tablet && (step === 'review' || step === 'sign') && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-hairline px-4 py-3 shadow-float print:hidden">
          <div className="flex items-center justify-between gap-3 max-w-5xl mx-auto">
            <div className="min-w-0">
              <p className="text-2xs text-ink-mute">{t('Total · taxes incluses')}</p>
              <p className="text-lg font-semibold tnum leading-tight">{money(pricing.total)}</p>
              {pricing.caaDiscount > 0 && <p className="text-2xs font-semibold text-tone-good-ink tnum">{t('Rabais CAA inclus : −{amount}', { amount: money(pricing.caaDiscount) })}</p>}
              {step === 'review' && (
                <button onClick={() => goTo('refuse', 'refuser')} className="text-2xs text-ink-mute underline underline-offset-2">
                  {t('Refuser')}
                </button>
              )}
            </div>
            {step === 'review' ? (
              <button onClick={() => goTo('sign', 'signer')} className="btn btn-md btn-primary">
                <PenLine className="w-4 h-4" />
                {t('Accepter et signer')}
              </button>
            ) : (
              <button onClick={() => document.getElementById('signer')?.scrollIntoView({ behavior: 'smooth' })} className="btn btn-md btn-dark">
                {t('Continuer')}
              </button>
            )}
          </div>
        </div>
      )}
    </Shell>
  )
}

const companyOf = (q: QuoteRecord) => companyById(q.company)

/** Page frame of the portal; tablet mode hides the contact chrome. */
function Shell({ q, tablet, padBottom, children }: { q: QuoteRecord; tablet: boolean; padBottom?: boolean; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-sand font-sans text-ink">
      <PortalHeader company={q.company} bare={tablet} />
      <main className={cn('max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10 space-y-5', padBottom ? 'pb-32 md:pb-12' : 'pb-12')}>
        {children}
        {!tablet && <PortalFooter company={q.company} />}
      </main>
    </div>
  )
}

/** Rénovations: project description. */
function RenoDescription({ q, client, sections }: { q: QuoteRecord; client: Client; sections: string[] }) {
  // The rep's own description from the builder (written in the client's language); a summary otherwise.
  const written = renoDescription(q)
  return (
    <PortalSection title={t('Description du projet')}>
      {written ? (
        <p className="text-md text-ink-secondary leading-relaxed whitespace-pre-line">{written}</p>
      ) : (
      <p className="text-md text-ink-secondary leading-relaxed">
        {t('Projet de {work} au {address}, {city}. Les travaux comprennent : {sections}.', {
          work: t(q.workType).toLowerCase(),
          address: `${client.no}, ${client.street}`,
          city: client.city,
          sections: sections.map((s) => t(s).toLowerCase()).join(', '),
        })}
      </p>
      )}
      <p className="text-sm text-ink-mute mt-3">{t("Le chantier est coordonné par un gestionnaire de projet du début à la fin. Les plans et permis sont à la charge du client, sauf mention contraire.")}</p>
    </PortalSection>
  )
}

function BudgetBars({ rows, total }: { rows: { cat: string; amount: number }[]; total: number }) {
  return (
    <ul className="space-y-3">
      {rows.map((r, i) => (
        <li key={r.cat}>
          <div className="flex justify-between gap-3 text-sm">
            <span className="font-semibold">{t(r.cat)}</span>
            <span className="tnum font-semibold">{money(r.amount, false)}</span>
          </div>
          <div className="h-2 rounded-full bg-sand mt-1.5 overflow-hidden">
            <div className={cn('h-full rounded-full', ['bg-data-7-ink', 'bg-data-5-ink', 'bg-data-6-ink', 'bg-data-3-ink', 'bg-data-1-ink'][i % 5])} style={{ width: `${total ? (r.amount / total) * 100 : 0}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Tablet mode: the rep hands the device to the client. */
function HandOffPanel({ q, client, onStart }: { q: QuoteRecord; client: Client; onStart: () => void }) {
  const rep = repById(q.repId)
  return (
    <section className="rounded-2xl bg-white shadow-card p-8 md:p-14 text-center">
      <span className="w-20 h-20 rounded-full bg-primary-wash text-primary mx-auto flex items-center justify-center">
        <Tablet className="w-10 h-10" />
      </span>
      <p className="eyebrow text-ink-mute mt-6">{t('Remettre la tablette au client')}</p>
      <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mt-3">{t('Bonjour {first}!', { first: client.first })}</h1>
      <p className="text-lg text-ink-mute mt-3 max-w-xl mx-auto">
        {t('{rep} vous invite à consulter la soumission {no} et à la signer directement sur cette tablette.', { rep: rep?.first ?? '', no: q.no })}
      </p>
      <button onClick={onStart} className="btn btn-lg btn-primary h-14 px-8 text-lg mt-8">
        {t('Consulter ma soumission')}
        <ArrowRight className="w-5 h-5" />
      </button>
    </section>
  )
}

/** Tablet mode, after signing: give the device back to the rep. */
function HandBackPanel({ q, client, total }: { q: QuoteRecord; client: Client; total: number }) {
  const restore = useRestoreStaffLanguage()
  const sig = signatureOf(q, fullName(client))
  const at = formatSignedAt(sig.at, locale())
  const rep = repById(q.repId)
  return (
    <section className="rounded-2xl bg-white shadow-card p-8 md:p-14 text-center">
      <span className="w-20 h-20 rounded-full bg-tone-good text-white mx-auto flex items-center justify-center">
        <Check className="w-10 h-10" />
      </span>
      <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mt-6">
        {t('Merci {first}, c’est signé!', { first: client.first })}
      </h1>
      <p className="text-lg text-ink-mute mt-3 max-w-xl mx-auto">{t('Une copie signée vous a été envoyée par courriel à {email}.', { email: client.email })}</p>
      <div className="mt-10 rounded-2xl bg-ink text-white p-6 md:p-8 max-w-xl mx-auto">
        <p className="text-2xl font-semibold">{t('Rendre la tablette au représentant')}</p>
        <p className="text-white/70 mt-2">{t('{rep}, la soumission {no} est signée ({total}) et le suivi automatique est arrêté.', { rep: rep?.first ?? '', no: q.no, total: money(total) })}</p>
        <p className="text-white/60 text-sm mt-1">{t('Signé par {name} le {date} à {time}', { name: sig.name, date: at.date, time: at.time })}</p>
        <div className="flex flex-wrap justify-center gap-2 mt-6">
          <Link to={`/soumissions/${q.id}`} onClick={restore} className="btn btn-md bg-white text-ink hover:bg-white/90">
            {t('Retour à la soumission')}
          </Link>
          <Link to={`/portail/${q.no}/copie-signee`} className="btn btn-md bg-white/15 text-white hover:bg-white/25">
            <Download className="w-4 h-4" />
            {t('Copie signée')}
          </Link>
        </div>
      </div>
    </section>
  )
}

/** Confirmation after signing, also shown when a signed quote's link is opened again (PDF item 6). */
function AcceptedPanel({ q, client, pricing }: { q: QuoteRecord; client: Client; pricing: Pricing }) {
  const sig = signatureOf(q, fullName(client))
  const at = formatSignedAt(sig.at, locale())
  const rep = repById(q.repId)
  const coordinator = repById('hpe')
  const schedule = paymentSchedule(q, pricing.total)
  const deposit = depositStep(schedule)
  const options = chosenOptions(q)
  const cancellable = canCancel(q)
  const deadline = q.signature ? cancellationDeadline(q.signature.at) : null

  return (
    <>
      <section className="rounded-2xl bg-white shadow-card p-6 md:p-10 text-center">
        <span className="w-16 h-16 rounded-full bg-tone-good text-white mx-auto flex items-center justify-center">
          <Check className="w-8 h-8" />
        </span>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mt-5">
          {t("Merci, c'est")} <em className="accent-serif">{t('accepté')}</em>!
        </h1>
        <p className="text-md text-ink-mute mt-2 max-w-lg mx-auto">{t('Soumission {no} · {work} · {total} taxes incluses.', { no: q.no, work: t(q.workType), total: money(pricing.total) })}</p>

        <dl className="mt-6 max-w-md mx-auto text-left rounded-xl border border-hairline divide-y divide-hairline text-sm">
          {[
            [t('Signé par'), sig.name],
            [t('Date'), at.date],
            [t('Heure'), at.time],
            [t('Adresse IP'), sig.ip || '—'],
            [t('Mode de signature'), q.signature ? (sig.device === 'tablet' ? t('Tablette, en personne') : t('En ligne')) : t('Au bureau')],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 px-4 py-2.5">
              <dt className="text-ink-mute">{k}</dt>
              <dd className="font-semibold text-right tnum">{v}</dd>
            </div>
          ))}
        </dl>

        {options.length > 0 && (
          <div className="mt-4 max-w-md mx-auto text-left rounded-xl border border-hairline px-4 py-3 text-sm">
            <p className="label-caps mb-1.5">{t('Options choisies')}</p>
            <ul className="space-y-1">
              {options.map((o) => (
                <li key={o.label} className="flex justify-between gap-3">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-tone-good" />
                    {t(o.label)}
                  </span>
                  <span className="tnum font-semibold">{o.price ? `+ ${money(o.price)}` : t('Inclus')}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-2 mt-6">
          <Link to={`/portail/${q.no}/copie-signee`} className="btn btn-md btn-primary">
            <Download className="w-4 h-4" />
            {t('Télécharger la copie signée (PDF)')}
          </Link>
          <button onClick={() => toast(t('Rappel ajouté à votre calendrier'))} className="btn btn-md btn-secondary">
            <CalendarPlus className="w-4 h-4" />
            {t('Ajouter un rappel')}
          </button>
        </div>
        <p className="text-xs text-ink-mute mt-4 inline-flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5" />
          {t('Une copie signée a été envoyée automatiquement à {email}.', { email: client.email })}
        </p>
      </section>

      <section className="bg-white rounded-2xl shadow-card p-5 md:p-7">
        <h2 className="text-xl md:text-2xl font-semibold tracking-tight mb-4">{t('Prochaines étapes')}</h2>
        <ol className="space-y-4">
          {deposit ? (
            <NextStep icon={Wallet} title={t('Dépôt de {amount}', { amount: money(deposit.amount) })}>
              {t('{pct} % du total, payable à la signature. Les instructions de paiement (virement Interac, chèque ou carte) sont dans le courriel de confirmation.', { pct: deposit.pct })}
            </NextStep>
          ) : (
            <NextStep icon={Wallet} title={t('Aucun dépôt à payer')}>
              {schedule.length === 1
                ? t('Le total de {amount} est payable à la fin des travaux. Les instructions de paiement (virement Interac, chèque ou carte) sont dans le courriel de confirmation.', { amount: money(schedule[0].amount) })
                : t('Les paiements suivent le calendrier de la soumission. Les instructions de paiement sont dans le courriel de confirmation.')}
            </NextStep>
          )}
          <NextStep icon={CalendarClock} title={t('Planification des travaux')}>
            {deposit
              ? t('{name} communiquera avec vous dans les 2 jours ouvrables suivant la réception du dépôt pour fixer la date des travaux.', { name: coordinator?.first ?? '' })
              : t('{name} communiquera avec vous dans les 2 jours ouvrables pour fixer la date des travaux.', { name: coordinator?.first ?? '' })}
          </NextStep>
          <NextStep icon={Hammer} title={t('Réalisation')}>
            {t('Les dates peuvent être déplacées en raison de la météo; nous vous avisons la veille. {rep} reste votre contact pour toute question.', { rep: rep?.first ?? '' })}
          </NextStep>
        </ol>
        {rep && (
          <div className="flex flex-wrap gap-2 mt-5">
            <a href={`tel:${rep.phone.replace(/\D/g, '')}`} className="btn btn-sm btn-secondary">
              <Phone className="w-4 h-4" />
              {t('Appeler {name}', { name: rep.first })}
            </a>
          </div>
        )}
      </section>

      {cancellable && deadline && (
        <section className="bg-white rounded-2xl shadow-card p-5 md:p-7">
          <h2 className="text-md font-semibold">{t('Droit de résolution')}</h2>
          <p className="text-sm text-ink-secondary mt-1">
            {t("Vous pouvez résoudre ce contrat sans frais ni pénalité jusqu'au {date} (art. 58 de la Loi sur la protection du consommateur).", { date: deadline.toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' }) })}
          </p>
          <Link to={`/portail/${q.no}/annulation`} className="btn btn-sm btn-ghost mt-3 -ml-2">
            <FileX className="w-4 h-4" />
            {t('Formulaire de résolution')}
          </Link>
        </section>
      )}
    </>
  )
}

function NextStep({ icon: Icon, title, children }: { icon: typeof Wallet; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="w-9 h-9 rounded-full bg-sand text-ink-secondary flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-sm text-ink-mute mt-0.5">{children}</p>
      </div>
    </li>
  )
}

/** Refused (just now, or opened later) or cancelled under art. 58 (mockup: `p5`). */
function ClosedPanel({ q, justRefused, phone }: { q: QuoteRecord; justRefused: boolean; phone: string }) {
  const cancelled = !!q.cancellation
  return (
    <section className="rounded-2xl bg-white shadow-card p-6 md:p-10 text-center">
      <span className="w-16 h-16 rounded-full bg-sand text-ink-mute mx-auto flex items-center justify-center">
        <X className="w-8 h-8" />
      </span>
      {justRefused ? (
        <>
          <h1 className="text-3xl font-semibold tracking-tight mt-5">
            {t('Merci pour votre')} <em className="accent-serif">{t('réponse')}</em>
          </h1>
          <p className="text-md text-ink-mute mt-2 max-w-lg mx-auto">{q.refusalReason ? t('Votre décision est notée ({reason}).', { reason: t(q.refusalReason).toLowerCase() }) : t('Votre décision est notée.')}</p>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-semibold tracking-tight mt-5">{cancelled ? t('Contrat résolu') : t('Cette soumission est fermée')}</h1>
          <p className="text-md text-ink-mute mt-2 max-w-lg mx-auto">
            {cancelled
              ? t('Le contrat {no} a été résolu le {date} en vertu de l’article 58 de la Loi sur la protection du consommateur.', { no: q.no, date: new Date(q.cancellation!.at).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' }) })
              : t('La soumission {no} a été refusée et ne peut plus être signée en ligne.', { no: q.no })}
          </p>
        </>
      )}
      <Notice tone="info" className="mt-6 max-w-md mx-auto text-left">
        {t('Vous avez changé d’idée ou souhaitez une nouvelle soumission? Appelez-nous au {phone}.', { phone })}
      </Notice>
    </section>
  )
}
