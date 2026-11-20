import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronDown, ChevronRight, Ellipsis, MessageSquare, Pause, Phone } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { FilterBar, FilterField, Select, type SelectOption } from '../components/filters'
import { ComposeDrawer, type MessageCtx, type MessageKind } from '../components/messaging'
import { HoverTip, useChangeStatus } from '../components/quote-status'
import { ErrorState, Loading } from '../components/states'
import { Page, PageHeader, RepAvatar } from '../components/ui'
import { inScope, useApp } from '../context/AppContext'
import { REPS, clientById, clientLang, companyById } from '../data/mock'
import { quoteByNo } from '../data/store'
import { AMOUNT_RANGES, COLUMN_STATUS, PIPELINE_COLUMNS as COLUMNS, QUOTE_COLUMNS, ageTone, buildDeals, inAmountRange as matchesAmount, type AmountRange, type PipelineColumnId as ColumnId } from '../data/pipeline'
import { request, useStore } from '../data/store'
import { t } from '../i18n'
import { toast } from '../lib/toast'
import { cn, money, moneyShort } from '../lib/utils'

/** Pipeline kanban (mockup: `V3`). Quote cards follow the store; moving one changes the quote's status. */
export default function Pipeline() {
  const { scope } = useApp()
  const navigate = useNavigate()
  const version = useStore()
  const { user, can } = useAuth()
  const viewAll = can('quotes.viewAll')
  const myCompanies = useMemo(() => user?.companies ?? [], [user])
  const status = useChangeStatus({ via: 'pipeline' })
  const [params] = useSearchParams()
  const forceError = params.get('erreur') === '1'
  const [attempt, setAttempt] = useState(0)
  const [load, setLoad] = useState<'loading' | 'ready' | 'error'>('loading')
  /** Lead cards moved by hand (leads keep their local behaviour). */
  const [leadMoves, setLeadMoves] = useState<Record<string, ColumnId>>({})
  const [rep, setRep] = useState('all')
  const [amountRange, setAmountRange] = useState<AmountRange>('all')
  useEffect(() => {
    setRep('all')
  }, [scope])
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
  }, [attempt, forceError])
  const [showRefused, setShowRefused] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<ColumnId | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [compose, setCompose] = useState<{ kind: MessageKind; ctx: MessageCtx } | null>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const deals = useMemo(() => buildDeals().map((d) => (!d.quoteId && leadMoves[d.id] ? { ...d, col: leadMoves[d.id], days: 0, statusLabel: COLUMN_STATUS[leadMoves[d.id]] } : d)), [version, leadMoves])
  const visible = useMemo(
    () =>
      deals.filter(
        (d) => inScope(scope, d.company) && myCompanies.includes(d.company) && (viewAll || !d.quoteId || d.repId === user?.repId) && (rep === 'all' || d.repId === rep) && matchesAmount(d.amount, amountRange),
      ),
    [deals, scope, myCompanies, viewAll, user, rep, amountRange],
  )
  const inColumn = (col: ColumnId) => visible.filter((d) => d.col === col).sort((a, b) => a.days - b.days || b.amount - a.amount)
  const canDrag = (d: { quoteId?: string }) => !d.quoteId || status.canChange
  const targets = (d: { quoteId?: string; col: ColumnId }) => COLUMNS.filter((c) => c.id !== d.col && (!d.quoteId || QUOTE_COLUMNS.includes(c.id)))

  const move = async (id: string, col: ColumnId) => {
    setMenuId(null)
    const deal = deals.find((d) => d.id === id)
    if (!deal || deal.col === col) return
    if (!deal.quoteId) {
      setLeadMoves((m) => ({ ...m, [id]: col }))
      toast(`${deal.name} → ${t(COLUMNS.find((c) => c.id === col)!.label)}`)
      return
    }
    if (!QUOTE_COLUMNS.includes(col)) {
      toast(t('Une soumission ne peut pas revenir à l’étape lead ou visite.'))
      return
    }
    // Refusé asks the reason, Signé asks to confirm; cancelling leaves the card where it was.
    await status.change(deal.quoteId, COLUMN_STATUS[col])
  }

  if (load !== 'ready') {
    return (
      <Page wide>
        <PageHeader title={t('Pipeline')} />
        <div className="bg-white rounded-xl shadow-card">{load === 'loading' ? <Loading /> : <ErrorState title={t('Impossible de charger le pipeline')} onRetry={() => setAttempt((a) => a + 1)} />}</div>
      </Page>
    )
  }

  const open = visible.filter((d) => !['signe', 'refuse'].includes(d.col))
  const reps = REPS.filter((r) => r.company !== 'all' && (scope === 'all' || r.company === scope))
  const repOptions: SelectOption[] = [{ value: 'all', label: t('Tous les représentants') }, ...reps.map((r) => ({ value: r.id, label: r.name }))]
  const columns = COLUMNS.filter((c) => c.id !== 'refuse' || showRefused)

  return (
    <Page wide>
      <PageHeader title={t('Pipeline')} />
      <FilterBar>
        {reps.length > 1 && (
          <FilterField label={t('Représentant')}>
            <Select value={rep} onChange={setRep} options={repOptions} className="w-52" />
          </FilterField>
        )}
        <FilterField label={t('Montant')}>
          <Select value={amountRange} onChange={setAmountRange} options={AMOUNT_RANGES.map((r) => ({ ...r, label: t(r.label) }))} className="w-48" />
        </FilterField>
        <div className="col-span-2 md:ml-auto flex flex-wrap items-end gap-x-6 gap-y-2">
          <div>
            <p className="label-caps">{t('Pipeline ouvert')}</p>
            <p className="text-lg font-semibold tnum">{moneyShort(open.reduce((n, d) => n + d.amount, 0))}</p>
          </div>
          <div>
            <p className="label-caps">{t('Signé')}</p>
            <p className="text-lg font-semibold tnum text-tone-good-ink">{moneyShort(visible.filter((d) => d.col === 'signe').reduce((n, d) => n + d.amount, 0))}</p>
          </div>
        </div>
      </FilterBar>
      <div className="overflow-x-auto -mx-4 px-4 md:-mx-8 md:px-8 pb-2">
        <div className="flex gap-3 min-w-max items-start">
          {columns.map((col) => {
            const items = inColumn(col.id)
            const total = items.reduce((n, d) => n + d.amount, 0)
            return (
              <div
                key={col.id}
                onDragOver={(e) => {
                  e.preventDefault()
                  setOverCol(col.id)
                }}
                onDragLeave={() => setOverCol((c) => (c === col.id ? null : c))}
                onDrop={(e) => {
                  e.preventDefault()
                  if (dragId) move(dragId, col.id)
                  setDragId(null)
                  setOverCol(null)
                }}
                className={cn('w-[17.5rem] shrink-0 rounded-xl bg-stone/60 flex flex-col max-h-[calc(100vh-17rem)] transition-shadow', overCol === col.id && 'ring-2 ring-primary bg-primary-wash')}
              >
                <div className="px-3 pt-3 pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink flex items-center gap-2">
                      {t(col.label)}
                      <span className="text-2xs font-bold bg-white text-ink-mute px-1.5 rounded-full tnum">{items.length}</span>
                    </p>
                    <p className="text-xs font-semibold tnum text-ink-secondary">{moneyShort(total)}</p>
                  </div>
                </div>
                <div className="px-2 pb-2 space-y-2 overflow-y-auto nav-scroll">
                  {items.map((d) => (
                    <article
                      key={d.id}
                      draggable={canDrag(d)}
                      onDragStart={() => setDragId(d.id)}
                      onDragEnd={() => {
                        setDragId(null)
                        setOverCol(null)
                      }}
                      onClick={() => (d.quoteId ? navigate(`/soumissions/${d.quoteId}`) : navigate(`/leads/${d.id}`))}
                      className={cn('group relative bg-white rounded-lg shadow-card p-3 hover:shadow-elevated transition-shadow', canDrag(d) ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer', dragId === d.id && 'opacity-40')}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink truncate">{d.name}</p>
                          <p className="text-2xs text-ink-mute tnum flex items-center gap-1.5">
                            {d.no}
                            {d.paused && d.col !== 'signe' && d.col !== 'refuse' && (
                              <HoverTip tip={t('Relance en pause')}>
                                <Pause className="w-3 h-3 text-tone-warn-ink" />
                              </HoverTip>
                            )}
                          </p>
                        </div>
                        {canDrag(d) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setMenuId(menuId === d.id ? null : d.id)
                          }}
                          className="p-1 -mr-1 rounded text-ink-faint hover:text-ink hover:bg-sand"
                          aria-label={t('Déplacer vers')}
                        >
                          <Ellipsis className="w-4 h-4" />
                        </button>
                        )}
                      </div>
                      {d.col === 'refuse' && d.reason && <p className="text-2xs text-tone-critical-ink mt-1 truncate" title={t(d.reason)}>{t(d.reason)}</p>}
                      <div className="flex items-center justify-between mt-2.5">
                        <div className="flex items-center gap-2">
                          <RepAvatar id={d.repId} size="xs" />
                          <span className={cn('text-2xs font-semibold px-1.5 py-0.5 rounded-full tnum', ageTone(d.days))} title={t("Jours dans l'étape")}>
                            {t('{n} j', { n: d.days })}
                          </span>
                        </div>
                        <p className="text-sm font-semibold tnum text-ink">
                          {d.no === 'Lead' ? '≈ ' : ''}
                          {money(d.amount, false)}
                        </p>
                      </div>
                      <div className="absolute right-2 top-9 hidden group-hover:flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setCompose({ kind: 'sms', ctx: { name: d.name, first: d.name.split(' ')[0], quoteNo: d.no === 'Lead' ? undefined : d.no, company: companyById(d.company).name, lang: clientLang(clientById(quoteByNo(d.no)?.clientId)) } })
                          }}
                          className="w-7 h-7 rounded-md bg-white shadow-card flex items-center justify-center text-ink-mute hover:text-primary-press"
                          aria-label={t('Texto')}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toast(t('Appel vers {name}…', { name: d.name }))
                          }}
                          className="w-7 h-7 rounded-md bg-white shadow-card flex items-center justify-center text-ink-mute hover:text-primary-press"
                          aria-label={t('Appeler')}
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {menuId === d.id && (
                        <div onClick={(e) => e.stopPropagation()} className="absolute right-2 top-8 z-20 w-52 bg-white rounded-lg border border-hairline shadow-xl py-1 menu-in cursor-default">
                          <p className="label-caps px-3 py-1.5">{t('Déplacer vers')}</p>
                          {targets(d).map((c) => (
                            <button key={c.id} onClick={() => move(d.id, c.id)} className="w-full text-left px-3 py-1.5 text-sm text-ink-secondary hover:bg-sand">
                              {t(c.label)}
                            </button>
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                  {items.length === 0 && <p className="text-xs text-ink-faint text-center py-6 border-2 border-dashed border-hairline-strong rounded-lg">{t('Vide')}</p>}
                </div>
              </div>
            )
          })}
          {!showRefused && (
            <button onClick={() => setShowRefused(true)} className="w-12 shrink-0 self-stretch rounded-xl bg-stone/60 hover:bg-stone flex flex-col items-center py-3 gap-2 text-ink-mute" aria-label={t('Afficher Refusé')}>
              <ChevronRight className="w-4 h-4" />
              <span className="text-xs font-semibold [writing-mode:vertical-rl]">{t('Refusé')} · {inColumn('refuse').length}</span>
            </button>
          )}
          {showRefused && (
            <button onClick={() => setShowRefused(false)} className="btn btn-xs btn-ghost self-start mt-3">
              <ChevronDown className="w-3.5 h-3.5 rotate-90" />
              {t('Masquer')}
            </button>
          )}
        </div>
      </div>
      {status.dialog}
      <ComposeDrawer kind={compose?.kind ?? null} ctx={compose?.ctx ?? {}} onClose={() => setCompose(null)} />
    </Page>
  )
}
