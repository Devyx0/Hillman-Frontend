import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, FileX, Printer } from 'lucide-react'
import { CompanyLogo } from '../../components/ui'
import { Notice } from '../../components/states'
import { fullName, repById } from '../../data/mock'
import { CONSUMER_RESOLUTION_TEXT } from '../../data/quote-builder'
import { locale, t } from '../../i18n'
import { money } from '../../lib/utils'
import { PaymentList, PriceTable } from './blocks'
import { TERMS } from './parts'
import { SIGNED_STATUSES, canCancel, portalPricing, portalScope, signatureImage, signatureOf } from './pricing'
import { PortalError, PortalFrame, PortalNotFound, PortalSkeleton, clientAddress, companyInfo, formatSignedAt, usePortalQuote } from './shell'

/**
 * Printable signed copy of the contract (`/portail/:no/copie-signee`, PDF item 6). "Télécharger" uses the
 * browser's print dialog (Save as PDF); the toolbar and portal chrome are hidden when printing.
 */
export default function SignedCopy() {
  const { no } = useParams()
  const { state, quote: q, client, retry } = usePortalQuote(no)
  if (state === 'loading') return <PortalSkeleton />
  if (state === 'error') return <PortalError onRetry={retry} />
  if (!q || !client) return <PortalNotFound no={no} />

  const signedOrClosed = SIGNED_STATUSES.includes(q.status) || !!q.cancellation
  if (!signedOrClosed)
    return (
      <PortalFrame company={q.company}>
        <section className="rounded-2xl bg-white shadow-card p-6 md:p-10 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{t('Cette soumission n’est pas encore signée')}</h1>
          <p className="text-md text-ink-mute mt-2">{t('La copie signée sera disponible après la signature.')}</p>
          <Link to={`/portail/${q.no}`} className="btn btn-md btn-primary mt-6">
            {t('Voir la soumission')}
          </Link>
        </section>
      </PortalFrame>
    )

  const co = companyInfo(q.company)
  const rep = repById(q.repId)
  const pricing = portalPricing(q)
  const { included, exclusions } = portalScope(q)
  const sig = signatureOf(q, fullName(client))
  const at = formatSignedAt(sig.at, locale())
  const image = signatureImage(q.id)
  const quoteDate = new Date(q.date + 'T12:00').toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen bg-sand font-sans text-ink print:bg-white">
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-hairline print:hidden">
        <div className="max-w-3xl mx-auto h-14 px-4 flex items-center justify-between gap-2">
          <Link to={`/portail/${q.no}`} className="btn btn-sm btn-ghost -ml-2">
            <ArrowLeft className="w-4 h-4" />
            {t('Retour')}
          </Link>
          <button onClick={() => window.print()} className="btn btn-sm btn-primary">
            <Printer className="w-4 h-4" />
            {t('Télécharger / imprimer (PDF)')}
          </button>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-6 md:py-10 print:p-0 print:max-w-none">
        {q.cancellation && (
          <Notice tone="critical" className="mb-4 print:mb-6">
            {t('Contrat résolu le {date} (art. 58 LPC).', { date: new Date(q.cancellation.at).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' }) })}
          </Notice>
        )}
        <article className="bg-white rounded-2xl shadow-card p-5 sm:p-8 md:p-10 print:shadow-none print:rounded-none print:p-0 space-y-7 text-sm">
          <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-hairline">
            <div>
              <CompanyLogo id={q.company} className="h-10 max-w-[200px]" />
              <p className="text-xs text-ink-mute mt-3 leading-relaxed">
                {co.address}
                <br />
                {co.phone} · {co.email}
                <br />
                {t('Licence RBQ {rbq}', { rbq: co.rbq })}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="eyebrow text-ink-mute">{t('Contrat signé')}</p>
              <p className="text-2xl font-semibold tracking-tight mt-1">{t('Soumission {no}', { no: q.no })}</p>
              <p className="text-xs text-ink-mute mt-1">{t('Datée du {date}', { date: quoteDate })}</p>
            </div>
          </header>

          <section className="grid sm:grid-cols-2 gap-5">
            <div>
              <p className="label-caps mb-1">{t('Client')}</p>
              <p className="font-semibold">{fullName(client)}</p>
              <p className="text-ink-secondary">{clientAddress(q)}</p>
              <p className="text-ink-secondary">
                {client.phone} · {client.email}
              </p>
            </div>
            <div>
              <p className="label-caps mb-1">{t('Travaux')}</p>
              <p className="font-semibold">{t(q.workType)}</p>
              {rep && <p className="text-ink-secondary">{t('Estimateur : {name}', { name: rep.name })}</p>}
            </div>
          </section>

          <section>
            <h2 className="text-md font-semibold mb-2">{t('Prix')}</h2>
            <PriceTable pricing={pricing} />
          </section>

          <section className="break-inside-avoid">
            <h2 className="text-md font-semibold mb-2">{t('Travaux inclus')}</h2>
            <div className="space-y-3">
              {included.map((s) => (
                <div key={s.name} className="break-inside-avoid">
                  <p className="font-semibold">{t(s.name)}</p>
                  <ul className="mt-1 space-y-0.5 text-ink-secondary">
                    {s.lines.map((l) => (
                      <li key={l}>· {l}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {exclusions.length > 0 && (
              <p className="mt-3 text-xs text-ink-mute">
                <span className="font-semibold text-ink-secondary">{t('Exclus :')}</span> {exclusions.join(' · ')}
              </p>
            )}
          </section>

          <section className="break-inside-avoid">
            <h2 className="text-md font-semibold mb-2">{t('Calendrier des paiements')}</h2>
            <PaymentList q={q} total={pricing.total} />
          </section>

          <section className="break-inside-avoid">
            <h2 className="text-md font-semibold mb-2">{t('Termes et conditions')}</h2>
            <div className="space-y-2">
              {TERMS.map((s) => (
                <p key={s.t} className="text-xs text-ink-secondary leading-relaxed">
                  <span className="font-semibold text-ink">{t(s.t)}. </span>
                  {t(s.d)}
                </p>
              ))}
            </div>
          </section>

          <section className="break-inside-avoid rounded-xl border-2 border-ink/80 p-4 sm:p-5">
            <p className="label-caps">{t('Signature du client')}</p>
            <div className="h-24 mt-2 border-b border-hairline-strong flex items-end">
              {image ? <img src={image} alt={t('Signature de {name}', { name: sig.name })} className="max-h-24 max-w-full object-contain object-left" /> : <span className="font-serif italic text-2xl text-ink pb-1">{sig.name}</span>}
            </div>
            <p className="text-xs text-ink-secondary mt-3 leading-relaxed">
              {sig.ip
                ? t('Signé électroniquement par {name} le {date} à {time} · IP {ip}', { name: sig.name, date: at.date, time: at.time, ip: sig.ip })
                : t('Signé par {name} le {date}', { name: sig.name, date: at.date })}
              {q.signature?.device === 'tablet' && <> · {t('signé en personne sur tablette')}</>}
            </p>
            <p className="text-xs text-ink-mute mt-1">{t('Total accepté : {total} taxes incluses', { total: money(pricing.total) })}</p>
          </section>

          <section className="break-inside-avoid border-t border-hairline pt-5">
            <h2 className="text-sm font-semibold">{t('Droit de résolution du consommateur')}</h2>
            <p className="text-xs text-ink-secondary mt-1 leading-relaxed">{t(CONSUMER_RESOLUTION_TEXT)}</p>
            {canCancel(q) && (
              <Link to={`/portail/${q.no}/annulation`} className="btn btn-sm btn-ghost mt-2 -ml-2 print:hidden">
                <FileX className="w-4 h-4" />
                {t('Formulaire de résolution')}
              </Link>
            )}
          </section>

          <footer className="text-2xs text-ink-mute text-center pt-2">
            {co.name} · NEQ {co.neq} · {co.site}
          </footer>
        </article>
      </main>
    </div>
  )
}
