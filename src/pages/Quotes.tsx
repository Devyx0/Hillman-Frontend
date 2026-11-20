import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, ArrowUpDown, ArrowUpRight, ChevronLeft, ChevronRight, Download, Eye, FileSearch, Mail, MessageSquare, Pause, Play, Plus, Search, Tags, Trash2, UserCog, Workflow, X, Zap } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { FilterBar, FilterField, Select } from '../components/filters'
import { MultiSelect } from '../components/multi-select'
import { ComposeDrawer, type MessageCtx, type MessageKind } from '../components/messaging'
import { StatusPicker } from '../components/quote-shared'
import { followUpState, statusDetail, useChangeStatus } from '../components/quote-status'
import { ErrorState, SkeletonRows, confirmAction } from '../components/states'
import { CompanyBadge, Empty, Page, PageHeader, RepAvatar, Stat, StatusBadge, Tabs } from '../components/ui'
import { inScope, useApp } from '../context/AppContext'
import { COMPANIES, QUOTES, REPS, SOURCES, TODAY, clientById, clientLang, companyById, fullName, repById } from '../data/mock'
import { internalNote, marginPct, shortDate } from '../data/quote-builder'
import { STATUS_DEFS } from '../data/settings'
import { removeQuotes, request, setFollowUpPaused, useStore, type QuoteStatusRecord } from '../data/store'
import { t } from '../i18n'
import { openCreate } from '../lib/create'
import { toast } from '../lib/toast'
import { cn, money, moneyShort, num, pct } from '../lib/utils'

type Q = QuoteStatusRecord
type View = 'all' | 'mine' | 'callback' | 'opened' | 'signed'
type SortKey = 'date' | 'client' | 'amount' | 'margin' | 'status' | 'views' | 'next'
type Dir = 'asc' | 'desc'

const PENDING = ['En soumission', 'À rappeler', 'Rappel courriel envoyé', 'Client va nous rappeler', 'En cours']

const VIEWS: { value: View; label: string; test: (q: Q, me?: string) => boolean }[] = [
  { value: 'all', label: 'Toutes', test: () => true },
  { value: 'mine', label: 'Mes soumissions', test: (q, me) => q.repId === me },
  { value: 'callback', label: 'À rappeler', test: (q) => q.status === 'À rappeler' || q.status === 'Rappel courriel envoyé' },
  { value: 'opened', label: 'Ouvertes par le client', test: (q) => q.views > 0 && ['En soumission', 'À rappeler', 'Rappel courriel envoyé', 'Client va nous rappeler'].includes(q.status) },
  { value: 'signed', label: 'Signées', test: (q) => q.status === 'Signé' },
]

const SORT_LABEL: Record<SortKey, string> = { date: 'Date', client: 'Client', amount: 'Montant', margin: 'Marge', status: 'Statut', views: 'Vues', next: 'Suivi' }
/** Direction used the first time a column is sorted. */
const DEFAULT_DIR: Record<SortKey, Dir> = { date: 'desc', client: 'asc', amount: 'desc', margin: 'desc', status: 'asc', views: 'desc', next: 'asc' }
const PAGE_SIZES = [25, 50, 100]

/** Same folding as the mockup's inline search normaliser. */
const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

const clientName = (q: Q) => {
  const c = clientById(q.clientId)
  return c ? fullName(c) : '—'
}

/** Page numbers with gaps: 1 … 4 5 6 … 12. */
function pageList(cur: number, count: number): (number | '…')[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1)
  const out: (number | '…')[] = [1]
  const from = Math.max(2, cur - 1)
  const to = Math.min(count - 1, cur + 1)
  if (from > 2) out.push('…')
  for (let n = from; n <= to; n++) out.push(n)
  if (to < count - 1) out.push('…')
  out.push(count)
  return out
}

/** CSV download of the given quotes (cost columns only with `quotes.costs`). */
function exportCsv(rows: Q[], withCosts: boolean) {
  const head = [t('No'), t('Date'), t('Client'), t('Compagnie'), t('Représentant'), t('Statut'), t('Montant'), ...(withCosts ? [t('Coûtant'), t('Marge')] : []), t('Source'), t('Ville'), t('Suivi'), t('Raison du refus')]
  const cell = (v: string | number) => {
    const s = String(v ?? '')
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = rows.map((q) =>
    [
      q.no,
      q.date,
      clientName(q),
      companyById(q.company).name,
      repById(q.repId)?.name ?? '',
      t(q.status),
      q.amount,
      ...(withCosts ? [q.cost, Math.round(marginPct(q) * 10) / 10] : []),
      t(q.source),
      q.city,
      followUpState(q).label,
      q.refusalReason ? t(q.refusalReason) : '',
    ]
      .map(cell)
      .join(','),
  )
  const blob = new Blob(['﻿' + [head.map(cell).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `soumissions-${TODAY}.csv`
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  toast(t('Export CSV de {n} soumissions', { n: num(rows.length) }))
}

/** Soumissions list (mockup: `o4`). */
export default function Quotes() {
  const navigate = useNavigate()
  const version = useStore()
  const { scope } = useApp()
  const { user, can } = useAuth()
  const viewAll = can('quotes.viewAll')
  const costs = can('quotes.costs')
  const canDelete = can('quotes.delete')
  const me = user?.repId
  const myCompanies = useMemo(() => user?.companies ?? [], [user])
  const [params] = useSearchParams()
  const forceError = params.get('erreur') === '1'

  const [view, setView] = useState<View>('all')
  const [query, setQuery] = useState('')
  const [dq, setDq] = useState('')
  const [statuses, setStatuses] = useState<string[]>([])
  const [company, setCompany] = useState('all')
  const [rep, setRep] = useState('all')
  const [source, setSource] = useState('all')
  const [period, setPeriod] = useState('90')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState<{ key: SortKey; dir: Dir }>({ key: 'date', dir: 'desc' })
  const [pageSize, setPageSize] = useState(25)
  const [compose, setCompose] = useState<{ kind: MessageKind; ctx: MessageCtx } | null>(null)
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [load, setLoad] = useState<'loading' | 'ready' | 'error'>('loading')
  const bulk = useChangeStatus({ via: 'liste' })

  // Debounce typing so the list doesn't reload on every key.
  useEffect(() => {
    const id = window.setTimeout(() => setDq(query), 250)
    return () => window.clearTimeout(id)
  }, [query])

  // Simulated fetch on first load and whenever the filters change (`?erreur=1` fails the first try).
  const filterKey = JSON.stringify([view, dq, statuses, company, rep, source, period, scope])
  useEffect(() => {
    let live = true
    setLoad('loading')
    request(null, { ms: 350, fail: forceError && attempt === 0 }).then(
      () => live && setLoad('ready'),
      () => live && setLoad('error'),
    )
    return () => {
      live = false
    }
  }, [filterKey, attempt, forceError])

  const scoped = useMemo(
    () => (QUOTES as Q[]).filter((q) => inScope(scope, q.company) && myCompanies.includes(q.company) && (viewAll || q.repId === me)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version, scope, myCompanies, viewAll, me],
  )
  const group = scope === 'all'
  const views = VIEWS.filter((v) => v.value !== 'mine' || viewAll)

  const results = useMemo(() => {
    const test = VIEWS.find((v) => v.value === view)!.test
    const q = fold(dq.trim())
    const statusRank = (s: string) => STATUS_DEFS.findIndex((d) => d.name === s)
    const cmp: Record<SortKey, (a: Q, b: Q) => number> = {
      date: (a, b) => a.date.localeCompare(b.date) || a.no.localeCompare(b.no),
      client: (a, b) => clientName(a).localeCompare(clientName(b)),
      amount: (a, b) => a.amount - b.amount,
      margin: (a, b) => marginPct(a) - marginPct(b),
      status: (a, b) => statusRank(a.status) - statusRank(b.status),
      views: (a, b) => a.views - b.views,
      next: (a, b) => (followUpState(a).date ?? '9999').localeCompare(followUpState(b).date ?? '9999'),
    }
    const sign = sort.dir === 'asc' ? 1 : -1
    return scoped
      .filter((x) => {
        if (
          !test(x, me) ||
          (statuses.length && !statuses.includes(x.status)) ||
          (group && company !== 'all' && x.company !== company) ||
          (rep !== 'all' && x.repId !== rep) ||
          (source !== 'all' && x.source !== source) ||
          (period !== 'all' && (new Date(TODAY).getTime() - new Date(x.date).getTime()) / 864e5 > Number(period))
        )
          return false
        if (q) {
          const c = clientById(x.clientId)
          const haystack = fold(`${x.no} ${c ? fullName(c) : ''} ${c?.company ?? ''} ${c?.no ?? ''} ${c?.street ?? ''} ${c?.city ?? x.city} ${c?.postal ?? ''} ${x.workType} ${c?.phone ?? ''} ${c?.mobile ?? ''} ${c?.email ?? ''} ${internalNote(x)}`)
          const digits = q.replace(/\D/g, '')
          const phones = `${c?.phone ?? ''} ${c?.mobile ?? ''}`.replace(/\D/g, '')
          if (!haystack.includes(q) && !(digits.length >= 3 && phones.includes(digits))) return false
        }
        return true
      })
      .sort((a, b) => sign * cmp[sort.key](a, b) || b.no.localeCompare(a.no))
  }, [scoped, view, dq, statuses, company, rep, source, period, sort, group, me])

  // Pagination: back to page 1 whenever filters, sort or page size change.
  const resetKey = `${filterKey}|${sort.key}${sort.dir}|${pageSize}`
  const [pageAt, setPageAt] = useState({ key: resetKey, n: 1 })
  const pageCount = Math.max(1, Math.ceil(results.length / pageSize))
  const cur = Math.min(pageAt.key === resetKey ? pageAt.n : 1, pageCount)
  const goTo = (n: number) => setPageAt({ key: resetKey, n: Math.max(1, Math.min(pageCount, n)) })
  const from = (cur - 1) * pageSize
  const page = results.slice(from, from + pageSize)

  const pending = scoped.filter((q) => PENDING.includes(q.status))
  const closed = scoped.filter((q) => ['Signé', 'Payé', 'Terminé', 'Refusé'].includes(q.status))
  const signRate = scoped.length ? (closed.filter((q) => q.status !== 'Refusé').length / scoped.length) * 100 : 0
  const openedNoReply = pending.filter((q) => q.views > 0).length
  const totalAmount = scoped.reduce((n, q) => n + q.amount, 0)
  const avgMargin = totalAmount ? ((totalAmount - scoped.reduce((n, q) => n + q.cost, 0)) / totalAmount) * 100 : 0

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const selectedQuotes = scoped.filter((q) => selected.has(q.id))
  const allSelected = page.length > 0 && page.every((q) => selected.has(q.id))
  const ctxFor = (q: Q): MessageCtx => {
    const c = clientById(q.clientId)
    return { name: clientName(q), first: c?.first, quoteNo: q.no, company: companyById(q.company).name, rep: repById(q.repId)?.first, lang: clientLang(c) }
  }
  const clearFilters = () => {
    setStatuses([])
    setCompany('all')
    setRep('all')
    setSource('all')
    setPeriod('90')
    setQuery('')
    setDq('')
  }
  const filtered = statuses.length || company !== 'all' || rep !== 'all' || source !== 'all' || period !== '90' || query
  const sortBy = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: DEFAULT_DIR[key] }))
  const togglePause = (q: Q, paused: boolean) => {
    setFollowUpPaused(q.id, paused)
    toast(paused ? t('Relances en pause · {no}', { no: q.no }) : t('Relances reprises · {no}', { no: q.no }))
  }
  const deleteSelected = async () => {
    const ids = [...selected]
    const ok = await confirmAction({
      title: ids.length > 1 ? t('Supprimer {n} soumissions?', { n: ids.length }) : t('Supprimer cette soumission?'),
      body: t('Cette action est définitive. Les relances prévues seront annulées.'),
      confirmLabel: t('Supprimer'),
      danger: true,
    })
    if (!ok) return
    removeQuotes(ids)
    setSelected(new Set())
    toast(ids.length > 1 ? t('{n} soumissions supprimées', { n: ids.length }) : t('Soumission supprimée'))
  }

  const sortHead = (k: SortKey, children: string, className?: string) => (
    <th className={cn('th px-2.5', className)} aria-sort={sort.key === k ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
      <button onClick={() => sortBy(k)} className={cn('inline-flex items-center gap-1 uppercase hover:text-ink', sort.key === k && 'text-ink')}>
        {children}
        {sort.key === k ? sort.dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" /> : <ArrowUpDown className="w-3 h-3 opacity-40" />}
      </button>
    </th>
  )

  return (
    <Page>
      <PageHeader
        title={t('Soumissions')}
        actions={
          <>
            <button className="btn btn-sm btn-secondary" disabled={!results.length} onClick={() => exportCsv(results, costs)}>
              <Download className="w-4 h-4" />
              {t('Exporter')}
            </button>
            {can('quotes.edit') && (
              <button className="btn btn-sm btn-primary" onClick={() => openCreate('quote', scope === 'all' ? {} : { company: scope })}>
                <Plus className="w-4 h-4" />
                {t('Nouvelle soumission')}
              </button>
            )}
          </>
        }
      />
      <div className={cn('grid gap-3 md:gap-4', costs ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3')}>
        <Stat label={t('En attente')} value={moneyShort(pending.reduce((n, q) => n + q.amount, 0))} />
        <Stat label={t('Taux de signature')} value={pct(signRate)} />
        <Stat label={t('Ouvertes, sans réponse')} value={num(openedNoReply)} />
        {costs && <Stat label={t('Marge moyenne')} value={pct(avgMargin)} />}
      </div>
      <div className="flex flex-col 2xl:flex-row 2xl:items-center gap-3">
        <Tabs
          value={view}
          onChange={(v) => {
            setView(v)
            setSelected(new Set())
          }}
          tabs={views.map((v) => ({ value: v.value, label: t(v.label), count: scoped.filter((q) => v.test(q, me)).length }))}
        />
        <div className="relative 2xl:ml-auto 2xl:w-80 md:max-w-md">
          <Search className="w-4 h-4 text-ink-mute absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Rechercher…')} className="form-input pl-9" aria-label={t('Rechercher une soumission')} />
        </div>
      </div>
      <FilterBar>
        <FilterField label={t('Statut')}>
          <MultiSelect values={statuses} onChange={setStatuses} options={STATUS_DEFS.map((s) => ({ value: s.name, label: t(s.name) }))} allLabel={t('Tous les statuts')} className="md:w-48" />
        </FilterField>
        {group && myCompanies.length > 1 && (
          <FilterField label={t('Compagnie')}>
            <Select value={company} onChange={setCompany} options={[{ value: 'all', label: t('Toutes') }, ...COMPANIES.filter((c) => myCompanies.includes(c.id)).map((c) => ({ value: c.id as string, label: c.name }))]} className="md:w-44" />
          </FilterField>
        )}
        {viewAll && (
          <FilterField label={t('Représentant')}>
            <Select
              value={rep}
              onChange={setRep}
              options={[{ value: 'all', label: t('Tous') }, ...REPS.filter((r) => r.id !== 'hpe' && (group || r.company === scope)).map((r) => ({ value: r.id, label: r.name, icon: <RepAvatar id={r.id} size="xs" /> }))]}
              className="md:w-48"
            />
          </FilterField>
        )}
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
            <span className="text-sm font-semibold mr-2 tnum">{t(selected.size > 1 ? '{n} sélectionnées' : '{n} sélectionnée', { n: selected.size })}</span>
            <button className="btn btn-xs bg-white/10 hover:bg-white/20 text-white" onClick={() => setCompose({ kind: 'sequence', ctx: { name: t('{n} clients', { n: selected.size }) } })}>
              <Workflow className="w-3.5 h-3.5" />
              {t('Relancer')}
            </button>
            {bulk.canChange && (
              <div className="relative">
                <button className="btn btn-xs bg-white/10 hover:bg-white/20 text-white" onClick={() => setBulkStatusOpen((o) => !o)} aria-haspopup="menu" aria-expanded={bulkStatusOpen}>
                  <Tags className="w-3.5 h-3.5" />
                  {t('Statut')}
                </button>
                {bulkStatusOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setBulkStatusOpen(false)} />
                    <div role="menu" className="absolute left-0 top-full mt-1 z-50 w-60 bg-white rounded-lg border border-hairline shadow-xl py-1 menu-in">
                      {STATUS_DEFS.map(({ name: s }) => (
                        <button
                          key={s}
                          role="menuitem"
                          className="w-full px-3 py-1.5 text-left hover:bg-sand"
                          onClick={async () => {
                            setBulkStatusOpen(false)
                            if (await bulk.change([...selected], s)) setSelected(new Set())
                          }}
                        >
                          <StatusBadge status={s} />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            <button
              className="btn btn-xs bg-white/10 hover:bg-white/20 text-white"
              onClick={() => {
                selectedQuotes.forEach((q) => followUpState(q).kind === 'next' && setFollowUpPaused(q.id, true))
                toast(t('Relances en pause pour {n} soumissions', { n: selectedQuotes.length }))
              }}
            >
              <Pause className="w-3.5 h-3.5" />
              {t('Pause relances')}
            </button>
            {viewAll && (
              <button className="btn btn-xs bg-white/10 hover:bg-white/20 text-white" onClick={() => toast(t('Assignées à {name}', { name: 'Olivier Fontaine' }))}>
                <UserCog className="w-3.5 h-3.5" />
                {t('Assigner')}
              </button>
            )}
            <button className="btn btn-xs bg-white/10 hover:bg-white/20 text-white" onClick={() => exportCsv(selectedQuotes, costs)}>
              <Download className="w-3.5 h-3.5" />
              {t('Exporter')}
            </button>
            {canDelete && (
              <button className="btn btn-xs bg-white/10 hover:bg-tone-critical text-white" onClick={deleteSelected}>
                <Trash2 className="w-3.5 h-3.5" />
                {t('Supprimer')}
              </button>
            )}
            <button className="ml-auto p-1 rounded hover:bg-white/10" aria-label={t('Désélectionner')} onClick={() => setSelected(new Set())}>
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="px-4 py-2.5 border-b border-hairline flex flex-wrap items-center gap-3 text-xs text-ink-mute">
            <span className="tnum">{load === 'ready' ? t(results.length > 1 ? '{n} résultats' : '{n} résultat', { n: num(results.length) }) : t('Chargement…')}</span>
            <span className="ml-auto flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" />
              {(['date', 'amount', 'views'] as SortKey[]).map((k) => (
                <button key={k} onClick={() => sortBy(k)} className={cn('px-1.5 py-0.5 rounded font-semibold inline-flex items-center gap-0.5', sort.key === k ? 'bg-ink text-white' : 'hover:text-ink')}>
                  {t(SORT_LABEL[k])}
                  {sort.key === k && (sort.dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                </button>
              ))}
            </span>
          </div>
        )}
        {load === 'loading' ? (
          <SkeletonRows rows={8} />
        ) : load === 'error' ? (
          <ErrorState title={t('Impossible de charger les soumissions')} onRetry={() => setAttempt((a) => a + 1)} />
        ) : results.length === 0 ? (
          <Empty icon={FileSearch} title={scoped.length ? t('Aucune soumission ne correspond') : t('Aucune soumission pour le moment')}>
            {scoped.length ? (
              <>
                {t('Essayez un autre mot-clé ou retirez des filtres.')}
                {filtered ? (
                  <button onClick={clearFilters} className="btn btn-xs btn-secondary mt-3 mx-auto flex">
                    <X className="w-3.5 h-3.5" />
                    {t('Effacer les filtres')}
                  </button>
                ) : null}
              </>
            ) : (
              t('Les soumissions créées apparaîtront ici.')
            )}
          </Empty>
        ) : (
          <div className="relative overflow-x-auto">
            <table className={cn('w-full', costs ? 'min-w-[1040px]' : 'min-w-[960px]')}>
              <thead className="bg-sand/60 border-b border-hairline">
                <tr>
                  <th className="th px-2.5 w-10">
                    <input type="checkbox" aria-label={t('Tout sélectionner')} checked={allSelected} onChange={() => setSelected((s) => { const next = new Set(s); page.forEach((q) => (allSelected ? next.delete(q.id) : next.add(q.id))); return next })} className="accent-[var(--color-primary)]" />
                  </th>
                  {sortHead('date', t('No'))}
                  {sortHead('client', t('Client'))}
                  {group && <th className="th px-2.5">{t('Compagnie')}</th>}
                  <th className="th px-2.5">{t('Repr.')}</th>
                  {sortHead('amount', t('Montant'), 'text-right')}
                  {costs && sortHead('margin', t('Marge'), 'text-right')}
                  {sortHead('status', t('Statut'))}
                  {sortHead('views', t('Vues'))}
                  {sortHead('next', t('Suivi'))}
                  <th className="th px-2.5 w-0">
                    <span className="sr-only">{t('Actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {page.map((q) => {
                  const margin = marginPct(q)
                  const note = internalNote(q)
                  const fu = followUpState(q)
                  const reason = q.status === 'Refusé' ? statusDetail(q) : undefined
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
                        <p className="font-semibold text-ink truncate max-w-[190px]">{clientName(q)}</p>
                        <p className="text-2xs text-ink-mute truncate max-w-[190px]">{q.city}</p>
                        {dq.trim().length >= 3 && note && fold(note).includes(fold(dq.trim())) && <p className="text-2xs text-primary-press truncate max-w-[170px]">{t('« {message} »', { message: t(note) })}</p>}
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
                      {costs && (
                        <td className="td px-2.5 text-right tnum">
                          <span className={cn('font-semibold', margin >= 32 ? 'text-tone-good-ink' : margin >= 25 ? 'text-tone-warn-ink' : 'text-tone-critical-ink')}>{pct(margin)}</span>
                        </td>
                      )}
                      <td className="td px-2.5">
                        <StatusPicker q={q} via="liste" />
                        {reason && <p className="text-2xs text-ink-mute truncate max-w-[160px] mt-0.5 md:hidden">{reason}</p>}
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
                      <td className="td px-2.5 text-xs whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="min-w-0">
                            {fu.manual && <p className="text-ink font-semibold truncate max-w-[170px]">{fu.manual}</p>}
                            <p className={cn('inline-flex items-center gap-1.5', fu.kind === 'next' ? 'text-ink-mute' : fu.kind === 'paused' ? 'text-tone-warn-ink font-semibold' : 'text-ink-faint', fu.manual && 'text-2xs')} title={fu.date ? t('Prévue le {date}', { date: shortDate(fu.date) }) : undefined}>
                              {fu.auto && <Zap className="w-3 h-3 text-primary-press shrink-0" aria-label={t('automatique')} />}
                              {fu.kind === 'paused' && <Pause className="w-3 h-3 shrink-0" />}
                              <span className="truncate max-w-[160px]">{fu.label}</span>
                            </p>
                          </div>
                          {fu.pausable && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                togglePause(q, fu.kind !== 'paused')
                              }}
                              className="ml-auto p-1 rounded-md text-ink-faint hover:text-ink hover:bg-sand"
                              aria-label={fu.kind === 'paused' ? t('Reprendre les relances') : t('Mettre les relances en pause')}
                              title={fu.kind === 'paused' ? t('Reprendre les relances') : t('Mettre les relances en pause')}
                            >
                              {fu.kind === 'paused' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="td px-2.5 pr-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-0.5 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity">
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
              </tbody>
            </table>
          </div>
        )}
        {load === 'ready' && results.length > 0 && (
          <div className="px-4 py-3 border-t border-hairline flex flex-wrap items-center justify-between gap-3 text-xs text-ink-mute">
            <div className="flex items-center gap-3">
              <span className="tnum">{t('{from}–{to} sur {total}', { from: num(from + 1), to: num(from + page.length), total: num(results.length) })}</span>
              <label className="flex items-center gap-1.5">
                <span>{t('Par page')}</span>
                <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="h-8 rounded-md border border-hairline-input bg-white px-1.5 text-xs text-ink tnum">
                  {PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <nav className="flex items-center gap-1" aria-label={t('Pagination')}>
              <button className="btn btn-xs btn-quiet" aria-label={t('Page précédente')} disabled={cur <= 1} onClick={() => goTo(cur - 1)}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {pageList(cur, pageCount).map((n, i) =>
                n === '…' ? (
                  <span key={'gap' + i} className="px-1">
                    …
                  </span>
                ) : (
                  <button key={n} onClick={() => goTo(n)} aria-current={n === cur ? 'page' : undefined} className={cn('w-8 h-8 rounded-md text-xs font-semibold tnum', n === cur ? 'bg-ink text-white' : 'hover:bg-sand')}>
                    {n}
                  </button>
                ),
              )}
              <button className="btn btn-xs btn-quiet" aria-label={t('Page suivante')} disabled={cur >= pageCount} onClick={() => goTo(cur + 1)}>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </nav>
          </div>
        )}
      </div>
      {bulk.dialog}
      <ComposeDrawer kind={compose?.kind ?? null} ctx={compose?.ctx ?? {}} onClose={() => setCompose(null)} />
    </Page>
  )
}
