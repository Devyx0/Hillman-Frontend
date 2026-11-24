import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, CircleCheck, CircleDot, Copy, Ellipsis, Eye, FileQuestion, GitBranch, MapPin, Printer, Send, WifiOff } from 'lucide-react'
import { useAccess } from '../auth/access'
import { ActionsMenu, ComposeDrawer } from '../components/messaging'
import { StatusPicker } from '../components/quote-shared'
import { NoAccess } from '../components/states'
import { Empty, Page, RepAvatar, type Icon } from '../components/ui'
import { fullName } from '../data/mock'
import { leadById } from '../data/leads'
import { cloneQuote, newVersion } from '../data/quote-builder'
import { quoteById, useStore, type QuoteRecord } from '../data/store'
import { t } from '../i18n'
import { toast } from '../lib/toast'
import { cn, money } from '../lib/utils'
import { CoutantsSection } from './quote-builder/CoutantsSection'
import { EnvoiSection } from './quote-builder/EnvoiSection'
import { FormulaireSection, QuantitesSection } from './quote-builder/GutterSections'
import { ExpertisesSection, GarantiesSection, InfosSection, ObligationsSection, TravauxSection } from './quote-builder/InfosSections'
import { PhotosSection } from './quote-builder/PhotosSection'
import { AutresSection, NotesSection, PrixSection } from './quote-builder/PrixSections'
import { BudgetSection, DescriptionSection, VersionsSection } from './quote-builder/RenoSections'
import { SuiviSection } from './quote-builder/SuiviSection'
import { MobileTotalBar, SummaryRail } from './quote-builder/Summary'
import { useQuoteBuilder, type Builder } from './quote-builder/useQuoteBuilder'
import type { SectionId } from '../data/quote-builder'
import { API_MODE } from '../api/config'
import ApiQuoteBuilder from './quote-builder/api/ApiQuoteBuilder'

/**
 * Route `soumissions/:id` — remounts the editor when the id changes (mockup: `u4`).
 * Reads the quote from the store, so quotes created in this session (new-quote flow, versions) open too.
 */
export default function QuoteBuilderPage() {
  useStore()
  const { id } = useParams()
  const access = useAccess()
  // API mode: the editor works on the server's quote (tabs, totals) instead of the demo draft.
  if (API_MODE) return <ApiQuoteBuilder key={id} id={id ?? ''} />
  return <MockQuoteBuilderPage id={id} access={access} />
}

function MockQuoteBuilderPage({ id, access }: { id?: string; access: ReturnType<typeof useAccess> }) {
  const quote = quoteById(id)
  if (!quote)
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
  if (!access.quote(quote))
    return (
      <Page>
        <div className="card">
          <NoAccess>{t('Cette soumission appartient à un autre représentant ou à une compagnie à laquelle vous n’avez pas accès.')}</NoAccess>
        </div>
      </Page>
    )
  return <QuoteBuilder key={id} quote={quote} />
}

/** Title card: client, status, and the main actions. */
function Header({ b }: { b: Builder }) {
  const navigate = useNavigate()
  const access = useAccess()
  const { quote, client, company } = b
  const lead = leadById(quote.leadId)
  const copy = (asVersion: boolean) => {
    const next = asVersion ? newVersion(quote) : cloneQuote(quote, { parentId: undefined, version: 1 })
    if (!next) return
    toast(asVersion ? t('Version {n} créée — la version {from} reste consultable', { n: next.version ?? 2, from: quote.version ?? 1 }) : t('Soumission dupliquée : {no}', { no: next.no }))
    navigate(`/soumissions/${next.id}`)
  }
  const more: { icon: Icon; label: string; run: () => void }[] = [
    { icon: Copy, label: t('Dupliquer'), run: () => copy(false) },
    { icon: GitBranch, label: t('Nouvelle version'), run: () => copy(true) },
    { icon: Printer, label: t('Télécharger le PDF'), run: () => toast(t('PDF généré (gabarit {company})', { company: company.name })) },
  ]
  return (
    <div className="space-y-4">
      <button onClick={() => navigate('/soumissions')} className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-mute hover:text-ink">
        <ArrowLeft className="w-3.5 h-3.5" />
        {t('Soumissions')}
      </button>
      <div className="bg-white rounded-xl shadow-card p-5 flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <p className="eyebrow text-ink-mute tnum">
            {quote.no}
            {(quote.version ?? 1) > 1 && ` · V${quote.version}`}
          </p>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-ink">{client.company ?? fullName(client)}</h1>
          {client.company && <p className="text-sm text-ink-mute">{t('Contact : {name}', { name: fullName(client) })}</p>}
          <p className="text-md text-ink-secondary -mt-1">
            {t(quote.workType)} · <span className="tnum">{money(b.subtotal, false)}</span>
            <span className="text-ink-mute text-sm tnum"> · {t('{total} taxes incluses', { total: money(b.total) })}</span>
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-mute">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {client.no}, {client.street}, {client.city}
            </span>
            <span className="flex items-center gap-1.5">
              <RepAvatar id={b.repId} size="xs" />
              {b.rep.name}
            </span>
            {lead && access.lead(lead) && (
              <Link to={`/leads/${lead.id}`} className="hover:text-ink underline-offset-2 hover:underline">
                {t('Lead : {name}', { name: lead.name })}
              </Link>
            )}
            {quote.views > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-tone-good-soft text-tone-good-ink text-xs font-semibold">
                <Eye className="w-3.5 h-3.5" />
                {t('Ouverte {n}×', { n: quote.views })}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <StatusPicker q={quote} via="soumission" align="right" />
          <div className="flex flex-wrap items-center gap-2">
            <a href={`#/portail/${quote.no}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-secondary">
              <Eye className="w-4 h-4" />
              {t('Aperçu client')}
            </a>
            <button className="btn btn-sm btn-primary" onClick={() => b.scrollTo('envoi')}>
              <Send className="w-4 h-4" />
              {t('Envoyer')}
            </button>
            <ActionsMenu ctx={b.msgCtx} />
            <div className="relative">
              <button className="btn btn-sm btn-ghost px-2.5" aria-label={t("Plus d'actions")} onClick={() => b.setMoreMenu((o) => !o)}>
                <Ellipsis className="w-4 h-4" />
              </button>
              {b.moreMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => b.setMoreMenu(false)} />
                  <div className="absolute right-0 top-full mt-1.5 z-50 w-60 bg-white rounded-lg border border-hairline shadow-xl py-1 menu-in">
                    {more.map((m) => (
                      <button
                        key={m.label}
                        onClick={() => {
                          b.setMoreMenu(false)
                          m.run()
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-ink-secondary hover:bg-sand"
                      >
                        <m.icon className="w-4 h-4 text-ink-mute" />
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
    </div>
  )
}

/** "Hors ligne" banner: the rep keeps working; changes are queued and synced when the network returns. */
function OfflineBanner({ b }: { b: Builder }) {
  const { online, pending } = b.conn
  if (online) return null
  return (
    <div className="sticky top-16 z-30 rounded-lg bg-ink text-white px-4 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" role="status">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span className="font-semibold">{t('Hors ligne')}</span>
      <span className="text-white/80">
        {pending ? t('{n} modifications en attente — synchronisées au retour du réseau', { n: pending }) : t('Vos modifications seront gardées sur l’appareil et synchronisées au retour du réseau.')}
      </span>
    </div>
  )
}

const RENDER: Record<SectionId, (b: Builder) => React.ReactNode> = {
  infos: (b) => <InfosSection b={b} />,
  obligations: (b) => <ObligationsSection b={b} />,
  formulaire: (b) => <FormulaireSection b={b} />,
  photos: (b) => <PhotosSection b={b} />,
  quantites: (b) => <QuantitesSection b={b} />,
  description: (b) => <DescriptionSection b={b} />,
  travaux: (b) => <TravauxSection b={b} />,
  expertises: (b) => <ExpertisesSection b={b} />,
  coutants: (b) => <CoutantsSection b={b} />,
  budget: (b) => <BudgetSection b={b} />,
  versions: (b) => <VersionsSection b={b} />,
  garanties: (b) => <GarantiesSection b={b} />,
  prix: (b) => <PrixSection b={b} />,
  notes: (b) => <NotesSection b={b} />,
  autres: (b) => <AutresSection b={b} />,
  envoi: (b) => <EnvoiSection b={b} />,
  suivi: (b) => <SuiviSection b={b} />,
}

/** The soumission editor (mockup: `d4`). Tabs and options differ per company (PDF item 11). */
function QuoteBuilder({ quote }: { quote: QuoteRecord }) {
  const b = useQuoteBuilder(quote)
  const { sections, activeSection, done } = b
  return (
    <Page wide className="pb-24">
      <OfflineBanner b={b} />
      <Header b={b} />

      {/* Section tabs (below 2xl) */}
      <nav className="2xl:hidden sticky top-16 z-20 -mx-4 md:-mx-8 px-4 md:px-8 py-2 bg-sand/95 backdrop-blur border-b border-hairline flex gap-1.5 overflow-x-auto" aria-label={t('Onglets de la soumission')}>
        {sections.map((s) => (
          <button key={s.id} onClick={() => b.scrollTo(s.id)} className={cn('shrink-0 h-8 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1.5', activeSection === s.id ? 'bg-ink text-white' : 'bg-white text-ink-mute shadow-card')}>
            {done[s.id] ? <CircleCheck className={cn('w-3.5 h-3.5', activeSection === s.id ? 'text-white' : 'text-tone-good')} /> : <CircleDot className="w-3.5 h-3.5" />}
            {t(s.label)}
          </button>
        ))}
      </nav>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[180px_minmax(0,1fr)_330px] gap-6 items-start">
        {/* Section rail (2xl and up) */}
        <aside className="hidden 2xl:block sticky top-24 space-y-3">
          <div className="bg-white rounded-xl shadow-card p-2">
            {sections.map((s) => (
              <button key={s.id} onClick={() => b.scrollTo(s.id)} className={cn('w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-left transition-colors', activeSection === s.id ? 'bg-primary text-white font-semibold' : 'text-ink-mute hover:bg-sand hover:text-ink')}>
                <s.icon className="w-4 h-4 shrink-0" />
                <span className="truncate flex-1">{t(s.label)}</span>
                {done[s.id] && <Check className={cn('w-3.5 h-3.5', activeSection === s.id ? 'text-white' : 'text-tone-good')} />}
              </button>
            ))}
          </div>
        </aside>

        <div className="space-y-6 min-w-0">
          {sections.map((s) => (
            <div key={s.id}>{RENDER[s.id](b)}</div>
          ))}
        </div>

        <SummaryRail b={b} />
      </div>

      <MobileTotalBar b={b} />
      <ComposeDrawer kind={b.composeKind} ctx={b.msgCtx} onClose={() => b.setComposeKind(null)} />
    </Page>
  )
}
