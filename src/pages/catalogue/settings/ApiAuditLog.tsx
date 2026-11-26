/** Paramètres → Sécurité et journal, with the backend: GET /audit-log (admin only), newest first, filterable. */
import { useEffect, useState } from 'react'
import { FileClock, LoaderCircle } from 'lucide-react'
import * as api from '../../../api/endpoints'
import { errorMessage } from '../../../api/http'
import type { ApiAuditEntry, AuditAction, AuditTable } from '../../../api/types'
import { Card, Empty } from '../../../components/ui'
import { ErrorState, SkeletonRows } from '../../../components/states'
import { REF, companyUuid } from '../../../data/api-sync'
import { COMPANIES, type CompanyId } from '../../../data/mock'
import { t } from '../../../i18n'
import { AuditList } from '../../quote-builder/api/media'
import { Dropdown } from '../../../components/dropdown'

const TABLES: [AuditTable | 'all', string][] = [
  ['all', 'Toutes les données'],
  ['quotes', 'Soumissions'],
  ['quote_addons', 'Ajouts'],
  ['quote_cost_lines', 'Lignes de coûtant'],
  ['clients', 'Clients'],
]
const ACTIONS: [AuditAction | 'all', string][] = [
  ['all', 'Toutes les actions'],
  ['create', 'Création'],
  ['update', 'Modification'],
  ['delete', 'Suppression'],
  ['status_change', 'Changement de statut'],
  ['price_change', 'Changement de prix'],
]

export function ApiAuditLog() {
  // Only the companies where the user is admin have a journal they may read.
  const adminCompanies = COMPANIES.filter((c) => REF.me?.memberships.some((m) => m.slug === c.id && m.role === 'admin'))
  const [company, setCompany] = useState<CompanyId | 'all'>('all')
  const [table, setTable] = useState<AuditTable | 'all'>('all')
  const [action, setAction] = useState<AuditAction | 'all'>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; items: ApiAuditEntry[]; cursor: string | null; error?: string }>({ status: 'loading', items: [], cursor: null })
  const [more, setMore] = useState(false)
  const [attempt, setAttempt] = useState(0)

  const query = (cursor?: string) =>
    api.listAuditLog({
      company: company === 'all' ? undefined : companyUuid(company),
      table: table === 'all' ? undefined : table,
      action: action === 'all' ? undefined : action,
      // Local day bounds, sent as ISO timestamps with offset.
      from: from ? new Date(from + 'T00:00').toISOString() : undefined,
      to: to ? new Date(new Date(to + 'T00:00').getTime() + 864e5).toISOString() : undefined,
      limit: 50,
      cursor,
    })

  useEffect(() => {
    let live = true
    setState({ status: 'loading', items: [], cursor: null })
    query().then(
      (p) => live && setState({ status: 'ready', items: p.items, cursor: p.next_cursor }),
      (e) => live && setState({ status: 'error', items: [], cursor: null, error: errorMessage(e) }),
    )
    return () => {
      live = false
    }
  }, [company, table, action, from, to, attempt]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = async () => {
    if (!state.cursor) return
    setMore(true)
    try {
      const p = await query(state.cursor)
      setState((s) => ({ ...s, items: [...s.items, ...p.items], cursor: p.next_cursor }))
    } catch (e) {
      setState((s) => ({ ...s, error: errorMessage(e) }))
    } finally {
      setMore(false)
    }
  }

  return (
    <Card title={t('Journal des modifications')} icon={FileClock} pad={false}>
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-hairline">
        {adminCompanies.length > 1 && (
          <Dropdown className="form-input h-8 text-xs w-auto" value={company} onChange={(e) => setCompany(e.target.value as CompanyId | 'all')} aria-label={t('Compagnie')}>
            <option value="all">{t('Toutes les compagnies')}</option>
            {adminCompanies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Dropdown>
        )}
        <Dropdown className="form-input h-8 text-xs w-auto" value={table} onChange={(e) => setTable(e.target.value as AuditTable | 'all')} aria-label={t('Données')}>
          {TABLES.map(([v, l]) => (
            <option key={v} value={v}>
              {t(l)}
            </option>
          ))}
        </Dropdown>
        <Dropdown className="form-input h-8 text-xs w-auto" value={action} onChange={(e) => setAction(e.target.value as AuditAction | 'all')} aria-label={t('Action')}>
          {ACTIONS.map(([v, l]) => (
            <option key={v} value={v}>
              {t(l)}
            </option>
          ))}
        </Dropdown>
        <label className="inline-flex items-center gap-1 text-xs text-ink-mute">
          {t('Du')}
          <input type="date" className="form-input h-8 text-xs w-auto" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="inline-flex items-center gap-1 text-xs text-ink-mute">
          {t('au')}
          <input type="date" className="form-input h-8 text-xs w-auto" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>
      {state.status === 'loading' && <SkeletonRows rows={5} />}
      {state.status === 'error' && <ErrorState onRetry={() => setAttempt((n) => n + 1)}>{state.error}</ErrorState>}
      {state.status === 'ready' && state.items.length === 0 && (
        <Empty icon={FileClock} title={t('Aucune modification')}>
          {t('Aucune entrée ne correspond à ces filtres.')}
        </Empty>
      )}
      {state.status === 'ready' && state.items.length > 0 && (
        <div className="px-4 max-h-[65vh] overflow-y-auto">
          <AuditList items={state.items} showRecord />
          {state.cursor && (
            <div className="py-3 flex justify-center">
              <button className="btn btn-xs btn-secondary" onClick={() => void loadMore()} disabled={more}>
                {more && <LoaderCircle className="w-3.5 h-3.5 animate-spin" />}
                {t('Charger plus')}
              </button>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
