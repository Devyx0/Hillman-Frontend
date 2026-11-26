/**
 * Quote editor with the backend (route `soumissions/:id` in API mode). The quote is loaded with GET /quotes/:id
 * and every section saves through its endpoint; totals, taxes and margins always come from the server.
 */
import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Copy, Ellipsis, Eye, FileQuestion, GitBranch, LoaderCircle, MapPin, Send, Trash2 } from 'lucide-react'
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
import { ApiNotes } from '../../../components/ApiNotes'
import { BuilderSection } from '../../../components/quote-shared'
import { useQuoteBuilder, type Builder } from '../useQuoteBuilder'
import { ActionsMenu, ComposeDrawer } from '../../../components/messaging'
import { FormulaireSection, QuantitesSection } from '../GutterSections'
import { ActualProfit } from '../CoutantsSection'
import { Attachments, CaaOption, PaymentSchedule, TierOptions } from '../PrixSections'
import { WorkOrderNoteField } from '../WorkOrderNoteField'
import { EnvoiSection } from '../EnvoiSection'
import { SuiviSection } from '../SuiviSection'

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

type TabId = 'details' | 'travaux' | 'prix' | 'fichiers' | 'envoi' | 'suivi'

/** The quote is long: one tab per stage of the work. The tab is kept in the URL (`?onglet=`). */
const TABS: { id: TabId; label: string; hint: string }[] = [
  { id: 'details', label: 'Détails', hint: 'Client, chantier, obligations' },
  { id: 'travaux', label: 'Travaux', hint: 'Clauses, expertises, garanties' },
  { id: 'prix', label: 'Prix', hint: 'Coûtants, prix, ajouts' },
  { id: 'fichiers', label: 'Notes et fichiers', hint: 'Notes, photos, pièces jointes' },
  { id: 'envoi', label: 'Envoi', hint: 'PDF et envoi au client' },
  { id: 'suivi', label: 'Suivi', hint: 'Relances, paiements, journal' },
]
const TAB_IDS = TABS.map((x) => x.id)

function Editor({ s }: { s: S }) {
  const { quote, isAdmin } = s
  // The original editor's state, for the parts that have no API yet (gutter form, protection options, CAA, payment
  // schedule, real profit, work-order note, attachments, sending, follow-up and payments). It works on this device's
  // draft only and never writes the quote's amounts or status (see syncQuoteAmounts, EnvoiSection, recordPayment).
  const b = useQuoteBuilder(quoteById(quote.id)!)
  const company = b.quote.company
  const [params, setParams] = useSearchParams()
  const fromUrl = params.get('onglet') as TabId | null
  const tab: TabId = fromUrl && TAB_IDS.includes(fromUrl) ? fromUrl : 'details'
  // A tab is mounted the first time it is opened, then kept: switching tabs never loses unsaved edits.
  const [visited, setVisited] = useState<Set<TabId>>(() => new Set([tab]))
  if (!visited.has(tab)) setVisited(new Set([...visited, tab]))
  const setTab = (next: TabId) => {
    setParams(
      (p) => {
        p.set('onglet', next)
        return p
      },
      { replace: true },
    )
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const counts: Partial<Record<TabId, number>> = { travaux: quote.scope_items.length, fichiers: quote.photos.length }
  const panel = (id: TabId, children: ReactNode) =>
    visited.has(id) ? (
      <div role="tabpanel" id={`tab-${id}`} aria-labelledby={`tabbtn-${id}`} hidden={tab !== id} className="space-y-6">
        {children}
      </div>
    ) : null

  return (
    <Page wide className="pb-28 xl:pb-10">
      <Header s={s} b={b} onTab={setTab} />
      <div className="sticky top-16 z-20 -mx-4 md:-mx-8 px-4 md:px-8 bg-sand/95 backdrop-blur border-b border-hairline">
        <div className="flex items-center gap-3">
          <nav className="flex-1 min-w-0 flex gap-1 overflow-x-auto nav-scroll -mb-px" role="tablist" aria-label={t('Onglets de la soumission')}>
            {TABS.map((x) => {
              const active = tab === x.id
              return (
                <button
                  key={x.id}
                  id={`tabbtn-${x.id}`}
                  role="tab"
                  aria-selected={active}
                  aria-controls={`tab-${x.id}`}
                  onClick={() => setTab(x.id)}
                  title={t(x.hint)}
                  className={cn(
                    'shrink-0 h-11 px-3 md:px-4 inline-flex items-center gap-2 text-sm font-semibold border-b-2 transition-colors',
                    active ? 'border-primary text-ink' : 'border-transparent text-ink-mute hover:text-ink hover:border-hairline-strong',
                  )}
                >
                  {t(x.label)}
                  {!!counts[x.id] && <span className={cn('min-w-5 h-5 px-1.5 rounded-full text-2xs tnum inline-flex items-center justify-center', active ? 'bg-primary text-white' : 'bg-white text-ink-mute')}>{counts[x.id]}</span>}
                </button>
              )
            })}
          </nav>
          {s.pending > 0 && (
            <span className="shrink-0 inline-flex items-center gap-1.5 text-xs text-ink-mute" role="status">
              <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
              <span className="hidden sm:inline">{t('Enregistrement…')}</span>
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <div className="min-w-0">
          {panel(
            'details',
            <>
              <ApiInfosSection s={s} />
              <ApiObligationsSection s={s} />
              {company === 'sg' && <FormulaireSection b={b} />}
              {company === 'sg' && <QuantitesSection b={b} />}
            </>,
          )}
          {panel(
            'travaux',
            <>
              <ApiTravauxSection s={s} />
              <ApiExpertisesSection s={s} />
              <ApiGarantiesSection s={s} />
            </>,
          )}
          {panel(
            'prix',
            <>
              <ApiPrixSection
                s={s}
                extra={
                  <>
                    {(company === 'sg' || b.tiered) && (
                      <div className="mt-6 grid md:grid-cols-2 gap-4">
                        {company === 'sg' && <CaaOption b={b} />}
                        {b.tiered && <TierOptions b={b} />}
                      </div>
                    )}
                    <PaymentSchedule b={b} total={toNum(quote.totals.total)} />
                  </>
                }
              />
              <ApiCoutantsSection s={s} extra={s.costView && b.canProfit ? <ActualProfit b={b} /> : undefined} />
            </>,
          )}
          {panel(
            'fichiers',
            <>
              <ApiNotesSection
                s={s}
                extra={
                  <div className="mt-4">
                    <WorkOrderNoteField b={b} />
                  </div>
                }
              />
              <BuilderSection id="internes" title={t('Notes internes')}>
                <p className="text-xs text-ink-mute -mt-2 mb-3">{t('Visibles par l’équipe seulement, jamais imprimées.')}</p>
                <ApiNotes subject="quote" id={quote.id} company={s.company} className="p-0 shadow-none" />
              </BuilderSection>
              <ApiPhotosSection s={s} />
              {company === 'toit' && (
                <BuilderSection id="autres" title={t('Pièces jointes')}>
                  <Attachments b={b} />
                </BuilderSection>
              )}
            </>,
          )}
          {panel(
            'envoi',
            <>
              <ApiDocumentsSection s={s} />
              <EnvoiSection b={b} />
            </>,
          )}
          {panel(
            'suivi',
            <>
              <SuiviSection b={b} />
              {isAdmin && <ApiHistorySection s={s} />}
            </>,
          )}
        </div>
        <Summary s={s} />
      </div>
      {/* Message drafts opened from the original sections (Envoi, Suivi). */}
      <ComposeDrawer kind={b.composeKind} ctx={b.msgCtx} onClose={() => b.setComposeKind(null)} />
      {/* Phones and tablets: the total stays in view, and the next tab is one tap away. */}
      <div className="xl:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-hairline px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] flex items-center gap-3 text-sm">
        <div className="min-w-0 flex-1">
          <p className="text-2xs text-ink-mute leading-tight">{t('Total taxes incluses')}</p>
          <p className="font-semibold tnum text-ink">{money(toNum(quote.totals.total))}</p>
        </div>
        {tab !== 'suivi' && (
          <button className="btn btn-sm btn-secondary" onClick={() => setTab(TAB_IDS[TAB_IDS.indexOf(tab) + 1])}>
            {t(TABS[TAB_IDS.indexOf(tab) + 1].label)}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </Page>
  )
}

function Header({ s, b, onTab }: { s: S; b: Builder; onTab: (tab: TabId) => void }) {
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
      <div className="bg-white rounded-xl shadow-card p-4 md:p-5 flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <p className="eyebrow text-ink-mute tnum flex flex-wrap items-center gap-2">
            {quote.display_number}
            {quote.variant_label && ` · ${t('Version {label}', { label: quote.variant_label })}`}
            {company && <CompanyBadge id={company} />}
          </p>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-ink break-words">
            {client ? (
              <Link to={`/clients/${client.id}`} className="hover:underline underline-offset-4">
                {client.company ?? fullName(client)}
              </Link>
            ) : (
              '—'
            )}
          </h1>
          <p className="text-sm md:text-md text-ink-secondary -mt-1">
            {[quote.work_type ? t(quote.work_type.name) : '', quote.work_summary].filter(Boolean).join(' · ')}
            <span className="whitespace-nowrap">
              {' · '}
              <span className="tnum font-semibold text-ink">{money(toNum(quote.totals.subtotal), false)}</span>
              <span className="text-ink-mute text-sm tnum"> · {t('{total} taxes incluses', { total: money(toNum(quote.totals.total)) })}</span>
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm text-ink-mute">
            {site && (
              <span className="flex items-center gap-1.5 min-w-0">
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
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {record && <StatusPicker q={record} via="soumission" align="right" onChange={() => void run(() => api.getQuote(quote.id))} />}
          <div className="flex flex-wrap items-center justify-end gap-2 ml-auto lg:ml-0">
            {/* Client preview, sending and messages have no API yet: kept as in the original editor. */}
            <a href={`#/portail/${quote.display_number}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-secondary" title={t('Aperçu client')} aria-label={t('Aperçu client')}>
              <Eye className="w-4 h-4" />
              <span className="hidden xl:inline">{t('Aperçu client')}</span>
            </a>
            <button className="btn btn-sm btn-primary" onClick={() => onTab('envoi')}>
              <Send className="w-4 h-4" />
              {t('Envoyer')}
            </button>
            <ActionsMenu ctx={b.msgCtx} />
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
