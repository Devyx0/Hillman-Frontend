import { useEffect, useState } from 'react'
import { ExternalLink, PlayCircle, X } from 'lucide-react'
import { t } from '../../i18n'
import { cn, money } from '../../lib/utils'
import { videoEmbed } from '../catalogue/data'
import type { QuoteRecord } from '../../data/store'
import { depositStep, lineLabel, paymentSchedule, type Pricing } from './pricing'

/** Price lines + taxes + total — same total as the quote builder. */
export function PriceTable({ pricing, big }: { pricing: Pricing; big?: boolean }) {
  return (
    <>
      <dl className="divide-y divide-hairline border-y border-hairline">
        {pricing.lines.map((l, i) => (
          <div key={i} className="flex items-start justify-between gap-4 py-3">
            <dt className={cn('min-w-0 font-semibold', big ? 'text-md' : 'text-sm', l.amount < 0 && 'text-tone-good-ink')}>{lineLabel(l)}</dt>
            <dd className={cn('font-semibold tnum whitespace-nowrap', big ? 'text-md' : 'text-sm', l.amount < 0 && 'text-tone-good-ink')}>{money(l.amount)}</dd>
          </div>
        ))}
      </dl>
      <dl className={cn('mt-3 space-y-1.5 max-w-xs ml-auto', big ? 'text-md' : 'text-sm')}>
        <div className="flex justify-between gap-2">
          <dt className="text-ink-mute">{t('Sous-total')}</dt>
          <dd className="tnum">{money(pricing.subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-ink-mute">{t('TPS 5 %')}</dt>
          <dd className="tnum text-ink-mute">{money(pricing.gst)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-ink-mute">{t('TVQ 9,975 %')}</dt>
          <dd className="tnum text-ink-mute">{money(pricing.qst)}</dd>
        </div>
        <div className={cn('flex justify-between gap-2 pt-1.5 border-t border-hairline', big ? 'text-lg' : 'text-md')}>
          <dt className="font-semibold">{t('Total')}</dt>
          <dd className="font-semibold tnum">{money(pricing.total)}</dd>
        </div>
      </dl>
    </>
  )
}

/** Payment schedule of the company (settings), with amounts. */
export function PaymentList({ q, total }: { q: QuoteRecord; total: number }) {
  const steps = paymentSchedule(q, total)
  return (
    <ol className="space-y-2.5">
      {steps.map((s, i) => (
        <li key={i} className="flex items-center gap-3">
          <span className="w-10 h-7 rounded-md flex items-center justify-center text-xs font-bold tnum bg-sand text-ink-secondary shrink-0">{t('{n} %', { n: s.pct })}</span>
          <span className="flex-1 text-sm text-ink-secondary">{t(s.label)}</span>
          <span className="text-sm font-semibold tnum">{money(s.amount)}</span>
        </li>
      ))}
      {!depositStep(steps) && <li className="text-xs text-ink-mute">{t('Aucun dépôt à la signature.')}</li>}
    </ol>
  )
}

/**
 * "Regarder la vidéo" link of a product option: plays YouTube / Vimeo in a modal, other links open in a
 * new tab.
 */
export function VideoLink({ url, title, className }: { url: string; title: string; className?: string }) {
  const [open, setOpen] = useState(false)
  const embed = videoEmbed(url)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  const cls = cn('inline-flex items-center gap-1.5 text-xs font-semibold text-primary-press hover:underline', className)
  if (!embed)
    return (
      <a href={url} target="_blank" rel="noreferrer noopener" className={cls}>
        <PlayCircle className="w-4 h-4" />
        {t('Regarder la vidéo')}
        <ExternalLink className="w-3 h-3" />
      </a>
    )
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cn(cls, 'text-left')}>
        <PlayCircle className="w-4 h-4" />
        {t('Regarder la vidéo')}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-ink/70 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title} onClick={() => setOpen(false)}>
          <div className="w-full max-w-3xl bg-white rounded-2xl overflow-hidden shadow-elevated" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-hairline">
              <p className="text-sm font-semibold truncate">{title}</p>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-md hover:bg-sand" aria-label={t('Fermer')}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="aspect-video bg-ink">
              <iframe src={embed} title={title} className="w-full h-full" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
            </div>
            <a href={url} target="_blank" rel="noreferrer noopener" className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-primary-press hover:underline">
              <ExternalLink className="w-3.5 h-3.5" />
              {t('Ouvrir dans un nouvel onglet')}
            </a>
          </div>
        </div>
      )}
    </>
  )
}

