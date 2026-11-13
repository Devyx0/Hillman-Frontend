import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpDown, ArrowUpRight, ChevronLeft, ChevronRight, Download, Eye, Mail, MessageSquare, Plus, Search, Tags, UserCog, Workflow, X, Zap } from 'lucide-react'
import { FilterBar, FilterField, Select } from '../components/filters'
import { MultiSelect } from '../components/multi-select'
import { ComposeDrawer, type MessageCtx, type MessageKind } from '../components/messaging'
import { StatusPicker } from '../components/quote-shared'
import { CompanyBadge, Page, PageHeader, RepAvatar, Stat, StatusBadge, Tabs } from '../components/ui'
import { inScope, useApp } from '../context/AppContext'
import { COMPANIES, QUOTES, QUOTE_STATUSES, REPS, SOURCES, TODAY, clientById, companyById, fullName, repById, type Quote } from '../data/mock'
import { internalNote, isAutoAction, marginPct, shortDate } from '../data/quote-builder'
import { t } from '../i18n'
import { toast } from '../lib/toast'
import { cn, money, moneyShort, num, pct } from '../lib/utils'

type View = 'all' | 'mine' | 'callback' | 'opened' | 'signed'
type SortKey = 'date' | 'amount' | 'views'

const VIEWS: { value: View; label: string; test: (q: Quote) => boolean }[] = [
  { value: 'all', label: 'Toutes', test: () => true },
  { value: 'mine', label: 'Mes soumissions', test: (q) => q.repId === 'jph' },
  { value: 'callback', label: 'À rappeler', test: (q) => q.status === 'À rappeler' || q.status === 'Rappel courriel envoyé' },
  { value: 'opened', label: 'Ouvertes par le client', test: (q) => q.views > 0 && ['En soumission', 'À rappeler', 'Rappel courriel envoyé', 'Client va nous rappeler'].includes(q.status) },
  { value: 'signed', label: 'Signées', test: (q) => q.status === 'Signé' },
]

const SORT_LABEL: Record<SortKey, string> = { date: 'Date', amount: 'Montant', views: 'Vues' }

/** Same folding as the mockup's inline search normaliser. */
const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Soumissions list (mockup: `o4`). */
export default function Quotes() {
  const navigate = useNavigate()
  const { scope } = useApp()
  const [quotes, setQuotes] = useState<Quote[]>(() => QUOTES.map((q) => ({ ...q })))
  const [view, setView] = useState<View>('all')
  const [query, setQuery] = useState('')
  const [statuses, setStatuses] = useState<string[]>([])
  const [company, setCompany] = useState('all')
  const [rep, setRep] = useState('all')
  const [source, setSource] = useState('all')
  const [period, setPeriod] = useState('90')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState<SortKey>('date')
  const [compose, setCompose] = useState<{ kind: MessageKind; ctx: MessageCtx } | null>(null)
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false)

  const scoped = useMemo(() => quotes.filter((q) => inScope(scope, q.company)), [quotes, scope])
  const group = scope === 'all'

  const results = useMemo(() => {
    const test = VIEWS.find((v) => v.value === view)!.test
    const q = fold(query.trim())
    return scoped
      .filter((x) => {
        if (
          !test(x) ||
          (statuses.length && !statuses.includes(x.status)) ||
          (group && company !== 'all' && x.company !== company) ||
          (rep !== 'all' && x.repId !== rep) ||
          (source !== 'all' && x.source !== source) ||
          (period !== 'all' && (new Date(TODAY).getTime() - new Date(x.date).getTime()) / 864e5 > Number(period))
        )
          return false
        if (q) {
          const c = clientById(x.clientId)!
          const haystack = fold(`${x.no} ${fullName(c)} ${c.company ?? ''} ${c.no} ${c.street} ${c.city} ${c.postal} ${x.workType} ${c.phone} ${c.mobile ?? ''} ${c.email} ${internalNote(x)}`)
          const digits = q.replace(/\D/g, '')
          const phones = `${c.phone} ${c.mobile ?? ''}`.replace(/\D/g, '')
          if (!haystack.includes(q) && !(digits.length >= 3 && phones.includes(digits))) return false
        }
        return true
      })
      .sort((a, b) => (sort === 'amount' ? b.amount - a.amount : sort === 'views' ? b.views - a.views : b.date.localeCompare(a.date) || b.no.localeCompare(a.no)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoped, view, query, statuses, company, rep, source, period, sort])

  const pending = scoped.filter((q) => ['En soumission', 'À rappeler', 'Rappel courriel envoyé', 'Client va nous rappeler', 'En cours'].includes(q.status))
  const closed = scoped.filter((q) => ['Signé', 'Payé', 'Terminé', 'Refusé'].includes(q.status))
  const signRate = scoped.length ? (closed.filter((q) => q.status !== 'Refusé').length / scoped.length) * 100 : 0
  const openedNoReply = pending.filter((q) => q.views > 0).length

  const setStatus = (id: string, status: string) => {
    setQuotes((all) => all.map((q) => (q.id === id ? { ...q, status } : q)))
    toast(t('Statut → {status}', { status: t(status) }))
  }
  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const page = results.slice(0, 50)
  const allSelected = page.length > 0 && page.every((q) => selected.has(q.id))
  const ctxFor = (q: Quote): MessageCtx => {
    const c = clientById(q.clientId)!
    return { name: fullName(c), first: c.first, quoteNo: q.no, company: companyById(q.company).name, rep: repById(q.repId)!.first }
  }
  const clearFilters = () => {
    setStatuses([])
    setCompany('all')
    setRep('all')
    setSource('all')
    setPeriod('90')
    setQuery('')
  }
  const filtered = statuses.length || company !== 'all' || rep !== 'all' || source !== 'all' || period !== '90' || query

  return (
    <Page>
      <PageHeader
        title={t('Soumissions')}
        actions={
          <>
            <button className="btn btn-sm btn-secondary" onClick={() => toast(t('Export CSV de {n} soumissions', { n: num(results.length) }))}>
              <Download className="w-4 h-4" />
              {t('Exporter')}
            </button>
            <button className="btn btn-sm btn-primary" onClick={() => navigate('/soumissions/q64320')}>
              <Plus className="w-4 h-4" />
              {t('Nouvelle soumission')}
            </button>
          </>
        }
      />
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <Stat label={t('En attente')} value={moneyShort(pending.reduce((n, q) => n + q.amount, 0) * 9)} />
        <Stat label={t('Taux de signature')} value={pct(signRate)} />
        <Stat label={t('Ouvertes, sans réponse')} value={num(openedNoReply)} />
      </div>
      <div className="flex flex-col 2xl:flex-row 2xl:items-center gap-3">
        <Tabs
          value={view}
          onChange={(v) => {
            setView(v)
            setSelected(new Set())
          }}
          tabs={VIEWS.map((v) => ({ value: v.value, label: t(v.label), count: scoped.filter(v.test).length }))}
        />
        <div className="relative 2xl:ml-auto 2xl:w-80 md:max-w-md">
          <Search className="w-4 h-4 text-ink-mute absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Rechercher…')} className="form-input pl-9" aria-label={t('Rechercher une soumission')} />
        </div>
      </div>
      <FilterBar>
        <FilterField label={t('Statut')}>
          <MultiSelect values={statuses} onChange={setStatuses} options={QUOTE_STATUSES.map((s) => ({ value: s, label: t(s) }))} allLabel={t('Tous les statuts')} className="md:w-48" />
        </FilterField>
        {group && (
          <FilterField label={t('Compagnie')}>
            <Select value={company} onChange={setCompany} options={[{ value: 'all', label: t('Toutes') }, ...COMPANIES.map((c) => ({ value: c.id as string, label: c.name }))]} className="md:w-44" />
          </FilterField>
        )}
        <FilterField label={t('Représentant')}>
          <Select
            value={rep}
            onChange={setRep}
            options={[{ value: 'all', label: t('Tous') }, ...REPS.filter((r) => r.id !== 'hpe' && (group || r.company === scope)).map((r) => ({ value: r.id, label: r.name, icon: <RepAvatar id={r.id} size="xs" /> }))]}
            className="md:w-48"
          />
        </FilterField>
        <FilterField label={t('Source')}>
          <Select value={source} onChange={setSource} options={[{ value: 'all', label: t('Toutes') }, ...SOURCES.map((s) => ({ value: s, label: t(s) }))]} className="md:w-40" />
        </FilterField>
        <FilterField label={t('Période')}>
          <Select
            value={period}
            onChange={setPeriod}
            options={[
              { value: '7', label: t('7 derniers jours') },
              { value: '30', label: t('30 derniers jours') },
              { value: '90', label: t('90 derniers jours') },
              { value: 'all', label: t('Depuis 2015') },
            ]}
            className="md:w-44"
          />
        </FilterField>
        {filtered ? (
          <button onClick={clearFilters} className="btn btn-xs btn-ghost self-end mb-1">
            <X className="w-3.5 h-3.5" />
            {t('Effacer')}
          </button>
        ) : null}
      </FilterBar>
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        {selected.size > 0 ? (
          <div className="px-4 py-2.5 bg-ink text-white flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold mr-2 tnum">
              {t(selected.size > 1 ? '{n} sélectionnées' : '{n} sélectionnée', { n: selected.size })}
            </span>
            <button className="btn btn-xs bg-white/10 hover:bg-white/20 text-white" onClick={() => setCompose({ kind: 'sequence', ctx: { name: t('{n} clients', { n: selected.size }) } })}>
              <Workflow className="w-3.5 h-3.5" />
              {t('Relancer')}
            </button>
            <div className="relative">
              <button className="btn btn-xs bg-white/10 hover:bg-white/20 text-white" onClick={() => setBulkStatusOpen((o) => !o)}>
                <Tags className="w-3.5 h-3.5" />
                {t('Statut')}
              </button>
              {bulkStatusOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setBulkStatusOpen(false)} />
                  <div className="absolute left-0 top-full mt-1 z-50 w-60 bg-white rounded-lg border border-hairline shadow-xl py-1 menu-in">
                    {QUOTE_STATUSES.map((s) => (
                      <button
                        key={s}
                        className="w-full px-3 py-1.5 text-left hover:bg-sand"
                        onClick={() => {
                          setQuotes((all) => all.map((q) => (selected.has(q.id) ? { ...q, status: s } : q)))
                          setBulkStatusOpen(false)
                          toast(t('{n} soumissions → {status}', { n: selected.size, status: t(s) }))
                          setSelected(new Set())
                        }}
                      >
                        <StatusBadge status={s} />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button className="btn btn-xs bg-white/10 hover:bg-white/20 text-white" onClick={() => toast(t('Assignées à {name}', { name: 'Olivier Fontaine' }))}>
              <UserCog className="w-3.5 h-3.5" />
              {t('Assigner')}
            </button>
            <button className="btn btn-xs bg-white/10 hover:bg-white/20 text-white" onClick={() => toast(t('Export CSV prêt'))}>
              <Download className="w-3.5 h-3.5" />
              {t('Exporter')}
            </button>
            <button className="ml-auto p-1 rounded hover:bg-white/10" aria-label={t('Désélectionner')} onClick={() => setSelected(new Set())}>
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="px-4 py-2.5 border-b border-hairline flex flex-wrap items-center gap-3 text-xs text-ink-mute">
            <span className="tnum">
              {t(results.length > 1 ? '{n} résultats' : '{n} résultat', { n: num(results.length) })}
            </span>
            <span className="ml-auto flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" />
              {(['date', 'amount', 'views'] as SortKey[]).map((k) => (
                <button key={k} onClick={() => setSort(k)} className={cn('px-1.5 py-0.5 rounded font-semibold', sort === k ? 'bg-ink text-white' : 'hover:text-ink')}>
                  {t(SORT_LABEL[k])}
                </button>
              ))}
            </span>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="bg-sand/60 border-b border-hairline">
              <tr>
                <th className="th px-2.5 w-10">
                  <input type="checkbox" aria-label={t('Tout sélectionner')} checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(page.map((q) => q.id)))} className="accent-[var(--color-primary)]" />
                </th>
                <th className="th px-2.5">{t('No')}</th>
                <th className="th px-2.5">{t('Client')}</th>
                {group && <th className="th px-2.5">{t('Compagnie')}</th>}
                <th className="th px-2.5">{t('Rep.')}</th>
                <th className="th px-2.5 text-right">{t('Montant')}</th>
                <th className="th px-2.5 text-right">{t('Marge')}</th>
                <th className="th px-2.5">{t('Statut')}</th>
                <th className="th px-2.5">{t('Vues')}</th>
                <th className="th px-2.5">{t('Suivi')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {page.map((q) => {
                const c = clientById(q.clientId)!
                const margin = marginPct(q)
                const note = internalNote(q)
                return (
                  <tr key={q.id} onClick={() => navigate(`/soumissions/${q.id}`)} className={cn('group cursor-pointer hover:bg-sand/60 transition-colors', selected.has(q.id) && 'bg-primary-wash')}>
                    <td className="td px-2.5" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" aria-label={t('Sélectionner {no}', { no: q.no })} checked={selected.has(q.id)} onChange={() => toggle(q.id)} className="accent-[var(--color-primary)]" />
                    </td>
                    <td className="td px-2.5 font-semibold text-ink tnum whitespace-nowrap">
                      {q.no}
                      <p className="text-2xs font-normal text-ink-mute">{shortDate(q.date)}</p>
                    </td>
                    <td className="td px-2.5">
                      <p className="font-semibold text-ink truncate max-w-[190px]">{fullName(c)}</p>
                      <p className="text-2xs text-ink-mute truncate max-w-[190px]">{q.city}</p>
                      {query.trim().length >= 3 && note && fold(note).includes(fold(query.trim())) && <p className="text-2xs text-primary-press truncate max-w-[170px]">{t('« {message} »', { message: t(note) })}</p>}
                    </td>
                    {group && (
                      <td className="td px-2.5">
                        <CompanyBadge id={q.company} />
                      </td>
                    )}
                    <td className="td px-2.5">
                      <RepAvatar id={q.repId} />
                    </td>
                    <td className="td px-2.5 text-right font-semibold text-ink tnum whitespace-nowrap">{money(q.amount, false)}</td>
                    <td className="td px-2.5 text-right tnum">
                      <span className={cn('font-semibold', margin >= 32 ? 'text-tone-good-ink' : margin >= 25 ? 'text-tone-warn-ink' : 'text-tone-critical-ink')}>{pct(margin)}</span>
                    </td>
                    <td className="td px-2.5">
                      <StatusPicker q={q} onChange={(s) => setStatus(q.id, s)} />
                    </td>
                    <td className="td px-2.5 whitespace-nowrap">
                      {q.views > 0 ? (
                        <span className={cn('inline-flex items-center gap-1 text-xs', q.views >= 3 ? 'text-ink font-semibold' : 'text-ink-mute')}>
                          <Eye className="w-3.5 h-3.5" />
                          {q.views}
                        </span>
                      ) : (
                        <span className="text-xs text-ink-faint">—</span>
                      )}
                    </td>
                    <td className="td px-2.5 text-xs whitespace-nowrap relative">
                      {q.nextAction ? (
                        <span className="inline-flex items-center gap-1.5 text-ink-mute">
                          {isAutoAction(q.nextAction) && <Zap className="w-3 h-3 text-primary-press" aria-label={t('automatique')} />}
                          <span className="truncate max-w-[140px]">{t(q.nextAction.replace(/\s*\(auto\)/, '').replace('J+7', 'J+6'))}</span>
                        </span>
                      ) : (
                        <span className="text-ink-faint">—</span>
                      )}
                      <div onClick={(e) => e.stopPropagation()} className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 p-0.5 bg-white rounded-md shadow-card opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button className="p-1.5 rounded-md hover:bg-sand text-ink-mute hover:text-primary-press" aria-label={t('Envoyer un texto')} onClick={() => setCompose({ kind: 'sms', ctx: ctxFor(q) })}>
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-md hover:bg-sand text-ink-mute hover:text-primary-press" aria-label={t('Envoyer un courriel')} onClick={() => setCompose({ kind: 'email', ctx: ctxFor(q) })}>
                          <Mail className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-md hover:bg-sand text-ink-mute hover:text-primary-press" aria-label={t('Ouvrir')} onClick={() => navigate(`/soumissions/${q.id}`)}>
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {page.length === 0 && (
                <tr>
                  <td colSpan={group ? 10 : 9} className="py-14 text-center text-sm text-ink-mute">
                    {t('Aucun résultat')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-hairline flex flex-wrap items-center justify-between gap-3 text-xs text-ink-mute">
          <span className="tnum">
            {t('{range} de {total}', { range: results.length ? `1–${Math.min(50, results.length)}` : '0', total: view === 'all' && !filtered ? t('21 384') : num(results.length) })}
          </span>
          <div className="flex items-center gap-1">
            <button className="btn btn-xs btn-quiet" aria-label={t('Page précédente')} disabled>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            {[1, 2, 3].map((n) => (
              <button key={n} className={cn('w-8 h-8 rounded-md text-xs font-semibold tnum', n === 1 ? 'bg-ink text-white' : 'hover:bg-sand')}>
                {n}
              </button>
            ))}
            <span className="px-1">…</span>
            <button className="w-8 h-8 rounded-md text-xs font-semibold hover:bg-sand tnum">428</button>
            <button className="btn btn-xs btn-quiet" aria-label={t('Page suivante')}>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
      <ComposeDrawer kind={compose?.kind ?? null} ctx={compose?.ctx ?? {}} onClose={() => setCompose(null)} />
    </Page>
  )
}
