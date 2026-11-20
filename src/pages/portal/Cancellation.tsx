import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Clock, Mail } from 'lucide-react'
import { Notice } from '../../components/states'
import { fullName } from '../../data/mock'
import { setQuoteStatus, updateQuote, type QuoteRecord } from '../../data/store'
import { locale, t } from '../../i18n'
import { cn } from '../../lib/utils'
import { SignaturePad } from './parts'
import { CANCELLATION_DAYS, cancellationDeadline, canCancel } from './pricing'
import { PortalError, PortalFooter, PortalFrame, PortalNotFound, PortalSkeleton, clientAddress, companyInfo, formatSignedAt, usePortalQuote } from './shell'

/** Reason recorded on the quote when the consumer cancels. */
const CANCEL_REASON = 'Résolution (art. 58 LPC)'

const longDate = (d: Date | string) => new Date(d).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' })

/**
 * Consumer's cancellation form (`/portail/:no/annulation`): "Formulaire de résolution" under art. 58 of the
 * Consumer Protection Act, open for 10 days after signing.
 */
export default function Cancellation() {
  const { no } = useParams()
  const { state, quote: q, client, retry } = usePortalQuote(no)
  if (state === 'loading') return <PortalSkeleton />
  if (state === 'error') return <PortalError onRetry={retry} />
  if (!q || !client) return <PortalNotFound no={no} />
  return (
    <PortalFrame company={q.company} className="max-w-3xl">
      <Link to={`/portail/${q.no}`} className="btn btn-sm btn-ghost -ml-2">
        <ArrowLeft className="w-4 h-4" />
        {t('Retour')}
      </Link>
      {q.cancellation ? (
        <Done q={q} email={client.email} />
      ) : !q.signature || q.status !== 'Signé' ? (
        <Closed title={t('Formulaire non disponible')}>{t('Le formulaire de résolution est offert seulement pour un contrat signé en ligne ou sur tablette. Pour toute question, appelez-nous au {phone}.', { phone: companyInfo(q.company).phone })}</Closed>
      ) : !canCancel(q) ? (
        <Closed title={t('Le délai de résolution est expiré')}>
          {t('Le délai de {n} jours pour résoudre ce contrat a pris fin le {date}. Pour toute question, appelez-nous au {phone}.', { n: CANCELLATION_DAYS, date: longDate(cancellationDeadline(q.signature.at)), phone: companyInfo(q.company).phone })}
        </Closed>
      ) : (
        <Form q={q} defaultName={fullName(client)} defaultAddress={clientAddress(q)} />
      )}
      <PortalFooter company={q.company} />
    </PortalFrame>
  )
}

function Form({ q, defaultName, defaultAddress }: { q: QuoteRecord; defaultName: string; defaultAddress: string }) {
  const co = companyInfo(q.company)
  const signedOn = longDate(q.signature!.at)
  const [name, setName] = useState(defaultName)
  const [address, setAddress] = useState(defaultAddress)
  const [reason, setReason] = useState('')
  const [signed, setSigned] = useState(false)
  const [agree, setAgree] = useState(false)
  const [sending, setSending] = useState(false)
  const ready = name.trim() && address.trim() && signed && agree && !sending

  const submit = () => {
    if (!ready) return
    setSending(true)
    updateQuote(q.id, { cancellation: { at: new Date().toISOString(), reason: reason.trim() || undefined } })
    setQuoteStatus(q.id, 'Refusé', { reason: CANCEL_REASON })
    window.scrollTo({ top: 0 })
  }

  return (
    <section className="bg-white rounded-2xl shadow-card p-5 md:p-8 space-y-6">
      <header className="text-center border-b border-hairline pb-5">
        <p className="eyebrow text-ink-mute">{t('Loi sur la protection du consommateur, article 58')}</p>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-2">{t('Formulaire de résolution')}</h1>
        <p className="text-sm text-ink-mute mt-2 max-w-lg mx-auto">{t('À remplir par le consommateur et à envoyer seulement s’il désire résoudre le contrat.')}</p>
      </header>

      <Notice tone="info">
        {t('Vous pouvez résoudre ce contrat sans frais ni pénalité jusqu’au {date}. Vous n’avez pas à donner de raison.', { date: longDate(cancellationDeadline(q.signature!.at)) })}
      </Notice>

      <Block title={t('Destinataire (commerçant)')}>
        <Row k={t('Nom')} v={co.name} />
        <Row k={t('Adresse')} v={co.address} />
        <Row k={t('Téléphone')} v={co.phone} />
        <Row k={t('Courriel')} v={co.email} />
        <Row k={t('Licence RBQ')} v={co.rbq} />
      </Block>

      <Block title={t('Contrat')}>
        <Row k={t('Numéro du contrat')} v={q.no} />
        <Row k={t('Date du contrat')} v={signedOn} />
      </Block>

      <div className="rounded-xl bg-sand p-4 text-md leading-relaxed">
        {t('En vertu de l’article 58 de la Loi sur la protection du consommateur, je résous le contrat no {no} conclu le {date} avec {merchant}.', { no: q.no, date: signedOn, merchant: co.name })}
      </div>

      <Block title={t('Consommateur')}>
        <div className="grid gap-3">
          <label className="flex flex-col gap-1">
            <span className="label-caps">{t('Nom du consommateur')}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="form-input" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label-caps">{t('Adresse du consommateur')}</span>
            <input value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" className="form-input" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label-caps">{t('Motif (facultatif)')}</span>
            <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className="form-input h-auto py-2.5" />
          </label>
        </div>
      </Block>

      <Block title={t('Date et signature')}>
        <Row k={t('Date')} v={longDate(new Date())} />
        <div className="mt-3">
          <SignaturePad onChange={setSigned} />
        </div>
        <label className="flex items-start gap-2.5 text-sm text-ink-secondary mt-3">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="w-5 h-5 mt-0.5 accent-[var(--color-primary)] shrink-0" />
          {t('Je confirme vouloir résoudre ce contrat. Tout montant versé me sera remboursé dans les 15 jours (art. 60 LPC).')}
        </label>
      </Block>

      <button disabled={!ready} onClick={submit} className="btn btn-lg w-full bg-tone-critical text-white hover:opacity-90 disabled:opacity-50">
        {t('Envoyer le formulaire de résolution')}
      </button>
      <p className="text-2xs text-ink-mute text-center">{t('Vous pouvez aussi remettre ce formulaire au représentant ou envoyer un avis écrit à l’adresse ci-dessus.')}</p>
    </section>
  )
}

function Done({ q, email }: { q: QuoteRecord; email: string }) {
  const at = formatSignedAt(q.cancellation!.at, locale())
  return (
    <section className="rounded-2xl bg-white shadow-card p-6 md:p-10 text-center">
      <span className="w-16 h-16 rounded-full bg-tone-good text-white mx-auto flex items-center justify-center">
        <Check className="w-8 h-8" />
      </span>
      <h1 className="text-3xl font-semibold tracking-tight mt-5">{t('Votre contrat est résolu')}</h1>
      <p className="text-md text-ink-mute mt-2 max-w-lg mx-auto">
        {t('Nous avons reçu votre formulaire de résolution pour le contrat {no} le {date} à {time}. Aucuns frais ni pénalité ne s’appliquent.', { no: q.no, date: at.date, time: at.time })}
      </p>
      <ul className="mt-6 max-w-md mx-auto text-left space-y-2.5 text-sm text-ink-secondary">
        <li className="flex gap-2">
          <Mail className="w-4 h-4 mt-0.5 shrink-0 text-ink-mute" />
          {t('Une confirmation a été envoyée à {email}.', { email })}
        </li>
        <li className="flex gap-2">
          <Clock className="w-4 h-4 mt-0.5 shrink-0 text-ink-mute" />
          {t('Tout montant versé vous sera remboursé dans les 15 jours.')}
        </li>
      </ul>
    </section>
  )
}

function Closed({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white shadow-card p-6 md:p-10 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-md text-ink-mute mt-2 max-w-lg mx-auto">{children}</p>
    </section>
  )
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="label-caps mb-2">{title}</legend>
      <div className="rounded-xl border border-hairline p-4">{children}</div>
    </fieldset>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-3 py-1.5 text-sm')}>
      <span className="text-ink-mute">{k}</span>
      <span className="font-semibold sm:text-right">{v}</span>
    </div>
  )
}
