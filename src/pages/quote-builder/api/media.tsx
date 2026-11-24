/**
 * Quote editor sections in API mode: photos (upload, title, primary, drawing layer), PDFs (generate, list,
 * download) and the change history (admin).
 */
import { useEffect, useRef, useState } from 'react'
import { Camera, Download, FileText, History, ImageOff, LoaderCircle, Pencil, Star, Trash2 } from 'lucide-react'
import * as api from '../../../api/endpoints'
import { errorMessage } from '../../../api/http'
import { STATUS_FR, REFUSAL_FR } from '../../../api/mappers'
import type { ApiAuditEntry, ApiDocument, ApiQuote, QuotePhoto as ApiPhoto } from '../../../api/types'
import { AnnotatedPhoto } from '../../../components/AnnotatedPhoto'
import { openDocument } from '../../../components/client-api'
import { BuilderSection } from '../../../components/quote-shared'
import { confirmAction, ErrorState, SkeletonRows } from '../../../components/states'
import { Empty } from '../../../components/ui'
import type { QuotePhoto, Shape } from '../../../data/quote-builder'
import { locale, t } from '../../../i18n'
import { toast } from '../../../lib/toast'
import { cn } from '../../../lib/utils'
import { AnnotationEditor } from '../AnnotationEditor'
import type { ApiQuoteState } from './useApiQuote'

type S = ApiQuoteState & { quote: ApiQuote }

const when = (iso: string) => new Date(iso).toLocaleString(locale(), { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })

// ── Photos ───────────────────────────────────────────────────────────────────
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
const MAX_BYTES = 15 * 1024 * 1024

/** The drawing layer is stored as `{ shapes }` (JSON, 100 kB max). */
const shapesOf = (p: ApiPhoto): Shape[] => {
  const d = p.annotation_data as { shapes?: Shape[] } | Shape[] | null
  if (!d) return []
  return Array.isArray(d) ? d : Array.isArray(d.shapes) ? d.shapes : []
}

/** API photo → the UI photo shape used by the annotation editor and the photo frame. */
const uiPhoto = (p: ApiPhoto): QuotePhoto => ({ id: p.id, label: p.title ?? '', src: p.url ?? undefined, shapes: shapesOf(p), main: p.is_primary })

export function ApiPhotosSection({ s }: { s: S }) {
  const { quote, run } = s
  const input = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(0)
  const [editing, setEditing] = useState<ApiPhoto | null>(null)
  const [titles, setTitles] = useState<Record<string, string>>({})
  const refreshed = useRef(false)

  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    for (const file of Array.from(files)) {
      if (!ACCEPTED.includes(file.type)) {
        toast(t('Format d’image non accepté (JPEG, PNG, WebP ou HEIC) : {name}', { name: file.name }))
        continue
      }
      if (file.size > MAX_BYTES) {
        toast(t('Photo trop volumineuse (15 Mo maximum) : {name}', { name: file.name }))
        continue
      }
      setUploading((n) => n + 1)
      await run(() => api.uploadPhoto(quote.id, file, { filename: file.name, title: file.name.replace(/\.[^.]+$/, '') }))
      setUploading((n) => n - 1)
    }
    if (input.current) input.current.value = ''
  }

  // Signed photo URLs are short-lived: when one fails to load, get fresh ones once.
  const onImageError = () => {
    if (refreshed.current) return
    refreshed.current = true
    void run(() => api.getQuote(quote.id))
  }

  const saveTitle = (p: ApiPhoto) => {
    const v = titles[p.id]
    setTitles((x) => {
      const n = { ...x }
      delete n[p.id]
      return n
    })
    if (v === undefined || v.trim() === (p.title ?? '')) return
    void run(() => api.updatePhoto(quote.id, p.id, { title: v.trim() || null }))
  }

  return (
    <BuilderSection
      id="photos"
      title={t('Photos')}
      actions={
        <>
          <input ref={input} type="file" accept={ACCEPTED.join(',')} multiple className="hidden" onChange={(e) => void upload(e.target.files)} />
          <button className="btn btn-xs btn-secondary" onClick={() => input.current?.click()} disabled={uploading > 0}>
            {uploading ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
            {t('Ajouter des photos')}
          </button>
        </>
      }
    >
      {quote.photos.length === 0 && (
        <Empty icon={Camera} title={t('Aucune photo')}>
          {t('JPEG, PNG, WebP ou HEIC, 15 Mo maximum.')}
        </Empty>
      )}
      <ul className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {quote.photos.map((p) => (
          <li key={p.id} className="rounded-lg border border-hairline overflow-hidden bg-white">
            <div className="relative aspect-[4/3] bg-sand">
              {p.url ? (
                <AnnotatedPhoto photo={uiPhoto(p)} imgClassName="" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-ink-faint">
                  <ImageOff className="w-6 h-6" />
                </div>
              )}
              {p.url && <img src={p.url} alt="" className="hidden" onError={onImageError} />}
              {p.is_primary && <span className="absolute top-2 left-2 badge bg-ink text-white !text-2xs">{t('Principale')}</span>}
            </div>
            <div className="p-2 space-y-1.5">
              <input
                className="form-input h-8 text-xs"
                value={titles[p.id] ?? p.title ?? ''}
                placeholder={t('Titre')}
                onChange={(e) => setTitles((x) => ({ ...x, [p.id]: e.target.value }))}
                onBlur={() => saveTitle(p)}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                aria-label={t('Titre de la photo')}
              />
              <div className="flex items-center gap-1">
                <button
                  className={cn('p-1.5 rounded hover:bg-sand', p.is_primary ? 'text-tone-warn' : 'text-ink-mute')}
                  title={t('Photo principale')}
                  aria-label={t('Photo principale')}
                  disabled={p.is_primary}
                  onClick={() => void run(() => api.updatePhoto(quote.id, p.id, { is_primary: true }), t('Photo principale choisie'))}
                >
                  <Star className="w-3.5 h-3.5" fill={p.is_primary ? 'currentColor' : 'none'} />
                </button>
                <button className="p-1.5 rounded text-ink-mute hover:bg-sand" title={t('Annoter la photo')} aria-label={t('Annoter la photo')} disabled={!p.url} onClick={() => setEditing(p)}>
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  className="p-1.5 rounded text-ink-mute hover:bg-sand ml-auto"
                  title={t('Retirer')}
                  aria-label={t('Retirer')}
                  onClick={async () => {
                    if (await confirmAction({ title: t('Retirer cette photo?'), confirmLabel: t('Retirer'), danger: true })) void run(() => api.removePhoto(quote.id, p.id), t('Photo retirée'))
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {editing && (
        <AnnotationEditor
          photo={uiPhoto(editing)}
          onClose={() => setEditing(null)}
          onSave={(_annotated, shapes) => {
            const p = editing
            setEditing(null)
            void run(() => api.updatePhoto(quote.id, p.id, { annotation_data: shapes.length ? { shapes } : null }), t('Annotations enregistrées'))
          }}
        />
      )}
    </BuilderSection>
  )
}

// ── PDFs ─────────────────────────────────────────────────────────────────────
const KIND_LABEL: Record<string, string> = { client_quote: 'Soumission', quantity_list: 'Bon de quantités', signed_contract: 'Contrat signé', work_order: 'Bon de travail' }

export function ApiDocumentsSection({ s }: { s: S }) {
  const { quote, costView } = s
  const [docs, setDocs] = useState<{ status: 'loading' | 'ready' | 'error'; rows: ApiDocument[] }>({ status: 'loading', rows: [] })
  const [attempt, setAttempt] = useState(0)
  const [opts, setOpts] = useState({ workPrices: false, costs: false })
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    api.listDocuments(quote.id).then(
      (rows) => live && setDocs({ status: 'ready', rows }),
      () => live && setDocs({ status: 'error', rows: [] }),
    )
    return () => {
      live = false
    }
  }, [quote.id, attempt])

  const generate = async (kind: 'client_quote' | 'quantity_list') => {
    if (busy) return
    setBusy(kind)
    // Open the tab during the click (pop-up blockers), then point it at the PDF once rendered.
    const win = window.open('', '_blank')
    try {
      const r = await api.generateDocument(quote.id, kind === 'client_quote' ? { kind, include_work_prices: opts.workPrices, include_costs: costView && opts.costs } : { kind })
      if (win) win.location.href = r.url
      else window.location.href = r.url
      setDocs((d) => ({ status: 'ready', rows: [r.document, ...d.rows] }))
      toast(t('PDF généré'))
    } catch (e) {
      win?.close()
      toast(errorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <BuilderSection id="envoi" title={t('PDF')}>
      <div className="flex flex-col md:flex-row md:items-end gap-4">
        <div className="flex-1 space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={opts.workPrices} onChange={(e) => setOpts({ ...opts, workPrices: e.target.checked })} className="accent-[var(--color-primary)]" />
            {t('Avec prix des travaux (prix unitaire et montant des lignes)')}
          </label>
          {costView && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={opts.costs} onChange={(e) => setOpts({ ...opts, costs: e.target.checked })} className="accent-[var(--color-primary)]" />
              {t('Avec coûtants (page interne : coûts et marge)')}
            </label>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-sm btn-primary" onClick={() => void generate('client_quote')} disabled={!!busy}>
            {busy === 'client_quote' ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {t('Générer la soumission')}
          </button>
          <button className="btn btn-sm btn-secondary" onClick={() => void generate('quantity_list')} disabled={!!busy}>
            {busy === 'quantity_list' ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {t('Bon de quantités (sans prix)')}
          </button>
        </div>
      </div>
      <div className="mt-4">
        {docs.status === 'loading' && <SkeletonRows rows={2} />}
        {docs.status === 'error' && <ErrorState onRetry={() => setAttempt((n) => n + 1)} />}
        {docs.status === 'ready' && docs.rows.length === 0 && <p className="text-sm text-ink-mute">{t('Aucun PDF généré pour cette soumission.')}</p>}
        {docs.status === 'ready' && docs.rows.length > 0 && (
          <ul className="divide-y divide-hairline rounded-lg border border-hairline">
            {docs.rows.map((d) => (
              <li key={d.id} className="px-3 py-2 flex items-center gap-3">
                <FileText className="w-4 h-4 text-ink-mute" />
                <span className="flex-1 min-w-0 text-sm font-semibold truncate">
                  {t(KIND_LABEL[d.kind] ?? d.kind)} {quote.display_number}
                  {d.include_work_prices && <span className="ml-2 text-2xs font-normal text-ink-mute">{t('avec prix des travaux')}</span>}
                  {d.include_costs && <span className="ml-2 text-2xs font-normal text-ink-mute">{t('avec coûtants')}</span>}
                </span>
                <span className="text-xs text-ink-mute">{when(d.created_at)}</span>
                <button className="p-1.5 rounded hover:bg-sand" aria-label={t('Télécharger')} onClick={() => void openDocument(d.id)}>
                  <Download className="w-4 h-4 text-ink-mute" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </BuilderSection>
  )
}

// ── Status details and history ───────────────────────────────────────────────
const ACTION_LABEL: Record<string, string> = {
  create: 'Création',
  update: 'Modification',
  delete: 'Suppression',
  status_change: 'Changement de statut',
  price_change: 'Changement de prix',
  send: 'Envoi',
  sign: 'Signature',
  merge: 'Fusion',
  export: 'Exportation',
}
const TABLE_LABEL: Record<string, string> = { quotes: 'Soumission', quote_addons: 'Ajout', quote_cost_lines: 'Ligne de coûtant', clients: 'Client' }
const FIELD_LABEL: Record<string, string> = {
  status: 'Statut',
  base_price: 'Prix de base',
  discount_amount: 'Escompte',
  subtotal_amount: 'Sous-total',
  gst_amount: 'TPS',
  qst_amount: 'TVQ',
  total_amount: 'Total',
  assigned_user_id: 'Représentant',
  quote_date: 'Date',
  work_summary: 'Résumé des travaux',
  payment_terms: 'Modalités de paiement',
  notes_html: 'Notes',
  price_comments: 'Commentaires sur le prix',
  quantity: 'Quantité',
  amount: 'Montant',
  description: 'Description',
  is_included: 'Inclus dans le prix',
  refusal_reason: 'Raison du refus',
  accepted_at: 'Acceptée le',
}

const showValue = (field: string, v: unknown): string => {
  if (v === null || v === undefined || v === '') return '—'
  if (field === 'status' && typeof v === 'string') return t(STATUS_FR[v as keyof typeof STATUS_FR] ?? v)
  if (field === 'refusal_reason' && typeof v === 'string') return t(REFUSAL_FR[v as keyof typeof REFUSAL_FR] ?? v)
  if (typeof v === 'boolean') return v ? t('Oui') : t('Non')
  const s = typeof v === 'string' ? v : JSON.stringify(v)
  return s.length > 80 ? s.slice(0, 77) + '…' : s
}

export function ApiHistorySection({ s }: { s: S }) {
  const { quote } = s
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; items: ApiAuditEntry[]; error?: string }>({ status: 'loading', items: [] })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let live = true
    setState({ status: 'loading', items: [] })
    api.quoteHistory(quote.id).then(
      (r) => live && setState({ status: 'ready', items: r.items }),
      (e) => live && setState({ status: 'error', items: [], error: errorMessage(e) }),
    )
    return () => {
      live = false
    }
    // Reload after each change of the quote.
  }, [quote.id, quote.updated_at, attempt])

  return (
    <BuilderSection id="suivi" title={t('Journal des modifications')}>
      {state.status === 'loading' && <SkeletonRows rows={3} />}
      {state.status === 'error' && <ErrorState onRetry={() => setAttempt((n) => n + 1)}>{state.error}</ErrorState>}
      {state.status === 'ready' && state.items.length === 0 && <Empty icon={History} title={t('Aucune modification enregistrée')} />}
      {state.status === 'ready' && state.items.length > 0 && <AuditList items={state.items} />}
    </BuilderSection>
  )
}

/** Rows of the audit log (quote history and the admin journal). */
export function AuditList({ items, showRecord }: { items: ApiAuditEntry[]; showRecord?: boolean }) {
  return (
    <ol className="divide-y divide-hairline">
      {items.map((e) => (
        <li key={e.id} className="py-2.5">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
            <span className="font-semibold text-ink">{t(ACTION_LABEL[e.action] ?? e.action)}</span>
            <span className="text-ink-mute">· {t(TABLE_LABEL[e.table_name] ?? e.table_name)}</span>
            {showRecord && e.company_name && <span className="text-ink-mute">· {e.company_name}</span>}
            <span className="ml-auto text-xs text-ink-mute">
              {when(e.occurred_at)} · {e.actor_name ?? t(e.actor_type === 'user' ? 'Utilisateur' : e.actor_type === 'system' ? 'Système' : 'Automatisation')}
            </span>
          </div>
          {e.summary && <p className="text-xs text-ink-secondary mt-0.5">{e.summary}</p>}
          {e.changes && e.changes.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {e.changes.map((c) => (
                <li key={c.field} className="text-xs text-ink-secondary">
                  <span className="font-semibold">{t(FIELD_LABEL[c.field] ?? c.field)}</span> : <span className="line-through text-ink-mute">{showValue(c.field, c.old)}</span> → {showValue(c.field, c.new)}
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  )
}
