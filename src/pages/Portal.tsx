import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ArrowRight, CalendarPlus, Check, ChevronDown, Download, MessageSquare, PenLine, Phone, X } from 'lucide-react'
import { CompanyLogo } from '../components/ui'
import { CLIENTS, DEFAULT_SCOPE, SCOPE_SECTIONS, companyById } from '../data/mock'
import { toast } from '../lib/toast'
import { GST, QST, cn, money } from '../lib/utils'
import { PORTAL_PRICE_LINES, PortalSection, REFUSAL_REASONS, SignaturePad, TermsAccordion } from './portal/parts'

type Step = 'review' | 'sign' | 'refuse' | 'done' | 'refused'

const WARRANTIES = (rbq: string) => ['GAF System Plus · 50 ans', "Main-d'œuvre · 10 ans", `Licence RBQ ${rbq}`]

const PAYMENT_SCHEDULE: [number, string][] = [
  [15, 'Mise de fond à la signature'],
  [35, 'Au début des travaux'],
  [35, 'Au milieu des travaux'],
  [15, 'À la fin des travaux'],
]

/** Client-facing quote portal: review, accept & sign, or decline (mockup: `f5`). */
export default function Portal() {
  const { no = 'H64320' } = useParams()
  const client = CLIENTS[0]
  const company = companyById('toit')
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["Bardeaux d'asphalte"]))
  const [step, setStep] = useState<Step>('review')
  const [name, setName] = useState('')
  const [signed, setSigned] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [reason, setReason] = useState<string | null>(null)
  const [comment, setComment] = useState('')

  const subtotal = PORTAL_PRICE_LINES.reduce((sum, l) => sum + l.amount, 0)
  const gst = subtotal * GST
  const qst = subtotal * QST
  const total = subtotal + gst + qst

  const included = useMemo(() => SCOPE_SECTIONS.map((s) => ({ ...s, lines: s.lines.filter((l) => DEFAULT_SCOPE.has(l)) })).filter((s) => s.lines.length && s.name !== 'Exclusions'), [])
  const exclusions = SCOPE_SECTIONS.find((s) => s.name === 'Exclusions')!.lines

  const goTo = (next: Step, anchor?: string) => {
    setStep(next)
    window.setTimeout(() => (anchor ? document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' }) : window.scrollTo({ top: 0, behavior: 'smooth' })), 30)
  }

  return (
    <div className="min-h-screen bg-sand font-sans text-ink">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-hairline">
        <div className="max-w-5xl mx-auto h-16 px-4 md:px-6 flex items-center justify-between gap-3">
          <CompanyLogo id={company.id} className="h-9 sm:h-10 max-w-[150px] sm:max-w-[190px]" />
          <a href={`tel:${company.phone}`} className="btn btn-sm btn-secondary">
            <Phone className="w-4 h-4" />
            <span className="hidden sm:inline">{company.phone}</span>
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10 space-y-5 pb-32 md:pb-12">
        {step === 'done' && <AcceptedPanel total={total} no={no} name={name} />}
        {step === 'refused' && <RefusedPanel reason={reason} />}
        {step !== 'done' && step !== 'refused' && (
          <>
            <section className="rounded-2xl bg-ink text-white p-5 md:p-8">
              <div className="grid md:grid-cols-[1fr_auto] gap-6 items-end">
                <div>
                  <p className="eyebrow text-white/60 mb-2">Soumission {no}</p>
                  <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-white">
                    Bonjour {client.first}, voici votre <em className="accent-serif">soumission</em>.
                  </h1>
                  <p className="text-white/70 mt-3 text-md">
                    Réfection de toiture · {client.no}, {client.street}, {client.city}
                  </p>
                </div>
                <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3 md:p-4">
                  <span className="w-12 h-12 rounded-full bg-data-10 text-data-10-ink flex items-center justify-center font-bold shrink-0">JH</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Jean-Pierre Hillman</p>
                    <div className="flex gap-1.5 mt-2">
                      <a href="tel:5818887993" className="h-8 px-2.5 rounded-md bg-white text-ink text-xs font-semibold inline-flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" />
                        Appeler
                      </a>
                      <button onClick={() => toast('Message envoyé à Jean-Pierre')} className="h-8 px-2.5 rounded-md bg-white/15 text-white text-xs font-semibold inline-flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" />
                        Texto
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid lg:grid-cols-[1fr_320px] gap-5 items-start">
              <div className="space-y-5 min-w-0">
                <PortalSection title="Prix">
                  <dl className="divide-y divide-hairline border-y border-hairline">
                    {PORTAL_PRICE_LINES.map((l) => (
                      <div key={l.label} className="flex items-start justify-between gap-4 py-3">
                        <dt className="min-w-0 text-sm font-semibold">{l.label}</dt>
                        <dd className="text-sm font-semibold tnum whitespace-nowrap">{money(l.amount)}</dd>
                      </div>
                    ))}
                  </dl>
                  <dl className="mt-3 space-y-1.5 text-sm max-w-xs ml-auto">
                    <div className="flex justify-between gap-2">
                      <dt className="text-ink-mute">Sous-total</dt>
                      <dd className="tnum">{money(subtotal)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-ink-mute">TPS 5 %</dt>
                      <dd className="tnum text-ink-mute">{money(gst)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-ink-mute">TVQ 9,975 %</dt>
                      <dd className="tnum text-ink-mute">{money(qst)}</dd>
                    </div>
                    <div className="flex justify-between gap-2 pt-1.5 border-t border-hairline text-md">
                      <dt className="font-semibold">Total</dt>
                      <dd className="font-semibold tnum">{money(total)}</dd>
                    </div>
                  </dl>
                </PortalSection>

                <PortalSection title="Ce qui est inclus">
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
                            <span className="flex-1 text-sm font-semibold">{s.name}</span>
                            <span className="text-2xs text-ink-mute tnum">{s.lines.length}</span>
                            <ChevronDown className={cn('w-4 h-4 text-ink-mute transition-transform', open && 'rotate-180')} />
                          </button>
                          {open && (
                            <ul className="pb-3 pl-9 space-y-1.5">
                              {s.lines.map((l) => (
                                <li key={l} className="text-sm text-ink-secondary flex gap-2">
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
                  <p className="mt-4 text-xs text-ink-mute">
                    <span className="font-semibold text-ink-secondary">Exclus :</span> {exclusions.join(' · ')}
                  </p>
                </PortalSection>

                <div className="grid md:grid-cols-2 gap-5">
                  <PortalSection title="Garanties">
                    <ul className="space-y-2.5 text-sm text-ink-secondary">
                      {WARRANTIES(company.rbq).map((w) => (
                        <li key={w} className="flex gap-2">
                          <Check className="w-4 h-4 text-tone-good mt-0.5 shrink-0" />
                          {w}
                        </li>
                      ))}
                    </ul>
                  </PortalSection>
                  <PortalSection title="Paiements">
                    <ol className="space-y-2.5">
                      {PAYMENT_SCHEDULE.map(([percent, label], i) => (
                        <li key={i} className="flex items-center gap-3">
                          <span className="w-10 h-7 rounded-md flex items-center justify-center text-xs font-bold tnum bg-sand text-ink-secondary">{percent} %</span>
                          <span className="flex-1 text-sm text-ink-secondary">{label}</span>
                          <span className="text-sm font-semibold tnum">{money((total * percent) / 100)}</span>
                        </li>
                      ))}
                    </ol>
                  </PortalSection>
                </div>

                {step === 'sign' && (
                  <PortalSection id="signer" title="Accepter la soumission" className="border-2 border-primary">
                    <div className="space-y-4">
                      <TermsAccordion />
                      <label className="flex flex-col gap-1">
                        <span className="label-caps">Nom complet</span>
                        <input id="sign-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={`${client.first} ${client.last}`} className="form-input" />
                      </label>
                      <div>
                        <span className="label-caps block mb-1">Signature</span>
                        <SignaturePad onChange={setSigned} />
                      </div>
                      <label className="flex items-start gap-2.5 text-sm text-ink-secondary">
                        <input id="sign-agree" type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="w-5 h-5 mt-0.5 accent-[var(--color-primary)] shrink-0" />
                        J'accepte la soumission {no} et les termes et conditions.
                      </label>
                      <button disabled={!name.trim() || !signed || !agreed} onClick={() => goTo('done')} className="btn btn-lg btn-primary w-full">
                        Accepter et signer
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </PortalSection>
                )}

                {step === 'refuse' && (
                  <PortalSection id="refuser" title="Refuser la soumission">
                    <div className="flex flex-wrap gap-2">
                      {REFUSAL_REASONS.map((r) => (
                        <button
                          key={r}
                          onClick={() => setReason(r)}
                          aria-pressed={reason === r}
                          className={cn('h-9 px-3.5 rounded-full text-sm font-semibold border transition-colors', reason === r ? 'bg-ink text-white border-ink' : 'bg-white border-hairline-strong text-ink-secondary hover:bg-sand')}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    <label className="flex flex-col gap-1 mt-4">
                      <span className="label-caps">Commentaire (facultatif)</span>
                      <textarea id="refuse-comment" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} className="form-input h-auto py-2.5" />
                    </label>
                    <div className="flex flex-wrap justify-end gap-2 mt-4">
                      <button onClick={() => goTo('review')} className="btn btn-sm btn-ghost">
                        Annuler
                      </button>
                      <button disabled={!reason} onClick={() => goTo('refused')} className="btn btn-sm btn-dark">
                        Envoyer ma réponse
                      </button>
                    </div>
                  </PortalSection>
                )}
              </div>

              <aside className="hidden lg:block sticky top-24">
                {/* `shadow-elevated` is the mockup's class (= --shadow-2); `shadow-2` keeps it rendering until the theme defines it. */}
                <div className="bg-white rounded-2xl shadow-elevated p-5">
                  <p className="label-caps">Total</p>
                  <p className="text-3xl font-semibold tnum tracking-tight mt-1">{money(total)}</p>
                  <p className="text-xs text-ink-mute">taxes incluses · valide jusqu'au 15 nov.</p>
                  {step !== 'sign' && (
                    <button onClick={() => goTo('sign', 'signer')} className="btn btn-lg btn-primary w-full mt-5">
                      <PenLine className="w-4 h-4" />
                      Accepter et signer
                    </button>
                  )}
                  <button onClick={() => toast('PDF téléchargé')} className="btn btn-sm btn-ghost w-full mt-2">
                    <Download className="w-4 h-4" />
                    Télécharger le PDF
                  </button>
                  <button onClick={() => goTo('refuse', 'refuser')} className="w-full mt-1 text-xs text-ink-mute hover:text-ink underline underline-offset-2">
                    Refuser la soumission
                  </button>
                </div>
              </aside>
            </div>
          </>
        )}
        <footer className="pt-6 text-center text-2xs text-ink-mute">
          Toitures Hillman · {company.phone} · RBQ {company.rbq}
        </footer>
      </main>

      {(step === 'review' || step === 'sign') && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-hairline px-4 py-3 shadow-float">
          <div className="flex items-center justify-between gap-3 max-w-5xl mx-auto">
            <div className="min-w-0">
              <p className="text-2xs text-ink-mute">Total · taxes incluses</p>
              <p className="text-lg font-semibold tnum leading-tight">{money(total)}</p>
              {step === 'review' && (
                <button onClick={() => goTo('refuse', 'refuser')} className="text-2xs text-ink-mute underline underline-offset-2">
                  Refuser
                </button>
              )}
            </div>
            {step === 'review' ? (
              <button onClick={() => goTo('sign', 'signer')} className="btn btn-md btn-primary">
                <PenLine className="w-4 h-4" />
                Accepter et signer
              </button>
            ) : (
              <button onClick={() => document.getElementById('signer')?.scrollIntoView({ behavior: 'smooth' })} className="btn btn-md btn-dark">
                Continuer
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** Confirmation after signing (mockup: `h5`). */
function AcceptedPanel({ total, no, name }: { total: number; no: string; name: string }) {
  return (
    <section className="rounded-2xl bg-white shadow-card p-6 md:p-10 text-center">
      <span className="w-16 h-16 rounded-full bg-tone-good text-white mx-auto flex items-center justify-center">
        <Check className="w-8 h-8" />
      </span>
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mt-5">
        Merci, c'est <em className="accent-serif">accepté</em>!
      </h1>
      <p className="text-md text-ink-mute mt-2 max-w-lg mx-auto">
        Soumission {no} signée par {name || 'vous'} · {money(total)}. Jean-Pierre vous contactera sous peu.
      </p>
      <div className="flex flex-wrap justify-center gap-2 mt-6">
        <button onClick={() => toast('Copie signée téléchargée')} className="btn btn-md btn-primary">
          <Download className="w-4 h-4" />
          Copie signée (PDF)
        </button>
        <button onClick={() => toast('Rappel ajouté à votre calendrier')} className="btn btn-md btn-secondary">
          <CalendarPlus className="w-4 h-4" />
          Ajouter un rappel
        </button>
      </div>
    </section>
  )
}

/** Confirmation after declining (mockup: `p5`). */
function RefusedPanel({ reason }: { reason: string | null }) {
  return (
    <section className="rounded-2xl bg-white shadow-card p-6 md:p-10 text-center">
      <span className="w-16 h-16 rounded-full bg-sand text-ink-mute mx-auto flex items-center justify-center">
        <X className="w-8 h-8" />
      </span>
      <h1 className="text-3xl font-semibold tracking-tight mt-5">
        Merci pour votre <em className="accent-serif">réponse</em>
      </h1>
      <p className="text-md text-ink-mute mt-2 max-w-lg mx-auto">Votre décision est notée{reason ? ` (${reason.toLowerCase()})` : ''}.</p>
    </section>
  )
}
