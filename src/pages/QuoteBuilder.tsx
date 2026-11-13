import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, CircleCheck, CircleDot, Copy, Ellipsis, Eye, GitBranch, MapPin, Printer, Send } from 'lucide-react'
import { ActionsMenu, ComposeDrawer } from '../components/messaging'
import { Page, RepAvatar, type Icon } from '../components/ui'
import { QUOTES, QUOTE_STATUSES, fullName, repById, type Quote } from '../data/mock'
import { t } from '../i18n'
import { toast } from '../lib/toast'
import { cn, money } from '../lib/utils'
import { CoutantsSection } from './quote-builder/CoutantsSection'
import { EnvoiSection } from './quote-builder/EnvoiSection'
import { ExpertisesSection, GarantiesSection, InfosSection, ObligationsSection, TravauxSection } from './quote-builder/InfosSections'
import { Select } from '../components/filters'
import { AutresSection, NotesSection, PrixSection } from './quote-builder/PrixSections'
import { MobileTotalBar, SummaryRail } from './quote-builder/Summary'
import { useQuoteBuilder, type Builder } from './quote-builder/useQuoteBuilder'

/** Route `soumissions/:id` — remounts the editor when the id changes (mockup: `u4`). */
export default function QuoteBuilderPage() {
  const { id } = useParams()
  const quote = QUOTES.find((q) => q.id === id) ?? QUOTES[0]
  return <QuoteBuilder key={id} quote={quote} />
}

/** Title card: client, status, and the main actions. */
function Header({ b }: { b: Builder }) {
  const navigate = useNavigate()
  const { quote, client, company, status } = b
  const more: { icon: Icon; label: string; toast: string }[] = [
    { icon: Copy, label: t('Dupliquer'), toast: t('Soumission dupliquée') },
    { icon: GitBranch, label: t('Nouvelle version'), toast: t('Version 2 créée — la v1 reste consultable') },
    { icon: Printer, label: t('Télécharger le PDF'), toast: t('PDF généré (gabarit {company})', { company: company.name }) },
  ]
  return (
    <div className="space-y-4">
      <button onClick={() => navigate('/soumissions')} className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-mute hover:text-ink">
        <ArrowLeft className="w-3.5 h-3.5" />
        {t('Soumissions')}
      </button>
      <div className="bg-white rounded-xl shadow-card p-5 flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <p className="eyebrow text-ink-mute tnum">{quote.no}</p>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-ink">{fullName(client)}</h1>
          <p className="text-md text-ink-secondary -mt-1">
            {t(quote.workType)} · {money(b.subtotal, false)}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-mute">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {client.no}, {client.street}, {client.city}
            </span>
            <span className="flex items-center gap-1.5">
              <RepAvatar id={b.repId} size="xs" />
              {repById(b.repId)!.name}
            </span>
            {quote.views > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-tone-good-soft text-tone-good-ink text-xs font-semibold">
                <Eye className="w-3.5 h-3.5" />
                {t('Ouverte {n}×', { n: quote.views })}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="w-full sm:w-56">
            <Select
              value={status}
              onChange={(s) => {
                b.setStatus(s)
                toast(t('Statut → {s}', { s: t(s) }))
              }}
              options={QUOTE_STATUSES.map((s) => ({ value: s as string, label: t(s) }))}
              searchable={false}
              variant={status === 'Signé' ? 'accent' : 'default'}
            />
          </div>
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
                          toast(m.toast)
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

/** The soumission editor (mockup: `d4`). */
function QuoteBuilder({ quote }: { quote: Quote }) {
  const b = useQuoteBuilder(quote)
  const { sections, activeSection, done } = b
  return (
    <Page wide className="pb-24">
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
          <InfosSection b={b} />
          <ObligationsSection b={b} />
          {b.hasSection('travaux') && <TravauxSection b={b} />}
          {b.hasSection('expertises') && <ExpertisesSection b={b} />}
          <CoutantsSection b={b} />
          {b.hasSection('garanties') && <GarantiesSection b={b} />}
          <PrixSection b={b} />
          <NotesSection b={b} />
          <AutresSection b={b} />
          <EnvoiSection b={b} />
        </div>

        <SummaryRail b={b} />
      </div>

      <MobileTotalBar b={b} />
      <ComposeDrawer kind={b.composeKind} ctx={b.msgCtx} onClose={() => b.setComposeKind(null)} />
    </Page>
  )
}
