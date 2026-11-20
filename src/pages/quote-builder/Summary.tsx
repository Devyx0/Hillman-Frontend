import { CircleCheck, Send, TriangleAlert } from 'lucide-react'
import { t } from '../../i18n'
import { cn, money, pct } from '../../lib/utils'
import type { Builder } from './useQuoteBuilder'

/** Sticky right rail: totals, margin gauge, checks and payment split. */
export function SummaryRail({ b }: { b: Builder }) {
  const { marginPct, profit, target } = b
  const onTarget = marginPct >= target
  return (
    <aside className="xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto nav-scroll space-y-4 xl:pb-2">
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="p-5 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-ink-mute">{t('Sous-total')}</span>
            <span className="tnum font-semibold">{money(b.subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-ink-mute">
            <span>{t('Taxes')}</span>
            <span className="tnum">{money(b.gst + b.qst)}</span>
          </div>
        </div>
        <div className="px-5 py-4 bg-ink text-white flex items-end justify-between">
          <span className="label-caps text-white/70">{t('Total')}</span>
          <span className="text-2xl font-semibold tnum tracking-tight">{money(b.total)}</span>
        </div>
        {b.canCosts && (
        <div className="p-5 space-y-3">
          <p className="label-caps flex items-center justify-between">
            <span>{t('Rentabilité')}</span>
            <span className="text-ink-mute normal-case tracking-normal font-normal">{t('cible {target}', { target: pct(target) })}</span>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="label-caps">{t('Coûtant')}</p>
              <p className="text-md font-semibold tnum">{money(b.realCost, false)}</p>
            </div>
            <div>
              <p className="label-caps">{t('Profit')}</p>
              <p className={cn('text-md font-semibold tnum', profit >= 0 ? 'text-tone-good-ink' : 'text-tone-critical-ink')}>{money(profit, false)}</p>
            </div>
          </div>
          <div>
            <div className="flex items-end justify-between mb-1.5">
              <p className="label-caps">{t('Marge')}</p>
              <p className={cn('text-xl font-semibold tnum', onTarget ? 'text-tone-good-ink' : 'text-tone-critical-ink')}>{pct(marginPct, 1)}</p>
            </div>
            <div className="relative h-2.5 rounded-full bg-stone">
              <div className={cn('absolute h-full rounded-full', onTarget ? 'bg-tone-good' : 'bg-tone-critical')} style={{ width: `${Math.min(100, (Math.max(0, marginPct) / 60) * 100)}%` }} />
              <div className="absolute -top-1 w-0.5 bg-ink" style={{ left: `${(target / 60) * 100}%`, height: 18 }} />
            </div>
          </div>
        </div>
        )}
      </div>
      <div className="bg-white rounded-xl shadow-card p-4 space-y-2">
        {b.checks.slice(0, 3).map((c) => (
          <p key={c.text} className="flex items-start gap-2 text-xs text-ink-secondary">
            {c.tone === 'good' ? <CircleCheck className="w-3.5 h-3.5 text-tone-good mt-px shrink-0" /> : <TriangleAlert className={cn('w-3.5 h-3.5 mt-px shrink-0', c.tone === 'critical' ? 'text-tone-critical' : 'text-tone-warn')} />}
            {c.text}
          </p>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-card p-4">
        <p className="label-caps mb-2">
          {t('Paiements')} · {b.schedule.map((s) => s.pct).join(' / ')}
        </p>
        <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
          {b.schedule.map((s, i) => (
            <div key={i} className={cn(i === 0 ? 'bg-primary' : 'bg-stone')} style={{ width: `${s.pct}%` }} />
          ))}
        </div>
        <p className="text-xs text-ink-secondary mt-2">
          {t('Mise de fond :')} <b className="tnum text-ink">{money((b.total * (b.schedule[0]?.pct ?? 0)) / 100, false)}</b>
        </p>
      </div>
    </aside>
  )
}

/** Fixed bottom bar shown below the xl breakpoint. */
export function MobileTotalBar({ b }: { b: Builder }) {
  return (
    <div className="xl:hidden fixed bottom-0 inset-x-0 md:left-60 z-30 bg-white border-t border-hairline px-4 py-3 flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-2xs text-ink-mute">
          {b.canCosts ? (
            <>
              {t('Total · marge')} <span className={cn('font-semibold', b.marginPct >= b.target ? 'text-tone-good-ink' : 'text-tone-critical-ink')}>{pct(b.marginPct, 1)}</span>
              <span className="text-ink-faint"> / {pct(b.target)}</span>
            </>
          ) : (
            t('Total taxes incluses')
          )}
        </p>
        <p className="text-lg font-semibold tnum leading-tight">{money(b.total, false)}</p>
      </div>
      <button className="btn btn-sm btn-primary" onClick={() => b.scrollTo('envoi')}>
        <Send className="w-4 h-4" />
        {t('Envoyer')}
      </button>
    </div>
  )
}
