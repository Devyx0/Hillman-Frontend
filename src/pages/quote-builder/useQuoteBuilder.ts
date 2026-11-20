import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import type { MessageCtx, MessageKind } from '../../components/messaging'
import { APPOINTMENTS, clientById, clientLang, companyById, fullName, repById, type Client, type MaterialLine } from '../../data/mock'
import { PAYMENT_SCHEDULE_OPTIONS, defaultPaymentSchedule, paymentScheduleById } from '../../data/settings'
import { updateQuote, useStore, type QuoteRecord } from '../../data/store'
import { t } from '../../i18n'
import { toast } from '../../lib/toast'
import { GST, QST, money, pct } from '../../lib/utils'
import {
  BUILDER_SECTIONS,
  CATALOG_EXTRAS,
  SAMPLE_AI_DESCRIPTION,
  SECTIONS_BY_COMPANY,
  TARGET_MARGINS,
  beforeCaa,
  clauseValues,
  depositStep,
  draftPricing,
  draftSchedule,
  formGutterLines,
  getDraft,
  gutterHasTiers,
  gutterTotals,
  lineSell,
  missingPhotos,
  pricedAddons,
  quoteDefaults,
  saveDraft,
  syncQuoteAmounts,
  withGutterCosts,
  type GutterForm,
  type QuoteDraft,
  type SectionId,
  type TierId,
} from '../../data/quote-builder'
import { ROOF_SCOPE_SECTIONS } from '../../data/roofing-clauses'
import { queueChange, useConnectivity } from './offline'

export type { ExpertiseValue } from '../../data/quote-builder'

interface Check {
  tone: 'critical' | 'good' | 'warn'
  text: string
}

type Updater<T> = T | ((prev: T) => T)

/** Placeholder client for a quote whose client record is missing (never crash the builder). */
const NO_CLIENT: Client = { id: '', first: '—', last: '', phone: '', email: '', no: '', street: '', city: '', postal: '', since: '', tags: [], source: '', lifetime: 0, quotes: 0, lastActivity: '', consentSms: false, type: '' }

/**
 * All state and derived totals of the quote editor (mockup: body of `d4`).
 * The rep's content lives in a per-quote draft (`getDraft`, data/quote-builder.ts) so it survives
 * navigation; the selling price and cost are written back to the store as they change.
 * Sections receive the returned object as `b`.
 */
export function useQuoteBuilder(quote: QuoteRecord) {
  useStore()
  const { can } = useAuth()
  const canCosts = can('quotes.costs')
  const conn = useConnectivity()
  const client = clientById(quote.clientId) ?? NO_CLIENT
  const company = companyById(quote.company)
  const rep = repById(quote.repId) ?? repById('jph')!
  const isDemo = quote.id === 'q64320'
  const defaults = useMemo(() => quoteDefaults(quote), [quote])
  const scope = quote.company === 'toit' ? ROOF_SCOPE_SECTIONS : defaults.scope
  const target = TARGET_MARGINS[quote.company]
  const tiered = gutterHasTiers(quote)
  const sections = BUILDER_SECTIONS.filter((s) => SECTIONS_BY_COMPANY[quote.company].includes(s.id) && (s.id !== 'coutants' || canCosts)).sort(
    (a, b) => SECTIONS_BY_COMPANY[quote.company].indexOf(a.id) - SECTIONS_BY_COMPANY[quote.company].indexOf(b.id),
  )
  const hasSection = (id: SectionId) => sections.some((s) => s.id === id)

  // ── Draft (persisted per quote) ──
  const [draft, setDraftRaw] = useState<QuoteDraft>(() => getDraft(quote))
  /** Every change goes through `withGutterCosts`: Gouttières quantities follow the form, tier, add-ons and overrides. */
  const setDraft = (v: Updater<QuoteDraft>) => setDraftRaw((d) => withGutterCosts(quote, typeof v === 'function' ? v(d) : v))
  const set =
    <K extends keyof QuoteDraft>(key: K) =>
    (v: Updater<QuoteDraft[K]>) =>
      setDraft((d) => ({ ...d, [key]: typeof v === 'function' ? (v as (p: QuoteDraft[K]) => QuoteDraft[K])(d[key]) : v }))
  /** Price-tab add-ons: a chosen optional add-on also changes the work order (handled by withGutterCosts). */
  const first = useRef(true)
  useEffect(() => {
    saveDraft(quote.id, draft)
    syncQuoteAmounts(quote.id)
    if (first.current) first.current = false
    else queueChange(quote.id)
  }, [draft, quote.id])

  // ── UI-only state ──
  const [openGroups, setOpenGroups] = useState(() => new Set(scope.slice(0, 3).map((s) => s.name)))
  const [scopeQuery, setScopeQuery] = useState('')
  const [templateMenu, setTemplateMenu] = useState(false)
  const [rewriting, setRewriting] = useState(false)
  const [moreMenu, setMoreMenu] = useState(false)
  const [composeKind, setComposeKind] = useState<MessageKind | null>(null)
  const [activeSection, setActiveSection] = useState<SectionId>('infos')
  const [sendVia, setSendVia] = useState({ email: true, sms: true })
  const [pdfShow, setPdfShow] = useState({ coutant: false, prixTravaux: false })
  const [costMode, setCostMode] = useState<'std' | 'liste'>('std')
  const [listDraft, setListDraft] = useState<MaterialLine[]>([])
  const [listFilter, setListFilter] = useState('')
  const [actualsOpen, setActualsOpen] = useState(false)
  const [targetTotal, setTargetTotal] = useState('')

  const { dims, checked, expertises, costs, price, discount, addons, comments, warranties, note, attachments, actuals } = draft

  // ── Totals (one source: draftPricing — see the amount rule in data/quote-builder.ts) ──
  const pricing = draftPricing(quote, draft)
  const { subtotal, gst, qst, total } = pricing
  const costTotal = pricing.cost
  const realCost = costTotal
  const profit = pricing.profit
  const marginPct = pricing.margin
  const suggested = lineSell(costs)
  const paidAddons = pricedAddons(addons)
  const labour = costs.find((l) => /main/i.test(l.cat))
  const labourMargin = labour && labour.sell ? ((labour.sell - labour.cost) / labour.sell) * 100 : 100
  const finalAmount = actuals.final || subtotal
  const actualCosts = actuals.invoices.reduce((n, i) => n + (Number(i.amount) || 0), 0) + actuals.conteneurs + actuals.salaires + actuals.frais
  const actualProfit = finalAmount - actualCosts
  const actualMargin = finalAmount ? (actualProfit / finalAmount) * 100 : 0
  // Payment schedule: the one picked on the quote, else the company default (Paramètres → Calendriers de paiement).
  const scheduleOptions = PAYMENT_SCHEDULE_OPTIONS[quote.company]
  const scheduleId = paymentScheduleById(quote.company, draft.scheduleId).id
  const defaultScheduleId = defaultPaymentSchedule(quote.company).id
  const schedule = draftSchedule(quote.company, draft, total)
  const deposit = depositStep(schedule)
  // Gouttières: quantities from the form alone, to show which rows the rep overrode.
  const formLines = quote.company === 'sg' ? formGutterLines(quote, draft) : []
  const missing = missingPhotos(draft)
  const values = clauseValues(draft)

  // ── Setters ──
  const setGutter = (g: GutterForm) => {
    setDraft((d) => ({ ...d, gutter: g }))
    if (g.size !== quote.gutterSize) updateQuote(quote.id, { gutterSize: g.size })
  }
  const setTier = (tier: TierId) => setDraft((d) => ({ ...d, tier }))
  /** Quantités: override a form-derived quantity (same value as the form = no override). */
  const setQty = (item: string, qty: number) =>
    setDraft((d) => {
      const next = { ...d.qtyOverrides }
      const derived = formGutterLines(quote, d).find((l) => l.item === item)?.qty
      if (derived === qty) delete next[item]
      else next[item] = qty
      return { ...d, qtyOverrides: next }
    })
  /** "Rétablir les valeurs du formulaire": drop every manual override. */
  const resetQuantities = () => setDraft((d) => ({ ...d, qtyOverrides: {} }))
  const setRepId = (id: string) => updateQuote(quote.id, { repId: id })

  // ── Actions ──
  const openList = () => {
    const extra = CATALOG_EXTRAS[quote.company].filter((c) => !costs.some((l) => l.item === c.item))
    const all = [...costs.map((l) => ({ ...l })), ...extra.map((l) => ({ ...l }))]
    const cats = [...new Set(all.map((l) => l.cat))]
    setListDraft(all.sort((a, b) => cats.indexOf(a.cat) - cats.indexOf(b.cat)))
    setCostMode('liste')
  }
  const applyList = () => {
    const kept = listDraft.filter((l) => l.qty > 0)
    set('costs')(kept)
    setCostMode('std')
    setListFilter('')
    toast(t('{n} items dans la soumission — totaux mis à jour', { n: kept.length }))
  }
  const optionsTotal = (pricing.tier?.price ?? 0) + paidAddons.reduce((n, a) => n + a.price, 0)
  const priceFromTotal = () => {
    const target = Number(String(targetTotal).replace(/\s/g, '').replace(',', '.'))
    if (!target) {
      toast(t('Entrez un total visé, taxes incluses'))
      return
    }
    let beforeTax = target / (1 + GST + QST)
    if (quote.company === 'sg' && draft.caa) beforeTax = beforeCaa(beforeTax)
    const next = Math.round((beforeTax - optionsTotal + discount) * 100) / 100
    set('price')(next)
    toast(t('Prix calculé : {price} pour un total de {total}', { price: money(next), total: money(target) }))
  }
  /** Set the price so the selling price equals the catalogue suggestion. */
  const applySuggested = () => {
    const next = Math.round((suggested - optionsTotal + discount) * 100) / 100
    set('price')(Math.max(0, next))
    toast(t('Prix ajusté au vendant suggéré : {amount}', { amount: money(suggested) }))
  }
  const scopeLineCount = scope.reduce((n, s) => n + s.lines.length, 0)
  const ft = gutterTotals(draft.gutter)
  const done: Record<SectionId, boolean> = {
    infos: true,
    obligations: !!dims.area,
    formulaire: ft.gutter > 0,
    photos: missing.length === 0,
    quantites: costs.length > 0,
    description: draft.description.length > 20,
    travaux: checked.size > 5,
    expertises: Object.keys(expertises).length === 4,
    coutants: costs.length > 0,
    budget: costs.length > 0,
    versions: true,
    garanties: Object.values(warranties).every(Boolean),
    prix: subtotal > 0,
    notes: note.length > 40,
    autres: attachments.length > 0 || missing.length === 0,
    envoi: quote.status !== 'En cours',
    suivi: ['Signé', 'Payé', 'Terminé'].includes(quote.status),
  }

  // Highlight the section currently in view.
  const observer = useRef<IntersectionObserver | null>(null)
  useEffect(() => {
    observer.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActiveSection((visible[0].target as HTMLElement).dataset.section as SectionId)
      },
      { rootMargin: '-130px 0px -60% 0px' },
    )
    document.querySelectorAll('[data-section]').forEach((el) => observer.current!.observe(el))
    return () => observer.current?.disconnect()
  }, [quote.id])

  const scrollTo = (id: string) => document.getElementById(`s-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const toggleLine = (line: string) =>
    set('checked')((prev) => {
      const next = new Set(prev)
      if (next.has(line)) next.delete(line)
      else next.add(line)
      return next
    })
  const rewriteNote = () => {
    setRewriting(true)
    window.setTimeout(() => {
      set('note')(t(SAMPLE_AI_DESCRIPTION))
      setRewriting(false)
      toast(t("Note reformulée — relisez avant d'envoyer"))
    }, 1300)
  }

  const msgCtx: MessageCtx & { amount: string } = { name: fullName(client), first: client.first, quoteNo: quote.no, company: company.name, rep: rep.first, amount: money((total * (schedule[0]?.pct ?? 15)) / 100), lang: clientLang(client) }
  const appointments = APPOINTMENTS.filter((a) => a.quoteNo === quote.no || (isDemo && a.clientId === client.id))
  const costCats = [...new Set(costs.map((l) => l.cat))]
  const filteredScope = scope.map((s) => ({ ...s, lines: s.lines.filter((l) => !scopeQuery || t(l).toLowerCase().includes(scopeQuery.toLowerCase())) })).filter((s) => s.lines.length)
  const checks: Check[] = [
    ...(canCosts
      ? [
          marginPct < target
            ? { tone: 'critical' as const, text: t('Marge de {m}, sous la cible de {target}', { m: pct(marginPct, 1), target: pct(target) }) }
            : { tone: 'good' as const, text: t('Marge au-dessus de la cible de {target}', { target: pct(target) }) },
          ...(labour && labourMargin < target ? [{ tone: 'warn' as const, text: t("Main-d'œuvre vendue sous la cible ({m})", { m: pct(labourMargin, 1) }) }] : []),
        ]
      : []),
    ...(missing.length ? [{ tone: 'warn' as const, text: t('{n} photos obligatoires manquantes', { n: missing.length }) }] : []),
    ...(quote.company === 'toit' && !checked.has('Permis de construction') ? [{ tone: 'warn' as const, text: t('Permis : ni inclus ni exclu dans Travaux') }] : []),
    ...(subtotal <= 0 ? [{ tone: 'warn' as const, text: t('Aucun prix entré') }] : []),
    ...(client.email ? [] : [{ tone: 'warn' as const, text: t('Aucun courriel au dossier client') }]),
  ]

  return {
    quote, client, company, rep, isDemo, defaults, scope, sections, hasSection, canCosts, target, tiered, conn,
    draft, setDraft, set, pricing, values, missing, schedule, suggested, applySuggested,
    status: quote.status, repId: quote.repId, setRepId,
    workKind: draft.workKind, setWorkKind: set('workKind'), dims, setDims: set('dims'), roofNote: draft.roofNote, setRoofNote: set('roofNote'),
    checked, setChecked: set('checked'), openGroups, setOpenGroups, scopeQuery, setScopeQuery, templateMenu, setTemplateMenu,
    expertises, setExpertises: set('expertises'), costs, setCosts: set('costs'), price, setPrice: set('price'), discount, setDiscount: set('discount'),
    addons, setAddons: set('addons'), comments, setComments: set('comments'),
    scheduleOptions, scheduleId, defaultScheduleId, setScheduleId: set('scheduleId'), deposit, formLines, setQty, resetQuantities, qtyOverrides: draft.qtyOverrides,
    warranties, setWarranties: set('warranties'), note, setNote: set('note'), rewriting,
    gutter: draft.gutter, setGutter, tier: draft.tier, setTier, tiers: draft.tiers, setTiers: set('tiers'), caa: draft.caa, setCaa: set('caa'), caaNo: draft.caaNo, setCaaNo: set('caaNo'),
    description: draft.description, setDescription: set('description'), renoArea: draft.renoArea, setRenoArea: set('renoArea'), renoDays: draft.renoDays, setRenoDays: set('renoDays'),
    photos: draft.photos, setPhotos: set('photos'),
    moreMenu, setMoreMenu, composeKind, setComposeKind, activeSection, sendVia, setSendVia, pdfShow, setPdfShow,
    costMode, setCostMode, listDraft, setListDraft, listFilter, setListFilter,
    actualsOpen, setActualsOpen, actuals, setActuals: set('actuals'), targetTotal, setTargetTotal, attachments, setAttachments: set('attachments'),
    costTotal, paidAddons, subtotal, realCost, profit, marginPct, gst, qst, total, labour, labourMargin,
    finalAmount, actualCosts, actualProfit, actualMargin,
    openList, applyList, priceFromTotal, scopeLineCount, done, scrollTo, toggleLine, rewriteNote,
    msgCtx, appointments, costCats, filteredScope, checks,
  }
}

export type Builder = ReturnType<typeof useQuoteBuilder>
