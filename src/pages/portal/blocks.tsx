import { t } from '../../i18n'
import { cn, money } from '../../lib/utils'
import type { QuoteRecord } from '../../data/store'
import { lineLabel, paymentSchedule, type Pricing } from './pricing'

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
  return (
    <ol className="space-y-2.5">
      {paymentSchedule(q, total).map((s, i) => (
        <li key={i} className="flex items-center gap-3">
          <span className="w-10 h-7 rounded-md flex items-center justify-center text-xs font-bold tnum bg-sand text-ink-secondary shrink-0">{t('{n} %', { n: s.pct })}</span>
          <span className="flex-1 text-sm text-ink-secondary">{t(s.label)}</span>
          <span className="text-sm font-semibold tnum">{money(s.amount)}</span>
        </li>
      ))}
    </ol>
  )
}

