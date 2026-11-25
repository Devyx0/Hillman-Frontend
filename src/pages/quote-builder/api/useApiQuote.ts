/**
 * State of the quote editor in API mode: the full quote as the server returns it (GET /quotes/:id) and the
 * company catalogue. Every change goes through `run`, which calls one endpoint, then replaces the quote with the
 * server's answer (every quote mutation returns the full quote) and updates the cached list row.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import * as api from '../../../api/endpoints'
import { ApiError, errorMessage } from '../../../api/http'
import type { ApiCatalogue, ApiQuote } from '../../../api/types'
import { cacheQuote, companySlug, isCostViewer, loadCatalogue, roleIn } from '../../../data/api-sync'
import type { CompanyId } from '../../../data/mock'
import { toast } from '../../../lib/toast'

export type LoadState = 'loading' | 'ready' | 'error' | 'missing'

export function useApiQuote(id: string) {
  const [quote, setQuote] = useState<ApiQuote | null>(null)
  const [catalogue, setCatalogue] = useState<ApiCatalogue | null>(null)
  const [load, setLoad] = useState<LoadState>('loading')
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  /** Number of requests in flight (the editor shows "Enregistrement…"). */
  const [pending, setPending] = useState(0)
  const live = useRef(true)

  useEffect(() => {
    live.current = true
    setLoad('loading')
    api.getQuote(id).then(
      async (q) => {
        if (!live.current) return
        cacheQuote(q)
        setQuote(q)
        setLoad('ready')
        const slug = companySlug(q.company_id)
        if (slug) {
          try {
            const c = await loadCatalogue(slug)
            if (live.current) setCatalogue(c)
          } catch (e) {
            if (live.current) setError(errorMessage(e))
          }
        }
      },
      (e) => {
        if (!live.current) return
        setError(errorMessage(e))
        setLoad(e instanceof ApiError && (e.status === 404 || e.status === 400) ? 'missing' : 'error')
      },
    )
    return () => {
      live.current = false
    }
  }, [id, attempt])

  /**
   * Run one change. Resolves the new quote (or null when the server refused it: the message is shown).
   * `success` is toasted after the change.
   */
  const run = useCallback(async (call: () => Promise<ApiQuote>, success?: string): Promise<ApiQuote | null> => {
    setPending((n) => n + 1)
    try {
      const q = await call()
      cacheQuote(q)
      if (live.current) setQuote(q)
      if (success) toast(success)
      return q
    } catch (e) {
      toast(errorMessage(e))
      return null
    } finally {
      setPending((n) => n - 1)
    }
  }, [])

  const company: CompanyId | undefined = quote ? companySlug(quote.company_id) : undefined
  return {
    quote,
    catalogue,
    load,
    error,
    pending,
    company,
    /** Admin / coordination of the quote's company: costs and margins are in the answer. */
    costView: !!company && isCostViewer(company),
    /** The signed-in user is a representative of the quote's company (cannot reassign it). */
    isRep: !!company && roleIn(company) === 'representative',
    isAdmin: !!company && roleIn(company) === 'admin',
    run,
    setQuote,
    retry: () => setAttempt((n) => n + 1),
  }
}

export type ApiQuoteState = ReturnType<typeof useApiQuote>

// ── Number inputs ────────────────────────────────────────────────────────────
/** "1 234,5" / "1234.50" → "1234.50"; '' → null; invalid → undefined. */
export function parseMoney(input: string): string | null | undefined {
  const s = input.replace(/[\s $]/g, '').replace(',', '.')
  if (!s) return null
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(s)) return undefined
  return Number(s).toFixed(2)
}

/** Quantity with up to 3 decimals ("12,5" → "12.5"). */
export function parseQty(input: string): string | null | undefined {
  const s = input.replace(/\s/g, '').replace(',', '.')
  if (!s) return null
  if (!/^\d{1,9}(\.\d{1,3})?$/.test(s)) return undefined
  return String(Number(s))
}

/** Decimal string → editable French/English text ("1234.50" → "1234.50"). */
export const editable = (d: string | number | null | undefined) => (d === null || d === undefined ? '' : String(d))

// ── Notes (notes_html) ───────────────────────────────────────────────────────
const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' }

/** Stored HTML → text for the textarea (paragraphs and line breaks become new lines). */
export function htmlToText(html: string | null): string {
  if (!html) return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m] ?? m)
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Text from the textarea → HTML the server keeps (escaped, one <p> per paragraph, <br> per line). */
export function textToHtml(text: string): string | null {
  const v = text.trim()
  if (!v) return null
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return v
    .split(/\n{2,}/)
    .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('')
}
