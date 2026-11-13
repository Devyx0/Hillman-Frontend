import { useEffect, useMemo, useRef, useState } from 'react'
import type { MessageCtx, MessageKind } from '../../components/messaging'
import { APPOINTMENTS, clientById, companyById, fullName, repById, type MaterialLine, type Quote } from '../../data/mock'
import { t } from '../../i18n'
import { toast } from '../../lib/toast'
import { GST, QST, money, pct } from '../../lib/utils'
import { BUILDER_SECTIONS, BUILDER_SECTIONS_SHORT, CATALOG_EXTRAS, SAMPLE_AI_DESCRIPTION, SAMPLE_VISIT_NOTES, TARGET_MARGIN, actualsSeed, quoteDefaults, type Actuals, type QuoteAddon, type SectionId } from '../../data/quote-builder'

interface Dimensions {
  area: string
  fond: string
  rem: string
  versants: string
  etages: string
  drains: string
  jours: string
  pente: string
}

export type ExpertiseValue = 'Inclus' | 'Non-inclus' | 'Vérifier'
interface Warranties {
  fab: string
  mo: string
  offre: string
}
interface Attachment {
  name: string
  ext: string
  email: boolean
}
interface Check {
  tone: 'critical' | 'good' | 'warn'
  text: string
}
/**
 * All state and derived totals of the quote editor (mockup: body of `d4`).
 * Sections receive the returned object as `b`.
 */
export function useQuoteBuilder(quote: Quote) {
  const client = clientById(quote.clientId)!
  const company = companyById(quote.company)
  const rep = repById(quote.repId)!
  const isDemo = quote.id === 'q64320'
  const defaults = useMemo(() => quoteDefaults(quote), [quote])
  const sections = quote.company === 'sg' ? BUILDER_SECTIONS.filter((s) => BUILDER_SECTIONS_SHORT.includes(s.id)) : BUILDER_SECTIONS
  const hasSection = (id: SectionId) => sections.some((s) => s.id === id)

  const [status, setStatus] = useState(quote.status)
  const [repId, setRepId] = useState(quote.repId)
  const [workKind, setWorkKind] = useState(quote.workType.includes('plat') ? 'Toit plat' : quote.workType.includes('métal') ? 'Toit en métal' : 'Toit en pente')
  const [dims, setDims] = useState<Dimensions>({ area: isDemo ? '1 920' : '', fond: isDemo ? '1 640' : '', rem: isDemo ? '280' : '', versants: '4', etages: '2', drains: '0', jours: '2', pente: '6' })
  const [checked, setChecked] = useState(() => new Set(defaults.checked))
  const [openGroups, setOpenGroups] = useState(() => new Set(defaults.scope.slice(0, 3).map((s) => s.name)))
  const [scopeQuery, setScopeQuery] = useState('')
  const [templateMenu, setTemplateMenu] = useState(false)
  const [expertises, setExpertises] = useState<Record<string, ExpertiseValue>>({ Isolation: 'Vérifier', Structure: 'Vérifier', Ventilation: 'Inclus', Pontage: 'Vérifier' })
  const [costs, setCosts] = useState<MaterialLine[]>(() => defaults.costs.map((l) => ({ ...l })))
  const [price, setPrice] = useState(defaults.price)
  const [discount, setDiscount] = useState(0)
  const [addons, setAddons] = useState<QuoteAddon[]>(() => defaults.addons.map((a) => ({ ...a })))
  const [comments, setComments] = useState('')
  const [payMode, setPayMode] = useState<'std' | 'autre'>('std')
  const [warranties, setWarranties] = useState<Warranties>({ fab: 'Prolongé BP 50 ans ferme', mo: '10 ans', offre: '30 jours' })
  const [note, setNote] = useState(isDemo ? t(SAMPLE_VISIT_NOTES) : '')
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
  const [actuals, setActuals] = useState<Actuals>(() => {
    const seed = actualsSeed(isDemo, defaults.price + defaults.addons.filter((a) => !a.included).reduce((n, a) => n + a.price, 0))
    return { final: 0, ...seed, invoices: seed.invoices.map((i) => ({ ...i, label: t(i.label) })) }
  })
  const [targetTotal, setTargetTotal] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([
    { name: t('Garantie GAF System Plus.pdf'), ext: 'PDF', email: true },
    { name: t('Fiche technique Timberline HDZ.pdf'), ext: 'PDF', email: false },
  ])

  // ── Totals ──
  const costTotal = costs.reduce((n, l) => n + l.qty * l.cost, 0)
  const baseCostTotal = defaults.costs.reduce((n, l) => n + l.qty * l.cost, 0)
  const paidAddons = addons.filter((a) => !a.included && a.price > 0)
  const subtotal = Math.max(0, price + paidAddons.reduce((n, a) => n + a.price, 0) - discount)
  const realCost = quote.company === 'toit' ? costTotal : quote.cost * (costTotal / (baseCostTotal || 1))
  const profit = subtotal - realCost
  const marginPct = subtotal ? (profit / subtotal) * 100 : 0
  const gst = subtotal * GST
  const qst = subtotal * QST
  const total = subtotal + gst + qst
  const labour = costs.find((l) => /main/i.test(l.cat))
  const labourMargin = labour ? ((labour.sell - labour.cost) / labour.sell) * 100 : 100
  const finalAmount = actuals.final || subtotal
  const actualCosts = actuals.invoices.reduce((n, i) => n + (Number(i.amount) || 0), 0) + actuals.conteneurs + actuals.salaires + actuals.frais
  const actualProfit = finalAmount - actualCosts
  const actualMargin = finalAmount ? (actualProfit / finalAmount) * 100 : 0

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
    setCosts(kept)
    setCostMode('std')
    setListFilter('')
    toast(t('{n} items dans la soumission — totaux mis à jour', { n: kept.length }))
  }
  const priceFromTotal = () => {
    const target = Number(String(targetTotal).replace(/\s/g, '').replace(',', '.'))
    if (!target) {
      toast(t('Entrez un total visé, taxes incluses'))
      return
    }
    const beforeTax = target / (1 + GST + QST)
    const next = Math.round((beforeTax - paidAddons.reduce((n, a) => n + a.price, 0) + discount) * 100) / 100
    setPrice(next)
    toast(t('Prix calculé : {price} pour un total de {total}', { price: money(next), total: money(target) }))
  }
  const scopeLineCount = defaults.scope.reduce((n, s) => n + s.lines.length, 0)
  const done: Record<SectionId, boolean> = {
    infos: true,
    obligations: !!dims.area || quote.company !== 'toit',
    travaux: checked.size > 5,
    expertises: Object.keys(expertises).length === 4,
    coutants: costs.length > 0,
    garanties: !!warranties.fab,
    prix: subtotal > 0,
    notes: note.length > 40,
    autres: attachments.length > 0,
    envoi: quote.views > 0,
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
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(line)) next.delete(line)
      else next.add(line)
      return next
    })
  const rewriteNote = () => {
    setRewriting(true)
    window.setTimeout(() => {
      setNote(t(SAMPLE_AI_DESCRIPTION))
      setRewriting(false)
      toast(t("Note reformulée — relisez avant d'envoyer"))
    }, 1300)
  }

  const msgCtx: MessageCtx & { amount: string } = { name: fullName(client), first: client.first, quoteNo: quote.no, company: company.name, rep: rep.first, amount: money(total * 0.15) }
  const appointments = APPOINTMENTS.filter((a) => a.quoteNo === quote.no || (isDemo && a.clientId === client.id))
  const costCats = [...new Set(costs.map((l) => l.cat))]
  const filteredScope = defaults.scope.map((s) => ({ ...s, lines: s.lines.filter((l) => !scopeQuery || t(l).toLowerCase().includes(scopeQuery.toLowerCase())) })).filter((s) => s.lines.length)
  const checks: Check[] = [
    marginPct < TARGET_MARGIN ? { tone: 'critical', text: t('Marge de {m}, sous la cible de {target}', { m: pct(marginPct, 1), target: pct(TARGET_MARGIN) }) } : { tone: 'good', text: t('Marge au-dessus de la cible de {target}', { target: pct(TARGET_MARGIN) }) },
    ...(labour && labourMargin < TARGET_MARGIN ? [{ tone: 'warn' as const, text: t("Main-d'œuvre vendue sous la cible ({m})", { m: pct(labourMargin, 1) }) }] : []),
    ...(hasSection('travaux') && quote.company === 'toit' && !checked.has('Permis de construction') ? [{ tone: 'warn' as const, text: t('Permis : ni inclus ni exclu dans Travaux') }] : []),
    ...(client.email ? [] : [{ tone: 'warn' as const, text: t('Aucun courriel au dossier client') }]),
  ]

  return {
    quote, client, company, rep, isDemo, defaults, sections, hasSection,
    status, setStatus, repId, setRepId, workKind, setWorkKind, dims, setDims,
    checked, setChecked, openGroups, setOpenGroups, scopeQuery, setScopeQuery, templateMenu, setTemplateMenu,
    expertises, setExpertises, costs, setCosts, price, setPrice, discount, setDiscount, addons, setAddons,
    comments, setComments, payMode, setPayMode, warranties, setWarranties, note, setNote, rewriting,
    moreMenu, setMoreMenu, composeKind, setComposeKind, activeSection, sendVia, setSendVia, pdfShow, setPdfShow,
    costMode, setCostMode, listDraft, setListDraft, listFilter, setListFilter,
    actualsOpen, setActualsOpen, actuals, setActuals, targetTotal, setTargetTotal, attachments, setAttachments,
    costTotal, paidAddons, subtotal, realCost, profit, marginPct, gst, qst, total, labour, labourMargin,
    finalAmount, actualCosts, actualProfit, actualMargin,
    openList, applyList, priceFromTotal, scopeLineCount, done, scrollTo, toggleLine, rewriteNote,
    msgCtx, appointments, costCats, filteredScope, checks,
  }
}

export type Builder = ReturnType<typeof useQuoteBuilder>
