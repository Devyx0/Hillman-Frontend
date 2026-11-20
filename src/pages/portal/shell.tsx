import { useCallback, useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FileQuestion, Phone } from 'lucide-react'
import { CompanyLogo } from '../../components/ui'
import { ErrorState } from '../../components/states'
import { COMPANIES, clientById, clientLang, companyById, fullName, type CompanyId } from '../../data/mock'
import { quoteByNo, request, useStore, type QuoteRecord } from '../../data/store'
import { COMPANY_PROFILES } from '../catalogue/data'
import { t, type Lang } from '../../i18n'
import { LanguageSwitch, useLanguage } from '../../i18n/LanguageProvider'
import { cn } from '../../lib/utils'

type LoadState = 'loading' | 'error' | 'ready'

/**
 * Loads the quote behind a portal link. The fetch goes through `request()` (fake latency) so the
 * skeleton and error states behave like they will with the API; `?demo=erreur` forces the error.
 * Once loaded, the quote is read live from the store so status changes show immediately.
 */
export function usePortalQuote(no?: string) {
  useStore()
  usePortalLanguage(no)
  const [params] = useSearchParams()
  const fail = params.get('demo') === 'erreur'
  const [state, setState] = useState<LoadState>('loading')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let alive = true
    setState('loading')
    request(() => quoteByNo(no), { ms: 500, fail: fail && attempt === 0 })
      .then(() => alive && setState('ready'))
      .catch(() => alive && setState('error'))
    return () => {
      alive = false
    }
  }, [no, fail, attempt])

  const retry = useCallback(() => setAttempt((a) => a + 1), [])
  const quote = state === 'ready' ? quoteByNo(no) : undefined
  const client = quote ? clientById(quote.clientId) : undefined
  return { state, quote, client, retry }
}

// ── Portal language ──────────────────────────────────────────────────────────
const STORAGE_KEY = 'hillman.lang'
/** Quote links already opened in this session (their language was set once; the switch then rules). */
const languageSet = new Set<string>()
/** The staff UI language before the first portal link of the session switched it (see restoreStaffLanguage). */
let staffLang: Lang | null = null

/**
 * The portal opens in the CLIENT's language (`clientLang(client)`), whatever the language of the
 * device; the EN / FR switch in the header still works afterwards. The language the rep saved for the
 * office app is kept in storage, so previewing a client's portal doesn't change the rep's own setting.
 */
function usePortalLanguage(no?: string) {
  const { lang, setLang } = useLanguage()
  const q = quoteByNo(no)
  const want = q ? clientLang(clientById(q.clientId)) : undefined
  useLayoutEffect(() => {
    if (!no || !want || languageSet.has(no)) return
    languageSet.add(no)
    if (want === lang) return
    let saved: string | null = null
    try {
      saved = localStorage.getItem(STORAGE_KEY)
    } catch {
      /* storage unavailable */
    }
    staffLang ??= lang
    setLang(want)
    try {
      if (saved) localStorage.setItem(STORAGE_KEY, saved)
    } catch {
      /* storage unavailable */
    }
  }, [no, want, lang, setLang])
}

/** Back to the office app from the portal (tablet hand-back): restore the rep's own language. */
export function useRestoreStaffLanguage() {
  const { lang, setLang } = useLanguage()
  return () => {
    if (staffLang && staffLang !== lang) setLang(staffLang)
    staffLang = null
  }
}

/** Company identity for the portal (logo, phone, RBQ, address). */
export function companyInfo(id: CompanyId) {
  const c = companyById(id)
  const p = COMPANY_PROFILES[id]
  return { ...c, address: p.address, email: p.mail, site: p.site, neq: p.neq }
}

export const clientName = (q: QuoteRecord) => {
  const c = clientById(q.clientId)
  return c ? fullName(c) : ''
}

export const clientAddress = (q: QuoteRecord) => {
  const c = clientById(q.clientId)
  return c ? `${c.no}, ${c.street}, ${c.city} (Québec) ${c.postal}` : ''
}

/** Portal top bar. `bare` keeps only the logo and the language switch (tablet signing). */
export function PortalHeader({ company, bare, right }: { company?: CompanyId; bare?: boolean; right?: ReactNode }) {
  const c = company ? companyById(company) : COMPANIES[0]
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-hairline print:hidden">
      <div className="max-w-5xl mx-auto h-16 px-4 md:px-6 flex items-center justify-between gap-3">
        {company ? <CompanyLogo id={company} className="h-9 sm:h-10 max-w-[150px] sm:max-w-[190px]" /> : <span className="text-md font-semibold">Hillman</span>}
        <div className="flex items-center gap-2">
          {!bare && right}
          <LanguageSwitch />
          {!bare && company && (
            <a href={`tel:${c.phone}`} className="btn btn-sm btn-secondary">
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">{c.phone}</span>
            </a>
          )}
        </div>
      </div>
    </header>
  )
}

export function PortalFooter({ company }: { company: CompanyId }) {
  const c = companyInfo(company)
  return (
    <footer className="pt-6 text-center text-2xs text-ink-mute print:hidden">
      {c.name} · {c.phone} · RBQ {c.rbq}
    </footer>
  )
}

/** Page frame shared by the portal screens. */
export function PortalFrame({ company, bare, children, className }: { company?: CompanyId; bare?: boolean; children: ReactNode; className?: string }) {
  return (
    <div className="min-h-screen bg-sand font-sans text-ink print:bg-white">
      <PortalHeader company={company} bare={bare} />
      <main className={cn('max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10 space-y-5', className)}>{children}</main>
    </div>
  )
}

/** Skeleton while the quote loads. */
export function PortalSkeleton() {
  return (
    <PortalFrame>
      <div aria-busy="true" role="status" aria-label={t('Chargement…')} className="space-y-5">
        <div className="rounded-2xl bg-ink/90 p-5 md:p-8 space-y-3">
          <span className="block h-3 w-28 rounded bg-white/20 animate-pulse" />
          <span className="block h-8 w-3/4 rounded bg-white/20 animate-pulse" />
          <span className="block h-4 w-1/2 rounded bg-white/15 animate-pulse" />
        </div>
        <div className="grid lg:grid-cols-[1fr_320px] gap-5">
          <div className="space-y-5">
            {[0, 1].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-card p-5 md:p-7 space-y-3">
                <span className="block h-5 w-32 rounded bg-sand animate-pulse" />
                {[0, 1, 2].map((j) => (
                  <span key={j} className="block h-4 w-full rounded bg-sand animate-pulse" />
                ))}
              </div>
            ))}
          </div>
          <div className="hidden lg:block bg-white rounded-2xl shadow-card p-5 h-48 space-y-3">
            <span className="block h-3 w-16 rounded bg-sand animate-pulse" />
            <span className="block h-8 w-40 rounded bg-sand animate-pulse" />
            <span className="block h-11 w-full rounded-lg bg-sand animate-pulse mt-6" />
          </div>
        </div>
      </div>
    </PortalFrame>
  )
}

export function PortalError({ onRetry }: { onRetry: () => void }) {
  return (
    <PortalFrame>
      <section className="rounded-2xl bg-white shadow-card">
        <ErrorState title={t('Impossible de charger votre soumission')} onRetry={onRetry} />
      </section>
    </PortalFrame>
  )
}

/** Unknown or expired link. */
export function PortalNotFound({ no }: { no?: string }) {
  return (
    <PortalFrame>
      <section className="rounded-2xl bg-white shadow-card p-6 md:p-10 text-center">
        <span className="w-16 h-16 rounded-full bg-sand text-ink-mute mx-auto flex items-center justify-center">
          <FileQuestion className="w-8 h-8" />
        </span>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-5">{t('Soumission introuvable')}</h1>
        <p className="text-md text-ink-mute mt-2 max-w-md mx-auto">
          {t("Le lien que vous avez utilisé ne correspond à aucune soumission{no}. Il est peut-être incomplet ou la soumission a été remplacée par une nouvelle version.", { no: no ? ` (${no})` : '' })}
        </p>
        <p className="text-sm text-ink-mute mt-4">{t('Communiquez avec nous et nous vous enverrons un nouveau lien :')}</p>
        <div className="flex flex-wrap justify-center gap-2 mt-3">
          {COMPANIES.map((c) => (
            <a key={c.id} href={`tel:${c.phone}`} className="btn btn-sm btn-secondary">
              <Phone className="w-4 h-4" />
              {c.short} · {c.phone}
            </a>
          ))}
        </div>
      </section>
    </PortalFrame>
  )
}

/** Date and time of a signature, in the current language. */
export function formatSignedAt(iso: string, locale: string) {
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }),
    time: d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
  }
}
