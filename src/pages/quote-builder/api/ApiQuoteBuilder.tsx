/**
 * Quote editor with the backend (route `soumissions/:id` in API mode). The quote is loaded with GET /quotes/:id
 * and every section saves through its endpoint; totals, taxes and margins always come from the server.
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Copy, Ellipsis, FileQuestion, GitBranch, LoaderCircle, MapPin, Trash2 } from 'lucide-react'
import * as api from '../../../api/endpoints'
import { errorMessage } from '../../../api/http'
import { OPEN_API_STATUSES, REFUSAL_FR, toNum } from '../../../api/mappers'
import { useAuth } from '../../../auth/AuthContext'
import { useAccess } from '../../../auth/access'
import { StatusPicker } from '../../../components/quote-shared'
import { ErrorState, NoAccess, confirmAction } from '../../../components/states'
import { CompanyBadge, Empty, Page, RepAvatar, type Icon } from '../../../components/ui'
import { deleteQuotes, duplicateQuote } from '../../../data/actions'
import { clientById, fullName, repById } from '../../../data/mock'
import { quoteById, useStore } from '../../../data/store'
import { locale, t } from '../../../i18n'
import { toast } from '../../../lib/toast'
import { cn, money } from '../../../lib/utils'
import { ApiDocumentsSection, ApiHistorySection, ApiPhotosSection } from './media'
import { ApiCoutantsSection, ApiExpertisesSection, ApiGarantiesSection, ApiInfosSection, ApiNotesSection, ApiObligationsSection, ApiPrixSection, ApiTravauxSection } from './sections'
import { useApiQuote, type ApiQuoteState } from './useApiQuote'

type S = ApiQuoteState & { quote: NonNullable<ApiQuoteState['quote']> }

const longDate = (iso: string) => new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' })

export default function ApiQuoteBuilder({ id }: { id: string }) {
  useStore()
  const state = useApiQuote(id)
  const access = useAccess()

  if (state.load === 'loading')
    return (
      <Page>
        <div className="flex justify-center py-16 text-ink-mute">
          <LoaderCircle className="w-5 h-5 animate-spin" />
        </div>
      </Page>
    )
  if (state.load === 'missing' || (state.load === 'ready' && !state.quote))
    return (
      <Page>
        <div className="card p-6">
          <Empty icon={FileQuestion} title={t('Soumission introuvable')}>
            <Link to="/soumissions" className="btn btn-sm btn-secondary mt-3">
              {t('Retour aux soumissions')}
            </Link>
          </Empty>
        </div>
      </Page>
    )
  if (state.load === 'error' || !state.quote)
    return (
      <Page>
        <div className="card">
          <ErrorState onRetry={state.retry}>{state.error}</ErrorState>
        </div>
      </Page>
    )
  const record = quoteById(state.quote.id)
  if (record && !access.quote(record))
    return (
      <Page>
        <div className="card">
          <NoAccess>{t('Cette soumission appartient à un autre représentant ou à une compagnie à laquelle vous n’avez pas accès.')}</NoAccess>
        </div>
      </Page>
    )
  return <Editor s={state as S} />
}

const SECTIONS: { id: string; label: string; cost?: boolean; admin?: boolean }[] = [
  { id: 'infos', label: 'Informations' },
  { id: 'obligations', label: 'Obligations' },
  { id: 'travaux', label: 'Travaux' },
  { id: 'expertises', label: 'Expertises' },
  { id: 'garanties', label: 'Garanties' },
  { id: 'coutants', label: 'Coûtants' },
  { id: 'prix', label: 'Prix' },
  { id: 'notes', label: 'Notes' },
  { id: 'photos', label: 'Photos' },
  { id: 'envoi', label: 'PDF' },
  { id: 'suivi', label: 'Journal', admin: true },
]

function Editor({ s }: { s: S }) {
  const { quote, isAdmin } = s
  const sections = SECTIONS.filter((x) => !x.admin || isAdmin)
  const scrollTo = (sid: string) => document.getElementById(`s-${sid}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <Page wide className="pb-24">
      <Header s={s} />
      <nav className="sticky top-16 z-20 -mx-4 md:-mx-8 px-4 md:px-8 py-2 bg-sand/95 backdrop-blur border-b border-hairline flex gap-1.5 overflow-x-auto" aria-label={t('Onglets de la soumission')}>
        {sections.map((x) => (
          <button key={x.id} onClick={() => scrollTo(x.id)} className="shrink-0 h-8 px-3 rounded-md text-xs font-semibold bg-white text-ink-mute shadow-card hover:text-ink">
            {x.id === 'coutants' && !s.costView ? t('Matériaux et main-d’œuvre') : t(x.label)}
          </button>
        ))}
        {s.pending > 0 && (
          <span className="ml-auto shrink-0 inline-flex items-center gap-1.5 text-xs text-ink-mute">
            <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
            {t('Enregistrement…')}
          </span>
        )}
      </nav>
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <ApiInfosSection s={s} />
          <ApiObligationsSection s={s} />
          <ApiTravauxSection s={s} />
          <ApiExpertisesSection s={s} />
          <ApiGarantiesSection s={s} />
          <ApiCoutantsSection s={s} />
          <ApiPrixSection s={s} />
          <ApiNotesSection s={s} />
          <ApiPhotosSection s={s} />
          <ApiDocumentsSection s={s} />
          {isAdmin && <ApiHistorySection s={s} />}
        </div>
        <Summary s={s} />
      </div>
      {/* Mobile total bar */}
      <div className="xl:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-hairline px-4 py-2.5 flex items-center justify-between text-sm">
        <span className="text-ink-mute">{t('Total')}</span>
        <span className="font-semibold tnum">{money(toNum(quote.totals.total))}</span>
      </div>
    </Page>
  )
}

function Header({ s }: { s: S }) {
  const { quote, run, company } = s
  const navigate = useNavigate()
  const { can } = useAuth()
  const [menu, setMenu] = useState(false)
  const [versionLabel, setVersionLabel] = useState<string | null>(null)
  const client = clientById(quote.client_id)
  const record = quoteById(quote.id)
  const rep = repById(quote.assigned_user_id ?? '')
  const site = [[quote.site_civic_number, quote.site_street].filter(Boolean).join(', '), quote.site_city].filter(Boolean).join(', ')

  const copy = async (asVersion: boolean, label?: string) => {
    try {
      const next = await duplicateQuote(quote.id, { asVersion, label })
      toast(asVersion ? t('Nouvelle version créée : {no}', { no: next.no }) : t('Soumission dupliquée : {no}', { no: next.no }))
      navigate(`/soumissions/${next.id}`)
    } catch (e) {
      toast(errorMessage(e))
    }
  }
  const remove = async () => {
    if (!(await confirmAction({ title: t('Supprimer cette soumission?'), body: t('Cette action est définitive. Les relances prévues seront annulées.'), confirmLabel: t('Supprimer'), danger: true }))) return
    try {
      await deleteQuotes([quote.id])
      toast(t('Soumission supprimée'))
      navigate('/soumissions')
    } catch (e) {
      toast(errorMessage(e))
    }
  }
  const more: { icon: Icon; label: string; run: () => void; danger?: boolean }[] = [
    { icon: Copy, label: t('Dupliquer'), run: () => void copy(false) },
    { icon: GitBranch, label: t('Nouvelle version'), run: () => setVersionLabel('') },
    ...(can('delete') && s.isAdmin ? [{ icon: Trash2, label: t('Supprimer'), run: () => void remove(), danger: true }] : []),
  ]

  return (
    <div className="space-y-4">
      <button onClick={() => navigate('/soumissions')} className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-mute hover:text-ink">
        <ArrowLeft className="w-3.5 h-3.5" />
        {t('Soumissions')}
      </button>
      <div className="bg-white rounded-xl shadow-card p-5 flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <p className="eyebrow text-ink-mute tnum flex flex-wrap items-center gap-2">
            {quote.display_number}
            {quote.variant_label && ` · ${t('Version {label}', { label: quote.variant_label })}`}
            {company && <CompanyBadge id={company} />}
          </p>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-ink">
            {client ? (
              <Link to={`/clients/${client.id}`} className="hover:underline underline-offset-4">
                {client.company ?? fullName(client)}
              </Link>
            ) : (
              '—'
            )}
          </h1>
          <p className="text-md text-ink-secondary -mt-1">
            {quote.work_type ? t(quote.work_type.name) : ''}
            {quote.work_summary ? ` · ${quote.work_summary}` : ''} · <span className="tnum">{money(toNum(quote.totals.subtotal), false)}</span>
            <span className="text-ink-mute text-sm tnum"> · {t('{total} taxes incluses', { total: money(toNum(quote.totals.total)) })}</span>
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-mute">
            {site && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {site}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <RepAvatar id={quote.assigned_user_id ?? ''} size="xs" />
              {rep?.name ?? t('Non assigné')}
            </span>
            <span>{longDate(quote.quote_date + 'T12:00')}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {record && <StatusPicker q={record} via="soumission" align="right" onChange={() => void run(() => api.getQuote(quote.id))} />}
          <button className="btn btn-sm btn-primary" onClick={() => document.getElementById('s-envoi')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
            {t('PDF')}
          </button>
          <div className="relative">
            <button className="btn btn-sm btn-ghost px-2.5" aria-label={t("Plus d'actions")} onClick={() => setMenu((o) => !o)}>
              <Ellipsis className="w-4 h-4" />
            </button>
            {menu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
                <div className="absolute right-0 top-full mt-1.5 z-50 w-60 bg-white rounded-lg border border-hairline shadow-xl py-1 menu-in">
                  {more.map((m) => (
                    <button
                      key={m.label}
                      onClick={() => {
                        setMenu(false)
                        m.run()
                      }}
                      className={cn('w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-sand', m.danger ? 'text-tone-critical-ink' : 'text-ink-secondary')}
                    >
                      <m.icon className="w-4 h-4" />
                      {m.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {versionLabel !== null && (
        <form
          className="bg-white rounded-xl shadow-card p-4 flex flex-col sm:flex-row sm:items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            const label = versionLabel.trim()
            setVersionLabel(null)
            void copy(true, label || undefined)
          }}
        >
          <label className="flex-1 flex flex-col gap-1">
            <span className="label-caps">{t('Nouvelle version · libellé (facultatif)')}</span>
            <input className="form-input" maxLength={40} value={versionLabel} onChange={(e) => setVersionLabel(e.target.value)} placeholder={t('ex. B, Option métal…')} autoFocus />
          </label>
          <div className="flex gap-2">
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setVersionLabel(null)}>
              {t('Annuler')}
            </button>
            <button type="submit" className="btn btn-sm btn-primary">
              <GitBranch className="w-4 h-4" />
              {t('Créer la version')}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function Summary({ s }: { s: S }) {
  const { quote, costView } = s
  const open = OPEN_API_STATUSES.includes(quote.status)
  const rows: [string, string][] = [
    [t('Sous-total'), money(toNum(quote.totals.subtotal))],
    [t('TPS'), money(toNum(quote.totals.gst))],
    [t('TVQ'), money(toNum(quote.totals.qst))],
  ]
  return (
    <aside className="hidden xl:block sticky top-32 space-y-4">
      <div className="bg-white rounded-xl shadow-card p-5 space-y-2 tnum">
        {rows.map(([l, v]) => (
          <p key={l} className="flex justify-between text-sm text-ink-secondary">
            <span>{l}</span>
            <span>{v}</span>
          </p>
        ))}
        <p className="flex justify-between text-lg font-semibold text-ink border-t border-hairline pt-2">
          <span>{t('Total')}</span>
          <span>{money(toNum(quote.totals.total))}</span>
        </p>
        {costView && quote.costs && (
          <div className="border-t border-hairline pt-2 space-y-1 text-sm">
            <p className="flex justify-between text-ink-mute">
              <span>{t('Coût estimé')}</span>
              <span>{money(toNum(quote.costs.estimated_cost_amount))}</span>
            </p>
            <p className="flex justify-between font-semibold text-ink">
              <span>{t('Marge')}</span>
              <span>
                {money(toNum(quote.costs.margin_amount))}
                {quote.costs.margin_pct !== null && ` · ${toNum(quote.costs.margin_pct).toLocaleString(locale(), { maximumFractionDigits: 1 })} %`}
              </span>
            </p>
          </div>
        )}
      </div>
      <div className="bg-white rounded-xl shadow-card p-5 space-y-2 text-sm">
        <p className="label-caps">{t('Suivi')}</p>
        {quote.first_sent_at && <p className="text-ink-secondary">{t('Envoyée le {date}', { date: longDate(quote.first_sent_at) })}</p>}
        <p className="text-ink-secondary">{quote.view_count ? t('Ouverte {n}× · dernière fois le {date}', { n: quote.view_count, date: quote.last_viewed_at ? longDate(quote.last_viewed_at) : '—' }) : t('Pas encore ouverte par le client')}</p>
        {quote.accepted_at && (
          <p className="text-tone-good-ink font-semibold">
            {quote.accepted_via === 'office' ? t('Acceptée au bureau le {date}', { date: longDate(quote.accepted_at) }) : t('Signée en ligne le {date}', { date: longDate(quote.accepted_at) })}
          </p>
        )}
        {quote.refused_at && (
          <p className="text-tone-critical-ink">
            <span className="font-semibold">{t('Refusée le {date}', { date: longDate(quote.refused_at) })}</span>
            {quote.refusal_reason && ` · ${t(REFUSAL_FR[quote.refusal_reason])}`}
            {quote.refusal_comment && <span className="block text-ink-mute">« {quote.refusal_comment} »</span>}
          </p>
        )}
        {quote.follow_ups_stopped_at && <p className="text-ink-mute">{t('Relances arrêtées le {date}', { date: longDate(quote.follow_ups_stopped_at) })}</p>}
        {!open && !quote.accepted_at && !quote.refused_at && <p className="text-ink-mute">{t('Soumission fermée')}</p>}
      </div>
    </aside>
  )
}
