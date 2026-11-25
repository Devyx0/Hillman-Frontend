/**
 * Vue Groupe (GET /group/summary, admin only): quote counts and tax-included amounts per company and for the
 * group, over a period of quote dates.
 */
import { useEffect, useState } from 'react'
import { Building2 } from 'lucide-react'
import { groupSummary } from '../api/endpoints'
import { errorMessage } from '../api/http'
import { toNum } from '../api/mappers'
import type { ApiGroupSummary, GroupBucket } from '../api/types'
import { TODAY } from '../data/mock'
import { t } from '../i18n'
import { cn, moneyShort, num, pct } from '../lib/utils'
import { ErrorState, SkeletonRows } from './states'
import { Card, CompanyBadge } from './ui'

type Period = '30' | '90' | 'year' | 'all'

function fromDate(p: Period): string | undefined {
  if (p === 'all') return undefined
  if (p === 'year') return `${TODAY.slice(0, 4)}-01-01`
  const d = new Date(TODAY + 'T12:00')
  d.setDate(d.getDate() - Number(p))
  return d.toISOString().slice(0, 10)
}

function Row({ label, b, strong }: { label: React.ReactNode; b: GroupBucket; strong?: boolean }) {
  return (
    <tr className={cn(strong && 'bg-sand/60 font-semibold')}>
      <td className="td">{label}</td>
      <td className="td text-right tnum">{num(b.quotes_count)}</td>
      <td className="td text-right tnum">{moneyShort(toNum(b.total_amount))}</td>
      <td className="td text-right tnum">
        {num(b.open_count)} · {moneyShort(toNum(b.open_amount))}
      </td>
      <td className="td text-right tnum">
        {num(b.won_count)} · {moneyShort(toNum(b.won_amount))}
      </td>
      <td className="td text-right tnum">{num(b.refused_count)}</td>
      <td className="td text-right tnum">{b.win_rate_pct === null ? '—' : pct(b.win_rate_pct, 1)}</td>
    </tr>
  )
}

export function GroupSummaryCard() {
  const [period, setPeriod] = useState<Period>('year')
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; data?: ApiGroupSummary; error?: string }>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let live = true
    setState({ status: 'loading' })
    groupSummary({ from: fromDate(period), to: TODAY }).then(
      (data) => live && setState({ status: 'ready', data }),
      (e) => live && setState({ status: 'error', error: errorMessage(e) }),
    )
    return () => {
      live = false
    }
  }, [period, attempt])

  const periods: { value: Period; label: string }[] = [
    { value: '30', label: t('30 jours') },
    { value: '90', label: t('90 jours') },
    { value: 'year', label: t('Cette année') },
    { value: 'all', label: t('Tout') },
  ]

  return (
    <Card
      title={t('Vue Groupe Hillman')}
      icon={Building2}
      pad={false}
      actions={
        <select className="form-input h-8 text-xs w-auto" value={period} onChange={(e) => setPeriod(e.target.value as Period)} aria-label={t('Période')}>
          {periods.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      }
    >
      {state.status === 'loading' && <SkeletonRows rows={4} />}
      {state.status === 'error' && <ErrorState onRetry={() => setAttempt((n) => n + 1)}>{state.error}</ErrorState>}
      {state.status === 'ready' && state.data && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm [&_td]:px-3 [&_th]:px-3">
            <thead className="border-b border-hairline">
              <tr>
                <th className="th">{t('Compagnie')}</th>
                <th className="th text-right">{t('Soumissions')}</th>
                <th className="th text-right">{t('Montant (taxes incl.)')}</th>
                <th className="th text-right">{t('Ouvertes')}</th>
                <th className="th text-right">{t('Gagnées')}</th>
                <th className="th text-right">{t('Refusées')}</th>
                <th className="th text-right">{t('Taux de signature')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {state.data.companies.map((c) => (
                <Row key={c.company_id} label={['toit', 'sg', 'reno'].includes(c.slug) ? <CompanyBadge id={c.slug} full /> : c.name} b={c} />
              ))}
              <Row label={t('Groupe')} b={state.data.group} strong />
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
